import type { CSSProperties } from 'react'
import { useQuestStore } from '@/utils/questStore'
import { useGameStore } from '@/utils/gameStore'

const QUEST_TITLE = 'Пропавший нож'
const TURN_IN_REWARD = 50

const STATUS_LABEL: Record<string, string> = {
  not_started: 'Не начат',
  active: 'В процессе',
  ready_to_turn_in: 'Готов к сдаче',
  completed: 'Завершён',
}

const panelStyle: CSSProperties = {
  position: 'absolute',
  left: '50%',
  bottom: 'calc(6rem + env(safe-area-inset-bottom))',
  transform: 'translateX(-50%)',
  minWidth: '280px',
  maxWidth: '420px',
  padding: '1.25rem 1.5rem',
  background: 'rgba(10, 17, 32, 0.9)',
  border: '1px solid rgba(255, 215, 106, 0.5)',
  borderRadius: '16px',
  color: '#eafcff',
  fontFamily: "'Orbitron', sans-serif",
  zIndex: 1002,
  textAlign: 'center',
}

const actionButtonStyle: CSSProperties = {
  marginTop: '1rem',
  padding: '0.6rem 1.4rem',
  minHeight: '2.75rem',
  background: 'rgba(255, 215, 106, 0.15)',
  border: '1px solid rgba(255, 215, 106, 0.7)',
  borderRadius: '999px',
  color: '#ffe9b0',
  fontFamily: "'Orbitron', sans-serif",
  cursor: 'pointer',
  touchAction: 'manipulation',
  marginRight: '0.6rem',
}

const closeButtonStyle: CSSProperties = {
  marginTop: '1rem',
  padding: '0.6rem 1.4rem',
  minHeight: '2.75rem',
  background: 'rgba(255, 255, 255, 0.08)',
  border: '1px solid rgba(255, 255, 255, 0.25)',
  borderRadius: '999px',
  color: '#eafcff',
  fontFamily: "'Orbitron', sans-serif",
  cursor: 'pointer',
  touchAction: 'manipulation',
}

// Диалог NPC — открывается кликом по QuestNpc (см. game/QuestNpc.tsx).
// Текст/кнопка зависят от текущего статуса квеста, как в WoW: одна и та
// же реплика NPC ведёт к разным действиям в зависимости от прогресса.
export function QuestDialogue() {
  const isOpen = useQuestStore((s) => s.isDialogueOpen)
  const status = useQuestStore((s) => s.status)
  const acceptQuest = useQuestStore((s) => s.acceptQuest)
  const turnIn = useQuestStore((s) => s.turnIn)
  const setDialogueOpen = useQuestStore((s) => s.setDialogueOpen)
  const addScore = useGameStore((s) => s.addScore)

  if (!isOpen) return null

  let line: string
  let action: { label: string; onClick: () => void } | null = null

  if (status === 'not_started') {
    line = 'Мне нужен нож для дела. Найдёшь его на площадке — принеси мне.'
    action = { label: 'Принять задание', onClick: acceptQuest }
  } else if (status === 'active') {
    line = 'Нож ещё у тебя? Он лежит где-то здесь, на площадке — поищи.'
  } else if (status === 'ready_to_turn_in') {
    line = 'О, ты нашёл нож! Спасибо тебе, держи награду.'
    action = {
      label: 'Сдать задание',
      onClick: () => {
        turnIn()
        addScore(TURN_IN_REWARD)
      },
    }
  } else {
    line = 'Ещё раз спасибо за помощь, путник.'
  }

  return (
    <div style={panelStyle}>
      <div style={{ color: '#ffd76a', fontSize: '0.8rem', letterSpacing: '0.1em', marginBottom: '0.6rem' }}>
        СТРАННИК
      </div>
      <div style={{ fontFamily: "'Inter', sans-serif", fontSize: '0.95rem', lineHeight: 1.5 }}>{line}</div>
      <div>
        {action && (
          <button style={actionButtonStyle} onClick={action.onClick}>
            {action.label}
          </button>
        )}
        <button style={closeButtonStyle} onClick={() => setDialogueOpen(false)}>
          Закрыть
        </button>
      </div>
    </div>
  )
}

// Журнал квестов — открывается кнопкой "Квесты" в HUD игры (см.
// GameMode.tsx), независимо от диалога с NPC. Пока квест один — список
// из одной записи, тот же принцип, что и в questStore.ts (расширить на
// массив, когда появится второй квест).
export function QuestLog() {
  const isOpen = useQuestStore((s) => s.isLogOpen)
  const status = useQuestStore((s) => s.status)
  const setLogOpen = useQuestStore((s) => s.setLogOpen)

  if (!isOpen) return null

  return (
    <div
      style={{
        position: 'absolute',
        top: 'calc(5rem + env(safe-area-inset-top))',
        left: 'calc(1.5rem + env(safe-area-inset-left))',
        width: '280px',
        padding: '1rem 1.25rem',
        background: 'rgba(10, 17, 32, 0.9)',
        border: '1px solid rgba(255, 215, 106, 0.5)',
        borderRadius: '16px',
        color: '#eafcff',
        fontFamily: "'Orbitron', sans-serif",
        zIndex: 1001,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem' }}>
        <span style={{ fontSize: '0.85rem', letterSpacing: '0.1em', color: '#ffd76a' }}>КВЕСТЫ</span>
        <button
          onClick={() => setLogOpen(false)}
          style={{
            background: 'none',
            border: 'none',
            color: '#9db2c9',
            cursor: 'pointer',
            fontSize: '1rem',
            lineHeight: 1,
            touchAction: 'manipulation',
          }}
          aria-label="Закрыть журнал квестов"
        >
          ✕
        </button>
      </div>
      <div style={{ fontFamily: "'Inter', sans-serif", fontSize: '0.9rem' }}>
        <div style={{ fontWeight: 600 }}>{QUEST_TITLE}</div>
        <div style={{ color: '#9db2c9', fontSize: '0.8rem', margin: '0.3rem 0' }}>{STATUS_LABEL[status]}</div>
        <div style={{ color: '#c3d3e6', fontSize: '0.85rem' }}>
          {status === 'not_started' && 'Поговори со странником рядом со спавном.'}
          {status === 'active' && 'Найди нож на площадке.'}
          {status === 'ready_to_turn_in' && 'Верни нож страннику.'}
          {status === 'completed' && `Награда получена: +${TURN_IN_REWARD} очков.`}
        </div>
      </div>
    </div>
  )
}
