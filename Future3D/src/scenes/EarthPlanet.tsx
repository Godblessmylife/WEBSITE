import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
import * as THREE from 'three'
import { useScrollStore } from '@/utils/scrollStore'
import earthModelUrl from '../models/earth.glb'

// earth.glb — модель от клиента (Sketchfab), прогнанная через
// gltf-transform: конвертация из устаревшего KHR_materials_pbrSpecularGlossiness
// в metal/rough (современный GLTFLoader его не понимает "из коробки"),
// плюс сжатие геометрии (meshopt) и текстуры (8192x4096 JPG -> 2048x1024
// WebP). Итог 22.67 МБ -> 429 КБ. Исходный файл лежит рядом как
// earth.source.glb и не коммитится (см. .gitignore).
const MODEL_SOURCE_RADIUS = 100 // радиус сферы в исходной модели (bbox)

// Позиция подобрана так, чтобы планета была хорошо видна издалека в
// самом начале пути (рядом с солнечной системой) и оставалась под
// облаками (ниже CloudZone), а к моменту подлёта к земле уже гасла —
// иначе она визуально спорила бы с плоским городом GroundZone.
const PLANET_CENTER = new THREE.Vector3(0, -40, 20)
const PLANET_RADIUS = 45
const MODEL_SCALE = PLANET_RADIUS / MODEL_SOURCE_RADIUS

export function EarthPlanet() {
  const { scene } = useGLTF(earthModelUrl)
  const modelRef = useRef<THREE.Group>(null!)
  const atmoRef = useRef<THREE.Mesh>(null!)

  useFrame((_, delta) => {
    const progress = THREE.MathUtils.clamp(useScrollStore.getState().progress, 0, 1)
    modelRef.current.rotation.y += delta * 0.02

    const fadeIn = THREE.MathUtils.smoothstep(progress, 0, 0.05)
    const fadeOut = 1 - THREE.MathUtils.smoothstep(progress, 0.45, 0.6)
    const opacity = fadeIn * fadeOut
    const visible = opacity > 0.01

    modelRef.current.visible = visible
    modelRef.current.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        const material = child.material as THREE.MeshStandardMaterial
        material.transparent = opacity < 1
        material.opacity = opacity
      }
    })

    const atmosphereMaterial = atmoRef.current.material as THREE.MeshBasicMaterial
    atmosphereMaterial.opacity = opacity * 0.4
    atmosphereMaterial.visible = visible
  })

  return (
    <group position={PLANET_CENTER}>
      <group ref={modelRef} scale={MODEL_SCALE}>
        <primitive object={scene} />
      </group>
      <mesh ref={atmoRef} scale={1.04}>
        <sphereGeometry args={[PLANET_RADIUS, 48, 48]} />
        <meshBasicMaterial
          color="#6fb7ff"
          transparent
          opacity={0.3}
          side={THREE.BackSide}
          depthWrite={false}
        />
      </mesh>
    </group>
  )
}

useGLTF.preload(earthModelUrl)
