import { useGameStore } from '@/utils/gameStore'

// Phase A: заглушка, подтверждающая, что клик по START реально
// переключает состояние и монтирует полноэкранный оверлей. Настоящий
// физический мир/персонаж — Phase B.
export function GameMode() {
  const setGameActive = useGameStore((s) => s.setGameActive)

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        background: '#05070d',
        color: '#eafcff',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '1rem',
        fontFamily: "'Orbitron', sans-serif",
      }}
    >
      <div>Загрузка мира...</div>
      <button
        onClick={() => setGameActive(false)}
        style={{
          padding: '0.6rem 1.4rem',
          background: 'rgba(95, 212, 255, 0.15)',
          border: '1px solid rgba(95, 212, 255, 0.6)',
          borderRadius: '999px',
          color: '#eafcff',
          cursor: 'pointer',
        }}
      >
        Выход
      </button>
    </div>
  )
}
