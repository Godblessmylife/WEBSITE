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
import { PricingSection } from '@/components/PricingSection'
import { ContactSection } from '@/components/ContactSection'
import { GameEntry } from '@/components/GameEntry'
import { useGameStore } from '@/utils/gameStore'
import './styles/globals.css'

// GameMode тянет за собой ecctrl + @react-three/rapier (WASM-физика) —
// это добавило ~4.3 МБ в основной JS-бандл (gzip 550 КБ -> 2.17 МБ),
// хотя игру запускает не каждый посетитель. lazy() + Suspense выносят
// это в отдельный chunk, который грузится только по клику на START.
const GameMode = lazy(() => import('@/game/GameMode').then((m) => ({ default: m.GameMode })))

// Высота скролл-спейсера определяет, сколько реальных пикселей скролла
// уходит на полный проход камеры от неба до земли (progress 0 -> 1).
// 500 -> 1000 -> 1600: с каждым запросом клиента путь ощущался слишком
// быстрым, особенно с учётом добавленных сцен (планета, подлёт к ядру
// солнечной системы) — им всем нужно место, чтобы раскрыться на скролле.
const SCROLL_HEIGHT_VH = 1600

export function App() {
  useLenis()
  const isGameActive = useGameStore((s) => s.isGameActive)

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
        <Suspense fallback={null}>
          <GameMode />
        </Suspense>
      )}
    </>
  )
}
