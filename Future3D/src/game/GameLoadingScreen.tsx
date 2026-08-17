import { useMemo } from 'react'
import { useProgress } from '@react-three/drei'

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
  // useProgress - обычный zustand-стор поверх THREE.DefaultLoadingManager,
  // не требует Canvas/R3F-контекста - работает одинаково что здесь (внутри
  // Html внутри Canvas), что в App.tsx (снаружи Canvas, для самого JS-чанка
  // игры). По отзыву клиента вместо бесконечной анимации нужна настоящая
  // шкала загрузки - progress округляем сами, drei иногда отдаёт дробные
  // значения вроде 99.997.
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

      {/* Угловые скобки sci-fi HUD-рамки (Дополнение 6, визуальное усиление
          по просьбе клиента "начальную загрузку игры покруче") - чисто
          декоративные, статичные, не несут новой информации сверх уже
          существующего текста/процента ниже. */}
      {[
        { top: '4%', left: '4%', rotate: 0 },
        { top: '4%', right: '4%', rotate: 90 },
        { bottom: '4%', right: '4%', rotate: 180 },
        { bottom: '4%', left: '4%', rotate: 270 },
      ].map((corner, i) => (
        <div
          key={i}
          className="warp-corner"
          style={{
            position: 'absolute',
            top: corner.top,
            left: corner.left,
            right: corner.right,
            bottom: corner.bottom,
            transform: `rotate(${corner.rotate}deg)`,
          }}
        />
      ))}

      <div style={{ position: 'relative', width: '132px', height: '132px' }}>
        <div className="warp-ring warp-ring-outer" />
        <div className="warp-ring warp-ring-mid" />
        <div className="warp-ring warp-ring-inner" />
        <div className="warp-core" />
        <div className="warp-scanline" />
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
            textShadow: '0 0 6px rgba(255, 255, 255, 0.6)',
          }}
        >
          {progress}%
        </div>
      </div>

      {/* Настоящая шкала загрузки (по отзыву клиента) поверх прежней
          бесконечной анимации - drei useProgress считает её по реальным
          загруженным/всего байтам через THREE.DefaultLoadingManager, а не
          имитирует. */}
      <div
        style={{
          width: '220px',
          height: '6px',
          borderRadius: '999px',
          background: 'rgba(95, 212, 255, 0.15)',
          border: '1px solid rgba(95, 212, 255, 0.35)',
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        <div
          style={{
            width: `${progress}%`,
            height: '100%',
            borderRadius: '999px',
            background: 'linear-gradient(90deg, #5fd4ff, #eafcff)',
            boxShadow: '0 0 10px rgba(95, 212, 255, 0.8)',
            transition: 'width 0.25s ease-out',
          }}
        />
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
          box-shadow: 0 0 42px rgba(95, 212, 255, 0.6);
          animation: warp-spin 1.1s linear infinite;
        }
        .warp-ring-mid {
          inset: 10px;
          border-left-color: #935cff;
          border-bottom-color: rgba(147, 92, 255, 0.35);
          box-shadow: 0 0 24px rgba(147, 92, 255, 0.5);
          animation: warp-spin 1.9s linear infinite;
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

        /* Тонкая горизонтальная "сканирующая" линия, проходящая сквозь
           кольца сверху вниз и обратно - чисто декоративный sci-fi акцент,
           clip-path кольцом ограничивает её видимой областью колец. */
        .warp-scanline {
          position: absolute;
          inset: 0;
          border-radius: 50%;
          overflow: hidden;
          pointer-events: none;
        }
        .warp-scanline::after {
          content: '';
          position: absolute;
          left: -20%;
          right: -20%;
          height: 3px;
          background: linear-gradient(90deg, transparent, #eafcff 50%, transparent);
          box-shadow: 0 0 14px 2px rgba(234, 252, 255, 0.85);
          animation: warp-scan-move 1.8s ease-in-out infinite;
        }
        @keyframes warp-scan-move {
          0% { top: 2%; opacity: 0; }
          15% { opacity: 1; }
          85% { opacity: 1; }
          100% { top: 96%; opacity: 0; }
        }

        .warp-corner {
          width: 34px;
          height: 34px;
          border-top: 2px solid rgba(95, 212, 255, 0.65);
          border-left: 2px solid rgba(95, 212, 255, 0.65);
          filter: drop-shadow(0 0 6px rgba(95, 212, 255, 0.5));
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
