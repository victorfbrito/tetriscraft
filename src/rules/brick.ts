import { type DecorationRule } from './types'
import { Grid, type Position } from '../utils/Grid'
import { type FaceDirection } from '../utils/faceCulling'
import { detectCorners, getCornerKey } from './utils'

// Base decorations for brick
export function getBrickBaseDecorations(
  blockPos: Position,
  face: FaceDirection,
  grid: Grid,
  decoratedCorners: Set<string>
): string[] {
  const decorations: string[] = []
  const [x, y, z] = blockPos
  
  // 1. Always add Brick_Wall_Top
  decorations.push('Brick_Wall_Top')
  
  // 2. Add Brick_Wall_Bottom if there's NO brick block directly below
  if (grid.get(x, y - 1, z) !== 'brick') {
    decorations.push('Brick_Wall_Bottom')
  }
  
  // 3. Detect corners
  const [hasLeftCorner, hasRightCorner] = detectCorners(blockPos, face, grid, 'brick')
  
  if (hasLeftCorner) {
    const leftCornerKey = getCornerKey(blockPos, face, true)
    if (!decoratedCorners.has(leftCornerKey)) {
      decorations.push('Brick_Wall_Corner_2')
      decoratedCorners.add(leftCornerKey)
    }
  }
  
  if (hasRightCorner) {
    const rightCornerKey = getCornerKey(blockPos, face, false)
    if (!decoratedCorners.has(rightCornerKey)) {
      decorations.push('Brick_Wall_Corner_1')
      decoratedCorners.add(rightCornerKey)
    }
  }
  
  return decorations
}

export const brickDoorRule: DecorationRule = {
  material: 'brick',
  category: 'primary',
  decorationNames: ['Brick_Door_1', 'Brick_Door_2'],
  faces: ['left', 'right', 'front', 'back'],
  check: (blockPos, face, grid) => {
    const [x, y, z] = blockPos
    let groundInFrontKey: Position
    switch (face) {
      case 'left': groundInFrontKey = [x - 1, y - 1, z]; break
      case 'right': groundInFrontKey = [x + 1, y - 1, z]; break
      case 'front': groundInFrontKey = [x, y - 1, z + 1]; break
      case 'back': groundInFrontKey = [x, y - 1, z - 1]; break
      default: return false
    }
    return grid.get(...groundInFrontKey) !== undefined
  },
}

export const brickWindowRule: DecorationRule = {
  material: 'brick',
  category: 'primary',
  decorationNames: ['Brick_Window_1'],
  faces: ['left', 'right', 'front', 'back'],
  check: () => true,
}

export const brickPatternRule: DecorationRule = {
  material: 'brick',
  category: 'secondary',
  decorationNames: ['Brick_Pattern_1', 'Brick_Pattern_2', 'Brick_Pattern_3'],
  faces: ['left', 'right', 'front', 'back'],
  check: () => true,
}

export function getBrickRoofDecoration(
  blockPos: Position,
  grid: Grid
): { decorationName: string; rotation: [number, number, number] } | null {
  const [x, y, z] = blockPos
  
  const hasLeft = grid.get(x - 1, y, z) === 'brick'
  const hasRight = grid.get(x + 1, y, z) === 'brick'
  const hasFront = grid.get(x, y, z + 1) === 'brick'
  const hasBack = grid.get(x, y, z - 1) === 'brick'
  
  const adjacentCount = [hasLeft, hasRight, hasFront, hasBack].filter(Boolean).length
  const baseRotation: [number, number, number] = [0, 0, 0]
  
  switch (adjacentCount) {
    case 0:
      return { decorationName: 'Brick_Roof_5', rotation: baseRotation }
    case 1:
      let rotation4: [number, number, number]
      if (hasLeft) rotation4 = [0, -Math.PI / 2, 0]
      else if (hasRight) rotation4 = [0, Math.PI / 2, 0]
      else if (hasFront) rotation4 = [0, 0, 0]
      else rotation4 = [0, Math.PI, 0]
      return { decorationName: 'Brick_Roof_4', rotation: rotation4 }
    case 2:
      if ((hasLeft && hasRight) || (hasFront && hasBack)) {
        let rotation2: [number, number, number]
        if (hasLeft && hasRight) rotation2 = hasFront ? [0, Math.PI, 0] : [0, 0, 0]
        else rotation2 = hasLeft ? [0, -Math.PI / 2, 0] : [0, Math.PI / 2, 0]
        return { decorationName: 'Brick_Roof_2', rotation: rotation2 }
      } else {
        let rotation3: [number, number, number]
        if (hasLeft && hasFront) rotation3 = [0, Math.PI * 2, 0]
        else if (hasLeft && hasBack) rotation3 = [0, -Math.PI / 2, 0]
        else if (hasRight && hasFront) rotation3 = [0, Math.PI / 2, 0]
        else rotation3 = [0, Math.PI, 0]
        return { decorationName: 'Brick_Roof_3', rotation: rotation3 }
      }
    case 3:
      let rotation1: [number, number, number]
      if (!hasLeft) rotation1 = [0, Math.PI / 2, 0]
      else if (!hasRight) rotation1 = [0, -Math.PI / 2, 0]
      else if (!hasFront) rotation1 = [0, Math.PI, 0]
      else rotation1 = [0, 0, 0]
      return { decorationName: 'Brick_Roof_1', rotation: rotation1 }
    default:
      return null
  }
}
