import { Grid } from './Grid'

type Position = [number, number, number]

// Face directions: top, bottom, front, back, right, left
export type FaceDirection = 'top' | 'bottom' | 'front' | 'back' | 'right' | 'left'

// Check if a face is visible (not blocked by adjacent block)
// Accepts either Set<string>, Map<string, any>, or Grid for occupied blocks
export function isFaceVisible(
  position: Position,
  direction: FaceDirection,
  occupiedBlocks: Set<string> | Map<string, any> | Grid
): boolean {
  const [x, y, z] = position

  if (occupiedBlocks instanceof Grid) {
    return occupiedBlocks.isFaceVisible(x, y, z, direction)
  }

  let neighborKey: string

  switch (direction) {
    case 'top':
      neighborKey = `${x},${y + 1},${z}`
      break
    case 'bottom':
      neighborKey = `${x},${y - 1},${z}`
      break
    case 'front':
      neighborKey = `${x},${y},${z + 1}`
      break
    case 'back':
      neighborKey = `${x},${y},${z - 1}`
      break
    case 'right':
      neighborKey = `${x + 1},${y},${z}`
      break
    case 'left':
      neighborKey = `${x - 1},${y},${z}`
      break
  }

  // Handle both Set and Map
  if (occupiedBlocks instanceof Map) {
    return !occupiedBlocks.has(neighborKey)
  }
  return !occupiedBlocks.has(neighborKey)
}

// Get all visible faces for a block
// Accepts either Set<string>, Map<string, any>, or Grid for occupied blocks
export function getVisibleFaces(
  position: Position,
  occupiedBlocks: Set<string> | Map<string, any> | Grid
): FaceDirection[] {
  const faces: FaceDirection[] = []
  const directions: FaceDirection[] = ['top', 'bottom', 'front', 'back', 'right', 'left']

  for (const direction of directions) {
    if (isFaceVisible(position, direction, occupiedBlocks)) {
      faces.push(direction)
    }
  }

  return faces
}

// Calculate decoration position on a block face
// Returns the world position where a decoration should be placed, flush with the block surface
export function getDecorationPosition(
  blockPosition: Position,
  face: FaceDirection
): [number, number, number] {
  const [x, y, z] = blockPosition
  const offset = 0.5 // Half block size
  
  switch (face) {
    case 'left':
      return [x - offset, y, z]
    case 'right':
      return [x + offset, y, z]
    case 'front':
      return [x, y, z + offset]
    case 'back':
      return [x, y, z - offset]
    case 'top':
      return [x, y + offset, z]
    case 'bottom':
      return [x, y - offset, z]
    default:
      return [x, y, z]
  }
}
