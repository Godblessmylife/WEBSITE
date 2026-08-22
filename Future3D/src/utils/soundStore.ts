import { create } from 'zustand'

const VOLUME_STORAGE_KEY = 'future3d-sfx-volume'

function loadVolume(): number {
  try {
    const raw = Number(localStorage.getItem(VOLUME_STORAGE_KEY))
    return Number.isFinite(raw) && raw >= 0 && raw <= 1 ? raw : 0.6
  } catch {
    return 0.6
  }
}

function saveVolume(volume: number) {
  try {
    localStorage.setItem(VOLUME_STORAGE_KEY, String(volume))
  } catch {
    // localStorage недоступен - громкость просто не переживёт перезагрузку.
  }
}

interface SoundState {
  volume: number
  setVolume: (volume: number) => void
}

// Громкость звуковых эффектов (шаги/прыжок/бонусы/квесты/машина) -
// ОТДЕЛЬНО от громкости музыки (musicStore.ts): это разные источники
// (процедурные эффекты через soundManager.ts против настоящих mp3-треков),
// у игрока должен быть независимый контроль над каждым. Тот же
// localStorage-паттерн, что и у остальных персонализированных настроек.
export const useSoundStore = create<SoundState>((set) => ({
  volume: loadVolume(),
  setVolume: (volume) => {
    const clamped = Math.min(1, Math.max(0, volume))
    saveVolume(clamped)
    set({ volume: clamped })
  },
}))
