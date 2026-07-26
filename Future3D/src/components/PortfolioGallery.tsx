import { useMemo } from 'react'
import { Canvas } from '@react-three/fiber'
import { Environment, OrbitControls, Stars } from '@react-three/drei'
import cityHdri from '@pmndrs/assets/hdri/city.exr'
import { THEMES, createThemeTexture } from '@/utils/themeTexture'
import { useGalleryStore } from '@/utils/galleryStore'

const GALLERY_COUNT = 7
const CARD_SPACING = 2.1

// 7 временных сгенерированных карточек — по просьбе клиента, "на первое
// время", пока нет реальных проектов для показа. Переиспользует те же
// 5 тематических палитр, что и карусель (THEMES), но с явной пометкой
// "ПРОЕКТ 0N" вместо названия категории — чтобы было видно, что это
// временное место-заполнитель, а не готовый контент. Когда появятся
// реальные проекты — заменить на map={realProjectTexture} с реальными
// названиями, структура карточки (зеркальная рамка + текстура) уже
// готова, как и в PortfolioCarousel.
function GalleryCard({ index }: { index: number }) {
  const theme = THEMES[index % THEMES.length]
  const label = `ПРОЕКТ ${String(index + 1).padStart(2, '0')}`
  const texture = useMemo(() => createThemeTexture(theme, label), [theme, label])
  const x = (index - (GALLERY_COUNT - 1) / 2) * CARD_SPACING

  return (
    <group position={[x, 0, 0]}>
      <mesh>
        <boxGeometry args={[1.7, 2.3, 0.06]} />
        <meshStandardMaterial color="#eef2f6" metalness={1} roughness={0.06} envMapIntensity={1.5} />
      </mesh>
      <mesh position={[0, 0, 0.035]}>
        <planeGeometry args={[1.5, 2.1]} />
        <meshStandardMaterial map={texture} metalness={0.1} roughness={0.4} />
      </mesh>
    </group>
  )
}

// Полноэкранный оверлей — открывается двойным кликом по карточке в
// PortfolioCarousel. Тот же архитектурный приём, что и у GameMode:
// фиксированный div поверх всего сайта, пока isOpen. OrbitControls (как
// в GameEntry) — покрутить/приблизить ряд карточек вместо перетаскивания
// вручную, зум ограничен, чтобы весь ряд оставался в разумных пределах.
export function PortfolioGallery() {
  const setOpen = useGalleryStore((s) => s.setOpen)

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1000 }}>
      <Canvas camera={{ position: [0, 1.4, 9], fov: 50 }} style={{ touchAction: 'none' }}>
        <Stars radius={60} depth={30} count={2500} factor={3} saturation={0} fade speed={0.4} />
        <fog attach="fog" args={['#0a1120', 10, 32]} />
        <ambientLight intensity={0.5} />
        <directionalLight position={[5, 8, 5]} intensity={1.2} />
        <Environment files={cityHdri} />

        {Array.from({ length: GALLERY_COUNT }, (_, i) => (
          <GalleryCard key={i} index={i} />
        ))}

        <OrbitControls
          enablePan={false}
          minDistance={4}
          maxDistance={18}
          minPolarAngle={Math.PI / 4}
          maxPolarAngle={Math.PI / 1.7}
        />
      </Canvas>

      <p
        style={{
          position: 'absolute',
          top: 'calc(1.5rem + env(safe-area-inset-top))',
          left: '50%',
          transform: 'translateX(-50%)',
          fontFamily: "'Orbitron', sans-serif",
          color: '#5fd4ff',
          letterSpacing: '0.2em',
          fontSize: '0.85rem',
          zIndex: 1001,
          pointerEvents: 'none',
        }}
      >
        ГАЛЕРЕЯ ПРОЕКТОВ
      </p>

      <button
        onClick={() => setOpen(false)}
        style={{
          position: 'absolute',
          top: 'calc(1.5rem + env(safe-area-inset-top))',
          right: 'calc(1.5rem + env(safe-area-inset-right))',
          padding: '0.6rem 1.4rem',
          minHeight: '2.75rem',
          background: 'rgba(10, 17, 32, 0.6)',
          border: '1px solid rgba(95, 212, 255, 0.6)',
          borderRadius: '999px',
          color: '#eafcff',
          fontFamily: "'Orbitron', sans-serif",
          cursor: 'pointer',
          touchAction: 'manipulation',
          zIndex: 1001,
        }}
      >
        Закрыть
      </button>
    </div>
  )
}
