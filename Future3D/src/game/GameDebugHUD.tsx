import { useEffect, useRef, useState } from 'react'
import type { RefObject } from 'react'
import { useFrame } from '@react-three/fiber'
import type { EcctrlHandle } from 'ecctrl'
import { useGameDebugStore } from '@/utils/gameDebugStore'
import { usePerfStore } from '@/utils/perfStore'
import { useIsMobileViewport } from '@/utils/useIsMobileViewport'

const MAX_LOGGED_ERRORS = 3

// useFrame работает только внутри дерева Canvas — эта часть монтируется
// рядом с GameCamera и т.п. (внутри <Canvas>) и просто пишет в общий
// zustand-store; сама ничего не рисует.
export function GameDebugTracker({ ecctrlRef }: { ecctrlRef: RefObject<EcctrlHandle | null> }) {
  const setDebug = useGameDebugStore((s) => s.setDebug)
  const frameTimesRef = useRef<number[]>([])

  useFrame((_, delta) => {
    frameTimesRef.current.push(delta)
    if (frameTimesRef.current.length > 30) frameTimesRef.current.shift()

    const handle = ecctrlRef.current
    const avgDelta = frameTimesRef.current.reduce((a, b) => a + b, 0) / frameTimesRef.current.length
    setDebug({
      fps: avgDelta > 0 ? Math.round(1 / avgDelta) : 0,
      pos: handle ? `${handle.currPos.x.toFixed(1)}, ${handle.currPos.y.toFixed(1)}, ${handle.currPos.z.toFixed(1)}` : 'нет ссылки',
      isMoving: handle?.isMoving ?? false,
      isOnGround: handle?.isOnGround ?? false,
      isFalling: handle?.isFalling ?? false,
    })
  })

  return null
}

// Временный отладочный HUD поверх игры — по явной просьбе клиента следить
// за работоспособностью, пока игра не отполирована окончательно. Ловит
// как необработанные ошибки (window error/unhandledrejection — то, что
// раньше можно было увидеть только через консоль браузера), так и живое
// состояние персонажа из GameDebugTracker. Это обычный DOM-компонент —
// рендерится СНАРУЖИ <Canvas>, поэтому не может сам звать useFrame.
export function GameDebugHUD() {
  const { fps, pos, isMoving, isOnGround, isFalling } = useGameDebugStore()
  const reduced = usePerfStore((s) => s.reduced)
  const isMobile = useIsMobileViewport()
  const [errors, setErrors] = useState<string[]>([])

  useEffect(() => {
    const pushError = (message: string) => {
      setErrors((prev) => [message, ...prev].slice(0, MAX_LOGGED_ERRORS))
    }
    const onError = (e: ErrorEvent) => pushError(e.message || String(e.error))
    const onRejection = (e: PromiseRejectionEvent) => pushError(`unhandled promise: ${String(e.reason)}`)
    window.addEventListener('error', onError)
    window.addEventListener('unhandledrejection', onRejection)
    return () => {
      window.removeEventListener('error', onError)
      window.removeEventListener('unhandledrejection', onRejection)
    }
  }, [])

  return (
    <div
      style={{
        position: 'absolute',
        bottom: `calc(${isMobile ? '0.75rem' : '1.5rem'} + env(safe-area-inset-bottom))`,
        left: `calc(${isMobile ? '0.75rem' : '1.5rem'} + env(safe-area-inset-left))`,
        // По просьбе клиента окно вдвое компактнее на мобильном: padding
        // и maxWidth уменьшены примерно в 2 раза от прежних мобильных
        // значений, fontSize/lineHeight уменьшены чуть меньше (иначе текст
        // стал бы нечитаемым на маленьком экране).
        padding: isMobile ? '0.2rem 0.35rem' : '0.75rem 1rem',
        background: 'rgba(5, 7, 13, 0.75)',
        border: '1px solid rgba(255, 255, 255, 0.15)',
        borderRadius: isMobile ? '6px' : '12px',
        color: '#9db2c9',
        fontFamily: 'monospace',
        fontSize: isMobile ? '0.45rem' : '0.75rem',
        lineHeight: isMobile ? 1.3 : 1.5,
        zIndex: 1001,
        pointerEvents: 'none',
        maxWidth: isMobile ? '105px' : '320px',
      }}
    >
      <div style={{ color: '#5fd4ff' }}>DEBUG</div>
      <div>fps: {fps} | качество: {reduced ? 'снижено' : 'полное'}</div>
      <div>pos: {pos}</div>
      <div>
        moving: {String(isMoving)} | ground: {String(isOnGround)} | falling: {String(isFalling)}
      </div>
      {errors.length > 0 && (
        <div style={{ marginTop: '0.4rem', color: '#ff8a8a' }}>
          {errors.map((err, i) => (
            <div key={i}>⚠ {err}</div>
          ))}
        </div>
      )}
    </div>
  )
}
