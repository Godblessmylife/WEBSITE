import { SectionStarfield } from './SectionStarfield'

const SERVICES = [
  { title: 'Веб-сайты и лендинги', desc: 'От визитки до сложного многостраничного сайта — быстро, адаптивно, без шаблонов.' },
  { title: '3D и интерактив', desc: 'Сцены, анимации, погружение — как то, через что вы только что пролетели.' },
  { title: 'Игры и приложения', desc: 'Интерактивные веб-игры, тренажёры, демо — то, во что можно поиграть, а не просто посмотреть.' },
  { title: 'Брендинг и UI/UX', desc: 'Дизайн-системы и интерфейсы, которые выглядят дорого и работают быстро.' },
]

export function AboutSection() {
  return (
    <section
      id="about"
      style={{
        position: 'relative',
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        padding: '6rem 1.5rem',
        background: 'radial-gradient(circle at 50% 20%, #101a2e 0%, #05070d 70%)',
        overflow: 'hidden',
      }}
    >
      <SectionStarfield />
      <div style={{ position: 'relative', zIndex: 1, maxWidth: '960px', margin: '0 auto', width: '100%' }}>
        {/* По центру и крупнее, со свечением - тот же приём, что у
            "КОНТАКТЫ"/"ЦЕНЫ", по явной просьбе клиента. Остальной блок
            (заголовок, текст, карточки услуг) остаётся выровненным по
            левому краю - клиент просил выделить именно эту надпись, не
            перестраивать всю секцию. */}
        <p
          style={{
            fontFamily: "'Orbitron', sans-serif",
            fontWeight: 700,
            color: '#5fd4ff',
            letterSpacing: '0.18em',
            fontSize: 'clamp(1.6rem, 4.5vw, 2.6rem)',
            marginBottom: '1.25rem',
            textAlign: 'center',
            textShadow: '0 0 22px rgba(95, 212, 255, 0.65), 0 0 48px rgba(95, 212, 255, 0.35)',
          }}
        >
          О РАЗРАБОТЧИКЕ
        </p>
        <h2
          style={{
            fontFamily: "'Orbitron', sans-serif",
            fontSize: 'clamp(1.8rem, 4vw, 3rem)',
            lineHeight: 1.15,
            margin: '0 0 1.5rem',
            color: '#f4f9ff',
          }}
        >
          Я СТРОЮ МИРЫ,
          <br />А НЕ САЙТЫ
        </h2>
        <p
          style={{
            fontSize: '1.1rem',
            lineHeight: 1.7,
            color: '#c3d3e6',
            maxWidth: '640px',
            marginBottom: '3rem',
          }}
        >
          JavaScript-разработчик. Делаю сайты, 3D-сцены и игры, которые запоминаются
          с первой секунды — как эта страница, которую вы только что пролистали. Пока
          другие показывают скриншоты в портфолио, я даю потрогать результат руками.
        </p>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '1.5rem',
          }}
        >
          {SERVICES.map((service) => (
            <div
              key={service.title}
              style={{
                padding: '1.5rem',
                borderRadius: '16px',
                background: 'rgba(95, 212, 255, 0.06)',
                border: '1px solid rgba(95, 212, 255, 0.18)',
              }}
            >
              <h3
                style={{
                  fontFamily: "'Orbitron', sans-serif",
                  fontSize: '1rem',
                  color: '#5fd4ff',
                  margin: '0 0 0.6rem',
                }}
              >
                {service.title}
              </h3>
              <p style={{ margin: 0, color: '#9db2c9', fontSize: '0.92rem', lineHeight: 1.5 }}>
                {service.desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
