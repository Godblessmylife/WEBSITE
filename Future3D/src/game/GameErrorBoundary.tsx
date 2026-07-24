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
          <button
            onClick={this.props.onExit}
            style={{
              padding: '0.6rem 1.4rem',
              background: 'rgba(95, 212, 255, 0.15)',
              border: '1px solid rgba(95, 212, 255, 0.6)',
              borderRadius: '999px',
              color: '#eafcff',
              cursor: 'pointer',
            }}
          >
            Выход
          </button>
        </div>
      )
    }

    return this.props.children
  }
}
