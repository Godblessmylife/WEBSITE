// Раньше здесь стоял quintic smootherstep (нулевая 1-я И 2-я производная
// на концах) — визуально красиво, но давал очень длинный "мёртвый"
// участок в начале скролла: заметное количество пикселей скролла почти
// не двигало прогресс (клиент: "скролл длинный, а приближение не
// быстрое"). Обычный кубический smoothstep сглаживает старт/финиш
// мягче, без такого плато.
export function easeProgress(raw: number): number {
  const x = Math.min(1, Math.max(0, raw))
  return x * x * (3 - 2 * x)
}

// Числовое обращение (бинарный поиск) вместо точной формулы — easeProgress
// монотонна, этого достаточно, и не завязывает scrollToProgress на
// конкретный вид кривой (поменяется easeProgress — инверсия сама
// подстроится). Нужно, чтобы кнопки навигации (Nav.tsx) реально
// докручивали до эффекта, который они называют, а не до "куда попадём
// при линейном пересчёте" — раньше именно поэтому кнопки промахивались.
export function inverseEaseProgress(target: number): number {
  const clamped = Math.min(1, Math.max(0, target))
  let lo = 0
  let hi = 1
  for (let i = 0; i < 30; i++) {
    const mid = (lo + hi) / 2
    if (easeProgress(mid) < clamped) {
      lo = mid
    } else {
      hi = mid
    }
  }
  return (lo + hi) / 2
}
