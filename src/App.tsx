import { useState, Suspense, useEffect, useRef } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import Board from './components/Board'
import Tetromino from './components/Tetromino'
import TetrominoShadow from './components/TetrominoShadow'
import TetrominoPreview from './components/TetrominoPreview'
import GameMenu from './components/GameMenu'
import AxesHelper from './components/AxesHelper'
import OptimizedBlocks from './components/OptimizedBlocks'
import CameraControls from './components/CameraControls'
import Tree from './components/Tree'
import { useGameState } from './hooks/useGameState'
import { useTreePlacements } from './hooks/useTreePlacements'
import './App.css'

export default function App() {
  const [showWireframe, setShowWireframe] = useState(false)
  const [showAxes, setShowAxes] = useState(false)
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
  } = useGameState()

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

  return (
    <>
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
      />
      <Canvas flat dpr={[1, 2]} shadows camera={{ fov: 75, position: [6, 6, 6] }}>
        <color attach="background" args={['#1a1a2e']} />
        <ambientLight intensity={0.5} />
        <directionalLight 
          position={[2, 5, 4]} 
          intensity={1} 
          castShadow
          shadow-mapSize={[4096, 4096]}
          shadow-camera-far={50}
          shadow-camera-left={-10}
          shadow-camera-right={10}
          shadow-camera-top={10}
          shadow-camera-bottom={-10}
          shadow-bias={-0.0001}
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
          dropTetromino={dropTetromino}
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
          <Board size={boardSize} position={[0, 0, 0]} wireframe={showWireframe} />
          <OptimizedBlocks 
            boardState={boardState} 
            wireframe={showWireframe} 
          />
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
              />
            </>
          )}
        </group>
      </Canvas>
    </>
  )
}
