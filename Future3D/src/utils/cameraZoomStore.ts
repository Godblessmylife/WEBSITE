import { create } from 'zustand'

// Переключатель "ближе к лицу" (Дополнение 4) - просто более близкий
// ракурс третьего лица, не настоящий вид от первого лица (решено с
// клиентом - ниже риск сломать существующую камеру). Не persisted -
// осмыслен только в рамках текущей игровой сессии, по умолчанию обычный
// (не приближенный) ракурс.
interface CameraZoomState {
  zoomed: boolean
  toggle: () => void
}

export const useCameraZoomStore = create<CameraZoomState>((set) => ({
  zoomed: false,
  toggle: () => set((s) => ({ zoomed: !s.zoomed })),
}))
