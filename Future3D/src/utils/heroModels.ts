import heroGlbUrl from '../models/hero.glb'
import heroWalkGlbUrl from '../models/hero-walk.glb'
import ivoryEleganceGlbUrl from '../models/ivory-elegance.glb'

// Скилл/эмоция - одноразовая анимация поверх обычной ходьбы (Дополнение
// 4). clipPattern ищет клип ПОДСТРОКОЙ (тот же приём, что
// WALK_CLIP_PATTERN/RUN_CLIP_PATTERN в PlayerCharacter.tsx) - реальные
// имена клипов длинные и с непредсказуемым префиксом ("Armature|
// Boom_Dance|baselayer"), точное совпадение было бы хрупким.
export interface SkillOption {
  id: string
  label: string
  clipPattern: RegExp
}

// Общий для PlayerCharacter.tsx (живой персонаж) и ProfilePanel.tsx
// (превью в окне "Профиль") способ найти клип ходьбы по имени - имена
// клипов длинные и с непредсказуемым префиксом экспорта ("Armature|
// walking_man|baselayer"), поэтому подстрочный поиск, а не точное
// совпадение. Вынесено сюда (не дублируется в обоих местах), т.к. оба
// файла работают с одним и тем же реестром моделей.
export const WALK_CLIP_PATTERN = /walking/i

export interface HeroModelOption {
  id: string
  label: string
  url: string
  skills?: SkillOption[]
}

// Реестр моделей игрока, выбираемых через NPC (QuestNpc.tsx/QuestUI.tsx)
// и в окне "Профиль" (ProfilePanel.tsx). hero.glb - старая модель без
// скелета/анимаций (PlayerCharacter.tsx корректно работает и без них -
// просто не проигрывает Idle/Walk/Run, стоит статично). Расширяемо:
// клиент присылает новые модели - добавить сюда новую запись, больше
// нигде менять не нужно.
export const HERO_MODELS: HeroModelOption[] = [
  { id: 'walker', label: 'Ходок', url: heroWalkGlbUrl },
  { id: 'classic', label: 'Классический', url: heroGlbUrl },
  {
    id: 'ivory',
    label: 'Ivory Elegance',
    url: ivoryEleganceGlbUrl,
    // 6 клипов из HeroCollection (Дополнение 4) - Walking/Running не
    // перечислены здесь: это обычная ходьба/бег персонажа, не "скилл".
    skills: [
      { id: 'boom_dance', label: 'Танец', clipPattern: /Boom_Dance/i },
      { id: 'boxing', label: 'Бокс', clipPattern: /Boxing_Practice/i },
      { id: 'dead', label: 'Падение', clipPattern: /Dead/i },
      { id: 'skill3', label: 'Скилл 3', clipPattern: /Skill_03/i },
      { id: 'combo', label: 'Комбо-удар', clipPattern: /Triple_Combo_Attack/i },
      { id: 'groove', label: 'Грув', clipPattern: /You_Groove/i },
    ],
  },
]

export const DEFAULT_HERO_ID = HERO_MODELS[0].id

export function resolveHeroModel(id: string): HeroModelOption {
  return HERO_MODELS.find((m) => m.id === id) ?? HERO_MODELS[0]
}
