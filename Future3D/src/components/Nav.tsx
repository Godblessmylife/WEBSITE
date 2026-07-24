import type { CSSProperties } from 'react'
import { useScrollStore } from '@/utils/scrollStore'

// Прогресс-точки — временные ориентиры внутри текущего пути
// небо->земля. Когда в Phase 3 появится реальный контент (О нас /
// Портфолио-игры / Заказ), эти же диапазоны прогресса станут границами
// соответствующих секций.
const NAV_ITEMS = [
  { label: 'О нас', target: 0.45 },
  { label: 'Игры', target: 0.6 },
  { label: 'Заказать сайт', target: 0.95 },
]

export function Nav() {
  return (
    <nav style={navStyle}>
      {NAV_ITEMS.map((item) => (
        <NavButton key={item.label} label={item.label} target={item.target} />
      ))}
    </nav>
  )
}

function NavButton({ label, target }: { label: string; target: number }) {
  return (
    <button
      style={buttonStyle}
      onClick={() => useScrollStore.getState().scrollToProgress(target)}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = 'rgba(95, 212, 255, 0.18)'
        e.currentTarget.style.borderColor = 'rgba(95, 212, 255, 0.9)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = 'rgba(15, 22, 32, 0.45)'
        e.currentTarget.style.borderColor = 'rgba(95, 212, 255, 0.4)'
      }}
    >
      {label}
    </button>
  )
}

const navStyle: CSSProperties = {
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  zIndex: 10,
  display: 'flex',
  justifyContent: 'center',
  gap: '1rem',
  padding: '1.5rem',
  pointerEvents: 'none',
}

const buttonStyle: CSSProperties = {
  pointerEvents: 'auto',
  fontFamily: "'Orbitron', sans-serif",
  fontSize: '0.8rem',
  letterSpacing: '0.05em',
  textTransform: 'uppercase',
  color: '#e8f6ff',
  background: 'rgba(15, 22, 32, 0.45)',
  border: '1px solid rgba(95, 212, 255, 0.4)',
  borderRadius: '999px',
  padding: '0.65rem 1.5rem',
  backdropFilter: 'blur(8px)',
  cursor: 'pointer',
  transition: 'background 0.2s ease, border-color 0.2s ease',
}
