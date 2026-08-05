import { useRef, useState } from 'react'
import type { CSSProperties, PointerEvent as ReactPointerEvent } from 'react'
import { useJoystickStore } from 'ecctrl/input'

const KNOB_RADIUS = 50

// По отзыву клиента ecctrl-джойстик стоял СТАТИЧНО в одном углу - палец
// приходилось искать в конкретной точке экрана, а не просто ткнуть
// "куда попало" в зоне ходьбы/вождения. Стандартный ecctrl <Joystick>
// (ecctrl/input) на это не рассчитан - его собственный onPointerDown
// считает отклонение от ЦЕНТРА уже смонтированного элемента, который
// должен существовать заранее по фиксированным CSS-координатам.
//
// Вместо него - невидимая зона-ловушка (zoneStyle, задаётся снаружи -
// GameMode.tsx), которая занимает область экрана, отведённую под
// джойстик, но САМ визуальный круг рисуется только после первого касания,
// центрированный ровно на точке касания (см. origin). Читает то же самое
// движение через useJoystickStore.setJoystick/resetJoystick (ecctrl/input) -
// PlayerCharacter.tsx/CarDriving.tsx уже читают именно этот стор и не
// знают и не должны знать, что физический ecctrl-компонент был заменён.
export function DynamicJoystick({ id, zoneStyle }: { id: string; zoneStyle: CSSProperties }) {
  const [origin, setOrigin] = useState<{ x: number; y: number } | null>(null)
  const knobRef = useRef<HTMLDivElement>(null)
  const pointerIdRef = useRef<number | null>(null)

  const updateKnob = (clientX: number, clientY: number, originX: number, originY: number) => {
    let dx = clientX - originX
    let dy = clientY - originY
    const distance = Math.hypot(dx, dy)
    if (distance > KNOB_RADIUS) {
      dx *= KNOB_RADIUS / distance
      dy *= KNOB_RADIUS / distance
    }
    if (knobRef.current) {
      knobRef.current.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`
    }
    useJoystickStore.getState().setJoystick(dx / KNOB_RADIUS, -dy / KNOB_RADIUS, id)
  }

  const handlePointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId)
    pointerIdRef.current = e.pointerId
    setOrigin({ x: e.clientX, y: e.clientY })
  }

  const handlePointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (pointerIdRef.current !== e.pointerId) return
    // origin ещё не попал в этот же рендер (React batching) - страховка,
    // реально почти никогда не сработает, т.к. setOrigin в pointerdown
    // происходит на том же событии, что и первый pointermove.
    if (!origin) return
    updateKnob(e.clientX, e.clientY, origin.x, origin.y)
  }

  const endTouch = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (pointerIdRef.current !== e.pointerId) return
    pointerIdRef.current = null
    setOrigin(null)
    useJoystickStore.getState().resetJoystick(id)
  }

  return (
    <div
      style={{
        position: 'fixed',
        touchAction: 'none',
        userSelect: 'none',
        WebkitUserSelect: 'none',
        ...zoneStyle,
      }}
      onContextMenu={(e) => e.preventDefault()}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={endTouch}
      onPointerCancel={endTouch}
    >
      {origin && (
        <div
          style={{
            position: 'fixed',
            left: origin.x,
            top: origin.y,
            width: '100px',
            height: '100px',
            transform: 'translate(-50%, -50%)',
            borderRadius: '50%',
            background: 'rgba(10, 17, 32, 0.55)',
            border: '2px solid rgba(95, 212, 255, 0.6)',
            pointerEvents: 'none',
          }}
        >
          <div
            ref={knobRef}
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              width: '70px',
              height: '70px',
              transform: 'translate(-50%, -50%)',
              borderRadius: '50%',
              background: 'rgba(95, 212, 255, 0.85)',
            }}
          />
        </div>
      )}
    </div>
  )
}
