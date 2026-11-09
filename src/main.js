import { REGION_WIDTH, visibleRegions } from './random.js';
import { CHOICES, DEFAULTS, exportSVG, LAND, LAND_NAMES, normalizeOptions, PALETTES, RANGES, Village } from './world.js';

const icons = {
  arrow: '<path d="M4 12h16m-6-6 6 6-6 6"/>',
  download: '<path d="M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5"/>',
  refresh: '<path d="M20 7v5h-5M4 17v-5h5"/><path d="M6 7a7 7 0 0 1 12-1l2 6M4 12l2 6a7 7 0 0 0 12-1"/>',
  plus: '<path d="M5 12h14M12 5v14"/>', minus: '<path d="M5 12h14"/>',
  play: '<path d="m9 5 10 7-10 7z"/>', pause: '<path d="M8 5v14M16 5v14"/>',
  link: '<path d="m10 13 4-2m-4-4 2-2a5 5 0 0 1 7 7l-2 2m-3 3-2 2a5 5 0 0 1-7-7l2-2"/>',
  close: '<path d="m6 6 12 12M6 18 18 6"/>',
  sliders: '<path d="M4 7h10m4 0h2M4 17h4m4 0h8"/><circle cx="16" cy="7" r="2"/><circle cx="10" cy="17" r="2"/>',
};
const icon = (name, cls = '') => `<svg class="icon ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[name]}</svg>`;
const emblem = '<svg class="emblem" viewBox="0 0 40 48" aria-hidden="true"><circle cx="20" cy="6" r="4" fill="currentColor"/><path d="M12 14h16l-8 14zM20 28l10 13H10z" fill="currentColor"/><path d="m13 16-9 8 5 7m18-15 9 8-5 7M15 41l-3 6m13-6 3 6" fill="none" stroke="currentColor" stroke-width="2"/></svg>';

const LABELS = {
  density: 'Density', life: 'People', wild: 'Wildlife', sky: 'Birds & stars', wobble: 'Hand-drawn wobble', weight: 'Line weight',
  season: 'Season', time: 'Time of day', border: 'Border', ...LAND_NAMES,
};
const CHOICE_LABELS = { harvest: 'Harvest', monsoon: 'Monsoon', summer: 'Summer', day: 'Day', dusk: 'Dusk', night: 'Night', zigzag: 'Zig-zag', dots: 'Dots', none: 'None' };
const slider = key => {
  const [min, max] = RANGES[key];
  return `<label class="setting"><span>${LABELS[key]}</span><output data-for="${key}"></output><input type="range" data-option="${key}" min="${min}" max="${max}" step="0.05"></label>`;
};
const select = key => `<label class="setting"><span>${LABELS[key]}</span><select data-option="${key}">${CHOICES[key].map(v => `<option value="${v}">${CHOICE_LABELS[v]}</option>`).join('')}</select></label>`;

document.querySelector('#app').innerHTML = `
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
      <svg id="village" role="img" aria-label="A procedurally drawn Warli-inspired village. Use the previous and next buttons or arrow keys to explore." tabindex="0" preserveAspectRatio="xMidYMid meet"><title>Anant Gaon — an endless village</title><g id="world"></g></svg>
      <div class="art-bottom"><button class="scene-arrow previous" id="previous" aria-label="Walk back">${icon('arrow')}</button><span class="wander-hint"><span aria-hidden="true">←</span> DRAG TO WANDER <span aria-hidden="true">→</span></span><button class="scene-arrow" id="next" aria-label="Walk on">${icon('arrow')}</button></div>
    </section>
    <section class="toolbar" aria-label="Artwork controls">
      <form id="seed-form" class="seed-controls"><label for="seed">VILLAGE SEED</label><div class="seed-input-wrap"><input id="seed" name="seed" maxlength="64" autocomplete="off" spellcheck="false" aria-label="Village seed" required><button type="submit" class="seed-apply" aria-label="Apply seed" title="Apply seed">${icon('arrow')}</button></div><button type="button" class="icon-button new-village" id="regenerate" aria-label="Generate a new village" title="New village">${icon('refresh')}</button></form>
      <div class="palette-controls" role="group" aria-label="Artwork palette">${Object.entries(PALETTES).map(([key, p]) => `<button class="swatch" style="background:${p.ground}" data-palette="${key}" aria-label="${p.name} palette" title="${p.name}" aria-pressed="false"></button>`).join('')}<span id="palette-label"></span></div>
      <div class="view-controls"><div class="zoom-controls" role="group" aria-label="Zoom"><button class="icon-button" id="zoom-out" aria-label="Zoom out">${icon('minus')}</button><button id="zoom-reset" class="zoom-level" aria-label="Reset zoom">100%</button><button class="icon-button" id="zoom-in" aria-label="Zoom in">${icon('plus')}</button></div><span class="separator"></span><button class="button wander-button" id="autoplay" aria-pressed="false">${icon('play')}<span>Take a stroll</span></button></div>
    </section>
    <details class="settings" id="settings">
      <summary>${icon('sliders')}<span>Village settings</span></summary>
      <div class="settings-grid">
        <fieldset><legend>Village</legend>${['density', 'life', 'wild', 'sky'].map(slider).join('')}</fieldset>
        <fieldset><legend>Land mix</legend>${LAND.map(slider).join('')}</fieldset>
        <fieldset><legend>Mood</legend>${Object.keys(CHOICES).map(select).join('')}</fieldset>
        <fieldset><legend>Line</legend>${['wobble', 'weight'].map(slider).join('')}<button type="button" class="button reset-button" id="reset-settings">Reset settings</button></fieldset>
      </div>
    </details>
    <div class="scene-caption"><div><span class="scene-number" id="scene-number">01</span><span class="scene-name" id="scene-name"></span><span class="caption-divider">/</span><span id="scene-description"></span></div><button class="text-button share-button" id="share" aria-label="Copy this view">${icon('link')}<span>Copy this view</span></button></div>
  </main>
  <footer><span>Every line is a calculation. Every village, a little different.</span><span>Inspired by <a href="https://github.com/LingDong-/shan-shui-inf" target="_blank" rel="noopener noreferrer">{Shan, Shui}*</a> <span class="footer-star">✳</span></span></footer>
  <div class="toast" id="toast" role="status" aria-live="polite"></div>
  <dialog id="about" aria-labelledby="about-title"><button class="icon-button dialog-close" id="about-close" aria-label="Close about">${icon('close')}</button><p class="eyebrow">THE ART & THE ALGORITHM</p><h2 id="about-title">Small rules.<br>Endless possibilities.</h2><p>Warli artists tell stories of community, nature, and everyday life through a rich vocabulary of geometric forms: circles, triangles and lines. Anant Gaon is an original experiment inspired by that visual language.</p><p>There are no pictures hidden behind the canvas. JavaScript calculates every triangle, bullock, dancer and blade of grass, and your browser draws them as SVG.</p><div class="about-details"><span>01</span><p><strong>A village that plans itself.</strong> Slow noise fields decide where homes, fields, ponds, forests and festivals appear, so the land changes as you walk instead of repeating.</p><span>02</span><p><strong>A village that remembers.</strong> Each stretch of land has its own seed. Come back and find it just as you left it.</p><span>03</span><p><strong>Make it yours.</strong> Change the density, season, time of day and land mix, then save the view as an SVG or share its link.</p></div><p class="about-credit">The infinite scroll is inspired by <a href="https://github.com/LingDong-/shan-shui-inf" target="_blank" rel="noopener noreferrer">{Shan, Shui}* by Lingdong Huang ↗</a>, a procedurally generated Chinese landscape. No code is reused. This is a contemporary, code-based interpretation; it does not represent the full tradition or the work of a Warli artist. <a href="https://artsandculture.google.com/asset/the-art-of-warli/NQHgRIMVSS1_hw" target="_blank" rel="noopener noreferrer">Explore Warli art ↗</a></p><p class="keyboard-help">Drag or use ← → to explore. Use + / − to zoom. Press Space on the artwork to stroll.</p></dialog>
`;

const $ = selector => document.querySelector(selector);
const svg = $('#village');
const world = $('#world');
const seedInput = $('#seed');
const dialog = $('#about');
const params = new URLSearchParams(location.search);
let seed = (params.get('seed') || 'sahaj-108').trim().slice(0, 64) || 'sahaj-108';
let options = normalizeOptions(Object.fromEntries(params));
let village = new Village(seed, options);
let center = Number(params.get('x') ?? 500);
if (!Number.isFinite(center)) center = 500;
center = Math.max(-1e7, Math.min(1e7, center));
let zoom = Number(params.get('zoom') ?? 1);
if (!Number.isFinite(zoom)) zoom = 1;
zoom = Math.max(0.65, Math.min(1.8, zoom));
let paletteKey = params.get('palette') || 'clay';
if (!Object.hasOwn(PALETTES, paletteKey)) paletteKey = 'clay';
let width = 1500;
const height = 680;
let strolling = false;
let frame = 0;
let lastTime = 0;
let needsRender = true;
let toastTimer;
let urlTimer;
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');
const descriptions = {
  home: { name: 'At home', text: 'Grain in the store, smoke from the hearth.' },
  field: { harvest: 'Sickles out; the season repays the work.', monsoon: 'Bullocks, ploughs and the first green rows.', summer: 'Dry furrows waiting for the rain.' },
  water: { name: 'By the water', text: 'Where the village pauses for a while.' },
  forest: { name: 'Among the trees', text: 'Room for the wild and the wandering.' },
  grove: { name: 'The sacred grove', text: 'Waghoba keeps watch from under the old trees.' },
  festival: { name: 'The tarpa dance', text: 'Hand in hand, circling the music.' },
  open: { name: 'Open ground', text: 'A breath between places.' },
};
const camera = () => ({ center, width: width / zoom, height: height / zoom, top: (height - height / zoom) * 0.65 });

function updateURL() {
  const url = new URL(location.href);
  const query = { seed, x: center.toFixed(1), zoom: zoom.toFixed(2), palette: paletteKey };
  for (const [key, value] of Object.entries(options)) if (value !== DEFAULTS[key]) query[key] = String(value);
  url.search = new URLSearchParams(query).toString();
  history.replaceState(null, '', url);
}

function requestRender() {
  needsRender = true;
  if (!frame) frame = requestAnimationFrame(tick);
}

let lastCaption = '';
let lastWorldKey = '';
function draw() {
  const view = camera();
  svg.setAttribute('viewBox', `${view.center - view.width / 2} ${view.top} ${view.width} ${view.height}`);
  // Redraw only when a region enters or leaves the view; panning within regions just moves the viewBox.
  const key = JSON.stringify([seed, options, visibleRegions(view.center, view.width)]);
  if (key !== lastWorldKey) {
    world.innerHTML = village.render(view);
    lastWorldKey = key;
  }
  const land = village.landNear(center);
  const info = descriptions[land];
  const caption = `${land}:${options.season}:${Math.floor(center / REGION_WIDTH)}`;
  if (caption !== lastCaption) {
    $('#scene-name').textContent = info.name ?? 'In the fields';
    $('#scene-description').textContent = info.text ?? info[options.season];
    $('#scene-number').textContent = String(Math.abs(Math.floor(center / REGION_WIDTH)) % 100).padStart(2, '0');
    lastCaption = caption;
  }
  $('#zoom-reset').textContent = `${Math.round(zoom * 100)}%`;
  $('#zoom-out').disabled = zoom <= 0.65;
  $('#zoom-in').disabled = zoom >= 1.8;
  needsRender = false;
}

function tick(time) {
  frame = 0;
  if (strolling && !document.hidden && !dialog.open) {
    if (lastTime) center = Math.min(1e7, center + (Math.min(time - lastTime, 50) * 0.035) / zoom);
    needsRender = true;
  }
  lastTime = time;
  if (needsRender) draw();
  if (strolling && !document.hidden && !dialog.open) frame = requestAnimationFrame(tick);
}

function changed() {
  requestRender();
  clearTimeout(urlTimer);
  urlTimer = setTimeout(updateURL, 250);
}

function toast(message) {
  $('#toast').textContent = message;
  $('#toast').classList.add('visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => $('#toast').classList.remove('visible'), 2600);
}

function setStrolling(value) {
  strolling = value;
  lastTime = 0;
  $('#autoplay').setAttribute('aria-pressed', String(value));
  $('#autoplay').innerHTML = `${icon(value ? 'pause' : 'play')}<span>${value ? 'Pause stroll' : 'Take a stroll'}</span>`;
  $('#artwork').classList.toggle('strolling', value);
  if (!value) updateURL();
  requestRender();
}

function setPalette(key) {
  paletteKey = key;
  const palette = PALETTES[key];
  $('#artwork').style.setProperty('--ground', palette.ground);
  $('#artwork').style.setProperty('--ink', palette.ink);
  $('#palette-label').textContent = palette.name;
  document.querySelectorAll('[data-palette]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.palette === key)));
  $('meta[name="theme-color"]').setAttribute('content', palette.ground);
  updateURL();
}

function syncSettings() {
  document.querySelectorAll('[data-option]').forEach(input => { input.value = String(options[input.dataset.option]); });
  document.querySelectorAll('output[data-for]').forEach(out => { out.textContent = Number(options[out.dataset.for]).toFixed(2).replace(/\.?0+$/, '') || '0'; });
}

function setOptions(next) {
  options = normalizeOptions(next);
  village = new Village(seed, options);
  syncSettings();
  changed();
}

function setSeed(value) {
  const nextSeed = value.trim().slice(0, 64);
  if (!nextSeed) { seedInput.setCustomValidity('Enter a village seed.'); seedInput.reportValidity(); return; }
  seedInput.setCustomValidity('');
  seed = nextSeed;
  village = new Village(seed, options);
  seedInput.value = seed;
  center = 500;
  setStrolling(false);
  changed();
}

$('#seed-form').addEventListener('submit', event => { event.preventDefault(); setSeed(seedInput.value); });
seedInput.addEventListener('input', () => seedInput.setCustomValidity(''));
$('#regenerate').addEventListener('click', () => {
  const names = ['sahaj', 'aangan', 'mitti', 'palash', 'dhara', 'banyan', 'monsoon', 'tarpa', 'khale'];
  const values = crypto.getRandomValues(new Uint32Array(2));
  setSeed(`${names[values[0] % names.length]}-${values[1] % 10000}`);
  toast('A new village, a new beginning.');
});
document.querySelectorAll('[data-palette]').forEach(button => button.addEventListener('click', () => setPalette(button.dataset.palette)));
document.querySelectorAll('[data-option]').forEach(input => input.addEventListener('input', () => setOptions({ ...options, [input.dataset.option]: input.value })));
$('#reset-settings').addEventListener('click', () => setOptions({}));

function move(direction) {
  setStrolling(false);
  center = Math.max(-1e7, Math.min(1e7, center + direction * camera().width * 0.6));
  changed();
}
$('#previous').addEventListener('click', () => move(-1));
$('#next').addEventListener('click', () => move(1));
function setZoom(value) { zoom = Math.max(0.65, Math.min(1.8, Math.round(value * 100) / 100)); changed(); }
$('#zoom-out').addEventListener('click', () => setZoom(zoom - 0.15));
$('#zoom-in').addEventListener('click', () => setZoom(zoom + 0.15));
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
$('#about-open').addEventListener('click', () => dialog.showModal());
$('#about-close').addEventListener('click', () => dialog.close());
dialog.addEventListener('click', event => {
  if (event.target !== dialog) return;
  const r = dialog.getBoundingClientRect();
  if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) dialog.close();
});
dialog.addEventListener('close', () => { lastTime = 0; requestRender(); });

let drag = null;
svg.addEventListener('pointerdown', event => {
  if (event.button !== 0) return;
  setStrolling(false);
  drag = { id: event.pointerId, x: event.clientX, center };
  svg.setPointerCapture(event.pointerId);
  svg.classList.add('dragging');
});
svg.addEventListener('pointermove', event => {
  if (!drag || drag.id !== event.pointerId) return;
  center = Math.max(-1e7, Math.min(1e7, drag.center - ((event.clientX - drag.x) * camera().width) / svg.clientWidth));
  changed();
});
function endDrag() { drag = null; svg.classList.remove('dragging'); }
svg.addEventListener('pointerup', endDrag);
svg.addEventListener('pointercancel', endDrag);
svg.addEventListener('lostpointercapture', endDrag);
svg.addEventListener('wheel', event => {
  if (event.ctrlKey || event.metaKey) return;
  // Keep ordinary page scrolling; horizontal trackpad gestures pan the art.
  if (Math.abs(event.deltaX) > Math.abs(event.deltaY)) {
    event.preventDefault();
    setStrolling(false);
    center = Math.max(-1e7, Math.min(1e7, center + (event.deltaX * camera().width) / svg.clientWidth));
    changed();
  }
}, { passive: false });
svg.addEventListener('keydown', event => {
  const keys = {
    ArrowRight: () => move(1), ArrowLeft: () => move(-1),
    '+': () => setZoom(zoom + 0.15), '=': () => setZoom(zoom + 0.15), '-': () => setZoom(zoom - 0.15),
    ' ': () => setStrolling(!strolling), Home: () => { center = 500; changed(); },
  };
  if (keys[event.key]) { event.preventDefault(); keys[event.key](); }
});
document.addEventListener('visibilitychange', () => { lastTime = 0; if (!document.hidden) requestRender(); });
reduceMotion.addEventListener('change', () => { if (reduceMotion.matches) setStrolling(false); });
new ResizeObserver(() => {
  // Keep a useful scene width on narrow screens while maintaining SVG proportions.
  width = Math.max(450, (svg.clientWidth / Math.max(1, svg.clientHeight)) * height);
  requestRender();
}).observe(svg);
seedInput.value = seed;
syncSettings();
setPalette(paletteKey);
requestRender();
