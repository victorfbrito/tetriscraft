import { isFaceVisible, type FaceDirection } from './faceCulling'

type Position = [number, number, number]

// Return raw block positions whose face in the given direction is exposed
export function getVisibleFacePositions(
  occupiedBlocks: Set<string> | Map<string, any>,
  direction: FaceDirection
): Position[] {
  const keys = Array.from(occupiedBlocks.keys())
  const visible: Position[] = []

  for (const key of keys) {
    const [x, y, z] = key.split(',').map(Number)
    const position: Position = [x, y, z]

    if (isFaceVisible(position, direction, occupiedBlocks)) {
      visible.push(position)
    }
  }

  return visible
}

// Shared helper that groups visible faces by layer (axis value) and material identifier
export function getVisibleFacesByLayer(
  occupiedBlocks: Set<string> | Map<string, any>,
  direction: FaceDirection
): Map<string, Position[]> {
  const layerMap = new Map<string, Position[]>()
  const visiblePositions = getVisibleFacePositions(occupiedBlocks, direction)

  for (const [x, y, z] of visiblePositions) {
    let material = ''
    if (occupiedBlocks instanceof Map) {
      material = occupiedBlocks.get(`${x},${y},${z}`) || ''
    }

    let layerKey: string
    switch (direction) {
      case 'top':
      case 'bottom':
        layerKey = `${y}_${material}`
        break
      case 'front':
      case 'back':
        layerKey = `${z}_${material}`
        break
      case 'right':
      case 'left':
        layerKey = `${x}_${material}`
        break
    }

    if (!layerMap.has(layerKey)) {
      layerMap.set(layerKey, [])
    }
    layerMap.get(layerKey)!.push([x, y, z])
  }

  return layerMap
}


