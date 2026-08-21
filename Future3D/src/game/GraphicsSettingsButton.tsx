import { useState } from 'react'
import { createPortal } from 'react-dom'
import type { CSSProperties } from 'react'
import { SettingsModal } from './SettingsModal'

const GEAR_TEETH = 8

// Раньше зубцы шестерёнки были одним вручную нарисованным path - на
// глаз кривым (отзыв клиента "шестерёнка кривая"), скорее всего из-за
// неточно подобранных координат кривых Безье. Заменено на честно
// симметричную фигуру: одна и та же короткая линия, повёрнутая на
// равный угол N раз - кривой геометрически быть не может, зубцы всегда
// строго одинаковые и равномерные по построению, а не "на глаз".
function GearIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <g stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
        {Array.from({ length: GEAR_TEETH }, (_, i) => (
          <line
            key={i}
            x1="12"
            y1="1.8"
            x2="12"
            y2="4.6"
            transform={`rotate(${(360 / GEAR_TEETH) * i} 12 12)`}
          />
        ))}
      </g>
      <circle cx="12" cy="12" r="7.2" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="12" cy="12" r="2.6" fill="currentColor" />
    </svg>
  )
}

// Кнопка-шестерёнка - вся сама панель настроек (качество/FOV/дальность/
// тени/перемещение объектов/мультиплеер/управление/установка) вынесена в
// SettingsModal.tsx, полноэкранную. Портал в document.body - эта кнопка
// живёт внутри обёртки с transform: translateX(-50%) (GameMode.tsx
// центрирует шестерёнку сверху экрана) - трансформированный предок
// создаёт свой "containing block" для ЛЮБОГО position:fixed потомка
// (стандартное поведение CSS), из-за чего модалка позиционировалась бы не
// относительно экрана, а относительно этой узкой кнопки. Портал вне
// трансформированного дерева решает это.
export function GraphicsSettingsButton({ style }: { style?: CSSProperties }) {
  const [open, setOpen] = useState(false)

  return (
    <div style={{ position: 'absolute', zIndex: 1001, ...style }}>
      <button
        onClick={() => setOpen(true)}
        aria-label="Настройки графики"
        style={{
          width: '2.1rem',
          height: '2.1rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'rgba(10, 17, 32, 0.6)',
          border: '1px solid rgba(255, 255, 255, 0.25)',
          borderRadius: '50%',
          color: '#eafcff',
          cursor: 'pointer',
          touchAction: 'manipulation',
        }}
      >
        <GearIcon />
      </button>
      {open && createPortal(<SettingsModal onClose={() => setOpen(false)} />, document.body)}
    </div>
  )
}
