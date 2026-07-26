import { useEffect, useRef } from 'react'
import type { RefObject } from 'react'
import { useFrame } from '@react-three/fiber'
import { useGLTF, useAnimations } from '@react-three/drei'
import * as THREE from 'three'
import type { EcctrlHandle } from 'ecctrl'
import { useQuestStore } from '@/utils/questStore'
import knifeUrl from '../models/knifequest1.glb'

const COLLECT_DISTANCE = 1.6
// bbox исходника крошечный (~0.14x0.12x0.14) — увеличен в 3 раза, чтобы
// нож на площадке был заметен и его можно было спутать с бонусом, а не
// потерять на песке.
const SCALE = 3
const ITEM_POSITION = new THREE.Vector3(25, 0.02, -15)

// Виден только пока квест активен и ещё не собран (см. questStore) —
// после handle.collectItem() статус меняется на ready_to_turn_in и этот
// компонент перестаёт рендериться (условие в JourneyItemGate ниже).
function KnifeModel() {
  const groupRef = useRef<THREE.Group>(null!)
  const { scene, animations } = useGLTF(knifeUrl)
  const { actions, names } = useAnimations(animations, groupRef)

  useEffect(() => {
    const firstAction = names[0] ? actions[names[0]] : null
    firstAction?.reset().play()
  }, [actions, names])

  return (
    <group ref={groupRef} position={ITEM_POSITION} scale={SCALE}>
      <primitive object={scene} />
      <pointLight color="#ffe9b0" intensity={1.5} distance={3} />
    </group>
  )
}

export function QuestItem({ ecctrlRef }: { ecctrlRef: RefObject<EcctrlHandle | null> }) {
  const status = useQuestStore((s) => s.status)
  const collectItem = useQuestStore((s) => s.collectItem)

  useFrame(() => {
    if (status !== 'active') return
    const handle = ecctrlRef.current
    if (!handle) return
    if (handle.currPos.distanceTo(ITEM_POSITION) < COLLECT_DISTANCE) {
      collectItem()
    }
  })

  if (status !== 'active') return null
  return <KnifeModel />
}

useGLTF.preload(knifeUrl)
