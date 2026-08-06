import { create } from 'zustand'

export type GraphicsQuality = 'high' | 'medium' | 'low'

const STORAGE_KEY = 'future3d-graphics-quality'

// По умолчанию ВСЕГДА высокое качество, независимо от устройства - по
// отзыву клиента "раньше графика была очень крутая, сейчас ни о чём":
// раньше touch-устройства автоматически получали урезанный рендер
// (perfStore.ts: isTouch считался признаком "слабого" устройства), хотя
// современный телефон часто мощнее старого ноутбука. Теперь понижение -
// осознанный выбор владельца слабого телефона через кнопку-шестерёнку в
// игре (GraphicsSettingsButton.tsx), а не молчаливое предположение по
// одному лишь наличию тачскрина. localStorage - выбор запоминается между
// заходами в игру, не нужно каждый раз понижать заново.
function readStored(): GraphicsQuality {
  if (typeof window === 'undefined') return 'high'
  const raw = window.localStorage.getItem(STORAGE_KEY)
  return raw === 'high' || raw === 'medium' || raw === 'low' ? raw : 'high'
}

interface GraphicsQualityState {
  quality: GraphicsQuality
  setQuality: (quality: GraphicsQuality) => void
}

export const useGraphicsQualityStore = create<GraphicsQualityState>((set) => ({
  quality: readStored(),
  setQuality: (quality) => {
    if (typeof window !== 'undefined') window.localStorage.setItem(STORAGE_KEY, quality)
    set({ quality })
  },
}))
