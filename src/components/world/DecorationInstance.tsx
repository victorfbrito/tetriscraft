import { useMemo, memo } from 'react'
import { useSpring, a } from '@react-spring/three'
import * as THREE from 'three'
import { type FaceDirection, getDecorationPosition } from '../../utils/faceCulling'

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
  const position = useMemo(
    () => getDecorationPosition(blockPosition, face),
    [blockPosition, face]
  )
  
  // Scale animation: scale-up on mount (same as trees)
  const [springs] = useSpring(() => ({
    from: { scale: 0 },
    to: { scale: 1 },
    config: { mass: 1, tension: 170, friction: 18 },
    delay: delay,
  }), [delay])
  
  // Clone the node and reset position/rotation (position and rotation will be on the group)
  const clonedNode = useMemo(() => {
    if (!node) return null
    
    const cloned = node.clone()
    cloned.position.set(0, 0, 0)
    cloned.rotation.set(0, 0, 0)
    
    // Enable shadows on all meshes
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
  
  // Use primitive to handle both Mesh and Group types consistently
  return (
    <a.group position={position} rotation={rotation} scale={springs.scale}>
      <primitive object={clonedNode} />
    </a.group>
  )
}

// Memoize to prevent re-renders when props haven't changed
export default memo(DecorationInstance, (prevProps, nextProps) => {
  return (
    prevProps.node === nextProps.node &&
    prevProps.blockPosition.join(',') === nextProps.blockPosition.join(',') &&
    prevProps.face === nextProps.face &&
    prevProps.rotation.join(',') === nextProps.rotation.join(',') &&
    prevProps.delay === nextProps.delay
  )
})

