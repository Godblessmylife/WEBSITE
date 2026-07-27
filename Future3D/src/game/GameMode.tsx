import { Suspense, useRef } from 'react'
import { Canvas } from '@react-three/fiber'
import { KeyboardControls, Html } from '@react-three/drei'
import { Physics } from '@react-three/rapier'
import { type EcctrlHandle } from 'ecctrl'
import { VirtualButton } from 'ecctrl/input'
import * as THREE from 'three'
import { useGameStore } from '@/utils/gameStore'
import { usePerfStore } from '@/utils/perfStore'
import { useGodModeStore } from '@/utils/godModeStore'
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
          пальцем в конкретную область экрана. Кнопка прыжка - по-прежнему
          из ecctrl/input (useButtonStore), читается в PlayerCharacter.tsx
          так же вручную, как раньше джойстик. В God Mode та же кнопка
          работает как "вверх" (подъём при полёте, см. PlayerCharacter.tsx)
          - подпись меняется, чтобы не вводить в заблуждение. Явные
          buttonWrapperStyle вместо дефолтной позиции ecctrl/input (fixed
          без отступов, z-index:10) нужны по двум причинам, обе найдены
          автоматизированной проверкой скриншотом: (1) без сдвига кнопка
          пряталась бы ПОД мини-картой (та же нижняя-правая область, но у
          карты z-index:1001); (2) z-index:10 у дефолтного стиля кнопки
          НИЖЕ, чем у SwipeControls (z-index:999, весь экран, inset:0) -
          то есть полноэкранный слой свайпа перехватывал ЛЮБОЙ тап в
          области кнопки ДО того, как он доходил до самой кнопки (эта
          часть бага была не только в God Mode - кнопка "Прыжок" так же
          не реагировала на тач и в обычном режиме, просто раньше это не
          проверялось отдельно от свайпа). zIndex:1001 поднимает кнопку
          выше слоя свайпа. */}
      <SwipeControls />
      <VirtualButton
        id="jump"
        label={godModeActive ? 'Вверх' : 'Прыжок'}
        buttonWrapperStyle={{
          bottom: `calc(${edgeInset} + env(safe-area-inset-bottom))`,
          right: `calc(${edgeInset} + ${minimapClearance} + env(safe-area-inset-right))`,
          left: 'auto',
          top: 'auto',
          zIndex: 1001,
        }}
      />
      {/* Кнопка "Вниз" - только в God Mode (в обычном режиме спуска нет и
          клавиша Ctrl/C тоже ничего не делает, см. PlayerCharacter.tsx). */}
      {godModeActive && (
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
