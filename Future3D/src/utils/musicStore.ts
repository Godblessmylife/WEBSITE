import { create } from 'zustand'

const VOLUME_STORAGE_KEY = 'future3d-music-volume'

function loadVolume(): number {
  try {
    const raw = Number(localStorage.getItem(VOLUME_STORAGE_KEY))
    return Number.isFinite(raw) && raw >= 0 && raw <= 1 ? raw : 0.5
  } catch {
    return 0.5
  }
}

function saveVolume(volume: number) {
  try {
    localStorage.setItem(VOLUME_STORAGE_KEY, String(volume))
  } catch {
    // localStorage недоступен - громкость просто не переживёт перезагрузку.
  }
}

interface MusicState {
  currentIndex: number | null
  isPlaying: boolean
  volume: number
  setCurrentIndex: (index: number | null) => void
  setIsPlaying: (playing: boolean) => void
  setVolume: (volume: number) => void
}

// Состояние встроенного музыкального плеера (MusicPlayer.tsx) - сам
// HTMLAudioElement живёт в компоненте (стор не может держать DOM-узел),
// этот стор - только "что должно играть" и "с какой громкостью", тот же
// паттерн, что cameraZoomStore.ts. currentIndex - индекс в MUSIC_TRACKS
// (musicTracks.ts), не сам трек - список может измениться, а хранить
// нужно только "какой по счёту сейчас играет".
export const useMusicStore = create<MusicState>((set) => ({
  currentIndex: null,
  isPlaying: false,
  volume: loadVolume(),
  setCurrentIndex: (index) => set({ currentIndex: index }),
  setIsPlaying: (playing) => set({ isPlaying: playing }),
  setVolume: (volume) => {
    saveVolume(volume)
    set({ volume })
  },
}))
