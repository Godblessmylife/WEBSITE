import { Suspense, useRef } from 'react'
import { Canvas } from '@react-three/fiber'
import { KeyboardControls } from '@react-three/drei'
import { Physics } from '@react-three/rapier'
import { type EcctrlHandle } from 'ecctrl'
import { useGameStore } from '@/utils/gameStore'
import { GameWorld } from './GameWorld'
import { PlayerCharacter } from './PlayerCharacter'
import { GameCamera } from './GameCamera'

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

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1000 }}>
      <Canvas camera={{ fov: 60, near: 0.1, far: 300 }} shadows>
        <color attach="background" args={['#0a1120']} />
        <fog attach="fog" args={['#0a1120', 20, 70]} />
        <Suspense fallback={null}>
          <Physics>
            <KeyboardControls map={KEYBOARD_MAP}>
              <PlayerCharacter ecctrlRef={ecctrlRef} />
            </KeyboardControls>
            <GameWorld />
          </Physics>
        </Suspense>
        <GameCamera ecctrlRef={ecctrlRef} />
      </Canvas>

      <button
        onClick={() => setGameActive(false)}
        style={{
          position: 'absolute',
          top: '1.5rem',
          right: '1.5rem',
          padding: '0.6rem 1.4rem',
          background: 'rgba(10, 17, 32, 0.6)',
          border: '1px solid rgba(95, 212, 255, 0.6)',
          borderRadius: '999px',
          color: '#eafcff',
          fontFamily: "'Orbitron', sans-serif",
          cursor: 'pointer',
          zIndex: 1001,
        }}
      >
        Выход
      </button>
    </div>
  )
}
