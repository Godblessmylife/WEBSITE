import { useEffect, useRef } from 'react'
import type { RefObject } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import type { EcctrlHandle } from 'ecctrl'
import { minimapPlayerStore } from '@/utils/minimapStore'
import { useQuestStore } from '@/utils/questStore'

// Половина стороны площадки (см. GameWorld.tsx: DesertGround 280x280).
const WORLD_HALF = 140
const MAP_SIZE = 168

function worldToMap(x: number, z: number) {
  const nx = (x + WORLD_HALF) / (WORLD_HALF * 2)
  const nz = (z + WORLD_HALF) / (WORLD_HALF * 2)
  // Z инвертирован: "вперёд" от спавна (+Z, там, где странник и портал)
  // должно оказаться вверху карты, а не внизу - иначе мини-карта читается
  // задом наперёд относительно того, куда игрок обычно идёт первым делом.
  return { left: nx * MAP_SIZE, top: (1 - nz) * MAP_SIZE }
}

type MarkerType = 'npc' | 'portal' | 'shop' | 'decor' | 'mountain'

const MARKER_COLOR: Record<MarkerType, string> = {
  npc: '#ffd76a',
  portal: '#5fd4ff',
  shop: '#7ad1ff',
  decor: '#8effa0',
  mountain: '#a9a9a9',
}

// Мировые координаты (x,z) взяты из MapProps.tsx/Portal.tsx/QuestNpc.tsx -
// это те же числа, что задают position построек, продублированные здесь
// намеренно (см. общий комментарий внизу файла: единая точка правды была
// бы чище, но потребовала бы протаскивать константы между независимо
// монтируемыми деревьями - для статичного списка построек дублирование
// проще и не рискует разъехаться, т.к. эти позиции не планируется менять
// динамически).
const STATIC_MARKERS: { type: MarkerType; x: number; z: number; label: string }[] = [
  { type: 'portal', x: 10, z: -10, label: 'Портал (выход)' },
  { type: 'shop', x: -28, z: 18, label: 'Магазин' },
  { type: 'shop', x: 30, z: -25, label: 'Лавка' },
  { type: 'shop', x: -22, z: -28, label: 'Ракета' },
  { type: 'shop', x: 20, z: 20, label: 'Компьютер' },
  { type: 'decor', x: -60, z: 40, label: 'Зона отдыха' },
  { type: 'decor', x: -70, z: -40, label: 'NPC2' },
  { type: 'decor', x: 60, z: -50, label: 'Автомат' },
  { type: 'decor', x: 60, z: -30, label: 'Автомат 2' },
  { type: 'mountain', x: 85, z: 70, label: 'Гора' },
]

const NPC_MARKER = { x: 2, z: 4 }
const QUEST_ITEM_MARKER = { x: 25, z: -15 }

// Отдельный компонент ВНУТРИ <Canvas> (как GameDebugTracker) - только
// пишет позицию/поворот игрока в vanilla-стор каждый кадр, сам ничего не
// рендерит. Общий Euler вынесен наружу useFrame, чтобы не аллоцировать
// новый объект 60 раз в секунду.
const yawEuler = new THREE.Euler()

export function MinimapTracker({ ecctrlRef }: { ecctrlRef: RefObject<EcctrlHandle | null> }) {
  useFrame(() => {
    const handle = ecctrlRef.current
    if (!handle) return
    yawEuler.setFromQuaternion(handle.currQuat, 'YXZ')
    minimapPlayerStore.setState({ x: handle.currPos.x, z: handle.currPos.z, yaw: yawEuler.y })
  })
  return null
}

// Мини-карта - обычный DOM-оверлей СНАРУЖИ Canvas (рядом с GameDebugHUD).
// Точка игрока обновляется БЕЗ реактивного стейта: подписка на
// minimapPlayerStore мутирует transform у DOM-узла напрямую (см.
// dotRef/arrowRef), в обход React-рендера на каждый кадр - при 24
// бонусах и десятке построек на карте пересчитывать/перерисовывать всё
// дерево 60 раз в секунду ради одной движущейся точки было бы лишней
// нагрузкой ровно там, где клиент просил "оптимизированнее".
export function Minimap() {
  const arrowRef = useRef<HTMLDivElement>(null!)
  const questStatus = useQuestStore((s) => s.status)

  useEffect(() => {
    const unsub = minimapPlayerStore.subscribe((state) => {
      const { left, top } = worldToMap(state.x, state.z)
      const deg = THREE.MathUtils.radToDeg(state.yaw)
      arrowRef.current.style.transform = `translate(${left}px, ${top}px) rotate(${deg}deg)`
    })
    return unsub
  }, [])

  const npcActionable = questStatus === 'not_started' || questStatus === 'ready_to_turn_in'
  const npcPos = worldToMap(NPC_MARKER.x, NPC_MARKER.z)
  const itemPos = worldToMap(QUEST_ITEM_MARKER.x, QUEST_ITEM_MARKER.z)

  return (
    <div
      style={{
        position: 'absolute',
        bottom: 'calc(1.5rem + env(safe-area-inset-bottom))',
        right: 'calc(1.5rem + env(safe-area-inset-right))',
        width: `${MAP_SIZE}px`,
        height: `${MAP_SIZE}px`,
        background: 'rgba(10, 17, 32, 0.7)',
        border: '1px solid rgba(255, 215, 106, 0.5)',
        borderRadius: '12px',
        overflow: 'hidden',
        zIndex: 1001,
        pointerEvents: 'none',
      }}
    >
      {STATIC_MARKERS.map((m, i) => {
        const { left, top } = worldToMap(m.x, m.z)
        return (
          <div
            key={i}
            title={m.label}
            style={{
              position: 'absolute',
              left,
              top,
              width: '7px',
              height: '7px',
              marginLeft: '-3.5px',
              marginTop: '-3.5px',
              borderRadius: m.type === 'mountain' ? '2px' : '50%',
              background: MARKER_COLOR[m.type],
              opacity: 0.85,
            }}
          />
        )
      })}

      {/* Квестодатель - та же точка и для приёма, и для сдачи задания
          (один NPC на весь квест, см. QuestUI.tsx). Пульсирует, когда с
          ним есть что сделать (взять/сдать), спокойный - когда квест уже
          взят и ещё не найден предмет. */}
      <div
        style={{
          position: 'absolute',
          left: npcPos.left,
          top: npcPos.top,
          width: '10px',
          height: '10px',
          marginLeft: '-5px',
          marginTop: '-5px',
          borderRadius: '50%',
          background: MARKER_COLOR.npc,
          boxShadow: npcActionable ? `0 0 0 4px rgba(255, 215, 106, 0.35)` : 'none',
          animation: npcActionable ? 'minimap-npc-pulse 1.6s ease-in-out infinite' : 'none',
        }}
      />

      {questStatus === 'active' && (
        <div
          style={{
            position: 'absolute',
            left: itemPos.left,
            top: itemPos.top,
            width: '8px',
            height: '8px',
            marginLeft: '-4px',
            marginTop: '-4px',
            borderRadius: '2px',
            background: '#ffe9b0',
            transform: 'rotate(45deg)',
            boxShadow: '0 0 0 3px rgba(255, 233, 176, 0.3)',
          }}
        />
      )}

      <div
        ref={arrowRef}
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          width: 0,
          height: 0,
          borderLeft: '5px solid transparent',
          borderRight: '5px solid transparent',
          borderBottom: '9px solid #eafcff',
          marginLeft: '-5px',
          marginTop: '-6px',
          filter: 'drop-shadow(0 0 3px rgba(95, 212, 255, 0.9))',
        }}
      />

      <style>{`
        @keyframes minimap-npc-pulse {
          0%, 100% { box-shadow: 0 0 0 4px rgba(255, 215, 106, 0.35); }
          50% { box-shadow: 0 0 0 8px rgba(255, 215, 106, 0.12); }
        }
      `}</style>
    </div>
  )
}
