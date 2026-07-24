import { useMemo, useRef } from 'react'
import type { PointerEvent as ReactPointerEvent, RefObject } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Environment, Stars } from '@react-three/drei'
import * as THREE from 'three'
import cityHdri from '@pmndrs/assets/hdri/city.exr'

const CARD_COUNT = 5
const CARD_RADIUS = 3.4

// Нет инструмента генерации изображений — вместо реальных фото проектов
// (которых пока и нет) каждая карточка получает свою процедурную
// тематическую заставку (canvas: градиент + абстрактные кольца + подпись
// категории). Как только появятся настоящие превью проектов, эта
// текстура меняется на map={realProjectTexture} в одну строку.
interface Theme {
  title: string
  base: string
  accent: string
  glow: string
}

const THEMES: Theme[] = [
  { title: 'ВЕБ-САЙТЫ', base: '#0a1a2e', accent: '#3fa9f5', glow: '#7dd3ff' },
  { title: 'ИГРЫ', base: '#1c0a2e', accent: '#b34ff5', glow: '#ff8ae2' },
  { title: '3D / VR', base: '#0a2e22', accent: '#3ff5a0', glow: '#8affc9' },
  { title: 'БРЕНДИНГ', base: '#2e1a0a', accent: '#f5a83f', glow: '#ffce8a' },
  { title: 'ПРИЛОЖЕНИЯ', base: '#2e0a14', accent: '#f53f6e', glow: '#ff8aa8' },
]

function createThemeTexture(theme: Theme) {
  const canvas = document.createElement('canvas')
  canvas.width = 512
  canvas.height = 720
  const ctx = canvas.getContext('2d')!

  const grad = ctx.createLinearGradient(0, 0, 0, canvas.height)
  grad.addColorStop(0, theme.base)
  grad.addColorStop(1, '#05070d')
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, canvas.width, canvas.height)

  ctx.strokeStyle = theme.accent
  ctx.lineWidth = 2
  ctx.globalAlpha = 0.45
  for (let i = 0; i < 6; i++) {
    ctx.beginPath()
    ctx.arc(canvas.width / 2, canvas.height * 0.4, 40 + i * 42, 0, Math.PI * 2)
    ctx.stroke()
  }
  ctx.globalAlpha = 1

  const glow = ctx.createRadialGradient(
    canvas.width / 2, canvas.height * 0.4, 0,
    canvas.width / 2, canvas.height * 0.4, 100,
  )
  glow.addColorStop(0, theme.glow)
  glow.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.fillStyle = glow
  ctx.fillRect(0, 0, canvas.width, canvas.height)

  ctx.fillStyle = '#f4f7fb'
  ctx.font = 'bold 42px sans-serif'
  ctx.textAlign = 'center'
  ctx.fillText(theme.title, canvas.width / 2, canvas.height * 0.82)

  ctx.strokeStyle = theme.accent
  ctx.lineWidth = 3
  ctx.beginPath()
  ctx.moveTo(canvas.width * 0.26, canvas.height * 0.86)
  ctx.lineTo(canvas.width * 0.74, canvas.height * 0.86)
  ctx.stroke()

  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  return texture
}

interface DragState {
  active: boolean
  lastX: number
  velocity: number
}

function Card({ index }: { index: number }) {
  const angle = (index / CARD_COUNT) * Math.PI * 2
  const theme = THEMES[index % THEMES.length]
  const texture = useMemo(() => createThemeTexture(theme), [theme])

  return (
    <group
      position={[Math.sin(angle) * CARD_RADIUS, 0, Math.cos(angle) * CARD_RADIUS]}
      rotation={[0, angle, 0]}
    >
      {/* зеркальная рамка: высокий metalness + низкий roughness +
          окружение (Environment) дают настоящее отражение сцены вокруг */}
      <mesh>
        <boxGeometry args={[1.7, 2.3, 0.06]} />
        <meshStandardMaterial color="#eef2f6" metalness={1} roughness={0.06} envMapIntensity={1.5} />
      </mesh>
      <mesh position={[0, 0, 0.035]}>
        <planeGeometry args={[1.5, 2.1]} />
        <meshStandardMaterial map={texture} metalness={0.1} roughness={0.4} />
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
      {THEMES.map((_, i) => (
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
    <section
      style={{
        height: '100vh',
        position: 'relative',
        background:
          'radial-gradient(circle at 50% 38%, #182a45 0%, #0a1120 45%, #05070d 85%)',
      }}
    >
      <Canvas
        camera={{ position: [0, 1.4, 8.5], fov: 50 }}
        style={{ touchAction: 'none', cursor: 'grab' }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerUp}
      >
        {/* лёгкий "игровое меню" фон вместо сплошной черноты: звёзды +
            мягкое туманное затемнение к краям кадра */}
        <Stars radius={60} depth={30} count={2500} factor={3} saturation={0} fade speed={0.4} />
        <fog attach="fog" args={['#0a1120', 8, 26]} />
        <ambientLight intensity={0.5} />
        <directionalLight position={[5, 8, 5]} intensity={1.2} />
        <Environment files={cityHdri} />
        <Carousel dragRef={dragRef} rotationRef={rotationRef} />
      </Canvas>
    </section>
  )
}
