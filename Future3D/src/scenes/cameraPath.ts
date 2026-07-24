import * as THREE from 'three'

// Путь камеры сверху вниз: глубокое небо -> подлёт к солнечной системе ->
// атмосфера -> облака -> зона портфолио (почти горизонтальный участок) ->
// подход к земле -> город. Вторая точка — не просто "смотрим на солнечную
// систему" (это делает CameraRig через lookAt-блендинг), а реальное
// движение камеры к ней: без этого дистанция до модели почти не менялась
// (проверено расчётом) и приближения не чувствовалось.
export const CAMERA_PATH_POINTS = [
  new THREE.Vector3(0, 60, 0),
  new THREE.Vector3(0, 56, 25),
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

// Мировая позиция модели солнечной системы (SkyZone располагает её по
// этой же константе, см. SolarSystemModel в SkyZone.tsx) и на сколько
// прогресса растянут открывающий "взгляд туда" в начале пути — см.
// CameraRig.tsx. Камера в самой первой точке пути смотрит почти строго
// вниз (по касательной спуска), а солнечная система — широкий плоский
// диск сбоку/впереди, поэтому направление взгляда в начале сделано
// независимым от касательной пути: без этого в кадр попадал только
// центр диска (у клиента — "видно только Землю иногда и Марс").
export const SOLAR_SYSTEM_TARGET = new THREE.Vector3(0, 50, 40)
export const SOLAR_SYSTEM_SCALE = 0.33
export const SOLAR_SYSTEM_LOOKAT_END = 0.1
