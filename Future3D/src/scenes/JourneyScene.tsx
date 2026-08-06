import { Canvas } from '@react-three/fiber'
import { CameraRig } from './CameraRig'
import { FogController } from './FogController'
import { SceneLighting } from './SceneLighting'
import { SkyZone } from './SkyZone'
import { EarthPlanet } from './EarthPlanet'
import { Satellites } from './Satellites'
import { CloudZone } from './CloudZone'
import { Ufos } from './Ufos'
import { SpaceTravelEffect } from './SpaceTravelEffect'
import { FloatingClock } from './FloatingClock'
import { ParticleHeading } from './ParticleHeading'
import { Effects } from '@/effects/Effects'
import { usePerfStore } from '@/utils/perfStore'
import { useGameStore } from '@/utils/gameStore'
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
  const setReduced = usePerfStore((s) => s.setReduced)

  // По жалобе клиента: игра на мобильных вылетала от малейшего лага,
  // особенно рядом с бонусами/на резких поворотах - то есть именно там,
  // где на экран одномоментно приходится больше всего работы. Причина
  // не в самой игре: этот Canvas (полный пайплайн путешествия - Bloom,
  // хроматическая аберрация, десяток моделей) НИКОГДА не размонтировался
  // и продолжал рендериться на полной скорости, даже когда GameMode
  // (СВОЙ отдельный Canvas/WebGL-контекст) рисуется поверх него на весь
  // экран - плюс к этому у секций О нас/Цены/Контакты/Портфолио/START
  // ещё 4 собственных Canvas (см. SectionStarfield.tsx, PortfolioCarousel
  // .tsx, GameEntry.tsx), которые ТОЖЕ никогда не размонтируются. На
  // мобильном GPU одновременно несколько WebGL-контекстов - типичная
  // причина потери контекста ("вылетает") под malейшей дополнительной
  // нагрузкой, особенно в Safari на iOS, который агрессивно убивает
  // контексты при нехватке видеопамяти. Пока идёт игра, путешествие всё
  // равно полностью закрыто фикс-оверлеем GameMode - не размонтировать
  // его смысла нет.
  const isGameActive = useGameStore((s) => s.isGameActive)
  if (isGameActive) return null

  return (
    <Canvas
      camera={{ fov: 60, near: 0.1, far: 500, position: [0, 60, 0] }}
      gl={{ antialias: true }}
      dpr={reduced ? [1, 1.5] : [1, 2]}
      style={{ width: '100%', height: '100%', display: 'block' }}
    >
      <AdaptivePerformance setReduced={setReduced} />
      <CameraRig />
      <FogController />
      <SceneLighting />
      <SkyZone />
      <EarthPlanet />
      <Satellites />
      <CloudZone />
      <Ufos />
      <SpaceTravelEffect />
      {/* Второй экземпляр — "эффект ускорения" на подлёте к Земле
          (~55-88% видимого путешествия, см. JourneyTuner.tsx) - по
          просьбе клиента "приближаться к планете сквозь космос". Окно
          подобрано так, чтобы погаснуть до перехода в облака
          (FogController: SKY_HOLD_END). */}
      <SpaceTravelEffect start={0.376} peakEnd={0.545} end={0.74} />
      {/* Третий экземпляр — тот же эффект на финальном "нырке" в Землю
          (progress FINAL_DESCENT_REMAP_START..1, см. cameraPath.ts) —
          раньше этот участок пути был физически недостижим (progress
          не долетал до 1.0, пока сцена видна), поэтому там никогда не
          было никакого эффекта; после починки CameraRig.tsx камера
          реально долетает до земли на этом окне, и клиенту понравился
          такой же "падающих лучей" эффект на 70% - здесь он же, синхронно
          с самим погружением к поверхности. */}
      <SpaceTravelEffect start={0.75} peakEnd={0.8} end={0.85} color="#ffe4b8" />
      <FloatingClock />
      <ParticleHeading />
      <Effects />
    </Canvas>
  )
}
