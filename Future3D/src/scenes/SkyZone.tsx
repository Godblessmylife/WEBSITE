import { Stars } from '@react-three/drei'
import { Sun } from './Sun'
import { ShootingStars } from './ShootingStars'

// Зона неба/космоса (progress ~0–0.35): звёздное небо и солнце прямо по
// курсу камеры в самой начальной точке пути (0,60,0) — старт в открытом
// космосе, затем уход вниз, в облака (CloudZone). Декоративные
// орбитальные планеты убраны по просьбе клиента — единственная планета
// на сайте теперь настоящая (EarthPlanet).
export function SkyZone() {
  return (
    <group position={[0, 50, 0]}>
      <Stars radius={100} depth={60} count={6000} factor={4} saturation={0} fade speed={1} />
      <group position={[0, 5, 14]} scale={1.8}>
        <Sun />
      </group>
      <ShootingStars />
    </group>
  )
}
