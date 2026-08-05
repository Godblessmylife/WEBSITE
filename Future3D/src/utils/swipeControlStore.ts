import { create } from 'zustand'

interface SwipeControlState {
  forward: boolean
  backward: boolean
  leftward: boolean
  rightward: boolean
}

const IDLE: SwipeControlState = { forward: false, backward: false, leftward: false, rightward: false }

// Читается в PlayerCharacter.tsx как ecctrl.getState() (не React-хук) —
// пишется из SwipeControls.tsx на каждое touchmove, дублировать это в
// React-состоянии ради одного useFrame-чтения в кадр было бы лишним
// перерендером всего HUD 60 раз в секунду.
export const useSwipeControlStore = create<SwipeControlState>(() => ({ ...IDLE }))

export function setSwipeDirection(direction: keyof SwipeControlState | null) {
  useSwipeControlStore.setState({
    forward: direction === 'forward',
    backward: direction === 'backward',
    leftward: direction === 'leftward',
    rightward: direction === 'rightward',
  })
}
