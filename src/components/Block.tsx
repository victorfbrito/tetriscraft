import { type MaterialType, getMaterialColor } from '../utils/materials'
import * as THREE from 'three'

interface BlockProps {
  position?: [number, number, number]
  color?: string
  material?: MaterialType
  wireframe?: boolean
}

export default function Block({ 
  position = [0, 0, 0], 
  color, 
  material,
  wireframe = false 
}: BlockProps) {
  // Use material color if provided, otherwise fall back to color prop
  const blockColor = material ? getMaterialColor(material) : (color || "#4a90e2")
  
  return (
    <mesh position={position} receiveShadow castShadow>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial
        color={blockColor}
        wireframe={wireframe}
        {...(wireframe ? { emissive: new THREE.Color(blockColor), emissiveIntensity: 0.3 } : {})}
      />
    </mesh>
  )
}

