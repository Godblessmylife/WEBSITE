import { useMemo, useRef, useState } from 'react'
import type { ThreeEvent } from '@react-three/fiber'
import { useFrame } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
import * as THREE from 'three'
import { useQuestStore } from '@/utils/questStore'
import npc1Url from '../models/npc1.glb'

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
function createIconTexture(symbol: '!' | '?'): THREE.CanvasTexture {
  const canvas = document.createElement('canvas')
  canvas.width = 128
  canvas.height = 128
  const ctx = canvas.getContext('2d')!

  const glow = ctx.createRadialGradient(64, 64, 4, 64, 64, 64)
  glow.addColorStop(0, 'rgba(255, 215, 106, 0.5)')
  glow.addColorStop(1, 'rgba(255, 215, 106, 0)')
  ctx.fillStyle = glow
  ctx.fillRect(0, 0, 128, 128)

  ctx.font = 'bold 88px sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillStyle = '#ffe9b0'
  ctx.shadowColor = '#ffd76a'
  ctx.shadowBlur = 18
  ctx.fillText(symbol, 64, 68)

  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  return texture
}

function QuestMarkerIcon({ symbol }: { symbol: '!' | '?' }) {
  const spriteRef = useRef<THREE.Sprite>(null!)
  const texture = useMemo(() => createIconTexture(symbol), [symbol])

  useFrame(({ clock }) => {
    spriteRef.current.position.y = 2.25 + Math.sin(clock.elapsedTime * 2.4) * 0.08
  })

  return (
    <sprite ref={spriteRef} position={[0, 2.25, 0]} scale={[0.6, 0.6, 0.6]}>
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

  const onClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation()
    setDialogueOpen(true)
  }

  return (
    <group position={NPC_POSITION}>
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
    </group>
  )
}

useGLTF.preload(npc1Url)
