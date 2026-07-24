import { useMemo, useRef, useState } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { useGLTF, OrbitControls, Stars } from '@react-three/drei'
import * as THREE from 'three'
import { useGameStore } from '@/utils/gameStore'
import computerModelUrl from '../models/computer.glb'

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

// Раньше плашка висела на y=1.9 при компьютере высотой ~0.85 — заметный
// разрыв, из-за которого её было легко не заметить (плюс камера не
// была явно направлена на неё). Опущена ближе и увеличена.
const PLATE_Y = 1.15

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
  return <primitive object={scene} />
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
      {/* touchAction: 'none' — иначе на телефоне жест вращения камеры
          (OrbitControls) конкурирует со скроллом страницы через тот же
          палец на канвасе. */}
      <Canvas camera={{ position: [0, 1.6, 3.6], fov: 45 }} style={{ touchAction: 'none' }}>
        {/* тот же "игровое меню" фон, что и под карточками портфолио */}
        <Stars radius={60} depth={30} count={2500} factor={3} saturation={0} fade speed={0.4} />
        <fog attach="fog" args={['#0a1120', 8, 26]} />

        <ambientLight intensity={0.6} />
        <directionalLight position={[3, 5, 4]} intensity={1.3} />
        <pointLight position={[0, 2, 1]} color="#5fd4ff" intensity={2} distance={6} />
        <Computer />
        <StartPlate onActivate={() => setGameActive(true)} />

        <OrbitControls
          target={[0, PLATE_Y, 0]}
          enablePan={false}
          minDistance={1.5}
          maxDistance={6}
          minPolarAngle={Math.PI / 4}
          maxPolarAngle={Math.PI / 1.7}
        />
      </Canvas>
    </section>
  )
}

useGLTF.preload(computerModelUrl)
