import { Component } from 'react'
import type { ReactNode } from 'react'

interface Props {
  children: ReactNode
  onExit: () => void
}

interface State {
  error: Error | null
}

// Без этого любая ошибка при загрузке/работе игры (например, .glb не
// догрузился, разрыв соединения) роняла бы всё дерево React без
// возможности восстановиться — с точки зрения посетителя это выглядит
// ровно как "чёрный экран, ничего не происходит", без способа выйти
// обратно на сайт. React Error Boundary обязателен как class-компонент
// — хук-аналога нет.
export class GameErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  // Раньше ошибка нигде не логировалась - ни в консоль, ни на экран,
  // только тихо переключала на этот фоллбек. Если клиент сообщает
  // "игра вылетает", а в консоль ничего не попало, диагностировать
  // нечего. componentDidCatch - единственное место в React, где доступен
  // ещё и componentStack (в какой момент рендера всё упало).
  componentDidCatch(error: Error, info: { componentStack: string }) {
    console.error('[GameErrorBoundary]', error, info.componentStack)
  }

  // Раньше единственным выходом отсюда была кнопка "Выход" — целиком
  // размонтировать игру и возвращаться на START заново. Часто помогает
  // просто попробовать смонтировать игру ЕЩЁ РАЗ на месте: сама ошибка
  // нередко — разовая гонка при самой первой (холодной) загрузке ассетов/
  // WASM-физики, а не постоянная поломка (см. usePrefetchGame в
  // GameEntry.tsx) — к моменту повторной попытки часть ресурсов уже
  // закешировалась браузером после первой, неудачной попытки. Сброс
  // локального state.error заставляет React смонтировать children
  // заново "с чистого листа" (предыдущее дерево уже размонтировано
  // самим механизмом Error Boundary) — без обратного похода на секцию
  // с кнопкой START.
  handleRetry = () => {
    this.setState({ error: null })
  }

  render() {
    if (this.state.error) {
      return (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1000,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '1rem',
            background: '#05070d',
            color: '#eafcff',
            fontFamily: "'Orbitron', sans-serif",
            padding: '2rem',
            textAlign: 'center',
          }}
        >
          <span>Не удалось запустить игру. Попробуйте ещё раз.</span>
          {/* Текст ошибки прямо на экране - раньше был виден только в
              консоли браузера (чаще всего недоступной обычному
              посетителю), сообщить о проблеме без этого было почти
              невозможно ("не работает" без деталей). */}
          <span
            style={{
              fontFamily: 'monospace',
              fontSize: '0.75rem',
              color: '#9db2c9',
              maxWidth: '480px',
              wordBreak: 'break-word',
            }}
          >
            {this.state.error?.message}
          </span>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button
              onClick={this.handleRetry}
              style={{
                padding: '0.6rem 1.4rem',
                background: 'rgba(255, 215, 106, 0.15)',
                border: '1px solid rgba(255, 215, 106, 0.7)',
                borderRadius: '999px',
                color: '#ffe9b0',
                fontFamily: "'Orbitron', sans-serif",
                cursor: 'pointer',
                minHeight: '2.75rem',
                touchAction: 'manipulation',
              }}
            >
              Попробовать снова
            </button>
            <button
              onClick={this.props.onExit}
              style={{
                padding: '0.6rem 1.4rem',
                background: 'rgba(95, 212, 255, 0.15)',
                border: '1px solid rgba(95, 212, 255, 0.6)',
                borderRadius: '999px',
                color: '#eafcff',
                fontFamily: "'Orbitron', sans-serif",
                cursor: 'pointer',
                minHeight: '2.75rem',
                touchAction: 'manipulation',
              }}
            >
              Выход
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
