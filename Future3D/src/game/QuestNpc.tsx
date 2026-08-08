import { useMemo, useRef, useState } from 'react'
import type { ThreeEvent } from '@react-three/fiber'
import type { CSSProperties } from 'react'
import { useFrame } from '@react-three/fiber'
import { useGLTF, Html } from '@react-three/drei'
import * as THREE from 'three'
import { useQuestStore } from '@/utils/questStore'
import { useCraftStore, MIN_SCALE, MAX_SCALE } from '@/utils/craftStore'
import npc1Url from '../models/npc1.glb'

// id для craftStore.overrides - тот же общий механизм масштаба, что и у
// построек карты (Grabbable.tsx), но БЕЗ самого Grabbable: у NPC уже
// есть свой хитбокс/hover для диалога (см. ниже), и оборачивание в
// Grabbable дало бы ВТОРОЙ, полностью совпадающий по размеру и позиции
// хитбокс поверх первого - stopPropagation в Grabbable.onHitboxClick мог
// бы перехватить клик раньше, чем он дойдёт до диалога (гонка по порядку
// пересечений raycast'а). Проще и надёжнее переиспользовать сам стор
// (setScale не привязан к Grabbable ничем, кроме сигнатуры) и нарисовать
// свою маленькую +/- панель на уже существующем hover.
const NPC_ID = 'questNpc1'
const SCALE_STEP = 0.1

const resizePanelStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '0.5rem',
  padding: '0.45rem 0.7rem',
  background: 'rgba(10, 17, 32, 0.88)',
  border: '1px solid rgba(255, 215, 106, 0.55)',
  borderRadius: '999px',
  fontFamily: "'Orbitron', sans-serif",
  whiteSpace: 'nowrap',
  pointerEvents: 'auto',
  cursor: 'default',
}

const resizeButtonStyle: CSSProperties = {
  width: '1.6rem',
  height: '1.6rem',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: 0,
  background: 'rgba(255, 215, 106, 0.15)',
  border: '1px solid rgba(255, 215, 106, 0.6)',
  borderRadius: '50%',
  color: '#ffe9b0',
  fontFamily: "'Orbitron', sans-serif",
  fontSize: '0.9rem',
  lineHeight: 1,
  cursor: 'pointer',
  touchAction: 'manipulation',
}

const resizePercentStyle: CSSProperties = {
  color: '#ffe9b0',
  fontSize: '0.68rem',
  minWidth: '2.6rem',
  textAlign: 'center',
}

// x=2 (не 0) намеренно: камера смотрит от игрока вдоль его локальной
// оси вперёд (GameCamera.tsx), и NPC ровно на этой оси на споне
// оказывался визуально точно за головой персонажа - подтверждено
// скриншотом (quest2-after-npc-click.png), клик по хитбоксу при этом
// работал (диалог открывался), но сам NPC был не виден. Сдвиг в сторону
// решает occlusion, не трогая логику клика/диалога.
const NPC_POSITION: [number, number, number] = [2, 0.24626, 4]

// bbox исходника (ДО gltf-transform optimize — см. подробное объяснение
// в MapProps.tsx/Npc2Decor): (-0.51,-0.246,-0.623) .. (0.511,1.722,0.313).
// half-extents и локальный центр для невидимого хитбокса клика — сама
// модель не участвует в рейкасте напрямую (сложная геометрия иногда
// даёт дыры в raycast-попаданиях), поэтому клик ловит отдельный
// прозрачный box поверх неё, того же размера, что и bbox.
const HITBOX_SIZE: [number, number, number] = [1.022, 1.968, 0.936]
const HITBOX_CENTER: [number, number, number] = [0, 0.738, -0.155]

// Плавающая иконка "!"/"?" над головой — тот же приём с текстурой на
// canvas, что и у START-плашки (GameEntry.tsx), но на THREE.Sprite (сам
// всегда развёрнут к камере, без ручного billboard-расчёта). "!" —
// доступен новый квест (WoW-конвенция), "?" — квест выполнен, готов к
// сдаче. Обе текстуры генерируются один раз (useMemo), переключение —
// просто смена видимого спрайта, без пересоздания canvas каждый кадр.
// По отзыву клиента "сделать больше и чтобы написалось" - холст выше
// (добавлена строка подписи под символом) и весь спрайт крупнее, чтобы
// издалека было понятно, что это именно квест, а не просто светящийся
// значок непонятного назначения.
const ICON_LABEL: Record<'!' | '?', string> = {
  '!': 'КВЕСТ',
  '?': 'СДАТЬ КВЕСТ',
}

function createIconTexture(symbol: '!' | '?'): THREE.CanvasTexture {
  const canvas = document.createElement('canvas')
  canvas.width = 160
  canvas.height = 200
  const ctx = canvas.getContext('2d')!

  const glow = ctx.createRadialGradient(80, 80, 4, 80, 80, 80)
  glow.addColorStop(0, 'rgba(255, 215, 106, 0.5)')
  glow.addColorStop(1, 'rgba(255, 215, 106, 0)')
  ctx.fillStyle = glow
  ctx.fillRect(0, 0, 160, 160)

  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillStyle = '#ffe9b0'
  ctx.shadowColor = '#ffd76a'
  ctx.shadowBlur = 20

  ctx.font = 'bold 110px sans-serif'
  ctx.fillText(symbol, 80, 85)

  ctx.font = 'bold 22px sans-serif'
  ctx.shadowBlur = 10
  ctx.fillText(ICON_LABEL[symbol], 80, 178)

  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  return texture
}

function QuestMarkerIcon({ symbol }: { symbol: '!' | '?' }) {
  const spriteRef = useRef<THREE.Sprite>(null!)
  const texture = useMemo(() => createIconTexture(symbol), [symbol])

  useFrame(({ clock }) => {
    spriteRef.current.position.y = 2.5 + Math.sin(clock.elapsedTime * 2.4) * 0.08
  })

  return (
    <sprite ref={spriteRef} position={[0, 2.5, 0]} scale={[1, 1.25, 1]}>
      <spriteMaterial map={texture} transparent />
    </sprite>
  )
}

// NPC, у которого берут/сдают квест кликом — как в World of Warcraft.
// Ориентация модели (rotation) не проверена вживую (нет браузера в этом
// окружении) — если он "стоит спиной" к точке, откуда обычно подходит
// игрок, поправить одной цифрой.
export function QuestNpc() {
  const [hovered, setHovered] = useState(false)
  const { scene } = useGLTF(npc1Url)
  const setDialogueOpen = useQuestStore((s) => s.setDialogueOpen)
  const phase = useQuestStore((s) => s.phase)
  const scaleMultiplier = useCraftStore((s) => s.overrides[NPC_ID]?.scale ?? 1)

  const onClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation()
    setDialogueOpen(true)
  }

  return (
    <group position={NPC_POSITION}>
      {/* Модель, хитбокс и маркер квеста масштабируются вместе (та же
          логика, что в Grabbable.tsx) - хитбокс клика должен расти вместе
          с моделью, иначе на увеличенном NPC клик мимо новой видимой
          границы просто не сработает. */}
      <group scale={scaleMultiplier}>
        <primitive object={scene} />
        <mesh
          position={HITBOX_CENTER}
          onClick={onClick}
          onPointerOver={() => {
            setHovered(true)
            document.body.style.cursor = 'pointer'
          }}
          onPointerOut={() => {
            setHovered(false)
            document.body.style.cursor = 'auto'
          }}
        >
          <boxGeometry args={HITBOX_SIZE} />
          <meshBasicMaterial visible={false} />
        </mesh>
        {/* лёгкая подсветка при наведении — подсказка, что объект кликабелен */}
        {hovered && (
          <mesh position={[0, 1.9, 0]}>
            <coneGeometry args={[0.12, 0.22, 4]} />
            <meshBasicMaterial color="#ffd76a" toneMapped={false} />
          </mesh>
        )}
        {phase === 'not_started' && <QuestMarkerIcon symbol="!" />}
        {phase === 'ready_to_turn_in' && <QuestMarkerIcon symbol="?" />}
        {/* По просьбе клиента - размер NPC можно увеличить/уменьшить,
            та же панель +/-, что и у обычных построек (Grabbable.tsx). */}
        {hovered && (
          <Html position={[0, HITBOX_CENTER[1] + HITBOX_SIZE[1] / 2 + 0.6, HITBOX_CENTER[2]]} center distanceFactor={8}>
            <div style={resizePanelStyle}>
              <button
                style={resizeButtonStyle}
                onClick={() => useCraftStore.getState().setScale(NPC_ID, NPC_POSITION, scaleMultiplier - SCALE_STEP)}
                disabled={scaleMultiplier <= MIN_SCALE}
                aria-label="Уменьшить"
              >
                −
              </button>
              <span style={resizePercentStyle}>{Math.round(scaleMultiplier * 100)}%</span>
              <button
                style={resizeButtonStyle}
                onClick={() => useCraftStore.getState().setScale(NPC_ID, NPC_POSITION, scaleMultiplier + SCALE_STEP)}
                disabled={scaleMultiplier >= MAX_SCALE}
                aria-label="Увеличить"
              >
                +
              </button>
            </div>
          </Html>
        )}
      </group>
    </group>
  )
}

useGLTF.preload(npc1Url)
