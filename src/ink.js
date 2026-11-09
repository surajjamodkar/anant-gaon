// Ink: the drawing primitives every motif is made of.
// Each stroke is resampled, passed through the active warp (rig.js) so it can follow a curve,
// then given a hand's drift: a slow wander across long strokes and a small tremor on every point,
// so a ridge drawn as one straight segment arrives as a brush line.

const S = { wobble: 0, jitter: 0, weight: 1, rng: () => 0.5, warp: null };
/** wobble: how far a long stroke wanders off true (0–1), so straight lines come out uneven.
 *  jitter: a small, quick tremor on every point (0–1). weight: stroke multiplier.
 *  rng: stream that only feeds the hand. */
export function setStyle(next) { Object.assign(S, next); }
export function getStyle() { return { ...S }; }

/** Draw with every point passed through `warp` (see rig.js). Call nested motifs outside it:
 *  they are drawn in their own frame, and the warp would bend them in the wrong one. */
export function bend(warp, draw) {
  const previous = S.warp;
  S.warp = warp;
  try { return draw(); } finally { S.warp = previous; }
}
/** Where a point of the current frame lands under the active warp. */
export const warped = (x, y) => (S.warp ? S.warp(x, y) : [x, y]);

const f = n => Number(n.toFixed(2));
const sw = w => f(w * S.weight);
const op = o => (o < 1 ? ` opacity="${o}"` : '');

/** Split segments longer than `step`, keeping every original corner. */
function resample(pts, closed, step) {
  const n = pts.length, out = [];
  for (let i = 0; i < (closed ? n : n - 1); i++) {
    const [x0, y0] = pts[i], [x1, y1] = pts[(i + 1) % n];
    const k = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0) / step));
    for (let j = 0; j < k; j++) out.push([x0 + ((x1 - x0) * j) / k, y0 + ((y1 - y0) * j) / k]);
  }
  if (!closed) out.push(pts[n - 1]);
  return out;
}

/** The hand: a smooth sideways drift along the stroke (bigger on long strokes) plus a little tremor. */
function hand(pts, closed) {
  const n = pts.length;
  const s = [0];
  for (let i = 1; i < n; i++) s.push(s[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  const total = s[n - 1] + (closed ? Math.hypot(pts[0][0] - pts[n - 1][0], pts[0][1] - pts[n - 1][1]) : 0);
  const tremor = S.jitter * 1.4;
  if (total < 14 || !S.wobble) return pts.map(([x, y]) => [x + (S.rng() - 0.5) * tremor, y + (S.rng() - 0.5) * tremor]);
  const span = 20 + S.rng() * 14, amp = S.wobble * Math.min(4, 0.35 + total * 0.024);
  const knots = Array.from({ length: Math.ceil(total / span) + 2 }, () => S.rng() - 0.5);
  const drift = t => { const u = t / span, i = Math.floor(u), r = u - i, e = r * r * (3 - 2 * r); return knots[i] + (knots[i + 1] - knots[i]) * e; };
  const close = closed ? drift(total) - drift(0) : 0;
  return pts.map(([x, y], i) => {
    const [ax, ay] = pts[Math.max(0, i - 1)], [bx, by] = pts[Math.min(n - 1, i + 1)];
    const len = Math.hypot(bx - ax, by - ay) || 1;
    const d = (drift(s[i]) - (close * s[i]) / total) * amp * 2;
    return [x - ((by - ay) / len) * d + (S.rng() - 0.5) * tremor, y + ((bx - ax) / len) * d + (S.rng() - 0.5) * tremor];
  });
}

function coords(pts, closed) {
  let p = pts;
  if (S.warp || S.wobble) p = resample(p, closed, S.warp ? 4 : 7);
  if (S.warp) p = p.map(([x, y]) => S.warp(x, y));
  if (S.wobble || S.jitter) p = hand(p, closed);
  return p.map(([x, y]) => `${f(x)},${f(y)}`).join(' ');
}

/** Centre, scale and turn of the active warp at (x, y), for round marks that are placed rather than traced. */
function frame(x, y) {
  if (!S.warp) return [x, y, 1, 0];
  const [X, Y] = S.warp(x, y), [X1, Y1] = S.warp(x + 1, y);
  return [X, Y, Math.hypot(X1 - X, Y1 - Y), (Math.atan2(Y1 - Y, X1 - X) * 180) / Math.PI];
}
const jit = k => (S.jitter ? (S.rng() - 0.5) * S.jitter * k * 1.6 : 0);

export const line = (pts, w = 1.6, o = 1) =>
  `<polyline points="${coords(pts, false)}" fill="none" stroke="currentColor" stroke-width="${sw(w)}"${op(o)} stroke-linecap="round" stroke-linejoin="round"/>`;
export const shape = (pts, fill = true, w = 1.5, o = 1) =>
  `<polygon points="${coords(pts, true)}" fill="${fill ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="${sw(w)}"${op(o)} stroke-linejoin="round"/>`;
export function circle(x, y, r, fill = true, w = 1.3) {
  const [X, Y, k] = frame(x, y);
  return `<circle cx="${f(X + jit(1))}" cy="${f(Y + jit(1))}" r="${f(r * k * (1 + jit(0.08)))}" fill="${fill ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="${sw(w)}"/>`;
}
export function ellipse(x, y, rx, ry, fill = false, w = 1.5, rot = 0) {
  const [X, Y, k, turn] = frame(x, y);
  const r = rot + turn;
  return `<ellipse cx="${f(X)}" cy="${f(Y)}" rx="${f(rx * k)}" ry="${f(ry * k)}"${r ? ` transform="rotate(${f(r)} ${f(X)} ${f(Y)})"` : ''} fill="${fill ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="${sw(w)}"/>`;
}
export const group = (x, y, scale, content, dir = 1, o = 1) =>
  `<g transform="translate(${f(x)} ${f(y)}) scale(${f(scale * dir)} ${f(scale)})"${op(o)}>${content}</g>`;
/** Like group, turned by `deg` degrees about its origin. */
export const turned = (x, y, scale, deg, content, dir = 1) =>
  `<g transform="translate(${f(x)} ${f(y)}) rotate(${f(deg)}) scale(${f(scale * dir)} ${f(scale)})">${content}</g>`;

/** Points along an ellipse arc from angle a0 to a1 (radians). */
export function arcPts(cx, cy, rx, ry, a0, a1, n = 12) {
  return Array.from({ length: n + 1 }, (_, i) => {
    const a = a0 + ((a1 - a0) * i) / n;
    return [cx + Math.cos(a) * rx, cy + Math.sin(a) * ry];
  });
}

/** A tapering tube along a path (a horn, a trunk, a tail): outline from width w0 to w1, optional bands across it. */
export function tube(path, w0, w1, { fill = false, bands = 0, w = 1.4 } = {}) {
  const n = path.length;
  const left = [], right = [];
  for (let i = 0; i < n; i++) {
    const [ax, ay] = path[Math.max(0, i - 1)], [bx, by] = path[Math.min(n - 1, i + 1)];
    const len = Math.hypot(bx - ax, by - ay) || 1, nx = -(by - ay) / len, ny = (bx - ax) / len;
    const half = (w0 + ((w1 - w0) * i) / (n - 1)) / 2;
    left.push([path[i][0] + nx * half, path[i][1] + ny * half]);
    right.push([path[i][0] - nx * half, path[i][1] - ny * half]);
  }
  let a = shape([...left, ...right.reverse()], fill, w);
  right.reverse();
  for (let b = 1; b <= bands; b++) {
    const i = Math.round((b * (n - 1)) / (bands + 1));
    a += line([left[i], right[i]], w * 0.7);
  }
  return a;
}
