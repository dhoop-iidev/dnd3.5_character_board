// three.js scene for the character model. Loaded lazily (dynamic import) so the rest of the app stays light.
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js'

export interface CharacterScene {
  dispose(): void
  resetView(): void
}

/** The model faces +X; this turns it to face the camera. */
const MODEL_YAW = -Math.PI / 2

export async function createScene(canvas: HTMLCanvasElement, url: string): Promise<CharacterScene> {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.05

  const scene = new THREE.Scene()
  const pmrem = new THREE.PMREMGenerator(renderer)
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture

  // Warm torch-like key light and a cool rim light to make the gold read well.
  const key = new THREE.DirectionalLight(0xffe2b0, 2.2)
  key.position.set(2, 3, 3)
  const rim = new THREE.DirectionalLight(0x9db7ff, 1.2)
  rim.position.set(-3, 2, -2)
  scene.add(key, rim, new THREE.HemisphereLight(0xfff4e0, 0x3a2a1a, 0.6))

  const camera = new THREE.PerspectiveCamera(30, 1, 0.01, 100)
  const controls = new OrbitControls(camera, canvas)
  controls.enableDamping = true
  controls.enablePan = false
  controls.minPolarAngle = Math.PI * 0.2
  controls.maxPolarAngle = Math.PI * 0.6

  const loader = new GLTFLoader()
  loader.setMeshoptDecoder(MeshoptDecoder)
  const gltf = await loader.loadAsync(url)
  const model = gltf.scene
  model.rotation.y = MODEL_YAW
  addHelmetWings(model)
  scene.add(model)

  // Frame the model and put a soft shadow disc under its feet.
  const box = new THREE.Box3().setFromObject(model)
  const size = box.getSize(new THREE.Vector3())
  const center = box.getCenter(new THREE.Vector3())
  const shadow = new THREE.Mesh(
    new THREE.CircleGeometry(Math.max(size.x, size.z) * 0.7, 48),
    new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.1 }),
  )
  shadow.rotation.x = -Math.PI / 2
  shadow.position.set(center.x, box.min.y + 0.001, center.z)
  scene.add(shadow)

  const home = new THREE.Vector3(center.x, center.y + size.y * 0.05, center.z + size.y * 2.1)
  function resetView() {
    camera.position.copy(home)
    controls.target.copy(center)
    controls.update()
  }
  resetView()
  controls.minDistance = size.y * 0.8
  controls.maxDistance = size.y * 3.5

  function resize() {
    const w = canvas.clientWidth
    const h = canvas.clientHeight
    if (!w || !h) return
    renderer.setSize(w, h, false)
    camera.aspect = w / h
    camera.updateProjectionMatrix()
  }
  const observer = new ResizeObserver(resize)
  observer.observe(canvas)
  resize()

  let frame = 0
  const loop = () => {
    frame = requestAnimationFrame(loop)
    controls.update()
    renderer.render(scene, camera)
  }
  loop()

  return {
    resetView,
    dispose() {
      cancelAnimationFrame(frame)
      observer.disconnect()
      controls.dispose()
      scene.traverse((o) => {
        const mesh = o as THREE.Mesh
        mesh.geometry?.dispose()
        const mats = Array.isArray(mesh.material) ? mesh.material : mesh.material ? [mesh.material] : []
        for (const m of mats) {
          for (const v of Object.values(m)) if (v instanceof THREE.Texture) v.dispose()
          m.dispose()
        }
      })
      pmrem.dispose()
      renderer.dispose()
    },
  }
}

export interface WingOptions {
  /** 'silver' (default) or 'gold' feathers; edges use the other metal's highlight. */
  metal?: 'silver' | 'gold'
  /** Wing size relative to the helmet height (default 1). */
  scale?: number
}

/**
 * Two stylized feathered wings on the sides of the helmet (classic winged great helm), built in code because
 * the Tripo mesh is one fused static piece. They are added as children of `model`, so they follow its rotation.
 * The helmet is found as the top slice of the model's vertices (model space: +Y up, +X front, -Z = his right).
 */
export function addHelmetWings(model: THREE.Object3D, options: WingOptions = {}): THREE.Group {
  const head = helmetBox(model)
  const hs = head.getSize(new THREE.Vector3())
  const hc = head.getCenter(new THREE.Vector3())
  // The top slice is the upper part of the helmet only; the full helmet is about twice as tall.
  const helmH = hs.y * 2.2
  const size = helmH * 0.8 * (options.scale ?? 1)
  const silver = new THREE.MeshStandardMaterial({ color: 0xc4cad3, metalness: 1, roughness: 0.18 })
  const gold = new THREE.MeshStandardMaterial({ color: 0xf2c25a, metalness: 1, roughness: 0.3 })
  const [face, edge] = options.metal === 'gold' ? [gold, silver] : [silver, gold]
  const wings = new THREE.Group()
  wings.name = 'helmet-wings'
  for (const side of [1, -1]) {
    const wing = buildWing(size, side, [face, edge])
    // Root on the side of the helmet, at temple height, level with the middle of the helmet front to back.
    wing.position.set(hc.x + hs.x * 0.02, head.max.y - hs.y * 1.0, hc.z + side * hs.z * 0.47)
    wings.add(wing)
  }
  model.add(wings)
  return wings
}

/** Bounding box (in model space) of the top slice of the model: the helmet. */
function helmetBox(model: THREE.Object3D): THREE.Box3 {
  model.updateMatrixWorld(true)
  const toModel = model.matrixWorld.clone().invert()
  const meshes: { pos: THREE.BufferAttribute; m: THREE.Matrix4 }[] = []
  let top = -Infinity
  let bottom = Infinity
  const v = new THREE.Vector3()
  model.traverse((o) => {
    const mesh = o as THREE.Mesh
    const pos = mesh.isMesh ? (mesh.geometry.getAttribute('position') as THREE.BufferAttribute) : undefined
    if (!pos) return
    const m = toModel.clone().multiply(mesh.matrixWorld)
    meshes.push({ pos, m })
    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i).applyMatrix4(m)
      top = Math.max(top, v.y)
      bottom = Math.min(bottom, v.y)
    }
  })
  const cut = top - (top - bottom) * 0.08
  const box = new THREE.Box3()
  for (const { pos, m } of meshes) {
    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i).applyMatrix4(m)
      if (v.y >= cut) box.expandByPoint(v)
    }
  }
  return box
}

/**
 * One wing: feathers fanned from a root, the upper ones longest, all curving back at the tip.
 * Wing plane = model X/Y (u = backward = -X, v = up = +Y), then splayed outward on the `side` (+1 = +Z).
 */
function buildWing(size: number, side: number, materials: THREE.Material[]): THREE.Group {
  const wing = new THREE.Group()
  const count = 8
  for (let i = 0; i < count; i++) {
    const k = i / (count - 1) // 0 = top feather, 1 = lowest
    const angle = THREE.MathUtils.degToRad(64 - 58 * k) // from the back (0°) towards up (90°)
    const length = size * (1.15 - 0.6 * k)
    const width = size * (0.2 - 0.05 * k)
    const geo = featherGeometry(length, width, THREE.MathUtils.degToRad(28 - 10 * k), size * 0.012, side * 0.1)
    const f = new THREE.Mesh(geo, materials)
    // Feather axis is +X in its own space: aim it backward (-X) and up, then stack slightly outward.
    f.rotation.z = Math.PI - angle
    f.rotation.x = side * THREE.MathUtils.degToRad(8) // small twist so they catch the light differently
    f.position.set(-size * 0.02 * k, -size * 0.04 * k, side * size * 0.012 * (count - i))
    wing.add(f)
  }
  // Splay: tips go out to the side, and the whole wing leans outward a little.
  wing.rotation.order = 'YXZ'
  wing.rotation.y = side * THREE.MathUtils.degToRad(40)
  wing.rotation.x = side * THREE.MathUtils.degToRad(22)
  return wing
}

/**
 * A tapered feather along +X, curving towards +Y (backward once placed) by `bend` radians at the tip, and
 * curling out of its plane (towards +Z) by `curl` × length at the tip so it catches the light along its length.
 */
function featherGeometry(length: number, width: number, bend: number, thickness: number, curl: number): THREE.BufferGeometry {
  const n = 10
  const left: THREE.Vector2[] = []
  const right: THREE.Vector2[] = []
  const p = new THREE.Vector2()
  for (let j = 0; j <= n; j++) {
    const s = j / n
    const dir = bend * s
    if (j > 0) p.add(new THREE.Vector2(Math.cos(dir), Math.sin(dir)).multiplyScalar(length / n))
    const w = width * Math.sin(Math.PI * Math.pow(s, 0.7))
    const nx = -Math.sin(dir)
    const ny = Math.cos(dir)
    // Asymmetric vane, like a flight feather: narrow on the leading (outer, -Y) side.
    left.push(new THREE.Vector2(p.x + nx * w * 0.65, p.y + ny * w * 0.65))
    right.push(new THREE.Vector2(p.x - nx * w * 0.35, p.y - ny * w * 0.35))
  }
  const shape = new THREE.Shape([...left, ...right.slice(1, -1).reverse()])
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: thickness,
    curveSegments: 1,
    bevelEnabled: true,
    bevelThickness: thickness * 0.8,
    bevelSize: width * 0.06,
    bevelSegments: 1,
  })
  geo.translate(0, 0, -thickness / 2)
  const pos = geo.getAttribute('position') as THREE.BufferAttribute
  for (let i = 0; i < pos.count; i++) {
    const s = Math.max(0, pos.getX(i)) / length
    pos.setZ(i, pos.getZ(i) + curl * length * s * s)
  }
  geo.computeVertexNormals()
  return geo
}
