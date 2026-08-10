import { create } from 'zustand'

// Активный скилл живого персонажа на карте (Дополнение 4) - не
// persisted, осмыслен только в рамках текущей игровой сессии.
// PlayerCharacter.tsx следит за activeSkillId в useFrame и проигрывает
// соответствующий клип, вызывая clearSkill() по завершении.
interface SkillState {
  activeSkillId: string | null
  triggerSkill: (id: string) => void
  clearSkill: () => void
}

export const useSkillStore = create<SkillState>((set) => ({
  activeSkillId: null,
  triggerSkill: (id) => set({ activeSkillId: id }),
  clearSkill: () => set({ activeSkillId: null }),
}))
