import { useEffect, useState } from 'react'

function getIsPortrait() {
  if (typeof window === 'undefined') return false
  return window.innerHeight > window.innerWidth
}

// Простое сравнение сторон окна, а не Screen Orientation API
// (screen.orientation) - тот не везде доступен одинаково (частично не
// поддерживается в Safari iOS в некоторых версиях), а высота/ширина окна
// надёжно и одинаково доступны везде, реагируют на реальный поворот
// устройства через события resize/orientationchange.
export function useIsPortrait(): boolean {
  const [isPortrait, setIsPortrait] = useState(getIsPortrait)

  useEffect(() => {
    const onChange = () => setIsPortrait(getIsPortrait())
    window.addEventListener('resize', onChange)
    window.addEventListener('orientationchange', onChange)
    return () => {
      window.removeEventListener('resize', onChange)
      window.removeEventListener('orientationchange', onChange)
    }
  }, [])

  return isPortrait
}
