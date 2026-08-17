import { Suspense, useEffect, useRef, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { KeyboardControls, Html, useProgress } from '@react-three/drei'
import { Physics } from '@react-three/rapier'
import { type EcctrlHandle } from 'ecctrl'
import { VirtualButton } from 'ecctrl/input'
import * as THREE from 'three'
import { useGameStore } from '@/utils/gameStore'
import { useGamePerfStore } from '@/utils/gamePerfStore'
import { useGraphicsQualityStore } from '@/utils/graphicsQualityStore'
import { GraphicsSettingsButton } from './GraphicsSettingsButton'
import { useGodModeStore } from '@/utils/godModeStore'
import { useCraftStore, craftGhostStore } from '@/utils/craftStore'
import { useBuildStore, buildGhostStore } from '@/utils/buildStore'
import { CraftModeController } from './CraftModeController'
import { PlacedBlocks } from './PlacedBlocks'
import { useProfileStore } from '@/utils/profileStore'
import { ProfilePanel } from './ProfilePanel'
import { ObjectToolbar } from './ObjectToolbar'
import { SkillsButton } from './SkillsButton'
import { useCameraZoomStore } from '@/utils/cameraZoomStore'
import { useIsMobileViewport } from '@/utils/useIsMobileViewport'
import { useIsTouchDevice } from '@/utils/useIsTouchDevice'
import { useIsPortrait } from '@/utils/useIsPortrait'
import { RotateDevicePrompt } from './RotateDevicePrompt'
import { AdaptivePerformance } from '@/utils/AdaptivePerformance'
import { GameWorld } from './GameWorld'
import { CAMERA_FAR, FOG_FAR } from './worldConstants'
import { PlayerCharacter } from './PlayerCharacter'
import { GameCamera } from './GameCamera'
import { Portal } from './Portal'
import { Bonuses } from './Bonuses'
import { QuestNpc } from './QuestNpc'
import { QuestItem } from './QuestItem'
import { QuestObjectiveRocket } from './QuestObjectiveRocket'
import { QuestObjectiveChip } from './QuestObjectiveChip'
import { QuestDialogue, QuestLog } from './QuestUI'
import { useQuestStore } from '@/utils/questStore'
import { GameDebugTracker, GameDebugHUD } from './GameDebugHUD'
import { Minimap, MinimapTracker } from './Minimap'
import { SpaceZone, SPACE_TELEPORT_TARGET, SPACE_RETURN_PORTAL_POSITION } from './SpaceZone'
import { TeleportEffect } from './TeleportEffect'
import { GameLoadingScreen } from './GameLoadingScreen'
import { CarEntryTrigger, DrivingCar, performCarInteraction } from './CarDriving'
import { DynamicJoystick } from './DynamicJoystick'
import { useDriveStore } from '@/utils/driveStore'

const DESERT_PORTAL_POSITION = new THREE.Vector3(10, 0, -10)
// Совпадает со стартовой позицией персонажа в PlayerCharacter.tsx
// (Ecctrl position=[0,2,0]) - проверенное безопасное место, далеко
// (14 юнитов) от DESERT_PORTAL_POSITION, чтобы посадка не задевала
// радиус срабатывания портала туда.
const DESERT_RETURN_TARGET = new THREE.Vector3(0, 2, 0)

// Разрешение рендера по выбранному в настройках (шестерёнка, см.
// GraphicsSettingsButton.tsx) качеству - "низкое" совпадает с тем, что
// раньше было принудительно для ЛЮБОГО тач-устройства (см. комментарий
// в perfStore.ts), теперь это осознанный выбор владельца слабого
// телефона, а не автоматика по типу указателя.
const DPR_BY_QUALITY: Record<'high' | 'medium' | 'low', [number, number] | number> = {
  high: [1, 2],
  medium: [1, 1.5],
  low: 1,
}

const KEYBOARD_MAP = [
  { name: 'forward', keys: ['ArrowUp', 'KeyW'] },
  { name: 'backward', keys: ['ArrowDown', 'KeyS'] },
  { name: 'leftward', keys: ['ArrowLeft', 'KeyA'] },
  { name: 'rightward', keys: ['ArrowRight', 'KeyD'] },
  { name: 'jump', keys: ['Space'] },
  { name: 'run', keys: ['ShiftLeft', 'ShiftRight'] },
  // Только для God Mode (спуск при полёте) - в обычном режиме ничего не
  // делает, PlayerCharacter.tsx читает это поле только пока godMode активен.
  { name: 'descend', keys: ['ControlLeft', 'KeyC'] },
  // Сесть/выйти из машины (CarDriving.tsx) - по просьбе клиента именно
  // ENTER, не отдельная кнопка на экране (десктопный сценарий; на
  // телефоне подойти вплотную к машине и коснуться экрана — тач-события
  // на клавиатуру не влияют, а расстояние проверяется отдельно).
  { name: 'interact', keys: ['Enter'] },
]

// Полноэкранный оверлей мини-игры: физический мир (Rapier) + персонаж
// на ecctrl (WASD/стрелки, пробел — прыжок, Shift — бег) + камера от
// третьего лица. Монтируется поверх всего сайта, пока isGameActive.
export function GameMode() {
  const setGameActive = useGameStore((s) => s.setGameActive)
  const score = useGameStore((s) => s.score)
  const ecctrlRef = useRef<EcctrlHandle>(null!)
  // Отдельный от лендинга стор (gamePerfStore.ts, не perfStore.ts) - см.
  // подробный комментарий там про то, почему их пришлось разделить: у
  // игры своя настройка качества (graphicsQualityStore.ts + шестерёнка),
  // и понижение по одному лишь признаку touch-устройства через ОБЩИЙ
  // стор с лендингом там не нужно (и однажды уже сломало сам лендинг,
  // когда его убрали не в том месте).
  const reduced = useGamePerfStore((s) => s.reduced)
  const setReduced = useGamePerfStore((s) => s.setReduced)
  const quality = useGraphicsQualityStore((s) => s.quality)
  const setLogOpen = useQuestStore((s) => s.setLogOpen)
  const isLogOpen = useQuestStore((s) => s.isLogOpen)
  const godModeActive = useGodModeStore((s) => s.active)
  const toggleGodMode = useGodModeStore((s) => s.toggle)
  const drivingId = useDriveStore((s) => s.drivingId)
  const nearCarId = useDriveStore((s) => s.nearCarId)
  const isMobile = useIsMobileViewport()
  // useIsMobileViewport проверяет ШИРИНУ окна - у телефона в landscape
  // (см. RotateDevicePrompt.tsx) она обычно БОЛЬШЕ 640px, так что для
  // джойстиков/тач-специфичных элементов нужна проверка типа указателя
  // (палец/мышь), а не текущего размера окна - иначе джойстики пропадали
  // бы именно в момент, когда игрок поворачивает телефон, чтобы играть.
  const isTouch = useIsTouchDevice()
  const isPortrait = useIsPortrait()
  // Режим "перемещение объектов" (шестерёнка в GameMode.tsx) - см.
  // подробный комментарий в craftStore.ts: невидимая зона джойстика
  // перехватывает касания раньше, чем они доходят до объектов карты,
  // оба способа управления одним и тем же пальцем разом работать не
  // могут - явный переключатель отдаёт приоритет одному из двух.
  const moveModeEnabled = useCraftStore((s) => s.moveModeEnabled)
  const setMoveModeEnabled = useCraftStore((s) => s.setMoveModeEnabled)
  // Кирка/стройка лестницами (Дополнение 3) - кнопка-точка входа в HUD
  // убрана по просьбе клиента (Дополнение 4, заменена на "Профиль"), но
  // сам стор/рендер поставленных блоков не удалён - см. подробный
  // комментарий в buildStore.ts. pickaxeActive теперь всегда false
  // (больше ничего не вызывает setPickaxeActive(true)), hasPlacedBlocks
  // держит уже поставленные раньше блоки видимыми.
  const pickaxeActive = useBuildStore((s) => s.pickaxeActive)
  const hasPlacedBlocks = useBuildStore((s) => s.placedBlocks.length > 0)
  const setProfileOpen = useProfileStore((s) => s.setOpen)
  const cameraZoomLevel = useCameraZoomStore((s) => s.zoomLevel)
  const setCameraZoomLevel = useCameraZoomStore((s) => s.setZoomLevel)
  // По просьбе клиента: игра рассчитана на альбомную ориентацию, узкий
  // портретный экран тесен для джойстиков слева и справа сразу - только
  // для тач-устройств (на десктопе понятие "поворота окна" не имеет
  // смысла и не должно ничего блокировать).
  const needsRotate = isTouch && isPortrait

  // По отзыву клиента: джойстик/кнопки были доступны ещё ДО того, как
  // догрузились все .glb модели (Suspense внутри Canvas это учитывает,
  // а DOM-оверлей снаружи Canvas - нет, он монтируется сразу вместе с
  // GameMode). Тап по джойстику в этот момент ничего не ломал напрямую
  // (Ecctrl ещё не смонтирован, читать нечего), но ощущался как "игра
  // дёргается/виснет" в первые секунды. useProgress - обычный zustand-стор
  // поверх общего THREE.DefaultLoadingManager, не завязан на Canvas -
  // безопасно читать здесь же, снаружи. round(...) в GameLoadingScreen -
  // drei иногда отдаёт 99.997% и это никогда не станет 100 без округления.
  const assetsLoaded = useProgress((s) => Math.round(s.progress) >= 100 && !s.active)
  // По отзыву клиента "загрузка такая быстрая, что её даже не видно" -
  // если модели уже в кэше браузера (обычная ситуация после первого
  // визита), useProgress добегает до 100% за десятки миллисекунд, и
  // красивый экран загрузки с процентом попросту не успевает мелькнуть -
  // выглядит как будто его вообще нет. Минимальная задержка не привязана
  // к реальной загрузке (это не обман - сама загрузка всё ещё настоящая
  // и может занять и больше секунды), она только гарантирует, что экран
  // успевает быть замеченным, даже когда сама загрузка мгновенная.
  const MIN_LOADING_SCREEN_MS = 1200
  const [minDelayPassed, setMinDelayPassed] = useState(false)
  useEffect(() => {
    const t = window.setTimeout(() => setMinDelayPassed(true), MIN_LOADING_SCREEN_MS)
    return () => window.clearTimeout(t)
  }, [])
  const isLoaded = assetsLoaded && minDelayPassed

  // Полное пересоздание Canvas (см. key ниже) - основной способ пережить
  // потерю WebGL-контекста. По отзыву клиента "иногда выкидывает после
  // того, как повернул экран, чего раньше не было" - поворот телефона
  // резко меняет разрешение канваса (весь фреймбуфер под новый размер
  // выделяется заново), и именно этот момент чаще всего проявляет
  // нехватку GPU-памяти на телефоне (десятки .glb + WASM-физика
  // одновременно) как потерю контекста. Пассивно ждать webglcontextrestored
  // недостаточно: сам контекст может "восстановиться", но все текстуры/
  // буферы Three.js всё равно потеряны безвозвратно - попытка рисовать
  // ими дальше сама по себе кидает ошибку на следующем кадре (то самое
  // "зависает и выкидывает с ошибкой"). Полный ремонт - Canvas
  // размонтируется и создаётся заново с нуля, Three.js/Rapier поднимаются
  // с чистого листа, а сами .glb берутся из кэша браузера (не перекачиваются
  // заново) - визуально это доля секунды новой загрузки, а не полный сбой.
  const [canvasKey, setCanvasKey] = useState(0)
  const recoveryAttemptsRef = useRef(0)
  const MAX_CONTEXT_RECOVERY_ATTEMPTS = 3

  // Компактные размеры HUD-кнопок на телефоне (по просьбе клиента) —
  // отступ между ними ("9rem"/"8rem" в calc() ниже) тоже уменьшен,
  // иначе при меньшей ширине самих кнопок между ними осталась бы
  // неоправданно большая дыра.
  const btnPadding = isMobile ? '0.4rem 0.9rem' : '0.6rem 1.4rem'
  const btnMinHeight = isMobile ? '2.1rem' : '2.75rem'
  const btnFontSize = isMobile ? '0.8rem' : undefined
  const btnGap = isMobile ? '6rem' : '9rem'
  const btnGapRight = isMobile ? '5.5rem' : '8rem'
  const edgeInset = isMobile ? '0.75rem' : '1.5rem'
  // Ширина мини-карты (Minimap.tsx: MAP_SIZE=168px, на мобильном
  // transform: scale(0.5)) - кнопки "Прыжок"/"Вверх"/"Вниз" сдвинуты на
  // это расстояние левее нижнего правого угла, чтобы не оказаться под
  // мини-картой (та же зона экрана, но у карты z-index выше).
  const minimapClearance = isMobile ? '96px' : '180px'

  // Ставит объект, который сейчас "в руках" (Grabbable.tsx, кнопка
  // "Переместить" на всплывающей панели при наведении), при клике КУДА
  // УГОДНО мимо других интерактивных объектов - основной способ
  // поставить. onPointerMissed у R3F срабатывает именно тогда, когда
  // клик не задел ни один интерактивный объект сцены (земля/декорации
  // без onClick это не объекты-цели).
  const handleCanvasPointerMissed = () => {
    // Кирка активна - клик мимо интерактивных объектов ставит блок
    // лестницы в текущей точке "призрака", а не двигает объект карты
    // (обе фичи используют один и тот же onPointerMissed, но не бывают
    // нужны одновременно - кирка проверяется первой).
    const buildState = useBuildStore.getState()
    if (buildState.pickaxeActive) {
      const ghost = buildGhostStore.getState()
      if (ghost.visible) buildState.placeBlock(ghost.x, ghost.z)
      return
    }

    const craftState = useCraftStore.getState()
    const { movingId, movingOriginalY } = craftState
    if (!movingId || movingOriginalY === null) {
      // Клик мимо всех объектов, пока ничего не двигают - в режиме
      // "Курсор" это снимает текущий "липкий" выбор объекта в
      // ObjectToolbar.tsx (см. craftStore.ts) - иначе панель внизу экрана
      // не имела бы способа закрыться, кроме наведения на другой объект.
      if (craftState.hoveredId) craftState.setHoveredId(null)
      return
    }
    const ghost = craftGhostStore.getState()
    if (!ghost.visible) return
    craftState.place(movingId, [ghost.x, movingOriginalY, ghost.z])
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1000 }}>
      {/* Тени (shadow map + рендер каждого объекта в него ещё раз)
          отключены при reduced (мало ядер CPU ИЛИ живой fps в игре
          просел — см. utils/gamePerfStore.ts + AdaptivePerformance)
          — одна из самых дорогих фич рендера, а тут всего одна DesertSun
          с castShadow, так что без теней мир не станет менее читаемым. */}
      <Canvas
        key={canvasKey}
        camera={{ fov: 60, near: 0.1, far: CAMERA_FAR }}
        // reduced (живой fps действительно проседает, AdaptivePerformance)
        // всегда переопределяет ручной выбор качества вниз до минимума -
        // это подстраховка от реального зависания, а не человеческий
        // выбор; пока живой fps в порядке, разрешение берётся из
        // graphicsQualityStore (кнопка-шестерёнка, дефолт "высокое" для
        // всех устройств - см. подробности в gamePerfStore.ts про то,
        // почему у игры СВОЙ отдельный стор, а не общий с лендингом).
        dpr={reduced ? 1 : DPR_BY_QUALITY[quality]}
        shadows={quality !== 'low' && !reduced}
        onPointerMissed={handleCanvasPointerMissed}
        onCreated={({ gl }) => {
          gl.domElement.addEventListener('webglcontextlost', (event) => {
            // preventDefault() обязателен, иначе браузер даже не пытается
            // восстановить контекст - без него канвас гарантированно
            // остаётся мёртвым навсегда.
            event.preventDefault()
            recoveryAttemptsRef.current += 1
            console.error(
              '[GameMode] WebGL context lost, попытка восстановления',
              recoveryAttemptsRef.current,
            )
            if (recoveryAttemptsRef.current > MAX_CONTEXT_RECOVERY_ATTEMPTS) {
              // Несколько потерь подряд - устройство явно не тянет сцену
              // целиком (нехватка GPU-памяти не пропадёт от ещё одной
              // попытки). Чище выйти в меню, чем зациклиться на пересоздании.
              setGameActive(false)
              return
            }
            // НЕ ждём пассивно webglcontextrestored: даже когда браузер сам
            // "восстанавливает" контекст, все текстуры/буферы Three.js всё
            // равно безвозвратно потеряны - рисование ими на следующем
            // кадре само кидает ошибку (то самое "зависает и выкидывает с
            // ошибкой"). Полный ремонт Canvas (key ниже) надёжнее - React
            // размонтирует старый канвас и создаёт новый с нуля, свежий
            // WebGL-контекст, Three.js/Rapier поднимаются заново, а сами
            // .glb берутся из кэша браузера, не перекачиваются заново.
            window.setTimeout(() => setCanvasKey((k) => k + 1), 300)
          })
        }}
      >
        <AdaptivePerformance setReduced={setReduced} />
        <color attach="background" args={['#0a1120']} />
        {/* far - см. worldConstants.ts (FOG_FAR), увеличен вместе с
            площадкой (WORLD_HALF_EXTENT) — далёкие объекты карты должны
            быть видны, а не тонуть в тумане раньше времени. */}
        <fog attach="fog" args={['#0a1120', 20, FOG_FAR]} />
        <Suspense
          fallback={
            <Html center>
              <GameLoadingScreen />
            </Html>
          }
        >
          {/* gravity=[0,0,0]: обычная гравитация теперь приходит из
              кастомного гравитационного поля Ecctrl (PlayerCharacter.tsx,
              enableCustomGravity) вместо глобальной настройки физики -
              единственный способ обнулять её точечно для God Mode, не
              трогая остальной мир. Безопасно: единственное динамическое
              тело в игре — сам персонаж, все остальные RigidBody в игре
              (земля, постройки, платформа) — type="fixed" и от гравитации
              не зависят никак. */}
          <Physics gravity={[0, 0, 0]}>
            <KeyboardControls map={KEYBOARD_MAP}>
              <PlayerCharacter ecctrlRef={ecctrlRef} />
              <CarEntryTrigger id="car1" ecctrlRef={ecctrlRef} />
              <CarEntryTrigger id="car2" ecctrlRef={ecctrlRef} />
              <DrivingCar />
            </KeyboardControls>
            <GameWorld />
            <Bonuses ecctrlRef={ecctrlRef} />
            <QuestNpc />
            <QuestItem ecctrlRef={ecctrlRef} />
            <QuestObjectiveRocket ecctrlRef={ecctrlRef} />
            <QuestObjectiveChip ecctrlRef={ecctrlRef} />
            <Portal ecctrlRef={ecctrlRef} position={DESERT_PORTAL_POSITION} target={SPACE_TELEPORT_TARGET} />
            <Portal
              ecctrlRef={ecctrlRef}
              position={SPACE_RETURN_PORTAL_POSITION}
              target={DESERT_RETURN_TARGET}
              glowColor="#ffd76a"
            />
            <SpaceZone />
            {/* Монтируем ТОЛЬКО когда реально нужно (по отзыву клиента
                "выкидывает из игры через 5 секунд" на мобильном после
                добавления кирки) - PlacedBlocks грузит через useGLTF
                отдельную ~2 МБ модель лестницы с текстурой; раньше это
                происходило безусловно при КАЖДОМ входе в игру, даже если
                никто ни разу не открывал кирку - лишняя нагрузка на и так
                ограниченную VRAM слабых телефонов. */}
            {(pickaxeActive || hasPlacedBlocks) && <PlacedBlocks />}
          </Physics>
        </Suspense>
        <GameCamera ecctrlRef={ecctrlRef} />
        <GameDebugTracker />
        <MinimapTracker ecctrlRef={ecctrlRef} />
        {/* Перемещение объектов (Grabbable.tsx) - бросает луч из курсора
            на землю каждый кадр, пока что-то "в руках" (craftStore.ts).
            Сама модель следует за этой точкой в реальном времени - см.
            подробности в Grabbable.tsx, отдельный превью-объект не нужен. */}
        <CraftModeController />
      </Canvas>

      {/* Пока не догрузились все модели/физика - показываем ТУ ЖЕ красивую
          шкалу загрузки, что и Suspense внутри Canvas (см. useProgress
          выше), а не сразу боевой HUD с джойстиком. Кнопка "Выход" ниже
          остаётся доступна даже сейчас - чтобы не запереть человека на
          экране загрузки, если что-то зависнет в сети. */}
      {!isLoaded && <GameLoadingScreen />}

      {isLoaded && (
        <>
          <div
            style={{
              position: 'absolute',
              top: `calc(${edgeInset} + env(safe-area-inset-top))`,
              left: `calc(${edgeInset} + env(safe-area-inset-left))`,
              padding: btnPadding,
              minHeight: btnMinHeight,
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              background: 'rgba(10, 17, 32, 0.6)',
              border: '1px solid rgba(255, 215, 106, 0.6)',
              borderRadius: '999px',
              color: '#ffe9b0',
              fontFamily: "'Orbitron', sans-serif",
              fontSize: btnFontSize,
              zIndex: 1001,
            }}
          >
            <span aria-hidden="true">✦</span>
            {score}
          </div>

          <button
            onClick={() => setLogOpen(!isLogOpen)}
            style={{
              position: 'absolute',
              top: `calc(${edgeInset} + env(safe-area-inset-top))`,
              left: `calc(${edgeInset} + ${btnGap} + env(safe-area-inset-left))`,
              padding: btnPadding,
              minHeight: btnMinHeight,
              background: 'rgba(10, 17, 32, 0.6)',
              border: '1px solid rgba(255, 215, 106, 0.6)',
              borderRadius: '999px',
              color: '#ffe9b0',
              fontFamily: "'Orbitron', sans-serif",
              fontSize: btnFontSize,
              cursor: 'pointer',
              touchAction: 'manipulation',
              zIndex: 1001,
            }}
          >
            Квесты
          </button>

          <button
            onClick={toggleGodMode}
            style={{
              position: 'absolute',
              top: `calc(${edgeInset} + env(safe-area-inset-top))`,
              right: `calc(${edgeInset} + ${btnGapRight} + env(safe-area-inset-right))`,
              padding: btnPadding,
              minHeight: btnMinHeight,
              background: godModeActive ? 'rgba(147, 92, 255, 0.85)' : 'rgba(10, 17, 32, 0.6)',
              border: '1px solid rgba(147, 92, 255, 0.8)',
              borderRadius: '999px',
              color: godModeActive ? '#0c0518' : '#d7c3ff',
              fontFamily: "'Orbitron', sans-serif",
              fontSize: btnFontSize,
              fontWeight: godModeActive ? 700 : 400,
              cursor: 'pointer',
              touchAction: 'manipulation',
              zIndex: 1001,
            }}
          >
            God Mode
          </button>

          {/* Шестерёнка настроек графики - по центру сверху: единственное
              свободное место в верхнем ряду (слева Счёт+Квесты, справа
              God Mode+Выход - см. их calc() офсеты выше, трогать которые
              ради ещё одной кнопки было бы лишним риском). */}
          <GraphicsSettingsButton
            style={{
              top: `calc(${edgeInset} + env(safe-area-inset-top))`,
              left: '50%',
              transform: 'translateX(-50%)',
            }}
          />
        </>
      )}

      <button
        onClick={() => setGameActive(false)}
        style={{
          position: 'absolute',
          top: `calc(${edgeInset} + env(safe-area-inset-top))`,
          right: `calc(${edgeInset} + env(safe-area-inset-right))`,
          padding: btnPadding,
          minHeight: btnMinHeight,
          background: 'rgba(10, 17, 32, 0.6)',
          border: '1px solid rgba(95, 212, 255, 0.6)',
          borderRadius: '999px',
          color: '#eafcff',
          fontFamily: "'Orbitron', sans-serif",
          fontSize: btnFontSize,
          cursor: 'pointer',
          touchAction: 'manipulation',
          zIndex: 1001,
        }}
      >
        Выход
      </button>

      {/* Тач-управление ходьбой - настоящий аналоговый джойстик, а не
          свайп по всему экрану: по отзыву клиента "ходит только влево/
          вправо/вперёд, куда тыкнул туда и пошёл" - прежний свайп
          определял только ОДНО доминирующее направление на весь жест.
          Джойстик отдаёт непрерывный x/y (см. PlayerCharacter.tsx,
          movement.joystick) - можно вести пальцем в любую сторону.
          DynamicJoystick (свой компонент, не ecctrl/input Joystick) -
          по отзыву клиента "джойстик статичен в одном месте, пусть
          появляется там, где коснулся" - см. подробности выбора подхода
          в самом DynamicJoystick.tsx. Зона касания - весь левый низ
          экрана (под кнопками сверху), не только маленький кружок в углу.
          Скрыт за рулём - там своя зона (см. ниже). Круглая кнопка прыжка
          убрана целиком по более раннему отзыву клиента - прыжок по
          Space остаётся доступен на десктопе, не требуется ни для одного
          квеста, так что на мобильном это не блокирует прохождение. */}
      {isLoaded && isTouch && !drivingId && !needsRotate && !moveModeEnabled && (
        <DynamicJoystick
          id="move"
          zoneStyle={{ left: 0, top: '18%', width: '58%', height: '68%', zIndex: 1000 }}
        />
      )}
      {/* Управление машиной на телефоне - тоже джойстик, по просьбе
          клиента: вверх/вниз - газ/торможение и задний ход, влево/вправо
          - руль, плавно пропорционально наклону стика (см. CarDriving.tsx). */}
      {isLoaded && isTouch && drivingId && !needsRotate && !moveModeEnabled && (
        <DynamicJoystick
          id="drive"
          zoneStyle={{ left: 0, top: '18%', width: '58%', height: '68%', zIndex: 1000 }}
        />
      )}
      {/* Кнопка "Вниз" - только в God Mode (в обычном режиме спуска нет и
          клавиша Ctrl/C тоже ничего не делает, см. PlayerCharacter.tsx),
          и только на тач-устройстве - той же причине, что и джойстик выше
          (isMobile проверяет ШИРИНУ окна, а не тип указателя - в landscape
          телефон обычно шире 640px, кнопка пропала бы именно тогда, когда
          нужна). */}
      {isLoaded && isTouch && godModeActive && !needsRotate && (
        <VirtualButton
          id="descend"
          label="Вниз"
          buttonWrapperStyle={{
            bottom: `calc(${edgeInset} + env(safe-area-inset-bottom))`,
            right: `calc(${edgeInset} + ${minimapClearance} + 76px + env(safe-area-inset-right))`,
            left: 'auto',
            zIndex: 1001,
            top: 'auto',
          }}
        />
      )}

      {/* "Профиль" (Дополнение 4) - заменила кнопку "Кирка" в этом месте
          HUD по просьбе клиента. Открывает ProfilePanel.tsx: вращаемое
          3D-превью персонажа, смена модели. Рядом - "Скиллы" (та же
          анимация, что и в профиле, но на живом персонаже прямо на
          карте), "Приблизить" (камера ближе к лицу, см.
          cameraZoomStore.ts/GameCamera.tsx) и "Курсор" (персонаж стоит
          на месте, можно спокойно двигать/масштабировать объекты карты -
          см. подробный комментарий в PlayerCharacter.tsx). flexWrap - на
          узких мобильных экранах 4 кнопки подряд не помещаются в одну
          строку, переносятся на вторую, а не обрезаются краем экрана. */}
      {isLoaded && (
        <div
          style={{
            position: 'absolute',
            bottom: `calc(${edgeInset} + env(safe-area-inset-bottom))`,
            left: `calc(${edgeInset} + env(safe-area-inset-left))`,
            display: 'flex',
            flexWrap: 'wrap',
            gap: '0.5rem',
            maxWidth: 'calc(100vw - 2 * ' + edgeInset + ')',
            zIndex: 1001,
          }}
        >
          <button
            onClick={() => setProfileOpen(true)}
            style={{
              padding: btnPadding,
              minHeight: btnMinHeight,
              background: 'rgba(10, 17, 32, 0.6)',
              border: '1px solid rgba(255, 215, 106, 0.6)',
              borderRadius: '999px',
              color: '#ffe9b0',
              fontFamily: "'Orbitron', sans-serif",
              fontSize: btnFontSize,
              cursor: 'pointer',
              touchAction: 'manipulation',
            }}
          >
            👤 Профиль
          </button>
          <SkillsButton style={{ position: 'relative' }} />
          <button
            onClick={() => setMoveModeEnabled(!moveModeEnabled)}
            style={{
              padding: btnPadding,
              minHeight: btnMinHeight,
              background: moveModeEnabled ? 'rgba(95, 212, 255, 0.85)' : 'rgba(10, 17, 32, 0.6)',
              border: '1px solid rgba(95, 212, 255, 0.7)',
              borderRadius: '999px',
              color: moveModeEnabled ? '#04121c' : '#5fd4ff',
              fontFamily: "'Orbitron', sans-serif",
              fontSize: btnFontSize,
              fontWeight: moveModeEnabled ? 700 : 400,
              cursor: 'pointer',
              touchAction: 'manipulation',
            }}
          >
            🖱️ Курсор
          </button>
          {/* Зум-бар (Дополнение 6) - раньше была кнопка вкл/выкл, по
              отзыву клиента "приближает быстро очень и слишком сверху" -
              заменена на слайдер в процентах, пользователь сам ведёт
              значение вместо мгновенного скачка (см. cameraZoomStore.ts/
              GameCamera.tsx). */}
          <div
            style={{
              padding: btnPadding,
              minHeight: btnMinHeight,
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              background: cameraZoomLevel > 0 ? 'rgba(147, 92, 255, 0.35)' : 'rgba(10, 17, 32, 0.6)',
              border: '1px solid rgba(147, 92, 255, 0.7)',
              borderRadius: '999px',
              color: '#d7c3ff',
              fontFamily: "'Orbitron', sans-serif",
              fontSize: btnFontSize,
            }}
          >
            <span aria-hidden="true">🔍</span>
            <input
              type="range"
              min={0}
              max={100}
              step={5}
              value={Math.round(cameraZoomLevel * 100)}
              onChange={(e) => setCameraZoomLevel(Number(e.currentTarget.value) / 100)}
              style={{ accentColor: '#935cff', cursor: 'pointer', width: isMobile ? '70px' : '96px' }}
            />
            <span style={{ minWidth: '2.6rem', textAlign: 'center' }}>{Math.round(cameraZoomLevel * 100)}%</span>
          </div>
        </div>
      )}

      {/* Сесть/выйти из машины - ENTER на клавиатуре уже работает
          (KEYBOARD_MAP выше), но на телефоне физической клавиатуры нет,
          поэтому нужен видимый триггер того же действия. Показывается
          только когда есть что сделать - рядом с машиной или уже за рулём. */}
      {/* По отзыву клиента "огромное окно выйти - сделать маленькую кнопку,
          не надписи огромные" - своя, заметно более компактная разметка
          вместо переиспользования btnPadding/btnMinHeight/btnFontSize
          верхнего HUD-ряда. "(ENTER)" убран на тач-устройствах - подсказка
          про клавишу бессмысленна там, где физической клавиатуры нет. */}
      {isLoaded && (nearCarId || drivingId) && (
        <button
          onClick={() => performCarInteraction((drivingId ?? nearCarId)!, ecctrlRef)}
          style={{
            position: 'absolute',
            bottom: `calc(${edgeInset} + 5rem + env(safe-area-inset-bottom))`,
            left: '50%',
            transform: 'translateX(-50%)',
            padding: '0.3rem 0.8rem',
            minHeight: '1.7rem',
            background: 'rgba(95, 212, 255, 0.85)',
            border: '1px solid #eafcff',
            borderRadius: '999px',
            color: '#04121c',
            fontFamily: "'Orbitron', sans-serif",
            fontWeight: 700,
            fontSize: '0.7rem',
            cursor: 'pointer',
            touchAction: 'manipulation',
            zIndex: 1001,
          }}
        >
          {drivingId ? (isTouch ? 'Выйти' : 'Выйти (ENTER)') : isTouch ? 'Сесть' : 'Сесть (ENTER)'}
        </button>
      )}

      {isLoaded && (
        <>
          {/* Отладочный HUD — по просьбе клиента, пока игра не отполирована
              до конца. Убрать (или спрятать за флагом), когда перестанет
              быть нужен. */}
          <GameDebugHUD />
          <Minimap />

          <QuestLog />
          <QuestDialogue />
          <TeleportEffect />
          <ProfilePanel />
          <ObjectToolbar />
        </>
      )}

      {/* Поверх всего остального - блокирует и джойстики, и HUD, пока
          телефон в портретной ориентации (см. комментарий у needsRotate
          выше). Живая проверка (useIsPortrait), а не разовая при входе -
          если повернуть телефон обратно посреди игры, экран вернётся. */}
      {needsRotate && <RotateDevicePrompt />}
    </div>
  )
}
