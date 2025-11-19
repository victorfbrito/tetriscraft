import { useMemo, useEffect } from 'react'
import { useGLTF } from '@react-three/drei'
import { type MaterialType } from '../utils/materials'
import { getDecorationPlacements, type DecorationPlacement } from '../utils/decorationRules'
import DecorationInstance from './DecorationInstance'

interface DecorationsProps {
  boardState: Map<string, MaterialType>
}

export default function Decorations({ boardState }: DecorationsProps) {
  // Load block decorations GLB file (contains both brick and wood decorations)
  const blockDecorations = useGLTF('/block_decorations.glb') as any
  const decorationNodes = blockDecorations.nodes || {}
  
  // Log all available nodes for debugging
  useEffect(() => {
    console.log('Block decorations nodes:', Object.keys(decorationNodes))
    console.log('Block decorations nodes details:', decorationNodes)
  }, [decorationNodes])
  
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
    return getDecorationPlacements(boardState)
  }, [boardState, blockPositionsKey])
  
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
  
  return (
    <group>
      {Array.from(placementsByDecoration.entries()).map(([decorationName, decorationPlacements]) => {
        // Get the node for this decoration type
        const decorationNode = decorationNodes[decorationName]
        
        if (!decorationNode) {
          console.warn(`Decoration node "${decorationName}" not found in block_decorations.glb`)
          return null
        }
        
        // Render all instances of this decoration type
        return decorationPlacements.map((placement, index) => (
          <DecorationInstance
            key={`${decorationName}-${placement.position.join(',')}-${placement.face}-${index}`}
            node={decorationNode}
            blockPosition={placement.position}
            face={placement.face}
            rotation={placement.rotation}
            delay={placement.delay}
          />
        ))
      })}
    </group>
  )
}

