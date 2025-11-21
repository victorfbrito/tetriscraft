interface GameMenuProps {
  showWireframe: boolean
  onToggleWireframe: () => void
  showAxes: boolean
  onToggleAxes: () => void
  cycleSpeed: number
  onCycleSpeedChange: (speed: number) => void
  isCyclePaused: boolean
  onToggleCyclePause: () => void
  showCyclePath: boolean
  onToggleCyclePath: () => void
  cycleHour: number
}

export default function GameMenu({ 
  showWireframe, 
  onToggleWireframe, 
  showAxes, 
  onToggleAxes,
  cycleSpeed,
  onCycleSpeedChange,
  isCyclePaused,
  onToggleCyclePause,
  showCyclePath,
  onToggleCyclePath,
  cycleHour,
}: GameMenuProps) {
  const hours = Math.floor(cycleHour) % 24
  const minutes = Math.floor((cycleHour - Math.floor(cycleHour)) * 60)
  const formattedTime = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`

  return (
    <div style={{
      position: 'absolute',
      top: '20px',
      right: '20px',
      zIndex: 1000,
      backgroundColor: 'rgba(26, 26, 46, 0.9)',
      padding: '15px 20px',
      borderRadius: '8px',
      border: '1px solid rgba(255, 255, 255, 0.1)',
      color: '#fff',
      fontFamily: 'system-ui, sans-serif',
      fontSize: '14px',
    }}>
      <h3 style={{ margin: '0 0 10px 0', fontSize: '16px', fontWeight: 'bold' }}>Settings</h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <label style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '8px',
          cursor: 'pointer',
          userSelect: 'none',
        }}>
          <input
            type="checkbox"
            checked={showWireframe}
            onChange={onToggleWireframe}
            style={{ cursor: 'pointer' }}
          />
          <span>Show Wireframe</span>
        </label>
        <label style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '8px',
          cursor: 'pointer',
          userSelect: 'none',
        }}>
          <input
            type="checkbox"
            checked={showAxes}
            onChange={onToggleAxes}
            style={{ cursor: 'pointer' }}
          />
          <span>Show Axes (X, Y, Z)</span>
        </label>
        <div style={{ 
          display: 'flex', 
          flexDirection: 'column', 
          gap: '5px',
          paddingTop: '5px',
          borderTop: '1px solid rgba(255, 255, 255, 0.1)',
        }}>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            marginBottom: '5px',
          }}>
            <span>Day/Night Cycle</span>
            <label style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '6px',
              cursor: 'pointer',
              userSelect: 'none',
            }}>
              <input
                type="checkbox"
                checked={isCyclePaused}
                onChange={onToggleCyclePause}
                style={{ cursor: 'pointer' }}
              />
              <span style={{ fontSize: '12px' }}>Pause</span>
            </label>
          </div>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            fontSize: '12px',
            color: 'rgba(255, 255, 255, 0.85)',
          }}>
            <span>{`Time: ${formattedTime}`}</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
            }}>
              <span style={{ fontSize: '12px' }}>Speed: {cycleSpeed.toFixed(1)}x</span>
            </div>
            <input
              type="range"
              min="0.1"
              max="100.0"
              step="0.1"
              value={cycleSpeed}
              onChange={(e) => onCycleSpeedChange(parseFloat(e.target.value))}
              style={{ 
                width: '100%',
                cursor: 'pointer',
              }}
              disabled={isCyclePaused}
            />
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              fontSize: '10px',
              color: 'rgba(255, 255, 255, 0.6)',
            }}>
              <span>0.1x</span>
              <span>1.0x</span>
              <span>100.0x</span>
            </div>
            <label style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '8px',
              cursor: 'pointer',
              userSelect: 'none',
              marginTop: '5px',
            }}>
              <input
                type="checkbox"
                checked={showCyclePath}
                onChange={onToggleCyclePath}
                style={{ cursor: 'pointer' }}
              />
              <span style={{ fontSize: '12px' }}>Show Cycle Path</span>
            </label>
          </div>
        </div>
      </div>
    </div>
  )
}

