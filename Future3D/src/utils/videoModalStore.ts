import { create } from 'zustand'

interface VideoModalState {
  openVideoId: string | null
  open: (videoId: string) => void
  close: () => void
}

// Крошечный стор ровно как galleryStore/gameStore - id открытого сейчас
// YouTube-видео (null - модалка закрыта). Отдельно от galleryStore: та
// открывает 3D-сцену с карточками, это - плоский DOM-оверлей с
// iframe'ом, разная природа контента, разный компонент (VideoModal.tsx).
export const useVideoModalStore = create<VideoModalState>((set) => ({
  openVideoId: null,
  open: (videoId) => set({ openVideoId: videoId }),
  close: () => set({ openVideoId: null }),
}))
