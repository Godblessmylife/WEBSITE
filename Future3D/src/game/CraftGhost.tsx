import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { craftGhostStore } from '@/utils/craftStore'

// "Показывается, где он встанет" - полупрозрачный каркасный куб,
// следующий за проекцией курсора на землю (CraftModeController.tsx),
// пока что-то держится в руках. Один общий габарит для всех объектов
// (а не точный bbox каждого) - простое, но достаточно понятное
// превью места установки без необходимости тащить в этот компонент
// геометрию/масштаб каждой конкретной постройки.
export function CraftGhost() {
  const meshRef = useRef<THREE.Mesh>(null!)

  useEffect(() => {
    const unsub = craftGhostStore.subscribe((s) => {
      meshRef.current.visible = s.visible
      meshRef.current.position.set(s.x, s.y + 3, s.z)
    })
    return unsub
  }, [])

  return (
    <mesh ref={meshRef} visible={false}>
      <boxGeometry args={[6, 6, 6]} />
      <meshBasicMaterial color="#5fd4ff" transparent opacity={0.35} wireframe toneMapped={false} />
    </mesh>
  )
}
