import { Canvas } from '@react-three/fiber'
import { CameraRig } from './CameraRig'
import { FogController } from './FogController'
import { SceneLighting } from './SceneLighting'
import { SkyZone } from './SkyZone'
import { EarthPlanet } from './EarthPlanet'
import { CloudZone } from './CloudZone'
import { GroundZone } from './GroundZone'
import { Hero } from './Hero'
import { Effects } from '@/effects/Effects'

export function JourneyScene() {
  return (
    <Canvas
      camera={{ fov: 60, near: 0.1, far: 500, position: [0, 60, 0] }}
      gl={{ antialias: true }}
      style={{ position: 'fixed', inset: 0 }}
    >
      <CameraRig />
      <FogController />
      <SceneLighting />
      <SkyZone />
      <EarthPlanet />
      <CloudZone />
      <GroundZone />
      <Hero />
      <Effects />
    </Canvas>
  )
}
