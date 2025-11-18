import { Canvas } from '@react-three/fiber'
import Tetromino, { type TetrominoType } from './Tetromino'
import { type MaterialType } from '../utils/materials'

interface MiniTetrominoProps {
  type: TetrominoType
  material: MaterialType
  isSelected?: boolean
  onClick?: () => void
}

function MiniTetromino({ type, material, isSelected = false, onClick }: MiniTetrominoProps) {
  return (
    <div
      onClick={onClick}
      style={{
        cursor: onClick ? 'pointer' : 'default',
        opacity: isSelected ? 1 : 0.6,
        transform: isSelected ? 'scale(1.1)' : 'scale(1)',
        transition: 'all 0.2s',
        border: isSelected ? '2px solid #4a90e2' : '2px solid transparent',
        borderRadius: '4px',
        padding: '4px',
      }}
    >
      <Canvas
        camera={{ position: [3, 5, 3], fov: 50 }}
        style={{ width: '60px', height: '60px' }}
      >
        <ambientLight intensity={0.6} />
        <directionalLight position={[2, 6, 2]} intensity={0.9} />
        <Tetromino type={type} position={[0, 0, 0]} material={material} />
      </Canvas>
    </div>
  )
}

interface TetrominoPreviewProps {
  queue: Array<{ type: TetrominoType; material: MaterialType }>
  selectedIndex: number | null
  onSelect: (index: number) => void
}

export default function TetrominoPreview({ queue, selectedIndex, onSelect }: TetrominoPreviewProps) {
  return (
    <div style={{
      position: 'absolute',
      top: '20px',
      left: '50%',
      transform: 'translateX(-50%)',
      display: 'flex',
      gap: '10px',
      zIndex: 1000,
      backgroundColor: 'rgba(26, 26, 46, 0.8)',
      padding: '10px 20px',
      borderRadius: '8px',
      border: '1px solid rgba(255, 255, 255, 0.1)',
    }}>
      {queue.map((item, index) => (
        <div key={`${item.type}-${index}`} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <MiniTetromino
            type={item.type}
            material={item.material}
            isSelected={selectedIndex === index}
            onClick={() => onSelect(index)}
          />
          <span style={{ 
            color: '#fff', 
            fontSize: '12px', 
            marginTop: '4px',
            fontWeight: 'bold'
          }}>
            {item.type}
          </span>
        </div>
      ))}
    </div>
  )
}

