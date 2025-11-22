import { useMemo, useEffect, useState } from 'react'
import { useGLTF } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { RectAreaLightUniformsLib } from 'three/examples/jsm/lights/RectAreaLightUniformsLib.js'
import { type MaterialType } from '../../utils/materials'
import { getDecorationPlacements, type DecorationPlacement } from '../../rules'
import DecorationInstance from './DecorationInstance'
import AnimatedDecorationInstance from './AnimatedDecorationInstance'
import { useDayNightCycleSnapshot } from '../../context/DayNightCycleContext'

interface DecorationsProps {
  boardState: Map<string, MaterialType>
}

export default function Decorations({ boardState }: DecorationsProps) {
  // Load block decorations GLB file (contains both brick and wood decorations)
  const blockDecorations = useGLTF('/block_decorations.glb') as any
  const decorationNodes = blockDecorations.nodes || {}
  
  // Extract animations for water decorations
  const animations: THREE.AnimationClip[] = useMemo(() => {
    if (!Array.isArray(blockDecorations.animations)) return []
    return blockDecorations.animations.filter((clip: THREE.AnimationClip) => 
      clip.name.match(/^(Water|Bubble)/)
    )
  }, [blockDecorations.animations])
  
  useEffect(() => {
    RectAreaLightUniformsLib.init()
  }, [])

  // Access emission material for windows
  const windowEmissionMaterial = blockDecorations.materials?.WindowEmission as THREE.MeshStandardMaterial | undefined
  
  // Calculate decoration placements based on rules
  const placements = useMemo(() => {
    return getDecorationPlacements(boardState)
  }, [boardState])

  const getCycleState = useDayNightCycleSnapshot()
  const [windowsLit, setWindowsLit] = useState(false)

  useFrame(() => {
    if (!windowEmissionMaterial) return

    const { shouldWindowsGlow } = getCycleState()
    windowEmissionMaterial.emissiveIntensity = shouldWindowsGlow ? 0.6 : 0

    if (shouldWindowsGlow !== windowsLit) {
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

  const isWaterDecoration = (decorationName: string) =>
    decorationName.startsWith('Water_') || decorationName.startsWith('Bubble_')

  // Face normals for window light positioning
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
        
        const renderInstances = decorationPlacements.map((placement, index) => {
          const key = `${decorationName}-${placement.position.join(',')}-${placement.face}-${index}`
          
          // Use AnimatedDecorationInstance for water decorations
          if (isWaterDecoration(decorationName) && placement.isAnimated) {
            return (
              <AnimatedDecorationInstance
                key={key}
                node={decorationNode}
                blockPosition={placement.position}
                face={placement.face}
                rotation={placement.rotation}
                delay={placement.delay}
                animations={animations}
                phaseIndex={placement.phaseIndex}
              />
            )
          }
          
          // Use regular DecorationInstance for other decorations
          return (
            <DecorationInstance
              key={key}
              node={decorationNode}
              blockPosition={placement.position}
              face={placement.face}
              rotation={placement.rotation}
              delay={placement.delay}
            />
          )
        })

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

