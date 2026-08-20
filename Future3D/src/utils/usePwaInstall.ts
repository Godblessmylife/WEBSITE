import { useEffect, useState } from 'react'

// Chrome/Android - стандартное, но нетипизированное в lib.dom.d.ts
// событие (Safari/Firefox его никогда не отправляют - это нормально, не
// баг совместимости, а разный набор API у разных браузеров).
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

function isIos(): boolean {
  // MSStream - историческая проверка "это не IE11 на Windows Phone,
  // притворяющийся iPhone в UA" - у настоящего iOS его никогда нет.
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !('MSStream' in window)
}

function isStandalone(): boolean {
  // display-mode: standalone - Android/Chrome (и iOS с недавних версий).
  // navigator.standalone - старый, но всё ещё рабочий способ для iOS Safari.
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  )
}

// Установка игры на рабочий стол (по просьбе клиента - "как я раньше
// добавлял на рабочий стол Three.js-игру"). На Android/Chrome браузер сам
// присылает событие beforeinstallprompt - его нужно поймать и придержать
// (без preventDefault браузер покажет СВОЙ мини-баннер и наша кнопка была
// бы бесполезна вторым дублирующим способом того же действия), чтобы
// вызвать программно по клику на кнопку в настройках. iOS Safari такого
// события никогда не отправляет (нет API для программного вызова) -
// единственный способ - подсказать вручную "Поделиться → На экран Домой",
// поэтому isIos отдельно, InstallAppButton.tsx показывает инструкцию
// вместо кнопки.
export function usePwaInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [installed, setInstalled] = useState(() => isStandalone())

  useEffect(() => {
    const onBeforeInstallPrompt = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
    }
    const onAppInstalled = () => {
      setInstalled(true)
      setDeferredPrompt(null)
    }
    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt)
    window.addEventListener('appinstalled', onAppInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt)
      window.removeEventListener('appinstalled', onAppInstalled)
    }
  }, [])

  const promptInstall = async () => {
    if (!deferredPrompt) return
    await deferredPrompt.prompt()
    await deferredPrompt.userChoice
    // Само событие одноразовое (браузер не пришлёт его снова, пока
    // страница не перезагрузится) - сбрасываем независимо от выбора
    // пользователя, иначе кнопка осталась бы вести на уже "протухший" prompt.
    setDeferredPrompt(null)
  }

  return { canPromptInstall: !!deferredPrompt, promptInstall, installed, isIos: isIos() }
}
