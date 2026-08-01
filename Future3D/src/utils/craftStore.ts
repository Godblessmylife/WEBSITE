import { create } from 'zustand'

// "Режим разработчика" (кнопка CRAFT в GameMode.tsx) - как в Майнкрафте,
// объекты на карте можно взять кликом и переставить в другое место.
// active - общий тумблер режима; heldId - id объекта, который сейчас
// "в руках" (см. Grabbable.tsx); overrides - переопределённые позиции,
// per-id, поверх дефолтных из MapProps.tsx (объект без записи здесь
// стоит на своём изначальном месте).
//
// Сайт статический (Vite build + scp на хостинг, без бэкенда/базы) -
// "сохранить на карте" в смысле "чтобы ВСЕ посетители видели новую
// раскладку" отсюда напрямую невозможно, это требовало бы сервера.
// Компромисс из двух частей:
//  1) overrides зеркалируются в localStorage - расстановка переживает
//     перезагрузку страницы В ЭТОМ ЖЕ браузере (то, что раньше "не
//     сохранялось" и обнулялось при каждом заходе).
//  2) кнопка "Экспорт" в HUD (GameMode.tsx) копирует текущие overrides
//     готовым для вставки кодом - результат присылается разработчику,
//     который переносит эти координаты в MapProps.tsx как новые
//     defaultPosition и выкладывает обновлённую сборку - тогда раскладка
//     станет постоянной уже для всех.
const STORAGE_KEY = 'future3d-craft-overrides'

function loadOverrides(): Record<string, [number, number, number]> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

function saveOverrides(overrides: Record<string, [number, number, number]>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(overrides))
  } catch {
    // localStorage недоступен (приватный режим и т.п.) - расстановка
    // просто не переживёт перезагрузку, это не повод падать с ошибкой.
  }
}

interface CraftState {
  active: boolean
  heldId: string | null
  // Y объекта, взятого в руки - записывается в момент pickUp (Grabbable.tsx
  // знает свою текущую позицию, центральный обработчик клика "поставить
  // куда угодно" в GameMode.tsx - нет). Только X/Z переставляются драгом
  // (см. Grabbable.tsx), Y объекта остаётся тем же, каким было.
  heldOriginalY: number | null
  overrides: Record<string, [number, number, number]>
  toggle: () => void
  pickUp: (id: string, y: number) => void
  place: (id: string, position: [number, number, number]) => void
  cancel: () => void
  resetAll: () => void
}

export const useCraftStore = create<CraftState>((set) => ({
  active: false,
  heldId: null,
  heldOriginalY: null,
  overrides: loadOverrides(),
  toggle: () => set((s) => ({ active: !s.active, heldId: null, heldOriginalY: null })),
  pickUp: (id, y) => set((s) => (s.active && !s.heldId ? { heldId: id, heldOriginalY: y } : {})),
  place: (id, position) =>
    set((s) => {
      const overrides = { ...s.overrides, [id]: position }
      saveOverrides(overrides)
      return { heldId: null, heldOriginalY: null, overrides }
    }),
  cancel: () => set({ heldId: null, heldOriginalY: null }),
  // "Вернуть всё как было" - сбрасывает и локальные overrides, и
  // localStorage, без этого отменить неудачную перестановку можно было
  // бы только вручную растащив объекты обратно.
  resetAll: () => {
    saveOverrides({})
    set({ overrides: {}, heldId: null, heldOriginalY: null })
  },
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
