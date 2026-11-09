import test from 'node:test';
import assert from 'node:assert/strict';
import { random, visibleRegions, sceneAt, pathY } from '../src/random.ts';
import { Village, exportSVG, PALETTES } from '../src/world.ts';

test('seeded random streams repeat and distinct seeds differ', () => {
  const values = (seed: string) => { const rng = random(seed); return Array.from({ length: 20 }, rng); };
  assert.deepEqual(values('mitti'), values('mitti'));
  assert.notDeepEqual(values('mitti'), values('palash'));
});

test('region artwork is independent of generation order and regenerates after eviction', () => {
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

test('visible regions cover both viewport edges, including negative positions', () => {
  for (const center of [-13000, -1001, -1, 0, 500, 13999]) {
    const indices = visibleRegions(center, 1700);
    assert.ok(indices[0] * 1000 <= center - 850);
    assert.ok((indices.at(-1)! + 1) * 1000 >= center + 850);
    assert.ok(indices.length <= 5);
  }
  assert.equal(sceneAt(-1), 'Homeward');
  assert.equal(sceneAt(-5), 'The gathering');
});

test('the path remains continuous at region boundaries', () => {
  for (let i = -10; i <= 10; i++) {
    const x = i * 1000;
    assert.ok(Math.abs(pathY('sahaj', x - .001) - pathY('sahaj', x + .001)) < .01);
  }
});

test('all five scenes render finite SVG and exports escape user text', () => {
  const village = new Village('<script>&"seed');
  const camera = { center: 500, width: 1600, height: 680 };
  for (let i = -5; i < 5; i++) assert.doesNotMatch(village.region(i), /NaN|Infinity|undefined/);
  const output = exportSVG(village, camera, PALETTES.clay);
  assert.match(output, /xmlns="http:\/\/www.w3.org\/2000\/svg"/);
  assert.match(output, /&lt;script&gt;&amp;&quot;seed/);
  assert.doesNotMatch(output, /<script>/);
  assert.match(output, /fill="#873f30"/);
});
