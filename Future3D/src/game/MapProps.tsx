import { useGLTF } from '@react-three/drei'
import { RigidBody, CuboidCollider } from '@react-three/rapier'
import minishopUrl from '../models/minishop.glb'
import shopUrl from '../models/shop.glb'
import rocketUrl from '../models/rocket.glb'
import computerBigUrl from '../models/computerbig.glb'

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

function ComputerBig() {
  const { scene } = useGLTF(computerBigUrl)
  // Уже прогнан через gltf-transform в прошлой сессии (модель ранее не
  // использовалась нигде на сайте) — bbox в разумных "настольных"
  // пропорциях, ~1x0.55x0.47, дополнительный scale не нужен.
  return (
    <RigidBody type="fixed" colliders={false} position={[20, 0, 20]}>
      <CuboidCollider args={[0.54, 0.28, 0.24]} position={[0, 0.28, 0.03]} />
      <primitive object={scene} />
    </RigidBody>
  )
}

// Дополнительные постройки на карте — по просьбе клиента. Раскиданы
// подальше от стартового кластера (спавн, бонусы в радиусе ~10, портал
// на (10,0,-10)), но всё ещё в пределах площадки 140x140 (половина
// стороны 70) — с большим запасом до края.
export function MapProps() {
  return (
    <>
      <Minishop />
      <Shop />
      <Rocket />
      <ComputerBig />
    </>
  )
}

useGLTF.preload(minishopUrl)
useGLTF.preload(shopUrl)
useGLTF.preload(rocketUrl)
useGLTF.preload(computerBigUrl)
