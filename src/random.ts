/** Every region has its own random stream, so travel order cannot change it. */
export function hash(value: string): number {
  let h = 2166136261;
  for (let i = 0; i < value.length; i++) h = Math.imul(h ^ value.charCodeAt(i), 16777619);
  return h >>> 0;
}

export function random(seed: string): () => number {
  let state = hash(seed);
  return () => {
    state += 0x6d2b79f5;
    let n = Math.imul(state ^ (state >>> 15), 1 | state);
    n ^= n + Math.imul(n ^ (n >>> 7), 61 | n);
    return ((n ^ (n >>> 14)) >>> 0) / 4294967296;
  };
}

export function noise(seed: string, x: number): number {
  const i = Math.floor(x);
  const t = x - i;
  const smooth = t * t * (3 - 2 * t);
  const a = hash(`${seed}:${i}`) / 4294967296;
  const b = hash(`${seed}:${i + 1}`) / 4294967296;
  return a + (b - a) * smooth;
}

export const REGION_WIDTH = 1000;
export const SCENES = ['The gathering', 'Fields of plenty', 'By the water', 'Among the trees', 'Homeward'] as const;
export type Scene = typeof SCENES[number];
export function sceneAt(index: number): Scene {
  return SCENES[((index % SCENES.length) + SCENES.length) % SCENES.length];
}

export function pathY(seed: string, x: number): number {
  return 548 + 16 * Math.sin(x / 440) + 23 * noise(`${seed}:path`, x / 390);
}

export function visibleRegions(center: number, width: number): number[] {
  const first = Math.floor((center - width / 2) / REGION_WIDTH) - 1;
  const last = Math.floor((center + width / 2) / REGION_WIDTH) + 1;
  return Array.from({ length: last - first + 1 }, (_, i) => first + i);
}
