import { useMemo, useRef } from 'react'
import type { RefObject } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useScrollStore } from '@/utils/scrollStore'

// Проявляется поверх Земли ближе к концу пути (см. EarthPlanet.tsx —
// её fade-out идёт в этом же диапазоне), создавая иллюзию, что город
// — это просто "приближенный" участок поверхности планеты, а не
// отдельное место.
const FADE_IN_START = 0.74
const FADE_IN_END = 0.9

// Текстура окон здания — тёмный фасад с сеткой случайно горящих/тёмных
// окон (жёлтых и голубых), общая для всех зданий.
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
  width: number
  height: number
  color: string
}

// Детерминированный псевдослучайный хэш вместо Math.random() для
// раскладки — при каждом ремаунте город одинаковый.
function hash(x: number, z: number) {
  const v = Math.sin(x * 12.9898 + z * 78.233) * 43758.5453
  return v - Math.floor(v)
}

// Здания раньше рендерились через drei Instances с per-instance
// non-uniform scale + vertexColors — клиент увидел их как "кривые".
// Убрано полностью: теперь каждое здание — обычный mesh со своей
// BoxGeometry нужных размеров (никакого scale-трюка, никакой
// инстанс-окраски), минус производительность инстансинга, зато без
// всяких сюрпризов с нормалями/матрицами на неоднородном масштабе.
// Раскладка также сделана менее хаотичной (меньше джиттер).
function generateCity(): BuildingSpec[] {
  const buildings: BuildingSpec[] = []
  const half = 8
  const spacing = 7.5
  const clearing = 10
  const palette = ['#3a4a5c', '#2c3a48', '#465868', '#33424f', '#3f5163']

  for (let ix = -half; ix <= half; ix++) {
    for (let iz = -half; iz <= half; iz++) {
      const h = hash(ix, iz)
      const jitterX = (hash(ix, iz + 0.5) - 0.5) * 1.4
      const jitterZ = (hash(ix + 0.5, iz) - 0.5) * 1.4
      const x = ix * spacing + jitterX
      const z = iz * spacing + jitterZ
      const distFromCenter = Math.hypot(x, z)

      if (distFromCenter < clearing) continue
      if (h > 0.6) continue // прорехи между кварталами

      const falloff = THREE.MathUtils.clamp(1 - (distFromCenter - clearing) / 45, 0.25, 1)
      const height = (3 + h * 15) * falloff + 2
      const width = 1.4 + hash(iz, ix) * 1.0

      buildings.push({
        position: [x, height / 2, z],
        width,
        height,
        color: palette[Math.floor(h * palette.length) % palette.length],
      })
    }
  }
  return buildings
}

function Building({
  spec,
  texture,
  materialsRef,
  index,
}: {
  spec: BuildingSpec
  texture: THREE.Texture
  materialsRef: RefObject<(THREE.MeshStandardMaterial | null)[]>
  index: number
}) {
  return (
    <mesh position={spec.position}>
      <boxGeometry args={[spec.width, spec.height, spec.width]} />
      <meshStandardMaterial
        ref={(m) => {
          materialsRef.current[index] = m
        }}
        map={texture}
        color={spec.color}
        roughness={0.55}
        metalness={0.25}
      />
    </mesh>
  )
}

export function GroundZone() {
  const windowsTexture = useMemo(() => createWindowsTexture(), [])
  const buildings = useMemo(() => generateCity(), [])
  const buildingMaterialsRef = useRef<(THREE.MeshStandardMaterial | null)[]>([])

  const groundRef = useRef<THREE.Mesh>(null!)
  const warmLightRef = useRef<THREE.PointLight>(null!)
  const coolLightRef = useRef<THREE.PointLight>(null!)

  // Один useFrame на весь город вместо одного на каждое здание (их
  // ~100+) — все здания появляются синхронно, отдельные подписки на
  // кадр для каждого были лишней нагрузкой без всякой пользы.
  useFrame(() => {
    const progress = THREE.MathUtils.clamp(useScrollStore.getState().progress, 0, 1)
    const opacity = THREE.MathUtils.smoothstep(progress, FADE_IN_START, FADE_IN_END)
    const visible = opacity > 0.01

    const groundMaterial = groundRef.current.material as THREE.MeshStandardMaterial
    groundMaterial.transparent = opacity < 1
    groundMaterial.opacity = opacity
    groundRef.current.visible = visible

    for (const material of buildingMaterialsRef.current) {
      if (!material) continue
      material.transparent = opacity < 1
      material.opacity = opacity
    }

    warmLightRef.current.intensity = 90 * opacity
    coolLightRef.current.intensity = 50 * opacity
  })

  return (
    <group position={[0, 0, 0]}>
      <mesh ref={groundRef} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[260, 260]} />
        <meshStandardMaterial color="#10161f" roughness={0.7} metalness={0.15} />
      </mesh>

      {buildings.map((spec, i) => (
        <Building
          key={i}
          spec={spec}
          texture={windowsTexture}
          materialsRef={buildingMaterialsRef}
          index={i}
        />
      ))}

      {/* тёплый/холодный акцентный свет "заката" и "неона" у горизонта */}
      <pointLight ref={warmLightRef} color="#ff9d5c" position={[0, 12, -60]} distance={170} decay={2} />
      <pointLight ref={coolLightRef} color="#5fd4ff" position={[0, 8, 55]} distance={130} decay={2} />
    </group>
  )
}
