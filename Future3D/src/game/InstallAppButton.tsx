import { useState } from 'react'
import type { CSSProperties } from 'react'
import { usePwaInstall } from '@/utils/usePwaInstall'

const sectionLabelStyle: CSSProperties = {
  color: '#9db2c9',
  fontFamily: "'Orbitron', sans-serif",
  fontSize: '0.6rem',
  letterSpacing: '0.05em',
  marginBottom: '0.15rem',
  whiteSpace: 'nowrap',
}

const actionButtonStyle: CSSProperties = {
  padding: '0.4rem 0.6rem',
  borderRadius: '8px',
  border: '1px solid rgba(95, 212, 255, 0.5)',
  background: 'rgba(95, 212, 255, 0.12)',
  color: '#5fd4ff',
  fontFamily: "'Orbitron', sans-serif",
  fontSize: '0.68rem',
  textAlign: 'left',
  cursor: 'pointer',
  touchAction: 'manipulation',
}

// Кнопка "Установить на рабочий стол" внутри настроек (GraphicsSettingsButton.tsx)
// - по просьбе клиента, та же возможность, что у обычных PWA-приложений
// (у клиента раньше была своя Three.js-игра с такой кнопкой). На
// Android/Chrome вызывает настоящий системный диалог установки; на iOS
// Safari программного способа нет вообще (браузер не даёт такого API) -
// вместо кнопки показываем инструкцию "Поделиться → На экран Домой".
// Если приложение уже запущено как установленное (standalone) - секция
// не показывается, ставить уже нечего.
export function InstallAppButton() {
  const { canPromptInstall, promptInstall, installed, isIos } = usePwaInstall()
  const [showIosHint, setShowIosHint] = useState(false)

  if (installed) return null
  if (!canPromptInstall && !isIos) return null

  return (
    <>
      <span style={sectionLabelStyle}>РАБОЧИЙ СТОЛ</span>
      {canPromptInstall && (
        <button style={actionButtonStyle} onClick={promptInstall}>
          📲 Установить игру
        </button>
      )}
      {isIos && !canPromptInstall && (
        <>
          <button style={actionButtonStyle} onClick={() => setShowIosHint((v) => !v)}>
            📲 Установить игру
          </button>
          {showIosHint && (
            <div
              style={{
                marginTop: '0.3rem',
                padding: '0.5rem 0.6rem',
                borderRadius: '8px',
                background: 'rgba(255, 255, 255, 0.06)',
                color: '#c8ecff',
                fontFamily: "'Inter', sans-serif",
                fontSize: '0.65rem',
                lineHeight: 1.5,
              }}
            >
              Нажмите «Поделиться» <span aria-hidden="true">⬆️</span> внизу экрана Safari, затем «На экран
              «Домой»».
            </div>
          )}
        </>
      )}
    </>
  )
}
