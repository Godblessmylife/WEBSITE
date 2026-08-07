import { useMemo } from 'react'
import { useProgress } from '@react-three/drei'

// Отдельный от игрового (GameLoadingScreen.tsx) экран загрузки - по
// отзыву клиента "эффект загрузки сделать более крутой, ибо у игры и у
// страницы одинаковое". Тема "варп-скорости" (стрелы, кольца) осталась
// игре, а здесь - тема, которая буквально соответствует тому, ЧТО
// грузится (солнечная система путешествия): вращающаяся орбита с
// планетой вокруг светящегося "солнца" по центру, звёздный фон вместо
// линий скорости. Тот же процент через useProgress - обычный zustand-
// стор поверх общего THREE.DefaultLoadingManager, работает одинаково
// что в Suspense внутри Canvas, что снаружи (Home.tsx).
const STAR_COUNT = 60

interface Star {
  x: number
  y: number
  size: number
  delay: number
  duration: number
}

function createStars(): Star[] {
  return Array.from({ length: STAR_COUNT }, () => ({
    x: Math.random() * 100,
    y: Math.random() * 100,
    size: 1 + Math.random() * 2,
    delay: Math.random() * 3,
    duration: 1.5 + Math.random() * 2.5,
  }))
}

export function JourneyLoadingScreen() {
  const stars = useMemo(() => createStars(), [])
  const progress = useProgress((s) => Math.round(s.progress))

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
        {stars.map((s, i) => (
          <span
            key={i}
            className="journey-star"
            style={{
              position: 'absolute',
              left: `${s.x}%`,
              top: `${s.y}%`,
              width: `${s.size}px`,
              height: `${s.size}px`,
              borderRadius: '50%',
              background: '#eafcff',
              animationDelay: `${s.delay}s`,
              animationDuration: `${s.duration}s`,
            }}
          />
        ))}
      </div>

      <div style={{ position: 'relative', width: '150px', height: '150px' }}>
        <div className="journey-orbit journey-orbit-outer" />
        <div className="journey-orbit journey-orbit-inner" />
        <div className="journey-sun" />
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.1rem',
            fontWeight: 700,
            color: '#05070d',
            textShadow: '0 0 6px rgba(255, 255, 255, 0.5)',
          }}
        >
          {progress}%
        </div>
      </div>

      <div
        style={{
          width: '220px',
          height: '6px',
          borderRadius: '999px',
          background: 'rgba(255, 158, 87, 0.15)',
          border: '1px solid rgba(255, 176, 87, 0.35)',
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        <div
          style={{
            width: `${progress}%`,
            height: '100%',
            borderRadius: '999px',
            background: 'linear-gradient(90deg, #ffb057, #ffe9b0)',
            boxShadow: '0 0 10px rgba(255, 176, 87, 0.8)',
            transition: 'width 0.25s ease-out',
          }}
        />
      </div>

      <div style={{ textAlign: 'center', position: 'relative' }}>
        <span className="journey-text" style={{ fontSize: '0.9rem', letterSpacing: '0.15em' }}>
          ЗАПУСК ПУТЕШЕСТВИЯ
        </span>
      </div>

      <style>{`
        .journey-star {
          animation-name: journey-twinkle;
          animation-timing-function: ease-in-out;
          animation-iteration-count: infinite;
          opacity: 0;
        }
        @keyframes journey-twinkle {
          0%, 100% { opacity: 0; }
          50% { opacity: 1; }
        }

        .journey-orbit {
          position: absolute;
          border-radius: 50%;
          border: 1px dashed rgba(255, 176, 87, 0.35);
        }
        .journey-orbit-outer {
          inset: 0;
          animation: journey-spin 5s linear infinite;
        }
        .journey-orbit-outer::before {
          content: '';
          position: absolute;
          top: -4px;
          left: 50%;
          width: 10px;
          height: 10px;
          margin-left: -5px;
          border-radius: 50%;
          background: #5fd4ff;
          box-shadow: 0 0 10px 2px rgba(95, 212, 255, 0.8);
        }
        .journey-orbit-inner {
          inset: 28px;
          border-color: rgba(95, 212, 255, 0.3);
          animation: journey-spin-reverse 3.2s linear infinite;
        }
        .journey-orbit-inner::before {
          content: '';
          position: absolute;
          top: -3px;
          left: 50%;
          width: 7px;
          height: 7px;
          margin-left: -3.5px;
          border-radius: 50%;
          background: #ffe9b0;
          box-shadow: 0 0 8px 2px rgba(255, 233, 176, 0.8);
        }
        @keyframes journey-spin {
          to { transform: rotate(360deg); }
        }
        @keyframes journey-spin-reverse {
          to { transform: rotate(-360deg); }
        }

        .journey-sun {
          position: absolute;
          inset: 52px;
          border-radius: 50%;
          background: radial-gradient(circle, #fff3d6 0%, #ffb057 55%, rgba(255, 176, 87, 0) 100%);
          filter: blur(1px);
          animation: journey-sun-pulse 1.6s ease-in-out infinite;
        }
        @keyframes journey-sun-pulse {
          0%, 100% { transform: scale(0.92); opacity: 0.85; }
          50% { transform: scale(1.08); opacity: 1; }
        }

        .journey-text {
          animation: journey-text-flicker 2.4s ease-in-out infinite;
        }
        @keyframes journey-text-flicker {
          0%, 100% { opacity: 0.75; }
          50% { opacity: 1; text-shadow: 0 0 12px rgba(255, 176, 87, 0.8); }
        }
      `}</style>
    </div>
  )
}
