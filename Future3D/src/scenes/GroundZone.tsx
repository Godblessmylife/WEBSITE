// Плейсхолдер зоны земли/города (progress ~0.65–1.0). Реальная
// модель города (glb, Draco/meshopt) — в Phase 2.
const PLACEHOLDER_BUILDINGS = Array.from({ length: 12 }, (_, i) => ({
  position: [((i % 4) - 1.5) * 4, 1 + (i % 3), Math.floor(i / 4) * 4 - 4] as [number, number, number],
  height: 2 + (i % 3) * 2,
}))

export function GroundZone() {
  return (
    <group position={[0, 0, 0]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[100, 100]} />
        <meshStandardMaterial color="#1b2a22" />
      </mesh>
      {PLACEHOLDER_BUILDINGS.map((b, i) => (
        <mesh key={i} position={[b.position[0], b.height / 2, b.position[2]]}>
          <boxGeometry args={[1.5, b.height, 1.5]} />
          <meshStandardMaterial color="#2a3d52" emissive="#00eaff" emissiveIntensity={0.3} />
        </mesh>
      ))}
    </group>
  )
}
