import { useEffect, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
import * as THREE from 'three'
import { useScrollStore } from '@/utils/scrollStore'
import earthModelUrl from '../models/earth.glb'

// earth.glb — модель от клиента (Sketchfab), прогнанная через
// gltf-transform: конвертация из устаревшего KHR_materials_pbrSpecularGlossiness
// в metal/rough (современный GLTFLoader его не понимает "из коробки"),
// плюс сжатие геометрии (meshopt) и текстуры (8192x4096 JPG -> 4096x2048
// WebP, средний уровень качества по выбору клиента). Итог 22.67 МБ ->
// 1.47 МБ. Исходный файл лежит рядом как earth.source.glb и не
// коммитится (см. .gitignore).
const MODEL_SOURCE_RADIUS = 100 // радиус сферы в исходной модели (bbox)

// Земля теперь не гаснет на подлёте, а "перетекает" в город: центр
// планеты подобран так, что финальная точка камеры (0, 1.6, 0) почти
// касается её поверхности, поэтому весь конец спуска — это подлёт
// вплотную к Земле (видна текстура крупным планом), а GroundZone
// проявляется поверх неё в конце (см. FADE_OUT_START/END ниже и
// зеркальный fade-in в GroundZone.tsx) — единое место, а не два
// разных "низа".
export const PLANET_CENTER = new THREE.Vector3(0, -40, 20)
export const PLANET_RADIUS = 45
const MODEL_SCALE = PLANET_RADIUS / MODEL_SOURCE_RADIUS
export const FADE_OUT_START = 0.9
export const FADE_OUT_END = 0.97

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
// Пороги подобраны по реальной выборке cameraPath.getPointAt (шаг
// 0.025 по всей длине пути, посчитано отдельным скриптом): дистанция
// опускается ниже 72 около progress~0.705 и ниже 54 около progress~0.865
// — то есть раскрытие идёт примерно на 0.705-0.865, до начала
// FADE_OUT_START (0.9), без наложения одного на другое.
export const REVEAL_FAR_DISTANCE = 72
export const REVEAL_NEAR_DISTANCE = 54

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
    const progress = THREE.MathUtils.clamp(useScrollStore.getState().progress, 0, 1)
    modelRef.current.rotation.y += delta * 0.02

    const distance = state.camera.position.distanceTo(PLANET_CENTER)
    const fadeIn = 1 - THREE.MathUtils.smoothstep(distance, REVEAL_NEAR_DISTANCE, REVEAL_FAR_DISTANCE)
    const fadeOut = 1 - THREE.MathUtils.smoothstep(progress, FADE_OUT_START, FADE_OUT_END)
    const opacity = fadeIn * fadeOut
    const visible = opacity > 0.01

    modelRef.current.visible = visible
    modelRef.current.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        const material = child.material as THREE.MeshStandardMaterial
        material.transparent = opacity < 1
        material.opacity = opacity
      }
    })

    const atmosphereMaterial = atmoRef.current.material as THREE.MeshBasicMaterial
    atmosphereMaterial.opacity = opacity * 0.4
    atmosphereMaterial.visible = visible
  })

  return (
    <group position={PLANET_CENTER}>
      <group ref={modelRef} scale={MODEL_SCALE}>
        <primitive object={scene} />
      </group>
      <mesh ref={atmoRef} scale={1.04}>
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
