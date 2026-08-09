import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { useGLTF, Instances, Instance } from '@react-three/drei'
import { RigidBody, CuboidCollider } from '@react-three/rapier'
import * as THREE from 'three'
import stairUrl from '../models/wooden_step_ladder_scan_lowpoly.glb'
import { useBuildStore, buildGhostStore, BUILD_MODEL_SCALE, BUILD_FOOTPRINT_X, BUILD_FOOTPRINT_Z, BUILD_BLOCK_HEIGHT } from '@/utils/buildStore'

// Тот же сдвиг origin, что задокументирован в buildStore.ts - координаты
// ЛОКАЛЬНЫХ вершин меша (не bbox сцены с трансформом узла, это была
// причина реального бага - см. подробный комментарий в buildStore.ts).
// Центр по X/Z и низ (min Y) переносятся в (0,0,0), иначе экземпляры
// рисовались бы на десятки единиц в стороне от точки клика.
const RAW_MIN_Y = -5.154795169830322
const RAW_CENTER_X = 1.1199398636817932
const RAW_CENTER_Z = -0.1389707326889038

const HALF_EXTENTS: [number, number, number] = [
  BUILD_FOOTPRINT_X / 2,
  BUILD_BLOCK_HEIGHT / 2,
  BUILD_FOOTPRINT_Z / 2,
]

function useNormalizedStairAsset() {
  const { scene } = useGLTF(stairUrl)
  return useMemo(() => {
    let geometry: THREE.BufferGeometry | undefined
    let material: THREE.Material | undefined
    scene.traverse((obj) => {
      const mesh = obj as THREE.Mesh
      if (mesh.isMesh && !geometry) {
        geometry = mesh.geometry.clone()
        material = (Array.isArray(mesh.material) ? mesh.material[0] : mesh.material) as THREE.Material
      }
    })
    if (!geometry || !material) throw new Error('wooden_step_ladder_scan_lowpoly.glb: меш не найден')
    geometry.translate(-RAW_CENTER_X, -RAW_MIN_Y, -RAW_CENTER_Z)
    // GLTFLoader уже посчитал boundingSphere/boundingBox ДО translate() -
    // сам translate() их не обновляет, из-за чего InstancedMesh (Instances
    // ниже) отбраковывался покадровым frustum culling как "вне камеры"
    // (устаревшие границы всё ещё указывали на исходные координаты
    // экспорта, за десятки единиц от истинного положения) - блоки
    // физически ставились (позиция в сторе была верной), но не рисовались
    // ни при каком ракурсе. Пересчёт после translate решает это.
    geometry.computeBoundingSphere()
    geometry.computeBoundingBox()
    return { geometry, material }
  }, [scene])
}

// Кирка (HUD-кнопка в GameMode.tsx) ставит копии модели лестницы по
// сетке, как блоки в Minecraft - см. Дополнение 3 в плане. Видимая
// геометрия рисуется через drei <Instances> (один draw call на любое
// число блоков), а под каждым экземпляром - отдельное фиксированное
// RigidBody с CuboidCollider (тот же приём, что уже используется для
// остальных построек карты в MapProps.tsx), иначе персонаж проходил бы
// сквозь построенное насквозь и не мог бы забраться по ступеням.
export function PlacedBlocks() {
  const placedBlocks = useBuildStore((s) => s.placedBlocks)
  const pickaxeActive = useBuildStore((s) => s.pickaxeActive)
  const { geometry, material } = useNormalizedStairAsset()
  const ghostRef = useRef<THREE.Mesh>(null)

  const ghostMaterial = useMemo(() => {
    const m = material.clone()
    m.transparent = true
    m.opacity = 0.45
    m.depthWrite = false
    return m
  }, [material])

  useFrame(() => {
    if (!ghostRef.current) return
    const active = useBuildStore.getState().pickaxeActive
    const ghost = buildGhostStore.getState()
    const visible = active && ghost.visible
    ghostRef.current.visible = visible
    if (!visible) return
    const { ghostRotationY, ghostHeightOffset } = useBuildStore.getState()
    ghostRef.current.position.set(ghost.x, ghostHeightOffset, ghost.z)
    ghostRef.current.rotation.y = ghostRotationY
  })

  return (
    <>
      {placedBlocks.length > 0 && (
        <Instances geometry={geometry} material={material} castShadow receiveShadow>
          {placedBlocks.map((b) => (
            <Instance key={b.id} position={b.position} rotation={[0, b.rotationY, 0]} scale={BUILD_MODEL_SCALE} />
          ))}
        </Instances>
      )}
      {placedBlocks.map((b) => (
        <RigidBody
          key={b.id}
          type="fixed"
          colliders={false}
          position={[b.position[0], b.position[1] + BUILD_BLOCK_HEIGHT / 2, b.position[2]]}
          rotation={[0, b.rotationY, 0]}
        >
          <CuboidCollider args={HALF_EXTENTS} />
        </RigidBody>
      ))}
      {pickaxeActive && (
        <mesh ref={ghostRef} geometry={geometry} material={ghostMaterial} scale={BUILD_MODEL_SCALE} visible={false} />
      )}
    </>
  )
}

useGLTF.preload(stairUrl)
