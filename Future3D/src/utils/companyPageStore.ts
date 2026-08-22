import { create } from 'zustand'

export type CompanyPageId = 'about' | 'payment'

interface CompanyPageState {
  // null = ни одна из отдельных страниц не открыта (обычный лендинг).
  // Тот же архитектурный приём, что у gameStore/galleryStore - простой
  // boolean/enum-флаг в zustand, читаемый из App.tsx для решения, что
  // рендерить поверх сайта.
  page: CompanyPageId | null
  open: (page: CompanyPageId) => void
  close: () => void
}

export const useCompanyPageStore = create<CompanyPageState>((set) => ({
  page: null,
  open: (page) => set({ page }),
  close: () => set({ page: null }),
}))
