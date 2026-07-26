import { useRef } from 'react'
import type { PointerEvent as ReactPointerEvent } from 'react'
import { setSwipeDirection } from '@/utils/swipeControlStore'

// Порог в пикселях, после которого свайп вообще засчитывается - без
// него любое дрожание пальца на месте (без намерения двигаться)
// постоянно дёргало бы направление туда-сюда.
const DEADZONE = 12

// Полноэкранный DOM-слой ПОД HUD-кнопками (z-index ниже, чем у них) -
// сам экран становится "виртуальным джойстиком": палец вниз в любом
// месте, дальше направление свайпа (вверх/вниз/влево/вправо от точки
// касания, не абсолютные координаты) держит соответствующее движение,
// пока палец не оторвался - тот же принцип, что и у обычного
// джойстика ecctrl, только без необходимости попадать пальцем в
// маленький кружок в углу экрана. Заменяет <Joystick/> из ecctrl/input
// по просьбе клиента ("сенсорное управление свайпом").
export function SwipeControls() {
  const startRef = useRef<{ x: number; y: number; pointerId: number } | null>(null)

  const handlePointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (e.pointerType === 'mouse') return
    startRef.current = { x: e.clientX, y: e.clientY, pointerId: e.pointerId }
    e.currentTarget.setPointerCapture(e.pointerId)
  }

  const handlePointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const start = startRef.current
    if (!start || start.pointerId !== e.pointerId) return

    const dx = e.clientX - start.x
    const dy = e.clientY - start.y
    if (Math.abs(dx) < DEADZONE && Math.abs(dy) < DEADZONE) {
      setSwipeDirection(null)
      return
    }

    // Доминирующая ось определяет направление - один свайп не может
    // одновременно значить "вперёд" и "вправо", иначе персонаж будет
    // дёргаться по диагонали от малейшей неточности пальца.
    if (Math.abs(dx) > Math.abs(dy)) {
      setSwipeDirection(dx > 0 ? 'rightward' : 'leftward')
    } else {
      setSwipeDirection(dy > 0 ? 'backward' : 'forward')
    }
  }

  const endTouch = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (startRef.current?.pointerId !== e.pointerId) return
    startRef.current = null
    setSwipeDirection(null)
  }

  return (
    <div
      data-testid="swipe-controls"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={endTouch}
      onPointerCancel={endTouch}
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 999,
        touchAction: 'none',
      }}
    />
  )
}
