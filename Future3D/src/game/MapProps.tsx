import { useGLTF } from '@react-three/drei'
import { CuboidCollider } from '@react-three/rapier'
import { Grabbable } from './Grabbable'
import minishopUrl from '../models/minishop.glb'
import shopUrl from '../models/shop.glb'
import rocketUrl from '../models/rocket.glb'
import computerBigUrl from '../models/computerbig.glb'
import chillZoneUrl from '../models/chill_zone.glb'
import npc2Url from '../models/npc2.glb'
import slotUrl from '../models/slot.glb'
import slot2Url from '../models/slot2.glb'
import ostrovokUrl from '../models/ostrovok.glb'
import car1Url from '../models/Car1.glb'
import car2Url from '../models/car2.glb'
import ostrovUrl from '../models/ostrov.glb'

// Коллайдеры — ЯВНЫЕ CuboidCollider с размерами/центром, посчитанными из
// реального bbox моделей (gltf-transform inspect), а НЕ colliders="cuboid"
// (авто-генерация из mesh). Раньше именно авто-генерация тихо не
// регистрировала коллайдер в физическом мире (мир показывал 2 тела, но
// только 1 коллайдер — капсулу персонажа) — то же самое молча повторится
// на любой новой модели, если снова довериться авто-детекции. С явным
// коллайдером риска нет: размер известен заранее и не зависит от того,
// как библиотека парсит конкретный mesh.
//
// Масштаб/коллайдер держим НЕ на родительской group (влияние scale
// родителя на вложенный CuboidCollider в @react-three/rapier не
// проверено в этом окружении), а считаем вручную: <primitive> получает
// scale напрямую, а args/position коллайдера уже домножены на тот же
// коэффициент — коллайдер и RigidBody остаются с scale=1, картинка и
// физика гарантированно совпадают независимо от того, как именно
// библиотека обрабатывает вложенный scale.

// Grabbable оборачивает объекты в "режим разработчика" (кнопка CRAFT в
// GameMode.tsx, см. Grabbable.tsx/craftStore.ts) - клик по объекту в
// этом режиме "берёт" его, следующий клик ставит на новое место (X/Z по
// курсору, высота не трогается). Rocket/SlotMachine/SlotMachine2 НЕ
// подлежат ПЕРЕНОСУ (movable={false}) - их мировые координаты
// продублированы в QuestObjectiveRocket.tsx/QuestObjectiveChip.tsx/
// Minimap.tsx, и перенос в рантайме рассинхронизировал бы квесты с
// картой без отдельного механизма синхронизации, которого пока нет. По
// отзыву клиента ("нельзя увеличить многие модели") они всё же обёрнуты
// в Grabbable ради МАСШТАБА - на позиции этих трёх систем масштаб никак
// не влияет, это чисто визуальный размер.

function Minishop() {
  const { scene } = useGLTF(minishopUrl)
  // bbox: (-10.23,-0.122,-5.49) .. (8.387,14.202,6.313), scale=1
  return (
    <Grabbable
      id="minishop"
      defaultPosition={[-28, 0.122, 18]}
      hitboxSize={[18.62, 14.32, 11.8]}
      hitboxCenter={[-0.92, 7.04, 0.41]}
    >
      <CuboidCollider args={[9.31, 7.16, 5.9]} position={[-0.92, 7.04, 0.41]} />
      <primitive object={scene} />
    </Grabbable>
  )
}

function Shop() {
  const { scene } = useGLTF(shopUrl)
  // bbox исходника крошечный (~0.15 юнита) — модель явно в другой единице
  // масштаба, требует множитель. 150 подобрано так, чтобы результат был
  // заметно больше minishop (~22 юнита высотой против ~14.3).
  const SCALE = 150
  return (
    <Grabbable
      id="shop"
      defaultPosition={[30, 0.1335, -25]}
      hitboxSize={[23.14, 22.02, 26.18]}
      hitboxCenter={[2.14, 11.15, 0.08]}
    >
      <CuboidCollider args={[11.57, 11.01, 13.09]} position={[2.14, 11.15, 0.08]} />
      <primitive object={scene} scale={SCALE} />
    </Grabbable>
  )
}

const ROCKET_POSITION: [number, number, number] = [-22, 1.138, -28]

function Rocket() {
  const { scene } = useGLTF(rocketUrl)
  // bbox: (-4.49,-1.14,-3.89) .. (4.08,7.83,2.17), scale=1
  return (
    <Grabbable
      id="rocket"
      defaultPosition={ROCKET_POSITION}
      hitboxSize={[8.57, 8.97, 6.06]}
      hitboxCenter={[-0.21, 3.34, -0.86]}
      movable={false}
    >
      <CuboidCollider args={[4.29, 4.48, 3.03]} position={[-0.21, 3.34, -0.86]} />
      <primitive object={scene} />
    </Grabbable>
  )
}

const COMPUTER_BIG_POSITION: [number, number, number] = [20, 0, 20]
// bbox исходника: (-0.538,0,-0.202) .. (0.537,0.552,0.269) - при scale=1
// это стол высотой 55см (уровень журнального столика), а не рабочий стол
// с монитором - по отзыву клиента модель на карте выглядела игрушечно
// маленькой. 2.2x поднимает высоту до ~1.2м (нормальный стол+монитор
// рядом с персонажем ростом ~1.74м), при этом ширина ~2.37м - для
// "большого" игрового стола (computerBIG) с этим и не должна быть узкой.
const COMPUTER_BIG_SCALE = 2.2

function ComputerBig() {
  const { scene } = useGLTF(computerBigUrl)
  return (
    <Grabbable
      id="computerBig"
      defaultPosition={COMPUTER_BIG_POSITION}
      hitboxSize={[1.08 * COMPUTER_BIG_SCALE, 0.56 * COMPUTER_BIG_SCALE, 0.48 * COMPUTER_BIG_SCALE]}
      hitboxCenter={[0, 0.28 * COMPUTER_BIG_SCALE, 0.03 * COMPUTER_BIG_SCALE]}
    >
      <CuboidCollider
        args={[0.54 * COMPUTER_BIG_SCALE, 0.28 * COMPUTER_BIG_SCALE, 0.24 * COMPUTER_BIG_SCALE]}
        position={[0, 0.28 * COMPUTER_BIG_SCALE, 0.03 * COMPUTER_BIG_SCALE]}
      />
      <primitive object={scene} scale={COMPUTER_BIG_SCALE} />
    </Grabbable>
  )
}

function ChillZone() {
  const { scene } = useGLTF(chillZoneUrl)
  // bbox: (-9.47,-0.199,-8.04) .. (8.135,3.432,9.867), scale=1
  // Было (-60,40) - клиент попросил "распределить объекты ближе к
  // телепорту" (10,0,-10). Подтянуто к (-48,32) - вручную проверено по
  // AABB против соседних построек (Minishop: (-28,18), half-extent
  // 9.31x5.9), чтобы не пересечься с ней.
  return (
    <Grabbable
      id="chillZone"
      defaultPosition={[-48, 0.199, 32]}
      hitboxSize={[17.6, 3.64, 17.9]}
      hitboxCenter={[-0.67, 1.62, 0.91]}
    >
      <CuboidCollider args={[8.8, 1.82, 8.95]} position={[-0.67, 1.62, 0.91]} />
      <primitive object={scene} />
    </Grabbable>
  )
}

function Npc2Decor() {
  const { scene } = useGLTF(npc2Url)
  // ВАЖНО: bbox посчитан по ИСХОДНОМУ (до gltf-transform optimize) файлу.
  // npc1/npc2/slot2 — скиненные модели (есть rootJoint), и inspect после
  // optimize у всех трёх выдаёт подозрительно одинаковый "круглый" bbox
  // (-1..1 по X/Z) — это глюк расчёта bbox для скиненной геометрии в
  // используемой версии gltf-transform, не реальные размеры (визуально
  // меш не меняется, vertex count до/после почти идентичен). Опираться
  // на bbox нужно ДО оптимизации.
  // Исходный bbox: (-10.12,-1.198,-6.114) .. (10.12,1.508,9.201) — судя
  // по пропорциям (широкая и плоская, ~20x2.7x15), это не отдельный
  // персонаж как npc1, а декоративная сцена/группа — используется как
  // декорация, а не как второй диалоговый NPC. Если задумывалось иначе —
  // легко поменять.
  // Было (-70,-40) - подтянуто к (-55,-30) той же просьбой клиента
  // "ближе к телепорту", проверено по AABB против Rocket ((-22,-28),
  // half-extent 4.29x3.03) и новой позиции ChillZone выше - пересечений нет.
  return (
    <Grabbable
      id="npc2Decor"
      defaultPosition={[-55, 1.198, -30]}
      hitboxSize={[20.24, 2.7, 15.32]}
      hitboxCenter={[0, 0.16, 1.54]}
    >
      <CuboidCollider args={[10.12, 1.35, 7.66]} position={[0, 0.16, 1.54]} />
      <primitive object={scene} />
    </Grabbable>
  )
}

const SLOT_MACHINE_POSITION: [number, number, number] = [60, 0, -50]
const SLOT_MACHINE_2_POSITION: [number, number, number] = [60, 0.335, -30]

function SlotMachine() {
  const { scene } = useGLTF(slotUrl)
  // bbox: (-5.865,0,-4.681) .. (5.865,23.973,4.681), scale=1 — уже стоит
  // на y=0, подъём не нужен. Высота (~24 юнита) необычна для игрового
  // автомата, но доверяем авторскому масштабу модели без визуальной
  // проверки в браузере.
  return (
    <Grabbable
      id="slotMachine"
      defaultPosition={SLOT_MACHINE_POSITION}
      hitboxSize={[11.73, 23.98, 9.36]}
      hitboxCenter={[0, 11.99, 0]}
      movable={false}
    >
      <CuboidCollider args={[5.865, 11.99, 4.68]} position={[0, 11.99, 0]} />
      <primitive object={scene} />
    </Grabbable>
  )
}

function SlotMachine2() {
  const { scene } = useGLTF(slot2Url)
  // Скиненная модель — bbox по исходнику (см. комментарий в Npc2Decor):
  // (-0.341,-0.335,-1.851) .. (0.359,0.434,-0.002).
  return (
    <Grabbable
      id="slotMachine2"
      defaultPosition={SLOT_MACHINE_2_POSITION}
      hitboxSize={[0.7, 0.77, 1.85]}
      hitboxCenter={[0.01, 0.05, -0.93]}
      movable={false}
    >
      <CuboidCollider args={[0.35, 0.38, 0.92]} position={[0.01, 0.05, -0.93]} />
      <primitive object={scene} />
    </Grabbable>
  )
}

function Mountain() {
  const { scene } = useGLTF(ostrovokUrl)
  // "Островок" — огромный (~92x10.3x92) массив с перепадом высоты,
  // единственная из новых моделей подходящая под запрошенную "гору".
  // Коллайдер — один бокс на весь массив (не повторяет реальный рельеф
  // с холмами/впадинами) — гора здесь непроходимый ландшафтный объект,
  // который обходят, а не взбираются на него, как и остальные постройки
  // на карте.
  return (
    <Grabbable
      id="mountain"
      defaultPosition={[85, 2.854, 70]}
      hitboxSize={[91.94, 10.26, 91.94]}
      hitboxCenter={[-1.98, 2.27, -11.18]}
    >
      <CuboidCollider args={[45.97, 5.13, 45.97]} position={[-1.98, 2.27, -11.18]} />
      <primitive object={scene} />
    </Grabbable>
  )
}

// Обе машины (bbox посчитан gltf-transform inspect по присланным файлам,
// scale=1 у обеих) поставлены рядом со спавном персонажа ([0,2,0] в
// PlayerCharacter.tsx), но в стороне от пальм/бонусов/странника у спавна
// (см. PALM_POSITIONS в GameWorld.tsx и BONUS_POSITIONS в Bonuses.tsx) -
// на западе, где рядом со спавном ничего больше не стоит.
//
// ВТОРАЯ итерация: клиент — "они очень маленькие, сделать большими и
// чуть отодвинуть от телепорта". При scale=1 Car1 (~4.6м длиной) на самом
// деле почти реалистичного размера - но реалистичный размер ТЕРЯЕТСЯ на
// фоне намеренно преувеличенного масштаба всего остального на этой карте
// (SlotMachine - ~24м высотой, Shop масштабирован в 150 раз) - отсюда
// "маленькие" не в абсолюте, а по контрасту. CAR_SCALE=3 приводит машины
// к тому же "преувеличенному" языку карты. Позиции раздвинуты и повёрнуты
// друг к другу перпендикулярно (Car1 длинная по X, Car2 - по Z, см. их
// bbox) - при увеличенных габаритах старые соседние координаты пересекли
// бы друг друга, если оставить как было.
const CAR_SCALE = 3

function Car1Model() {
  const { scene } = useGLTF(car1Url)
  // bbox: (-2.341,-0.016,-0.976) .. (2.235,1.043,0.976), при CAR_SCALE=3
  // половины сторон/центр коллайдера домножены на тот же коэффициент.
  return (
    <Grabbable
      id="car1"
      defaultPosition={[-20, 0.0479, 0]}
      hitboxSize={[13.728, 3.174, 5.856]}
      hitboxCenter={[-0.078, 1.539, 0]}
    >
      <CuboidCollider args={[6.864, 1.587, 2.928]} position={[-0.078, 1.539, 0]} />
      <primitive object={scene} scale={CAR_SCALE} />
    </Grabbable>
  )
}

function Car2Model() {
  const { scene } = useGLTF(car2Url)
  // bbox: (-0.597,-0.004,-1.356) .. (0.597,0.849,1.396), при CAR_SCALE=3
  // половины сторон/центр коллайдера домножены на тот же коэффициент.
  return (
    <Grabbable
      id="car2"
      defaultPosition={[-8, 0.013, 12]}
      hitboxSize={[3.582, 2.562, 8.256]}
      hitboxCenter={[0, 1.281, 0.06]}
    >
      <CuboidCollider args={[1.791, 1.281, 4.128]} position={[0, 1.281, 0.06]} />
      <primitive object={scene} scale={CAR_SCALE} />
    </Grabbable>
  )
}

// "Объект с водой" - ostrov.glb, присланная клиентом модель острова,
// которая раньше НИ РАЗУ не использовалась на карте (в отличие от
// ostrovok.glb выше, ставшего "горой") - найдена простым поиском по
// всем моделям в src/models/, ничего похожего на "воду" в уже
// подключённых постройках нет. Исходный bbox огромный (~36406 условных
// единиц по каждой оси, тот же самый "остров в масштабе ~18000", что
// упоминается в истории GroundZone.tsx - там от него отказались для
// ЛЕНДИНГА из-за нестыковки с плоской землёй, но для игровой карты,
// где сам остров стоит на собственном коллайдере, это не проблема).
//
// ВАЖНО: исходник — 180 003 вершины (gltf-transform inspect), на
// порядок больше любого другого объекта на карте - в игре с тенями
// (GameMode.tsx: shadows={!reduced}) это одна такая модель почти
// полностью убивала fps (проверено: 1 fps вместо ~60 сразу после
// добавления, до этого не встречалось ни на одном другом объекте).
// Пересжато gltf-transform с явно ослабленным --simplify-error (дефолт
// 0.0001 почти не трогал геометрию) до 14 364 вершин (-92%) - на
// экранном размере ~20 юниц (ISLAND_SCALE ниже) разница в силуэте не
// заметна, а fps возвращается к норме. Исходный файл (180k вершин) —
// ostrov.source.glb, не коммитится.
// ISLAND_SCALE подобран так, чтобы результат был ~20 юнитов в диаметре -
// заметный, но не подавляющий соседние постройки ориентир, поставлен
// рядом с порталом (DESERT_PORTAL_POSITION=(10,0,-10) в GameMode.tsx) -
// по просьбе клиента "объект с водой - ближе к телепорту".
const ISLAND_SCALE = 0.00055

function Island() {
  const { scene } = useGLTF(ostrovUrl)
  // bbox после упрощения: (-17853.7,-18237.2,-17853.3)..(18203.5,18424.2,17510.2)
  return (
    <Grabbable
      id="island"
      defaultPosition={[22, 10.0305, -14]}
      hitboxSize={[19.832, 20.164, 19.45]}
      hitboxCenter={[0.096, 0.051, -0.094]}
    >
      <CuboidCollider args={[9.916, 10.082, 9.725]} position={[0.096, 0.051, -0.094]} />
      <primitive object={scene} scale={ISLAND_SCALE} />
    </Grabbable>
  )
}

// Дополнительные постройки на карте — по просьбе клиента. Раскиданы
// подальше от стартового кластера (спавн, бонусы в радиусе ~10, портал
// на (10,0,-10)), но всё ещё в пределах увеличенной площадки 280x280
// (половина стороны 140) — с запасом до края.
export function MapProps() {
  return (
    <>
      <Minishop />
      <Shop />
      <Rocket />
      <ComputerBig />
      <ChillZone />
      <Npc2Decor />
      <SlotMachine />
      <SlotMachine2 />
      <Mountain />
      <Car1Model />
      <Car2Model />
      <Island />
    </>
  )
}

useGLTF.preload(minishopUrl)
useGLTF.preload(shopUrl)
useGLTF.preload(rocketUrl)
useGLTF.preload(computerBigUrl)
useGLTF.preload(chillZoneUrl)
useGLTF.preload(npc2Url)
useGLTF.preload(slotUrl)
useGLTF.preload(slot2Url)
useGLTF.preload(ostrovokUrl)
useGLTF.preload(car1Url)
useGLTF.preload(car2Url)
useGLTF.preload(ostrovUrl)
