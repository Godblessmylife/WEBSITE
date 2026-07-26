import { useGLTF } from '@react-three/drei'
import { RigidBody, CuboidCollider } from '@react-three/rapier'
import minishopUrl from '../models/minishop.glb'
import shopUrl from '../models/shop.glb'
import rocketUrl from '../models/rocket.glb'
import computerBigUrl from '../models/computerbig.glb'
import chillZoneUrl from '../models/chill_zone.glb'
import npc2Url from '../models/npc2.glb'
import slotUrl from '../models/slot.glb'
import slot2Url from '../models/slot2.glb'
import ostrovokUrl from '../models/ostrovok.glb'

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

function Minishop() {
  const { scene } = useGLTF(minishopUrl)
  // bbox: (-10.23,-0.122,-5.49) .. (8.387,14.202,6.313), scale=1
  return (
    <RigidBody type="fixed" colliders={false} position={[-28, 0.122, 18]}>
      <CuboidCollider args={[9.31, 7.16, 5.9]} position={[-0.92, 7.04, 0.41]} />
      <primitive object={scene} />
    </RigidBody>
  )
}

function Shop() {
  const { scene } = useGLTF(shopUrl)
  // bbox исходника крошечный (~0.15 юнита) — модель явно в другой единице
  // масштаба, требует множитель. 150 подобрано так, чтобы результат был
  // заметно больше minishop (~22 юнита высотой против ~14.3).
  const SCALE = 150
  return (
    <RigidBody type="fixed" colliders={false} position={[30, 0.1335, -25]}>
      <CuboidCollider args={[11.57, 11.01, 13.09]} position={[2.14, 11.15, 0.08]} />
      <primitive object={scene} scale={SCALE} />
    </RigidBody>
  )
}

function Rocket() {
  const { scene } = useGLTF(rocketUrl)
  // bbox: (-4.49,-1.14,-3.89) .. (4.08,7.83,2.17), scale=1
  return (
    <RigidBody type="fixed" colliders={false} position={[-22, 1.138, -28]}>
      <CuboidCollider args={[4.29, 4.48, 3.03]} position={[-0.21, 3.34, -0.86]} />
      <primitive object={scene} />
    </RigidBody>
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
    <RigidBody type="fixed" colliders={false} position={COMPUTER_BIG_POSITION}>
      <CuboidCollider
        args={[0.54 * COMPUTER_BIG_SCALE, 0.28 * COMPUTER_BIG_SCALE, 0.24 * COMPUTER_BIG_SCALE]}
        position={[0, 0.28 * COMPUTER_BIG_SCALE, 0.03 * COMPUTER_BIG_SCALE]}
      />
      <primitive object={scene} scale={COMPUTER_BIG_SCALE} />
    </RigidBody>
  )
}

function ChillZone() {
  const { scene } = useGLTF(chillZoneUrl)
  // bbox: (-9.47,-0.199,-8.04) .. (8.135,3.432,9.867), scale=1
  return (
    <RigidBody type="fixed" colliders={false} position={[-60, 0.199, 40]}>
      <CuboidCollider args={[8.8, 1.82, 8.95]} position={[-0.67, 1.62, 0.91]} />
      <primitive object={scene} />
    </RigidBody>
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
  return (
    <RigidBody type="fixed" colliders={false} position={[-70, 1.198, -40]}>
      <CuboidCollider args={[10.12, 1.35, 7.66]} position={[0, 0.16, 1.54]} />
      <primitive object={scene} />
    </RigidBody>
  )
}

function SlotMachine() {
  const { scene } = useGLTF(slotUrl)
  // bbox: (-5.865,0,-4.681) .. (5.865,23.973,4.681), scale=1 — уже стоит
  // на y=0, подъём не нужен. Высота (~24 юнита) необычна для игрового
  // автомата, но доверяем авторскому масштабу модели без визуальной
  // проверки в браузере.
  return (
    <RigidBody type="fixed" colliders={false} position={[60, 0, -50]}>
      <CuboidCollider args={[5.865, 11.99, 4.68]} position={[0, 11.99, 0]} />
      <primitive object={scene} />
    </RigidBody>
  )
}

function SlotMachine2() {
  const { scene } = useGLTF(slot2Url)
  // Скиненная модель — bbox по исходнику (см. комментарий в Npc2Decor):
  // (-0.341,-0.335,-1.851) .. (0.359,0.434,-0.002).
  return (
    <RigidBody type="fixed" colliders={false} position={[60, 0.335, -30]}>
      <CuboidCollider args={[0.35, 0.38, 0.92]} position={[0.01, 0.05, -0.93]} />
      <primitive object={scene} />
    </RigidBody>
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
    <RigidBody type="fixed" colliders={false} position={[85, 2.854, 70]}>
      <CuboidCollider args={[45.97, 5.13, 45.97]} position={[-1.98, 2.27, -11.18]} />
      <primitive object={scene} />
    </RigidBody>
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
