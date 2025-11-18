import { useEffect } from 'react'
import { useSpring, a } from '@react-spring/three'
import Block from './Block'
import { type MaterialType } from '../utils/materials'

// New tetromino types based on material-specific shapes
// Each material type (grass, brick, wood) has different shape variants
export type TetrominoType = 
  | 'GRASS_SQUARE'    // Grass: 2x2 square (4 blocks)
  | 'GRASS_L'         // Grass: L-shape (5 blocks: 2x2 + one below left)
  | 'GRASS_T'         // Grass: T-shaped (4 blocks)
  | 'GRASS_1X4'       // Grass: 1x4 straight line (4 blocks)
  | 'GRASS_STAIR'     // Grass: Stair-shaped (10 blocks)
  | 'BRICK_SINGLE'    // Brick: Single block (1 block)
  | 'BRICK_VERTICAL'  // Brick: Vertical 1x2 rectangle (2 blocks)
  | 'BRICK_ARROW'     // Brick: Arrow-shaped (3 blocks)
  | 'BRICK_ARK'       // Brick: Ark/U-shaped (5 blocks)
  | 'BRICK_2X3'       // Brick: 2x3 rectangle (6 blocks)
  | 'WOOD_SINGLE'     // Wood: Single block (1 block)
  | 'WOOD_VERTICAL'   // Wood: Vertical 1x2 rectangle (2 blocks)
  | 'WOOD_ARROW'      // Wood: Arrow-shaped (3 blocks)
  | 'WOOD_DOUBLE'     // Wood: Double with gap (3 blocks)

interface TetrominoProps {
  type: TetrominoType
  position?: [number, number, number]
  material?: MaterialType
  rotation?: 0 | 90 | 180 | 270
  wireframe?: boolean
  animated?: boolean
  targetPosition?: [number, number, number]
  onAnimationComplete?: () => void
}

// Define tetromino shapes as arrays of block positions relative to first block
// First block is always at [0, 0, 0] and serves as the central reference point
// All shapes are horizontal (flat on X-Z plane, y=0)
// All positions use integer coordinates only
// Shapes are defined in a 4x4 grid space (top-left is reference)
const TETROMINO_SHAPES: Record<TetrominoType, [number, number, number][]> = {
  // Grass: 2x2 square (top-left 2x2 block)
  GRASS_SQUARE: [
    [0, 0, 0],  // Top-left
    [1, 0, 0],  // Top-right
    [0, 0, 1],  // Bottom-left
    [1, 0, 1],  // Bottom-right
  ],
  // Grass: L-shape (2x2 square + one cell below left column)
  GRASS_L: [
    [0, 0, 0],  // Top-left
    [1, 0, 0],  // Top-right
    [0, 0, 1],  // Bottom-left (of 2x2)
    [1, 0, 1],  // Bottom-right (of 2x2)
    [0, 0, 2],  // One cell below left column
  ],
  // Grass: T-shaped (4 blocks)
  GRASS_T: [
    [0, 0, 0],  // Center
    [0, 0, -1], // Top
    [-1, 0, 0], // Left
    [1, 0, 0],  // Right
  ],
  // Grass: 1x4 straight line (4 blocks horizontal)
  GRASS_1X4: [
    [0, 0, 0],  // First block
    [1, 0, 0],  // Second block
    [2, 0, 0],  // Third block
    [3, 0, 0],  // Fourth block
  ],
  // Grass: Stair-shaped (matrix [1,0,0,0][1,1,0,0][1,1,1,0][1,1,1,1])
  GRASS_STAIR: [
    [0, 0, 0],  // Row 1: [1,0,0,0]
    [0, 0, 1],  // Row 2: [1,1,0,0]
    [1, 0, 1],
    [0, 0, 2],  // Row 3: [1,1,1,0]
    [1, 0, 2],
    [2, 0, 2],
    [0, 0, 3],  // Row 4: [1,1,1,1]
    [1, 0, 3],
    [2, 0, 3],
    [3, 0, 3],
  ],
  // Brick: Single block (top-left cell)
  BRICK_SINGLE: [
    [0, 0, 0],  // Single block
  ],
  // Brick: Vertical 1x2 rectangle (two cells in left column)
  BRICK_VERTICAL: [
    [0, 0, 0],  // Top cell
    [0, 0, 1],  // Bottom cell
  ],
  // Brick: Arrow-shaped (3 blocks - corner shape)
  BRICK_ARROW: [
    [0, 0, 0],  // Corner
    [1, 0, 0],  // Right
    [1, 0, 1],  // Down-right
  ],
  // Brick: Ark/U-shaped (matrix [1,1,1][1,0,1])
  BRICK_ARK: [
    [0, 0, 0],  // Top-left
    [1, 0, 0],  // Top-center
    [2, 0, 0],  // Top-right
    [0, 0, 1],  // Bottom-left
    [2, 0, 1],  // Bottom-right (gap in middle)
  ],
  // Brick: 2x3 rectangle (6 blocks)
  BRICK_2X3: [
    [0, 0, 0],  // Top-left
    [1, 0, 0],  // Top-right
    [0, 0, 1],  // Middle-left
    [1, 0, 1],  // Middle-right
    [0, 0, 2],  // Bottom-left
    [1, 0, 2],  // Bottom-right
  ],
  // Wood: Single block (top-left cell)
  WOOD_SINGLE: [
    [0, 0, 0],  // Single block
  ],
  // Wood: Vertical 1x2 rectangle (two cells in left column)
  WOOD_VERTICAL: [
    [0, 0, 0],  // Top cell
    [0, 0, 1],  // Bottom cell
  ],
  // Wood: Arrow-shaped (3 blocks - corner shape)
  WOOD_ARROW: [
    [0, 0, 0],  // Corner
    [1, 0, 0],  // Right
    [1, 0, 1],  // Down-right
  ],
  // Wood: Double with gap (matrix [1, 0, 1] - 2 blocks with gap in middle)
  WOOD_DOUBLE: [
    [0, 0, 0],  // Left block
    [2, 0, 0],  // Right block (gap at [1,0,0])
  ],
}


// Rotate a 2D point around origin by angle (in degrees)
// Returns integer coordinates
function rotatePoint(x: number, z: number, angle: number): [number, number] {
  const radians = (angle * Math.PI) / 180
  const cos = Math.cos(radians)
  const sin = Math.sin(radians)
  return [
    Math.round(x * cos - z * sin),
    Math.round(x * sin + z * cos),
  ]
}

// Get rotated block positions for a tetromino
export function getRotatedPositions(
  type: TetrominoType,
  rotation: 0 | 90 | 180 | 270 = 0
): [number, number, number][] {
  const basePositions = TETROMINO_SHAPES[type]
  if (rotation === 0) return basePositions

  return basePositions.map(([x, y, z]) => {
    const [rotatedX, rotatedZ] = rotatePoint(x, z, rotation)
    return [rotatedX, y, rotatedZ]
  })
}

export default function Tetromino({ 
  type, 
  position = [0, 0, 0], 
  material, 
  rotation = 0, 
  wireframe = false,
  animated = false,
  targetPosition,
  onAnimationComplete,
}: TetrominoProps) {
  const blockPositions = getRotatedPositions(type, rotation)

  // Animation spring for dropping
  // Use ease-in config: lower friction for gravity-like acceleration
  const [spring, api] = useSpring(() => ({
    y: position[1],
    config: { mass: 1, tension: 150, friction: 20 }, // Lower friction = more acceleration (ease-in effect)
  }))

  // Trigger animation when animated prop becomes true
  useEffect(() => {
    if (animated && targetPosition) {
      // Animate from current position to target position
      api.start({
        from: { y: position[1] },
        to: { y: targetPosition[1] },
        onRest: onAnimationComplete,
      })
    } else {
      // Reset to current position when not animated
      api.set({ y: position[1] })
    }
  }, [animated, targetPosition, position, onAnimationComplete, api])

  if (animated && targetPosition) {
    // Use animated position
    return (
      <a.group 
        position-x={targetPosition[0]}
        position-y={spring.y}
        position-z={targetPosition[2]}
      >
        {blockPositions.map((blockPos, index) => (
          <Block
            key={index}
            position={[
              blockPos[0],
              blockPos[1],
              blockPos[2],
            ]}
            material={material}
            wireframe={wireframe}
          />
        ))}
      </a.group>
    )
  }

  return (
    <group position={position}>
      {blockPositions.map((blockPos, index) => (
        <Block
          key={index}
          position={[
            blockPos[0],
            blockPos[1],
            blockPos[2],
          ]}
          material={material}
          wireframe={wireframe}
        />
      ))}
    </group>
  )
}

