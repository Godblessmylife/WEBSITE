// Тактильный отклик на кнопки HUD игры - по просьбе клиента. Поддержка
// vibrate() у браузеров разная (десктоп/Safari iOS вообще не умеют) -
// просто no-op там, где API нет, вместо проверки конкретных браузеров.
export function vibrate(durationMs = 15) {
  if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
    navigator.vibrate(durationMs)
  }
}
