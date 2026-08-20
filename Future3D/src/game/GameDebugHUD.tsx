import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { useGameDebugStore } from '@/utils/gameDebugStore'
import { useIsMobileViewport } from '@/utils/useIsMobileViewport'

// useFrame работает только внутри дерева Canvas — эта часть монтируется
// рядом с GameCamera и т.п. (внутри <Canvas>) и просто пишет в общий
// zustand-store; сама ничего не рисует.
export function GameDebugTracker() {
  const setFps = useGameDebugStore((s) => s.setFps)
  const frameTimesRef = useRef<number[]>([])

  useFrame((_, delta) => {
    frameTimesRef.current.push(delta)
    if (frameTimesRef.current.length > 30) frameTimesRef.current.shift()
    const avgDelta = frameTimesRef.current.reduce((a, b) => a + b, 0) / frameTimesRef.current.length
    setFps(avgDelta > 0 ? Math.round(1 / avgDelta) : 0)
  })

  return null
}

// По просьбе клиента - только FPS, без остальной диагностики (позиция/
// состояние персонажа/лог ошибок), и без подписи "DEBUG" - раньше окно
// было заметно крупнее и мешало на телефоне, теперь это просто короткая
// строка "FPS: N", не занимающая места на экране. Крах теперь виден на
// собственном экране GameErrorBoundary, а не только здесь - отдельный
// лог ошибок в этом окне больше не нужен.
export function GameDebugHUD() {
  const fps = useGameDebugStore((s) => s.fps)
  const isMobile = useIsMobileViewport()

  return (
    <div
      style={{
        position: 'absolute',
        // По просьбе клиента мини-карта (Minimap.tsx) на мобильном
        // переехала ровно в эту точку (под кнопку "Выход") - FPS сдвинут
        // ещё ниже, под саму карту (168px * scale(0.25) = 42px + отступ),
        // чтобы не перекрываться с ней. На десктопе карта осталась внизу
        // справа, как раньше - формула здесь не меняется.
        top: isMobile
          ? `calc(0.75rem + 2.1rem + 0.5rem + 42px + 0.4rem + env(safe-area-inset-top))`
          : `calc(1.5rem + 2.75rem + 0.5rem + env(safe-area-inset-top))`,
        right: `calc(${isMobile ? '0.75rem' : '1.5rem'} + env(safe-area-inset-right))`,
        padding: isMobile ? '0.15rem 0.4rem' : '0.3rem 0.7rem',
        background: 'rgba(5, 7, 13, 0.6)',
        border: '1px solid rgba(255, 255, 255, 0.15)',
        borderRadius: isMobile ? '6px' : '10px',
        color: '#9db2c9',
        fontFamily: 'monospace',
        fontSize: isMobile ? '0.55rem' : '0.7rem',
        zIndex: 1001,
        pointerEvents: 'none',
      }}
    >
      FPS: {fps}
    </div>
  )
}
