import * as THREE from 'three'
import { Clouds, Cloud } from '@react-three/drei'
import cloudTexture from '@pmndrs/assets/textures/cloud.webp'

// Зона облаков (progress ~0.35–0.65): объёмные облака на готовом
// drei Clouds/Cloud вместо процедурного шейдера — быстрее и уже
// выглядит объёмно на этом этапе. Художественная доводка — позже.
export function CloudZone() {
  return (
    <group position={[0, 20, 0]}>
      <Clouds texture={cloudTexture} material={THREE.MeshLambertMaterial} limit={400}>
        <Cloud seed={1} bounds={[20, 6, 20]} volume={14} color="white" opacity={0.9} />
        <Cloud
          seed={2}
          bounds={[24, 5, 24]}
          volume={10}
          color="#dfe8f2"
          opacity={0.75}
          position={[14, -4, -8]}
        />
        <Cloud
          seed={3}
          bounds={[18, 4, 18]}
          volume={8}
          color="#c9d6e3"
          opacity={0.65}
          position={[-16, 3, 10]}
        />
        <Cloud
          seed={4}
          bounds={[22, 5, 22]}
          volume={9}
          color="#eef3f8"
          opacity={0.7}
          position={[6, 6, 18]}
        />
      </Clouds>
      <hemisphereLight args={['#ffffff', '#445566', 0.6]} />
    </group>
  )
}
