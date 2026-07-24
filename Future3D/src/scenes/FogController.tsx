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

export function FogController() {
  const { scene } = useThree()

  useFrame(() => {
    const progress = THREE.MathUtils.clamp(useScrollStore.getState().progress, 0, 1)

    if (progress < 0.35) {
      tmpColor.lerpColors(skyColor, cloudColor, progress / 0.35)
    } else if (progress < 0.65) {
      tmpColor.copy(cloudColor)
    } else {
      tmpColor.lerpColors(cloudColor, groundColor, (progress - 0.65) / 0.35)
    }

    const density = THREE.MathUtils.lerp(0.004, 0.035, Math.sin(progress * Math.PI))

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
