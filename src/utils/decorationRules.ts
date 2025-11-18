import { type MaterialType } from './materials'
import { type FaceDirection, isFaceVisible } from './faceCulling'

type Position = [number, number, number]

export interface DecorationPlacement {
  position: Position
  face: FaceDirection
  decorationName: string
  rotation: [number, number, number]
}

export interface DecorationRule {
  material: MaterialType
  decorationName: string
  faces: FaceDirection[]
  check: (
    blockPos: Position,
    face: FaceDirection,
    boardState: Map<string, MaterialType>
  ) => boolean
}

// Door_Round rule: Render on horizontal faces (left/right) of brick blocks
// if there's no brick block on the left/right side (from the face's perspective)
// AND there's a block on the ground right in front of the door (safety check)
// For a left/right face, "left" and "right" refer to positions along the Z-axis
const doorRoundRule: DecorationRule = {
  material: 'brick',
  decorationName: 'Door_Round',
  faces: ['left', 'right'],
  check: (blockPos, face, boardState) => {
    const [x, y, z] = blockPos
    
    // For left/right faces, check positions along Z-axis (perpendicular to the face)
    // "Left" from face perspective is +Z, "Right" is -Z
    // Both positions should NOT have brick blocks for decoration to be placed
    const leftSideKey = `${x},${y},${z + 1}` // +Z direction
    const rightSideKey = `${x},${y},${z - 1}` // -Z direction
    
    const leftSideBlock = boardState.get(leftSideKey)
    const rightSideBlock = boardState.get(rightSideKey)
    
    // Check if both left and right sides (along Z-axis) don't have brick blocks
    const hasSpaceOnSides = leftSideBlock !== 'brick' && rightSideBlock !== 'brick'
    if (!hasSpaceOnSides) {
      return false
    }
    
    // Check if there's a block on the ground right in front of the door
    // Left face faces -X direction, so check [x - 1, y - 1, z]
    // Right face faces +X direction, so check [x + 1, y - 1, z]
    let groundInFrontKey: string
    if (face === 'left') {
      groundInFrontKey = `${x - 1},${y - 1},${z}` // One block left (in -X) and one block down
    } else {
      // face === 'right'
      groundInFrontKey = `${x + 1},${y - 1},${z}` // One block right (in +X) and one block down
    }
    
    const groundInFront = boardState.get(groundInFrontKey)
    
    // Place decoration only if there's a block on the ground in front (any material)
    return groundInFront !== undefined
  },
}

// Export all decoration rules
export const DECORATION_RULES: DecorationRule[] = [doorRoundRule]

// Get all decoration placements for a given board state
export function getDecorationPlacements(
  boardState: Map<string, MaterialType>
): DecorationPlacement[] {
  const placements: DecorationPlacement[] = []
  
  // Iterate through all blocks in board state
  for (const [key, material] of boardState.entries()) {
    const [x, y, z] = key.split(',').map(Number) as Position
    const blockPos: Position = [x, y, z]
    
    // Skip base board blocks (Y=0) - decorations should only be on placed blocks above the base
    if (y === 0) {
      continue
    }
    
    // Check all rules that match this material
    const applicableRules = DECORATION_RULES.filter(rule => rule.material === material)
    
    for (const rule of applicableRules) {
      // Check each face specified in the rule
      for (const face of rule.faces) {
        // Only place decorations on visible faces (not covered by adjacent blocks)
        if (!isFaceVisible(blockPos, face, boardState)) {
          continue
        }
        
        // Check if this face should have a decoration
        if (rule.check(blockPos, face, boardState)) {
          // Calculate rotation based on face direction
          // Assumes decoration models are correctly oriented in Blender (vertical for doors on vertical faces)
          let rotation: [number, number, number] = [0, 0, 0]
          
          if (face === 'left') {
            // Left face: rotate to face outward (toward negative X)
            rotation = [0, Math.PI / 2, 0]
          } else if (face === 'right') {
            // Right face: rotate to face outward (toward positive X)
            rotation = [0, -Math.PI / 2, 0]
          } else if (face === 'front') {
            // Front face: rotate to face outward (toward positive Z)
            rotation = [0, 0, 0]
          } else if (face === 'back') {
            // Back face: rotate to face outward (toward negative Z)
            rotation = [0, Math.PI, 0]
          } else if (face === 'top') {
            // Top face: rotate to face upward
            rotation = [-Math.PI / 2, 0, 0]
          } else if (face === 'bottom') {
            // Bottom face: rotate to face downward
            rotation = [Math.PI / 2, 0, 0]
          }
          
          placements.push({
            position: blockPos,
            face,
            decorationName: rule.decorationName,
            rotation,
          })
        }
      }
    }
  }
  
  return placements
}

