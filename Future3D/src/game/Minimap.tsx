import { useEffect, useMemo, useRef } from 'react'
import type { RefObject } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import type { EcctrlHandle } from 'ecctrl'
import { minimapPlayerStore } from '@/utils/minimapStore'
import { useQuestStore } from '@/utils/questStore'
import { useIsMobileViewport } from '@/utils/useIsMobileViewport'

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
  { type: 'portal', x: 10, z: -10, label: 'Портал (в космос)' },
  { type: 'shop', x: -28, z: 18, label: 'Магазин' },
  { type: 'shop', x: 30, z: -25, label: 'Лавка' },
  { type: 'shop', x: -22, z: -28, label: 'Ракета' },
  { type: 'shop', x: 20, z: 20, label: 'Компьютер' },
  { type: 'decor', x: -48, z: 32, label: 'Зона отдыха' },
  { type: 'decor', x: -55, z: -30, label: 'NPC2' },
  { type: 'decor', x: 60, z: -50, label: 'Автомат' },
  { type: 'decor', x: 60, z: -30, label: 'Автомат 2' },
  { type: 'mountain', x: 85, z: 70, label: 'Гора' },
  { type: 'decor', x: -14, z: 6, label: 'Машины' },
  { type: 'decor', x: 22, z: -14, label: 'Остров' },
]

const NPC_MARKER = { x: 2, z: 4 }
// Позиции целей квестов 0/1/2 из questStore.ts (QUESTS) — индекс массива
// совпадает с questIndex. Те же координаты, что и у ножа (QuestItem.tsx),
// ракеты (QuestObjectiveRocket.tsx) и фишки (QuestObjectiveChip.tsx) -
// намеренное дублирование, как и у остальных построек (см. комментарий
// у STATIC_MARKERS выше).
const QUEST_OBJECTIVE_MARKERS = [
  { x: 25, z: -15 },
  { x: -22, z: -28 },
  { x: 60, z: -40 },
]
const MOUNTAIN_MARKER = { x: 85, z: 70 }

// Раньше фон карты был плоской заливкой (rgba тёмно-синего) - по отзыву
// клиента это читалось как "просто синий фон", а не карта местности.
// Тот же приём, что и у DesertGround.createSandTexture (GameWorld.tsx) -
// canvas 2D, песочный градиент + несколько "дюн"-линий - но отдельная,
// уменьшенная копия: тащить сюда 3D-текстуру ради 2D DOM-фона было бы
// лишней связью между никак иначе не связанными модулями. Плюс тёмное
// пятно там, где на карте гора (MOUNTAIN_MARKER) - другой тип рельефа,
// а не тот же песок.
function createMinimapTerrain(): string {
  const canvas = document.createElement('canvas')
  canvas.width = MAP_SIZE
  canvas.height = MAP_SIZE
  const ctx = canvas.getContext('2d')!

  const base = ctx.createLinearGradient(0, 0, MAP_SIZE, MAP_SIZE)
  base.addColorStop(0, '#8a6a3f')
  base.addColorStop(1, '#5f4527')
  ctx.fillStyle = base
  ctx.fillRect(0, 0, MAP_SIZE, MAP_SIZE)

  ctx.globalAlpha = 0.3
  ctx.strokeStyle = '#3d2c18'
  for (let i = 0; i < 9; i++) {
    ctx.lineWidth = 1 + Math.random() * 2
    const y = Math.random() * MAP_SIZE
    ctx.beginPath()
    ctx.moveTo(0, y)
    ctx.bezierCurveTo(
      MAP_SIZE * 0.3,
      y + (Math.random() * 16 - 8),
      MAP_SIZE * 0.6,
      y + (Math.random() * 16 - 8),
      MAP_SIZE,
      y,
    )
    ctx.stroke()
  }
  ctx.globalAlpha = 1

  const mountainPos = worldToMap(MOUNTAIN_MARKER.x, MOUNTAIN_MARKER.z)
  const rockGradient = ctx.createRadialGradient(
    mountainPos.left,
    mountainPos.top,
    2,
    mountainPos.left,
    mountainPos.top,
    26,
  )
  rockGradient.addColorStop(0, 'rgba(120, 120, 128, 0.9)')
  rockGradient.addColorStop(1, 'rgba(120, 120, 128, 0)')
  ctx.fillStyle = rockGradient
  ctx.fillRect(0, 0, MAP_SIZE, MAP_SIZE)

  // Лёгкая виньетка по краям - чтобы точки-маркеры не сливались с
  // текстурой у самой рамки карты.
  const vignette = ctx.createRadialGradient(
    MAP_SIZE / 2,
    MAP_SIZE / 2,
    MAP_SIZE * 0.35,
    MAP_SIZE / 2,
    MAP_SIZE / 2,
    MAP_SIZE * 0.7,
  )
  vignette.addColorStop(0, 'rgba(5, 7, 13, 0)')
  vignette.addColorStop(1, 'rgba(5, 7, 13, 0.55)')
  ctx.fillStyle = vignette
  ctx.fillRect(0, 0, MAP_SIZE, MAP_SIZE)

  return canvas.toDataURL()
}

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
  const questIndex = useQuestStore((s) => s.questIndex)
  const questPhase = useQuestStore((s) => s.phase)
  const terrainUrl = useMemo(() => createMinimapTerrain(), [])
  const isMobile = useIsMobileViewport()

  useEffect(() => {
    const unsub = minimapPlayerStore.subscribe((state) => {
      const { left, top } = worldToMap(state.x, state.z)
      const deg = THREE.MathUtils.radToDeg(state.yaw)
      arrowRef.current.style.transform = `translate(${left}px, ${top}px) rotate(${deg}deg)`
    })
    return unsub
  }, [])

  const npcActionable = questPhase === 'not_started' || questPhase === 'ready_to_turn_in'
  const npcPos = worldToMap(NPC_MARKER.x, NPC_MARKER.z)
  const objectiveMarker = QUEST_OBJECTIVE_MARKERS[questIndex]
  const itemPos = worldToMap(objectiveMarker.x, objectiveMarker.z)

  return (
    <div
      style={{
        position: 'absolute',
        bottom: `calc(${isMobile ? '0.75rem' : '1.5rem'} + env(safe-area-inset-bottom))`,
        right: `calc(${isMobile ? '0.75rem' : '1.5rem'} + env(safe-area-inset-right))`,
        width: `${MAP_SIZE}px`,
        height: `${MAP_SIZE}px`,
        // Масштаб вместо пересчёта MAP_SIZE - вся раскладка маркеров
        // ниже завязана на этой константе (worldToMap), уменьшать сам
        // размер пришлось бы регенерировать текстуру и координаты; scale
        // с origin в правом нижнем углу (там, где карта и закреплена)
        // просто сжимает готовую картинку, не трогая ни одну из формул.
        // Уменьшено с 0.68 до 0.5, затем до 0.38 - клиент повторно просил
        // компактнее на мобильном. Сама карта (WORLD_HALF=140) уже и так
        // показывает ВСЮ игровую территорию целиком, а не её часть -
        // "сделать территорию больше" тут снова означало бы просто
        // увеличить видимый физический размер виджета, то есть отменить
        // само уменьшение, поэтому не трогаю эту часть отдельно.
        transform: isMobile ? 'scale(0.38)' : undefined,
        transformOrigin: 'bottom right',
        backgroundImage: `url(${terrainUrl})`,
        backgroundSize: 'cover',
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
              border: '1px solid rgba(5, 7, 13, 0.6)',
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
          border: '1.5px solid rgba(5, 7, 13, 0.7)',
          boxShadow: npcActionable ? `0 0 0 4px rgba(255, 215, 106, 0.35)` : 'none',
          animation: npcActionable ? 'minimap-npc-pulse 1.6s ease-in-out infinite' : 'none',
        }}
      />

      {questPhase === 'active' && (
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
