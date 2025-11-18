import { useMemo } from 'react'
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
  
  return (
    <group>
      {materialGeometries.map(({ material, geometry }, index) => (
        <mesh key={index} geometry={geometry} receiveShadow castShadow>
          <meshStandardMaterial
            color={getMaterialColor(material)}
            wireframe={wireframe}
            side={THREE.DoubleSide}
          />
        </mesh>
      ))}
    </group>
  )
}

