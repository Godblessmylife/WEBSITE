import type { CSSProperties } from 'react'
import { useScrollStore } from '@/utils/scrollStore'

// Раньше кнопки доскролливали до точки внутри 3D-путешествия (progress
// 0-1) — по сути никуда, реального контента там не было. Теперь ведут
// к настоящим DOM-секциям (см. App.tsx: AboutSection/PricingSection/
// ContactSection/GameEntry, все с id, совпадающими с anchor ниже).
const NAV_ITEMS = [
  { label: 'О нас', anchor: '#about' },
  { label: 'Портфолио', anchor: '#portfolio' },
  { label: 'Цены', anchor: '#pricing' },
  { label: 'Игра', anchor: '#game' },
  { label: 'Заказать сайт', anchor: '#contact' },
]

export function Nav() {
  return (
    <nav style={navStyle}>
      {NAV_ITEMS.map((item) => (
        <NavButton key={item.label} label={item.label} anchor={item.anchor} />
      ))}
    </nav>
  )
}

function NavButton({ label, anchor }: { label: string; anchor: string }) {
  return (
    <button
      style={buttonStyle}
      onClick={() => useScrollStore.getState().scrollToElement(anchor)}
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
  flexWrap: 'wrap',
  gap: '0.75rem',
  padding: '1.5rem',
  pointerEvents: 'none',
}

const buttonStyle: CSSProperties = {
  pointerEvents: 'auto',
  fontFamily: "'Orbitron', sans-serif",
  fontSize: '0.75rem',
  letterSpacing: '0.05em',
  textTransform: 'uppercase',
  color: '#e8f6ff',
  background: 'rgba(15, 22, 32, 0.45)',
  border: '1px solid rgba(95, 212, 255, 0.4)',
  borderRadius: '999px',
  padding: '0.6rem 1.25rem',
  backdropFilter: 'blur(8px)',
  cursor: 'pointer',
  transition: 'background 0.2s ease, border-color 0.2s ease',
}
