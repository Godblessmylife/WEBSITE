import { create } from 'zustand'

interface GameDebugState {
  fps: number
  pos: string
  isMoving: boolean
  isOnGround: boolean
  isFalling: boolean
  setDebug: (state: Omit<GameDebugState, 'setDebug'>) => void
}

// Отдельный store (а не React state прямо в компоненте) специально
// затем, чтобы отслеживающая часть (useFrame, обязана жить ВНУТРИ
// Canvas) и отображающая часть (обычный DOM-оверлей поверх Canvas,
// живёт СНАРУЖИ) могли быть двумя разными компонентами, не деля общий
// React-стейт через проп-прокидывание сквозь границу Canvas.
export const useGameDebugStore = create<GameDebugState>((set) => ({
  fps: 0,
  pos: '—',
  isMoving: false,
  isOnGround: false,
  isFalling: false,
  setDebug: (state) => set(state),
}))
