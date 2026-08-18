import { useEffect, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import { useMusicStore } from '@/utils/musicStore'
import { MUSIC_TRACKS } from '@/utils/musicTracks'

// Плеер бесплатной музыки в HUD игры (по просьбе клиента). Сайт
// статический без бэкенда - настоящий поиск по интернету/YouTube здесь
// невозможен без сервера и рискует авторскими правами, поэтому это не
// "поиск", а простой плеер по списку треков, который клиент наполняет
// сам (см. подробную инструкцию в musicTracks.ts). Пока список пуст -
// кнопка не рендерится вообще, чтобы не показывать бесполезный пустой
// плеер.
const controlButtonStyle: CSSProperties = {
  width: '2.1rem',
  height: '2.1rem',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: 0,
  background: 'rgba(95, 212, 255, 0.15)',
  border: '1px solid rgba(95, 212, 255, 0.6)',
  borderRadius: '50%',
  color: '#eafcff',
  fontSize: '0.85rem',
  lineHeight: 1,
  cursor: 'pointer',
  touchAction: 'manipulation',
}

const trackButtonStyle: CSSProperties = {
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
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
}

export function MusicPlayer({ style }: { style?: CSSProperties }) {
  const [open, setOpen] = useState(false)
  const audioRef = useRef<HTMLAudioElement>(null!)
  const currentIndex = useMusicStore((s) => s.currentIndex)
  const isPlaying = useMusicStore((s) => s.isPlaying)
  const volume = useMusicStore((s) => s.volume)
  const setCurrentIndex = useMusicStore((s) => s.setCurrentIndex)
  const setIsPlaying = useMusicStore((s) => s.setIsPlaying)
  const setVolume = useMusicStore((s) => s.setVolume)

  const currentTrack = currentIndex !== null ? MUSIC_TRACKS[currentIndex] : null

  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volume
  }, [volume])

  useEffect(() => {
    const audio = audioRef.current
    if (!audio || !currentTrack) return
    if (isPlaying) {
      // Браузеры блокируют автовоспроизведение без явного клика
      // пользователя - play() может отклониться промисом, тогда просто
      // возвращаем isPlaying обратно в false, а не оставляем состояние
      // "играет", пока на самом деле ничего не звучит.
      audio.play().catch(() => setIsPlaying(false))
    } else {
      audio.pause()
    }
  }, [isPlaying, currentTrack, setIsPlaying])

  // Список треков задаётся статически в musicTracks.ts - пока клиент не
  // прислал ни одного файла, кнопка не показывается вообще (нет смысла
  // рисовать плеер, которому нечего играть).
  if (MUSIC_TRACKS.length === 0) return null

  const playIndex = (index: number) => {
    setCurrentIndex(index)
    setIsPlaying(true)
  }

  const togglePlay = () => {
    if (currentIndex === null) {
      playIndex(0)
      return
    }
    setIsPlaying(!isPlaying)
  }

  const step = (delta: number) => {
    const nextIndex = currentIndex === null ? 0 : (currentIndex + delta + MUSIC_TRACKS.length) % MUSIC_TRACKS.length
    playIndex(nextIndex)
  }

  return (
    <div style={{ position: 'absolute', zIndex: 1001, ...style }}>
      {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
      <audio ref={audioRef} src={currentTrack?.url} onEnded={() => step(1)} />
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="Музыка"
        style={{
          padding: '0.6rem 1.4rem',
          minHeight: '2.75rem',
          background: isPlaying ? 'rgba(95, 212, 255, 0.85)' : 'rgba(10, 17, 32, 0.6)',
          border: '1px solid rgba(95, 212, 255, 0.7)',
          borderRadius: '999px',
          color: isPlaying ? '#04121c' : '#5fd4ff',
          fontFamily: "'Orbitron', sans-serif",
          fontWeight: isPlaying ? 700 : 400,
          cursor: 'pointer',
          touchAction: 'manipulation',
        }}
      >
        🎵 Музыка
      </button>
      {open && (
        <div
          style={{
            position: 'absolute',
            bottom: 'calc(100% + 0.5rem)',
            left: '50%',
            transform: 'translateX(-50%)',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.5rem',
            padding: '0.6rem',
            background: 'rgba(10, 17, 32, 0.92)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            borderRadius: '12px',
            minWidth: '220px',
          }}
        >
          <span
            style={{
              color: '#c8ecff',
              fontFamily: "'Orbitron', sans-serif",
              fontSize: '0.72rem',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {currentTrack?.title ?? 'Ничего не играет'}
          </span>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
            <button style={controlButtonStyle} onClick={() => step(-1)} aria-label="Предыдущий трек">
              ⏮
            </button>
            <button style={controlButtonStyle} onClick={togglePlay} aria-label={isPlaying ? 'Пауза' : 'Играть'}>
              {isPlaying ? '⏸' : '▶'}
            </button>
            <button style={controlButtonStyle} onClick={() => step(1)} aria-label="Следующий трек">
              ⏭
            </button>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span aria-hidden="true">🔊</span>
            <input
              type="range"
              min={0}
              max={100}
              step={5}
              value={Math.round(volume * 100)}
              onChange={(e) => setVolume(Number(e.currentTarget.value) / 100)}
              style={{ accentColor: '#5fd4ff', cursor: 'pointer', width: '100%' }}
            />
          </div>

          <div style={{ height: '1px', background: 'rgba(255,255,255,0.15)' }} />

          <div style={{ display: 'flex', flexDirection: 'column', maxHeight: '160px', overflowY: 'auto' }}>
            {MUSIC_TRACKS.map((track, i) => (
              <button
                key={track.id}
                onClick={() => playIndex(i)}
                style={{
                  ...trackButtonStyle,
                  border: i === currentIndex ? '1px solid rgba(95, 212, 255, 0.8)' : trackButtonStyle.border,
                  background: i === currentIndex ? 'rgba(95, 212, 255, 0.15)' : trackButtonStyle.background,
                  color: i === currentIndex ? '#5fd4ff' : trackButtonStyle.color,
                }}
              >
                {track.title}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
