import { create } from 'zustand'

// "Подойти к машине и нажать ENTER, чтобы сесть и ездить" - drivingId -
// id машины (совпадает с id, который она же использует в craftStore.ts/
// Grabbable.tsx), null - персонаж пешком. Один и тот же id-неймспейс с
// craftStore намеренно: при выходе из машины её текущее место "паркуется"
// через тот же craftStore.overrides, которым уже пользуется режим
// разработчика - не нужен отдельный механизм хранения позиции.
interface DriveState {
  drivingId: string | null
  // id машины, рядом с которой сейчас стоит игрок (для мобильной кнопки
  // "Сесть" в GameMode.tsx - ENTER есть только на физической клавиатуре,
  // на телефоне нужен видимый триггер). Обновляется CarDriving.tsx
  // каждый кадр; setNear очищает значение, только если его выставил
  // ТОТ ЖЕ id - иначе, когда машин несколько, проверка "не рядом" одной
  // из них затирала бы верный результат другой в том же кадре.
  nearCarId: string | null
  enter: (id: string) => void
  exit: () => void
  setNear: (id: string, isNear: boolean) => void
}

export const useDriveStore = create<DriveState>((set) => ({
  drivingId: null,
  nearCarId: null,
  enter: (id) => set({ drivingId: id, nearCarId: null }),
  exit: () => set({ drivingId: null }),
  setNear: (id, isNear) =>
    set((s) => {
      if (isNear) return s.nearCarId === id ? s : { nearCarId: id }
      return s.nearCarId === id ? { nearCarId: null } : s
    }),
}))

// Живая позиция/поворот машины во время вождения - vanilla-стор (не
// React state), мутируется каждый кадр в DrivingCar.tsx без ре-рендера -
// тот же приём, что и у minimapPlayerStore.ts/craftGhostStore.ts.
// GameCamera.tsx подписывается на него напрямую, пока drivingId активен.
export const driveLiveStore = create<{ x: number; y: number; z: number; yaw: number }>(() => ({
  x: 0,
  y: 0,
  z: 0,
  yaw: 0,
}))
