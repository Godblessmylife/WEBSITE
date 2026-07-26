import { useEffect, useState } from 'react'

const QUERY = '(max-width: 640px)'

function getMatches() {
  if (typeof window === 'undefined') return false
  return window.matchMedia(QUERY).matches
}

// Отдельно от usePerfStore.reduced — тот шире (учитывает ещё и слабый
// CPU на десктопе), а тут нужен именно физический размер экрана: клиент
// попросил "компактнее на мобильном", а не "компактнее там, где и так
// снижено качество".
export function useIsMobileViewport(): boolean {
  const [matches, setMatches] = useState(getMatches)

  useEffect(() => {
    const mql = window.matchMedia(QUERY)
    const onChange = () => setMatches(mql.matches)
    mql.addEventListener('change', onChange)
    return () => mql.removeEventListener('change', onChange)
  }, [])

  return matches
}
