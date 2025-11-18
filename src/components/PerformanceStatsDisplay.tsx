import { useState, useEffect } from 'react'
import { usePerformanceStats } from '../hooks/usePerformanceStats'

export default function PerformanceStatsDisplay() {
  const stats = usePerformanceStats()
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === 'p' || e.key === 'P') {
        setVisible((prev) => !prev)
      }
    }

    window.addEventListener('keypress', handleKeyPress)
    return () => window.removeEventListener('keypress', handleKeyPress)
  }, [])

  if (!visible) return null

  return (
    <div
      style={{
        position: 'absolute',
        top: '20px',
        left: '20px',
        background: 'rgba(26, 26, 46, 0.9)',
        color: '#fff',
        padding: '15px 20px',
        fontFamily: 'system-ui, sans-serif',
        fontSize: '12px',
        zIndex: 1000,
        borderRadius: '8px',
        border: '1px solid rgba(255, 255, 255, 0.1)',
      }}
    >
      <h3 style={{ margin: '0 0 10px 0', fontSize: '16px', fontWeight: 'bold' }}>Performance Stats</h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontFamily: 'monospace', fontSize: '12px' }}>
        <div>FPS: {stats.fps}</div>
        <div>Draw Calls: {stats.drawCalls}</div>
        <div>Triangles: {stats.triangles.toLocaleString()}</div>
        <div>Geometries: {stats.geometries}</div>
        <div>Textures: {stats.textures}</div>
      </div>
      <div style={{ marginTop: '10px', fontSize: '10px', color: '#aaa' }}>
        Press 'P' to toggle
      </div>
    </div>
  )
}

