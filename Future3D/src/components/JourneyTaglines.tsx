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
// конкретных процентах ВИДИМОГО путешествия: только первый фрагмент явно
// просили сделать в две строки ("3D сверху, разработка снизу"), остальные
// - обычным цельным блоком. "Выделяйся среди остальных!" заменено по
// отзыву клиента "придумать что-то более оригинальное" - вместо лозунга
// теперь цельная фраза-образ, продолжающая соседние строки по смыслу.
interface Phrase {
  centerProgress: number
  big?: string
  text: string
}

const PHRASES: Phrase[] = [
  { centerProgress: jfToProgress(0.21), big: '3D', text: 'разработка' },
  { centerProgress: jfToProgress(0.44), text: 'веб-сайтов любой сложности' },
  { centerProgress: jfToProgress(0.62), text: 'каких вы ещё не видели' },
  { centerProgress: jfToProgress(0.84), text: 'на всей планете Земля' },
]

// Ширина окна плавного появления/исчезновения вокруг центра фразы (в
// progress) - при разнице между соседними фразами (21/44/62/84% jf, то
// есть минимум ~18% jf) с запасом не пересекается со следующей.
// По отзыву клиента "убрать эффект печатной машинки" - текст теперь
// появляется/пропадает целиком через fade+blur, без печати по буквам.
const FADE_WIDTH = 0.06

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
  fontFamily: '"Courier New", monospace',
  color: '#eafcff',
  textShadow: '0 0 30px rgba(95, 212, 255, 0.6), 0 0 60px rgba(95, 212, 255, 0.3)',
  letterSpacing: '0.06em',
  willChange: 'opacity, filter',
}

// Немного уменьшено по просьбе клиента - было
// clamp(5rem,16vw,11rem)/clamp(2.2rem,7vw,5rem).
const bigLineStyle: CSSProperties = { fontSize: 'clamp(4rem, 13vw, 9rem)', fontWeight: 700, lineHeight: 1.05 }
const textLineStyle: CSSProperties = {
  fontSize: 'clamp(1.8rem, 5.5vw, 4rem)',
  fontWeight: 700,
  lineHeight: 1.2,
  textTransform: 'uppercase',
}

export function JourneyTaglines() {
  const wrapperRefs = useRef<(HTMLDivElement | null)[]>([])

  useEffect(() => {
    const unsub = useScrollStore.subscribe((state) => {
      const progress = THREE.MathUtils.clamp(state.progress, 0, 1)
      PHRASES.forEach((phrase, i) => {
        const wrapperEl = wrapperRefs.current[i]
        if (!wrapperEl) return

        // Плавный подъём до 1 к центру окна, затем плавный спад до 0 -
        // min() двух smoothstep-ов даёт классическую форму "появился,
        // подержался у пика, растворился" одной строкой без веток.
        const fadeIn = THREE.MathUtils.smoothstep(progress, phrase.centerProgress - FADE_WIDTH, phrase.centerProgress)
        const fadeOut = THREE.MathUtils.smoothstep(progress, phrase.centerProgress, phrase.centerProgress + FADE_WIDTH)
        const opacity = Math.min(fadeIn, 1 - fadeOut)

        wrapperEl.style.opacity = String(opacity)
        wrapperEl.style.filter = `blur(${fadeOut * 10}px)`
      })
    })
    return unsub
  }, [])

  return (
    <div style={wrapperStyle}>
      {PHRASES.map((phrase, i) => (
        <div key={i} ref={(el) => { wrapperRefs.current[i] = el }} style={phraseStyle}>
          {phrase.big && <div style={bigLineStyle}>{phrase.big}</div>}
          <div style={textLineStyle}>{phrase.text}</div>
        </div>
      ))}
    </div>
  )
}
