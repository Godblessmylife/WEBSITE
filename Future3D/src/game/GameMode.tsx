import { Suspense, useRef } from 'react'
import { Canvas } from '@react-three/fiber'
import { KeyboardControls, Html } from '@react-three/drei'
import { Physics } from '@react-three/rapier'
import { type EcctrlHandle } from 'ecctrl'
import { Joystick, VirtualButton } from 'ecctrl/input'
import { useGameStore } from '@/utils/gameStore'
import { usePerfStore } from '@/utils/perfStore'
import { AdaptivePerformance } from '@/utils/AdaptivePerformance'
import { GameWorld } from './GameWorld'
import { PlayerCharacter } from './PlayerCharacter'
import { GameCamera } from './GameCamera'
import { Portal } from './Portal'
import { Bonuses } from './Bonuses'
import { QuestNpc } from './QuestNpc'
import { QuestItem } from './QuestItem'
import { QuestDialogue, QuestLog } from './QuestUI'
import { useQuestStore } from '@/utils/questStore'
import { GameDebugTracker, GameDebugHUD } from './GameDebugHUD'
import { GameLoadingScreen } from './GameLoadingScreen'

const KEYBOARD_MAP = [
  { name: 'forward', keys: ['ArrowUp', 'KeyW'] },
  { name: 'backward', keys: ['ArrowDown', 'KeyS'] },
  { name: 'leftward', keys: ['ArrowLeft', 'KeyA'] },
  { name: 'rightward', keys: ['ArrowRight', 'KeyD'] },
  { name: 'jump', keys: ['Space'] },
  { name: 'run', keys: ['ShiftLeft', 'ShiftRight'] },
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
          <Physics>
            <KeyboardControls map={KEYBOARD_MAP}>
              <PlayerCharacter ecctrlRef={ecctrlRef} />
            </KeyboardControls>
            <GameWorld />
            <Bonuses ecctrlRef={ecctrlRef} />
            <QuestNpc />
            <QuestItem ecctrlRef={ecctrlRef} />
            <Portal ecctrlRef={ecctrlRef} onEnter={() => setGameActive(false)} />
          </Physics>
        </Suspense>
        <GameCamera ecctrlRef={ecctrlRef} />
        <GameDebugTracker ecctrlRef={ecctrlRef} />
      </Canvas>

      <div
        style={{
          position: 'absolute',
          top: 'calc(1.5rem + env(safe-area-inset-top))',
          left: 'calc(1.5rem + env(safe-area-inset-left))',
          padding: '0.6rem 1.4rem',
          minHeight: '2.75rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          background: 'rgba(10, 17, 32, 0.6)',
          border: '1px solid rgba(255, 215, 106, 0.6)',
          borderRadius: '999px',
          color: '#ffe9b0',
          fontFamily: "'Orbitron', sans-serif",
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
          top: 'calc(1.5rem + env(safe-area-inset-top))',
          left: 'calc(1.5rem + 9rem + env(safe-area-inset-left))',
          padding: '0.6rem 1.4rem',
          minHeight: '2.75rem',
          background: 'rgba(10, 17, 32, 0.6)',
          border: '1px solid rgba(255, 215, 106, 0.6)',
          borderRadius: '999px',
          color: '#ffe9b0',
          fontFamily: "'Orbitron', sans-serif",
          cursor: 'pointer',
          touchAction: 'manipulation',
          zIndex: 1001,
        }}
      >
        Квесты
      </button>

      <button
        onClick={() => setGameActive(false)}
        style={{
          position: 'absolute',
          top: 'calc(1.5rem + env(safe-area-inset-top))',
          right: 'calc(1.5rem + env(safe-area-inset-right))',
          padding: '0.6rem 1.4rem',
          minHeight: '2.75rem',
          background: 'rgba(10, 17, 32, 0.6)',
          border: '1px solid rgba(95, 212, 255, 0.6)',
          borderRadius: '999px',
          color: '#eafcff',
          fontFamily: "'Orbitron', sans-serif",
          cursor: 'pointer',
          touchAction: 'manipulation',
          zIndex: 1001,
        }}
      >
        Выход
      </button>

      {/* Тач-управление: DOM-оверлей, пишет в useJoystickStore/
          useButtonStore (ecctrl/input). ВАЖНО: сам Ecctrl эти сторы не
          читает — раньше здесь было утверждение, что читает, и клавиатура
          была настроена ровно так же ошибочно (через drei
          KeyboardControls, которую Ecctrl тоже не слушает сам). И то,
          и другое приходится опрашивать вручную и передавать через
          handle.setMovement() — см. PlayerCharacter.tsx. */}
      <Joystick />
      <VirtualButton id="jump" label="Прыжок" />

      {/* Отладочный HUD — по просьбе клиента, пока игра не отполирована
          до конца. Убрать (или спрятать за флагом), когда перестанет
          быть нужен. */}
      <GameDebugHUD />

      <QuestLog />
      <QuestDialogue />
    </div>
  )
}
