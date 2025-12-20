/**
 * Deterministic shuffle function using a seed
 * This ensures the same user + level + category combination always produces the same shuffle
 * but different users get different question orders
 */

export function seededShuffle<T extends { id: string }>(
  array: T[],
  seed: string
): T[] {
  // Create a copy so we don't mutate the original
  const shuffled = [...array];

  // Convert seed to a number using a simple hash function
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    const char = seed.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }

  // Use the hash as a seed for Fisher-Yates shuffle
  const random = mulberry32(Math.abs(hash));

  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  return shuffled;
}

/**
 * Mulberry32 pseudo-random number generator
 * Produces consistent results for the same seed
 */
function mulberry32(a: number) {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Creates a seed from user ID, category, and level
 * This ensures each user gets a unique but reproducible order per level/category
 */
export function createQuestionSeed(
  userId: string | undefined,
  category: string,
  level: number
): string {
  if (!userId) {
    return `anonymous-${category}-${level}`;
  }
  return `${userId}-${category}-${level}`;
}
