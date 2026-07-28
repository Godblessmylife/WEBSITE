import { useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { useFrame } from '@react-three/fiber'
import type { ThreeEvent } from '@react-three/fiber'
import { RigidBody } from '@react-three/rapier'
import * as THREE from 'three'
import { useCraftStore, craftGhostStore } from '@/utils/craftStore'
import { useDriveStore } from '@/utils/driveStore'

// Оборачивает любую постройку MapProps.tsx в "берущийся" объект режима
// разработчика (см. craftStore.ts). Пока active=false - ведёт себя как
// обычный RigidBody (та же структура: снаружи RigidBody, внутри
// коллайдер+модель), никакой разницы с "до Grabbable".
//
// key={position.join(',')} на RigidBody - "fixed"-тела в rapier не
// пересчитывают трансформ сами при смене position-пропа после монтирования
// (задуманы как статичные), поэтому единственный надёжный способ
// физически переставить объект - размонтировать/смонтировать RigidBody
// заново на новом месте. Это происходит только в момент "поставить"
// (редкое событие, не каждый кадр), так что цена пересоздания ничтожна.
//
// Y (высота) НЕ переставляется через drag - только X/Z, взятые из
// проекции курсора на плоскость земли (CraftModeController.tsx);
// исходный вертикальный оффсет объекта (проверенный по bbox при
// добавлении) сохраняется как есть.
//
// hitboxSize/hitboxCenter - те же числа, что уже посчитаны для
// CuboidCollider каждого объекта (args - половины сторон, у boxGeometry
// нужны полные, отсюда *2). ВАЖНО, почему это отдельный invisible mesh,
// а не обработчики прямо на group с самой моделью (так было в первой
// версии): наличие ЛЮБОГО pointer-обработчика на объекте включает для
// него raycast на КАЖДОЕ движение мыши по канвасу — ВСЕГДА, даже когда
// craft выключен (ранний return внутри обработчика тут не помогает, он
// останавливает только ЛОГИКУ, но не сам raycast, который отрабатывает
// раньше). С крупной/детальной геометрией (машины после увеличения,
// Shop с scale=150 и т.п.) это оказалось катастрофически дорого —
// проверено численно (тайминг между вызовами вырос в 5-6 раз при любом
// движении курсора по экрану). Простой бокс (12 треугольников) вместо
// детальной модели, да ещё и существующий в сцене ТОЛЬКО пока craft
// активен, возвращает стоимость к нулю в обычном режиме игры — тот же
// приём "невидимый хитбокс поверх модели", что и в QuestNpc.tsx, только
// там это было для точности клика, здесь — в первую очередь для
// производительности.
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
  const active = useCraftStore((s) => s.active)
  const heldId = useCraftStore((s) => s.heldId)
  const override = useCraftStore((s) => s.overrides[id])
  const position = override ?? defaultPosition
  const isHeld = heldId === id
  // Пока эта же машина "за рулём" (CarDriving.tsx) - её припаркованная
  // (эта) копия прячется, чтобы не было видно две машины разом (одна
  // едет, другая стоит на месте, где её взяли). Для объектов, которые
  // никогда не водятся, drivingId просто никогда не совпадёт с их id.
  const isDriven = useDriveStore((s) => s.drivingId === id)
  const [hovered, setHovered] = useState(false)
  const visualRef = useRef<THREE.Group>(null!)

  useFrame((_, delta) => {
    if (!visualRef.current) return
    const targetScale = active && hovered && !heldId ? 1.05 : 1
    const damp = 1 - Math.exp(-10 * delta)
    visualRef.current.scale.setScalar(THREE.MathUtils.lerp(visualRef.current.scale.x, targetScale, damp))
  })

  const onClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation()
    if (isHeld) {
      const ghost = craftGhostStore.getState()
      if (ghost.visible) {
        useCraftStore.getState().place(id, [ghost.x, position[1], ghost.z])
      }
    } else if (!heldId) {
      useCraftStore.getState().pickUp(id)
    }
  }

  return (
    <RigidBody key={position.join(',')} type="fixed" colliders={false} position={position}>
      <group ref={visualRef} visible={!isHeld && !isDriven}>
        {children}
      </group>
      {active && !isDriven && (
        <mesh
          position={hitboxCenter}
          onClick={onClick}
          onPointerOver={(e: ThreeEvent<PointerEvent>) => {
            if (heldId) return
            e.stopPropagation()
            setHovered(true)
            document.body.style.cursor = 'grab'
          }}
          onPointerOut={() => {
            setHovered(false)
            document.body.style.cursor = 'auto'
          }}
        >
          <boxGeometry args={hitboxSize} />
          <meshBasicMaterial visible={false} />
        </mesh>
      )}
    </RigidBody>
  )
}
