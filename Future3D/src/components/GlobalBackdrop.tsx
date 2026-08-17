import { useEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Stars } from '@react-three/drei'
import * as THREE from 'three'
import { useGameStore } from '@/utils/gameStore'
import { useInView } from '@/hooks/useInView'
import { SECTION_BACKDROP } from '@/utils/sectionBackdrop'

// По отзыву клиента "фон пропадает и подгружается снова, висит где-то
// отдельно поверх старого" - раньше это был НЕ один фон, а 3 РАЗНЫХ
// экземпляра SectionStarfield (свой Canvas в About/Pricing/Contact
// отдельно), каждый монтировался/размонтировался САМ ПО СЕБЕ по мере
// приближения/ухода своей секции (useInView.ts) - на границе любых двух
// секций старый Canvas ещё не успел скрыться (HIDE_DELAY_MS=1000мс), а
// новый ещё не успел домонтироваться и прогреть WebGL/шейдеры - отсюда
// и "пропадает-подгружается", и "висит отдельно" (два независимых поля
// частиц с разной фазой вращения видны одновременно долю секунды).
//
// Этот компонент - ОДИН общий Canvas на весь диапазон от "О
// разработчике" до конца страницы, монтируется ОДИН РАЗ (когда читатель
// впервые приближается к About) и остаётся смонтированным до конца
// (единственный триггер размонтирования - старт игры, тот же паттерн,
// что уже использует JourneyScene.tsx) - переходов между секциями
// внутри этого диапазона для него просто не существует, гаснуть/
// подгружаться нечему.
//
// Ресурс: это НЕ новый лишний контекст поверх трёх старых - это ОДИН
// контекст ВМЕСТО трёх (SectionStarfield.tsx удалён) - пиковое число
// одновременных WebGL-контекстов не выросло (см. историю краша на iOS
// Safari от их накопления в useInView.ts).
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

const GLOW_SPOTS = [
  { color: 'rgba(95, 212, 255, 0.5)', radiusX: 16, radiusY: 9, speed: 0.045, phase: 0, z: -46 },
  { color: 'rgba(147, 92, 255, 0.4)', radiusX: 11, radiusY: 13, speed: 0.035, phase: Math.PI, z: -50 },
]

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

export function GlobalBackdrop() {
  const isGameActive = useGameStore((s) => s.isGameActive)
  // sentinelRef - обычный (не fixed) элемент высотой 1px, стоящий в
  // потоке страницы прямо перед AboutSection (см. App.tsx) - его позиция
  // в документе и есть "читатель приближается к About", ЭТО отслеживает
  // useInView, а не сам фон (который position:fixed и потому всегда был
  // бы "в видимости" в любой точке скролла).
  const [sentinelRef, inView] = useInView<HTMLDivElement>()
  // Однажды показавшись - не гаснет обратно (в отличие от обычного
  // useInView-паттерна на этом сайте) - именно это и убирает "туда-сюда"
  // мигание: одному общему Canvas незачем размонтироваться на каждой
  // внутренней границе секций, только когда читатель ушёл со страницы
  // полностью (старт игры).
  const [everShown, setEverShown] = useState(false)
  useEffect(() => {
    if (inView) setEverShown(true)
  }, [inView])

  const shouldRender = everShown && !isGameActive

  return (
    <>
      <div ref={sentinelRef} style={{ height: 1 }} />
      {shouldRender && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 0,
            pointerEvents: 'none',
            background: SECTION_BACKDROP,
          }}
        >
          <Canvas camera={{ position: [0, 0, 1], fov: 75 }}>
            <DriftingGlow />
            <RotatingStars />
          </Canvas>
        </div>
      )}
    </>
  )
}
