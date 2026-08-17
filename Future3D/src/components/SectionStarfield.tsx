import { useMemo, useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Stars } from '@react-three/drei'
import * as THREE from 'three'
import { useGameStore } from '@/utils/gameStore'
import { useInView } from '@/hooks/useInView'

// Общий анимированный звёздный фон для обычных DOM-секций (О нас, Цены,
// Контакты) — тот же приём "игрового меню", что уже стоит под карточками
// портфолио и у компьютера с START, только вынесенный в переиспользуемый
// компонент вместо копирования Canvas+Stars в каждую секцию. position:
// absolute на всю секцию, за текстом (z-index управляется снаружи через
// обычный поток DOM — этот div должен идти первым ребёнком в секции с
// position: relative).
function RotatingStars() {
  const groupRef = useRef<THREE.Group>(null!)
  useFrame((_, delta) => {
    groupRef.current.rotation.y += delta * 0.015
  })
  return (
    <group ref={groupRef}>
      <Stars radius={60} depth={40} count={3500} factor={3.5} saturation={0} fade speed={0.6} />
    </group>
  )
}

// Радиальное пятно свечения на CanvasTexture - тот же приём, что уже
// трижды использован в проекте (createDotTexture/createThemeTexture/
// createNeonGlowTexture) - процедурная текстура вместо шейдера/новой
// зависимости.
function createGlowTexture(color: string): THREE.CanvasTexture {
  const canvas = document.createElement('canvas')
  canvas.width = 256
  canvas.height = 256
  const ctx = canvas.getContext('2d')!
  const glow = ctx.createRadialGradient(128, 128, 0, 128, 128, 128)
  glow.addColorStop(0, color)
  glow.addColorStop(1, 'rgba(0, 0, 0, 0)')
  ctx.fillStyle = glow
  ctx.fillRect(0, 0, 256, 256)
  return new THREE.CanvasTexture(canvas)
}

// Цвета из уже устоявшейся палитры сайта - циан у кнопок HUD/акцентов,
// фиолетовый у God Mode - "космическая туманность" в стиле остального
// сайта, а не случайные новые цвета.
const GLOW_SPOTS = [
  { color: 'rgba(95, 212, 255, 0.5)', radiusX: 16, radiusY: 9, speed: 0.045, phase: 0, z: -46 },
  { color: 'rgba(147, 92, 255, 0.4)', radiusX: 11, radiusY: 13, speed: 0.035, phase: Math.PI, z: -50 },
]

// Дрейфующее свечение позади звёзд (Дополнение 5 - "крутой анимированный
// фон" по просьбе клиента) - 2 больших полупрозрачных спрайта с
// аддитивным смешением, каждый плывёт по своей мягкой орбите. Дешевле
// шейдера/частиц: те же 2 draw call'а поверх уже смонтированного Canvas,
// без нового WebGL-контекста и без новых зависимостей.
function DriftingGlow() {
  const textures = useMemo(() => GLOW_SPOTS.map((spot) => createGlowTexture(spot.color)), [])
  const spriteRefs = useRef<(THREE.Sprite | null)[]>([])

  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    GLOW_SPOTS.forEach((spot, i) => {
      const sprite = spriteRefs.current[i]
      if (!sprite) return
      sprite.position.x = Math.sin(t * spot.speed + spot.phase) * spot.radiusX
      sprite.position.y = Math.cos(t * spot.speed * 0.7 + spot.phase) * spot.radiusY
    })
  })

  return (
    <>
      {GLOW_SPOTS.map((spot, i) => (
        <sprite
          key={i}
          ref={(el) => {
            spriteRefs.current[i] = el
          }}
          position={[0, 0, spot.z]}
          scale={[42, 42, 1]}
        >
          <spriteMaterial
            map={textures[i]}
            transparent
            depthWrite={false}
            blending={THREE.AdditiveBlending}
            toneMapped={false}
          />
        </sprite>
      ))}
    </>
  )
}

export function SectionStarfield() {
  // Используется в трёх секциях (О нас/Цены/Контакты) - три отдельных
  // WebGL-контекста.
  const isGameActive = useGameStore((s) => s.isGameActive)
  // Canvas монтируется только когда секция приближается к области
  // видимости, и теперь ТАКЖЕ размонтируется, когда секция уходит далеко
  // (см. useInView.ts) - иначе все три этих Canvas жили бы одновременно
  // с самой первой секунды на странице и никогда бы не освобождались,
  // что на iOS Safari приводило к превышению лимита одновременных
  // WebGL-контекстов и черноте более старых канвасов (подробности в
  // useInView.ts).
  const [ref, inView] = useInView<HTMLDivElement>()

  if (isGameActive) return null

  return (
    <div
      ref={ref}
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 0,
        pointerEvents: 'none',
      }}
    >
      {inView && (
        <Canvas camera={{ position: [0, 0, 1], fov: 75 }}>
          <DriftingGlow />
          <RotatingStars />
        </Canvas>
      )}
    </div>
  )
}
