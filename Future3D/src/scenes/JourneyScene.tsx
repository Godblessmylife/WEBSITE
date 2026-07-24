import { Canvas } from '@react-three/fiber'
import { CameraRig } from './CameraRig'
import { FogController } from './FogController'
import { SkyZone } from './SkyZone'
import { CloudZone } from './CloudZone'
import { GroundZone } from './GroundZone'

export function JourneyScene() {
  return (
    <Canvas
      camera={{ fov: 60, near: 0.1, far: 500 }}
      gl={{ antialias: true }}
      style={{ position: 'fixed', inset: 0 }}
    >
      <CameraRig />
      <FogController />
      <SkyZone />
      <CloudZone />
      <GroundZone />
    </Canvas>
  )
}
