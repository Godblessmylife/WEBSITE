import { LiquidButton } from '@/components/ui/liquid-glass-button'
import { SectionStarfield } from './SectionStarfield'

const TELEGRAM_HANDLE = 'web3elchapo'
const WHATSAPP_NUMBER = '18296057621'
const PHONE_NUMBER = '+79256106936'
const PHONE_DISPLAY = '+7 925 610-69-36'

const TELEGRAM_URL = `https://t.me/${TELEGRAM_HANDLE}`
const WHATSAPP_URL = `https://wa.me/${WHATSAPP_NUMBER}`
const PHONE_URL = `tel:${PHONE_NUMBER}`

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
//
// Логотип — настоящие фирменные цвета Telegram (градиент #37BBFE ->
// #007DBB на круглой подложке, белый самолётик) вместо одноцветного
// silhouette-варианта: по запросу клиента "логотип телеграм голубой" и
// "сделай красивее". Обводка/свечение кнопки в тон логотипа отличают её
// от остальных LiquidButton на сайте — понятно, что это ИМЕННО контакт.
function TelegramIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 240 240" aria-hidden="true">
      <circle cx="120" cy="120" r="120" fill="url(#telegram-gradient)" />
      <path
        d="M186 68 165 172c-1.6 7-6 8.6-12 5.4l-33-24-16 15.4c-1.8 1.8-3.3 3.3-6.7 3.3l2.4-34 62-56c2.7-2.4-.6-3.7-4.2-1.3l-76.6 48.3-33-10.3c-7.2-2.2-7.3-7.2 1.5-10.7l129-49.7c6-2.2 11.2 1.4 9.3 11.6Z"
        fill="#fff"
      />
      <defs>
        <linearGradient id="telegram-gradient" x1="0" y1="0" x2="0" y2="240" gradientUnits="userSpaceOnUse">
          <stop stopColor="#37BBFE" />
          <stop offset="1" stopColor="#007DBB" />
        </linearGradient>
      </defs>
    </svg>
  )
}

function TelegramButton() {
  return (
    <LiquidButton
      size="xl"
      className="rounded-full border border-[#37BBFE]/50 text-[#eafcff] shadow-[0_0_28px_rgba(55,187,254,0.35)] hover:shadow-[0_0_42px_rgba(55,187,254,0.55)]"
      style={{ fontFamily: "'Orbitron', sans-serif", letterSpacing: '0.05em' }}
      onClick={() => window.open(TELEGRAM_URL, '_blank', 'noopener,noreferrer')}
    >
      <TelegramIcon />
      Написать в Telegram
    </LiquidButton>
  )
}

// Фирменный зелёный WhatsApp - та же логика цвета/обводки, что у
// Telegram (свой брендовый оттенок отличает кнопку от прочих на сайте).
function WhatsAppIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 32 32" aria-hidden="true">
      <circle cx="16" cy="16" r="16" fill="#25D366" />
      <path
        fill="#fff"
        d="M23.47 8.52A10.6 10.6 0 0 0 16.02 5.3c-5.86 0-10.63 4.77-10.63 10.63 0 1.87.49 3.7 1.42 5.31L5.3 26.7l5.6-1.47a10.6 10.6 0 0 0 5.11 1.3h.01c5.86 0 10.63-4.77 10.63-10.63a10.57 10.57 0 0 0-3.18-7.38Zm-7.45 16.35h-.01a8.8 8.8 0 0 1-4.5-1.23l-.32-.19-3.34.88.89-3.25-.21-.33a8.83 8.83 0 0 1-1.35-4.72c0-4.88 3.97-8.85 8.85-8.85a8.8 8.8 0 0 1 6.26 2.6 8.8 8.8 0 0 1 2.59 6.26c0 4.88-3.97 8.83-8.86 8.83Zm4.85-6.62c-.27-.13-1.58-.78-1.82-.87-.24-.09-.42-.13-.6.13-.18.27-.69.87-.85 1.05-.16.18-.31.2-.58.07-.27-.13-1.13-.42-2.15-1.33-.8-.71-1.33-1.58-1.49-1.85-.16-.27-.02-.42.12-.55.12-.12.27-.31.4-.47.13-.16.18-.27.27-.45.09-.18.04-.34-.02-.47-.07-.13-.6-1.45-.82-1.98-.22-.52-.44-.45-.6-.46h-.51c-.18 0-.47.07-.71.34-.24.27-.94.92-.94 2.24s.96 2.6 1.1 2.78c.13.18 1.9 2.9 4.6 4.06.64.28 1.14.44 1.53.57.64.2 1.23.17 1.69.11.52-.08 1.58-.65 1.8-1.27.22-.63.22-1.16.16-1.27-.07-.11-.24-.18-.51-.31Z"
      />
    </svg>
  )
}

function WhatsAppButton() {
  return (
    <LiquidButton
      size="xl"
      className="rounded-full border border-[#25D366]/50 text-[#eafcff] shadow-[0_0_28px_rgba(37,211,102,0.35)] hover:shadow-[0_0_42px_rgba(37,211,102,0.55)]"
      style={{ fontFamily: "'Orbitron', sans-serif", letterSpacing: '0.05em' }}
      onClick={() => window.open(WHATSAPP_URL, '_blank', 'noopener,noreferrer')}
    >
      <WhatsAppIcon />
      Написать в WhatsApp
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
        // Фон убран отсюда - секция теперь часть общего непрерывного фона
        // с GameEntry (см. обёртку в App.tsx): раньше у каждой секции был
        // свой отдельный radial-gradient, и на стыке между ними была
        // заметная граница/шов по просьбе клиента "сделай одно целое".
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
      <div
        style={{
          position: 'relative',
          zIndex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '1rem',
        }}
      >
        <TelegramButton />
        <WhatsAppButton />
        {/* Номер телефона текстом, отдельно от кнопок-мессенджеров - по
            просьбе клиента, тем же фирменным шрифтом заголовков сайта.
            Настоящая <a href="tel:">, а не просто текст - на мобильном
            тап сразу открывает номеронабиратель. */}
        <a
          href={PHONE_URL}
          style={{
            marginTop: '0.5rem',
            fontFamily: "'Orbitron', sans-serif",
            fontSize: '1.15rem',
            letterSpacing: '0.08em',
            color: '#eafcff',
            textDecoration: 'none',
            textShadow: '0 0 18px rgba(95, 212, 255, 0.45)',
          }}
        >
          {PHONE_DISPLAY}
        </a>
      </div>
    </section>
  )
}
