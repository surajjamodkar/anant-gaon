// Rigs: warps that let a motif drawn in a straight, resting frame follow a curve.
// A warp is a function (x, y) => [x, y]. The ink primitives pass every point through the active warp
// (see `bend` in ink.js), so a tiger drawn standing can be arched into a leap, a trunk can lean,
// and a dancer's torso can sway, without redrawing the motif.

/** Rotate (x, y) about (cx, cy). Positive angles turn clockwise on screen, since y points down. */
export function rotate(x, y, cx, cy, a) {
  const c = Math.cos(a), s = Math.sin(a), dx = x - cx, dy = y - cy;
  return [cx + dx * c - dy * s, cy + dx * s + dy * c];
}

/** Apply warps left to right. Falsy entries are skipped. */
export function compose(...warps) {
  const ws = warps.filter(Boolean);
  if (ws.length < 2) return ws[0] ?? null;
  return (x, y) => ws.reduce((p, w) => w(p[0], p[1]), [x, y]);
}

export const shift = (dx, dy) => (x, y) => [x + dx, y + dy];

/** Catmull-Rom spline through `points`, with `n` samples per span. Passes through every point. */
export function smooth(points, n = 6) {
  if (points.length < 3) return points;
  const out = [];
  const p = i => points[Math.max(0, Math.min(points.length - 1, i))];
  for (let i = 0; i < points.length - 1; i++) {
    const [p0, p1, p2, p3] = [p(i - 1), p(i), p(i + 1), p(i + 2)];
    for (let j = 0; j < n; j++) {
      const t = j / n, t2 = t * t, t3 = t2 * t;
      out.push([0, 1].map(k => 0.5 * (2 * p1[k] + (-p0[k] + p2[k]) * t + (2 * p0[k] - 5 * p1[k] + 4 * p2[k] - p3[k]) * t2 + (-p0[k] + 3 * p1[k] - 3 * p2[k] + p3[k]) * t3)));
    }
  }
  out.push(points.at(-1));
  return out;
}

/** A curve measured by arc length. Past either end it carries on in a straight line. */
export class Spine {
  constructor(points) {
    this.p = points;
    this.s = [0];
    for (let i = 1; i < points.length; i++) this.s.push(this.s[i - 1] + Math.hypot(points[i][0] - points[i - 1][0], points[i][1] - points[i - 1][1]));
    this.length = this.s.at(-1);
  }
  /** Point and unit tangent at arc length t: [x, y, tx, ty]. */
  at(t) {
    const { p, s } = this;
    let i = 0, j = p.length - 1;
    if (t <= 0) j = 1;
    else if (t >= this.length) i = j - 1;
    else {
      while (j - i > 1) { const m = (i + j) >> 1; if (s[m] <= t) i = m; else j = m; }
    }
    const len = s[j] - s[i] || 1;
    const tx = (p[j][0] - p[i][0]) / len, ty = (p[j][1] - p[i][1]) / len;
    const d = t - s[i];
    return [p[i][0] + tx * d, p[i][1] + ty * d, tx, ty];
  }
  /** The point `u` along the curve and `v` to its right (for a curve heading +x, right is +y). */
  place(u, v) {
    const [x, y, tx, ty] = this.at(u);
    return [x - ty * v, y + tx * v];
  }
}

/** A spine through the origin whose heading at distance u is angle(u) (radians, 0 = +x). Built by
 *  integrating the heading from u = 0 towards both ends, so the origin stays put however it bends. */
export function angleSpine(from, to, angle, step = 3) {
  const walk = (end, sign) => {
    const pts = [[0, 0]];
    let x = 0, y = 0;
    for (let u = 0; Math.abs(u) < Math.abs(end); u += sign * step) {
      const a = angle(u + (sign * step) / 2);
      x += Math.cos(a) * sign * step;
      y += Math.sin(a) * sign * step;
      pts.push([x, y]);
    }
    return pts;
  };
  const back = walk(from, -1).reverse(), ahead = walk(to, 1);
  const spine = new Spine([...back, ...ahead.slice(1)]);
  const origin = spine.s[back.length - 1];
  return (u, v) => spine.place(u + origin, v);
}

/** Bend a motif that lies along +x: the line y = py through (px, py) becomes a curve with heading angle(u). */
export function axisWarp(px, py, from, to, angle) {
  const map = angleSpine(from - px, to - px, angle);
  return (x, y) => { const [X, Y] = map(x - px, y - py); return [px + X, py + Y]; };
}

/** Bend a motif that stands up from (bx, by): heading `angle(h)` is the lean from vertical at height h
 *  (positive leans towards +x). Used for trunks, stems and fronds. */
export function stemWarp(bx, by, height, angle) {
  const map = angleSpine(-20, height + 40, h => -Math.PI / 2 + angle(h));
  return (x, y) => { const [X, Y] = map(by - y, x - bx); return [bx + X, by + Y]; };
}

/** Follow an arbitrary path given as control points: local x runs along it, local y is the offset to its right. */
export function pathWarp(points, samples = 8) {
  const spine = new Spine(smooth(points, samples));
  return Object.assign((x, y) => spine.place(x, y), { length: spine.length, spine });
}

/* ---------- quadrupeds ---------- */

/** Resting pose: every number is a deviation from the animal as drawn. */
export const STILL = { rot: 0, arch: 0, dip: 0, front: 0, hind: 0, gait: 0, phase: 0, crouch: 0, tail: 0, lift: 0 };

/** Named gaits. The planner adds noise to these, so no two animals share a pose exactly. */
export const GAITS = {
  stand: {},
  walk: { gait: 0.22 },
  graze: { dip: 0.55, gait: 0.08, tail: -0.2 },
  trot: { gait: 0.38, tail: 0.3, rot: 0.03 },
  gallop: { front: 0.75, hind: -0.75, arch: -0.002, rot: 0.04, tail: 0.5, lift: 5 },
  leap: { front: 0.95, hind: -1.05, rot: 0.18, arch: 0.004, tail: 0.6, lift: 22 },
  pounce: { front: 1.15, hind: -0.6, rot: -0.12, arch: -0.004, tail: 0.4, lift: 10 },
  stalk: { crouch: 0.4, dip: 0.12, rot: -0.03, gait: 0.15, tail: -0.25 },
  buck: { front: 0.25, hind: -1.0, rot: -0.24, arch: 0.004, tail: 0.8, lift: 6 },
  rear: { front: 1.6, hind: 0.15, rot: 0.55, arch: -0.002, tail: 0.3 },
  stretch: { front: 0.6, hind: -0.35, crouch: 0.15, rot: -0.1, arch: -0.006, tail: 0.5 },
  frisk: { front: 0.4, hind: -0.5, rot: 0.12, arch: 0.007, tail: 0.9, lift: 8 },
};

/**
 * Build the warp for a quadruped. `rig` describes the animal as drawn:
 *   axis  – y of the spine; mid – x of the body's middle (where it bends from)
 *   legTop – y where legs leave the body; legs – x of each leg root, hind to front
 *   neck – x where the head and neck begin; tail – x where the tail leaves the body
 *   from / to – x extent of the drawing
 * `pose` is a GAITS name, an object of STILL's fields, or both mixed: { ...GAITS.leap, lift: 30 }.
 */
export function quadWarp(rig, pose) {
  const p = { ...STILL, ...(typeof pose === 'string' ? GAITS[pose] : pose) };
  const { axis, mid, legTop, legs, neck, tail, from, to } = rig;
  const spine = axisWarp(mid, axis, from - 10, to + 10, u => -p.rot + p.arch * u);
  const local = (x, y) => {
    if (x < tail) [x, y] = rotate(x, y, tail, axis, p.tail);
    else if (x > neck) [x, y] = rotate(x, y, neck, axis, p.dip);
    if (y > legTop) {
      let best = -1, gap = 7;
      for (let i = 0; i < legs.length; i++) { const g = Math.abs(x - legs[i]); if (g < gap) { gap = g; best = i; } }
      if (best >= 0) {
        const lx = legs[best];
        const front = lx > mid;
        const swing = (front ? p.front : p.hind) + p.gait * Math.sin(p.phase + best * 1.9 + (front ? Math.PI : 0));
        y = legTop + (y - legTop) * (1 - p.crouch);
        [x, y] = rotate(x, y, lx, legTop, -swing);
      }
    }
    return [x, y];
  };
  const warp = (x, y) => { const q = local(x, y); return spine(q[0], q[1]); };
  // Settle the feet on the ground, or hold them `lift` above it.
  const feet = legs.map(lx => warp(lx, 0)[1]);
  const drop = -Math.max(...feet) - p.lift;
  return compose(warp, shift(0, drop));
}
