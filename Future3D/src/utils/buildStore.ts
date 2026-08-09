import { create } from 'zustand'

// Модель лестницы (wooden_step_ladder_scan_lowpoly.glb, Sketchfab-экспорт)
// снята со смещённым origin и нетипичным масштабом. ВАЖНО: `gltf-transform
// inspect` показывает bbox СЦЕНЫ (с учётом трансформа узла, bboxMin
// (-73.92331, 0.0169, -1.69629)/bboxMax (-69.58428, 5.71885, 2.86336)) -
// это НЕ то же самое, что локальные координаты вершин самого меша, с
// которыми работает geometry.translate() в PlacedBlocks.tsx. Использование
// bbox сцены там, где нужен bbox ЛОКАЛЬНЫХ вершин, было причиной реального
// бага (блоки физически ставились и корректно сохранялись в сторе, но
// рисовались на ~13 игровых единиц в стороне от точки клика - обнаружено
// прямым чтением POSITION-атрибута через @gltf-transform/core, см. историю
// изменений). Верные значения ниже посчитаны из локальных вершин меша:
// bbox min (-1.90722, -5.15480, -2.30617), bbox max (4.14710, 1.38077,
// 2.02823). Сырые размеры: высота ~6.53556, ширина(X) ~6.05432,
// глубина(Z) ~4.33439 условных единиц экспорта. BUILD_MODEL_SCALE
// приводит высоту одного блока к BUILD_BLOCK_HEIGHT игровых единиц
// (примерно высота одной ступени относительно роста персонажа ~1.74,
// см. hero-walk.glb) - PlacedBlocks.tsx использует тот же множитель и
// для видимого mesh, и для физического коллайдера.
export const BUILD_BLOCK_HEIGHT = 1.1
const RAW_HEIGHT = 6.53556
const RAW_WIDTH_X = 6.05432
const RAW_DEPTH_Z = 4.33439
export const BUILD_MODEL_SCALE = BUILD_BLOCK_HEIGHT / RAW_HEIGHT
export const BUILD_FOOTPRINT_X = RAW_WIDTH_X * BUILD_MODEL_SCALE
export const BUILD_FOOTPRINT_Z = RAW_DEPTH_Z * BUILD_MODEL_SCALE
// Размер клетки сетки по X/Z - по большей из двух сторон футпринта,
// чтобы соседние блоки стыковались без зазоров и без наложения друг на
// друга независимо от того, как блок повёрнут (0°/90°/180°/270°).
export const BUILD_CELL_SIZE = Math.max(BUILD_FOOTPRINT_X, BUILD_FOOTPRINT_Z)

const STORAGE_KEY = 'future3d-placed-blocks'
// Максимальная высота "призрака" перед постановкой - 12 блоков (~13
// игровых единиц) более чем достаточно для любой разумной лестницы,
// защита от случайного удержания кнопки "Выше" до абсурдных высот.
const MAX_GHOST_LEVELS = 12

export interface PlacedBlock {
  id: string
  position: [number, number, number]
  rotationY: number
}

function loadPlacedBlocks(): PlacedBlock[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? (parsed as PlacedBlock[]) : []
  } catch {
    return []
  }
}

function savePlacedBlocks(blocks: PlacedBlock[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(blocks))
  } catch {
    // localStorage недоступен (приватный режим и т.п.) - постройка просто
    // не переживёт перезагрузку страницы, не повод падать с ошибкой.
  }
}

interface BuildState {
  pickaxeActive: boolean
  placedBlocks: PlacedBlock[]
  // Поворот и высота "призрака" перед постановкой - не персистятся
  // (осмысленны только пока открыт режим кирки в текущей сессии).
  ghostRotationY: number
  ghostHeightOffset: number
  setPickaxeActive: (active: boolean) => void
  placeBlock: (x: number, z: number) => void
  rotateGhost: () => void
  raiseGhost: () => void
  lowerGhost: () => void
}

export const useBuildStore = create<BuildState>((set) => ({
  pickaxeActive: false,
  placedBlocks: loadPlacedBlocks(),
  ghostRotationY: 0,
  ghostHeightOffset: 0,
  setPickaxeActive: (active) => set({ pickaxeActive: active }),
  placeBlock: (x, z) =>
    set((s) => {
      const position: [number, number, number] = [x, s.ghostHeightOffset, z]
      const placedBlocks = [
        ...s.placedBlocks,
        { id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, position, rotationY: s.ghostRotationY },
      ]
      savePlacedBlocks(placedBlocks)
      return { placedBlocks }
    }),
  rotateGhost: () => set((s) => ({ ghostRotationY: s.ghostRotationY + Math.PI / 2 })),
  raiseGhost: () =>
    set((s) => ({
      ghostHeightOffset: Math.min(s.ghostHeightOffset + BUILD_BLOCK_HEIGHT, BUILD_BLOCK_HEIGHT * MAX_GHOST_LEVELS),
    })),
  lowerGhost: () => set((s) => ({ ghostHeightOffset: Math.max(s.ghostHeightOffset - BUILD_BLOCK_HEIGHT, 0) })),
}))

// Живая точка сетки, куда сейчас указывает курсор в режиме кирки -
// отдельный vanilla-стор (не часть useBuildStore выше), мутируется
// каждый кадр в CraftModeController.tsx без React-рендера - тот же
// приём, что и craftGhostStore в craftStore.ts.
export const buildGhostStore = create<{ x: number; z: number; visible: boolean }>(() => ({
  x: 0,
  z: 0,
  visible: false,
}))
