import { useEffect, useMemo, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { useGLTF, OrbitControls, Stars } from '@react-three/drei'
import * as THREE from 'three'
import { useGameStore } from '@/utils/gameStore'
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

// Подсказки "зажми и поверни" / "зум" — по просьбе клиента: раньше
// ничто на экране не намекало, что компьютер вообще можно вращать/
// зумить (OrbitControls есть, но невидим глазу) - обычные DOM-бейджи
// по бокам от объекта, а не часть 3D-сцены (проще уложить в макет
// точным текстом/иконкой, не завязываясь на 3D-текст). pointerEvents:
// 'none' — чисто информационные, не должны перехватывать drag/зум
// у OrbitControls под ними.
function RotateIcon() {
  return (
    <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="#5fd4ff" strokeWidth="2" strokeLinecap="round">
      <path d="M3.5 12a8.5 8.5 0 1 0 2.9-6.4" />
      <path d="M3.5 3.8v5h5" />
    </svg>
  )
}

function ZoomIcon() {
  return (
    <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="#5fd4ff" strokeWidth="2" strokeLinecap="round">
      <circle cx="10.5" cy="10.5" r="6.5" />
      <line x1="20" y1="20" x2="15.4" y2="15.4" />
      <line x1="7.5" y1="10.5" x2="13.5" y2="10.5" />
      <line x1="10.5" y1="7.5" x2="10.5" y2="13.5" />
    </svg>
  )
}

const hintBadgeStyle: CSSProperties = {
  position: 'absolute',
  display: 'inline-flex',
  alignItems: 'center',
  gap: '0.5rem',
  padding: '0.5rem 1rem',
  background: 'rgba(10, 17, 32, 0.7)',
  border: '1px solid rgba(95, 212, 255, 0.5)',
  borderRadius: '999px',
  color: '#eafcff',
  fontFamily: "'Orbitron', sans-serif",
  fontSize: '0.75rem',
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  whiteSpace: 'nowrap',
  pointerEvents: 'none',
  animation: 'game-entry-hint-pulse 2.4s ease-in-out infinite',
}

function InteractionHints() {
  return (
    <>
      <div style={{ ...hintBadgeStyle, left: '6%', top: '48%', transform: 'translateY(-50%)' }}>
        Зажми
      </div>
      <div style={{ ...hintBadgeStyle, right: '6%', top: '48%', transform: 'translateY(-50%)', animationDelay: '0.4s' }}>
        <RotateIcon />
        Поверни · 360°
      </div>
      <div style={{ ...hintBadgeStyle, right: '6%', top: 'calc(48% + 3rem)', animationDelay: '0.8s' }}>
        <ZoomIcon />
        Приблизь
      </div>
      <style>{`
        @keyframes game-entry-hint-pulse {
          0%, 100% { opacity: 0.55; }
          50% { opacity: 1; }
        }
      `}</style>
    </>
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
  usePrefetchGame()

  return (
    <section
      id="game"
      style={{
        height: '100vh',
        position: 'relative',
        background:
          'radial-gradient(circle at 50% 38%, #182a45 0%, #0a1120 45%, #05070d 85%)',
      }}
    >
      {/* Пока идёт игра, этот Canvas всё равно полностью закрыт
          фикс-оверлеем GameMode - не рендерим его совсем, лишний живой
          WebGL-контекст на мобильном (см. подробности в JourneyScene.tsx,
          тот же клиентский баг "вылетает от малейшего лага"). */}
      {!isGameActive && (
        // touchAction: 'none' — иначе на телефоне жест вращения камеры
        // (OrbitControls) конкурирует со скроллом страницы через тот же
        // палец на канвасе.
        <Canvas camera={{ position: [0, 2.4, 5.8], fov: 45 }} style={{ touchAction: 'none' }}>
          {/* тот же "игровое меню" фон, что и под карточками портфолио */}
          <Stars radius={60} depth={30} count={2500} factor={3} saturation={0} fade speed={0.4} />
          <fog attach="fog" args={['#0a1120', 10, 30]} />

          <ambientLight intensity={0.6} />
          <directionalLight position={[3, 5, 4]} intensity={1.3} />
          <pointLight position={[0, 2.5, 1]} color="#5fd4ff" intensity={2.5} distance={9} />
          <Computer />
          <StartPlate onActivate={() => setGameActive(true)} />

          <OrbitControls
            target={[0, 1.5, 0]}
            enablePan={false}
            minDistance={2.5}
            maxDistance={9}
            minPolarAngle={Math.PI / 4}
            maxPolarAngle={Math.PI / 1.7}
          />
        </Canvas>
      )}
      {!isGameActive && <InteractionHints />}
    </section>
  )
}

useGLTF.preload(computerModelUrl)
