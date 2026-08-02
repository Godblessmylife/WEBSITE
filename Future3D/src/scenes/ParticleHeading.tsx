import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useScrollStore } from '@/utils/scrollStore'
import { SOLAR_SYSTEM_LOOKAT_END } from './cameraPath'

// Заголовок "РАЗРАБОТКА ВЕБ-САЙТОВ" над солнечной системой - по просьбе
// клиента: белый текст, собранный из сотен частиц, который разлетается
// под курсором и плавно собирается обратно на место.
//
// Почему частицы, а не обычный DOM/canvas-текст (как остальные надписи
// сайта): "разлетается на частицы" - это не спецэффект НАД текстом, а
// сам текст ЕСТЬ рой частиц - должен быть настоящим THREE.Points, а не
// картинкой. Подход: один раз растеризуем текст на обычном 2D canvas,
// сэмплируем непрозрачные пиксели с шагом (см. SAMPLE_STEP) - координаты
// этих пикселей и есть "домашние" позиции частиц, дающие форму букв в
// состоянии покоя. Дальше это обычное облако точек (BufferGeometry),
// без всякой связи с исходным canvas.
const TEXT = 'РАЗРАБОТКА ВЕБ-САЙТОВ'
const CANVAS_W = 1536
const CANVAS_H = 220
const BASE_FONT_PX = 130
const CANVAS_PADDING = 60
// Шаг сэмплирования в пикселях canvas - меньше шаг -> больше частиц
// (плотнее и чётче буквы, но дороже). Подобран так, чтобы уложиться в
// "сотни частиц" ровно как попросил клиент, а не тысячи.
const SAMPLE_STEP = 6
// Ширина текста в мировых единицах сцены - подобрана и проверена
// скриншотом, чтобы помещаться в кадр по горизонтали при текущем
// FOV/расстоянии камеры (см. LOCAL_OFFSET.z ниже) без обрезки по краям.
const WORLD_WIDTH = 7.4

function sampleTextParticles(): Float32Array {
  const canvas = document.createElement('canvas')
  canvas.width = CANVAS_W
  canvas.height = CANVAS_H
  const ctx = canvas.getContext('2d')!
  ctx.clearRect(0, 0, CANVAS_W, CANVAS_H)
  ctx.fillStyle = '#fff'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'

  // Размер шрифта подгоняется под фактическую ширину текста, а не задан
  // фиксированным числом: на фиксированных 108px "РАЗРАБОТКА ВЕБ-САЙТОВ"
  // (21 символ, жирный шрифт) оказалась ШИРЕ, чем сам canvas - конец
  // строки ("ТОВ") просто не попадал в сэмплируемую область и пропадал
  // (найдено скриншотом при проверке). measureText - на глаз тут
  // угадать ширину без браузера было нельзя.
  ctx.font = `900 ${BASE_FONT_PX}px Arial, sans-serif`
  const measuredWidth = ctx.measureText(TEXT).width
  const maxWidth = CANVAS_W - CANVAS_PADDING * 2
  const fontPx = measuredWidth > maxWidth ? BASE_FONT_PX * (maxWidth / measuredWidth) : BASE_FONT_PX
  // Обычный жирный системный шрифт, не Orbitron: у Orbitron нет
  // кириллических глифов (латиница-only), браузер молча подменял бы
  // буквы дефолтным шрифтом всё равно - см. этот же вывод для остальных
  // кириллических заголовков сайта (ContactSection и т.д.).
  ctx.font = `900 ${fontPx}px Arial, sans-serif`
  ctx.fillText(TEXT, CANVAS_W / 2, CANVAS_H / 2 + 4)

  const { data } = ctx.getImageData(0, 0, CANVAS_W, CANVAS_H)
  const positions: number[] = []
  const aspect = CANVAS_H / CANVAS_W
  for (let y = 0; y < CANVAS_H; y += SAMPLE_STEP) {
    for (let x = 0; x < CANVAS_W; x += SAMPLE_STEP) {
      const alpha = data[(y * CANVAS_W + x) * 4 + 3]
      if (alpha < 140) continue
      const lx = (x / CANVAS_W - 0.5) * WORLD_WIDTH
      const ly = -(y / CANVAS_H - 0.5) * WORLD_WIDTH * aspect
      positions.push(lx, ly, 0)
    }
  }
  return new Float32Array(positions)
}

// Мягкая круглая точка вместо дефолтного квадратного пикселя у
// THREE.Points - без неё рой читался бы как шум из квадратиков, а не
// как аккуратный текст.
function createDotTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas')
  canvas.width = 64
  canvas.height = 64
  const ctx = canvas.getContext('2d')!
  const glow = ctx.createRadialGradient(32, 32, 0, 32, 32, 32)
  glow.addColorStop(0, 'rgba(255,255,255,1)')
  glow.addColorStop(0.5, 'rgba(255,255,255,0.65)')
  glow.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = glow
  ctx.fillRect(0, 0, 64, 64)
  return new THREE.CanvasTexture(canvas)
}

// Панель "прибита" к камере, как FloatingClock.tsx - гарантированно
// видна вверху кадра, а не в подобранных вручную мировых координатах,
// которые пришлось бы угадывать без возможности посмотреть в браузере.
// y положительный (не -3.2, как у часов внизу) - тот же приём, зеркально.
// Изначально было 3.5 - при проверке скриншотом текст наезжал на верхнее
// меню (О НАС/ПОРТФОЛИО/...) и обрезался краем экрана; 2.35 укладывает
// его между меню и кольцами солнечной системы.
const LOCAL_OFFSET = new THREE.Vector3(0, 2.35, -7)
const worldOffset = new THREE.Vector3()

// Окно видимости завязано на РЕАЛЬНУЮ константу камеры (когда камера
// перестаёт смотреть на солнце, см. cameraPath.ts), а не на придуманное
// число - иначе заголовок рисковал остаться висеть уже после того, как
// солнечная система уехала из кадра, или наоборот погаснуть раньше неё.
// Полностью виден с самого начала (progress=0) - без отдельного fade-in:
// smoothstep(x, min, max) в самой точке x=min возвращает ровно 0, так что
// версия с "нарастанием от 0 до FADE_IN_END" гасила заголовок насмерть
// до первого пикселя скролла (найдено скриншотом при проверке - надписи
// не было видно вообще, ни в покое, ни при наведении).
const FADE_OUT_START = SOLAR_SYSTEM_LOOKAT_END - 0.08
const FADE_OUT_END = SOLAR_SYSTEM_LOOKAT_END

// Курсор "выбивает" частицы из формы буквы в стороны (и чуть в глубину,
// для объёма), они плавно возвращаются на место, как только курсор
// уходит - RETURN медленнее SCATTER, чтобы разлёт читался как резкий
// "удар", а сборка обратно - как красивое, неторопливое доскладывание.
const REPEL_RADIUS = 1.1
const REPEL_STRENGTH = 1.4
const SCATTER_EASE = 0.35
const RETURN_EASE = 0.06

const raycaster = new THREE.Raycaster()
const plane = new THREE.Plane()
const planeNormal = new THREE.Vector3()
const worldHit = new THREE.Vector3()
const localHit = new THREE.Vector3()

export function ParticleHeading() {
  const groupRef = useRef<THREE.Group>(null!)
  const pointsRef = useRef<THREE.Points>(null!)
  const materialRef = useRef<THREE.PointsMaterial>(null!)

  const homePositions = useMemo(() => sampleTextParticles(), [])
  // current - реальный, мутируемый каждый кадр буфер позиций частиц
  // (то, что уходит в BufferGeometry); homePositions - неизменные
  // "родные" места частиц, к которым всё стремится вернуться.
  const currentPositions = useMemo(() => homePositions.slice(), [homePositions])
  // Небольшой случайный сдвиг направления разлёта на частицу - без него
  // все частицы разлетались бы строго по радиусу от курсора, что
  // выглядит слишком механически ровно для "красивого" эффекта.
  const jitter = useMemo(() => {
    const count = homePositions.length / 3
    const arr = new Float32Array(count * 2)
    for (let i = 0; i < arr.length; i++) arr[i] = (Math.random() - 0.5) * 0.6
    return arr
  }, [homePositions])
  const dotTexture = useMemo(() => createDotTexture(), [])

  useFrame((state) => {
    const progress = THREE.MathUtils.clamp(useScrollStore.getState().progress, 0, 1)
    const opacity = 1 - THREE.MathUtils.smoothstep(progress, FADE_OUT_START, FADE_OUT_END)
    const visible = opacity > 0.01

    groupRef.current.visible = visible
    if (!visible) return

    materialRef.current.opacity = opacity

    worldOffset.copy(LOCAL_OFFSET).applyQuaternion(state.camera.quaternion)
    groupRef.current.position.copy(state.camera.position).add(worldOffset)
    groupRef.current.quaternion.copy(state.camera.quaternion)

    // Плоскость заголовка всегда развёрнута на камеру (billboard) -
    // курсор пересекаем с этой же плоскостью в мировых координатах, а
    // затем переводим точку пересечения в локальные координаты группы,
    // чтобы сравнивать её напрямую с домашними позициями частиц.
    planeNormal.set(0, 0, 1).applyQuaternion(groupRef.current.quaternion)
    plane.setFromNormalAndCoplanarPoint(planeNormal, groupRef.current.position)
    raycaster.setFromCamera(state.pointer, state.camera)
    const hit = raycaster.ray.intersectPlane(plane, worldHit)
    if (hit) {
      groupRef.current.worldToLocal(localHit.copy(worldHit))
    } else {
      localHit.set(9999, 9999, 0)
    }

    const positions = pointsRef.current.geometry.attributes.position.array as Float32Array
    const count = positions.length / 3
    for (let i = 0; i < count; i++) {
      const ix = i * 3
      const iy = ix + 1
      const iz = ix + 2
      const hx = homePositions[ix]
      const hy = homePositions[iy]
      const cx = positions[ix]
      const cy = positions[iy]

      const dx = cx - localHit.x
      const dy = cy - localHit.y
      const distSq = dx * dx + dy * dy

      let targetX = hx
      let targetY = hy
      let targetZ = 0
      let ease = RETURN_EASE

      if (distSq < REPEL_RADIUS * REPEL_RADIUS) {
        const dist = Math.sqrt(distSq) || 0.0001
        const falloff = 1 - dist / REPEL_RADIUS
        const nx = dx / dist + jitter[i * 2]
        const ny = dy / dist + jitter[i * 2 + 1]
        targetX = hx + nx * falloff * REPEL_STRENGTH
        targetY = hy + ny * falloff * REPEL_STRENGTH
        targetZ = falloff * 0.5
        ease = SCATTER_EASE
      }

      positions[ix] += (targetX - cx) * ease
      positions[iy] += (targetY - cy) * ease
      positions[iz] += (targetZ - positions[iz]) * ease
    }
    pointsRef.current.geometry.attributes.position.needsUpdate = true
  })

  return (
    <group ref={groupRef}>
      <points ref={pointsRef}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[currentPositions, 3]} />
        </bufferGeometry>
        <pointsMaterial
          ref={materialRef}
          map={dotTexture}
          color="#f4f9ff"
          size={0.09}
          sizeAttenuation
          transparent
          opacity={0}
          depthWrite={false}
          toneMapped={false}
        />
      </points>
    </group>
  )
}
