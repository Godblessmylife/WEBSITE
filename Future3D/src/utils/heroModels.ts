import ivoryEleganceGlbUrl from '../models/ivory-elegance.glb'
import skeletonGlbUrl from '../models/skeleton.glb'

// hero.glb/hero-walk.glb ("Классический"/"Ходок") больше НЕ в реестре -
// по прямой просьбе клиента убраны из выбора персонажа. Файлы остаются
// на диске (на них всё ещё может ссылаться история/другие части кода),
// просто не импортируются здесь и не предлагаются к выбору.
//
// История второго героя ("Meshy"): первые две присланные версии
// (`Meshy_AI___biped_Animation_Walking/Running_withSkin.glb`, затем
// переименованные в Animantrix*.glb/Meshy_AI_Meshy_Merged_Animations.glb)
// были технически непригодны - 1 020 019 вершин сжимались лишь до
// ~913 000 ДАЖЕ при полностью не ограниченном error=1.0 (та же
// физически несвязная топология, что и у нерабочего HeroAnime.fbx из
// самого начала проекта). `HeroCollection/Sceleton.glb` (третья
// присылка) - НОРМАЛЬНАЯ, "сшитая" топология: 161 727 уникальных вершин
// упрощаются до 15 613 без проблем (соотношение render/upload ~4.67 -
// как у здоровой Ivory Elegance ~4.94, а не ~1.75, как у забракованных
// версий). Собран `gltf-transform optimize --texture-size 1024
// --simplify-ratio 0.05 --simplify-error 0.05 --compress meshopt` →
// `skeleton.glb` (4.67 МБ из 59.6 МБ), 2 клипа (Walking/Running) целы.

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
  // true - герой ещё не разблокирован, ProfilePanel.tsx показывает его
  // ТОЛЬКО во вкладке "Ещё герои" (превью + кнопка оплаты), но не
  // предлагает выбрать для игры во вкладке "Герои" - см. подробности в
  // craftStore.ts/PricingSection.tsx про то, почему разблокировка
  // декоративная (сайт статический, без бэкенда, проверить реальную
  // оплату нечем).
  locked?: boolean
}

// Реестр моделей игрока, выбираемых в окне "Профиль" (ProfilePanel.tsx).
// Расширяемо: клиент присылает новые модели - добавить сюда новую
// запись, больше нигде менять не нужно.
export const HERO_MODELS: HeroModelOption[] = [
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
  {
    id: 'skeleton',
    label: 'Скелетон',
    url: skeletonGlbUrl,
    locked: true,
  },
]

export const DEFAULT_HERO_ID = HERO_MODELS.find((m) => !m.locked)?.id ?? HERO_MODELS[0].id

export function resolveHeroModel(id: string): HeroModelOption {
  return HERO_MODELS.find((m) => m.id === id) ?? HERO_MODELS[0]
}
