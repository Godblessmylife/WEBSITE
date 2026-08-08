import heroGlbUrl from '../models/hero.glb'
import heroWalkGlbUrl from '../models/hero-walk.glb'

export interface HeroModelOption {
  id: string
  label: string
  url: string
}

// Реестр моделей игрока, выбираемых через NPC (QuestNpc.tsx/QuestUI.tsx).
// hero.glb - старая модель без скелета/анимаций (PlayerCharacter.tsx
// корректно работает и без них - просто не проигрывает Idle/Walk/Run).
// Расширяемо: клиент упомянул, что пришлёт ещё модели - добавить сюда
// новую запись, больше нигде менять не нужно.
export const HERO_MODELS: HeroModelOption[] = [
  { id: 'walker', label: 'Ходок', url: heroWalkGlbUrl },
  { id: 'classic', label: 'Классический', url: heroGlbUrl },
]

export const DEFAULT_HERO_ID = HERO_MODELS[0].id

export function resolveHeroModel(id: string): HeroModelOption {
  return HERO_MODELS.find((m) => m.id === id) ?? HERO_MODELS[0]
}
