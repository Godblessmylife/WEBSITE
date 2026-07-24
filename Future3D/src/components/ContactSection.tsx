// ЗАМЕНИТЬ на реальный ник — у меня нет вашего Telegram, придумывать
// контактные данные я не стал (это единственное, что нельзя дописать
// "с полной свободой фантазии" — это факт, а не текст).
const TELEGRAM_HANDLE = 'your_telegram_handle'

export function ContactSection() {
  return (
    <section
      id="contact"
      style={{
        minHeight: '80vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        padding: '6rem 1.5rem',
        background: 'radial-gradient(circle at 50% 50%, #101a2e 0%, #05070d 70%)',
      }}
    >
      <p
        style={{
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
          fontFamily: "'Orbitron', sans-serif",
          fontSize: 'clamp(1.6rem, 4vw, 2.6rem)',
          margin: '0 0 1.5rem',
          color: '#f4f9ff',
        }}
      >
        ГОТОВЫ НАЧАТЬ?
      </h2>
      <p style={{ color: '#9db2c9', fontSize: '1rem', marginBottom: '2.5rem', maxWidth: '460px' }}>
        Опишите задачу в Telegram — отвечаю быстро, без менеджеров и лишней переписки.
      </p>
      <a
        href={`https://t.me/${TELEGRAM_HANDLE}`}
        target="_blank"
        rel="noopener noreferrer"
        style={{
          fontFamily: "'Orbitron', sans-serif",
          fontSize: '1.1rem',
          color: '#05070d',
          background: '#5fd4ff',
          padding: '1rem 2.5rem',
          borderRadius: '999px',
          textDecoration: 'none',
          fontWeight: 700,
          letterSpacing: '0.05em',
          touchAction: 'manipulation',
        }}
      >
        Написать в Telegram
      </a>
    </section>
  )
}
