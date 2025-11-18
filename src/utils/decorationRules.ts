import { type MaterialType } from './materials'
import { type FaceDirection, isFaceVisible } from './faceCulling'

type Position = [number, number, number]

export type DecorationCategory = 'base' | 'primary' | 'secondary'

export interface DecorationPlacement {
  position: Position
  face: FaceDirection
  decorationName: string
  rotation: [number, number, number]
  delay: number
}

export interface DecorationRule {
  material: MaterialType
  category: DecorationCategory
  decorationNames: string[] // Array of decoration names that share the same rule
  faces: FaceDirection[]
  check: (
    blockPos: Position,
    face: FaceDirection,
    boardState: Map<string, MaterialType>
  ) => boolean
}

// Corner detection for base decorations using matrix approach
// Matrix: [A, B, C] where B is current block, facing E
//         [D, E, F]
// Right corner: if (no cube in A OR cube in D) then right corner
// Left corner: if (no cube in C OR cube in F) then left corner
// Returns [hasLeftCorner, hasRightCorner] for a given face
function detectCorners(
  blockPos: Position,
  face: FaceDirection,
  boardState: Map<string, MaterialType>
): [boolean, boolean] {
  const [x, y, z] = blockPos
  let aKey: string  // Left side of current block
  let cKey: string  // Right side of current block
  let dKey: string  // Diagonal left-front
  let fKey: string  // Diagonal right-front
  
  switch (face) {
    case 'front': // facing +Z
      aKey = `${x - 1},${y},${z}`      // A: left side
      cKey = `${x + 1},${y},${z}`     // C: right side
      dKey = `${x - 1},${y},${z + 1}` // D: diagonal left-front
      fKey = `${x + 1},${y},${z + 1}` // F: diagonal right-front
      break
    case 'back': // facing -Z
      aKey = `${x + 1},${y},${z}`      // A: left side (from back perspective)
      cKey = `${x - 1},${y},${z}`     // C: right side (from back perspective)
      dKey = `${x + 1},${y},${z - 1}` // D: diagonal left-front
      fKey = `${x - 1},${y},${z - 1}` // F: diagonal right-front
      break
    case 'left': // facing -X
      aKey = `${x},${y},${z - 1}`      // A: left side (back from face perspective)
      cKey = `${x},${y},${z + 1}`     // C: right side (front from face perspective)
      dKey = `${x - 1},${y},${z - 1}` // D: diagonal left-front
      fKey = `${x - 1},${y},${z + 1}` // F: diagonal right-front
      break
    case 'right': // facing +X
      aKey = `${x},${y},${z + 1}`      // A: left side (front from face perspective)
      cKey = `${x},${y},${z - 1}`     // C: right side (back from face perspective)
      dKey = `${x + 1},${y},${z + 1}` // D: diagonal left-front
      fKey = `${x + 1},${y},${z - 1}` // F: diagonal right-front
      break
    default:
      // Top and bottom faces don't have corners in this context
      return [false, false]
  }
  
  // Only consider brick blocks (ignore grass base board and other materials)
  const hasA = boardState.get(aKey) === 'brick'
  const hasC = boardState.get(cKey) === 'brick'
  const hasD = boardState.get(dKey) === 'brick'
  const hasF = boardState.get(fKey) === 'brick'
  
  // Right corner: detected when there's a block on left (A) but not on right (C), creating internal angle
  // OR when there's a diagonal block (D) that creates a corner
  const hasRightCorner = (hasA && !hasC) || hasD
  
  // Left corner: detected when there's a block on right (C) but not on left (A), creating internal angle
  // OR when there's a diagonal block (F) that creates a corner
  const hasLeftCorner = (hasC && !hasA) || hasF
  
  return [hasLeftCorner, hasRightCorner]
}

// Get a unique key for a corner position to prevent duplicate decorations
// A corner is identified by its world position (x, y, z) where x and z are at block edges
function getCornerKey(
  blockPos: Position,
  face: FaceDirection,
  isLeftCorner: boolean
): string {
  const [x, y, z] = blockPos
  
  // Calculate the actual corner position in world space
  // Corners are at block edges (x ± 0.5, z ± 0.5)
  let cornerX: number
  let cornerZ: number
  
  if (isLeftCorner) {
    // Left corner: on the left edge of the face
    switch (face) {
      case 'front':
        cornerX = x - 0.5
        cornerZ = z + 0.5
        break
      case 'back':
        cornerX = x + 0.5
        cornerZ = z - 0.5
        break
      case 'left':
        cornerX = x - 0.5
        cornerZ = z - 0.5
        break
      case 'right':
        cornerX = x + 0.5
        cornerZ = z + 0.5
        break
      default:
        return ''
    }
  } else {
    // Right corner: on the right edge of the face
    switch (face) {
      case 'front':
        cornerX = x + 0.5
        cornerZ = z + 0.5
        break
      case 'back':
        cornerX = x - 0.5
        cornerZ = z - 0.5
        break
      case 'left':
        cornerX = x - 0.5
        cornerZ = z + 0.5
        break
      case 'right':
        cornerX = x + 0.5
        cornerZ = z - 0.5
        break
      default:
        return ''
    }
  }
  
  // Return a unique key for this corner position
  return `corner_${cornerX}_${y}_${cornerZ}`
}

// Generate base decorations for a face
// Returns array of decoration names that should be placed on this face
function getBaseDecorations(
  blockPos: Position,
  face: FaceDirection,
  boardState: Map<string, MaterialType>,
  decoratedCorners: Set<string>
): string[] {
  const decorations: string[] = []
  const [x, y, z] = blockPos
  
  // 1. Always add Brick_Wall_Top
  decorations.push('Brick_Wall_Top')
  
  // 2. Add Brick_Wall_Bottom if there's NO brick block directly below
  const blockBelowKey = `${x},${y - 1},${z}`
  const blockBelow = boardState.get(blockBelowKey)
  if (blockBelow !== 'brick') {
    decorations.push('Brick_Wall_Bottom')
  }
  
  // 3. Detect corners and add corner decorations (with deduplication)
  const [hasLeftCorner, hasRightCorner] = detectCorners(blockPos, face, boardState)
  
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

// Door_Round rule: Render on horizontal faces (left/right) of brick blocks
// if there's no brick block on the left/right side (from the face's perspective)
// AND there's a block on the ground right in front of the door (safety check)
// For a left/right face, "left" and "right" refer to positions along the Z-axis
const doorRoundRule: DecorationRule = {
  material: 'brick',
  category: 'primary',
  decorationNames: ['Door_Round'],
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

// Door_Straight rule: Similar to Door_Round but with different conditions
// TODO: Add specific rules for Door_Straight
const doorStraightRule: DecorationRule = {
  material: 'brick',
  category: 'primary',
  decorationNames: ['Door_Straight'],
  faces: ['left', 'right'],
  check: (blockPos, face, boardState) => {
    // Placeholder: same logic as Door_Round for now
    // TODO: Implement specific Door_Straight rules
    return doorRoundRule.check(blockPos, face, boardState)
  },
}

// Window rule: Render on horizontal faces of brick blocks
// All window decorations (Window_1, Window_2) share the same rules
// No specific placement rules - uses random chance on all valid faces
const windowRule: DecorationRule = {
  material: 'brick',
  category: 'primary',
  decorationNames: ['Window_1', 'Window_2'],
  faces: ['left', 'right', 'front', 'back'],
  check: (_blockPos, _face, _boardState) => {
    // Always return true - random selection logic will decide placement
    return true
  },
}

// Brick_Pattern rule: Secondary decoration
// All brick pattern decorations (Brick_Pattern_1, Brick_Pattern_2, Brick_Pattern_3) share the same rules
// No specific placement rules - uses random chance on all valid faces
const brickPatternRule: DecorationRule = {
  material: 'brick',
  category: 'secondary',
  decorationNames: ['Brick_Pattern_1', 'Brick_Pattern_2', 'Brick_Pattern_3'],
  faces: ['left', 'right', 'front', 'back'],
  check: (_blockPos, _face, _boardState) => {
    // Always return true - random selection logic will decide placement
    return true
  },
}

// Export all decoration rules
export const DECORATION_RULES: DecorationRule[] = [
  doorRoundRule,
  doorStraightRule,
  windowRule,
  brickPatternRule,
]

// Calculate rotation based on face direction
function getFaceRotation(face: FaceDirection): [number, number, number] {
  switch (face) {
    case 'left':
      // Left face: rotate to face outward (toward negative X)
      return [0, Math.PI / 2, 0]
    case 'right':
      // Right face: rotate to face outward (toward positive X)
      return [0, -Math.PI / 2, 0]
    case 'front':
      // Front face: rotate to face outward (toward positive Z)
      return [0, Math.PI, 0]
    case 'back':
      // Back face: rotate to face outward (toward negative Z)
      return [0, 0, 0]
    case 'top':
      // Top face: rotate to face upward
      return [-Math.PI / 2, 0, 0]
    case 'bottom':
      // Bottom face: rotate to face downward
      return [Math.PI / 2, 0, 0]
    default:
      return [0, 0, 0]
  }
}

// Random selection: 50% chance for "none", remaining 50% split equally among matching decorations
// Returns the selected decoration name, or null if no decoration should be placed
function selectRandomDecoration(matchingRules: DecorationRule[]): string | null {
  if (matchingRules.length === 0) {
    return null
  }
  
  // 50% chance to return nothing
  if (Math.random() < 0.5) {
    return null
  }
  
  // 50% chance to randomly select one matching rule
  const randomRuleIndex = Math.floor(Math.random() * matchingRules.length)
  const selectedRule = matchingRules[randomRuleIndex]
  
  // Randomly select one decoration name from the rule's decorationNames array
  const randomDecorationIndex = Math.floor(Math.random() * selectedRule.decorationNames.length)
  return selectedRule.decorationNames[randomDecorationIndex]
}

// Get all decoration placements for a given board state
export function getDecorationPlacements(
  boardState: Map<string, MaterialType>
): DecorationPlacement[] {
  const placements: DecorationPlacement[] = []
  const horizontalFaces: FaceDirection[] = ['left', 'right', 'front', 'back']
  
  // Track decorated corners to prevent duplicates when corners are shared between faces
  const decoratedCorners = new Set<string>()
  
  // Process decorations by category: base, primary, secondary
  const categories: DecorationCategory[] = ['base', 'primary', 'secondary']
  const categoryDelays: Record<DecorationCategory, number> = {
    base: 50,
    primary: 600,
    secondary: 300,
  }
  
  // Iterate through all blocks in board state
  for (const [key, material] of boardState.entries()) {
    const [x, y, z] = key.split(',').map(Number) as Position
    const blockPos: Position = [x, y, z]
    
    // Skip base board blocks (Y=0) - decorations should only be on placed blocks above the base
    if (y === 0) {
      continue
    }
    
    // Process each category
    for (const category of categories) {
      const delay = categoryDelays[category]
      
      // Get all visible horizontal faces for this block
      const visibleHorizontalFaces = horizontalFaces.filter(face => 
        isFaceVisible(blockPos, face, boardState)
      )
      
      if (category === 'base') {
        // Base decorations: render multiple decorations on visible horizontal faces of brick blocks
        if (material === 'brick') {
          for (const face of visibleHorizontalFaces) {
            // Get all base decorations for this face (Top, Bottom, Corner_1, Corner_2)
            const decorationNames = getBaseDecorations(blockPos, face, boardState, decoratedCorners)
            
            // Create a placement for each decoration
            for (const decorationName of decorationNames) {
              placements.push({
                position: blockPos,
                face,
                decorationName,
                rotation: getFaceRotation(face),
                delay,
              })
            }
          }
        }
      } else {
        // Primary and secondary decorations: apply rule checks, then random selection
        const applicableRules = DECORATION_RULES.filter(
          rule => rule.material === material && rule.category === category
        )
        
        // Group matching decorations by face
        for (const face of visibleHorizontalFaces) {
          const matchingRules = applicableRules.filter(rule => 
            rule.faces.includes(face) && rule.check(blockPos, face, boardState)
          )
          
          if (matchingRules.length > 0) {
            // Random selection: 50% none, 50% one of the matching decorations
            const selectedDecorationName = selectRandomDecoration(matchingRules)
            
            if (selectedDecorationName) {
              placements.push({
                position: blockPos,
                face,
                decorationName: selectedDecorationName,
                rotation: getFaceRotation(face),
                delay,
              })
            }
          }
        }
      }
    }
  }
  
  return placements
}

