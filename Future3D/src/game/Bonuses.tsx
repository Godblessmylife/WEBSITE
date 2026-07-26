import { useRef, useState } from 'react'
import type { RefObject } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import type { EcctrlHandle } from 'ecctrl'
import { useGameStore } from '@/utils/gameStore'
import { usePerfStore } from '@/utils/perfStore'

const COLLECT_DISTANCE = 1.4
const SCORE_PER_BONUS = 10

// Первые 8 (ближний кластер у спавна) — как было. Остальные 16 добавлены
// по просьбе клиента при увеличении площадки до 280x280 (см. GameWorld.tsx)
// - без них бонусы оставались только в старом радиусе ~10 у спавна, а
// вся остальная (в разы бОльшая) карта не давала повода бегать дальше
// портала. Координаты подобраны с запасом от построек MapProps.tsx
// и горы (Mountain, (85,70), половина стороны ~46) — бонусы не физические
// (только раскast-дистанция подбора), так что лёгкое визуальное
// пересечение с декором не критично, важно не оказаться ВНУТРИ здания.
const BONUS_POSITIONS: [number, number, number][] = [
  [6, 0.9, 6],
  [-6, 0.9, 5],
  [0, 0.9, -8],
  [9, 0.9, 2],
  [-9, 0.9, -6],
  [3, 0.9, 10],
  [-3, 0.9, 9],
  [6, 0.9, -6],
  [35, 0.9, 35],
  [-35, 0.9, 65],
  [55, 0.9, 5],
  [-38, 0.9, -38],
  [45, 0.9, -65],
  [-15, 0.9, 55],
  [15, 0.9, -55],
  [75, 0.9, -10],
  [-75, 0.9, 10],
  [30, 0.9, 60],
  [100, 0.9, -20],
  [-100, 0.9, 60],
  [20, 0.9, -90],
  [-90, 0.9, -20],
  [90, 0.9, 40],
  [-20, 0.9, -100],
]

const bonusWorldPos = new THREE.Vector3()

// ВАЖНО: собранный орб раньше полностью размонтировался (родитель
// возвращал null вместо <BonusOrb>), включая его pointLight. Three.js
// пересчитывает numPointLights (кол-во активных источников света) заново
// на КАЖДЫЙ рендер-кадр по факту обхода сцены (WebGLRenderer.js,
// projectObject: "if (object.visible === false) return" - обрыв обхода
// на невидимом объекте, значит скрытый через visible свет ТОЖЕ выпал бы
// из подсчёта) - а numPointLights входит в ключ кэша WebGL-шейдеров
// (WebGLPrograms.js). Любое изменение этого числа заставляет
// перекомпилировать программу ЗАНОВО для каждого материала в сцене,
// который рендерится после этого кадра - синхронная компиляция GLSL,
// вот и просадка на ~2 секунды именно в момент подбора (и только для
// первых 8 орбов с реальным светом - у остальных 16 light вообще нет).
// Исправлено: свет остаётся смонтированным и visible=true ВСЕГДА (число
// огней в сцене не меняется никогда), гаснет только через intensity=0.
// Видимость самого меша (диск+кольцо) можно спокойно переключать через
// visible - это не влияет на ключ кэша шейдеров, только пропускает
// draw call.
function BonusOrb({
  position,
  withLight,
  collected,
}: {
  position: [number, number, number]
  withLight: boolean
  collected: boolean
}) {
  const groupRef = useRef<THREE.Group>(null!)
  const ringRef = useRef<THREE.Mesh>(null!)

  useFrame(({ clock }, delta) => {
    if (collected) return
    const t = clock.elapsedTime
    groupRef.current.position.y = position[1] + Math.sin(t * 2 + position[0]) * 0.15
    groupRef.current.rotation.y += delta * 1.2
    ringRef.current.rotation.x += delta * 2.4
  })

  return (
    <group ref={groupRef} position={position}>
      <mesh visible={!collected}>
        <icosahedronGeometry args={[0.32, 0]} />
        <meshStandardMaterial
          color="#ffd76a"
          emissive="#ffb23f"
          emissiveIntensity={2}
          roughness={0.3}
          metalness={0.4}
        />
      </mesh>
      <mesh ref={ringRef} visible={!collected}>
        <torusGeometry args={[0.5, 0.04, 8, 24]} />
        <meshBasicMaterial color="#ffe9b0" toneMapped={false} />
      </mesh>
      {withLight && <pointLight color="#ffcf7a" intensity={collected ? 0 : 2} distance={4} />}
    </group>
  )
}

// Бонусы на площадке — простая причина бегать по всему миру, а не только
// до портала. Собранность хранится локальным state (не в общем сторе):
// GameMode целиком размонтируется при выходе из игры (isGameActive),
// так что при следующем заходе компонент создаётся заново и все бонусы
// автоматически на месте — отдельно сбрасывать нечего.
// Динамический pointLight выдаётся только ближнему кластеру у спавна
// (первые 8 из 24) даже при полном качестве - 24 одновременных
// источника света обошлись бы дороже, чем стоит эффект, когда бОльшая
// часть карты всё равно освещена DesertSun. У остальных 16 свечение
// только за счёт emissive-материала (без реального света) - на глаз
// орб всё ещё сияет, просто не подсвечивает песок вокруг себя.
const LIT_BONUS_COUNT = 8

export function Bonuses({ ecctrlRef }: { ecctrlRef: RefObject<EcctrlHandle | null> }) {
  const addScore = useGameStore((s) => s.addScore)
  const reduced = usePerfStore((s) => s.reduced)
  const [collected, setCollected] = useState<boolean[]>(() => BONUS_POSITIONS.map(() => false))
  const collectedRef = useRef(collected)
  collectedRef.current = collected

  useFrame(() => {
    const handle = ecctrlRef.current
    if (!handle) return

    BONUS_POSITIONS.forEach((pos, i) => {
      if (collectedRef.current[i]) return
      bonusWorldPos.set(pos[0], pos[1], pos[2])
      if (handle.currPos.distanceTo(bonusWorldPos) < COLLECT_DISTANCE) {
        collectedRef.current = collectedRef.current.map((c, idx) => (idx === i ? true : c))
        setCollected(collectedRef.current)
        addScore(SCORE_PER_BONUS)
      }
    })
  })

  return (
    <>
      {BONUS_POSITIONS.map((pos, i) => (
        <BonusOrb
          key={i}
          position={pos}
          withLight={!reduced && i < LIT_BONUS_COUNT}
          collected={collected[i]}
        />
      ))}
    </>
  )
}
