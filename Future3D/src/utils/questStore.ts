import { create } from 'zustand'

export type QuestPhase = 'not_started' | 'active' | 'ready_to_turn_in' | 'completed'

export interface QuestDef {
  id: string
  title: string
  hint: { active: string; ready: string }
  npc: { offer: string; inProgress: string; turnIn: string }
  reward: number
}

// Три квеста подряд у одного и того же странника (по просьбе клиента:
// "3 интересных квеста", развитых на существующей карте) — вместо
// параллельного выбора NPC всегда предлагает следующее по порядку
// задание сразу после сдачи предыдущего (turnIn ниже). Каждый квест
// использует уже существующую точку на карте (MapProps.tsx), а не новый
// контент: нож на площадке, ракета на юго-западе, автоматы на востоке.
export const QUESTS: QuestDef[] = [
  {
    id: 'knife',
    title: 'Пропавший нож',
    hint: { active: 'Найди нож на площадке.', ready: 'Верни нож страннику.' },
    npc: {
      offer: 'Мне нужен нож для дела. Найдёшь его на площадке — принеси мне.',
      inProgress: 'Нож ещё у тебя? Он лежит где-то здесь, на площадке — поищи.',
      turnIn: 'О, ты нашёл нож! Спасибо тебе, держи награду.',
    },
    reward: 50,
  },
  {
    id: 'rocket',
    title: 'Сигнал ракеты',
    hint: { active: 'Долети или добеги до старой ракеты на юго-западе карты.', ready: 'Расскажи страннику о находке.' },
    npc: {
      offer: 'Кто-то бросил старую ракету на юго-западе — оттуда уже который день идёт странный сигнал. Сходи, проверь, что там.',
      inProgress: 'Ну как, добрался до ракеты? Что там за сигнал?',
      turnIn: 'Значит, просто рация барахлит от старости. Хорошо, что не что похуже — спасибо, что проверил.',
    },
    reward: 70,
  },
  {
    id: 'chip',
    title: 'Должник казино',
    hint: { active: 'Найди фишку у игровых автоматов на востоке карты.', ready: 'Отдай фишку страннику.' },
    npc: {
      offer: 'Один должник обронил фишку у автоматов на востоке — она мне нужна как доказательство долга. Принеси её.',
      inProgress: 'Фишка ещё не у тебя? Она где-то у автоматов на востоке.',
      turnIn: 'Вот и доказательство. Теперь он у меня в руках. Держи, заслужил.',
    },
    reward: 90,
  },
]

interface QuestState {
  questIndex: number
  phase: QuestPhase
  isDialogueOpen: boolean
  isLogOpen: boolean
  acceptQuest: () => void
  completeObjective: () => void
  turnIn: () => void
  setDialogueOpen: (open: boolean) => void
  setLogOpen: (open: boolean) => void
}

export const useQuestStore = create<QuestState>((set) => ({
  questIndex: 0,
  phase: 'not_started',
  isDialogueOpen: false,
  isLogOpen: false,
  acceptQuest: () => set((state) => (state.phase === 'not_started' ? { phase: 'active' } : {})),
  completeObjective: () => set((state) => (state.phase === 'active' ? { phase: 'ready_to_turn_in' } : {})),
  // Сдача последнего квеста оставляет phase='completed' насовсем (см.
  // areAllQuestsDone ниже); сдача любого другого сразу открывает
  // следующий ('not_started') - страннику всегда есть что предложить,
  // без промежуточного "квест сдан, дальше пусто" состояния.
  turnIn: () =>
    set((state) => {
      if (state.phase !== 'ready_to_turn_in') return {}
      const isLast = state.questIndex >= QUESTS.length - 1
      return isLast ? { phase: 'completed' } : { questIndex: state.questIndex + 1, phase: 'not_started' }
    }),
  setDialogueOpen: (open) => set({ isDialogueOpen: open }),
  setLogOpen: (open) => set({ isLogOpen: open }),
}))

export function areAllQuestsDone(state: { questIndex: number; phase: QuestPhase }): boolean {
  return state.questIndex >= QUESTS.length - 1 && state.phase === 'completed'
}
