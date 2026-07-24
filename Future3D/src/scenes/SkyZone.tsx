import { Stars } from '@react-three/drei'
import { SolarSystemModel } from './SolarSystemModel'
import { ShootingStars } from './ShootingStars'
import { SOLAR_SYSTEM_TARGET, SOLAR_SYSTEM_SCALE } from './cameraPath'

const ZONE_ORIGIN_Y = 50

// Зона неба/космоса (progress ~0–0.35): звёздное небо и реальная
// анимированная модель солнечной системы (клиент прислал
// solar_system.glb — все планеты + запечённые орбиты). Позиция модели
// синхронизирована с SOLAR_SYSTEM_TARGET из cameraPath.ts — именно туда
// смотрит камера в начале пути (см. CameraRig.tsx), независимо от
// направления спуска, иначе плоский широкий диск планет почти целиком
// уходит за кадр. Затем уход вниз, в облака (CloudZone). Единственная
// "настоящая" планета отдельно от этой модели — детальная Земля
// крупным планом (EarthPlanet), к которой ведёт весь спуск.
export function SkyZone() {
  return (
    <group position={[0, ZONE_ORIGIN_Y, 0]}>
      <Stars radius={100} depth={60} count={6000} factor={4} saturation={0} fade speed={1} />
      <group
        position={[SOLAR_SYSTEM_TARGET.x, SOLAR_SYSTEM_TARGET.y - ZONE_ORIGIN_Y, SOLAR_SYSTEM_TARGET.z]}
        scale={SOLAR_SYSTEM_SCALE}
      >
        <SolarSystemModel />
      </group>
      <ShootingStars />
    </group>
  )
}
