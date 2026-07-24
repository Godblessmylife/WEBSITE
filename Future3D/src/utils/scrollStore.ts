import { create } from 'zustand'

interface ScrollState {
  progress: number
  velocity: number
  setProgress: (progress: number, velocity: number) => void
}

export const useScrollStore = create<ScrollState>((set) => ({
  progress: 0,
  velocity: 0,
  setProgress: (progress, velocity) => set({ progress, velocity }),
}))
