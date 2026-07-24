const SUIT = '#232f3d'
const SUIT_DARK = '#141b24'
const SKIN = '#caa483'
const ACCENT = '#5fd4ff'

interface LimbProps {
  position: [number, number, number]
  upperRotation: [number, number, number]
  upperLength: number
  upperRadius: number
  lowerRotation: [number, number, number]
  lowerLength: number
  lowerRadius: number
}

// Рука/нога как две капсулы на настоящих суставах (плечо->локоть,
// бедро->колено), а не одна прямая капсула под случайным углом — это
// и есть разница между "похоже на человека" и "странные коробки".
function Limb({
  position,
  upperRotation,
  upperLength,
  upperRadius,
  lowerRotation,
  lowerLength,
  lowerRadius,
}: LimbProps) {
  return (
    <group position={position}>
      <group rotation={upperRotation}>
        <mesh position={[0, -upperLength / 2, 0]}>
          <capsuleGeometry args={[upperRadius, upperLength - upperRadius * 2, 4, 8]} />
          <meshStandardMaterial color={SUIT} roughness={0.5} metalness={0.2} />
        </mesh>
        <group position={[0, -upperLength, 0]} rotation={lowerRotation}>
          <mesh position={[0, -lowerLength / 2, 0]}>
            <capsuleGeometry args={[lowerRadius, lowerLength - lowerRadius * 2, 4, 8]} />
            <meshStandardMaterial color={SUIT} roughness={0.5} metalness={0.2} />
          </mesh>
          <mesh position={[0, -lowerLength, 0]}>
            <sphereGeometry args={[lowerRadius * 1.1, 8, 8]} />
            <meshStandardMaterial color={SUIT_DARK} roughness={0.6} />
          </mesh>
        </group>
      </group>
    </group>
  )
}

// Человекоподобная фигура в позе скайдайвера: руки в стороны согнуты в
// локтях, ноги разведены и согнуты в коленях назад — так реально
// выглядит свободное падение, поэтому поза читается естественно даже
// без покадровой анимации суставов (крутит и наклоняет её целиком
// Hero.tsx). Лицо открыто (не под шлемом), чтобы силуэт однозначно
// читался как человек; тонкий акцентный визор и шов на костюме — под
// футуристичную тему сайта.
export function HeroModel() {
  return (
    <group>
      <mesh position={[0, 0.78, 0]}>
        <sphereGeometry args={[0.16, 16, 16]} />
        <meshStandardMaterial color={SKIN} roughness={0.7} />
      </mesh>
      <mesh position={[0, 0.79, 0.14]}>
        <boxGeometry args={[0.22, 0.05, 0.05]} />
        <meshBasicMaterial color={ACCENT} toneMapped={false} />
      </mesh>
      <mesh position={[0, 0.62, 0]}>
        <cylinderGeometry args={[0.07, 0.08, 0.1, 8]} />
        <meshStandardMaterial color={SKIN} roughness={0.7} />
      </mesh>

      <mesh position={[0, 0.32, 0]}>
        <capsuleGeometry args={[0.19, 0.36, 4, 8]} />
        <meshStandardMaterial color={SUIT} roughness={0.5} metalness={0.2} />
      </mesh>
      <mesh position={[0, 0.36, 0.2]}>
        <sphereGeometry args={[0.07, 12, 12]} />
        <meshBasicMaterial color={ACCENT} toneMapped={false} />
      </mesh>
      <mesh position={[0, 0.1, 0.185]}>
        <boxGeometry args={[0.05, 0.4, 0.02]} />
        <meshBasicMaterial color={ACCENT} toneMapped={false} transparent opacity={0.7} />
      </mesh>
      <mesh position={[0, -0.02, 0]}>
        <capsuleGeometry args={[0.17, 0.08, 4, 8]} />
        <meshStandardMaterial color={SUIT_DARK} roughness={0.6} />
      </mesh>

      <Limb
        position={[0.24, 0.42, 0]}
        upperRotation={[0.5, 0, 1.15]}
        upperLength={0.3}
        upperRadius={0.075}
        lowerRotation={[-0.9, 0, -0.3]}
        lowerLength={0.28}
        lowerRadius={0.065}
      />
      <Limb
        position={[-0.24, 0.42, 0]}
        upperRotation={[0.5, 0, -1.15]}
        upperLength={0.3}
        upperRadius={0.075}
        lowerRotation={[-0.9, 0, 0.3]}
        lowerLength={0.28}
        lowerRadius={0.065}
      />

      <Limb
        position={[0.13, -0.08, 0]}
        upperRotation={[2.5, 0, 0.25]}
        upperLength={0.36}
        upperRadius={0.1}
        lowerRotation={[-1.6, 0, 0]}
        lowerLength={0.34}
        lowerRadius={0.09}
      />
      <Limb
        position={[-0.13, -0.08, 0]}
        upperRotation={[2.5, 0, -0.25]}
        upperLength={0.36}
        upperRadius={0.1}
        lowerRotation={[-1.6, 0, 0]}
        lowerLength={0.34}
        lowerRadius={0.09}
      />

      <pointLight color={ACCENT} intensity={4} distance={6} />
    </group>
  )
}
