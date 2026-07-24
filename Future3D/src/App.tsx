import { useLenis } from '@/hooks/useLenis'
import { JourneyScene } from '@/scenes/JourneyScene'
import './styles/globals.css'

// Высота скролл-спейсера определяет, сколько реальных пикселей скролла
// уходит на полный проход камеры от неба до земли (progress 0 -> 1).
const SCROLL_HEIGHT_VH = 500

export function App() {
  useLenis()

  return (
    <>
      <JourneyScene />
      <div style={{ height: `${SCROLL_HEIGHT_VH}vh` }} />
    </>
  )
}
