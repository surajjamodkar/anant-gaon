// People on a rig. A figure is the familiar pair of triangles meeting at the waist, but each part has
// a joint: the torso leans and arches about the waist, the hips sway, legs and arms bend at knee and
// elbow. A pose is a handful of numbers, so dancers tilt, runners stretch and no two people stand alike.

import { arcPts, bend, circle, group, line, shape, tube, turned } from './ink.js';
import { rotate, smooth } from './rig.js';

const WAIST = -37;

/** Arm paths for poses that hold something: [elbow, hand] for the left and right arm, in the upright frame. */
const ARMS = {
  walk: [[[-17, -36], [-25, -39]], [[16, -44], [23, -52]]],
  hold: [[[-15, -45], [-22, -48]], [[15, -45], [22, -48]]],
  dance: [[[-18, -41], [-28, -47]], [[18, -41], [28, -47]]],
  carry: [[[-17, -60], [-12, -73]], [[17, -60], [12, -73]]],
  pot: [[[-12, -62], [-6, -74]], [[12, -62], [6, -74]]],
  drum: [[[-16, -37], [0, -32]], [[21, -40], [13, -32]]],
  tarpa: [[[2, -46], [9, -60]], [[16, -50], [15, -66]]],
  well: [[[-2, -62], [6, -73]], [[13, -60], [8, -73]]],
  pound: [[[2, -62], [10, -73]], [[16, -58], [10, -68]]],
  net: [[[14, -46], [30, -52]], [[18, -52], [30, -54]]],
  bow: [[[10, -52], [20, -52]], [[22, -52], [34, -52]]],
  herd: [[[-17, -36], [-24, -38]], [[16, -42], [22, -38]]],
  baby: [[[-10, -40], [-2, -38]], [[16, -44], [22, -50]]],
  climb: [[[-6, -62], [-2, -73]], [[8, -62], [4, -73]]],
  pray: [[[-2, -42], [6, -49]], [[14, -42], [6, -49]]],
  offer: [[[0, -46], [16, -54]], [[14, -46], [24, -54]]],
  yoke: [[[-15, -44], [-21, -55]], [[15, -44], [21, -55]]],
  firewood: [[[-17, -60], [-13, -74]], [[17, -60], [13, -74]]],
  pots: [[[-12, -62], [-6, -74]], [[12, -62], [6, -74]]],
  winnow: [[[6, -44], [16, -58]], [[16, -50], [30, -60]]],
  spear: [[[12, -44], [22, -52]], [[16, -60], [6, -68]]],
  rod: [[[8, -44], [15, -53]], [[15, -46], [21, -57]]],
  flute: [[[4, -46], [12, -60]], [[16, -48], [24, -59]]],
};

/** Free arms as [upper arm, forearm] angles from straight down; positive swings towards where the figure faces. */
export const REACH = {
  up: [[-0.9, -2.1], [0.9, 2.1]],
  high: [[-2.45, -2.85], [2.45, 2.85]],
  out: [[-1.5, -1.62], [1.5, 1.62]],
  hips: [[-0.95, 0.85], [0.95, -0.85]],
  clap: [[-2.5, 2.4], [2.5, -2.4]],
  wave: [[-0.55, -0.25], [2.3, 2.95]],
  swing: [[-0.5, -0.2], [0.6, 1.2]],
  run: [[-0.9, -0.3], [1.0, 2.2]],
  spread: [[-1.9, -2.3], [1.9, 2.3]],
};
const FREE = new Set(['walk', 'hold', 'dance', 'run']);

/** Where the joints go for a pose and motion. Shared by the drawing and by anyone who needs the hands. */
function skeleton(pose, v, m) {
  const lean = m.lean ?? 0, arch = m.arch ?? 0, hip = m.hip ?? 0;
  const up = (x, y) => rotate(x, y, 0, WAIST, lean + arch * Math.max(-0.3, Math.min(1.4, (WAIST - y) / 28)));
  const low = (x, y) => rotate(x, y, 0, WAIST, hip);
  const spread = 0.28 + (v % 3) * 0.14;
  const legs = m.legs ?? (pose === 'hold' || pose === 'dance' ? [[-0.54, -0.74], [spread + 0.14, spread - 0.32]] : [[-spread, 0.3], [spread, -0.3]]);
  const shin = 10 * (m.long ?? 1), thigh = 11 * (m.long ?? 1);
  const limbs = pose === 'climb'
    ? [[[-5, -20], [-13, -28], [-4, -34]], [[5, -20], [12, -10], [4, -4]]]
    : legs.map(([a, k], i) => {
      const [rx, ry] = low(i ? 5 : -5, -20);
      const kx = rx + thigh * Math.sin(a), ky = ry + thigh * Math.cos(a), b = a - k;
      return [[rx, ry], [kx, ky], [kx + shin * Math.sin(b), ky + shin * Math.cos(b)]];
    });
  const ground = pose === 'climb' ? 0 : Math.max(...limbs.map(l => Math.max(l[1][1], l[2][1])));
  const drop = -ground - (m.lift ?? 0);
  let arms;
  const reach = typeof m.arms === 'string' ? REACH[m.arms] : m.arms;
  if (reach && FREE.has(pose)) {
    arms = reach.map(([a1, a2], i) => {
      const sx = i ? 7 : -7, sy = -50;
      const ex = sx + 11 * Math.sin(a1), ey = sy + 11 * Math.cos(a1);
      return [[sx, sy], [ex, ey], [ex + 10 * Math.sin(a2), ey + 10 * Math.cos(a2)]];
    });
  } else {
    const [[l1, l2], [r1, r2]] = ARMS[pose] || ARMS.walk;
    arms = [[[-7, -50], l1, l2], [[7, -50], r1, r2]];
    // hands follow a raised pestle
    if (pose === 'pound' && m.raise) arms = arms.map(arm => arm.map(([x, y], i) => [x, y - (i ? m.raise * (i / 2) : 0)]));
  }
  return { up, low, limbs, drop, arms };
}

/** Where a figure's hands are, in its own upright frame (before scale and flip), feet on y = 0. */
export function hands(pose = 'hold', v = 0, m = {}) {
  const { up, arms, drop } = skeleton(pose, v, m);
  return arms.map(a => { const [x, y] = up(...a[2]); return [x, y + drop]; });
}

/** The tarpa: a long gourd horn that sweeps up from the mouth and hooks over, banded, with a tassel. */
function tarpa(curl = 1) {
  const c = curl;
  const path = smooth([[6, -61], [15, -70], [22, -84 * c], [21, -99 * c], [12, -108 * c], [1, -104 * c], [-3, -96 * c]], 5);
  let a = tube(path, 2.6, 6.5, { bands: 5, w: 1.3 });
  const [ex, ey] = path.at(-1);
  a += shape([[ex - 5, ey - 1], [ex + 4, ey + 2], [ex - 3, ey + 9]], false, 1.2); // palm-leaf bell
  const [tx, ty] = path[Math.floor(path.length * 0.55)];
  a += line([[tx + 3, ty], [tx + 6, ty + 12]], 0.9) + circle(tx + 6, ty + 14, 1.6);
  return a;
}

/**
 * A person. `pose` picks what they hold or do; `m` is the motion:
 *   lean, arch – torso tilt and curve about the waist (radians; positive leans towards +x)
 *   hip – sway of the lower triangle; legs – [[thigh, knee], [thigh, knee]] angles
 *   arms – a REACH name or [[upper, fore], [upper, fore]] (for walk, hold, dance and run)
 *   lift – height off the ground, for a jump; curl – how far the tarpa hooks over
 */
export function person(x, y, scale = 1, pose = 'walk', dir = 1, v = 0, m = {}) {
  const sk = skeleton(pose, v, m);
  const stoop = ['farm', 'sickle', 'sow'].includes(pose) ? 14 : 0;
  let a = bend(sk.up, () => {
    let s = circle(stoop * 0.9, -64, 5.4) + line([[stoop * 0.8, -58], [stoop * 0.6, -54]], 2);
    if (v % 2 && pose !== 'tarpa') s += circle(stoop * 0.9 - 6, -65.5, 2.5); // hair knot
    s += shape([[-9 + stoop, -53], [9 + stoop, -53], [0, WAIST]]);
    const L = [stoop - 7, -50], R = [stoop + 7, -50];
    if (pose === 'farm') {
      s += line([L, [23, -30], [34, -25]], 2) + line([R, [32, -35], [34, -25]], 2);
      s += line([[35, -36], [29, 6], [40, 6]], 1.7);
    } else if (pose === 'sickle') {
      s += line([L, [20, -30], [26, -22]], 2) + line([R, [30, -36], [33, -24]], 2);
      s += line([[33, -24], [39, -30], [44, -24], [39, -17]], 1.4);
    } else if (pose === 'sow') {
      s += line([L, [4, -40], [8, -34]], 2) + shape([[2, -38], [14, -38], [12, -30], [4, -30]], false, 1.2);
      s += line([R, [28, -40], [34, -32]], 2);
    } else {
      for (const arm of sk.arms) s += line(arm, 2);
    }
    if (pose === 'dance') s += line([[-3, -70], [3, -70]], 1.3);
    if (pose === 'carry') {
      s += shape([[-17, -78], [17, -78], [11, -70], [-11, -70]], false);
      for (let i = -11; i <= 11; i += 5) s += line([[i, -78], [i + 1, -87], [i + 4, -84]], 1.2);
    }
    if (pose === 'pot') {
      s += circle(0, -80, 6.5, false, 1.5) + line([[-3, -87], [3, -87]], 1.4);
      if (v % 2) s += circle(0, -93, 4.6, false, 1.3);
    }
    if (pose === 'drum') {
      s += shape([[-4, -37], [18, -37], [18, -23], [-4, -23]], false);
      for (let i = -3; i < 18; i += 6) s += line([[i, -36], [i + 5, -24]], 1);
    }
    if (pose === 'tarpa') s += tarpa(m.curl ?? 1);
    if (pose === 'pound') s += line([[10, -90 - (m.raise ?? 0)], [10, -12 - (m.raise ?? 0)]], 2.4);
    if (pose === 'yoke') {
      // a carrying pole across the shoulders, a load swinging from each end
      s += line([[-38, -56], [0, -54], [38, -56]], 2.2);
      for (const side of [-1, 1]) {
        const lx = side * 34;
        s += line([[lx, -56], [lx - 6, -30]], 0.9) + line([[lx, -56], [lx + 6, -30]], 0.9);
        s += v % 2 ? circle(lx, -24, 7, false, 1.4) + line([[lx - 3, -31], [lx + 3, -31]], 1.2) : shape([[lx - 9, -30], [lx + 9, -30], [lx + 6, -16], [lx - 6, -16]], false, 1.3) + line([[lx - 7, -24], [lx + 7, -24]], 0.8);
      }
    }
    if (pose === 'firewood') {
      for (let i = 0; i < 4; i++) s += line([[-24 + (i % 2) * 3, -77 - i * 3], [24 - (i % 2) * 4, -79 - i * 3 + (i % 2)]], 1.6);
      s += line([[-12, -73], [-11, -90]], 1) + line([[12, -74], [11, -91]], 1);
    }
    if (pose === 'pots') for (const [r, h] of [[6.5, -80], [5.5, -92.5], [4.5, -102.5]]) s += circle(0, h, r, false, 1.4) + line([[-r * 0.45, h - r - 1], [r * 0.45, h - r - 1]], 1.2);
    if (pose === 'winnow') {
      s += shape([[12, -64], [38, -62], [34, -54], [16, -56]], false, 1.3);
      for (let i = 0; i < 4; i++) s += line([[18 + i * 5, -62], [19 + i * 4, -56]], 0.7);
    }
    if (pose === 'spear') s += line([[-14, -72], [62, -52]], 1.6) + shape([[62, -55], [72, -50], [61, -49]]);
    if (pose === 'rod') {
      s += line([[12, -50], [34, -68], [58, -82], [72, -86]], 1.3);
      s += line([[72, -86], [74, -46], [73, -12]], 0.6) + shape([[71, -12], [75, -12], [73, -6]]);
    }
    if (pose === 'flute') s += line([[6, -62], [36, -55]], 1.8) + circle(26, -57, 0.8) + circle(31, -56, 0.8);
    if (pose === 'net') {
      for (const end of [[46, -12], [56, -24], [62, -40]]) s += line([[30, -53], end], 1);
      s += line([[40, -32], [48, -36], [54, -46]], 0.8) + line([[38, -20], [50, -26], [58, -34]], 0.8);
      s += line([[46, -12], [56, -24], [62, -40]], 1.1);
    }
    if (pose === 'bow') {
      s += line(arcPts(30, -52, 8, 20, -Math.PI / 2, Math.PI / 2, 8), 1.6);
      s += line([[30, -72], [24, -52], [30, -32]], 0.8);
      s += line([[22, -52], [56, -52]], 1.1) + shape([[56, -55], [62, -52], [56, -49]]);
    }
    if (pose === 'herd') s += line([[20, -58], [27, 0]], 1.6);
    if (pose === 'offer') s += line([[12, -55], [30, -55]], 1.6) + circle(17, -58, 2) + shape([[23, -56], [25, -63], [27, -56]]);
    if (pose === 'baby') s += circle(-11, -50, 3.2) + shape([[-15, -46], [-7, -46], [-11, -37]]);
    return s;
  });
  a += bend(sk.low, () => shape([[0, WAIST], [-10, -20], [10, -20]]));
  for (const leg of sk.limbs) a += line(leg, 2);
  // Things on the ground stay on the ground, whatever the body does.
  if (pose === 'pound' && m.mortar !== false) a += shape([[1, -12 - sk.drop], [19, -12 - sk.drop], [15, -sk.drop], [5, -sk.drop]], false, 1.5);
  if (pose === 'winnow') for (let i = 0; i < 9; i++) a += circle(34 + Math.sin(i * 1.7) * 2, -50 + i * 5.6 - sk.drop, 0.9);
  if (pose === 'winnow') a += shape([[26, -sk.drop], [42, -sk.drop], [34, -6 - sk.drop]], false, 1);
  if (pose === 'sickle') for (let i = 0; i < 4; i++) a += line([[21 + i * 3, -2 - sk.drop], [22 + i * 4, -22 - sk.drop]], 1);
  if (pose === 'sow') for (const [dx, dy] of [[38, -22], [42, -13], [34, -9], [45, -4]]) a += circle(dx, dy - sk.drop, 1.1);
  return group(x, y + sk.drop * scale, scale, a, dir);
}

/** A figure sitting on the ground, reaching forward. Used for grinding, cooking and resting. */
export function seated(x, y, scale = 1, dir = 1, v = 0, m = {}) {
  const up = (px, py) => rotate(px, py, 0, -25, (m.lean ?? 0) + (m.arch ?? 0) * Math.max(0, (-25 - py) / 24));
  let a = bend(up, () => {
    let s = circle(0, -48, 5) + line([[0, -43], [0, -40]], 2);
    if (v % 2) s += circle(-5.5, -49.5, 2.3);
    s += shape([[-8, -39], [8, -39], [0, -25]]);
    s += line([[6, -37], [16, -28], [22, -22]], 2) + line([[-6, -37], [-4, -27], [8, -24]], 2);
    return s;
  });
  a += shape([[0, -25], [-9, -10], [9, -10]]);
  a += line([[-6, -10], [10, -6], [16, 0]], 2) + line([[4, -10], [-4, -3], [8, 0]], 2);
  return group(x, y, scale, a, dir);
}

/* ---------- motion ---------- */

const STANCES = [
  [[-0.54, -0.74], [0.5, -0.2]], // knees out
  [[-0.62, 0.35], [0.62, -0.35]], // wide
  [[-0.25, 0.2], [1.15, 1.75]], // knee raised
  [[-0.95, -0.55], [0.18, -0.12]], // heel kicked back
  [[-0.12, 0.55], [0.4, -0.25]], // stepping
  [[0.2, -0.5], [-0.2, 0.5]], // crossed
];

/**
 * A motion for `kind` (dance, chain, walk, run, jump, work, still), drawn from `rng`.
 * `energy` scales everything: 0 stands everyone upright, 2 is a wild night.
 */
export function moves(kind, rng, energy = 1) {
  const e = energy;
  if (e <= 0) return {};
  const r = (a, b) => a + rng() * (b - a);
  const pick = list => list[Math.floor(rng() * list.length)];
  const wiggle = legs => legs.map(([a, k]) => [a + r(-0.12, 0.12) * e, k + r(-0.15, 0.15) * e]);
  const tilt = (stance, k) => stance.map(([a, kn]) => [a * (1 + (k - 1) * 0.6), kn]);
  if (kind === 'dance') {
    const lean = r(-0.34, 0.34) * e;
    return {
      lean, arch: r(-0.1, 0.35) * e * Math.sign(lean || 1), hip: -lean * r(0.2, 0.8),
      legs: wiggle(tilt(pick(STANCES), e)), arms: pick(['up', 'up', 'high', 'clap', 'hips', 'wave', 'spread']),
      lift: rng() < 0.16 * e ? r(5, 13) * e : 0,
    };
  }
  if (kind === 'chain') {
    const lean = r(-0.18, 0.18) * e;
    return { lean, arch: r(0, 0.2) * e, hip: -lean * r(0.3, 0.7), legs: wiggle(pick(STANCES.slice(0, 5))) };
  }
  if (kind === 'walk') {
    const t = r(0.22, 0.42);
    return { lean: r(0.02, 0.12) * e, arch: r(0, 0.1) * e, legs: [[-t, r(0.1, 0.4)], [t * 1.1, r(-0.25, 0.2)]] };
  }
  if (kind === 'run') {
    return { lean: r(0.22, 0.42) * e, arch: r(0.05, 0.25) * e, hip: r(0, 0.15), legs: [[r(-0.95, -0.6), r(0.9, 1.5)], [r(0.7, 1.1), r(0.4, 0.9)]], arms: 'run', lift: r(0, 6) * e };
  }
  if (kind === 'jump') {
    return { lean: r(-0.15, 0.2) * e, arch: r(0.1, 0.35) * e, legs: [[r(-0.5, -0.1), r(0.9, 1.6)], [r(0.4, 0.9), r(1.0, 1.8)]], arms: pick(['high', 'spread', 'up']), lift: r(10, 20) * e };
  }
  if (kind === 'work') return { lean: r(-0.06, 0.12) * e, arch: r(-0.04, 0.1) * e };
  return { lean: r(-0.04, 0.04) * e };
}

/* ---------- dances ---------- */

/**
 * The tarpa dance seen from above, as it is painted: a spiral of dancers, hand in hand, heads turned
 * outward, winding in to the tarpa player at its heart. Each dancer stands on the spiral, rotated to it.
 */
export function spiralDance(x, y, radius, rng, mrng, energy = 1) {
  const s = Math.max(0.3, Math.min(0.5, radius / 280));
  const gap = 84 * s, r0 = 30 + 40 * s, step = 44 * s;
  const turns = Math.max(1.2, (radius - r0) / gap);
  const spin = rng() < 0.5 ? 1 : -1, start = rng() * Math.PI * 2;
  const at = t => { const r = r0 + (gap * t) / (Math.PI * 2); return [r, start + spin * t]; };
  let chain = [], figures = '';
  const end = turns * Math.PI * 2;
  for (let t = 0, i = 0; t < end; i++) {
    const [r, phi] = at(t);
    const px = Math.cos(phi) * r, py = Math.sin(phi) * r;
    const m = moves('chain', mrng, energy * 0.8);
    m.arms = 'out';
    figures += turned(px, py, 1, (phi * 180) / Math.PI + 90, person(0, 0, s, 'hold', spin, i % 4, m));
    t += step / r;
  }
  // The joined hands make one continuous line, just outside the dancers' shoulders.
  for (let t = 0; t <= end; t += 6 / (r0 + 10)) {
    const [r, phi] = at(t), rr = r + 49 * s;
    chain.push([Math.cos(phi) * rr, Math.sin(phi) * rr]);
  }
  const centre = person(-8 * s, 30 * s, s * 1.2, 'tarpa', spin, 0, { ...moves('chain', mrng, energy), curl: 0.9 + rng() * 0.3 });
  return group(x, y, 1, line(chain, 1.5) + figures + centre);
}

/** The tarpa dance seen from the side: dancers linked hand to hand along a flattened spiral around the player. */
export function tarpaDance(x, y, scale, rng, count, mrng = rng, energy = 1) {
  const dancers = [];
  let t = 3.4;
  for (let i = 0; i < count; i++) {
    const r = 10 + t * 16;
    dancers.push({ px: Math.cos(t) * r * 1.2, py: Math.sin(t) * r * 0.36, t, v: i % 4 });
    t += 36 / r;
  }
  const maxY = Math.max(...dancers.map(d => Math.abs(d.py)), 1);
  for (const d of dancers) {
    d.s = scale * (0.7 + 0.22 * ((d.py + maxY) / (2 * maxY)));
    d.dir = -Math.sin(d.t) >= 0 ? 1 : -1;
    d.m = moves('chain', mrng, energy);
    d.hands = hands('hold', d.v, d.m).map(([hx, hy]) => [d.px * scale + d.dir * d.s * hx, d.py * scale + d.s * hy]);
  }
  let chain = '';
  for (let i = 0; i < dancers.length - 1; i++) {
    const a = dancers[i], b = dancers[i + 1];
    const side = Math.sign(b.px - a.px) || 1;
    const from = a.hands.reduce((p, q) => (q[0] * side > p[0] * side ? q : p));
    const to = b.hands.reduce((p, q) => (q[0] * side < p[0] * side ? q : p));
    chain += line([from, [(from[0] + to[0]) / 2, (from[1] + to[1]) / 2 + 2], to], 1.6);
  }
  const figures = [...dancers]
    .sort((a, b) => a.py - b.py)
    .map(d => person(d.px * scale, d.py * scale, d.s, 'hold', d.dir, d.v, d.m))
    .join('');
  const centre = person(-6 * scale, 4 * scale, scale * 0.95, 'tarpa', 1, 0, { ...moves('chain', mrng, energy), curl: 0.85 + rng() * 0.35 });
  return group(x, y, 1, chain + figures + centre);
}

/** A loose crowd of dancers, each in a pose of their own, some in the air. */
export function revellers(x, y, scale, count, rng, mrng = rng, energy = 1) {
  const people = Array.from({ length: count }, (_, i) => ({
    dx: (i - (count - 1) / 2) * 34 + (rng() - 0.5) * 12, dy: (rng() - 0.5) * 14, i,
    kind: rng() < 0.2 ? 'jump' : 'dance', dir: rng() < 0.5 ? 1 : -1,
  }));
  return people
    .sort((a, b) => a.dy - b.dy)
    .map(p => person(x + p.dx * scale, y + p.dy, scale * (0.92 + rng() * 0.12), 'dance', p.dir, p.i, moves(p.kind, mrng, energy)))
    .join('');
}
