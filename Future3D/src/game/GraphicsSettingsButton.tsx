import { useState } from 'react'
import type { CSSProperties } from 'react'
import { useGraphicsQualityStore } from '@/utils/graphicsQualityStore'
import type { GraphicsQuality } from '@/utils/graphicsQualityStore'

const QUALITY_LABELS: Record<GraphicsQuality, string> = {
  high: 'Высокое',
  medium: 'Среднее',
  low: 'Низкое',
}
const QUALITY_ORDER: GraphicsQuality[] = ['high', 'medium', 'low']

function GearIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="3.4" stroke="currentColor" strokeWidth="1.6" />
      <path
        d="M19.4 13.6a1.9 1.9 0 0 0 .38 2.1l.07.07a2.3 2.3 0 1 1-3.25 3.25l-.07-.07a1.9 1.9 0 0 0-2.1-.38 1.9 1.9 0 0 0-1.15 1.74v.2a2.3 2.3 0 0 1-4.6 0v-.1a1.9 1.9 0 0 0-1.24-1.74 1.9 1.9 0 0 0-2.1.38l-.07.07a2.3 2.3 0 1 1-3.25-3.25l.07-.07a1.9 1.9 0 0 0 .38-2.1 1.9 1.9 0 0 0-1.74-1.15h-.2a2.3 2.3 0 0 1 0-4.6h.1a1.9 1.9 0 0 0 1.74-1.24 1.9 1.9 0 0 0-.38-2.1l-.07-.07a2.3 2.3 0 1 1 3.25-3.25l.07.07a1.9 1.9 0 0 0 2.1.38h.1a1.9 1.9 0 0 0 1.15-1.74v-.2a2.3 2.3 0 0 1 4.6 0v.1a1.9 1.9 0 0 0 1.15 1.74 1.9 1.9 0 0 0 2.1-.38l.07-.07a2.3 2.3 0 1 1 3.25 3.25l-.07.07a1.9 1.9 0 0 0-.38 2.1v.1a1.9 1.9 0 0 0 1.74 1.15h.2a2.3 2.3 0 0 1 0 4.6h-.1a1.9 1.9 0 0 0-1.74 1.15Z"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
    </svg>
  )
}

// Кнопка-шестерёнка с выпадающей панелью "Высокое/Среднее/Низкое" - по
// отзыву клиента "верни качество игры, если у кого слабый телефон пусть
// в настройках сделает слабее": дефолт качества теперь высокий для всех
// (см. graphicsQualityStore.ts), а понижение - осознанный выбор владельца
// слабого устройства через эту кнопку, а не автоматика по типу устройства.
export function GraphicsSettingsButton({ style }: { style?: CSSProperties }) {
  const [open, setOpen] = useState(false)
  const quality = useGraphicsQualityStore((s) => s.quality)
  const setQuality = useGraphicsQualityStore((s) => s.setQuality)

  return (
    <div style={{ position: 'absolute', zIndex: 1001, ...style }}>
      <button
        onClick={() => setOpen((v) => !v)}
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
      {open && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 0.5rem)',
            left: '50%',
            transform: 'translateX(-50%)',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.35rem',
            padding: '0.6rem',
            background: 'rgba(10, 17, 32, 0.92)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            borderRadius: '12px',
            minWidth: '150px',
          }}
        >
          <span
            style={{
              color: '#9db2c9',
              fontFamily: "'Orbitron', sans-serif",
              fontSize: '0.6rem',
              letterSpacing: '0.05em',
              marginBottom: '0.15rem',
              whiteSpace: 'nowrap',
            }}
          >
            КАЧЕСТВО ГРАФИКИ
          </span>
          {QUALITY_ORDER.map((q) => (
            <button
              key={q}
              onClick={() => {
                setQuality(q)
                setOpen(false)
              }}
              style={{
                padding: '0.4rem 0.6rem',
                borderRadius: '8px',
                border: quality === q ? '1px solid rgba(95, 212, 255, 0.8)' : '1px solid transparent',
                background: quality === q ? 'rgba(95, 212, 255, 0.15)' : 'transparent',
                color: quality === q ? '#5fd4ff' : '#eafcff',
                fontFamily: "'Orbitron', sans-serif",
                fontSize: '0.72rem',
                textAlign: 'left',
                cursor: 'pointer',
                touchAction: 'manipulation',
              }}
            >
              {QUALITY_LABELS[q]}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
