export default function AxesHelper() {
  const axisLength = 3
  const axisThickness = 0.05

  return (
    <group>
      {/* X-axis (Red) */}
      <mesh position={[axisLength / 2, 0, 0]}>
        <boxGeometry args={[axisLength, axisThickness, axisThickness]} />
        <meshStandardMaterial color="#ff0000" emissive="#ff0000" emissiveIntensity={0.5} />
      </mesh>
      {/* Y-axis (Green) */}
      <mesh position={[0, axisLength / 2, 0]}>
        <boxGeometry args={[axisThickness, axisLength, axisThickness]} />
        <meshStandardMaterial color="#00ff00" emissive="#00ff00" emissiveIntensity={0.5} />
      </mesh>
      {/* Z-axis (Blue) */}
      <mesh position={[0, 0, axisLength / 2]}>
        <boxGeometry args={[axisThickness, axisThickness, axisLength]} />
        <meshStandardMaterial color="#0000ff" emissive="#0000ff" emissiveIntensity={0.5} />
      </mesh>
    </group>
  )
}

