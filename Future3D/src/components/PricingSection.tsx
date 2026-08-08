import { useState } from 'react'
import { SectionStarfield } from './SectionStarfield'
import { useScrollStore } from '@/utils/scrollStore'
import { LiquidButton } from '@/components/ui/liquid-glass-button'

// Готовая, статическая страница оплаты (Trybit/CryptoCloud, POS-ссылка) -
// без бэкенда: секретный API-ключ платёжного шлюза НЕ используется нигде
// во фронтенде (это было бы утечкой - см. подробности решения в чате),
// ссылка просто открывает уже настроенную страницу оплаты у провайдера.
// Одна ссылка на все тарифы (не по кнопке на каждой карточке) - у неё
// нет способа заранее передать конкретную сумму конкретного тарифа, так
// что дублировать её на каждой карточке создало бы ложное впечатление,
// что тарифы ведут на РАЗНЫЕ страницы с уже подставленной ценой.
const PAYMENT_URL = 'https://pay.trybit.com/pos/kYtzJrJtRPNnPzsG'

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

// "Зеркальные карточки" здесь — CSS-эффект (градиентная фольга по краю
// + диагональный блик), а не полноценные 3D-канвасы, как у портфолио.
// Причина: контент этой секции — конкретные цены и список услуг, то
// есть настоящий текст, который должен остаться настоящим текстом
// (раньше уже был явный запрос клиента на реальный, читаемый контент
// вместо чисто визуальных эффектов) — превращать цены в WebGL-текстуры
// убрало бы это. Визуально даёт тот же "зеркальный" эффект без потери
// текста.
//
// Кликабельны: ведут к контактам (#contact) — самое естественное
// действие после выбора тарифа. Конкретное место назначения не было
// указано явно, при другом ожидании — легко поменять одну строку.
function TierCard({ tier }: { tier: Tier }) {
  const [hovered, setHovered] = useState(false)

  const goToContact = () => useScrollStore.getState().scrollToElement('#contact')

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={goToContact}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          goToContact()
        }
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position: 'relative',
        padding: '2rem 1.5rem',
        borderRadius: '18px',
        border: '1px solid transparent',
        background: tier.highlight
          ? 'linear-gradient(#132038,#132038) padding-box, linear-gradient(135deg, rgba(95,212,255,0.9), rgba(255,255,255,0.25), rgba(95,212,255,0.6)) border-box'
          : 'linear-gradient(#0d1420,#0d1420) padding-box, linear-gradient(135deg, rgba(255,255,255,0.35), rgba(255,255,255,0.05), rgba(95,212,255,0.3)) border-box',
        backdropFilter: 'blur(6px)',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.8rem',
        cursor: 'pointer',
        touchAction: 'manipulation',
        // "Bubble" — карточка будто выплывает к зрителю: масштаб + лёгкий
        // подъём, а не просто плоское увеличение.
        transform: hovered ? 'scale(1.1) translateY(-10px)' : 'scale(1) translateY(0)',
        boxShadow: hovered
          ? '0 20px 45px rgba(95, 212, 255, 0.35), 0 0 0 1px rgba(255,255,255,0.2) inset'
          : '0 0 0 rgba(0,0,0,0)',
        zIndex: hovered ? 2 : 1,
        transition: 'transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.35s ease',
      }}
    >
      {/* диагональный блик — имитация отражения на металле/стекле */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(115deg, transparent 40%, rgba(255,255,255,0.12) 50%, transparent 60%)',
          pointerEvents: 'none',
        }}
      />
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
      <span style={{ fontSize: '1.6rem', fontWeight: 700, color: '#f4f9ff' }}>{tier.price}</span>
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
  )
}

export function PricingSection() {
  return (
    <section
      id="pricing"
      style={{
        position: 'relative',
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        padding: '6rem 1.5rem',
        background: 'radial-gradient(circle at 50% 80%, #101a2e 0%, #05070d 70%)',
        overflow: 'hidden',
      }}
    >
      <SectionStarfield />
      <div style={{ position: 'relative', zIndex: 1, maxWidth: '1100px', margin: '0 auto', width: '100%' }}>
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
            gap: '0.85rem',
          }}
        >
          {TIERS.map((tier) => (
            <TierCard key={tier.name} tier={tier} />
          ))}
        </div>

        <div style={{ marginTop: '2.5rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.7rem' }}>
          <LiquidButton
            size="xl"
            className="rounded-full border border-[#5fd4ff]/50 text-[#eafcff] shadow-[0_0_28px_rgba(95,212,255,0.35)] hover:shadow-[0_0_42px_rgba(95,212,255,0.55)]"
            style={{ fontFamily: "'Orbitron', sans-serif", letterSpacing: '0.08em', fontSize: '0.95rem' }}
            onClick={() => window.open(PAYMENT_URL, '_blank', 'noopener,noreferrer')}
          >
            ОПЛАТИТЬ
          </LiquidButton>
          <p style={{ color: '#7d92a8', fontSize: '0.8rem', textAlign: 'center', maxWidth: '420px' }}>
            Откроется страница оплаты — сумму и детали заказа уточните заранее в чате.
          </p>
        </div>
      </div>
    </section>
  )
}
