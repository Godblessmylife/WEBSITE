import { create } from 'zustand'
import { DEFAULT_HERO_ID } from './heroModels'

// Тот же паттерн persisted-переключателя, что и moveModeEnabled в
// craftStore.ts - переживает перезагрузку страницы в ЭТОМ ЖЕ браузере
// (сайт статический, без бэкенда/базы - см. подробное объяснение там же).
const STORAGE_KEY = 'future3d-selected-hero'

function loadSelectedHero(): string {
  try {
    return localStorage.getItem(STORAGE_KEY) ?? DEFAULT_HERO_ID
  } catch {
    return DEFAULT_HERO_ID
  }
}

function saveSelectedHero(id: string) {
  try {
    localStorage.setItem(STORAGE_KEY, id)
  } catch {
    // localStorage недоступен - выбор просто не переживёт перезагрузку.
  }
}

interface HeroSelectionState {
  selectedHeroId: string
  setSelectedHero: (id: string) => void
}

export const useHeroSelectionStore = create<HeroSelectionState>((set) => ({
  selectedHeroId: loadSelectedHero(),
  setSelectedHero: (id) => {
    saveSelectedHero(id)
    set({ selectedHeroId: id })
  },
}))
