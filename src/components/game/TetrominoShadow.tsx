import { useSpring, a, useSpringRef } from '@react-spring/three'
import { useEffect } from 'react'
import * as THREE from 'three'
import { type TetrominoType, getRotatedPositions } from './Tetromino'

interface TetrominoShadowProps {
  type: TetrominoType
  position: [number, number, number]
  rotation: 0 | 90 | 180 | 270
  landingY: number
  isDropping?: boolean
  startY?: number
  isValid?: boolean
  shake?: boolean
}

export default function TetrominoShadow({ 
  type, 
  position, 
  rotation, 
  landingY,
  isDropping = false,
  startY,
  isValid = true,
  shake = false,
}: TetrominoShadowProps) {
  const blockPositions = getRotatedPositions(type, rotation)
  
  // Fade out shadow as tetromino drops
  const shadowSpring = useSpring({
    opacity: isDropping && startY !== undefined 
      ? 0 
      : 0.2,
    from: { opacity: 0.2 },
    config: { mass: 1, tension: 100, friction: 20 },
  })

  // Shake animation
  const shakeApi = useSpringRef()
  const shakeSpring = useSpring({
    ref: shakeApi,
    x: 0,
    z: 0,
    config: { mass: 1, tension: 300, friction: 100 },
  })

  // Trigger shake animation when shake prop becomes true
  useEffect(() => {
    if (shake) {
      shakeApi.start({
        from: { x: 0, z: 0 },
        to: [
          { x: -0.05, z: -0.05 },
          { x: 0.05, z: 0.05 },
          { x: -0.05, z: -0.05 },
          { x: 0.05, z: 0.05 },
          { x: 0, z: 0 },
        ],
        config: { duration: 100 },
      })
    }
  }, [shake, shakeApi])
  
  // Determine shadow color based on validity
  const shadowColor = isValid ? '#ffffff' : '#ff0000'
  
  return (
    <a.group position-x={shakeSpring.x} position-z={shakeSpring.z}>
      {blockPositions.map((blockPos, index) => (
        <mesh
          key={index}
          position={[
            position[0] + blockPos[0],
            landingY + blockPos[1],
            position[2] + blockPos[2],
          ]}
        >
          <boxGeometry args={[1, 1, 1]} />
          {/* @ts-ignore - react-spring animated material type issue */}
          <a.meshStandardMaterial
            color={shadowColor}
            opacity={shadowSpring.opacity}
            transparent
            emissive={new THREE.Color(shadowColor)}
            emissiveIntensity={0.1}
          />
        </mesh>
      ))}
    </a.group>
  )
}

