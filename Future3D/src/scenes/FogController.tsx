import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { useScrollStore } from '@/utils/scrollStore'

const skyColor = new THREE.Color('#0a1128')
const cloudColor = new THREE.Color('#c9d6e3')
const groundColor = new THREE.Color('#141c2b')
const tmpColor = new THREE.Color()
const bgColor = new THREE.Color()

// Фон канваса ограничен по яркости ниже, чем сам туман (BACKGROUND_DIM):
// светлый цвет облаков (#c9d6e3) заливал собой весь экран (сплошной
// однотонный фон — не только у геометрии, как туман), и Bloom принимал
// это за один сплошной "яркий объект" на весь кадр — отсюда белая
// вспышка при скролле через зону облаков. Сам туман (влияет только на
// то, что рядом с камерой/геометрией) оставлен светлым — так сохраняется
// ощущение "внутри облака".
const BACKGROUND_DIM = 0.55

// ВТОРАЯ итерация этих порогов. Клиент теперь смотрит на конкретные
// проценты через JourneyTuner.tsx и сообщил: "начиная с 60% начинается
// туманность, убрать" — числовая проверка (сэмплирование пути скриптом,
// с пересчётом через ту же формулу, что и JourneyTuner) показала: при
// СТАРЫХ порогах (SKY_HOLD_END=0.4) плотность тумана уже была практически
// на пике именно к progress~0.4 — а это ровно ~57-60% от видимого
// путешествия. Задача клиента шире, чем просто "подвинуть цифру": весь
// участок 60-90% должен ощущаться как полёт сквозь открытый космос к
// планете (см. EarthPlanet.tsx — раскрытие тоже растянуто на этот же
// диапазон, и SpaceTravelEffect добавлен вторым экземпляром именно сюда),
// а не как погружение в туман. Пороги сдвинуты так, что тёмное небо
// держится примерно до 90-93% пути, и лёгкая "облачная" пелена/посадочный
// туман остаётся только на самом подлёте к городу — там же, где реально
// стоят объёмные облака (CloudZone.tsx, мировая позиция y=20 — камера
// проходит этот уровень высоты как раз в эти проценты, см. таблицу в
// комментарии ниже).
//
// ВАЖНО: progress физически не достигает 1.0, пока страница видна —
// sticky-обёртка отпускает 3D-сцену уже на progress~0.852 (при текущей
// высоте страницы, см. подробный разбор в scrollStore.ts у
// scrollToJourneyFraction). Отсюда же обнаружился отдельный, более
// старый баг: GroundZone.tsx (город) держал FADE_IN_START на 0.88 -
// ВЫШЕ реально достижимого максимума - город физически не мог
// появиться ни при каком количестве скролла. Исправлено тут и в
// GroundZone.tsx/EarthPlanet.tsx согласованно, все пороги теперь ниже
// 0.852 с запасом.
//
// jf% -> progress (при текущей длине страницы): 85%->0.710, 90%->0.761,
// 95%->0.808, 100%->0.852.
export const SKY_HOLD_END = 0.75
const CLOUD_TRANSITION_END = 0.81
export const CLOUD_HOLD_END = 0.84

// РАНЬШЕ плотность считалась ОТДЕЛЬНОЙ формулой (sin(progress*PI),
// пик всегда на progress=0.5) — независимо от того, где реально
// проходит граница цвета. Из-за этого плотность и белый цвет почти
// никогда не совпадали по времени специально, а иногда (как в первой
// версии) случайно накладывались друг на друга. Теперь density и
// tmpColor считаются В ОДНОМ И ТОМ ЖЕ if/else по одним и тем же
// порогам — они физически не могут разъехаться при следующей правке.
const SKY_DENSITY = 0.003
const CLOUD_DENSITY = 0.016
const GROUND_DENSITY = 0.01

export function FogController() {
  const { scene } = useThree()

  useFrame(() => {
    const progress = THREE.MathUtils.clamp(useScrollStore.getState().progress, 0, 1)
    let density: number

    if (progress < SKY_HOLD_END) {
      tmpColor.copy(skyColor)
      density = SKY_DENSITY
    } else if (progress < CLOUD_TRANSITION_END) {
      const t = (progress - SKY_HOLD_END) / (CLOUD_TRANSITION_END - SKY_HOLD_END)
      tmpColor.lerpColors(skyColor, cloudColor, t)
      density = THREE.MathUtils.lerp(SKY_DENSITY, CLOUD_DENSITY, t)
    } else if (progress < CLOUD_HOLD_END) {
      tmpColor.copy(cloudColor)
      density = CLOUD_DENSITY
    } else {
      const t = (progress - CLOUD_HOLD_END) / (1 - CLOUD_HOLD_END)
      tmpColor.lerpColors(cloudColor, groundColor, t)
      density = THREE.MathUtils.lerp(CLOUD_DENSITY, GROUND_DENSITY, t)
    }

    if (!scene.fog) {
      scene.fog = new THREE.FogExp2(tmpColor.getHex(), density)
    } else {
      const fog = scene.fog as THREE.FogExp2
      fog.color.copy(tmpColor)
      fog.density = density
    }

    if (!scene.background || scene.background instanceof THREE.Color === false) {
      scene.background = new THREE.Color()
    }
    bgColor.copy(tmpColor).multiplyScalar(BACKGROUND_DIM)
    ;(scene.background as THREE.Color).copy(bgColor)
  })

  return null
}
