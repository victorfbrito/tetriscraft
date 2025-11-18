import { useState, useEffect } from 'react'

export interface PerformanceStats {
  fps: number
  drawCalls: number
  triangles: number
  geometries: number
  textures: number
}

// Global state for performance stats (shared between Canvas and UI)
let globalStats: PerformanceStats = {
  fps: 0,
  drawCalls: 0,
  triangles: 0,
  geometries: 0,
  textures: 0,
}

let statsListeners: Set<() => void> = new Set()

export function usePerformanceStats() {
  const [stats, setStats] = useState<PerformanceStats>(globalStats)

  useEffect(() => {
    const updateListener = () => {
      setStats({ ...globalStats })
    }

    statsListeners.add(updateListener)
    return () => {
      statsListeners.delete(updateListener)
    }
  }, [])

  return stats
}

export function updatePerformanceStats(newStats: PerformanceStats) {
  globalStats = newStats
  statsListeners.forEach(listener => listener())
}

