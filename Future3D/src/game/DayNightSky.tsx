import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { dayNightStore, DAY_CYCLE_SECONDS } from '@/utils/dayNightStore'

// Солнце "ходит" по дуге вокруг фиксированной точки (0,0,-45) - тот же
// центр, вокруг которого и стояло старое статичное солнце (35,45,-45),
// просто теперь оно ещё и двигается. Направленный свет без явного target
// по умолчанию светит на мировой (0,0,0) - ровно туда, где стоит игрок в
// начале и куда стремится карта - поэтому направление освещения остаётся
// корректным на любой фазе цикла без ручной настройки target.
const SUN_ORBIT_RADIUS = 55
const SUN_BASE_HEIGHT = 14

const NIGHT_SUN_COLOR = new THREE.Color('#5c7ab8')
const DUSK_SUN_COLOR = new THREE.Color('#ff9d5c')
const DAY_SUN_COLOR = new THREE.Color('#ffe9c2')

const NIGHT_AMBIENT_COLOR = new THREE.Color('#2c3a5c')
const DAY_AMBIENT_COLOR = new THREE.Color('#ffe9c2')

const workingColor = new THREE.Color()

// Не трогает фон/туман сцены (GameMode.tsx: <color>/<fog>) - те общие на
// ВСЮ сцену, включая космическую зону (SpaceZone.tsx), у которой уже
// своя, намеренно тёмная эстетика звёздного неба. Меняя только солнце и
// рассеянный свет, день/ночь читается по земле/объектам пустыни (мягче,
// теплее днём, темнее и холоднее ночью), не ломая космос наверху.
export function DayNightSky() {
  const sunGroupRef = useRef<THREE.Group>(null!)
  const sunLightRef = useRef<THREE.DirectionalLight>(null!)
  const sunMaterialRef = useRef<THREE.MeshBasicMaterial>(null!)
  const ambientRef = useRef<THREE.AmbientLight>(null!)

  useFrame((_, rawDelta) => {
    // БАГ, найденный при тестировании (после серии восстановлений
    // WebGL-контекста сцена внезапно оказывалась почти чёрной): R3F отдаёт
    // РЕАЛЬНОЕ время между кадрами - если где-то в игре случился долгий
    // стопор (пересборка Canvas при восстановлении контекста, тяжёлая
    // синхронная работа и т.п.), следующий delta может оказаться в
    // секунды, а не в доли секунды. Без ограничения это двигало бы время
    // суток скачком на заметную часть всего цикла за один кадр - та же
    // защита от "прыжка после паузы", что уже применяется в других местах
    // проекта через усреднение/сглаживание кадровых времён (см.
    // GameDebugHUD.tsx).
    const delta = Math.min(rawDelta, 0.1)
    const t = (dayNightStore.getState().timeOfDay + delta / DAY_CYCLE_SECONDS) % 1
    dayNightStore.setState({ timeOfDay: t })

    const angle = t * Math.PI * 2
    // sunHeight: 1 в полдень (t=0), -1 в полночь (t=0.5).
    const sunHeight = Math.cos(angle)
    const sunX = Math.sin(angle) * SUN_ORBIT_RADIUS
    const sunY = sunHeight * SUN_ORBIT_RADIUS * 0.55 + SUN_BASE_HEIGHT
    sunGroupRef.current.position.set(sunX, sunY, -45)

    // daylight: 0 глубокой ночью, 1 днём, плавный переход через сумерки
    // при sunHeight около нуля (восход/закат).
    const daylight = THREE.MathUtils.clamp((sunHeight + 0.3) / 0.6, 0, 1)

    // Двухсегментный переход ночь->сумерки->день даёт настоящий оранжевый
    // закат/рассвет вместо "грязного" прямого перехода синий->кремовый.
    if (daylight > 0.5) {
      workingColor.copy(DUSK_SUN_COLOR).lerp(DAY_SUN_COLOR, (daylight - 0.5) / 0.5)
    } else {
      workingColor.copy(NIGHT_SUN_COLOR).lerp(DUSK_SUN_COLOR, daylight / 0.5)
    }
    sunLightRef.current.color.copy(workingColor)
    sunLightRef.current.intensity = THREE.MathUtils.lerp(0.2, 2.4, daylight)
    sunMaterialRef.current.color.copy(workingColor)

    ambientRef.current.color.copy(NIGHT_AMBIENT_COLOR).lerp(DAY_AMBIENT_COLOR, daylight)
    ambientRef.current.intensity = THREE.MathUtils.lerp(0.22, 0.7, daylight)
  })

  return (
    <>
      <ambientLight ref={ambientRef} intensity={0.7} color="#ffe9c2" />
      <group ref={sunGroupRef} position={[35, 45, -45]}>
        <mesh>
          <sphereGeometry args={[6, 24, 24]} />
          <meshBasicMaterial ref={sunMaterialRef} color="#ffdca0" toneMapped={false} />
        </mesh>
        <directionalLight ref={sunLightRef} intensity={2.4} color="#ffe9c2" castShadow />
      </group>
    </>
  )
}
