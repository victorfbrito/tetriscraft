import { useMemo, memo } from 'react'
import { useSpring, a } from '@react-spring/three'
import * as THREE from 'three'
import { type FaceDirection } from '../utils/faceCulling'

interface DecorationInstanceProps {
  node: any // GLTF node (can be Mesh or Group)
  blockPosition: [number, number, number]
  face: FaceDirection
  rotation: [number, number, number]
  delay: number
}

function DecorationInstance({
  node,
  blockPosition,
  face,
  rotation,
  delay,
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
  
  // Scale animation: scale-up on mount (same as trees)
  const [springs] = useSpring(() => ({
    from: { scale: 0 },
    to: { scale: 1 },
    config: { mass: 1, tension: 170, friction: 18 },
    delay: delay,
  }), [delay])
  
  // Clone the node and reset position/rotation (position and rotation will be on the group, not the child)
  const clonedNode = useMemo(() => {
    if (!node) return null
    
    const cloned = node.clone()
    
    // Reset position and rotation to origin - position and rotation will be on the group
    cloned.position.set(0, 0, 0)
    cloned.rotation.set(0, 0, 0)
    
    // If it's a Mesh, we're done
    if (cloned.geometry && cloned.material) {
      return cloned
    }
    
    // For Groups or other object types, enable shadows on all children
    cloned.traverse((child: THREE.Object3D) => {
      if (child instanceof THREE.Mesh) {
        child.castShadow = true
        child.receiveShadow = true
      }
    })
    
    return cloned
  }, [node])
  
  if (!clonedNode) {
    return null
  }
  
  // Wrap in animated group for scale animation
  // Position and rotation are set on the group so scaling happens around the correct pivot
  if (clonedNode.geometry && clonedNode.material) {
    // If node is a Mesh (has geometry and material), render as mesh
    return (
      <a.group position={position} rotation={rotation} scale={springs.scale}>
        <mesh
          geometry={clonedNode.geometry}
          material={clonedNode.material}
          castShadow
          receiveShadow
        />
      </a.group>
    )
  }
  
  // For Groups or other object types, use primitive to render the cloned object
  // Position and rotation are set on the group so scaling happens around the correct pivot
  return (
    <a.group position={position} rotation={rotation} scale={springs.scale}>
      <primitive object={clonedNode} />
    </a.group>
  )
}

// Memoize to prevent re-renders when props haven't changed
export default memo(DecorationInstance, (prevProps, nextProps) => {
  // Only re-render if props actually changed
  return (
    prevProps.node === nextProps.node &&
    prevProps.blockPosition[0] === nextProps.blockPosition[0] &&
    prevProps.blockPosition[1] === nextProps.blockPosition[1] &&
    prevProps.blockPosition[2] === nextProps.blockPosition[2] &&
    prevProps.face === nextProps.face &&
    prevProps.rotation[0] === nextProps.rotation[0] &&
    prevProps.rotation[1] === nextProps.rotation[1] &&
    prevProps.rotation[2] === nextProps.rotation[2] &&
    prevProps.delay === nextProps.delay
  )
})

