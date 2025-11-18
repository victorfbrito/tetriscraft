# Performance Comparison: OptimizedBlocks vs Individual Blocks

## Key Metrics to Measure

### 1. **Draw Calls** (Most Important)
- **OptimizedBlocks**: Should have **fewer draw calls** (1-3 per material type)
- **Individual Blocks**: One draw call per block (256+ for 16x16 board)
- **Why it matters**: Each draw call has CPU overhead. Fewer = better performance

### 2. **Triangles/Geometry Complexity**
- **OptimizedBlocks**: Uses greedy meshing - combines adjacent faces into quads
- **Individual Blocks**: Each block = 12 triangles (6 faces × 2 triangles)
- **Example**: 256 blocks = 3,072 triangles (individual) vs ~1,500-2,000 (optimized, depends on visible faces)

### 3. **Memory Usage**
- **OptimizedBlocks**: Fewer geometry objects in memory
- **Individual Blocks**: One geometry per block (256+ geometries)
- **Check**: Browser DevTools → Performance → Memory

### 4. **Frame Rate (FPS)**
- Target: 60 FPS
- Measure with: Performance Monitor component or browser DevTools

### 5. **CPU Usage**
- **OptimizedBlocks**: More CPU work upfront (greedy meshing calculation), less during render
- **Individual Blocks**: Less CPU upfront, more during render (many draw calls)
- **Check**: Browser DevTools → Performance tab

## How to Measure

### Method 1: Use Performance Monitor Component
1. Add `<PerformanceMonitor />` to your Canvas
2. Press 'P' to toggle display
3. Compare metrics between approaches

### Method 2: Browser DevTools
1. Open Chrome DevTools (F12)
2. Go to **Performance** tab
3. Click Record
4. Interact with your scene for 5-10 seconds
5. Stop recording
6. Look for:
   - **Frame rate** (should be ~60 FPS)
   - **Main thread activity** (lower = better)
   - **GPU activity**

### Method 3: React DevTools Profiler
1. Install React DevTools extension
2. Open Profiler tab
3. Record while rendering
4. Check render times for OptimizedBlocks vs individual blocks

### Method 4: Three.js Info
```javascript
// In browser console:
const info = renderer.info
console.log('Draw calls:', info.render.calls)
console.log('Triangles:', info.render.triangles)
console.log('Geometries:', info.memory.geometries)
```

## Expected Results

### With OptimizedBlocks (Current):
- **Draw Calls**: ~3-5 (one per material type)
- **Triangles**: ~1,500-2,500 (only visible faces)
- **FPS**: 60 FPS (on modern hardware)
- **Memory**: Lower (fewer geometry objects)

### With Individual Blocks:
- **Draw Calls**: 256+ (one per block)
- **Triangles**: 3,072+ (all faces, even hidden)
- **FPS**: May drop to 30-45 FPS with many blocks
- **Memory**: Higher (256+ geometry objects)

## When to Use Each Approach

### Use OptimizedBlocks When:
- ✅ You have many static blocks (like a board)
- ✅ Blocks don't need individual animations
- ✅ Performance is critical
- ✅ Blocks share materials

### Use Individual Blocks When:
- ✅ You need per-block animations
- ✅ Blocks need individual interactions
- ✅ You have very few blocks (< 50)
- ✅ You need dynamic per-block updates

## Testing Both Approaches

To test, you can temporarily create a component that renders individual blocks:

```tsx
// IndividualBlocks.tsx (for testing)
export default function IndividualBlocks({ boardState, wireframe }) {
  const blocks = []
  boardState.forEach((material, key) => {
    const [x, y, z] = key.split(',').map(Number)
    blocks.push(
      <Block
        key={key}
        position={[x, y, z]}
        material={material}
        wireframe={wireframe}
      />
    )
  })
  return <group>{blocks}</group>
}
```

Then toggle between `<OptimizedBlocks />` and `<IndividualBlocks />` to compare.

