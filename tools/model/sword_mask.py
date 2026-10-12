"""Build a texture mask of the greatsword of the "Fallen Paladin" model, so the recolor can make it silver.

The Tripo mesh has no separate parts, but the sword is its own connected piece of geometry. This script:
1. reads every mesh of the original scene.gltf (positions in model space, UVs, indices);
2. welds vertices by position and keeps the connected component closest to the blade (the sword);
3. fits the sword axis (PCA), measures the blade half-width along it and finds the cross-guard;
4. rasterizes the sword triangles into UV space, interpolating the position along the axis and across the blade.

Output: an RGB PNG the size of the textures (4096²):
  R = blade (steel), G = central strip of the blade (gold fuller, fraction of R), B = guard + grip + pommel.
Usage: python sword_mask.py <scene.gltf> <out_mask.png> [--debug <prefix>]
"""
import json
import sys
from pathlib import Path

import numpy as np
import scipy.sparse as sp
from PIL import Image
from scipy import ndimage
from scipy.sparse.csgraph import connected_components

SIZE = 4096
FULLER = 0.28  # the gold strip covers the inner 28% of the blade width (|w| / half-width)
FULLER_SOFT = 0.07  # soft transition band (same unit)
DILATE_PX = 4  # extend the mask past the UV island borders so filtering doesn't show seams

_CT = {5126: np.float32, 5125: np.uint32, 5123: np.uint16, 5121: np.uint8}
_NC = {'SCALAR': 1, 'VEC2': 2, 'VEC3': 3, 'VEC4': 4}


def _accessor(g: dict, buf: np.ndarray, i: int) -> np.ndarray:
    a = g['accessors'][i]
    bv = g['bufferViews'][a['bufferView']]
    dt = np.dtype(_CT[a['componentType']])
    n = _NC[a['type']]
    off = bv.get('byteOffset', 0) + a.get('byteOffset', 0)
    stride = bv.get('byteStride', dt.itemsize * n)
    rows = np.ndarray((a['count'], n), dtype=dt, buffer=buf, offset=off, strides=(stride, dt.itemsize))
    return rows.astype(np.float64 if dt.kind == 'f' else np.int64)


def _matrix(node: dict) -> np.ndarray:
    return np.array(node.get('matrix', np.eye(4).ravel().tolist())).reshape(4, 4).T


def load(gltf_path: str):
    """All triangles of the scene: world positions, TEXCOORD_0 and indices (single material model)."""
    path = Path(gltf_path)
    g = json.loads(path.read_text())
    buf = np.fromfile(path.parent / g['buffers'][0]['uri'], dtype=np.uint8)
    world = {}

    def walk(i: int, parent: np.ndarray) -> None:
        m = parent @ _matrix(g['nodes'][i])
        world[i] = m
        for c in g['nodes'][i].get('children', []):
            walk(c, m)

    for root in g['scenes'][g.get('scene', 0)]['nodes']:
        walk(root, np.eye(4))
    pos, uv, idx, base = [], [], [], 0
    for i, node in world.items():
        if 'mesh' not in g['nodes'][i]:
            continue
        for prim in g['meshes'][g['nodes'][i]['mesh']]['primitives']:
            p = _accessor(g, buf, prim['attributes']['POSITION'])
            p = (np.c_[p, np.ones(len(p))] @ node.T)[:, :3]
            pos.append(p)
            uv.append(_accessor(g, buf, prim['attributes']['TEXCOORD_0']))
            idx.append(_accessor(g, buf, prim['indices']).ravel() + base)
            base += len(p)
    return np.concatenate(pos), np.concatenate(uv), np.concatenate(idx).reshape(-1, 3)


def sword_vertices(pos: np.ndarray, tris: np.ndarray) -> np.ndarray:
    """Boolean mask of the vertices of the sword (the connected piece standing in front of the right leg)."""
    _, weld = np.unique(np.round(pos / 1e-5).astype(np.int64), axis=0, return_inverse=True)
    weld = weld.ravel()
    t = weld[tris]
    n = weld.max() + 1
    adj = sp.coo_matrix((np.ones(len(t) * 2), (np.r_[t[:, 0], t[:, 1]], np.r_[t[:, 1], t[:, 2]])), shape=(n, n))
    _, labels = connected_components(adj, directed=False)
    labels = labels[weld]
    # Seed: the long thin vertical shape low, in front (+X) and on the model's right (-Z) — the blade.
    lo, hi = pos.min(0), pos.max(0)
    rel = (pos - lo) / (hi - lo)
    seed = (rel[:, 0] > 0.8) & (rel[:, 2] < 0.3) & (rel[:, 1] < 0.35)
    best = np.bincount(labels[seed]).argmax()
    sword = labels == best
    if sword.sum() > 0.2 * len(pos):
        raise SystemExit('sword component is too large: the mesh topology changed, check the seed')
    return sword


def sword_frame(p: np.ndarray):
    """Axis (pointing to the hilt), width direction, and per-vertex (t along axis, w across the blade)."""
    c = p.mean(0)
    _, _, vt = np.linalg.svd(p - c, full_matrices=False)
    axis = vt[0] if vt[0][1] > 0 else -vt[0]
    t = (p - c) @ axis
    r = p - c - np.outer(t, axis)
    # Width direction = main cross-section direction of the blade (lower half, away from the guard).
    blade = t < np.percentile(t, 50)
    _, _, vt2 = np.linalg.svd(r[blade] - r[blade].mean(0), full_matrices=False)
    w = r @ vt2[0]
    return c, axis, t, w


def blade_profile(t: np.ndarray, w: np.ndarray):
    """Blade half-width as a function of t, and t of the cross-guard (first big widening above the middle)."""
    edges = np.linspace(t.min(), t.max(), 200)
    centers = (edges[:-1] + edges[1:]) / 2
    half = np.zeros(len(centers))
    for k in range(len(centers)):
        sel = (t >= edges[k]) & (t < edges[k + 1])
        half[k] = np.abs(w[sel]).max() if sel.any() else 0
    mid = np.argmin(np.abs(centers - np.median(t)))
    ref = np.median(half[: mid + 1])
    guard = next(k for k in range(mid, len(centers)) if half[k] > 2.0 * ref)
    t_guard = edges[guard]
    # Half-width under the guard; smooth it a little and keep it positive.
    hw = np.maximum(np.convolve(half, np.ones(3) / 3, mode='same'), 1e-4)
    return centers, hw, t_guard


def rasterize(uv: np.ndarray, tris: np.ndarray, attrs: np.ndarray, size: int):
    """Barycentric rasterization of UV triangles; returns coverage and interpolated attributes per pixel."""
    cover = np.zeros((size, size), bool)
    out = np.zeros((size, size, attrs.shape[1]), np.float32)
    xy = uv * size - 0.5  # pixel centers; glTF UV (0,0) = top-left of the image
    for tri in tris:
        a, b, c = xy[tri]
        x0, y0 = np.floor(np.minimum(np.minimum(a, b), c)).astype(int)
        x1, y1 = np.ceil(np.maximum(np.maximum(a, b), c)).astype(int)
        x0, y0, x1, y1 = max(x0, 0), max(y0, 0), min(x1, size - 1), min(y1, size - 1)
        if x1 < x0 or y1 < y0:
            continue
        gx, gy = np.meshgrid(np.arange(x0, x1 + 1), np.arange(y0, y1 + 1))
        den = (b[1] - c[1]) * (a[0] - c[0]) + (c[0] - b[0]) * (a[1] - c[1])
        if abs(den) < 1e-12:
            continue
        l1 = ((b[1] - c[1]) * (gx - c[0]) + (c[0] - b[0]) * (gy - c[1])) / den
        l2 = ((c[1] - a[1]) * (gx - c[0]) + (a[0] - c[0]) * (gy - c[1])) / den
        l3 = 1 - l1 - l2
        eps = -0.02
        inside = (l1 >= eps) & (l2 >= eps) & (l3 >= eps)
        if not inside.any():
            continue
        va = attrs[tri]
        vals = l1[..., None] * va[0] + l2[..., None] * va[1] + l3[..., None] * va[2]
        ys, xs = gy[inside], gx[inside]
        cover[ys, xs] = True
        out[ys, xs] = vals[inside]
    return cover, out


def smoothstep(e0: float, e1: float, x: np.ndarray) -> np.ndarray:
    k = np.clip((x - e0) / (e1 - e0), 0, 1)
    return k * k * (3 - 2 * k)


def main(gltf_path: str, out_png: str, debug: str | None = None) -> None:
    pos, uv, tris = load(gltf_path)
    sword = sword_vertices(pos, tris)
    idx = np.flatnonzero(sword)
    remap = np.full(len(pos), -1)
    remap[idx] = np.arange(len(idx))
    stris = remap[tris[sword[tris].all(1)]]
    p = pos[idx]
    c, axis, t, w = sword_frame(p)
    centers, hw, t_guard = blade_profile(t, w)
    print(f'sword: {len(idx)} vertices, {len(stris)} triangles, axis {axis.round(3)}, guard at t={t_guard:.3f}')
    cover, vals = rasterize(uv[idx], stris, np.c_[t, w], SIZE)
    # Dilate: give pixels just outside the islands the values of the nearest covered pixel.
    dist, (iy, ix) = ndimage.distance_transform_edt(~cover, return_indices=True)
    grown = dist <= DILATE_PX
    vals = vals[iy, ix]
    tt, ww = vals[..., 0], vals[..., 1]
    half = np.interp(tt, centers, hw)
    hilt = grown & (tt >= t_guard)
    blade = grown & (tt < t_guard)
    rel = np.abs(ww) / half
    fuller = 1 - smoothstep(FULLER - FULLER_SOFT, FULLER + FULLER_SOFT, rel)
    # The gold strip fades out near the tip (it ends in a point like a real fuller).
    fuller *= smoothstep(t.min() + 0.06, t.min() + 0.12, tt)
    rgb = np.zeros((SIZE, SIZE, 3), np.float32)
    rgb[..., 0] = blade
    rgb[..., 1] = blade * fuller
    rgb[..., 2] = hilt
    Image.fromarray((rgb * 255).astype(np.uint8)).save(out_png)
    print(f'mask: {grown.sum()} px ({blade.sum()} blade, {hilt.sum()} hilt) -> {out_png}')
    if debug:
        np.savez(debug + '_sword.npz', pos=p, t=t, w=w, axis=axis, c=c)


if __name__ == '__main__':
    a = sys.argv[1:]
    dbg = None
    if '--debug' in a:
        i = a.index('--debug')
        dbg = a[i + 1]
        a = a[:i] + a[i + 2 :]
    main(a[0], a[1], dbg)
