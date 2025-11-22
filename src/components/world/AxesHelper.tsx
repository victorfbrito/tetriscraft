import { Text } from '@react-three/drei'
import * as THREE from 'three'

export default function AxesHelper() {
  const axisLength = 3
  const axisThickness = 0.05
  const labelOffset = 0.3

  return (
    <group>
      {/* X-axis (Red) */}
      <mesh position={[axisLength / 2, 0, 0]}>
        <boxGeometry args={[axisLength, axisThickness, axisThickness]} />
        <meshStandardMaterial color="#ff0000" emissive={new THREE.Color("#ff0000")} emissiveIntensity={0.5} />
      </mesh>
      <Text
        position={[axisLength + labelOffset, 0, 0]}
        fontSize={0.3}
        color="#ff0000"
        anchorX="center"
        anchorY="middle"
      >
        X
      </Text>
      
      {/* Y-axis (Green) */}
      <mesh position={[0, axisLength / 2, 0]}>
        <boxGeometry args={[axisThickness, axisLength, axisThickness]} />
        <meshStandardMaterial color="#00ff00" emissive={new THREE.Color("#00ff00")} emissiveIntensity={0.5} />
      </mesh>
      <Text
        position={[0, axisLength + labelOffset, 0]}
        fontSize={0.3}
        color="#00ff00"
        anchorX="center"
        anchorY="middle"
      >
        Y
      </Text>
      
      {/* Z-axis (Blue) */}
      <mesh position={[0, 0, axisLength / 2]}>
        <boxGeometry args={[axisThickness, axisThickness, axisLength]} />
        <meshStandardMaterial color="#0000ff" emissive={new THREE.Color("#0000ff")} emissiveIntensity={0.5} />
      </mesh>
      <Text
        position={[0, 0, axisLength + labelOffset]}
        fontSize={0.3}
        color="#0000ff"
        anchorX="center"
        anchorY="middle"
      >
        Z
      </Text>
    </group>
  )
}
