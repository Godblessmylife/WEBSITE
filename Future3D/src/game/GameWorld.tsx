import { useMemo } from 'react'
import { CuboidCollider, RigidBody } from '@react-three/rapier'
import * as THREE from 'three'
import { MapProps } from './MapProps'

// Остров (внешняя модель, экспортированная в масштабе ~18000 условных
// единиц) визуально "не совпал по высоте" с полом — герой падал сквозь
// пустоту при входе в игру. Вместо повторной попытки угадать нужный
// вертикальный сдвиг без возможности проверить в браузере — плоская
// процедурная земля: гарантированно ровная, коллайдер строго совпадает
// с видимой геометрией, падать здесь буквально не через что.
function createSandTexture() {
  const canvas = document.createElement('canvas')
  canvas.width = 512
  canvas.height = 512
  const ctx = canvas.getContext('2d')!

  const base = ctx.createLinearGradient(0, 0, 512, 512)
  base.addColorStop(0, '#e8c583')
  base.addColorStop(1, '#d1a05e')
  ctx.fillStyle = base
  ctx.fillRect(0, 0, 512, 512)

  ctx.globalAlpha = 0.18
  ctx.strokeStyle = '#a97b3f'
  for (let i = 0; i < 30; i++) {
    ctx.lineWidth = 2 + Math.random() * 3
    const y = Math.random() * 512
    ctx.beginPath()
    ctx.moveTo(0, y)
    ctx.bezierCurveTo(170, y + (Math.random() * 40 - 20), 340, y + (Math.random() * 40 - 20), 512, y)
    ctx.stroke()
  }
  ctx.globalAlpha = 1

  const texture = new THREE.CanvasTexture(canvas)
  texture.wrapS = THREE.RepeatWrapping
  texture.wrapT = THREE.RepeatWrapping
  texture.repeat.set(20, 20)
  texture.colorSpace = THREE.SRGBColorSpace
  return texture
}

function DesertGround() {
  const texture = useMemo(() => createSandTexture(), [])

  // РАНЬШЕ: colliders="cuboid" (авто-генерация коллайдера из mesh).
  // Диагностика (world.forEachCollider через useRapier()) показала, что
  // в физическом мире оказывалось 2 RigidBody, но только 1 коллайдер —
  // капсула персонажа. Коллайдер земли не регистрировался вообще, из-за
  // чего персонаж падал сквозь пол бесконечно (без единого физического
  // тела на пути падения). Явный CuboidCollider с теми же размерами/
  // трансформом, что и видимый mesh, — тот же самый визуальный
  // результат, но без зависимости от автогенерации.
  return (
    <RigidBody type="fixed" colliders={false}>
      {/* Полуразмеры совпадают с необёрнутой геометрией (280x280x0.5 / 2),
          а не с итоговой видимой ориентацией — коллайдер повёрнут точно
          так же, как mesh, а не переставлены оси в args. Площадка
          увеличена вдвое (140->280) по просьбе клиента — под гору
          (MapProps: Mountain) и новую декорацию нужно место подальше от
          стартового кластера. */}
      <CuboidCollider args={[140, 140, 0.25]} position={[0, -0.25, 0]} rotation={[-Math.PI / 2, 0, 0]} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.25, 0]} receiveShadow>
        <boxGeometry args={[280, 280, 0.5]} />
        <meshStandardMaterial map={texture} roughness={0.95} />
      </mesh>
    </RigidBody>
  )
}

function DesertSun() {
  return (
    <group position={[35, 45, -45]}>
      <mesh>
        <sphereGeometry args={[6, 24, 24]} />
        <meshBasicMaterial color="#ffdca0" toneMapped={false} />
      </mesh>
      <directionalLight intensity={2.4} color="#ffe9c2" castShadow />
    </group>
  )
}

function Frond({ angle }: { angle: number }) {
  return (
    <group rotation={[0, angle, 0]}>
      <mesh position={[0, -0.3, 0.9]} rotation={[0.95, 0, 0]}>
        <boxGeometry args={[0.35, 1.6, 0.05]} />
        <meshStandardMaterial color="#3f8f4a" roughness={0.7} side={THREE.DoubleSide} />
      </mesh>
    </group>
  )
}

function PalmTree({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh position={[0, 1.6, 0]}>
        <cylinderGeometry args={[0.12, 0.2, 3.2, 8]} />
        <meshStandardMaterial color="#7a5230" roughness={0.9} />
      </mesh>
      <group position={[0, 3.2, 0]}>
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <Frond key={i} angle={(i / 6) * Math.PI * 2} />
        ))}
      </group>
    </group>
  )
}

const PALM_POSITIONS: [number, number, number][] = [
  [4, 0, -3],
  [-5, 0, 2],
  [-3, 0, -6],
  [7, 0, 4],
  [-8, 0, -2],
  [2, 0, 8],
]

export function GameWorld() {
  return (
    <>
      <ambientLight intensity={0.7} color="#ffe9c2" />
      <DesertSun />

      <DesertGround />

      {PALM_POSITIONS.map((position, i) => (
        <PalmTree key={i} position={position} />
      ))}

      <MapProps />
    </>
  )
}
