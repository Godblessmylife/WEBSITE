// Плейсхолдер зоны неба (progress ~0–0.35). Реальное HDRI-небо и
// процедурный градиент — в Phase 2.
export function SkyZone() {
  return (
    <group position={[0, 50, 0]}>
      <mesh>
        <sphereGeometry args={[2, 16, 16]} />
        <meshStandardMaterial color="#3355ff" emissive="#112266" />
      </mesh>
      <ambientLight intensity={0.4} />
      <directionalLight position={[10, 20, 10]} intensity={1.5} />
    </group>
  )
}
