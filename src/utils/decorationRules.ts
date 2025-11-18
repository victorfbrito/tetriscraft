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

// Door rule: Render on horizontal faces (left/right/front/back) of brick blocks
// All door decorations (Door_Round, Door_Straight) share the same rules
// 25% total chance (12.5% each door type, 75% none) if there's ground ahead
const doorRule: DecorationRule = {
  material: 'brick',
  category: 'primary',
  decorationNames: ['Door_Round', 'Door_Straight'],
  faces: ['left', 'right', 'front', 'back'],
  check: (blockPos, face, boardState) => {
    const [x, y, z] = blockPos
    
    // Check if there's a block on the ground right in front of the door
    let groundInFrontKey: string
    switch (face) {
      case 'left':
        // Left face faces -X direction, so check [x - 1, y - 1, z]
        groundInFrontKey = `${x - 1},${y - 1},${z}`
        break
      case 'right':
        // Right face faces +X direction, so check [x + 1, y - 1, z]
        groundInFrontKey = `${x + 1},${y - 1},${z}`
        break
      case 'front':
        // Front face faces +Z direction, so check [x, y - 1, z + 1]
        groundInFrontKey = `${x},${y - 1},${z + 1}`
        break
      case 'back':
        // Back face faces -Z direction, so check [x, y - 1, z - 1]
        groundInFrontKey = `${x},${y - 1},${z - 1}`
        break
      default:
        return false
    }
    
    const groundInFront = boardState.get(groundInFrontKey)
    
    // Place decoration only if there's a block on the ground in front (any material)
    return groundInFront !== undefined
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
  doorRule,
  windowRule,
  brickPatternRule,
]

// Get roof decoration type and rotation based on adjacent faces
// Returns [decorationName, rotation] for the roof
function getRoofDecoration(
  blockPos: Position,
  boardState: Map<string, MaterialType>
): { decorationName: string; rotation: [number, number, number] } | null {
  const [x, y, z] = blockPos
  
  // Check adjacent blocks at the same Y level (left, right, front, back)
  const leftKey = `${x - 1},${y},${z}`
  const rightKey = `${x + 1},${y},${z}`
  const frontKey = `${x},${y},${z + 1}`
  const backKey = `${x},${y},${z - 1}`
  
  const hasLeft = boardState.get(leftKey) === 'brick'
  const hasRight = boardState.get(rightKey) === 'brick'
  const hasFront = boardState.get(frontKey) === 'brick'
  const hasBack = boardState.get(backKey) === 'brick'
  
  const adjacentCount = [hasLeft, hasRight, hasFront, hasBack].filter(Boolean).length
  
  // Base rotation for top face
  const baseRotation: [number, number, number] = [-Math.PI / 2, 0, 0]
  
  switch (adjacentCount) {
    case 0:
      // No adjacent faces - Brick_Roof_5
      return {
        decorationName: 'Brick_Roof_5',
        rotation: baseRotation,
      }
    
    case 1:
      // One adjacent face - Brick_Roof_4, rotate to point opposite
      let rotation4: [number, number, number]
      if (hasLeft) {
        // Adjacent on left, point right (opposite)
        rotation4 = [-Math.PI / 2, -Math.PI / 2, 0]
      } else if (hasRight) {
        // Adjacent on right, point left (opposite)
        rotation4 = [-Math.PI / 2, Math.PI / 2, 0]
      } else if (hasFront) {
        // Adjacent on front, point back (opposite)
        rotation4 = [-Math.PI / 2, Math.PI, 0]
      } else {
        // hasBack - Adjacent on back, point front (opposite)
        rotation4 = [-Math.PI / 2, 0, 0]
      }
      return {
        decorationName: 'Brick_Roof_4',
        rotation: rotation4,
      }
    
    case 2:
      // Two adjacent faces
      if ((hasLeft && hasRight) || (hasFront && hasBack)) {
        // Opposite faces - Brick_Roof_2, face the empty side
        let rotation2: [number, number, number]
        if (hasLeft && hasRight) {
          // Left and right occupied, face front or back (whichever is empty)
          rotation2 = hasFront 
            ? [-Math.PI / 2, Math.PI, 0] // Face back
            : [-Math.PI / 2, 0, 0] // Face front
        } else {
          // Front and back occupied, face left or right (whichever is empty)
          rotation2 = hasLeft
            ? [-Math.PI / 2, -Math.PI / 2, 0] // Face right
            : [-Math.PI / 2, Math.PI / 2, 0] // Face left
        }
        return {
          decorationName: 'Brick_Roof_2',
          rotation: rotation2,
        }
      } else {
        // Corner (two adjacent sides) - Brick_Roof_3
        // Simplified rotation for now - can improve later
        // Determine which corner and rotate appropriately
        let rotation3: [number, number, number]
        if (hasLeft && hasFront) {
          // Corner: left-front, point toward back-right
          rotation3 = [-Math.PI / 2, Math.PI / 4, 0]
        } else if (hasLeft && hasBack) {
          // Corner: left-back, point toward front-right
          rotation3 = [-Math.PI / 2, -Math.PI / 4, 0]
        } else if (hasRight && hasFront) {
          // Corner: right-front, point toward back-left
          rotation3 = [-Math.PI / 2, 3 * Math.PI / 4, 0]
        } else {
          // hasRight && hasBack - Corner: right-back, point toward front-left
          rotation3 = [-Math.PI / 2, -3 * Math.PI / 4, 0]
        }
        return {
          decorationName: 'Brick_Roof_3',
          rotation: rotation3,
        }
      }
    
    case 3:
      // Three adjacent faces - Brick_Roof_1, face the empty side
      let rotation1: [number, number, number]
      if (!hasLeft) {
        // Left is empty, face left
        rotation1 = [-Math.PI / 2, Math.PI / 2, 0]
      } else if (!hasRight) {
        // Right is empty, face right
        rotation1 = [-Math.PI / 2, -Math.PI / 2, 0]
      } else if (!hasFront) {
        // Front is empty, face front
        rotation1 = [-Math.PI / 2, 0, 0]
      } else {
        // Back is empty, face back
        rotation1 = [-Math.PI / 2, Math.PI, 0]
      }
      return {
        decorationName: 'Brick_Roof_1',
        rotation: rotation1,
      }
    
    case 4:
      // All four sides have blocks - no roof needed (shouldn't happen if top face is visible)
      return null
    
    default:
      return null
  }
}

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

// Deterministic seeded random function based on position and face
// This ensures the same block/face combination always produces the same "random" result
function seededRandom(seed: string): number {
  let hash = 0
  for (let i = 0; i < seed.length; i++) {
    const char = seed.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash | 0 // Convert to 32-bit integer
  }
  // Convert to 0-1 range
  return Math.abs(hash) / 2147483647
}

// Random selection: equal frequency for all decoration options including "none"
// Special case: doors have 25% total chance (12.5% each door type, 75% none)
// Returns the selected decoration name, or null if no decoration should be placed
// Uses deterministic seeded random based on block position and face
function selectRandomDecoration(
  matchingRules: DecorationRule[],
  blockPos: Position,
  face: FaceDirection
): string | null {
  if (matchingRules.length === 0) {
    return null
  }
  
  // Check if this is a door rule (has Door_Round or Door_Straight)
  const isDoorRule = matchingRules.some(rule => 
    rule.decorationNames.includes('Door_Round') || 
    rule.decorationNames.includes('Door_Straight')
  )
  
  // Collect all possible decoration names from all matching rules
  const allDecorationNames: string[] = []
  for (const rule of matchingRules) {
    allDecorationNames.push(...rule.decorationNames)
  }
  
  // Create options array with weighted probabilities
  let options: Array<string | null>
  if (isDoorRule) {
    // Doors: 25% total (12.5% each door type), 75% none
    // Add "none" 3 times to give it 3x weight (3/4 = 75%)
    options = [...allDecorationNames, null, null, null]
  } else {
    // Other decorations: equal frequency for all options including "none"
    options = [...allDecorationNames, null]
  }
  
  // Create a seed from block position and face for deterministic randomness
  const seed = `${blockPos.join(',')}-${face}`
  const random = seededRandom(seed)
  
  // Select one option with weighted probability
  const selectedIndex = Math.floor(random * options.length)
  return options[selectedIndex]
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
          
          // Add roof decoration on top face if there's no block above
          // Check if there's no block directly above (which also means top face is visible)
          const blockAboveKey = `${x},${y + 1},${z}`
          const blockAbove = boardState.get(blockAboveKey)
          // Only place roof if there's no block above at all (undefined)
          if (blockAbove === undefined) {
            const roofDecoration = getRoofDecoration(blockPos, boardState)
            if (roofDecoration) {
              placements.push({
                position: blockPos,
                face: 'top',
                decorationName: roofDecoration.decorationName,
                rotation: roofDecoration.rotation,
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
            // Uses deterministic seeded random based on block position and face
            const selectedDecorationName = selectRandomDecoration(matchingRules, blockPos, face)
            
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

