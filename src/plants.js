// Plants grown from a species description. A species is a few dozen numbers: its form, how it
// branches, how its branches droop or curl, and what its leaves look like. Every stem is a curve,
// and the whole plant is drawn upright and then bent along a leaning, swaying trunk (rig.js), so
// the same species grows a little differently each time, and the space of species is wide enough
// that a long walk keeps finding new ones.

import { bend, circle, ellipse, group, line, shape, tube } from './ink.js';
import { stemWarp } from './rig.js';

const between = (rng, a, b) => a + rng() * (b - a);
const pick = (rng, list) => list[Math.floor(rng() * list.length)];
function weighted(rng, table) {
  const entries = Object.entries(table);
  let r = rng() * entries.reduce((s, [, w]) => s + w, 0);
  for (const [k, w] of entries) if ((r -= w) <= 0) return k;
  return entries.at(-1)[0];
}

const LEAVES = ['blade', 'blade', 'outline', 'needle', 'pinnate', 'pinnate', 'dot', 'ring', 'tri', 'drop', 'flower', 'tuft'];
const PROFILES = {
  cone: t => 1 - t * 0.75,
  oval: t => 0.35 + Math.sin(t * Math.PI) * 0.75,
  fan: t => 0.35 + t * 0.75,
  even: () => 0.85,
};

/** A new species. Each field is explained where it is used in `plant`. */
export function species(rng, form) {
  form ??= weighted(rng, { tree: 3, herb: 2.5, fan: 1.6, palm: 0.6, banana: 0.45, cypress: 0.6 });
  const tall = { tree: [135, 190], herb: [70, 135], fan: [55, 100], palm: [150, 190], banana: [85, 115], cypress: [120, 175] }[form];
  const sp = {
    form,
    height: between(rng, ...tall),
    lean: between(rng, -0.2, 0.2),
    sway: between(rng, -0.0035, 0.0035), // curvature along the trunk
    wave: rng() < 0.3 ? between(rng, 0.05, 0.14) : 0, // an S-bend
    trunk: form === 'tree' ? weighted(rng, { outline: 2, solid: 1, hatched: 1, double: 0.6 }) : 'line',
    girth: between(rng, 0.045, 0.085),
    arrange: weighted(rng, { opposite: 2, alternate: 1.5, whorl: form === 'herb' ? 0.6 : 0.2 }),
    nodes: Math.round(form === 'herb' ? between(rng, 6, 12) : between(rng, 4, 8)),
    start: form === 'tree' ? between(rng, 0.32, 0.6) : between(rng, 0.06, 0.25),
    profile: pick(rng, Object.keys(PROFILES)),
    reach: form === 'herb' ? between(rng, 0.12, 0.32) : between(rng, 0.25, 0.48),
    angle: between(rng, 0.45, 1.25), // from the stem
    droop: between(rng, -0.6, 1.5), // positive bends the tips down
    depth: form === 'tree' ? Math.round(between(rng, 0, 2)) : rng() < 0.3 ? 1 : 0,
    leaf: pick(rng, LEAVES),
    leafSize: between(rng, 3.4, 7.5),
    leafGap: between(rng, 5, 10),
    leafAngle: between(rng, 0.35, 1.1),
    paired: rng() < 0.7,
    tip: weighted(rng, { none: 3, flower: 1, fruit: 1, bud: 0.8, cluster: 0.7 }),
    fruit: rng() < 0.25,
    stems: Math.round(between(rng, 4, 9)), // for fans
    spreadAngle: between(rng, 0.5, 1.3),
  };
  // Solid leaves need air between them, or a crown fills in to a blob.
  if (['blade', 'drop', 'tuft', 'tri', 'flower'].includes(sp.leaf)) sp.leafGap = Math.max(sp.leafGap, sp.leafSize * 1.25);
  if (sp.depth > 1) sp.nodes = Math.min(sp.nodes, 5);
  return sp;
}

/** One leaf (or berry, or flower) at (x, y) pointing along angle a. */
function leafMark(kind, x, y, a, size) {
  const c = Math.cos(a), s = Math.sin(a);
  const deg = (a * 180) / Math.PI;
  switch (kind) {
    case 'blade': return ellipse(x + c * size, y + s * size, size, size * 0.36, true, 0.5, deg);
    case 'outline': return ellipse(x + c * size, y + s * size, size, size * 0.42, false, 0.9, deg) + line([[x, y], [x + c * size * 1.8, y + s * size * 1.8]], 0.6);
    case 'needle': return line([[x, y], [x + c * size * 1.7, y + s * size * 1.7]], 1);
    case 'pinnate': return line([[x, y], [x + c * size * 1.3, y + s * size * 1.3]], 0.9);
    case 'dot': return circle(x + c * size * 0.8, y + s * size * 0.8, size * 0.32);
    case 'ring': return circle(x + c * size * 0.9, y + s * size * 0.9, size * 0.45, false, 0.9);
    case 'tri': return shape([[x - s * size * 0.35, y + c * size * 0.35], [x + s * size * 0.35, y - c * size * 0.35], [x + c * size * 1.5, y + s * size * 1.5]]);
    case 'drop': {
      const tip = [x + c * size * 1.8, y + s * size * 1.8], w = size * 0.5;
      return shape([[x, y], [x + c * size + -s * w, y + s * size + c * w], tip, [x + c * size + s * w, y + s * size - c * w]]);
    }
    case 'flower': {
      const fx = x + c * size, fy = y + s * size;
      let f = line([[x, y], [fx, fy]], 0.7) + circle(fx, fy, size * 0.22);
      for (let i = 0; i < 6; i++) f += circle(fx + Math.cos(i * 1.047) * size * 0.45, fy + Math.sin(i * 1.047) * size * 0.45, size * 0.18);
      return f;
    }
    case 'tuft': {
      let f = '';
      for (const d of [-0.45, 0, 0.45]) f += line([[x, y], [x + Math.cos(a + d) * size * 1.4, y + Math.sin(a + d) * size * 1.4]], 0.8);
      return f;
    }
    default: return '';
  }
}

/** Points along a branch that starts at (x, y) heading `angle`, drooping towards the ground as it goes. */
function curve(x, y, angle, len, droop, n = 8) {
  const side = Math.cos(angle) >= 0 ? 1 : -1;
  const pts = [[x, y]];
  for (let i = 1; i <= n; i++) {
    const t = (i - 0.5) / n, a = angle + side * droop * t * t * 1.4;
    x += (Math.cos(a) * len) / n;
    y += (Math.sin(a) * len) / n;
    pts.push([x, y]);
  }
  return pts;
}

/** Leaves along a polyline, every `leafGap` units, on one or both sides. */
function foliage(pts, sp, size, rng, budget) {
  let a = '', next = sp.leafGap * 0.6, walked = 0, side = 1;
  for (let i = 1; i < pts.length; i++) {
    const [x0, y0] = pts[i - 1], [x1, y1] = pts[i];
    const seg = Math.hypot(x1 - x0, y1 - y0), heading = Math.atan2(y1 - y0, x1 - x0);
    for (; next <= walked + seg; next += sp.leafGap) {
      if (budget.n-- <= 0) return a;
      const t = (next - walked) / seg, x = x0 + (x1 - x0) * t, y = y0 + (y1 - y0) * t;
      const k = size * between(rng, 0.85, 1.15);
      if (sp.paired) a += leafMark(sp.leaf, x, y, heading - sp.leafAngle, k) + leafMark(sp.leaf, x, y, heading + sp.leafAngle, k);
      else { a += leafMark(sp.leaf, x, y, heading + side * sp.leafAngle, k); side = -side; }
    }
    walked += seg;
  }
  return a;
}

function tipMark(kind, x, y, a, size) {
  if (kind === 'flower') return leafMark('flower', x, y, a, size * 1.2);
  if (kind === 'fruit') return circle(x + Math.cos(a) * size * 0.6, y + Math.sin(a) * size * 0.6, size * 0.55, false, 1.1) + circle(x + Math.cos(a) * size * 0.6, y + Math.sin(a) * size * 0.6, size * 0.18);
  if (kind === 'bud') return leafMark('drop', x, y, a, size * 0.9);
  if (kind === 'cluster') { let c = ''; for (let i = 0; i < 4; i++) c += circle(x + Math.cos(a + i * 1.6) * size * 0.5, y + Math.sin(a + i * 1.6) * size * 0.5 + size * 0.3, size * 0.25); return c; }
  return '';
}

/** A branch with leaves, a tip and, at depth > 0, its own side branches. */
function branch(x, y, angle, len, sp, rng, depth, budget) {
  const pts = curve(x, y, angle, len, sp.droop * between(rng, 0.8, 1.2));
  let a = line(pts, Math.max(0.8, Math.min(2, len / 26)));
  const size = sp.leafSize * Math.min(1, 0.55 + len / 60);
  if (sp.leaf === 'pinnate') a += foliage(pts, { ...sp, leafGap: Math.max(3.4, sp.leafGap * 0.5), paired: true }, Math.min(size, 5), rng, budget);
  else a += foliage(pts.slice(Math.floor(pts.length * 0.3)), sp, size, rng, budget);
  const [ex, ey] = pts.at(-1), [px, py] = pts.at(-2);
  a += tipMark(sp.tip, ex, ey, Math.atan2(ey - py, ex - px), sp.leafSize);
  if (depth > 0) {
    for (const t of [0.4, 0.7]) {
      const [bx, by] = pts[Math.round(t * (pts.length - 1))];
      const [qx, qy] = pts[Math.round(t * (pts.length - 1)) + 1];
      const h = Math.atan2(qy - by, qx - bx);
      for (const s of [-1, 1]) if (rng() < 0.75) a += branch(bx, by, h + s * between(rng, 0.45, 0.8), len * between(rng, 0.38, 0.55), sp, rng, depth - 1, budget);
    }
  }
  return a;
}

const roots = (w = 1) => { let a = ''; for (let i = -13; i <= 13; i += 6.5) a += line([[i * 0.25 * w, -3], [i * 1.3 * w, 4]], 1.2); return a; };

/** Draw a plant of species `sp`, standing at (x, y). */
export function plant(x, y, scale, rng, sp = species(rng)) {
  const H = sp.height * between(rng, 0.88, 1.12);
  const lean = sp.lean + between(rng, -0.06, 0.06), sway = sp.sway * between(rng, 0.7, 1.3), wave = sp.wave, phase = rng() * 6;
  const warp = stemWarp(0, 0, H, h => lean + sway * h + wave * Math.sin(h / 28 + phase));
  const budget = { n: sp.form === 'tree' ? 110 : 150 };
  const art = bend(warp, () => {
    let a = '';
    const w0 = H * sp.girth;
    const half = h => (sp.form === 'tree' || sp.form === 'cypress' ? (h < H * 0.25 ? w0 - (w0 * 0.45 * h) / (H * 0.25) : 1.4 + (w0 * 0.55 - 1.4) * Math.max(0, 1 - (h - H * 0.25) / (H * 0.65))) * 0.8 : 1);
    if (sp.form === 'tree' || sp.form === 'cypress') {
      const top = H * (sp.form === 'cypress' ? 0.98 : 0.86);
      const outline = [[-w0, 0], [-w0 * 0.55, -H * 0.25], [-1.4, -top], [1.4, -top], [w0 * 0.55, -H * 0.25], [w0, 0]];
      a += shape(outline, sp.trunk === 'solid', 1.8);
      if (sp.trunk === 'hatched') for (let h = 8; h < top - 10; h += 9) { const w = w0 * (1 - h / top) * 0.9 + 1; a += line([[-w, -h], [w, -h - 5]], 0.8, 0.8); }
      if (sp.trunk === 'double') a += line([[0, -4], [0, -top * 0.85]], 0.9, 0.8);
      a += roots(w0 / 9);
    } else if (sp.form !== 'fan') {
      a += line([[0, 0], [0, -H]], sp.form === 'palm' ? 2.4 : sp.form === 'banana' ? 3 : 1.7);
    }

    if (sp.form === 'tree' || sp.form === 'herb' || sp.form === 'cypress') {
      const profile = sp.form === 'cypress' ? PROFILES.cone : PROFILES[sp.profile];
      const reach = sp.form === 'cypress' ? sp.reach * 0.55 : sp.reach;
      let side = rng() < 0.5 ? 1 : -1;
      for (let i = 0; i < sp.nodes; i++) {
        const t = i / Math.max(1, sp.nodes - 1);
        const h = H * (sp.start + (0.94 - sp.start) * t);
        const len = H * reach * profile(t) * between(rng, 0.85, 1.15);
        const sides = sp.arrange === 'alternate' ? [side] : sp.arrange === 'whorl' ? [-1, 1, 0] : [-1, 1];
        side = -side;
        for (const s of sides) {
          const ang = -Math.PI / 2 + (s || (rng() - 0.5) * 0.4) * sp.angle * between(rng, 0.88, 1.12) * (s ? 1 : 0.3);
          a += branch(s * half(h), -h, ang, s ? len : len * 0.6, sp, rng, sp.depth, budget);
        }
      }
      a += branch(0, -H * 0.94, -Math.PI / 2, H * reach * 0.45, { ...sp, droop: sp.droop * 0.2 }, rng, 0, budget);
    }

    if (sp.form === 'fan') {
      for (let i = 0; i < sp.stems; i++) {
        const t = sp.stems === 1 ? 0.5 : i / (sp.stems - 1);
        const ang = -Math.PI / 2 + (t - 0.5) * 2 * sp.spreadAngle + between(rng, -0.08, 0.08);
        const len = H * (1 - Math.abs(t - 0.5) * 0.7) * between(rng, 0.85, 1.1);
        a += branch(0, 0, ang, len, { ...sp, droop: sp.droop * 0.8 }, rng, 0, budget);
      }
    }

    if (sp.form === 'palm') {
      for (let j = 1; j < 10; j++) a += line([[-2.4, -j * H / 10], [2.4, -j * H / 10 - 4]], 1);
      const fronds = 6 + Math.floor(rng() * 4);
      for (let i = 0; i < fronds; i++) {
        const ang = -Math.PI + (i + 0.5) * (Math.PI / fronds) + between(rng, -0.1, 0.1);
        a += branch(0, -H, ang, between(rng, 55, 80), { ...sp, leaf: 'pinnate', leafGap: 6, leafSize: 6.5, droop: 1.1 + rng() * 0.6, tip: 'none' }, rng, 0, budget);
      }
      for (let i = 0; i < 3; i++) a += circle(-6 + i * 6, -H + 8, 3.4, false, 1.1);
    }

    if (sp.form === 'banana') {
      const leaves = 5 + Math.floor(rng() * 3);
      for (let i = 0; i < leaves; i++) {
        const s = i % 2 ? 1 : -1;
        const ang = -Math.PI / 2 + s * between(rng, 0.25, 1.1);
        const pts = curve(0, -H * between(rng, 0.7, 1), ang, between(rng, 45, 70), 0.9 + rng() * 0.6, 7);
        a += tube(pts, 4, 11, { w: 1.1 }) + line(pts, 0.8);
        for (let k = 2; k < pts.length - 1; k += 1) {
          const [qx, qy] = pts[k], h = Math.atan2(pts[k + 1][1] - qy, pts[k + 1][0] - qx);
          a += line([[qx, qy], [qx + Math.cos(h - 0.9) * 4.5, qy + Math.sin(h - 0.9) * 4.5]], 0.6) + line([[qx, qy], [qx + Math.cos(h + 0.9) * 4.5, qy + Math.sin(h + 0.9) * 4.5]], 0.6);
        }
      }
      if (rng() < 0.6) { a += line([[0, -H * 0.8], [6, -H * 0.55]], 1); for (let k = 0; k < 4; k++) a += ellipse(6 + k * 1.5, -H * 0.55 + k * 5, 2.4, 4.2, true, 0.5, 20); }
    }

    if (sp.fruit && sp.form !== 'banana') {
      for (let i = 0; i < 8; i++) a += circle(between(rng, -H * 0.3, H * 0.3), -H * between(rng, 0.5, 0.95), between(rng, 1.4, 2.4));
    }
    return a;
  });
  return group(x, y, scale, art);
}
