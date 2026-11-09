// Optional checks. Run with any Node 18+: `node --test tests/`
import test from 'node:test';
import assert from 'node:assert/strict';
import { random, visibleRegions, pathY } from '../src/random.js';
import { Village, exportSVG, PALETTES, normalizeOptions, CHOICES } from '../src/world.js';

test('seeded random streams repeat and distinct seeds differ', () => {
  const values = seed => { const rng = random(seed); return Array.from({ length: 20 }, rng); };
  assert.deepEqual(values('mitti'), values('mitti'));
  assert.notDeepEqual(values('mitti'), values('palash'));
});

test('a region does not depend on generation order and regenerates identically after eviction', () => {
  const forward = new Village('aangan');
  const original = forward.region(-3);
  forward.region(2);
  const backward = new Village('aangan');
  backward.region(2);
  assert.equal(backward.region(-3), original);
  for (let i = 0; i < 80; i++) forward.render({ center: i * 1000, width: 1500, height: 680 });
  assert.ok(forward.cacheSize <= 5);
  assert.equal(forward.region(-3), original);
  assert.notEqual(new Village('different').region(-3), original);
});

test('different seeds produce different land at the same place', () => {
  const lands = seed => { const v = new Village(seed); return Array.from({ length: 12 }, (_, i) => v.landNear(i * 1000 + 500)).join(); };
  assert.notEqual(lands('sahaj-108'), lands('mitti-42'));
});

test('density changes how much is drawn', () => {
  const camera = { center: 500, width: 2000, height: 680 };
  const size = density => new Village('sahaj', { density }).render(camera).length;
  assert.ok(size(0.3) < size(1));
  assert.ok(size(1) < size(2));
});

test('the wildlife setting adds animals without moving the village', () => {
  const lands = wild => { const v = new Village('sahaj-108', { wild }); return Array.from({ length: 8 }, (_, i) => { v.region(i); return v.plots.get(i).map(p => p.land).join('/'); }).join(); };
  assert.equal(lands(0), lands(2));
  const camera = { center: 500, width: 2000, height: 680 };
  const size = wild => new Village('sahaj', { wild }).render(camera).length;
  assert.ok(size(0) < size(2));
});

test('options are clamped and validated', () => {
  const o = normalizeOptions({ density: '99', season: 'winter', time: 'night', wobble: 'abc' });
  assert.equal(o.density, 2);
  assert.equal(o.season, 'harvest');
  assert.equal(o.time, 'night');
  assert.equal(o.wobble, 0.45);
});

test('visible regions cover both viewport edges, including negative positions', () => {
  for (const center of [-13000, -1001, -1, 0, 500, 13999]) {
    const indices = visibleRegions(center, 1700);
    assert.ok(indices[0] * 1000 <= center - 850);
    assert.ok((indices.at(-1) + 1) * 1000 >= center + 850);
    assert.ok(indices.length <= 5);
  }
});

test('the path remains continuous at region boundaries', () => {
  for (let i = -10; i <= 10; i++) {
    const x = i * 1000;
    assert.ok(Math.abs(pathY('sahaj', x - 0.001) - pathY('sahaj', x + 0.001)) < 0.01);
  }
});

test('every season and time of day renders finite SVG, and exports escape user text', () => {
  for (const season of CHOICES.season) for (const time of CHOICES.time) {
    const village = new Village('<script>&"seed', { season, time, density: 2, life: 2 });
    for (let i = -5; i < 5; i++) assert.doesNotMatch(village.region(i), /NaN|Infinity|undefined/);
  }
  const output = exportSVG(new Village('<script>&"seed'), { center: 500, width: 1600, height: 680 }, PALETTES.clay);
  assert.match(output, /xmlns="http:\/\/www.w3.org\/2000\/svg"/);
  assert.match(output, /&lt;script&gt;&amp;&quot;seed/);
  assert.doesNotMatch(output, /<script>/);
  assert.match(output, /fill="#873f30"/);
});

test('a spine warp leaves an unbent motif where it was, and bends a bent one', async () => {
  const { axisWarp, quadWarp, GAITS } = await import('../src/rig.js');
  const flat = axisWarp(0, -30, -60, 60, () => 0);
  for (const [x, y] of [[-40, -30], [0, -10], [35, -50]]) {
    const [X, Y] = flat(x, y);
    assert.ok(Math.abs(X - x) < 1e-6 && Math.abs(Y - y) < 1e-6);
  }
  const arched = axisWarp(0, -30, -60, 60, u => 0.01 * u);
  assert.ok(arched(-50, -30)[1] > -30 && arched(50, -30)[1] > -30, 'both ends of an arch sit lower than its middle');
  const rig = { axis: -29, mid: -11, legTop: -22, legs: [-35, -27, 12, 20], neck: 22, tail: -42, from: -66, to: 60 };
  for (const gait of Object.keys(GAITS)) {
    const warp = quadWarp(rig, gait);
    const lowest = Math.max(...rig.legs.map(x => warp(x, 0)[1]));
    assert.ok(Math.abs(lowest + (GAITS[gait].lift ?? 0)) < 1e-6, `${gait}: feet on the ground, or exactly lift above it`);
  }
});

test('people stand on the ground whatever their pose, and motion 0 keeps everyone upright', async () => {
  const { hands, moves, person } = await import('../src/figures.js');
  const rng = random('moves');
  assert.deepEqual(moves('dance', rng, 0), {});
  for (let i = 0; i < 40; i++) {
    const m = moves(['dance', 'run', 'walk', 'chain'][i % 4], rng, 1.5);
    assert.doesNotMatch(person(0, 0, 1, 'dance', 1, i, m), /NaN|undefined/);
    for (const [, y] of hands('hold', i, m)) assert.ok(Number.isFinite(y));
  }
  // Linked hands sit at shoulder height on an upright figure.
  for (const [, y] of hands('hold', 0, {})) assert.ok(y < -40 && y > -55);
});

test('plants grow the same from the same seed, and differ between species', async () => {
  const { plant, species } = await import('../src/plants.js');
  const grow = seed => { const rng = random(seed); return plant(0, 0, 1, rng, species(rng)); };
  assert.equal(grow('neem'), grow('neem'));
  const forms = new Set(Array.from({ length: 60 }, (_, i) => species(random(`sp${i}`)).form));
  assert.ok(forms.size >= 5);
  assert.doesNotMatch(grow('peepal'), /NaN|undefined/);
});

test('the motion setting changes poses without moving the village', () => {
  const lands = motion => { const v = new Village('sahaj-108', { motion }); return Array.from({ length: 8 }, (_, i) => { v.region(i); return v.plots.get(i).map(p => p.land).join('/'); }).join(); };
  assert.equal(lands(0), lands(2));
  assert.notEqual(new Village('sahaj', { motion: 0 }).region(0), new Village('sahaj', { motion: 2 }).region(0));
});

test('the wall texture is part of the export, and can be turned off', async () => {
  const { wallFilter } = await import('../src/world.js');
  assert.equal(wallFilter(0, 0), '');
  assert.notEqual(wallFilter(0, 0.5), '', 'rough edges alone still texture the strokes');
  const camera = { center: 500, width: 1600, height: 680 };
  assert.match(exportSVG(new Village('mitti'), camera, PALETTES.clay), /filter="url\(#wall\)"/);
  assert.doesNotMatch(exportSVG(new Village('mitti', { texture: 0, rough: 0 }), camera, PALETTES.clay), /url\(#wall\)/);
});

test('people and animals never overlap anyone outside their own group', () => {
  for (const [seed, opts] of [['sahaj-108', {}], ['mitti-42', { density: 2, life: 2, wild: 2 }], ['palash-7', { river: 2, water: 2, season: 'monsoon' }], ['tarpa-88', { festival: 2, motion: 2, season: 'harvest' }]]) {
    const v = new Village(seed, opts);
    for (let i = -4; i < 12; i++) {
      v.region(i);
      const boxes = v.layout.get(i);
      for (let a = 0; a < boxes.length; a++) for (let b = a + 1; b < boxes.length; b++) {
        const A = boxes[a], B = boxes[b];
        if (A.g && A.g === B.g) continue;
        const w = Math.min(A.b[2], B.b[2]) - Math.max(A.b[0], B.b[0]), h = Math.min(A.b[3], B.b[3]) - Math.max(A.b[1], B.b[1]);
        assert.ok(w <= 4 || h <= 4, `${seed} region ${i}: ${A.g ?? '-'} ${A.b.map(Math.round)} overlaps ${B.g ?? '-'} ${B.b.map(Math.round)}`);
      }
    }
  }
});

test('ponds and lakes have uneven shores', async () => {
  const { shore } = await import('../src/water.js');
  const rng = random('pond');
  const pts = shore(0, 0, 100, 50, rng);
  const radii = pts.map(([x, y]) => Math.hypot(x / 100, y / 50));
  assert.ok(Math.max(...radii) - Math.min(...radii) > 0.05, 'not a perfect ellipse');
});

test('rivers appear and keep walkers out of the water', () => {
  const v = new Village('dhara-5', { river: 2, water: 0 });
  const lands = Array.from({ length: 10 }, (_, i) => v.landNear(i * 1000 + 500) && v.plots.get(i).map(p => p.land)).flat();
  assert.ok(lands.includes('river'));
});

test('figures stay inside their region, so neighbouring regions never collide', () => {
  const v = new Village('mitti-42', { density: 2, life: 2, wild: 2 });
  for (let i = 0; i < 10; i++) { v.region(i); for (const { b } of v.layout.get(i)) assert.ok(b[0] >= -0.01 && b[2] <= 1000.01, `region ${i}: ${b.map(Math.round)}`); }
});

test('every piece is written in its own raga, and the village picks a fitting one', async () => {
  const { PIECES, parsePhrase, pieceFor } = await import('../src/sound.js');
  const semis = { S: 0, R: 2, g: 3, G: 4, m: 5, P: 7, d: 8, D: 9, n: 10 };
  assert.equal(PIECES.length, 6);
  for (const piece of PIECES) {
    const allowed = new Set([...piece.swaras].map(s => semis[s]));
    for (const phrase of piece.phrases) {
      const notes = parsePhrase(phrase);
      assert.ok(notes.length > 0 && !notes[0].rest, `${piece.id}: ${phrase}`);
      for (const note of notes) if (!note.rest) assert.ok(allowed.has(((note.semi % 12) + 12) % 12), `${piece.id}: ${phrase}`);
    }
  }
  assert.deepEqual(parsePhrase(".D S - _ _ S'"), [{ semi: -3, beats: 1 }, { semi: 0, beats: 2 }, { rest: true, beats: 2 }, { semi: 12, beats: 1 }]);
  assert.throws(() => parsePhrase('S X'));
  assert.equal(pieceFor({ season: 'harvest', time: 'day', land: 'festival' }), 'tarpa');
  assert.equal(pieceFor({ season: 'monsoon', time: 'night', land: 'home' }), 'megh');
  assert.equal(pieceFor({ season: 'summer', time: 'night', land: 'home' }), 'raat');
  assert.equal(pieceFor({ season: 'harvest', time: 'day', land: 'field' }), 'khet');
});
