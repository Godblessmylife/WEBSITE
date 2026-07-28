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
// TYPE_WIDTH - первая половина окна тратится на "печать" по буквам,
// DISSOLVE_WIDTH - вторая половина на растворение (см. useFrame-подобный
// subscribe ниже) - по отдельной жалобе клиента "почти не видно и пусть
// появляется как печатная машинка, с растворением" - раньше это был
// один общий smoothstep-fade на всё окно сразу, без печати по буквам и
// без отдельного эффекта на исчезновение.
const TYPE_WIDTH = 0.045
const DISSOLVE_WIDTH = 0.05

function splitReveal(phrase: Phrase, fraction: number): { big: string; text: string } {
  const bigLen = phrase.big?.length ?? 0
  const totalLen = bigLen + phrase.text.length
  const revealCount = Math.round(THREE.MathUtils.clamp(fraction, 0, 1) * totalLen)
  return {
    big: phrase.big ? phrase.big.slice(0, Math.min(revealCount, bigLen)) : '',
    text: phrase.text.slice(0, Math.max(0, revealCount - bigLen)),
  }
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
  textShadow: '0 0 30px rgba(95, 212, 255, 0.6), 0 0 60px rgba(95, 212, 255, 0.3)',
  letterSpacing: '0.06em',
  willChange: 'opacity, filter',
}

// Размер увеличен по прямой просьбе клиента ("почти не видно, увеличить
// в разы") - было clamp(2.6rem,8vw,5rem)/clamp(1.3rem,3.4vw,2.2rem),
// теперь текст занимает заметную часть экрана по ширине, как настоящий
// герой-заголовок, а не мелкая подпись поверх сцены.
const bigLineStyle: CSSProperties = { fontSize: 'clamp(5rem, 16vw, 11rem)', fontWeight: 700, lineHeight: 1.05 }
const textLineStyle: CSSProperties = {
  fontSize: 'clamp(2.2rem, 7vw, 5rem)',
  fontWeight: 700,
  lineHeight: 1.2,
  textTransform: 'uppercase',
}

export function JourneyTaglines() {
  const wrapperRefs = useRef<(HTMLDivElement | null)[]>([])
  const bigRefs = useRef<(HTMLDivElement | null)[]>([])
  const textRefs = useRef<(HTMLDivElement | null)[]>([])

  useEffect(() => {
    const unsub = useScrollStore.subscribe((state) => {
      const progress = THREE.MathUtils.clamp(state.progress, 0, 1)
      PHRASES.forEach((phrase, i) => {
        const wrapperEl = wrapperRefs.current[i]
        const bigEl = bigRefs.current[i]
        const textEl = textRefs.current[i]
        if (!wrapperEl) return

        const typeStart = phrase.centerProgress - TYPE_WIDTH
        const typeFraction = THREE.MathUtils.smoothstep(progress, typeStart, phrase.centerProgress)
        const dissolveFraction = THREE.MathUtils.smoothstep(
          progress,
          phrase.centerProgress,
          phrase.centerProgress + DISSOLVE_WIDTH,
        )

        if (typeFraction <= 0) {
          wrapperEl.style.opacity = '0'
          return
        }

        const revealed = splitReveal(phrase, typeFraction)
        const stillTyping = typeFraction < 1 && dissolveFraction <= 0
        if (bigEl) bigEl.textContent = revealed.big + (stillTyping && revealed.text === '' ? '▌' : '')
        if (textEl) textEl.textContent = revealed.text + (stillTyping && revealed.text !== '' ? '▌' : '')

        // "Печатная машинка" - буквы появляются одна за другой, весь блок
        // сразу непрозрачен, пока идёт печать. "Растворение" - отдельная
        // фаза ПОСЛЕ центра: полностью напечатанный текст гаснет через
        // opacity+blur, а не мгновенно исчезает.
        wrapperEl.style.opacity = String(1 - dissolveFraction)
        wrapperEl.style.filter = `blur(${dissolveFraction * 10}px)`
      })
    })
    return unsub
  }, [])

  return (
    <div style={wrapperStyle}>
      {PHRASES.map((phrase, i) => (
        <div key={i} ref={(el) => { wrapperRefs.current[i] = el }} style={phraseStyle}>
          {phrase.big && <div ref={(el) => { bigRefs.current[i] = el }} style={bigLineStyle} />}
          <div ref={(el) => { textRefs.current[i] = el }} style={textLineStyle} />
        </div>
      ))}
    </div>
  )
}
