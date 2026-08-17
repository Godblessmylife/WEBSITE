import { create } from 'zustand'

export type GraphicsQuality = 'high' | 'medium' | 'low'

const STORAGE_KEY = 'future3d-graphics-quality'
// Дополнение 6 - по просьбе клиента "настройки графики более подробные,
// как в WoW/GTA6" - три новых, РЕАЛЬНО влияющих на картинку параметра
// (не декоративные): угол обзора камеры, множитель дальности прорисовки
// (поверх CAMERA_FAR/FOG_FAR из worldConstants.ts - сами константы
// остаются дефолтами, здесь только коэффициент) и явный переключатель
// теней. Тот же localStorage-паттерн, что и у quality выше - выбор
// переживает перезаход в игру.
const FOV_STORAGE_KEY = 'future3d-graphics-fov'
const DRAW_DISTANCE_STORAGE_KEY = 'future3d-graphics-draw-distance'
const SHADOWS_STORAGE_KEY = 'future3d-graphics-shadows'

export const DEFAULT_FOV = 60
export const MIN_FOV = 45
export const MAX_FOV = 90
export const DEFAULT_DRAW_DISTANCE_MULTIPLIER = 1
export const MIN_DRAW_DISTANCE_MULTIPLIER = 0.5
export const MAX_DRAW_DISTANCE_MULTIPLIER = 1.5

function readNumber(key: string, fallback: number, min: number, max: number): number {
  if (typeof window === 'undefined') return fallback
  const raw = Number(window.localStorage.getItem(key))
  return Number.isFinite(raw) && raw >= min && raw <= max ? raw : fallback
}

function readShadows(): boolean {
  if (typeof window === 'undefined') return true
  const raw = window.localStorage.getItem(SHADOWS_STORAGE_KEY)
  return raw === null ? true : raw === '1'
}

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
  fov: number
  setFov: (fov: number) => void
  drawDistanceMultiplier: number
  setDrawDistanceMultiplier: (multiplier: number) => void
  shadowsEnabled: boolean
  setShadowsEnabled: (enabled: boolean) => void
}

export const useGraphicsQualityStore = create<GraphicsQualityState>((set) => ({
  quality: readStored(),
  setQuality: (quality) => {
    if (typeof window !== 'undefined') window.localStorage.setItem(STORAGE_KEY, quality)
    set({ quality })
  },
  fov: readNumber(FOV_STORAGE_KEY, DEFAULT_FOV, MIN_FOV, MAX_FOV),
  setFov: (fov) => {
    const clamped = Math.min(MAX_FOV, Math.max(MIN_FOV, fov))
    if (typeof window !== 'undefined') window.localStorage.setItem(FOV_STORAGE_KEY, String(clamped))
    set({ fov: clamped })
  },
  drawDistanceMultiplier: readNumber(
    DRAW_DISTANCE_STORAGE_KEY,
    DEFAULT_DRAW_DISTANCE_MULTIPLIER,
    MIN_DRAW_DISTANCE_MULTIPLIER,
    MAX_DRAW_DISTANCE_MULTIPLIER,
  ),
  setDrawDistanceMultiplier: (multiplier) => {
    const clamped = Math.min(MAX_DRAW_DISTANCE_MULTIPLIER, Math.max(MIN_DRAW_DISTANCE_MULTIPLIER, multiplier))
    if (typeof window !== 'undefined') window.localStorage.setItem(DRAW_DISTANCE_STORAGE_KEY, String(clamped))
    set({ drawDistanceMultiplier: clamped })
  },
  shadowsEnabled: readShadows(),
  setShadowsEnabled: (enabled) => {
    if (typeof window !== 'undefined') window.localStorage.setItem(SHADOWS_STORAGE_KEY, enabled ? '1' : '0')
    set({ shadowsEnabled: enabled })
  },
}))
