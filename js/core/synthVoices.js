// The generated sounds (WebAudio, no sound files). Each voice is a function (kit, t, o): kit holds the building
// blocks (tone, hiss, vowel) made by sound.js, t is the start time in seconds, o is optional settings.
// soundTable.js says which voice is used for which sound name. The seed's pop sounds are kept as they were;
// the voices at the end (ooh, laugh, ow, cash, squelch, splat) are first placeholders that recordings can replace.

export const VOICES = {
  /** A wet little creak while squeezing (higher as the pressure builds). @param {object} k kit @param {number} t start @param {{level?: number}} o pressure */
  squish(k, t, o) {
    const lv = o?.level ?? 0.3;
    k.hiss(t, 0.14, { freq: 260 + lv * 520, to: 420 + lv * 700, q: 5, vol: 0.1 + lv * 0.06 });
    k.tone(110 + lv * 60, t, 0.1, { type: 'triangle', vol: 0.05, slideTo: 90 + lv * 40 });
  },
  /**
   * One rubbery squeak of a two-finger squeeze (played again and again while squeezing, so the pitch follows the
   * pressure and it stops when the fingers let go). @param {object} k kit @param {number} t start @param {{level?: number}} o pressure 0..1
   */
  squeak(k, t, o) {
    const lv = Math.max(0, Math.min(1, o?.level ?? 0.3));
    const f = 300 + lv * 640;
    k.vowel(f, t, 0.1, { slideTo: f * 1.14, formants: [800 + lv * 900, 2300], vol: 0.05 + lv * 0.06 });
    k.hiss(t, 0.06, { freq: 900 + lv * 1300, q: 7, vol: 0.03 + lv * 0.03 });
  },
  /** The wet pop. @param {object} k kit @param {number} t start */
  pop(k, t) {
    k.tone(420, t, 0.08, { vol: 0.45, slideTo: 115 });
    k.hiss(t, 0.05, { freq: 1300, q: 1.2, vol: 0.32 });
    k.tone(900, t + 0.025, 0.05, { vol: 0.08, slideTo: 1500 });
    k.hiss(t + 0.04, 0.14, { type: 'lowpass', freq: 520, vol: 0.2 });
  },
  /** A big wet pop with a splash. @param {object} k kit @param {number} t start */
  bigpop(k, t) {
    k.tone(300, t, 0.15, { vol: 0.55, slideTo: 70 });
    k.hiss(t, 0.09, { freq: 950, q: 1, vol: 0.45 });
    k.hiss(t + 0.05, 0.32, { type: 'lowpass', freq: 420, vol: 0.34 });
    for (const d of [0.16, 0.26, 0.34]) k.hiss(t + d, 0.06, { type: 'lowpass', freq: 700, vol: 0.14 });
  },
  /** A pop with a little golden sparkle on top. @param {object} k kit @param {number} t start */
  goldpop(k, t) {
    VOICES.pop(k, t);
    [2093, 2637, 3136].forEach((f, i) => k.tone(f, t + 0.05 + i * 0.05, 0.3, { type: 'triangle', vol: 0.08 }));
  },
  /** Tweezers: a tiny click and a quick pull. @param {object} k kit @param {number} t start */
  tweeze(k, t) {
    k.tone(3400, t, 0.025, { type: 'square', vol: 0.04 });
    k.tone(600, t + 0.03, 0.08, { vol: 0.16, slideTo: 1500 });
  },
  /**
   * The Evil Horn coming out: a comic door-creak that rises, then a hollow "thwop". With o.grow (B58) only a softer,
   * slower creak and no thwop: the horn starting to grow out.
   * @param {object} k kit @param {number} t start @param {{grow?: boolean}} [o] options
   */
  creak(k, t, o) {
    const grow = Boolean(o?.grow);
    const len = grow ? 0.8 : 0.42;
    const vol = grow ? 0.045 : 0.07;
    for (let i = 0; i < 14; i += 1) { // the creak: quick little clicks that get faster and higher
      const d = len * Math.sqrt(i / 14);
      k.tone(160 + i * 22, t + d, 0.05, { type: 'sawtooth', vol, slideTo: 140 + i * 26 });
    }
    k.hiss(t, len + 0.03, { freq: 700, to: 1400, q: 8, vol: grow ? 0.03 : 0.05 });
    if (grow) return;
    k.tone(520, t + 0.47, 0.16, { vol: 0.35, slideTo: 160 }); // thwop
    k.hiss(t + 0.47, 0.08, { type: 'lowpass', freq: 900, vol: 0.18 });
  },
  /** The ingrown hair coming out: a twangy "boi-oing" that wobbles down, then a tiny "plip". @param {object} k kit @param {number} t start */
  pluck(k, t) {
    k.tone(2600, t, 0.02, { type: 'square', vol: 0.04 }); // the tweezers' click
    for (let i = 0; i < 5; i += 1) { // the boing: a rubbery twang that wobbles up and down and sinks
      k.tone(520 - i * 50, t + 0.03 + i * 0.07, 0.08, { type: 'triangle', vol: 0.2 - i * 0.03, slideTo: 760 - i * 70 });
    }
    k.tone(1300, t + 0.42, 0.05, { vol: 0.12, slideTo: 1900 }); // plip
  },
  /** The strip tearing off the skin. @param {object} k kit @param {number} t start */
  peel(k, t) {
    k.hiss(t, 0.32, { type: 'highpass', freq: 1800, to: 4200, vol: 0.12 });
    for (let i = 0; i < 6; i += 1) k.hiss(t + Math.random() * 0.28, 0.025, { freq: 2500 + Math.random() * 2500, q: 4, vol: 0.12 });
  },
  /**
   * A soft water "plink" into a tin bucket (the studio leak): a quick rising bloop, a faint tin ring and a quieter echo.
   * Kept quiet on purpose: it should nag a tiny bit, never drown the popping. @param {object} k kit @param {number} t start
   */
  drip(k, t) {
    k.tone(780, t, 0.07, { type: 'sine', vol: 0.07, slideTo: 1500 });
    k.tone(2350, t + 0.01, 0.18, { type: 'triangle', vol: 0.018 });
    k.tone(820, t + 0.16, 0.05, { type: 'sine', vol: 0.025, slideTo: 1400 });
  },
  /** The cotton pad's soft swish. @param {object} k kit @param {number} t start */
  wipe(k, t) {
    k.hiss(t, 0.16, { freq: 1600, to: 2400, q: 0.7, vol: 0.06 });
  },
  /** A squirt of cream and a bright "all clean" shimmer. @param {object} k kit @param {number} t start */
  cream(k, t) {
    k.hiss(t, 0.18, { type: 'lowpass', freq: 900, vol: 0.14 });
    k.tone(220, t, 0.16, { type: 'triangle', vol: 0.06, slideTo: 330 });
    [1046.5, 1318.5, 1568, 2093].forEach((f, i) => k.tone(f, t + 0.6 + i * 0.09, 0.45, { type: 'triangle', vol: 0.09 }));
    k.hiss(t + 0.6, 0.6, { type: 'highpass', freq: 6000, vol: 0.04 });
  },
  /** A short cheer when the whole face is clear. @param {object} k kit @param {number} t start */
  cheer(k, t) {
    const notes = [[523.25, 0, 0.14], [659.25, 0.14, 0.14], [783.99, 0.28, 0.14], [1046.5, 0.42, 0.7]];
    for (const [f, d, len] of notes) k.tone(f, t + d, len, { type: 'triangle', vol: 0.16 });
    for (const f of [523.25, 659.25, 783.99]) k.tone(f, t + 0.42, 0.9, { vol: 0.06 });
  },

  // ---- placeholders, first versions; recordings may replace them through soundTable.js ----

  /** A wet drip-and-gurgle after a pop. @param {object} k kit @param {number} t start */
  squelch(k, t) {
    k.hiss(t, 0.3, { type: 'bandpass', freq: 380, to: 160, q: 6, vol: 0.2 });
    k.tone(150, t, 0.25, { type: 'triangle', vol: 0.07, slideTo: 70 });
    k.hiss(t + 0.18, 0.1, { type: 'lowpass', freq: 600, vol: 0.12 });
  },
  /** A splat of goo landing. @param {object} k kit @param {number} t start */
  splat(k, t) {
    k.hiss(t, 0.12, { type: 'lowpass', freq: 900, to: 300, vol: 0.4 });
    k.tone(180, t, 0.1, { vol: 0.3, slideTo: 60 });
    k.hiss(t + 0.08, 0.2, { type: 'bandpass', freq: 500, q: 3, vol: 0.12 });
  },
  /** The player's happy, satisfied "ooooh". @param {object} k kit @param {number} t start */
  ooh(k, t) {
    k.vowel(250, t, 0.7, { slideTo: 330, formants: [350, 800], vib: 5, vol: 0.2 });
  },
  /** A short evil laugh: "ha, ha, ha, haaa". @param {object} k kit @param {number} t start */
  laughEvil(k, t) {
    [0, 0.2, 0.4].forEach((d, i) => k.vowel(230 - i * 18, t + d, 0.14, { slideTo: 190 - i * 18, formants: [700, 1100], vol: 0.2 }));
    k.vowel(170, t + 0.62, 0.8, { slideTo: 120, formants: [700, 1100], vib: 7, vol: 0.22 });
  },
  /** A customer's "ow!". @param {object} k kit @param {number} t start */
  ow(k, t) {
    k.vowel(380, t, 0.28, { slideTo: 220, formants: [650, 1000], vol: 0.22 });
  },
  /**
   * The ticklish customer's giggle: a soft, breathy "hee-hee-hee" that steps gently down, like someone trying not to
   * laugh. Each "hee" is a breath of air then a mid-height "ee" (about 300 to 360 Hz, a normal voice, not a chipmunk)
   * that drifts a little down; the next one is a touch lower and softer. 3 to 5 of them, about 0.22 s apart (0.7 to
   * 1.1 s in all), slightly different every time. Owner 2026-10-28: the first two versions were too fast and too high,
   * "like a chipmunk, and angry" (high bursts that went up then down sound whiny). @param {object} k kit @param {number} t start
   */
  giggle(k, t) {
    const n = 3 + Math.floor(Math.random() * 3); // 3 to 5 "hee"
    const base = 300 + Math.random() * 60; // this giggle's own voice height
    let at = 0;
    for (let i = 0; i < n; i += 1) {
      const len = 0.11 + Math.random() * 0.03;
      const f = base * (1 - i * 0.045) * (1 + (Math.random() - 0.5) * 0.04); // each "hee" a little lower
      const vol = 0.14 * (1 - (i / n) * 0.35);
      k.hiss(t + at, 0.07, { freq: 1800, q: 0.8, vol: 0.045 * (1 - (i / n) * 0.3) }); // the "h": a puff of air
      k.vowel(f, t + at + 0.03, len, { slideTo: f * 0.9, formants: [420, 2300], vol }); // the "ee", drifting down
      at += 0.2 + Math.random() * 0.05;
    }
  },
  /**
   * The warm cloth left on too long: a frying-pan "tssss". A soft, wide hiss that swells a little and fades slowly
   * (three long, overlapping layers at uneven times, so there is no rattling rhythm), a quiet warmer layer underneath,
   * and a few soft, uneven pops of fat. About 1 s. Owner 2026-10-28: the first version (a rising whistle) sounded like
   * a whistle backwards, the second (many short bursts 20 times a second, very high) like a rattlesnake or an insect.
   * @param {object} k kit @param {number} t start
   */
  sizzle(k, t) {
    for (const [d, dur, vol] of [[0, 0.95, 0.085], [0.17 + Math.random() * 0.06, 0.8, 0.07], [0.4 + Math.random() * 0.08, 0.55, 0.05]]) {
      k.hiss(t + d, dur, { freq: 4000 + Math.random() * 500, q: 0.6, vol }); // the "tssss"
    }
    k.hiss(t, 0.7, { freq: 1500, q: 0.8, vol: 0.03 }); // the warmer pan underneath
    let d = 0.03 + Math.random() * 0.05;
    while (d < 0.75) { // a few soft pops of fat, at uneven times
      // at least 16 ms: hiss() fades in over 8 ms, a shorter pop would not fade
      k.hiss(t + d, 0.016 + Math.random() * 0.012, { freq: 1200 + Math.random() * 1800, q: 1.2, vol: 0.06 + Math.random() * 0.05 });
      d += 0.05 + Math.random() * 0.13;
    }
  },
  /** Money in: a bright two-note ka-ching. @param {object} k kit @param {number} t start */
  cash(k, t) {
    k.tone(1318.5, t, 0.12, { type: 'triangle', vol: 0.14 });
    k.tone(1760, t + 0.09, 0.5, { type: 'triangle', vol: 0.14 });
    k.hiss(t, 0.05, { type: 'highpass', freq: 5000, vol: 0.06 });
  },
};
