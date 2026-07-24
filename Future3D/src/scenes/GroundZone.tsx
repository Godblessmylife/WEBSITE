import { useMemo } from 'react'
import { Instances, Instance } from '@react-three/drei'
import * as THREE from 'three'

// Текстура окон здания — тёмный фасад с сеткой случайно горящих/тёмных
// окон (жёлтых и голубых). Общая на все инстансы: индивидуальность
// зданий даёт не текстура, а тон (per-instance color) и пропорции.
function createWindowsTexture() {
  const canvas = document.createElement('canvas')
  canvas.width = 128
  canvas.height = 256
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = '#0c1420'
  ctx.fillRect(0, 0, canvas.width, canvas.height)

  const cols = 6
  const rows = 16
  const cellW = canvas.width / cols
  const cellH = canvas.height / rows
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const lit = Math.random() > 0.5
      ctx.fillStyle = lit ? (Math.random() > 0.75 ? '#ffd98a' : '#7fe3ff') : '#131d2b'
      const pad = cellW * 0.16
      ctx.fillRect(c * cellW + pad, r * cellH + pad, cellW - pad * 2, cellH - pad * 2)
    }
  }

  const texture = new THREE.CanvasTexture(canvas)
  texture.wrapS = THREE.RepeatWrapping
  texture.wrapT = THREE.RepeatWrapping
  texture.repeat.set(1, 3)
  texture.colorSpace = THREE.SRGBColorSpace
  return texture
}

interface BuildingSpec {
  position: [number, number, number]
  scale: [number, number, number]
  color: string
}

// Детерминированный псевдослучайный хэш вместо Math.random() для
// раскладки — при каждом ремаунте город одинаковый, легче договариваться
// об изменениях ("вон то здание у клиринга" всегда одно и то же место).
function hash(x: number, z: number) {
  const v = Math.sin(x * 12.9898 + z * 78.233) * 43758.5453
  return v - Math.floor(v)
}

// Город — сетка кварталов с прорехами (не сплошная стена) и расчищенной
// площадью в центре, куда прилетает камера (иначе казалось бы, что мы
// приземляемся прямо в стену домов). Высота падает к краю освоенной
// зоны, создавая силуэт "плотный центр -> редкие окраины".
function generateCity(): BuildingSpec[] {
  const buildings: BuildingSpec[] = []
  const half = 10
  const spacing = 7
  const clearing = 9
  const palette = ['#3a4a5c', '#2c3a48', '#465868', '#33424f', '#3f5163']

  for (let ix = -half; ix <= half; ix++) {
    for (let iz = -half; iz <= half; iz++) {
      const h = hash(ix, iz)
      const jitterX = (hash(ix, iz + 0.5) - 0.5) * 3
      const jitterZ = (hash(ix + 0.5, iz) - 0.5) * 3
      const x = ix * spacing + jitterX
      const z = iz * spacing + jitterZ
      const distFromCenter = Math.hypot(x, z)

      if (distFromCenter < clearing) continue
      if (h > 0.62) continue // прорехи между кварталами

      const falloff = THREE.MathUtils.clamp(1 - (distFromCenter - clearing) / 55, 0.25, 1)
      const height = (3 + h * 16) * falloff + 2
      const footprint = 1.3 + hash(iz, ix) * 1.1

      buildings.push({
        position: [x, height / 2, z],
        scale: [footprint, height, footprint],
        color: palette[Math.floor(h * palette.length) % palette.length],
      })
    }
  }
  return buildings
}

export function GroundZone() {
  const windowsTexture = useMemo(() => createWindowsTexture(), [])
  const buildings = useMemo(() => generateCity(), [])

  return (
    <group position={[0, 0, 0]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[260, 260]} />
        <meshStandardMaterial color="#10161f" roughness={0.7} metalness={0.15} />
      </mesh>

      <Instances limit={buildings.length} range={buildings.length}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial map={windowsTexture} roughness={0.55} metalness={0.25} vertexColors />
        {buildings.map((b, i) => (
          <Instance key={i} position={b.position} scale={b.scale} color={b.color} />
        ))}
      </Instances>

      {/* тёплый/холодный акцентный свет "заката" и "неона" у горизонта */}
      <pointLight color="#ff9d5c" position={[0, 12, -60]} intensity={90} distance={170} decay={2} />
      <pointLight color="#5fd4ff" position={[0, 8, 55]} intensity={50} distance={130} decay={2} />
    </group>
  )
}
