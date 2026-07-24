import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { cameraPath, LOOK_AHEAD } from './cameraPath'
import { useScrollStore } from '@/utils/scrollStore'

const targetPosition = new THREE.Vector3()
const lookAtPosition = new THREE.Vector3()

export function CameraRig() {
  useFrame((state, delta) => {
    const progress = THREE.MathUtils.clamp(useScrollStore.getState().progress, 0, 1)
    const lookProgress = THREE.MathUtils.clamp(progress + LOOK_AHEAD, 0, 1)

    cameraPath.getPointAt(progress, targetPosition)
    cameraPath.getPointAt(lookProgress, lookAtPosition)

    const dampFactor = 1 - Math.exp(-4 * delta)
    state.camera.position.lerp(targetPosition, dampFactor)
    state.camera.lookAt(lookAtPosition)
  })

  return null
}
