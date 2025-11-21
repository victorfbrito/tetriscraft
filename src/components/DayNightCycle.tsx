import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useDayNightCycleSnapshot } from '../context/DayNightCycleContext'

type Vec3 = [number, number, number]

const ORBIT_AMPLITUDE = 5
const MIN_AMBIENT_INTENSITY = 0.1
const AMBIENT_SCALE = 0.3
const SUN_LIGHT_RANGE = { min: 0, scale: 0.8 }
const MOON_LIGHT_RANGE = { min: 0, scale: 0.4 }

const COLORS = {
  sunLightDay: new THREE.Color(1, 0.85, 0.5),
  sunLightSunset: new THREE.Color(2.5, 0.5, 0.2),
  sunVisualDay: new THREE.Color(10, 0.9, 0.3),
  sunVisualSunset: new THREE.Color(10, 0.5, 0.2),
  moonLight: new THREE.Color(0.1, 0.2, 2),
  moonVisual: new THREE.Color(0.5, 0.7, 1),
}

const computeOrbitState = (angle: number, radius: number, height: number) => {
  const sinAngle = Math.sin(angle)
  const cosAngle = Math.cos(angle)
  const position: Vec3 = [radius * cosAngle, height + sinAngle * ORBIT_AMPLITUDE, radius * Math.sin(angle)]

  return { position, sinAngle }
}

const updateDirectionalLight = (
  light: THREE.DirectionalLight | null,
  position: Vec3,
  intensity: number,
  color?: THREE.Color
) => {
  if (!light) return
  light.position.set(...position)
  light.lookAt(0, 0, 0)
  light.intensity = intensity
  if (color) {
    light.color.copy(color)
  }
}

const updateVisualMesh = (mesh: THREE.Mesh | null, position: Vec3, color: THREE.Color) => {
  if (!mesh) return
  mesh.position.set(...position)
  const material = mesh.material as THREE.MeshStandardMaterial | undefined
  if (material) {
    material.color.copy(color)
    material.emissive.copy(color)
  }
}

type DayNightCycleProps = {
  radius?: number // Radius of the circular path
  height?: number // Height of the lights above the scene
  showPath?: boolean
}

export default function DayNightCycle({
  radius = 10,
  height = 8,
  showPath = false,
}: DayNightCycleProps) {
  const sunLightRef = useRef<THREE.DirectionalLight>(null)
  const moonLightRef = useRef<THREE.DirectionalLight>(null)
  const ambientLightRef = useRef<THREE.AmbientLight>(null)
  const sunVisualRef = useRef<THREE.Mesh>(null)
  const moonVisualRef = useRef<THREE.Mesh>(null)
  const sunMarkerRef = useRef<THREE.Mesh>(null)
  const moonMarkerRef = useRef<THREE.Mesh>(null)
  const getCycleState = useDayNightCycleSnapshot()

  const sunLightColorRef = useRef(new THREE.Color())
  const sunVisualColorRef = useRef(new THREE.Color())

  useFrame(() => {
    const { cycleProgress, sunHeightFactor, sunColorBlend } = getCycleState()
    const angle = cycleProgress * Math.PI * 2 - Math.PI / 2
    const sunOrbit = computeOrbitState(angle, radius, height)
    const moonOrbit = computeOrbitState(angle + Math.PI, radius, height)

    const sunLightColor = sunLightColorRef.current
      .copy(COLORS.sunLightSunset)
      .lerp(COLORS.sunLightDay, sunColorBlend)

    const sunVisualColor = sunVisualColorRef.current
      .copy(COLORS.sunVisualSunset)
      .lerp(COLORS.sunVisualDay, sunColorBlend)

    updateDirectionalLight(
      sunLightRef.current,
      sunOrbit.position,
      Math.max(SUN_LIGHT_RANGE.min, sunOrbit.sinAngle) * SUN_LIGHT_RANGE.scale,
      sunLightColor
    )

    updateDirectionalLight(
      moonLightRef.current,
      moonOrbit.position,
      Math.max(MOON_LIGHT_RANGE.min, moonOrbit.sinAngle) * MOON_LIGHT_RANGE.scale,
      COLORS.moonLight
    )

    updateVisualMesh(sunVisualRef.current, sunOrbit.position, sunVisualColor)
    updateVisualMesh(moonVisualRef.current, moonOrbit.position, COLORS.moonVisual)

    updateVisualMesh(sunMarkerRef.current, sunOrbit.position, sunVisualColor)
    updateVisualMesh(moonMarkerRef.current, moonOrbit.position, COLORS.moonVisual)

    if (ambientLightRef.current) {
      ambientLightRef.current.intensity = MIN_AMBIENT_INTENSITY + sunHeightFactor * AMBIENT_SCALE
    }
  })

  return (
    <>
      <ambientLight ref={ambientLightRef} intensity={0.5} />
      <directionalLight
        ref={sunLightRef}
        position={[radius, height, 0]}
        intensity={0.3}
        castShadow
        shadow-mapSize={[4096, 4096]}
        shadow-camera-far={50}
        shadow-camera-left={-10}
        shadow-camera-right={10}
        shadow-camera-top={10}
        shadow-camera-bottom={-10}
        shadow-bias={-0.0001}
      />
      <directionalLight
        ref={moonLightRef}
        position={[-radius, height, 0]}
        intensity={0.3}
        castShadow
        shadow-mapSize={[4096, 4096]}
        shadow-camera-far={50}
        shadow-camera-left={-10}
        shadow-camera-right={10}
        shadow-camera-top={10}
        shadow-camera-bottom={-10}
        shadow-bias={-0.0001}
      />
      {/* Always-visible light source representations */}
      <mesh ref={sunVisualRef} position={[radius, height, 0]}>
        <sphereGeometry args={[0.5, 16, 16]} />
        <meshStandardMaterial 
          color={COLORS.sunVisualDay} 
          emissive={COLORS.sunVisualDay} 
          emissiveIntensity={0.3}
          toneMapped={false}
        />
      </mesh>
      <mesh ref={moonVisualRef} position={[-radius, height, 0]}>
        <sphereGeometry args={[0.4, 16, 16]} />
        <meshStandardMaterial 
          color={COLORS.moonVisual} 
          emissive={COLORS.moonVisual} 
          emissiveIntensity={0.3}
          toneMapped={false}
        />
      </mesh>
      {showPath && (
        <group>
          <mesh ref={sunMarkerRef}>
            <sphereGeometry args={[0.2, 16, 16]} />
            <meshStandardMaterial 
              color={COLORS.sunVisualDay} 
              emissive={COLORS.sunVisualDay} 
              emissiveIntensity={0.8}
            />
          </mesh>
          <mesh ref={moonMarkerRef}>
            <sphereGeometry args={[0.15, 16, 16]} />
            <meshStandardMaterial 
              color={COLORS.moonVisual} 
              emissive={COLORS.moonVisual} 
              emissiveIntensity={0.6}
            />
          </mesh>
        </group>
      )}
    </>
  )
}

