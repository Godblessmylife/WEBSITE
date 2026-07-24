import { RigidBody } from '@react-three/rapier'

interface Landmark {
  position: [number, number, number]
  size: [number, number, number]
  color: string
}

// Отдельный простой мир для игры (не переиспользуем город с лендинга,
// по решению клиента) — плоская площадка с несколькими объектами-
// ориентирами, чтобы было на что смотреть и вокруг чего бегать.
const LANDMARKS: Landmark[] = [
  { position: [4, 1, -3], size: [1.5, 2, 1.5], color: '#5fd4ff' },
  { position: [-5, 0.75, 2], size: [1, 1.5, 1], color: '#ff9d5c' },
  { position: [2, 0.5, 6], size: [2, 1, 2], color: '#b34ff5' },
  { position: [-3, 1.25, -6], size: [1.2, 2.5, 1.2], color: '#3ff5a0' },
  { position: [7, 0.6, 4], size: [1.3, 1.2, 1.3], color: '#f53f6e' },
]

export function GameWorld() {
  return (
    <>
      <ambientLight intensity={0.6} />
      <directionalLight position={[10, 15, 5]} intensity={1.3} castShadow />

      <RigidBody type="fixed" colliders="cuboid">
        <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
          <planeGeometry args={[80, 80]} />
          <meshStandardMaterial color="#141c2b" roughness={0.8} />
        </mesh>
      </RigidBody>

      {LANDMARKS.map((landmark, i) => (
        <RigidBody key={i} type="fixed" colliders="cuboid" position={landmark.position}>
          <mesh castShadow>
            <boxGeometry args={landmark.size} />
            <meshStandardMaterial
              color={landmark.color}
              emissive={landmark.color}
              emissiveIntensity={0.35}
              roughness={0.4}
              metalness={0.3}
            />
          </mesh>
        </RigidBody>
      ))}
    </>
  )
}
