import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing'
import { BlendFunction, ChromaticAberrationEffect } from 'postprocessing'
import * as THREE from 'three'
import { useScrollStore } from '@/utils/scrollStore'
import { useIsTouchDevice } from '@/utils/useIsTouchDevice'

// scrollStore уже считал velocity (Lenis отдаёт её с самого начала) —
// она нигде не использовалась. Здесь — единственное место на сайте,
// которое реагирует на СКОРОСТЬ скролла, а не только на его позицию:
// чем быстрее крутите, тем сильнее хроматическая аберрация и мягче
// виньетка — ощущение "разгона"/варп-скорости сквозь космос. При
// остановке скролла эффект плавно гаснет до нуля.
//
// Lenis отдаёт velocity в пикселях/кадр, не в 0..1 — VELOCITY_DIVISOR
// подобран на глаз (нет возможности протестировать в браузере),
// поправить одной цифрой, если покажется слишком слабо/сильно.
const MAX_OFFSET = 0.006
const VELOCITY_DIVISOR = 60

// РАНЬШЕ здесь был <ChromaticAberration ref={effectRef} .../> из
// @react-three/postprocessing — это реально ронялО ВСЮ страницу в
// чёрный экран, а не только игру. Причина: @react-three/postprocessing
// оборачивает каждый эффект функцией вида
// `({blendFunction, opacity, ...rest}) => useMemo(() => [...], [JSON.stringify(rest)])`
// — обычным компонентом-функцией, не через forwardRef. В React 19
// `ref` теперь передаётся в props как обычное поле ("ref as a prop"),
// поэтому `effectRef` попадал в `rest` и на КАЖДЫЙ повторный рендер
// этого компонента библиотека вызывала `JSON.stringify(rest)` для
// useMemo-зависимости. После первого рендера `effectRef.current` — уже
// живой инстанс эффекта с внутренними цикличными ссылками (`parent`/
// `children`) => `JSON.stringify` кидает `TypeError: Converting
// circular structure to JSON`. Само по себе это не стреляло, пока
// что-то не вызывало повторный рендер ВСЕГО дерева — а нажатие
// START делает ровно это (isGameActive в App -> ре-рендер всего
// поддерева, включая JourneyScene/Effects). Ошибка была необработанной
// (Error Boundary есть только вокруг игры, не вокруг всего сайта) —
// падало всё React-дерево целиком, экран становился чёрным.
//
// Исправление: создаём инстанс ChromaticAberrationEffect вручную и
// монтируем как <primitive> — это тот же класс, что использует
// обёрнутый компонент (EffectComposer ищет добавленные эффекты по
// `instanceof Effect` среди детей, а не по тому, как именно они
// созданы), но без обёртки-функции, спотыкающейся об это React 19.
function VelocityWarp() {
  const effect = useMemo(
    () =>
      new ChromaticAberrationEffect({
        blendFunction: BlendFunction.NORMAL,
        radialModulation: true,
        modulationOffset: 0.3,
      }),
    [],
  )
  const strengthRef = useRef(0)

  useFrame((_, delta) => {
    const velocity = useScrollStore.getState().velocity
    const target = THREE.MathUtils.clamp(Math.abs(velocity) / VELOCITY_DIVISOR, 0, 1)
    const damp = 1 - Math.exp(-6 * delta)
    strengthRef.current = THREE.MathUtils.lerp(strengthRef.current, target, damp)
    effect.offset.set(strengthRef.current * MAX_OFFSET, strengthRef.current * MAX_OFFSET)
  })

  return <primitive object={effect} />
}

// Только Bloom по выбору клиента: солнце, метеоры и неоновые окна
// начинают реально светиться, а не просто быть яркими плоскими цветами.
//
// luminanceThreshold был 0.18 — это ниже яркости обычного светлого
// облачного фона (#c9d6e3 ~0.83 по формуле яркости), поэтому весь экран
// в зоне облаков засвечивался Bloom'ом целиком — это и была "белая
// вспышка". Порог поднят выше яркости фона, чтобы Bloom реагировал
// только на настоящие яркие объекты, а не на светлое небо/облака.
//
// На тач-устройствах (см. useIsTouchDevice) убран VelocityWarp
// (отдельный полноэкранный проход хроматической аберрации — самый
// необязательный из трёх эффектов, чисто декоративный) и mipmapBlur у
// Bloom (даёт мягче свечение, но считает несколько уровней даунсемпла
// на кадр) — постобработка на полный экран в 1.5x DPR на телефоне и
// так не бесплатна.
export function Effects() {
  const isTouch = useIsTouchDevice()

  // EffectComposer типизирован на JSX.Element | JSX.Element[] (не
  // принимает null в детях) — эффекты собираются в массив, а не
  // условным {isTouch ? null : ...} прямо в JSX.
  const children = [
    <Bloom
      key="bloom"
      mipmapBlur={!isTouch}
      luminanceThreshold={0.92}
      luminanceSmoothing={0.15}
      intensity={1.6}
    />,
    ...(isTouch ? [] : [<VelocityWarp key="warp" />]),
    <Vignette key="vignette" offset={0.25} darkness={0.6} />,
  ]

  return <EffectComposer>{children}</EffectComposer>
}
