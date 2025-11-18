import { useState, useCallback } from 'react'
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

  // Board state: Map of occupied positions to materials "x,y,z" -> MaterialType
  const [boardState, setBoardState] = useState<Map<string, MaterialType>>(new Map())

  // Highest block Y position on board
  const [highestY, setHighestY] = useState<number>(0)

  // Selected queue index
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null)

  // Board size constant (should match Board component default size)
  const BOARD_SIZE = 16
  // Calculate board bounds for integer grid (center at [1, 1, 1])
  // For size 16: minCoord = 1 - floor(16/2) = -7, maxCoord = 1 + floor(15/2) = 8
  const BOARD_MIN = 1 - Math.floor(BOARD_SIZE / 2) // -7 for size 16
  const BOARD_MAX = 1 + Math.floor((BOARD_SIZE - 1) / 2) // 8 for size 16

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

  // Check if position is valid (within bounds and not colliding)
  const isValidPosition = useCallback((
    type: TetrominoType,
    position: Position,
    rotation: Rotation
  ): boolean => {
    const blockPositions = getTetrominoBlockPositions(type, position, rotation)
    
    return blockPositions.every(([x, y, z]) => {
      // Check board bounds (integer grid: X/Z from BOARD_MIN to BOARD_MAX)
      if (x < BOARD_MIN || x > BOARD_MAX || z < BOARD_MIN || z > BOARD_MAX) return false
      // Check if position is occupied (check boardState for placed blocks)
      const key = `${x},${y},${z}`
      if (boardState.has(key)) return false
      // Check collision with board surface (Y=0 is the board level, blocks should be above it)
      if (y <= 0) return false
      return true
    })
  }, [boardState, getTetrominoBlockPositions])

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
      
      // Check if new position is valid
      if (!isValidPosition(prev.type, newPosition, prev.rotation)) {
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
      
      // Check if rotated position is valid
      if (!isValidPosition(prev.type, prev.position, newRotation)) {
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

  // Drop tetromino to landing position (triggers animation)
  const dropTetromino = useCallback(() => {
    if (!activeTetromino || selectedIndex === null) return

    const landingY = calculateLandingY(
      activeTetromino.type,
      [activeTetromino.position[0], activeTetromino.position[1], activeTetromino.position[2]],
      activeTetromino.rotation
    )

    const startPosition: Position = activeTetromino.position
    const endPosition: Position = [activeTetromino.position[0], landingY, activeTetromino.position[2]]

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
  }, [activeTetromino, selectedIndex, queue, calculateLandingY])

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
  }
}

