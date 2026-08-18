import { create } from 'zustand'

const TOTAL_SCORE_STORAGE_KEY = 'future3d-total-score'

function loadTotalScore(): number {
  try {
    const raw = Number(localStorage.getItem(TOTAL_SCORE_STORAGE_KEY))
    return Number.isFinite(raw) && raw >= 0 ? raw : 0
  } catch {
    return 0
  }
}

function saveTotalScore(totalScore: number) {
  try {
    localStorage.setItem(TOTAL_SCORE_STORAGE_KEY, String(totalScore))
  } catch {
    // localStorage недоступен - накопленный счёт просто не переживёт
    // перезагрузку, не повод падать с ошибкой.
  }
}

interface GameState {
  isGameActive: boolean
  setGameActive: (active: boolean) => void
  score: number
  // totalScore - НЕ сбрасывается между заходами в игру (в отличие от
  // score выше, который считает очки только ТЕКУЩЕГО забега и виден в
  // HUD) - нужен для уровня персонажа в ProfilePanel.tsx (по просьбе
  // клиента "показывало уровень"): персонаж не должен "откатываться" на
  // 1 уровень каждый раз при новом заходе в игру.
  totalScore: number
  addScore: (amount: number) => void
}

// Уровень персонажа (ProfilePanel.tsx, по просьбе клиента "показывало
// уровень") - производная величина от totalScore, не отдельное
// состояние: 100 очков (бонус = 10 очков, Bonuses.tsx; квест = 50-90
// очков, questStore.ts) на уровень - за один забег реально набрать
// 1-2 уровня, прогресс ощущается, но не мгновенный.
export const LEVEL_SCORE_STEP = 100
export function levelFromScore(totalScore: number): number {
  return Math.floor(totalScore / LEVEL_SCORE_STEP) + 1
}

export const useGameStore = create<GameState>((set) => ({
  isGameActive: false,
  // Счёт сбрасывается при каждом ВХОДЕ в игру (не при выходе) — так на
  // экране START после выхода видно, что игра просто ждёт, а не
  // показывает случайный счёт от прошлой попытки.
  setGameActive: (active) => set((state) => ({ isGameActive: active, score: active ? 0 : state.score })),
  score: 0,
  totalScore: loadTotalScore(),
  addScore: (amount) =>
    set((state) => {
      const totalScore = state.totalScore + amount
      saveTotalScore(totalScore)
      return { score: state.score + amount, totalScore }
    }),
}))
