import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useCraftStore, craftGhostStore } from '@/utils/craftStore'
import { useBuildStore, buildGhostStore, BUILD_CELL_SIZE } from '@/utils/buildStore'

// Плоскость земли (DesertGround в GameWorld.tsx стоит на y=0) - пока
// что-то "в руках" (movingId), каждый кадр бросаем луч из камеры через
// текущую позицию курсора (state.pointer - R3F уже отслеживает её сам,
// не нужен собственный window-listener) и находим точку пересечения -
// это и есть "где объект встанет", если кликнуть сейчас. Работает
// всегда (без отдельного "режима CRAFT") - Grabbable.tsx включает
// movingId только после клика по кнопке "Переместить" на конкретном
// объекте, так что этот раскаст простаивает (early return ниже) почти
// всё время игры.
const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0)
const raycaster = new THREE.Raycaster()
const hitPoint = new THREE.Vector3()

export function CraftModeController() {
  useFrame((state) => {
    const movingId = useCraftStore.getState().movingId
    if (movingId) {
      raycaster.setFromCamera(state.pointer, state.camera)
      if (raycaster.ray.intersectPlane(groundPlane, hitPoint)) {
        craftGhostStore.setState({ x: hitPoint.x, y: hitPoint.y, z: hitPoint.z, visible: true })
      }
    } else if (craftGhostStore.getState().visible) {
      craftGhostStore.setState({ visible: false })
    }

    // Кирка (Дополнение 3, буквы e) - тот же покадровый raycast на землю,
    // что и выше, только результат привязывается к сетке BUILD_CELL_SIZE
    // (Math.round вместо сырой точки пересечения), чтобы блоки стыковались
    // друг с другом без зазоров/наложений, как кубики в Minecraft.
    if (useBuildStore.getState().pickaxeActive) {
      raycaster.setFromCamera(state.pointer, state.camera)
      if (raycaster.ray.intersectPlane(groundPlane, hitPoint)) {
        const snappedX = Math.round(hitPoint.x / BUILD_CELL_SIZE) * BUILD_CELL_SIZE
        const snappedZ = Math.round(hitPoint.z / BUILD_CELL_SIZE) * BUILD_CELL_SIZE
        buildGhostStore.setState({ x: snappedX, z: snappedZ, visible: true })
      }
    } else if (buildGhostStore.getState().visible) {
      buildGhostStore.setState({ visible: false })
    }
  })

  return null
}
