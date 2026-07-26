import { create } from 'zustand'

interface GodModeState {
  active: boolean
  toggle: () => void
}

// Полёт без гравитации на большой скорости, по кнопке в HUD (GameMode.tsx).
// Читается PlayerCharacter.tsx (переключает между обычным Ecctrl-движением
// и ручным управлением скоростью тела) и GameMode.tsx (подсветка кнопки).
export const useGodModeStore = create<GodModeState>((set) => ({
  active: false,
  toggle: () => set((s) => ({ active: !s.active })),
}))
