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

  // Клиент: "на мобильном устройстве кольца вокруг планет светятся
  // зелёным" (на ПК - синим/голубым). Найдено числовой проверкой
  // материала кольца (gltf-transform, material "Material", BLEND):
  // emissiveFactor = [0, 1, 0.9497] - green КАНАЛ ровно 1.0, чуть ВЫШЕ
  // blue (0.95) - формально почти чистый cyan, но с "зелёным перевесом"
  // прямо в исходных данных модели. На разных GPU/цветовых конвейерах
  // (у мобильных браузеров/GPU это особенно часто отличается от
  // десктопных) такая пара каналов, отличающихся на волосок, легко
  // рендерится с заметным перекосом в сторону более сильного канала -
  // отсюда "на телефоне зеленее". Не пытаемся угадать, ГДЕ именно в
  // пайплайне рендера возникает это отличие (нет доступа к реальному
  // мобильному устройству, чтобы проверить) - вместо этого заменяем сам
  // цвет на однозначно СИНЕ-доминантный (#5fd4ff, тот же акцентный цвет,
  // что и по всему остальному сайту - навигация, миникарта), где blue
  // явно больше green - при такой разнице лёгкий перекос рендера уже не
  // сможет дотянуть результат до зелёного оттенка.
  useEffect(() => {
    scene.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        const material = child.material as THREE.MeshStandardMaterial | undefined
        if (material?.name === 'Material') {
          material.emissive.set('#5fd4ff')
        }
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
