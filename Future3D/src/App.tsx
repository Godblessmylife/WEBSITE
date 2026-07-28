import { Suspense, lazy } from 'react'
import '@fontsource/orbitron/700.css'
import '@fontsource/orbitron/500.css'
import '@fontsource/inter/400.css'
import '@fontsource/inter/600.css'
import { useLenis } from '@/hooks/useLenis'
import { JourneyScene } from '@/scenes/JourneyScene'
import { Nav } from '@/components/Nav'
import { AboutSection } from '@/components/AboutSection'
import { PortfolioCarousel } from '@/components/PortfolioCarousel'
import { PortfolioGallery } from '@/components/PortfolioGallery'
import { PricingSection } from '@/components/PricingSection'
import { ContactSection } from '@/components/ContactSection'
import { GameEntry } from '@/components/GameEntry'
import { GameLoadingScreen } from '@/game/GameLoadingScreen'
import { GameErrorBoundary } from '@/game/GameErrorBoundary'
import { JourneyTuner } from '@/components/JourneyTuner'
import { StratosphereFlash } from '@/components/StratosphereFlash'
import { JourneyTaglines } from '@/components/JourneyTaglines'
import { useGameStore } from '@/utils/gameStore'
import { useGalleryStore } from '@/utils/galleryStore'
import { SCROLL_HEIGHT_VH } from '@/utils/scrollStore'
import './styles/globals.css'

// GameMode тянет за собой ecctrl + @react-three/rapier (WASM-физика) —
// это добавило ~4.3 МБ в основной JS-бандл (gzip 550 КБ -> 2.17 МБ),
// хотя игру запускает не каждый посетитель. lazy() + Suspense выносят
// это в отдельный chunk, который грузится только по клику на START.
const GameMode = lazy(() => import('@/game/GameMode').then((m) => ({ default: m.GameMode })))

export function App() {
  useLenis()
  const isGameActive = useGameStore((s) => s.isGameActive)
  const setGameActive = useGameStore((s) => s.setGameActive)
  const isGalleryOpen = useGalleryStore((s) => s.isOpen)

  return (
    <>
      <Nav />
      {/* JourneyScene закреплена (position: sticky) внутри этого спейсера.
          Пока скроллим спейсер, 3D-сцена стоит на месте на весь экран;
          как только спейсер заканчивается, sticky сама "отпускает" её —
          сцена естественно уезжает вверх, открывая контент ниже. Без
          ручного JS/слежения за скроллом. */}
      <div style={{ position: 'relative', height: `${SCROLL_HEIGHT_VH}vh` }}>
        <div style={{ position: 'sticky', top: 0, height: '100vh', overflow: 'hidden' }}>
          <JourneyScene />
          <StratosphereFlash />
          <JourneyTaglines />
        </div>
      </div>

      {/* Реальный контент лендинга — раньше после 3D-путешествия шли
          только карусель и игра, ни слова о том, что делает разработчик,
          сколько это стоит и как с ним связаться. */}
      <AboutSection />
      <PortfolioCarousel />
      <PricingSection />
      <ContactSection />
      <GameEntry />

      {isGameActive && (
        <GameErrorBoundary onExit={() => setGameActive(false)}>
          <Suspense fallback={<GameLoadingScreen />}>
            <GameMode />
          </Suspense>
        </GameErrorBoundary>
      )}

      {isGalleryOpen && <PortfolioGallery />}

      <JourneyTuner />
    </>
  )
}
