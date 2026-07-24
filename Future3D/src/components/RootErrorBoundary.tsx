import { Component } from 'react'
import type { ReactNode } from 'react'

interface Props {
  children: ReactNode
}

interface State {
  error: Error | null
}

// Без этого top-level ErrorBoundary'я необработанная ошибка ГДЕ УГОДНО
// на сайте (не только в игре — GameErrorBoundary покрывает только её)
// роняет всё React-дерево целиком, и посетитель видит чёрный экран без
// единого способа понять, что случилось. Ровно так вела себя реальная
// найденная ошибка в Effects.tsx (см. комментарий у VelocityWarp) —
// она бросалась при повторном рендере всего дерева (например, из-за
// клика по START) и намертво валила всю страницу, а не только игру,
// потому что этот boundary раньше отсутствовал.
//
// R3F-канвасы (Canvas из @react-three/fiber) рендерятся в отдельном
// React-корне, но сам R3F перехватывает внутренние ошибки и
// перебрасывает их наружу через throw в обычном DOM-дереве — поэтому
// обычный class-based Error Boundary в DOM-дереве действительно ловит
// и ошибки, случившиеся внутри Canvas.
export class RootErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error) {
    // eslint-disable-next-line no-console
    console.error('[RootErrorBoundary]', error)
  }

  render() {
    if (this.state.error) {
      return (
        <div
          style={{
            position: 'fixed',
            inset: 0,
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
          <span>Что-то пошло не так. Попробуйте перезагрузить страницу.</span>
          <button
            onClick={() => window.location.reload()}
            style={{
              padding: '0.6rem 1.4rem',
              minHeight: '2.75rem',
              background: 'rgba(95, 212, 255, 0.15)',
              border: '1px solid rgba(95, 212, 255, 0.6)',
              borderRadius: '999px',
              color: '#eafcff',
              cursor: 'pointer',
              touchAction: 'manipulation',
            }}
          >
            Обновить страницу
          </button>
        </div>
      )
    }

    return this.props.children
  }
}
