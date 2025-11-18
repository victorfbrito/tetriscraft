interface GameMenuProps {
  showWireframe: boolean
  onToggleWireframe: () => void
  showAxes: boolean
  onToggleAxes: () => void
}

export default function GameMenu({ showWireframe, onToggleWireframe, showAxes, onToggleAxes }: GameMenuProps) {
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
      </div>
    </div>
  )
}

