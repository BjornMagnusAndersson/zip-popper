// The sound player. The game asks for a sound by name (play('pop_small')); soundTable.js says whether that is a
// generated sound (WebAudio, synthVoices.js) or an audio file. Two separate switches: sound effects and music.
// Browsers only allow sound after a tap, so nothing plays before unlock() was called from inside a tap.
import { VOICES } from './synthVoices.js';
import { SOUND_TABLE } from './soundTable.js';

/**
 * Create the sound player.
 * @param {{sfxOn?: boolean, musicOn?: boolean, onChange?: (s: {sfxOn: boolean, musicOn: boolean}) => void,
 *   table?: object, baseUrl?: string}} [opts] start state of the switches, a callback when a switch changes (to remember
 *   it), the sound table (for tests) and the folder that file urls are relative to
 * @returns {object} player: unlock(), play(name, o), isOn(), setOn(on), isMusicOn(), setMusicOn(on), has(name), dispose()
 */
export function createSound({ sfxOn = true, musicOn = true, onChange, table = SOUND_TABLE, baseUrl } = {}) {
  let sfx = sfxOn;
  let music = musicOn;
  let ctx = null;
  let master = null;
  let noise = null;
  const buffers = new Map(); // url -> decoded audio, or null when it could not be loaded
  const loading = new Set();
  const base = baseUrl ?? (typeof document !== 'undefined' ? document.baseURI : undefined);

  /** Tell the owner that a switch changed. @returns {void} */
  const changed = () => { try { onChange?.({ sfxOn: sfx, musicOn: music }); } catch { /* the callback is optional */ } };

  /** Fetch and decode one audio file once; failures are remembered so we fall back to the generated sound. @param {string} url file @returns {void} */
  function loadFile(url) {
    if (buffers.has(url) || loading.has(url) || !ctx) return;
    loading.add(url);
    fetch(new URL(url, base))
      .then((r) => { if (!r.ok) throw new Error('missing'); return r.arrayBuffer(); })
      .then((data) => ctx.decodeAudioData(data))
      .then((buf) => buffers.set(url, buf))
      .catch(() => buffers.set(url, null))
      .finally(() => loading.delete(url));
  }

  /** Start loading every audio file named in the table. @returns {void} */
  function preloadFiles() {
    for (const entry of Object.values(table)) if (entry.type === 'file') loadFile(entry.url);
  }

  /** Make the audio context (only inside a tap). @returns {boolean} true when ready */
  function ensure() {
    if (ctx) {
      if (ctx.state === 'suspended') ctx.resume().catch(() => {});
      return true;
    }
    const AC = globalThis.AudioContext ?? globalThis.webkitAudioContext;
    if (!AC) return false;
    try {
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = 0.6;
      const comp = ctx.createDynamicsCompressor();
      master.connect(comp).connect(ctx.destination);
      noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
      const d = noise.getChannelData(0);
      for (let i = 0; i < d.length; i += 1) d[i] = Math.random() * 2 - 1;
      preloadFiles();
      return true;
    } catch {
      ctx = null;
      return false;
    }
  }

  /**
   * One note with a quick attack and an exponential fade.
   * @param {number} freq pitch in Hz
   * @param {number} at start time
   * @param {number} dur length in seconds
   * @param {{type?: OscillatorType, vol?: number, slideTo?: number}} [o] wave, loudness, pitch slide
   * @returns {void}
   */
  function tone(freq, at, dur, o = {}) {
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = o.type ?? 'sine';
    osc.frequency.setValueAtTime(freq, at);
    if (o.slideTo) osc.frequency.exponentialRampToValueAtTime(o.slideTo, at + dur);
    g.gain.setValueAtTime(0.0001, at);
    g.gain.exponentialRampToValueAtTime(o.vol ?? 0.3, at + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
    osc.connect(g).connect(master);
    osc.start(at);
    osc.stop(at + dur + 0.05);
  }

  /**
   * A burst of filtered noise; the filter can sweep (for squish and tear).
   * @param {number} at start time
   * @param {number} dur length
   * @param {{type?: BiquadFilterType, freq?: number, to?: number, q?: number, vol?: number}} [o] filter and loudness
   * @returns {void}
   */
  function hiss(at, dur, o = {}) {
    const src = ctx.createBufferSource();
    src.buffer = noise;
    src.loop = true;
    const f = ctx.createBiquadFilter();
    f.type = o.type ?? 'bandpass';
    f.frequency.setValueAtTime(o.freq ?? 1500, at);
    if (o.to) f.frequency.exponentialRampToValueAtTime(o.to, at + dur);
    f.Q.value = o.q ?? 1;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, at);
    g.gain.exponentialRampToValueAtTime(o.vol ?? 0.3, at + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
    src.connect(f).connect(g).connect(master);
    src.start(at, Math.random() * 0.5);
    src.stop(at + dur + 0.05);
  }

  /**
   * A voice-like sound: a buzzy wave shaped by two vowel filters, with an optional wobble (vibrato).
   * @param {number} freq pitch in Hz
   * @param {number} at start time
   * @param {number} dur length in seconds
   * @param {{slideTo?: number, formants?: number[], vib?: number, vol?: number}} [o] pitch slide, the two vowel
   *   frequencies, wobble speed in Hz, loudness
   * @returns {void}
   */
  function vowel(freq, at, dur, o = {}) {
    const osc = ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(freq, at);
    if (o.slideTo) osc.frequency.exponentialRampToValueAtTime(o.slideTo, at + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, at);
    g.gain.exponentialRampToValueAtTime(o.vol ?? 0.2, at + 0.03);
    g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
    for (const f of o.formants ?? [500, 1500]) {
      const bp = ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.value = f;
      bp.Q.value = 5;
      osc.connect(bp).connect(g);
    }
    g.connect(master);
    if (o.vib) {
      const lfo = ctx.createOscillator();
      const depth = ctx.createGain();
      lfo.frequency.value = o.vib;
      depth.gain.value = freq * 0.04;
      lfo.connect(depth).connect(osc.frequency);
      lfo.start(at);
      lfo.stop(at + dur + 0.05);
    }
    osc.start(at);
    osc.stop(at + dur + 0.05);
  }

  const kit = { tone, hiss, vowel };

  /** Play a generated voice. @param {string} voice a key of VOICES @param {object} [o] options @returns {boolean} true when played */
  function playVoice(voice, o) {
    const fn = VOICES[voice];
    if (!fn) return false;
    fn(kit, ctx.currentTime + 0.01, o);
    return true;
  }

  /** Play a loaded audio file. @param {AudioBuffer} buf the sound @returns {boolean} true when played */
  function playBuffer(buf) {
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.connect(master);
    src.start(ctx.currentTime + 0.01);
    return true;
  }

  return {
    /** Wake the audio up; call from inside a tap. @returns {void} */
    unlock() { if (sfx || music) ensure(); },
    /** Whether a sound name exists in the table. @param {string} name sound name @returns {boolean} true if known */
    has: (name) => Object.prototype.hasOwnProperty.call(table, name),
    /** Whether the sound effects are on. @returns {boolean} on */
    isOn: () => sfx,
    /** Turn the sound effects on or off. @param {boolean} value true = on @returns {void} */
    setOn(value) {
      sfx = Boolean(value);
      if (sfx) ensure();
      changed();
    },
    /** Whether the music is on. @returns {boolean} on */
    isMusicOn: () => music,
    /** Turn the music on or off. @param {boolean} value true = on @returns {void} */
    setMusicOn(value) {
      music = Boolean(value);
      changed();
    },
    /**
     * Play a sound now. Silent when its switch is off or before the first tap. A file that is not (yet) loaded is
     * replaced by its generated fallback.
     * @param {string} name a key of the sound table
     * @param {object} [o] options for the sound (e.g. {level} for squish)
     * @returns {boolean} true when played
     */
    play(name, o) {
      const entry = table[name];
      if (!entry || !ctx) return false;
      if (entry.category === 'music' ? !music : !sfx) return false;
      if (ctx.state === 'suspended') ctx.resume().catch(() => {});
      try {
        if (entry.type === 'file') {
          const buf = buffers.get(entry.url);
          if (buf) return playBuffer(buf);
          loadFile(entry.url);
          return entry.fallback ? playVoice(entry.fallback, o) : false;
        }
        return playVoice(entry.voice, o);
      } catch { return false; }
    },
    /** Close the audio when leaving the page. @returns {void} */
    dispose() {
      try { ctx?.close(); } catch { /* already closed */ }
      ctx = null;
    },
  };
}
