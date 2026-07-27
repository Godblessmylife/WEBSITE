import { useEffect, useRef } from 'react'
import type { RefObject } from 'react'
import { useFrame } from '@react-three/fiber'
import { useGLTF, useKeyboardControls } from '@react-three/drei'
import { Ecctrl, type EcctrlHandle } from 'ecctrl'
import { useButtonStore } from 'ecctrl/input'
import { useCustomGravity } from 'ecctrl/gravity'
import * as THREE from 'three'
import { useGodModeStore } from '@/utils/godModeStore'
import { useSwipeControlStore } from '@/utils/swipeControlStore'
import heroModelUrl from '../models/hero.glb'

const EMPTY_JOYSTICK = { x: 0, y: 0 }
const EMPTY_MOVEMENT = {
  forward: false,
  backward: false,
  leftward: false,
  rightward: false,
  run: false,
  jump: false,
  joystick: EMPTY_JOYSTICK,
}

const CAPSULE_HALF_HEIGHT = 0.5
const CAPSULE_RADIUS = 0.35
// hero.glb сделан с ногами у y=0 (bbox: -0.00258..1.73828) — смещаем
// модель вниз на высоту капсулы, чтобы ступни совпадали с полом.
const MODEL_Y_OFFSET = -(CAPSULE_HALF_HEIGHT + CAPSULE_RADIUS)

// Обычная гравитация теперь приходит из ЭТОГО поля (см. GameMode.tsx:
// <Physics gravity={[0,0,0]}>), а не из глобальной настройки физики —
// единственный способ отключать её только для игрока (God Mode), не
// трогая остальной мир. Возврат одного и того же instance безопасен:
// Ecctrl копирует значение (`referenceGravity.current.copy(...)`), а не
// хранит ссылку и не мутирует то, что ему вернули.
const GRAVITY_DOWN = new THREE.Vector3(0, -9.81, 0)
const GRAVITY_ZERO = new THREE.Vector3(0, 0, 0)

// God Mode: полёт вручную поверх Ecctrl (см. подробный комментарий у
// useFrame ниже). Скорости специально намного выше обычного бега
// (maxRunVel=9) — "как супермен", а не просто быстрая ходьба.
const GOD_SPEED = 22
const GOD_SPEED_FAST = 50
const GOD_YAW_SPEED = 2.2 // рад/с, поворот на A/D во время полёта
const UP_AXIS = new THREE.Vector3(0, 1, 0)

const flightMoveDir = new THREE.Vector3()
const flightQuat = new THREE.Quaternion()
const yawEuler = new THREE.Euler()

export function PlayerCharacter({ ecctrlRef }: { ecctrlRef: RefObject<EcctrlHandle | null> }) {
  const { scene } = useGLTF(heroModelUrl)
  const tiltRef = useRef<THREE.Group>(null!)
  const bobPhaseRef = useRef(0)
  const yawRef = useRef(0)
  const wasGodModeRef = useRef(false)
  const [, getKeys] = useKeyboardControls()
  const setGravityField = useCustomGravity((s) => s.setGravityField)

  useEffect(() => {
    setGravityField(() => (useGodModeStore.getState().active ? GRAVITY_ZERO : GRAVITY_DOWN))
  }, [setGravityField])

  // Это НЕ автоматическое поведение ecctrl (в отличие от предположения
  // из более ранней версии README/памяти) — установленная версия пакета
  // не подписывается ни на drei KeyboardControls, ни на свой же
  // useJoystickStore/useButtonStore сама. Она только хранит состояние
  // движения и ждёт явного handle.setMovement(...) от потребителя —
  // без этого блока персонаж физически существует (падает, стоит на
  // земле), но никогда не получает команду шевелиться, что и выглядело
  // как "бегать нельзя".
  useFrame((_, delta) => {
    const handle = ecctrlRef.current
    if (!handle) return

    const godMode = useGodModeStore.getState().active
    const keys = getKeys()
    const swipe = useSwipeControlStore.getState()
    const jumpButton = useButtonStore.getState().buttons.jump

    // В God Mode Ecctrl не должен пытаться сам ходить/прыгать/поворачивать
    // персонажа обычным способом (ниже это делает отдельный useFrame с
    // приоритетом) — передаём ему "все клавиши отпущены", а не читаем
    // свайп/jump, иначе ходьба и полёт будут пытаться управлять телом
    // одновременно.
    handle.setMovement(
      godMode
        ? EMPTY_MOVEMENT
        : {
            forward: keys.forward || swipe.forward,
            backward: keys.backward || swipe.backward,
            leftward: keys.leftward || swipe.leftward,
            rightward: keys.rightward || swipe.rightward,
            run: keys.run,
            jump: keys.jump || !!jumpButton,
            joystick: EMPTY_JOYSTICK,
          },
    )

    if (godMode) {
      // Процедурная походка ниже — только для ходьбы по земле, во время
      // полёта персонаж управляется вторым useFrame ниже.
      return
    }

    // hero.glb без скелета и анимаций (перепроверено gltf-transform
    // inspect — ни одного clip, ни одного skin) — настоящую анимацию
    // ходьбы/бега сделать нельзя без другой модели. Вместо неподвижного
    // скольжения — три процедурных сигнала, вместе дающие "живую" походку:
    // наклон вперёд от скорости (было раньше) + вертикальный подскок
    // (bobPhase) + покачивание из стороны в сторону в той же фазе,
    // имитирующее перенос веса с ноги на ногу. Фаза считается от
    // ПРОЙДЕННОГО пути (speed * delta), а не от времени — иначе частота
    // "шагов" не менялась бы с ускорением при беге на Shift.
    const speed = handle.relativeVelOnPlane.length()
    const targetTilt = handle.isMoving ? THREE.MathUtils.clamp(speed * 0.05, 0, 0.22) : 0
    const damp = 1 - Math.exp(-8 * delta)
    tiltRef.current.rotation.x = THREE.MathUtils.lerp(tiltRef.current.rotation.x, targetTilt, damp)

    if (handle.isMoving && speed > 0.05) {
      bobPhaseRef.current += speed * delta * 2.2
      const bob = Math.abs(Math.sin(bobPhaseRef.current))
      const sway = Math.sin(bobPhaseRef.current)
      tiltRef.current.position.y = bob * 0.06
      tiltRef.current.rotation.z = THREE.MathUtils.lerp(tiltRef.current.rotation.z, sway * 0.05, damp)
    } else {
      tiltRef.current.position.y = THREE.MathUtils.lerp(tiltRef.current.position.y, 0, damp)
      tiltRef.current.rotation.z = THREE.MathUtils.lerp(tiltRef.current.rotation.z, 0, damp)
    }
  })

  // ВАЖНО: без явного приоритета (второй аргумент useFrame) - R3F
  // переключает Canvas на РУЧНОЙ рендер-луп, как только у любого useFrame
  // приоритет отличается от дефолтного 0 (сам перестаёт вызывать
  // gl.render() каждый кадр). Ловилось не сразу: физика/HUD/миникарта
  // продолжали как ни в чём не бывало обновляться (они не зависят от
  // рендера), а сама 3D-сцена стала однотонно-чёрной. Порядок относительно
  // внутреннего шага Ecctrl тут и не нужен: пока God Mode включён, Ecctrl
  // получает "все клавиши отпущены" (см. выше) И нулевую гравитацию (см.
  // setGravityField) - его собственный шаг ничего не меняет в скорости
  // тела независимо от того, раньше или позже он выполнится в этом кадре.
  useFrame((_, delta) => {
    const handle = ecctrlRef.current
    const godMode = useGodModeStore.getState().active
    if (!handle) return

    if (!godMode) {
      wasGodModeRef.current = false
      return
    }

    if (!wasGodModeRef.current) {
      // Первый кадр после включения - берём текущий поворот персонажа,
      // чтобы полёт начался с того направления, куда он и так смотрел
      // (без рывка/переворота).
      yawEuler.setFromQuaternion(handle.currQuat, 'YXZ')
      yawRef.current = yawEuler.y
      wasGodModeRef.current = true
    }

    // БАГ (по отзыву клиента: "после God Mode на мобильном сенсорное
    // управление пропадает"): этот блок раньше читал ТОЛЬКО getKeys()
    // (клавиатура). На телефоне физической клавиатуры нет, поэтому в
    // God Mode все клавиши всегда "отпущены" и полёт не реагировал вообще
    // ни на что — выглядело так, будто тач-управление перестало работать
    // (на самом деле оно и не подключалось к этой ветке). Свайп (обычное
    // движение) и кнопка "Прыжок"/"Вниз" (ecctrl/input, GameMode.tsx)
    // теперь читаются наравне с клавиатурой, как и в обычном режиме выше.
    const keys = getKeys()
    const swipe = useSwipeControlStore.getState()
    const jumpButton = useButtonStore.getState().buttons.jump
    const descendButton = useButtonStore.getState().buttons.descend

    if (keys.leftward || swipe.leftward) yawRef.current += GOD_YAW_SPEED * delta
    if (keys.rightward || swipe.rightward) yawRef.current -= GOD_YAW_SPEED * delta

    let thrust = 0
    if (keys.forward || swipe.forward) thrust += 1
    if (keys.backward || swipe.backward) thrust -= 1

    flightMoveDir.set(Math.sin(yawRef.current) * thrust, 0, Math.cos(yawRef.current) * thrust)
    if (keys.jump || jumpButton) flightMoveDir.y += 1
    if (keys.descend || descendButton) flightMoveDir.y -= 1
    if (flightMoveDir.lengthSq() > 0) flightMoveDir.normalize()

    const speed = keys.run ? GOD_SPEED_FAST : GOD_SPEED
    handle.body.setLinvel(
      { x: flightMoveDir.x * speed, y: flightMoveDir.y * speed, z: flightMoveDir.z * speed },
      true,
    )

    flightQuat.setFromAxisAngle(UP_AXIS, yawRef.current)
    handle.body.setRotation({ x: flightQuat.x, y: flightQuat.y, z: flightQuat.z, w: flightQuat.w }, true)
  })

  return (
    // position: без неё Ecctrl спавнится в (0,0,0) — ровно там же, где
    // верхняя грань земли (DesertGround), то есть капсула персонажа
    // стартует наполовину закопанной в пол. Отсюда и "падение в
    // текстуры": увязнув в коллайдере земли с самого первого кадра,
    // физика ведёт себя непредсказуемо. Спавн заметно выше — короткое
    // управляемое падение и приземление, как и должно быть.
    <Ecctrl
      ref={ecctrlRef}
      position={[0, 2, 0]}
      capsuleHalfHeight={CAPSULE_HALF_HEIGHT}
      capsuleRadius={CAPSULE_RADIUS}
      // По просьбе клиента Shift должен ускорять бег втрое относительно
      // обычной ходьбы (дефолты ecctrl: maxWalkVel=2, maxRunVel=5) —
      // явно задаём обе константы, а не только run, чтобы соотношение
      // было точным, а не "что получится" от дефолтного walk.
      maxWalkVel={3}
      maxRunVel={9}
      enableCustomGravity
    >
      <group ref={tiltRef}>
        <primitive object={scene} position={[0, MODEL_Y_OFFSET, 0]} />
      </group>
    </Ecctrl>
  )
}

useGLTF.preload(heroModelUrl)
