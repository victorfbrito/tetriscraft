export type MaterialType = 'grass' | 'brick' | 'wood'

export const MATERIAL_COLORS: Record<MaterialType, string> = {
  grass: '#bddf7b',
  brick: '#748e9b',
  wood: '#f4e9cb',
}

export const ROOF_COLOR = '#ff6663'
export const SKY_COLOR = '#3c91e6'

// Get random material type
export function getRandomMaterial(): MaterialType {
  const materials: MaterialType[] = ['grass', 'brick', 'wood']
  return materials[Math.floor(Math.random() * materials.length)]
}

// Get color for a material
export function getMaterialColor(material: MaterialType): string {
  return MATERIAL_COLORS[material]
}

