import { useEffect, useState } from 'react'
import type { CSSProperties } from 'react'
import { useCompanyPageStore } from '@/utils/companyPageStore'
import { useScrollStore } from '@/utils/scrollStore'

// Полноэкранный оверлей "О компании" - тот же архитектурный приём, что у
// GameMode/PortfolioGallery (position:fixed поверх всего сайта, открыт
// пока companyPageStore.page === 'about'), но без Canvas/WebGL - это
// обычный DOM-контент (фото, текст, ссылки), которому не нужен 3D-
// рендер. Открывается кнопкой в Nav.tsx и напрямую по ссылке
// "/?page=about" (App.tsx читает query-параметр при загрузке, тот же
// приём, что уже есть для "?play=game").

// Реальные факты из резюме (CV SENIOR -IOANNES-.pdf, см. public/resume.pdf)
// + то, что клиент назвал в переписке напрямую (Trust Wallet, Cardano) -
// раньше здесь были более общие формулировки, местами дублировавшие
// заголовок hero-блока ("16 лет в коде" повторялось дважды) - теперь
// каждая карточка про конкретный, отдельный факт.
const ACHIEVEMENTS = [
  { icon: '🏆', title: 'ПОБЕДЫ В ХАКАТОНАХ', text: 'Трёхкратный чемпион хакатонов, включая победу на DoraHacks (экосистема Solana) и участие в Solana Breakout Hackathon (Colosseum).' },
  { icon: '🚀', title: 'ENLIGHTENED MINDS', text: 'Партнёр и лид-разработчик: блокчейн- и AI-платформы на 100K+ пользователей, задержка снижена до 30%.' },
  { icon: '👛', title: 'TRUST WALLET & CARDANO', text: 'Разработка для Trust Wallet и участие в построении экосистемы Cardano.' },
  { icon: '⛓', title: 'SMART CONTRACTS', text: 'Solidity и Rust на EVM и Solana — токен-логика, стейкинг, безопасная проверка подписей кошельков.' },
  { icon: '🔐', title: 'SECURITY-FIRST', text: 'Threat modeling и security-by-design в бэкенде и Web3-инфраструктуре, поиск эксплойтов до того, как это сделают другие.' },
  { icon: '🖥', title: '1200+ ВИДЕОКАРТ', text: 'Строил и оптимизировал GPU-инфраструктуру на 1200+ карт, вплоть до BGA-пайки для апгрейда памяти.' },
]

// Фото с профильных мероприятий - файлы лежат в public/about/, поэтому
// в рантайме это просто /about/photo-N.jpg (Vite отдаёт public/ как
// корень). PhotoCard ниже не падает, если файла ещё нет - onError
// скрывает <img> и остаётся декоративная подложка с подписью.
const PHOTOS = [
  { src: '/about/photo-1.jpg', caption: 'Decentralized: No Matter What v.2 — крипто-конференция' },
  { src: '/about/photo-2.jpg', caption: 'Нетворкинг с командами Web3-индустрии' },
  { src: '/about/photo-3.jpg', caption: 'На индустриальных мероприятиях блокчейн-экосистемы' },
  { src: '/about/photo-4-hackathon.jpg', caption: 'Solana Breakout Hackathon (Colosseum × Solana Foundation)' },
]

const RESUME_URL = '/resume.pdf'

function PhotoCard({ src, caption }: { src: string; caption: string }) {
  const [broken, setBroken] = useState(false)

  return (
    <figure
      style={{
        margin: 0,
        borderRadius: '16px',
        overflow: 'hidden',
        border: '1px solid rgba(95, 212, 255, 0.22)',
        background: 'linear-gradient(160deg, rgba(32, 52, 74, 0.55), rgba(8, 13, 22, 0.7))',
        boxShadow: '0 12px 30px rgba(0, 0, 0, 0.4)',
      }}
    >
      <div style={{ position: 'relative', aspectRatio: '4 / 3', background: 'radial-gradient(circle at 50% 40%, rgba(95, 212, 255, 0.18), rgba(5, 7, 13, 0.9))' }}>
        {!broken && (
          <img
            src={src}
            alt={caption}
            loading="lazy"
            onError={() => setBroken(true)}
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
          />
        )}
        {broken && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#5fd4ff88',
              fontSize: '2rem',
            }}
          >
            📷
          </div>
        )}
      </div>
      <figcaption style={{ padding: '0.75rem 1rem', fontSize: '0.82rem', color: '#9db2c9', lineHeight: 1.4 }}>
        {caption}
      </figcaption>
    </figure>
  )
}

function BackButton() {
  return (
    <button
      onClick={() => useCompanyPageStore.getState().close()}
      style={{
        position: 'fixed',
        top: 'calc(1.25rem + env(safe-area-inset-top))',
        right: 'calc(1.25rem + env(safe-area-inset-right))',
        zIndex: 20,
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.4rem',
        padding: '0.6rem 1.3rem',
        minHeight: '2.6rem',
        background: 'rgba(95, 212, 255, 0.95)',
        border: '1px solid #eafcff',
        borderRadius: '999px',
        color: '#05070d',
        fontFamily: "'Orbitron', sans-serif",
        fontWeight: 700,
        fontSize: '0.85rem',
        cursor: 'pointer',
        touchAction: 'manipulation',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.5)',
      }}
    >
      <span aria-hidden="true">✕</span>
      Закрыть
    </button>
  )
}

const sectionLabelStyle: CSSProperties = {
  fontFamily: "'Orbitron', sans-serif",
  fontWeight: 700,
  color: '#5fd4ff',
  letterSpacing: '0.18em',
  fontSize: 'clamp(1rem, 2.5vw, 1.3rem)',
  marginBottom: '1.25rem',
  textShadow: '0 0 22px rgba(95, 212, 255, 0.55)',
}

export function CompanyPage() {
  const page = useCompanyPageStore((s) => s.page)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (page !== 'about') return
    // Двойной rAF - тот же приём, что PortfolioGallery.tsx, чтобы CSS-
    // transition действительно увидел переход opacity 0 -> 1.
    const id = requestAnimationFrame(() => requestAnimationFrame(() => setVisible(true)))
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') useCompanyPageStore.getState().close()
    }
    window.addEventListener('keydown', onKeyDown)
    document.body.style.overflow = 'hidden'
    return () => {
      cancelAnimationFrame(id)
      window.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = ''
      setVisible(false)
    }
  }, [page])

  if (page !== 'about') return null

  const goToContact = () => {
    useCompanyPageStore.getState().close()
    // Небольшая задержка - сначала должен размонтироваться fixed-оверлей
    // (иначе скроллить некуда, обычный поток страницы скрыт под ним),
    // потом уже скролл к #contact.
    window.setTimeout(() => useScrollStore.getState().scrollToElement('#contact'), 60)
  }

  return (
    <div
      // data-lenis-prevent - БАГ, на который указал клиент ("страница не
      // прокручивается"): useLenis() (App.tsx) вешает Lenis на весь
      // документ, и по умолчанию Lenis сам перехватывает wheel/touch
      // события везде и виртуально скроллит window - вложенный div с
      // overflowY:auto эти события уже не получает. data-lenis-prevent -
      // штатный атрибут Lenis, отключающий перехват для этого узла и его
      // потомков, тогда скролл внутри оверлея работает нативно.
      data-lenis-prevent
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 900,
        overflowY: 'auto',
        overscrollBehavior: 'contain',
        background: '#05070d',
        opacity: visible ? 1 : 0,
        transition: 'opacity 0.3s ease',
      }}
    >
      <BackButton />

      <div style={{ maxWidth: '980px', margin: '0 auto', padding: '5.5rem 1.5rem 5rem' }}>
        {/* Hero */}
        <p style={{ ...sectionLabelStyle, textAlign: 'center' }}>О КОМПАНИИ</p>
        {/* Имя - Ioannes Avakian (см. реальное резюме, public/resume.pdf) -
            раньше страница была полностью анонимной, по просьбе клиента
            добавлено. */}
        <p
          style={{
            textAlign: 'center',
            fontFamily: "'Orbitron', sans-serif",
            color: '#eafcff',
            fontSize: 'clamp(0.85rem, 2vw, 1rem)',
            letterSpacing: '0.1em',
            margin: '0 0 0.5rem',
          }}
        >
          IOANNES AVAKIAN
        </p>
        {/* Заголовок построен вокруг реального факта из резюме (мотоспорт
            -> Web3), а не обобщённого "N лет опыта" - раньше "16 ЛЕТ В
            КОДЕ" стояло здесь ЖЕ, что и в карточке достижений ниже -
            дословный повтор, на который указал клиент. "16 лет опыта"
            теперь встречается только один раз - в абзаце ниже. */}
        <h1
          style={{
            fontFamily: "'Orbitron', sans-serif",
            fontSize: 'clamp(1.7rem, 5.5vw, 3rem)',
            lineHeight: 1.15,
            textAlign: 'center',
            margin: '0 0 1rem',
            color: '#f4f9ff',
            textShadow: '0 0 30px rgba(95, 212, 255, 0.35)',
          }}
        >
          ОТ ГОНОЧНОЙ ТРАССЫ FERRARI
          <br />
          ДО WEB3 И БЛОКЧЕЙНА
        </h1>
        <p
          style={{
            textAlign: 'center',
            maxWidth: '680px',
            margin: '0 auto 2rem',
            color: '#c3d3e6',
            fontSize: '1.05rem',
            lineHeight: 1.7,
          }}
        >
          Senior Software Engineer (Full-Stack / Web3) с 16-летним опытом в JavaScript и
          TypeScript — от механика Formula-1 и сборки GPU-ферм до разработки для Trust Wallet и
          построения экосистемы Cardano. Нахожу эксплойты там, где другие их не видят. Пишу и
          проверяю код лично — использую передовые технологии и делаю то, что другие считают
          невозможным.
        </p>

        {/* Достижения */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))',
            gap: '1.1rem',
            marginBottom: '3.5rem',
          }}
        >
          {ACHIEVEMENTS.map((a) => (
            <div
              key={a.title}
              style={{
                padding: '1.4rem',
                borderRadius: '16px',
                background: 'rgba(95, 212, 255, 0.06)',
                border: '1px solid rgba(95, 212, 255, 0.18)',
              }}
            >
              <div style={{ fontSize: '1.6rem', marginBottom: '0.5rem' }}>{a.icon}</div>
              <h3
                style={{
                  fontFamily: "'Orbitron', sans-serif",
                  fontSize: '0.92rem',
                  letterSpacing: '0.04em',
                  color: '#5fd4ff',
                  margin: '0 0 0.5rem',
                }}
              >
                {a.title}
              </h3>
              <p style={{ margin: 0, color: '#9db2c9', fontSize: '0.9rem', lineHeight: 1.5 }}>{a.text}</p>
            </div>
          ))}
        </div>

        {/* Фото с мероприятий */}
        <p style={sectionLabelStyle}>С МЕРОПРИЯТИЙ ИНДУСТРИИ</p>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '1.1rem',
            marginBottom: '3.5rem',
          }}
        >
          {PHOTOS.map((p) => (
            <PhotoCard key={p.src} src={p.src} caption={p.caption} />
          ))}
        </div>

        {/* Резюме */}
        <p style={sectionLabelStyle}>РЕЗЮМЕ</p>
        <div
          style={{
            padding: '1.75rem',
            borderRadius: '16px',
            background: 'linear-gradient(160deg, rgba(32, 52, 74, 0.55), rgba(8, 13, 22, 0.7))',
            border: '1px solid rgba(95, 212, 255, 0.22)',
            marginBottom: '3.5rem',
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1rem',
          }}
        >
          <p style={{ margin: 0, color: '#c3d3e6', fontSize: '0.95rem', maxWidth: '420px' }}>
            Полное резюме с опытом, стеком и проектами — в PDF. Можно открыть прямо в браузере или
            скачать себе.
          </p>
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <button
              onClick={() => window.open(RESUME_URL, '_blank', 'noopener,noreferrer')}
              style={resumeButtonStyle(true)}
            >
              Открыть резюме
            </button>
            <a href={RESUME_URL} download style={{ ...resumeButtonStyle(false), textDecoration: 'none' }}>
              Скачать PDF
            </a>
          </div>
        </div>

        {/* CTA */}
        <div style={{ textAlign: 'center' }}>
          <button onClick={goToContact} style={ctaButtonStyle}>
            Заказать разработку →
          </button>
        </div>
      </div>
    </div>
  )
}

function resumeButtonStyle(solid: boolean): CSSProperties {
  return {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '0.7rem 1.4rem',
    minHeight: '2.6rem',
    borderRadius: '999px',
    fontFamily: "'Orbitron', sans-serif",
    fontWeight: 700,
    fontSize: '0.82rem',
    letterSpacing: '0.04em',
    cursor: 'pointer',
    touchAction: 'manipulation',
    border: solid ? '1px solid #eafcff' : '1px solid rgba(95, 212, 255, 0.5)',
    background: solid ? 'rgba(95, 212, 255, 0.95)' : 'transparent',
    color: solid ? '#05070d' : '#eafcff',
  }
}

const ctaButtonStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  padding: '0.9rem 2.2rem',
  minHeight: '3rem',
  borderRadius: '999px',
  fontFamily: "'Orbitron', sans-serif",
  fontWeight: 700,
  fontSize: '0.95rem',
  letterSpacing: '0.05em',
  cursor: 'pointer',
  touchAction: 'manipulation',
  border: '1px solid #eafcff',
  background: 'rgba(95, 212, 255, 0.95)',
  color: '#05070d',
  boxShadow: '0 0 30px rgba(95, 212, 255, 0.4)',
}
