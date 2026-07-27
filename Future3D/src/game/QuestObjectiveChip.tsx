import { useRef } from 'react'
import type { RefObject } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import type { EcctrlHandle } from 'ecctrl'
import { useQuestStore } from '@/utils/questStore'

const COLLECT_DISTANCE = 1.6
// Индекс этого квеста в QUESTS (questStore.ts) — третий, последний в цепочке.
const QUEST_INDEX = 2
// Между SlotMachine (60,-50) и SlotMachine2 (60,-30) в MapProps.tsx —
// то же намеренное дублирование мировых координат, что и у маркеров на
// мини-карте (см. подробный комментарий в Minimap.tsx).
const CHIP_POSITION = new THREE.Vector3(60, 0.5, -40)

// Фишка должника — тот же принцип, что и у QuestItem.tsx (нож): видна
// только пока квест активен и ещё не собрана. Модели фишки нет среди
// присланных ассетов — процедурный золотой жетон в общем стиле бонусов
// (Bonuses.tsx: emissive + вращение) вместо нового .glb.
function ChipModel() {
  const groupRef = useRef<THREE.Group>(null!)

  useFrame(({ clock }, delta) => {
    groupRef.current.position.y = 0.5 + Math.sin(clock.elapsedTime * 2) * 0.1
    groupRef.current.rotation.y += delta * 1.8
  })

  return (
    <group ref={groupRef} position={CHIP_POSITION.toArray()}>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.28, 0.28, 0.06, 24]} />
        <meshStandardMaterial
          color="#ffd76a"
          emissive="#ffb23f"
          emissiveIntensity={1.6}
          metalness={0.6}
          roughness={0.25}
        />
      </mesh>
      <pointLight color="#ffcf7a" intensity={1.4} distance={3} />
    </group>
  )
}

export function QuestObjectiveChip({ ecctrlRef }: { ecctrlRef: RefObject<EcctrlHandle | null> }) {
  const questIndex = useQuestStore((s) => s.questIndex)
  const phase = useQuestStore((s) => s.phase)
  const completeObjective = useQuestStore((s) => s.completeObjective)
  const isActive = questIndex === QUEST_INDEX && phase === 'active'

  useFrame(() => {
    if (!isActive) return
    const handle = ecctrlRef.current
    if (!handle) return
    if (handle.currPos.distanceTo(CHIP_POSITION) < COLLECT_DISTANCE) {
      completeObjective()
    }
  })

  if (!isActive) return null
  return <ChipModel />
}
