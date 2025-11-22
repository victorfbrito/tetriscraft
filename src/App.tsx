import { useState, Suspense, useEffect, useRef, useMemo } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import Tetromino from './components/Tetromino'
import TetrominoShadow from './components/TetrominoShadow'
import TetrominoPreview from './components/TetrominoPreview'
import GameMenu from './components/GameMenu'
import AxesHelper from './components/AxesHelper'
import OptimizedBlocks from './components/OptimizedBlocks'
import CameraControls from './components/CameraControls'
import Tree from './components/Tree'
import PerformanceStatsDisplay from './components/PerformanceStatsDisplay'
import Decorations from './components/Decorations'
import DayNightCycle from './components/DayNightCycle'
import { useGameState } from './hooks/useGameState'
import { useTreePlacements } from './hooks/useTreePlacements'
import './App.css'
import { DayNightCycleProvider } from './context/DayNightCycleContext'
import type { DayNightCycleState } from './context/DayNightCycleContext'
import DynamicSkyColor from './components/DynamicSkyColor'

export default function App() {
  const [showWireframe, setShowWireframe] = useState(false)
  const [showAxes, setShowAxes] = useState(false)
  const [cycleSpeed, setCycleSpeed] = useState(1.0) // Speed multiplier (0.1 to 5.0)
  const [isCyclePaused, setIsCyclePaused] = useState(false)
  const [showCyclePath, setShowCyclePath] = useState(false)
  const [cycleState, setCycleState] = useState<DayNightCycleState | null>(null)
  const {
    queue,
    activeTetromino,
    droppingTetromino,
    boardState,
    selectedIndex,
    boardSize,
    selectTetromino,
    moveTetromino,
    rotateTetromino,
    dropTetromino,
    completeDrop,
    calculateLandingY,
    getTetrominoBlockPositions,
    currentLandingIsValid,
  } = useGameState()

  // State for shake animation on invalid drop
  const [shadowShake, setShadowShake] = useState(false)

  // Procedural tree generation
  const { treePlacements, addTreesForTetromino, removeTreesUnderTetromino, removeTree } = useTreePlacements(
    boardSize,
    boardState,
    getTetrominoBlockPositions
  )

  // Track previous droppingTetromino to detect when drop completes
  const prevDroppingTetrominoRef = useRef(droppingTetromino)
  
  // Handle tetromino drop completion: remove trees under blocks, then add trees for grass blocks
  useEffect(() => {
    if (prevDroppingTetrominoRef.current && !droppingTetromino) {
      // Drop just completed
      const completed = prevDroppingTetrominoRef.current
      
      // First, remove trees that are under the dropped tetromino (any material)
      removeTreesUnderTetromino(
        completed.type,
        completed.endPosition,
        completed.rotation
      )
      
      // Then, add trees for grass tetrominos
      if (completed.material === 'grass') {
        addTreesForTetromino(
          completed.type,
          completed.endPosition,
          completed.rotation,
          completed.material
        )
      }
    }
    prevDroppingTetrominoRef.current = droppingTetromino
  }, [droppingTetromino, addTreesForTetromino, removeTreesUnderTetromino])

  // Calculate landing Y for shadow
  const landingY = activeTetromino
    ? calculateLandingY(
        activeTetromino.type,
        activeTetromino.position,
        activeTetromino.rotation
      )
    : 0

  const waterBlocks = useMemo(() => {
    const positions: Array<[number, number, number]> = []
    boardState.forEach((material, key) => {
      if (material === 'water') {
        const [x, y, z] = key.split(',').map(Number) as [number, number, number]
        positions.push([x, y, z])
      }
    })
    return positions
  }, [boardState])

  // Handle drop with validation and shake
  const handleDropTetromino = () => {
    const success = dropTetromino()
    if (!success) {
      // Invalid drop - trigger shake animation
      setShadowShake(true)
      setTimeout(() => setShadowShake(false), 1000) // Reset after animation
    }
  }

  return (
    <>
      <PerformanceStatsDisplay />
      <TetrominoPreview
        queue={queue}
        selectedIndex={selectedIndex}
        onSelect={selectTetromino}
      />
      <GameMenu
        showWireframe={showWireframe}
        onToggleWireframe={() => setShowWireframe(!showWireframe)}
        showAxes={showAxes}
        onToggleAxes={() => setShowAxes(!showAxes)}
        cycleSpeed={cycleSpeed}
        onCycleSpeedChange={setCycleSpeed}
        isCyclePaused={isCyclePaused}
        onToggleCyclePause={() => setIsCyclePaused(!isCyclePaused)}
        showCyclePath={showCyclePath}
        onToggleCyclePath={() => setShowCyclePath(!showCyclePath)}
        cycleHour={cycleState?.hour ?? 12}
      />
      <Canvas flat dpr={[1, 2]} shadows camera={{ fov: 25, position: [12, 12, 12] }}>
        <DayNightCycleProvider
          speedMultiplier={cycleSpeed}
          isPaused={isCyclePaused}
          onStateChange={setCycleState}
        >
          <DynamicSkyColor />
          <DayNightCycle 
            radius={10} 
            height={8} 
            showPath={showCyclePath}
          />
          {/* @ts-ignore - OrbitControls works without required props */}
          <OrbitControls 
            zoomSpeed={0.6} 
            minDistance={3} 
            maxDistance={80}
            target={[1, 0, 1]}
          />
          <CameraControls
            activeTetromino={activeTetromino}
            moveTetromino={moveTetromino}
            rotateTetromino={rotateTetromino}
            dropTetromino={handleDropTetromino}
          />
          <group position-y={-0.75} dispose={null}>
            <Suspense fallback={null}>
              {/* Procedurally generated trees */}
              {treePlacements.map((placement) => (
                <Tree
                  key={placement.id}
                  treeId={placement.treeId}
                  position={placement.position}
                  swayOffset={placement.swayOffset}
                  rotation={placement.rotation}
                  removing={placement.removing}
                  onRemoveComplete={() => removeTree(placement.id)}
                />
              ))}
            </Suspense>
            {showAxes && <AxesHelper />}
            <OptimizedBlocks 
              boardState={boardState} 
              wireframe={showWireframe} 
            />
            <Suspense fallback={null}>
              <Decorations boardState={boardState} />
            </Suspense>
          {activeTetromino && (
            <>
              <Tetromino
                type={activeTetromino.type}
                position={activeTetromino.position}
                rotation={activeTetromino.rotation}
                material={activeTetromino.material}
                wireframe={showWireframe}
              />
              <TetrominoShadow
                type={activeTetromino.type}
                position={activeTetromino.position}
                rotation={activeTetromino.rotation}
                landingY={landingY}
                isValid={currentLandingIsValid}
                shake={shadowShake}
              />
            </>
          )}
            {droppingTetromino && (
              <>
                <Tetromino
                  key={`dropping-${droppingTetromino.startPosition[0]}-${droppingTetromino.startPosition[1]}-${droppingTetromino.startPosition[2]}`}
                  type={droppingTetromino.type}
                  position={droppingTetromino.startPosition}
                  rotation={droppingTetromino.rotation}
                  material={droppingTetromino.material}
                  wireframe={showWireframe}
                  animated={true}
                  targetPosition={droppingTetromino.endPosition}
                  onAnimationComplete={completeDrop}
                />
                <TetrominoShadow
                  type={droppingTetromino.type}
                  position={droppingTetromino.startPosition}
                  rotation={droppingTetromino.rotation}
                  landingY={droppingTetromino.endPosition[1]}
                  isDropping={true}
                  startY={droppingTetromino.startPosition[1]}
                  isValid={true}
                />
              </>
            )}
          </group>
        </DayNightCycleProvider>
      </Canvas>
    </>
  )
}
