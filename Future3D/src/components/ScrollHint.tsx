import { useEffect, useState } from 'react'

// По просьбе клиента: люди не понимали, что страницу вообще нужно
// скроллить - вся 3D-сцена путешествия занимает целый экран (sticky) и
// внешне выглядит как статичная картинка, без обычных подсказок вроде
// полосы прокрутки, ощутимых сразу. Значок гаснет сам, как только
// пользователь начал скроллить (dependency только на window.scrollY -
// тот же приём, что и в JourneyTuner.tsx, не завязан на progress из
// scrollStore, который смягчён easeProgress и не обязан быть >0 сразу
// после первого маленького скролла).
export function ScrollHint() {
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => {
      if (window.scrollY > 40) setScrolled(true)
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <div
      style={{
        position: 'absolute',
        left: '50%',
        // Приветственная панель с часами (FloatingClock.tsx) занимает
        // самый низ экрана в первые секунды/первые ~14% скролла - подсказку
        // подняли выше, чтобы не накладывалась на неё (см. скриншот при
        // проверке: текст "Скроллите вниз" сливался с цифрами часов).
        bottom: 'calc(8rem + env(safe-area-inset-bottom))',
        transform: 'translateX(-50%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '0.6rem',
        zIndex: 5,
        pointerEvents: 'none',
        opacity: scrolled ? 0 : 1,
        transition: 'opacity 0.6s ease',
      }}
    >
      <span
        style={{
          fontFamily: "'Orbitron', sans-serif",
          fontSize: '0.72rem',
          letterSpacing: '0.25em',
          textTransform: 'uppercase',
          color: '#c8ecff',
          textShadow: '0 0 12px rgba(95, 212, 255, 0.6)',
        }}
      >
        Скроллите вниз
      </span>
      <div
        style={{
          width: '26px',
          height: '42px',
          borderRadius: '999px',
          border: '2px solid rgba(200, 236, 255, 0.8)',
          boxShadow: '0 0 14px rgba(95, 212, 255, 0.35)',
          position: 'relative',
        }}
      >
        <div
          style={{
            position: 'absolute',
            left: '50%',
            top: '7px',
            width: '4px',
            height: '9px',
            borderRadius: '999px',
            background: '#5fd4ff',
            boxShadow: '0 0 8px rgba(95, 212, 255, 0.9)',
            transform: 'translateX(-50%)',
            animation: 'scroll-hint-wheel 1.8s ease-in-out infinite',
          }}
        />
      </div>
      <style>{`
        @keyframes scroll-hint-wheel {
          0% { transform: translate(-50%, 0); opacity: 1; }
          70% { opacity: 0.4; }
          100% { transform: translate(-50%, 14px); opacity: 0; }
        }
      `}</style>
    </div>
  )
}
