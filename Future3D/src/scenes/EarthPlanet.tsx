import { useEffect, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
import * as THREE from 'three'
import earthModelUrl from '../models/earth.glb'

// earth.glb — модель от клиента (Sketchfab), прогнанная через
// gltf-transform: конвертация из устаревшего KHR_materials_pbrSpecularGlossiness
// в metal/rough (современный GLTFLoader его не понимает "из коробки"),
// плюс сжатие геометрии (meshopt) и текстуры (8192x4096 JPG -> 4096x2048
// WebP, средний уровень качества по выбору клиента). Итог 22.67 МБ ->
// 1.47 МБ. Исходный файл лежит рядом как earth.source.glb и не
// коммитится (см. .gitignore).
const MODEL_SOURCE_RADIUS = 100 // радиус сферы в исходной модели (bbox)

// БЫЛО: Земля гасла к концу пути и "перетекала" в отдельный
// процедурный город (GroundZone) поверх неё. Убрано по просьбе клиента -
// город на месте посадки был неубедителен (маленький расчищенный пятачок
// у самой точки приземления почти никогда не попадал в кадр под нужным
// углом, а вокруг нужно было либо ничего не видно, либо мешанина
// зданий). Теперь весь финал пути (см. FINAL_DESCENT_REMAP_START /
// MAX_DIVE_T в cameraPath.ts) - это буквально зум В планету: Земля
// остаётся полностью непрозрачной и видимой до самого конца, только
// приближается и растёт (см. SCALE_FAR/NEAR_DISTANCE ниже) - без
// повторного затухания.
export const PLANET_CENTER = new THREE.Vector3(0, -40, 20)
export const PLANET_RADIUS = 45
const MODEL_SCALE = PLANET_RADIUS / MODEL_SOURCE_RADIUS

// Раньше Земля появлялась по прогрессу скролла (0-0.05 — практически
// мгновенно), пока камера была ещё в 80-100 юнитах от неё. На таком
// расстоянии экспоненциальный туман сцены (FogController, density до
// 0.035) даёт коэффициент тумана под 0.95+ — планета не пряталась, а
// рендерилась сплошным засвеченным пятном ЦВЕТА ТУМАНА (белым/облачным
// в этой фазе пути) поверх реальной текстуры: отсюда и "белая
// туманность" вместо планеты, и "плоская" (никакого объёма не видно
// сквозь такую засветку). Два независимых исправления:
//  1) fog=false на материалах Земли/атмосферы — обычный туман сцены
//     предназначен для ближнего воздуха/облаков, а не далёкой планеты;
//     Земля рендерится с полным контрастом собственного освещения
//     независимо от тумана между камерой и остальной сценой.
//  2) появление завязано на РЕАЛЬНОЕ расстояние камера->центр планеты,
//     а не на прогресс скролла — так "проявление" физически совпадает
//     с моментом настоящего приближения, а не происходит на глазок.
//
// ВТОРАЯ итерация. Клиент (используя JourneyTuner.tsx, где 0-100% -
// это доля именно ВИДИМОГО путешествия, не progress) сообщил: "к планете
// приближаться сквозь космос, а не то, что она сразу большая появляется".
// Численно (скрипт, тот же расчёт, что и в JourneyTuner) старые пороги
// (72/54) укладывали ВСЁ раскрытие (0% непрозрачности -> ~98%) в
// progress~0.705-0.865, а это всего ~83-100% от видимого путешествия -
// на глаз ровно "внезапно появилась" в последний момент. Дистанция от
// камеры до планеты на самом деле снижается монотонно и плавно
// ВСЮ дорогу (101.98 на 0% пути -> 55.59 на 100%) - её просто не
// использовали настолько рано, насколько можно было. Новые пороги
// растягивают появление на весь диапазон "полёта через космос":
// FAR=95 (дистанция на ~45-48% пути - Земля начинает проступать ещё
// очень далёкой точкой) -> NEAR=60 (дистанция на ~95% пути - почти
// полная непрозрачность прямо перед входом в облака/город). На 80%
// пути (дистанция ~76) это даёт ~56% непрозрачности - планета уже
// хорошо видна издалека, но продолжает "наливаться" по мере подлёта,
// а не хлопает сразу в полный размер.
export const REVEAL_FAR_DISTANCE = 95
export const REVEAL_NEAR_DISTANCE = 60

// ТРЕТЬЯ итерация — потребовалась сразу после проверки скриншотом на
// 80%: с одной только непрозрачностью планета на 80% пути оказалась
// ОГРОМНОЙ, на весь экран, а не "видна издалека", как просил клиент.
// Причина в геометрии, не в порогах: PLANET_RADIUS=45, а реальная
// дистанция камера->центр планеты во ВСЁМ путешествии лежит в диапазоне
// 55-102 (см. таблицу в EarthPlanet.tsx истории) — то есть камера НИКОГДА
// не оказывается достаточно далеко, чтобы сфера радиусом 45 выглядела
// маленькой чисто через перспективу (на дистанции 76 ближняя точка
// поверхности всего в 31 юните от камеры). Это нельзя починить только
// порогами прозрачности - масштаб "маленькая далёкая планета" физически
// недостижим при таком радиусе и такой дистанции.
// Решение — отдельная, более узкая (и куда более позднaя) кривая
// МАСШТАБА поверх уже имеющейся кривой непрозрачности: сама модель
// растёт от MIN_VISUAL_SCALE (маленькая точка) до полного размера
// только на последнем отрезке подлёта (дистанция 76->58, это ~80%-96%
// пути) — раньше, пока непрозрачность уже растёт (45%-80% пути),
// планета видна, но нарочно остаётся маленькой. Не физически точная
// перспектива, а художественный приём (тот же, которым в большинстве
// космических фильмов "подделывают" ощущение приближения к планете
// нереалистичного в игровых масштабах размера).
const SCALE_FAR_DISTANCE = 76
const SCALE_NEAR_DISTANCE = 58
const MIN_VISUAL_SCALE = 0.12

export function EarthPlanet() {
  const { scene } = useGLTF(earthModelUrl)
  const modelRef = useRef<THREE.Group>(null!)
  const atmoRef = useRef<THREE.Mesh>(null!)

  useEffect(() => {
    scene.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        ;(child.material as THREE.MeshStandardMaterial).fog = false
      }
    })
  }, [scene])

  useFrame((state, delta) => {
    const distance = state.camera.position.distanceTo(PLANET_CENTER)
    const opacity = 1 - THREE.MathUtils.smoothstep(distance, REVEAL_NEAR_DISTANCE, REVEAL_FAR_DISTANCE)
    const visible = opacity > 0.01

    const sizeFade = 1 - THREE.MathUtils.smoothstep(distance, SCALE_NEAR_DISTANCE, SCALE_FAR_DISTANCE)
    const visualScale = THREE.MathUtils.lerp(MIN_VISUAL_SCALE, 1, sizeFade) * MODEL_SCALE

    modelRef.current.rotation.y += delta * 0.02
    modelRef.current.visible = visible
    modelRef.current.scale.setScalar(visualScale)
    modelRef.current.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        const material = child.material as THREE.MeshStandardMaterial
        material.transparent = opacity < 1
        material.opacity = opacity
      }
    })

    const atmosphereMaterial = atmoRef.current.material as THREE.MeshBasicMaterial
    atmoRef.current.scale.setScalar(1.04 * THREE.MathUtils.lerp(MIN_VISUAL_SCALE, 1, sizeFade))
    atmosphereMaterial.opacity = opacity * 0.4
    atmosphereMaterial.visible = visible
  })

  return (
    <group position={PLANET_CENTER}>
      <group ref={modelRef}>
        <primitive object={scene} />
      </group>
      <mesh ref={atmoRef}>
        <sphereGeometry args={[PLANET_RADIUS, 48, 48]} />
        <meshBasicMaterial
          color="#6fb7ff"
          transparent
          opacity={0.3}
          side={THREE.BackSide}
          depthWrite={false}
          fog={false}
        />
      </mesh>
    </group>
  )
}

useGLTF.preload(earthModelUrl)
