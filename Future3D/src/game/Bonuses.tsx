import { useRef, useState } from 'react'
import type { RefObject } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import type { EcctrlHandle } from 'ecctrl'
import { useGameStore } from '@/utils/gameStore'

const COLLECT_DISTANCE = 1.4
const SCORE_PER_BONUS = 10

// Разбросаны по площадке (140x140), не пересекаясь с пальмами
// (PALM_POSITIONS в GameWorld.tsx) и порталом (10,0,-10).
const BONUS_POSITIONS: [number, number, number][] = [
  [6, 0.9, 6],
  [-6, 0.9, 5],
  [0, 0.9, -8],
  [9, 0.9, 2],
  [-9, 0.9, -6],
  [3, 0.9, 10],
  [-3, 0.9, 9],
  [6, 0.9, -6],
]

const bonusWorldPos = new THREE.Vector3()

function BonusOrb({ position }: { position: [number, number, number] }) {
  const groupRef = useRef<THREE.Group>(null!)
  const ringRef = useRef<THREE.Mesh>(null!)

  useFrame(({ clock }, delta) => {
    const t = clock.elapsedTime
    groupRef.current.position.y = position[1] + Math.sin(t * 2 + position[0]) * 0.15
    groupRef.current.rotation.y += delta * 1.2
    ringRef.current.rotation.x += delta * 2.4
  })

  return (
    <group ref={groupRef} position={position}>
      <mesh>
        <icosahedronGeometry args={[0.32, 0]} />
        <meshStandardMaterial
          color="#ffd76a"
          emissive="#ffb23f"
          emissiveIntensity={2}
          roughness={0.3}
          metalness={0.4}
        />
      </mesh>
      <mesh ref={ringRef}>
        <torusGeometry args={[0.5, 0.04, 8, 24]} />
        <meshBasicMaterial color="#ffe9b0" toneMapped={false} />
      </mesh>
      <pointLight color="#ffcf7a" intensity={2} distance={4} />
    </group>
  )
}

// Бонусы на площадке — простая причина бегать по всему миру, а не только
// до портала. Собранность хранится локальным state (не в общем сторе):
// GameMode целиком размонтируется при выходе из игры (isGameActive),
// так что при следующем заходе компонент создаётся заново и все бонусы
// автоматически на месте — отдельно сбрасывать нечего.
export function Bonuses({ ecctrlRef }: { ecctrlRef: RefObject<EcctrlHandle | null> }) {
  const addScore = useGameStore((s) => s.addScore)
  const [collected, setCollected] = useState<boolean[]>(() => BONUS_POSITIONS.map(() => false))
  const collectedRef = useRef(collected)
  collectedRef.current = collected

  useFrame(() => {
    const handle = ecctrlRef.current
    if (!handle) return

    BONUS_POSITIONS.forEach((pos, i) => {
      if (collectedRef.current[i]) return
      bonusWorldPos.set(pos[0], pos[1], pos[2])
      if (handle.currPos.distanceTo(bonusWorldPos) < COLLECT_DISTANCE) {
        collectedRef.current = collectedRef.current.map((c, idx) => (idx === i ? true : c))
        setCollected(collectedRef.current)
        addScore(SCORE_PER_BONUS)
      }
    })
  })

  return (
    <>
      {BONUS_POSITIONS.map((pos, i) => (collected[i] ? null : <BonusOrb key={i} position={pos} />))}
    </>
  )
}
