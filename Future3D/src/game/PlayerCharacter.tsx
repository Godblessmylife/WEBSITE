import { useEffect, useRef } from 'react'
import type { RefObject } from 'react'
import { useFrame } from '@react-three/fiber'
import { useAnimations, useGLTF, useKeyboardControls } from '@react-three/drei'
import { Ecctrl, type EcctrlHandle } from 'ecctrl'
import { useButtonStore, useJoystickStore } from 'ecctrl/input'
import { useCustomGravity } from 'ecctrl/gravity'
import * as THREE from 'three'
import { useGodModeStore } from '@/utils/godModeStore'
import { useDriveStore } from '@/utils/driveStore'
import { useHeroSelectionStore } from '@/utils/heroSelectionStore'
import { resolveHeroModel, WALK_CLIP_PATTERN } from '@/utils/heroModels'

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
// Тот же приём, что был у hero.glb (ноги у y=0) - hero-walk.glb тоже
// человеческого роста с ногами у основания, смещаем вниз на высоту
// капсулы, чтобы ступни совпадали с полом.
const MODEL_Y_OFFSET = -(CAPSULE_HALF_HEIGHT + CAPSULE_RADIUS)

// Имена клипов, как их сохранил Meshy AI/FBX-экспорт ("Armature|Armature|
// walking_man|baselayer" и т.п.) - длинные и с обеих сторон непредсказуемо
// точные, поэтому ищем по подстроке, а не по точному совпадению (см.
// merge-скрипт, которым была собрана hero-walk.glb - обе анимации взяты
// из разных FBX-файлов Meshy, но общего единого стандартного скелета).
const RUN_CLIP_PATTERN = /run/i
// Длительность перекрёстного затухания между состояниями - слишком
// быстро (значения близкие к 0) даёт заметный "скачок" позы при смене
// анимации, слишком медленно - персонаж ощутимо продолжает предыдущую
// анимацию после того, как уже должен был остановиться/побежать.
const FADE_DURATION = 0.2

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

type AnimState = 'idle' | 'walk' | 'run'

export function PlayerCharacter({ ecctrlRef }: { ecctrlRef: RefObject<EcctrlHandle | null> }) {
  // Модель выбирается через NPC (QuestNpc.tsx/QuestUI.tsx) - смена id
  // меняет URL, useGLTF сам подгружает новую модель (Suspense выше по
  // дереву, см. GameMode.tsx, уже обрабатывает загрузку).
  const selectedHeroId = useHeroSelectionStore((s) => s.selectedHeroId)
  const heroModelUrl = resolveHeroModel(selectedHeroId).url
  const { scene, animations } = useGLTF(heroModelUrl)
  const { actions } = useAnimations(animations, scene)
  const isDriving = useDriveStore((s) => !!s.drivingId)
  const tiltRef = useRef<THREE.Group>(null!)
  const yawRef = useRef(0)
  const wasGodModeRef = useRef(false)
  const animStateRef = useRef<AnimState>('idle')
  const [, getKeys] = useKeyboardControls()
  const setGravityField = useCustomGravity((s) => s.setGravityField)

  // Ищем нужные клипы один раз - Object.values(actions) не меняется между
  // рендерами, пересчитывать на каждый кадр незачем.
  const walkAction = useRef<ReturnType<typeof useAnimations>['actions'][string] | null>(null)
  const runAction = useRef<ReturnType<typeof useAnimations>['actions'][string] | null>(null)
  useEffect(() => {
    walkAction.current = Object.entries(actions).find(([name]) => WALK_CLIP_PATTERN.test(name))?.[1] ?? null
    runAction.current = Object.entries(actions).find(([name]) => RUN_CLIP_PATTERN.test(name))?.[1] ?? null
    // "Idle" - отдельного клипа нет (модель пришла только с ходьбой и
    // бегом) - используем застывший на нулевом кадре цикл ходьбы вместо
    // T-позы или анимации на паузе в случайной точке цикла: кадр 0 -
    // единственная точка цикла, которую можно предсказуемо застолбить
    // как "нейтральную стойку".
    walkAction.current?.reset().play()
    walkAction.current?.setEffectiveWeight(1)
    if (walkAction.current) {
      walkAction.current.paused = true
      walkAction.current.time = 0
    }
    animStateRef.current = 'idle'
  }, [actions])

  // Переключение между Idle/Walk/Run - вызывается только при СМЕНЕ
  // состояния (см. вызовы ниже), а не каждый кадр: crossFadeTo несёт
  // смысл только как переход, повторный вызов на тот же стейт каждый
  // кадр держал бы обе анимации в вечном 0.2с fade без завершения.
  const setAnimState = (next: AnimState) => {
    if (animStateRef.current === next) return
    const walk = walkAction.current
    const run = runAction.current
    animStateRef.current = next
    if (next === 'run' && run) {
      walk?.fadeOut(FADE_DURATION)
      run.reset().fadeIn(FADE_DURATION).play()
      return
    }
    if (next === 'walk' && walk) {
      run?.fadeOut(FADE_DURATION)
      walk.paused = false
      walk.reset().fadeIn(FADE_DURATION).play()
      return
    }
    // idle - застываем на ходьбе (кадр 0), см. комментарий выше.
    run?.fadeOut(FADE_DURATION)
    if (walk) {
      walk.paused = false
      walk.time = 0
      walk.reset().fadeIn(FADE_DURATION).play()
      walk.paused = true
    }
  }

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
    // За рулём машины (CarDriving.tsx) - персонаж стоит на месте и
    // спрятан (см. return ниже, visible={!isDriving} на группе с моделью),
    // движение полностью отдано CarDriving.tsx. То же "все клавиши
    // отпущены", что и в God Mode - без этого ecctrl продолжал бы пытаться
    // ходить телом, которое в этот момент невидимо стоит внутри машины.
    const isDriving = !!useDriveStore.getState().drivingId
    const keys = getKeys()
    const jumpButton = useButtonStore.getState().buttons.jump
    // Тач-джойстик (GameMode.tsx, id="move") - непрерывный x/y вместо 4
    // фиксированных направлений свайпа (по отзыву клиента "ходит только
    // влево/вправо/вперёд, куда тыкнул туда и пошёл" - свайп засчитывал
    // только ОДНО доминирующее направление на весь жест). ecctrl сам
    // складывает movement.joystick с forward/backward/leftward/rightward
    // (см. движок ecctrl) - клавиатурные булевы поля здесь остаются
    // только для десктопа (на мобильном keys всегда false, конфликта нет).
    const moveJoystick = useJoystickStore.getState().joysticks.move ?? EMPTY_JOYSTICK

    // В God Mode/за рулём Ecctrl не должен пытаться сам ходить/прыгать/
    // поворачивать персонажа обычным способом — передаём ему "все клавиши
    // отпущены", а не читаем джойстик/jump, иначе несколько систем
    // управления телом будут конкурировать одновременно.
    handle.setMovement(
      godMode || isDriving
        ? EMPTY_MOVEMENT
        : {
            forward: keys.forward,
            backward: keys.backward,
            leftward: keys.leftward,
            rightward: keys.rightward,
            run: keys.run,
            jump: keys.jump || !!jumpButton,
            joystick: { x: moveJoystick.x, y: moveJoystick.y },
          },
    )

    if (godMode || isDriving) {
      // Анимация ниже — только для обычной ходьбы по земле; во время
      // полёта/вождения персонаж либо невидим, либо не имитирует шаги.
      setAnimState('idle')
      return
    }

    // hero-walk.glb пришла с настоящим скелетом и двумя клипами (ходьба,
    // бег) - настоящая скелетная анимация вместо прежнего процедурного
    // наклона/подскока (hero.glb был вообще без скелета, см. историю в
    // соседнем плане). speed > 0 всё ещё определяет, движется ли
    // персонаж физически (ecctrl), но теперь просто переключает, КАКОЙ
    // клип проигрывается, а не как деформируется модель вручную.
    const speed = handle.relativeVelOnPlane.length()
    if (!handle.isMoving || speed < 0.05) {
      setAnimState('idle')
    } else if (keys.run) {
      setAnimState('run')
    } else {
      setAnimState('walk')
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
    // (на самом деле оно и не подключалось к этой ветке). Джойстик
    // (обычное движение) и кнопка "Прыжок"/"Вниз" (ecctrl/input,
    // GameMode.tsx) теперь читаются наравне с клавиатурой, как и в
    // обычном режиме выше. Порог 0.3 - джойстик редко стоит РОВНО в
    // нуле после отпускания пальца (дребезг в пару процентов), нужен
    // явный наклон, а не любое отклонение от центра.
    const keys = getKeys()
    const moveJoystick = useJoystickStore.getState().joysticks.move ?? EMPTY_JOYSTICK
    const jumpButton = useButtonStore.getState().buttons.jump
    const descendButton = useButtonStore.getState().buttons.descend

    if (keys.leftward || moveJoystick.x < -0.3) yawRef.current += GOD_YAW_SPEED * delta
    if (keys.rightward || moveJoystick.x > 0.3) yawRef.current -= GOD_YAW_SPEED * delta

    let thrust = 0
    if (keys.forward || moveJoystick.y > 0.3) thrust += 1
    if (keys.backward || moveJoystick.y < -0.3) thrust -= 1

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
      <group ref={tiltRef} visible={!isDriving}>
        <primitive object={scene} position={[0, MODEL_Y_OFFSET, 0]} />
      </group>
    </Ecctrl>
  )
}

// По отзыву клиента "выкидывает из игры через 5 секунд" на мобильном -
// раньше здесь безусловно предзагружались ОБЕ модели героя (~4 МБ
// суммарно текстур+геометрии в VRAM) ради мгновенной смены внешности
// через NPC, даже для игроков, ни разу не открывавших этот диалог.
// Теперь сразу грузится только реально используемая модель; вторая
// подгружается по требованию, когда открывается сам диалог смены
// внешности (см. QuestUI.tsx) - платим лишним МБ только те, кто
// действительно пользуется фичей.
useGLTF.preload(resolveHeroModel(useHeroSelectionStore.getState().selectedHeroId).url)
