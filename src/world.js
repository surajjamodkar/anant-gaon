import { between, chance, choose, fbm, HEIGHT, pathY, random, REGION_WIDTH, visibleRegions, weighted } from './random.js';
import * as M from './motifs.js';

export const PALETTES = {
  clay: { name: 'Terracotta', ground: '#873f30', ink: '#f5e5c3' },
  dung: { name: 'Cow-dung', ground: '#5b4532', ink: '#f1e7cf' },
  night: { name: 'Indigo', ground: '#283d49', ink: '#e9e2c9' },
  paper: { name: 'Parchment', ground: '#e7dbc0', ink: '#6d4735' },
};

export const LAND = ['home', 'field', 'water', 'forest', 'grove', 'festival'];
export const LAND_NAMES = { home: 'Homes', field: 'Fields', water: 'Water', forest: 'Forest', grove: 'Sacred groves', festival: 'Festivals' };
export const CHOICES = {
  season: ['harvest', 'monsoon', 'summer'],
  time: ['day', 'dusk', 'night'],
  border: ['zigzag', 'dots', 'none'],
};
/** Every tunable setting: [min, max, default]. All of them can be set from the URL. */
export const RANGES = {
  density: [0.3, 2, 1], life: [0, 2, 1], wild: [0, 2, 1], wobble: [0, 1, 0.35], weight: [0.6, 1.8, 1], sky: [0, 2, 1],
  home: [0, 2, 1], field: [0, 2, 1], water: [0, 2, 1], forest: [0, 2, 1], grove: [0, 2, 0.5], festival: [0, 2, 0.45],
};
export const DEFAULTS = {
  ...Object.fromEntries(Object.entries(RANGES).map(([k, [, , d]]) => [k, d])),
  ...Object.fromEntries(Object.entries(CHOICES).map(([k, v]) => [k, v[0]])),
};

export function normalizeOptions(raw = {}) {
  const out = { ...DEFAULTS };
  for (const [key, [min, max]] of Object.entries(RANGES)) {
    const n = Number(raw[key]);
    if (raw[key] !== undefined && raw[key] !== '' && Number.isFinite(n)) out[key] = Math.min(max, Math.max(min, Math.round(n * 100) / 100));
  }
  for (const [key, values] of Object.entries(CHOICES)) if (values.includes(raw[key])) out[key] = raw[key];
  return out;
}

// Depth bands, back to front. Lower on the page means nearer, so things are drawn in order of y.
const BACK = [398, 432], MID = [470, 518], FRONT = [618, 656];

/** Collision bookkeeping for one region, so motifs do not pile on top of each other. */
class Plan {
  constructor() { this.rows = { back: [], mid: [], path: [], front: [] }; this.items = []; this.trees = []; }
  /** Trees are remembered so birds, owls, squirrels and monkeys can settle in them later. */
  tree(x, y, s, svg) { this.add(y, svg); this.trees.push({ x, y, s }); }
  free(row, x0, x1) { return this.rows[row].every(([a, b]) => x1 <= a || x0 >= b); }
  take(row, x0, x1) { if (!this.free(row, x0, x1)) return false; this.rows[row].push([x0, x1]); return true; }
  add(y, svg) { this.items.push([y, svg]); }
  svg() { return this.items.sort((a, b) => a[0] - b[0]).map(([, s]) => s).join(''); }
}

const edgeX = (x0, x1, rng) => (rng() < 0.5 ? x0 + 34 : x1 - 34);

export class Village {
  constructor(seed, options = {}) {
    this.seed = seed;
    this.options = normalizeOptions(options);
    this.cache = new Map();
    this.plots = new Map();
  }
  get cacheSize() { return this.cache.size; }

  /** Land use for a plot. Each kind is picked in proportion to its weight from the settings,
   *  shaped by its own slow noise field, so similar land clusters into zones as you walk. */
  landAt(x, rng, previous) {
    const o = this.options;
    const season = { monsoon: { water: 1.25, field: 1.15 }, summer: { field: 0.8, water: 1.15 }, harvest: { field: 1.15, festival: 1.3 } }[o.season];
    const table = {};
    for (const land of LAND) {
      let w = o[land] * (season[land] ?? 1) * (0.15 + fbm(`${this.seed}:land:${land}`, x / 1500)) ** 3;
      if (land === 'festival' && (o.life === 0 || previous === 'festival')) w = 0;
      if (land === previous) w *= land === 'field' || land === 'forest' ? 0.7 : 0.35; // fields and woods may continue; ponds rarely repeat
      table[land] = w;
    }
    return Object.values(table).some(w => w > 0) ? weighted(rng, table) : 'open';
  }

  /** The land use of the plot under x, as actually drawn. */
  landNear(x) {
    const index = Math.floor(x / REGION_WIDTH);
    this.region(index);
    const local = x - index * REGION_WIDTH;
    return (this.plots.get(index) ?? []).find(p => local >= p.x0 && local < p.x1)?.land ?? 'open';
  }

  region(index) {
    const cached = this.cache.get(index);
    if (cached) return cached;
    const o = this.options;
    const seed = this.seed;
    const rng = random(`${seed}:region:${index}`);
    const base = index * REGION_WIDTH;
    const plan = new Plan();
    const style = M.getStyle();
    M.setStyle({ wobble: o.wobble, weight: o.weight, rng: random(`${seed}:ink:${index}`) });
    const D = o.density, L = o.life, W = o.wild;
    const some = p => chance(rng, Math.min(1, p));
    const count = (n, k = D) => Math.max(0, Math.round(n * k * between(rng, 0.75, 1.25)));
    const people = p => L > 0 && some(p * L);
    const dir = () => (rng() < 0.5 ? 1 : -1);
    // Wildlife draws from its own stream, so the Wildlife setting adds or removes animals without moving the village.
    const wrng = random(`${seed}:wild:${index}`);
    const wild = p => W > 0 && chance(wrng, Math.min(1, p * W));
    const wcount = n => Math.max(0, Math.round(n * D * W * between(wrng, 0.75, 1.25)));
    const wdir = () => (wrng() < 0.5 ? 1 : -1);

    /* sky */
    if (o.time === 'night') {
      if (some(0.5)) plan.add(0, M.moon(between(rng, 150, 850), between(rng, 80, 130), 17));
      for (let i = 0; i < count(26, o.sky); i++) plan.add(0, M.star(between(rng, 10, 990), between(rng, 40, 290), between(rng, 1.5, 3.5)));
    } else {
      if (some(0.45)) plan.add(0, M.sun(between(rng, 150, 850), o.time === 'dusk' ? between(rng, 250, 285) : between(rng, 90, 140), o.time === 'dusk' ? 26 : 20));
      for (let i = 0; i < count(6, o.sky); i++) plan.add(1, M.bird(between(rng, 40, 960), between(rng, 110, 270), between(rng, 0.5, 1.05)));
    }
    if (o.season === 'monsoon') {
      let rain = '';
      for (let i = 0; i < count(90); i++) {
        const x = between(rng, 0, 1000), y = between(rng, 40, 600);
        rain += M.line([[x, y], [x - 4, y + 11]], 0.8);
      }
      plan.add(2, `<g opacity=".38">${rain}</g>`);
    }
    if (some(0.65)) plan.add(3, `<g opacity=".32">${M.mountains(between(rng, -60, 500), between(rng, 250, 600), between(rng, 345, 360), rng)}</g>`);

    /* plots: three or four stretches of land, each with its own use */
    const n = some(0.35) ? 4 : 3;
    const widths = Array.from({ length: n }, () => between(rng, 0.8, 1.4));
    const total = widths.reduce((s, w) => s + w, 0);
    let previous = '', x0 = 0;
    const plots = [];
    for (const w of widths) {
      const x1 = x0 + (w / total) * REGION_WIDTH;
      const land = this.landAt(base + (x0 + x1) / 2, rng, previous);
      this[`plot_${land}`](plan, x0, x1, { rng, some, count, people, dir, o, D, L, W, wrng, wild, wcount, wdir });
      plots.push({ x0, x1, land });
      previous = land;
      x0 = x1;
    }

    /* wildlife that settles in the trees */
    for (const t of plan.trees) {
      if (!wild(0.45)) continue;
      const tx = t.x + between(wrng, -32, 32) * t.s, ty = t.y - between(wrng, 95, 130) * t.s;
      const kind = weighted(wrng, { owl: o.time === 'night' ? 2.5 : 0.15, parrot: o.time === 'night' ? 0 : 1, nest: 1, squirrel: 0.8, monkey: 1 });
      const svg = { owl: () => M.owl(tx, ty, 0.8), parrot: () => M.parrot(tx, ty, 0.8, wdir()), nest: () => M.nest(tx, ty, 0.85), squirrel: () => M.squirrel(tx, ty, 0.9, wdir()), monkey: () => M.monkey(tx, ty + 6, 0.75, wdir()) }[kind]();
      plan.add(t.y + 0.5, svg);
    }
    if (o.time !== 'night') for (let i = 0; i < wcount(1.6); i++) plan.add(700, M.butterfly(between(wrng, 30, 970), between(wrng, 560, 625), between(wrng, 0.6, 0.9)));

    /* traffic on the footpath */
    for (let i = 0; i < count(2.2); i++) {
      const lx = between(rng, 60, 940);
      const y = pathY(seed, base + lx) + 9;
      const d = dir();
      const kind = weighted(rng, { cart: 1.2, herd: 1.3, walkers: 1.6 * L, procession: 0.35 * L, dog: 0.5 });
      if (kind === 'cart' && plan.take('path', lx - 85, lx + 85)) {
        plan.add(y, M.bullockCart(lx, y, 0.72, d, o.season === 'harvest'));
      } else if (kind === 'herd' && plan.take('path', lx - 110, lx + 110)) {
        if (L > 0) plan.add(y, M.person(lx - 70 * d, y, 0.82, 'herd', d, 0));
        const goats = some(0.4);
        for (let k = 0; k < 2 + Math.floor(rng() * 3); k++) {
          const ax = lx - 30 * d + k * 34 * d, ay = y + (k % 2) * 6 - 3;
          plan.add(ay, goats ? M.goat(ax, ay, 0.75, d) : M.bullock(ax, ay, 0.58, d, { calf: some(0.25) }));
        }
      } else if (kind === 'walkers' && plan.take('path', lx - 45, lx + 45)) {
        for (let k = 0; k < 1 + Math.floor(rng() * 3); k++) plan.add(y + k, M.person(lx + k * 26 * d, y + k, 0.84, choose(rng, ['pot', 'pot', 'carry', 'walk', 'baby']), d, k + 1));
      } else if (kind === 'procession' && plan.take('path', lx - 120, lx + 120)) {
        plan.add(y, M.horse(lx, y, 0.72, d, true));
        for (let k = 1; k <= 3; k++) plan.add(y + 1, M.person(lx - k * 34 * d, y + 1, 0.78, k === 1 ? 'drum' : 'dance', d, k));
      } else if (kind === 'dog' && plan.take('path', lx - 20, lx + 20)) {
        plan.add(y, M.dog(lx, y, 0.7, d));
      }
    }

    /* foreground rhythm */
    for (let i = 0; i < count(38); i++) {
      const y = between(rng, FRONT[0], FRONT[1]);
      plan.add(y, M.grass(between(rng, 20, 980), y, between(rng, 0.4, 0.95)));
    }
    for (let i = 0; i < count(5); i++) {
      const y = between(rng, FRONT[0], FRONT[1]);
      plan.add(y, M.flower(between(rng, 20, 980), y, between(rng, 0.6, 0.9)));
    }
    for (let i = 0; i < count(1.2); i++) {
      const lx = between(rng, 40, 960), y = between(rng, FRONT[0] + 8, FRONT[1]);
      if (!plan.take('front', lx - 40, lx + 40)) continue;
      const kind = weighted(rng, { hens: 1.4, dog: 0.4, snake: 0.4 * W, crab: o.water * 0.4 * W, scorpion: (o.season === 'summer' ? 0.7 : 0.3) * W, frog: (o.season === 'monsoon' ? 1.2 : 0.1) * W, hare: 0.5 * W });
      if (kind === 'hens') for (let k = 0; k < 3; k++) plan.add(y, M.hen(lx + k * 20, y + (k % 2) * 5, 0.75, k ? 1 : -1, k === 0));
      else if (kind === 'snake') plan.add(y, M.snake(lx, y, 0.7, dir()));
      else if (kind === 'crab') plan.add(y, M.crab(lx, y, 0.8));
      else if (kind === 'scorpion') plan.add(y, M.scorpion(lx, y, 0.9, dir()));
      else if (kind === 'frog') for (let k = 0; k < 2; k++) plan.add(y, M.frog(lx + k * 24, y + k * 4, 0.9, dir()));
      else if (kind === 'hare') plan.add(y, M.hare(lx, y, 0.85, dir()));
      else plan.add(y, M.dog(lx, y, 0.7, dir()));
    }

    M.setStyle(style);
    const { back, border } = this.frame(base);
    const result = `<g data-region="${index}" transform="translate(${base} 0)">${back}${plan.svg()}${border}</g>`;
    this.cache.set(index, result);
    this.plots.set(index, plots);
    return result;
  }

  /* ---------- plot compositions ---------- */

  plot_home(plan, x0, x1, { rng, some, count, people, dir, o, L, W }) {
    const w = x1 - x0, cx = (x0 + x1) / 2;
    const hx = cx + between(rng, -w * 0.15, w * 0.15), hy = between(rng, BACK[0] + 8, BACK[1]), hs = between(rng, 0.68, 0.86);
    plan.take('back', hx - 80 * hs, hx + 85 * hs);
    plan.add(hy, M.hut(hx, hy, hs, rng, dir()));
    if (w > 300 && some(0.5)) {
      const sx = hx + (hx > cx ? -1 : 1) * 125, sy = hy - 18;
      if (plan.take('back', sx - 60, sx + 60)) plan.add(sy, some(0.5) ? M.hut(sx, sy, 0.52, rng, dir()) : M.shed(sx, sy, 0.75, dir()));
    }
    const chores = {
      grinding: 1.3 * L, hearth: 1 * L, pound: 1 * L, baby: 0.6 * L, children: 0.7 * L,
      granary: o.season === 'harvest' ? 1.6 : 0.6, haystack: o.season === 'harvest' ? 1 : 0.2, shed: 0.6, hens: 0.8, cow: 0.8,
    };
    for (let i = 0; i < count(2.2); i++) {
      const lx = between(rng, x0 + 35, x1 - 35), y = between(rng, MID[0], MID[1]);
      const kind = weighted(rng, chores);
      const half = { grinding: 52, hearth: 50, shed: 60, cow: 40, children: 40 }[kind] ?? 24;
      if (!plan.take('mid', lx - half, lx + half)) continue;
      if (kind === 'grinding') plan.add(y, M.grinding(lx, y, 0.85, i));
      else if (kind === 'hearth') plan.add(y, M.hearth(lx, y, 0.85, dir()));
      else if (kind === 'pound') plan.add(y, M.person(lx, y, 0.86, 'pound', dir(), i));
      else if (kind === 'baby') plan.add(y, M.person(lx, y, 0.86, 'baby', dir(), 1));
      else if (kind === 'children') for (let k = 0; k < 3; k++) plan.add(y, M.person(lx - 26 + k * 26, y + (k % 2) * 4, 0.55, 'dance', k % 2 ? -1 : 1, k));
      else if (kind === 'granary') { plan.add(y, M.granary(lx, y, 0.85)); if (some(0.5)) plan.add(y + 1, M.granary(lx + 30, y + 4, 0.7)); }
      else if (kind === 'haystack') plan.add(y, M.haystack(lx, y, 0.85));
      else if (kind === 'shed') plan.add(y, M.shed(lx, y, 0.72, dir()));
      else if (kind === 'hens') for (let k = 0; k < 3; k++) plan.add(y, M.hen(lx - 15 + k * 15, y + (k % 2) * 4, 0.7, dir(), k === 0));
      else if (kind === 'cow') { const d = dir(); plan.add(y, M.bullock(lx, y, 0.68, d)); if (some(0.5)) plan.add(y + 3, M.bullock(lx + 26 * d, y + 3, 0.45, d, { calf: true })); }
    }
    if (some(0.5) && plan.take('back', x0 + 10, x0 + 70)) plan.tree(x0 + 40, BACK[0] - 10, 0.5, choose(rng, [M.tree, M.leafyTree])(x0 + 40, BACK[0] - 10, 0.5, rng));
  }

  plot_field(plan, x0, x1, { rng, some, count, people, dir, o, D, L, W, wrng, wild, wcount, wdir }) {
    const fx0 = x0 + 22, fx1 = x1 - 22, top = between(rng, 412, 425), bottom = between(rng, 498, 508);
    plan.take('back', fx0, fx1);
    plan.take('mid', fx0, fx1);
    const skew = between(rng, 10, 26);
    plan.add(top, M.shape([[fx0 + skew, top], [fx1, top - 8], [fx1 - skew * 0.4, bottom], [fx0, bottom + 6]], false, 1.4));
    const rows = 4, cols = Math.max(4, Math.floor(((fx1 - fx0) / 24) * Math.min(1.3, D)));
    const plant = { monsoon: M.paddy, harvest: M.grain, summer: M.crop }[o.season];
    for (let r = 0; r < rows; r++) {
      const y = top + 18 + r * ((bottom - top - 18) / rows);
      if (o.season === 'summer' && r % 2) { plan.add(y, M.line([[fx0 + skew * (1 - r / rows) + 8, y], [fx1 - 10, y - 4]], 0.9, 0.5)); continue; }
      for (let c = 0; c < cols; c++) {
        const t = (c + 0.5) / cols;
        const x = fx0 + skew * (1 - r / rows) + t * (fx1 - fx0 - skew) + (rng() - 0.5) * 4;
        if (o.season === 'summer' && some(0.5)) continue;
        plan.add(y, plant(x, y, between(rng, 0.6, 0.78)));
      }
    }
    const width = fx1 - fx0;
    const job = o.season === 'harvest' ? 'sickle' : o.season === 'monsoon' ? 'farm' : 'sow';
    if (o.season !== 'harvest' && width > 230 && some(0.75)) {
      const d = dir();
      plan.add(bottom + 2, M.plough((fx0 + fx1) / 2 + 40 * d, bottom + 2, 0.72, d));
    }
    for (let i = 0; i < count(width / 140, L); i++) {
      const y = between(rng, top + 40, bottom - 4);
      plan.add(y, M.person(between(rng, fx0 + 30, fx1 - 50), y, 0.82, job, dir(), i));
    }
    if (o.season === 'harvest' && some(0.6)) plan.add(bottom + 4, M.haystack(fx1 - 30, bottom + 4, 0.7));
    // Visitors at the edge of the field.
    if (wild(0.5)) plan.add(bottom + 10, M.hare(fx0 + between(wrng, 10, 60), bottom + 12, 0.85, wdir()));
    if (wild(0.25)) plan.add(top - 2, M.jackal(fx1 - between(wrng, 20, 60), top + 2, 0.7, -1));
    if (wild(0.3)) plan.add(bottom + 9, M.boar(fx1 - between(wrng, 40, 90), bottom + 14, 0.75, -1));
  }

  plot_water(plan, x0, x1, { rng, some, count, people, dir, o, L, W, wrng, wild, wcount, wdir }) {
    const w = x1 - x0, cx = (x0 + x1) / 2;
    const useWell = weighted(rng, { well: o.season === 'summer' ? 2.5 : 0.8, pond: o.season === 'monsoon' ? 2.5 : 1 }) === 'well';
    if (useWell) {
      const y = between(rng, MID[0] + 6, MID[1]);
      plan.take('mid', cx - 60, cx + 140);
      plan.add(y, M.well(cx, y, 0.95));
      if (L > 0) plan.add(y + 1, M.person(cx + 46, y + 1, 0.86, 'well', -1, 1));
      for (let i = 0; i < count(1.5, L); i++) plan.add(y + 2 + i, M.person(cx + 82 + i * 28, y + 2 + i, 0.84, 'pot', -1, i));
      if (some(0.6) && plan.take('mid', cx - 140, cx - 70)) plan.add(y - 2, M.bullock(cx - 100, y - 2, 0.62, 1));
      const tx = cx + between(rng, -w * 0.25, w * 0.25);
      if (plan.take('back', tx - 60, tx + 60)) plan.tree(tx, BACK[0], 0.62, (some(0.5) ? M.leafyTree : M.tree)(tx, BACK[0], 0.62, rng));
      return;
    }
    const rx = Math.min(w / 2 - 22, 200), ry = between(rng, 42, 58), py = 458;
    plan.take('back', cx - rx, cx + rx);
    plan.take('mid', cx - rx, cx + rx);
    let pond = M.ellipse(cx, py, rx, ry, false, 1.7);
    for (let i = 0; i < 8; i++) {
      const y = py - ry + 10 + i * ((2 * ry - 20) / 7);
      const half = Math.sqrt(Math.max(0, 1 - ((y - py) / ry) ** 2)) * rx * 0.85;
      pond += M.line([[cx - half, y], [cx - half * 0.35, y + 2], [cx + half * 0.4, y - 1], [cx + half, y]], 1, 0.55);
    }
    plan.add(py - ry, pond);
    for (let i = 0; i < count(4); i++) plan.add(py, M.fish(cx + between(rng, -rx * 0.6, rx * 0.6), py + between(rng, -ry * 0.5, ry * 0.5), 0.7, dir()));
    if (rx > 140 && people(0.8)) plan.add(py + 12, M.boat(cx + between(rng, -30, 30), py + 12, 0.62, dir()));
    if (some(0.7)) plan.add(py + ry - 6, M.crane(cx - rx + 18, py + ry - 4, 0.8, 1));
    if (some(0.5)) plan.add(py + ry, M.crane(cx + rx - 26, py + ry + 2, 0.65, -1));
    for (let i = 0; i < count(1.4, L); i++) {
      const side = i % 2 ? 1 : -1;
      const y = py + ry + between(rng, 6, 22);
      plan.add(y, M.person(cx + side * (rx * 0.55 + i * 18), y, 0.84, 'pot', -side, i));
    }
    if (o.season === 'monsoon') for (let i = 0; i < 6; i++) plan.add(py + ry + 14, M.paddy(cx - rx * 0.5 + i * 14, py + ry + 14, 0.7));
    if (wild(0.5)) plan.add(py + 1, M.turtle(cx + between(wrng, -rx * 0.5, rx * 0.5), py + between(wrng, -ry * 0.3, ry * 0.4), 0.8, wdir()));
    for (let i = 0; i < wcount(o.season === 'monsoon' ? 3 : 1); i++) plan.add(py + ry + 4, M.frog(cx + between(wrng, -rx, rx) * 0.8, py + ry + between(wrng, -4, 10), 0.8, wdir()));
    if (wild(0.3) && rx > 120) plan.add(py - ry + 6, M.elephant(cx + rx - 30, py - ry + 30, 0.55, -1)); // come down to drink
  }

  plot_forest(plan, x0, x1, { rng, some, count, people, dir, o, D, L, W, wrng, wild, wcount, wdir }) {
    const w = x1 - x0;
    const trees = Math.max(2, Math.min(Math.floor(w / 85), count(3)));
    const kinds = [M.tree, M.leafyTree, M.fernTree, M.tree];
    for (let i = 0; i < trees; i++) {
      const lx = x0 + ((i + 0.5) / trees) * w + between(rng, -18, 18);
      const back = i % 2 === 0;
      const y = back ? between(rng, BACK[0], BACK[1]) : between(rng, MID[0] - 10, MID[0] + 12);
      const s = back ? between(rng, 0.62, 0.8) : between(rng, 0.75, 0.95);
      plan.take(back ? 'back' : 'mid', lx - 30, lx + 30);
      if (some(0.15)) plan.add(y, M.palm(lx, y, s * 0.95, people(0.6)));
      else plan.tree(lx, y, s, choose(rng, kinds)(lx, y, s, rng));
    }
    const fauna = { deer: 1.4, peacock: 1, tiger: 0.7, elephant: 0.3, boar: 0.6, jackal: 0.5, hare: 0.6, snake: 0.4, hunter: 0.3 * L };
    for (let i = 0; i < wcount(2.6); i++) {
      const lx = between(wrng, x0 + 40, x1 - 40), y = between(wrng, MID[0] + 10, MID[1]);
      const kind = weighted(wrng, fauna);
      const half = kind === 'elephant' ? 62 : 38;
      if (!plan.take('mid', lx - half, lx + half)) continue;
      const d = wdir();
      if (kind === 'deer') { plan.add(y, M.deer(lx, y, 0.75, d)); if (wrng() < 0.5) plan.add(y + 6, M.deer(lx - 30 * d, y + 6, 0.5, d)); }
      else if (kind === 'peacock') plan.add(y, M.peacock(lx, y, 0.75, d));
      else if (kind === 'tiger') plan.add(y, M.tiger(lx, y, 0.75, d));
      else if (kind === 'snake') plan.add(y, M.snake(lx, y, 0.8, d));
      else if (kind === 'elephant') plan.add(y, M.elephant(lx, y, 0.75, d));
      else if (kind === 'boar') plan.add(y, M.boar(lx, y, 0.85, d));
      else if (kind === 'jackal') plan.add(y, M.jackal(lx, y, 0.8, d));
      else if (kind === 'hare') { plan.add(y, M.hare(lx, y, 0.85, d)); if (wrng() < 0.5) plan.add(y + 5, M.hare(lx + 22, y + 5, 0.7, -d)); }
      else plan.add(y, M.person(lx, y, 0.86, 'bow', d, 0));
    }
  }

  plot_festival(plan, x0, x1, { rng, some, count, people, dir, o, D, L }) {
    const w = x1 - x0, cx = (x0 + x1) / 2, y = 468;
    plan.take('back', x0, x1);
    plan.take('mid', x0, x1);
    // The spiral's radius grows with √dancers; keep it inside the plot.
    const fit = Math.floor(((w / 2 - 20) / (1.2 * 0.82)) ** 2 / 1152 - 3.6);
    const dancers = Math.max(6, Math.min(fit, Math.round(9 + 6 * D * L)));
    plan.add(y, M.tarpaDance(cx, y, 0.82, rng, dancers));
    if (some(0.6)) plan.add(y + 52, M.person(cx + w * 0.38, y + 52, 0.8, 'drum', -1, 0));
    if (some(0.5)) plan.tree(x0 + 30, BACK[0] - 20, 0.45, M.tree(x0 + 30, BACK[0] - 20, 0.45, rng));
    if (some(0.5)) plan.add(y + 40, M.peacock(x0 + 30, y + 40, 0.6, 1));
  }

  /** A sacred grove (devrai): old trees hung with leaves, a shrine and Waghoba's post, lamps and worshippers. */
  plot_grove(plan, x0, x1, { rng, some, count, people, dir, o, L, W, wrng, wild, wcount, wdir }) {
    const w = x1 - x0, cx = (x0 + x1) / 2;
    plan.take('back', x0, x1);
    plan.take('mid', x0 + 20, x1 - 20);
    const tl = x0 + w * 0.2, tr = x1 - w * 0.2;
    plan.tree(tl, BACK[1] + 6, 0.92, M.leafyTree(tl, BACK[1] + 6, 0.92, rng));
    if (w > 280) {
      plan.tree(tr, BACK[0] + 6, 0.78, choose(rng, [M.tree, M.leafyTree])(tr, BACK[0] + 6, 0.78, rng));
      plan.add(BACK[1] + 7, M.toran(tl + 30, BACK[0] - 60, tr - 30, BACK[0] - 66, 18));
    }
    const sy = MID[0] + 16;
    const layout = w > 300 ? weighted(rng, { temple: 1, both: 1.2 }) : weighted(rng, { temple: 1, post: 1 });
    const templeX = layout === 'both' ? cx - 40 : cx;
    if (layout !== 'post') plan.add(sy, M.shrine(templeX, sy, 0.85));
    if (layout !== 'temple') plan.add(sy + 2, M.waghobaPost(layout === 'both' ? cx + 60 : cx, sy + 2, 0.82));
    for (let i = 0; i < count(4); i++) plan.add(sy + 12, M.lamp(cx - 50 + i * 26, sy + 14, 0.9));
    for (let i = 0; i < count(2, L); i++) {
      const side = i % 2 ? -1 : 1;
      plan.add(sy + 24, M.person(cx + side * (82 + i * 14), sy + 26, 0.8, i % 3 === 2 ? 'offer' : 'pray', -side, i));
    }
    if (wild(0.45)) { const side = wdir(); plan.add(sy - 6, M.tiger(side > 0 ? x0 + 46 : x1 - 46, sy - 4, 0.6, side)); }
    if (wild(0.4)) plan.add(sy + 30, M.peacock(edgeX(x0, x1, wrng), sy + 32, 0.6, wdir()));
  }

  plot_open(plan, x0, x1, { rng, count }) {
    for (let i = 0; i < count(10); i++) {
      const y = between(rng, MID[0], MID[1]);
      plan.add(y, M.grass(between(rng, x0 + 10, x1 - 10), y, between(rng, 0.4, 0.8)));
    }
    if (count(1)) {
      const lx = (x0 + x1) / 2;
      if (plan.take('back', lx - 30, lx + 30)) plan.tree(lx, BACK[1], 0.55, M.leafyTree(lx, BACK[1], 0.55, rng));
    }
  }

  /* ---------- whole view ---------- */

  /** Hills, footpath and border for one region, in region-local coordinates. They sample continuous
   *  functions on a 25-unit grid that divides the region width, so neighbouring regions meet exactly. */
  frame(base) {
    const style = M.getStyle();
    M.setStyle({ wobble: 0, weight: this.options.weight }); // jitter here would break the seams
    const xs = Array.from({ length: REGION_WIDTH / 25 + 1 }, (_, i) => i * 25);
    let back = '';
    for (let layer = 0; layer < 2; layer++) {
      back += M.line(xs.map(x => [x, 300 + layer * 44 - fbm(`${this.seed}:hills:${layer}`, (base + x) / (260 + layer * 90)) * (80 - layer * 20)]), 1, 0.16 + layer * 0.06);
    }
    back += M.line(xs.map(x => [x, pathY(this.seed, base + x)]), 1.2, 0.55) + M.line(xs.map(x => [x, pathY(this.seed, base + x) + 15]), 0.8, 0.4);
    let border = '';
    if (this.options.border !== 'none') {
      for (const y of [12, HEIGHT - 12]) {
        border += M.line([[0, y - 8], [REGION_WIDTH, y - 8]], 1, 0.6) + M.line([[0, y + 8], [REGION_WIDTH, y + 8]], 1, 0.6);
        for (const x of xs.slice(0, -1)) {
          border += this.options.border === 'zigzag'
            ? M.shape([[x, y + 6], [x + 12.5, y - 6], [x + 25, y + 6]], (x / 25) % 2 === 0, 0.9)
            : M.circle(x + 12.5, y, 2.2);
        }
      }
    }
    M.setStyle(style);
    return { back, border };
  }

  render(camera) {
    const indices = visibleRegions(camera.center, camera.width);
    const keep = new Set(indices);
    for (const index of this.cache.keys()) if (!keep.has(index)) { this.cache.delete(index); this.plots.delete(index); }
    return indices.map(index => this.region(index)).join('');
  }
}

export function escapeXML(text) {
  return text.replace(/[<>&"']/g, ch => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;' })[ch]);
}

export function exportSVG(village, camera, palette) {
  const x = camera.center - camera.width / 2;
  const top = camera.top ?? 0;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${x} ${top} ${camera.width} ${camera.height}" width="${Math.round(camera.width * 2)}" height="${Math.round(camera.height * 2)}" style="color:${palette.ink};background:${palette.ground}">
  <title>Anant Gaon — ${escapeXML(village.seed)}</title>
  <desc>Original procedural artwork inspired by Warli visual traditions. Seed: ${escapeXML(village.seed)}. Position: ${camera.center}.</desc>
  <rect x="${x}" y="${top}" width="${camera.width}" height="${camera.height}" fill="${palette.ground}"/>
  ${village.render(camera)}
  </svg>`;
}
