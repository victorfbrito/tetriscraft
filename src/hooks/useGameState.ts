import { useState, useCallback, useMemo } from 'react'
import { type TetrominoType, getRotatedPositions } from '../components/Tetromino'
import { type MaterialType } from '../utils/materials'

type Position = [number, number, number]
type Rotation = 0 | 90 | 180 | 270

// Get material type from tetromino type name
function getMaterialFromType(type: TetrominoType): MaterialType {
  if (type.startsWith('GRASS_')) return 'grass'
  if (type.startsWith('BRICK_')) return 'brick'
  if (type.startsWith('WOOD_')) return 'wood'
  // Fallback (should never happen)
  return 'grass'
}

// Generate random tetromino type
function getRandomTetromino(): TetrominoType {
  const types: TetrominoType[] = [
    'GRASS_SQUARE',
    'GRASS_L',
    'GRASS_T',
    'GRASS_1X4',
    'GRASS_STAIR',
    'BRICK_SINGLE',
    'BRICK_VERTICAL',
    'BRICK_ARROW',
    'BRICK_ARK',
    'BRICK_2X3',
    'WOOD_SINGLE',
    'WOOD_VERTICAL',
    'WOOD_ARROW',
    'WOOD_DOUBLE',
  ]
  return types[Math.floor(Math.random() * types.length)]
}

export function useGameState() {
  // Queue of tetrominoes with materials (first one is next to use)
  // Material is derived from tetromino type name
  const [queue, setQueue] = useState<Array<{ type: TetrominoType; material: MaterialType }>>(() => 
    Array.from({ length: 5 }, () => {
      const type = getRandomTetromino()
      return {
        type,
        material: getMaterialFromType(type),
      }
    })
  )

  // Active tetromino (null when none selected)
  const [activeTetromino, setActiveTetromino] = useState<{
    type: TetrominoType
    position: Position
    rotation: Rotation
    material: MaterialType
  } | null>(null)

  // Animation state for dropping tetromino
  const [droppingTetromino, setDroppingTetromino] = useState<{
    type: TetrominoType
    startPosition: Position
    endPosition: Position
    rotation: Rotation
    material: MaterialType
    onComplete: () => void
  } | null>(null)

  // Get block positions for a tetromino at given position and rotation
  const getTetrominoBlockPositions = useCallback((
    type: TetrominoType,
    position: Position,
    rotation: Rotation
  ): Position[] => {
    const relativePositions = getRotatedPositions(type, rotation)
    // Positions are already integers, so no rounding needed
    return relativePositions.map(([rx, ry, rz]) => [
      position[0] + rx,
      position[1] + ry,
      position[2] + rz,
    ] as Position)
  }, [])

  // Board size constant (should match Board component default size)
  const BOARD_SIZE = 16
  
  // Initialize board with base board grass blocks only
  const initializeBoard = (): [Map<string, MaterialType>, number] => {
    const initialBoardState = new Map<string, MaterialType>()
    
    // Calculate board bounds for integer grid (center at [1, 1, 1])
    const minCoord = 1 - Math.floor(BOARD_SIZE / 2)
    const maxCoord = 1 + Math.floor((BOARD_SIZE - 1) / 2)
    
    // Add base board grass blocks at Y=0
    for (let x = minCoord; x <= maxCoord; x++) {
      for (let z = minCoord; z <= maxCoord; z++) {
        const key = `${x},0,${z}`
        initialBoardState.set(key, 'grass')
      }
    }
    
    // Highest Y is 0 (base board level)
    return [initialBoardState, 0]
  }

  // Board state: Map of occupied positions to materials "x,y,z" -> MaterialType
  const [boardState, setBoardState] = useState<Map<string, MaterialType>>(() => {
    const [initialState] = initializeBoard()
    return initialState
  })

  // Highest block Y position on board
  const [highestY, setHighestY] = useState<number>(() => {
    const [, initialHighestY] = initializeBoard()
    return initialHighestY
  })

  // Selected queue index
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null)
  // Calculate board bounds for integer grid (center at [1, 1, 1])
  // For size 16: minCoord = 1 - floor(16/2) = -7, maxCoord = 1 + floor(15/2) = 8
  const BOARD_MIN = 1 - Math.floor(BOARD_SIZE / 2) // -7 for size 16
  const BOARD_MAX = 1 + Math.floor((BOARD_SIZE - 1) / 2) // 8 for size 16

  // Get the material of the block directly below a position
  const getBlockBelow = useCallback((
    x: number,
    y: number,
    z: number,
    boardState: Map<string, MaterialType>
  ): MaterialType | null => {
    const key = `${x},${y - 1},${z}`
    return boardState.get(key) || null
  }, [])

  // Check if a block has an adjacent block of the same material that's supported
  // For floating rule: adjacent block must be at same Y level, same material, and have support below
  const hasAdjacentSameMaterialSupport = useCallback((
    blockPos: Position,
    material: MaterialType,
    boardState: Map<string, MaterialType>
  ): boolean => {
    const [x, y, z] = blockPos
    // Check 4 adjacent positions at the same Y level (north, south, east, west)
    const adjacentPositions: Position[] = [
      [x + 1, y, z], // East
      [x - 1, y, z], // West
      [x, y, z + 1], // North
      [x, y, z - 1], // South
    ]

    for (const [ax, ay, az] of adjacentPositions) {
      const adjacentKey = `${ax},${ay},${az}`
      const adjacentMaterial = boardState.get(adjacentKey)
      
      // If adjacent block exists and is same material at same Y level
      if (adjacentMaterial === material) {
        // Check if that adjacent block has support below it (has a block directly below)
        const belowKey = `${ax},${ay - 1},${az}`
        if (boardState.has(belowKey)) {
          return true // Found adjacent same-material block with support
        }
      }
    }
    
    return false
  }, [])

  // Check if a block position is valid according to material-based rules
  // Also checks if adjacent blocks in the same tetromino provide support for floating
  const isValidBlockPlacement = useCallback((
    blockPos: Position,
    material: MaterialType,
    boardState: Map<string, MaterialType>,
    tetrominoBlockPositions?: Position[] // All blocks in the tetromino being placed
  ): boolean => {
    const [x, y, z] = blockPos
    
    // Check board bounds
    if (x < BOARD_MIN || x > BOARD_MAX || z < BOARD_MIN || z > BOARD_MAX) return false
    // Check if position is occupied
    const key = `${x},${y},${z}`
    if (boardState.has(key)) return false
    // Check collision with board surface
    if (y <= 0) return false

    const blockBelow = getBlockBelow(x, y, z, boardState)

    // Rule 4: Grass blocks ALWAYS need grass below
    if (material === 'grass') {
      return blockBelow === 'grass'
    }

    // Rule 1: Wood blocks can be above any block
    if (material === 'wood') {
      if (blockBelow !== null) {
        return true // Has support below
      }
      // Rule 3: Wood can float if adjacent same-material block (in tetromino or board) is supported
      // First check if adjacent block in same tetromino has support
      if (tetrominoBlockPositions) {
        const adjacentPositions: Position[] = [
          [x + 1, y, z], [x - 1, y, z], [x, y, z + 1], [x, y, z - 1],
        ]
        for (const [ax, ay, az] of adjacentPositions) {
          // Check if this adjacent position is part of the tetromino
          const isInTetromino = tetrominoBlockPositions.some(
            ([tx, ty, tz]) => tx === ax && ty === ay && tz === az
          )
          if (isInTetromino) {
            // Check if this adjacent block has support below
            const adjBlockBelow = getBlockBelow(ax, ay, az, boardState)
            if (adjBlockBelow !== null) {
              return true // Adjacent block in tetromino has support
            }
          }
        }
      }
      // Also check boardState for adjacent same-material blocks with support
      return hasAdjacentSameMaterialSupport(blockPos, material, boardState)
    }

    // Rule 2: Brick blocks can be above brick or grass
    if (material === 'brick') {
      if (blockBelow === 'brick' || blockBelow === 'grass') {
        return true // Has valid support below
      }
      if (blockBelow === null) {
        // Rule 3: Brick can float if adjacent same-material block (in tetromino or board) is supported
        // First check if adjacent block in same tetromino has support
        if (tetrominoBlockPositions) {
          const adjacentPositions: Position[] = [
            [x + 1, y, z], [x - 1, y, z], [x, y, z + 1], [x, y, z - 1],
          ]
          for (const [ax, ay, az] of adjacentPositions) {
            // Check if this adjacent position is part of the tetromino
            const isInTetromino = tetrominoBlockPositions.some(
              ([tx, ty, tz]) => tx === ax && ty === ay && tz === az
            )
            if (isInTetromino) {
              // Check if this adjacent block has support below
              const adjBlockBelow = getBlockBelow(ax, ay, az, boardState)
              if (adjBlockBelow !== null) {
                return true // Adjacent block in tetromino has support
              }
            }
          }
        }
        // Also check boardState for adjacent same-material blocks with support
        return hasAdjacentSameMaterialSupport(blockPos, material, boardState)
      }
      return false // Brick cannot be above wood
    }

    return false
  }, [getBlockBelow, hasAdjacentSameMaterialSupport])

  // Check if position is valid (within bounds, not colliding, and follows material rules)
  const isValidPosition = useCallback((
    type: TetrominoType,
    position: Position,
    rotation: Rotation,
    material: MaterialType
  ): boolean => {
    const blockPositions = getTetrominoBlockPositions(type, position, rotation)
    
    return blockPositions.every((blockPos) => {
      return isValidBlockPlacement(blockPos, material, boardState, blockPositions)
    })
  }, [boardState, getTetrominoBlockPositions, isValidBlockPlacement])

  // Select tetromino from queue
  const selectTetromino = useCallback((index: number) => {
    if (activeTetromino !== null) return // Can't select if one is already active
    
    const queueItem = queue[index]
    if (!queueItem) return

    // Position tetromino's central block (first block) at board center [1, Y, 1]
    // Spawn 5 blocks above highest block
    const spawnY = Math.max(1, highestY) + 5
    const spawnPosition: Position = [1, spawnY, 1] // Board center is at [1, 1, 1]

    // Use material from queue (not random)
    setActiveTetromino({
      type: queueItem.type,
      position: spawnPosition,
      rotation: 0,
      material: queueItem.material,
    })
    setSelectedIndex(index)
  }, [queue, highestY, activeTetromino])

  // Move active tetromino
  const moveTetromino = useCallback((deltaX: number, deltaZ: number) => {
    if (!activeTetromino) return

    setActiveTetromino(prev => {
      if (!prev) return null
      // Positions are already integers, so no rounding needed
      const newX = prev.position[0] + deltaX
      const newZ = prev.position[2] + deltaZ
      const newPosition: Position = [newX, prev.position[1], newZ]
      
      // Check if new position is valid (bounds and collision only, material rules checked at landing)
      const blockPositions = getTetrominoBlockPositions(prev.type, newPosition, prev.rotation)
      const hasCollision = blockPositions.some(([x, y, z]) => {
        if (x < BOARD_MIN || x > BOARD_MAX || z < BOARD_MIN || z > BOARD_MAX) return true
        const key = `${x},${y},${z}`
        if (boardState.has(key)) return true
        if (y <= 0) return true
        return false
      })
      if (hasCollision) {
        return prev // Don't move if invalid
      }
      
      return {
        ...prev,
        position: newPosition,
      }
    })
  }, [activeTetromino, isValidPosition])

  // Rotate active tetromino clockwise
  const rotateTetromino = useCallback(() => {
    if (!activeTetromino) return

    setActiveTetromino(prev => {
      if (!prev) return null
      const newRotation = ((prev.rotation + 90) % 360) as Rotation
      
      // Check if rotated position is valid (bounds and collision only, material rules checked at landing)
      const blockPositions = getTetrominoBlockPositions(prev.type, prev.position, newRotation)
      const hasCollision = blockPositions.some(([x, y, z]) => {
        if (x < BOARD_MIN || x > BOARD_MAX || z < BOARD_MIN || z > BOARD_MAX) return true
        const key = `${x},${y},${z}`
        if (boardState.has(key)) return true
        if (y <= 0) return true
        return false
      })
      if (hasCollision) {
        return prev // Don't rotate if invalid
      }
      
      return {
        ...prev,
        rotation: newRotation,
      }
    })
  }, [activeTetromino, isValidPosition])

  // Calculate landing Y position
  const calculateLandingY = useCallback((
    type: TetrominoType,
    position: Position,
    rotation: Rotation
  ): number => {
    const blockPositions = getTetrominoBlockPositions(type, position, rotation)
    let testY = position[1]
    
    // Move down until collision
    while (testY > 1) {
      const testPositions = blockPositions.map(([x, , z]) => [x, testY - 1, z] as Position)
      const hasCollision = testPositions.some(([x, y, z]) => {
        // Check board bounds (integer grid: X/Z from BOARD_MIN to BOARD_MAX)
        if (x < BOARD_MIN || x > BOARD_MAX || z < BOARD_MIN || z > BOARD_MAX) return true
        // Check if position is occupied by placed blocks
        const key = `${x},${y},${z}`
        if (boardState.has(key)) return true
        // Check collision with board surface (Y=0 is the board level)
        if (y <= 0) return true
        return false
      })
      
      if (hasCollision) break
      testY--
    }
    
    return Math.max(1, testY)
  }, [boardState, getTetrominoBlockPositions])

  // Complete the drop animation and update board state
  const completeDrop = useCallback(() => {
    if (!droppingTetromino) return

    const { type, endPosition, rotation, material, onComplete } = droppingTetromino

    // Add blocks to board state with their materials
    const newBoardState = new Map(boardState)
    const blockPositions = getTetrominoBlockPositions(type, endPosition, rotation)

    blockPositions.forEach(pos => {
      const key = `${pos[0]},${pos[1]},${pos[2]}`
      newBoardState.set(key, material) // Store material with position
    })

    // Update highest Y
    const newHighestY = Math.max(highestY, ...blockPositions.map(p => p[1]))

    setBoardState(newBoardState)
    setHighestY(newHighestY)
    setDroppingTetromino(null)
    onComplete()
  }, [droppingTetromino, boardState, highestY, getTetrominoBlockPositions])

  // Check if landing position is valid according to material rules
  const isValidLandingPosition = useCallback((
    type: TetrominoType,
    position: Position,
    rotation: Rotation,
    material: MaterialType
  ): boolean => {
    return isValidPosition(type, position, rotation, material)
  }, [isValidPosition])

  // Drop tetromino to landing position (triggers animation)
  const dropTetromino = useCallback(() => {
    if (!activeTetromino || selectedIndex === null) return false

    const landingY = calculateLandingY(
      activeTetromino.type,
      [activeTetromino.position[0], activeTetromino.position[1], activeTetromino.position[2]],
      activeTetromino.rotation
    )

    const startPosition: Position = activeTetromino.position
    const endPosition: Position = [activeTetromino.position[0], landingY, activeTetromino.position[2]]

    // Check if landing position is valid according to material rules
    const isValid = isValidLandingPosition(
      activeTetromino.type,
      endPosition,
      activeTetromino.rotation,
      activeTetromino.material
    )

    if (!isValid) {
      return false // Invalid position, don't drop
    }

    // Remove used tetromino from queue and add new one
    // Material is derived from tetromino type name
    const newQueue = [...queue]
    newQueue.splice(selectedIndex, 1)
    const newType = getRandomTetromino()
    newQueue.push({
      type: newType,
      material: getMaterialFromType(newType),
    })

    // Set up animation (preserve material from active tetromino)
    setDroppingTetromino({
      type: activeTetromino.type,
      startPosition,
      endPosition,
      rotation: activeTetromino.rotation,
      material: activeTetromino.material,
      onComplete: () => {
        setActiveTetromino(null)
        setSelectedIndex(null)
        setQueue(newQueue)
      },
    })
    setActiveTetromino(null)
    return true // Successfully dropped
  }, [activeTetromino, selectedIndex, queue, calculateLandingY, isValidLandingPosition])

  // Calculate if current active tetromino's landing position is valid
  const currentLandingIsValid = useMemo(() => {
    if (!activeTetromino) return true
    
    const landingY = calculateLandingY(
      activeTetromino.type,
      activeTetromino.position,
      activeTetromino.rotation
    )
    
    const landingPosition: Position = [
      activeTetromino.position[0],
      landingY,
      activeTetromino.position[2],
    ]
    
    return isValidLandingPosition(
      activeTetromino.type,
      landingPosition,
      activeTetromino.rotation,
      activeTetromino.material
    )
  }, [activeTetromino, calculateLandingY, isValidLandingPosition])

  return {
    queue,
    activeTetromino,
    droppingTetromino,
    boardState,
    highestY,
    selectedIndex,
    boardSize: BOARD_SIZE,
    selectTetromino,
    moveTetromino,
    rotateTetromino,
    dropTetromino,
    completeDrop,
    getTetrominoBlockPositions,
    calculateLandingY,
    isValidPosition,
    isValidLandingPosition,
    currentLandingIsValid,
  }
}

