import { useEffect, useRef, useState } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Html } from '@react-three/drei'

interface PerformanceMonitorProps {
  enabled?: boolean
}

export default function PerformanceMonitor({ enabled = true }: PerformanceMonitorProps) {
  const { gl } = useThree()
  const [visible, setVisible] = useState(true)
  const statsRef = useRef<{
    frames: number
    lastTime: number
    fps: number
    drawCalls: number
    triangles: number
    geometries: number
    textures: number
  }>({
    frames: 0,
    lastTime: performance.now(),
    fps: 0,
    drawCalls: 0,
    triangles: 0,
    geometries: 0,
    textures: 0,
  })

  const [stats, setStats] = useState({
    fps: 0,
    drawCalls: 0,
    triangles: 0,
    geometries: 0,
    textures: 0,
  })

  useFrame(() => {
    if (!enabled) return

    const statsData = statsRef.current
    statsData.frames++

    const now = performance.now()
    const elapsed = now - statsData.lastTime

    if (elapsed >= 1000) {
      statsData.fps = Math.round((statsData.frames * 1000) / elapsed)
      statsData.frames = 0
      statsData.lastTime = now

      // Get renderer info
      const info = gl.info
      statsData.drawCalls = info.render.calls
      statsData.triangles = info.render.triangles
      statsData.geometries = info.memory.geometries
      statsData.textures = info.memory.textures

      // Update state to trigger re-render
      setStats({
        fps: statsData.fps,
        drawCalls: statsData.drawCalls,
        triangles: statsData.triangles,
        geometries: statsData.geometries,
        textures: statsData.textures,
      })
    }
  })

  useEffect(() => {
    if (!enabled) return

    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === 'p' || e.key === 'P') {
        setVisible((prev) => !prev)
      }
    }

    window.addEventListener('keypress', handleKeyPress)
    return () => window.removeEventListener('keypress', handleKeyPress)
  }, [enabled])

  if (!enabled || !visible) return null

  return (
    <Html position={[5, 5, 5]} style={{ pointerEvents: 'none' }}>
      <div
        style={{
          position: 'fixed',
          top: '10px',
          right: '10px',
          background: 'rgba(0,0,0,0.8)',
          color: 'white',
          padding: '10px',
          fontFamily: 'monospace',
          fontSize: '12px',
          zIndex: 1000,
          borderRadius: '4px',
        }}
      >
        <div>
          <strong>Performance Stats</strong>
        </div>
        <div>FPS: {stats.fps}</div>
        <div>Draw Calls: {stats.drawCalls}</div>
        <div>Triangles: {stats.triangles.toLocaleString()}</div>
        <div>Geometries: {stats.geometries}</div>
        <div>Textures: {stats.textures}</div>
        <div style={{ marginTop: '5px', fontSize: '10px', color: '#aaa' }}>
          Press 'P' to toggle
        </div>
      </div>
    </Html>
  )
}