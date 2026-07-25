import { LiquidButton } from '@/components/ui/liquid-glass-button'
import { SectionStarfield } from './SectionStarfield'

const TELEGRAM_HANDLE = 'web3elchapo'

const TELEGRAM_URL = `https://t.me/${TELEGRAM_HANDLE}`

// Заменён на LiquidButton (shadcn-стиль, Tailwind) по запросу клиента.
//
// asChild НЕ используется: LiquidButton рендерит несколько соседних
// элементов внутри Comp (div со свечением, div с backdrop-filter,
// обёртку контента, GlassFilter) — у Radix Slot жёсткое требование
// ровно один дочерний элемент при asChild, с несколькими он падает с
// "Slot failed to slot onto its children" (поймано RootErrorBoundary
// при проверке, приводило к падению всего сайта, не только кнопки).
// Это ограничение самого скопированного компонента, не нашего кода —
// с одиночным ref-forwarding компонентом asChild сработал бы нормально.
// Рендерим настоящую кнопку с переходом по клику: строго говоря, это
// менее семантично, чем <a> (не работает открытие в новой вкладке
// правой кнопкой/копирование ссылки), но безопаснее, чем чинить
// внутренности вставленного компонента вслепую.
function TelegramButton() {
  return (
    <LiquidButton
      size="lg"
      className="rounded-full"
      style={{ fontFamily: "'Orbitron', sans-serif", letterSpacing: '0.05em' }}
      onClick={() => window.open(TELEGRAM_URL, '_blank', 'noopener,noreferrer')}
    >
      <svg width="20" height="20" viewBox="0 0 240 240" fill="none" aria-hidden="true">
        <path
          d="M186 68 165 172c-1.6 7-6 8.6-12 5.4l-33-24-16 15.4c-1.8 1.8-3.3 3.3-6.7 3.3l2.4-34 62-56c2.7-2.4-.6-3.7-4.2-1.3l-76.6 48.3-33-10.3c-7.2-2.2-7.3-7.2 1.5-10.7l129-49.7c6-2.2 11.2 1.4 9.3 11.6Z"
          fill="currentColor"
        />
      </svg>
      Написать в Telegram
    </LiquidButton>
  )
}

export function ContactSection() {
  return (
    <section
      id="contact"
      style={{
        position: 'relative',
        minHeight: '80vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        padding: '6rem 1.5rem',
        background: 'radial-gradient(circle at 50% 50%, #101a2e 0%, #05070d 70%)',
        overflow: 'hidden',
      }}
    >
      <SectionStarfield />
      <p
        style={{
          position: 'relative',
          zIndex: 1,
          fontFamily: "'Orbitron', sans-serif",
          color: '#5fd4ff',
          letterSpacing: '0.2em',
          fontSize: '0.85rem',
          marginBottom: '1rem',
        }}
      >
        КОНТАКТЫ
      </p>
      <h2
        style={{
          position: 'relative',
          zIndex: 1,
          fontFamily: "'Orbitron', sans-serif",
          fontSize: 'clamp(1.6rem, 4vw, 2.6rem)',
          margin: '0 0 1.5rem',
          color: '#f4f9ff',
        }}
      >
        ГОТОВЫ НАЧАТЬ?
      </h2>
      <p
        style={{
          position: 'relative',
          zIndex: 1,
          color: '#9db2c9',
          fontSize: '1rem',
          marginBottom: '2.5rem',
          maxWidth: '460px',
        }}
      >
        Опишите задачу в Telegram — отвечаю быстро, без менеджеров и лишней переписки.
      </p>
      <div style={{ position: 'relative', zIndex: 1 }}>
        <TelegramButton />
      </div>
    </section>
  )
}
