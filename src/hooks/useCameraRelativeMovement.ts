import { useThree } from '@react-three/fiber'
import { useMemo } from 'react'
import * as THREE from 'three'

// Get camera-relative movement deltas for horizontal plane (X-Z)
export function useCameraRelativeMovement() {
  const { camera } = useThree()

  const movementDeltas = useMemo(() => {
    // Get camera's forward direction (where it's looking)
    const forward = new THREE.Vector3()
    camera.getWorldDirection(forward)
    
    // Project forward vector onto X-Z plane (set Y to 0)
    forward.y = 0
    forward.normalize()
    
    // Calculate right vector (perpendicular to forward on X-Z plane)
    // Right = forward × up, then project to X-Z plane
    const up = new THREE.Vector3(0, 1, 0)
    const right = new THREE.Vector3()
    right.crossVectors(forward, up).normalize()
    
    // For X-Z plane movement, we need to flip the cross product
    // Since we want right to point right when viewed from camera
    right.crossVectors(up, forward).normalize()
    
    return {
      forward: [forward.x, forward.z] as [number, number],
      right: [right.x, right.z] as [number, number],
    }
  }, [camera])

  // Get movement delta for a direction
  const getMovementDelta = (direction: 'forward' | 'backward' | 'left' | 'right'): [number, number] => {
    const { forward, right } = movementDeltas
    
    switch (direction) {
      case 'forward':
        // Move away from camera (forward direction)
        return [Math.round(forward[0]), Math.round(forward[1])]
      case 'backward':
        // Move toward camera (opposite of forward)
        return [Math.round(-forward[0]), Math.round(-forward[1])]
      case 'left':
        // Move to camera's left
        return [Math.round(-right[0]), Math.round(-right[1])]
      case 'right':
        // Move to camera's right
        return [Math.round(right[0]), Math.round(right[1])]
    }
  }

  return { getMovementDelta }
}





