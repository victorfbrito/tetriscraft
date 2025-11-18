type Position = [number, number, number]
type BlockPosition = { x: number; y: number; z: number }

export type TreePlacement = {
  position: Position
  treeId: number
  swayOffset: number
  rotation: [number, number, number]
}

// 4 possible tree positions on a block face (0.20 from borders)
const TREE_OFFSETS: Array<{ x: number; z: number }> = [
  { x: 0.20, z: 0.20 }, // Bottom-left
  { x: 0.20, z: 0.80 }, // Top-left
  { x: 0.80, z: 0.80 }, // Top-right
  { x: 0.80, z: 0.20 }, // Bottom-right
]

// Diagonal opposite pairs
const DIAGONAL_PAIRS: Array<[number, number]> = [
  [0, 2], // (0.20, 0.20) and (0.80, 0.80)
  [1, 3], // (0.20, 0.80) and (0.80, 0.20)
]

/**
 * Get all grass block positions from base board and placed blocks
 */
export function getGrassBlockPositions(
  boardSize: number,
  boardState: Map<string, string>
): BlockPosition[] {
  const positions: BlockPosition[] = []
  
  // Board bounds
  const minCoord = 1 - Math.floor(boardSize / 2)
  const maxCoord = 1 + Math.floor((boardSize - 1) / 2)
  
  // Add base board grass blocks (Y=0)
  for (let x = minCoord; x <= maxCoord; x++) {
    for (let z = minCoord; z <= maxCoord; z++) {
      positions.push({ x, y: 0, z })
    }
  }
  
  // Add placed grass blocks from boardState
  boardState.forEach((material, key) => {
    if (material === 'grass') {
      const [x, y, z] = key.split(',').map(Number)
      positions.push({ x, y, z })
    }
  })
  
  return positions
}

/**
 * Calculate tree positions for a single grass block
 * Returns 0, 1, or 2 tree positions (if 2, they're diagonally opposite)
 */
function getTreePositionsForBlock(
  blockPos: BlockPosition,
  treeCount: number
): Array<{ x: number; y: number; z: number }> {
  if (treeCount === 0) return []
  
  const positions: Array<{ x: number; y: number; z: number }> = []
  
  if (treeCount === 1) {
    // Randomly select one of the 4 positions
    const offset = TREE_OFFSETS[Math.floor(Math.random() * TREE_OFFSETS.length)]
    // Block center is at (blockPos.x, blockPos.y, blockPos.z)
    // Block face extends from (blockPos.x - 0.5, blockPos.y, blockPos.z - 0.5) to (blockPos.x + 0.5, blockPos.y, blockPos.z + 0.5)
    // Tree position at offset (0.20, 0.20) from bottom-left corner:
    // x = (blockPos.x - 0.5) + 0.20 = blockPos.x - 0.3
    // z = (blockPos.z - 0.5) + 0.20 = blockPos.z - 0.3
    positions.push({
      x: blockPos.x - 0.5 + offset.x, // offset.x is 0.20 or 0.80
      y: blockPos.y + 0.5, // On top of block (block is 1 unit tall)
      z: blockPos.z - 0.5 + offset.z, // offset.z is 0.20 or 0.80
    })
  } else if (treeCount === 2) {
    // Select one diagonal pair
    const pair = DIAGONAL_PAIRS[Math.floor(Math.random() * DIAGONAL_PAIRS.length)]
    pair.forEach((index) => {
      const offset = TREE_OFFSETS[index]
      positions.push({
        x: blockPos.x - 0.5 + offset.x,
        y: blockPos.y + 0.5,
        z: blockPos.z - 0.5 + offset.z,
      })
    })
  }
  
  return positions
}

// Tree spawn density (0.0 to 1.0)
// Lower values = fewer trees, higher values = more trees
// Default: 0.6 means 60% of blocks will have trees (reduced from 100%)
export const TREE_SPAWN_DENSITY = 0.4

/**
 * Generate tree placements for grass blocks with natural variation
 */
export function generateTreePlacements(
  grassBlocks: BlockPosition[],
  availableTreeIds: number[] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
  spawnDensity: number = TREE_SPAWN_DENSITY
): TreePlacement[] {
  const placements: TreePlacement[] = []
  let treeIdIndex = 0
  
  grassBlocks.forEach((block) => {
    // First check if this block should have trees based on density
    if (Math.random() > spawnDensity) {
      return // Skip this block
    }
    
    // Natural variation: 40% chance of 0 trees, 40% chance of 1 tree, 20% chance of 2 trees
    const rand = Math.random()
    let treeCount = 0
    if (rand < 0.4) {
      treeCount = 0
    } else if (rand < 0.8) {
      treeCount = 1
    } else {
      treeCount = 2
    }
    
    // Create cluster effect: if nearby blocks have trees, increase probability
    // (Simple implementation: check if adjacent blocks will have trees)
    
    if (treeCount > 0) {
      const treePositions = getTreePositionsForBlock(block, treeCount)
      
      treePositions.forEach((pos) => {
        const treeId = availableTreeIds[treeIdIndex % availableTreeIds.length]
        treeIdIndex++
        
        placements.push({
          position: [pos.x, pos.y, pos.z],
          treeId,
          swayOffset: Math.random() * 6, // Random sway offset for animation variation
          rotation: [0, Math.random() * Math.PI * 2, 0], // Random Y-axis rotation
        })
      })
    }
  })
  
  return placements
}

