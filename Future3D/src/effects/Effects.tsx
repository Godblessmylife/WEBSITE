import { EffectComposer, Bloom } from '@react-three/postprocessing'

// Только Bloom по выбору клиента: солнце, метеоры и неоновые окна
// начинают реально светиться, а не просто быть яркими плоскими цветами.
//
// luminanceThreshold был 0.18 — это ниже яркости обычного светлого
// облачного фона (#c9d6e3 ~0.83 по формуле яркости), поэтому весь экран
// в зоне облаков засвечивался Bloom'ом целиком — это и была "белая
// вспышка". Порог поднят выше яркости фона, чтобы Bloom реагировал
// только на настоящие яркие объекты, а не на светлое небо/облака.
export function Effects() {
  return (
    <EffectComposer>
      <Bloom mipmapBlur luminanceThreshold={0.92} luminanceSmoothing={0.15} intensity={1.6} />
    </EffectComposer>
  )
}
