// Солнце в зоне неба. Раньше здесь ещё была связка из 4 декоративных
// орбитальных планет (SolarSystem.tsx) — по просьбе клиента убраны,
// в космосе остаются только звёзды (Stars) и солнце; единственная
// "настоящая" планета на сайте — реальная модель Земли (EarthPlanet).
export function Sun() {
  return (
    <group>
      <mesh>
        <sphereGeometry args={[2.2, 32, 32]} />
        <meshBasicMaterial color="#ffd27f" toneMapped={false} />
      </mesh>
      <pointLight color="#ffedc2" intensity={60} distance={100} decay={2} />
    </group>
  )
}
