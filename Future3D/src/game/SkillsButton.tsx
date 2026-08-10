import { useState } from 'react'
import type { CSSProperties } from 'react'
import { useHeroSelectionStore } from '@/utils/heroSelectionStore'
import { resolveHeroModel } from '@/utils/heroModels'
import { useSkillStore } from '@/utils/skillStore'

// Кнопка скиллов в HUD игры (Дополнение 4) - тот же паттерн выпадающей
// панели, что GraphicsSettingsButton.tsx (шестерёнка настроек графики):
// клик открывает список, клик по пункту сразу проигрывает скилл и
// закрывает список. Показывается только если у ТЕКУЩЕЙ выбранной модели
// вообще есть скиллы (heroModels.ts) - для walker/classic ряд пуст,
// кнопка просто не рендерится вместо бесполезного пустого списка.
export function SkillsButton({ style }: { style?: CSSProperties }) {
  const [open, setOpen] = useState(false)
  const selectedHeroId = useHeroSelectionStore((s) => s.selectedHeroId)
  const activeSkillId = useSkillStore((s) => s.activeSkillId)
  const triggerSkill = useSkillStore((s) => s.triggerSkill)

  const skills = resolveHeroModel(selectedHeroId).skills
  if (!skills || skills.length === 0) return null

  return (
    <div style={{ position: 'absolute', zIndex: 1001, ...style }}>
      <button
        onClick={() => setOpen((v) => !v)}
        style={{
          padding: '0.6rem 1.4rem',
          minHeight: '2.75rem',
          background: activeSkillId ? 'rgba(95, 212, 255, 0.85)' : 'rgba(10, 17, 32, 0.6)',
          border: '1px solid rgba(95, 212, 255, 0.7)',
          borderRadius: '999px',
          color: activeSkillId ? '#04121c' : '#5fd4ff',
          fontFamily: "'Orbitron', sans-serif",
          fontWeight: activeSkillId ? 700 : 400,
          cursor: 'pointer',
          touchAction: 'manipulation',
        }}
      >
        ✨ Скиллы
      </button>
      {open && (
        <div
          style={{
            position: 'absolute',
            bottom: 'calc(100% + 0.5rem)',
            left: '50%',
            transform: 'translateX(-50%)',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.35rem',
            padding: '0.6rem',
            background: 'rgba(10, 17, 32, 0.92)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            borderRadius: '12px',
            minWidth: '170px',
          }}
        >
          {skills.map((skill) => (
            <button
              key={skill.id}
              onClick={() => {
                triggerSkill(skill.id)
                setOpen(false)
              }}
              style={{
                padding: '0.4rem 0.6rem',
                borderRadius: '8px',
                border: activeSkillId === skill.id ? '1px solid rgba(95, 212, 255, 0.8)' : '1px solid transparent',
                background: activeSkillId === skill.id ? 'rgba(95, 212, 255, 0.15)' : 'transparent',
                color: activeSkillId === skill.id ? '#5fd4ff' : '#eafcff',
                fontFamily: "'Orbitron', sans-serif",
                fontSize: '0.72rem',
                textAlign: 'left',
                cursor: 'pointer',
                touchAction: 'manipulation',
              }}
            >
              {skill.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
