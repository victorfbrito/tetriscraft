/**
 * Selects a random item using the provided probability distribution.
 *
 * @param items - Array of items to pick from.
 * @param chances - Array of probabilities (0..1) corresponding to each item.
 * @param randomFn - Optional RNG function for deterministic testing.
 * @returns The chosen item or null if selection cannot be made.
 */
export function pickByChance<T>(
  items: readonly T[],
  chances: readonly number[],
  randomFn: () => number = Math.random
): T | null {
  if (!Array.isArray(items) || !Array.isArray(chances) || items.length === 0) {
    return null
  }

  if (items.length !== chances.length) {
    console.warn('[pickByChance] Items and chances length mismatch', { items, chances })
    return null
  }

  const normalizedWeights = chances.map((chance, index) => {
    if (typeof chance !== 'number' || Number.isNaN(chance)) {
      console.warn('[pickByChance] Invalid chance value detected', { index, chance })
      return 0
    }

    if (chance < 0 || chance > 1) {
      console.warn('[pickByChance] Chance value out of range, clamping', { index, chance })
    }

    return Math.min(1, Math.max(0, chance))
  })

  const totalWeight = normalizedWeights.reduce((sum, weight) => sum + weight, 0)
  if (totalWeight <= 0) {
    return null
  }

  const target = randomFn() * totalWeight

  let cumulative = 0
  for (let i = 0; i < items.length; i++) {
    cumulative += normalizedWeights[i]
    if (target <= cumulative) {
      return items[i]
    }
  }

  return items[items.length - 1] ?? null
}

