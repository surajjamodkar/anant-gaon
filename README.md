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
node --test tests/
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
  - **Birds & stars**: how busy the sky is.
  - **Land mix**: weights for homes, fields, water, forest, sacred groves and festivals.
  - **Season**: harvest (ripe grain, sickles, granaries, loaded carts), monsoon (rain, paddy, ploughing, ponds), summer (dry furrows, wells).
  - **Time of day**: day, dusk or night (moon and stars).
  - **Border**: zig-zag, dots or none.
  - **Hand-drawn wobble** and **line weight**.
- Save the current view as a standalone SVG.

Every setting can also be set in the URL, for example `?seed=mitti-42&season=monsoon&density=1.5&time=night&palette=night`.

## How it works

- `src/random.js`: seed hashing, deterministic random streams, smooth noise, and the footpath.
- `src/motifs.js`: people in many poses, cattle, bullock carts, ploughs, wells, granaries, hand mills, the tarpa dance spiral, a village shrine and Waghoba's carved post, trees, wildlife, sky and land.
- `src/world.js`: the planner, settings, and SVG export.
- `src/main.js`: camera, controls, settings panel and URL state.

The world is split into 1,000-unit regions, and each region gets its own random stream from the seed and its index, so the order you travel in never changes a place. A region is divided into three or four plots. Each plot picks a land use (home, field, water, forest, sacred grove or festival) in proportion to the land-mix weights, shaped by slow noise fields, so similar land clusters into zones and the scene changes as you walk instead of repeating. A sacred grove (devrai) holds old trees hung with a leaf garland, a small shrine with Waghoba, the tiger guardian, seated inside, a carved Waghoba post, lamps and worshippers. Within a plot, motifs are placed in depth bands with simple collision checks, and carts, herds and processions travel the footpath. The hills, path and border sample continuous functions, so they meet seamlessly across regions.

## Credits

The infinite, procedurally generated scroll is inspired by [{Shan, Shui}\*](https://github.com/LingDong-/shan-shui-inf) by Lingdong Huang (MIT), a procedurally generated Chinese landscape painting. No code from it is reused; the idea of a noise-driven planner that decides what goes where comes from it.

This is original procedural artwork inspired by a living art tradition of the Warli community of Maharashtra. It is not a reproduction of, or a substitute for, the work of Warli artists. [Explore Warli art](https://artsandculture.google.com/asset/the-art-of-warli/NQHgRIMVSS1_hw).
