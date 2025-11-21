import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

export type DayNightCycleState = {
  cycleProgress: number
  sunHeightFactor: number
  hour: number
  shouldWindowsGlow: boolean
  sunColorBlend: number
  isPaused: boolean
  speedMultiplier: number
  cycleDuration: number
}

type DayNightCycleContextValue = {
  subscribe: (listener: () => void) => () => void
  getState: () => DayNightCycleState
}

type DayNightCycleProviderProps = {
  children: React.ReactNode
  speedMultiplier: number
  isPaused: boolean
  onStateChange?: (state: DayNightCycleState) => void
}

const initialState: DayNightCycleState = {
  cycleProgress: 0,
  sunHeightFactor: 1,
  hour: 12,
  shouldWindowsGlow: false,
  sunColorBlend: 1,
  isPaused: false,
  speedMultiplier: 1,
  cycleDuration: 120,
}

const DayNightCycleContext = createContext<DayNightCycleContextValue | null>(null)

export function DayNightCycleProvider({
  children,
  speedMultiplier,
  isPaused,
  onStateChange,
}: DayNightCycleProviderProps) {
  const stateRef = useRef<DayNightCycleState>(initialState)
  const listenersRef = useRef(new Set<() => void>())

  const cycleTimeRef = useRef(0)
  const lastFrameTimeRef = useRef(0)
  const wasPausedRef = useRef(false)
  const speedMultiplierRef = useRef(speedMultiplier)
  const pausedRef = useRef(isPaused)
  const cycleDuration = 120

  useEffect(() => {
    speedMultiplierRef.current = speedMultiplier
  }, [speedMultiplier])

  useEffect(() => {
    pausedRef.current = isPaused
  }, [isPaused])

  const notify = useCallback(() => {
    listenersRef.current.forEach((listener) => listener())
  }, [])

  const subscribe = useCallback((listener: () => void) => {
    listenersRef.current.add(listener)
    return () => listenersRef.current.delete(listener)
  }, [])

  const getState = useCallback(() => stateRef.current, [])

  useFrame(({ clock }) => {
    const elapsedTime = clock.getElapsedTime()
    const paused = pausedRef.current
    const speed = speedMultiplierRef.current

    if (lastFrameTimeRef.current === 0) {
      lastFrameTimeRef.current = elapsedTime
    }

    if (paused && !wasPausedRef.current) {
      wasPausedRef.current = true
    } else if (!paused && wasPausedRef.current) {
      lastFrameTimeRef.current = elapsedTime
      wasPausedRef.current = false
    }

    if (!paused) {
      const delta = elapsedTime - lastFrameTimeRef.current
      cycleTimeRef.current += delta * speed
      lastFrameTimeRef.current = elapsedTime
    }

    const cycleProgress = ((cycleTimeRef.current % cycleDuration) + cycleDuration) / cycleDuration
    const angle = cycleProgress * Math.PI * 2 - Math.PI / 2
    const sunHeightFactor = (Math.sin(angle) + 1) / 2
    const rawHour = cycleProgress * 24
    const hour = ((rawHour % 24) + 24) % 24
    const shouldWindowsGlow = hour >= 18 || hour < 6
    const sunColorBlend = THREE.MathUtils.clamp((sunHeightFactor - 0.6) / 0.3, 0, 1)

    const nextState: DayNightCycleState = {
      cycleProgress,
      cycleDuration,
      sunHeightFactor,
      hour,
      shouldWindowsGlow,
      sunColorBlend,
      isPaused: paused,
      speedMultiplier: speed,
    }

    stateRef.current = nextState
    onStateChange?.(nextState)
    notify()
  })

  const contextValue = useMemo(
    () => ({
      subscribe,
      getState,
    }),
    [subscribe, getState]
  )

  return <DayNightCycleContext.Provider value={contextValue}>{children}</DayNightCycleContext.Provider>
}

export function useDayNightCycle() {
  const context = useContext(DayNightCycleContext)
  if (!context) {
    throw new Error('useDayNightCycle must be used within a DayNightCycleProvider')
  }

  const [state, setState] = useState(context.getState())

  useEffect(() => {
    return context.subscribe(() => setState(context.getState()))
  }, [context])

  return state
}

export function useDayNightCycleSnapshot() {
  const context = useContext(DayNightCycleContext)
  if (!context) {
    throw new Error('useDayNightCycleSnapshot must be used within a DayNightCycleProvider')
  }
  return context.getState
}

