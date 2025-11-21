import { useSpring, a, useSpringRef } from '@react-spring/three'
import { useEffect, useMemo } from 'react'
import * as THREE from 'three'
import { type TetrominoType, getRotatedPositions } from './Tetromino'
import { generateAllQuads, type Quad } from '../utils/greedyMeshing'

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
  const blockPositions = useMemo(() => getRotatedPositions(type, rotation), [type, rotation])
  const shadowQuads = useMemo(() => {
    const occupiedBlocks = new Set<string>()
    
    for (const blockPos of blockPositions) {
      const worldX = position[0] + blockPos[0]
      const worldY = landingY + blockPos[1]
      const worldZ = position[2] + blockPos[2]
      occupiedBlocks.add(`${worldX},${worldY},${worldZ}`)
    }

    return generateAllQuads(occupiedBlocks)
      .filter((quad) => quad.direction !== 'bottom')
  }, [blockPositions, landingY, position])
  
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
      {shadowQuads.map((quad, index) => {
        const transform = getQuadTransform(quad)
        if (!transform) return null

        const { position: quadPosition, rotation: quadRotation, size } = transform

        return (
          <a.mesh key={`${quad.direction}-${index}-${quad.position.join(',')}`} position={quadPosition} rotation={quadRotation}>
            <planeGeometry args={size} />
            {/* @ts-ignore - react-spring animated material type issue */}
            <a.meshStandardMaterial
              color={shadowColor}
              opacity={shadowSpring.opacity}
              transparent
              emissive={new THREE.Color(shadowColor)}
              emissiveIntensity={0.1}
              side={THREE.DoubleSide}
            />
          </a.mesh>
        )
      })}
    </a.group>
  )
}

interface QuadTransform {
  position: [number, number, number]
  rotation: [number, number, number]
  size: [number, number]
}

function getQuadTransform(quad: Quad): QuadTransform | null {
  const { position, direction, width, height } = quad
  const [px, py, pz] = position
  const halfWidth = (width - 1) / 2
  const halfHeight = (height - 1) / 2

  switch (direction) {
    case 'top':
      return {
        position: [px + halfWidth, py + 0.5, pz + halfHeight],
        rotation: [-Math.PI / 2, 0, 0],
        size: [width, height],
      }
    case 'bottom':
      return {
        position: [px + halfWidth, py - 0.5, pz + halfHeight],
        rotation: [Math.PI / 2, 0, 0],
        size: [width, height],
      }
    case 'front':
      return {
        position: [px + halfWidth, py + halfHeight, pz + 0.5],
        rotation: [0, 0, 0],
        size: [width, height],
      }
    case 'back':
      return {
        position: [px + halfWidth, py + halfHeight, pz - 0.5],
        rotation: [0, Math.PI, 0],
        size: [width, height],
      }
    case 'right':
      return {
        position: [px + 0.5, py + halfHeight, pz + halfWidth],
        rotation: [0, -Math.PI / 2, 0],
        size: [width, height],
      }
    case 'left':
      return {
        position: [px - 0.5, py + halfHeight, pz + halfWidth],
        rotation: [0, Math.PI / 2, 0],
        size: [width, height],
      }
    default:
      return null
  }
}

