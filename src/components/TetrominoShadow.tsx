import { useSpring, a } from '@react-spring/three'
import * as THREE from 'three'
import { type TetrominoType, getRotatedPositions } from './Tetromino'

interface TetrominoShadowProps {
  type: TetrominoType
  position: [number, number, number]
  rotation: 0 | 90 | 180 | 270
  landingY: number
  isDropping?: boolean
  startY?: number
}

export default function TetrominoShadow({ 
  type, 
  position, 
  rotation, 
  landingY,
  isDropping = false,
  startY,
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
  
  return (
    <group>
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
            color="#ffffff"
            opacity={shadowSpring.opacity}
            transparent
            emissive={new THREE.Color('#ffffff')}
            emissiveIntensity={0.1}
          />
        </mesh>
      ))}
    </group>
  )
}

