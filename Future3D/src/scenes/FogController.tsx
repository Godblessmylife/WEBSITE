import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { useScrollStore } from '@/utils/scrollStore'

const skyColor = new THREE.Color('#0a1128')
const cloudColor = new THREE.Color('#c9d6e3')
const groundColor = new THREE.Color('#141c2b')
const tmpColor = new THREE.Color()
const bgColor = new THREE.Color()

// Фон канваса ограничен по яркости ниже, чем сам туман (BACKGROUND_DIM):
// светлый цвет облаков (#c9d6e3) заливал собой весь экран (сплошной
// однотонный фон — не только у геометрии, как туман), и Bloom принимал
// это за один сплошной "яркий объект" на весь кадр — отсюда белая
// вспышка при скролле через зону облаков. Сам туман (влияет только на
// то, что рядом с камерой/геометрией) оставлен светлым — так сохраняется
// ощущение "внутри облака".
const BACKGROUND_DIM = 0.55

// Раньше высветление начиналось с первого же пикселя скролла (progress
// > 0) и уже полностью доходило до светлого "облачного" тона к 35% —
// то есть ещё во время пролёта мимо солнца, задолго до реальных облаков.
// Клиент увидел это как "белый оттенок усиливается сразу". Теперь небо
// держится тёмным (SKY_HOLD_END) на весь космический сегмент пути и
// светлеет только на подходе к настоящей CloudZone.
// Экспортированы (не только локальные const) — JourneyTuner.tsx
// использует те же границы фаз для подписей зон на ползунке, вместо
// собственных придуманных на глаз чисел, которые разъехались бы с
// реальным туманом/цветом при первой же правке одних без других.
export const SKY_HOLD_END = 0.4
const CLOUD_TRANSITION_END = 0.55
export const CLOUD_HOLD_END = 0.65

export function FogController() {
  const { scene } = useThree()

  useFrame(() => {
    const progress = THREE.MathUtils.clamp(useScrollStore.getState().progress, 0, 1)

    if (progress < SKY_HOLD_END) {
      tmpColor.copy(skyColor)
    } else if (progress < CLOUD_TRANSITION_END) {
      const t = (progress - SKY_HOLD_END) / (CLOUD_TRANSITION_END - SKY_HOLD_END)
      tmpColor.lerpColors(skyColor, cloudColor, t)
    } else if (progress < CLOUD_HOLD_END) {
      tmpColor.copy(cloudColor)
    } else {
      tmpColor.lerpColors(cloudColor, groundColor, (progress - CLOUD_HOLD_END) / (1 - CLOUD_HOLD_END))
    }

    // Пик был 0.035 ровно на progress=0.5 (sin(progress*PI) достигает 1
    // именно там) — это точно совпадает с серединой перехода к светлому
    // cloudColor (SKY_HOLD_END..CLOUD_TRANSITION_END: 0.4-0.55), то есть
    // самый плотный туман приходился ровно на самый светлый момент — по
    // отзыву клиента это читалось как "белая дымка на середине страницы".
    // Пик снижен почти вдвое — атмосфера облаков ощущается по-прежнему
    // (не убрана совсем), но не превращается в сплошную засветку экрана.
    const density = THREE.MathUtils.lerp(0.004, 0.02, Math.sin(progress * Math.PI))

    if (!scene.fog) {
      scene.fog = new THREE.FogExp2(tmpColor.getHex(), density)
    } else {
      const fog = scene.fog as THREE.FogExp2
      fog.color.copy(tmpColor)
      fog.density = density
    }

    if (!scene.background || scene.background instanceof THREE.Color === false) {
      scene.background = new THREE.Color()
    }
    bgColor.copy(tmpColor).multiplyScalar(BACKGROUND_DIM)
    ;(scene.background as THREE.Color).copy(bgColor)
  })

  return null
}
