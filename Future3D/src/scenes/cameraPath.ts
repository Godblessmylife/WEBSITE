import * as THREE from 'three'

// Путь камеры сверху вниз: глубокое небо -> атмосфера -> облака -> зона портфолио
// (почти горизонтальный участок) -> подход к земле -> город.
export const CAMERA_PATH_POINTS = [
  new THREE.Vector3(0, 60, 0),
  new THREE.Vector3(0, 40, 5),
  new THREE.Vector3(0, 20, 10),
  new THREE.Vector3(0, 8, 6),
  new THREE.Vector3(0, 3, 2),
  new THREE.Vector3(0, 1.6, 0),
]

export const cameraPath = new THREE.CatmullRomCurve3(
  CAMERA_PATH_POINTS,
  false,
  'catmullrom',
  0.5,
)

export const LOOK_AHEAD = 0.02
