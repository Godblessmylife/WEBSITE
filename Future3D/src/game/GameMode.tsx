import { Suspense, useRef, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { KeyboardControls, Html } from '@react-three/drei'
import { Physics } from '@react-three/rapier'
import { type EcctrlHandle } from 'ecctrl'
import { VirtualButton } from 'ecctrl/input'
import * as THREE from 'three'
import { useGameStore } from '@/utils/gameStore'
import { usePerfStore } from '@/utils/perfStore'
import { useGodModeStore } from '@/utils/godModeStore'
import { useCraftStore, craftGhostStore } from '@/utils/craftStore'
import { CraftModeController } from './CraftModeController'
import { CraftGhost } from './CraftGhost'
import { useIsMobileViewport } from '@/utils/useIsMobileViewport'
import { AdaptivePerformance } from '@/utils/AdaptivePerformance'
import { GameWorld } from './GameWorld'
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
import { SwipeControls } from './SwipeControls'
import { TeleportEffect } from './TeleportEffect'
import { GameLoadingScreen } from './GameLoadingScreen'
import { CarEntryTrigger, DrivingCar, performCarInteraction } from './CarDriving'
import { useDriveStore } from '@/utils/driveStore'

const DESERT_PORTAL_POSITION = new THREE.Vector3(10, 0, -10)
// Совпадает со стартовой позицией персонажа в PlayerCharacter.tsx
// (Ecctrl position=[0,2,0]) - проверенное безопасное место, далеко
// (14 юнитов) от DESERT_PORTAL_POSITION, чтобы посадка не задевала
// радиус срабатывания портала туда.
const DESERT_RETURN_TARGET = new THREE.Vector3(0, 2, 0)

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
  const reduced = usePerfStore((s) => s.reduced)
  const setLogOpen = useQuestStore((s) => s.setLogOpen)
  const isLogOpen = useQuestStore((s) => s.isLogOpen)
  const godModeActive = useGodModeStore((s) => s.active)
  const toggleGodMode = useGodModeStore((s) => s.toggle)
  const craftActive = useCraftStore((s) => s.active)
  const toggleCraft = useCraftStore((s) => s.toggle)
  const craftOverrides = useCraftStore((s) => s.overrides)
  const resetCraft = useCraftStore((s) => s.resetAll)
  const [exportStatus, setExportStatus] = useState<'idle' | 'copied' | 'error'>('idle')
  const drivingId = useDriveStore((s) => s.drivingId)
  const nearCarId = useDriveStore((s) => s.nearCarId)
  const isMobile = useIsMobileViewport()

  // Сайт статический - нет сервера, чтобы "сохранить на карте" для ВСЕХ
  // посетителей прямо из браузера (см. подробности в craftStore.ts).
  // Эта кнопка копирует текущую расстановку готовым для вставки кодом -
  // результат нужно прислать разработчику, чтобы перенести в MapProps.tsx
  // и выложить обновлённую сборку.
  const exportPositions = async () => {
    const lines = Object.entries(craftOverrides).map(
      ([id, pos]) => `  ${id}: [${pos.map((n) => Math.round(n * 100) / 100).join(', ')}]`,
    )
    const text = lines.length > 0 ? `{\n${lines.join(',\n')}\n}` : '{} (ничего не переставлено)'
    try {
      await navigator.clipboard.writeText(text)
      setExportStatus('copied')
    } catch {
      setExportStatus('error')
    }
    setTimeout(() => setExportStatus('idle'), 2500)
  }

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

  // Ставит объект, "взятый в руки" в режиме CRAFT, при клике КУДА УГОДНО
  // мимо других интерактивных объектов - по жалобе клиента "жму на
  // объект, ничего не происходит": хитбокс объекта (Grabbable.tsx) во
  // время переноса стоит на его СТАРОМ месте (сама модель спрятана,
  // видна только полупрозрачная "тень"-призрак на новом месте, см.
  // CraftGhost.tsx) - клик по НОВОМУ месту (где призрак) раньше никуда
  // не попадал и просто ничего не делал. onPointerMissed у R3F
  // срабатывает именно тогда, когда клик не задел ни один интерактивный
  // объект сцены (земля/декорации без onClick это не объекты-цели) -
  // ставим объект туда, где сейчас стоит призрак.
  const handleCanvasPointerMissed = () => {
    const { heldId, heldOriginalY } = useCraftStore.getState()
    if (!heldId || heldOriginalY === null) return
    const ghost = craftGhostStore.getState()
    if (!ghost.visible) return
    useCraftStore.getState().place(heldId, [ghost.x, heldOriginalY, ghost.z])
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1000 }}>
      {/* Тени (shadow map + рендер каждого объекта в него ещё раз)
          отключены при reduced (тач-устройство/мало ядер CPU ИЛИ живой
          fps в игре просел — см. utils/perfStore.ts + AdaptivePerformance)
          — одна из самых дорогих фич рендера, а тут всего одна DesertSun
          с castShadow, так что без теней мир не станет менее читаемым. */}
      <Canvas
        camera={{ fov: 60, near: 0.1, far: 300 }}
        dpr={reduced ? [1, 1.5] : [1, 2]}
        shadows={!reduced}
        onPointerMissed={handleCanvasPointerMissed}
      >
        <AdaptivePerformance />
        <color attach="background" args={['#0a1120']} />
        {/* far поднят с 70 до 170 вместе с увеличением площадки
            (GameWorld: 140->280) — гора (MapProps: Mountain, ~90-130
            юнитов от центра) должна быть видна, а не тонуть в тумане. */}
        <fog attach="fog" args={['#0a1120', 20, 170]} />
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
          </Physics>
        </Suspense>
        <GameCamera ecctrlRef={ecctrlRef} />
        <GameDebugTracker ecctrlRef={ecctrlRef} />
        <MinimapTracker ecctrlRef={ecctrlRef} />
        {/* Режим разработчика (кнопка CRAFT ниже) - контроллер бросает
            луч из курсора на землю каждый кадр (craftStore.ts), призрак -
            полупрозрачный превью места установки, пока что-то в руках. */}
        <CraftModeController />
        <CraftGhost />
      </Canvas>

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

      {/* "Режим разработчика" - как в Майнкрафте, объекты карты можно
          взять кликом и переставить (Grabbable.tsx/craftStore.ts). По
          центру верхней панели - единственное свободное место среди уже
          занятых углов (счёт/квесты слева, God Mode/Выход справа). */}
      <button
        onClick={toggleCraft}
        style={{
          position: 'absolute',
          top: `calc(${edgeInset} + env(safe-area-inset-top))`,
          left: '50%',
          transform: 'translateX(-50%)',
          padding: btnPadding,
          minHeight: btnMinHeight,
          background: craftActive ? 'rgba(95, 212, 255, 0.85)' : 'rgba(10, 17, 32, 0.6)',
          border: '1px solid rgba(95, 212, 255, 0.8)',
          borderRadius: '999px',
          color: craftActive ? '#04121c' : '#c8ecff',
          fontFamily: "'Orbitron', sans-serif",
          fontSize: btnFontSize,
          fontWeight: craftActive ? 700 : 400,
          cursor: 'pointer',
          touchAction: 'manipulation',
          zIndex: 1001,
        }}
      >
        CRAFT
      </button>
      {craftActive && (
        <div
          style={{
            position: 'absolute',
            top: `calc(${edgeInset} + ${btnMinHeight} + 0.6rem + env(safe-area-inset-top))`,
            left: '50%',
            transform: 'translateX(-50%)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '0.5rem',
            zIndex: 1001,
          }}
        >
          <div
            style={{
              padding: '0.4rem 0.9rem',
              background: 'rgba(10, 17, 32, 0.7)',
              border: '1px solid rgba(95, 212, 255, 0.4)',
              borderRadius: '999px',
              color: '#c8ecff',
              fontFamily: "'Orbitron', sans-serif",
              fontSize: '0.65rem',
              letterSpacing: '0.04em',
              whiteSpace: 'nowrap',
              pointerEvents: 'none',
            }}
          >
            Клик по объекту — взять, ещё клик — поставить
          </div>
          {/* Позиции переживают перезагрузку страницы (localStorage), но
              только в ЭТОМ браузере - "Экспорт" копирует их кодом,
              который нужно прислать разработчику, чтобы раскладка стала
              постоянной для всех посетителей сайта (см. craftStore.ts). */}
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              onClick={exportPositions}
              style={{
                padding: '0.4rem 0.9rem',
                background: 'rgba(10, 17, 32, 0.7)',
                border: '1px solid rgba(255, 215, 106, 0.6)',
                borderRadius: '999px',
                color: '#ffe9b0',
                fontFamily: "'Orbitron', sans-serif",
                fontSize: '0.65rem',
                cursor: 'pointer',
                touchAction: 'manipulation',
              }}
            >
              {exportStatus === 'copied' ? 'Скопировано!' : exportStatus === 'error' ? 'Не вышло скопировать' : 'Экспорт позиций'}
            </button>
            <button
              onClick={resetCraft}
              style={{
                padding: '0.4rem 0.9rem',
                background: 'rgba(10, 17, 32, 0.7)',
                border: '1px solid rgba(255, 138, 138, 0.5)',
                borderRadius: '999px',
                color: '#ffb3b3',
                fontFamily: "'Orbitron', sans-serif",
                fontSize: '0.65rem',
                cursor: 'pointer',
                touchAction: 'manipulation',
              }}
            >
              Сбросить всё
            </button>
          </div>
        </div>
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

      {/* Тач-управление: весь экран - направленный свайп (см.
          SwipeControls.tsx) вместо джойстика ecctrl/input - по просьбе
          клиента ("свайп вверх - вперёд" и т.д.), не требует попадать
          пальцем в конкретную область экрана. Круглая кнопка прыжка
          (ecctrl/input VirtualButton) убрана целиком по просьбе клиента
          ("убрать значок прыжка, круглый") - прыжок по Space остаётся
          доступен на десктопе через KEYBOARD_MAP как раньше; прыжок не
          требуется ни для одного квеста, так что на мобильном это не
          блокирует прохождение. */}
      <SwipeControls />
      {/* Кнопка "Вниз" - только в God Mode (в обычном режиме спуска нет и
          клавиша Ctrl/C тоже ничего не делает, см. PlayerCharacter.tsx),
          и только на мобильном - той же причине, что и "Прыжок" выше. */}
      {isMobile && godModeActive && (
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

      {/* Сесть/выйти из машины - ENTER на клавиатуре уже работает
          (KEYBOARD_MAP выше), но на телефоне физической клавиатуры нет,
          поэтому нужен видимый триггер того же действия. Показывается
          только когда есть что сделать - рядом с машиной или уже за рулём. */}
      {(nearCarId || drivingId) && (
        <button
          onClick={() => performCarInteraction((drivingId ?? nearCarId)!, ecctrlRef)}
          style={{
            position: 'absolute',
            bottom: `calc(${edgeInset} + 5rem + env(safe-area-inset-bottom))`,
            left: '50%',
            transform: 'translateX(-50%)',
            padding: btnPadding,
            minHeight: btnMinHeight,
            background: 'rgba(95, 212, 255, 0.85)',
            border: '1px solid #eafcff',
            borderRadius: '999px',
            color: '#04121c',
            fontFamily: "'Orbitron', sans-serif",
            fontWeight: 700,
            fontSize: btnFontSize,
            cursor: 'pointer',
            touchAction: 'manipulation',
            zIndex: 1001,
          }}
        >
          {drivingId ? 'Выйти (ENTER)' : 'Сесть (ENTER)'}
        </button>
      )}

      {/* Отладочный HUD — по просьбе клиента, пока игра не отполирована
          до конца. Убрать (или спрятать за флагом), когда перестанет
          быть нужен. */}
      <GameDebugHUD />
      <Minimap />

      <QuestLog />
      <QuestDialogue />
      <TeleportEffect />
    </div>
  )
}
