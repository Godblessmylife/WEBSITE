import { createStore } from 'zustand/vanilla'

interface MinimapPlayerState {
  x: number
  z: number
  yaw: number
}

// Не React-хук (createStore, не create) — позиция игрока меняется каждый
// кадр, а сама точка на мини-карте обновляется прямой мутацией DOM
// (transform на одном div, см. Minimap.tsx), а не через реактивный
// ре-рендер всей мини-карты 60 раз в секунду. MinimapTracker (внутри
// Canvas) пишет через .setState, Minimap (снаружи Canvas) читает через
// .subscribe — оба работают с одним и тем же vanilla-стором напрямую,
// без прослойки React.
export const minimapPlayerStore = createStore<MinimapPlayerState>(() => ({
  x: 0,
  z: 0,
  yaw: 0,
}))
