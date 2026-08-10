import { useCardDetailStore } from '@/utils/cardDetailStore'
import { THEMES } from '@/utils/themeTexture'

// Окно с описанием конкретной карточки портфолио - открывается по
// одиночному тапу на карточке (см. PortfolioCarousel.tsx), в отличие
// от PortfolioGallery.tsx (общая для всех карточек заглушка-галерея,
// остаётся нетронутой и не связана с этим компонентом). Контент пока
// текст-заглушка под тему (THEMES[i].description) - клиент пришлёт
// реальные тексты/картинки под конкретные проекты позже, сама структура
// уже готова их принять (просто заменить description/добавить поле
// картинки в Theme).
export function PortfolioCardDetail() {
  const openCardIndex = useCardDetailStore((s) => s.openCardIndex)
  const close = useCardDetailStore((s) => s.close)

  if (openCardIndex === null) return null
  const theme = THEMES[openCardIndex]
  if (!theme) return null

  return (
    <div
      onClick={close}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 2000,
        background: 'rgba(5, 7, 13, 0.78)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1.5rem',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          position: 'relative',
          maxWidth: '480px',
          width: '100%',
          padding: '2rem 1.75rem',
          background: `linear-gradient(180deg, ${theme.base} 0%, #05070d 100%)`,
          border: `1px solid ${theme.accent}`,
          boxShadow: `0 0 40px ${theme.glow}55`,
          borderRadius: '18px',
          color: '#eafcff',
          fontFamily: "'Inter', sans-serif",
          textAlign: 'center',
        }}
      >
        <button
          onClick={close}
          aria-label="Закрыть"
          style={{
            position: 'absolute',
            top: '0.9rem',
            right: '0.9rem',
            background: 'none',
            border: 'none',
            color: '#9db2c9',
            fontSize: '1.3rem',
            lineHeight: 1,
            cursor: 'pointer',
            touchAction: 'manipulation',
          }}
        >
          ✕
        </button>

        {/* Декоративная плашка-заглушка вместо реального изображения
            проекта - в цветах темы, тот же приём подсветки/свечения, что
            и у самих карточек (createThemeTexture). */}
        <div
          style={{
            width: '100%',
            height: '160px',
            borderRadius: '12px',
            marginBottom: '1.25rem',
            background: `radial-gradient(circle at 50% 45%, ${theme.glow}66 0%, ${theme.base} 70%)`,
            border: `1px solid ${theme.accent}55`,
          }}
        />

        <div
          style={{
            fontFamily: "'Orbitron', sans-serif",
            fontSize: '1.3rem',
            letterSpacing: '0.08em',
            color: theme.accent,
            marginBottom: '0.9rem',
          }}
        >
          {theme.title}
        </div>

        <p style={{ fontSize: '0.95rem', lineHeight: 1.6, color: '#c9d6e8', margin: 0 }}>{theme.description}</p>
      </div>
    </div>
  )
}
