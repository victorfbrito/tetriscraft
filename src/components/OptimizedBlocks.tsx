import { useMemo, useEffect, useRef } from 'react'
import { useSpring, a } from '@react-spring/three'
import * as THREE from 'three'
import { generateAllQuads } from '../utils/greedyMeshing'
import { type MaterialType, getMaterialColor } from '../utils/materials'

interface OptimizedBlocksProps {
  boardState: Map<string, MaterialType>
  wireframe?: boolean
}

export default function OptimizedBlocks({ 
  boardState, 
  wireframe = false 
}: OptimizedBlocksProps) {
  // Track previous water block count to detect new water blocks
  const prevWaterBlockCountRef = useRef(0)
  
  // Group quads by material and create separate geometries for each material
  const materialGeometries = useMemo(() => {
    const quads = generateAllQuads(boardState)
    
    // Group quads by material
    const quadsByMaterial = new Map<MaterialType, typeof quads>()
    
    for (const quad of quads) {
      const { position } = quad
      const [px, py, pz] = position
      const blockKey = `${px},${py},${pz}`
      const material = boardState.get(blockKey) || 'grass'
      
      if (!quadsByMaterial.has(material)) {
        quadsByMaterial.set(material, [])
      }
      quadsByMaterial.get(material)!.push(quad)
    }
    
    // Create geometry for each material
    const geometries: Array<{ material: MaterialType; geometry: THREE.BufferGeometry }> = []
    
    for (const [material, materialQuads] of quadsByMaterial.entries()) {
      const positions: number[] = []
      const indices: number[] = []
      
      let vertexIndex = 0
      
      for (const quad of materialQuads) {
        const { position, direction, width, height } = quad
        const [px, py, pz] = position
        
        // Determine the four corners of the quad based on direction
        let corners: [number, number, number][]
        
        // Position is the starting corner of the quad (min corner)
        // For top/bottom: position is [x, y, z] where y is the layer
        // For front/back: position is [x, y, z] where z is the layer  
        // For right/left: position is [x, y, z] where x is the layer
        switch (direction) {
        case 'top':
          // Face is at y + 0.5, spans from px to px+width, pz to pz+height
          corners = [
            [px - 0.5, py + 0.5, pz - 0.5],
            [px + width - 0.5, py + 0.5, pz - 0.5],
            [px + width - 0.5, py + 0.5, pz + height - 0.5],
            [px - 0.5, py + 0.5, pz + height - 0.5],
          ]
          break
        case 'bottom':
          // Face is at y - 0.5
          corners = [
            [px - 0.5, py - 0.5, pz - 0.5],
            [px - 0.5, py - 0.5, pz + height - 0.5],
            [px + width - 0.5, py - 0.5, pz + height - 0.5],
            [px + width - 0.5, py - 0.5, pz - 0.5],
          ]
          break
        case 'front':
          // Face is at z + 0.5
          corners = [
            [px - 0.5, py - 0.5, pz + 0.5],
            [px + width - 0.5, py - 0.5, pz + 0.5],
            [px + width - 0.5, py + height - 0.5, pz + 0.5],
            [px - 0.5, py + height - 0.5, pz + 0.5],
          ]
          break
        case 'back':
          // Face is at z - 0.5
          corners = [
            [px - 0.5, py - 0.5, pz - 0.5],
            [px - 0.5, py + height - 0.5, pz - 0.5],
            [px + width - 0.5, py + height - 0.5, pz - 0.5],
            [px + width - 0.5, py - 0.5, pz - 0.5],
          ]
          break
        case 'right':
          // Face is at x + 0.5, width is along z, height is along y
          corners = [
            [px + 0.5, py - 0.5, pz - 0.5],
            [px + 0.5, py + height - 0.5, pz - 0.5],
            [px + 0.5, py + height - 0.5, pz + width - 0.5],
            [px + 0.5, py - 0.5, pz + width - 0.5],
          ]
          break
        case 'left':
          // Face is at x - 0.5
          corners = [
            [px - 0.5, py - 0.5, pz - 0.5],
            [px - 0.5, py - 0.5, pz + width - 0.5],
            [px - 0.5, py + height - 0.5, pz + width - 0.5],
            [px - 0.5, py + height - 0.5, pz - 0.5],
          ]
          break
        }
        
        // Add vertices for the quad (two triangles)
        const baseIndex = vertexIndex
        for (const corner of corners) {
          positions.push(corner[0], corner[1], corner[2])
          vertexIndex++
        }
        
        // Add indices for two triangles
        // Ensure counter-clockwise winding when viewed from the normal direction
        // For faces pointing outward, vertices should be CCW when viewed from outside
        let v0: number, v1: number, v2: number, v3: number
        
        // Determine correct winding based on face direction
        // Normals point outward, so vertices should be CCW when viewed from outside
        switch (direction) {
          case 'top':
            // Normal points up, vertices should be CCW when viewed from above
            v0 = baseIndex
            v1 = baseIndex + 1
            v2 = baseIndex + 2
            v3 = baseIndex + 3
            break
          case 'bottom':
            // Normal points down, vertices should be CCW when viewed from below (CW from above)
            v0 = baseIndex
            v1 = baseIndex + 3
            v2 = baseIndex + 2
            v3 = baseIndex + 1
            break
          case 'front':
            // Normal points forward (+Z), vertices should be CCW when viewed from front
            v0 = baseIndex
            v1 = baseIndex + 1
            v2 = baseIndex + 2
            v3 = baseIndex + 3
            break
          case 'back':
            // Normal points backward (-Z), vertices should be CCW when viewed from back (CW from front)
            v0 = baseIndex
            v1 = baseIndex + 3
            v2 = baseIndex + 2
            v3 = baseIndex + 1
            break
          case 'right':
            // Normal points right (+X), vertices should be CCW when viewed from right
            v0 = baseIndex
            v1 = baseIndex + 1
            v2 = baseIndex + 2
            v3 = baseIndex + 3
            break
          case 'left':
            // Normal points left (-X), vertices should be CCW when viewed from left (CW from right)
            v0 = baseIndex
            v1 = baseIndex + 3
            v2 = baseIndex + 2
            v3 = baseIndex + 1
            break
        }
        
        indices.push(
          v0, v1, v2,
          v0, v2, v3
        )
      }
      
      // Generate gap-filling quads for blocks adjacent to water
      // Water blocks are scaled to 0.95 height and positioned at -0.05
      // So the top of water blocks is at: -0.05 + 0.5*0.95 = 0.425 (relative to block center)
      const WATER_TOP_Y = 0.425
      const BLOCK_TOP_Y = 0.5
      
      // Helper function to check if a neighbor block is water
      const isNeighborWater = (x: number, y: number, z: number, dir: 'front' | 'back' | 'left' | 'right'): boolean => {
        let neighborKey: string
        switch (dir) {
          case 'front':
            neighborKey = `${x},${y},${z + 1}`
            break
          case 'back':
            neighborKey = `${x},${y},${z - 1}`
            break
          case 'right':
            neighborKey = `${x + 1},${y},${z}`
            break
          case 'left':
            neighborKey = `${x - 1},${y},${z}`
            break
        }
        return boardState.get(neighborKey) === 'water'
      }
      
      // Find all blocks of this material that are adjacent to water
      const gapQuads: Array<{ direction: 'front' | 'back' | 'left' | 'right', blockX: number, blockY: number, blockZ: number }> = []
      
      for (const [key, mat] of boardState.entries()) {
        if (mat !== material || mat === 'water') continue
        
        const [x, y, z] = key.split(',').map(Number)
        
        // Check each vertical direction
        const directions: Array<'front' | 'back' | 'left' | 'right'> = ['front', 'back', 'left', 'right']
        for (const dir of directions) {
          if (isNeighborWater(x, y, z, dir)) {
            gapQuads.push({ direction: dir, blockX: x, blockY: y, blockZ: z })
          }
        }
      }
      
      // Generate gap quads - these fill the space from water top to block top
      for (const gapQuad of gapQuads) {
        const { direction, blockX, blockY, blockZ } = gapQuad
        const waterTopY = blockY + WATER_TOP_Y
        const blockTopY = blockY + BLOCK_TOP_Y
        
        let gapCorners: [number, number, number][]
        
        switch (direction) {
          case 'front':
            // Face is at z + 0.5, spans from water top to block top
            gapCorners = [
              [blockX - 0.5, waterTopY, blockZ + 0.5],
              [blockX + 0.5, waterTopY, blockZ + 0.5],
              [blockX + 0.5, blockTopY, blockZ + 0.5],
              [blockX - 0.5, blockTopY, blockZ + 0.5],
            ]
            break
          case 'back':
            // Face is at z - 0.5
            gapCorners = [
              [blockX - 0.5, waterTopY, blockZ - 0.5],
              [blockX - 0.5, blockTopY, blockZ - 0.5],
              [blockX + 0.5, blockTopY, blockZ - 0.5],
              [blockX + 0.5, waterTopY, blockZ - 0.5],
            ]
            break
          case 'right':
            // Face is at x + 0.5
            gapCorners = [
              [blockX + 0.5, waterTopY, blockZ - 0.5],
              [blockX + 0.5, blockTopY, blockZ - 0.5],
              [blockX + 0.5, blockTopY, blockZ + 0.5],
              [blockX + 0.5, waterTopY, blockZ + 0.5],
            ]
            break
          case 'left':
            // Face is at x - 0.5
            gapCorners = [
              [blockX - 0.5, waterTopY, blockZ - 0.5],
              [blockX - 0.5, waterTopY, blockZ + 0.5],
              [blockX - 0.5, blockTopY, blockZ + 0.5],
              [blockX - 0.5, blockTopY, blockZ - 0.5],
            ]
            break
        }
        
        // Add vertices for the gap quad
        const gapBaseIndex = vertexIndex
        for (const corner of gapCorners) {
          positions.push(corner[0], corner[1], corner[2])
          vertexIndex++
        }
        
        // Add indices for two triangles (same winding as regular front face)
        const gapV0 = gapBaseIndex
        const gapV1 = gapBaseIndex + 1
        const gapV2 = gapBaseIndex + 2
        const gapV3 = gapBaseIndex + 3
        
        // Use same winding as the corresponding direction
        if (direction === 'front' || direction === 'right') {
          indices.push(
            gapV0, gapV1, gapV2,
            gapV0, gapV2, gapV3
          )
        } else {
          // back and left use reverse winding
          indices.push(
            gapV0, gapV3, gapV2,
            gapV0, gapV2, gapV1
          )
        }
      }
      
      const geom = new THREE.BufferGeometry()
      geom.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
      geom.setIndex(indices)
      geom.computeBoundingSphere()
      // Compute normals from geometry - this ensures proper lighting
      // This creates flat shading where each face has its own normal
      geom.computeVertexNormals()
      
      geometries.push({ material, geometry: geom })
    }
    
    return geometries
  }, [boardState])
  
  // Count water blocks for animation trigger
  const waterBlockCount = useMemo(() => {
    let count = 0
    boardState.forEach((material) => {
      if (material === 'water') count++
    })
    return count
  }, [boardState])
  
  // Animate water blocks height from 1 to 0.8
  // Scale from bottom: when scaleY goes from 1 to 0.8, we need to adjust position
  // to keep the bottom at the same level
  const [waterSpring, waterApi] = useSpring(() => ({
    scaleY: 1,
    positionY: 0, // Position adjustment to scale from bottom
    config: { mass: 1, tension: 200, friction: 25 },
  }), [])
  
  // Trigger animation when new water blocks are added
  useEffect(() => {
    if (waterBlockCount > prevWaterBlockCountRef.current) {
      // New water blocks added - animate to 0.8
      // When scaling from 1 to 0.8, move down by (1 - 0.8) / 2 = 0.1
      // to keep bottom at ground level
      waterApi.start({ 
        scaleY: 0.95,
        positionY: -0.05, // Move down to compensate for scaling from center
      })
    }
    prevWaterBlockCountRef.current = waterBlockCount
  }, [waterBlockCount, waterApi])
  
  // Separate water blocks from other materials
  const waterGeometries = materialGeometries.filter(({ material }) => material === 'water')
  const otherGeometries = materialGeometries.filter(({ material }) => material !== 'water')
  
  return (
    <group>
      {/* Render non-water blocks normally */}
      {otherGeometries.map(({ material, geometry }, index) => (
        <mesh key={`other-${index}`} geometry={geometry} receiveShadow castShadow>
          <meshStandardMaterial
            color={getMaterialColor(material)}
            wireframe={wireframe}
            side={THREE.DoubleSide}
          />
        </mesh>
      ))}
      
      {/* Render water blocks with animated scale from bottom */}
      {waterGeometries.map(({ material, geometry }, index) => (
        <a.group
          key={`water-${index}`}
          position-y={waterSpring.positionY}
        >
          <a.mesh 
            geometry={geometry} 
            receiveShadow 
            castShadow
            scale-y={waterSpring.scaleY}
          >
            <meshStandardMaterial
              color={getMaterialColor(material)}
              wireframe={wireframe}
              side={THREE.DoubleSide}
            />
          </a.mesh>
        </a.group>
      ))}
    </group>
  )
}

