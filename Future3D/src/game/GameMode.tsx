import { Suspense, useRef } from 'react'
import { Canvas } from '@react-three/fiber'
import { KeyboardControls, Html } from '@react-three/drei'
import { Physics } from '@react-three/rapier'
import { type EcctrlHandle } from 'ecctrl'
import { Joystick, VirtualButton } from 'ecctrl/input'
import * as THREE from 'three'
import { useGameStore } from '@/utils/gameStore'
import { usePerfStore } from '@/utils/perfStore'
import { useGodModeStore } from '@/utils/godModeStore'
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
import { Minimap, MinimapTracker } from './Minimap'
import { SpaceZone, SPACE_TELEPORT_TARGET, SPACE_RETURN_PORTAL_POSITION } from './SpaceZone'
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
        onClick={toggleGodMode}
        style={{
          position: 'absolute',
          top: 'calc(1.5rem + env(safe-area-inset-top))',
          right: 'calc(1.5rem + 8rem + env(safe-area-inset-right))',
          padding: '0.6rem 1.4rem',
          minHeight: '2.75rem',
          background: godModeActive ? 'rgba(147, 92, 255, 0.85)' : 'rgba(10, 17, 32, 0.6)',
          border: '1px solid rgba(147, 92, 255, 0.8)',
          borderRadius: '999px',
          color: godModeActive ? '#0c0518' : '#d7c3ff',
          fontFamily: "'Orbitron', sans-serif",
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
      <Minimap />

      <QuestLog />
      <QuestDialogue />
      <TeleportEffect />
    </div>
  )
}
