import { useEffect, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { useGLTF, Clone, Stars } from '@react-three/drei'
import { RigidBody, CuboidCollider } from '@react-three/rapier'
import * as THREE from 'three'
import earthModelUrl from '../models/earth.glb'

// Платформа, на которую телепортирует портал (см. Portal.tsx) — прямо
// над пустыней, на высоте, куда игрок никогда не добежит и не запрыгнет
// сам. Горизонтальный туман сцены (GameMode.tsx: fog far=170) не зависит
// от высоты, поэтому вся пустыня внизу оказывается за пределами тумана
// и просто не рендерится — не нужно уносить площадку далеко по X/Z,
// чтобы "спрятать" её от космоса, достаточно высоты.
// Общий якорь всей зоны: платформа/звёзды/Земля ниже заданы координатами
// ОТНОСИТЕЛЬНО этой точки (обёрнуты в один <group position={SPACE_ORIGIN}>
// в SpaceZone()) - раньше Stars и OrbitingEarth рождались как дети
// физического root'а сцены БЕЗ этой обёртки, то есть их "относительные"
// offset'ы на деле были абсолютными мировыми координатами: звёздная сфера
// радиусом 90 оказывалась центрирована на (0,0,0) - у земли пустыни, за
// 220 юнитов ПОД площадкой, и с неё было физически не видно ни одной
// звезды. SPACE_TELEPORT_TARGET по-прежнему в мировых координатах (им
// пользуется Portal.tsx напрямую, вне этой группы).
const SPACE_ORIGIN: [number, number, number] = [0, 220, 0]
export const SPACE_TELEPORT_TARGET = new THREE.Vector3(0, 222.5, 0)
// Портал обратно в пустыню (Portal.tsx, второй экземпляр в GameMode.tsx) -
// смещён от точки прибытия (SPACE_TELEPORT_TARGET, центр платформы), чтобы
// приземление с первого портала не оказалось сразу внутри радиуса
// срабатывания второго. Тот же y=220, что и верх платформы (см.
// PLATFORM_HALF_HEIGHT ниже) - портал стоит прямо на её поверхности.
export const SPACE_RETURN_PORTAL_POSITION = new THREE.Vector3(4, 220, 4)
const PLATFORM_RADIUS = 8
const PLATFORM_HALF_HEIGHT = 0.5

// earth.glb уже используется на самом сайте (EarthPlanet.tsx, в
// JourneyScene) и остаётся смонтированным в фоне всё время, включая пока
// открыта игра (GameMode рендерится ПОВЕРХ, а не вместо остального
// App.tsx). useGLTF кеширует загруженный gltf по URL и отдаёт ОДИН И ТОТ
// ЖЕ объект scene при повторном вызове — рендерить его здесь через
// <primitive> увело бы Землю из основной сцены сайта (Object3D может
// быть только у одного родителя разом). <Clone> из drei — штатное
// решение именно для этого случая: показывать одну загруженную модель
// в нескольких местах одновременно, без кражи и без повторной загрузки.
const EARTH_SOURCE_RADIUS = 100
const EARTH_RADIUS = 55
const EARTH_SCALE = EARTH_RADIUS / EARTH_SOURCE_RADIUS
// Относительно SPACE_ORIGIN (не мировые координаты - см. комментарий выше).
const EARTH_OFFSET: [number, number, number] = [70, -60, -110]

function OrbitingEarth() {
  const { scene } = useGLTF(earthModelUrl)
  const groupRef = useRef<THREE.Group>(null!)

  useEffect(() => {
    // На случай, если этот компонент смонтируется раньше EarthPlanet.tsx
    // (тот тоже выключает fog на своих материалах) - не полагаемся на
    // порядок монтирования между двумя независимыми деревьями.
    scene.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        ;(child.material as THREE.MeshStandardMaterial).fog = false
      }
    })
  }, [scene])

  useFrame((_, delta) => {
    groupRef.current.rotation.y += delta * 0.03
  })

  return (
    <group ref={groupRef} position={EARTH_OFFSET} scale={EARTH_SCALE}>
      <Clone object={scene} />
    </group>
  )
}

function Platform() {
  return (
    <RigidBody type="fixed" colliders={false} position={[0, -PLATFORM_HALF_HEIGHT, 0]}>
      <CuboidCollider args={[PLATFORM_RADIUS, PLATFORM_HALF_HEIGHT, PLATFORM_RADIUS]} />
      <mesh receiveShadow>
        <cylinderGeometry args={[PLATFORM_RADIUS, PLATFORM_RADIUS * 1.08, PLATFORM_HALF_HEIGHT * 2, 32]} />
        <meshStandardMaterial color="#1c2942" metalness={0.6} roughness={0.35} fog={false} />
      </mesh>
      {/* Светящийся ободок по краю площадки - ориентир, где заканчивается
          твердь, в остальном неотличимая от черноты космоса вокруг. */}
      <mesh position={[0, PLATFORM_HALF_HEIGHT + 0.01, 0]}>
        <torusGeometry args={[PLATFORM_RADIUS * 1.02, 0.06, 8, 48]} />
        <meshBasicMaterial color="#5fd4ff" toneMapped={false} fog={false} />
      </mesh>
      <pointLight color="#5fd4ff" intensity={3} distance={20} position={[0, 3, 0]} />
    </RigidBody>
  )
}

// Пункт назначения телепорта (Portal.tsx) - "космос" в буквальном смысле:
// звёздное небо со всех сторон (Stars - как в PortfolioCarousel/Gallery)
// и Земля вдалеке, а не просто другая точка той же пустыни. Рендерится
// всегда (как остальные MapProps), а не только после посещения - разницы
// в стоимости почти нет (звёзды/платформа/шар - лёгкая геометрия), а
// код проще без дополнительного условного стейта "посещал ли игрок".
export function SpaceZone() {
  return (
    <group position={SPACE_ORIGIN}>
      <Stars radius={90} depth={50} count={3000} factor={4} saturation={0} fade speed={0.3} />
      <Platform />
      <OrbitingEarth />
    </group>
  )
}

useGLTF.preload(earthModelUrl)
