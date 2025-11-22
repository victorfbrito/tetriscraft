import { useEffect } from 'react'
import { useThree } from '@react-three/fiber'
import * as THREE from 'three'

interface CameraControlsProps {
  activeTetromino: { type: string; position: [number, number, number]; rotation: number } | null
  moveTetromino: (deltaX: number, deltaZ: number) => void
  rotateTetromino: () => void
  dropTetromino: () => void
}

export default function CameraControls({
  activeTetromino,
  moveTetromino,
  rotateTetromino,
  dropTetromino,
}: CameraControlsProps) {
  const { camera } = useThree()

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!activeTetromino) return

      // Get camera's forward direction (where it's looking)
      const forward = new THREE.Vector3()
      camera.getWorldDirection(forward)
      
      // Project forward vector onto X-Z plane (set Y to 0)
      forward.y = 0
      forward.normalize()
      
      // Calculate right vector (perpendicular to forward on X-Z plane)
      const up = new THREE.Vector3(0, 1, 0)
      const right = new THREE.Vector3()
      right.crossVectors(up, forward).normalize()
      
      let deltaX = 0
      let deltaZ = 0

      switch (event.key.toLowerCase()) {
        case 'w':
        case 'arrowup':
          // Move away from camera (forward direction)
          deltaX = Math.round(forward.x)
          deltaZ = Math.round(forward.z)
          break
        case 's':
        case 'arrowdown':
          // Move toward camera (opposite of forward)
          deltaX = Math.round(-forward.x)
          deltaZ = Math.round(-forward.z)
          break
        case 'd':
        case 'arrowright':
          // Move to camera's left
          deltaX = Math.round(-right.x)
          deltaZ = Math.round(-right.z)
          break
        case 'a':
        case 'arrowleft':
          // Move to camera's right
          deltaX = Math.round(right.x)
          deltaZ = Math.round(right.z)
          break
        case 'r':
          rotateTetromino()
          return
        case ' ':
          event.preventDefault()
          dropTetromino()
          return
      }

      if (deltaX !== 0 || deltaZ !== 0) {
        moveTetromino(deltaX, deltaZ)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [activeTetromino, moveTetromino, rotateTetromino, dropTetromino, camera])

  return null // This component doesn't render anything
}

