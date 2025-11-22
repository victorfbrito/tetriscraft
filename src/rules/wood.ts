import { type DecorationRule } from './types'
import { Grid, type Position } from '../utils/Grid'
import { type FaceDirection } from '../utils/faceCulling'
import { detectCorners, getCornerKey } from './utils'

// Base decorations for wood
export function getWoodBaseDecorations(
  blockPos: Position,
  face: FaceDirection,
  grid: Grid,
  decoratedCorners: Set<string>
): string[] {
  const decorations: string[] = []
  const [x, y, z] = blockPos
  
  decorations.push('Wood_Wall_Top_1')
  
  if (grid.get(x, y - 1, z) !== 'wood') {
    decorations.push('Wood_Wall_Bottom_1')
  }
  
  const [hasLeftCorner, hasRightCorner] = detectCorners(blockPos, face, grid, 'wood')
  
  if (hasLeftCorner) {
    const leftCornerKey = getCornerKey(blockPos, face, true)
    if (!decoratedCorners.has(leftCornerKey)) {
      decorations.push('Wood_Wall_Corner_1_Right')
      decoratedCorners.add(leftCornerKey)
    }
  }
  
  if (hasRightCorner) {
    const rightCornerKey = getCornerKey(blockPos, face, false)
    if (!decoratedCorners.has(rightCornerKey)) {
      decorations.push('Wood_Wall_Corner_1_Left')
      decoratedCorners.add(rightCornerKey)
    }
  }
  
  return decorations
}

export const woodDoorRule: DecorationRule = {
  material: 'wood',
  category: 'primary',
  decorationNames: ['Wood_Door_1'],
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

export const woodWindowRule: DecorationRule = {
  material: 'wood',
  category: 'primary',
  decorationNames: ['Wood_Window_1', 'Wood_Window_2'],
  faces: ['left', 'right', 'front', 'back'],
  check: () => true,
}

export const woodPatternRule: DecorationRule = {
  material: 'wood',
  category: 'secondary',
  decorationNames: ['Wood_Pattern_1', 'Wood_Pattern_2', 'Wood_Pattern_3'],
  faces: ['left', 'right', 'front', 'back'],
  check: () => true,
}

export function getWoodRoofDecorations(
  blockPos: Position,
  grid: Grid
): Array<{ face: FaceDirection; decorationName: string; rotation: [number, number, number] }> {
  const placements: Array<{ face: FaceDirection; decorationName: string; rotation: [number, number, number] }> = []
  const [x, y, z] = blockPos
  
  const hasLeft = grid.get(x - 1, y, z) === 'wood'
  const hasRight = grid.get(x + 1, y, z) === 'wood'
  const hasFront = grid.get(x, y, z + 1) === 'wood'
  const hasBack = grid.get(x, y, z - 1) === 'wood'
  
  const adjacentCount = [hasLeft, hasRight, hasFront, hasBack].filter(Boolean).length
  const baseRotation: [number, number, number] = [0, 0, 0]
  
  let roofTileName: string
  let roofTileRotation: [number, number, number]
  
  switch (adjacentCount) {
    case 0:
      roofTileName = 'Wood_Roof_Tiles_1'
      roofTileRotation = baseRotation
      break
    case 1:
      roofTileName = 'Wood_Roof_Tiles_1'
      if (hasLeft) roofTileRotation = [0, -Math.PI / 2, 0]
      else if (hasRight) roofTileRotation = [0, Math.PI / 2, 0]
      else if (hasFront) roofTileRotation = [0, 0, 0]
      else roofTileRotation = [0, Math.PI, 0]
      break
    case 2:
      if ((hasLeft && hasRight) || (hasFront && hasBack)) {
        roofTileName = 'Wood_Roof_Tiles_1'
        if (hasLeft && hasRight) roofTileRotation = hasFront ? [0, Math.PI, 0] : [0, 0, 0]
        else roofTileRotation = hasLeft ? [0, -Math.PI / 2, 0] : [0, Math.PI / 2, 0]
      } else {
        roofTileName = 'Wood_Roof_Tiles_4'
        if (hasLeft && hasFront) roofTileRotation = [0, Math.PI, 0]
        else if (hasLeft && hasBack) roofTileRotation = [0, Math.PI / 2, 0]
        else if (hasRight && hasFront) roofTileRotation = [0, -Math.PI / 2, 0]
        else roofTileRotation = [0, 0, 0]
      }
      break
    case 3:
      roofTileName = 'Wood_Roof_Tiles_1'
      if (!hasLeft) roofTileRotation = [0, Math.PI / 2, 0]
      else if (!hasRight) roofTileRotation = [0, -Math.PI / 2, 0]
      else if (!hasFront) roofTileRotation = [0, Math.PI, 0]
      else roofTileRotation = [0, 0, 0]
      break
    case 4:
      roofTileName = 'Wood_Roof_Tiles_2'
      roofTileRotation = baseRotation
      break
    default:
      return []
  }
  
  placements.push({
    face: 'top',
    decorationName: roofTileName,
    rotation: roofTileRotation,
  })
  
  if (adjacentCount <= 1) {
    if (adjacentCount === 1) {
      let faceRotation: [number, number, number]
      if (hasLeft) faceRotation = [0, -Math.PI / 2, 0]
      else if (hasRight) faceRotation = [0, Math.PI / 2, 0]
      else if (hasFront) faceRotation = [0, 0, 0]
      else faceRotation = [0, Math.PI, 0]
      placements.push({
        face: 'top',
        decorationName: 'Wood_Roof_Face',
        rotation: faceRotation,
      })
    } else {
      placements.push({
        face: 'top',
        decorationName: 'Wood_Roof_Face',
        rotation: [0, 0, 0],
      })
      placements.push({
        face: 'top',
        decorationName: 'Wood_Roof_Face',
        rotation: [0, Math.PI, 0],
      })
    }
  }
  
  return placements
}
