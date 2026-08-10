import { useEffect, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls, useAnimations, useGLTF } from '@react-three/drei'
import * as THREE from 'three'
import { useProfileStore } from '@/utils/profileStore'
import { useHeroSelectionStore } from '@/utils/heroSelectionStore'
import { HERO_MODELS, resolveHeroModel, WALK_CLIP_PATTERN } from '@/utils/heroModels'

// Превью модели внутри маленького независимого Canvas (тот же приём,
// что GameEntry.tsx для компьютера - отдельный R3F-контекст, никак не
// связан с игровым миром/физикой). Проигрывает клип ходьбы в цикле по
// умолчанию ("чтобы все модели ходили") - у "classic" (hero.glb) клипов
// вообще нет, actions будет пустым объектом, модель просто стоит
// статично (известное ограничение, см. план).
function PreviewModel({
  url,
  skills,
  activeSkillId,
  onSkillDone,
}: {
  url: string
  skills: { id: string; clipPattern: RegExp }[] | undefined
  activeSkillId: string | null
  onSkillDone: () => void
}) {
  const { scene, animations } = useGLTF(url)
  const { actions } = useAnimations(animations, scene)
  const walkActionRef = useRef<ReturnType<typeof useAnimations>['actions'][string] | null>(null)
  const skillActionRef = useRef<ReturnType<typeof useAnimations>['actions'][string] | null>(null)

  // Смена модели - находим и запускаем ходьбу заново (тот же поиск по
  // подстроке, что и в PlayerCharacter.tsx).
  useEffect(() => {
    walkActionRef.current = Object.entries(actions).find(([name]) => WALK_CLIP_PATTERN.test(name))?.[1] ?? null
    walkActionRef.current?.reset().play()
    skillActionRef.current = null
  }, [actions])

  // Клик по скиллу (см. ProfilePanel ниже) - однократное проигрывание
  // поверх ходьбы, тот же fadeIn/fadeOut, что и в живой игре (Дополнение
  // 4, скиллы на карте) - переиспользуем ту же идею, не общий код,
  // потому что превью и живой персонаж совсем разные компоненты.
  useEffect(() => {
    if (!activeSkillId || !skills) return
    const skill = skills.find((s) => s.id === activeSkillId)
    const action = skill ? Object.entries(actions).find(([name]) => skill.clipPattern.test(name))?.[1] : null
    if (!action) return
    walkActionRef.current?.fadeOut(0.2)
    action.clampWhenFinished = true
    action.reset().setLoop(THREE.LoopOnce, 1).fadeIn(0.2).play()
    skillActionRef.current = action
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSkillId])

  useFrame(() => {
    const action = skillActionRef.current
    if (!action) return
    const clip = action.getClip()
    if (action.time >= clip.duration - 0.02) {
      action.fadeOut(0.2)
      walkActionRef.current?.reset().fadeIn(0.2).play()
      skillActionRef.current = null
      onSkillDone()
    }
  })

  return <primitive object={scene} />
}

const buttonStyle: CSSProperties = {
  padding: '0.45rem 0.9rem',
  fontSize: '0.8rem',
  fontFamily: "'Orbitron', sans-serif",
  borderRadius: '999px',
  cursor: 'pointer',
  touchAction: 'manipulation',
}

// Окно "Профиль" - заменило кнопку "Кирка" в HUD (Дополнение 4, по
// просьбе клиента). Выбор модели персонажа (переехал сюда из диалога
// NPC - тот список там НЕ удалён, дублирование безопаснее удаления
// работающей фичи), вращаемое 3D-превью (OrbitControls - тот же приём,
// что и в GameEntry.tsx для компьютера) и кнопки скиллов, если они есть
// у выбранной модели.
export function ProfilePanel() {
  const isOpen = useProfileStore((s) => s.isOpen)
  const setOpen = useProfileStore((s) => s.setOpen)
  const selectedHeroId = useHeroSelectionStore((s) => s.selectedHeroId)
  const setSelectedHero = useHeroSelectionStore((s) => s.setSelectedHero)
  const [activeSkillId, setActiveSkillId] = useState<string | null>(null)

  if (!isOpen) return null

  const model = resolveHeroModel(selectedHeroId)

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
          height: 'min(50vh, 420px)',
          borderRadius: '16px',
          overflow: 'hidden',
          border: '1px solid rgba(255, 215, 106, 0.4)',
          background: 'radial-gradient(circle at 50% 30%, #182a45 0%, #05070d 80%)',
        }}
      >
        {/* key на id модели - полный ремонт Canvas-содержимого при смене
            персонажа проще и надёжнее, чем вручную сбрасывать состояние
            useGLTF/useAnimations на смену url. */}
        <Canvas key={model.id} camera={{ position: [0, 1.4, 2.6], fov: 45 }}>
          <ambientLight intensity={0.7} />
          <directionalLight position={[3, 5, 4]} intensity={1.3} />
          <pointLight position={[0, 2, 1]} color="#5fd4ff" intensity={1.5} distance={6} />
          <PreviewModel
            url={model.url}
            skills={model.skills}
            activeSkillId={activeSkillId}
            onSkillDone={() => setActiveSkillId(null)}
          />
          <OrbitControls
            target={[0, 0.9, 0]}
            enablePan={false}
            minDistance={1.2}
            maxDistance={4}
            minPolarAngle={Math.PI / 4}
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
              onClick={() => {
                setSelectedHero(m.id)
                setActiveSkillId(null)
              }}
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

      {model.skills && model.skills.length > 0 && (
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'center',
            gap: '0.5rem',
            marginTop: '0.75rem',
            maxWidth: 'min(90vw, 480px)',
          }}
        >
          {model.skills.map((skill) => {
            const active = skill.id === activeSkillId
            return (
              <button
                key={skill.id}
                onClick={() => setActiveSkillId(skill.id)}
                style={{
                  ...buttonStyle,
                  background: active ? 'rgba(95, 212, 255, 0.25)' : 'rgba(255, 255, 255, 0.06)',
                  border: active ? '1px solid rgba(95, 212, 255, 0.9)' : '1px solid rgba(255, 255, 255, 0.2)',
                  color: active ? '#5fd4ff' : '#c9d6e8',
                }}
              >
                {skill.label}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
