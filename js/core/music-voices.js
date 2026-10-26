// The music instruments (T6.1a): soft generated voices for core/music.js, built from oscillators and filtered noise.
// Kept gentle on purpose: no sawtooth or square waves, filters on everything bright, every note starts and ends at
// silence (no clicks). Also the music's own output chain (volume, gentle lowpass, soft compressor), which sits next to
// the sound effects on the same AudioContext.
// Every voice is (kit, at, freq, dur, vel): kit = {ctx, out, noise}, at = start time on the audio clock, freq = pitch
// in Hz (null for drums), dur = the written length in seconds, vel = peak loudness (small, 0.02 to 0.2).

/** One white-noise buffer per audio context (made once). */
const NOISE = new WeakMap();

/**
 * The shared noise buffer of a context (one second of white noise).
 * @param {BaseAudioContext} ctx the audio context
 * @returns {AudioBuffer} the noise
 */
export function noiseBuffer(ctx) {
  let buf = NOISE.get(ctx);
  if (!buf) {
    buf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const d = buf.getChannelData(0);
    let seed = 0x9e3779b9;
    for (let i = 0; i < d.length; i += 1) { // a fixed pseudo-random noise (xorshift), so every render sounds the same
      seed ^= seed << 13;
      seed ^= seed >>> 17;
      seed ^= seed << 5;
      d[i] = ((seed >>> 0) / 4294967296) * 2 - 1;
    }
    NOISE.set(ctx, buf);
  }
  return buf;
}

/**
 * The music's output chain: input -> volume -> gentle lowpass -> low cut -> soft compressor -> speakers.
 * @param {BaseAudioContext} ctx the audio context
 * @param {{limiter?: boolean, lowpass?: number, destination?: AudioNode}} [o] limiter = false leaves the compressor
 *   out (for the level check before it); lowpass = the cut-off in Hz; destination = where it goes
 * @returns {{input: GainNode, volume: GainNode, output: AudioNode, disconnect: () => void}} the chain
 */
export function createMusicChain(ctx, { limiter = true, lowpass = 6500, destination = ctx.destination } = {}) {
  const input = ctx.createGain();
  const volume = ctx.createGain();
  const lp = ctx.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = lowpass;
  lp.Q.value = 0.5;
  const hp = ctx.createBiquadFilter(); // takes away rumble and any offset below 35 Hz
  hp.type = 'highpass';
  hp.frequency.value = 35;
  hp.Q.value = 0.5;
  input.connect(volume).connect(lp).connect(hp);
  let output = hp;
  if (limiter) {
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -20;
    comp.knee.value = 12;
    comp.ratio.value = 3;
    comp.attack.value = 0.01;
    comp.release.value = 0.25;
    hp.connect(comp);
    output = comp;
  }
  output.connect(destination);
  return {
    input, volume, output,
    /** Unplug the chain from the speakers. @returns {void} */
    disconnect() { try { output.disconnect(); } catch { /* already unplugged */ } },
  };
}

/**
 * An oscillator at a pitch.
 * @param {BaseAudioContext} ctx the audio context
 * @param {OscillatorType} type wave shape
 * @param {number} freq pitch in Hz
 * @returns {OscillatorNode} the oscillator
 */
function osc(ctx, type, freq) {
  const o = ctx.createOscillator();
  o.type = type;
  o.frequency.value = freq;
  return o;
}

/**
 * A gain that rises fast and dies away (for struck sounds), ending at true silence.
 * @param {BaseAudioContext} ctx the audio context
 * @param {number} at start
 * @param {number} peak loudness
 * @param {number} attack seconds to the peak
 * @param {number} decay seconds from the peak to silence
 * @returns {{g: GainNode, end: number}} the gain and the time it is silent
 */
function strike(ctx, at, peak, attack, decay) {
  const g = ctx.createGain();
  g.gain.setValueAtTime(0, at);
  g.gain.linearRampToValueAtTime(peak, at + attack);
  g.gain.exponentialRampToValueAtTime(Math.max(1e-5, peak * 0.001), at + attack + decay);
  g.gain.linearRampToValueAtTime(0, at + attack + decay + 0.01);
  return { g, end: at + attack + decay + 0.02 };
}

/**
 * A gain that swells in, holds and fades out (for held sounds), ending at true silence.
 * @param {BaseAudioContext} ctx the audio context
 * @param {number} at start
 * @param {number} peak loudness
 * @param {number} attack seconds to the peak
 * @param {number} hold time the note is let go
 * @param {number} release seconds of the fade out
 * @returns {{g: GainNode, end: number}} the gain and the time it is silent
 */
function swell(ctx, at, peak, attack, hold, release) {
  const g = ctx.createGain();
  const top = Math.max(at + attack, hold);
  g.gain.setValueAtTime(0, at);
  g.gain.linearRampToValueAtTime(peak, at + attack);
  g.gain.setValueAtTime(peak, top);
  g.gain.linearRampToValueAtTime(0, top + release);
  return { g, end: top + release + 0.02 };
}

/**
 * A noise source (looping the shared buffer from a varying point).
 * @param {object} kit {ctx, noise}
 * @param {number} at start time (also picks the start point in the buffer)
 * @returns {AudioBufferSourceNode} the source
 */
function noiseSrc(kit, at) {
  const src = kit.ctx.createBufferSource();
  src.buffer = kit.noise;
  src.loop = true;
  src._offset = (at * 7.31) % Math.max(0.01, kit.noise.duration - 0.2);
  return src;
}

/**
 * A filter.
 * @param {BaseAudioContext} ctx the audio context
 * @param {BiquadFilterType} type filter kind
 * @param {number} freq cut-off or centre in Hz
 * @param {number} q sharpness
 * @returns {BiquadFilterNode} the filter
 */
function filter(ctx, type, freq, q) {
  const f = ctx.createBiquadFilter();
  f.type = type;
  f.frequency.value = freq;
  f.Q.value = q;
  return f;
}

/**
 * Start sources now and stop them when the sound is over.
 * @param {AudioScheduledSourceNode[]} srcs the sources
 * @param {number} at start
 * @param {number} end stop time
 * @returns {void}
 */
function run(srcs, at, end) {
  for (const s of srcs) {
    if (s._offset !== undefined) s.start(at, s._offset); else s.start(at);
    s.stop(end + 0.02);
  }
}

/** The instruments, by name (the names used in data/music-data.js). */
export const MUSIC_VOICES = {
  /** A warm held pad: a triangle and a slightly detuned sine through a low filter, slow swell. */
  pad(kit, at, freq, dur, vel) {
    const { ctx } = kit;
    const { g, end } = swell(ctx, at, vel, Math.min(0.35, dur * 0.4), at + dur, 0.8);
    const lp = filter(ctx, 'lowpass', 1100, 0.4);
    const a = osc(ctx, 'triangle', freq);
    const b = osc(ctx, 'sine', freq * 1.004);
    const bg = ctx.createGain();
    bg.gain.value = 0.6;
    a.connect(lp);
    b.connect(bg).connect(lp);
    lp.connect(g).connect(kit.out);
    run([a, b], at, end);
  },
  /** A soft electric piano: a sine with a quieter octave that fades sooner. */
  keys(kit, at, freq, dur, vel) {
    const { ctx } = kit;
    const decay = Math.min(1.6, Math.max(0.4, dur * 1.3));
    const body = strike(ctx, at, vel, 0.006, decay);
    const shine = strike(ctx, at, vel * 0.22, 0.004, decay * 0.4);
    const a = osc(ctx, 'sine', freq);
    const b = osc(ctx, 'sine', freq * 2);
    a.connect(body.g).connect(kit.out);
    b.connect(shine.g).connect(kit.out);
    run([a, b], at, body.end);
  },
  /** A wooden marimba: a sine with a short bright knock (the 4th partial) at the start. */
  marimba(kit, at, freq, dur, vel) {
    const { ctx } = kit;
    const decay = Math.min(0.9, Math.max(0.3, 0.9 - (freq - 400) / 1600));
    const body = strike(ctx, at, vel, 0.003, decay);
    const knock = strike(ctx, at, vel * 0.12, 0.002, 0.06);
    const a = osc(ctx, 'sine', freq);
    const b = osc(ctx, 'sine', freq * 3.9);
    a.connect(body.g).connect(kit.out);
    b.connect(knock.g).connect(kit.out);
    run([a, b], at, body.end);
  },
  /** Soft bells (glockenspiel-like): a sine with a faint bell overtone, a longer ring. */
  glock(kit, at, freq, dur, vel) {
    const { ctx } = kit;
    const body = strike(ctx, at, vel * 0.7, 0.003, 1.1);
    const ring = strike(ctx, at, vel * 0.08, 0.002, 0.25);
    const a = osc(ctx, 'sine', freq);
    const b = osc(ctx, 'sine', freq * 2.76);
    a.connect(body.g).connect(kit.out);
    b.connect(ring.g).connect(kit.out);
    run([a, b], at, body.end);
  },
  /** A soft plucked string: a triangle through a filter that closes quickly (bright start, round tail). */
  pluck(kit, at, freq, dur, vel) {
    const { ctx } = kit;
    const decay = Math.min(0.35, Math.max(0.14, dur * 0.9));
    const { g, end } = strike(ctx, at, vel, 0.003, decay);
    const lp = filter(ctx, 'lowpass', Math.min(3200, freq * 5), 0.7);
    lp.frequency.setValueAtTime(Math.min(3200, freq * 5), at);
    lp.frequency.exponentialRampToValueAtTime(Math.max(300, freq * 1.3), at + 0.12);
    const a = osc(ctx, 'triangle', freq);
    a.connect(lp).connect(g).connect(kit.out);
    run([a], at, end);
  },
  /** A round bass: a triangle under a low filter plus a sine for body; holds for the written length. */
  bass(kit, at, freq, dur, vel) {
    const { ctx } = kit;
    const { g, end } = swell(ctx, at, vel, 0.012, at + Math.max(0.05, dur * 0.85), 0.09);
    const lp = filter(ctx, 'lowpass', 520, 0.5);
    const a = osc(ctx, 'triangle', freq);
    const b = osc(ctx, 'sine', freq);
    const bg = ctx.createGain();
    bg.gain.value = 0.5;
    a.connect(lp);
    b.connect(bg).connect(lp);
    lp.connect(g).connect(kit.out);
    run([a, b], at, end);
  },
  /** A soft shaker: a short puff of filtered noise. */
  shaker(kit, at, freq, dur, vel) {
    const { ctx } = kit;
    const { g, end } = strike(ctx, at, vel, 0.008, 0.07);
    const src = noiseSrc(kit, at);
    src.connect(filter(ctx, 'bandpass', 4200, 1.1)).connect(g).connect(kit.out);
    run([src], at, end);
  },
  /** A closed hi-hat tick: a very short, quiet puff of higher noise. */
  hat(kit, at, freq, dur, vel) {
    const { ctx } = kit;
    const { g, end } = strike(ctx, at, vel, 0.002, 0.035);
    const src = noiseSrc(kit, at);
    src.connect(filter(ctx, 'bandpass', 5200, 1.6)).connect(g).connect(kit.out);
    run([src], at, end);
  },
  /** A small woodblock / rim tick: a sine knock that drops a little in pitch. */
  tick(kit, at, freq, dur, vel) {
    const { ctx } = kit;
    const { g, end } = strike(ctx, at, vel, 0.001, 0.06);
    const a = osc(ctx, 'sine', 1150);
    a.frequency.setValueAtTime(1150, at);
    a.frequency.exponentialRampToValueAtTime(900, at + 0.05);
    a.connect(g).connect(kit.out);
    run([a], at, end);
  },
  /** A soft whoosh that rises over a bar and stops right at the next downbeat. */
  riser(kit, at, freq, dur, vel) {
    const { ctx } = kit;
    const end = at + dur;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, at);
    g.gain.linearRampToValueAtTime(vel, end - 0.06);
    g.gain.linearRampToValueAtTime(0, end);
    const bp = filter(ctx, 'bandpass', 400, 2.5);
    bp.frequency.setValueAtTime(400, at);
    bp.frequency.exponentialRampToValueAtTime(3500, end);
    const src = noiseSrc(kit, at);
    src.connect(bp).connect(g).connect(kit.out);
    run([src], at, end);
  },
};

/**
 * Play one note of the schedule (music-logic.js buildPass) at a time. An unknown voice is skipped.
 * @param {BaseAudioContext} ctx the audio context
 * @param {AudioNode} out where the note goes (a track's gain)
 * @param {{voice: string, freq: number|null, dur: number, vel: number}} ev the note
 * @param {number} at start time on the audio clock
 * @returns {boolean} true when played
 */
export function playEvent(ctx, out, ev, at) {
  const fn = MUSIC_VOICES[ev.voice];
  if (!fn || !(ev.vel > 0)) return false;
  fn({ ctx, out, noise: noiseBuffer(ctx) }, at, ev.freq, ev.dur, ev.vel);
  return true;
}
