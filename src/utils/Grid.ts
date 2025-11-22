import { type MaterialType } from './materials'
import { type FaceDirection } from './faceCulling'

export type Position = [number, number, number]

export class Grid {
  private state: Map<string, MaterialType>

  constructor(initialState: Map<string, MaterialType> = new Map()) {
    this.state = initialState
  }

  static getKey(x: number, y: number, z: number): string {
    return `${x},${y},${z}`
  }

  static fromKey(key: string): Position {
    const [x, y, z] = key.split(',').map(Number)
    return [x, y, z]
  }

  get(x: number, y: number, z: number): MaterialType | undefined {
    return this.state.get(Grid.getKey(x, y, z))
  }

  set(x: number, y: number, z: number, material: MaterialType): void {
    this.state.set(Grid.getKey(x, y, z), material)
  }

  has(x: number, y: number, z: number): boolean {
    return this.state.has(Grid.getKey(x, y, z))
  }

  delete(x: number, y: number, z: number): boolean {
    return this.state.delete(Grid.getKey(x, y, z))
  }

  getRawState(): Map<string, MaterialType> {
    return this.state
  }

  entries(): IterableIterator<[string, MaterialType]> {
    return this.state.entries()
  }

  forEach(callback: (value: MaterialType, key: string, map: Map<string, MaterialType>) => void): void {
    this.state.forEach(callback)
  }

  get size(): number {
    return this.state.size
  }

  // Neighbor access helpers
  getNeighbor(x: number, y: number, z: number, direction: FaceDirection): MaterialType | undefined {
    switch (direction) {
      case 'top': return this.get(x, y + 1, z)
      case 'bottom': return this.get(x, y - 1, z)
      case 'front': return this.get(x, y, z + 1)
      case 'back': return this.get(x, y, z - 1)
      case 'right': return this.get(x + 1, y, z)
      case 'left': return this.get(x - 1, y, z)
    }
  }

  // Check if a face is visible (no opaque block blocking it)
  // Currently we treat all blocks as opaque for simple visibility
  isFaceVisible(x: number, y: number, z: number, direction: FaceDirection): boolean {
    return !this.getNeighbor(x, y, z, direction)
  }

  // Get surrounding 3x3x3 matrix of materials (optional optimization for rules)
  // Returns a nested object structure or flattened map if preferred
  // For now, providing direct neighbor access is usually sufficient
}

