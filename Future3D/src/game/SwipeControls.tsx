import { useRef } from 'react'
import type { PointerEvent as ReactPointerEvent } from 'react'
import { setSwipeDirection } from '@/utils/swipeControlStore'
import { useIsMobileViewport } from '@/utils/useIsMobileViewport'

// Порог в пикселях, после которого свайп вообще засчитывается - без
// него любое дрожание пальца на месте (без намерения двигаться)
// постоянно дёргало бы направление туда-сюда.
const DEADZONE = 12

// БАГ (по отзыву клиента: "жму на объект в CRAFT - ничего не происходит"):
// этот div растянут на весь экран поверх канваса (z-index 999). На
// мыши handlePointerDown ничего не делает (return для pointerType===
// 'mouse'), но сам DOM-узел всё равно остаётся ВЕРХНИМ элементом в этой
// точке экрана - клик по нему как по обычному div'у, а не по канвасу
// под ним, значит R3F (слушает события НА САМОМ канвасе) их вообще не
// видит. Это ломало ЛЮБОЙ клик по 3D-объекту (QuestNpc, Grabbable-
// хитбоксы режима CRAFT, карточки портфолио) на мыши - ENTER для машин
// работал, потому что клавиатурные события идут в document, а не
// зависят от того, что находится "под курсором".
//
// Фикс в два приёма:
//  1) На десктопе (мышь) этот слой вообще не нужен - управление там
//     WASD, а не свайпом - поэтому весь div теперь не рендерится, пока
//     !isMobile, и клики беспрепятственно доходят до канваса.
//  2) На телефоне слой всё ещё нужен (свайп - основное движение), но
//     обычный "тап" без сдвига (ниже DEADZONE, то же самое отличие тапа
//     от жеста, что уже используется для направления свайпа) теперь
//     повторно отправляется в РЕАЛЬНЫЙ элемент под пальцем: временно
//     снимаем pointer-events с самого слоя, узнаём, что там
//     (elementFromPoint), эмулируем на нём тот же pointerdown/up/click,
//     который слушает R3F.
export function SwipeControls() {
  const isMobile = useIsMobileViewport()
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
    const start = startRef.current
    startRef.current = null
    setSwipeDirection(null)

    const dx = e.clientX - start.x
    const dy = e.clientY - start.y
    const wasTap = Math.abs(dx) < DEADZONE && Math.abs(dy) < DEADZONE
    if (!wasTap) return

    const layer = e.currentTarget
    layer.style.pointerEvents = 'none'
    const real = document.elementFromPoint(e.clientX, e.clientY)
    layer.style.pointerEvents = 'auto'
    if (!real) return

    const opts = {
      bubbles: true,
      cancelable: true,
      clientX: e.clientX,
      clientY: e.clientY,
      pointerId: e.pointerId,
      pointerType: e.pointerType,
    }
    real.dispatchEvent(new PointerEvent('pointerdown', opts))
    real.dispatchEvent(new PointerEvent('pointerup', opts))
    real.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, clientX: e.clientX, clientY: e.clientY }))
  }

  if (!isMobile) return null

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
