// The upper band. Warli walls rarely leave the top bare: big birds fly across it with wings spread,
// flocks pass in a V, the monsoon arrives as clouds trailing broken lines of rain, and kites wheel.

import { circle, ellipse, group, line, shape, turned } from './ink.js';

const between = (rng, a, b) => a + rng() * (b - a);

/** A bird in flight seen from the side and above: a teardrop body, a fanned tail, and two wings
 *  lifted (flap near 1) or swept down (near 0), each edged with feather strokes. */
export function flyingBird(x, y, scale = 1, dir = 1, flap = 0.7, kind = 0) {
  let a = ellipse(0, 0, 13, 4.6, true, 0.6, -6);
  a += circle(14, -2.5, 3.4) + shape([[17, -3.5], [23, -2], [17, -1]]);
  if (kind % 2) a += line([[13, -5], [10, -10]], 0.9); // a crest
  for (const t of [-0.45, -0.15, 0.15, 0.45]) a += line([[-12, 0], [-12 - Math.cos(t) * 13, Math.sin(t) * 9]], 1.1);
  // The far wing first, as an outline; the near wing over it, filled, its feathers marked along the trailing edge.
  for (const near of [false, true]) {
    const up = (near ? 1 : 0.8) * (flap * 2 - 0.6), reach = near ? 30 : 24;
    const tip = [-4 - reach * 0.35, -reach * up], root = near ? [[8, -2], [-9, -1]] : [[4, -3], [-6, -2]];
    const wing = [root[0], [root[0][0] - 4, tip[1] * 0.55 - 2], tip, [tip[0] - 7, tip[1] * 0.8 + 3], [root[1][0] - 4, tip[1] * 0.35], root[1]];
    a += shape(wing, near, near ? 0.7 : 1.1);
    if (near) for (let i = 1; i < 5; i++) { const t = i / 5; const [ex, ey] = [tip[0] - 7 + (root[1][0] - 4 - (tip[0] - 7)) * t, tip[1] * 0.8 + 3 + (tip[1] * 0.35 - (tip[1] * 0.8 + 3)) * t]; a += line([[ex, ey], [ex - 4, ey + 3 * Math.sign(up || 1)]], 0.9); }
  }
  return group(x, y, scale, a, dir);
}

/** Small birds in a V, the leader in front. */
export function vFlock(x, y, n, scale = 1, dir = 1) {
  let a = '';
  for (let i = 0; i < n; i++) {
    const row = Math.ceil(i / 2), side = i % 2 ? 1 : -1;
    const bx = -row * 16, by = i ? side * row * 9 : 0;
    a += line([[bx - 7, by + 1], [bx - 3, by - 3], [bx, by], [bx + 4, by - 4], [bx + 8, by - 1]], 1.2);
  }
  return group(x, y, scale, a, dir);
}

/** A kite (the bird) wheeling: wings held flat in a long shallow M, forked tail. */
export function kite(x, y, scale = 1, turn = 0) {
  let a = line([[-30, 2], [-18, -4], [-6, 0], [0, -2], [6, 0], [18, -4], [30, 2]], 1.8);
  a += ellipse(0, 1, 3, 7, true, 0.5) + line([[0, 8], [-3, 14]], 1) + line([[0, 8], [3, 14]], 1);
  for (const s of [-1, 1]) for (let i = 0; i < 3; i++) a += line([[s * (24 + i * 2), 0], [s * (26 + i * 2), 4]], 0.7);
  return turned(x, y, scale, turn, a);
}

/** A cloud: a row of rounded swells on top, a flatter underside with small curls, dotted within.
 *  With `rain`, broken lines fall from it. Returns the cloud's width so rain can be placed under it. */
export function cloud(x, y, width, rng, rain = 0) {
  const bumps = Math.max(3, Math.round(width / 22));
  const r = width / bumps / 2;
  const top = [];
  for (let i = 0; i < bumps; i++) {
    const cx = -width / 2 + r + i * r * 2, h = r * between(rng, 0.85, 1.35) * (1 - Math.abs(i - (bumps - 1) / 2) / bumps * 0.6);
    for (let k = 0; k <= 6; k++) { const t = Math.PI + (k / 6) * Math.PI; top.push([cx + Math.cos(t) * r, Math.sin(t) * h]); }
  }
  const under = [];
  for (let i = bumps * 2 - 1; i >= 0; i--) under.push([-width / 2 + (i + 0.5) * r, 5 + (i % 2) * 3]);
  let a = shape([...top, ...under], false, 1.5);
  for (let i = 0; i < bumps * 2; i++) a += circle(-width / 2 + r * 0.6 + rng() * (width - r * 1.2), -r * 0.2 + rng() * 4, 1.1);
  for (let i = 0; i < rain; i++) {
    const rx = -width / 2 + 6 + rng() * (width - 12), len = between(rng, 40, 120);
    for (let d = 12 + rng() * 6; d < len; d += 9) a += line([[rx - d * 0.08, d], [rx - (d + 5) * 0.08, d + 5]], 0.9, 0.7);
  }
  return group(x, y, 1, a);
}

/** A flag on a pole, for a shrine on a hilltop. */
export function flag(x, y, scale = 1) {
  return group(x, y, scale, line([[0, 0], [0, -26]], 1.3) + shape([[0, -26], [13, -22], [0, -18]]) + shape([[-5, 0], [5, 0], [3, -5], [-3, -5]], false, 1));
}
