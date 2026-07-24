import { useEffect, useRef } from 'react'
import { useGLTF, useAnimations } from '@react-three/drei'
import * as THREE from 'three'
import solarSystemUrl from '../models/solar_system.glb'

// Модель от клиента: Меркурий-Плутон + Луна + кольцо Сатурна, с
// запечённой анимацией орбит и вращения (44 канала, 20 сек, зациклена).
// Прогнана через gltf-transform (10.64 МБ -> 2.11 МБ: WebP-текстуры,
// meshopt) с явно отключёнными join/flatten/instance/palette — эти
// шаги объединяют ноды и ломают привязку анимации к конкретным
// планетам. Исходник — solar_system.source.glb, не коммитится.
// Заменяет прежние процедурные Sun.tsx + вручную анимированные планеты.
export function SolarSystemModel() {
  const groupRef = useRef<THREE.Group>(null!)
  const { scene, animations } = useGLTF(solarSystemUrl)
  const { actions, names } = useAnimations(animations, groupRef)

  useEffect(() => {
    const firstAction = names[0] ? actions[names[0]] : null
    firstAction?.reset().play()
  }, [actions, names])

  return (
    <group ref={groupRef} scale={0.6}>
      <primitive object={scene} />
      {/* модель не содержит реального источника света (только emissive-
          текстуру солнца) — добавляем point light рядом с центром сцены,
          где по конвенции солнечных систем располагается солнце. */}
      <pointLight color="#ffedc2" intensity={60} distance={150} decay={2} />
    </group>
  )
}

useGLTF.preload(solarSystemUrl)
