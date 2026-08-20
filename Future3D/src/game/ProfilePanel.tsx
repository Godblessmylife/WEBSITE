import { useEffect, useMemo, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls, useAnimations, useGLTF } from '@react-three/drei'
import * as THREE from 'three'
import { clone as cloneSkinnedScene } from 'three/examples/jsm/utils/SkeletonUtils.js'
import { useProfileStore } from '@/utils/profileStore'
import { useHeroSelectionStore } from '@/utils/heroSelectionStore'
import { HERO_MODELS, resolveHeroModel, WALK_CLIP_PATTERN } from '@/utils/heroModels'
import { usePlayerProfileStore } from '@/utils/playerProfileStore'
import { useGameStore, levelFromScore } from '@/utils/gameStore'

// Целевая высота кадра с запасом сверху/снизу - подобрана под реальный
// рост Meshy AI-персонажей (~1.7-2 игровых единицы, как и у живого
// героя на карте), не привязана к конкретной модели: при появлении
// новой модели того же типа камера продолжит показывать её целиком.
const TARGET_VIEW_HEIGHT = 2.5

// Превью модели внутри маленького независимого Canvas (тот же приём,
// что GameEntry.tsx для компьютера - отдельный R3F-контекст, никак не
// связан с игровым миром/физикой). Проигрывает клип ходьбы в цикле по
// умолчанию ("чтобы все модели ходили").
//
// БАГ (по отзыву клиента: "выходя из профиля героя не видно"): раньше
// здесь бралась ТА ЖЕ scene, что useGLTF отдаёт и PlayerCharacter.tsx
// (drei кэширует загруженную модель ГЛОБАЛЬНО по url, один Object3D на
// всё приложение). <primitive object={scene}> в ДВУХ местах одновременно
// физически невозможен в three.js - .add() у THREE.Object3D всегда
// сначала открепляет объект от прежнего родителя, так что стоило открыть
// профиль (или просто смонтировать этот компонент), как модель
// выдёргивалась из живой сцены игры и не возвращалась обратно сама, даже
// после закрытия профиля. SkeletonUtils.clone (не обычный .clone() -
// скиннингу нужен отдельный, специальный клон с переносом привязки
// костей) даёт превью СОБСТВЕННУЮ независимую копию - обе сцены теперь
// живут своей жизнью.
function PreviewModel({ url }: { url: string }) {
  const { scene, animations } = useGLTF(url)
  const clonedScene = useMemo(() => cloneSkinnedScene(scene), [scene])
  const { actions } = useAnimations(animations, clonedScene)
  const walkActionRef = useRef<ReturnType<typeof useAnimations>['actions'][string] | null>(null)

  useEffect(() => {
    walkActionRef.current = Object.entries(actions).find(([name]) => WALK_CLIP_PATTERN.test(name))?.[1] ?? null
    walkActionRef.current?.reset().play()
  }, [actions])

  // БАГ (по отзыву клиента: "видна только верхняя часть модели"): в
  // живой игре PlayerCharacter.tsx сдвигает модель вниз на высоту
  // капсулы (MODEL_Y_OFFSET) - её собственный (0,0,0) стоит примерно на
  // уровне таза, а не стоп. Здесь этого сдвига не было вообще, поэтому
  // камера, настроенная на "ноги у пола", утыкалась в середину торса.
  // Вместо копирования той же магической константы (подобранной под
  // капсулу физики, не под кадрирование) - находим РЕАЛЬНЫЙ нижний край
  // модели через bounding box и ставим именно его на y=0, что верно для
  // любой модели человеческого роста независимо от происхождения экспорта.
  const groundOffset = useMemo(() => {
    const box = new THREE.Box3().setFromObject(clonedScene)
    return Number.isFinite(box.min.y) ? -box.min.y : 0
  }, [clonedScene])

  return (
    <group position={[0, groundOffset, 0]}>
      <primitive object={clonedScene} />
    </group>
  )
}

const buttonStyle: CSSProperties = {
  padding: '0.45rem 0.9rem',
  fontSize: '0.8rem',
  fontFamily: "'Orbitron', sans-serif",
  borderRadius: '999px',
  cursor: 'pointer',
  touchAction: 'manipulation',
}

// Та же статическая POS-ссылка и тот же способ её открывать, что уже
// используется в PricingSection.tsx для тарифов (клиент явно подтвердил
// переиспользовать этот паттерн для разблокировки героя) - у неё нет
// способа заранее подставить конкретную сумму/товар, а у сайта нет
// бэкенда, который мог бы проверить оплату и что-то реально разблокировать.
// Это декоративная витрина будущей модели, а не рабочая покупка - явно
// говорим об этом ограничении, а не скрываем его.
const PAYMENT_URL = 'https://pay.trybit.com/pos/kYtzJrJtRPNnPzsG'
const openPayment = () => window.open(PAYMENT_URL, '_blank', 'noopener,noreferrer')

const tabButtonStyle: CSSProperties = {
  padding: '0.5rem 1.1rem',
  fontFamily: "'Orbitron', sans-serif",
  fontSize: '0.8rem',
  borderRadius: '999px',
  cursor: 'pointer',
  touchAction: 'manipulation',
}

// Окно "Профиль" - заменило кнопку "Кирка" в HUD (Дополнение 4).
// Показывает только выбор персонажа + вращаемое превью - кнопки скиллов
// отсюда убраны по отзыву клиента ("кнопку скиллов отдельно, не в
// профиле") - скиллы теперь только в HUD игры (SkillsButton.tsx),
// прямо на живом персонаже.
export function ProfilePanel() {
  const isOpen = useProfileStore((s) => s.isOpen)
  const setOpen = useProfileStore((s) => s.setOpen)
  const selectedHeroId = useHeroSelectionStore((s) => s.selectedHeroId)
  const setSelectedHero = useHeroSelectionStore((s) => s.setSelectedHero)
  const nickname = usePlayerProfileStore((s) => s.nickname)
  const setNickname = usePlayerProfileStore((s) => s.setNickname)
  const totalScore = useGameStore((s) => s.totalScore)
  const level = levelFromScore(totalScore)
  // Дополнение 6 - вторая вкладка "Ещё герои" рядом с обычным выбором
  // персонажа: декоративная витрина будущей модели за $9.99 (см.
  // PAYMENT_URL выше).
  const [tab, setTab] = useState<'roster' | 'more'>('roster')

  // БАГ (обнаружен при добавлении тяжёлого превью "Скелетона"): этот
  // маленький Canvas - ТРЕТИЙ одновременный WebGL-контекст на странице
  // (помимо основного игрового и, если ещё виден, JourneyScene) - под
  // нагрузкой от декодирования крупных текстур GPU реально теряет
  // контекст (подтверждено: `THREE.WebGLRenderer: Context Lost.` в
  // консоли). Браузер способен молча "восстановить" WebGL-контекст
  // (isContextLost() снова false), но все текстуры/буферы Three.js всё
  // равно потеряны безвозвратно - без пересоздания Canvas превью
  // застревает полностью белым НАВСЕГДА. Тот же приём восстановления,
  // что уже есть в GameMode.tsx/JourneyScene.tsx - полный ремонт через
  // смену key вместо пассивного ожидания.
  const [previewRecoveryKey, setPreviewRecoveryKey] = useState(0)
  const previewRecoveryAttemptsRef = useRef(0)
  const MAX_PREVIEW_CONTEXT_RECOVERY_ATTEMPTS = 3
  const handlePreviewCanvasCreated = ({ gl }: { gl: THREE.WebGLRenderer }) => {
    gl.domElement.addEventListener('webglcontextlost', (event) => {
      event.preventDefault()
      previewRecoveryAttemptsRef.current += 1
      console.error('[ProfilePanel] WebGL context lost, попытка восстановления', previewRecoveryAttemptsRef.current)
      if (previewRecoveryAttemptsRef.current > MAX_PREVIEW_CONTEXT_RECOVERY_ATTEMPTS) return
      window.setTimeout(() => setPreviewRecoveryKey((k) => k + 1), 300)
    })
  }

  if (!isOpen) return null

  const model = resolveHeroModel(selectedHeroId)
  // Герой, ещё не разблокированный (см. locked в heroModels.ts) - если
  // есть, вкладка "Ещё герои" показывает его настоящее вращаемое превью
  // вместо декоративного "?"; если такого героя пока нет (например, все
  // уже разблокированы) - остаётся placeholder ниже.
  const lockedHero = HERO_MODELS.find((m) => m.locked)
  // Камера смотрит на середину роста (TARGET_VIEW_HEIGHT/2), дистанция
  // подобрана так, чтобы при fov=45 в кадр с запасом входила модель
  // высотой до TARGET_VIEW_HEIGHT целиком, включая стопы и макушку.
  const targetY = TARGET_VIEW_HEIGHT / 2
  const verticalHalfFovRad = THREE.MathUtils.degToRad(45 / 2)
  const cameraDistance = (TARGET_VIEW_HEIGHT * 1.15) / (2 * Math.tan(verticalHalfFovRad))

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 2000,
        background: 'rgba(5, 7, 13, 0.9)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
      }}
    >
      <button
        onClick={() => setOpen(false)}
        aria-label="Закрыть"
        style={{
          position: 'absolute',
          top: '1rem',
          right: '1rem',
          background: 'rgba(10, 17, 32, 0.6)',
          border: '1px solid rgba(255, 255, 255, 0.25)',
          borderRadius: '50%',
          width: '2.1rem',
          height: '2.1rem',
          color: '#eafcff',
          fontSize: '1.1rem',
          cursor: 'pointer',
          touchAction: 'manipulation',
          zIndex: 1,
        }}
      >
        ✕
      </button>

      {/* Никнейм + уровень (по просьбе клиента) - никнейм хранится только
          в этом браузере (нет бэкенда/аккаунтов, см. playerProfileStore.ts),
          уровень - производная от НАКОПЛЕННОГО счёта (totalScore,
          gameStore.ts), не сбрасывается между заходами в игру, в отличие
          от обычного счёта в HUD. */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.45rem', marginBottom: '1rem' }}>
        <input
          type="text"
          value={nickname}
          onChange={(e) => setNickname(e.currentTarget.value)}
          placeholder="Ваш никнейм"
          maxLength={20}
          style={{
            padding: '0.45rem 0.9rem',
            minWidth: '12rem',
            textAlign: 'center',
            background: 'rgba(255, 255, 255, 0.06)',
            border: '1px solid rgba(255, 255, 255, 0.25)',
            borderRadius: '999px',
            color: '#eafcff',
            fontFamily: "'Orbitron', sans-serif",
            fontSize: '0.85rem',
          }}
        />
        <span style={{ color: '#ffe9b0', fontFamily: "'Orbitron', sans-serif", fontSize: '0.75rem' }}>
          Уровень {level} · {totalScore} очков всего
        </span>
      </div>

      {/* Переключатель вкладок (Дополнение 6) - "Ещё герои" рядом с
          обычным выбором персонажа. */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.85rem' }}>
        <button
          onClick={() => setTab('roster')}
          style={{
            ...tabButtonStyle,
            background: tab === 'roster' ? 'rgba(95, 212, 255, 0.25)' : 'rgba(255, 255, 255, 0.06)',
            border: tab === 'roster' ? '1px solid rgba(95, 212, 255, 0.9)' : '1px solid rgba(255, 255, 255, 0.2)',
            color: tab === 'roster' ? '#5fd4ff' : '#eafcff',
          }}
        >
          Герои
        </button>
        <button
          onClick={() => setTab('more')}
          style={{
            ...tabButtonStyle,
            background: tab === 'more' ? 'rgba(255, 215, 106, 0.25)' : 'rgba(255, 255, 255, 0.06)',
            border: tab === 'more' ? '1px solid rgba(255, 215, 106, 0.9)' : '1px solid rgba(255, 255, 255, 0.2)',
            color: tab === 'more' ? '#ffe9b0' : '#eafcff',
          }}
        >
          ❔ Ещё герои
        </button>
      </div>

      {tab === 'roster' && (
        <>
          <div
            style={{
              width: 'min(90vw, 480px)',
              height: 'min(58vh, 480px)',
              borderRadius: '16px',
              overflow: 'hidden',
              border: '1px solid rgba(255, 215, 106, 0.4)',
              background: 'radial-gradient(circle at 50% 30%, #182a45 0%, #05070d 80%)',
            }}
          >
            {/* key на id модели - полный ремонт Canvas-содержимого при смене
                персонажа проще и надёжнее, чем вручную сбрасывать состояние
                useGLTF/useAnimations на смену url. */}
            <Canvas
              key={`${model.id}-${previewRecoveryKey}`}
              camera={{ position: [0, targetY + 0.15, cameraDistance], fov: 45 }}
              onCreated={handlePreviewCanvasCreated}
            >
              <ambientLight intensity={0.7} />
              <directionalLight position={[3, 5, 4]} intensity={1.3} />
              <pointLight position={[0, 2, 1]} color="#5fd4ff" intensity={1.5} distance={6} />
              <PreviewModel url={model.url} />
              <OrbitControls
                target={[0, targetY, 0]}
                enablePan={false}
                minDistance={cameraDistance * 0.6}
                maxDistance={cameraDistance * 1.8}
                minPolarAngle={Math.PI / 5}
                maxPolarAngle={Math.PI / 1.7}
              />
            </Canvas>
          </div>

          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              justifyContent: 'center',
              gap: '0.5rem',
              marginTop: '1rem',
              maxWidth: 'min(90vw, 480px)',
            }}
          >
            {HERO_MODELS.filter((m) => !m.locked).map((m) => {
              const active = m.id === selectedHeroId
              return (
                <button
                  key={m.id}
                  onClick={() => setSelectedHero(m.id)}
                  style={{
                    ...buttonStyle,
                    background: active ? 'rgba(255, 215, 106, 0.25)' : 'rgba(255, 255, 255, 0.06)',
                    border: active ? '1px solid rgba(255, 215, 106, 0.9)' : '1px solid rgba(255, 255, 255, 0.2)',
                    color: active ? '#ffe9b0' : '#eafcff',
                  }}
                >
                  {m.label}
                </button>
              )
            })}
          </div>

          {/* Явная кнопка подтверждения - по отзыву клиента "нет кнопки
              подтвердить". Выбор модели уже применяется мгновенно по клику
              выше (та же модель сразу видна и в превью, и на живом
              персонаже) - эта кнопка не меняет логику выбора, а даёт
              понятное "готово, закрыть" действие вместо неявного клика по
              крестику в углу. */}
          <button
            onClick={() => setOpen(false)}
            style={{
              marginTop: '1rem',
              padding: '0.6rem 1.6rem',
              minHeight: '2.75rem',
              background: 'rgba(255, 215, 106, 0.85)',
              border: '1px solid #ffe9b0',
              borderRadius: '999px',
              color: '#241300',
              fontFamily: "'Orbitron', sans-serif",
              fontWeight: 700,
              cursor: 'pointer',
              touchAction: 'manipulation',
            }}
          >
            Подтвердить выбор
          </button>
        </>
      )}

      {tab === 'more' && (
        <>
          <div
            style={{
              width: 'min(90vw, 480px)',
              height: 'min(58vh, 480px)',
              borderRadius: '16px',
              overflow: 'hidden',
              border: '1px solid rgba(147, 92, 255, 0.4)',
              background: 'radial-gradient(circle at 50% 30%, #241a45 0%, #05070d 80%)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '1rem',
              padding: lockedHero ? 0 : '1.5rem',
              textAlign: 'center',
            }}
          >
            {lockedHero ? (
              // Настоящее превью запертого героя (Дополнение 6) - вращается
              // так же, как и в обычной вкладке "Герои", но выбрать его
              // здесь нельзя (нет кнопки "Выбрать" под превью) - только
              // посмотреть и, по клику ниже, открыть оплату.
              <Canvas
                key={`${lockedHero.id}-${previewRecoveryKey}`}
                camera={{ position: [0, targetY + 0.15, cameraDistance], fov: 45 }}
                onCreated={handlePreviewCanvasCreated}
              >
                <ambientLight intensity={0.7} />
                <directionalLight position={[3, 5, 4]} intensity={1.3} />
                <pointLight position={[0, 2, 1]} color="#935cff" intensity={1.5} distance={6} />
                <PreviewModel url={lockedHero.url} />
                <OrbitControls
                  target={[0, targetY, 0]}
                  enablePan={false}
                  minDistance={cameraDistance * 0.6}
                  maxDistance={cameraDistance * 1.8}
                  minPolarAngle={Math.PI / 5}
                  maxPolarAngle={Math.PI / 1.7}
                />
              </Canvas>
            ) : (
              <div
                style={{
                  fontFamily: "'Orbitron', sans-serif",
                  fontSize: '5rem',
                  fontWeight: 700,
                  color: '#d7c3ff',
                  textShadow: '0 0 24px rgba(147, 92, 255, 0.85), 0 0 48px rgba(147, 92, 255, 0.5)',
                }}
              >
                ?
              </div>
            )}
          </div>

          {lockedHero && (
            <div style={{ color: '#d7c3ff', fontFamily: "'Orbitron', sans-serif", fontSize: '0.9rem', marginTop: '0.85rem' }}>
              {lockedHero.label}
            </div>
          )}
          <div
            style={{
              color: '#c8b8ff',
              fontFamily: "'Orbitron', sans-serif",
              fontSize: '0.85rem',
              maxWidth: '22rem',
              marginTop: '0.5rem',
              textAlign: 'center',
            }}
          >
            Новый герой уже готовится. Разблокируйте доступ, чтобы узнать, кто это.
          </div>
          <button
            onClick={openPayment}
            style={{
              marginTop: '1rem',
              padding: '0.65rem 1.4rem',
              minHeight: '2.75rem',
              background: 'rgba(147, 92, 255, 0.85)',
              border: '1px solid #d7c3ff',
              borderRadius: '999px',
              color: '#0c0518',
              fontFamily: "'Orbitron', sans-serif",
              fontWeight: 700,
              cursor: 'pointer',
              touchAction: 'manipulation',
            }}
          >
            Разблокировать - $9.99
          </button>
        </>
      )}
    </div>
  )
}
