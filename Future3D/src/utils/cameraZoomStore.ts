import { create } from 'zustand'

// "Ближе к лицу" (Дополнение 4) - просто более близкий ракурс третьего
// лица, не настоящий вид от первого лица (решено с клиентом - ниже риск
// сломать существующую камеру). Дополнение 6: было бинарным
// вкл/выкл-переключателем - по отзыву клиента "приближает быстро очень и
// слишком сверху", заменено на ручной слайдер в процентах (0 = обычный
// ракурс, 1 = максимально приближенный) - GameCamera.tsx лерпит офсет
// камеры между LOCAL_OFFSET и ZOOM_OFFSET по этому значению вместо
// мгновенного бинарного переключения. Не persisted - осмыслено только в
// рамках текущей игровой сессии, по умолчанию обычный (не приближенный)
// ракурс.
interface CameraZoomState {
  zoomLevel: number
  setZoomLevel: (level: number) => void
}

export const useCameraZoomStore = create<CameraZoomState>((set) => ({
  zoomLevel: 0,
  setZoomLevel: (level) => set({ zoomLevel: Math.min(1, Math.max(0, level)) }),
}))
