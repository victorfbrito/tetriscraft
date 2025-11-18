type Position = [number, number, number]

// Face directions: top, bottom, front, back, right, left
export type FaceDirection = 'top' | 'bottom' | 'front' | 'back' | 'right' | 'left'

// Check if a face is visible (not blocked by adjacent block)
// Accepts either Set<string> or Map<string, any> for occupied blocks
export function isFaceVisible(
  position: Position,
  direction: FaceDirection,
  occupiedBlocks: Set<string> | Map<string, any>
): boolean {
  const [x, y, z] = position
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
// Accepts either Set<string> or Map<string, any> for occupied blocks
export function getVisibleFaces(
  position: Position,
  occupiedBlocks: Set<string> | Map<string, any>
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

