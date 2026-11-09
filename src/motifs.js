// Warli-inspired motifs, drawn from triangles, circles and lines.
// Every motif's origin is where it touches the ground; it faces +x unless flipped with `dir = -1`.

/* ---------- drawing primitives ---------- */

const S = { wobble: 0, weight: 1, rng: () => 0.5 };
/** wobble: hand-drawn jitter (0–1). weight: stroke multiplier. rng: stream that only feeds the jitter. */
export function setStyle(next) { Object.assign(S, next); }
export function getStyle() { return { ...S }; }

const f = n => Number(n.toFixed(2));
const jit = () => (S.wobble ? (S.rng() - 0.5) * S.wobble * 2.6 : 0);
const coords = pts => pts.map(([x, y]) => `${f(x + jit())},${f(y + jit())}`).join(' ');
const sw = w => f(w * S.weight);
const op = o => (o < 1 ? ` opacity="${o}"` : '');

export const line = (pts, w = 1.6, o = 1) =>
  `<polyline points="${coords(pts)}" fill="none" stroke="currentColor" stroke-width="${sw(w)}"${op(o)} stroke-linecap="round" stroke-linejoin="round"/>`;
export const shape = (pts, fill = true, w = 1.5, o = 1) =>
  `<polygon points="${coords(pts)}" fill="${fill ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="${sw(w)}"${op(o)} stroke-linejoin="round"/>`;
export const circle = (x, y, r, fill = true, w = 1.3) =>
  `<circle cx="${f(x + jit() * 0.4)}" cy="${f(y + jit() * 0.4)}" r="${f(r)}" fill="${fill ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="${sw(w)}"/>`;
export const ellipse = (x, y, rx, ry, fill = false, w = 1.5, rot = 0) =>
  `<ellipse cx="${f(x)}" cy="${f(y)}" rx="${f(rx)}" ry="${f(ry)}"${rot ? ` transform="rotate(${f(rot)} ${f(x)} ${f(y)})"` : ''} fill="${fill ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="${sw(w)}"/>`;
export const group = (x, y, scale, content, dir = 1, o = 1) =>
  `<g transform="translate(${f(x)} ${f(y)}) scale(${f(scale * dir)} ${f(scale)})"${op(o)}>${content}</g>`;

/** Points along an ellipse arc from angle a0 to a1 (radians). */
export function arcPts(cx, cy, rx, ry, a0, a1, n = 12) {
  return Array.from({ length: n + 1 }, (_, i) => {
    const a = a0 + ((a1 - a0) * i) / n;
    return [cx + Math.cos(a) * rx, cy + Math.sin(a) * ry];
  });
}
const leaf = (x, y, a, rx = 8, ry = 3.3) => ellipse(x, y, rx, ry, true, 0.6, (a * 180) / Math.PI);

/* ---------- people ---------- */

const ARMS = {
  walk: [[[-17, -36], [-25, -39]], [[16, -44], [23, -52]]],
  hold: [[[-15, -45], [-22, -48]], [[15, -45], [22, -48]]],
  dance: [[[-18, -41], [-28, -47]], [[18, -41], [28, -47]]],
  carry: [[[-17, -60], [-12, -73]], [[17, -60], [12, -73]]],
  pot: [[[-12, -62], [-6, -74]], [[12, -62], [6, -74]]],
  drum: [[[-16, -37], [0, -32]], [[21, -40], [13, -32]]],
  tarpa: [[[-2, -44], [12, -52]], [[16, -47], [24, -50]]],
  well: [[[-2, -62], [6, -73]], [[13, -60], [8, -73]]],
  pound: [[[2, -62], [10, -73]], [[16, -58], [10, -68]]],
  net: [[[14, -46], [30, -52]], [[18, -52], [30, -54]]],
  bow: [[[10, -52], [20, -52]], [[22, -52], [34, -52]]],
  herd: [[[-17, -36], [-24, -38]], [[16, -42], [22, -38]]],
  baby: [[[-10, -40], [-2, -38]], [[16, -44], [22, -50]]],
  climb: [[[-6, -62], [-2, -73]], [[8, -62], [4, -73]]],
};

export function person(x, y, scale = 1, pose = 'walk', dir = 1, v = 0) {
  const bend = ['farm', 'sickle', 'sow'].includes(pose) ? 14 : 0;
  let a = circle(bend * 0.9, -64, 5.4) + line([[bend * 0.8, -58], [bend * 0.6, -54]], 2);
  if (v % 2 && pose !== 'tarpa') a += circle(bend * 0.9 - 6, -65.5, 2.5); // hair knot
  a += shape([[-9 + bend, -53], [9 + bend, -53], [0, -37]]) + shape([[0, -37], [-10, -20], [10, -20]]);
  const g = 5 + (v % 3) * 3;
  if (pose === 'climb') a += line([[-5, -20], [-13, -28], [-4, -34]], 2) + line([[5, -20], [12, -10], [4, -4]], 2);
  else if (pose === 'hold' || pose === 'dance') a += line([[-5, -20], [-11, -10], [-9, 0]], 2) + line([[5, -20], [g + 4, -11], [g + 8, -3]], 2);
  else a += line([[-5, -20], [-g, -8], [-g - 3, 0]], 2) + line([[5, -20], [g, -9], [g + 5, -2]], 2);

  const L = [bend - 7, -50], R = [bend + 7, -50];
  if (bend) {
    // bent over the ground
    if (pose === 'farm') {
      a += line([L, [23, -30], [34, -25]], 2) + line([R, [32, -35], [34, -25]], 2);
      a += line([[35, -36], [29, 6], [40, 6]], 1.7);
    } else if (pose === 'sickle') {
      a += line([L, [20, -30], [26, -22]], 2) + line([R, [30, -36], [33, -24]], 2);
      a += line([[33, -24], [39, -30], [44, -24], [39, -17]], 1.4);
      for (let i = 0; i < 4; i++) a += line([[21 + i * 3, -2], [22 + i * 4, -22]], 1);
    } else {
      a += line([L, [4, -40], [8, -34]], 2) + shape([[2, -38], [14, -38], [12, -30], [4, -30]], false, 1.2);
      a += line([R, [28, -40], [34, -32]], 2);
      for (const [dx, dy] of [[38, -22], [42, -13], [34, -9], [45, -4]]) a += circle(dx, dy, 1.1);
    }
  } else {
    const [[l1, l2], [r1, r2]] = ARMS[pose] || ARMS.walk;
    a += line([L, l1, l2], 2) + line([R, r1, r2], 2);
  }

  if (pose === 'dance') a += line([[-3, -70], [3, -70]], 1.3);
  if (pose === 'carry') {
    a += shape([[-17, -78], [17, -78], [11, -70], [-11, -70]], false);
    for (let i = -11; i <= 11; i += 5) a += line([[i, -78], [i + 1, -87], [i + 4, -84]], 1.2);
  }
  if (pose === 'pot') {
    a += circle(0, -80, 6.5, false, 1.5) + line([[-3, -87], [3, -87]], 1.4);
    if (v % 2) a += circle(0, -93, 4.6, false, 1.3);
  }
  if (pose === 'drum') {
    a += shape([[-4, -37], [18, -37], [18, -23], [-4, -23]], false);
    for (let i = -3; i < 18; i += 6) a += line([[i, -36], [i + 5, -24]], 1);
  }
  if (pose === 'tarpa') {
    a += line([[5, -62], [22, -55], [38, -44]], 2.4) + shape([[36, -48], [50, -32], [33, -38]], false, 1.4);
    a += line([[40, -42], [46, -36]], 1);
  }
  if (pose === 'pound') {
    a += line([[10, -90], [10, -12]], 2.4);
    a += shape([[1, -12], [19, -12], [15, 0], [5, 0]], false, 1.5);
  }
  if (pose === 'net') {
    for (const end of [[46, -12], [56, -24], [62, -40]]) a += line([[30, -53], end], 1);
    a += line([[40, -32], [48, -36], [54, -46]], 0.8) + line([[38, -20], [50, -26], [58, -34]], 0.8);
    a += line([[46, -12], [56, -24], [62, -40]], 1.1);
  }
  if (pose === 'bow') {
    a += line(arcPts(30, -52, 8, 20, -Math.PI / 2, Math.PI / 2, 8), 1.6);
    a += line([[30, -72], [24, -52], [30, -32]], 0.8);
    a += line([[22, -52], [56, -52]], 1.1) + shape([[56, -55], [62, -52], [56, -49]]);
  }
  if (pose === 'herd') a += line([[20, -58], [27, 0]], 1.6);
  if (pose === 'baby') a += circle(-11, -50, 3.2) + shape([[-15, -46], [-7, -46], [-11, -37]]);
  return group(x, y, scale, a, dir);
}

/** A figure sitting on the ground, reaching forward. Used for grinding, cooking and resting. */
export function seated(x, y, scale = 1, dir = 1, v = 0) {
  let a = circle(0, -48, 5) + line([[0, -43], [0, -40]], 2);
  if (v % 2) a += circle(-5.5, -49.5, 2.3);
  a += shape([[-8, -39], [8, -39], [0, -25]]) + shape([[0, -25], [-9, -10], [9, -10]]);
  a += line([[-6, -10], [10, -6], [16, 0]], 2) + line([[4, -10], [-4, -3], [8, 0]], 2);
  a += line([[6, -37], [16, -28], [22, -22]], 2) + line([[-6, -37], [-4, -27], [8, -24]], 2);
  return group(x, y, scale, a, dir);
}

/* ---------- animals ---------- */

/** Humped cow or bullock with lyre horns. */
export function bullock(x, y, scale = 1, dir = 1, opts = {}) {
  const { calf = false, hatch = true } = opts;
  let a = shape([[-34, -40], [18, -41], [24, -26], [-30, -23]], false, 2);
  a += shape([[3, -40], [10, -51], [18, -41]], true, 1.2); // hump
  a += shape([[18, -42], [30, -45], [41, -32], [35, -27], [24, -31]], false, 1.7);
  a += circle(31, -39, 1.1) + line([[30, -30], [28, -23]], 1.2);
  a += line([[26, -44], [19, -47]], 1.3);
  if (!calf) a += line([[27, -45], [23, -55], [29, -61]], 1.7) + line([[32, -45], [37, -55], [44, -57]], 1.7);
  for (const px of [-27, -19, 13, 20]) a += line([[px, -24], [px + 1, -11], [px - 1, 0], [px + 3, 0]], 1.8);
  a += line([[-33, -38], [-40, -26], [-41, -13]], 1.4) + shape([[-44, -15], [-38, -15], [-41, -7]]);
  if (hatch) for (let i = -26; i < 15; i += 6) a += line([[i, -38], [i + 3, -26]], 1, 0.55);
  return group(x, y, scale, a, dir);
}

export function goat(x, y, scale = 1, dir = 1) {
  let a = shape([[-20, -28], [12, -29], [15, -18], [-17, -16]], false, 1.7);
  a += shape([[11, -29], [20, -40], [28, -33], [22, -26]], false, 1.5) + circle(21, -35, 0.9);
  a += line([[19, -39], [13, -46], [10, -42]], 1.4) + line([[26, -30], [27, -24]], 1.1);
  a += line([[-20, -27], [-25, -34]], 1.5);
  for (const px of [-15, -9, 7, 12]) a += line([[px, -17], [px + 1, -7], [px, 0]], 1.5);
  for (let i = -15; i < 10; i += 5) a += line([[i, -27], [i + 2, -18]], 0.9, 0.55);
  return group(x, y, scale, a, dir);
}

export function dog(x, y, scale = 1, dir = 1) {
  let a = shape([[-18, -22], [12, -23], [14, -16], [-16, -15]], true, 1);
  a += shape([[11, -23], [17, -32], [26, -26], [17, -20]], true, 1);
  a += shape([[15, -30], [16, -37], [19, -31]]);
  a += line([[-18, -22], [-24, -30], [-20, -34]], 1.6);
  for (const px of [-14, -9, 7, 11]) a += line([[px, -16], [px + 1, -7], [px - 1, 0]], 1.6);
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

export function horse(x, y, scale = 1, dir = 1, rider = false) {
  let a = shape([[-34, -44], [18, -44], [22, -30], [-30, -28]], false, 2);
  a += shape([[16, -44], [28, -72], [42, -64], [38, -58], [28, -58], [24, -36]], false, 1.7);
  a += circle(34, -66, 1.1) + shape([[27, -73], [26, -80], [31, -74]]);
  for (let i = 0; i < 5; i++) a += line([[19 + i * 2, -48 - i * 5], [14 + i * 2, -45 - i * 5]], 1.2);
  for (const px of [-28, -19, 11, 18]) a += line([[px, -29], [px + 3, -14], [px, 0]], 1.8);
  a += line([[-34, -42], [-46, -30], [-44, -12]], 2) + line([[-34, -40], [-42, -24]], 1.2);
  if (rider) {
    a += shape([[-14, -44], [8, -44], [6, -36], [-12, -36]], false, 1);
    for (let i = -12; i < 8; i += 4) a += circle(i, -40, 1);
    a += group(-3, -22, 0.85, circle(0, -64, 5.4) + circle(0, -76, 4, false, 1.2) + shape([[-9, -53], [9, -53], [0, -37]]) + shape([[0, -37], [-9, -26], [9, -26]]) + line([[3, -28], [12, -14]], 2) + line([[7, -50], [18, -44], [26, -50]], 2));
  }
  return group(x, y, scale, a, dir);
}

export function tiger(x, y, scale = 1, dir = 1) {
  let a = shape([[-42, -34], [20, -36], [28, -24], [-38, -20]], false, 2);
  a += circle(34, -38, 11, false, 1.8) + circle(38, -40, 1.4) + circle(30, -40, 1.4);
  a += shape([[26, -47], [28, -54], [32, -48]], false, 1.2) + shape([[37, -48], [41, -54], [43, -46]], false, 1.2);
  a += line([[34, -34], [36, -31], [40, -33]], 1);
  for (let i = -36; i < 18; i += 5) a += shape([[i, -35], [i + 2.4, -35], [i + 3.6, -22], [i + 1.2, -22]], true, 0.4);
  for (const px of [-35, -27, 12, 20]) a += line([[px, -22], [px + 1, -10], [px - 1, 0], [px + 4, 0]], 2);
  a += line([[-42, -32], [-56, -38], [-64, -56], [-56, -66]], 1.8);
  return group(x, y, scale, a, dir);
}

export function deer(x, y, scale = 1, dir = 1) {
  let a = shape([[-28, -38], [16, -38], [20, -27], [-24, -24]], false, 1.8);
  a += shape([[14, -38], [24, -60], [34, -56], [28, -46], [20, -32]], false, 1.6) + circle(29, -55, 1.1);
  a += line([[25, -60], [20, -78], [13, -84]], 1.4) + line([[21, -73], [29, -80]], 1.4) + line([[18, -82], [24, -91]], 1.2);
  a += line([[-28, -36], [-32, -42]], 1.5);
  for (const px of [-22, -14, 10, 16]) a += line([[px, -25], [px + 2, -11], [px - 1, 0]], 1.6);
  for (const [dx, dy] of [[-18, -32], [-10, -34], [-4, -30], [4, -33], [-14, -28], [8, -29]]) a += circle(dx, dy, 1.3);
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
export function bullockCart(x, y, scale = 1, dir = 1, loaded = false) {
  let a = bullock(62, -5, 0.78, 1, { hatch: false }) + bullock(52, 0, 0.82, 1);
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
export function plough(x, y, scale = 1, dir = 1) {
  let a = bullock(10, -7, 0.88, 1, { hatch: false }) + bullock(0, 0, 0.92, 1);
  a += line([[26, -46], [42, -50]], 2.4);
  a += line([[32, -46], [-46, -6]], 2) + shape([[-50, -10], [-40, -3], [-54, 0]]);
  a += line([[-48, -8], [-62, -34]], 1.8);
  a += person(-74, 0, 0.92, 'walk', 1, 1);
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

export function hut(x, y, scale, rng, dir = 1) {
  let a = shape([[-70, -78], [0, -140], [78, -78]], false, 2.3);
  a += line([[-80, -72], [-70, -80], [77, -80], [88, -72]], 2);
  for (let i = -61; i < 73; i += 7) a += line([[i, -79], [i * 0.22, -140 + Math.abs(i) * 0.82 - 4]], 1.1, 0.9);
  a += shape([[-61, -74], [65, -74], [65, -3], [-61, -3]], false, 2.1);
  a += shape([[-13, -2], [-13, -48], [14, -48], [14, -2]], false, 2);
  a += shape([[28, -47], [49, -47], [49, -27], [28, -27]], false) + line([[38, -47], [38, -27]], 1) + line([[28, -37], [49, -37]], 1);
  a += line([[-67, 1], [72, 1]], 2);
  const wall = Math.floor(rng() * 3);
  if (wall === 0) for (let i = -52; i < -15; i += 9) a += line([[i, -65], [i, -11]], 1, 0.5);
  else if (wall === 1) for (let r = 0; r < 4; r++) for (let i = -54; i < -18; i += 8) a += circle(i + (r % 2) * 4, -60 + r * 13, 1.3);
  else for (let r = 0; r < 3; r++) a += line(Array.from({ length: 7 }, (_, i) => [-56 + i * 6, -58 + r * 16 + (i % 2) * 6]), 1, 0.7);
  for (let i = -57; i < 60; i += 12) a += shape([[i, -71], [i + 5, -63], [i + 10, -71]], false, 0.9);
  a += line([[40, -110], [40, -139], [42 + rng() * 7, -153]], 1.4);
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

/* ---------- plants ---------- */

export function tree(x, y, scale, rng) {
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
  return group(x, y, scale, art);
}

/** A rounded mango or banyan-like tree: forked trunk under a dome of leaves. */
export function leafyTree(x, y, scale, rng) {
  let a = shape([[-9, 0], [-5, -70], [5, -70], [10, 0]], false, 2);
  a += line([[-4, -66], [-30, -104]], 2) + line([[4, -66], [34, -100]], 2) + line([[0, -70], [2, -120]], 2);
  for (let i = 0; i < 70; i++) {
    const t = rng() * Math.PI * 2, r = Math.sqrt(rng());
    const lx = Math.cos(t) * r * 66, ly = -112 + Math.sin(t) * r * 46;
    a += leaf(lx, ly, rng() * Math.PI, 6.5, 2.6);
  }
  for (let i = -13; i <= 13; i += 6) a += line([[0, -4], [i * 1.5, 5]], 1.3);
  return group(x, y, scale, a);
}

/** Fishbone tree: a straight trunk with paired leaf strokes, common on Warli walls. */
export function fernTree(x, y, scale, rng) {
  let a = line([[0, 0], [0, -150]], 2.2);
  for (let i = 0; i < 9; i++) {
    const by = -30 - i * 14, len = 50 - i * 4.5 + rng() * 6;
    for (const s of [-1, 1]) {
      const end = [s * len, by - len * 0.55];
      a += line([[0, by], end], 1.3);
      for (let t = 0.25; t < 1; t += 0.22) {
        const px = end[0] * t, py = by + (end[1] - by) * t;
        a += line([[px, py], [px + s * 4, py - 9]], 1) + line([[px, py], [px + s * 9, py + 2]], 1);
      }
    }
  }
  return group(x, y, scale, a);
}

export function palm(x, y, scale, climber = false) {
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
    a += person(-8, -78, 0.82, 'climb', 1, 0);
    a += line([[-12, -112], [0, -118], [12, -112]], 1);
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

export function mountains(x0, width, baseY, rng) {
  let a = '';
  let x = x0;
  while (x < x0 + width) {
    const w = 50 + rng() * 110, h = 22 + rng() * 75;
    const peak = [x + w / 2 + (rng() - 0.5) * 16, baseY - h];
    a += line([[x, baseY], peak, [x + w, baseY]], 1.3);
    for (let t = 0.2; t < 0.95; t += 0.15) a += line([[x + (peak[0] - x) * t + 4, baseY - h * t + 6], [x + (peak[0] - x) * t + 12, baseY - 2]], 0.8, 0.6);
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

/** A tarpa dance: dancers linked hand to hand along a spiral around the tarpa player. */
export function tarpaDance(x, y, scale, rng, count) {
  const dancers = [];
  let t = 3.4;
  for (let i = 0; i < count; i++) {
    const r = 10 + t * 16;
    dancers.push({ px: Math.cos(t) * r * 1.2, py: Math.sin(t) * r * 0.36, t });
    t += 36 / r;
  }
  const maxY = Math.max(...dancers.map(d => Math.abs(d.py)), 1);
  for (const d of dancers) {
    d.s = scale * (0.7 + 0.22 * ((d.py + maxY) / (2 * maxY)));
    d.dir = -Math.sin(d.t) >= 0 ? 1 : -1;
  }
  let chain = '';
  for (let i = 0; i < dancers.length - 1; i++) {
    const a = dancers[i], b = dancers[i + 1];
    const side = Math.sign(b.px - a.px) || 1;
    chain += line([[a.px * scale + side * 22 * a.s, -48 * a.s + a.py * scale], [b.px * scale - side * 22 * b.s, -48 * b.s + b.py * scale]], 1.6);
  }
  const figures = [...dancers]
    .sort((a, b) => a.py - b.py)
    .map((d, i) => person(d.px * scale, d.py * scale, d.s, 'hold', d.dir, i % 4))
    .join('');
  const centre = person(-6 * scale, 4 * scale, scale * 0.95, 'tarpa', 1, 0);
  return group(x, y, 1, chain + figures + centre);
}
