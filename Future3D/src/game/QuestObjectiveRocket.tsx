import { useRef } from 'react'
import type { RefObject } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import type { EcctrlHandle } from 'ecctrl'
import { useQuestStore } from '@/utils/questStore'

const OBJECTIVE_DISTANCE = 6
// Совпадает с положением Rocket в MapProps.tsx — намеренное дублирование
// мировых координат, как и у маркеров на мини-карте (см. подробный
// комментарий в Minimap.tsx про этот же приём).
const ROCKET_POSITION = new THREE.Vector3(-22, 1.138, -28)
// Индекс этого квеста в QUESTS (questStore.ts) — второй в цепочке.
const QUEST_INDEX = 1

// Маяк над ракетой — виден только пока квест 2 активен, подсказывает
// куда лететь/бежать. У квеста нет предмета для подбора (в отличие от
// ножа/фишки) - задание засчитывается по факту приближения к ракете.
function SignalBeacon() {
  const ringRef = useRef<THREE.Mesh>(null!)

  useFrame((_, delta) => {
    ringRef.current.rotation.z += delta * 1.6
  })

  return (
    <group position={ROCKET_POSITION.toArray()}>
      <mesh position={[0, 6, 0]}>
        <sphereGeometry args={[0.35, 12, 12]} />
        <meshBasicMaterial color="#7ad1ff" toneMapped={false} />
      </mesh>
      <mesh ref={ringRef} position={[0, 6, 0]}>
        <torusGeometry args={[0.6, 0.05, 8, 20]} />
        <meshBasicMaterial color="#5fd4ff" toneMapped={false} />
      </mesh>
      <pointLight position={[0, 6, 0]} color="#5fd4ff" intensity={2} distance={8} />
    </group>
  )
}

export function QuestObjectiveRocket({ ecctrlRef }: { ecctrlRef: RefObject<EcctrlHandle | null> }) {
  const questIndex = useQuestStore((s) => s.questIndex)
  const phase = useQuestStore((s) => s.phase)
  const completeObjective = useQuestStore((s) => s.completeObjective)
  const isActive = questIndex === QUEST_INDEX && phase === 'active'

  useFrame(() => {
    if (!isActive) return
    const handle = ecctrlRef.current
    if (!handle) return
    if (handle.currPos.distanceTo(ROCKET_POSITION) < OBJECTIVE_DISTANCE) {
      completeObjective()
    }
  })

  if (!isActive) return null
  return <SignalBeacon />
}
