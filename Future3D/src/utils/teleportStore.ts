import { create } from 'zustand'

interface TeleportState {
  // true на время визуального эффекта (вспышка/кольцо) - TeleportEffect.tsx
  // рендерится, пока это true.
  active: boolean
  // Увеличивается ровно в момент физического перемещения тела (Portal.tsx),
  // ПОСЕРЕДИНЕ анимации эффекта, пока экран залит вспышкой - GameCamera.tsx
  // сравнивает счётчик с последним увиденным значением и, если он изменился,
  // отменяет плавный lerp камеры на один кадр (иначе камера будет несколько
  // секунд "долетать" через всю карту от старой позиции к новой, что видно
  // сразу после того, как вспышка сойдёт).
  snapNonce: number
  setActive: (active: boolean) => void
  triggerSnap: () => void
}

export const useTeleportStore = create<TeleportState>((set) => ({
  active: false,
  snapNonce: 0,
  setActive: (active) => set({ active }),
  triggerSnap: () => set((s) => ({ snapNonce: s.snapNonce + 1 })),
}))
