import { useTeleportStore } from '@/utils/teleportStore'

// Полноэкранный DOM-оверлей (снаружи Canvas, как GameDebugHUD/Minimap) -
// показывается на EFFECT_DURATION_MS (см. Portal.tsx, значения обеих
// констант должны совпадать). Два слоя: расширяющееся кольцо (даёт
// ощущение "затягивания" в портал) + белая вспышка, пик которой намеренно
// совпадает с моментом фактического перемещения тела в Portal.tsx - сам
// "скачок" позиции полностью скрыт под белым экраном, наружу видно только
// плавное появление новой сцены (космос) после того, как вспышка спадает.
export function TeleportEffect() {
  const active = useTeleportStore((s) => s.active)
  if (!active) return null

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1010, pointerEvents: 'none', overflow: 'hidden' }}>
      <div className="teleport-ring" />
      <div className="teleport-flash" />
      <style>{`
        .teleport-ring {
          position: absolute;
          inset: 0;
          margin: auto;
          width: 140vmax;
          height: 140vmax;
          border-radius: 50%;
          background: radial-gradient(circle, #eafcff 0%, #5fd4ff 35%, rgba(95, 212, 255, 0) 70%);
          opacity: 0;
          animation: teleport-ring-anim 900ms ease-out forwards;
        }
        .teleport-flash {
          position: absolute;
          inset: 0;
          background: #eafcff;
          opacity: 0;
          animation: teleport-flash-anim 900ms ease-in-out forwards;
        }
        @keyframes teleport-ring-anim {
          0% { opacity: 0; transform: scale(0.15); }
          45% { opacity: 1; transform: scale(0.9); }
          100% { opacity: 0; transform: scale(1.6); }
        }
        @keyframes teleport-flash-anim {
          0%, 100% { opacity: 0; }
          55%, 78% { opacity: 1; }
        }
      `}</style>
    </div>
  )
}
