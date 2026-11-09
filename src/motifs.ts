type Point = [number, number];
type RNG = () => number;
const f = (n: number) => Number(n.toFixed(2));
const coords = (points: Point[]) => points.map(p => p.map(f).join(',')).join(' ');
export const line = (points: Point[], width = 1.6, opacity = 1) => `<polyline points="${coords(points)}" fill="none" stroke="currentColor" stroke-width="${width}" opacity="${opacity}" stroke-linecap="round" stroke-linejoin="round"/>`;
export const shape = (points: Point[], fill = true, width = 1.5) => `<polygon points="${coords(points)}" fill="${fill ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="${width}" stroke-linejoin="round"/>`;
export const circle = (x: number, y: number, r: number, fill = true, width = 1.3) => `<circle cx="${f(x)}" cy="${f(y)}" r="${f(r)}" fill="${fill ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="${width}"/>`;
export const group = (x: number, y: number, scale: number, content: string, rotation = 0) => `<g transform="translate(${f(x)} ${f(y)}) rotate(${f(rotation)}) scale(${f(scale)})">${content}</g>`;

export function person(x: number, y: number, scale = 1, pose = 'walk', direction = 1, variation = 0): string {
  let art = circle(0, -64, 5.4) + line([[0, -58], [0, -54]], 2);
  const lean = pose === 'farm' ? 15 : 0;
  art += shape([[-9 + lean, -53], [9 + lean, -53], [0, -37]]) + shape([[0, -37], [-10, -20], [10, -20]]);
  const gait = 5 + variation * 3;
  art += line([[-5, -20], [-gait, -8], [-gait - 3, 0]], 2) + line([[5, -20], [gait, -9], [gait + 5, -2]], 2);
  if (pose === 'dance') {
    art += line([[-7, -50], [-18, -41], [-28, -47]], 2) + line([[7, -50], [18, -41], [28, -47]], 2);
    art += line([[-3, -70], [3, -70]], 1.3);
  } else if (pose === 'farm') {
    art += line([[lean - 7, -50], [23, -30], [34, -25]], 2) + line([[lean + 5, -50], [32, -35], [34, -25]], 2);
    art += line([[35, -36], [29, 6], [40, 6]], 1.7);
  } else if (pose === 'carry') {
    art += line([[-7, -50], [-17, -60], [-12, -73]], 2) + line([[7, -50], [17, -60], [12, -73]], 2);
    art += shape([[-17, -78], [17, -78], [11, -70], [-11, -70]], false);
    for (let i = -11; i <= 11; i += 5) art += line([[i, -78], [i + 1, -87], [i + 4, -84]], 1.2);
  } else if (pose === 'drum') {
    art += line([[-7, -50], [-16, -37], [0, -32]], 2) + line([[7, -50], [21, -40], [13, -32]], 2);
    art += shape([[-4, -37], [18, -37], [18, -23], [-4, -23]], false);
    for (let i = -3; i < 18; i += 6) art += line([[i, -36], [i + 5, -24]], 1);
  } else {
    art += line([[-7, -50], [-17, -36], [-25, -39]], 2) + line([[7, -50], [16, -44], [23, -52]], 2);
  }
  return `<g transform="translate(${f(x)} ${f(y)}) scale(${f(scale * direction)} ${f(scale)})">${art}</g>`;
}

export function hut(x: number, y: number, scale: number, rng: RNG): string {
  let art = shape([[-70, -78], [0, -140], [78, -78]], false, 2.3);
  art += line([[-80, -72], [-70, -80], [77, -80], [88, -72]], 2);
  for (let i = -61; i < 73; i += 7) {
    const roofY = -140 + Math.abs(i) * .82;
    art += line([[i, -79], [i * .22, roofY - 4]], 1.1, .9);
  }
  art += shape([[-61, -74], [65, -74], [65, -3], [-61, -3]], false, 2.1);
  art += shape([[-13, -2], [-13, -48], [14, -48], [14, -2]], false, 2);
  art += shape([[28, -47], [49, -47], [49, -27], [28, -27]], false);
  art += line([[38, -47], [38, -27]], 1) + line([[28, -37], [49, -37]], 1);
  art += line([[-67, 1], [72, 1]], 2);
  for (let i = -52; i < -15; i += 9) art += line([[i, -65], [i, -11]], 1, .5);
  for (let i = -57; i < 60; i += 12) art += shape([[i, -71], [i + 5, -63], [i + 10, -71]], false, .9);
  art += line([[40, -110], [40, -139], [42 + rng() * 7, -153]], 1.4);
  return group(x, y, scale, art);
}

export function tree(x: number, y: number, scale: number, rng: RNG): string {
  let art = shape([[-8, 0], [-4, -106], [2, -168], [7, -96], [10, 0]], false, 2);
  function branch(bx: number, by: number, length: number, angle: number, depth: number): void {
    const ex = bx + Math.cos(angle) * length;
    const ey = by + Math.sin(angle) * length;
    art += line([[bx, by], [(bx + ex) / 2 + (rng() - .5) * 6, (by + ey) / 2], [ex, ey]], Math.max(.8, depth * .65));
    if (depth > 0) {
      branch(ex, ey, length * (.64 + rng() * .09), angle - .55 - rng() * .18, depth - 1);
      branch(ex, ey, length * (.65 + rng() * .1), angle + .5 + rng() * .18, depth - 1);
    } else {
      for (let i = 0; i < 3; i++) {
        const a = angle + (i - 1) * .8;
        const px = ex + Math.cos(a) * 9;
        const py = ey + Math.sin(a) * 9;
        art += `<ellipse cx="${f(px)}" cy="${f(py)}" rx="8" ry="3.3" transform="rotate(${f(a * 180 / Math.PI)} ${f(px)} ${f(py)})" fill="currentColor"/>`;
      }
    }
  }
  for (let i = 0; i < 5; i++) {
    const by = -69 - i * 23;
    branch(0, by, 47 + rng() * 16, -2.4 - rng() * .15, 2);
    branch(3, by - 4, 50 + rng() * 17, -.65 + rng() * .15, 2);
  }
  branch(1, -160, 30, -Math.PI / 2, 2);
  for (let i = -13; i <= 13; i += 6) art += line([[0, -4], [i * 1.5, 5]], 1.3);
  return group(x, y, scale, art);
}

export function palm(x: number, y: number, scale: number): string {
  let art = shape([[-5, 0], [8, -168], [12, -170], [4, 0]], false, 2);
  for (let j = 0; j < 9; j++) art += line([[-3 + j * .8, -j * 17], [5 + j * .7, -j * 17 - 6]], 1);
  for (let i = 0; i < 7; i++) {
    const a = -Math.PI + i * Math.PI / 6;
    const end: Point = [10 + Math.cos(a) * 83, -170 + Math.sin(a) * 50 + 23];
    const mid: Point = [10 + Math.cos(a) * 40, -183 + Math.sin(a) * 48];
    art += line([[10, -170], mid, end], 2);
    for (let t = .2; t < 1; t += .13) {
      const px = 10 + (end[0] - 10) * t;
      const py = -170 + (end[1] + 170) * t - Math.sin(t * Math.PI) * 23;
      art += line([[px - 6, py + 13], [px, py], [px + 6, py + 13]], 1.5);
    }
  }
  art += circle(5, -165, 4, false) + circle(16, -162, 4, false);
  return group(x, y, scale, art);
}

export function animal(x: number, y: number, scale: number, direction = 1, deer = false): string {
  let art = shape([[-33, -38], [20, -36], [26, -24], [-28, -21]], false, 2);
  art += shape([[17, -37], [27, -56], [39, -52], [35, -40], [25, -30]], false, 1.7);
  art += circle(35, -49, 1.2);
  for (const px of [-26, -16, 15, 23]) art += line([[px, -23], [px + 2, -10], [px - 2, 0]], 1.8);
  art += line([[-32, -36], [-44, -47], [-45, -29]], 1.7);
  art += line([[29, -55], [23, -63], [21, -58]], 1.7) + line([[36, -54], [42, -62], [42, -56]], 1.7);
  if (deer) art += line([[29, -56], [25, -76], [19, -81]], 1.4) + line([[25, -71], [32, -77]], 1.4);
  for (let i = -22; i < 18; i += 7) art += line([[i, -35], [i + 4, -23]], 1, .6);
  return `<g transform="translate(${f(x)} ${f(y)}) scale(${f(scale * direction)} ${f(scale)})">${art}</g>`;
}

export function bird(x: number, y: number, scale = 1): string {
  return group(x, y, scale, line([[-10, 1], [-5, -4], [0, 0], [6, -5], [12, -2]], 1.5));
}

export function peacock(x: number, y: number, scale: number): string {
  let art = '';
  for (let i = 0; i < 9; i++) {
    const a = -Math.PI + i * Math.PI / 8;
    const ex = Math.cos(a) * 39;
    const ey = -20 + Math.sin(a) * 43;
    art += line([[0, -13], [ex, ey]], 1.2) + circle(ex, ey, 4, false, 1) + circle(ex, ey, 1);
  }
  art += shape([[-10, -17], [12, -20], [4, -5]], false, 1.7);
  art += line([[9, -18], [16, -32], [15, -43]], 2) + circle(15, -46, 4, false);
  art += line([[18, -45], [25, -44]], 1.2) + line([[12, -51], [10, -57], [16, -54]], 1.2);
  art += line([[-1, -5], [-4, 3]], 1.4) + line([[5, -5], [9, 2]], 1.4);
  return group(x, y, scale, art);
}

export function crop(x: number, y: number, scale = 1): string {
  let art = line([[0, 0], [1, -30]], 1.1);
  for (let i = 0; i < 4; i++) art += line([[-7, -12 - i * 6], [0, -7 - i * 6], [7, -14 - i * 6]], 1.1);
  return group(x, y, scale, art);
}

export function grass(x: number, y: number, scale = 1): string {
  return group(x, y, scale, line([[-7, -5], [0, 0], [-3, -13]], 1.1) + line([[0, 0], [5, -10], [8, -8]], 1.1));
}
