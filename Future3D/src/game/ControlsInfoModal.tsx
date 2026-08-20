import type { CSSProperties } from 'react'

const rowStyle: CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  gap: '1rem',
  padding: '0.4rem 0',
  borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
}

const keyStyle: CSSProperties = {
  color: '#5fd4ff',
  fontFamily: "'Orbitron', sans-serif",
  fontSize: '0.78rem',
  whiteSpace: 'nowrap',
}

const actionStyle: CSSProperties = {
  color: '#c8ecff',
  fontFamily: "'Inter', sans-serif",
  fontSize: '0.82rem',
  textAlign: 'right',
}

// Точный список - тот же KEYBOARD_MAP, что реально используется в
// GameMode.tsx (см. константу там) - не выдумано отдельно, чтобы не
// разойтись с реальным поведением игры.
const PC_CONTROLS: [string, string][] = [
  ['WASD / стрелки', 'Движение'],
  ['Shift', 'Бег'],
  ['Пробел', 'Прыжок'],
  ['Ctrl / C', 'Спуск (только God Mode)'],
  ['Enter', 'Сесть/выйти из машины'],
  ['Клик мышью', 'Взаимодействие с объектом/NPC'],
]

const MOBILE_CONTROLS: [string, string][] = [
  ['Джойстик слева', 'Движение'],
  ['Кнопка «Вниз»', 'Спуск (только God Mode)'],
  ['Тап по машине', 'Сесть/выйти'],
  ['Тап по объекту/NPC', 'Взаимодействие'],
  ['Кнопка «Курсор»', 'Перемещение/масштаб объектов (без джойстика)'],
]

function ControlsTable({ title, rows }: { title: string; rows: [string, string][] }) {
  return (
    <div style={{ marginBottom: '1.25rem' }}>
      <div
        style={{
          color: '#ffe9b0',
          fontFamily: "'Orbitron', sans-serif",
          fontSize: '0.85rem',
          fontWeight: 700,
          marginBottom: '0.5rem',
        }}
      >
        {title}
      </div>
      {rows.map(([key, action]) => (
        <div key={key} style={rowStyle}>
          <span style={keyStyle}>{key}</span>
          <span style={actionStyle}>{action}</span>
        </div>
      ))}
    </div>
  )
}

// Полноэкранная справка по управлению (по просьбе клиента) - открывается
// кнопкой внутри настроек (GraphicsSettingsButton.tsx). Тот же оверлей-
// стиль, что у ProfilePanel.tsx/QuestDialogue - узнаваемый паттерн модалки
// по всей игре.
export function ControlsInfoModal({ onClose }: { onClose: () => void }) {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 2100,
        background: 'rgba(5, 7, 13, 0.92)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: 'min(90vw, 420px)',
          maxHeight: '85vh',
          overflowY: 'auto',
          padding: '1.5rem',
          borderRadius: '16px',
          border: '1px solid rgba(255, 215, 106, 0.4)',
          background: 'radial-gradient(circle at 50% 0%, #182a45 0%, #05070d 80%)',
          position: 'relative',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          aria-label="Закрыть"
          style={{
            position: 'absolute',
            top: '0.75rem',
            right: '0.75rem',
            background: 'rgba(10, 17, 32, 0.6)',
            border: '1px solid rgba(255, 255, 255, 0.25)',
            borderRadius: '50%',
            width: '2rem',
            height: '2rem',
            color: '#eafcff',
            fontSize: '1rem',
            cursor: 'pointer',
            touchAction: 'manipulation',
          }}
        >
          ✕
        </button>
        <div
          style={{
            fontFamily: "'Orbitron', sans-serif",
            fontSize: '1.1rem',
            fontWeight: 700,
            color: '#eafcff',
            marginBottom: '1.25rem',
          }}
        >
          Управление
        </div>
        <ControlsTable title="На компьютере" rows={PC_CONTROLS} />
        <ControlsTable title="На телефоне/планшете" rows={MOBILE_CONTROLS} />
      </div>
    </div>
  )
}
