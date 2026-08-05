import { Suspense, useRef } from 'react'
import { Canvas } from '@react-three/fiber'
import { KeyboardControls, Html } from '@react-three/drei'
import { Physics } from '@react-three/rapier'
import { type EcctrlHandle } from 'ecctrl'
import { VirtualButton, Joystick } from 'ecctrl/input'
import * as THREE from 'three'
import { useGameStore } from '@/utils/gameStore'
import { usePerfStore } from '@/utils/perfStore'
import { useGodModeStore } from '@/utils/godModeStore'
import { useCraftStore, craftGhostStore } from '@/utils/craftStore'
import { vibrate } from '@/utils/haptics'
import { CraftModeController } from './CraftModeController'
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
  const drivingId = useDriveStore((s) => s.drivingId)
  const nearCarId = useDriveStore((s) => s.nearCarId)
  const isMobile = useIsMobileViewport()

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
    const { movingId, movingOriginalY } = useCraftStore.getState()
    if (!movingId || movingOriginalY === null) return
    const ghost = craftGhostStore.getState()
    if (!ghost.visible) return
    useCraftStore.getState().place(movingId, [ghost.x, movingOriginalY, ghost.z])
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
        {/* Перемещение объектов (Grabbable.tsx) - бросает луч из курсора
            на землю каждый кадр, пока что-то "в руках" (craftStore.ts).
            Сама модель следует за этой точкой в реальном времени - см.
            подробности в Grabbable.tsx, отдельный превью-объект не нужен. */}
        <CraftModeController />
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
        onClick={() => {
          vibrate()
          setLogOpen(!isLogOpen)
        }}
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
        onClick={() => {
          vibrate()
          toggleGodMode()
        }}
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

      <button
        onClick={() => {
          vibrate()
          setGameActive(false)
        }}
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

      {/* Тач-управление ходьбой - настоящий аналоговый джойстик
          (ecctrl/input), а не свайп по всему экрану: по отзыву клиента
          "ходит только влево/вправо/вперёд, куда тыкнул туда и пошёл" -
          прежний свайп (SwipeControls.tsx, удалён) определял только ОДНО
          доминирующее направление на весь жест, диагональ или "вперёд и
          чуть в сторону" были невозможны. Джойстик отдаёт непрерывный
          x/y (см. PlayerCharacter.tsx, movement.joystick) - можно вести
          пальцем в любую сторону, как и попросили. Скрыт за рулём -
          там своё, отдельное управление (см. ниже). Круглая кнопка
          прыжка убрана целиком по более раннему отзыву клиента - прыжок
          по Space остаётся доступен на десктопе, не требуется ни для
          одного квеста, так что на мобильном это не блокирует прохождение. */}
      {isMobile && !drivingId && (
        <Joystick
          id="move"
          joystickWrapperStyle={{
            bottom: `calc(1.5rem + env(safe-area-inset-bottom))`,
            left: `calc(1.5rem + env(safe-area-inset-left))`,
            top: 'auto',
            right: 'auto',
            zIndex: 1001,
          }}
          joystickBaseStyle={{ background: 'rgba(10, 17, 32, 0.55)', border: '2px solid rgba(95, 212, 255, 0.6)' }}
          joystickKnobStyle={{ background: 'rgba(95, 212, 255, 0.85)' }}
        />
      )}
      {/* Управление машиной на телефоне - раньше тоже было свайпом, по
          отзыву клиента "едет только вперёд, боком, свайпом управлять
          неудобно". Видимые кнопки вместо жеста: газ слева (можно
          удерживать одновременно с поворотом - двумя разными пальцами,
          чего свайп одним жестом никогда не позволял), поворот справа. */}
      {isMobile && drivingId && (
        <>
          <VirtualButton
            id="gas"
            label="Газ"
            buttonWrapperStyle={{
              bottom: `calc(1.5rem + env(safe-area-inset-bottom))`,
              left: `calc(1.5rem + env(safe-area-inset-left))`,
              top: 'auto',
              right: 'auto',
              zIndex: 1001,
              width: '84px',
              height: '84px',
            }}
          />
          <VirtualButton
            id="turnLeft"
            label="◀"
            buttonWrapperStyle={{
              bottom: `calc(1.5rem + env(safe-area-inset-bottom))`,
              right: `calc(1.5rem + 76px + env(safe-area-inset-right))`,
              left: 'auto',
              top: 'auto',
              zIndex: 1001,
            }}
          />
          <VirtualButton
            id="turnRight"
            label="▶"
            buttonWrapperStyle={{
              bottom: `calc(1.5rem + env(safe-area-inset-bottom))`,
              right: `calc(1.5rem + env(safe-area-inset-right))`,
              left: 'auto',
              top: 'auto',
              zIndex: 1001,
            }}
          />
        </>
      )}
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
          onClick={() => {
            vibrate()
            performCarInteraction((drivingId ?? nearCarId)!, ecctrlRef)
          }}
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
