import { useMemo, useRef } from 'react'
import type { PointerEvent as ReactPointerEvent, RefObject } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import type { ThreeEvent } from '@react-three/fiber'
import { Environment, Stars } from '@react-three/drei'
import * as THREE from 'three'
import cityHdri from '@pmndrs/assets/hdri/city.exr'
import { THEMES, createThemeTexture } from '@/utils/themeTexture'
import { useGalleryStore } from '@/utils/galleryStore'
import { useGameStore } from '@/utils/gameStore'
import { useIsMobileViewport } from '@/utils/useIsMobileViewport'
import { useInView } from '@/hooks/useInView'

const CARD_COUNT = 5
const CARD_RADIUS = 3.4

interface DragState {
  active: boolean
  lastX: number
  lastTime: number
  velocity: number
}

// Скорость, к которой скорость вращения плавно возвращается сама (лёгкое
// фоновое вращение, когда карусель никто не трогает) - было раньше
// фиксированным значением, теперь это "дно", ниже которого спиннер не
// тормозит после свайпа.
const IDLE_VELOCITY = 0.15
// Экспоненциальное затухание скорости к IDLE_VELOCITY после отпускания -
// не зависит от FPS (в отличие от умножения на константу каждый кадр),
// см. формулу в useFrame ниже. Меньше число - дольше крутится.
const SPIN_DECAY_RATE = 1.1
// Защита от аномально большой скорости при коротком дребезге pointer-
// событий (dt около нуля даёт огромное dx/dt) - иначе резкий свайп мог
// закрутить карусель на неадекватную скорость на один кадр.
const MAX_SPIN_VELOCITY = 10

// Двойной клик по карточке — открыть 3D-галерею проектов (см.
// PortfolioGallery.tsx). stopPropagation не нужен: onDoubleClick — это
// отдельное синтетическое событие R3F, drag-вращение карусели слушает
// onPointerDown/Move/Up на самом Canvas и живёт своей жизнью независимо.
function Card({ index }: { index: number }) {
  const angle = (index / CARD_COUNT) * Math.PI * 2
  const theme = THEMES[index % THEMES.length]
  const texture = useMemo(() => createThemeTexture(theme), [theme])
  const openGallery = useGalleryStore((s) => s.setOpen)

  const onDoubleClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation()
    openGallery(true)
  }

  return (
    <group
      position={[Math.sin(angle) * CARD_RADIUS, 0, Math.cos(angle) * CARD_RADIUS]}
      rotation={[0, angle, 0]}
    >
      {/* зеркальная рамка: высокий metalness + низкий roughness +
          окружение (Environment) дают настоящее отражение сцены вокруг */}
      <mesh onDoubleClick={onDoubleClick}>
        <boxGeometry args={[1.7, 2.3, 0.06]} />
        <meshStandardMaterial color="#eef2f6" metalness={1} roughness={0.06} envMapIntensity={1.5} />
      </mesh>
      <mesh position={[0, 0, 0.035]} onDoubleClick={onDoubleClick}>
        <planeGeometry args={[1.5, 2.1]} />
        <meshStandardMaterial map={texture} metalness={0.1} roughness={0.4} />
      </mesh>
    </group>
  )
}

function Carousel({
  dragRef,
  rotationRef,
  scale,
}: {
  dragRef: RefObject<DragState>
  rotationRef: RefObject<number>
  scale: number
}) {
  const groupRef = useRef<THREE.Group>(null!)

  useFrame((_, delta) => {
    if (!dragRef.current.active) {
      // По просьбе клиента: свайп задаёт каруселе инерцию, как у спиннера
      // - резко крутится и постепенно, плавно замедляется, а не сразу
      // возвращается к тихому фоновому вращению. exp(-rate*delta) -
      // экспоненциальное затухание РАЗНИЦЫ между текущей скоростью и
      // "полом" (IDLE_VELOCITY), не зависящее от частоты кадров.
      dragRef.current.velocity =
        IDLE_VELOCITY + (dragRef.current.velocity - IDLE_VELOCITY) * Math.exp(-SPIN_DECAY_RATE * delta)
      rotationRef.current += dragRef.current.velocity * delta
    }
    groupRef.current.rotation.y = rotationRef.current
  })

  return (
    <group ref={groupRef} scale={scale}>
      {THEMES.map((_, i) => (
        <Card key={i} index={i} />
      ))}
    </group>
  )
}

// Секция портфолио — идёт СРАЗУ ПОСЛЕ 3D-путешествия в обычном потоке
// страницы (не часть закреплённой сцены). JourneyScene закреплена через
// position:sticky внутри своего скролл-спейсера (см. App.tsx) — когда
// спейсер заканчивается, sticky-блок естественно "отпускает" 3D-сцену
// и она уходит вверх экрана, открывая эту секцию — без ручного JS.
export function PortfolioCarousel() {
  // Не размонтировался, пока идёт игра - лишний живой WebGL-контекст на
  // мобильном (см. подробности в JourneyScene.tsx).
  const isGameActive = useGameStore((s) => s.isGameActive)
  const isMobile = useIsMobileViewport()
  const dragRef = useRef<DragState>({ active: false, lastX: 0, lastTime: 0, velocity: IDLE_VELOCITY })
  const rotationRef = useRef(0)
  // Canvas отложен до приближения к области видимости - см. useInView.ts
  // и общее объяснение проблемы в JourneyScene.tsx (все Canvas-секции
  // ниже путешествия раньше жили одновременно с самой первой секунды).
  const [sectionRef, inView] = useInView<HTMLElement>()

  if (isGameActive) return null

  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    dragRef.current.active = true
    dragRef.current.lastX = e.clientX
    dragRef.current.lastTime = performance.now()
  }
  const onPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!dragRef.current.active) return
    const now = performance.now()
    const dx = e.clientX - dragRef.current.lastX
    // Секунды, не миллисекунды - тот же масштаб времени, что и delta в
    // useFrame (Carousel), иначе скорость после отпускания оказалась бы
    // в тысячу раз меньше/больше, чем нужно для формулы затухания там.
    const dt = Math.max((now - dragRef.current.lastTime) / 1000, 1 / 240)
    const dRotation = dx * 0.01
    rotationRef.current += dRotation
    // Скорость в "радианах в секунду" - последнее значение перед
    // отпусканием становится начальной скоростью спиннера (см. useFrame
    // в Carousel: пока active===true эта скорость не используется для
    // вращения, только запоминается на момент onPointerUp).
    dragRef.current.velocity = THREE.MathUtils.clamp(dRotation / dt, -MAX_SPIN_VELOCITY, MAX_SPIN_VELOCITY)
    dragRef.current.lastX = e.clientX
    dragRef.current.lastTime = now
  }
  const onPointerUp = () => {
    dragRef.current.active = false
  }

  return (
    <section
      id="portfolio"
      ref={sectionRef}
      style={{
        height: '100vh',
        position: 'relative',
        background:
          'radial-gradient(circle at 50% 38%, #182a45 0%, #0a1120 45%, #05070d 85%)',
      }}
    >
      {inView && (
      <Canvas
        camera={{ position: [0, 1.4, 8.5], fov: 50 }}
        // БЫЛО touchAction:'none' - блокировало ЛЮБОЙ дефолтный тач-жест
        // на канвасе, включая обычный вертикальный скролл страницы: по
        // жалобе клиента "перейдя на эту вкладку дальше прокрутка
        // ломается" - т.к. канвас растянут на весь экран (100vh), палец
        // почти гарантированно стартует на нём. 'pan-y' оставляет
        // браузеру дефолтную вертикальную прокрутку, а горизонтальный
        // drag-поворот карусели по-прежнему ловится через onPointerMove
        // (это JS-обработчики, не зависят от touchAction - он влияет
        // только на встроенные жесты браузера).
        style={{ touchAction: 'pan-y', cursor: 'grab' }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerUp}
      >
        {/* лёгкий "игровое меню" фон вместо сплошной черноты: звёзды +
            мягкое туманное затемнение к краям кадра */}
        <Stars radius={60} depth={30} count={2500} factor={3} saturation={0} fade speed={0.4} />
        <fog attach="fog" args={['#0a1120', 8, 26]} />
        <ambientLight intensity={0.5} />
        <directionalLight position={[5, 8, 5]} intensity={1.2} />
        <Environment files={cityHdri} />
        {/* Компактнее на мобильном по просьбе клиента - масштаб самой
            карусели уменьшен, камера не трогается (проще и меньше риска
            промахнуться мимо кадра, чем пересчитывать позицию/fov). */}
        <Carousel dragRef={dragRef} rotationRef={rotationRef} scale={isMobile ? 0.72 : 1} />
      </Canvas>
      )}
    </section>
  )
}
