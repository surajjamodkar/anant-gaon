# Anant Gaon

An endless village drawn in code, inspired by Warli visual traditions. Every mark is generated from geometry as SVG: no images, no frameworks, no build step.

## Run

It is a plain static site. Any static file server works. Browsers block JavaScript module imports from `file://`, so serve the folder instead of double-clicking `index.html`:

```sh
python3 -m http.server 8000
```

Then open <http://localhost:8000>.

Optional tests (any Node 18+):

```sh
node --test tests/*.test.js
```

## Publish on GitHub Pages

1. Push this folder to GitHub.
2. In the repository's **Settings → Pages**, set **Source** to *Deploy from a branch*, choose `main` and `/ (root)`, and save.
3. The site appears at `https://<user>.github.io/<repo>/` after a minute or so.

`.nojekyll` tells Pages to serve the files exactly as they are.

## Explore

- Drag, use a horizontal trackpad gesture, or press the arrows to walk. Space starts a stroll.
- Change the seed for a different village; copy a link that keeps the seed, position, zoom, palette and settings.
- **Village settings** controls:
  - **Density**: how much is drawn in each stretch of land.
  - **People**: how many people are working, dancing and walking (0 leaves only animals and land).
  - **Wildlife**: tigers, elephants, deer, boars, jackals, hares, owls, parrots, squirrels, monkeys, nests, turtles, frogs, scorpions and butterflies. It has its own random stream, so changing it never moves houses or fields.
  - **Movement**: how much bodies bend. At 0 everyone stands upright; higher, dancers tilt and arch, runners lean, tigers leap and cows kick. It never moves anything, only poses it.
  - **Birds & stars**: how busy the sky is.
  - **Land mix**: weights for homes, fields, ponds and lakes, rivers, forest, sacred groves and festivals.
  - **Season**: harvest (ripe grain, sickles, granaries, loaded carts), monsoon (rain, paddy, ploughing, ponds), summer (dry furrows, wells).
  - **Time of day**: day, dusk or night (moon and stars).
  - **Border**: zig-zag, dots or none.
  - **Line**: **unevenness** (how far long strokes wander, so straight lines come out uneven, including the path and border), **jitter** (a small tremor on every point), **line weight**, **rough edges** (how ragged the wall makes each stroke's edge) and **paint gaps** (where the paste skipped over the wall).
- Save the current view as a standalone SVG.

Every setting can also be set in the URL, for example `?seed=mitti-42&season=monsoon&density=1.5&time=night&palette=night`.

## How it works

- `src/random.js`: seed hashing, deterministic random streams, smooth noise, and the footpath.
- `src/ink.js`: the drawing primitives. Every stroke is resampled, passed through the active warp, and given a hand's drift, so long lines arrive as brush strokes rather than ruler lines.
- `src/rig.js`: warps that let a motif follow a curve: spines measured by arc length, Catmull-Rom paths, trunks that lean and bow, and quadruped rigs with named gaits (walk, graze, trot, gallop, leap, pounce, stalk, buck, rear, stretch, frisk).
- `src/figures.js`: people on a rig (torso lean and arch about the waist, hip sway, knees and elbows), motion presets, the curved tarpa horn, and the dances: the spiral painted flat, the circle seen from the side, and free dancers.
- `src/water.js`: ponds and lakes with uneven shores, a river that winds down from the hills and widens towards you, its footbridge, lotus and ducks.
- `src/sky.js`: the upper band: birds in flight with spread wings, V-flocks, kites, and clouds trailing broken lines of rain in the monsoon.
- `src/plants.js`: a plant generator. A species is a few dozen numbers (form, branching, droop, leaf kind and spacing), so the walk keeps finding new trees, herbs, palms, bananas and shrubs.
- `src/motifs.js`: cattle, bullock carts, ploughs, the threshing floor, two women pounding grain, wells, granaries, hand mills, huts with ladders and cradles, stone-edged fields, a village shrine and Waghoba's carved post, classic trees, wildlife, sky and land.
- `src/world.js`: the planner, settings, the wall texture filter, and SVG export.
- `src/main.js`: camera, controls, settings panel and URL state.

The world is split into 1,000-unit regions, and each region gets its own random stream from the seed and its index, so the order you travel in never changes a place. A region is divided into three or four plots. Each plot picks a land use (home, field, water, forest, sacred grove or festival) in proportion to the land-mix weights, shaped by slow noise fields, so similar land clusters into zones and the scene changes as you walk instead of repeating. A sacred grove (devrai) holds old trees hung with a leaf garland, a small shrine with Waghoba, the tiger guardian, seated inside, a carved Waghoba post, lamps and worshippers. Within a plot, motifs are placed in depth bands with simple collision checks, and carts, herds and processions travel the footpath. The hills, path and border sample continuous functions, so they meet seamlessly across regions.

People and animals never overlap a stranger. Each figure claims a box; it may stand in front of one of its own group (a herd, a family, a procession), but otherwise it slides along until it finds room, or is left out. Wildlife is placed after the village, so animals fill the gaps and never displace people, and each figure stays inside its own plot and region. The upper band holds a range of hills with small lives on it (a herder bringing goats down, a tree on a peak, a flag over a shrine), birds and clouds.

Motifs are drawn upright and at rest, then bent. A warp maps each point of a motif onto a curve: a tiger's spine arches into a leap while its legs swing about their roots, a dancer's torso rotates more the higher it goes so the triangles curve, and a tree is grown straight and then laid along a leaning, swaying trunk. Poses come from their own random stream, as do plants, so neither the Movement setting nor a new species ever moves the village.

The wall texture is an SVG filter: fractal noise displaces the edges of every stroke and knocks small holes where the paste skipped over the wall. In the browser, each region is painted into its own image once, texture included, and walking only slides those images, so the texture costs nothing while you pan.

## Credits

The infinite, procedurally generated scroll is inspired by [{Shan, Shui}\*](https://github.com/LingDong-/shan-shui-inf) by Lingdong Huang (MIT), a procedurally generated Chinese landscape painting. No code from it is reused; the idea of a noise-driven planner that decides what goes where comes from it.

This is original procedural artwork inspired by a living art tradition of the Warli community of Maharashtra. It is not a reproduction of, or a substitute for, the work of Warli artists. [Explore Warli art](https://artsandculture.google.com/asset/the-art-of-warli/NQHgRIMVSS1_hw).
