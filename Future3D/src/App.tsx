import '@fontsource/orbitron/700.css'
import '@fontsource/orbitron/500.css'
import { useLenis } from '@/hooks/useLenis'
import { JourneyScene } from '@/scenes/JourneyScene'
import { Nav } from '@/components/Nav'
import { PortfolioCarousel } from '@/components/PortfolioCarousel'
import './styles/globals.css'

// Высота скролл-спейсера определяет, сколько реальных пикселей скролла
// уходит на полный проход камеры от неба до земли (progress 0 -> 1).
// 500 -> 1000 -> 1600: с каждым запросом клиента путь ощущался слишком
// быстрым, особенно с учётом добавленных сцен (планета, подлёт к ядру
// солнечной системы) — им всем нужно место, чтобы раскрыться на скролле.
const SCROLL_HEIGHT_VH = 1600

export function App() {
  useLenis()

  return (
    <>
      <Nav />
      {/* JourneyScene закреплена (position: sticky) внутри этого спейсера.
          Пока скроллим спейсер, 3D-сцена стоит на месте на весь экран;
          как только спейсер заканчивается, sticky сама "отпускает" её —
          сцена естественно уезжает вверх, открывая карусель ниже. Без
          ручного JS/слежения за скроллом. */}
      <div style={{ position: 'relative', height: `${SCROLL_HEIGHT_VH}vh` }}>
        <div style={{ position: 'sticky', top: 0, height: '100vh', overflow: 'hidden' }}>
          <JourneyScene />
        </div>
      </div>
      <PortfolioCarousel />
    </>
  )
}
