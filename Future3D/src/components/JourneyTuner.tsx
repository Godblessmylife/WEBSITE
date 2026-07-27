import { useEffect, useMemo, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import { useScrollStore, journeyScrollRangePx } from '@/utils/scrollStore'
import { inverseEaseProgress } from '@/utils/scrollEasing'
import { SKY_HOLD_END, CLOUD_HOLD_END } from '@/scenes/FogController'

// Инструмент для точной настройки 3D-путешествия по просьбе клиента:
// "разделить прокрутку, чтобы красиво донастроить анимацию" — вместо
// абстрактного progress (0..1 от ВСЕЙ страницы, см. комментарий у
// scrollToJourneyFraction в scrollStore.ts) даёт понятную шкалу
// "0-100% видимого путешествия" — можно перетащить ползунок к любому
// месту и сразу увидеть его, а потом сослаться на конкретный процент в
// разговоре ("на 32% дым слишком белый") вместо "примерно на середине".
//
// Свёрнута по умолчанию (маленькая кнопка в углу) — это инструмент для
// владельца сайта, а не часть посетительского опыта, но специально не
// спрятана за URL-параметром: проще один раз показать "нажмите на
// шестерёнку", чем объяснять дописывание ?tune=1 в адресную строку.
//
// Границы зон считаются ОТ РЕАЛЬНЫХ констант FogController (те же самые
// SKY_HOLD_END/CLOUD_HOLD_END, что красят небо/туман), а не подобраны на
// глаз — первая версия использовала придуманные круглые числа (0.18,
// 0.34...) и промахивалась: из-за easeProgress + масштабирования "доли
// путешествия" в "долю ВСЕЙ страницы" (см. scrollToJourneyFraction)
// зависимость нелинейна, и "Облака" на глаз оказывались всё ещё внутри
// солнечной системы при проверке в браузере.
function progressToJourneyFraction(progress: number, scaleFactor: number) {
  if (scaleFactor <= 0) return 0
  return Math.min(1, inverseEaseProgress(progress) / scaleFactor)
}

export function JourneyTuner() {
  const [open, setOpen] = useState(false)
  const sliderRef = useRef<HTMLInputElement>(null!)
  const readoutRef = useRef<HTMLSpanElement>(null!)
  const draggingRef = useRef(false)

  // scaleFactor = (видимый диапазон путешествия) / (весь скроллируемый
  // диапазон страницы) - тот же коэффициент, что неявно использует
  // scrollToJourneyFraction. Считается только пока панель открыта (нужен
  // document/window, которых нет при SSR, но этот проект целиком CSR,
  // так что дело не в SSR - просто незачем мерить размеры документа,
  // когда панель всё равно скрыта).
  const scaleFactor = useMemo(() => {
    if (!open) return 0
    const totalRange = document.documentElement.scrollHeight - window.innerHeight
    return totalRange > 0 ? journeyScrollRangePx() / totalRange : 0
  }, [open])

  const zones = useMemo(
    () => [
      { label: 'Небо и Солнечная система', from: 0, to: progressToJourneyFraction(SKY_HOLD_END, scaleFactor) },
      {
        label: 'Облака',
        from: progressToJourneyFraction(SKY_HOLD_END, scaleFactor),
        to: progressToJourneyFraction(CLOUD_HOLD_END, scaleFactor),
      },
      { label: 'Земля', from: progressToJourneyFraction(CLOUD_HOLD_END, scaleFactor), to: 1 },
    ],
    [scaleFactor],
  )

  // Собственный, независимый от useScrollStore.progress слушатель:
  // progress в сторе смягчён easeProgress И считается от лимита ВСЕЙ
  // страницы (см. подробности в scrollStore.ts) - для этого ползунка
  // нужна доля именно от видимого диапазона путешествия, без смягчения
  // (иначе ползунок и реальная позиция начнут расходиться в середине
  // диапазона).
  useEffect(() => {
    if (!open) return
    const update = () => {
      if (draggingRef.current) return
      const range = journeyScrollRangePx()
      const fraction = range > 0 ? Math.min(1, Math.max(0, window.scrollY / range)) : 0
      const percent = Math.round(fraction * 100)
      sliderRef.current.value = String(percent)
      readoutRef.current.textContent = `${percent}%`
    }
    update()
    window.addEventListener('scroll', update, { passive: true })
    window.addEventListener('resize', update)
    return () => {
      window.removeEventListener('scroll', update)
      window.removeEventListener('resize', update)
    }
  }, [open])

  const applyFraction = (percent: number) => {
    readoutRef.current.textContent = `${percent}%`
    useScrollStore.getState().scrollToJourneyFraction(percent / 100)
  }

  return (
    <div style={wrapperStyle}>
      {open && (
        <div style={panelStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem' }}>
            <span style={{ color: '#ffd76a', fontSize: '0.8rem', letterSpacing: '0.08em' }}>
              ТЮНЕР ПУТЕШЕСТВИЯ
            </span>
            <button onClick={() => setOpen(false)} style={closeIconStyle} aria-label="Закрыть тюнер">
              ✕
            </button>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.5rem' }}>
            <input
              ref={sliderRef}
              type="range"
              min={0}
              max={100}
              defaultValue={0}
              style={sliderStyle}
              onPointerDown={() => {
                draggingRef.current = true
              }}
              onPointerUp={() => {
                draggingRef.current = false
              }}
              onInput={(e) => applyFraction(Number((e.target as HTMLInputElement).value))}
            />
            <span ref={readoutRef} style={{ minWidth: '3rem', textAlign: 'right', fontFamily: 'monospace' }}>
              0%
            </span>
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
            {zones.map((zone) => (
              <button
                key={zone.label}
                style={zoneButtonStyle}
                onClick={() => applyFraction(Math.round(((zone.from + zone.to) / 2) * 100))}
              >
                {zone.label}
              </button>
            ))}
          </div>
        </div>
      )}

      <button onClick={() => setOpen((v) => !v)} style={toggleButtonStyle} aria-label="Открыть тюнер путешествия">
        ⚙
      </button>
    </div>
  )
}

const wrapperStyle: CSSProperties = {
  position: 'fixed',
  left: 'calc(1rem + env(safe-area-inset-left))',
  bottom: 'calc(1rem + env(safe-area-inset-bottom))',
  zIndex: 500,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'flex-start',
  gap: '0.6rem',
  fontFamily: "'Orbitron', sans-serif",
  fontSize: '0.8rem',
  color: '#eafcff',
}

const toggleButtonStyle: CSSProperties = {
  width: '2.5rem',
  height: '2.5rem',
  borderRadius: '50%',
  background: 'rgba(10, 17, 32, 0.75)',
  border: '1px solid rgba(255, 215, 106, 0.5)',
  color: '#ffe9b0',
  fontSize: '1.1rem',
  cursor: 'pointer',
  touchAction: 'manipulation',
  backdropFilter: 'blur(6px)',
}

const panelStyle: CSSProperties = {
  width: '280px',
  padding: '0.9rem 1rem',
  background: 'rgba(10, 17, 32, 0.9)',
  border: '1px solid rgba(255, 215, 106, 0.5)',
  borderRadius: '14px',
  backdropFilter: 'blur(8px)',
}

const closeIconStyle: CSSProperties = {
  background: 'none',
  border: 'none',
  color: '#9db2c9',
  cursor: 'pointer',
  fontSize: '1rem',
  lineHeight: 1,
  touchAction: 'manipulation',
}

const sliderStyle: CSSProperties = {
  flex: 1,
  accentColor: '#5fd4ff',
  cursor: 'pointer',
}

const zoneButtonStyle: CSSProperties = {
  padding: '0.35rem 0.7rem',
  fontSize: '0.68rem',
  fontFamily: "'Orbitron', sans-serif",
  background: 'rgba(95, 212, 255, 0.12)',
  border: '1px solid rgba(95, 212, 255, 0.4)',
  borderRadius: '999px',
  color: '#eafcff',
  cursor: 'pointer',
  touchAction: 'manipulation',
}
