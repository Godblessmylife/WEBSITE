import { create } from 'zustand'

const NICKNAME_STORAGE_KEY = 'future3d-player-nickname'
const DEFAULT_NICKNAME = 'Игрок'
const MAX_NICKNAME_LENGTH = 20

function loadNickname(): string {
  try {
    return localStorage.getItem(NICKNAME_STORAGE_KEY) || DEFAULT_NICKNAME
  } catch {
    return DEFAULT_NICKNAME
  }
}

function saveNickname(nickname: string) {
  try {
    localStorage.setItem(NICKNAME_STORAGE_KEY, nickname)
  } catch {
    // localStorage недоступен - никнейм просто не переживёт перезагрузку.
  }
}

interface PlayerProfileState {
  nickname: string
  setNickname: (nickname: string) => void
}

// Никнейм персонажа (вкладка "Профиль", по просьбе клиента) - чисто
// косметическое поле, тот же localStorage-паттерн, что и у остальных
// персонализированных настроек в проекте (heroSelectionStore.ts и т.п.).
// Сайт статический без бэкенда - никнейм виден только в ЭТОМ браузере,
// не отправляется никуда и не виден другим посетителям (нет ни аккаунтов,
// ни сервера, который мог бы это хранить общим для всех).
export const usePlayerProfileStore = create<PlayerProfileState>((set) => ({
  nickname: loadNickname(),
  setNickname: (nickname) => {
    const trimmed = nickname.slice(0, MAX_NICKNAME_LENGTH)
    saveNickname(trimmed)
    set({ nickname: trimmed })
  },
}))
