import { useState, useCallback, useMemo } from 'react'
import { type TetrominoType, getRotatedPositions } from '../components/game/Tetromino'
import { type MaterialType } from '../utils/materials'

type Position = [number, number, number]
type Rotation = 0 | 90 | 180 | 270

// Get material type from tetromino type name
function getMaterialFromType(type: TetrominoType): MaterialType {
  if (type.startsWith('GRASS_')) return 'grass'
  if (type.startsWith('BRICK_')) return 'brick'
  if (type.startsWith('WOOD_')) return 'wood'
  if (type.startsWith('WATER_')) return 'water'
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
    'WATER_1X3',
    'WATER_1X2',
    'WATER_L',
  ]
  return types[Math.floor(Math.random() * types.length)]
}

export function useGameState() {
  // Queue of tetrominoes with materials (first one is next to use)
  // Material is derived from tetromino type name
  const [queue, setQueue] = useState<Array<{ type: TetrominoType; material: MaterialType }>>(() => {
    const presetTypes: TetrominoType[] = ['WATER_1X3', 'WATER_1X2', 'WATER_L']
    const randomCount = Math.max(0, 5 - presetTypes.length)
    const randomTypes = Array.from({ length: randomCount }, () => getRandomTetromino())
    const queueTypes = [...presetTypes, ...randomTypes]
    return queueTypes.map((type) => ({
      type,
      material: getMaterialFromType(type),
    }))
  })

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
  const BOARD_SIZE = 3
  // Calculate board bounds for integer grid (center at [1, 1, 1])
  // For size 16: minCoord = 1 - floor(16/2) = -7, maxCoord = 1 + floor(15/2) = 8
  const BOARD_MIN = 1 - Math.floor(BOARD_SIZE / 2) // -7 for size 16
  const BOARD_MAX = 1 + Math.floor((BOARD_SIZE - 1) / 2) // 8 for size 16
  
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

  const boardPositionList = useMemo(() => {
    return Array.from(boardState.keys()).map((key) => {
      const [x, y, z] = key.split(',').map(Number)
      return [x, y, z] as Position
    })
  }, [boardState])

  const boardPositionSet = useMemo(() => new Set(boardState.keys()), [boardState])

  const getMinHorizontalDistanceToBoard = useCallback((
    blockPositions: Position[]
  ): number => {
    if (boardPositionList.length === 0) {
      return Infinity
    }

    let minDistance = Infinity
    for (const [x, , z] of blockPositions) {
      for (const [bx, , bz] of boardPositionList) {
        const distance = Math.abs(x - bx) + Math.abs(z - bz)
        if (distance < minDistance) {
          minDistance = distance
          if (minDistance <= 4) {
            return minDistance
          }
        }
      }
    }
    return minDistance
  }, [boardPositionList])

  const isWithinHorizontalRange = useCallback((
    blockPositions: Position[]
  ): boolean => {
    const withinBoardBounds = blockPositions.every(([x, , z]) => {
      return x >= BOARD_MIN && x <= BOARD_MAX && z >= BOARD_MIN && z <= BOARD_MAX
    })

    if (withinBoardBounds) {
      return true
    }

    const minDistance = getMinHorizontalDistanceToBoard(blockPositions)
    return minDistance <= 4
  }, [BOARD_MIN, BOARD_MAX, getMinHorizontalDistanceToBoard])

  const hasFaceAdjacencyToBoard = useCallback((
    blockPositions: Position[]
  ): boolean => {
    for (const [x, y, z] of blockPositions) {
      const neighborKeys = [
        `${x + 1},${y},${z}`,
        `${x - 1},${y},${z}`,
        `${x},${y + 1},${z}`,
        `${x},${y - 1},${z}`,
        `${x},${y},${z + 1}`,
        `${x},${y},${z - 1}`,
      ]

      if (neighborKeys.some((key) => boardPositionSet.has(key))) {
        return true
      }
    }
    return false
  }, [boardPositionSet])

  // Highest block Y position on board
  const [highestY, setHighestY] = useState<number>(() => {
    const [, initialHighestY] = initializeBoard()
    return initialHighestY
  })

  // Selected queue index
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null)

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

  // Determine why a block placement would fail (null means valid)
  const getBlockPlacementFailureReason = useCallback((
    blockPos: Position,
    material: MaterialType,
    boardState: Map<string, MaterialType>,
    tetrominoBlockPositions?: Position[]
  ): string | null => {
    const [x, y, z] = blockPos
    
    // Check if position is occupied
    const key = `${x},${y},${z}`
    if (boardState.has(key)) return 'Target cell already occupied'
    // Check collision with board surface
    if (y < 0) return 'Cannot place below board level'

    const blockBelow = getBlockBelow(x, y, z, boardState)

    // Rule 4: Grass blocks ALWAYS need grass below
    if (material === 'grass') {
      if (blockBelow === 'grass') {
        return null
      }

      // Allow ground-level expansion when bordering existing blocks (verified separately)
      if (y === 0) {
        return null
      }
      return 'Grass must sit on grass or ground level'
    }

    // Rule Water: Water blocks must sit on ground level
    if (material === 'water') {
      if (y === 0) {
        return null
      }
      return 'Water must sit on ground level'
    }

    // Rule 1: Wood blocks can be above any block
    if (material === 'wood') {
      if (blockBelow !== null) {
        return null // Has support below
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
              return null // Adjacent block in tetromino has support
            }
          }
        }
      }
      // Also check boardState for adjacent same-material blocks with support
      if (hasAdjacentSameMaterialSupport(blockPos, material, boardState)) {
        return null
      }
      return 'Wood needs support below or adjacent supported wood'
    }

    // Rule 2: Brick blocks can be above brick or grass
    if (material === 'brick') {
      if (blockBelow === 'brick' || blockBelow === 'grass') {
        return null // Has valid support below
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
                return null // Adjacent block in tetromino has support
              }
            }
          }
        }
        // Also check boardState for adjacent same-material blocks with support
        if (hasAdjacentSameMaterialSupport(blockPos, material, boardState)) {
          return null
        }
        return 'Brick needs support below or adjacent supported brick'
      }
      return 'Brick cannot sit on wood'
    }

    return 'Unsupported material placement'
  }, [getBlockBelow, hasAdjacentSameMaterialSupport])

  const evaluatePlacement = useCallback((
    type: TetrominoType,
    position: Position,
    rotation: Rotation,
    material: MaterialType
  ): { valid: true } | { valid: false; reason: string } => {
    const blockPositions = getTetrominoBlockPositions(type, position, rotation)

    for (const blockPos of blockPositions) {
      const reason = getBlockPlacementFailureReason(blockPos, material, boardState, blockPositions)
      if (reason) {
        return { valid: false, reason }
      }
    }

    if (!isWithinHorizontalRange(blockPositions)) {
      return { valid: false, reason: 'Preview exceeds 4-block horizontal range' }
    }

    if (material === 'grass' && !hasFaceAdjacencyToBoard(blockPositions)) {
      return { valid: false, reason: 'Grass tetromino must touch an existing block' }
    }

    return { valid: true }
  }, [boardState, getBlockPlacementFailureReason, getTetrominoBlockPositions, hasFaceAdjacencyToBoard, isWithinHorizontalRange])

  // Check if position is valid (within bounds, not colliding, and follows material rules)
  const isValidPosition = useCallback((
    type: TetrominoType,
    position: Position,
    rotation: Rotation,
    material: MaterialType
  ): boolean => {
    return evaluatePlacement(type, position, rotation, material).valid
  }, [evaluatePlacement])

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
        const key = `${x},${y},${z}`
        if (boardState.has(key)) return true
        if (y < 0) return true
        return false
      })
      if (hasCollision || !isWithinHorizontalRange(blockPositions)) {
        return prev // Don't move if invalid
      }
      
      return {
        ...prev,
        position: newPosition,
      }
    })
  }, [activeTetromino, getTetrominoBlockPositions, boardState, isWithinHorizontalRange])

  // Rotate active tetromino clockwise
  const rotateTetromino = useCallback(() => {
    if (!activeTetromino) return

    setActiveTetromino(prev => {
      if (!prev) return null
      const newRotation = ((prev.rotation + 90) % 360) as Rotation
      
      // Check if rotated position is valid (bounds and collision only, material rules checked at landing)
      const blockPositions = getTetrominoBlockPositions(prev.type, prev.position, newRotation)
      const hasCollision = blockPositions.some(([x, y, z]) => {
        const key = `${x},${y},${z}`
        if (boardState.has(key)) return true
        if (y < 0) return true
        return false
      })
      if (hasCollision || !isWithinHorizontalRange(blockPositions)) {
        return prev // Don't rotate if invalid
      }
      
      return {
        ...prev,
        rotation: newRotation,
      }
    })
  }, [activeTetromino, boardState, getTetrominoBlockPositions, isWithinHorizontalRange])

  // Calculate landing Y position
  const calculateLandingY = useCallback((
    type: TetrominoType,
    position: Position,
    rotation: Rotation
  ): number => {
    const blockPositions = getTetrominoBlockPositions(type, position, rotation)
    let testY = position[1]
    
    // Move down until collision
    while (testY > 0) {
      const testPositions = blockPositions.map(([x, , z]) => [x, testY - 1, z] as Position)
      if (!isWithinHorizontalRange(testPositions)) {
        break
      }

      const hasCollision = testPositions.some(([x, y, z]) => {
        // Check if position is occupied by placed blocks
        const key = `${x},${y},${z}`
        if (boardState.has(key)) return true
        // Check collision with board surface (Y=0 is the board level)
        if (y < 0) return true
        return false
      })
      
      if (hasCollision) break
      testY--
    }
    
    return Math.max(0, testY)
  }, [boardState, getTetrominoBlockPositions, isWithinHorizontalRange])

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
    const result = evaluatePlacement(type, position, rotation, material)
    return result.valid
  }, [evaluatePlacement])

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
