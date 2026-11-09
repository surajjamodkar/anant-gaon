// Music and the sounds of the village, played live with the Web Audio API. No recordings.
// The six pieces are written out below as swaras; the only randomness is which written phrase comes
// next, how long the pause is, and the odd glide, the way a folk player never repeats a tune exactly.

import { random } from './random.js';

/** Semitones above Sa. Lower case is komal (flat); M is tivra (sharp) Ma. */
const SWARA = { S: 0, r: 1, R: 2, g: 3, G: 4, m: 5, M: 6, P: 7, d: 8, D: 9, n: 10, N: 11 };

/**
 * One token per beat: a swara (".D" is the lower octave, "S'" the upper), "-" holds the last note
 * one more beat, "_" is a beat of silence.
 */
export function parsePhrase(text) {
  const notes = [];
  for (const token of text.trim().split(/\s+/)) {
    const last = notes.at(-1);
    if (token === '-') { if (last) last.beats += 1; continue; }
    if (token === '_') { if (last?.rest) last.beats += 1; else notes.push({ rest: true, beats: 1 }); continue; }
    const match = /^(\.*)([SrRgGmMPdDnN])('*)$/.exec(token);
    if (!match) throw new Error(`Unknown swara "${token}" in "${text}"`);
    notes.push({ semi: SWARA[match[2]] + 12 * (match[3].length - match[1].length), beats: 1 });
  }
  return notes;
}

// Keherwa (Dha Ge Na Ti | Na Ka Dhi Na) and dadra (Dha Dhi Na | Dha Ti Na) for the dholki.
// D = both heads, G = bass, n = ringing treble, t = light tap, . = nothing.
const KEHERWA = 'DGntntDn';
const DADRA = 'DDnDtn';

export const PIECES = [
  {
    id: 'bhor', name: 'Bhor', raga: 'Bhupali', note: 'Dawn: drone and flute',
    swaras: 'SRGPD', beat: 1.05, voice: 'flute', drone: 'P', drum: null,
    phrases: [
      'S - - .D S R - - G - - - R - S - -',
      'G R G P - - G - R S - .D S - - -',
      'G P D - P G R G - - - -',
      'P D S\' - - D P - G - R - G - - -',
      'G R S .D .P - .D S - - - -',
      'S R G - P - D P G R S - - -',
    ],
  },
  {
    id: 'khet', name: 'Khet', raga: 'Deshkar', note: 'The fields: flute and a slow dholki',
    swaras: 'SRGPD', beat: 0.82, voice: 'flute', drone: 'P', drum: { pattern: KEHERWA, step: 0.5, level: 0.55 },
    phrases: [
      'P - D P G P - - - -',
      'G P D S\' - - D P - - -',
      'D S\' R\' S\' D P - G P - - -',
      'P G P D P G - - - -',
      'S\' - D P G P D - P - - -',
      'G - P - D - S\' - - - -',
    ],
  },
  {
    id: 'tarpa', name: 'Tarpa naach', raga: 'Tarpa tune', note: 'The dance: tarpa over keherwa',
    swaras: 'SRGPD', beat: 0.6, voice: 'tarpa', drone: 'P', drum: { pattern: KEHERWA, step: 0.5, level: 0.8 },
    repeat: 0.55,
    phrases: [
      'S R G R S R G P G R S -',
      'G P G R G P G R S - S -',
      'R G P - G R S - .D S - -',
      'P - G R S R G - G R S -',
      'G G P D P G R G R S - -',
    ],
  },
  {
    id: 'megh', name: 'Barsaat', raga: 'Megh', note: 'Monsoon: flute in the rain',
    swaras: 'SRmPn', beat: 1.1, voice: 'flute', drone: 'P', drum: { pattern: DADRA, step: 0.5, level: 0.35 },
    phrases: [
      '.n S R - - - R m R - S - -',
      'R m P - - m R - S - -',
      'm P n - P - m R - - -',
      'P n S\' - - n P - m R - S - -',
      'R - m R S .n S - - -',
    ],
  },
  {
    id: 'sanjh', name: 'Sanjh', raga: 'Durga', note: 'Dusk: cattle coming home',
    swaras: 'SRmPD', beat: 0.95, voice: 'flute', drone: 'P', drum: { pattern: DADRA, step: 0.5, level: 0.4 },
    phrases: [
      'S R m - - P - D - m R - - -',
      'm P D - S\' - D P - m - - -',
      'D S\' R\' S\' D - P D m - - -',
      'R m P D m R S - - - -',
      '.D S R - m - R - S - - -',
    ],
  },
  {
    id: 'raat', name: 'Raat', raga: 'Malkauns', note: 'Night: low flute and crickets',
    swaras: 'Sgmdn', beat: 1.3, voice: 'flute', drone: 'm', drum: null,
    phrases: [
      '.n S - - g - m - - - g S - - -',
      'g m d - - m - g m g - S - - -',
      'm d n d - - m - - -',
      'd n S\' - - n d - m - g - - -',
      'g m g S .n S - - - - -',
    ],
  },
];

export const MODES = { order: 'In order', shuffle: 'Shuffle', follow: 'Follow the village' };

/** The piece that suits a stretch of village: the festival has its dance, then rain, then the hour. */
export function pieceFor({ season, time, land }) {
  if (land === 'festival') return 'tarpa';
  if (season === 'monsoon') return 'megh';
  if (time === 'night') return 'raat';
  if (time === 'dusk') return 'sanjh';
  return land === 'field' ? 'khet' : 'bhor';
}

const SA = 293.66; // D4, about where a medium bansuri sits
const hz = (semi, base = SA) => base * 2 ** (semi / 12);
const LOOKAHEAD = 2.5; // seconds scheduled ahead, so a throttled background tab still plays smoothly
const FADE = 3;
const TRACK_SECONDS = [150, 210];

export class Soundscape {
  constructor({ seed = 'anant', mode = 'order', music = 0.7, ambience = 0.6, onChange = () => {} } = {}) {
    Object.assign(this, { seed, mode, onChange });
    this.levels = { music, ambience };
    this.scene = { season: 'harvest', time: 'day', land: 'open' };
    this.index = 0;
    this.playing = false;
    this.plays = 0;
  }

  get piece() { return PIECES[this.index]; }

  async start() {
    if (!this.ctx) this.build();
    await this.ctx.resume();
    this.playing = true;
    const now = this.ctx.currentTime;
    this.master.gain.cancelScheduledValues(now);
    this.master.gain.setTargetAtTime(1, now, 0.4);
    if (!this.track) this.begin(this.mode === 'follow' ? this.wanted() : this.index);
    if (!this.timer) this.timer = setInterval(() => this.tick(), 250);
    this.tick();
    this.onChange();
  }

  stop() {
    if (!this.ctx || !this.playing) return;
    this.playing = false;
    const now = this.ctx.currentTime;
    this.master.gain.setTargetAtTime(0, now, 0.25);
    clearInterval(this.timer);
    this.timer = null;
    // Let the fade finish, then drop everything scheduled so a restart begins cleanly.
    setTimeout(() => { if (!this.playing) { this.end(this.track, 0); this.track = null; this.ctx.suspend(); } }, 1200);
    this.onChange();
  }

  next() {
    const step = this.mode === 'shuffle' ? 1 + Math.floor(Math.random() * (PIECES.length - 1)) : 1;
    this.hold = (this.ctx?.currentTime ?? 0) + 120; // in follow mode, a chosen piece is kept for a while
    this.change((this.index + step) % PIECES.length);
  }

  setMode(mode) { if (Object.hasOwn(MODES, mode)) { this.mode = mode; this.hold = 0; this.onChange(); } }
  setSeed(seed) { this.seed = seed; }

  setLevel(which, value) {
    this.levels[which] = value;
    if (this.ctx) this[`${which}Bus`].gain.setTargetAtTime(value, this.ctx.currentTime, 0.1);
  }

  setScene(scene) {
    const wanted = pieceFor(scene);
    if (wanted !== pieceFor(this.scene)) this.wantedSince = this.ctx?.currentTime ?? 0;
    this.scene = { ...scene };
    if (this.ctx) this.mixAmbience();
  }

  wanted() { return PIECES.findIndex(p => p.id === pieceFor(this.scene)); }

  // ----- graph -----

  build() {
    const ctx = this.ctx = new AudioContext();
    this.master = ctx.createGain();
    this.master.gain.value = 0;
    const out = ctx.createDynamicsCompressor();
    out.threshold.value = -14; out.ratio.value = 3;
    this.master.connect(out).connect(ctx.destination);
    // A small mud-walled room: decaying noise as the impulse response.
    this.reverb = ctx.createConvolver();
    const length = Math.floor(ctx.sampleRate * 2.4);
    const impulse = ctx.createBuffer(2, length, ctx.sampleRate);
    for (let c = 0; c < 2; c++) {
      const data = impulse.getChannelData(c);
      for (let i = 0; i < length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / length) ** 3;
    }
    this.reverb.buffer = impulse;
    const wet = ctx.createGain(); wet.gain.value = 0.32;
    this.reverb.connect(wet).connect(this.master);
    this.musicBus = ctx.createGain(); this.musicBus.gain.value = this.levels.music;
    this.ambienceBus = ctx.createGain(); this.ambienceBus.gain.value = this.levels.ambience;
    this.musicBus.connect(this.master);
    this.ambienceBus.connect(this.master);
    const send = ctx.createGain(); send.gain.value = 0.18;
    this.ambienceBus.connect(send).connect(this.reverb);
    this.noise = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const n = this.noise.getChannelData(0);
    for (let i = 0; i < n.length; i++) n[i] = Math.random() * 2 - 1;
    this.buildAmbience();
  }

  /** A track is one play of a piece, with its own bus so it can fade out under the next one. */
  begin(index) {
    const ctx = this.ctx, now = ctx.currentTime;
    this.index = index;
    const piece = this.piece;
    const bus = ctx.createGain();
    bus.gain.setValueAtTime(0, now);
    bus.gain.linearRampToValueAtTime(1, now + FADE);
    bus.connect(this.musicBus);
    const send = ctx.createGain(); send.gain.value = 1;
    bus.connect(send).connect(this.reverb);
    const rng = random(`${this.seed}:${piece.id}:${this.plays++}`);
    this.track = {
      piece, bus, rng, nodes: new Set(), started: now,
      ends: now + TRACK_SECONDS[0] + rng() * (TRACK_SECONDS[1] - TRACK_SECONDS[0]),
      phrase: -1, melodyAt: now + 2 + rng() * 2, droneAt: now + 0.1, drone: 0,
      drumAt: now + piece.beat * 8, drumStep: 0, drumOn: true,
    };
    this.onChange();
  }

  end(track, fade = FADE) {
    if (!track) return;
    const now = this.ctx.currentTime;
    track.bus.gain.cancelScheduledValues(now);
    track.bus.gain.setValueAtTime(track.bus.gain.value, now);
    track.bus.gain.linearRampToValueAtTime(0, now + fade + 0.01);
    setTimeout(() => {
      for (const node of track.nodes) try { node.stop(); } catch {}
      track.bus.disconnect();
    }, (fade + 0.2) * 1000);
  }

  change(index) {
    if (!this.ctx || !this.playing) { this.index = index; this.onChange(); return; }
    this.end(this.track);
    this.begin(index);
  }

  tick() {
    if (!this.playing) return;
    const now = this.ctx.currentTime, track = this.track;
    if (this.mode === 'follow') {
      const want = this.wanted();
      const settled = now - (this.wantedSince ?? 0) > 6 && now - track.started > 20 && now > (this.hold ?? 0);
      if (want !== this.index && settled) return this.change(want);
    }
    if (now > track.ends) {
      const step = this.mode === 'shuffle' ? 1 + Math.floor(Math.random() * (PIECES.length - 1)) : 1;
      return this.change(this.mode === 'follow' ? this.index : (this.index + step) % PIECES.length);
    }
    const horizon = now + LOOKAHEAD;
    // After a pause, pick up from now rather than rushing through what was missed.
    for (const key of ['droneAt', 'melodyAt', 'drumAt']) track[key] = Math.max(track[key], now + 0.05);
    while (track.droneAt < horizon) this.pluck(track);
    while (track.melodyAt < horizon) this.phrase(track);
    if (track.piece.drum) while (track.drumAt < horizon) this.drum(track);
    this.ambience(horizon);
  }

  keep(track, ...nodes) {
    for (const node of nodes) { track.nodes.add(node); node.onended = () => track.nodes.delete(node); }
  }

  // ----- tanpura -----

  pluck(track) {
    const ctx = this.ctx, t = track.droneAt, piece = track.piece;
    // Pa (or Ma) below, Sa, Sa, then low Sa: the tanpura's four strings.
    const first = SWARA[piece.drone] - 12;
    const semi = [first, 0, 0, -12][track.drone % 4];
    const f = hz(semi, SA / 2);
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass'; filter.Q.value = 2;
    filter.frequency.setValueAtTime(3200, t);
    filter.frequency.exponentialRampToValueAtTime(500, t + 3);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.045, t + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0005, t + 4.5);
    filter.connect(gain).connect(track.bus);
    for (const cents of [-5, 4]) {
      const osc = ctx.createOscillator();
      osc.type = 'sawtooth'; osc.frequency.value = f; osc.detune.value = cents;
      osc.connect(filter); osc.start(t); osc.stop(t + 4.6);
      this.keep(track, osc);
    }
    track.drone++;
    track.droneAt += (track.drone % 4 === 0 ? 1.6 : 1.15) + track.rng() * 0.08;
  }

  // ----- melody -----

  phrase(track) {
    const { piece, rng } = track;
    const last = track.phrase;
    let i;
    if (last >= 0 && rng() < (piece.repeat ?? 0.15)) i = last;
    else if (rng() < 0.6) i = (last + 1) % piece.phrases.length;
    else i = Math.floor(rng() * piece.phrases.length);
    track.phrase = i;
    const notes = parsePhrase(piece.phrases[i]);
    // The odd held ending: a player lingering on the last note.
    const tail = notes.at(-1);
    if (tail && !tail.rest && rng() < 0.3) tail.beats += 1;
    const length = this[piece.voice](track, notes, track.melodyAt);
    const pause = piece.voice === 'tarpa' ? rng() * 1.5 : 1.5 + rng() * 3.5;
    track.melodyAt += length + pause * piece.beat;
  }

  /**
   * One breath of the bansuri: a soft, nearly pure tone (no breath noise, which read as scratching),
   * notes blown up into tune, kan (grace) notes flicked in from the swara above, and vibrato that only
   * blooms once a note is held. Returns seconds.
   */
  flute(track, notes, start) {
    const ctx = this.ctx, { piece, rng } = track;
    const beat = piece.beat * (0.97 + rng() * 0.06);
    const total = notes.reduce((s, n) => s + n.beats, 0) * beat;
    const end = start + total + 1;
    const scale = [...piece.swaras].map(c => SWARA[c]);
    const above = semi => { // the next swara of the raga above this one
      for (let o = -24; o <= 24; o += 12) for (const s of scale) if (s + o > semi) return s + o;
      return semi + 2;
    };
    // Tone: strong fundamental, some second harmonic, a trace of the rest.
    this.fluteWave ??= ctx.createPeriodicWave(new Float32Array(7), new Float32Array([0, 1, 0.3, 0.1, 0.045, 0.02, 0.008]));
    const osc = ctx.createOscillator(); osc.setPeriodicWave(this.fluteWave);
    // An unsteady breath: very slow noise wobbling the level a few percent.
    const drift = ctx.createBufferSource(); drift.buffer = this.noise; drift.loop = true; drift.playbackRate.value = 0.5;
    const driftLow = ctx.createBiquadFilter(); driftLow.type = 'lowpass'; driftLow.frequency.value = 9;
    const driftGain = ctx.createGain(); driftGain.gain.value = 4;
    const swell = ctx.createGain(); swell.gain.value = 1;
    drift.connect(driftLow).connect(driftGain).connect(swell.gain);
    // Vibrato in pitch and breath, its depth automated per note.
    const lfo = ctx.createOscillator(); lfo.frequency.value = 5 + rng() * 0.8;
    const pitchDepth = ctx.createGain(); pitchDepth.gain.setValueAtTime(0, start);
    const breathDepth = ctx.createGain(); breathDepth.gain.setValueAtTime(0, start);
    lfo.connect(pitchDepth).connect(osc.detune);
    lfo.connect(breathDepth).connect(swell.gain);
    const amp = ctx.createGain(); amp.gain.setValueAtTime(0, start);
    const soften = ctx.createBiquadFilter(); soften.type = 'lowpass'; soften.frequency.value = 5500;
    osc.connect(swell);
    swell.connect(amp).connect(soften).connect(track.bus);

    const peak = 0.15;
    const setPitch = (f, t) => osc.frequency.setValueAtTime(f, t);
    const rampPitch = (f, t) => osc.frequency.linearRampToValueAtTime(f, t);
    let t = start, prev = null, sounding = false;
    for (const note of notes) {
      const dur = note.beats * beat;
      if (note.rest) {
        if (sounding) amp.gain.setTargetAtTime(0, t, 0.07);
        sounding = false; t += dur; continue;
      }
      const f = hz(note.semi);
      const glide = sounding && Math.abs(note.semi - prev) <= 4 && rng() < 0.3; // meend
      const kan = !glide && prev !== null && dur >= beat && rng() < 0.3;
      if (glide) {
        setPitch(hz(prev), t); rampPitch(f, t + 0.16);
      } else {
        // Blown up into tune: a fraction flat, settling in ~80 ms. A kan touches the swara above first.
        let at = t;
        if (kan) { setPitch(hz(above(note.semi)), at); at += 0.065; }
        setPitch(f * 0.982, at); rampPitch(f, at + 0.08);
        if (sounding) { amp.gain.setTargetAtTime(peak * 0.45, t, 0.01); amp.gain.setTargetAtTime(peak, t + 0.035, 0.035); }
        else amp.gain.setTargetAtTime(peak, t, 0.045);
      }
      // Vibrato only on held notes, arriving late and gently.
      for (const [param, depth] of [[pitchDepth.gain, 12], [breathDepth.gain, 0.09]]) {
        param.setTargetAtTime(0, t, 0.02);
        if (dur > 0.9) param.setTargetAtTime(depth * (0.7 + rng() * 0.5), t + 0.4, 0.3);
      }
      // Long notes settle a little, as the breath runs out.
      if (dur > beat * 1.5) amp.gain.setTargetAtTime(peak * 0.8, t + 0.35, dur * 0.7);
      sounding = true; prev = note.semi; t += dur;
    }
    amp.gain.setTargetAtTime(0, t, 0.1);
    osc.start(start); lfo.start(start);
    drift.start(start, rng() * 1.5);
    for (const node of [osc, lfo, drift]) { node.stop(end); this.keep(track, node); }
    return total;
  }

  /** One breath of the tarpa: a reedy, nasal tune over its own drone pipe. Returns seconds. */
  tarpa(track, notes, start) {
    const ctx = this.ctx, { piece, rng } = track;
    const beat = piece.beat * (0.97 + rng() * 0.06);
    const total = notes.reduce((s, n) => s + n.beats, 0) * beat;
    const end = start + total + 0.6;
    const amp = ctx.createGain();
    amp.gain.setValueAtTime(0, start);
    const tone = ctx.createBiquadFilter();
    tone.type = 'lowpass'; tone.frequency.value = 1300; tone.Q.value = 5;
    tone.connect(amp).connect(track.bus);
    const oscs = [['sawtooth', 1, 0.5], ['square', 0.5, 0.14]].map(([type, ratio, level]) => {
      const osc = ctx.createOscillator();
      osc.type = type;
      const g = ctx.createGain(); g.gain.value = level;
      osc.connect(g).connect(tone);
      return { osc, ratio };
    });
    const lfo = ctx.createOscillator(); lfo.frequency.value = 4.2;
    const depth = ctx.createGain(); depth.gain.value = 5;
    lfo.connect(depth);
    for (const { osc } of oscs) depth.connect(osc.detune);
    // The second pipe holds low Sa under the tune.
    const pipe = ctx.createOscillator(); pipe.type = 'sawtooth'; pipe.frequency.value = SA / 2;
    const pipeGain = ctx.createGain(); pipeGain.gain.value = 0.22;
    pipe.connect(pipeGain).connect(tone);
    const peak = 0.13;
    let t = start, prev = null, sounding = false;
    for (const note of notes) {
      const dur = note.beats * beat;
      if (note.rest) {
        if (sounding) amp.gain.setTargetAtTime(0, t, 0.06);
        sounding = false; t += dur; continue;
      }
      const f = hz(note.semi);
      const glide = sounding && Math.abs(note.semi - prev) <= 3 && rng() < 0.3;
      for (const { osc, ratio } of oscs) {
        if (glide) { osc.frequency.setValueAtTime(hz(prev) * ratio, t); osc.frequency.linearRampToValueAtTime(f * ratio, t + 0.14); }
        else osc.frequency.setValueAtTime(f * ratio, t);
      }
      if (!sounding) amp.gain.setTargetAtTime(peak, t, 0.02);
      else if (!glide) { amp.gain.setTargetAtTime(peak * 0.6, t, 0.012); amp.gain.setTargetAtTime(peak, t + 0.04, 0.03); }
      if (dur > beat * 1.5) amp.gain.setTargetAtTime(peak * 0.78, t + 0.3, dur * 0.6);
      sounding = true; prev = note.semi; t += dur;
    }
    amp.gain.setTargetAtTime(0, t, 0.12);
    for (const node of [...oscs.map(o => o.osc), lfo, pipe]) { node.start(start); node.stop(end); this.keep(track, node); }
    return total;
  }

  // ----- dholki -----

  drum(track) {
    const { piece, rng } = track;
    const { pattern, step, level } = piece.drum;
    const t = track.drumAt + (rng() - 0.5) * 0.024;
    const stroke = pattern[track.drumStep % pattern.length];
    // Sections: the drum rests now and then, starting again at the top of the cycle.
    if (track.drumStep % pattern.length === 0) track.drumOn = rng() < (track.drumOn ? 0.9 : 0.5);
    if (track.drumOn && stroke !== '.') {
      const v = level * (0.75 + rng() * 0.4) * (track.drumStep % pattern.length === 0 ? 1.2 : 1);
      if (stroke === 'D' || stroke === 'G') this.bass(track, t, v);
      if (stroke === 'D' || stroke === 'n') this.ring(track, t, v * 0.8);
      if (stroke === 't') this.tap(track, t, v * 0.6);
    }
    track.drumStep++;
    track.drumAt += piece.beat * step;
  }

  bass(track, t, v) {
    const ctx = this.ctx;
    const osc = ctx.createOscillator();
    osc.frequency.setValueAtTime(120, t);
    osc.frequency.exponentialRampToValueAtTime(58, t + 0.22);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.4 * v, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
    osc.connect(g).connect(track.bus);
    osc.start(t); osc.stop(t + 0.55);
    this.keep(track, osc);
  }

  ring(track, t, v) {
    const ctx = this.ctx;
    const osc = ctx.createOscillator();
    osc.frequency.value = SA * 1.02;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.16 * v, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
    osc.connect(g).connect(track.bus);
    osc.start(t); osc.stop(t + 0.32);
    this.keep(track, osc);
    this.tap(track, t, v * 0.7);
  }

  tap(track, t, v) {
    const ctx = this.ctx;
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    const band = ctx.createBiquadFilter(); band.type = 'bandpass'; band.frequency.value = 2600; band.Q.value = 1.5;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.25 * v, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.06);
    src.connect(band).connect(g).connect(track.bus);
    src.start(t, Math.random() * 1.5, 0.08);
    this.keep(track, src);
  }

  // ----- the village around you -----

  buildAmbience() {
    const ctx = this.ctx;
    this.rain = ctx.createGain(); this.rain.gain.value = 0;
    const src = ctx.createBufferSource(); src.buffer = this.noise; src.loop = true;
    const low = ctx.createBiquadFilter(); low.type = 'lowpass'; low.frequency.value = 2400;
    const high = ctx.createBiquadFilter(); high.type = 'highpass'; high.frequency.value = 350;
    src.connect(low).connect(high).connect(this.rain).connect(this.ambienceBus);
    src.start();
    this.calls = { crickets: 0, birds: 0, bells: 0 };
    this.mixAmbience();
  }

  /** How much of each sound this stretch of village has, from 0 to about 1. */
  mixAmbience() {
    const { season, time, land } = this.scene;
    const wild = land === 'forest' || land === 'grove';
    this.amounts = {
      rain: season === 'monsoon' ? 1 : 0,
      crickets: time === 'night' ? 1 : time === 'dusk' ? 0.4 : 0,
      birds: time === 'night' ? 0 : (wild ? 1 : 0.45) * (time === 'dusk' ? 0.6 : 1) * (season === 'monsoon' ? 0.5 : 1),
      bells: time === 'night' ? 0 : ['field', 'home', 'open'].includes(land) ? 0.8 : 0.15,
    };
    this.rain.gain.setTargetAtTime(this.amounts.rain * 0.12, this.ctx.currentTime, 1.5);
  }

  ambience(horizon) {
    const ctx = this.ctx;
    // Each sound is a random process: the busier the place, the shorter the waits between calls.
    const waits = { crickets: [0.4, 1.4], birds: [1.5, 6], bells: [2.5, 9] };
    for (const [kind, [a, b]] of Object.entries(waits)) {
      const amount = this.amounts[kind];
      if (this.calls[kind] < ctx.currentTime) this.calls[kind] = ctx.currentTime + Math.random();
      while (this.calls[kind] < horizon) {
        const t = this.calls[kind];
        if (amount > 0 && Math.random() < amount) this[kind](t);
        this.calls[kind] += a + Math.random() * (b - a);
      }
    }
  }

  out(pan) {
    const p = this.ctx.createStereoPanner();
    p.pan.value = pan;
    p.connect(this.ambienceBus);
    return p;
  }

  crickets(t) {
    const ctx = this.ctx;
    const osc = ctx.createOscillator();
    osc.frequency.value = 4300 + Math.random() * 500;
    const g = ctx.createGain(); g.gain.setValueAtTime(0, t);
    const pulses = 3 + Math.floor(Math.random() * 3);
    for (let i = 0; i < pulses; i++) {
      const s = t + i * 0.045;
      g.gain.setValueAtTime(0.02, s);
      g.gain.setValueAtTime(0, s + 0.022);
    }
    osc.connect(g).connect(this.out(Math.random() * 1.6 - 0.8));
    osc.start(t); osc.stop(t + pulses * 0.045 + 0.05);
  }

  birds(t) {
    const ctx = this.ctx;
    const base = 2200 + Math.random() * 1800;
    const notes = 2 + Math.floor(Math.random() * 4);
    const up = Math.random() < 0.5;
    const osc = ctx.createOscillator();
    const g = ctx.createGain(); g.gain.setValueAtTime(0, t);
    for (let i = 0; i < notes; i++) {
      const s = t + i * 0.13;
      osc.frequency.setValueAtTime(base * (up ? 0.85 : 1.15), s);
      osc.frequency.exponentialRampToValueAtTime(base * (up ? 1.15 : 0.85), s + 0.08);
      g.gain.setValueAtTime(0, s);
      g.gain.linearRampToValueAtTime(0.03, s + 0.015);
      g.gain.linearRampToValueAtTime(0, s + 0.09);
    }
    osc.connect(g).connect(this.out(Math.random() * 1.8 - 0.9));
    osc.start(t); osc.stop(t + notes * 0.13 + 0.05);
  }

  /** A cow's bell: a hammered, slightly out-of-tune clank, two or three as she walks. */
  bells(t) {
    const ctx = this.ctx;
    const base = 700 + Math.random() * 400;
    const out = this.out(Math.random() * 1.4 - 0.7);
    const hits = 1 + Math.floor(Math.random() * 3);
    for (let h = 0; h < hits; h++) {
      const s = t + h * (0.35 + Math.random() * 0.3);
      const v = 0.02 * (0.6 + Math.random() * 0.6);
      for (const [ratio, level, decay] of [[1, 1, 0.9], [2.32, 0.6, 0.5], [4.1, 0.35, 0.25]]) {
        const osc = ctx.createOscillator();
        osc.frequency.value = base * ratio;
        const g = ctx.createGain();
        g.gain.setValueAtTime(v * level, s);
        g.gain.exponentialRampToValueAtTime(0.0001, s + decay);
        osc.connect(g).connect(out);
        osc.start(s); osc.stop(s + decay + 0.05);
      }
    }
  }
}
