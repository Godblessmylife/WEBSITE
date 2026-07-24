// Плейсхолдер зоны облаков (progress ~0.35–0.65). Реальный
// процедурный шейдер облаков — в Phase 2.
export function CloudZone() {
  return (
    <group position={[0, 20, 8]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[40, 40]} />
        <meshStandardMaterial color="#c9d6e3" transparent opacity={0.6} />
      </mesh>
    </group>
  )
}
