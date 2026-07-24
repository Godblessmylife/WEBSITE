import '@fontsource/orbitron/700.css'
import '@fontsource/orbitron/500.css'
import { useLenis } from '@/hooks/useLenis'
import { JourneyScene } from '@/scenes/JourneyScene'
import { Nav } from '@/components/Nav'
import './styles/globals.css'

// Высота скролл-спейсера определяет, сколько реальных пикселей скролла
// уходит на полный проход камеры от неба до земли (progress 0 -> 1).
// Увеличено с 500 до 1000 по просьбе клиента — путь ощущался слишком
// быстрым, особенно теперь, когда появилась отдельная "сцена планеты".
const SCROLL_HEIGHT_VH = 1000

export function App() {
  useLenis()

  return (
    <>
      <JourneyScene />
      <Nav />
      <div style={{ height: `${SCROLL_HEIGHT_VH}vh` }} />
    </>
  )
}
