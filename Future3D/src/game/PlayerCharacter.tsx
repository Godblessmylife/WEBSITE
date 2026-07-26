import { useRef } from 'react'
import type { RefObject } from 'react'
import { useFrame } from '@react-three/fiber'
import { useGLTF, useKeyboardControls } from '@react-three/drei'
import { Ecctrl, type EcctrlHandle } from 'ecctrl'
import { useJoystickStore, useButtonStore } from 'ecctrl/input'
import * as THREE from 'three'
import heroModelUrl from '../models/hero.glb'

const EMPTY_JOYSTICK = { x: 0, y: 0 }

const CAPSULE_HALF_HEIGHT = 0.5
const CAPSULE_RADIUS = 0.35
// hero.glb сделан с ногами у y=0 (bbox: -0.00258..1.73828) — смещаем
// модель вниз на высоту капсулы, чтобы ступни совпадали с полом.
const MODEL_Y_OFFSET = -(CAPSULE_HALF_HEIGHT + CAPSULE_RADIUS)

export function PlayerCharacter({ ecctrlRef }: { ecctrlRef: RefObject<EcctrlHandle | null> }) {
  const { scene } = useGLTF(heroModelUrl)
  const tiltRef = useRef<THREE.Group>(null!)
  const bobPhaseRef = useRef(0)
  const [, getKeys] = useKeyboardControls()

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

    const keys = getKeys()
    const joystick = useJoystickStore.getState().joysticks.default
    const jumpButton = useButtonStore.getState().buttons.jump

    handle.setMovement({
      forward: keys.forward,
      backward: keys.backward,
      leftward: keys.leftward,
      rightward: keys.rightward,
      run: keys.run,
      jump: keys.jump || !!jumpButton,
      joystick: joystick?.active ? { x: joystick.x, y: joystick.y } : EMPTY_JOYSTICK,
    })

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
    >
      <group ref={tiltRef}>
        <primitive object={scene} position={[0, MODEL_Y_OFFSET, 0]} />
      </group>
    </Ecctrl>
  )
}

useGLTF.preload(heroModelUrl)
