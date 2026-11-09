// Warli-inspired motifs, drawn from triangles, circles and lines.
// Every motif's origin is where it touches the ground; it faces +x unless flipped with `dir = -1`.
// Animals take an optional pose (a gait name from rig.js, or its numbers), which bends their spine and
// swings their legs, so the same tiger can stalk, leap or stand.

import { arcPts, bend, circle, ellipse, group, line, shape, tube, turned } from './ink.js';
import { quadWarp, stemWarp } from './rig.js';
import { person, seated } from './figures.js';

export * from './ink.js';
export { hands, moves, person, revellers, seated, spiralDance, tarpaDance, REACH } from './figures.js';
export { plant, species } from './plants.js';
export { bridge, duck, inside, lotus, pond, river, shore, span } from './water.js';
export { cloud, flag, flyingBird, kite, vFlock } from './sky.js';
export { GAITS } from './rig.js';

const leaf = (x, y, a, rx = 8, ry = 3.3) => ellipse(x, y, rx, ry, true, 0.6, (a * 180) / Math.PI);
/** Draw an animal's body under its rig and pose. */
const posed = (rig, pose, draw) => (pose ? bend(quadWarp(rig, pose), draw) : draw());
/** A trunk that leans and bows instead of standing ruler-straight. */
const lean = (rng, height, k = 1) => { const l = (rng() - 0.5) * 0.3 * k, c = (rng() - 0.5) * 0.004 * k; return stemWarp(0, 0, height, h => l + c * h); };

/* ---------- animals ---------- */

/** Where each animal's spine, legs, neck and tail are, as drawn (see quadWarp in rig.js). */
export const RIGS = {
  bullock: { axis: -32, mid: -6, legTop: -24, legs: [-27, -19, 13, 20], neck: 18, tail: -33, from: -44, to: 44 },
  goat: { axis: -23, mid: -4, legTop: -17, legs: [-15, -9, 7, 12], neck: 11, tail: -20, from: -25, to: 28 },
  dog: { axis: -19, mid: -3, legTop: -16, legs: [-14, -9, 7, 11], neck: 11, tail: -18, from: -24, to: 26 },
  horse: { axis: -36, mid: -6, legTop: -29, legs: [-28, -19, 11, 18], neck: 16, tail: -34, from: -46, to: 42 },
  tiger: { axis: -29, mid: -11, legTop: -22, legs: [-35, -27, 12, 20], neck: 22, tail: -42, from: -66, to: 60 },
  deer: { axis: -31, mid: -6, legTop: -25, legs: [-22, -14, 10, 16], neck: 14, tail: -28, from: -32, to: 34 },
  elephant: { axis: -50, mid: -3, legTop: -32, legs: [-34.5, -18.5, 17.5, 31.5], neck: 36, tail: -46, from: -52, to: 70 },
  boar: { axis: -22, mid: -2, legTop: -11, legs: [-18, -10, 10, 16], neck: 20, tail: -26, from: -31, to: 30 },
  jackal: { axis: -20, mid: -3, legTop: -16, legs: [-14, -9, 7, 11], neck: 11, tail: -18, from: -34, to: 30 },
  hare: { axis: -9, mid: 0, legTop: -4, legs: [-4, 6], neck: 8, tail: -10, from: -14, to: 16 },
};

/** Humped cow or bullock with lyre horns. */
export function bullock(x, y, scale = 1, dir = 1, opts = {}) {
  const { calf = false, hatch = true, pose } = opts;
  const a = posed(RIGS.bullock, pose, () => {
    let a = shape([[-34, -40], [18, -41], [24, -26], [-30, -23]], false, 2);
    a += shape([[3, -40], [10, -51], [18, -41]], true, 1.2); // hump
    a += shape([[18, -42], [30, -45], [41, -32], [35, -27], [24, -31]], false, 1.7);
    a += circle(31, -39, 1.1) + line([[30, -30], [28, -23]], 1.2);
    a += line([[26, -44], [19, -47]], 1.3);
    if (!calf) a += line([[27, -45], [23, -55], [29, -61]], 1.7) + line([[32, -45], [37, -55], [44, -57]], 1.7);
    for (const px of [-27, -19, 13, 20]) a += line([[px, -24], [px + 1, -11], [px - 1, 0], [px + 3, 0]], 1.8);
    a += line([[-33, -38], [-40, -26], [-41, -13]], 1.4) + shape([[-44, -15], [-38, -15], [-41, -7]]);
    if (hatch) for (let i = -26; i < 15; i += 6) a += line([[i, -38], [i + 3, -26]], 1, 0.55);
    return a;
  });
  return group(x, y, scale, a, dir);
}

export function goat(x, y, scale = 1, dir = 1, pose) {
  const a = posed(RIGS.goat, pose, () => {
    let a = shape([[-20, -28], [12, -29], [15, -18], [-17, -16]], false, 1.7);
    a += shape([[11, -29], [20, -40], [28, -33], [22, -26]], false, 1.5) + circle(21, -35, 0.9);
    a += line([[19, -39], [13, -46], [10, -42]], 1.4) + line([[26, -30], [27, -24]], 1.1);
    a += line([[-20, -27], [-25, -34]], 1.5);
    for (const px of [-15, -9, 7, 12]) a += line([[px, -17], [px + 1, -7], [px, 0]], 1.5);
    for (let i = -15; i < 10; i += 5) a += line([[i, -27], [i + 2, -18]], 0.9, 0.55);
    return a;
  });
  return group(x, y, scale, a, dir);
}

export function dog(x, y, scale = 1, dir = 1, pose) {
  const a = posed(RIGS.dog, pose, () => {
    let a = shape([[-18, -22], [12, -23], [14, -16], [-16, -15]], true, 1);
    a += shape([[11, -23], [17, -32], [26, -26], [17, -20]], true, 1);
    a += shape([[15, -30], [16, -37], [19, -31]]);
    a += line([[-18, -22], [-24, -30], [-20, -34]], 1.6);
    for (const px of [-14, -9, 7, 11]) a += line([[px, -16], [px + 1, -7], [px - 1, 0]], 1.6);
    return a;
  });
  return group(x, y, scale, a, dir);
}

export function hen(x, y, scale = 1, dir = 1, rooster = false) {
  let a = shape([[-8, -12], [7, -14], [10, -6], [1, -1], [-8, -5]]);
  a += circle(9, -17, 3.3) + shape([[12, -18], [16, -16], [12, -15]]);
  a += shape([[7, -20], [9, -24], [10, -20.5], [12, -23.5], [12, -19]]);
  const tail = rooster ? 18 : 11;
  for (let i = 0; i < (rooster ? 4 : 3); i++) a += line([[-7, -9], ...arcPts(-9, -9 - i * 3, tail * 0.5, tail * 0.6, -1.4, -3.2, 5).slice(1)], 1.2);
  a += line([[-1, -2], [-2, 4]], 1.1) + line([[3, -2], [4, 4]], 1.1);
  return group(x, y, scale, a, dir);
}

export function horse(x, y, scale = 1, dir = 1, rider = false, pose) {
  const warp = pose ? quadWarp(RIGS.horse, pose) : null;
  let a = bend(warp, () => {
    let a = shape([[-34, -44], [18, -44], [22, -30], [-30, -28]], false, 2);
    a += shape([[16, -44], [28, -72], [42, -64], [38, -58], [28, -58], [24, -36]], false, 1.7);
    a += circle(34, -66, 1.1) + shape([[27, -73], [26, -80], [31, -74]]);
    for (let i = 0; i < 5; i++) a += line([[19 + i * 2, -48 - i * 5], [14 + i * 2, -45 - i * 5]], 1.2);
    for (const px of [-28, -19, 11, 18]) a += line([[px, -29], [px + 3, -14], [px, 0]], 1.8);
    a += line([[-34, -42], [-46, -30], [-44, -12]], 2) + line([[-34, -40], [-42, -24]], 1.2);
    if (rider) {
      a += shape([[-14, -44], [8, -44], [6, -36], [-12, -36]], false, 1);
      for (let i = -12; i < 8; i += 4) a += circle(i, -40, 1);
    }
    return a;
  });
  if (rider) {
    const [sx, sy] = warp ? warp(-3, -22) : [-3, -22], [qx, qy] = warp ? warp(-1, -22) : [-1, -22];
    a += turned(sx, sy, 0.85, (Math.atan2(qy - sy, qx - sx) * 180) / Math.PI, circle(0, -64, 5.4) + circle(0, -76, 4, false, 1.2) + shape([[-9, -53], [9, -53], [0, -37]]) + shape([[0, -37], [-9, -26], [9, -26]]) + line([[3, -28], [12, -14]], 2) + line([[7, -50], [18, -44], [26, -50]], 2));
  }
  return group(x, y, scale, a, dir);
}

export function tiger(x, y, scale = 1, dir = 1, pose) {
  const a = posed(RIGS.tiger, pose, () => {
    let a = shape([[-42, -34], [20, -36], [28, -24], [-38, -20]], false, 2);
    a += shape([[22, -40], [30, -50], [46, -47], [52, -36], [44, -26], [28, -27]], false, 1.8);
    a += shape([[29, -48], [29, -57], [35, -50]], false, 1.2) + shape([[40, -49], [44, -57], [46, -47]], false, 1.2);
    a += circle(36, -42, 1.4) + circle(45, -40, 1.4) + shape([[49, -36], [53, -35], [50, -32]]);
    a += line([[33, -47], [34, -44]], 1) + line([[38, -48], [38, -45]], 1) + line([[42, -47], [41, -44]], 1);
    a += line([[50, -32], [60, -34]], 0.7) + line([[50, -31], [59, -28]], 0.7);
    for (let i = -36; i < 18; i += 5) a += shape([[i, -35], [i + 2.4, -35], [i + 3.6, -22], [i + 1.2, -22]], true, 0.4);
    for (const px of [-35, -27, 12, 20]) a += line([[px, -22], [px + 1, -10], [px - 1, 0], [px + 4, 0]], 2);
    a += line([[-42, -32], [-56, -38], [-64, -56], [-56, -66]], 1.8);
    for (const [tx, ty] of [[-52, -37], [-60, -46], [-62, -57]]) a += line([[tx - 3, ty - 2], [tx + 3, ty + 2]], 1.4);
    return a;
  });
  return group(x, y, scale, a, dir);
}

export function deer(x, y, scale = 1, dir = 1, pose) {
  const a = posed(RIGS.deer, pose, () => {
    let a = shape([[-28, -38], [16, -38], [20, -27], [-24, -24]], false, 1.8);
    a += shape([[14, -38], [24, -60], [34, -56], [28, -46], [20, -32]], false, 1.6) + circle(29, -55, 1.1);
    a += line([[25, -60], [20, -78], [13, -84]], 1.4) + line([[21, -73], [29, -80]], 1.4) + line([[18, -82], [24, -91]], 1.2);
    a += line([[-28, -36], [-32, -42]], 1.5);
    for (const px of [-22, -14, 10, 16]) a += line([[px, -25], [px + 2, -11], [px - 1, 0]], 1.6);
    for (const [dx, dy] of [[-18, -32], [-10, -34], [-4, -30], [4, -33], [-14, -28], [8, -29]]) a += circle(dx, dy, 1.3);
    return a;
  });
  return group(x, y, scale, a, dir);
}

export function monkey(x, y, scale = 1, dir = 1) {
  let a = circle(0, -30, 4.3) + shape([[-6, -25], [6, -25], [0, -14]]) + shape([[0, -14], [-6, -6], [6, -6]]);
  a += line([[-4, -7], [-9, -2], [-6, 2]], 1.6) + line([[4, -7], [9, -1], [6, 3]], 1.6);
  a += line([[5, -23], [12, -30], [12, -38]], 1.6) + line([[-5, -23], [-10, -16]], 1.6);
  a += line([[0, -7], ...arcPts(-10, 4, 10, 12, -0.2, 2.6, 7).slice(0), [-24, 0], [-22, -6]], 1.3);
  return group(x, y, scale, a, dir);
}

export function snake(x, y, scale = 1, dir = 1) {
  const pts = Array.from({ length: 16 }, (_, i) => [-40 + i * 5, -3 - Math.sin(i * 0.9) * 5]);
  let a = line(pts, 2.4) + shape([[35, -6], [44, -3], [35, 0]]) + line([[44, -3], [49, -5], [48, -1]], 0.9);
  return group(x, y, scale, a, dir);
}

export function crane(x, y, scale = 1, dir = 1) {
  let a = ellipse(0, -36, 14, 7, true, 1, -12);
  a += line([[10, -40], [16, -54], [10, -64], [16, -72]], 1.8) + circle(17, -73, 2.6);
  a += line([[19, -73], [32, -70]], 1.4);
  a += line([[-12, -34], [-22, -30]], 1.4);
  a += line([[-2, -30], [-3, -14], [-1, 0]], 1.3) + line([[3, -30], [6, -14], [9, 0]], 1.3);
  return group(x, y, scale, a, dir);
}

export function fish(x, y, scale = 1, dir = 1) {
  return group(x, y, scale, shape([[-13, 0], [0, -5], [13, 0], [0, 5]], false, 1) + shape([[13, 0], [20, -5], [20, 5]], false, 1) + circle(-6, 0, 0.8), dir);
}

export function crab(x, y, scale = 1) {
  let a = ellipse(0, -6, 9, 5, true, 1);
  for (const s of [-1, 1]) {
    for (let i = 0; i < 3; i++) a += line([[s * 6, -5 + i * 2], [s * 13, -8 + i * 4], [s * 15, -2 + i * 3]], 1);
    a += line([[s * 6, -9], [s * 10, -16], [s * 7, -19]], 1.2) + circle(s * 7, -20, 2, false, 1);
  }
  return group(x, y, scale, a);
}

export function bird(x, y, scale = 1) {
  return group(x, y, scale, line([[-10, 1], [-5, -4], [0, 0], [6, -5], [12, -2]], 1.5));
}

export function peacock(x, y, scale = 1, dir = 1) {
  let a = '';
  for (let i = 0; i < 9; i++) {
    const t = -Math.PI + (i * Math.PI) / 8;
    const ex = Math.cos(t) * 39, ey = -20 + Math.sin(t) * 43;
    a += line([[0, -13], [ex, ey]], 1.2) + circle(ex, ey, 4, false, 1) + circle(ex, ey, 1);
  }
  a += shape([[-10, -17], [12, -20], [4, -5]], false, 1.7);
  a += line([[9, -18], [16, -32], [15, -43]], 2) + circle(15, -46, 4, false);
  a += line([[18, -45], [25, -44]], 1.2) + line([[12, -51], [10, -57], [16, -54]], 1.2);
  a += line([[-1, -5], [-4, 3]], 1.4) + line([[5, -5], [9, 2]], 1.4);
  return group(x, y, scale, a, dir);
}

/* ---------- vehicles and tools ---------- */

const wheel = (cx, cy, r) => {
  let a = circle(cx, cy, r, false, 2) + circle(cx, cy, r * 0.82, false, 0.8) + circle(cx, cy, 3);
  for (let i = 0; i < 8; i++) {
    const t = (i * Math.PI) / 4;
    a += line([[cx, cy], [cx + Math.cos(t) * r * 0.82, cy + Math.sin(t) * r * 0.82]], 1.2);
  }
  return a;
};

/** A covered bullock cart: two bullocks, a spoked wheel and a seated driver. */
export function bullockCart(x, y, scale = 1, dir = 1, loaded = false, pose) {
  let a = bullock(62, -5, 0.78, 1, { hatch: false, pose }) + bullock(52, 0, 0.82, 1, { pose: pose && { ...pose, phase: pose.phase + 1.3 } });
  a += line([[-6, -32], [62, -42]], 2) + line([[64, -44], [80, -47]], 2.2);
  a += line([[-90, -30], [0, -30]], 2.4) + line([[-90, -44], [-8, -44]], 1.3);
  for (let i = -88; i <= -8; i += 16) a += line([[i, -30], [i, -44]], 1.1);
  const roof = arcPts(-49, -44, 41, 34, Math.PI, 2 * Math.PI, 14);
  a += line(roof, 1.8);
  for (let i = 2; i < 13; i += 2) a += line([roof[i], [roof[i][0], -44]], 0.8, 0.7);
  if (loaded) for (let i = 0; i < 3; i++) a += ellipse(-70 + i * 16, -52, 7, 6, false, 1.2);
  a += wheel(-46, -22, 22);
  a += group(-8, -32, 0.62, circle(0, -48, 5.4) + shape([[-8, -39], [8, -39], [0, -25]]) + shape([[0, -25], [-9, -12], [9, -12]]) + line([[3, -12], [10, 4]], 2) + line([[6, -36], [22, -30], [34, -26]], 2) + line([[34, -40], [36, -18]], 1.4));
  return group(x, y, scale, a, dir);
}

/** A pair of yoked bullocks pulling a plough, with a farmer behind and fresh furrows. */
export function plough(x, y, scale = 1, dir = 1, pose, motion) {
  let a = bullock(10, -7, 0.88, 1, { hatch: false, pose }) + bullock(0, 0, 0.92, 1, { pose: pose && { ...pose, phase: pose.phase + 1.3 } });
  a += line([[26, -46], [42, -50]], 2.4);
  a += line([[32, -46], [-46, -6]], 2) + shape([[-50, -10], [-40, -3], [-54, 0]]);
  a += line([[-48, -8], [-62, -34]], 1.8);
  a += person(-74, 0, 0.92, 'walk', 1, 1, motion);
  for (let i = 0; i < 3; i++) a += line([[-150, 4 + i * 5], [-52, 2 + i * 5]], 1, 0.45);
  return group(x, y, scale, a, dir);
}

export function boat(x, y, scale = 1, dir = 1) {
  let a = shape([[-48, -14], [48, -14], [36, 0], [-36, 0]], false, 1.8);
  for (let i = -36; i < 40; i += 12) a += line([[i, -12], [i - 4, -2]], 0.9, 0.7);
  a += line([[-36, -14], [-58, -50]], 1.3);
  return group(x, y, scale, a + person(10, -14, 0.82, 'net', 1, 0), dir);
}

/* ---------- buildings and household ---------- */

/** A hut. opts.ladder leans a ladder up to the loft; opts.cradle slings a cradle where the wall art would be. */
export function hut(x, y, scale, rng, dir = 1, opts = {}) {
  let a = shape([[-70, -78], [0, -140], [78, -78]], false, 2.3);
  a += line([[-80, -72], [-70, -80], [77, -80], [88, -72]], 2);
  for (let i = -61; i < 73; i += 7) a += line([[i, -79], [i * 0.22, -140 + Math.abs(i) * 0.82 - 4]], 1.1, 0.9);
  a += shape([[-61, -74], [65, -74], [65, -3], [-61, -3]], false, 2.1);
  a += shape([[-13, -2], [-13, -48], [14, -48], [14, -2]], false, 2);
  a += shape([[28, -47], [49, -47], [49, -27], [28, -27]], false) + line([[38, -47], [38, -27]], 1) + line([[28, -37], [49, -37]], 1);
  a += line([[-67, 1], [72, 1]], 2);
  const wall = opts.cradle ? 3 : Math.floor(rng() * 3);
  if (wall === 3) {
    // a cradle slung from a beam
    a += line([[-56, -66], [-20, -66]], 1.2) + line([[-50, -66], [-48, -46]], 0.8) + line([[-26, -66], [-28, -46]], 0.8);
    a += line(arcPts(-38, -46, 10, 8, 0, Math.PI, 8), 1.4);
    a += circle(-38, -43, 2.4);
  } else if (wall === 0) for (let i = -52; i < -15; i += 9) a += line([[i, -65], [i, -11]], 1, 0.5);
  else if (wall === 1) for (let r = 0; r < 4; r++) for (let i = -54; i < -18; i += 8) a += circle(i + (r % 2) * 4, -60 + r * 13, 1.3);
  else for (let r = 0; r < 3; r++) a += line(Array.from({ length: 7 }, (_, i) => [-56 + i * 6, -58 + r * 16 + (i % 2) * 6]), 1, 0.7);
  for (let i = -57; i < 60; i += 12) a += shape([[i, -71], [i + 5, -63], [i + 10, -71]], false, 0.9);
  a += line([[40, -110], [40, -139], [42 + rng() * 7, -153]], 1.4);
  if (opts.ladder) {
    a += line([[-82, 0], [-64, -92]], 1.5) + line([[-70, 2], [-52, -90]], 1.5);
    for (let i = 1; i < 8; i++) { const t = i / 8; a += line([[-82 + 18 * t, -92 * t], [-70 + 18 * t, 2 - 92 * t]], 1); }
  }
  return group(x, y, scale, a, dir);
}

/** An open cattle shed: thatch on four posts with a cow tethered inside. */
export function shed(x, y, scale = 1, dir = 1) {
  let a = shape([[-64, -70], [-48, -96], [56, -96], [70, -70]], false, 2);
  for (let i = -58; i < 66; i += 7) a += line([[i, -71], [i * 0.85, -95]], 1, 0.8);
  for (const px of [-56, -18, 22, 60]) a += line([[px, -70], [px, 0]], 2);
  a += bullock(0, 0, 0.75, 1, { calf: false }) + line([[30, -36], [56, -40]], 0.9);
  return group(x, y, scale, a, dir);
}

/** A woven grain store (kanagi) with a conical lid. */
export function granary(x, y, scale = 1) {
  let a = shape([[-16, 0], [-19, -48], [19, -48], [16, 0]], false, 1.8);
  for (let i = -20; i < 24; i += 7) a += line([[i, -46], [i + 12, -2]], 0.8, 0.7) + line([[i + 12, -46], [i, -2]], 0.8, 0.7);
  a += shape([[-24, -47], [0, -72], [24, -47]], false, 1.8);
  for (let i = -18; i <= 18; i += 6) a += line([[i, -49], [i * 0.25, -68]], 0.9);
  a += circle(0, -75, 2.6);
  return group(x, y, scale, a);
}

export function haystack(x, y, scale = 1) {
  let a = shape([...arcPts(0, 0, 30, 46, Math.PI, 2 * Math.PI, 12)], false, 1.8) + line([[0, -46], [0, -66]], 1.6);
  for (let i = 1; i < 5; i++) a += line(arcPts(0, 0, 30 - i * 2, 46 - i * 9, Math.PI + 0.1, 2 * Math.PI - 0.1, 10), 0.9, 0.7);
  return group(x, y, scale, a);
}

/** A stepwell-style village well with a pulley frame, rope and pot. */
export function well(x, y, scale = 1) {
  let a = ellipse(0, -26, 30, 8, false, 1.8);
  a += line([[-30, -26], [-30, -2]], 1.8) + line([[30, -26], [30, -2]], 1.8) + line(arcPts(0, -2, 30, 8, 0, Math.PI, 12), 1.8);
  for (let r = 0; r < 3; r++) for (let i = -24 + (r % 2) * 6; i < 26; i += 12) a += line([[i, -16 + r * 7], [i + 7, -16 + r * 7]], 0.9, 0.7);
  a += line([[-24, -28], [-22, -86]], 2.2) + line([[24, -28], [22, -86]], 2.2) + line([[-28, -86], [28, -86]], 2.2);
  a += circle(0, -79, 6, false, 1.4) + circle(0, -79, 1.6);
  a += line([[-6, -79], [-6, -42]], 1) + circle(-6, -36, 5.5, false, 1.4);
  a += line([[6, -79], [44, -70]], 1);
  return group(x, y, scale, a);
}

/** Two women seated at a hand mill (jaata), grinding grain together. */
export function grinding(x, y, scale = 1, v = 0) {
  let a = seated(-30, 0, 1, 1, 1 + v) + seated(30, 0, 1, -1, 1);
  a += ellipse(0, -4, 17, 5, false, 1.6) + ellipse(0, -10, 13, 4, false, 1.5) + line([[7, -11], [7, -24]], 1.6);
  for (let i = 0; i < 5; i++) a += circle(-12 + i * 6, 1, 1);
  return group(x, y, scale, a);
}

/** A clay stove with a pot, flames and a curl of smoke, and someone tending it. */
export function hearth(x, y, scale = 1, dir = 1) {
  let a = shape([[-14, 0], [-14, -14], [-8, -14], [-8, -6], [8, -6], [8, -14], [14, -14], [14, 0]], false, 1.6);
  a += shape([[-4, -8], [-1, -16], [2, -8]]) + shape([[1, -8], [4, -14], [6, -8]]);
  a += circle(0, -24, 9, false, 1.6) + line([[-6, -32], [6, -32]], 1.4);
  a += line([[2, -36], [-4, -48], [4, -58], [-2, -70]], 1.1, 0.7);
  a += seated(-36, 0, 0.95, 1, 1);
  return group(x, y, scale, a, dir);
}

/** Two women pounding grain in one mortar, pestles rising and falling in turn. */
export function pounding(x, y, scale = 1, v = 0, m1 = {}, m2 = {}) {
  let a = person(-14, 0, 1, 'pound', 1, v, { ...m1, mortar: false });
  a += person(14, 0, 1, 'pound', -1, v + 1, { ...m2, mortar: false, raise: 14 });
  a += shape([[-11, -14], [11, -14], [7, 0], [-7, 0]], false, 1.6) + line([[-9, -9], [9, -9]], 0.8);
  return group(x, y, scale, a);
}

/** The threshing floor (khala): a ring of stones around beaten earth, a pole at the centre, bullocks
 *  yoked to it treading the sheaves, and a farmer driving them round. */
export function threshing(x, y, scale, rng, pose, motion, d = 1) {
  const rx = 100, ry = 26, cy = -28;
  let a = '';
  for (let i = 0; i < 40; i++) { const t = (i / 40) * Math.PI * 2; a += ellipse(Math.cos(t) * rx, cy + Math.sin(t) * ry, 3.2, 2, true, 0.5, (t * 180) / Math.PI + 90); }
  for (let i = 0; i < 26; i++) {
    const t = rng() * Math.PI * 2, r = Math.sqrt(rng()) * 0.8;
    const sx = Math.cos(t) * rx * r, sy = cy + Math.sin(t) * ry * r, k = rng() - 0.5;
    a += line([[sx, sy], [sx + 7 + k * 4, sy - 3 + k * 3]], 0.9, 0.7);
  }
  a += line([[0, cy + 2], [1, cy - 72]], 2) + circle(1, cy - 74, 2.2);
  const oxen = [[-46, -10, 0.5], [-4, -4, 0.54], [38, -8, 0.5]];
  for (const [bx, by, s] of oxen) {
    a += line([[0, cy - 30], [bx + 22 * s * d, by - 40 * s]], 0.8, 0.8);
    a += bullock(bx, by, s, d, { hatch: false, pose: pose && { ...pose, phase: pose.phase + bx * 0.05 } });
  }
  a += person(d > 0 ? -86 : 86, -4, 0.66, 'herd', d, 1, motion);
  return group(x, y, scale, a);
}

/** A row of field-edge stones laid along a closed outline, as painted around fields and floors. */
export function stones(poly, gap = 7) {
  let a = '';
  for (let i = 0; i < poly.length; i++) {
    const [x0, y0] = poly[i], [x1, y1] = poly[(i + 1) % poly.length];
    const len = Math.hypot(x1 - x0, y1 - y0), deg = (Math.atan2(y1 - y0, x1 - x0) * 180) / Math.PI;
    for (let d = gap / 2; d < len; d += gap) a += ellipse(x0 + ((x1 - x0) * d) / len, y0 + ((y1 - y0) * d) / len, 2.9, 1.9, true, 0.5, deg);
  }
  return a;
}

/* ---------- plants ---------- */

/** A branching tree with leaf triplets at every twig, on a trunk that leans its own way. */
export function tree(x, y, scale, rng) {
  const art = bend(lean(rng, 170), () => {
    let art = shape([[-8, 0], [-4, -106], [2, -168], [7, -96], [10, 0]], false, 2);
    function branch(bx, by, length, angle, depth) {
      const ex = bx + Math.cos(angle) * length;
      const ey = by + Math.sin(angle) * length;
      art += line([[bx, by], [(bx + ex) / 2 + (rng() - 0.5) * 6, (by + ey) / 2], [ex, ey]], Math.max(0.8, depth * 0.65));
      if (depth > 0) {
        branch(ex, ey, length * (0.64 + rng() * 0.09), angle - 0.55 - rng() * 0.18, depth - 1);
        branch(ex, ey, length * (0.65 + rng() * 0.1), angle + 0.5 + rng() * 0.18, depth - 1);
      } else {
        for (let i = 0; i < 3; i++) {
          const t = angle + (i - 1) * 0.8;
          art += leaf(ex + Math.cos(t) * 9, ey + Math.sin(t) * 9, t);
        }
      }
    }
    for (let i = 0; i < 5; i++) {
      const by = -69 - i * 23;
      branch(0, by, 47 + rng() * 16, -2.4 - rng() * 0.15, 2);
      branch(3, by - 4, 50 + rng() * 17, -0.65 + rng() * 0.15, 2);
    }
    branch(1, -160, 30, -Math.PI / 2, 2);
    for (let i = -13; i <= 13; i += 6) art += line([[0, -4], [i * 1.5, 5]], 1.3);
    return art;
  });
  return group(x, y, scale, art);
}

/** A rounded mango or banyan-like tree: forked trunk under a dome of leaves. */
export function leafyTree(x, y, scale, rng) {
  const a = bend(lean(rng, 120, 0.7), () => {
    let a = shape([[-9, 0], [-5, -70], [5, -70], [10, 0]], false, 2);
    a += line([[-4, -66], [-30, -104]], 2) + line([[4, -66], [34, -100]], 2) + line([[0, -70], [2, -120]], 2);
    for (let i = 0; i < 70; i++) {
      const t = rng() * Math.PI * 2, r = Math.sqrt(rng());
      const lx = Math.cos(t) * r * 66, ly = -112 + Math.sin(t) * r * 46;
      a += leaf(lx, ly, rng() * Math.PI, 6.5, 2.6);
    }
    for (let i = -13; i <= 13; i += 6) a += line([[0, -4], [i * 1.5, 5]], 1.3);
    return a;
  });
  return group(x, y, scale, a);
}

/** Fishbone tree: a stem with paired, sagging fronds of leaf strokes, common on Warli walls. */
export function fernTree(x, y, scale, rng) {
  const sag = 0.2 + rng() * 0.5;
  const a = bend(lean(rng, 150), () => {
    let a = line([[0, 0], [0, -150]], 2.2);
    for (let i = 0; i < 9; i++) {
      const by = -30 - i * 14, len = 50 - i * 4.5 + rng() * 6;
      for (const s of [-1, 1]) {
        // a frond rises, then bows under its own weight
        const pts = Array.from({ length: 7 }, (_, k) => { const t = k / 6; return [s * len * t, by - len * 0.55 * t + sag * len * t * t * 0.9]; });
        a += line(pts, 1.3);
        for (let k = 1; k < 6; k++) {
          const [px, py] = pts[k];
          a += line([[px, py], [px + s * 4, py - 9 + sag * 4]], 1) + line([[px, py], [px + s * 9, py + 2 + sag * 3]], 1);
        }
      }
    }
    return a;
  });
  return group(x, y, scale, a);
}

export function palm(x, y, scale, climber = false, rng = null) {
  const warp = rng ? lean(rng, 170, 1.8) : null;
  let a = bend(warp, () => {
    let a = shape([[-5, 0], [8, -168], [12, -170], [4, 0]], false, 2);
    for (let j = 0; j < 9; j++) a += line([[-3 + j * 0.8, -j * 17], [5 + j * 0.7, -j * 17 - 6]], 1);
    for (let i = 0; i < 7; i++) {
      const t = -Math.PI + (i * Math.PI) / 6;
      const end = [10 + Math.cos(t) * 83, -170 + Math.sin(t) * 50 + 23];
      const mid = [10 + Math.cos(t) * 40, -183 + Math.sin(t) * 48];
      a += line([[10, -170], mid, end], 2);
      for (let s = 0.2; s < 1; s += 0.13) {
        const px = 10 + (end[0] - 10) * s;
        const py = -170 + (end[1] + 170) * s - Math.sin(s * Math.PI) * 23;
        a += line([[px - 6, py + 13], [px, py], [px + 6, py + 13]], 1.5);
      }
    }
    a += circle(5, -165, 4, false) + circle(16, -162, 4, false);
    if (climber) {
      a += circle(14, -150, 5, false, 1.3) + line([[12, -158], [10, -170]], 0.9); // toddy pot
      a += line([[-12, -112], [0, -118], [12, -112]], 1);
    }
    return a;
  });
  if (climber) {
    const [cx, cy] = warp ? warp(-8, -78) : [-8, -78], [ux, uy] = warp ? warp(-8, -90) : [-8, -90];
    a += turned(cx, cy, 1, (Math.atan2(ux - cx, -(uy - cy)) * 180) / Math.PI, person(0, 0, 0.82, 'climb', 1, 0));
  }
  return group(x, y, scale, a);
}

export function crop(x, y, scale = 1) {
  let a = line([[0, 0], [1, -30]], 1.1);
  for (let i = 0; i < 4; i++) a += line([[-7, -12 - i * 6], [0, -7 - i * 6], [7, -14 - i * 6]], 1.1);
  return group(x, y, scale, a);
}

/** Ripe grain: tall stalks with heavy, bowing heads. */
export function grain(x, y, scale = 1) {
  let a = line([[0, 0], [2, -34], [8, -40]], 1.1) + line([[0, -10], [-6, -20]], 1);
  for (let i = 0; i < 5; i++) a += ellipse(4 + i * 1.6, -36 - i * 2.8 + i * i * 0.5, 2.6, 1.3, true, 0.5, -30);
  return group(x, y, scale, a);
}

/** Young paddy seedlings in standing water. */
export function paddy(x, y, scale = 1) {
  return group(x, y, scale, line([[-4, -12], [0, 0], [4, -12]], 1) + line([[0, 0], [0, -14]], 1) + line([[-6, 1], [6, 1]], 0.7, 0.5));
}

export function grass(x, y, scale = 1) {
  return group(x, y, scale, line([[-7, -5], [0, 0], [-3, -13]], 1.1) + line([[0, 0], [5, -10], [8, -8]], 1.1));
}

export function flower(x, y, scale = 1) {
  let a = line([[0, 0], [0, -14]], 1) + circle(0, -17, 1.6);
  for (let i = 0; i < 6; i++) {
    const t = (i * Math.PI) / 3;
    a += circle(Math.cos(t) * 4, -17 + Math.sin(t) * 4, 1.5);
  }
  return group(x, y, scale, a);
}

/* ---------- land and sky ---------- */

/** A range of hills, each one brush stroke up and one down with a softened peak. A range is painted one
 *  way throughout: outlined with hatching, filled solid, ringed with inner contours, or dotted. */
export function mountains(x0, width, baseY, rng, peaks = []) {
  const r = rng();
  const style = r < 0.3 ? 'hatch' : r < 0.55 ? 'solid' : r < 0.82 ? 'contour' : 'dots';
  let a = '';
  let x = x0;
  while (x < x0 + width) {
    const w = 50 + rng() * 110, h = 22 + rng() * 75;
    const px = x + w / 2 + (rng() - 0.5) * 16, py = baseY - h;
    const soft = 2 + rng() * 5;
    peaks.push({ x: px, y: py, left: x, right: x + w, base: baseY });
    const peak = [[px - soft, py + soft * 1.1], [px - soft * 0.35, py + 0.4], [px + soft * 0.4, py + 0.3], [px + soft, py + soft * 1.2]];
    a += style === 'solid' ? shape([[x, baseY], ...peak, [x + w, baseY]], true, 1.1) : line([[x, baseY], ...peak, [x + w, baseY]], 1.4);
    if (style === 'hatch') for (let t = 0.2; t < 0.95; t += 0.15) a += line([[x + (px - x) * t + 4, baseY - h * t + 6], [x + (px - x) * t + 12, baseY - 2]], 0.8, 0.6);
    if (style === 'contour' || style === 'dots') {
      for (let k = 1; k * 11 < h * 0.8; k++) {
        const inset = k * 11, kx = (inset * w) / (2 * h);
        const ring = [[x + kx * 1.6, baseY], [px, py + inset], [x + w - kx * 1.6, baseY]];
        if (style === 'contour') a += line(ring, 0.9, 0.75);
        else for (let t = 0.1; t < 1; t += 0.12) {
          const [ax, ay] = t < 0.5 ? ring[0] : ring[1], [bx, by] = t < 0.5 ? ring[1] : ring[2], u = t < 0.5 ? t * 2 : t * 2 - 1;
          a += circle(ax + (bx - ax) * u, ay + (by - ay) * u, 1.2);
        }
      }
    }
    x += w * (0.55 + rng() * 0.3);
  }
  return a;
}

export function sun(x, y, r = 20) {
  let a = circle(0, 0, r, false, 1.5) + circle(0, 0, r * 0.8, false, 0.8);
  for (let i = 0; i < 18; i++) {
    const t = (i * Math.PI) / 9;
    a += line([[Math.cos(t) * (r + 6), Math.sin(t) * (r + 6)], [Math.cos(t) * (r + 11), Math.sin(t) * (r + 11)]], 1.1);
  }
  return group(x, y, 1, a);
}

export function moon(x, y, r = 18) {
  const outer = arcPts(0, 0, r, r, -Math.PI / 2, Math.PI / 2, 14);
  const inner = arcPts(-r * 0.45, 0, r * 0.82, r, Math.PI / 2, -Math.PI / 2, 14);
  return group(x, y, 1, shape([...outer, ...inner], true, 0.8));
}

export function star(x, y, r = 3) {
  return line([[x - r, y], [x + r, y]], 0.9) + line([[x, y - r], [x, y + r]], 0.9);
}

/* ---------- sacred places ---------- */

/** A small oil lamp (diya). */
export function lamp(x, y, scale = 1) {
  return group(x, y, scale, shape([[-6, 0], [6, 0], [4, -4], [-4, -4]], false, 1.2) + shape([[0, -4], [-2.4, -8], [0, -14], [2.4, -8]]));
}

/** Waghoba, the tiger guardian: a carved wooden post with a tiger panel, sun and moon, and offering stones. */
export function waghobaPost(x, y, scale = 1) {
  let a = shape([[-6, 0], [-6, -126], [6, -126], [6, 0]], false, 1.8);
  for (let i = -112; i < -10; i += 9) a += line([[-6, i], [6, i + 5]], 0.8, 0.6);
  a += shape([[-28, -58], [28, -58], [28, -98], [-28, -98]], false, 1.8);
  a += tiger(2, -64, 0.36);
  a += circle(-10, -142, 4, false, 1.1) + moon(10, -142, 5.5);
  for (let i = 0; i < 8; i++) { const t = (i * Math.PI) / 4; a += line([[-10 + Math.cos(t) * 6, -142 + Math.sin(t) * 6], [-10 + Math.cos(t) * 9, -142 + Math.sin(t) * 9]], 0.9); }
  a += shape([[-14, -126], [14, -126], [0, -134]], false, 1.2);
  for (const [sx, r] of [[-20, 6], [-9, 4.5], [14, 5.5], [24, 4]]) a += ellipse(sx, -r * 0.6, r, r * 0.7, true, 0.6);
  return group(x, y, scale, a);
}

/** A village shrine with a stepped spire and flag, Waghoba seated inside, lamps on the step. */
export function shrine(x, y, scale = 1) {
  let a = shape([[-52, 0], [52, 0], [48, -9], [-48, -9]], false, 1.8) + line([[-44, -4], [44, -4]], 0.8, 0.7);
  a += shape([[-36, -9], [36, -9], [36, -66], [-36, -66]], false, 2);
  a += line([[-19, -9], ...arcPts(0, -44, 19, 22, Math.PI, 2 * Math.PI, 12), [19, -9]], 1.7);
  a += tiger(1, -12, 0.27);
  for (let i = -30; i <= 30; i += 10) if (Math.abs(i) > 20) a += line([[i, -14], [i, -60]], 0.8, 0.6);
  a += shape([[-42, -66], [42, -66], [34, -78], [-34, -78]], false, 1.8);
  a += shape([[-30, -78], [30, -78], [0, -128]], false, 1.9);
  for (let k = 1; k < 4; k++) { const t = k / 4, h = -78 - t * 50, half = 30 * (1 - t); a += line([[-half, h], [half, h]], 1); }
  a += circle(0, -132, 4, false, 1.4) + line([[0, -136], [0, -162]], 1.4) + shape([[0, -162], [24, -155], [0, -148]]);
  for (let i = -24; i < 28; i += 8) a += shape([[i, -66], [i + 4, -61], [i + 8, -66]], false, 0.8);
  a += lamp(-44, -9, 0.9) + lamp(44, -9, 0.9);
  return group(x, y, scale, a);
}

/** A string of mango leaves (toran) hung between two points. */
export function toran(x0, y0, x1, y1, sag = 16) {
  const pts = Array.from({ length: 13 }, (_, i) => { const t = i / 12; return [x0 + (x1 - x0) * t, y0 + (y1 - y0) * t + Math.sin(t * Math.PI) * sag]; });
  let a = line(pts, 1);
  for (const [px, py] of pts.slice(1, -1)) a += shape([[px - 3, py], [px + 3, py], [px, py + 10]]);
  return a;
}

/* ---------- more wildlife ---------- */

export function elephant(x, y, scale = 1, dir = 1, pose) {
  const a = posed(RIGS.elephant, pose, () => {
    let a = shape([[-46, -30], [-44, -62], [-18, -76], [18, -74], [38, -60], [40, -30]], false, 2);
    a += circle(46, -60, 15, false, 1.8) + circle(50, -64, 1.4);
    a += shape([[36, -70], [26, -52], [38, -42]], false, 1.5);
    a += line([[58, -56], [64, -36], [62, -14], [70, -8]], 3) + line([[54, -48], [66, -44]], 2);
    for (const px of [-40, -24, 12, 26]) a += shape([[px, -32], [px + 11, -32], [px + 11, 0], [px, 0]], false, 1.7);
    a += line([[-46, -52], [-52, -32]], 1.4);
    for (let r = 0; r < 3; r++) for (let i = -34 + r * 4; i < 30; i += 10) a += circle(i, -64 + r * 11, 1.2);
    return a;
  });
  return group(x, y, scale, a, dir);
}

export function boar(x, y, scale = 1, dir = 1, pose) {
  const a = posed(RIGS.boar, pose, () => {
    let a = shape([[-26, -14], [-22, -30], [8, -34], [22, -24], [30, -16], [20, -12], [-20, -10]], false, 1.8);
    for (let i = -20; i < 12; i += 5) a += line([[i, -31], [i + 2, -37]], 1);
    a += circle(14, -24, 1.1) + line([[24, -16], [28, -24]], 1.4);
    for (const px of [-18, -10, 10, 16]) a += line([[px, -11], [px, 0]], 1.8);
    a += line([[-26, -16], [-31, -12], [-29, -8]], 1.2);
    return a;
  });
  return group(x, y, scale, a, dir);
}

export function jackal(x, y, scale = 1, dir = 1, pose) {
  const a = posed(RIGS.jackal, pose, () => {
    let a = shape([[-18, -24], [12, -25], [15, -16], [-15, -15]], false, 1.6);
    a += shape([[11, -25], [17, -34], [30, -27], [18, -21]], false, 1.4) + shape([[15, -32], [16, -40], [20, -33]]);
    a += shape([[-18, -24], [-30, -18], [-34, -8], [-26, -14]]);
    for (const px of [-14, -9, 7, 11]) a += line([[px, -16], [px + 1, -7], [px - 1, 0]], 1.5);
    return a;
  });
  return group(x, y, scale, a, dir);
}

export function hare(x, y, scale = 1, dir = 1, pose) {
  const a = posed(RIGS.hare, pose, () => {
    let a = ellipse(0, -9, 11, 7, true, 0.8) + circle(11, -14, 4.5);
    a += ellipse(9, -25, 2.2, 8, true, 0.6, -12) + ellipse(14, -24, 2.2, 8, true, 0.6, 14);
    a += circle(-11, -10, 3, false, 1) + line([[-4, -3], [-8, 0], [2, 0]], 1.2) + line([[6, -3], [8, 0]], 1.2);
    return a;
  });
  return group(x, y, scale, a, dir);
}

export function squirrel(x, y, scale = 1, dir = 1) {
  let a = ellipse(0, -7, 7, 4.5, true, 0.6) + circle(7, -10, 3) + shape([[7, -13], [8, -17], [10, -13]]);
  a += shape([[-6, -8], [-14, -12], [-17, -24], [-12, -31], [-6, -27], [-9, -18]]);
  return group(x, y, scale, a, dir);
}

export function owl(x, y, scale = 1) {
  let a = ellipse(0, -14, 9, 13, false, 1.6) + circle(-4, -20, 3.4, false, 1) + circle(4, -20, 3.4, false, 1);
  a += circle(-4, -20, 1.2) + circle(4, -20, 1.2) + shape([[-1.5, -16], [1.5, -16], [0, -12]]);
  a += line([[-8, -25], [-7, -31], [-3, -26]], 1.1) + line([[8, -25], [7, -31], [3, -26]], 1.1);
  for (let i = -4; i <= 4; i += 4) a += line([[i - 2, -8], [i, -5], [i + 2, -8]], 0.8);
  a += line([[-14, 0], [14, 0]], 1.6);
  return group(x, y, scale, a);
}

export function parrot(x, y, scale = 1, dir = 1) {
  let a = ellipse(0, -10, 5, 9, true, 0.6, 20) + circle(3, -21, 3.6) + line([[6, -22], [9, -19], [6, -17]], 1.3);
  a += line([[-3, -2], [-10, 14]], 1.4) + line([[-1, -2], [-6, 15]], 1.1) + line([[-14, 0], [12, 0]], 1.6);
  return group(x, y, scale, a, dir);
}

/** A nest in a fork, with two hungry chicks. */
export function nest(x, y, scale = 1) {
  let a = line(arcPts(0, -6, 12, 7, 0, Math.PI, 8), 1.6) + line([[-12, -6], [12, -6]], 1.1);
  for (let i = -9; i < 10; i += 4) a += line([[i, -6], [i + 3, -1]], 0.7);
  a += circle(-4, -10, 2.4) + circle(4, -11, 2.4) + line([[-4, -12], [-3, -15]], 0.9) + line([[4, -13], [5, -16]], 0.9);
  return group(x, y, scale, a);
}

export function butterfly(x, y, scale = 1) {
  let a = line([[0, -6], [0, 6]], 1.4) + line([[0, -6], [-3, -11]], 0.8) + line([[0, -6], [3, -11]], 0.8);
  a += shape([[0, -2], [-12, -9], [-10, 1]]) + shape([[0, -2], [12, -9], [10, 1]]);
  a += shape([[0, 1], [-8, 7], [-3, 9]], false, 1) + shape([[0, 1], [8, 7], [3, 9]], false, 1);
  return group(x, y, scale, a);
}

export function frog(x, y, scale = 1, dir = 1) {
  let a = ellipse(0, -6, 8, 5, true, 0.6) + circle(4, -11, 2, false, 1) + circle(-2, -11, 2, false, 1);
  a += line([[-6, -4], [-12, -8], [-14, 0], [-18, 0]], 1.2) + line([[6, -4], [10, -1], [12, 0]], 1.2);
  return group(x, y, scale, a, dir);
}

export function turtle(x, y, scale = 1, dir = 1) {
  let a = shape(arcPts(0, 0, 16, 11, Math.PI, 2 * Math.PI, 10), false, 1.6);
  a += line([[-8, -1], [-4, -9], [4, -9], [8, -1]], 0.9) + line([[-4, -9], [0, -11], [4, -9]], 0.9);
  a += circle(20, -4, 3.4) + line([[-12, 0], [-15, 3]], 1.4) + line([[12, 0], [15, 3]], 1.4) + line([[-16, -2], [-20, -1]], 1);
  return group(x, y, scale, a, dir);
}

export function scorpion(x, y, scale = 1, dir = 1) {
  let a = ellipse(0, -3, 7, 3.4, true, 0.6);
  a += line([[-6, -3], [-12, -6], [-15, -12], [-12, -17], [-7, -16]], 1.6) + shape([[-7, -16], [-4, -14], [-7, -13]]);
  for (const i of [-3, 0, 3]) a += line([[i, -2], [i - 2, 2]], 0.9);
  a += line([[6, -4], [12, -7], [14, -4]], 1.1) + line([[6, -2], [12, 1], [15, -1]], 1.1);
  return group(x, y, scale, a, dir);
}
