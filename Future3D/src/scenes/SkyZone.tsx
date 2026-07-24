import { Stars } from '@react-three/drei'
import { SolarSystem } from './SolarSystem'
import { ShootingStars } from './ShootingStars'

// Зона неба/космоса (progress ~0–0.35): звёздное небо, солнечная система
// на заднем плане, метеорный дождь. Переход в облака — CloudZone.
export function SkyZone() {
  return (
    <group position={[0, 50, 0]}>
      <Stars radius={100} depth={60} count={6000} factor={4} saturation={0} fade speed={1} />
      <group position={[0, 10, -40]} scale={1.5}>
        <SolarSystem />
      </group>
      <ShootingStars />
      <ambientLight intensity={0.15} />
    </group>
  )
}
