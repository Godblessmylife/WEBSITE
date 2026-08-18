import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
import * as THREE from 'three'
import { useQuestStore } from '@/utils/questStore'
import { Grabbable } from './Grabbable'
import npc1Url from '../models/npc1.glb'

// id для craftStore.overrides - тот же общий механизм масштаба/переноса,
// что и у построек карты (MapProps.tsx, Grabbable.tsx).
const NPC_ID = 'questNpc1'

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
// Дополнение 6 (по отзыву клиента "нельзя увеличить странника"): раньше
// у NPC была СВОЯ отдельная мини-панель масштаба (drei <Html>, БЕЗ
// задержки скрытия — hovered сбрасывался мгновенно по onPointerOut,
// из-за чего кнопки были физически некликабельны: панель пропадала
// раньше, чем курсор до неё долетал). NPC также был единственным
// объектом карты, у которого вообще не было переноса. Теперь NPC — тот
// же самый Grabbable, что и все постройки MapProps.tsx (масштаб/перенос
// через единую ObjectToolbar.tsx). Раньше NPC не оборачивался в
// Grabbable намеренно, чтобы избежать ВТОРОГО хитбокса поверх
// диалогового клика — решено иначе: Grabbable.onClickWhenIdle отдаёт
// диалогу тот же самый хитбокс (обычный клик, пока ничего не в руках, —
// открывает диалог; двойной клик — берёт NPC для переноса, как и у
// любого другого объекта).
// Ориентация модели (rotation) не проверена вживую (нет браузера в этом
// окружении) — если он "стоит спиной" к точке, откуда обычно подходит
// игрок, поправить одной цифрой.
export function QuestNpc() {
  const { scene } = useGLTF(npc1Url)
  const setDialogueOpen = useQuestStore((s) => s.setDialogueOpen)
  const phase = useQuestStore((s) => s.phase)

  return (
    <Grabbable
      id={NPC_ID}
      defaultPosition={NPC_POSITION}
      hitboxSize={HITBOX_SIZE}
      hitboxCenter={HITBOX_CENTER}
      onClickWhenIdle={() => setDialogueOpen(true)}
    >
      <primitive object={scene} />
      {phase === 'not_started' && <QuestMarkerIcon symbol="!" />}
      {phase === 'ready_to_turn_in' && <QuestMarkerIcon symbol="?" />}
    </Grabbable>
  )
}

useGLTF.preload(npc1Url)
