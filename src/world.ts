import { noise, random, REGION_WIDTH, sceneAt, pathY, visibleRegions } from './random.ts';
import { animal, bird, circle, crop, grass, group, hut, line, palm, peacock, person, shape, tree } from './motifs.ts';

export interface Camera { center: number; width: number; height: number; top?: number }
export interface Palette { name: string; ground: string; ink: string; haze: string }
export const PALETTES: Record<string, Palette> = {
  clay: { name: 'Terracotta', ground: '#873f30', ink: '#f5e5c3', haze: '#a15a43' },
  night: { name: 'Indigo', ground: '#283d49', ink: '#e9e2c9', haze: '#425762' },
  paper: { name: 'Parchment', ground: '#e7dbc0', ink: '#6d4735', haze: '#d0bf9c' },
};

export class Village {
  readonly seed: string;
  private cache = new Map<number, string>();

  constructor(seed: string) { this.seed = seed; }
  get cacheSize(): number { return this.cache.size; }

  region(index: number): string {
    const cached = this.cache.get(index);
    if (cached) return cached;
    const rng = random(`${this.seed}:region:${index}`);
    const scene = sceneAt(index);
    const base = index * REGION_WIDTH;
    let art = '';
    // Motifs remain inside a 1,000-unit region; the continuous path is drawn globally.
    const sunX = 650 + rng() * 130;
    art += group(sunX, 114, 1, circle(0, 0, 20, false, 1.5) + circle(0, 0, 16, false, .8)
      + Array.from({ length: 18 }, (_, i) => {
        const a = i * Math.PI / 9;
        return line([[Math.cos(a) * 26, Math.sin(a) * 26], [Math.cos(a) * 31, Math.sin(a) * 31]], 1.1);
      }).join(''));
    for (let i = 0; i < 6; i++) art += bird(120 + rng() * 760, 125 + rng() * 115, .6 + rng() * .5);

    if (scene === 'The gathering') {
      art += tree(183, 430, .85, rng) + hut(805, 442, .88, rng);
      art += line([[341, 453], [405, 447], [471, 449], [534, 460], [581, 478]], 1, .35);
      for (let i = 0; i < 11; i++) {
        const a = .22 + i * (Math.PI * 1.8 / 10);
        const x = 478 + Math.cos(a) * 129;
        const y = 447 + Math.sin(a) * 57;
        art += person(x, y, .79 + (Math.sin(a) + 1) * .12, 'dance', i < 5 ? 1 : -1, i % 3);
      }
      art += person(469, 439, .84, 'drum') + person(510, 442, .79, 'drum', -1);
      art += peacock(246, 480, .7) + animal(852, 521, .64, -1);
      art += person(701, 506, .87, 'carry', -1);
      art += group(316, 526, 1, circle(0, -12, 12, false) + line([[-12, -12], [12, -12]], 1));
    } else if (scene === 'Fields of plenty') {
      art += hut(198, 367, .68, rng) + palm(822, 408, .9);
      art += shape([[292, 409], [685, 388], [779, 481], [349, 507]], false, 1.4);
      for (let row = 0; row < 4; row++) {
        for (let col = 0; col < 16; col++) {
          const x = 319 + col * 24 + row * 13;
          const y = 430 + row * 20 - col * 1.4;
          art += crop(x, y, .65 + rng() * .15);
        }
      }
      art += person(399, 461, .91, 'farm') + person(625, 456, .91, 'farm', -1);
      art += person(732, 531, .9, 'carry', -1) + person(224, 486, .85, 'walk');
      art += animal(138, 512, .76) + animal(820, 520, .68, -1);
      art += tree(103, 389, .57, rng);
    } else if (scene === 'By the water') {
      art += palm(170, 414, 1) + tree(816, 424, .75, rng);
      art += `<ellipse cx="500" cy="450" rx="198" ry="61" fill="none" stroke="currentColor" stroke-width="1.7"/>`;
      for (let i = 0; i < 8; i++) {
        const y = 406 + i * 12;
        const half = Math.sqrt(Math.max(0, 1 - ((y - 450) / 61) ** 2)) * 170;
        art += line([[500 - half, y], [488 - half * .35, y + 2], [510 + half * .4, y - 1], [500 + half, y]], 1, .6);
      }
      for (let i = 0; i < 4; i++) {
        const x = 406 + i * 56;
        art += group(x, 445 + (i % 2) * 24, .7, shape([[-13, 0], [0, -5], [13, 0], [0, 5]], false, 1) + shape([[13, 0], [20, -5], [20, 5]], false, 1) + circle(-6, 0, .8));
      }
      art += person(725, 487, .94, 'carry', -1) + person(264, 466, .91, 'walk');
      art += line([[284, 420], [315, 385], [455, 430]], 1.1);
      art += animal(790, 505, .8, -1) + animal(845, 530, .5, -1);
      for (let i = 0; i < 8; i++) art += crop(310 + i * 7, 492 + i * 2, .6);
      art += peacock(170, 516, .8);
    } else if (scene === 'Among the trees') {
      art += tree(176, 417, .81, rng) + tree(478, 464, 1.12, rng) + tree(826, 420, .88, rng);
      art += animal(302, 491, .8, 1, true) + animal(365, 519, .53, -1, true);
      art += peacock(664, 484, .9) + peacock(705, 527, .6);
      art += person(780, 533, .89, 'carry', -1);
      art += bird(451, 290, .7) + bird(525, 325, .6);
    } else {
      art += hut(307, 433, 1, rng) + hut(629, 385, .72, rng);
      art += tree(117, 445, .88, rng) + palm(831, 409, .83);
      for (let i = 0; i < 8; i++) {
        const x = 430 + i * 23;
        art += line([[x, 405], [x + 5, 448]], 1.7);
      }
      art += line([[427, 417], [602, 417]], 1.5) + line([[430, 437], [606, 437]], 1.5);
      art += person(426, 510, .96, 'carry') + person(504, 533, .85, 'walk') + person(549, 540, .62, 'walk');
      art += animal(701, 477, .78, -1) + animal(770, 508, .57, -1);
      art += peacock(232, 507, .65);
    }
    // Sparse foreground marks add rhythm without obscuring the activity groups.
    for (let i = 0; i < 42; i++) {
      const x = 45 + rng() * 910;
      const y = 598 + rng() * 53;
      art += grass(x, y, .4 + rng() * .55);
    }
    for (let i = 0; i < 9; i++) art += grass(60 + rng() * 880, 360 + rng() * 34, .4);
    const result = `<g data-region="${index}" transform="translate(${base} 0)">${art}</g>`;
    this.cache.set(index, result);
    return result;
  }

  render(camera: Camera): string {
    const indices = visibleRegions(camera.center, camera.width);
    const keep = new Set(indices);
    for (const index of this.cache.keys()) if (!keep.has(index)) this.cache.delete(index);
    const left = Math.floor((camera.center - camera.width / 2 - 100) / 25) * 25;
    const right = camera.center + camera.width / 2 + 100;
    let background = '';
    for (let layer = 0; layer < 2; layer++) {
      const points: [number, number][] = [];
      for (let x = left; x <= right + 25; x += 25) {
        const y = 298 + layer * 42 - noise(`${this.seed}:hills:${layer}`, x / (220 + layer * 80)) * (70 - layer * 17);
        points.push([x, y]);
      }
      background += line(points, 1, .14 + layer * .06);
    }
    const path1: [number, number][] = [], path2: [number, number][] = [];
    for (let x = left; x <= right + 25; x += 25) {
      const y = pathY(this.seed, x);
      path1.push([x, y]);
      path2.push([x, y + 13]);
    }
    return background + line(path1, 1.2, .55) + line(path2, .8, .4) + indices.map(index => this.region(index)).join('');
  }
}

export function escapeXML(text: string): string {
  return text.replace(/[<>&"']/g, ch => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;' })[ch]!);
}

export function exportSVG(village: Village, camera: Camera, palette: Palette): string {
  const x = camera.center - camera.width / 2;
  const top = camera.top ?? 0;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${x} ${top} ${camera.width} ${camera.height}" width="${Math.round(camera.width * 2)}" height="${Math.round(camera.height * 2)}" style="color:${palette.ink};background:${palette.ground}">
  <title>Anant Gaon — ${escapeXML(village.seed)}</title>
  <desc>Original procedural artwork inspired by Warli visual traditions. Seed: ${escapeXML(village.seed)}. Position: ${camera.center}.</desc>
  <rect x="${x}" y="${top}" width="${camera.width}" height="${camera.height}" fill="${palette.ground}"/>
  ${village.render(camera)}
  </svg>`;
}
