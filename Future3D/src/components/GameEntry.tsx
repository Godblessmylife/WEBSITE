import { useMemo, useRef, useState } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
import * as THREE from 'three'
import { useGameStore } from '@/utils/gameStore'
import computerModelUrl from '../models/computer.glb'

// "START" нарисован на canvas (тот же приём, что и тематические
// заставки карточек портфолио — без завязки на библиотеку 3D-текста).
function createStartTexture() {
  const canvas = document.createElement('canvas')
  canvas.width = 512
  canvas.height = 160
  const ctx = canvas.getContext('2d')!

  ctx.clearRect(0, 0, canvas.width, canvas.height)

  const glow = ctx.createRadialGradient(
    canvas.width / 2, canvas.height / 2, 0,
    canvas.width / 2, canvas.height / 2, canvas.width / 2,
  )
  glow.addColorStop(0, 'rgba(95, 212, 255, 0.35)')
  glow.addColorStop(1, 'rgba(95, 212, 255, 0)')
  ctx.fillStyle = glow
  ctx.fillRect(0, 0, canvas.width, canvas.height)

  ctx.font = 'bold 96px sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillStyle = '#eafcff'
  ctx.shadowColor = '#5fd4ff'
  ctx.shadowBlur = 24
  ctx.fillText('START', canvas.width / 2, canvas.height / 2)

  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  return texture
}

function StartPlate({ onActivate }: { onActivate: () => void }) {
  const texture = useMemo(() => createStartTexture(), [])
  const groupRef = useRef<THREE.Group>(null!)
  const [hovered, setHovered] = useState(false)

  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    groupRef.current.position.y = 1.9 + Math.sin(t * 1.4) * 0.08
    const scale = hovered ? 1.15 : 1
    groupRef.current.scale.setScalar(THREE.MathUtils.lerp(groupRef.current.scale.x, scale, 0.15))
  })

  return (
    <group ref={groupRef} position={[0, 1.9, 0]}>
      <mesh
        onClick={onActivate}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
      >
        <planeGeometry args={[1.8, 0.56]} />
        <meshBasicMaterial map={texture} transparent toneMapped={false} />
      </mesh>
    </group>
  )
}

function Computer() {
  const { scene } = useGLTF(computerModelUrl)
  return <primitive object={scene} />
}

// Секция после карусели портфолио: компьютер + висящая надпись START.
// Клик по надписи включает isGameActive (см. utils/gameStore.ts) —
// App.tsx монтирует поверх всего GameMode, когда флаг включён.
export function GameEntry() {
  const setGameActive = useGameStore((s) => s.setGameActive)

  return (
    <section
      style={{
        height: '100vh',
        position: 'relative',
        background: 'radial-gradient(circle at 50% 55%, #10161f 0%, #05070d 75%)',
      }}
    >
      <Canvas camera={{ position: [0, 1.6, 3.6], fov: 45 }}>
        <ambientLight intensity={0.6} />
        <directionalLight position={[3, 5, 4]} intensity={1.3} />
        <pointLight position={[0, 2, 1]} color="#5fd4ff" intensity={2} distance={6} />
        <Computer />
        <StartPlate onActivate={() => setGameActive(true)} />
      </Canvas>
    </section>
  )
}

useGLTF.preload(computerModelUrl)
