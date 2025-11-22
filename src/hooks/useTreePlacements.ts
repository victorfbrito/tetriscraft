import { useState, useEffect, useCallback, useRef } from 'react'
import { type MaterialType } from '../utils/materials'
import { type TetrominoType } from '../components/game/Tetromino'
import { getGrassBlockPositions, generateTreePlacements, type TreePlacement } from '../utils/treeGeneration'

type Position = [number, number, number]
type Rotation = 0 | 90 | 180 | 270

type TreePlacementWithState = TreePlacement & {
  id: string
  removing: boolean
}

/**
 * Check if a tree position is under a tetromino block
 * A tree is "under" if it's within the block's X/Z bounds and the block is at or above the tree's Y level
 */
function isTreeUnderBlock(
  treePos: Position,
  blockPos: Position
): boolean {
  const [treeX, treeY, treeZ] = treePos
  const [blockX, blockY, blockZ] = blockPos
  
  // Check if tree is within block's X/Z bounds (block extends from blockX-0.5 to blockX+0.5)
  const withinX = treeX >= blockX - 0.5 && treeX <= blockX + 0.5
  const withinZ = treeZ >= blockZ - 0.5 && treeZ <= blockZ + 0.5
  
  // Check if block is at or above tree's Y level
  // Trees are positioned at blockY + 0.5, so we check if the new block's Y is >= tree's block Y
  // Tree's block Y is treeY - 0.5 (since tree is at blockY + 0.5)
  const treeBlockY = treeY - 0.5
  const blockAboveTree = blockY >= treeBlockY
  
  return withinX && withinZ && blockAboveTree
}

/**
 * Hook to manage procedural tree placements
 * Generates trees on initial load and when new grass blocks are added
 */
export function useTreePlacements(
  boardSize: number,
  boardState: Map<string, MaterialType>,
  getTetrominoBlockPositions: (
    type: TetrominoType,
    position: Position,
    rotation: Rotation
  ) => Position[]
) {
  const [treePlacements, setTreePlacements] = useState<TreePlacementWithState[]>([])
  const processedBlocksRef = useRef<Set<string>>(new Set())
  const isInitializedRef = useRef(false)
  const nextTreeIdRef = useRef(0)

  // Generate initial trees on mount
  useEffect(() => {
    if (isInitializedRef.current) return
    
    const grassBlocks = getGrassBlockPositions(boardSize, boardState)
    
    if (grassBlocks.length > 0) {
      // Generate trees for all initial blocks
      const placements = generateTreePlacements(grassBlocks)
      
      // Add unique IDs and removing state
      const placementsWithState: TreePlacementWithState[] = placements.map((placement) => ({
        ...placement,
        id: `tree-${nextTreeIdRef.current++}`,
        removing: false,
      }))
      
      setTreePlacements(placementsWithState)
      
      // Mark all blocks as processed
      grassBlocks.forEach((block) => {
        processedBlocksRef.current.add(`${block.x},${block.y},${block.z}`)
      })
      
      isInitializedRef.current = true
    }
  }, [boardSize, boardState])

  // Function to add trees for a newly placed tetromino
  const addTreesForTetromino = useCallback(
    (
      type: TetrominoType,
      position: Position,
      rotation: Rotation,
      material: MaterialType
    ) => {
      // Only process grass tetrominos
      if (material !== 'grass') return

      const blockPositions = getTetrominoBlockPositions(type, position, rotation)
      
      // Filter to only grass blocks that haven't been processed
      const newGrassBlocks = blockPositions
        .map(([x, y, z]) => ({ x, y, z }))
        .filter((block) => !processedBlocksRef.current.has(`${block.x},${block.y},${block.z}`))

      if (newGrassBlocks.length > 0) {
        // Generate trees for new grass blocks
        const newPlacements = generateTreePlacements(newGrassBlocks)
        
        // Add unique IDs and removing state
        const newPlacementsWithState: TreePlacementWithState[] = newPlacements.map((placement) => ({
          ...placement,
          id: `tree-${nextTreeIdRef.current++}`,
          removing: false,
        }))
        
        // Add new placements
        setTreePlacements((prev) => [...prev, ...newPlacementsWithState])
        
        // Mark blocks as processed
        newGrassBlocks.forEach((block) => {
          processedBlocksRef.current.add(`${block.x},${block.y},${block.z}`)
        })
      }
    },
    [getTetrominoBlockPositions]
  )

  // Function to remove trees that are under a dropped tetromino
  const removeTreesUnderTetromino = useCallback(
    (
      type: TetrominoType,
      position: Position,
      rotation: Rotation
    ) => {
      const blockPositions = getTetrominoBlockPositions(type, position, rotation)
      
      setTreePlacements((prev) => {
        return prev.map((tree) => {
          // Check if this tree is under any of the tetromino blocks
          const isUnderBlock = blockPositions.some((blockPos) =>
            isTreeUnderBlock(tree.position, blockPos)
          )
          
          if (isUnderBlock && !tree.removing) {
            // Mark tree for removal (will trigger animation)
            return { ...tree, removing: true }
          }
          
          return tree
        })
      })
    },
    [getTetrominoBlockPositions]
  )

  // Function to remove a tree after animation completes
  const removeTree = useCallback((treeId: string) => {
    setTreePlacements((prev) => prev.filter((tree) => tree.id !== treeId))
  }, [])

  return {
    treePlacements,
    addTreesForTetromino,
    removeTreesUnderTetromino,
    removeTree,
  }
}
