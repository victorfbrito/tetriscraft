import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { useSpring } from '@react-spring/three'
import * as THREE from 'three'

import { useDayNightCycle } from '../context/DayNightCycleContext'

const SKY_COLORS_BY_HOUR = [
    "#1a1a2e",
    "#1a1a2e",
    "#1a1a2e",
    "#1a1a2e",
    "#23385C",
    "#2B568A",
    "#3473B8",
    "#3c91e6",
    "#3c91e6",
    "#3c91e6",
    "#3c91e6",
    "#3c91e6",
    "#3c91e6",
    "#3c91e6",
    "#3c91e6",
    "#3c91e6",
    "#3473B8",
    "#2B568A",
    "#23385C",
    "#1a1a2e",
    "#1a1a2e",
    "#1a1a2e",
    "#1a1a2e",
    "#1a1a2e"
  ]
  
  
  

const getColorForHour = (hour: number) => {
  const normalizedHour = ((Math.floor(hour) % 24) + 24) % 24
  return SKY_COLORS_BY_HOUR[normalizedHour] ?? SKY_COLORS_BY_HOUR[0]
}

export default function DynamicSkyColor() {
  const { scene } = useThree()
  const initializedRef = useRef(false)
  const colorRef = useRef(new THREE.Color(SKY_COLORS_BY_HOUR[0]))
  const { hour, cycleDuration, speedMultiplier } = useDayNightCycle()

  const hourDurationMs = useMemo(() => {
    const secondsPerHour = (cycleDuration / 24) / Math.max(speedMultiplier, 0.0001)
    return Math.max(16, secondsPerHour * 1000)
  }, [cycleDuration, speedMultiplier])

  useEffect(() => {
    if (!initializedRef.current) {
      scene.background = colorRef.current
      initializedRef.current = true
    }
  }, [scene])

  const { color } = useSpring({
    color: getColorForHour(hour),
    config: { duration: hourDurationMs },
  })

  useFrame(() => {
    const current = color.get()
    if (typeof current === 'string') {
      colorRef.current.set(current)
      scene.background = colorRef.current
    }
  })

  return null
}

