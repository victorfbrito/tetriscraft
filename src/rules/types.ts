import { type MaterialType } from '../utils/materials'
import { type FaceDirection } from '../utils/faceCulling'
import { Grid, type Position } from '../utils/Grid'

export type DecorationCategory = 'base' | 'primary' | 'secondary'

export interface DecorationPlacement {
  position: Position
  face: FaceDirection
  decorationName: string
  rotation: [number, number, number]
  delay: number
  phaseIndex?: number // For animated decorations (water)
  isAnimated?: boolean
}

export interface RuleContext {
  position: Position
  face: FaceDirection
  grid: Grid
  neighbors: {
    hasLeftCorner: boolean
    hasRightCorner: boolean
    // Add more pre-calculated neighbor info here if needed
  }
}

export interface DecorationRule {
  material: MaterialType
  category: DecorationCategory
  decorationNames: string[]
  faces: FaceDirection[]
  check: (
    position: Position,
    face: FaceDirection,
    grid: Grid
  ) => boolean
}
