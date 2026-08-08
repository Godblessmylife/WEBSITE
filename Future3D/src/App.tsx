import { Suspense, lazy } from 'react'
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

      {/* Реальный контент лендинга — раньше после 3D-путешествия шли
          только карусель и игра, ни слова о том, что делает разработчик,
          сколько это стоит и как с ним связаться. */}
      <AboutSection />
      <PortfolioCarousel />
      <PricingSection />
      {/* Общий фон на обе секции - раньше у ContactSection и GameEntry
          были свои отдельные radial-gradient (разные центры/цвета), и на
          стыке между ними был заметный шов. По просьбе клиента "сделай
          одно целое" - один непрерывный градиент на обёртке вместо двух
          на каждой секции по отдельности (сами секции больше не красят
          фон, см. их комментарии). */}
      <div
        style={{
          position: 'relative',
          background: 'radial-gradient(circle at 50% 25%, #182a45 0%, #0a1120 45%, #05070d 85%)',
        }}
      >
        <ContactSection />
        <GameEntry />
      </div>

      {isGameActive && (
        <GameErrorBoundary onExit={() => setGameActive(false)}>
          <Suspense fallback={<GameLoadingScreen />}>
            <GameMode />
          </Suspense>
        </GameErrorBoundary>
      )}

      {isGalleryOpen && <PortfolioGallery />}

      {/* Тюнер путешествия (шестерёнка в левом нижнем углу) убран по
          повторной просьбе клиента - сам компонент (JourneyTuner.tsx)
          никуда не делся, просто не рендерится здесь. */}
    </>
  )
}
