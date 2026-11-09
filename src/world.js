import { between, chance, choose, fbm, HEIGHT, noise, pathY, random, REGION_WIDTH, visibleRegions, weighted } from './random.js';
import * as M from './motifs.js';

export const PALETTES = {
  clay: { name: 'Terracotta', ground: '#873f30', ink: '#f5e5c3' },
  dung: { name: 'Cow-dung', ground: '#5b4532', ink: '#f1e7cf' },
  night: { name: 'Indigo', ground: '#283d49', ink: '#e9e2c9' },
  paper: { name: 'Parchment', ground: '#e7dbc0', ink: '#6d4735' },
};

export const LAND = ['home', 'field', 'water', 'river', 'forest', 'grove', 'festival'];
export const LAND_NAMES = { home: 'Homes', field: 'Fields', water: 'Ponds & lakes', river: 'Rivers', forest: 'Forest', grove: 'Sacred groves', festival: 'Festivals' };
export const CHOICES = {
  season: ['harvest', 'monsoon', 'summer'],
  time: ['day', 'dusk', 'night'],
  border: ['zigzag', 'dots', 'none'],
};
/** Every tunable setting: [min, max, default]. All of them can be set from the URL. */
export const RANGES = {
  density: [0.3, 2, 1], life: [0, 2, 1], wild: [0, 2, 1], motion: [0, 2, 1], sky: [0, 2, 1],
  wobble: [0, 1, 0.45], jitter: [0, 1, 0.3], weight: [0.6, 1.8, 1], rough: [0, 1, 0.5], texture: [0, 1, 0.5],
  home: [0, 2, 1], field: [0, 2, 1], water: [0, 2, 1], river: [0, 2, 0.6], forest: [0, 2, 1], grove: [0, 2, 0.5], festival: [0, 2, 0.45],
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

/** The room each figure takes, unscaled, facing +x, feet at (0, 0): [left, top, right, bottom]. */
const BOXES = {
  person: [-26, -94, 28, 2], tall: [-26, -110, 28, 2], wide: [-42, -98, 74, 2], bent: [-14, -78, 48, 8], tarpa: [-20, -124, 30, 2], winnow: [-26, -94, 44, 2],
  bullock: [-46, -64, 46, 2], goat: [-27, -48, 30, 2], dog: [-26, -40, 28, 2], horse: [-48, -100, 44, 2], tiger: [-66, -72, 62, 2],
  deer: [-34, -94, 36, 2], elephant: [-54, -80, 72, 2], boar: [-32, -42, 32, 2], jackal: [-36, -44, 32, 2], hare: [-16, -36, 18, 2],
  peacock: [-42, -66, 42, 4], crane: [-24, -76, 34, 2], snake: [-42, -14, 52, 2], hen: [-12, -26, 18, 4], small: [-20, -24, 22, 4],
  butterfly: [-12, -12, 12, 10], monkey: [-26, -42, 14, 6],
  cart: [-92, -80, 92, 4], plough: [-155, -92, 48, 10], boat: [-62, -78, 64, 2], well: [-34, -92, 48, 2], grinding: [-50, -58, 50, 4],
  hearth: [-50, -72, 16, 2], granary: [-26, -78, 26, 2], haystack: [-32, -68, 32, 2], pounding: [-42, -112, 42, 4],
};
const PERSON_BOX = { net: 'wide', bow: 'wide', rod: 'wide', spear: 'wide', yoke: 'wide', tarpa: 'tarpa', farm: 'bent', sickle: 'bent', sow: 'bent', winnow: 'winnow', pots: 'tall', firewood: 'tall', carry: 'tall', pot: 'tall' };

function boxOf(kind, x, y, s, d, lift = 0) {
  const [a, b, c, e] = BOXES[kind];
  const [l, r] = d < 0 ? [-c, -a] : [a, c];
  return [x + l * s, y + (b - lift) * s, x + r * s, y + e * s];
}

/**
 * Bookkeeping for one region. Rows keep big things (houses, fields, ponds) apart. Boxes keep people
 * and animals apart: as on the walls, a figure may stand behind one of its own group (a herd, a
 * family, a procession), but never across a stranger. Wet ground keeps walkers out of the water.
 */
class Plan {
  constructor() {
    this.rows = { back: [], mid: [], path: [], front: [] };
    this.items = []; this.trees = []; this.boxes = []; this.wet = []; this.gaps = []; this.later = [];
    /** Figures stay inside the plot being laid out, so a neighbour's dance floor or threshing floor is never trespassed. */
    this.bounds = [0, REGION_WIDTH];
  }
  /** Trees are remembered so birds, owls, squirrels and monkeys can settle in them later. */
  tree(x, y, s, svg, h = 160) { this.add(y, svg); this.trees.push({ x, y, s, h }); }
  free(row, x0, x1) { return this.rows[row].every(([a, b]) => x1 <= a || x0 >= b); }
  take(row, x0, x1) { if (!this.free(row, x0, x1)) return false; this.rows[row].push([x0, x1]); return true; }
  add(y, svg) { this.items.push([y, svg]); }
  /** Is a box clear of every figure outside `group`? Edges may touch. */
  clear([x0, y0, x1, y1], group) {
    return this.boxes.every(({ b, g }) => (group && g === group) || x1 <= b[0] + 2 || x0 >= b[2] - 2 || y1 <= b[1] + 2 || y0 >= b[3] - 2);
  }
  mark(b, group) { this.boxes.push({ b, g: group }); }
  dry(x, y) { return !this.wet.some(f => f(x, y)); }
  /** Find room for a figure near x, sliding up to `slide` either way. Returns the x it got, or null. */
  room(kind, x, y, s, d, { group, slide = 0, lift = 0, wet = false } = {}) {
    for (const k of slide ? [0, 0.3, -0.3, 0.6, -0.6, 1, -1] : [0]) {
      const at = x + k * slide;
      const b = boxOf(kind, at, y, s, d, lift);
      if (b[0] < this.bounds[0] || b[2] > this.bounds[1]) continue;
      if (this.clear(b, group) && (wet || this.dry(at, y))) { this.mark(b, group); return at; }
    }
    return null;
  }
  svg() { return this.items.sort((a, b) => a[0] - b[0]).map(([, s]) => s).join(''); }
}

const edgeX = (x0, x1, rng) => (rng() < 0.5 ? x0 + 34 : x1 - 34);

/** A gait from `table` ({ name: weight }), nudged by the motion stream so no two animals hold it alike.
 *  At zero energy animals stand as drawn. */
function pose(table, rng, energy) {
  if (energy <= 0) return undefined;
  const out = { phase: rng() * 6.3 };
  for (const [k, v] of Object.entries(M.GAITS[weighted(rng, table)])) out[k] = v * energy * (0.75 + rng() * 0.5);
  out.dip = (out.dip ?? 0) + (rng() - 0.5) * 0.2 * energy;
  out.tail = (out.tail ?? 0) + (rng() - 0.5) * 0.5 * energy;
  return out;
}

export class Village {
  constructor(seed, options = {}) {
    this.seed = seed;
    this.options = normalizeOptions(options);
    this.cache = new Map();
    this.plots = new Map();
    /** The room each figure was given, per region: [{ b: [x0, y0, x1, y1], g: group }]. */
    this.layout = new Map();
  }
  get cacheSize() { return this.cache.size; }

  /** Land use for a plot. Each kind is picked in proportion to its weight from the settings,
   *  shaped by its own slow noise field, so similar land clusters into zones as you walk. */
  landAt(x, rng, previous, width) {
    const o = this.options;
    const season = { monsoon: { water: 1.25, river: 1.3, field: 1.15 }, summer: { field: 0.8, water: 1.15, river: 0.8 }, harvest: { field: 1.15, festival: 1.3 } }[o.season];
    const table = {};
    for (const land of LAND) {
      let w = o[land] * (season[land] ?? 1) * (0.15 + fbm(`${this.seed}:land:${land}`, x / 1500)) ** 3;
      if (land === 'festival' && (o.life === 0 || previous === 'festival')) w = 0;
      if (land === 'river' && (width < 200 || previous === 'river' || previous === 'water')) w = 0;
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
    M.setStyle({ wobble: o.wobble, jitter: o.jitter, weight: o.weight, rng: random(`${seed}:ink:${index}`) });
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
    // Poses and plants have their own streams too: the Motion setting bends bodies, never moves them.
    const mrng = random(`${seed}:motion:${index}`);
    const frng = random(`${seed}:flora:${index}`);
    const E = o.motion;
    const move = kind => M.moves(kind, mrng, E);
    const gait = table => pose(table, mrng, E);
    const flora = Array.from({ length: 3 }, () => M.species(frng));
    /** A plant at (x, y): one of this region's species, or now and then a classic Warli tree. Big ones can hold birds. */
    const grow = (x, y, s, opts = {}) => {
      if (!plan.dry(x, y)) return;
      const classic = opts.classic ?? 0.3;
      if (frng() < classic) {
        const kind = choose(frng, ['tree', 'leafyTree', 'fernTree', 'tree']);
        plan.tree(x, y, s, M[kind](x, y, s, frng), kind === 'leafyTree' ? 140 : 165);
        return;
      }
      const sp = opts.form ? M.species(frng, opts.form) : choose(frng, flora);
      const svg = M.plant(x, y, s * (opts.boost ?? 1), frng, sp);
      if (sp.form === 'tree' || sp.form === 'palm' || sp.form === 'cypress') plan.tree(x, y, s * (opts.boost ?? 1), svg, sp.height);
      else plan.add(y, svg);
    };
    /** Place a figure if there is room for it (see Plan.room); `draw(x)` makes it at the x it was given. */
    const put = (kind, x, y, s, d, draw, opts = {}) => {
      const at = plan.room(kind, x, y, s, d, opts);
      if (at === null) return false;
      plan.add(opts.z ?? y, draw(at));
      return true;
    };
    const human = (x, y, s, pz, d, v, m = {}, opts = {}) => put(PERSON_BOX[pz] ?? 'person', x, y, s, d, X => M.person(X, y, s, pz, d, v, m), { lift: m.lift ?? 0, ...opts });
    const beast = (kind, x, y, s, d, p, opts = {}) => put(kind, x, y, s, d, X => M[kind](X, y, s, d, p), { lift: p?.lift ?? 0, ...opts });
    const cow = (x, y, s, d, o2 = {}, opts = {}) => put('bullock', x, y, s, d, X => M.bullock(X, y, s, d, o2), { lift: o2.pose?.lift ?? 0, ...opts });
    /** Wildlife waits until the village is placed, so animals fill the gaps and never displace people. */
    const later = fn => { const bounds = plan.bounds; plan.later.push(() => { plan.bounds = bounds; fn(); }); };
    const ctx = { rng, some, count, people, dir, o, D, L, W, wrng, wild, wcount, wdir, move, gait, grow, mrng, frng, E, put, human, beast, cow, later, base, seed };

    this.sky(plan, ctx);

    /* plots: three or four stretches of land, each with its own use */
    const n = some(0.35) ? 4 : 3;
    const widths = Array.from({ length: n }, () => between(rng, 0.8, 1.4));
    const total = widths.reduce((s, w) => s + w, 0);
    let previous = '', x0 = 0;
    const plots = [];
    for (const w of widths) {
      const x1 = x0 + (w / total) * REGION_WIDTH;
      const land = this.landAt(base + (x0 + x1) / 2, rng, previous, x1 - x0);
      plan.bounds = [x0, x1];
      this[`plot_${land}`](plan, x0, x1, ctx);
      plots.push({ x0, x1, land });
      previous = land;
      x0 = x1;
    }

    plan.bounds = [0, REGION_WIDTH];

    /* traffic on the footpath */
    for (let i = 0; i < count(2.2); i++) {
      const lx = between(rng, 60, 940);
      const y = pathY(seed, base + lx) + 9;
      const d = dir();
      const kind = weighted(rng, { cart: 1.2, herd: 1.3, walkers: 1.6 * L, procession: 0.35 * L, dog: 0.5 });
      if (kind === 'cart' && plan.take('path', lx - 85, lx + 85)) {
        put('cart', lx, y, 0.72, d, X => M.bullockCart(X, y, 0.72, d, o.season === 'harvest', gait({ walk: 1 })));
      } else if (kind === 'herd' && plan.take('path', lx - 110, lx + 110)) {
        const group = `herd${i}`;
        if (L > 0) human(lx - 70 * d, y, 0.82, rng() < 0.3 ? 'flute' : 'herd', d, 0, move('walk'), { group });
        const goats = some(0.4);
        for (let k = 0; k < 2 + Math.floor(rng() * 3); k++) {
          const ax = lx - 30 * d + k * 34 * d, ay = y + (k % 2) * 6 - 3;
          if (goats) beast('goat', ax, ay, 0.75, d, gait({ walk: 3, graze: 1, frisk: 0.6 }), { group });
          else cow(ax, ay, 0.58, d, { calf: some(0.25), pose: gait({ walk: 3, graze: 0.8, trot: 0.5, buck: 0.3 }) }, { group });
        }
      } else if (kind === 'walkers' && plan.take('path', lx - 45, lx + 45)) {
        for (let k = 0; k < 1 + Math.floor(rng() * 3); k++) {
          human(lx + k * 30 * d, y + k, 0.84, choose(rng, ['pot', 'pots', 'carry', 'walk', 'baby', 'yoke', 'firewood']), d, k + 1, move('walk'), { group: `walk${i}`, slide: 20 });
        }
      } else if (kind === 'procession' && plan.take('path', lx - 120, lx + 120)) {
        const group = `proc${i}`, p = gait({ walk: 2, trot: 1, rear: 0.3 });
        put('horse', lx, y, 0.72, d, X => M.horse(X, y, 0.72, d, true, p), { group, lift: p?.lift ?? 0 });
        for (let k = 1; k <= 3; k++) human(lx - k * 34 * d, y + 1, 0.78, k === 1 ? 'drum' : k === 2 ? 'flute' : 'dance', d, k, move(k === 3 ? 'dance' : 'walk'), { group });
      } else if (kind === 'dog' && plan.take('path', lx - 20, lx + 20)) {
        beast('dog', lx, y, 0.7, d, gait({ trot: 2, gallop: 1, stretch: 0.5, stand: 0.5 }), { slide: 30 });
      }
    }

    /* foreground rhythm */
    const dryAt = (x, y) => plan.dry(x, y);
    for (let i = 0; i < count(38); i++) {
      const x = between(rng, 20, 980), y = between(rng, FRONT[0], FRONT[1]);
      if (dryAt(x, y)) plan.add(y, M.grass(x, y, between(rng, 0.4, 0.95)));
    }
    for (let i = 0; i < count(5); i++) {
      const x = between(rng, 20, 980), y = between(rng, FRONT[0], FRONT[1]);
      if (dryAt(x, y)) plan.add(y, M.flower(x, y, between(rng, 0.6, 0.9)));
    }
    for (let i = 0; i < count(1.2); i++) {
      const lx = between(rng, 40, 960), y = between(rng, FRONT[0] + 8, FRONT[1]);
      if (!plan.take('front', lx - 40, lx + 40)) continue;
      const kind = weighted(rng, { hens: 1.4, dog: 0.4, snake: 0.4 * W, crab: o.water * 0.4 * W, scorpion: (o.season === 'summer' ? 0.7 : 0.3) * W, frog: (o.season === 'monsoon' ? 1.2 : 0.1) * W, hare: 0.5 * W });
      const d = dir();
      if (kind === 'hens') for (let k = 0; k < 3; k++) put('hen', lx + k * 20, y + (k % 2) * 5, 0.75, k ? 1 : -1, X => M.hen(X, y + (k % 2) * 5, 0.75, k ? 1 : -1, k === 0), { group: `hens${i}` });
      else if (kind === 'snake') put('snake', lx, y, 0.7, d, X => M.snake(X, y, 0.7, d));
      else if (kind === 'crab') put('small', lx, y, 0.8, 1, X => M.crab(X, y, 0.8), { wet: true });
      else if (kind === 'scorpion') put('small', lx, y, 0.9, d, X => M.scorpion(X, y, 0.9, d));
      else if (kind === 'frog') for (let k = 0; k < 2; k++) put('small', lx + k * 24, y + k * 4, 0.9, d, X => M.frog(X, y + k * 4, 0.9, d), { group: `frogs${i}`, wet: true });
      else if (kind === 'hare') beast('hare', lx, y, 0.85, d, gait({ leap: 1, stand: 1 }));
      else beast('dog', lx, y, 0.7, d, gait({ stand: 1, stretch: 1, trot: 1 }));
    }
    for (let i = 0; i < count(2.4); i++) {
      const x = between(rng, 20, 980), y = between(rng, FRONT[0] + 4, FRONT[1]);
      if (dryAt(x, y)) plan.add(y, M.plant(x, y, between(rng, 0.22, 0.34), frng, M.species(frng, choose(frng, ['herb', 'fan', 'fan', 'herb', 'banana']))));
    }

    /* wildlife, once the village has its places */
    for (const fn of plan.later) fn();
    plan.bounds = [0, REGION_WIDTH];
    for (const t of plan.trees) {
      if (!wild(0.45)) continue;
      const tx = t.x + between(wrng, -32, 32) * t.s, ty = t.y - between(wrng, 0.56, 0.76) * t.h * t.s;
      const kind = weighted(wrng, { owl: o.time === 'night' ? 2.5 : 0.15, parrot: o.time === 'night' ? 0 : 1, nest: 1, squirrel: 0.8, monkey: 1 });
      const svg = { owl: () => M.owl(tx, ty, 0.8), parrot: () => M.parrot(tx, ty, 0.8, wdir()), nest: () => M.nest(tx, ty, 0.85), squirrel: () => M.squirrel(tx, ty, 0.9, wdir()), monkey: () => M.monkey(tx, ty + 6, 0.75, wdir()) }[kind]();
      plan.add(t.y + 0.5, svg);
    }
    if (o.time !== 'night') for (let i = 0; i < wcount(1.6); i++) { const bx = between(wrng, 30, 970), by = between(wrng, 560, 625); put('butterfly', bx, by, 0.8, 1, X => M.butterfly(X, by, 0.8), { z: 700, slide: 40, wet: true }); }

    M.setStyle(style);
    const { back, border } = this.frame(base, plan.gaps);
    const result = `<g data-region="${index}" transform="translate(${base} 0)">${back}${plan.svg()}${border}</g>`;
    this.cache.set(index, result);
    this.plots.set(index, plots);
    this.layout.set(index, plan.boxes);
    return result;
  }

  /* ---------- the upper band ---------- */

  /** Sun or moon, birds in flight, flocks and kites, clouds (with rain in the monsoon), and a range of
   *  hills with small lives on them: a herder and goats on a slope, a tree on a peak, a flag on a shrine. */
  sky(plan, { rng, some, count, o, L, W, frng, wrng, wild }) {
    const k = o.sky;
    let lamp = -999; // where the sun or moon is, so clouds pass beside it rather than over it
    if (o.time === 'night') {
      if (some(0.55)) { lamp = between(rng, 150, 850); plan.add(0, M.moon(lamp, between(rng, 70, 130), 17)); }
      for (let i = 0; i < count(30, k); i++) plan.add(0, M.star(between(rng, 10, 990), between(rng, 40, 290), between(rng, 1.5, 3.5)));
    } else {
      if (some(0.55)) { lamp = between(rng, 150, 850); plan.add(0, M.sun(lamp, o.time === 'dusk' ? between(rng, 240, 280) : between(rng, 80, 140), o.time === 'dusk' ? 26 : 20)); }
      for (let i = 0; i < count(2.4, k); i++) plan.add(1, M.flyingBird(((i + rng()) / 2.4) * 420 % 960 + 20, between(rng, 70, 240), between(rng, 0.8, 1.45), rng() < 0.5 ? 1 : -1, between(rng, 0.2, 1), i));
      if (some(0.45 * k)) plan.add(1, M.vFlock(between(rng, 100, 900), between(rng, 70, 200), 5 + Math.floor(rng() * 6), between(rng, 0.7, 1), rng() < 0.5 ? 1 : -1));
      if (some(0.3 * k)) for (let i = 0; i < 1 + Math.floor(rng() * 2); i++) plan.add(1, M.kite(between(rng, 80, 920), between(rng, 60, 170), between(rng, 0.7, 1), between(rng, -20, 20)));
      for (let i = 0; i < count(2.5, k); i++) plan.add(1, M.bird(between(rng, 40, 960), between(rng, 110, 270), between(rng, 0.5, 1.05)));
    }
    const clouds = o.season === 'monsoon' ? count(2.6, k) : some(0.35 * k) ? 1 : 0;
    for (let i = 0; i < clouds; i++) {
      let cx = ((i + 0.5) / clouds) * 1000 + between(rng, -90, 90);
      if (Math.abs(cx - lamp) < 120) cx = lamp + Math.sign(cx - lamp || 1) * 120;
      plan.add(2, M.cloud(cx, between(rng, 55, 150), between(rng, 70, 150), rng, o.season === 'monsoon' ? 6 + Math.floor(rng() * 8) : 0));
    }
    if (o.season === 'monsoon') {
      let rain = '';
      for (let i = 0; i < count(60); i++) {
        const x = between(rng, 0, 1000), y = between(rng, 150, 600);
        rain += M.line([[x, y], [x - 1.4, y + 7]], 0.8);
      }
      plan.add(2, `<g opacity=".4">${rain}</g>`);
    }
    if (!some(0.9)) return;
    const peaks = [];
    plan.add(3, `<g opacity=".45">${M.mountains(between(rng, -60, 260), between(rng, 520, 900), between(rng, 348, 360), rng, peaks)}</g>`);
    let life = '';
    for (const pk of peaks) {
      const h = pk.base - pk.y;
      if (h < 45 || pk.x < 30 || pk.x > 970) continue;
      const roll = rng();
      if (roll < 0.3) life += M.plant(pk.x, pk.y + 3, 0.2, frng, M.species(frng, choose(frng, ['tree', 'cypress', 'palm', 'tree'])));
      else if (roll < 0.42 && L > 0) life += M.flag(pk.x, pk.y + 1, 0.75);
      else if (roll < 0.62) {
        // a herder bringing goats down the slope
        const at = t => [pk.left + (pk.x - pk.left) * t, pk.base - h * t];
        for (const t of [0.25, 0.42, 0.58]) { const [gx, gy] = at(t); life += M.goat(gx, gy, 0.3, -1); }
        if (L > 0) { const [hx, hy] = at(0.74); life += M.person(hx, hy, 0.3, 'herd', -1, 0); }
      } else if (roll < 0.72 && wild(0.6)) {
        const [dx, dy] = [pk.x + (pk.right - pk.x) * 0.4, pk.y + h * 0.4];
        life += M.deer(dx, dy, 0.3, 1);
      }
    }
    if (life) plan.add(4, `<g opacity=".8">${life}</g>`);
  }

  /* ---------- plot compositions ---------- */

  plot_home(plan, x0, x1, { rng, some, count, dir, o, L, move, gait, grow, put, human, cow }) {
    const w = x1 - x0, cx = (x0 + x1) / 2;
    const hx = cx + between(rng, -w * 0.15, w * 0.15), hy = between(rng, BACK[0] + 8, BACK[1]), hs = between(rng, 0.68, 0.86);
    plan.take('back', hx - 80 * hs, hx + 85 * hs);
    const hd = dir();
    plan.add(hy, M.hut(hx, hy, hs, rng, hd, { ladder: some(0.35), cradle: some(0.3) }));
    if (w > 300 && some(0.5)) {
      const sx = hx + (hx > cx ? -1 : 1) * 125, sy = hy - 18;
      if (plan.take('back', sx - 60, sx + 60)) plan.add(sy, some(0.5) ? M.hut(sx, sy, 0.52, rng, dir()) : M.shed(sx, sy, 0.75, dir()));
    }
    const chores = {
      grinding: 1.3 * L, hearth: 1 * L, pound: 0.6 * L, pounding: 0.8 * L, winnow: 0.8 * L, baby: 0.6 * L, children: 0.7 * L, firewood: 0.5 * L,
      granary: o.season === 'harvest' ? 1.6 : 0.6, haystack: o.season === 'harvest' ? 1 : 0.2, shed: 0.6, hens: 0.8, cow: 0.8,
    };
    for (let i = 0; i < count(2.6); i++) {
      const lx = between(rng, x0 + 35, x1 - 35), y = between(rng, MID[0], MID[1]);
      const kind = weighted(rng, chores);
      const half = { grinding: 52, hearth: 50, shed: 60, cow: 40, children: 40, pounding: 40, winnow: 36 }[kind] ?? 24;
      if (!plan.take('mid', lx - half, lx + half)) continue;
      const d = dir();
      if (kind === 'grinding') put('grinding', lx, y, 0.85, 1, X => M.grinding(X, y, 0.85, i));
      else if (kind === 'hearth') put('hearth', lx, y, 0.85, d, X => M.hearth(X, y, 0.85, d));
      else if (kind === 'pounding') put('pounding', lx, y, 0.82, 1, X => M.pounding(X, y, 0.82, i, move('work'), move('work')));
      else if (['pound', 'winnow', 'baby', 'firewood'].includes(kind)) human(lx, y, 0.86, kind, d, i, move(kind === 'baby' || kind === 'firewood' ? 'walk' : 'work'), { slide: 20 });
      else if (kind === 'children') for (let k = 0; k < 3; k++) human(lx - 26 + k * 26, y + (k % 2) * 4, 0.55, 'dance', k % 2 ? -1 : 1, k, move(rng() < 0.3 ? 'jump' : 'dance'), { group: `kids${i}` });
      else if (kind === 'granary') { put('granary', lx, y, 0.85, 1, X => M.granary(X, y, 0.85), { group: `store${i}` }); if (some(0.5)) put('granary', lx + 30, y + 4, 0.7, 1, X => M.granary(X, y + 4, 0.7), { group: `store${i}` }); }
      else if (kind === 'haystack') put('haystack', lx, y, 0.85, 1, X => M.haystack(X, y, 0.85));
      else if (kind === 'shed') plan.add(y, M.shed(lx, y, 0.72, d));
      else if (kind === 'hens') for (let k = 0; k < 3; k++) put('hen', lx - 15 + k * 15, y + (k % 2) * 4, 0.7, d, X => M.hen(X, y + (k % 2) * 4, 0.7, d, k === 0), { group: `hens${i}` });
      else if (kind === 'cow') {
        cow(lx, y, 0.68, d, { pose: gait({ graze: 2, stand: 1, walk: 1 }) }, { group: `cow${i}`, slide: 20 });
        if (some(0.5)) cow(lx + 26 * d, y + 3, 0.45, d, { calf: true, pose: gait({ frisk: 1.5, buck: 1, graze: 0.5 }) }, { group: `cow${i}` });
      }
    }
    if (some(0.5) && plan.take('back', x0 + 10, x0 + 70)) grow(x0 + 40, BACK[0] - 10, 0.5);
  }

  plot_field(plan, x0, x1, { rng, some, count, dir, o, D, L, wrng, wild, wdir, move, gait, put, human, beast, later }) {
    const fx0 = x0 + 22, fx1 = x1 - 22, top = between(rng, 412, 425), bottom = between(rng, 498, 508);
    plan.take('back', fx0, fx1);
    plan.take('mid', fx0, fx1);
    const width = fx1 - fx0;
    if (o.season === 'harvest' && width > 250 && some(0.4)) {
      // threshing time: the floor in the middle, stacks and winnowers around it
      const tx = (fx0 + fx1) / 2, ty = bottom + 4, d = dir();
      plan.mark([tx - 108, ty - 110, tx + 108, ty + 4], 'floor');
      plan.add(ty, M.threshing(tx, ty, 1, rng, gait({ walk: 1 }), move('walk'), d));
      put('haystack', fx0 + 26, top + 70, 0.7, 1, X => M.haystack(X, top + 70, 0.7), { slide: 20 });
      if (L > 0) human(fx1 - 34, top + 66, 0.8, 'winnow', -1, 1, move('work'), { slide: 24 });
      return;
    }
    const skew = between(rng, 10, 26);
    const edge = [[fx0 + skew, top], [fx1, top - 8], [fx1 - skew * 0.4, bottom], [fx0, bottom + 6]];
    plan.add(top, some(0.45) ? M.stones(edge) : M.shape(edge, false, 1.4));
    const rows = 4, cols = Math.max(4, Math.floor((width / 24) * Math.min(1.3, D)));
    const plant = { monsoon: M.paddy, harvest: M.grain, summer: M.crop }[o.season];
    for (let r = 0; r < rows; r++) {
      const y = top + 18 + r * ((bottom - top - 18) / rows);
      if (o.season === 'summer' && r % 2) { plan.add(y, M.line([[fx0 + skew * (1 - r / rows) + 8, y], [fx1 - 10, y - 4]], 0.9, 0.5)); continue; }
      for (let c = 0; c < cols; c++) {
        const t = (c + 0.5) / cols;
        const x = fx0 + skew * (1 - r / rows) + t * (width - skew) + (rng() - 0.5) * 4;
        if (o.season === 'summer' && some(0.5)) continue;
        plan.add(y, plant(x, y, between(rng, 0.6, 0.78)));
      }
    }
    const job = o.season === 'harvest' ? 'sickle' : o.season === 'monsoon' ? 'farm' : 'sow';
    if (o.season !== 'harvest' && width > 230 && some(0.75)) {
      const d = dir(), px = (fx0 + fx1) / 2 + 40 * d;
      put('plough', px, bottom + 2, 0.72, d, X => M.plough(X, bottom + 2, 0.72, d, gait({ walk: 1 }), move('walk')));
    }
    for (let i = 0; i < count(width / 140, L); i++) {
      const y = between(rng, top + 40, bottom - 4), d = dir();
      human(between(rng, fx0 + 30, fx1 - 50), y, 0.82, job, d, i, move('work'), { slide: 30 });
    }
    if (o.season === 'harvest' && some(0.6)) put('haystack', fx1 - 30, bottom + 4, 0.7, 1, X => M.haystack(X, bottom + 4, 0.7), { slide: 20 });
    // Visitors at the edge of the field.
    if (wild(0.5)) { const hx = fx0 + between(wrng, 10, 60), d = wdir(), p = gait({ leap: 1, stand: 1 }); later(() => beast('hare', hx, bottom + 12, 0.85, d, p, { slide: 30 })); }
    if (wild(0.25)) { const jx = fx1 - between(wrng, 20, 60), p = gait({ stalk: 1, trot: 1, stand: 1 }); later(() => beast('jackal', jx, top + 2, 0.7, -1, p, { slide: 40 })); }
    if (wild(0.3)) { const bx = fx1 - between(wrng, 40, 90), p = gait({ walk: 1, trot: 1, graze: 1 }); later(() => beast('boar', bx, bottom + 14, 0.75, -1, p, { slide: 40 })); }
  }

  /** Still water: a well in a dry season, a pond, or a lake with lotus, ducks and a fisherman's boat. */
  plot_water(plan, x0, x1, { rng, some, count, people, dir, o, L, wrng, wild, wcount, wdir, move, gait, grow, put, human, beast, cow, later }) {
    const w = x1 - x0, cx = (x0 + x1) / 2;
    const kind = weighted(rng, { well: o.season === 'summer' ? 2.5 : 0.8, pond: o.season === 'monsoon' ? 2 : 1, lake: w > 320 ? (o.season === 'monsoon' ? 1.8 : 1) : 0 });
    if (kind === 'well') {
      const y = between(rng, MID[0] + 6, MID[1]);
      plan.take('mid', cx - 60, cx + 140);
      put('well', cx, y, 0.95, 1, X => M.well(X, y, 0.95), { group: 'well' });
      if (L > 0) human(cx + 46, y + 1, 0.86, 'well', -1, 1, move('work'), { group: 'well' });
      for (let i = 0; i < count(1.5, L); i++) human(cx + 90 + i * 32, y + 2 + i, 0.84, choose(rng, ['pot', 'pots']), -1, i, move('walk'), { slide: 20 });
      if (some(0.6) && plan.take('mid', cx - 140, cx - 70)) cow(cx - 100, y - 2, 0.62, 1, { pose: gait({ graze: 1, stand: 1 }) });
      const tx = cx + between(rng, -w * 0.25, w * 0.25);
      if (plan.take('back', tx - 60, tx + 60)) grow(tx, BACK[0], 0.62);
      return;
    }
    const lake = kind === 'lake';
    const rx = lake ? Math.min(w / 2 - 14, 250) : Math.min(w / 2 - 22, 160), ry = lake ? between(rng, 54, 70) : between(rng, 38, 52), py = lake ? 462 : 458;
    plan.take('back', cx - rx, cx + rx);
    plan.take('mid', cx - rx, cx + rx);
    const water = M.pond(cx, py, rx, ry, rng);
    plan.add(py - ry, water.svg);
    plan.wet.push((x, y) => M.inside(water.poly, x, y));
    // Nobody stands across the water: only waders, swimmers and boats may share its box.
    const ys = water.poly.map(q => q[1]), xs = water.poly.map(q => q[0]);
    plan.mark([Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)], 'water');
    const inWater = (x, y) => M.inside(water.poly, x, y) && M.inside(water.poly, x - 14, y) && M.inside(water.poly, x + 14, y);
    for (let i = 0; i < count(lake ? 6 : 4); i++) {
      const fx = cx + between(rng, -rx * 0.7, rx * 0.7), fy = py + between(rng, -ry * 0.5, ry * 0.5);
      if (inWater(fx, fy)) plan.add(py, M.fish(fx, fy, 0.7, dir()));
    }
    if (lake) {
      for (let i = 0; i < count(5); i++) {
        const lx = cx + between(rng, -rx * 0.8, rx * 0.8), ly = py + between(rng, -ry * 0.6, ry * 0.6);
        if (inWater(lx, ly)) plan.add(ly, M.lotus(lx, ly, between(rng, 0.8, 1.1), rng));
      }
      if (some(0.6)) { const d = dir(), dx = cx + between(rng, -rx * 0.4, rx * 0.4), dy = py - ry * 0.35; for (let k = 0; k < 3; k++) if (inWater(dx + k * 22 * d, dy + k * 3)) put('small', dx + k * 22 * d, dy + k * 3, 0.85, d, X => M.duck(X, dy + k * 3, 0.85, d), { group: 'water', wet: true }); }
    }
    if (rx > 140 && people(0.8)) { const bx = cx + between(rng, -30, 30), d = dir(); put('boat', bx, py + 12, 0.62, d, X => M.boat(X, py + 12, 0.62, d), { wet: true, group: 'water' }); }
    // Life along the near shore, standing on dry ground just below the water.
    const shoreAt = (t, gap = 8) => { const x = cx + t * rx * 0.8, s = M.span(water.poly, py + ry * 0.4); let y = py; while (M.inside(water.poly, x, y) && y < py + ry * 1.5) y += 2; return [x, y + gap, s]; };
    if (some(0.7)) { const [x, y] = shoreAt(-0.95, 2); put('crane', x, y, 0.8, 1, X => M.crane(X, y, 0.8, 1), { wet: true, group: 'water', slide: 20 }); }
    if (some(0.5)) { const [x, y] = shoreAt(0.92, 2); put('crane', x, y, 0.65, -1, X => M.crane(X, y, 0.65, -1), { wet: true, group: 'water', slide: 20 }); }
    // People come to the water's ends, not across it.
    const end = side => { const s = M.span(water.poly, py + ry * 0.3) ?? [cx - rx, cx + rx]; return side < 0 ? s[0] - 30 : s[1] + 30; };
    for (let i = 0; i < count(1.4, L); i++) {
      const side = i % 2 ? 1 : -1, y = py + ry * 0.3 + between(rng, 6, 20);
      human(end(side) + side * i * 30, y, 0.84, choose(rng, ['pot', 'pot', 'pots']), -side, i, move('walk'), { slide: 30 });
    }
    if (lake && people(0.6)) { const side = dir(), y = py + between(rng, -ry * 0.2, ry * 0.3); human(end(side) + side * 14, y, 0.82, 'rod', -side, 0, move('work'), { slide: 20 }); }
    if (o.season === 'monsoon') for (let i = 0; i < 6; i++) { const x = cx - rx * 0.5 + i * 14, y = py + ry + 14; if (plan.dry(x, y)) plan.add(y, M.paddy(x, y, 0.7)); }
    if (wild(0.5)) { const tx = cx + between(wrng, -rx * 0.5, rx * 0.5), ty = py + between(wrng, -ry * 0.3, ry * 0.4), d = wdir(); if (inWater(tx, ty)) later(() => put('small', tx, ty, 0.8, d, X => M.turtle(X, ty, 0.8, d), { wet: true, group: 'water' })); }
    for (let i = 0; i < wcount(o.season === 'monsoon' ? 3 : 1); i++) { const [x, y] = shoreAt(between(wrng, -0.9, 0.9), 4), d = wdir(); later(() => put('small', x, y, 0.8, d, X => M.frog(X, y, 0.8, d), { wet: true, group: 'water', slide: 20 })); }
    if (wild(0.3) && rx > 120) { const p = gait({ graze: 1, walk: 1 }); later(() => beast('elephant', end(1) + 10, py + 6, 0.55, -1, p, { wet: true, slide: 40 })); } // come down to drink
  }

  /** A river coming down out of the hills and across the footpath, under a bridge, to the front of the scene. */
  plot_river(plan, x0, x1, { rng, some, count, people, dir, o, L, wrng, wild, wdir, move, gait, grow, put, human, beast, later, base, seed }) {
    const cx = (x0 + x1) / 2;
    const r = M.river(cx + between(rng, -30, 30), 352, 674, rng);
    plan.add(352, r.svg);
    plan.wet.push((x, y) => y > 348 && Math.abs(x - r.centre(y)) < r.width(y) / 2 + 6);
    const half = y => r.width(y) / 2;
    for (const [row, y] of [['back', 415], ['mid', 495], ['front', 640]]) plan.take(row, r.centre(y) - half(y) - 10, r.centre(y) + half(y) + 10);
    // The footpath crosses on a bridge.
    const by = pathY(seed, base + r.centre(560)) + 8, bx = r.centre(by), span = r.width(by) + 40;
    plan.gaps.push([bx - span / 2 + 6, bx + span / 2 - 6]);
    plan.take('path', bx - span / 2 - 30, bx + span / 2 + 30);
    plan.add(by + 1, M.bridge(bx, by, span));
    plan.mark([bx - span / 2, by - 16, bx + span / 2, by + 6], 'bridge');
    if (people(0.75)) {
      const t = between(rng, 0.3, 0.7), px = bx - span / 2 + t * span, py = by - Math.sin(t * Math.PI) * Math.min(26, span * 0.16) - 2;
      human(px, py, 0.8, choose(rng, ['pot', 'yoke', 'firewood', 'walk', 'carry']), dir(), 2, move('walk'), { group: 'bridge', wet: true });
    }
    // In the water.
    for (let i = 0; i < count(4); i++) { const y = between(rng, 420, 640), x = r.centre(y) + (rng() - 0.5) * r.width(y) * 0.5; plan.add(y, M.fish(x, y, 0.65, dir())); }
    if (some(0.5)) { const y = between(rng, 455, 500), d = dir(); for (let k = 0; k < 3; k++) put('small', r.centre(y + k * 6) + (k - 1) * 10 * d, y + k * 6, 0.75, d, X => M.duck(X, y + k * 6, 0.75, d), { group: 'ducks', wet: true }); }
    if (people(0.5)) { const y = 632, d = dir(); put('boat', r.centre(y), y, 0.55, d, X => M.boat(X, y, 0.55, d), { wet: true }); }
    // On the banks.
    const bank = (y, side, gap) => r.centre(y) + side * (half(y) + gap);
    if (people(0.7)) { const y = between(rng, 500, 530), side = dir(); human(bank(y, side, 44), y, 0.82, 'rod', -side, 0, move('work'), { slide: 20 }); }
    if (people(0.6)) { const y = between(rng, 590, 615), side = dir(); human(bank(y, side, 26), y, 0.82, choose(rng, ['pot', 'pots']), -side, 1, move('walk'), { slide: 20 }); }
    if (some(0.6)) { const y = between(rng, 440, 470), side = dir(); put('crane', bank(y, side, 6), y, 0.7, -side, X => M.crane(X, y, 0.7, -side), { wet: true }); }
    for (const side of [-1, 1]) if (some(0.7)) grow(bank(410, side, 40 + rng() * 40), between(rng, BACK[0], BACK[1]), between(rng, 0.55, 0.75));
    if (wild(0.4)) { const y = between(wrng, 470, 520), side = wdir(), p = gait({ graze: 2, stand: 1 }); later(() => beast('deer', bank(y, side, 30), y, 0.7, -side, p, { slide: 30 })); } // drinking
    if (wild(0.35)) { const y = between(wrng, 560, 640); later(() => put('small', r.centre(y), y, 0.8, 1, X => M.turtle(X, y, 0.8, 1), { wet: true })); }
  }

  plot_forest(plan, x0, x1, { rng, some, count, people, dir, L, wrng, wcount, wdir, move, gait, grow, frng, human, beast, put, later }) {
    const w = x1 - x0;
    const trees = Math.max(2, Math.min(Math.floor(w / 85), count(3)));
    for (let i = 0; i < trees; i++) {
      const lx = x0 + ((i + 0.5) / trees) * w + between(rng, -18, 18);
      const back = i % 2 === 0;
      const y = back ? between(rng, BACK[0], BACK[1]) : between(rng, MID[0] - 10, MID[0] + 12);
      const s = back ? between(rng, 0.62, 0.8) : between(rng, 0.75, 0.95);
      plan.take(back ? 'back' : 'mid', lx - 30, lx + 30);
      if (some(0.15)) plan.tree(lx, y, s * 0.95, M.palm(lx, y, s * 0.95, people(0.6), frng), 170);
      else grow(lx, y, s);
    }
    // undergrowth between the trunks
    for (let i = 0; i < count(w / 160); i++) {
      const y = between(rng, MID[0] + 4, MID[1]);
      grow(between(rng, x0 + 20, x1 - 20), y, between(rng, 0.35, 0.5), { classic: 0, form: choose(frng, ['herb', 'fan', 'banana', 'herb']) });
    }
    if (people(0.3)) { const y = between(rng, MID[0] + 10, MID[1]), d = dir(); human(between(rng, x0 + 40, x1 - 40), y, 0.86, rng() < 0.5 ? 'bow' : 'spear', d, 0, move('run'), { slide: 50 }); }
    if (people(0.25)) { const y = between(rng, MID[0] + 10, MID[1]); human(between(rng, x0 + 40, x1 - 40), y, 0.84, 'firewood', dir(), 1, move('walk'), { slide: 50 }); }
    const fauna = { deer: 1.4, peacock: 1, tiger: 0.7, elephant: 0.3, boar: 0.6, jackal: 0.5, hare: 0.6, snake: 0.4 };
    for (let i = 0; i < wcount(2.6); i++) {
      const lx = between(wrng, x0 + 40, x1 - 40), y = between(wrng, MID[0] + 10, MID[1]);
      const kind = weighted(wrng, fauna), d = wdir();
      const deerGait = { graze: 1.2, leap: 1, walk: 1, stand: 0.5 };
      const p = {
        deer: deerGait, tiger: { stalk: 1, walk: 1, leap: 1.1, pounce: 0.6, stand: 0.4 }, elephant: { walk: 2, graze: 1, stand: 1 },
        boar: { walk: 1, trot: 1, graze: 1 }, jackal: { stalk: 1, trot: 1, gallop: 0.5 }, hare: { leap: 1, stand: 1 },
      }[kind];
      const g = p && gait(p), pair = wrng() < 0.5, g2 = p && gait(p);
      later(() => {
        const group = `${kind}${i}`;
        if (kind === 'peacock') put('peacock', lx, y, 0.75, d, X => M.peacock(X, y, 0.75, d), { slide: 40 });
        else if (kind === 'snake') put('snake', lx, y, 0.8, d, X => M.snake(X, y, 0.8, d), { slide: 40 });
        else if (beast(kind, lx, y, kind === 'hare' ? 0.85 : 0.75, d, g, { slide: 40, group }) && pair && (kind === 'deer' || kind === 'hare')) {
          beast(kind, lx - 30 * d, y + 6, kind === 'hare' ? 0.7 : 0.5, kind === 'hare' ? -d : d, g2, { group });
        }
      });
    }
  }

  /** A festival: the tarpa spiral painted flat as on the walls, the circle seen from the side, or a crowd dancing free. */
  plot_festival(plan, x0, x1, { rng, some, D, L, dir, move, grow, mrng, E, human, put }) {
    const w = x1 - x0, cx = (x0 + x1) / 2, y = 468;
    plan.take('back', x0, x1);
    plan.take('mid', x0, x1);
    const layout = weighted(rng, { spiral: w > 290 ? 1.3 : 0, circle: 1, crowd: 0.6 });
    if (layout === 'spiral') {
      const radius = Math.min(w / 2 - 14, 132), sy = 446;
      plan.take('path', cx - radius, cx + radius);
      plan.mark([cx - radius, sy - radius, cx + radius, sy + radius], 'dance');
      plan.add(sy - radius, M.spiralDance(cx, sy, radius, rng, mrng, E));
      if (some(0.6)) human(x1 - 30, y + 64, 0.76, 'drum', -1, 0, move('dance'), { slide: 20 });
      if (some(0.5)) put('peacock', x0 + 30, y + 54, 0.55, 1, X => M.peacock(X, y + 54, 0.55, 1), { slide: 20 });
      return;
    }
    if (layout === 'circle') {
      // The spiral's radius grows with √dancers; keep it inside the plot.
      const fit = Math.floor(((w / 2 - 20) / (1.2 * 0.82)) ** 2 / 1152 - 3.6);
      const dancers = Math.max(6, Math.min(fit, Math.round(9 + 6 * D * L)));
      const r = 0.82 * (10 + (3.4 + dancers * 0.55) * 16) * 1.25;
      plan.mark([cx - Math.min(r, w / 2), y - 110, cx + Math.min(r, w / 2), y + 40], 'dance');
      plan.add(y, M.tarpaDance(cx, y, 0.82, rng, dancers, mrng, E));
    } else {
      const n = Math.max(3, Math.min(Math.floor((w - 60) / 36), Math.round(4 + 4 * D * L)));
      plan.mark([Math.max(x0, cx - n * 17 - 20), y - 70, Math.min(x1, cx + n * 17 + 20), y + 40], 'dance');
      plan.add(y, M.revellers(cx, y + 20, 0.8, n, rng, mrng, E));
      plan.add(y + 21, M.person(cx, y + 34, 0.86, 'tarpa', dir(), 0, { ...move('dance'), lift: 0, curl: 0.8 + rng() * 0.4 }));
    }
    if (some(0.6)) human(cx + w * 0.38, y + 58, 0.8, rng() < 0.6 ? 'drum' : 'flute', -1, 0, move('dance'), { slide: 30 });
    if (some(0.5)) grow(x0 + 30, BACK[0] - 20, 0.45);
    if (some(0.5)) put('peacock', x0 + 30, y + 54, 0.6, 1, X => M.peacock(X, y + 54, 0.6, 1), { slide: 30 });
  }

  /** A sacred grove (devrai): old trees hung with leaves, a shrine and Waghoba's post, lamps and worshippers. */
  plot_grove(plan, x0, x1, { rng, count, L, wrng, wild, wdir, move, gait, grow, human, beast, put, later }) {
    const w = x1 - x0, cx = (x0 + x1) / 2;
    plan.take('back', x0, x1);
    plan.take('mid', x0 + 20, x1 - 20);
    const tl = x0 + w * 0.2, tr = x1 - w * 0.2;
    plan.tree(tl, BACK[1] + 6, 0.92, M.leafyTree(tl, BACK[1] + 6, 0.92, rng), 140);
    if (w > 280) {
      grow(tr, BACK[0] + 6, 0.78, { classic: 0.5 });
      plan.add(BACK[1] + 7, M.toran(tl + 30, BACK[0] - 60, tr - 30, BACK[0] - 66, 18));
    }
    const sy = MID[0] + 16;
    const layout = w > 300 ? weighted(rng, { temple: 1, both: 1.2 }) : weighted(rng, { temple: 1, post: 1 });
    const templeX = layout === 'both' ? cx - 40 : cx, postX = layout === 'both' ? cx + 60 : cx;
    if (layout !== 'post') { plan.mark([templeX - 46, sy - 140, templeX + 46, sy], 'shrine'); plan.add(sy, M.shrine(templeX, sy, 0.85)); }
    if (layout !== 'temple') { plan.mark([postX - 24, sy - 130, postX + 24, sy + 2], 'shrine'); plan.add(sy + 2, M.waghobaPost(postX, sy + 2, 0.82)); }
    for (let i = 0; i < count(4); i++) plan.add(sy + 12, M.lamp(cx - 50 + i * 26, sy + 14, 0.9));
    for (let i = 0; i < count(2, L); i++) {
      const side = i % 2 ? -1 : 1;
      human(cx + side * (84 + i * 16), sy + 26, 0.8, i % 3 === 2 ? 'offer' : 'pray', -side, i, move('work'), { slide: 24 });
    }
    if (wild(0.45)) { const side = wdir(), p = gait({ stand: 1, stalk: 1, walk: 1 }); later(() => beast('tiger', side > 0 ? x0 + 46 : x1 - 46, sy - 4, 0.6, side, p, { slide: 40 })); }
    if (wild(0.4)) { const px = edgeX(x0, x1, wrng), d = wdir(); later(() => put('peacock', px, sy + 32, 0.6, d, X => M.peacock(X, sy + 32, 0.6, d), { slide: 30 })); }
  }

  plot_open(plan, x0, x1, { rng, count, people, move, grow, frng, human, gait, put, dir }) {
    for (let i = 0; i < count(10); i++) {
      const y = between(rng, MID[0], MID[1]);
      plan.add(y, M.grass(between(rng, x0 + 10, x1 - 10), y, between(rng, 0.4, 0.8)));
    }
    if (count(1)) {
      const lx = (x0 + x1) / 2;
      if (plan.take('back', lx - 30, lx + 30)) grow(lx, BACK[1], 0.55);
    }
    for (let i = 0; i < count(1.5); i++) {
      const y = between(rng, MID[0], MID[1]);
      grow(between(rng, x0 + 20, x1 - 20), y, between(rng, 0.3, 0.45), { classic: 0, form: choose(frng, ['herb', 'fan', 'herb']) });
    }
    if (people(0.5)) {
      // a herder playing the flute while the goats graze
      const y = between(rng, MID[0] + 10, MID[1]), d = dir(), hx = between(rng, x0 + 50, x1 - 50);
      if (human(hx, y, 0.8, 'flute', d, 0, move('chain'), { slide: 30, group: 'flock' })) {
        for (let k = 0; k < 3; k++) put('goat', hx + (k + 1) * 34 * d, y + (k % 2) * 6, 0.65, d, X => M.goat(X, y + (k % 2) * 6, 0.65, d, gait({ graze: 2, walk: 1, frisk: 0.4 })), { group: 'flock', slide: 10 });
      }
    }
  }

  /* ---------- whole view ---------- */

  /**
   * Hills, footpath and border for one region, in region-local coordinates. They sample continuous
   * functions of world position, including their own unevenness, so neighbouring regions meet exactly
   * however uneven the hand. `gaps` are x-ranges where the path is carried by a bridge instead.
   */
  frame(base, gaps = []) {
    const o = this.options;
    const style = M.getStyle();
    M.setStyle({ wobble: 0, jitter: 0, weight: o.weight });
    // The hand, as a function of where on the wall it is.
    const hand = (x, k) => (fbm(`${this.seed}:brush:${k}`, (base + x) / 60) - 0.5) * 7 * o.wobble + (noise(`${this.seed}:tremor:${k}`, (base + x) / 2.5) - 0.5) * 2.2 * o.jitter;
    const xs = Array.from({ length: REGION_WIDTH / 8 + 1 }, (_, i) => i * 8);
    const grid = Array.from({ length: REGION_WIDTH / 25 + 1 }, (_, i) => i * 25);
    let back = '';
    for (let layer = 0; layer < 2; layer++) {
      back += M.line(xs.map(x => [x, 300 + layer * 44 - fbm(`${this.seed}:hills:${layer}`, (base + x) / (260 + layer * 90)) * (80 - layer * 20) + hand(x, `h${layer}`)]), 1, 0.16 + layer * 0.06);
    }
    const open = x => !gaps.some(([a, b]) => x > a && x < b);
    for (const [k, dy, wgt, op] of [['p0', 0, 1.2, 0.55], ['p1', 15, 0.8, 0.4]]) {
      let run = [];
      for (const x of xs) {
        if (open(x)) run.push([x, pathY(this.seed, base + x) + dy + hand(x, k)]);
        else { if (run.length > 1) back += M.line(run, wgt, op); run = []; }
      }
      if (run.length > 1) back += M.line(run, wgt, op);
    }
    let border = '';
    if (o.border !== 'none') {
      for (const [j, y] of [[0, 12], [1, HEIGHT - 12]]) {
        for (const [k, dy] of [[`b${j}a`, -8], [`b${j}b`, 8]]) border += M.line(xs.map(x => [x, y + dy + hand(x, k) * 0.6]), 1, 0.6);
        for (const x of grid.slice(0, -1)) {
          const at = (px, py) => [px, py + hand(px, `b${j}z`) * 0.6];
          border += o.border === 'zigzag'
            ? M.shape([at(x, y + 6), at(x + 12.5, y - 6), at(x + 25, y + 6)], (x / 25) % 2 === 0, 0.9)
            : M.circle(...at(x + 12.5, y), 2.2);
        }
      }
    }
    M.setStyle(style);
    return { back, border };
  }

  /** The regions a camera can see, as [index, svg] pairs. Regions out of view are forgotten. */
  regions(camera) {
    const indices = visibleRegions(camera.center, camera.width);
    const keep = new Set(indices);
    for (const index of this.cache.keys()) if (!keep.has(index)) { this.cache.delete(index); this.plots.delete(index); this.layout.delete(index); }
    return indices.map(index => [index, this.region(index)]);
  }

  render(camera) {
    return this.regions(camera).map(([, svg]) => svg).join('');
  }
}

/**
 * The wall under the paint. Rice paste on a mud wall does not lie flat: the brush drags over grit, so a
 * stroke of even width arrives with a ragged edge (`rough`), and skips over pits, leaving small gaps
 * where the ground shows (`gaps`). The noise is fixed to the painting, not the screen, so the texture
 * travels with the wall as you walk. Returns '' when both are off.
 */
export function wallFilter(gaps, rough = 0.5) {
  const g = Math.max(0, Number(gaps) || 0), r = Math.max(0, Number(rough) || 0);
  if (!g && !r) return '';
  const holes = Number((0.76 - 0.18 * g).toFixed(3));
  return `<filter id="wall" x="-2%" y="-2%" width="104%" height="104%" color-interpolation-filters="sRGB">
    <feTurbulence type="fractalNoise" baseFrequency="0.75 0.55" numOctaves="2" seed="7" result="grit"/>
    <feDisplacementMap in="SourceGraphic" in2="grit" scale="${Number((4.4 * r).toFixed(2))}" xChannelSelector="R" yChannelSelector="G" result="ragged"/>
    <feTurbulence type="fractalNoise" baseFrequency="0.55 1.1" numOctaves="2" seed="3" result="pits"/>
    <feColorMatrix in="pits" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -14 ${Number((14 * holes).toFixed(3))}" result="mask"/>
    <feComposite in="ragged" in2="mask" operator="in"/>
  </filter>`;
}
export const textured = o => o.texture > 0 || o.rough > 0;

export function escapeXML(text) {
  return text.replace(/[<>&"']/g, ch => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;' })[ch]);
}

export function exportSVG(village, camera, palette) {
  const x = camera.center - camera.width / 2;
  const top = camera.top ?? 0;
  const o = village.options;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${x} ${top} ${camera.width} ${camera.height}" width="${Math.round(camera.width * 2)}" height="${Math.round(camera.height * 2)}" style="color:${palette.ink};background:${palette.ground}">
  <title>Anant Gaon — ${escapeXML(village.seed)}</title>
  <desc>Original procedural artwork inspired by Warli visual traditions. Seed: ${escapeXML(village.seed)}. Position: ${camera.center}.</desc>
  <rect x="${x}" y="${top}" width="${camera.width}" height="${camera.height}" fill="${palette.ground}"/>
  <defs>${wallFilter(o.texture, o.rough)}</defs>
  <g${textured(o) ? ' filter="url(#wall)"' : ''}>${village.render(camera)}</g>
  </svg>`;
}
