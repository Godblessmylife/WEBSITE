import { useEffect, useRef } from 'react'
import type { RefObject } from 'react'
import { useFrame } from '@react-three/fiber'
import { useGLTF, useKeyboardControls, Clone } from '@react-three/drei'
import type { EcctrlHandle } from 'ecctrl'
import * as THREE from 'three'
import { useCraftStore } from '@/utils/craftStore'
import { useDriveStore, driveLiveStore } from '@/utils/driveStore'
import { useSwipeControlStore } from '@/utils/swipeControlStore'
import car1Url from '../models/Car1.glb'
import car2Url from '../models/car2.glb'

// Совпадает с defaultPosition/CAR_SCALE в MapProps.tsx (Car1Model/
// Car2Model) - намеренное дублирование мировых координат, тот же приём,
// что и у маркеров на мини-карте/целей квестов (см. подробный комментарий
// в Minimap.tsx про этот же компромисс) - эти числа заданы в ОДНОМ месте
// (MapProps.tsx) и сюда просто скопированы, а не вычисляются заново.
const CAR_DEFAULTS: Record<string, { position: [number, number, number]; scale: number }> = {
  car1: { position: [-20, 0.0479, 0], scale: 3 },
  car2: { position: [-8, 0.013, 12], scale: 3 },
}

function carRestPosition(id: string): [number, number, number] {
  return useCraftStore.getState().overrides[id] ?? CAR_DEFAULTS[id].position
}

const ENTER_DISTANCE = 4

// Общая логика "сесть в машину"/"выйти" - вызывается и из ENTER на
// клавиатуре (CarEntryTrigger ниже), и из мобильной кнопки "Сесть/Выйти"
// (GameMode.tsx, читает driveStore.nearCarId - на телефоне физической
// клавиатуры нет). Один источник истины вместо двух копий одной и той
// же логики в разных местах.
export function performCarInteraction(id: string, ecctrlRef: RefObject<EcctrlHandle | null>) {
  const drivingId = useDriveStore.getState().drivingId
  const handle = ecctrlRef.current

  if (drivingId === id) {
    // Выход: "паркуем" машину там, где остановились (тот же overrides,
    // которым пользуется режим разработчика - Grabbable.tsx), и ставим
    // персонажа рядом, а не внутрь модели машины.
    const live = driveLiveStore.getState()
    const restY = carRestPosition(id)[1]
    useCraftStore.getState().place(id, [live.x, restY, live.z])
    if (handle) {
      handle.body.setTranslation({ x: live.x + 3, y: restY + 1.2, z: live.z }, true)
      handle.body.setLinvel({ x: 0, y: 0, z: 0 }, true)
    }
    useDriveStore.getState().exit()
    return
  }

  if (drivingId || !handle) return
  const [px, py, pz] = carRestPosition(id)
  if (handle.currPos.distanceTo(new THREE.Vector3(px, py, pz)) < ENTER_DISTANCE) {
    useDriveStore.getState().enter(id)
  }
}

// Один экземпляр на машину - следит за расстоянием до игрока (для
// nearCarId - мобильная кнопка "Сесть", см. driveStore.ts) и слушает
// "interact" (ENTER, см. KEYBOARD_MAP в GameMode.tsx). Edge-detection
// через prevInteractRef ("только что нажата", не "сейчас зажата") -
// без этого удержание ENTER мгновенно садило бы в машину и тут же
// высаживало обратно за один и тот же долгий press.
export function CarEntryTrigger({ id, ecctrlRef }: { id: string; ecctrlRef: RefObject<EcctrlHandle | null> }) {
  const [, getKeys] = useKeyboardControls()
  const prevInteractRef = useRef(false)

  useFrame(() => {
    const drivingId = useDriveStore.getState().drivingId
    const handle = ecctrlRef.current
    if (drivingId !== id && handle) {
      const [px, py, pz] = carRestPosition(id)
      const isNear = !drivingId && handle.currPos.distanceTo(new THREE.Vector3(px, py, pz)) < ENTER_DISTANCE
      useDriveStore.getState().setNear(id, isNear)
    }

    const keys = getKeys() as unknown as { interact: boolean }
    const justPressed = keys.interact && !prevInteractRef.current
    prevInteractRef.current = keys.interact
    if (!justPressed) return

    performCarInteraction(id, ecctrlRef)
  })

  return null
}

const MAX_SPEED = 24
const MAX_REVERSE_SPEED = 10
const ACCEL = 10
const BRAKE = 16
const TURN_SPEED = 1.5

// Простое аркадное вождение (не настоящая физика колёс/подвески) -
// накапливаемая скорость (быстрее разгон при более долгом удержании
// вперёд/свайпа вверх, как и просил клиент) + поворот масштабируется по
// направлению движения (задом — руль работает зеркально, как в жизни).
// Читает те же источники ввода, что и обычная ходьба/God Mode
// (PlayerCharacter.tsx): клавиатура ИЛИ свайп - один и тот же жест
// "вперёд" работает одинаково во всех трёх режимах.
export function DrivingCar() {
  const drivingId = useDriveStore((s) => s.drivingId)
  const { scene: car1Scene } = useGLTF(car1Url)
  const { scene: car2Scene } = useGLTF(car2Url)
  const [, getKeys] = useKeyboardControls()
  const groupRef = useRef<THREE.Group>(null!)
  const speedRef = useRef(0)
  const yawRef = useRef(0)
  const posRef = useRef(new THREE.Vector3())
  const initializedForRef = useRef<string | null>(null)

  useEffect(() => {
    if (drivingId && initializedForRef.current !== drivingId) {
      const rest = carRestPosition(drivingId)
      posRef.current.set(rest[0], rest[1], rest[2])
      yawRef.current = 0
      speedRef.current = 0
      driveLiveStore.setState({ x: rest[0], y: rest[1], z: rest[2], yaw: 0 })
      initializedForRef.current = drivingId
    }
    if (!drivingId) initializedForRef.current = null
  }, [drivingId])

  useFrame((_, delta) => {
    if (!drivingId || !groupRef.current) return
    const keys = getKeys()
    const swipe = useSwipeControlStore.getState()
    const forward = keys.forward || swipe.forward
    const backward = keys.backward || swipe.backward

    if (forward) {
      speedRef.current = Math.min(MAX_SPEED, speedRef.current + ACCEL * delta)
    } else if (backward) {
      speedRef.current = Math.max(-MAX_REVERSE_SPEED, speedRef.current - ACCEL * delta)
    } else if (speedRef.current > 0) {
      speedRef.current = Math.max(0, speedRef.current - BRAKE * delta)
    } else if (speedRef.current < 0) {
      speedRef.current = Math.min(0, speedRef.current + BRAKE * delta)
    }

    const turnInput = (keys.leftward || swipe.leftward ? 1 : 0) - (keys.rightward || swipe.rightward ? 1 : 0)
    if (Math.abs(speedRef.current) > 0.1) {
      yawRef.current += turnInput * TURN_SPEED * delta * Math.sign(speedRef.current)
    }

    posRef.current.x += Math.sin(yawRef.current) * speedRef.current * delta
    posRef.current.z += Math.cos(yawRef.current) * speedRef.current * delta

    groupRef.current.position.copy(posRef.current)
    groupRef.current.rotation.y = yawRef.current

    driveLiveStore.setState({
      x: posRef.current.x,
      y: posRef.current.y,
      z: posRef.current.z,
      yaw: yawRef.current,
    })
  })

  if (!drivingId) return null
  const scene = drivingId === 'car1' ? car1Scene : car2Scene
  const scale = CAR_DEFAULTS[drivingId]?.scale ?? 1

  return (
    <group ref={groupRef}>
      {/* Clone, не primitive - та же scene одновременно "припаркована"
          (Grabbable в MapProps.tsx, спрятана через visible=false, но не
          размонтирована) и "за рулём" здесь; один Object3D не может быть
          ребёнком в двух местах разом (тот же приём и по той же причине,
          что у Portal.tsx с двумя порталами на одну модель). */}
      <Clone object={scene} scale={scale} />
    </group>
  )
}
