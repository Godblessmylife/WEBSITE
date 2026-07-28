import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useCraftStore, craftGhostStore } from '@/utils/craftStore'

// Плоскость земли (DesertGround в GameWorld.tsx стоит на y=0) - пока
// что-то "в руках" (heldId), каждый кадр бросаем луч из камеры через
// текущую позицию курсора (state.pointer - R3F уже отслеживает её сам,
// не нужен собственный window-listener) и находим точку пересечения -
// это и есть "где объект встанет", если кликнуть сейчас.
const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0)
const raycaster = new THREE.Raycaster()
const hitPoint = new THREE.Vector3()

export function CraftModeController() {
  useFrame((state) => {
    const heldId = useCraftStore.getState().heldId
    if (!heldId) {
      if (craftGhostStore.getState().visible) craftGhostStore.setState({ visible: false })
      return
    }

    raycaster.setFromCamera(state.pointer, state.camera)
    if (raycaster.ray.intersectPlane(groundPlane, hitPoint)) {
      craftGhostStore.setState({ x: hitPoint.x, y: hitPoint.y, z: hitPoint.z, visible: true })
    }
  })

  return null
}
