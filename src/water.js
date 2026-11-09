// Water: ponds and lakes with irregular, hand-drawn shores, a winding river that runs from the hills
// to the front of the scene, the bridge that carries the footpath over it, and what lives on the water.

import { circle, ellipse, group, line, shape } from './ink.js';
import { smooth } from './rig.js';

const between = (rng, a, b) => a + rng() * (b - a);

/** A closed, irregular shoreline around (cx, cy): an ellipse whose radius swells and dips with a few slow waves. */
export function shore(cx, cy, rx, ry, rng, n = 44) {
  const waves = [2, 3, 4, 5].map(k => [between(rng, 0.02, 0.1) / (k * 0.55), rng() * Math.PI * 2, k]);
  return Array.from({ length: n }, (_, i) => {
    const t = (i / n) * Math.PI * 2;
    const r = 1 + waves.reduce((sum, [a, phase, k]) => sum + a * Math.sin(k * t + phase), 0);
    return [cx + Math.cos(t) * rx * r, cy + Math.sin(t) * ry * r];
  });
}

/** Where a horizontal line at y crosses a closed outline: [left, right], or null if it misses. */
export function span(poly, y) {
  let lo = Infinity, hi = -Infinity;
  for (let i = 0; i < poly.length; i++) {
    const [x0, y0] = poly[i], [x1, y1] = poly[(i + 1) % poly.length];
    if ((y0 <= y && y1 > y) || (y1 <= y && y0 > y)) {
      const x = x0 + ((y - y0) / (y1 - y0)) * (x1 - x0);
      lo = Math.min(lo, x); hi = Math.max(hi, x);
    }
  }
  return lo < hi ? [lo, hi] : null;
}

export const inside = (poly, x, y) => { const s = span(poly, y); return !!s && x > s[0] && x < s[1]; };

/** Ripples: gently bent strokes across the water, inset from the shore. */
function ripples(poly, top, bottom, rows, rng) {
  let a = '';
  for (let i = 0; i < rows; i++) {
    const y = top + ((i + 0.5) * (bottom - top)) / rows;
    const s = span(poly, y);
    if (!s) continue;
    const [l, r] = [s[0] + (s[1] - s[0]) * 0.08, s[1] - (s[1] - s[0]) * 0.08];
    if (r - l < 12) continue;
    // Some ripples break into two, as a painter lifts the brush.
    const cut = rng() < 0.35 ? l + (r - l) * between(rng, 0.35, 0.65) : null;
    const seg = (a0, b0) => line([[a0, y], [a0 + (b0 - a0) * 0.33, y + 2], [a0 + (b0 - a0) * 0.66, y - 1.5], [b0, y]], 1, 0.55);
    a += cut ? seg(l, cut - 6) + seg(cut + 6, r) : seg(l, r);
  }
  return a;
}

/** A pond or lake with an uneven shore. Returns its outline so the planner can keep people off the water. */
export function pond(cx, cy, rx, ry, rng) {
  const poly = shore(cx, cy, rx, ry, rng);
  const ys = poly.map(p => p[1]);
  const svg = shape(poly, false, 1.7) + ripples(poly, Math.min(...ys), Math.max(...ys), Math.round(ry / 6.5), rng);
  return { svg, poly };
}

/** A lotus: a fan of pointed petals on a short stem, with a round, notched pad beside it. */
export function lotus(x, y, scale = 1, rng = Math.random) {
  let a = '';
  for (let i = 0; i < 5; i++) {
    const t = -Math.PI / 2 + (i - 2) * 0.42;
    a += shape([[0, -4], [Math.cos(t - 0.2) * 5, -4 + Math.sin(t - 0.2) * 5], [Math.cos(t) * 11, -4 + Math.sin(t) * 11], [Math.cos(t + 0.2) * 5, -4 + Math.sin(t + 0.2) * 5]], i % 2 === 0, 0.8);
  }
  a += line([[0, -4], [0, 2]], 1);
  const side = rng() < 0.5 ? -1 : 1;
  a += ellipse(side * 13, 3, 8, 3, false, 0.8) + line([[side * 13, 3], [side * 6, 2.2]], 0.8);
  return group(x, y, scale, a);
}

/** A duck sitting on the water. */
export function duck(x, y, scale = 1, dir = 1) {
  let a = shape([[-10, 0], [8, 0], [11, -4], [6, -7], [-6, -7], [-12, -4]], true, 0.6);
  a += line([[7, -6], [9, -13]], 1.6) + circle(10, -14, 2.6) + shape([[12, -15], [17, -13.5], [12, -12.5]]);
  a += line([[-9, -5], [-14, -9]], 1) + line([[-16, 2], [16, 2]], 0.7, 0.5);
  return group(x, y, scale, a, dir);
}

/**
 * A river coming down from the hills: narrow where it leaves them, widening as it nears, winding as it
 * goes. `centre(y)` and `width(y)` describe it, so the planner can test where the water is.
 */
export function river(cx, top, bottom, rng) {
  const sway = between(rng, 30, 70), phase = rng() * Math.PI * 2, period = between(rng, 70, 110);
  const centre = y => cx + sway * Math.sin((y - top) / period + phase) * (0.25 + (0.75 * (y - top)) / (bottom - top));
  // A thread where it leaves the hills, opening out over the first stretch, then widening as it nears.
  const width = y => { const t = Math.min(1, (y - top) / 70); return 3 + 22 * t * t * (3 - 2 * t) + (y - top) * 0.17; };
  const ys = Array.from({ length: Math.ceil((bottom - top) / 6) + 1 }, (_, i) => Math.min(bottom, top + i * 6));
  const bank = s => smooth(ys.map(y => [centre(y) + (s * width(y)) / 2, y]), 2);
  let svg = line(bank(-1), 1.7) + line(bank(1), 1.7);
  // Flow: broken strokes following the current.
  svg += line([[centre(top) - width(top) / 2, top], [centre(top) + width(top) / 2, top]], 1.2);
  for (const k of [-0.3, -0.1, 0.1, 0.3]) {
    for (let y = top + 40 + rng() * 20; y < bottom - 10; y += between(rng, 18, 32)) {
      const len = between(rng, 12, 26);
      const pts = [0, 0.5, 1].map(t => { const yy = Math.min(bottom, y + t * len); return [centre(yy) + k * width(yy), yy]; });
      svg += line(pts, 0.9, 0.6);
    }
  }
  return { svg, centre, width, top, bottom };
}

/** A footbridge of planks over an arch, with a railing: `length` from end to end, its deck at y = 0. */
export function bridge(x, y, length, scale = 1) {
  const h = Math.min(26, length * 0.16), half = length / 2;
  const arch = t => [-half + t * length, -Math.sin(t * Math.PI) * h];
  const deck = Array.from({ length: 13 }, (_, i) => arch(i / 12));
  let a = line(deck, 2) + line(deck.map(([px, py]) => [px, py + 5]), 1.4);
  for (let i = 1; i < 12; i++) a += line([deck[i], [deck[i][0], deck[i][1] + 5]], 0.8, 0.8);
  const rail = deck.map(([px, py]) => [px, py - 13]);
  a += line(rail.slice(1, -1), 1.3);
  for (let i = 1; i < 12; i += 2) a += line([deck[i], rail[i]], 1);
  a += line([[-half - 6, 4], [-half, 0]], 1.6) + line([[half, 0], [half + 6, 4]], 1.6);
  return group(x, y, scale, a);
}
