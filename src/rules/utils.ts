import { Grid, type Position } from '../utils/Grid'
import { type FaceDirection } from '../utils/faceCulling'
import { type MaterialType } from '../utils/materials'

// Corner detection using Grid
export function detectCorners(
  blockPos: Position,
  face: FaceDirection,
  grid: Grid,
  material: MaterialType
): [boolean, boolean] {
  const [x, y, z] = blockPos
  let aKey: Position // Left side of current block
  let cKey: Position // Right side of current block
  let dKey: Position // Diagonal left-front
  let fKey: Position // Diagonal right-front
  
  switch (face) {
    case 'front': // facing +Z
      aKey = [x - 1, y, z]
      cKey = [x + 1, y, z]
      dKey = [x - 1, y, z + 1]
      fKey = [x + 1, y, z + 1]
      break
    case 'back': // facing -Z
      aKey = [x + 1, y, z]
      cKey = [x - 1, y, z]
      dKey = [x + 1, y, z - 1]
      fKey = [x - 1, y, z - 1]
      break
    case 'left': // facing -X
      aKey = [x, y, z - 1]
      cKey = [x, y, z + 1]
      dKey = [x - 1, y, z - 1]
      fKey = [x - 1, y, z + 1]
      break
    case 'right': // facing +X
      aKey = [x, y, z + 1]
      cKey = [x, y, z - 1]
      dKey = [x + 1, y, z + 1]
      fKey = [x + 1, y, z - 1]
      break
    default:
      return [false, false]
  }
  
  const hasA = grid.get(...aKey) === material
  const hasC = grid.get(...cKey) === material
  const hasD = grid.get(...dKey) === material
  const hasF = grid.get(...fKey) === material
  
  const hasRightCorner = (hasA && !hasC) || hasD
  const hasLeftCorner = (hasC && !hasA) || hasF
  
  return [hasLeftCorner, hasRightCorner]
}

export function getCornerKey(
  blockPos: Position,
  face: FaceDirection,
  isLeftCorner: boolean
): string {
  const [x, y, z] = blockPos
  let cornerX: number
  let cornerZ: number
  
  if (isLeftCorner) {
    switch (face) {
      case 'front': cornerX = x - 0.5; cornerZ = z + 0.5; break
      case 'back': cornerX = x + 0.5; cornerZ = z - 0.5; break
      case 'left': cornerX = x - 0.5; cornerZ = z - 0.5; break
      case 'right': cornerX = x + 0.5; cornerZ = z + 0.5; break
      default: return ''
    }
  } else {
    switch (face) {
      case 'front': cornerX = x + 0.5; cornerZ = z + 0.5; break
      case 'back': cornerX = x - 0.5; cornerZ = z - 0.5; break
      case 'left': cornerX = x - 0.5; cornerZ = z + 0.5; break
      case 'right': cornerX = x + 0.5; cornerZ = z - 0.5; break
      default: return ''
    }
  }
  
  return `corner_${cornerX}_${y}_${cornerZ}`
}

export function getFaceRotation(face: FaceDirection): [number, number, number] {
  switch (face) {
    case 'left': return [0, Math.PI / 2, 0]
    case 'right': return [0, -Math.PI / 2, 0]
    case 'front': return [0, Math.PI, 0]
    case 'back': return [0, 0, 0]
    case 'top': return [0, 0, 0]
    case 'bottom': return [Math.PI / 2, 0, 0]
    default: return [0, 0, 0]
  }
}

export function seededRandom(seed: string): number {
  let hash = 0
  for (let i = 0; i < seed.length; i++) {
    const char = seed.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash | 0
  }
  return Math.abs(hash) / 2147483647
}
