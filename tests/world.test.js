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
  assert.equal(o.wobble, 0.35);
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
