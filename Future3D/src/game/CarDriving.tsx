import { useEffect, useRef } from 'react'
import type { RefObject } from 'react'
import { useFrame } from '@react-three/fiber'
import { useGLTF, useKeyboardControls, Clone } from '@react-three/drei'
import { useJoystickStore } from 'ecctrl/input'
import type { EcctrlHandle } from 'ecctrl'
import * as THREE from 'three'
import { useCraftStore } from '@/utils/craftStore'
import { useDriveStore, driveLiveStore } from '@/utils/driveStore'
import car1Url from '../models/Car1.glb'
import car2Url from '../models/car2.glb'
import { CAR_WORLD_BOUND } from './worldConstants'

const EMPTY_JOYSTICK = { x: 0, y: 0 }
// Переиспользуемый temp-вектор для проверки расстояния до машины (тот же
// приём, что и в GameCamera.tsx/Bonuses.tsx) - раньше CarEntryTrigger
// создавал новый THREE.Vector3 КАЖДЫЙ кадр на КАЖДУЮ машину (сейчас их
// две - car1/car2), лишняя нагрузка на сборщик мусора ровно в тот момент,
// когда игрок ходит рядом с машинами - тот же класс проблем, что и общий
// отзыв клиента "при движении подвисает".
const tempCarPos = new THREE.Vector3()

// Совпадает с defaultPosition/CAR_SCALE в MapProps.tsx (Car1Model/
// Car2Model) - намеренное дублирование мировых координат, тот же приём,
// что и у маркеров на мини-карте/целей квестов (см. подробный комментарий
// в Minimap.tsx про этот же компромисс) - эти числа заданы в ОДНОМ месте
// (MapProps.tsx) и сюда просто скопированы, а не вычисляются заново.
const CAR_DEFAULTS: Record<string, { position: [number, number, number]; scale: number }> = {
  car1: { position: [-20, 0.0479, 0], scale: 3 },
  car2: { position: [-8, 0.013, 12], scale: 3 },
}

// car1.glb смоделирована длинной стороной вдоль X (bbox: -2.341..2.235
// по X, всего -0.976..0.976 по Z - "капот" смотрит вдоль X), а вся эта
// логика движения считает "вперёд" вдоль Z при yaw=0 (car2.glb как раз
// так и смоделирована - длинная сторона по Z, без всякого доворота).
// Без этой компенсации car1 физически ехала вперёд (по Z), но развёрнута
// была боком к направлению движения - "едет боком" по отзыву клиента.
// Разворот на 90° устраняет "боком", но у поворота на 90° есть два
// варианта (+/-) - какой из них ставит капот именно ВПЕРЁД, а не
// назад, нельзя узнать по одному только bbox (он симметричен относительно
// направления). +PI/2 оказался ошибочным по факту (отзыв клиента "одна
// из машин едет задом наперёд") - капот был развёрнут на 180° от нужного.
// car2 компенсации не требует - её собственная модель уже смотрит капотом
// вперёд по +Z.
const CAR_VISUAL_YAW_OFFSET: Record<string, number> = {
  car1: -Math.PI / 2,
  car2: 0,
}

// Мир (DesertGround, GameWorld.tsx) - плоская площадка с коллайдером
// ТОЛЬКО в этих границах (WORLD_HALF_EXTENT, worldConstants.ts). Раньше
// машину ничего не останавливало у края - уехав достаточно далеко и
// выйдя там, игрок оказывался вне коллайдера земли и падал в пустоту
// ("падает за текстуры" по отзыву клиента). CAR_WORLD_BOUND - небольшой
// отступ от реального края - чтобы машина разворачивалась, не долетая
// до самой границы визуально.
const WORLD_BOUND = CAR_WORLD_BOUND

function carRestPosition(id: string): [number, number, number] {
  return useCraftStore.getState().overrides[id]?.position ?? CAR_DEFAULTS[id].position
}

const ENTER_DISTANCE = 4
// Безопасное расстояние выхода - в сторону ПРАВОГО борта машины (не
// фиксированное "+3 по мировой оси X"), пересчитанное поворотом текущего
// yaw машины. Раньше "+3 по X" не учитывало, куда машина повёрнута -
// стоило проехать и развернуться (например, yaw≈90°, когда "длина"
// машины сама легла вдоль мировой оси X), и то же самое "+3 по X"
// оказывалось НЕ сбоку, а внутри/под собственным коллайдером машины
// (у car1 при масштабе 3 половина длины - 6.864) - вплотную к спавну это
// уже ловили раньше (see readme in project history про оверлап коллайдера
// и резкий "выброс" физикой), тут та же причина: "герой оказывается под
// машиной и падает в текстуры" по отзыву клиента. 5 юниц перекрывает
// половину ШИРИНЫ (не длины) обеих машин с запасом (car1: 2.928, car2:
// 1.791) независимо от текущего поворота.
const EXIT_SIDE_OFFSET = 5

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
      // Тот же (cos, -sin) поворот вектора "вправо от направления
      // движения", что и forward=(sin(yaw), cos(yaw)) в useFrame ниже -
      // работает при ЛЮБОМ текущем повороте машины, не только когда она
      // ещё смотрит вдоль исходной оси Z.
      const exitX = live.x + Math.cos(live.yaw) * EXIT_SIDE_OFFSET
      const exitZ = live.z - Math.sin(live.yaw) * EXIT_SIDE_OFFSET
      handle.body.setTranslation({ x: exitX, y: restY + 1.2, z: exitZ }, true)
      handle.body.setLinvel({ x: 0, y: 0, z: 0 }, true)
    }
    useDriveStore.getState().exit()
    return
  }

  if (drivingId || !handle) return
  const [px, py, pz] = carRestPosition(id)
  if (handle.currPos.distanceTo(tempCarPos.set(px, py, pz)) < ENTER_DISTANCE) {
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
      const isNear = !drivingId && handle.currPos.distanceTo(tempCarPos.set(px, py, pz)) < ENTER_DISTANCE
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
// газа) + поворот масштабируется по направлению движения (задом — руль
// работает зеркально, как в жизни). На телефоне читает отдельный
// джойстик "drive" (GameMode.tsx, ecctrl/input) - по просьбе клиента
// управление машиной тоже должно быть джойстиком: вверх/вниз - газ и
// торможение/задний ход, влево/вправо - руль, ПРОПОРЦИОНАЛЬНО отклонению
// стика (лёгкий наклон - плавный поворот, стик до упора - максимальный),
// а не просто вкл/выкл, как было бы у обычных кнопок.
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
    const driveJoystick = useJoystickStore.getState().joysticks.drive ?? EMPTY_JOYSTICK
    const forward = keys.forward || driveJoystick.y > 0.2
    const backward = keys.backward || driveJoystick.y < -0.2

    if (forward) {
      speedRef.current = Math.min(MAX_SPEED, speedRef.current + ACCEL * delta)
    } else if (backward) {
      speedRef.current = Math.max(-MAX_REVERSE_SPEED, speedRef.current - ACCEL * delta)
    } else if (speedRef.current > 0) {
      speedRef.current = Math.max(0, speedRef.current - BRAKE * delta)
    } else if (speedRef.current < 0) {
      speedRef.current = Math.min(0, speedRef.current + BRAKE * delta)
    }

    // Клавиатура - вкл/выкл (-1/0/1), джойстик - плавно пропорционально
    // отклонению стика (небольшая мёртвая зона 0.15, чтобы дрожание
    // пальца у центра не вызывало едва заметный самопроизвольный увод).
    const keyboardTurn = (keys.leftward ? 1 : 0) - (keys.rightward ? 1 : 0)
    const joystickTurn = Math.abs(driveJoystick.x) > 0.15 ? -driveJoystick.x : 0
    const turnInput = keyboardTurn !== 0 ? keyboardTurn : joystickTurn
    if (Math.abs(speedRef.current) > 0.1) {
      yawRef.current += turnInput * TURN_SPEED * delta * Math.sign(speedRef.current)
    }

    posRef.current.x += Math.sin(yawRef.current) * speedRef.current * delta
    posRef.current.z += Math.cos(yawRef.current) * speedRef.current * delta
    // Не даём уехать за пределы коллайдера земли (DesertGround,
    // GameWorld.tsx, 280x280) - иначе выход из машины там же роняет
    // игрока в пустоту, см. комментарий у WORLD_BOUND выше.
    posRef.current.x = THREE.MathUtils.clamp(posRef.current.x, -WORLD_BOUND, WORLD_BOUND)
    posRef.current.z = THREE.MathUtils.clamp(posRef.current.z, -WORLD_BOUND, WORLD_BOUND)

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
  const visualYawOffset = CAR_VISUAL_YAW_OFFSET[drivingId] ?? 0

  return (
    <group ref={groupRef}>
      {/* Clone, не primitive - та же scene одновременно "припаркована"
          (Grabbable в MapProps.tsx, спрятана через visible=false, но не
          размонтирована) и "за рулём" здесь; один Object3D не может быть
          ребёнком в двух местах разом (тот же приём и по той же причине,
          что у Portal.tsx с двумя порталами на одну модель). */}
      <Clone object={scene} scale={scale} rotation={[0, visualYawOffset, 0]} />
    </group>
  )
}
