import { useMemo, useEffect, useRef, useState } from 'react'
import { useGLTF } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { RectAreaLightUniformsLib } from 'three/examples/jsm/lights/RectAreaLightUniformsLib.js'
import { type MaterialType } from '../utils/materials'
import { getDecorationPlacements, type DecorationPlacement } from '../utils/decorationRules'
import DecorationInstance from './DecorationInstance'
import { useDayNightCycleSnapshot } from '../context/DayNightCycleContext'

interface DecorationsProps {
  boardState: Map<string, MaterialType>
  treeOccupiedBlocks?: Set<string>
}

export default function Decorations({ boardState, treeOccupiedBlocks }: DecorationsProps) {
  // Load block decorations GLB file (contains both brick and wood decorations)
  const blockDecorations = useGLTF('/block_decorations.glb') as any
  const decorationNodes = blockDecorations.nodes || {}
  
  useEffect(() => {
    RectAreaLightUniformsLib.init()
  }, [])

  // Access emission material for windows
  const windowEmissionMaterial = blockDecorations.materials?.WindowEmission as THREE.MeshStandardMaterial | undefined
  
  // Create a stable key from brick and wood block positions for memoization
  const blockPositionsKey = useMemo(() => {
    const positions: string[] = []
    for (const [key, material] of boardState.entries()) {
      if (material === 'brick' || material === 'wood') {
        positions.push(key)
      }
    }
    return positions.sort().join('|')
  }, [boardState])
  
  // Calculate decoration placements based on rules
  const placements = useMemo(() => {
    return getDecorationPlacements(boardState, treeOccupiedBlocks)
  }, [boardState, blockPositionsKey, treeOccupiedBlocks])

  const getCycleState = useDayNightCycleSnapshot()
  const [windowsLit, setWindowsLit] = useState(false)
  const windowsLitRef = useRef(false)

  useFrame(() => {
    if (!windowEmissionMaterial) {
      return
    }

    const { shouldWindowsGlow } = getCycleState()

    if (shouldWindowsGlow) {
      windowEmissionMaterial.emissiveIntensity = 0.6
    } else {
      windowEmissionMaterial.emissiveIntensity = 0
    }

    if (shouldWindowsGlow !== windowsLitRef.current) {
      windowsLitRef.current = shouldWindowsGlow
      setWindowsLit(shouldWindowsGlow)
    }
  })
  
  // Group placements by decoration name to optimize node lookups
  const placementsByDecoration = useMemo(() => {
    const grouped = new Map<string, DecorationPlacement[]>()
    
    for (const placement of placements) {
      if (!grouped.has(placement.decorationName)) {
        grouped.set(placement.decorationName, [])
      }
      grouped.get(placement.decorationName)!.push(placement)
    }
    
    return grouped
  }, [placements])
  
  const isWindowDecoration = (decorationName: string) =>
    decorationName.toLowerCase().includes('window')

  const FACE_NORMALS: Record<string, [number, number, number]> = {
    left: [-1, 0, 0],
    right: [1, 0, 0],
    front: [0, 0, 1],
    back: [0, 0, -1],
    top: [0, 1, 0],
    bottom: [0, -1, 0],
  }

  return (
    <group>
      {Array.from(placementsByDecoration.entries()).map(([decorationName, decorationPlacements]) => {
        // Get the node for this decoration type
        const decorationNode = decorationNodes[decorationName]
        
        if (!decorationNode) {
          console.warn(`Decoration node "${decorationName}" not found in block_decorations.glb`)
          return null
        }
        
        const renderInstances = decorationPlacements.map((placement, index) => (
          <DecorationInstance
            key={`${decorationName}-${placement.position.join(',')}-${placement.face}-${index}`}
            node={decorationNode}
            blockPosition={placement.position}
            face={placement.face}
            rotation={placement.rotation}
            delay={placement.delay}
          />
        ))

        if (!isWindowDecoration(decorationName)) {
          return (
            <group key={`decoration-group-${decorationName}`}>
              {renderInstances}
            </group>
          )
        }

        const windowLights = decorationPlacements.map((placement, index) => {
          const normal = FACE_NORMALS[placement.face] || [0, 0, 1]
          const offset = 0.65
          const position: [number, number, number] = [
            placement.position[0] + normal[0] * offset,
            placement.position[1] + normal[1] * offset,
            placement.position[2] + normal[2] * offset,
          ]

          return (
            <rectAreaLight
              key={`window-light-${decorationName}-${index}`}
              position={position}
              rotation={placement.rotation}
              width={0.5}
              height={0.5}
              intensity={windowsLit ? 2 : 0}
              color="#ffd721"
            />
          )
        })

        return (
          <group key={`decoration-group-${decorationName}`}>
            {renderInstances}
            {windowLights}
          </group>
        )
      })}
    </group>
  )
}

