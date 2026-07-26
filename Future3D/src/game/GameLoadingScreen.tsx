import { useMemo } from 'react'

// Раньше оба Suspense (загрузка JS-чанка игры в App.tsx и загрузка
// моделей hero.glb/portal.glb внутри GameMode) использовали
// fallback={null} — то есть до полной загрузки экран оставался буквально
// пустым. Клиент попросил "крутую загрузку" в духе "перемещения сквозь
// пространство и время" — чистый CSS/DOM (без Three.js): загрузочный
// экран должен показаться МГНОВЕННО и гарантированно отрендериться, даже
// если сам WebGL/физика в этот момент ещё не готовы или испытывают
// проблемы — именно поэтому его нельзя строить на Canvas. position:fixed
// работает одинаково что снаружи Canvas, что изнутри (обёрнутый в drei
// <Html>) — один и тот же компонент годится для обоих Suspense.
const STREAK_COUNT = 46

interface Streak {
  angle: number
  delay: number
  duration: number
  length: number
  thickness: number
}

function createStreaks(): Streak[] {
  return Array.from({ length: STREAK_COUNT }, () => ({
    angle: Math.random() * 360,
    delay: Math.random() * 2.2,
    duration: 1.3 + Math.random() * 1.4,
    length: 30 + Math.random() * 100,
    thickness: 1 + Math.random() * 1.5,
  }))
}

export function GameLoadingScreen() {
  // useMemo без зависимостей - один и тот же набор "звёзд" на весь
  // жизненный цикл экрана, а не новая случайная раскладка на каждый
  // ре-рендер (React может ре-рендерить fallback чаще одного раза).
  const streaks = useMemo(() => createStreaks(), [])

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '1.75rem',
        background: 'radial-gradient(circle at center, #0a1120 0%, #05070d 70%, #020308 100%)',
        color: '#eafcff',
        fontFamily: "'Orbitron', sans-serif",
        overflow: 'hidden',
      }}
    >
      <div style={{ position: 'absolute', inset: 0 }}>
        {streaks.map((s, i) => (
          <div
            key={i}
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              width: 0,
              height: 0,
              transform: `rotate(${s.angle}deg)`,
              transformOrigin: '0 0',
            }}
          >
            <span
              className="warp-streak"
              style={{
                width: `${s.thickness}px`,
                height: `${s.length}px`,
                animationDelay: `${s.delay}s`,
                animationDuration: `${s.duration}s`,
              }}
            />
          </div>
        ))}
      </div>

      <div style={{ position: 'relative', width: '132px', height: '132px' }}>
        <div className="warp-ring warp-ring-outer" />
        <div className="warp-ring warp-ring-inner" />
        <div className="warp-core" />
      </div>

      <div style={{ textAlign: 'center', position: 'relative' }}>
        <span className="warp-text" style={{ fontSize: '0.9rem', letterSpacing: '0.15em' }}>
          ПЕРЕМЕЩЕНИЕ СКВОЗЬ ПРОСТРАНСТВО И ВРЕМЯ
        </span>
      </div>

      <style>{`
        .warp-streak {
          position: absolute;
          display: block;
          background: linear-gradient(to top, transparent, #5fd4ff 55%, #eafcff);
          transform-origin: center top;
          animation-name: warp-fly;
          animation-timing-function: cubic-bezier(0.3, 0, 0.7, 1);
          animation-iteration-count: infinite;
          opacity: 0;
        }
        @keyframes warp-fly {
          0% { transform: translateY(0) scaleY(0.3); opacity: 0; }
          12% { opacity: 1; }
          100% { transform: translateY(-72vmax) scaleY(1.6); opacity: 0; }
        }

        .warp-ring {
          position: absolute;
          inset: 0;
          border-radius: 50%;
          border: 2px solid transparent;
        }
        .warp-ring-outer {
          border-top-color: #5fd4ff;
          border-right-color: rgba(95, 212, 255, 0.3);
          box-shadow: 0 0 30px rgba(95, 212, 255, 0.45);
          animation: warp-spin 1.1s linear infinite;
        }
        .warp-ring-inner {
          inset: 20px;
          border-bottom-color: #ffd76a;
          border-left-color: rgba(255, 215, 106, 0.3);
          animation: warp-spin-reverse 1.6s linear infinite;
        }
        @keyframes warp-spin {
          to { transform: rotate(360deg); }
        }
        @keyframes warp-spin-reverse {
          to { transform: rotate(-360deg); }
        }

        .warp-core {
          position: absolute;
          inset: 46px;
          border-radius: 50%;
          background: radial-gradient(circle, #eafcff 0%, #5fd4ff 55%, rgba(95, 212, 255, 0) 100%);
          filter: blur(1.5px);
          animation: warp-core-pulse 1.3s ease-in-out infinite;
        }
        @keyframes warp-core-pulse {
          0%, 100% { transform: scale(0.85); opacity: 0.75; }
          50% { transform: scale(1.15); opacity: 1; }
        }

        .warp-text {
          animation: warp-text-flicker 2.4s ease-in-out infinite;
        }
        @keyframes warp-text-flicker {
          0%, 100% { opacity: 0.75; }
          50% { opacity: 1; text-shadow: 0 0 12px rgba(95, 212, 255, 0.8); }
        }
      `}</style>
    </div>
  )
}
