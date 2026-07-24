import { Suspense, useRef } from 'react'
import { Canvas } from '@react-three/fiber'
import { KeyboardControls, Html } from '@react-three/drei'
import { Physics } from '@react-three/rapier'
import { type EcctrlHandle } from 'ecctrl'
import { Joystick, VirtualButton } from 'ecctrl/input'
import { useGameStore } from '@/utils/gameStore'
import { useIsTouchDevice } from '@/utils/useIsTouchDevice'
import { GameWorld } from './GameWorld'
import { PlayerCharacter } from './PlayerCharacter'
import { GameCamera } from './GameCamera'
import { Portal } from './Portal'
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
  const ecctrlRef = useRef<EcctrlHandle>(null!)
  const isTouch = useIsTouchDevice()

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1000 }}>
      {/* Тени (shadow map + рендер каждого объекта в него ещё раз)
          отключены на тач-устройствах — на телефоне это одна из самых
          дорогих фич рендера, а тут всего одна DesertSun с castShadow,
          так что без них мир не станет менее читаемым. */}
      <Canvas
        camera={{ fov: 60, near: 0.1, far: 300 }}
        dpr={isTouch ? [1, 1.5] : [1, 2]}
        shadows={!isTouch}
      >
        <color attach="background" args={['#0a1120']} />
        <fog attach="fog" args={['#0a1120', 20, 70]} />
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
            <Portal ecctrlRef={ecctrlRef} onEnter={() => setGameActive(false)} />
          </Physics>
        </Suspense>
        <GameCamera ecctrlRef={ecctrlRef} />
      </Canvas>

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

      {/* Тач-управление: DOM-оверлей от ecctrl, сам пишет в общий стор
          движения — Ecctrl слушает его наравне с клавиатурой, отдельно
          прокидывать джойстик в контроллер не нужно. На десктопе не
          мешает (в углу экрана, WASD работает как обычно). */}
      <Joystick />
      <VirtualButton id="jump" label="Прыжок" />
    </div>
  )
}
