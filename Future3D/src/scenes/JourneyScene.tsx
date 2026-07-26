import { Canvas } from '@react-three/fiber'
import { CameraRig } from './CameraRig'
import { FogController } from './FogController'
import { SceneLighting } from './SceneLighting'
import { SkyZone } from './SkyZone'
import { EarthPlanet } from './EarthPlanet'
import { Satellites } from './Satellites'
import { CloudZone } from './CloudZone'
import { GroundZone } from './GroundZone'
import { Ufos } from './Ufos'
import { SpaceTravelEffect } from './SpaceTravelEffect'
import { FloatingClock } from './FloatingClock'
import { Effects } from '@/effects/Effects'
import { usePerfStore } from '@/utils/perfStore'
import { AdaptivePerformance } from '@/utils/AdaptivePerformance'

export function JourneyScene() {
  // На телефонах даже "средний" GPU часто рендерит на экран с
  // реальным devicePixelRatio 3 — вместе с постобработкой (Bloom и
  // хроматическая аберрация считаются на весь экран в этом
  // разрешении) это самая дорогая часть сайта. Ограничение до 1.5
  // заметно снижает число пикселей на кадр без видимой на телефоне
  // потери резкости. reduced теперь не только по типу устройства
  // (touch/мало ядер CPU) — ещё и по реальному fps через
  // AdaptivePerformance ниже.
  const reduced = usePerfStore((s) => s.reduced)

  return (
    <Canvas
      camera={{ fov: 60, near: 0.1, far: 500, position: [0, 60, 0] }}
      gl={{ antialias: true }}
      dpr={reduced ? [1, 1.5] : [1, 2]}
      style={{ width: '100%', height: '100%', display: 'block' }}
    >
      <AdaptivePerformance />
      <CameraRig />
      <FogController />
      <SceneLighting />
      <SkyZone />
      <EarthPlanet />
      <Satellites />
      <CloudZone />
      <GroundZone />
      <Ufos />
      <SpaceTravelEffect />
      <FloatingClock />
      <Effects />
    </Canvas>
  )
}
