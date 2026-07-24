import { create } from 'zustand'
import type Lenis from 'lenis'

interface ScrollState {
  progress: number
  velocity: number
  lenis: Lenis | null
  setProgress: (progress: number, velocity: number) => void
  setLenis: (lenis: Lenis) => void
  scrollToProgress: (target: number) => void
}

export const useScrollStore = create<ScrollState>((set, get) => ({
  progress: 0,
  velocity: 0,
  lenis: null,
  setProgress: (progress, velocity) => set({ progress, velocity }),
  setLenis: (lenis) => set({ lenis }),
  scrollToProgress: (target) => {
    const lenis = get().lenis
    if (!lenis) return
    lenis.scrollTo(target * lenis.limit, { duration: 1.6 })
  },
}))
