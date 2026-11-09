// Deterministic randomness. Every region gets its own stream, so travel order never changes a place.

/** FNV-1a string hash → unsigned 32-bit integer. */
export function hash(value) {
  let h = 2166136261;
  for (let i = 0; i < value.length; i++) h = Math.imul(h ^ value.charCodeAt(i), 16777619);
  return h >>> 0;
}

/** Seeded PRNG (mulberry32-style) returning floats in [0, 1). */
export function random(seed) {
  let state = hash(seed);
  return () => {
    state += 0x6d2b79f5;
    let n = Math.imul(state ^ (state >>> 15), 1 | state);
    n ^= n + Math.imul(n ^ (n >>> 7), 61 | n);
    return ((n ^ (n >>> 14)) >>> 0) / 4294967296;
  };
}

/** Smooth 1D value noise in [0, 1). */
export function noise(seed, x) {
  const i = Math.floor(x);
  const t = x - i;
  const smooth = t * t * (3 - 2 * t);
  const a = hash(`${seed}:${i}`) / 4294967296;
  const b = hash(`${seed}:${i + 1}`) / 4294967296;
  return a + (b - a) * smooth;
}

/** Three octaves of noise, still in [0, 1). Gives ridges and fields more character than one octave. */
export function fbm(seed, x) {
  return (noise(seed, x) * 4 + noise(`${seed}:2`, x * 2.1) * 2 + noise(`${seed}:3`, x * 4.3)) / 7;
}

export const between = (rng, a, b) => a + rng() * (b - a);
export const chance = (rng, p) => rng() < p;
export const choose = (rng, items) => items[Math.floor(rng() * items.length)];

/** Pick a key from { key: weight } with a seeded stream. */
export function weighted(rng, table) {
  const entries = Object.entries(table).filter(([, w]) => w > 0);
  const total = entries.reduce((sum, [, w]) => sum + w, 0);
  if (!total) return entries[0]?.[0];
  let r = rng() * total;
  for (const [key, w] of entries) if ((r -= w) <= 0) return key;
  return entries.at(-1)[0];
}

export const REGION_WIDTH = 1000;
export const HEIGHT = 680;

/** The village footpath: one continuous function, so it joins seamlessly across regions. */
export function pathY(seed, x) {
  return 556 + 14 * Math.sin(x / 440) + 22 * noise(`${seed}:path`, x / 390);
}

export function visibleRegions(center, width) {
  const first = Math.floor((center - width / 2) / REGION_WIDTH) - 1;
  const last = Math.floor((center + width / 2) / REGION_WIDTH) + 1;
  return Array.from({ length: last - first + 1 }, (_, i) => first + i);
}
