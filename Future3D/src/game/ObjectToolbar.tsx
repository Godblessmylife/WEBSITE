import { useEffect, useRef } from 'react'
import type { CSSProperties } from 'react'
import { useCraftStore, MIN_SCALE, MAX_SCALE } from '@/utils/craftStore'
import { useIsMobileViewport } from '@/utils/useIsMobileViewport'
import { minimapPlayerStore } from '@/utils/minimapStore'

// Дополнение 6 (по отзыву клиента): раньше кнопка "Переместить" и шкала
// масштаба рисовались прямо у Grabbable.tsx как drei <Html>, спроецированные
// В 3D над объектом - "трудно поймать курсором, пропадает при наведении на
// само окошко". Причина - проекция двигается вместе с объектом/камерой, а
// onPointerOut хитбокса срабатывал раньше, чем курсор долетал до кнопок.
// Эта панель - ОДНА штука на весь экран, в обычном DOM (не drei <Html>,
// не привязана к 3D-координатам объекта) - физически не может "убежать".
// Показывается только когда включён режим "Курсор" (moveModeEnabled,
// GameMode.tsx) И что-то наведено/переносится - вне этого режима джойстик
// и так перехватывает тач-события первым (см. craftStore.ts).
const SCALE_STEP = 0.1
const HOLD_START_DELAY_MS = 350
const HOLD_REPEAT_MS = 80

const panelStyle: CSSProperties = {
  position: 'absolute',
  left: '50%',
  transform: 'translateX(-50%)',
  display: 'flex',
  alignItems: 'center',
  gap: '0.85rem',
  padding: '0.55rem 1rem',
  background: 'rgba(10, 17, 32, 0.88)',
  border: '1px solid rgba(95, 212, 255, 0.55)',
  borderRadius: '999px',
  fontFamily: "'Orbitron', sans-serif",
  whiteSpace: 'nowrap',
  zIndex: 1001,
}

const moveButtonStyle: CSSProperties = {
  padding: '0.4rem 1.1rem',
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

// "Повернуть к герою" (по просьбе клиента "модели поворачиваются в
// направлении куда смотрит герой") - однокликовая привязка поворота
// объекта к текущей позиции игрока, а не непрерывное автоследование
// (постоянный авто-разворот выглядел бы странно для статичных построек
// типа магазина/горы). Доступна для ЛЮБОГО объекта, включая movable=false
// (Rocket/SlotMachine) - поворот не трогает позицию, квестам не мешает.
const rotateButtonStyle: CSSProperties = {
  padding: '0.4rem 0.9rem',
  background: 'rgba(255, 215, 106, 0.15)',
  border: '1px solid rgba(255, 215, 106, 0.6)',
  borderRadius: '999px',
  color: '#ffe9b0',
  fontFamily: "'Orbitron', sans-serif",
  fontSize: '0.72rem',
  cursor: 'pointer',
  touchAction: 'manipulation',
}

const resizeButtonStyle: CSSProperties = {
  width: '2.1rem',
  height: '2.1rem',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: 0,
  background: 'rgba(95, 212, 255, 0.15)',
  border: '1px solid rgba(95, 212, 255, 0.6)',
  borderRadius: '50%',
  color: '#eafcff',
  fontFamily: "'Orbitron', sans-serif",
  fontSize: '1.05rem',
  lineHeight: 1,
  cursor: 'pointer',
  touchAction: 'manipulation',
}

export function ObjectToolbar() {
  const moveModeEnabled = useCraftStore((s) => s.moveModeEnabled)
  const hoveredId = useCraftStore((s) => s.hoveredId)
  const movingId = useCraftStore((s) => s.movingId)
  // movingId в приоритете над hoveredId - пока объект реально переносят,
  // панель должна управлять именно им, даже если курсор в этот момент
  // проходит над каким-то ДРУГИМ объектом на пути.
  const activeId = movingId ?? hoveredId
  const override = useCraftStore((s) => (activeId ? s.overrides[activeId] : undefined))
  const defaultPosition = useCraftStore((s) => (activeId ? s.defaultPositions[activeId] : undefined))
  // По умолчанию true - объекты, зарегистрированные ДО появления этого
  // поля (или в принципе без явного movable={false}), остаются
  // перемещаемыми, как и раньше (см. Grabbable.tsx/craftStore.ts).
  const isMovable = useCraftStore((s) => (activeId ? (s.movableIds[activeId] ?? true) : true))
  const isMobile = useIsMobileViewport()

  const holdTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const holdIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(
    () => () => {
      if (holdTimeoutRef.current) clearTimeout(holdTimeoutRef.current)
      if (holdIntervalRef.current) clearInterval(holdIntervalRef.current)
    },
    [],
  )

  const stopScaleHold = () => {
    if (holdTimeoutRef.current) {
      clearTimeout(holdTimeoutRef.current)
      holdTimeoutRef.current = null
    }
    if (holdIntervalRef.current) {
      clearInterval(holdIntervalRef.current)
      holdIntervalRef.current = null
    }
  }

  // Один шаг сразу (обычный тап), затем после паузы - быстрый повтор,
  // пока кнопка удержана. Читает АКТУАЛЬНОЕ состояние из стора на каждый
  // шаг (activeId мог теоретически смениться за время удержания).
  const startScaleHold = (step: number) => {
    stopScaleHold()
    const applyStep = () => {
      const id = useCraftStore.getState().movingId ?? useCraftStore.getState().hoveredId
      if (!id) {
        stopScaleHold()
        return
      }
      const state = useCraftStore.getState()
      const current = state.overrides[id]?.scale ?? 1
      const fallbackPosition = state.defaultPositions[id] ?? [0, 0, 0]
      state.setScale(id, fallbackPosition, current + step)
      if (current + step <= MIN_SCALE || current + step >= MAX_SCALE) stopScaleHold()
    }
    applyStep()
    holdTimeoutRef.current = setTimeout(() => {
      holdIntervalRef.current = setInterval(applyStep, HOLD_REPEAT_MS)
    }, HOLD_START_DELAY_MS)
  }

  const visible = moveModeEnabled && activeId !== null
  if (!visible || !activeId) return null

  const position = override?.position ?? defaultPosition ?? [0, 0, 0]
  const scaleMultiplier = override?.scale ?? 1
  const isMoving = movingId === activeId

  return (
    <div
      style={{
        ...panelStyle,
        bottom: isMobile ? 'calc(7rem + env(safe-area-inset-bottom))' : 'calc(9rem + env(safe-area-inset-bottom))',
      }}
    >
      {isMovable && (
        <button
          style={{
            ...moveButtonStyle,
            background: isMoving ? 'rgba(95, 212, 255, 0.85)' : moveButtonStyle.background,
            color: isMoving ? '#04121c' : moveButtonStyle.color,
          }}
          disabled={isMoving}
          onClick={() => useCraftStore.getState().startMoving(activeId, position[1])}
        >
          {isMoving ? 'Переносится...' : 'Переместить'}
        </button>
      )}
      <button
        style={rotateButtonStyle}
        onClick={() => {
          const hero = minimapPlayerStore.getState()
          const dx = hero.x - position[0]
          const dz = hero.z - position[2]
          // Ничего не делаем, если объект и герой практически в одной
          // точке - направление становится неопределённым (0/0).
          if (Math.abs(dx) < 0.001 && Math.abs(dz) < 0.001) return
          const angle = Math.atan2(dx, dz)
          const fallbackPosition = defaultPosition ?? [0, 0, 0]
          useCraftStore.getState().setRotationY(activeId, fallbackPosition, angle)
        }}
      >
        ↻ К герою
      </button>
      <div style={scaleRowStyle}>
        <button
          style={resizeButtonStyle}
          onPointerDown={() => startScaleHold(-SCALE_STEP)}
          onPointerUp={stopScaleHold}
          onPointerLeave={stopScaleHold}
          onPointerCancel={stopScaleHold}
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
          onChange={(e) => {
            const fallbackPosition = defaultPosition ?? [0, 0, 0]
            useCraftStore.getState().setScale(activeId, fallbackPosition, Number(e.currentTarget.value) / 100)
          }}
          style={{ accentColor: '#5fd4ff', cursor: 'pointer', width: '84px' }}
        />
        <button
          style={resizeButtonStyle}
          onPointerDown={() => startScaleHold(SCALE_STEP)}
          onPointerUp={stopScaleHold}
          onPointerLeave={stopScaleHold}
          onPointerCancel={stopScaleHold}
          disabled={scaleMultiplier >= MAX_SCALE}
          aria-label="Увеличить"
        >
          +
        </button>
        <span style={scalePercentStyle}>{Math.round(scaleMultiplier * 100)}%</span>
      </div>
    </div>
  )
}
