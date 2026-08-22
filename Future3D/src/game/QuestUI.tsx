import { useState } from 'react'
import type { CSSProperties } from 'react'
import { useGLTF } from '@react-three/drei'
import { QUESTS, areAllQuestsDone, useQuestStore } from '@/utils/questStore'
import { useGameStore } from '@/utils/gameStore'
import { HERO_MODELS } from '@/utils/heroModels'
import { useHeroSelectionStore } from '@/utils/heroSelectionStore'
import { playQuestAccept, playQuestComplete } from '@/utils/soundManager'
import { vibrate } from '@/utils/haptics'

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
// Текст/кнопка зависят от текущего задания в цепочке (QUESTS[questIndex],
// см. questStore.ts) и его фазы, как в WoW: одна и та же реплика NPC
// ведёт к разным действиям в зависимости от прогресса. После сдачи
// последнего квеста NPC остаётся с финальной репликой без действий.
export function QuestDialogue() {
  const isOpen = useQuestStore((s) => s.isDialogueOpen)
  const questIndex = useQuestStore((s) => s.questIndex)
  const phase = useQuestStore((s) => s.phase)
  const acceptQuest = useQuestStore((s) => s.acceptQuest)
  const turnIn = useQuestStore((s) => s.turnIn)
  const setDialogueOpen = useQuestStore((s) => s.setDialogueOpen)
  const addScore = useGameStore((s) => s.addScore)
  const selectedHeroId = useHeroSelectionStore((s) => s.selectedHeroId)
  const setSelectedHero = useHeroSelectionStore((s) => s.setSelectedHero)
  // Свой локальный тумблер, не в questStore - выбор внешности никак не
  // связан с прогрессом квестов, незачем тащить его в тот же стор.
  const [pickerOpen, setPickerOpen] = useState(false)

  if (!isOpen) return null

  const quest = QUESTS[questIndex]
  let line: string
  let action: { label: string; onClick: () => void } | null = null

  if (areAllQuestsDone({ questIndex, phase })) {
    line = 'Ещё раз спасибо за помощь, путник. Больше дел для тебя пока нет.'
  } else if (phase === 'not_started') {
    line = quest.npc.offer
    action = {
      label: 'Принять задание',
      onClick: () => {
        acceptQuest()
        playQuestAccept()
        vibrate(30)
      },
    }
  } else if (phase === 'active') {
    line = quest.npc.inProgress
  } else {
    line = quest.npc.turnIn
    action = {
      label: 'Сдать задание',
      onClick: () => {
        turnIn()
        addScore(quest.reward)
        playQuestComplete()
        vibrate([30, 40, 30])
      },
    }
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
        <button
          style={actionButtonStyle}
          onClick={() => {
            setPickerOpen((v) => !v)
            // Остальные модели героя больше не грузятся заранее при входе
            // в игру (см. PlayerCharacter.tsx - убрано ради VRAM на
            // слабых телефонах) - догружаем их именно в момент, когда
            // игрок реально открыл список выбора, чтобы клик по конкретной
            // модели ощущался почти так же мгновенно, как раньше.
            // БАГ (по отзыву клиента "после выбора нового героя двойная
            // перезагрузка") - этот список раньше показывал/предзагружал
            // ВООБЩЕ ВСЕ HERO_MODELS, включая ещё не разблокированных
            // (locked: true, см. heroModels.ts) - в обход платной вкладки
            // "Ещё герои" в Профиле, которая как раз ТАКИЕ модели скрывает.
            // Выбор "Скелетона" (4.67 МБ, никогда раньше не грузился)
            // прямо во время игры реально перегружал GPU-память и ронял
            // WebGL-контекст основного канваса (см. GameMode.tsx recovery) -
            // иногда дважды подряд, что и ощущалось как "двойная
            // перезагрузка". Теперь список (и предзагрузка) те же, что и
            // в ProfilePanel.tsx - только разблокированные герои.
            HERO_MODELS.filter((model) => !model.locked).forEach((model) => useGLTF.preload(model.url))
          }}
        >
          Сменить внешность
        </button>
        <button style={closeButtonStyle} onClick={() => setDialogueOpen(false)}>
          Закрыть
        </button>
      </div>
      {/* Список моделей - тот же визуальный приём, что и у списка качества
          графики (GraphicsSettingsButton.tsx): активный пункт подсвечен
          рамкой/цветом текста. */}
      {pickerOpen && (
        <div
          style={{
            marginTop: '1rem',
            paddingTop: '1rem',
            borderTop: '1px solid rgba(255, 215, 106, 0.25)',
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'center',
            gap: '0.5rem',
          }}
        >
          {HERO_MODELS.filter((model) => !model.locked).map((model) => {
            const active = model.id === selectedHeroId
            return (
              <button
                key={model.id}
                onClick={() => setSelectedHero(model.id)}
                style={{
                  padding: '0.45rem 0.9rem',
                  fontSize: '0.8rem',
                  fontFamily: "'Orbitron', sans-serif",
                  background: active ? 'rgba(255, 215, 106, 0.25)' : 'rgba(255, 255, 255, 0.06)',
                  border: active ? '1px solid rgba(255, 215, 106, 0.9)' : '1px solid rgba(255, 255, 255, 0.2)',
                  borderRadius: '999px',
                  color: active ? '#ffe9b0' : '#eafcff',
                  cursor: 'pointer',
                  touchAction: 'manipulation',
                }}
              >
                {model.label}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

// Журнал квестов — открывается кнопкой "Квесты" в HUD игры (см.
// GameMode.tsx), независимо от диалога с NPC. Список из всех трёх
// заданий цепочки сразу (QUESTS, questStore.ts): пройденные — "Завершён",
// текущее — его реальный статус и подсказка, ещё не открытые — "Ещё не
// доступен", чтобы игрок видел, сколько всего заданий у странника.
export function QuestLog() {
  const isOpen = useQuestStore((s) => s.isLogOpen)
  const questIndex = useQuestStore((s) => s.questIndex)
  const phase = useQuestStore((s) => s.phase)
  const setLogOpen = useQuestStore((s) => s.setLogOpen)

  if (!isOpen) return null

  return (
    <div
      style={{
        position: 'absolute',
        top: 'calc(5rem + env(safe-area-inset-top))',
        left: 'calc(1.5rem + env(safe-area-inset-left))',
        width: '280px',
        maxHeight: '70vh',
        overflowY: 'auto',
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
      {QUESTS.map((quest, i) => {
        const isPast = i < questIndex
        const isCurrent = i === questIndex
        const isDone = isPast || (isCurrent && phase === 'completed')

        let statusLabel: string
        let hintText: string
        if (isDone) {
          statusLabel = 'Завершён'
          hintText = `Награда получена: +${quest.reward} очков.`
        } else if (isCurrent && phase === 'active') {
          statusLabel = 'В процессе'
          hintText = quest.hint.active
        } else if (isCurrent && phase === 'ready_to_turn_in') {
          statusLabel = 'Готов к сдаче'
          hintText = quest.hint.ready
        } else if (isCurrent) {
          statusLabel = 'Не начат'
          hintText = 'Поговори со странником рядом со спавном.'
        } else {
          statusLabel = 'Ещё не доступен'
          hintText = 'Сначала заверши предыдущее задание.'
        }

        return (
          <div
            key={quest.id}
            style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: '0.9rem',
              marginBottom: i < QUESTS.length - 1 ? '0.75rem' : 0,
              paddingBottom: i < QUESTS.length - 1 ? '0.75rem' : 0,
              borderBottom: i < QUESTS.length - 1 ? '1px solid rgba(255,255,255,0.1)' : 'none',
              opacity: !isDone && !isCurrent ? 0.55 : 1,
            }}
          >
            <div style={{ fontWeight: 600 }}>{quest.title}</div>
            <div style={{ color: '#9db2c9', fontSize: '0.8rem', margin: '0.3rem 0' }}>{statusLabel}</div>
            <div style={{ color: '#c3d3e6', fontSize: '0.85rem' }}>{hintText}</div>
          </div>
        )
      })}
    </div>
  )
}
