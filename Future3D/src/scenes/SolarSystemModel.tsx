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

  // Узлы орбит названы в самой модели "<планета>_BezierCircle..." - но
  // ЭТО ИМЯ НОСЯТ ДВЕ РАЗНЫЕ ВЕЩИ: "mercury_BezierCircle_4" - это группа-
  // ПИВОТ для самой планеты (внутри неё меш планеты, смещённый на 1 и
  // умноженный на масштаб радиуса орбиты - на неё же навешана запечённая
  // анимация вращения), а "mercury_BezierCircle.001_34" (с ".001") -
  // ОТДЕЛЬНЫЙ узел с одной лишь тонкой кольцевой геометрией орбиты,
  // без планеты внутри (проверено расчётом через gltf-transform: у
  // первой группы есть дочерний узел с мешем планеты, у второй - только
  // сам меш кольца). Проверка ТОЛЬКО на "BezierCircle" (без ".001")
  // ловила ОБЕ группы разом - все 9 планет и Луна пропадали со сцены
  // вместе с кольцами. Именно ".001" отличает "просто траектория, не
  // тело" (то, что клиент увидел как "резкие лучи в хаотичном
  // направлении, словно звездопад" на широком новом окне сближения
  // 20-55%) от самих планет, которые скрывать не нужно.
  useEffect(() => {
    scene.traverse((child) => {
      if (child.name.includes('BezierCircle.001')) {
        child.visible = false
      }
    })
  }, [scene])

  return (
    <group ref={groupRef}>
      <primitive object={scene} />
      {/* модель не содержит реального источника света (только emissive-
          текстуру солнца) — добавляем point light рядом с центром сцены,
          где по конвенции солнечных систем располагается солнце. */}
      <pointLight color="#ffedc2" intensity={60} distance={150} decay={2} />
    </group>
  )
}

useGLTF.preload(solarSystemUrl)
