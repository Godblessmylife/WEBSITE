import { RigidBody } from '@react-three/rapier'
import { Island } from './Island'

interface Landmark {
  position: [number, number, number]
  size: [number, number, number]
  color: string
}

// Отдельный простой мир для игры (не переиспользуем город с лендинга,
// по решению клиента): остров (Island.tsx, модель от клиента) вместо
// плоской площадки + несколько объектов-ориентиров для навигации.
const LANDMARKS: Landmark[] = [
  { position: [4, 1, -3], size: [1.5, 2, 1.5], color: '#5fd4ff' },
  { position: [-5, 0.75, 2], size: [1, 1.5, 1], color: '#ff9d5c' },
  { position: [-3, 1.25, -6], size: [1.2, 2.5, 1.2], color: '#3ff5a0' },
]

export function GameWorld() {
  return (
    <>
      <ambientLight intensity={0.6} />
      <directionalLight position={[10, 15, 5]} intensity={1.3} castShadow />

      <Island />

      {/* Невидимая страховка ниже острова: без рендера не могу
          гарантировать, что видимая поверхность острова точно совпадёт
          по высоте с (0,0,0) — эта плоскость просто не даст провалиться
          в пустоту, если модель окажется смещена по Y. */}
      <RigidBody type="fixed" colliders="cuboid" position={[0, -6, 0]}>
        <mesh visible={false}>
          <boxGeometry args={[200, 1, 200]} />
          <meshBasicMaterial />
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
