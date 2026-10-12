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
  scene.add(model)

  // Frame the model and put a soft shadow disc under its feet.
  const box = new THREE.Box3().setFromObject(model)
  const size = box.getSize(new THREE.Vector3())
  const center = box.getCenter(new THREE.Vector3())
  const shadow = new THREE.Mesh(
    new THREE.CircleGeometry(Math.max(size.x, size.z) * 0.7, 48),
    new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.25 }),
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
