import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Stars } from '@react-three/drei'
import * as THREE from 'three'
import { SolarSystemModel } from './SolarSystemModel'
import { SOLAR_SYSTEM_TARGET, SOLAR_SYSTEM_SCALE } from './cameraPath'

const ZONE_ORIGIN_Y = 50

// Соотношение сторон, при котором на глаз подобран SOLAR_SYSTEM_SCALE
// (обычный широкий десктопный экран) - на более узком/портретном экране
// (телефон) при том же вертикальном FOV камеры видно МЕНЬШЕ по
// горизонтали, и широкий плоский диск колец упирался в левый/правый
// край кадра (отзыв клиента "солнечная система не вмещается в экран,
// кольца выходят за края"). Камеру/путь трогать рискованно - общие на
// всё путешествие (см. CameraRig.tsx/cameraPath.ts) - вместо этого
// у СВОЕЙ группы модели каждый кадр пересчитывается дополнительный
// множитель масштаба, пропорциональный тому, во сколько раз реальный
// aspect уже эталонного. MIN_FIT_SCALE - чтобы на совсем узких экранах
// модель не сжималась до почти невидимой точки.
const REFERENCE_ASPECT = 1.6
const MIN_FIT_SCALE = 0.6

// Зона неба/космоса (progress ~0–0.35): звёздное небо и реальная
// анимированная модель солнечной системы (клиент прислал
// solar_system.glb — все планеты + запечённые орбиты). Позиция модели
// синхронизирована с SOLAR_SYSTEM_TARGET из cameraPath.ts — именно туда
// смотрит камера в начале пути (см. CameraRig.tsx), независимо от
// направления спуска, иначе плоский широкий диск планет почти целиком
// уходит за кадр. Затем уход вниз, в облака (CloudZone). Единственная
// "настоящая" планета отдельно от этой модели — детальная Земля
// крупным планом (EarthPlanet), к которой ведёт весь спуск.
function ResponsiveSolarSystem() {
  const groupRef = useRef<THREE.Group>(null!)

  useFrame((state) => {
    const camera = state.camera as THREE.PerspectiveCamera
    const fitScale = Math.max(MIN_FIT_SCALE, Math.min(1, camera.aspect / REFERENCE_ASPECT))
    groupRef.current.scale.setScalar(SOLAR_SYSTEM_SCALE * fitScale)
  })

  return (
    <group
      ref={groupRef}
      position={[SOLAR_SYSTEM_TARGET.x, SOLAR_SYSTEM_TARGET.y - ZONE_ORIGIN_Y, SOLAR_SYSTEM_TARGET.z]}
      scale={SOLAR_SYSTEM_SCALE}
    >
      <SolarSystemModel />
    </group>
  )
}

export function SkyZone() {
  return (
    <group position={[0, ZONE_ORIGIN_Y, 0]}>
      <Stars radius={100} depth={60} count={6000} factor={4} saturation={0} fade speed={1} />
      <ResponsiveSolarSystem />
    </group>
  )
}
