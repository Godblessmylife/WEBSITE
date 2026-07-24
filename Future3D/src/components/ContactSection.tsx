import { useState } from 'react'
import { SectionStarfield } from './SectionStarfield'

const TELEGRAM_HANDLE = 'web3elchapo'

function TelegramButton() {
  const [hovered, setHovered] = useState(false)

  return (
    <a
      href={`https://t.me/${TELEGRAM_HANDLE}`}
      target="_blank"
      rel="noopener noreferrer"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.6rem',
        fontFamily: "'Orbitron', sans-serif",
        fontSize: '1.1rem',
        color: '#05070d',
        background: 'linear-gradient(135deg, #7fe3ff, #5fd4ff 45%, #3fa9f5)',
        padding: '1rem 2.5rem',
        borderRadius: '999px',
        textDecoration: 'none',
        fontWeight: 700,
        letterSpacing: '0.05em',
        touchAction: 'manipulation',
        boxShadow: hovered
          ? '0 0 0 1px rgba(255,255,255,0.6) inset, 0 8px 32px rgba(95, 212, 255, 0.55)'
          : '0 0 0 1px rgba(255,255,255,0.35) inset, 0 4px 20px rgba(95, 212, 255, 0.3)',
        transform: hovered ? 'translateY(-2px) scale(1.03)' : 'translateY(0) scale(1)',
        transition: 'box-shadow 0.25s ease, transform 0.25s ease',
      }}
    >
      <svg width="20" height="20" viewBox="0 0 240 240" fill="none" aria-hidden="true">
        <path
          d="M186 68 165 172c-1.6 7-6 8.6-12 5.4l-33-24-16 15.4c-1.8 1.8-3.3 3.3-6.7 3.3l2.4-34 62-56c2.7-2.4-.6-3.7-4.2-1.3l-76.6 48.3-33-10.3c-7.2-2.2-7.3-7.2 1.5-10.7l129-49.7c6-2.2 11.2 1.4 9.3 11.6Z"
          fill="#05070d"
        />
      </svg>
      Написать в Telegram
    </a>
  )
}

export function ContactSection() {
  return (
    <section
      id="contact"
      style={{
        position: 'relative',
        minHeight: '80vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        padding: '6rem 1.5rem',
        background: 'radial-gradient(circle at 50% 50%, #101a2e 0%, #05070d 70%)',
        overflow: 'hidden',
      }}
    >
      <SectionStarfield />
      <p
        style={{
          position: 'relative',
          zIndex: 1,
          fontFamily: "'Orbitron', sans-serif",
          color: '#5fd4ff',
          letterSpacing: '0.2em',
          fontSize: '0.85rem',
          marginBottom: '1rem',
        }}
      >
        КОНТАКТЫ
      </p>
      <h2
        style={{
          position: 'relative',
          zIndex: 1,
          fontFamily: "'Orbitron', sans-serif",
          fontSize: 'clamp(1.6rem, 4vw, 2.6rem)',
          margin: '0 0 1.5rem',
          color: '#f4f9ff',
        }}
      >
        ГОТОВЫ НАЧАТЬ?
      </h2>
      <p
        style={{
          position: 'relative',
          zIndex: 1,
          color: '#9db2c9',
          fontSize: '1rem',
          marginBottom: '2.5rem',
          maxWidth: '460px',
        }}
      >
        Опишите задачу в Telegram — отвечаю быстро, без менеджеров и лишней переписки.
      </p>
      <div style={{ position: 'relative', zIndex: 1 }}>
        <TelegramButton />
      </div>
    </section>
  )
}
