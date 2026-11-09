import './style.css';
import { REGION_WIDTH, sceneAt } from './random.ts';
import { exportSVG, PALETTES, Village, type Camera } from './world.ts';

const icons = {
  arrow: '<path d="M4 12h16m-6-6 6 6-6 6"/>',
  download: '<path d="M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5"/>',
  refresh: '<path d="M20 7v5h-5M4 17v-5h5"/><path d="M6 7a7 7 0 0 1 12-1l2 6M4 12l2 6a7 7 0 0 0 12-1"/>',
  plus: '<path d="M5 12h14M12 5v14"/>', minus: '<path d="M5 12h14"/>',
  play: '<path d="m9 5 10 7-10 7z"/>', pause: '<path d="M8 5v14M16 5v14"/>',
  link: '<path d="m10 13 4-2m-4-4 2-2a5 5 0 0 1 7 7l-2 2m-3 3-2 2a5 5 0 0 1-7-7l2-2"/>',
  close: '<path d="m6 6 12 12M6 18 18 6"/>',
};
const icon = (name: keyof typeof icons, cls = '') => `<svg class="icon ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[name]}</svg>`;
const emblem = '<svg class="emblem" viewBox="0 0 40 48" aria-hidden="true"><circle cx="20" cy="6" r="4" fill="currentColor"/><path d="M12 14h16l-8 14zM20 28l10 13H10z" fill="currentColor"/><path d="m13 16-9 8 5 7m18-15 9 8-5 7M15 41l-3 6m13-6 3 6" fill="none" stroke="currentColor" stroke-width="2"/></svg>';

document.querySelector<HTMLDivElement>('#app')!.innerHTML = `
  <header class="header">
    <a class="brand" href="./" aria-label="Anant Gaon home">${emblem}<span><strong>Anant Gaon<span class="brand-dot">.</span></strong><small>अनंत गाँव · THE ENDLESS VILLAGE</small></span></a>
    <div class="header-actions"><button class="text-button" id="about-open">The art & the algorithm <span aria-hidden="true">↗</span></button><button class="button export-button" id="export" aria-label="Save artwork">${icon('download')}<span>Save artwork</span></button></div>
  </header>
  <main>
    <section class="intro" aria-labelledby="title">
      <div><p class="eyebrow"><span class="small-rule"></span> A WORLD DRAWN IN CODE</p><h1 id="title">Somewhere, life goes on.</h1></div>
      <p class="intro-note">An endless scroll of ordinary wonders. <br>Inspired by the rhythms of Warli art.</p>
    </section>
    <section class="artwork" id="artwork" aria-label="Interactive village artwork">
      <div class="art-top"><span class="art-label">WARLI, REIMAGINED</span><span class="live-label"><i></i> GENERATIVE & ENDLESS</span></div>
      <svg id="village" role="img" aria-label="A procedurally drawn Warli-inspired village. Use the previous and next scene buttons or arrow keys to explore." tabindex="0" preserveAspectRatio="xMidYMid meet"><title>Anant Gaon — an endless village</title><g id="world"></g></svg>
      <div class="art-bottom"><button class="scene-arrow previous" id="previous" aria-label="Previous scene">${icon('arrow')}</button><span class="wander-hint"><span aria-hidden="true">←</span> DRAG TO WANDER <span aria-hidden="true">→</span></span><button class="scene-arrow" id="next" aria-label="Next scene">${icon('arrow')}</button></div>
      <div class="corner corner-tl"></div><div class="corner corner-tr"></div><div class="corner corner-bl"></div><div class="corner corner-br"></div>
    </section>
    <section class="toolbar" aria-label="Artwork controls">
      <form id="seed-form" class="seed-controls"><label for="seed">VILLAGE SEED</label><div class="seed-input-wrap"><input id="seed" name="seed" maxlength="64" autocomplete="off" spellcheck="false" aria-label="Village seed" required><button type="submit" class="seed-apply" aria-label="Apply seed" title="Apply seed">${icon('arrow')}</button></div><button type="button" class="icon-button new-village" id="regenerate" aria-label="Generate a new village" title="New village">${icon('refresh')}</button></form>
      <div class="palette-controls" role="group" aria-label="Artwork palette"><button class="swatch clay" data-palette="clay" aria-label="Terracotta palette" title="Terracotta" aria-pressed="true"></button><button class="swatch night" data-palette="night" aria-label="Indigo palette" title="Indigo" aria-pressed="false"></button><button class="swatch paper" data-palette="paper" aria-label="Parchment palette" title="Parchment" aria-pressed="false"></button><span id="palette-label">Terracotta</span></div>
      <div class="view-controls"><div class="zoom-controls" role="group" aria-label="Zoom"><button class="icon-button" id="zoom-out" aria-label="Zoom out">${icon('minus')}</button><button id="zoom-reset" class="zoom-level" aria-label="Reset zoom">100%</button><button class="icon-button" id="zoom-in" aria-label="Zoom in">${icon('plus')}</button></div><span class="separator"></span><button class="button wander-button" id="autoplay" aria-pressed="false">${icon('play')}<span>Take a stroll</span></button></div>
    </section>
    <div class="scene-caption"><div><span class="scene-number" id="scene-number">01</span><span class="scene-name" id="scene-name">The gathering</span><span class="caption-divider">/</span><span id="scene-description">A little music. A moment together.</span></div><button class="text-button share-button" id="share" aria-label="Copy this view">${icon('link')}<span>Copy this view</span></button></div>
  </main>
  <footer><span>Every line is a calculation. Every village, a little different.</span><span>MADE OF GEOMETRY & EVERYDAY LIFE <span class="footer-star">✳</span></span></footer>
  <div class="toast" id="toast" role="status" aria-live="polite"></div>
  <dialog id="about" aria-labelledby="about-title"><button class="icon-button dialog-close" id="about-close" aria-label="Close about">${icon('close')}</button><p class="eyebrow">THE ART & THE ALGORITHM</p><h2 id="about-title">Small rules.<br>Endless possibilities.</h2><p>Warli artists tell stories of community, nature, and everyday life through a rich vocabulary of geometric forms. Anant Gaon is an original experiment inspired by that visual language.</p><p>There are no pictures hidden behind the canvas. TypeScript calculates every triangle, branch, person, and blade of grass. Your browser draws those shapes as SVG.</p><div class="about-details"><span>01</span><p><strong>A village that remembers.</strong> Each region uses its own seed. Come back to a place and find it just as you left it.</p><span>02</span><p><strong>Life in five scenes.</strong> Gatherings, fields, water, woodland, and home unfold as you wander.</p><span>03</span><p><strong>Take a piece with you.</strong> Save your current view as an SVG, ready to scale or print.</p></div><p class="about-credit">A contemporary, code-based interpretation; it does not represent the full tradition or the work of a Warli artist. <a href="https://artsandculture.google.com/asset/the-art-of-warli/NQHgRIMVSS1_hw" target="_blank" rel="noopener noreferrer">Explore Warli art ↗</a></p><p class="keyboard-help">Drag or use ← → to explore. Use + / − to zoom. Press Space on the artwork to stroll.</p></dialog>
`;

const $ = <T extends Element = HTMLElement>(selector: string) => document.querySelector<T>(selector)!;
const svg = $<SVGSVGElement>('#village');
const world = $<SVGGElement>('#world');
const seedInput = $<HTMLInputElement>('#seed');
const dialog = $<HTMLDialogElement>('#about');
const params = new URLSearchParams(location.search);
let seed = (params.get('seed') || 'sahaj-108').trim().slice(0, 64) || 'sahaj-108';
let village = new Village(seed);
let center = Number(params.get('x') ?? 500);
if (!Number.isFinite(center)) center = 500;
center = Math.max(-1e7, Math.min(1e7, center));
let zoom = Number(params.get('zoom') ?? 1);
if (!Number.isFinite(zoom)) zoom = 1;
zoom = Math.max(.65, Math.min(1.8, zoom));
let paletteKey = params.get('palette') || 'clay';
if (!Object.hasOwn(PALETTES, paletteKey)) paletteKey = 'clay';
let width = 1500;
const height = 680;
let strolling = false;
let frame = 0;
let lastTime = 0;
let needsRender = true;
let toastTimer: ReturnType<typeof setTimeout>;
let urlTimer: ReturnType<typeof setTimeout>;
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');
const descriptions: Record<string, string> = {
  'The gathering': 'A little music. A moment together.',
  'Fields of plenty': 'Many hands, and a season of hope.',
  'By the water': 'Where the village pauses for a while.',
  'Among the trees': 'Room for the wild and the wandering.',
  'Homeward': 'Every path finds its way home.',
};
const camera = (): Camera => ({ center, width: width / zoom, height: height / zoom, top: (height - height / zoom) * .65 });

function updateURL(): void {
  const url = new URL(location.href);
  url.search = new URLSearchParams({ seed, x: center.toFixed(1), zoom: zoom.toFixed(2), palette: paletteKey }).toString();
  history.replaceState(null, '', url);
}

function requestRender(): void {
  needsRender = true;
  if (!frame) frame = requestAnimationFrame(tick);
}

let lastScene = '';
let lastWorldKey = '';
function draw(): void {
  const view = camera();
  svg.setAttribute('viewBox', `${view.center - view.width / 2} ${view.top} ${view.width} ${view.height}`);
  const renderCenter = Math.round(view.center / 250) * 250;
  const key = JSON.stringify([seed, renderCenter, view.width]);
  if (key !== lastWorldKey) {
    world.innerHTML = village.render({ ...view, center: renderCenter, width: view.width + 500 });
    lastWorldKey = key;
  }
  const index = Math.floor(center / REGION_WIDTH);
  const scene = sceneAt(index);
  if (scene !== lastScene) {
    $('#scene-name').textContent = scene;
    $('#scene-description').textContent = descriptions[scene];
    $('#scene-number').textContent = String(((index % 5) + 5) % 5 + 1).padStart(2, '0');
    lastScene = scene;
  }
  $('#zoom-reset').textContent = `${Math.round(zoom * 100)}%`;
  $<HTMLButtonElement>('#zoom-out').disabled = zoom <= .65;
  $<HTMLButtonElement>('#zoom-in').disabled = zoom >= 1.8;
  needsRender = false;
}

function tick(time: number): void {
  frame = 0;
  if (strolling && !document.hidden && !dialog.open) {
    if (lastTime) center = Math.min(1e7, center + Math.min(time - lastTime, 50) * .035 / zoom);
    needsRender = true;
  }
  lastTime = time;
  if (needsRender) draw();
  if (strolling && !document.hidden && !dialog.open) frame = requestAnimationFrame(tick);
}

function changed(): void {
  requestRender();
  clearTimeout(urlTimer);
  urlTimer = setTimeout(updateURL, 250);
}

function toast(message: string): void {
  $('#toast').textContent = message;
  $('#toast').classList.add('visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => $('#toast').classList.remove('visible'), 2600);
}

function setStrolling(value: boolean): void {
  strolling = value;
  lastTime = 0;
  $('#autoplay').setAttribute('aria-pressed', String(value));
  $('#autoplay').innerHTML = `${icon(value ? 'pause' : 'play')}<span>${value ? 'Pause stroll' : 'Take a stroll'}</span>`;
  $('#artwork').classList.toggle('strolling', value);
  if (!value) updateURL();
  requestRender();
}

function setPalette(key: string): void {
  paletteKey = key;
  const palette = PALETTES[key];
  $('#artwork').style.setProperty('--ground', palette.ground);
  $('#artwork').style.setProperty('--ink', palette.ink);
  $('#palette-label').textContent = palette.name;
  document.querySelectorAll<HTMLButtonElement>('[data-palette]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.palette === key)));
  $('meta[name="theme-color"]').setAttribute('content', palette.ground);
  updateURL();
}

function setSeed(value: string): void {
  const nextSeed = value.trim().slice(0, 64);
  if (!nextSeed) { seedInput.setCustomValidity('Enter a village seed.'); seedInput.reportValidity(); return; }
  seedInput.setCustomValidity('');
  seed = nextSeed;
  village = new Village(seed);
  seedInput.value = seed;
  center = 500;
  setStrolling(false);
  changed();
}

$('#seed-form').addEventListener('submit', event => { event.preventDefault(); setSeed(seedInput.value); });
seedInput.addEventListener('input', () => seedInput.setCustomValidity(''));
$('#regenerate').addEventListener('click', () => {
  const names = ['sahaj', 'aangan', 'mitti', 'palash', 'dhara', 'banyan', 'monsoon'];
  const values = crypto.getRandomValues(new Uint32Array(2));
  setSeed(`${names[values[0] % names.length]}-${values[1] % 10000}`);
  toast('A new village, a new beginning.');
});
document.querySelectorAll<HTMLButtonElement>('[data-palette]').forEach(button => button.addEventListener('click', () => setPalette(button.dataset.palette!)));
function move(direction: number): void {
  setStrolling(false);
  center = Math.max(-1e7, Math.min(1e7, (Math.floor(center / REGION_WIDTH) + direction) * REGION_WIDTH + REGION_WIDTH / 2));
  changed();
}
$('#previous').addEventListener('click', () => move(-1));
$('#next').addEventListener('click', () => move(1));
function setZoom(value: number): void { zoom = Math.max(.65, Math.min(1.8, Math.round(value * 100) / 100)); changed(); }
$('#zoom-out').addEventListener('click', () => setZoom(zoom - .15));
$('#zoom-in').addEventListener('click', () => setZoom(zoom + .15));
$('#zoom-reset').addEventListener('click', () => setZoom(1));
$('#autoplay').addEventListener('click', () => setStrolling(!strolling));
$('#export').addEventListener('click', () => {
  setStrolling(false);
  const blob = new Blob([exportSVG(village, camera(), PALETTES[paletteKey])], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `anant-gaon-${seed.replace(/[^a-z0-9-]/gi, '-').slice(0, 48)}.svg`;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  toast('Your village, saved as SVG.');
});
$('#share').addEventListener('click', async () => {
  updateURL();
  try { await navigator.clipboard.writeText(location.href); toast('Link copied. This view is yours to share.'); }
  catch { toast('Copy the address from your browser to share this view.'); }
});
$('#about-open').addEventListener('click', () => { dialog.showModal(); });
$('#about-close').addEventListener('click', () => dialog.close());
dialog.addEventListener('click', event => { if (event.target === dialog) { const r = dialog.getBoundingClientRect(); if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) dialog.close(); } });
dialog.addEventListener('close', () => { lastTime = 0; requestRender(); });

let drag: { id: number; x: number; center: number; moved: boolean } | null = null;
svg.addEventListener('pointerdown', event => {
  if (event.button !== 0) return;
  setStrolling(false);
  drag = { id: event.pointerId, x: event.clientX, center, moved: false };
  svg.setPointerCapture(event.pointerId);
  svg.classList.add('dragging');
});
svg.addEventListener('pointermove', event => {
  if (!drag || drag.id !== event.pointerId) return;
  const delta = event.clientX - drag.x;
  if (Math.abs(delta) > 3) drag.moved = true;
  center = Math.max(-1e7, Math.min(1e7, drag.center - delta * camera().width / svg.clientWidth));
  changed();
});
function endDrag(): void { drag = null; svg.classList.remove('dragging'); }
svg.addEventListener('pointerup', endDrag);
svg.addEventListener('pointercancel', endDrag);
svg.addEventListener('lostpointercapture', endDrag);
svg.addEventListener('wheel', event => {
  if (event.ctrlKey || event.metaKey) return;
  // Preserve ordinary page scrolling; horizontal trackpad gestures pan the art.
  if (Math.abs(event.deltaX) > Math.abs(event.deltaY)) {
    event.preventDefault();
    setStrolling(false);
    center = Math.max(-1e7, Math.min(1e7, center + event.deltaX * camera().width / svg.clientWidth));
    changed();
  }
}, { passive: false });
svg.addEventListener('keydown', event => {
  if (event.key === 'ArrowRight') { event.preventDefault(); move(1); }
  if (event.key === 'ArrowLeft') { event.preventDefault(); move(-1); }
  if (event.key === '+' || event.key === '=') { event.preventDefault(); setZoom(zoom + .15); }
  if (event.key === '-') { event.preventDefault(); setZoom(zoom - .15); }
  if (event.key === ' ') { event.preventDefault(); setStrolling(!strolling); }
  if (event.key === 'Home') { event.preventDefault(); center = 500; changed(); }
});
document.addEventListener('visibilitychange', () => { lastTime = 0; if (!document.hidden) requestRender(); });
reduceMotion.addEventListener('change', () => { if (reduceMotion.matches) setStrolling(false); });
new ResizeObserver(() => {
  // Keep a useful scene width on narrow screens while maintaining SVG proportions.
  width = Math.max(450, svg.clientWidth / Math.max(1, svg.clientHeight) * height);
  requestRender();
}).observe(svg);
seedInput.value = seed;
setPalette(paletteKey);
requestRender();
