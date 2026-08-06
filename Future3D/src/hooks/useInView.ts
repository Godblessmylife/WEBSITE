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
//
// РАНЬШЕ здесь стояло "once-triggered" (однажды показавшись - никогда не
// гаснет обратно), намеренно, чтобы не пересоздавать Canvas туда-обратно
// при скролле рядом с границей. НО по факту это означало, что при обычном
// чтении всей страницы сверху вниз (без единого открытия игры) читатель
// накапливает разом 5-6 ЖИВЫХ WebGL-контекстов (путешествие + 3x
// SectionStarfield + карусель портфолио + компьютер со START) и ни один
// из них никогда не освобождается. На десктопном GPU с запасом видеопамяти
// это неощутимо, но у iOS Safari исторически куда более жёсткий лимит
// одновременных контекстов - и при его превышении WebKit не просто
// отказывает в создании нового (как Chromium), а молча "выселяет"
// содержимое САМОГО СТАРОГО контекста, оставляя его канвас чёрным - при
// этом остальной React/DOM (кнопки меню, текст) продолжает работать как
// ни в чём не бывало. Это ТОЧНО совпадает с отзывом клиента: солнечная
// система (первый и потому самый вероятный кандидат на "выселение")
// чернеет, а кнопки меню и подсказка "Скроллите вниз" остаются на месте.
//
// Исправление - секция размонтирует свой Canvas, как только уходит из
// той же зоны (`entry.isIntersecting` в обе стороны, не только true один
// раз) - общее число одновременно живых контекстов теперь ограничено, а
// не растёт без ограничения по мере чтения страницы.
//
// ВАЖНО: гашение (true -> false) идёт с задержкой (HIDE_DELAY_MS), а не
// мгновенно. Без неё автотест с быстрым скроллом (несколько границ секций
// пересекаются одним прыжком window.scrollTo) поймал реальный краш: R3F
// внутри Canvas асинхронно подключает обработчики событий к DOM-элементу
// canvas (events.connect(...) в react-three-fiber), и если тот же Canvas
// успевает размонтироваться раньше, чем это подключение завершится, оно
// падает с `TypeError: Cannot read properties of null (reading
// 'addEventListener')` - необработанная ошибка внутри библиотеки рушит
// всё React-дерево (RootErrorBoundary покрывает это, но лучше не ловить
// такое вообще). Задержка на скрытие даёт этой внутренней инициализации
// время завершиться и превращает частые "туда-обратно" пересечения
// границы в редкие, настоящие уходы секции из вида.
const HIDE_DELAY_MS = 1000

export function useInView<T extends Element>(rootMargin = '800px') {
  const ref = useRef<T>(null!)
  const [inView, setInView] = useState(false)
  const hideTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const clearPendingHide = () => {
      if (hideTimeoutRef.current !== null) {
        clearTimeout(hideTimeoutRef.current)
        hideTimeoutRef.current = null
      }
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          clearPendingHide()
          setInView(true)
        } else {
          clearPendingHide()
          hideTimeoutRef.current = setTimeout(() => setInView(false), HIDE_DELAY_MS)
        }
      },
      { rootMargin },
    )
    observer.observe(el)
    return () => {
      observer.disconnect()
      clearPendingHide()
    }
  }, [rootMargin])

  return [ref, inView] as const
}
