import { create } from 'zustand'

interface GameState {
  isGameActive: boolean
  setGameActive: (active: boolean) => void
}

export const useGameStore = create<GameState>((set) => ({
  isGameActive: false,
  setGameActive: (active) => set({ isGameActive: active }),
}))
