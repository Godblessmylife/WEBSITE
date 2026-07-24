import { Stars } from '@react-three/drei'
import { SolarSystem } from './SolarSystem'
import { ShootingStars } from './ShootingStars'

// Зона неба/космоса (progress ~0–0.35): звёздное небо, солнечная система
// прямо по курсу камеры в самой начальной точке пути (0,60,0) — герой
// стартует в открытом космосе и видит солнце с планетами вокруг, затем
// уходит вниз, в облака. Переход в облака — CloudZone.
export function SkyZone() {
  return (
    <group position={[0, 50, 0]}>
      <Stars radius={100} depth={60} count={6000} factor={4} saturation={0} fade speed={1} />
      <group position={[0, 5, 14]} scale={1.8}>
        <SolarSystem />
      </group>
      <ShootingStars />
    </group>
  )
}
