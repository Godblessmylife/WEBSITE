// Раньше оба Suspense (загрузка JS-чанка игры в App.tsx и загрузка
// моделей hero.glb/portal.glb внутри GameMode) использовали
// fallback={null} — то есть до полной загрузки (JS-чанк ~1.6 МБ gzip +
// модели ~4 МБ) экран оставался буквально пустым, без единого признака
// жизни. На медленном интернете это легко читается как "чёрный экран,
// ничего не происходит, что-то сломалось". position:fixed работает
// одинаково что снаружи Canvas, что изнутри (обёрнутый в drei <Html>) —
// поэтому один и тот же компонент годится для обоих Suspense.
export function GameLoadingScreen() {
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
      }}
    >
      <div
        style={{
          width: '48px',
          height: '48px',
          border: '3px solid rgba(95, 212, 255, 0.25)',
          borderTopColor: '#5fd4ff',
          borderRadius: '50%',
          animation: 'game-loading-spin 0.9s linear infinite',
        }}
      />
      <span style={{ fontSize: '0.9rem', letterSpacing: '0.1em' }}>ЗАГРУЗКА МИРА...</span>
      <style>{`
        @keyframes game-loading-spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}
