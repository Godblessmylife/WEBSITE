import { useState } from 'react'
import type { CSSProperties } from 'react'
import {
  useGraphicsQualityStore,
  MIN_FOV,
  MAX_FOV,
  MIN_DRAW_DISTANCE_MULTIPLIER,
  MAX_DRAW_DISTANCE_MULTIPLIER,
} from '@/utils/graphicsQualityStore'
import type { GraphicsQuality } from '@/utils/graphicsQualityStore'
import { useCraftStore } from '@/utils/craftStore'
import { usePlayerProfileStore } from '@/utils/playerProfileStore'
import { useMultiplayerStore } from '@/utils/multiplayerStore'
import { ControlsInfoModal } from './ControlsInfoModal'
import { InstallAppButton } from './InstallAppButton'

const QUALITY_LABELS: Record<GraphicsQuality, string> = {
  high: 'Высокое',
  medium: 'Среднее',
  low: 'Низкое',
}
const QUALITY_ORDER: GraphicsQuality[] = ['high', 'medium', 'low']

const sectionLabelStyle: CSSProperties = {
  color: '#9db2c9',
  fontFamily: "'Orbitron', sans-serif",
  fontSize: '0.68rem',
  letterSpacing: '0.05em',
  marginBottom: '0.35rem',
  whiteSpace: 'nowrap',
}

const dividerStyle: CSSProperties = {
  height: '1px',
  background: 'rgba(255,255,255,0.12)',
  margin: '1.1rem 0',
}

const actionButtonStyle: CSSProperties = {
  padding: '0.5rem 0.8rem',
  borderRadius: '8px',
  border: '1px solid transparent',
  background: 'transparent',
  color: '#eafcff',
  fontFamily: "'Orbitron', sans-serif",
  fontSize: '0.78rem',
  textAlign: 'left',
  cursor: 'pointer',
  touchAction: 'manipulation',
}

// БАГ (по отзыву клиента): раньше это была выпадающая панель,
// подвешенная под шестерёнкой (которая сама стоит у верхнего края
// экрана) - на мобильном с коротким viewport (плюс уже выросший список
// настроек: качество/FOV/дальность/тени/перемещение/управление/установка)
// панель упиралась в нижний край и обрезалась даже с внутренним скроллом
// (100vh на мобильных браузерах не учитывает адресную строку). Полноэкранное
// окно снимает проблему в принципе - контейнер сам равен viewport, скролл
// (если нужен) идёт ВНУТРИ уже полноэкранного блока, ему больше некуда
// "вылезать".
export function SettingsModal({ onClose }: { onClose: () => void }) {
  const [controlsOpen, setControlsOpen] = useState(false)
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
  const nickname = usePlayerProfileStore((s) => s.nickname)
  const setNickname = usePlayerProfileStore((s) => s.setNickname)
  const attemptedMultiplayerLogin = useMultiplayerStore((s) => s.attemptedLogin)
  const loginMultiplayer = useMultiplayerStore((s) => s.login)

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 2000,
        background: 'rgba(5, 7, 13, 0.97)',
        overflowY: 'auto',
        display: 'flex',
        justifyContent: 'center',
      }}
    >
      <div
        style={{
          width: 'min(92vw, 480px)',
          padding: 'calc(1.5rem + env(safe-area-inset-top)) 0 calc(2rem + env(safe-area-inset-bottom))',
          position: 'relative',
        }}
      >
        <button
          onClick={onClose}
          aria-label="Закрыть"
          style={{
            position: 'fixed',
            top: 'calc(1rem + env(safe-area-inset-top))',
            right: 'calc(1rem + env(safe-area-inset-right))',
            background: 'rgba(10, 17, 32, 0.7)',
            border: '1px solid rgba(255, 255, 255, 0.25)',
            borderRadius: '50%',
            width: '2.2rem',
            height: '2.2rem',
            color: '#eafcff',
            fontSize: '1.1rem',
            cursor: 'pointer',
            touchAction: 'manipulation',
            zIndex: 1,
          }}
        >
          ✕
        </button>

        <div
          style={{
            fontFamily: "'Orbitron', sans-serif",
            fontSize: '1.3rem',
            fontWeight: 700,
            color: '#eafcff',
            marginBottom: '1.5rem',
          }}
        >
          Настройки
        </div>

        <span style={sectionLabelStyle}>КАЧЕСТВО ГРАФИКИ</span>
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.25rem' }}>
          {QUALITY_ORDER.map((q) => (
            <button
              key={q}
              onClick={() => setQuality(q)}
              style={{
                flex: 1,
                padding: '0.55rem 0.6rem',
                borderRadius: '8px',
                border: quality === q ? '1px solid rgba(95, 212, 255, 0.8)' : '1px solid rgba(255, 255, 255, 0.15)',
                background: quality === q ? 'rgba(95, 212, 255, 0.15)' : 'transparent',
                color: quality === q ? '#5fd4ff' : '#eafcff',
                fontFamily: "'Orbitron', sans-serif",
                fontSize: '0.78rem',
                cursor: 'pointer',
                touchAction: 'manipulation',
              }}
            >
              {QUALITY_LABELS[q]}
            </button>
          ))}
        </div>

        <div style={dividerStyle} />

        {/* Дополнение 6 - по просьбе клиента "настройки графики более
            подробные, что-то на подобии WoW/GTA6" - три реально влияющих
            на картинку параметра (не декоративные заглушки). */}
        <span style={sectionLabelStyle}>УГОЛ ОБЗОРА (FOV): {fov}°</span>
        <input
          type="range"
          min={MIN_FOV}
          max={MAX_FOV}
          step={1}
          value={fov}
          onChange={(e) => setFov(Number(e.currentTarget.value))}
          style={{ accentColor: '#5fd4ff', cursor: 'pointer', width: '100%', marginBottom: '0.9rem' }}
        />

        <span style={sectionLabelStyle}>ДАЛЬНОСТЬ ПРОРИСОВКИ: {Math.round(drawDistanceMultiplier * 100)}%</span>
        <input
          type="range"
          min={MIN_DRAW_DISTANCE_MULTIPLIER * 100}
          max={MAX_DRAW_DISTANCE_MULTIPLIER * 100}
          step={5}
          value={Math.round(drawDistanceMultiplier * 100)}
          onChange={(e) => setDrawDistanceMultiplier(Number(e.currentTarget.value) / 100)}
          style={{ accentColor: '#5fd4ff', cursor: 'pointer', width: '100%', marginBottom: '0.9rem' }}
        />

        <label style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', cursor: 'pointer', touchAction: 'manipulation' }}>
          <input
            type="checkbox"
            checked={shadowsEnabled}
            onChange={(e) => setShadowsEnabled(e.currentTarget.checked)}
            style={{ width: '1.1rem', height: '1.1rem', accentColor: '#5fd4ff', cursor: 'pointer' }}
          />
          <span style={{ color: '#eafcff', fontFamily: "'Orbitron', sans-serif", fontSize: '0.8rem' }}>
            Тени {shadowsEnabled ? 'включены' : 'выключены'}
          </span>
        </label>

        <div style={dividerStyle} />

        <span style={sectionLabelStyle}>ПЕРЕМЕЩЕНИЕ ОБЪЕКТОВ</span>
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', cursor: 'pointer', touchAction: 'manipulation' }}>
          <input
            type="checkbox"
            checked={moveModeEnabled}
            onChange={(e) => setMoveModeEnabled(e.currentTarget.checked)}
            style={{ width: '1.1rem', height: '1.1rem', accentColor: '#5fd4ff', cursor: 'pointer' }}
          />
          <span style={{ color: '#eafcff', fontFamily: "'Orbitron', sans-serif", fontSize: '0.8rem' }}>
            {moveModeEnabled ? 'Включено (без джойстика)' : 'Выключено'}
          </span>
        </label>

        <div style={dividerStyle} />

        {/* По просьбе клиента - заготовка входа в мультиплеер. Реального
            сервера нет (см. подробности в multiplayerStore.ts) - никнейм
            уже общий с "Профилем" (usePlayerProfileStore), форма и кнопка
            рабочие, но пока честно сообщают, что подключаться некуда. */}
        <span style={sectionLabelStyle}>МУЛЬТИПЛЕЕР</span>
        <input
          type="text"
          value={nickname}
          onChange={(e) => setNickname(e.currentTarget.value)}
          placeholder="Никнейм"
          maxLength={20}
          style={{
            width: '100%',
            padding: '0.5rem 0.7rem',
            marginBottom: '0.5rem',
            background: 'rgba(255, 255, 255, 0.06)',
            border: '1px solid rgba(255, 255, 255, 0.25)',
            borderRadius: '8px',
            color: '#eafcff',
            fontFamily: "'Orbitron', sans-serif",
            fontSize: '0.8rem',
          }}
        />
        <button
          onClick={loginMultiplayer}
          style={{
            padding: '0.5rem 0.8rem',
            borderRadius: '8px',
            border: '1px solid rgba(95, 212, 255, 0.5)',
            background: 'rgba(95, 212, 255, 0.12)',
            color: '#5fd4ff',
            fontFamily: "'Orbitron', sans-serif",
            fontSize: '0.78rem',
            cursor: 'pointer',
            touchAction: 'manipulation',
          }}
        >
          🌐 Войти
        </button>
        {attemptedMultiplayerLogin && (
          <div
            style={{
              marginTop: '0.5rem',
              padding: '0.5rem 0.7rem',
              borderRadius: '8px',
              background: 'rgba(255, 255, 255, 0.06)',
              color: '#c8ecff',
              fontFamily: "'Inter', sans-serif",
              fontSize: '0.72rem',
              lineHeight: 1.5,
            }}
          >
            Мультиплеер-сервер ещё не подключён — эта форма готова, вход появится, когда будет готова серверная
            часть.
          </div>
        )}

        <div style={dividerStyle} />

        <button onClick={() => setControlsOpen(true)} style={actionButtonStyle}>
          ℹ️ Управление
        </button>

        <InstallAppButton />
      </div>

      {controlsOpen && <ControlsInfoModal onClose={() => setControlsOpen(false)} />}
    </div>
  )
}
