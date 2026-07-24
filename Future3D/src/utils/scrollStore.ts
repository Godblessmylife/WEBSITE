import { create } from 'zustand'
import type Lenis from 'lenis'
import { inverseEaseProgress } from './scrollEasing'

interface ScrollState {
  progress: number
  velocity: number
  lenis: Lenis | null
  setProgress: (progress: number, velocity: number) => void
  setLenis: (lenis: Lenis) => void
  scrollToProgress: (target: number) => void
  scrollToElement: (selector: string) => void
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
    // progress хранится уже смягчённым через easeProgress(rawScroll) —
    // раньше здесь был линейный пересчёт target*limit, из-за чего кнопки
    // навигации промахивались мимо нужного места (не совпадало с тем,
    // где реально окажется этот progress на кривой). Инверсия здесь
    // возвращает "сырую" scroll-позицию, дающую нужный progress.
    const rawTarget = inverseEaseProgress(target)
    lenis.scrollTo(rawTarget * lenis.limit, { duration: 1.6 })
  },
  // Для обычных DOM-секций контента (О нас/Цены/Контакты/Игра) —
  // они идут после 3D-путешествия в нормальном потоке страницы, им не
  // нужен пересчёт через easeProgress, просто скролл к элементу через
  // тот же Lenis (чтобы не было двух конкурирующих scroll-систем).
  scrollToElement: (selector) => {
    const lenis = get().lenis
    if (!lenis) return
    lenis.scrollTo(selector, { duration: 1.6 })
  },
}))
