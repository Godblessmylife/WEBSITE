import { Stars } from '@react-three/drei'
import { SolarSystemModel } from './SolarSystemModel'
import { ShootingStars } from './ShootingStars'

// Зона неба/космоса (progress ~0–0.35): звёздное небо и реальная
// анимированная модель солнечной системы (клиент прислал
// solar_system.glb — все планеты + запечённые орбиты) прямо по курсу
// камеры в самой начальной точке пути (0,60,0). Затем уход вниз, в
// облака (CloudZone). Единственная "настоящая" планета отдельно от
// этой модели — детальная Земля крупным планом (EarthPlanet), к
// которой ведёт весь спуск.
export function SkyZone() {
  return (
    <group position={[0, 50, 0]}>
      <Stars radius={100} depth={60} count={6000} factor={4} saturation={0} fade speed={1} />
      <group position={[0, 5, 14]}>
        <SolarSystemModel />
      </group>
      <ShootingStars />
    </group>
  )
}
