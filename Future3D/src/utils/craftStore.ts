import { create } from 'zustand'

// Объекты карты (MapProps.tsx) можно двигать/масштабировать прямо в
// игре - БЕЗ отдельного переключателя "режим CRAFT" (была отдельная
// кнопка, per отзыву клиента запутывала и "не работала"). Теперь просто:
// навёл курсор на любой объект (Grabbable.tsx) - у него сами появляются
// кнопка "Переместить" и шкала масштаба; ничего не нужно включать заранее.
//
// movingId - id объекта, который сейчас "в руках": в этот момент САМА
// модель (не абстрактный превью-бокс, как было раньше) в реальном
// времени следует за курсором - проекция на землю считается один раз за
// кадр в CraftModeController.tsx и раздаётся всем Grabbable через
// craftGhostStore ниже. movingOriginalY - высота объекта на момент начала
// переноса: двигается только X/Z (проекция на землю), высота остаётся
// той же, какой была - записывается в момент старта, т.к. у общего
// обработчика клика "поставить" (см. onPointerMissed в GameMode.tsx) нет
// своего способа узнать высоту конкретного объекта.
//
// overrides - переопределённые позиция/масштаб, per-id, поверх
// дефолтных из MapProps.tsx (объект без записи здесь стоит на своём
// изначальном месте с масштабом 1). Сайт статический (Vite build + scp
// на хостинг, без бэкенда/базы) - "сохранить на карте" в смысле "чтобы
// ВСЕ посетители видели новую раскладку" отсюда напрямую невозможно, это
// требовало бы сервера. Компромисс: overrides зеркалируются в
// localStorage - расстановка переживает перезагрузку страницы В ЭТОМ ЖЕ
// браузере (постоянная для всех посетителей раскладка by-design требует
// прислать координаты разработчику вручную).
const STORAGE_KEY = 'future3d-craft-overrides'
const MOVE_MODE_STORAGE_KEY = 'future3d-move-mode-enabled'

// Режим "перемещение объектов" - выключен по умолчанию. По отзыву
// клиента: невидимая зона джойстика (DynamicJoystick.tsx, GameMode.tsx)
// занимает большую часть экрана на телефоне и перехватывает касания
// РАНЬШЕ, чем они доходят до хитбоксов объектов под ней - поэтому
// "тыкнуть по модели, чтобы переместить" перестало работать на мобильном,
// как только появился джойстик. Одновременно оба способа управления
// касанием работать не могут (тот же палец не может одновременно значить
// "веди персонажа" и "укажи на объект") - явный переключатель в
// настройках (GraphicsSettingsButton.tsx) отдаёт приоритет одному из
// двух: выключено (по умолчанию) - работает джойстик, включено -
// джойстик не рисуется вообще, касания снова доходят до объектов.
function loadMoveModeEnabled(): boolean {
  try {
    return localStorage.getItem(MOVE_MODE_STORAGE_KEY) === '1'
  } catch {
    return false
  }
}

function saveMoveModeEnabled(enabled: boolean) {
  try {
    localStorage.setItem(MOVE_MODE_STORAGE_KEY, enabled ? '1' : '0')
  } catch {
    // localStorage недоступен - переключатель просто не переживёт
    // перезагрузку страницы, не повод падать с ошибкой.
  }
}

export interface ObjectOverride {
  position: [number, number, number]
  scale: number
  // "Повернуть к герою" (по просьбе клиента) - поворот вокруг Y, по
  // умолчанию 0 (как модель стоит в MapProps.tsx изначально). Не влияет
  // на позицию/квесты - чисто визуальная ориентация.
  rotationY: number
}

function loadOverrides(): Record<string, ObjectOverride> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as Record<string, unknown>
    const result: Record<string, ObjectOverride> = {}
    for (const [id, value] of Object.entries(parsed)) {
      // Формат до появления масштаба (просто [x,y,z]) - читаем как есть,
      // масштаб по умолчанию 1, чтобы старые сохранённые расстановки не
      // терялись при обновлении сайта.
      if (Array.isArray(value) && value.length === 3) {
        result[id] = { position: value as [number, number, number], scale: 1, rotationY: 0 }
      } else if (value && typeof value === 'object' && Array.isArray((value as ObjectOverride).position)) {
        const v = value as Partial<ObjectOverride>
        result[id] = {
          position: v.position as [number, number, number],
          scale: typeof v.scale === 'number' ? v.scale : 1,
          rotationY: typeof v.rotationY === 'number' ? v.rotationY : 0,
        }
      }
    }
    return result
  } catch {
    return {}
  }
}

function saveOverrides(overrides: Record<string, ObjectOverride>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(overrides))
  } catch {
    // localStorage недоступен (приватный режим и т.п.) - расстановка
    // просто не переживёт перезагрузку, это не повод падать с ошибкой.
  }
}

export const MIN_SCALE = 0.5
export const MAX_SCALE = 2

interface CraftState {
  movingId: string | null
  movingOriginalY: number | null
  overrides: Record<string, ObjectOverride>
  moveModeEnabled: boolean
  // Дополнение 6 - "липкий" выбор объекта для новой единой нижней панели
  // ObjectToolbar.tsx, которая больше не рисуется самим Grabbable.tsx
  // (была своя всплывающая панель НАД объектом - по отзыву клиента
  // "трудно поймать курсором, убегает при наведении на саму панель").
  // hoveredId выставляется при наведении, но НЕ сбрасывается сам по себе,
  // когда курсор уходит с объекта - иначе он гарантированно сбросился бы
  // раньше, чем курсор долетит от объекта до панели внизу экрана
  // (физически далеко), воспроизводя ту же жалобу в новом месте. Сброс -
  // только явный: клик по пустому месту карты (GameMode.tsx) или
  // наведение на ДРУГОЙ объект (перезаписывает значение). defaultPositions
  // - реестр, наполняется каждым Grabbable при монтировании (см.
  // registerDefaultPosition) - без него ObjectToolbar не знал бы, куда
  // откатывать масштаб для объекта, у которого ещё нет override.
  hoveredId: string | null
  defaultPositions: Record<string, [number, number, number]>
  // Есть 3 объекта карты (Ракета/оба игровых автомата в MapProps.tsx),
  // чьи мировые координаты продублированы в других системах (квесты,
  // миникарта) без механизма синхронизации - переносить их по карте
  // нельзя, не сломав квесты, а вот МАСШТАБИРОВАТЬ можно совершенно
  // безопасно (масштаб на эти внешние системы никак не влияет). movableIds
  // - реестр (наполняется Grabbable при монтировании, как и
  // defaultPositions), default true для любого не зарегистрированного id -
  // ObjectToolbar.tsx читает его, чтобы скрыть кнопку "Переместить" именно
  // для этих объектов, оставив шкалу масштаба доступной.
  movableIds: Record<string, boolean>
  startMoving: (id: string, y: number) => void
  place: (id: string, position: [number, number, number]) => void
  cancelMoving: () => void
  setScale: (id: string, defaultPosition: [number, number, number], scale: number) => void
  setRotationY: (id: string, defaultPosition: [number, number, number], rotationY: number) => void
  setMoveModeEnabled: (enabled: boolean) => void
  setHoveredId: (id: string | null) => void
  registerDefaultPosition: (id: string, position: [number, number, number]) => void
  registerMovable: (id: string, movable: boolean) => void
}

export const useCraftStore = create<CraftState>((set) => ({
  movingId: null,
  movingOriginalY: null,
  overrides: loadOverrides(),
  moveModeEnabled: loadMoveModeEnabled(),
  hoveredId: null,
  defaultPositions: {},
  movableIds: {},
  // Не подхватывает второй объект, пока первый ещё не поставлен -
  // одновременно двигать можно только что-то одно.
  startMoving: (id, y) => set((s) => (s.movingId ? {} : { movingId: id, movingOriginalY: y })),
  place: (id, position) =>
    set((s) => {
      const prevScale = s.overrides[id]?.scale ?? 1
      const prevRotationY = s.overrides[id]?.rotationY ?? 0
      const overrides = { ...s.overrides, [id]: { position, scale: prevScale, rotationY: prevRotationY } }
      saveOverrides(overrides)
      return { movingId: null, movingOriginalY: null, overrides }
    }),
  cancelMoving: () => set({ movingId: null, movingOriginalY: null }),
  setScale: (id, defaultPosition, scale) =>
    set((s) => {
      const position = s.overrides[id]?.position ?? defaultPosition
      const rotationY = s.overrides[id]?.rotationY ?? 0
      const clamped = Math.min(MAX_SCALE, Math.max(MIN_SCALE, scale))
      const overrides = { ...s.overrides, [id]: { position, scale: clamped, rotationY } }
      saveOverrides(overrides)
      return { overrides }
    }),
  setRotationY: (id, defaultPosition, rotationY) =>
    set((s) => {
      const position = s.overrides[id]?.position ?? defaultPosition
      const scale = s.overrides[id]?.scale ?? 1
      const overrides = { ...s.overrides, [id]: { position, scale, rotationY } }
      saveOverrides(overrides)
      return { overrides }
    }),
  setMoveModeEnabled: (enabled) => {
    saveMoveModeEnabled(enabled)
    set({ moveModeEnabled: enabled })
  },
  // Защита от гонки (у Grabbable.tsx скрытие идёт с задержкой 220мс, см.
  // scheduleHidePanel там) сделана СО СТОРОНЫ ВЫЗЫВАЮЩЕГО: перед сбросом
  // в null он сам проверяет, что hoveredId всё ещё равен именно его id -
  // здесь просто безусловная запись.
  setHoveredId: (id) => set({ hoveredId: id }),
  registerDefaultPosition: (id, position) =>
    set((s) => ({ defaultPositions: { ...s.defaultPositions, [id]: position } })),
  registerMovable: (id, movable) => set((s) => ({ movableIds: { ...s.movableIds, [id]: movable } })),
}))

// Живая точка на земле, куда сейчас смотрит курсор - отдельный vanilla-
// стор (не часть useCraftStore выше), мутируется КАЖДЫЙ КАДР в
// CraftModeController.tsx без React-рендера - тот же приём, что и у
// minimapPlayerStore.ts (позиция игрока на миникарте), не через обычный
// zustand-setState с подпиской компонентов, иначе лишний ре-рендер всего
// дерева 60 раз в секунду ради одной движущейся точки. Grabbable.tsx
// объекта, который сейчас двигают, читает её тоже каждый кадр напрямую
// (getState()), без подписки - та же логика.
export const craftGhostStore = create<{ x: number; y: number; z: number; visible: boolean }>(() => ({
  x: 0,
  y: 0,
  z: 0,
  visible: false,
}))
