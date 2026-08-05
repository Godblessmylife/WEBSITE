import { useEffect, useState } from 'react'

const QUERY = '(pointer: coarse)'

function getMatches() {
  if (typeof window === 'undefined') return false
  return window.matchMedia(QUERY).matches
}

// Отдельно от useIsMobileViewport (тот проверяет ШИРИНУ экрана, "(max-
// width: 640px)") - для управления в игре ширина не годится: телефон в
// landscape (после поворота, см. RotateDevicePrompt.tsx) обычно ШИРЕ
// 640px (например, 844px у iPhone в альбомной ориентации), и
// useIsMobileViewport перестал бы считать его мобильным ровно в тот
// момент, когда игрок повернул телефон, чтобы играть - джойстики
// пропали бы именно тогда, когда они нужны. "(pointer: coarse)"
// определяет тип УКАЗАТЕЛЯ устройства (палец/мышь), а не текущий размер
// окна - не зависит от поворота экрана.
export function useIsTouchDevice(): boolean {
  const [matches, setMatches] = useState(getMatches)

  useEffect(() => {
    const mql = window.matchMedia(QUERY)
    const onChange = () => setMatches(mql.matches)
    mql.addEventListener('change', onChange)
    return () => mql.removeEventListener('change', onChange)
  }, [])

  return matches
}
