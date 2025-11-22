export type MaterialType = 'grass' | 'brick' | 'wood' | 'water'

export const MATERIAL_COLORS: Record<MaterialType, string> = {
  grass: '#bddf7b',
  brick: '#888880',
  wood: '#f4e9cb',
  water: '#4fc3f7',
}

export const ROOF_COLOR = '#ff6663'
export const SKY_COLOR = '#3c91e6' // Day sky color
export const SKY_COLOR_SUNSET = '#9675f0' // Purple sunset color
export const SKY_COLOR_NIGHT = '#1a1a2e' // Night sky color

// Get random material type
export function getRandomMaterial(): MaterialType {
  const materials: MaterialType[] = ['grass', 'brick', 'wood', 'water']
  return materials[Math.floor(Math.random() * materials.length)]
}

// Get color for a material
export function getMaterialColor(material: MaterialType): string {
  return MATERIAL_COLORS[material]
}

