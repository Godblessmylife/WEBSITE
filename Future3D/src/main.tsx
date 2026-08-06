import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App'
import { RootErrorBoundary } from './components/RootErrorBoundary'
import { DiagnosticOverlay } from './components/DiagnosticOverlay'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {/* ВРЕМЕННО, для диагностики "не видно 3D на телефоне" - см. подробный
        комментарий в DiagnosticOverlay.tsx. Снаружи RootErrorBoundary
        специально: должен показываться, даже если сам App упадёт. */}
    <DiagnosticOverlay />
    <RootErrorBoundary>
      <App />
    </RootErrorBoundary>
  </StrictMode>,
)
