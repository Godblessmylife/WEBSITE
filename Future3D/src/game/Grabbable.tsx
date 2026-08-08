import { useEffect, useRef, useState } from 'react'
import type { ReactNode, CSSProperties } from 'react'
import { useFrame } from '@react-three/fiber'
import type { ThreeEvent } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import { RigidBody } from '@react-three/rapier'
import * as THREE from 'three'
import { useCraftStore, craftGhostStore, MIN_SCALE, MAX_SCALE } from '@/utils/craftStore'
import { useDriveStore } from '@/utils/driveStore'

// Оборачивает любую постройку MapProps.tsx в "берущийся" объект - БЕЗ
// отдельного переключателя "режим CRAFT" (была отдельная кнопка в HUD,
// по отзыву клиента только путала и "не работала"). Теперь: навёл
// курсор на объект - сами появляются кнопка "Переместить" и шкала
// масштаба (проценты); ничего не нужно включать заранее, работает на
// любом объекте карты всегда.
//
// key={position.join(',')} на RigidBody - "fixed"-тела в rapier не
// пересчитывают трансформ сами при смене position-пропа после монтирования
// (задуманы как статичные), поэтому единственный надёжный способ
// физически переставить объект НАВСЕГДА - размонтировать/смонтировать
// RigidBody заново на новом месте (редкое событие - момент клика
// "поставить", не каждый кадр).
//
// Пока объект в процессе переноса, двигается не RigidBody (он остаётся
// на старом месте до самого клика "поставить"), а вложенная group
// (dragGroupRef) - её позицию каждый кадр напрямую мутирует useFrame,
// без React-рендера. Так по экрану в реальном времени двигается САМА
// видимая модель (как кубик в Майнкрафте), а не абстрактный превью-бокс,
// как было в первой версии этой фичи.
//
// hitboxSize/hitboxCenter - размеры отдельного невидимого mesh для
// клика/наведения, а не обработчики прямо на group с самой моделью:
// наличие ЛЮБОГО pointer-обработчика на объекте включает для него
// raycast на КАЖДОЕ движение мыши по канвасу. С крупной/детальной
// геометрией (машины после увеличения, Shop со scale=150 и т.п.) это
// оказалось катастрофически дорого - см. подробности в истории проекта.
// Простой бокс (12 треугольников) вместо детальной модели держит эту
// стоимость на уровне нуля, даже будучи смонтированным всегда (не только
// в каком-то отдельном режиме) - раньше это было ключевой причиной
// вообще городить отдельный тумблер "режим CRAFT", сейчас в нём просто
// нет нужды.
const HIDE_DELAY_MS = 220

const panelStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: '0.55rem',
  padding: '0.6rem 0.85rem',
  background: 'rgba(10, 17, 32, 0.88)',
  border: '1px solid rgba(95, 212, 255, 0.55)',
  borderRadius: '14px',
  fontFamily: "'Orbitron', sans-serif",
  whiteSpace: 'nowrap',
  pointerEvents: 'auto',
  cursor: 'default',
}

const moveButtonStyle: CSSProperties = {
  padding: '0.35rem 1rem',
  background: 'rgba(95, 212, 255, 0.2)',
  border: '1px solid rgba(95, 212, 255, 0.75)',
  borderRadius: '999px',
  color: '#eafcff',
  fontFamily: "'Orbitron', sans-serif",
  fontSize: '0.72rem',
  cursor: 'pointer',
  touchAction: 'manipulation',
}

const scaleRowStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '0.5rem',
}

const scalePercentStyle: CSSProperties = {
  color: '#c8ecff',
  fontSize: '0.68rem',
  minWidth: '2.6rem',
  textAlign: 'center',
}

// Кнопки +/- рядом со слайдером - по отзыву клиента: на телефоне точно
// попасть пальцем в нужную точку узкого слайдера сложно, а дискретный
// шаг кнопкой - нет. Слайдер остаётся (удобен на десктопе с мышью), а
// кнопки - для точной подстройки одним тапом на любом устройстве.
const SCALE_STEP = 0.1
const resizeButtonStyle: CSSProperties = {
  width: '1.6rem',
  height: '1.6rem',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: 0,
  background: 'rgba(95, 212, 255, 0.15)',
  border: '1px solid rgba(95, 212, 255, 0.6)',
  borderRadius: '50%',
  color: '#eafcff',
  fontFamily: "'Orbitron', sans-serif",
  fontSize: '0.9rem',
  lineHeight: 1,
  cursor: 'pointer',
  touchAction: 'manipulation',
}

export function Grabbable({
  id,
  defaultPosition,
  hitboxSize,
  hitboxCenter = [0, 0, 0],
  children,
}: {
  id: string
  defaultPosition: [number, number, number]
  hitboxSize: [number, number, number]
  hitboxCenter?: [number, number, number]
  children: ReactNode
}) {
  const override = useCraftStore((s) => s.overrides[id])
  const movingId = useCraftStore((s) => s.movingId)
  const position = override?.position ?? defaultPosition
  const scaleMultiplier = override?.scale ?? 1
  const isMoving = movingId === id
  const anyoneMoving = movingId !== null
  // Пока эта же машина "за рулём" (CarDriving.tsx) - её припаркованная
  // (эта) копия прячется, включая хитбокс: иначе можно было бы навести
  // курсор на пустое место, где машина стояла, и получить панель
  // "Переместить" для объекта, который прямо сейчас едет в другом месте.
  const isDriven = useDriveStore((s) => s.drivingId === id)

  const [hovered, setHovered] = useState(false)
  const hideTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const dragGroupRef = useRef<THREE.Group>(null!)
  const scaleGroupRef = useRef<THREE.Group>(null!)

  useEffect(
    () => () => {
      if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current)
    },
    [],
  )

  // Сброс курсора, когда перенос закончился (пока он идёт, useFrame ниже
  // каждый кадр держит его 'grabbing' сам, независимо от hover).
  useEffect(() => {
    if (!isMoving) document.body.style.cursor = hovered ? 'pointer' : 'auto'
  }, [isMoving, hovered])

  const showPanel = () => {
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current)
      hideTimeoutRef.current = null
    }
    setHovered(true)
  }
  // Небольшая задержка перед скрытием панели - без неё увести курсор с
  // хитбокса модели НА САМУ панель (которая висит чуть выше) было бы
  // невозможно: onPointerOut срабатывал бы раньше, чем курсор долетит до
  // кнопок, и панель бы исчезала прямо под курсором.
  const scheduleHidePanel = () => {
    hideTimeoutRef.current = setTimeout(() => setHovered(false), HIDE_DELAY_MS)
  }

  useFrame((_, delta) => {
    if (scaleGroupRef.current) {
      const hoverBounce = hovered && !anyoneMoving ? 1.05 : 1
      const targetScale = hoverBounce * scaleMultiplier
      const damp = 1 - Math.exp(-10 * delta)
      scaleGroupRef.current.scale.setScalar(
        THREE.MathUtils.lerp(scaleGroupRef.current.scale.x, targetScale, damp),
      )
    }

    if (!dragGroupRef.current) return
    if (isMoving) {
      const ghost = craftGhostStore.getState()
      if (ghost.visible) {
        dragGroupRef.current.position.set(ghost.x - position[0], 0, ghost.z - position[2])
      }
      document.body.style.cursor = 'grabbing'
    } else if (dragGroupRef.current.position.x !== 0 || dragGroupRef.current.position.z !== 0) {
      dragGroupRef.current.position.set(0, 0, 0)
    }
  })

  const onHitboxClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation()
    if (!isMoving) return
    // Клик прямо по объекту, который сейчас держим, тоже ставит его -
    // на случай, если курсор в момент клика окажется точно над моделью.
    // Основной способ поставить - клик КУДА УГОДНО ещё, см.
    // onPointerMissed в GameMode.tsx.
    const ghost = craftGhostStore.getState()
    if (ghost.visible) {
      useCraftStore.getState().place(id, [ghost.x, position[1], ghost.z])
    }
  }

  // По просьбе клиента: двойной клик/тап сразу хватает объект - не нужно
  // сперва наводить курсор и жать кнопку "Переместить" в панели. Кнопка
  // в панели никуда не делась (быстрый способ на десктопе, доступ к
  // масштабу) - это ДОПОЛНИТЕЛЬНЫЙ, более быстрый способ того же самого
  // действия (startMoving сам по себе не даёт схватить второй объект,
  // пока первый не поставлен - см. craftStore.ts).
  const onHitboxDoubleClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation()
    if (isMoving || anyoneMoving) return
    useCraftStore.getState().startMoving(id, position[1])
  }

  const onHitboxPointerOver = (e: ThreeEvent<PointerEvent>) => {
    if (anyoneMoving) return
    e.stopPropagation()
    showPanel()
  }

  return (
    <RigidBody key={position.join(',')} type="fixed" colliders={false} position={position}>
      <group ref={dragGroupRef}>
        <group ref={scaleGroupRef}>
          <group visible={!isDriven}>{children}</group>
          {!isDriven && (
            <mesh
              position={hitboxCenter}
              onClick={onHitboxClick}
              onDoubleClick={onHitboxDoubleClick}
              onPointerOver={onHitboxPointerOver}
              onPointerOut={scheduleHidePanel}
            >
              <boxGeometry args={hitboxSize} />
              <meshBasicMaterial visible={false} />
            </mesh>
          )}
          {hovered && !anyoneMoving && (
            <Html
              position={[hitboxCenter[0], hitboxCenter[1] + hitboxSize[1] / 2 + 0.5, hitboxCenter[2]]}
              center
              distanceFactor={8}
            >
              <div style={panelStyle} onMouseEnter={showPanel} onMouseLeave={scheduleHidePanel}>
                <button
                  style={moveButtonStyle}
                  onClick={() => useCraftStore.getState().startMoving(id, position[1])}
                >
                  Переместить
                </button>
                <div style={scaleRowStyle}>
                  <button
                    style={resizeButtonStyle}
                    onClick={() =>
                      useCraftStore.getState().setScale(id, defaultPosition, scaleMultiplier - SCALE_STEP)
                    }
                    disabled={scaleMultiplier <= MIN_SCALE}
                    aria-label="Уменьшить"
                  >
                    −
                  </button>
                  <input
                    type="range"
                    min={50}
                    max={200}
                    step={5}
                    value={Math.round(scaleMultiplier * 100)}
                    onChange={(e) =>
                      useCraftStore.getState().setScale(id, defaultPosition, Number(e.currentTarget.value) / 100)
                    }
                    style={{ accentColor: '#5fd4ff', cursor: 'pointer', width: '72px' }}
                  />
                  <button
                    style={resizeButtonStyle}
                    onClick={() =>
                      useCraftStore.getState().setScale(id, defaultPosition, scaleMultiplier + SCALE_STEP)
                    }
                    disabled={scaleMultiplier >= MAX_SCALE}
                    aria-label="Увеличить"
                  >
                    +
                  </button>
                  <span style={scalePercentStyle}>{Math.round(scaleMultiplier * 100)}%</span>
                </div>
              </div>
            </Html>
          )}
        </group>
      </group>
    </RigidBody>
  )
}
