import { create } from 'zustand'

const STORAGE_KEY = 'future3d-tutorial-seen'

function loadSeen(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === '1'
  } catch {
    return false
  }
}

function saveSeen() {
  try {
    localStorage.setItem(STORAGE_KEY, '1')
  } catch {
    // localStorage недоступен - подсказка будет показываться заново
    // каждый вход, не критично, просто не идеально.
  }
}

interface TutorialState {
  seen: boolean
  markSeen: () => void
}

// Обучение при первом входе (по просьбе клиента) - окно "Управление"
// (ControlsInfoModal.tsx, уже существует как раздел настроек) один раз
// показывается АВТОМАТИЧЕСКИ сразу после загрузки игры (см. GameMode.tsx) -
// у игры уже много механик (вождение, God Mode, курсор/перемещение
// объектов, скиллы, портал в космос), которые новый игрок иначе рискует
// не найти. localStorage - "видел хотя бы раз" не сбрасывается между
// заходами (иначе подсказка надоедала бы, показываясь каждый раз).
export const useTutorialStore = create<TutorialState>((set) => ({
  seen: loadSeen(),
  markSeen: () => {
    saveSeen()
    set({ seen: true })
  },
}))
