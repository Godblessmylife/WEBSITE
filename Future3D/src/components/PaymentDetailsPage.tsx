import { useEffect, useState } from 'react'
import { useCompanyPageStore } from '@/utils/companyPageStore'

// Страница реквизитов для оплаты (ЮKassa / СБП) - тот же оверлей-паттерн,
// что CompanyPage.tsx. ВАЖНО: поля ниже - ПЛАЦЕХОЛДЕРЫ. Реальные
// платёжные/юридические данные (ФИО получателя, номер для СБП, банк,
// ИНН) нельзя было придумать - их подставляет клиент перед тем, как
// давать эту ссылку в оплату. Каждое пустое поле помечено визуально
// (жёлтая рамка + текст "заполнить"), чтобы случайно не уйти в прод
// с фиктивными данными.
interface RequisiteField {
  label: string
  value: string
  filled: boolean
}

const REQUISITES: RequisiteField[] = [
  { label: 'Получатель (ФИО)', value: '— заполнить —', filled: false },
  { label: 'Номер телефона для СБП', value: '— заполнить —', filled: false },
  { label: 'Банк-получатель', value: '— заполнить —', filled: false },
  { label: 'ИНН (для самозанятого/ИП)', value: '— заполнить —', filled: false },
  { label: 'Назначение платежа', value: 'Оплата услуг веб-разработки', filled: true },
]

export function PaymentDetailsPage() {
  const page = useCompanyPageStore((s) => s.page)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (page !== 'payment') return
    const id = requestAnimationFrame(() => requestAnimationFrame(() => setVisible(true)))
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') useCompanyPageStore.getState().close()
    }
    window.addEventListener('keydown', onKeyDown)
    document.body.style.overflow = 'hidden'
    return () => {
      cancelAnimationFrame(id)
      window.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = ''
      setVisible(false)
    }
  }, [page])

  if (page !== 'payment') return null

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 900,
        overflowY: 'auto',
        background: '#05070d',
        opacity: visible ? 1 : 0,
        transition: 'opacity 0.3s ease',
      }}
    >
      <button
        onClick={() => useCompanyPageStore.getState().close()}
        style={{
          position: 'fixed',
          top: 'calc(1.25rem + env(safe-area-inset-top))',
          right: 'calc(1.25rem + env(safe-area-inset-right))',
          zIndex: 20,
          padding: '0.6rem 1.3rem',
          minHeight: '2.6rem',
          background: 'rgba(95, 212, 255, 0.95)',
          border: '1px solid #eafcff',
          borderRadius: '999px',
          color: '#05070d',
          fontFamily: "'Orbitron', sans-serif",
          fontWeight: 700,
          fontSize: '0.85rem',
          cursor: 'pointer',
        }}
      >
        ✕ Закрыть
      </button>

      <div style={{ maxWidth: '620px', margin: '0 auto', padding: '5.5rem 1.5rem 4rem' }}>
        <p
          style={{
            fontFamily: "'Orbitron', sans-serif",
            fontWeight: 700,
            color: '#5fd4ff',
            letterSpacing: '0.16em',
            fontSize: 'clamp(1rem, 2.5vw, 1.3rem)',
            marginBottom: '1rem',
            textAlign: 'center',
          }}
        >
          РЕКВИЗИТЫ ДЛЯ ОПЛАТЫ
        </p>
        <p style={{ textAlign: 'center', color: '#9db2c9', fontSize: '0.9rem', marginBottom: '2.5rem' }}>
          Оплата принимается через ЮKassa (СБП). Проверьте данные получателя перед переводом.
        </p>

        <div
          style={{
            borderRadius: '16px',
            border: '1px solid rgba(95, 212, 255, 0.22)',
            background: 'linear-gradient(160deg, rgba(32, 52, 74, 0.5), rgba(8, 13, 22, 0.7))',
            overflow: 'hidden',
          }}
        >
          {REQUISITES.map((r, i) => (
            <div
              key={r.label}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                gap: '1rem',
                padding: '1rem 1.4rem',
                borderTop: i === 0 ? 'none' : '1px solid rgba(95, 212, 255, 0.12)',
              }}
            >
              <span style={{ color: '#9db2c9', fontSize: '0.88rem' }}>{r.label}</span>
              <span
                style={{
                  color: r.filled ? '#eafcff' : '#ffb15f',
                  fontSize: '0.92rem',
                  fontWeight: r.filled ? 400 : 700,
                  textAlign: 'right',
                }}
              >
                {r.value}
              </span>
            </div>
          ))}
        </div>

        <p style={{ marginTop: '1.5rem', color: '#ffb15f', fontSize: '0.82rem', textAlign: 'center' }}>
          Эта страница не готова к использованию, пока оранжевые поля не заполнены реальными данными.
        </p>
      </div>
    </div>
  )
}
