import { Grid, type Position } from '../utils/Grid'
import { type MaterialType } from '../utils/materials'
import { type FaceDirection } from '../utils/faceCulling'
import { type DecorationPlacement, type DecorationCategory, type DecorationRule } from './types'
import { seededRandom, getFaceRotation } from './utils'
import { 
  getBrickBaseDecorations, 
  getBrickRoofDecoration, 
  brickDoorRule, 
  brickWindowRule, 
  brickPatternRule 
} from './brick'
import { 
  getWoodBaseDecorations, 
  getWoodRoofDecorations, 
  woodDoorRule, 
  woodWindowRule, 
  woodPatternRule 
} from './wood'
import { getWaterDecorations } from './water'

export * from './types'
export * from './utils'

export const DECORATION_RULES: DecorationRule[] = [
  brickDoorRule,
  brickWindowRule,
  brickPatternRule,
  woodDoorRule,
  woodWindowRule,
  woodPatternRule,
]

function selectRandomDecoration(
  matchingRules: DecorationRule[],
  blockPos: Position,
  face: FaceDirection,
  // grid is unused in this implementation but kept for signature compatibility if needed in future
  // or removed if not needed. The linter complained it was unused.
  // I will remove it from params if not used.
): string | null {
  if (matchingRules.length === 0) return null
  
  const isBrickDoorRule = matchingRules.some(rule => 
    rule.decorationNames.includes('Brick_Door_1') || 
    rule.decorationNames.includes('Brick_Door_2')
  )
  const isWoodDoorRule = matchingRules.some(rule => 
    rule.decorationNames.includes('Wood_Door_1')
  )
  
  const allDecorationNames: string[] = []
  for (const rule of matchingRules) {
    allDecorationNames.push(...rule.decorationNames)
  }
  
  let options: Array<string | null>
  if (isBrickDoorRule || isWoodDoorRule) {
    options = [...allDecorationNames, null, null, null]
  } else {
    options = [...allDecorationNames, null]
  }
  
  const seed = `${blockPos.join(',')}-${face}`
  const random = seededRandom(seed)
  
  const selectedIndex = Math.floor(random * options.length)
  return options[selectedIndex]
}

export function getDecorationPlacements(
  boardState: Map<string, MaterialType> | Grid
): DecorationPlacement[] {
  // Ensure we have a Grid
  const grid = boardState instanceof Grid ? boardState : new Grid(boardState)
  
  console.log('[Decoration] Generating decorations for board state with', grid.size, 'blocks')
  const placements: DecorationPlacement[] = []
  const horizontalFaces: FaceDirection[] = ['left', 'right', 'front', 'back']
  
  const decoratedCorners = new Set<string>()
  
  const categories: DecorationCategory[] = ['base', 'primary', 'secondary']
  const categoryDelays: Record<DecorationCategory, number> = {
    base: 50,
    primary: 600,
    secondary: 300,
  }
  
  // Iterate through all blocks
  grid.forEach((material, key) => {
    const [x, y, z] = key.split(',').map(Number)
    const blockPos: Position = [x, y, z]
    
    if (y === 0 && material !== 'water') return
    
    for (const category of categories) {
      const delay = categoryDelays[category]
      
      const visibleHorizontalFaces = horizontalFaces.filter(face => 
        grid.isFaceVisible(x, y, z, face)
      )
      
      if (category === 'base') {
        if (material === 'brick') {
          for (const face of visibleHorizontalFaces) {
            const decorationNames = getBrickBaseDecorations(blockPos, face, grid, decoratedCorners)
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
          
          if (!grid.has(x, y + 1, z)) {
            const roofDecoration = getBrickRoofDecoration(blockPos, grid)
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
        } else if (material === 'wood') {
          for (const face of visibleHorizontalFaces) {
            const decorationNames = getWoodBaseDecorations(blockPos, face, grid, decoratedCorners)
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
          
          if (!grid.has(x, y + 1, z)) {
            const woodRoofDecorations = getWoodRoofDecorations(blockPos, grid)
            for (const roof of woodRoofDecorations) {
              placements.push({
                position: blockPos,
                face: roof.face,
                decorationName: roof.decorationName,
                rotation: roof.rotation,
                delay,
              })
            }
            
            const chimneySeed = `${blockPos.join(',')}-top-chimney`
            if (seededRandom(chimneySeed) < 0.25) {
              placements.push({
                position: blockPos,
                face: 'top',
                decorationName: 'Chimney_1',
                rotation: getFaceRotation('top'),
                delay,
              })
            }
          }
        } else if (material === 'water') {
          for (const face of visibleHorizontalFaces) {
            const waterDecos = getWaterDecorations(blockPos, face, grid, delay)
            placements.push(...waterDecos)
          }
        }
      } else {
        const applicableRules = DECORATION_RULES.filter(
          rule => rule.material === material && rule.category === category
        )
        
        for (const face of visibleHorizontalFaces) {
          const matchingRules = applicableRules.filter(rule => 
            rule.faces.includes(face) && rule.check(blockPos, face, grid)
          )
          
          if (matchingRules.length > 0) {
            // Removed grid argument from selectRandomDecoration call
            const selectedName = selectRandomDecoration(matchingRules, blockPos, face)
            if (selectedName) {
              placements.push({
                position: blockPos,
                face,
                decorationName: selectedName,
                rotation: getFaceRotation(face),
                delay,
              })
            }
          }
        }
      }
    }
  })
  
  const waterDecorations = placements.filter(p => p.decorationName.startsWith('Water_') || p.decorationName.startsWith('Bubble_'))
  console.log(`[Decoration] Generated ${placements.length} total decorations (${waterDecorations.length} water-related)`)
  
  return placements
}
