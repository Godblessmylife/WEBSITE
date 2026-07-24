import { useSyncExternalStore } from 'react'

// (pointer: coarse) — стандартный сигнал "основной указатель неточный"
// (палец, а не мышь/трекпад) — то есть телефон/планшет, а не просто
// узкое окно десктопа. На нём же обычно слабее GPU, поэтому это же
// значение используется и как признак "снизить нагрузку".
const QUERY = '(pointer: coarse)'

function subscribe(callback: () => void) {
  const mql = window.matchMedia(QUERY)
  mql.addEventListener('change', callback)
  return () => mql.removeEventListener('change', callback)
}

function getSnapshot() {
  return window.matchMedia(QUERY).matches
}

export function useIsTouchDevice() {
  return useSyncExternalStore(subscribe, getSnapshot, () => false)
}
