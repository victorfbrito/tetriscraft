import { useMemo } from 'react'
import { useSpring, a } from '@react-spring/three'
import * as THREE from 'three'
import { type FaceDirection } from '../utils/faceCulling'

interface DecorationInstanceProps {
  node: any // GLTF node (can be Mesh or Group)
  blockPosition: [number, number, number]
  face: FaceDirection
  rotation: [number, number, number]
}

export default function DecorationInstance({
  node,
  blockPosition,
  face,
  rotation,
}: DecorationInstanceProps) {
  // Calculate position on the face
  // Face is centered on the block face, flush with the surface
  const position = useMemo(() => {
    const [x, y, z] = blockPosition
    const offset = 0.5 // Half block size
    
    switch (face) {
      case 'left':
        return [x - offset, y, z] as [number, number, number]
      case 'right':
        return [x + offset, y, z] as [number, number, number]
      case 'front':
        return [x, y, z + offset] as [number, number, number]
      case 'back':
        return [x, y, z - offset] as [number, number, number]
      case 'top':
        return [x, y + offset, z] as [number, number, number]
      case 'bottom':
        return [x, y - offset, z] as [number, number, number]
      default:
        return [x, y, z] as [number, number, number]
    }
  }, [blockPosition, face])
  
  // Random delay for show-up animation (50ms to 300ms, same as trees)
  const showUpDelay = useMemo(() => 50 + Math.random() * 250, [])
  
  // Scale animation: scale-up on mount (same as trees)
  const [springs] = useSpring(() => ({
    from: { scale: 0 },
    to: { scale: 1 },
    config: { mass: 1, tension: 170, friction: 18 },
    delay: showUpDelay,
  }), [showUpDelay])
  
  // Clone the node and set up position/rotation
  const clonedNode = useMemo(() => {
    if (!node) return null
    
    const cloned = node.clone()
    
    // If it's a Mesh, we'll handle it separately
    if (cloned.geometry && cloned.material) {
      return cloned
    }
    
    // For Groups or other object types, set position and rotation
    cloned.position.set(...position)
    cloned.rotation.set(...rotation)
    
    // Enable shadows on all children
    cloned.traverse((child: THREE.Object3D) => {
      if (child instanceof THREE.Mesh) {
        child.castShadow = true
        child.receiveShadow = true
      }
    })
    
    return cloned
  }, [node, position, rotation])
  
  if (!clonedNode) {
    return null
  }
  
  // Wrap in animated group for scale animation
  if (clonedNode.geometry && clonedNode.material) {
    // If node is a Mesh (has geometry and material), render as mesh
    return (
      <a.group scale={springs.scale}>
        <mesh
          position={position}
          rotation={rotation}
          geometry={clonedNode.geometry}
          material={clonedNode.material}
          castShadow
          receiveShadow
        />
      </a.group>
    )
  }
  
  // For Groups or other object types, use primitive to render the cloned object
  // Apply scale animation to the group
  return (
    <a.group scale={springs.scale}>
      <primitive object={clonedNode} />
    </a.group>
  )
}

