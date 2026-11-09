# Anant Gaon

An endless village built with TypeScript and SVG, inspired by Warli visual traditions. Every mark is generated from geometry; no D3, image assets, or rendering framework is used.

## Run

Requires Node 22.16+ and npm.

```sh
npm install
npm run dev
```

```sh
npm test
npm run build
npm run preview
```

## Explore

- Drag horizontally, use a horizontal trackpad gesture, or choose the scene arrows.
- Focus the artwork and use Left/Right, +/−, Home, or Space.
- Edit the seed and press Enter to recreate a particular village.
- Choose terracotta, indigo, or parchment; zoom; or take an automatic stroll.
- Save the current artwork as a standalone SVG or copy a URL containing the seed, position, zoom, and palette.

## Structure

- `src/random.ts`: seed hashing, deterministic random streams, smooth noise, region selection.
- `src/motifs.ts`: geometric people, trees, houses, crops, animals, and birds.
- `src/world.ts`: five scene compositions, region caching, continuous paths, and SVG export.
- `src/main.ts`: camera, controls, accessible interactions, and URL state.

Each 1,000-unit region derives its random stream from the village seed and region coordinate. Generation order therefore cannot change a scene. Only regions around the camera remain cached; revisiting a distant region regenerates it. Shared landscape paths sample the same continuous function across boundaries.

This is original procedural artwork inspired by a living art tradition, not a reproduction or representation of a Warli practitioner's work. [Explore Warli art](https://artsandculture.google.com/asset/the-art-of-warli/NQHgRIMVSS1_hw).

The application does not use code from shan-shui-inf.
