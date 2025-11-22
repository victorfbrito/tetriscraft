import { useMemo, memo, useEffect, useRef } from 'react'
import { useSpring, a } from '@react-spring/three'
import { useAnimations } from '@react-three/drei'
import * as THREE from 'three'
import { type FaceDirection, getDecorationPosition } from '../../utils/faceCulling'

interface AnimatedDecorationInstanceProps {
  node: any // GLTF node (can be Mesh or Group)
  blockPosition: [number, number, number]
  face: FaceDirection
  rotation: [number, number, number]
  delay: number
  animations?: THREE.AnimationClip[]
  phaseIndex?: number
}

function AnimatedDecorationInstance({
  node,
  blockPosition,
  face,
  rotation,
  delay,
  animations = [],
  phaseIndex,
}: AnimatedDecorationInstanceProps) {
  const groupRef = useRef<THREE.Group>(null)
  
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
  
  // Clone the node - exact same structure as WaterBlocks
  const clonedNode = useMemo(() => {
    if (!node) return null
    
    const cloned = node.clone(true)
    cloned.position.set(0, 0, 0)
    cloned.rotation.set(0, 0, 0)
    cloned.traverse((child: THREE.Object3D) => {
      child.castShadow = false
      child.receiveShadow = false
    })
    
    return cloned
  }, [node])

  // Set up animations - exact same structure as WaterBlocks
  const { actions, names } = useAnimations(animations || [], groupRef)
  const bubbleClips = useMemo(() => names.filter((name) => name.includes('Bubble')), [names])
  const waterClips = useMemo(() => names.filter((name) => name.includes('Water')), [names])

  // Handle bubble animations - exact same as WaterBlocks
  useEffect(() => {
    const stops: Array<() => void> = []
    bubbleClips.forEach((name) => {
      const action = actions?.[name]
      if (!action) return
      action.reset().setLoop(THREE.LoopRepeat, Infinity).fadeIn(0.15).play()
      stops.push(() => action.stop())
    })

    return () => {
      stops.forEach((stop) => stop())
    }
  }, [actions, bubbleClips])

  // Handle water animations with phase-based timing - like WaterBlocks
  useEffect(() => {
    const stops: Array<() => void> = []

    waterClips.forEach((name) => {
      const action = actions?.[name]
      if (!action) return

      const clipDuration = action.getClip().duration || 4
      const resolvedIndex = phaseIndex ?? Math.round(blockPosition[2])
      const isEvenRow = Math.abs(resolvedIndex) % 2 === 0
      const startTime = isEvenRow ? 0 : clipDuration * 0.5

      action.reset().setLoop(THREE.LoopRepeat, Infinity)
      action.time = startTime
      action.fadeIn(0.3).play()
      stops.push(() => action.stop())
    })

    return () => {
      stops.forEach((stop) => stop())
    }
  }, [actions, waterClips, blockPosition, phaseIndex])

  if (!clonedNode) {
    return null
  }
  
  // For animated decorations, always use primitive to render the cloned object
  // This ensures proper handling of Groups, Meshes, and nested structures
  // Position and rotation are set on the group so scaling happens around the correct pivot
  return (
    <a.group ref={groupRef} position={position} rotation={rotation} scale={springs.scale}>
      <primitive object={clonedNode} />
    </a.group>
  )
}

// Memoize to prevent re-renders when props haven't changed
export default memo(AnimatedDecorationInstance, (prevProps, nextProps) => {
  return (
    prevProps.node === nextProps.node &&
    prevProps.blockPosition.join(',') === nextProps.blockPosition.join(',') &&
    prevProps.face === nextProps.face &&
    prevProps.rotation.join(',') === nextProps.rotation.join(',') &&
    prevProps.delay === nextProps.delay &&
    prevProps.animations === nextProps.animations &&
    prevProps.phaseIndex === nextProps.phaseIndex
  )
})

