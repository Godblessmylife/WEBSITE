import { useEffect, useRef } from 'react'
import type { CSSProperties } from 'react'
import * as THREE from 'three'
import { useScrollStore } from '@/utils/scrollStore'

// SCALE - тот же коэффициент "доля видимого путешествия от всей
// страницы", что и в cameraPath.ts/JourneyTuner.tsx (progress =
// easeProgress(jf * SCALE)). Продублирован, а не вынесен в общий модуль:
// у cameraPath.ts и этого компонента нет общего родителя в дереве, ради
// которого стоило бы заводить новый файл под одну константу - тот же
// компромисс, на который здесь уже пошли FogController/StratosphereFlash.
const SCALE = 0.758
function jfToProgress(jf: number): number {
  const x = THREE.MathUtils.clamp(jf * SCALE, 0, 1)
  return x * x * (3 - 2 * x)
}

// По просьбе клиента - один слоган, раскрывающийся по частям на
// конкретных процентах ВИДИМОГО путешествия: "3D разработка веб-сайтов
// любой сложности. Выделяйся среди остальных! На всей планете Земля." -
// только первый фрагмент явно просили сделать в две строки ("3D сверху,
// разработка снизу"), остальные - обычным цельным блоком.
interface Phrase {
  centerProgress: number
  big?: string
  text: string
}

const PHRASES: Phrase[] = [
  { centerProgress: jfToProgress(0.21), big: '3D', text: 'разработка' },
  { centerProgress: jfToProgress(0.44), text: 'веб-сайтов любой сложности' },
  { centerProgress: jfToProgress(0.62), text: 'выделяйся среди остальных!' },
  { centerProgress: jfToProgress(0.84), text: 'на всей планете Земля' },
]

// Ширина плавного появления/исчезновения вокруг центра фразы (в
// progress) - при разнице между соседними фразами (21/44/62/84% jf, то
// есть минимум ~18% jf) с запасом не пересекается со следующей.
const HALF_WIDTH = 0.045

function intensityAt(progress: number, center: number): number {
  const fadeIn = THREE.MathUtils.smoothstep(progress, center - HALF_WIDTH, center)
  const fadeOut = 1 - THREE.MathUtils.smoothstep(progress, center, center + HALF_WIDTH)
  return Math.min(fadeIn, fadeOut)
}

const wrapperStyle: CSSProperties = {
  position: 'absolute',
  inset: 0,
  zIndex: 6,
  pointerEvents: 'none',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '0 1.5rem',
}

const phraseStyle: CSSProperties = {
  position: 'absolute',
  opacity: 0,
  textAlign: 'center',
  // "Шрифт как печатная машинка" - тот же моноширинный стек, что уже
  // используется для цифрового табло в FloatingClock.tsx (Courier New -
  // системный шрифт, без новой зависимости ради одного акцента).
  fontFamily: '"Courier New", monospace',
  color: '#eafcff',
  textShadow: '0 0 24px rgba(95, 212, 255, 0.55), 0 0 48px rgba(95, 212, 255, 0.25)',
  letterSpacing: '0.06em',
}

export function JourneyTaglines() {
  const refs = useRef<(HTMLDivElement | null)[]>([])

  useEffect(() => {
    const unsub = useScrollStore.subscribe((state) => {
      const progress = THREE.MathUtils.clamp(state.progress, 0, 1)
      PHRASES.forEach((phrase, i) => {
        const el = refs.current[i]
        if (el) el.style.opacity = String(intensityAt(progress, phrase.centerProgress))
      })
    })
    return unsub
  }, [])

  return (
    <div style={wrapperStyle}>
      {PHRASES.map((phrase, i) => (
        <div key={i} ref={(el) => { refs.current[i] = el }} style={phraseStyle}>
          {phrase.big && (
            <div style={{ fontSize: 'clamp(2.6rem, 8vw, 5rem)', fontWeight: 700, lineHeight: 1.1 }}>
              {phrase.big}
            </div>
          )}
          <div style={{ fontSize: 'clamp(1.3rem, 3.4vw, 2.2rem)', fontWeight: 700, lineHeight: 1.3, textTransform: 'uppercase' }}>
            {phrase.text}
          </div>
        </div>
      ))}
    </div>
  )
}
