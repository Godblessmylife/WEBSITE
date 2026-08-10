import { create } from 'zustand'

// Открыто ли окно "Профиль" (ProfilePanel.tsx) - тот же простой паттерн,
// что gameStore.ts/galleryStore.ts.
interface ProfileState {
  isOpen: boolean
  setOpen: (open: boolean) => void
}

export const useProfileStore = create<ProfileState>((set) => ({
  isOpen: false,
  setOpen: (open) => set({ isOpen: open }),
}))
