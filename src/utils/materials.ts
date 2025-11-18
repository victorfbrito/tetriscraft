export type MaterialType = 'grass' | 'brick' | 'wood'

export const MATERIAL_COLORS: Record<MaterialType, string> = {
  grass: '#b6d47c',
  brick: '#748e9b',
  wood: '#b76d68',
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

