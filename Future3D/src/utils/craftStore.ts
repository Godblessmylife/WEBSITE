import { create } from 'zustand'

// "Режим разработчика" (кнопка CRAFT в GameMode.tsx) - как в Майнкрафте,
// объекты на карте можно взять кликом и переставить в другое место.
// active - общий тумблер режима; heldId - id объекта, который сейчас
// "в руках" (см. Grabbable.tsx); overrides - переопределённые позиции,
// per-id, поверх дефолтных из MapProps.tsx (объект без записи здесь
// стоит на своём изначальном месте).
interface CraftState {
  active: boolean
  heldId: string | null
  overrides: Record<string, [number, number, number]>
  toggle: () => void
  pickUp: (id: string) => void
  place: (id: string, position: [number, number, number]) => void
  cancel: () => void
}

export const useCraftStore = create<CraftState>((set) => ({
  active: false,
  heldId: null,
  overrides: {},
  toggle: () => set((s) => ({ active: !s.active, heldId: null })),
  pickUp: (id) => set((s) => (s.active && !s.heldId ? { heldId: id } : {})),
  place: (id, position) =>
    set((s) => ({ heldId: null, overrides: { ...s.overrides, [id]: position } })),
  cancel: () => set({ heldId: null }),
}))

// Живая позиция "призрака" (превью места установки) во время переноса -
// отдельный vanilla-стор (не часть useCraftStore выше), мутируется КАЖДЫЙ
// КАДР в CraftModeController.tsx без React-рендера - тот же приём, что и
// у minimapPlayerStore.ts (позиция игрока на миникарте), не через обычный
// zustand-setState с подпиской компонентов, иначе лишний ре-рендер всего
// дерева 60 раз в секунду ради одной движущейся точки.
export const craftGhostStore = create<{ x: number; y: number; z: number; visible: boolean }>(() => ({
  x: 0,
  y: 0,
  z: 0,
  visible: false,
}))
