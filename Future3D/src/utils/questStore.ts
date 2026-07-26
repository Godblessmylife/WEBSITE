import { create } from 'zustand'

export type QuestStatus = 'not_started' | 'active' | 'ready_to_turn_in' | 'completed'

interface QuestState {
  status: QuestStatus
  isDialogueOpen: boolean
  isLogOpen: boolean
  acceptQuest: () => void
  collectItem: () => void
  turnIn: () => void
  setDialogueOpen: (open: boolean) => void
  setLogOpen: (open: boolean) => void
}

// Один квест на первое время (как и просили — "NPC, которому сдавать
// квесты", единичное число). Расширять на несколько квестов, если
// понадобится, — сделать status/id частью записи в массиве, а не
// плоским полем; для одного квеста плоское поле проще и понятнее.
export const useQuestStore = create<QuestState>((set) => ({
  status: 'not_started',
  isDialogueOpen: false,
  isLogOpen: false,
  acceptQuest: () => set({ status: 'active' }),
  collectItem: () => set((state) => (state.status === 'active' ? { status: 'ready_to_turn_in' } : {})),
  turnIn: () => set({ status: 'completed' }),
  setDialogueOpen: (open) => set({ isDialogueOpen: open }),
  setLogOpen: (open) => set({ isLogOpen: open }),
}))
