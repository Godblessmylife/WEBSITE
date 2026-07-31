import { useEffect, useRef, useState } from 'react'

// По жалобе клиента "на макбуке всё тормозит и долго грузится": до этого
// хука Canvas-секции ниже 3D-путешествия (About/Pricing/Contact/Portfolio
// /GameEntry) монтировались ВСЕ СРАЗУ при первой загрузке страницы, даже
// пока пользователь ещё смотрит на самое первое "небо" - то есть 5-6 живых
// WebGL-контекстов одновременно конкурировали за GPU с самого начала,
// хотя реально видна только сцена путешествия (см. подробный разбор той
// же проблемы в JourneyScene.tsx). Ничего из контента при этом не
// вырезается - каждая секция монтирует свой Canvas сама, как только
// приближается к области видимости (rootMargin даёт запас, чтобы
// пользователь не увидел "пустую" секцию долю секунды при подскролле).
// Once-triggered (не гасится обратно при скролле прочь) - иначе Canvas
// пересоздавался бы туда-обратно при скролле вверх-вниз мимо границы,
// что дороже и заметнее, чем просто держать его смонтированным.
export function useInView<T extends Element>(rootMargin = '800px') {
  const ref = useRef<T>(null!)
  const [inView, setInView] = useState(false)

  useEffect(() => {
    if (inView) return
    const el = ref.current
    if (!el) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setInView(true)
      },
      { rootMargin },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [inView, rootMargin])

  return [ref, inView] as const
}
