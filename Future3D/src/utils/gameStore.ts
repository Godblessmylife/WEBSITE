import { create } from 'zustand'

interface GameState {
  isGameActive: boolean
  setGameActive: (active: boolean) => void
  score: number
  addScore: (amount: number) => void
}

export const useGameStore = create<GameState>((set) => ({
  isGameActive: false,
  // Счёт сбрасывается при каждом ВХОДЕ в игру (не при выходе) — так на
  // экране START после выхода видно, что игра просто ждёт, а не
  // показывает случайный счёт от прошлой попытки.
  setGameActive: (active) => set((state) => ({ isGameActive: active, score: active ? 0 : state.score })),
  score: 0,
  addScore: (amount) => set((state) => ({ score: state.score + amount })),
}))
