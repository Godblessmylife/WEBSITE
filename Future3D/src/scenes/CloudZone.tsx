import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { Clouds, Cloud } from '@react-three/drei'
import cloudTexture from '@pmndrs/assets/textures/cloud.webp'
import { useScrollStore } from '@/utils/scrollStore'

// БЫЛО без затухания вообще — облака висят в фиксированной мировой
// точке (0,20,0) весь путь, полагаясь только на то, что камера сама
// уедет от них по мере спуска. Пока хвост пути (progress >= 0.75, см.
// FINAL_DESCENT_REMAP_START в cameraPath.ts) был физически недостижим
// (камера застревала выше), это работало незаметно. После починки
// финального "нырка" в Землю камера в этом же диапазоне progress
// реально проходит на такой высоте (~y 8-13), что задевает объём
// облаков вблизи — мягкие спрайты с размытыми краями вплотную к камере
// выглядели не как "детализация Земли", а как сплошная серая засветка
// на весь экран. Затухание доводит облака до нуля к 0.75 — к тому же
// порогу, где начинается сам нырок и crossfade Земля/город.
const FADE_START = 0.68
const FADE_END = 0.75

export function CloudZone() {
  const groupRef = useRef<THREE.Group>(null!)

  useFrame(() => {
    const progress = THREE.MathUtils.clamp(useScrollStore.getState().progress, 0, 1)
    const scale = 1 - THREE.MathUtils.smoothstep(progress, FADE_START, FADE_END)
    groupRef.current.visible = scale > 0.01
    groupRef.current.scale.setScalar(scale)
  })

  return (
    <group ref={groupRef} position={[0, 20, 0]}>
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
