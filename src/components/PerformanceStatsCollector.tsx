import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useRef } from 'react'
import { updatePerformanceStats, type PerformanceStats } from '../hooks/usePerformanceStats'

interface PerformanceStatsCollectorProps {
  enabled?: boolean
}

// Component that collects performance stats inside Canvas but doesn't render anything
export default function PerformanceStatsCollector({ enabled = true }: PerformanceStatsCollectorProps) {
  const { gl } = useThree()
  const statsRef = useRef<{
    frames: number
    lastTime: number
  }>({
    frames: 0,
    lastTime: performance.now(),
  })

  useFrame(() => {
    if (!enabled) return

    const statsData = statsRef.current
    statsData.frames++

    const now = performance.now()
    const elapsed = now - statsData.lastTime

    if (elapsed >= 1000) {
      const fps = Math.round((statsData.frames * 1000) / elapsed)
      statsData.frames = 0
      statsData.lastTime = now

      // Get renderer info
      const info = gl.info
      const stats: PerformanceStats = {
        fps,
        drawCalls: info.render.calls,
        triangles: info.render.triangles,
        geometries: info.memory.geometries,
        textures: info.memory.textures,
      }

      updatePerformanceStats(stats)
    }
  })

  return null
}

