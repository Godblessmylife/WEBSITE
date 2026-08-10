import * as THREE from 'three'

// Вынесено из PortfolioCarousel.tsx, чтобы PortfolioGallery.tsx могла
// переиспользовать те же тематические заставки вместо копипасты ~50
// строк canvas-рисования.
export interface Theme {
  title: string
  base: string
  accent: string
  glow: string
  // Текст-заглушка для окна с описанием (PortfolioCardDetail.tsx),
  // открывается по клику на карточку - клиент пришлёт реальные тексты
  // под конкретные проекты позже, пока это описание самой услуги.
  description: string
}

export const THEMES: Theme[] = [
  {
    title: 'ВЕБ-САЙТЫ',
    base: '#0a1a2e',
    accent: '#3fa9f5',
    glow: '#7dd3ff',
    description: 'Разработка сайтов под ключ — от лендингов до сложных веб-приложений. Быстро, современно, с упором на UX.',
  },
  {
    title: 'ИГРЫ',
    base: '#1c0a2e',
    accent: '#b34ff5',
    glow: '#ff8ae2',
    description: 'Игровые механики и интерактивные сцены на Three.js/WebGL — от простых мини-игр до полноценных 3D-миров в браузере.',
  },
  {
    title: '3D / VR',
    base: '#0a2e22',
    accent: '#3ff5a0',
    glow: '#8affc9',
    description: '3D-визуализация и VR-проекты: интерактивные модели, презентации и опыты, которые работают прямо в браузере без установки.',
  },
  {
    title: 'БРЕНДИНГ',
    base: '#2e1a0a',
    accent: '#f5a83f',
    glow: '#ffce8a',
    description: 'Фирменный стиль и визуальная айдентика — логотипы, цветовые схемы и оформление, которые выделяют бренд среди конкурентов.',
  },
  {
    title: 'ПРИЛОЖЕНИЯ',
    base: '#2e0a14',
    accent: '#f53f6e',
    glow: '#ff8aa8',
    description: 'Веб-приложения и панели управления — от MVP до полноценных продуктов с адаптивным интерфейсом.',
  },
]

export function createThemeTexture(theme: Theme, label?: string) {
  const canvas = document.createElement('canvas')
  canvas.width = 512
  canvas.height = 720
  const ctx = canvas.getContext('2d')!

  const grad = ctx.createLinearGradient(0, 0, 0, canvas.height)
  grad.addColorStop(0, theme.base)
  grad.addColorStop(1, '#05070d')
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, canvas.width, canvas.height)

  ctx.strokeStyle = theme.accent
  ctx.lineWidth = 2
  ctx.globalAlpha = 0.45
  for (let i = 0; i < 6; i++) {
    ctx.beginPath()
    ctx.arc(canvas.width / 2, canvas.height * 0.4, 40 + i * 42, 0, Math.PI * 2)
    ctx.stroke()
  }
  ctx.globalAlpha = 1

  const glow = ctx.createRadialGradient(
    canvas.width / 2, canvas.height * 0.4, 0,
    canvas.width / 2, canvas.height * 0.4, 100,
  )
  glow.addColorStop(0, theme.glow)
  glow.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.fillStyle = glow
  ctx.fillRect(0, 0, canvas.width, canvas.height)

  ctx.fillStyle = '#f4f7fb'
  ctx.font = 'bold 42px sans-serif'
  ctx.textAlign = 'center'
  ctx.fillText(label ?? theme.title, canvas.width / 2, canvas.height * 0.82)

  ctx.strokeStyle = theme.accent
  ctx.lineWidth = 3
  ctx.beginPath()
  ctx.moveTo(canvas.width * 0.26, canvas.height * 0.86)
  ctx.lineTo(canvas.width * 0.74, canvas.height * 0.86)
  ctx.stroke()

  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  return texture
}
