import { create } from 'zustand'

interface GalleryState {
  isOpen: boolean
  setOpen: (open: boolean) => void
}

export const useGalleryStore = create<GalleryState>((set) => ({
  isOpen: false,
  setOpen: (open) => set({ isOpen: open }),
}))
