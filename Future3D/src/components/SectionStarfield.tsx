import { useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Stars } from '@react-three/drei'
import type { Group } from 'three'
import { useGameStore } from '@/utils/gameStore'

// Общий анимированный звёздный фон для обычных DOM-секций (О нас, Цены,
// Контакты) — тот же приём "игрового меню", что уже стоит под карточками
// портфолио и у компьютера с START, только вынесенный в переиспользуемый
// компонент вместо копирования Canvas+Stars в каждую секцию. position:
// absolute на всю секцию, за текстом (z-index управляется снаружи через
// обычный поток DOM — этот div должен идти первым ребёнком в секции с
// position: relative).
function RotatingStars() {
  const groupRef = useRef<Group>(null!)
  useFrame((_, delta) => {
    groupRef.current.rotation.y += delta * 0.015
  })
  return (
    <group ref={groupRef}>
      <Stars radius={60} depth={40} count={3500} factor={3.5} saturation={0} fade speed={0.6} />
    </group>
  )
}

export function SectionStarfield() {
  // Используется в трёх секциях (О нас/Цены/Контакты) - три отдельных
  // WebGL-контекста, ни один из них не размонтируется, пока идёт игра.
  // См. подробное объяснение в JourneyScene.tsx (тот же клиентский баг:
  // "вылетает" на мобильном от лишних одновременно живых контекстов).
  const isGameActive = useGameStore((s) => s.isGameActive)
  if (isGameActive) return null

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 0,
        pointerEvents: 'none',
      }}
    >
      <Canvas camera={{ position: [0, 0, 1], fov: 75 }}>
        <RotatingStars />
      </Canvas>
    </div>
  )
}
