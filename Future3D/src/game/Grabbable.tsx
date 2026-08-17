import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { useFrame } from '@react-three/fiber'
import type { ThreeEvent } from '@react-three/fiber'
import { RigidBody } from '@react-three/rapier'
import * as THREE from 'three'
import { useCraftStore, craftGhostStore } from '@/utils/craftStore'
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
// Дополнение 6: панель "Переместить/масштаб" больше НЕ рисуется здесь -
// по отзыву клиента она была спроецирована в 3D над объектом (drei
// <Html>) и "убегала", когда курсор двигался к ней самой (onPointerOut
// хитбокса срабатывал раньше, чем курсор долетал до кнопок). Вся эта
// панель (стили/press-and-hold масштаба) переехала в единую фиксированную
// нижнюю ObjectToolbar.tsx, которая не привязана к экранной проекции
// объекта и поэтому не может "убежать". Grabbable.tsx теперь только
// определяет hover/move и сообщает об этом в craftStore.ts (hoveredId).
const HIDE_DELAY_MS = 220

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

  // Реестр "родных" позиций объектов (craftStore.ts, defaultPositions) -
  // нужен единой ObjectToolbar.tsx, у которой нет собственного пропа
  // defaultPosition для КАЖДОГО объекта карты. Регистрируется один раз на
  // id - defaultPosition для данного объекта по смыслу не меняется за
  // время его жизни (меняются только overrides поверх него).
  useEffect(() => {
    useCraftStore.getState().registerDefaultPosition(id, defaultPosition)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  useEffect(
    () => () => {
      if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current)
      // Объект размонтировался, пока был наведён (например, машина уехала
      // из-под курсора) - не оставляем чужой id висеть в сторе навсегда.
      if (useCraftStore.getState().hoveredId === id) useCraftStore.getState().setHoveredId(null)
    },
    [id],
  )

  // Сброс курсора, когда перенос закончился (пока он идёт, useFrame ниже
  // каждый кадр держит его 'grabbing' сам, независимо от hover).
  useEffect(() => {
    if (!isMoving) document.body.style.cursor = hovered ? 'pointer' : 'auto'
  }, [isMoving, hovered])

  // hoveredId в сторе - теперь "липкий" выбор объекта для ObjectToolbar.tsx
  // (единая нижняя панель), а НЕ сиюминутное состояние наведения: он
  // выставляется здесь сразу при наведении, но НЕ сбрасывается автоматом
  // при уходе курсора с объекта. Раньше именно это "не пропадать" не
  // соблюдалось - когда курсор уходил с объекта К САМОЙ панели (она внизу
  // экрана, физически далеко от объекта), 220мс-таймер успевал сбросить
  // выбор раньше, чем курсор долетал до кнопок - воспроизводило ту же
  // жалобу клиента ("трудно поймать"), просто в новом месте. Явный сброс
  // выбора - клик по пустому месту карты (GameMode.tsx, onPointerMissed)
  // или наведение на ДРУГОЙ объект (тогда сюда просто придёт новый id).
  const showPanel = () => {
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current)
      hideTimeoutRef.current = null
    }
    setHovered(true)
    useCraftStore.getState().setHoveredId(id)
  }
  // Задержка здесь влияет ТОЛЬКО на локальный визуальный "bounce"
  // (scaleGroupRef ниже) и курсор мыши - косметика самого объекта, не
  // связана с видимостью ObjectToolbar.tsx.
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
  // сперва наводить курсор и жать "Переместить" в ObjectToolbar.tsx. Кнопка
  // там никуда не делась (доступна, когда включён режим "Курсор") - это
  // ДОПОЛНИТЕЛЬНЫЙ, более быстрый способ того же самого действия
  // (startMoving сам по себе не даёт схватить второй объект, пока первый
  // не поставлен - см. craftStore.ts).
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
        </group>
      </group>
    </RigidBody>
  )
}
