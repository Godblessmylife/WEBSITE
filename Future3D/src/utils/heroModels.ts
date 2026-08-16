import ivoryEleganceGlbUrl from '../models/ivory-elegance.glb'

// hero.glb/hero-walk.glb ("Классический"/"Ходок") больше НЕ в реестре -
// по прямой просьбе клиента убраны из выбора персонажа. Файлы остаются
// на диске (на них всё ещё может ссылаться история/другие части кода),
// просто не импортируются здесь и не предлагаются к выбору.
//
// "Meshy" (второй персонаж, который клиент просил добавить наравне с
// Ivory Elegance) НЕ добавлен - технически непригоден, а не забыт.
// Клиент прислал `HeroCollection/Meshy_AI___biped_Animation_Walking/
// Running_withSkin.glb` (78.5 МБ каждый). Проверено `gltf-transform
// simplify` (READ-ONLY тест, оригиналы не тронуты): 1 020 019 вершин
// сжимаются лишь до 913 509 ДАЖЕ при полностью не ограниченном error=1.0
// - ровно та же картина, что раньше была у нерабочего HeroAnime.fbx:
// физически несвязная (фрагментированная) топология, экспорт без
// нормальной ретопологии. Использовать как есть (78 МБ на модель,
// ~90%+ этого веса - геометрия, а не текстура, как в прошлый раз)
// означало бы гарантированный повтор "вылетает через 5 секунд" в куда
// большем масштабе. Нужна пересборка в Blender на стороне клиента (или
// повторный экспорт из Meshy с нормальной топологией) - до тех пор эта
// модель не добавляется в реестр вообще, а не добавляется "сломанной".

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
]

export const DEFAULT_HERO_ID = HERO_MODELS[0].id

export function resolveHeroModel(id: string): HeroModelOption {
  return HERO_MODELS.find((m) => m.id === id) ?? HERO_MODELS[0]
}
