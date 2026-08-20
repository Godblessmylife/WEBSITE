import { useState } from 'react'
import { createPortal } from 'react-dom'
import type { CSSProperties } from 'react'
import { useGraphicsQualityStore, MIN_FOV, MAX_FOV, MIN_DRAW_DISTANCE_MULTIPLIER, MAX_DRAW_DISTANCE_MULTIPLIER } from '@/utils/graphicsQualityStore'
import type { GraphicsQuality } from '@/utils/graphicsQualityStore'
import { useCraftStore } from '@/utils/craftStore'
import { useIsMobileViewport } from '@/utils/useIsMobileViewport'
import { ControlsInfoModal } from './ControlsInfoModal'
import { InstallAppButton } from './InstallAppButton'

const QUALITY_LABELS: Record<GraphicsQuality, string> = {
  high: 'Высокое',
  medium: 'Среднее',
  low: 'Низкое',
}
const QUALITY_ORDER: GraphicsQuality[] = ['high', 'medium', 'low']
const GEAR_TEETH = 8

// Раньше зубцы шестерёнки были одним вручную нарисованным path - на
// глаз кривым (отзыв клиента "шестерёнка кривая"), скорее всего из-за
// неточно подобранных координат кривых Безье. Заменено на честно
// симметричную фигуру: одна и та же короткая линия, повёрнутая на
// равный угол N раз - кривой геометрически быть не может, зубцы всегда
// строго одинаковые и равномерные по построению, а не "на глаз".
function GearIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <g stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
        {Array.from({ length: GEAR_TEETH }, (_, i) => (
          <line
            key={i}
            x1="12"
            y1="1.8"
            x2="12"
            y2="4.6"
            transform={`rotate(${(360 / GEAR_TEETH) * i} 12 12)`}
          />
        ))}
      </g>
      <circle cx="12" cy="12" r="7.2" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="12" cy="12" r="2.6" fill="currentColor" />
    </svg>
  )
}

// Кнопка-шестерёнка с выпадающей панелью настроек:
// - Качество графики (Высокое/Среднее/Низкое) - по отзыву клиента "верни
//   качество игры, если у кого слабый телефон пусть в настройках сделает
//   слабее": дефолт качества теперь высокий для всех (graphicsQualityStore
//   .ts), понижение - осознанный выбор владельца слабого устройства.
// - Режим перемещения объектов - см. подробный комментарий в
//   craftStore.ts про то, почему это отдельный переключатель, а не
//   всегда включено: невидимая зона джойстика (DynamicJoystick.tsx)
//   перехватывает касания раньше, чем они доходят до объектов карты, оба
//   способа управления касанием одновременно работать не могут.
export function GraphicsSettingsButton({ style }: { style?: CSSProperties }) {
  const [open, setOpen] = useState(false)
  const [controlsOpen, setControlsOpen] = useState(false)
  const isMobile = useIsMobileViewport()
  const quality = useGraphicsQualityStore((s) => s.quality)
  const setQuality = useGraphicsQualityStore((s) => s.setQuality)
  const fov = useGraphicsQualityStore((s) => s.fov)
  const setFov = useGraphicsQualityStore((s) => s.setFov)
  const drawDistanceMultiplier = useGraphicsQualityStore((s) => s.drawDistanceMultiplier)
  const setDrawDistanceMultiplier = useGraphicsQualityStore((s) => s.setDrawDistanceMultiplier)
  const shadowsEnabled = useGraphicsQualityStore((s) => s.shadowsEnabled)
  const setShadowsEnabled = useGraphicsQualityStore((s) => s.setShadowsEnabled)
  const moveModeEnabled = useCraftStore((s) => s.moveModeEnabled)
  const setMoveModeEnabled = useCraftStore((s) => s.setMoveModeEnabled)

  return (
    <div style={{ position: 'absolute', zIndex: 1001, ...style }}>
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="Настройки графики"
        style={{
          width: '2.1rem',
          height: '2.1rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'rgba(10, 17, 32, 0.6)',
          border: '1px solid rgba(255, 255, 255, 0.25)',
          borderRadius: '50%',
          color: '#eafcff',
          cursor: 'pointer',
          touchAction: 'manipulation',
        }}
      >
        <GearIcon />
      </button>
      {open && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 0.5rem)',
            left: '50%',
            transform: 'translateX(-50%)',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.35rem',
            padding: '0.6rem',
            background: 'rgba(10, 17, 32, 0.92)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            borderRadius: '12px',
            minWidth: '170px',
            // БАГ (по отзыву клиента): панель раскрывается ВНИЗ от кнопки,
            // которая сама стоит у самого верха экрана - на мобильном с
            // коротким viewport и уже выросшим списком настроек (качество
            // + FOV + дальность + тени + перемещение объектов + новые
            // секции ниже) панель упиралась в нижний край и обрезалась.
            // maxHeight + собственный скролл - показывает всё содержимое,
            // просто с прокруткой внутри панели, а не наружу за экран.
            maxHeight: isMobile ? '70vh' : '80vh',
            overflowY: 'auto',
          }}
        >
          <span
            style={{
              color: '#9db2c9',
              fontFamily: "'Orbitron', sans-serif",
              fontSize: '0.6rem',
              letterSpacing: '0.05em',
              marginBottom: '0.15rem',
              whiteSpace: 'nowrap',
            }}
          >
            КАЧЕСТВО ГРАФИКИ
          </span>
          {QUALITY_ORDER.map((q) => (
            <button
              key={q}
              onClick={() => {
                setQuality(q)
                setOpen(false)
              }}
              style={{
                padding: '0.4rem 0.6rem',
                borderRadius: '8px',
                border: quality === q ? '1px solid rgba(95, 212, 255, 0.8)' : '1px solid transparent',
                background: quality === q ? 'rgba(95, 212, 255, 0.15)' : 'transparent',
                color: quality === q ? '#5fd4ff' : '#eafcff',
                fontFamily: "'Orbitron', sans-serif",
                fontSize: '0.72rem',
                textAlign: 'left',
                cursor: 'pointer',
                touchAction: 'manipulation',
              }}
            >
              {QUALITY_LABELS[q]}
            </button>
          ))}

          <div style={{ height: '1px', background: 'rgba(255,255,255,0.15)', margin: '0.3rem 0' }} />

          {/* Дополнение 6 - по просьбе клиента "настройки графики более
              подробные, что-то на подобии WoW/GTA6" - три реально
              влияющих на картинку параметра (не декоративные заглушки). */}
          <span
            style={{
              color: '#9db2c9',
              fontFamily: "'Orbitron', sans-serif",
              fontSize: '0.6rem',
              letterSpacing: '0.05em',
              marginBottom: '0.15rem',
              whiteSpace: 'nowrap',
            }}
          >
            УГОЛ ОБЗОРА (FOV): {fov}°
          </span>
          <input
            type="range"
            min={MIN_FOV}
            max={MAX_FOV}
            step={1}
            value={fov}
            onChange={(e) => setFov(Number(e.currentTarget.value))}
            style={{ accentColor: '#5fd4ff', cursor: 'pointer', width: '100%' }}
          />

          <span
            style={{
              color: '#9db2c9',
              fontFamily: "'Orbitron', sans-serif",
              fontSize: '0.6rem',
              letterSpacing: '0.05em',
              margin: '0.3rem 0 0.15rem',
              whiteSpace: 'nowrap',
            }}
          >
            ДАЛЬНОСТЬ ПРОРИСОВКИ: {Math.round(drawDistanceMultiplier * 100)}%
          </span>
          <input
            type="range"
            min={MIN_DRAW_DISTANCE_MULTIPLIER * 100}
            max={MAX_DRAW_DISTANCE_MULTIPLIER * 100}
            step={5}
            value={Math.round(drawDistanceMultiplier * 100)}
            onChange={(e) => setDrawDistanceMultiplier(Number(e.currentTarget.value) / 100)}
            style={{ accentColor: '#5fd4ff', cursor: 'pointer', width: '100%' }}
          />

          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.4rem 0.6rem',
              marginTop: '0.2rem',
              borderRadius: '8px',
              cursor: 'pointer',
              touchAction: 'manipulation',
            }}
          >
            <input
              type="checkbox"
              checked={shadowsEnabled}
              onChange={(e) => setShadowsEnabled(e.currentTarget.checked)}
              style={{ width: '1rem', height: '1rem', accentColor: '#5fd4ff', cursor: 'pointer' }}
            />
            <span style={{ color: '#eafcff', fontFamily: "'Orbitron', sans-serif", fontSize: '0.68rem' }}>
              Тени {shadowsEnabled ? 'включены' : 'выключены'}
            </span>
          </label>

          <div style={{ height: '1px', background: 'rgba(255,255,255,0.15)', margin: '0.3rem 0' }} />

          <span
            style={{
              color: '#9db2c9',
              fontFamily: "'Orbitron', sans-serif",
              fontSize: '0.6rem',
              letterSpacing: '0.05em',
              marginBottom: '0.15rem',
              whiteSpace: 'nowrap',
            }}
          >
            ПЕРЕМЕЩЕНИЕ ОБЪЕКТОВ
          </span>
          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.4rem 0.6rem',
              borderRadius: '8px',
              cursor: 'pointer',
              touchAction: 'manipulation',
            }}
          >
            <input
              type="checkbox"
              checked={moveModeEnabled}
              onChange={(e) => setMoveModeEnabled(e.currentTarget.checked)}
              style={{ width: '1rem', height: '1rem', accentColor: '#5fd4ff', cursor: 'pointer' }}
            />
            <span style={{ color: '#eafcff', fontFamily: "'Orbitron', sans-serif", fontSize: '0.68rem' }}>
              {moveModeEnabled ? 'Включено (без джойстика)' : 'Выключено'}
            </span>
          </label>

          <div style={{ height: '1px', background: 'rgba(255,255,255,0.15)', margin: '0.3rem 0' }} />

          {/* По просьбе клиента - справка по управлению (PC/мобильные) и
              установка игры на рабочий стол, обе прямо в настройках. */}
          <button
            onClick={() => {
              setControlsOpen(true)
              setOpen(false)
            }}
            style={{
              padding: '0.4rem 0.6rem',
              borderRadius: '8px',
              border: '1px solid transparent',
              background: 'transparent',
              color: '#eafcff',
              fontFamily: "'Orbitron', sans-serif",
              fontSize: '0.72rem',
              textAlign: 'left',
              cursor: 'pointer',
              touchAction: 'manipulation',
            }}
          >
            ℹ️ Управление
          </button>

          <InstallAppButton />
        </div>
      )}
      {/* БАГ: эта кнопка живёт внутри обёртки с transform: translateX(-50%)
          (GameMode.tsx центрирует шестерёнку сверху экрана) -
          трансформированный предок создаёт свой "containing block" для
          ЛЮБОГО position:fixed потомка (стандартное поведение CSS), из-за
          чего ControlsInfoModal позиционировался бы не относительно
          экрана, а относительно этой узкой кнопки - модалка сжималась в
          вертикальную полоску вместо полноэкранного окна. Портал в
          document.body - вне трансформированного дерева - решает это. */}
      {controlsOpen && createPortal(<ControlsInfoModal onClose={() => setControlsOpen(false)} />, document.body)}
    </div>
  )
}
