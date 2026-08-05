import type { CSSProperties } from 'react'

// Красивый экран "поверните телефон" - по просьбе клиента: игра
// рассчитана на альбомную ориентацию (шире места под джойстики слева и
// справа), в портретной мешает и выглядит тесно. Показывается ПОВЕРХ
// всего HUD (самый высокий z-index в игре) при живой проверке
// ориентации (useIsPortrait.ts, реагирует на реальный поворот, а не
// только на момент входа в игру) - если игрок повернёт телефон обратно
// в портрет посреди игры, экран появится снова, а не только один раз
// при старте.
const overlayStyle: CSSProperties = {
  position: 'fixed',
  inset: 0,
  zIndex: 1010,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '1.25rem',
  background: 'rgba(5, 7, 13, 0.97)',
  textAlign: 'center',
  padding: '2rem',
}

function PhoneIcon() {
  return (
    <svg width="72" height="72" viewBox="0 0 24 24" fill="none" style={{ animation: 'rotate-device-spin 2.2s ease-in-out infinite' }}>
      <rect x="6" y="2" width="12" height="20" rx="2.4" stroke="#5fd4ff" strokeWidth="1.6" />
      <line x1="10" y1="19" x2="14" y2="19" stroke="#5fd4ff" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  )
}

export function RotateDevicePrompt() {
  return (
    <div style={overlayStyle}>
      <PhoneIcon />
      <div
        style={{
          fontFamily: "'Orbitron', sans-serif",
          fontSize: '1.3rem',
          letterSpacing: '0.04em',
          color: '#eafcff',
          textShadow: '0 0 16px rgba(95, 212, 255, 0.6)',
        }}
      >
        Поверните телефон
      </div>
      <div style={{ color: '#9db2c9', fontSize: '0.9rem', maxWidth: '260px' }}>
        Игра рассчитана на горизонтальную ориентацию экрана
      </div>
      <style>{`
        @keyframes rotate-device-spin {
          0%, 12% { transform: rotate(0deg); }
          45%, 65% { transform: rotate(-90deg); }
          95%, 100% { transform: rotate(0deg); }
        }
      `}</style>
    </div>
  )
}
