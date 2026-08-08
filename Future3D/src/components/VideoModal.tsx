import { useEffect, useState } from 'react'
import { useVideoModalStore } from '@/utils/videoModalStore'

// Тот же архитектурный приём, что и у PortfolioGallery.tsx (полноэкранный
// фиксированный оверлей, плавное появление через двойной rAF, закрытие по
// Esc) - но это простой DOM/iframe, а не 3D-канвас: YouTube-видео нечем
// и незачем рендерить через WebGL.
//
// mute=1 обязателен вместе с autoplay=1 - современные браузеры блокируют
// автозапуск СО ЗВУКОМ без предварительного взаимодействия пользователя
// со страницей (autoplay policy Chrome/Safari); без mute видео просто не
// запустилось бы само, по факту не выполняя просьбу клиента "автозапуск".
// playsinline=1 - на iOS без этого видео разворачивается в системный
// полноэкранный плеер вместо проигрывания прямо в модалке.
function buildEmbedUrl(videoId: string): string {
  const params = new URLSearchParams({
    autoplay: '1',
    mute: '1',
    playsinline: '1',
    rel: '0',
  })
  return `https://www.youtube-nocookie.com/embed/${videoId}?${params.toString()}`
}

export function VideoModal() {
  const openVideoId = useVideoModalStore((s) => s.openVideoId)
  const close = useVideoModalStore((s) => s.close)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (!openVideoId) {
      setVisible(false)
      return
    }
    const id = requestAnimationFrame(() => requestAnimationFrame(() => setVisible(true)))
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => {
      cancelAnimationFrame(id)
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [openVideoId, close])

  if (!openVideoId) return null

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 2000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem 1rem',
        background: 'rgba(5, 7, 13, 0.9)',
        backdropFilter: 'blur(6px)',
        opacity: visible ? 1 : 0,
        transition: 'opacity 0.25s ease',
      }}
      onClick={close}
    >
      {/* key=openVideoId - гарантированный ремаунт iframe при каждом
          открытии (даже повторном открытии ТОГО ЖЕ видео), иначе
          autoplay может не сработать второй раз подряд, если React
          решит переиспользовать существующий DOM-узел. */}
      <div
        // Формат Shorts - вертикальное 9:16 видео, а не привычные 16:9 -
        // без этого видео проигрывалось бы с огромными чёрными полосами
        // по бокам.
        style={{
          position: 'relative',
          width: 'min(92vw, 440px)',
          height: 'min(88vh, 780px)',
          borderRadius: '16px',
          overflow: 'hidden',
          border: '1px solid rgba(95, 212, 255, 0.35)',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.6), 0 0 40px rgba(95, 212, 255, 0.15)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <iframe
          key={openVideoId}
          src={buildEmbedUrl(openVideoId)}
          title="YouTube video"
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 0 }}
          allow="autoplay; encrypted-media; picture-in-picture"
          allowFullScreen
        />
      </div>

      <button
        onClick={close}
        aria-label="Закрыть видео"
        style={{
          position: 'absolute',
          top: 'calc(1.5rem + env(safe-area-inset-top))',
          right: 'calc(1.5rem + env(safe-area-inset-right))',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.4rem',
          padding: '0.6rem 1.4rem',
          minHeight: '2.75rem',
          background: 'rgba(95, 212, 255, 0.95)',
          border: '1px solid #eafcff',
          borderRadius: '999px',
          color: '#05070d',
          fontFamily: "'Orbitron', sans-serif",
          fontWeight: 700,
          cursor: 'pointer',
          touchAction: 'manipulation',
          zIndex: 2001,
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.5)',
        }}
      >
        <span aria-hidden="true">✕</span>
        Закрыть
      </button>
    </div>
  )
}
