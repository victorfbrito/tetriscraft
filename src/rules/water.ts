import { Grid, type Position } from '../utils/Grid'
import { type FaceDirection } from '../utils/faceCulling'
import { type DecorationPlacement } from './types'
import { getFaceRotation } from './utils'

export function getWaterDecorations(
  blockPos: Position,
  face: FaceDirection,
  grid: Grid,
  delay: number
): DecorationPlacement[] {
  const [x, y, z] = blockPos
  const placements: DecorationPlacement[] = []
  
  // Check if this face is exactly 1 block in size (not merged with adjacent blocks)
  let isSingleBlockFace = true
  
  // Check horizontal neighbors (perpendicular to face direction)
  if (face === 'front' || face === 'back') {
    const leftBlock = grid.get(x - 1, y, z)
    const rightBlock = grid.get(x + 1, y, z)
    
    if ((leftBlock === 'water' && grid.isFaceVisible(x - 1, y, z, face)) ||
        (rightBlock === 'water' && grid.isFaceVisible(x + 1, y, z, face))) {
      isSingleBlockFace = false
    }
  } else if (face === 'left' || face === 'right') {
    const frontBlock = grid.get(x, y, z + 1)
    const backBlock = grid.get(x, y, z - 1)
    
    if ((frontBlock === 'water' && grid.isFaceVisible(x, y, z + 1, face)) ||
        (backBlock === 'water' && grid.isFaceVisible(x, y, z - 1, face))) {
      isSingleBlockFace = false
    }
  }
  
  // Check vertical neighbors
  const aboveBlock = grid.get(x, y + 1, z)
  const belowBlock = grid.get(x, y - 1, z)
  
  if ((aboveBlock === 'water' && grid.isFaceVisible(x, y + 1, z, face)) ||
      (belowBlock === 'water' && grid.isFaceVisible(x, y - 1, z, face))) {
    isSingleBlockFace = false
  }
  
  if (isSingleBlockFace) {
    placements.push({
      position: blockPos,
      face,
      decorationName: 'Waterfall',
      rotation: getFaceRotation(face),
      delay,
      isAnimated: true,
      phaseIndex: Math.round(z),
    })
    for (let i = 1; i <= 8; i++) {
      placements.push({
        position: blockPos,
        face,
        decorationName: `Bubble_${i}`,
        rotation: getFaceRotation(face),
        delay,
        isAnimated: true,
        phaseIndex: Math.round(z),
      })
    }
  }
  
  
  return placements
}
