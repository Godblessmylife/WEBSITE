import { useEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { useGLTF, OrbitControls, Stars } from '@react-three/drei'
import * as THREE from 'three'
import { useGameStore } from '@/utils/gameStore'
import { useInView } from '@/hooks/useInView'
import { useIsMobileViewport } from '@/utils/useIsMobileViewport'
import computerModelUrl from '../models/computer.glb'

// Клик по START раньше запускал ОДНОВРЕМЕННО: скачивание ~2.2 МБ (gzip)
// JS-чанка игры (App.tsx: React.lazy) И первую загрузку/декодирование
// ДЕСЯТКА с лишним .glb-моделей (герой, оба портала, вся карта из
// MapProps.tsx, Земля для космоса) - на не самом быстром интернете или
// слабом устройстве это одномоментное "стадо" запросов иногда не
// укладывалось в разумное время, ErrorBoundary (GameErrorBoundary.tsx)
// ловил итоговую ошибку/таймаут, и игра "выкидывало обратно" - вторая
// попытка уже проходила на прогретом кеше браузера. Предзагрузка чанка
// (а вместе с ним - и всех model.glb, у них у всех есть useGLTF.preload
// на верхнем уровне модуля, который выполнится как побочный эффект
// импорта) заранее, в простое браузера, размазывает эту нагрузку по
// времени просмотра сайта вместо разового всплеска в момент клика.
function usePrefetchGame() {
  useEffect(() => {
    let idleId: number | undefined
    let timeoutId: ReturnType<typeof setTimeout> | undefined

    const prefetch = () => {
      import('@/game/GameMode')
    }

    const ric = (window as typeof window & { requestIdleCallback?: (cb: () => void) => number })
      .requestIdleCallback
    if (typeof ric === 'function') {
      idleId = ric(prefetch)
    } else {
      // Safari не знает requestIdleCallback - небольшая задержка вместо
      // него, чтобы не конкурировать с загрузкой самой первой секции сайта.
      timeoutId = setTimeout(prefetch, 2500)
    }

    return () => {
      if (idleId !== undefined) {
        ;(window as typeof window & { cancelIdleCallback?: (id: number) => void }).cancelIdleCallback?.(
          idleId,
        )
      }
      if (timeoutId !== undefined) clearTimeout(timeoutId)
    }
  }, [])
}

// "START" нарисован на canvas (тот же приём, что и тематические
// заставки карточек портфолио — без завязки на библиотеку 3D-текста).
function createStartTexture() {
  const canvas = document.createElement('canvas')
  canvas.width = 512
  canvas.height = 160
  const ctx = canvas.getContext('2d')!

  ctx.clearRect(0, 0, canvas.width, canvas.height)

  const glow = ctx.createRadialGradient(
    canvas.width / 2, canvas.height / 2, 0,
    canvas.width / 2, canvas.height / 2, canvas.width / 2,
  )
  glow.addColorStop(0, 'rgba(95, 212, 255, 0.45)')
  glow.addColorStop(1, 'rgba(95, 212, 255, 0)')
  ctx.fillStyle = glow
  ctx.fillRect(0, 0, canvas.width, canvas.height)

  ctx.font = 'bold 96px sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillStyle = '#eafcff'
  ctx.shadowColor = '#5fd4ff'
  ctx.shadowBlur = 24
  ctx.fillText('START', canvas.width / 2, canvas.height / 2)

  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  return texture
}

// Компьютер увеличен вдвое (клиент попросил сделать больше) — плашка
// START поднята пропорционально выше, иначе она оказалась бы вровень с
// увеличенным монитором вместо того, чтобы парить над ним.
const COMPUTER_SCALE = 2
const PLATE_Y = 2.6

function StartPlate({ onActivate }: { onActivate: () => void }) {
  const texture = useMemo(() => createStartTexture(), [])
  const groupRef = useRef<THREE.Group>(null!)
  const [hovered, setHovered] = useState(false)

  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    groupRef.current.position.y = PLATE_Y + Math.sin(t * 1.4) * 0.08
    const scale = hovered ? 1.15 : 1
    groupRef.current.scale.setScalar(THREE.MathUtils.lerp(groupRef.current.scale.x, scale, 0.15))
  })

  return (
    <group ref={groupRef} position={[0, PLATE_Y, 0]}>
      <mesh
        onClick={onActivate}
        onPointerOver={() => {
          setHovered(true)
          document.body.style.cursor = 'pointer'
        }}
        onPointerOut={() => {
          setHovered(false)
          document.body.style.cursor = 'auto'
        }}
      >
        <planeGeometry args={[2.4, 0.75]} />
        <meshBasicMaterial map={texture} transparent toneMapped={false} />
      </mesh>
    </group>
  )
}

function Computer() {
  const { scene } = useGLTF(computerModelUrl)
  return <primitive object={scene} scale={COMPUTER_SCALE} />
}

// Мягкое белое кольцо-свечение под компьютером - "неоновая подсветка"
// по просьбе клиента. Не настоящий источник света (это делает
// NeonAccentLight ниже), а декоративное пятно на текстуре - тот же
// приём, что и у радиального свечения за плашкой START (createStartTexture).
// Кольцо (а не сплошной круг) читается как настоящий неоновый контур на
// полу, а не просто размытое пятно.
function createNeonGlowTexture() {
  const canvas = document.createElement('canvas')
  canvas.width = 256
  canvas.height = 256
  const ctx = canvas.getContext('2d')!
  const cx = 128
  const cy = 128
  const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, 128)
  glow.addColorStop(0, 'rgba(255,255,255,0.05)')
  glow.addColorStop(0.62, 'rgba(255,255,255,0.1)')
  glow.addColorStop(0.78, 'rgba(255,255,255,0.85)')
  glow.addColorStop(0.9, 'rgba(255,255,255,0.15)')
  glow.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = glow
  ctx.fillRect(0, 0, 256, 256)
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  return texture
}

function NeonBaseGlow() {
  const texture = useMemo(() => createNeonGlowTexture(), [])
  const meshRef = useRef<THREE.Mesh>(null!)

  useFrame(({ clock }) => {
    const pulse = 0.92 + Math.sin(clock.elapsedTime * 1.6) * 0.08
    meshRef.current.scale.setScalar(pulse)
  })

  return (
    <mesh ref={meshRef} position={[0, -0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[4.6, 4.6]} />
      <meshBasicMaterial
        map={texture}
        color="#eafcff"
        transparent
        toneMapped={false}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </mesh>
  )
}

// Секция после карусели портфолио: компьютер + висящая надпись START.
// Клик по надписи включает isGameActive (см. utils/gameStore.ts) —
// App.tsx монтирует поверх всего GameMode, когда флаг включён.
//
// OrbitControls с target на плашку решают сразу два запроса: камера
// теперь ГАРАНТИРОВАННО смотрит на компьютер+START (раньше камера
// стояла без явного lookAt — рассчитывать на смотрение "куда-то в
// сторону начала координат по умолчанию" было ошибкой), и добавляют
// зум колёсиком/щипком без написания своей логики.
export function GameEntry() {
  const setGameActive = useGameStore((s) => s.setGameActive)
  const isGameActive = useGameStore((s) => s.isGameActive)
  // Canvas отложен до приближения к области видимости - см. useInView.ts
  // и общее объяснение проблемы в JourneyScene.tsx (эта секция - самая
  // последняя на странице, и раньше её Canvas всё равно жил с первой
  // секунды загрузки, хотя пользователь может вообще не долистать сюда).
  const [sectionRef, inView] = useInView<HTMLElement>()
  const isMobile = useIsMobileViewport()
  usePrefetchGame()

  return (
    <section
      id="game"
      ref={sectionRef}
      style={{
        height: '100vh',
        position: 'relative',
        // Фон убран отсюда - секция теперь часть общего непрерывного фона
        // с ContactSection (см. обёртку в App.tsx, тот же комментарий).
      }}
    >
      {/* Пока идёт игра, этот Canvas всё равно полностью закрыт
          фикс-оверлеем GameMode - не рендерим его совсем, лишний живой
          WebGL-контекст на мобильном (см. подробности в JourneyScene.tsx,
          тот же клиентский баг "вылетает от малейшего лага"). */}
      {!isGameActive && inView && (
        // БАГ (по отзыву клиента: "доскроллив до конца, обратно вверх не
        // скроллится - застревает на 3D-модели где START"): дело было не
        // только в touchAction/OrbitControls - у самого R3F есть
        // собственный обработчик тач-событий для раскаста в 3D (клик по
        // StartPlate ниже), и он вызывает preventDefault на touchmove
        // независимо от touchAction в CSS (это подсказка ДЛЯ БРАУЗЕРА,
        // но явный preventDefault в непассивном обработчике её
        // перебивает) - на телефоне канвас растянут на весь экран
        // (последняя секция), увести палец мимо него при скролле снизу
        // вверх было физически невозможно. На мобильном канвас теперь
        // ПОЛНОСТЬЮ выключен из хит-теста (pointerEvents:'none') - раз
        // там и так нет мыши, чтобы навести курсор и покрутить модель,
        // вращение (OrbitControls) там всё равно ничего не даёт. Тап по
        // START теперь ловит обычный DOM-div поверх канваса (см. ниже) -
        // обычный клик не мешает скроллу (в отличие от драга), а сам
        // канвас с этого момента для тач-событий как будто не существует.
        <Canvas
          camera={{ position: [0, 2.1, 4.3], fov: 45 }}
          style={{ touchAction: isMobile ? 'pan-y' : 'none', pointerEvents: isMobile ? 'none' : 'auto' }}
        >
          {/* тот же "игровое меню" фон, что и под карточками портфолио */}
          <Stars radius={60} depth={30} count={2500} factor={3} saturation={0} fade speed={0.4} />
          <fog attach="fog" args={['#0a1120', 10, 30]} />

          <ambientLight intensity={0.6} />
          <directionalLight position={[3, 5, 4]} intensity={1.3} />
          <pointLight position={[0, 2.5, 1]} color="#5fd4ff" intensity={2.5} distance={9} />
          {/* Белая неоновая подсветка компьютера по просьбе клиента - как
              настоящий свет снизу (лёгкий контровой эффект на корпусе), так
              и декоративное кольцо-свечение на "полу" под ним. */}
          <pointLight position={[0, 0.4, 1]} color="#ffffff" intensity={1.4} distance={5} />
          <NeonBaseGlow />
          <Computer />
          <StartPlate onActivate={() => setGameActive(true)} />

          <OrbitControls
            enabled={!isMobile}
            target={[0, 1.5, 0]}
            enablePan={false}
            minDistance={2}
            maxDistance={6.5}
            minPolarAngle={Math.PI / 4}
            maxPolarAngle={Math.PI / 1.7}
          />
        </Canvas>
      )}
      {/* Тап "куда угодно" в этой секции запускает игру - раз канвас на
          мобильном больше не ловит тач (см. комментарий выше), а сама
          3D-надпись START в нём визуально всё равно по центру, попасть
          пальцем точно НА неё через невидимый канвас всё равно не
          получилось бы. Обычный клик (без сдвига пальца) не блокирует
          скролл - блокирует только drag, так что жест "провести пальцем
          вверх/вниз, чтобы проскроллить" продолжает работать как обычно. */}
      {!isGameActive && inView && isMobile && (
        <div
          onClick={() => setGameActive(true)}
          style={{ position: 'absolute', inset: 0, cursor: 'pointer' }}
          aria-label="Начать игру"
          role="button"
        />
      )}
    </section>
  )
}

useGLTF.preload(computerModelUrl)
