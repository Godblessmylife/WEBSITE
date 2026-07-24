import { useRef } from 'react'
import type { PointerEvent as ReactPointerEvent, RefObject } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Environment } from '@react-three/drei'
import * as THREE from 'three'
import cityHdri from '@pmndrs/assets/hdri/city.exr'

const CARD_COUNT = 5
const CARD_RADIUS = 3.4

// Плейсхолдер-подписи — реальные проекты/картинки портфолио клиент
// подставит позже (Phase 5), сейчас важна механика карусели.
const CARD_LABELS = ['01', '02', '03', '04', '05']

interface DragState {
  active: boolean
  lastX: number
  velocity: number
}

function Card({ index }: { index: number }) {
  const angle = (index / CARD_COUNT) * Math.PI * 2
  return (
    <group
      position={[Math.sin(angle) * CARD_RADIUS, 0, Math.cos(angle) * CARD_RADIUS]}
      rotation={[0, angle, 0]}
    >
      {/* зеркальная карточка: высокий metalness + низкий roughness +
          окружение (Environment) дают настоящее отражение сцены вокруг */}
      <mesh>
        <boxGeometry args={[1.7, 2.3, 0.06]} />
        <meshStandardMaterial color="#eef2f6" metalness={1} roughness={0.06} envMapIntensity={1.5} />
      </mesh>
      <mesh position={[0, 0, 0.035]}>
        <planeGeometry args={[1.5, 2.1]} />
        <meshStandardMaterial color="#0f1620" metalness={0.6} roughness={0.3} />
      </mesh>
    </group>
  )
}

function Carousel({ dragRef, rotationRef }: { dragRef: RefObject<DragState>; rotationRef: RefObject<number> }) {
  const groupRef = useRef<THREE.Group>(null!)

  useFrame((_, delta) => {
    if (!dragRef.current.active) {
      rotationRef.current += dragRef.current.velocity * delta
    }
    groupRef.current.rotation.y = rotationRef.current
  })

  return (
    <group ref={groupRef}>
      {CARD_LABELS.map((_, i) => (
        <Card key={i} index={i} />
      ))}
    </group>
  )
}

// Секция портфолио — идёт СРАЗУ ПОСЛЕ 3D-путешествия в обычном потоке
// страницы (не часть закреплённой сцены). JourneyScene закреплена через
// position:sticky внутри своего скролл-спейсера (см. App.tsx) — когда
// спейсер заканчивается, sticky-блок естественно "отпускает" 3D-сцену
// и она уходит вверх экрана, открывая эту секцию — без ручного JS.
export function PortfolioCarousel() {
  const dragRef = useRef<DragState>({ active: false, lastX: 0, velocity: 0.15 })
  const rotationRef = useRef(0)

  const onPointerDown = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    dragRef.current.active = true
    dragRef.current.lastX = e.clientX
  }
  const onPointerMove = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    if (!dragRef.current.active) return
    const dx = e.clientX - dragRef.current.lastX
    dragRef.current.lastX = e.clientX
    rotationRef.current += dx * 0.01
  }
  const onPointerUp = () => {
    dragRef.current.active = false
  }

  return (
    <section style={{ height: '100vh', background: '#05070d', position: 'relative' }}>
      <Canvas
        camera={{ position: [0, 1.4, 8.5], fov: 50 }}
        style={{ touchAction: 'none', cursor: 'grab' }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerUp}
      >
        <ambientLight intensity={0.5} />
        <directionalLight position={[5, 8, 5]} intensity={1.2} />
        <Environment files={cityHdri} />
        <Carousel dragRef={dragRef} rotationRef={rotationRef} />
      </Canvas>
    </section>
  )
}
