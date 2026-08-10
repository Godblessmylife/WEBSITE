import { create } from 'zustand'

// Какая карточка портфолио (индекс в THEMES) сейчас открыта в
// PortfolioCardDetail.tsx - null означает "окно закрыто". Тот же
// простой паттерн, что и galleryStore.ts, но хранит КОНКРЕТНУЮ
// карточку, а не просто булев флаг - разным карточкам соответствует
// разное содержимое окна.
interface CardDetailState {
  openCardIndex: number | null
  openCard: (index: number) => void
  close: () => void
}

export const useCardDetailStore = create<CardDetailState>((set) => ({
  openCardIndex: null,
  openCard: (index) => set({ openCardIndex: index }),
  close: () => set({ openCardIndex: null }),
}))
