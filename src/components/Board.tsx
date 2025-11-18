import Block from './Block'

interface BoardProps {
  size?: number
  position?: [number, number, number]
  wireframe?: boolean
}

export default function Board({ size = 16, position = [0, 0, 0], wireframe = false }: BoardProps) {
  const blocks: JSX.Element[] = []
  
  // For integer grid: center block at [1, 1, 1] for odd sizes
  // X/Z range: from (1 - Math.floor(size/2)) to (1 + Math.floor((size-1)/2))
  const minCoord = 1 - Math.floor(size / 2)
  const maxCoord = 1 + Math.floor((size - 1) / 2)

  // Create grid of blocks at integer positions (always grass material)
  for (let x = minCoord; x <= maxCoord; x++) {
    for (let z = minCoord; z <= maxCoord; z++) {
      blocks.push(
        <Block
          key={`${x}-${z}`}
          position={[
            position[0] + x,
            0, // Board surface always at Y=0
            position[2] + z,
          ]}
          material="grass"
          wireframe={wireframe}
        />
      )
    }
  }

  return <group>{blocks}</group>
}

