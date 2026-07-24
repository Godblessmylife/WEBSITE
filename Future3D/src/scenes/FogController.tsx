import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { useScrollStore } from '@/utils/scrollStore'

const skyColor = new THREE.Color('#0a1128')
const cloudColor = new THREE.Color('#c9d6e3')
const groundColor = new THREE.Color('#1b2a22')
const tmpColor = new THREE.Color()

// Плейсхолдер: цвет/плотность тумана лерпятся по прогрессу скролла,
// чтобы визуально подтвердить переход между зонами. Реальные значения
// и художественная доводка — в Phase 2.
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

    const density = THREE.MathUtils.lerp(0.006, 0.045, Math.sin(progress * Math.PI))

    if (!scene.fog) {
      scene.fog = new THREE.FogExp2(tmpColor.getHex(), density)
    } else {
      const fog = scene.fog as THREE.FogExp2
      fog.color.copy(tmpColor)
      fog.density = density
    }
  })

  return null
}
