import { useEffect, useState } from 'react'

// ВРЕМЕННЫЙ диагностический оверлей - НЕ трогает 3D/рендер никак, чистый
// DOM, ничего не может сломать сам по себе. Нужен только затем, чтобы
// увидеть РЕАЛЬНУЮ причину "не видно 3D на телефоне" вместо очередной
// догадки - несколько попыток чинить вслепую (общий store качества,
// количество живых WebGL-контекстов) не помогли, а Chrome-эмуляция эту
// проблему вообще не воспроизводит (значит дело в чём-то специфичном
// для настоящего телефона/браузера, что отсюда не видно). Показывает
// самые частые причины "чёрного 3D": реальную ошибку JS, если она была
// поймана (RootErrorBoundary её тоже ловит, но не показывает текст), и
// доступен ли WebGL в этом браузере вообще.
//
// Значок в углу - маленький и почти не мешает, разворачивается по тапу.
// Если поймана хоть одна ошибка - значок сам становится красным и
// заметным, не нужно объяснять, куда тыкать.
function probeWebgl(): { webgl2: boolean; webgl1: boolean; renderer: string } {
  try {
    const canvas = document.createElement('canvas')
    const gl2 = canvas.getContext('webgl2')
    const gl1 = gl2 ? null : canvas.getContext('webgl')
    const gl = gl2 || gl1
    let renderer = 'н/д'
    if (gl) {
      const info = gl.getExtension('WEBGL_debug_renderer_info')
      if (info) renderer = String(gl.getParameter(info.UNMASKED_RENDERER_WEBGL))
    }
    return { webgl2: !!gl2, webgl1: !!gl1, renderer }
  } catch (e) {
    return { webgl2: false, webgl1: false, renderer: 'ошибка проверки: ' + String(e) }
  }
}

export function DiagnosticOverlay() {
  const [open, setOpen] = useState(false)
  const [errors, setErrors] = useState<string[]>([])
  const [webgl] = useState(probeWebgl)

  useEffect(() => {
    const onError = (e: ErrorEvent) => {
      setErrors((prev) => [...prev, `Ошибка: ${e.message} (${e.filename}:${e.lineno})`].slice(-10))
    }
    const onRejection = (e: PromiseRejectionEvent) => {
      setErrors((prev) => [...prev, `Promise отклонён: ${String(e.reason)}`].slice(-10))
    }
    window.addEventListener('error', onError)
    window.addEventListener('unhandledrejection', onRejection)
    return () => {
      window.removeEventListener('error', onError)
      window.removeEventListener('unhandledrejection', onRejection)
    }
  }, [])

  const hasIssue = errors.length > 0 || !webgl.webgl2

  const fullReport = [
    `WebGL2: ${webgl.webgl2 ? 'да' : 'НЕТ'}`,
    `WebGL1: ${webgl.webgl1 ? 'да' : 'нет'}`,
    `GPU: ${webgl.renderer}`,
    `User-Agent: ${navigator.userAgent}`,
    `Ошибки (${errors.length}):`,
    ...(errors.length ? errors : ['(нет)']),
  ].join('\n')

  return (
    <div style={{ position: 'fixed', bottom: '0.5rem', left: '0.5rem', zIndex: 99999 }}>
      <button
        onClick={() => setOpen((v) => !v)}
        style={{
          width: '2rem',
          height: '2rem',
          borderRadius: '50%',
          border: 'none',
          background: hasIssue ? '#ff4d4d' : 'rgba(0,0,0,0.35)',
          color: '#fff',
          fontSize: '0.9rem',
          cursor: 'pointer',
        }}
        aria-label="Диагностика"
      >
        {hasIssue ? '!' : 'i'}
      </button>
      {open && (
        <div
          style={{
            position: 'absolute',
            bottom: 'calc(100% + 0.5rem)',
            left: 0,
            width: 'min(90vw, 360px)',
            maxHeight: '60vh',
            overflow: 'auto',
            background: 'rgba(5, 7, 13, 0.95)',
            color: '#eafcff',
            border: '1px solid rgba(255,255,255,0.25)',
            borderRadius: '10px',
            padding: '0.75rem',
            fontFamily: 'monospace',
            fontSize: '0.7rem',
            whiteSpace: 'pre-wrap',
          }}
        >
          {fullReport}
          <div style={{ marginTop: '0.5rem' }}>
            <button
              onClick={() => {
                navigator.clipboard?.writeText(fullReport)
              }}
              style={{
                padding: '0.4rem 0.8rem',
                borderRadius: '999px',
                border: '1px solid rgba(95, 212, 255, 0.6)',
                background: 'rgba(95, 212, 255, 0.15)',
                color: '#eafcff',
                fontFamily: 'inherit',
                fontSize: '0.7rem',
                cursor: 'pointer',
              }}
            >
              Скопировать
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
