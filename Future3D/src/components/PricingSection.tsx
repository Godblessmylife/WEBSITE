interface Tier {
  name: string
  price: string
  desc: string
  features: string[]
  highlight?: boolean
}

// Диапазон 99 999 ₽ – 3 000 000 ₽ задан клиентом. Конкретные пакеты и
// формулировки — предложены мной (клиент дал полную свободу в этой
// части), стоит свериться и поправить под реальные проекты/объём работы.
const TIERS: Tier[] = [
  {
    name: 'СТАРТ',
    price: 'от 99 999 ₽',
    desc: 'Сайт-визитка или лендинг',
    features: ['Адаптивный дизайн', 'Базовая анимация', 'До 5 экранов'],
  },
  {
    name: 'БИЗНЕС',
    price: 'от 349 000 ₽',
    desc: 'Многостраничный сайт',
    features: ['Каталог/CMS', 'Интеграции (формы, оплата)', 'SEO-база'],
  },
  {
    name: '3D / ИНТЕРАКТИВ',
    price: 'от 990 000 ₽',
    desc: 'Как этот сайт',
    features: ['3D-сцены и анимации', 'Кастомные шейдеры/эффекты', 'Скролл-сторителлинг'],
    highlight: true,
  },
  {
    name: 'ФЛАГМАН',
    price: 'от 3 000 000 ₽',
    desc: 'Веб-игра или сложное приложение',
    features: ['Полный цикл разработки', 'Игровая механика', 'Индивидуальная архитектура'],
  },
]

export function PricingSection() {
  return (
    <section
      id="pricing"
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        padding: '6rem 1.5rem',
        background: 'radial-gradient(circle at 50% 80%, #101a2e 0%, #05070d 70%)',
      }}
    >
      <div style={{ maxWidth: '1100px', margin: '0 auto', width: '100%' }}>
        <p
          style={{
            fontFamily: "'Orbitron', sans-serif",
            color: '#5fd4ff',
            letterSpacing: '0.2em',
            fontSize: '0.85rem',
            marginBottom: '1rem',
            textAlign: 'center',
          }}
        >
          ЦЕНЫ
        </p>
        <h2
          style={{
            fontFamily: "'Orbitron', sans-serif",
            fontSize: 'clamp(1.8rem, 4vw, 2.6rem)',
            margin: '0 0 3rem',
            color: '#f4f9ff',
            textAlign: 'center',
          }}
        >
          СКОЛЬКО ЭТО СТОИТ
        </h2>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))',
            gap: '1.5rem',
          }}
        >
          {TIERS.map((tier) => (
            <div
              key={tier.name}
              style={{
                padding: '2rem 1.5rem',
                borderRadius: '18px',
                background: tier.highlight
                  ? 'rgba(95, 212, 255, 0.1)'
                  : 'rgba(255, 255, 255, 0.03)',
                border: tier.highlight
                  ? '1px solid rgba(95, 212, 255, 0.55)'
                  : '1px solid rgba(255, 255, 255, 0.08)',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.8rem',
              }}
            >
              <span
                style={{
                  fontFamily: "'Orbitron', sans-serif",
                  fontSize: '0.85rem',
                  letterSpacing: '0.1em',
                  color: tier.highlight ? '#5fd4ff' : '#9db2c9',
                }}
              >
                {tier.name}
              </span>
              <span style={{ fontSize: '1.6rem', fontWeight: 700, color: '#f4f9ff' }}>
                {tier.price}
              </span>
              <span style={{ color: '#9db2c9', fontSize: '0.95rem' }}>{tier.desc}</span>
              <ul style={{ margin: '0.5rem 0 0', padding: 0, listStyle: 'none' }}>
                {tier.features.map((feature) => (
                  <li
                    key={feature}
                    style={{
                      color: '#c3d3e6',
                      fontSize: '0.88rem',
                      padding: '0.35rem 0',
                      borderTop: '1px solid rgba(255,255,255,0.06)',
                    }}
                  >
                    {feature}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <p style={{ textAlign: 'center', color: '#6d7f96', fontSize: '0.85rem', marginTop: '2rem' }}>
          Точная стоимость зависит от объёма — обсудим в личных сообщениях.
        </p>
      </div>
    </section>
  )
}
