import { create } from 'zustand'
import type Lenis from 'lenis'
import { inverseEaseProgress } from './scrollEasing'

// Высота скролл-спейсера определяет, сколько реальных пикселей скролла
// уходит на полный проход камеры от неба до земли. 500 -> 1000 -> 1600:
// с каждым запросом клиента путь ощущался слишком быстрым, особенно с
// учётом добавленных сцен (планета, подлёт к ядру солнечной системы) —
// им всем нужно место, чтобы раскрыться на скролле.
//
// Вынесена сюда, а не оставлена локальной константой в App.tsx, потому
// что JourneyTuner.tsx (инструмент точной прокрутки по путешествию)
// тоже должен знать эту цифру, чтобы переводить "где именно в
// путешествии" в реальный пиксель скролла, а не полагаться на
// progress/lenis.limit — см. комментарий у scrollToJourneyFraction ниже.
export const SCROLL_HEIGHT_VH = 1600

interface ScrollState {
  progress: number
  velocity: number
  lenis: Lenis | null
  setProgress: (progress: number, velocity: number) => void
  setLenis: (lenis: Lenis) => void
  scrollToProgress: (target: number) => void
  scrollToElement: (selector: string) => void
  scrollToJourneyFraction: (fraction: number) => void
}

// Реальная высота скролл-спейсера (px) минус высота экрана — ровно
// столько пикселей скролла "живёт" видимое 3D-путешествие, пока sticky
// не отпустит сцену (см. App.tsx). Пересчитывается каждый вызов (не
// кешируется) — окно может измениться размером между вызовами (resize,
// поворот телефона).
export function journeyScrollRangePx() {
  const spacerPx = (SCROLL_HEIGHT_VH / 100) * window.innerHeight
  return Math.max(0, spacerPx - window.innerHeight)
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
  // Для JourneyTuner.tsx (инструмент точной прокрутки по путешествию) —
  // НЕ переиспользует scrollToProgress выше специально: progress в этом
  // сторе — это доля скролла ОТ ВСЕЙ СТРАНИЦЫ (Lenis.progress = scroll/
  // limit, limit = высота всего документа, а не только спейсера), тогда
  // как sticky-обёртка (App.tsx) физически отпускает 3D-сцену уже на
  // ~76% скролла ВСЕЙ страницы — после этой точки видна обычная DOM-
  // секция "О нас" и дальше, а не путешествие. scrollToProgress(1) увёл
  // бы в самый низ страницы (мимо игры и контактов), а не "к городу в
  // конце путешествия". Эта функция вместо доли от ВСЕЙ страницы
  // работает с долей от РЕАЛЬНОГО видимого диапазона путешествия —
  // 100% здесь гарантированно попадает в последний видимый кадр 3D-сцены,
  // а не куда-то вглубь текстовых секций.
  scrollToJourneyFraction: (fraction) => {
    const lenis = get().lenis
    if (!lenis) return
    const clamped = Math.min(1, Math.max(0, fraction))
    lenis.scrollTo(clamped * journeyScrollRangePx(), { duration: 0.9 })
  },
}))
