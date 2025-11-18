import { useGLTF } from "@react-three/drei"
import { a, useSpring } from "@react-spring/three"
import { useRef, useMemo, useEffect } from "react"
import { useFrame } from "@react-three/fiber"
import * as THREE from "three"

type TreeProps = {
  treeId: number | string
  position?: [number, number, number]
  swayOffset?: number
  rotation?: [number, number, number]
  removing?: boolean
  onRemoveComplete?: () => void
}

export default function Tree({ 
  treeId, 
  position = [0, 0, 0], 
  swayOffset = 0, 
  rotation = [0, 0, 0],
  removing = false,
  onRemoveComplete
}: TreeProps) {
  const gltf = useGLTF("/trees.glb") as any
  const nodes = gltf.nodes || {}

  const group = useRef<THREE.Group>(null)
  const foliageRefs = useRef<(THREE.Group | null)[]>([])

  // Auto-detect trunk and foliage nodes based on naming convention
  const { trunkNode, foliageNodes } = useMemo(() => {
    const id = String(treeId)
    const trunkName = `Tree_${id}_Trunk`
    const trunkNode = nodes[trunkName] || null

    // Find all foliage nodes matching Tree_{id}_Foliage_*
    const foliagePattern = new RegExp(`^Tree_${id}_Foliage_(\\d+)$`)
    const foliageEntries: Array<{ name: string; number: number; node: any }> = []

    Object.keys(nodes).forEach((nodeName) => {
      const match = nodeName.match(foliagePattern)
      if (match) {
        const number = parseInt(match[1], 10)
        foliageEntries.push({
          name: nodeName,
          number,
          node: nodes[nodeName],
        })
      }
    })

    // Sort by number (smallest = top, highest = bottom)
    foliageEntries.sort((a, b) => a.number - b.number)

    return {
      trunkNode,
      foliageNodes: foliageEntries.map((entry) => ({
        name: entry.name,
        node: entry.node,
      })),
    }
  }, [treeId, nodes])

  // Debug: log detected nodes on first render
  if (Object.keys(nodes).length > 0 && !group.current) {
    console.log(`Tree ${treeId} - Trunk:`, trunkNode ? 'Found' : 'NOT FOUND')
    console.log(`Tree ${treeId} - Foliage layers:`, foliageNodes.length, foliageNodes.map(f => f.name))
  }

  // Check if trunk exists
  if (!trunkNode) {
    console.warn(`Tree trunk "Tree_${treeId}_Trunk" not found in GLTF. Available nodes:`, Object.keys(nodes))
    return null
  }

  // Random delay for show-up animation (25ms to 170ms)
  const showUpDelay = useMemo(() => 50 + Math.random() * 250, [])

  // Scale animation: scale-up on mount, scale-down when removing
  const [springs, api] = useSpring(() => ({
    from: { scale: 0 },
    to: { scale: 1 },
    config: { mass: 1, tension: 170, friction: 18 },
    delay: showUpDelay,
  }), [showUpDelay])

  // Trigger shrink animation when removing prop changes to true
  useEffect(() => {
    if (removing) {
      api.start({
        to: { scale: 0 },
        config: { mass: 1, tension: 170, friction: 18 },
        onRest: () => {
          // Animation complete, remove the tree
          if (onRemoveComplete) {
            onRemoveComplete()
          }
        },
      })
    }
  }, [removing, api, onRemoveComplete])

  // Generate random speeds for each foliage layer (stable per render)
  const foliageSpeeds = useMemo(() => 
    Array.from({ length: foliageNodes.length }, () => 1 + Math.random() * 2), // Random between 1 and 3
    [foliageNodes.length]
  )

  // Sway foliage
  useFrame(({ clock }) => {
    const t = clock.getElapsedTime() + swayOffset

    foliageRefs.current.forEach((ref, i) => {
      if (!ref) return
      const totalLayers = foliageRefs.current.length
      // Invert: lower index (top) = more sway, higher index (bottom) = less sway
      const intensity = 0.01 + (totalLayers - i - 1) * 0.01
      const speed = foliageSpeeds[i] || 1
      ref.rotation.z = Math.sin(t * speed) * intensity
    })
  })

  return (
    <a.group ref={group} position={position} rotation={rotation} scale={springs.scale}>
      {/* Trunk */}
      <mesh
        geometry={trunkNode.geometry}
        material={trunkNode.material}
        castShadow
      />

      {/* Foliage pieces (auto-detected and sorted) */}
      {foliageNodes.map(({ name, node }, index) => {
        if (!node) {
          console.warn(`Foliage node "${name}" not found in GLTF`)
          return null
        }
        return (
          <group
            key={name}
            ref={(el: THREE.Group | null) => {
              foliageRefs.current[index] = el
            }}
          >
            <mesh
              geometry={node.geometry}
              material={node.material}
              castShadow
            />
          </group>
        )
      })}
    </a.group>
  )
}

