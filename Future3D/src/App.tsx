import { Suspense, lazy, useEffect } from 'react'
import '@fontsource/orbitron/700.css'
import '@fontsource/inter/400.css'
import '@fontsource/inter/600.css'
import '@fontsource/russo-one/cyrillic-400.css'
import { useLenis } from '@/hooks/useLenis'
import { JourneyScene } from '@/scenes/JourneyScene'
import { Nav } from '@/components/Nav'
import { AboutSection } from '@/components/AboutSection'
import { PortfolioCarousel } from '@/components/PortfolioCarousel'
import { PortfolioGallery } from '@/components/PortfolioGallery'
import { PortfolioCardDetail } from '@/components/PortfolioCardDetail'
import { PricingSection } from '@/components/PricingSection'
import { ContactSection } from '@/components/ContactSection'
import { GameEntry } from '@/components/GameEntry'
import { GameLoadingScreen } from '@/game/GameLoadingScreen'
import { JourneyLoadingScreen } from '@/scenes/JourneyLoadingScreen'
import { GameErrorBoundary } from '@/game/GameErrorBoundary'
import { StratosphereFlash } from '@/components/StratosphereFlash'
import { ScrollHint } from '@/components/ScrollHint'
import { useGameStore } from '@/utils/gameStore'
import { useGalleryStore } from '@/utils/galleryStore'
import { SCROLL_HEIGHT_VH } from '@/utils/scrollStore'
import { GlobalBackdrop } from '@/components/GlobalBackdrop'
import './styles/globals.css'

// GameMode тянет за собой ecctrl + @react-three/rapier (WASM-физика) —
// это добавило ~4.3 МБ в основной JS-бандл (gzip 550 КБ -> 2.17 МБ),
// хотя игру запускает не каждый посетитель. lazy() + Suspense выносят
// это в отдельный chunk, который грузится только по клику на START.
const GameMode = lazy(() => import('@/game/GameMode').then((m) => ({ default: m.GameMode })))

export function App() {
  useLenis()
  const isGameActive = useGameStore((s) => s.isGameActive)
  const setGameActive = useGameStore((s) => s.setGameActive)
  const isGalleryOpen = useGalleryStore((s) => s.isOpen)

  // По просьбе клиента - установленная на рабочий стол иконка (PWA) ведёт
  // сразу в игру, а не на верх лендинга (site.webmanifest: start_url
  // "/?play=game"). isGameActive - обычный boolean-флаг (см. GameMode
  // ниже) - переключить его напрямую безопасно независимо от текущей
  // позиции скролла, GameMode - полноэкранный оверлей, а не часть
  // страницы, привязанная к 3D-путешествию. history.replaceState убирает
  // параметр из адресной строки после срабатывания - чисто косметика,
  // не влияет на сам запуск (в standalone-режиме адресной строки и так не
  // видно, но обычный браузер её показывает).
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get('play') === 'game') {
      setGameActive(true)
      window.history.replaceState(null, '', window.location.pathname)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <>
      <Nav />
      {/* JourneyScene закреплена (position: sticky) внутри этого спейсера.
          Пока скроллим спейсер, 3D-сцена стоит на месте на весь экран;
          как только спейсер заканчивается, sticky сама "отпускает" её —
          сцена естественно уезжает вверх, открывая контент ниже. Без
          ручного JS/слежения за скроллом. */}
      <div style={{ position: 'relative', height: `${SCROLL_HEIGHT_VH}vh` }}>
        <div style={{ position: 'sticky', top: 0, height: '100vh', overflow: 'hidden' }}>
          {/* НЕ было Suspense вокруг главной 3D-сцены вообще - солнечная
              система/Земля (useGLTF внутри SkyZone/EarthPlanet) на быстром
              соединении успевают догрузиться раньше, чем React вообще
              пытается их отрисовать, так что до сих пор это было незаметно.
              На медленном мобильном интернете - тот же React ждёт эти
              модели молча, без единого визуального признака (отзыв клиента
              "чёрный экран, если подождать 5-10 минут - всё грузится") -
              никакой ошибки тут и не было, просто загрузка была невидимой.
              Свой экран загрузки (JourneyLoadingScreen.tsx), не тот же,
              что у игры - по отзыву клиента "у игры и у страницы
              загрузка одинаковая" - тема "орбиты вокруг солнца"
              соответствует тому, что реально грузится (солнечная
              система), а не переиспользованный игровой "варп". Тот же
              реальный процент через useProgress в обоих. */}
          <Suspense fallback={<JourneyLoadingScreen />}>
            <JourneyScene />
          </Suspense>
          <StratosphereFlash />
          {/* По просьбе клиента: люди не понимали, что страницу нужно
              скроллить - путешествие занимает целый экран (sticky) и без
              подсказки выглядит как статичная картинка. Сама гаснет после
              первого скролла, см. ScrollHint.tsx. */}
          <ScrollHint />
        </div>
      </div>

      {/* GlobalBackdrop - ОДИН неподвижный (position:fixed) анимированный
          фон на весь остаток страницы, смонтирован здесь один раз и
          дальше сам решает, когда появиться (когда читатель приблизится
          к About) - подробности и история бага ("фон мигает/пропадает
          при скролле") см. в самом компоненте. Секции ниже (About/
          Portfolio/Pricing/Contact/GameEntry) больше НЕ красят фон сами -
          он один на всех, они просто прозрачно лежат поверх него в
          обычном потоке страницы. */}
      <GlobalBackdrop />

      {/* Реальный контент лендинга — раньше после 3D-путешествия шли
          только карусель и игра, ни слова о том, что делает разработчик,
          сколько это стоит и как с ним связаться. */}
      <AboutSection />
      <PortfolioCarousel />
      <PricingSection />
      <ContactSection />
      <GameEntry />

      {isGameActive && (
        <GameErrorBoundary onExit={() => setGameActive(false)}>
          <Suspense fallback={<GameLoadingScreen />}>
            <GameMode />
          </Suspense>
        </GameErrorBoundary>
      )}

      {isGalleryOpen && <PortfolioGallery />}
      <PortfolioCardDetail />

      {/* Тюнер путешествия (шестерёнка в левом нижнем углу) убран по
          повторной просьбе клиента - сам компонент (JourneyTuner.tsx)
          никуда не делся, просто не рендерится здесь. */}
    </>
  )
}
