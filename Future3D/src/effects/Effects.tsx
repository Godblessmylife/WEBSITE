import { EffectComposer, Bloom } from '@react-three/postprocessing'

// Только Bloom по выбору клиента: солнце, ядро героя, метеоры и неоновые
// окна начинают реально светиться, а не просто быть яркими плоскими
// цветами. Остальной пост-процессинг (DOF/Vignette/ACES/SSR) — Phase 4.
export function Effects() {
  return (
    <EffectComposer>
      <Bloom mipmapBlur luminanceThreshold={0.18} luminanceSmoothing={0.3} intensity={1.3} />
    </EffectComposer>
  )
}
