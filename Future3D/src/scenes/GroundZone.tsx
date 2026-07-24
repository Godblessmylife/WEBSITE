// Зона земли/города (progress ~0.65–1.0). Пока без импортированной
// модели города (это Phase 2/5 — .glb + Draco/meshopt), но уже с
// собственным акцентным светом (раньше здесь не было ни одного
// источника света вообще, отсюда и "чёрный экран") и заметно большей
// плотностью застройки для ощущения города, а не 12 одинаковых коробок.
const BUILDINGS = Array.from({ length: 36 }, (_, i) => {
  const angle = (i / 36) * Math.PI * 2
  const ring = 6 + (i % 3) * 6
  const jitter = ((i * 53) % 7) - 3
  const height = 2 + ((i * 17) % 9)
  const hue = ['#2a3d52', '#233246', '#1f2c3d'][i % 3]
  const neon = ['#00eaff', '#ff3df0', '#7dff9e'][i % 3]
  return {
    position: [
      Math.cos(angle) * ring + jitter * 0.4,
      height / 2,
      Math.sin(angle) * ring + jitter * 0.4,
    ] as [number, number, number],
    height,
    color: hue,
    neon,
  }
})

export function GroundZone() {
  return (
    <group position={[0, 0, 0]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[140, 140]} />
        <meshStandardMaterial color="#141c2b" roughness={0.9} />
      </mesh>

      {/* неоновая сетка поверх пола — задаёт ощущение футуристичного города */}
      <gridHelper args={[140, 70, '#00eaff', '#0d3d4a']} position={[0, 0.01, 0]} />

      {BUILDINGS.map((b, i) => (
        <group key={i}>
          <mesh position={b.position}>
            <boxGeometry args={[1.6, b.height, 1.6]} />
            <meshStandardMaterial color={b.color} roughness={0.6} metalness={0.2} />
          </mesh>
          {/* светящиеся окна-полоски */}
          <mesh position={[b.position[0], b.position[1], b.position[2] + 0.81]}>
            <planeGeometry args={[1.2, b.height * 0.7]} />
            <meshBasicMaterial color={b.neon} toneMapped={false} transparent opacity={0.85} />
          </mesh>
        </group>
      ))}

      {/* тёплый акцентный свет "заката/огней города" у горизонта */}
      <pointLight color="#ff9d5c" position={[0, 6, -30]} intensity={40} distance={90} decay={2} />
      <pointLight color="#5fd4ff" position={[0, 4, 30]} intensity={25} distance={70} decay={2} />
    </group>
  )
}
