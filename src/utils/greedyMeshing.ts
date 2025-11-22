import { type FaceDirection } from './faceCulling'
import { getVisibleFacesByLayer } from './visibleFaces'

type Position = [number, number, number]

export interface Quad {
  position: Position
  direction: FaceDirection
  width: number
  height: number
  // For horizontal faces: width is along X, height is along Z
  // For vertical faces: width is along X, height is along Y
}

// Get the normal vector for a face direction
export function getFaceNormal(direction: FaceDirection): [number, number, number] {
  switch (direction) {
    case 'top':
      return [0, 1, 0]
    case 'bottom':
      return [0, -1, 0]
    case 'front':
      return [0, 0, 1]
    case 'back':
      return [0, 0, -1]
    case 'right':
      return [1, 0, 0]
    case 'left':
      return [-1, 0, 0]
  }
}

// Greedy meshing for a 2D grid of faces
function greedyMeshLayer(
  faces: Position[],
  direction: FaceDirection,
  layerValue: number
): Quad[] {
  const quads: Quad[] = []
  
  // Create a 2D grid
  const grid = new Map<string, boolean>()
  let minW = Infinity, maxW = -Infinity
  let minH = Infinity, maxH = -Infinity
  
  for (const [x, y, z] of faces) {
    let w: number, h: number
    
    switch (direction) {
      case 'top':
      case 'bottom':
        w = x
        h = z
        break
      case 'front':
      case 'back':
        w = x
        h = y
        break
      case 'right':
      case 'left':
        w = z
        h = y
        break
    }
    
    const key = `${w},${h}`
    grid.set(key, true)
    minW = Math.min(minW, w)
    maxW = Math.max(maxW, w)
    minH = Math.min(minH, h)
    maxH = Math.max(maxH, h)
  }
  
  // Greedy meshing algorithm
  const processed = new Set<string>()
  
  for (let h = minH; h <= maxH; h++) {
    for (let w = minW; w <= maxW; w++) {
      const key = `${w},${h}`
      if (!grid.has(key) || processed.has(key)) continue
      
      // Find maximum width
      let width = 1
      while (w + width <= maxW && grid.has(`${w + width},${h}`) && !processed.has(`${w + width},${h}`)) {
        width++
      }
      
      // Find maximum height for this width
      let height = 1
      let canExpand = true
      
      while (canExpand && h + height <= maxH) {
        for (let dw = 0; dw < width; dw++) {
          const checkKey = `${w + dw},${h + height}`
          if (!grid.has(checkKey) || processed.has(checkKey)) {
            canExpand = false
            break
          }
        }
        if (canExpand) {
          height++
        }
      }
      
      // Mark as processed
      for (let dh = 0; dh < height; dh++) {
        for (let dw = 0; dw < width; dw++) {
          processed.add(`${w + dw},${h + dh}`)
        }
      }
      
      // Convert back to world coordinates
      let quadPos: Position
      
      switch (direction) {
        case 'top':
        case 'bottom':
          quadPos = [w, layerValue, h]
          break
        case 'front':
        case 'back':
          quadPos = [w, h, layerValue]
          break
        case 'right':
        case 'left':
          quadPos = [layerValue, h, w]
          break
      }
      
      quads.push({
        position: quadPos,
        direction,
        width,
        height,
      })
    }
  }
  
  return quads
}

// Greedy meshing algorithm for a specific face direction
// Accepts either Set<string> or Map<string, any> for occupied blocks
function greedyMeshFaces(
  occupiedBlocks: Set<string> | Map<string, any>,
  direction: FaceDirection
): Quad[] {
  const layerMap = getVisibleFacesByLayer(occupiedBlocks, direction)
  const allQuads: Quad[] = []
  
  for (const [layerKey, faces] of layerMap.entries()) {
    // Parse layer key: format is "layerValue_material" or just "layerValue" for Set
    const parts = layerKey.split('_')
    const layerValue = parseInt(parts[0])
    const quads = greedyMeshLayer(faces, direction, layerValue)
    allQuads.push(...quads)
  }
  
  return allQuads
}

// Generate all quads for all visible faces
// Accepts either Set<string> or Map<string, any> for occupied blocks
export function generateAllQuads(occupiedBlocks: Set<string> | Map<string, any>): Quad[] {
  if (occupiedBlocks.size === 0) return []
  
  const directions: FaceDirection[] = ['top', 'bottom', 'front', 'back', 'right', 'left']
  const allQuads: Quad[] = []
  
  for (const direction of directions) {
    const quads = greedyMeshFaces(occupiedBlocks, direction)
    allQuads.push(...quads)
  }
  
  return allQuads
}

