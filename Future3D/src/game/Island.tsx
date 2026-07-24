import { useGLTF } from '@react-three/drei'
import { RigidBody } from '@react-three/rapier'
import islandUrl from '../models/ostrov.glb'

// Модель острова в исходном файле имеет огромный масштаб (bbox порядка
// ±18000 условных единиц — похоже, экспортирована вместе с окружением/
// небом). ISLAND_SCALE подобран так, чтобы остров стал площадкой
// разумного игрового размера (~25-30 юнитов). Коллайдер — trimesh по
// реальной форме острова (он не плоский, простой cuboid не подошёл бы).
const ISLAND_SCALE = 0.0015

export function Island() {
  const { scene } = useGLTF(islandUrl)

  return (
    <RigidBody type="fixed" colliders="trimesh">
      <primitive object={scene} scale={ISLAND_SCALE} />
    </RigidBody>
  )
}

useGLTF.preload(islandUrl)
