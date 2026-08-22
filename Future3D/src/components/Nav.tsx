import { useState } from 'react'
import type { CSSProperties } from 'react'
import { useScrollStore } from '@/utils/scrollStore'
import { useCompanyPageStore } from '@/utils/companyPageStore'

// Раньше кнопки доскролливали до точки внутри 3D-путешествия (progress
// 0-1) — по сути никуда, реального контента там не было. Теперь ведут
// к настоящим DOM-секциям (см. App.tsx: AboutSection/PricingSection/
// ContactSection/GameEntry, все с id, совпадающими с anchor ниже).
//
// "Игра" убрана по просьбе клиента — вход в игру остаётся только через
// кнопку START на самой 3D-панели (GameEntry.tsx), без дублирующего
// пункта в навигации.
const NAV_ITEMS = [
  { label: 'О нас', anchor: '#about' },
  { label: 'Портфолио', anchor: '#portfolio' },
  { label: 'Цены', anchor: '#pricing' },
  { label: 'Заказать сайт', anchor: '#contact' },
]

export function Nav() {
  return (
    <nav style={navStyle}>
      {NAV_ITEMS.map((item) => (
        <NavButton key={item.label} label={item.label} onClick={() => useScrollStore.getState().scrollToElement(item.anchor)} />
      ))}
      {/* Отдельная полноэкранная страница (CompanyPage.tsx), а не anchor-
          секция - открывается поверх сайта, не участвует в скролле
          путешествия. */}
      <NavButton label="О компании" onClick={() => useCompanyPageStore.getState().open('about')} />
      <style>{NAV_BUTTON_CSS}</style>
    </nav>
  )
}

// "Крутая 3D-кнопка будущего": скошенные (не прямоугольные) углы через
// clip-path вместо привычной таблетки — сразу читается как sci-fi HUD,
// а не обычная веб-кнопка. Объём даёт псевдоэлемент ::before,
// сдвинутый вниз-вправо и притемнённый — классический приём "кнопка с
// толщиной", без реального 3D/Three.js (это обычный DOM-элемент навигации,
// ему не нужен WebGL-контекст ради эффекта). При наведении кнопка
// приподнимается к зрителю (translateY + лёгкий наклон по X через
// perspective) и по ней слева направо пробегает световой блик.
function NavButton({ label, onClick }: { label: string; onClick: () => void }) {
  const [hovered, setHovered] = useState(false)

  return (
    <button
      className="nav-3d-btn"
      style={hovered ? navButtonHoverStyle : navButtonStyle}
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <span className="nav-3d-btn-face">{label}</span>
      <span className="nav-3d-btn-sheen" />
    </button>
  )
}

const CLIP = 'polygon(14px 0, 100% 0, 100% calc(100% - 14px), calc(100% - 14px) 100%, 0 100%, 0 14px)'

const navStyle: CSSProperties = {
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  zIndex: 10,
  display: 'flex',
  justifyContent: 'center',
  flexWrap: 'wrap',
  gap: '0.9rem',
  // env(safe-area-inset-*) — отступ под чёлку/шторку iOS в альбомной
  // ориентации и жестовую панель снизу; на устройствах без выемки
  // (и на десктопе) эти env()-функции возвращают 0, так что это ничего
  // не меняет вне iOS.
  padding: 'calc(1.5rem + env(safe-area-inset-top)) calc(1.5rem + env(safe-area-inset-right)) 1.5rem calc(1.5rem + env(safe-area-inset-left))',
  pointerEvents: 'none',
}

// По просьбе клиента кнопки сделаны прозрачнее (ниже alpha у фона) и
// чуть компактнее (меньше padding/minHeight/шрифт), чем раньше.
//
// Шрифт - Russo One (по просьбе клиента "уникальный шрифт в космическом
// стиле" для этих 4 кнопок отдельно от остального сайта, где везде
// Orbitron - см. GameMode.tsx/HUD игры и т.п.). Уже подключён в проекте
// (App.tsx: '@fontsource/russo-one/cyrillic-400.css', используется для
// крупного 3D-заголовка "РАЗРАБОТКА ВЕБ-САЙТОВ" в ParticleHeading.tsx) -
// новых шрифтовых файлов на сайт не добавляет. Только вес 400 реально
// загружен - fontWeight:700 без 700-го файла браузер бы "дорисовывал"
// сам (faux bold, выглядит грубее) - у Russo One и так один плотный,
// визуально уже "жирный" по рисунку вес, 400 достаточно.
const navButtonBase: CSSProperties = {
  pointerEvents: 'auto',
  position: 'relative',
  fontFamily: "'Russo One', 'Orbitron', sans-serif",
  fontWeight: 400,
  fontSize: '0.72rem',
  letterSpacing: '0.14em',
  textTransform: 'uppercase',
  color: '#eafcff',
  border: '1px solid rgba(95, 212, 255, 0.5)',
  clipPath: CLIP,
  padding: '0.65rem 1.35rem 0.65rem 1.25rem',
  minHeight: '2.4rem',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer',
  touchAction: 'manipulation',
  overflow: 'hidden',
  transition: 'transform 0.25s cubic-bezier(0.2, 0.9, 0.3, 1.3), box-shadow 0.25s ease, border-color 0.25s ease, background 0.3s ease',
}

const navButtonStyle: CSSProperties = {
  ...navButtonBase,
  background: 'linear-gradient(160deg, rgba(22, 34, 50, 0.55), rgba(8, 13, 22, 0.6))',
  transform: 'perspective(600px) rotateX(0deg) translateY(0) translateZ(0)',
  boxShadow: '0 3px 0 rgba(95, 212, 255, 0.3), 0 8px 20px rgba(0, 0, 0, 0.45)',
}

const navButtonHoverStyle: CSSProperties = {
  ...navButtonBase,
  background: 'linear-gradient(160deg, rgba(32, 52, 74, 0.65), rgba(10, 18, 30, 0.7))',
  borderColor: 'rgba(95, 212, 255, 0.95)',
  transform: 'perspective(600px) rotateX(-9deg) translateY(-4px) translateZ(6px)',
  boxShadow:
    '0 3px 0 rgba(95, 212, 255, 0.55), 0 16px 30px rgba(95, 212, 255, 0.25), 0 0 26px rgba(95, 212, 255, 0.4)',
}

// Псевдоэлементы и keyframes нельзя выразить inline-style в React —
// тот же приём, что и в остальной игровой/загрузочной UI этого проекта
// (QuestUI.tsx, Minimap.tsx, GameLoadingScreen.tsx): один общий <style>
// с классами вместо десятка обёрточных styled-компонентов ради пары
// правил.
const NAV_BUTTON_CSS = `
  .nav-3d-btn::before {
    content: '';
    position: absolute;
    inset: 0;
    clip-path: ${CLIP};
    background: linear-gradient(160deg, rgba(95, 212, 255, 0.35), rgba(95, 212, 255, 0));
    transform: translate(3px, 5px);
    z-index: -1;
    opacity: 0.7;
  }
  .nav-3d-btn-face {
    position: relative;
    z-index: 1;
    text-shadow: 0 0 10px rgba(95, 212, 255, 0.45);
  }
  .nav-3d-btn-sheen {
    position: absolute;
    top: 0;
    left: -60%;
    width: 35%;
    height: 100%;
    background: linear-gradient(115deg, transparent, rgba(255, 255, 255, 0.4), transparent);
    transform: skewX(-18deg);
    transition: left 0.65s ease;
    pointer-events: none;
  }
  .nav-3d-btn:hover .nav-3d-btn-sheen {
    left: 130%;
  }
  .nav-3d-btn:active {
    transform: perspective(600px) rotateX(-2deg) translateY(1px) translateZ(0) !important;
  }
`
