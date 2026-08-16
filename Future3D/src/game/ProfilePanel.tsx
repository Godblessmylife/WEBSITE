import { useEffect, useMemo, useRef } from 'react'
import type { CSSProperties } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls, useAnimations, useGLTF } from '@react-three/drei'
import * as THREE from 'three'
import { clone as cloneSkinnedScene } from 'three/examples/jsm/utils/SkeletonUtils.js'
import { useProfileStore } from '@/utils/profileStore'
import { useHeroSelectionStore } from '@/utils/heroSelectionStore'
import { HERO_MODELS, resolveHeroModel, WALK_CLIP_PATTERN } from '@/utils/heroModels'

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

  if (!isOpen) return null

  const model = resolveHeroModel(selectedHeroId)
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
        <Canvas key={model.id} camera={{ position: [0, targetY + 0.15, cameraDistance], fov: 45 }}>
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
        {HERO_MODELS.map((m) => {
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
    </div>
  )
}
