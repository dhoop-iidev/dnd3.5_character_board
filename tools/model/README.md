# 3D model pipeline

Rebuilds `public/models/fenrir-paladin.glb` from the original Sketchfab download
("Fallen Paladin in Corrupted Black Plate Armor", CC-BY-4.0, see `public/models/CREDITS.md`).
The zip is kept in `model/` (gitignored). Needs Python with numpy, scipy and Pillow, and the npm dev dependencies.

From the repo root, in Git Bash (`O` = the unzipped model folder, `W` = a scratch work folder):

```sh
O=path/to/fallen_paladin_in_corrupted_black_plate_armor   # scene.gltf, scene.bin, textures/
W=path/to/work; T=textures/tripo_mat_3786d797
mkdir -p "$W/textures" && cp "$O/scene.gltf" "$O/scene.bin" "$W/" && cp "$O/${T}_normal.png" "$W/textures/"

# 1. Sword mask (about 1 min): R = blade, G = gold strip of the blade, B = guard/grip/pommel.
python tools/model/sword_mask.py "$O/scene.gltf" "$W/sword_mask.png"

# 2. Recolor: metal -> gold; blade -> steel with a gold central strip; guard/pommel -> gold.
python tools/model/gold_recolor.py "$O/${T}_baseColor.jpeg" "$O/${T}_metallicRoughness.png" \
  "$W/${T}_baseColor.jpeg" "$W/${T}_metallicRoughness.png" "$W/sword_mask.png"

# 3. Simplify + compress (meshopt geometry, WebP 2048² textures): ~4.4 MB.
node node_modules/@gltf-transform/cli/bin/cli.js optimize "$W/scene.gltf" public/models/fenrir-paladin.glb \
  --compress meshopt --texture-compress webp --texture-size 2048 --simplify-ratio 0.08 --simplify-error 0.0005
```

Notes:
- The mesh is a single fused, unrigged Tripo AI mesh. The sword is found as its own connected piece of geometry
  (vertices welded by position), seeded by its place in front of the right leg; `sword_mask.py` stops if that
  piece looks too big. Tunables at the top of the script: `FULLER` (gold strip width), `DILATE_PX`.
- The helmet wings are not in the file: `addHelmetWings()` in `src/ui/viewer/scene.ts` builds them at load time.
