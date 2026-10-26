// The thinking part of the music player (T6.1a): pure helpers, no audio and no DOM, so Node can test them.
// It turns a track from data/music-data.js into a time-ordered list of notes for one pass of the loop, picks the
// notes that are due in a lookahead window, and gives the fade and crossfade curves. core/music.js plays the result.

/** Steps in one bar (16th notes in 4/4). */
export const STEPS_PER_BAR = 16;
/** Semitones of the note letters above C. */
const LETTERS = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
/** Note names for the 12 semitones (sharps). */
const NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
/** Semitones of each scale above its key note. */
export const SCALES = { major: [0, 2, 4, 5, 7, 9, 11], minor: [0, 2, 3, 5, 7, 8, 10] };
/** Drum letters and how hard they hit. */
const HITS = { x: 1, X: 1, '-': 0.5 };
/** Order of the parts when two notes start at the same moment (bass first, so it is never cut by the limiter last). */
const PART_ORDER = { bass: 0, comp: 1, melody: 2, drum: 3, riser: 4 };

/**
 * A note name as a MIDI number ('C4' = 60, 'A4' = 69). Sharps (#) and flats (b) work.
 * @param {string} name note name such as 'E5', 'F#3' or 'Bb2'
 * @returns {number} MIDI note number (NaN for a name it cannot read)
 */
export function noteToMidi(name) {
  const m = /^([A-Ga-g])([#b]?)(-?\d+)$/.exec(String(name).trim());
  if (!m) return NaN;
  const shift = m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0;
  return 12 * (Number(m[3]) + 1) + LETTERS[m[1].toUpperCase()] + shift;
}

/**
 * A MIDI number as a note name (with sharps).
 * @param {number} midi MIDI note number
 * @returns {string} note name such as 'C4'
 */
export function midiToName(midi) {
  return `${NAMES[((midi % 12) + 12) % 12]}${Math.floor(midi / 12) - 1}`;
}

/**
 * The pitch of a MIDI note in Hz (A4 = 440).
 * @param {number} midi MIDI note number
 * @returns {number} frequency in Hz
 */
export function midiToFreq(midi) {
  return 440 * 2 ** ((midi - 69) / 12);
}

/**
 * The pitch of a note name in Hz.
 * @param {string} name note name such as 'A4'
 * @returns {number} frequency in Hz
 */
export function noteFreq(name) {
  return midiToFreq(noteToMidi(name));
}

/**
 * Seconds per step (a 16th note) at a tempo.
 * @param {number} bpm beats per minute
 * @returns {number} seconds
 */
export function stepSeconds(bpm) {
  return 60 / bpm / 4;
}

/**
 * Seconds per bar of a track.
 * @param {{bpm: number}} track the track
 * @returns {number} seconds
 */
export function barSeconds(track) {
  return stepSeconds(track.bpm) * STEPS_PER_BAR;
}

/**
 * How many bars one pass of the loop has (all sections of the form).
 * @param {object} track the track
 * @returns {number} bars
 */
export function trackBars(track) {
  return track.form.reduce((sum, name) => sum + track.sections[name].bars, 0);
}

/**
 * How long one pass of the loop lasts.
 * @param {object} track the track
 * @returns {number} seconds
 */
export function loopSeconds(track) {
  return trackBars(track) * barSeconds(track);
}

/**
 * The pitch classes (0 to 11) that belong to a track's key and scale, plus its allowed chromatic notes.
 * @param {{key: string, scale: string, chromatic?: string[]}} track the track
 * @returns {Set<number>} pitch classes
 */
export function scalePitchClasses(track) {
  const root = noteToMidi(`${track.key}4`) % 12;
  const set = new Set((SCALES[track.scale] ?? SCALES.major).map((s) => (root + s) % 12));
  for (const n of track.chromatic ?? []) set.add(((noteToMidi(n.replace(/-?\d+$/, '') + '4') % 12) + 12) % 12);
  return set;
}

/**
 * Which name is active at a step of a bar: a bar entry is a name, or [[step, name], ...] for changes in the bar.
 * @param {string|Array<[number, string]>} entry the bar's entry (from chords or roots)
 * @param {number} step step in the bar
 * @returns {string} the name in force at that step
 */
export function entryAt(entry, step) {
  if (!Array.isArray(entry)) return entry;
  let name = entry[0][1];
  for (const [s, n] of entry) if (s <= step) name = n;
  return name;
}

/**
 * The variation used on a pass of the loop (pass 0 = the first, then round and round).
 * @param {object} track the track
 * @param {number} pass pass number, 0 based
 * @returns {object} the variation ({} when the track has none)
 */
export function variationFor(track, pass) {
  const list = track.variations ?? [];
  return list.length ? list[((pass % list.length) + list.length) % list.length] : {};
}

/**
 * All notes of one pass of a track, in time order. Times are seconds from the start of the pass.
 * Each note: {time, dur, step, steps, part, voice, note, midi, freq, vel, section, bar}. Drums and the riser have
 * no note (note, midi and freq are null).
 * @param {object} track the track (data/music-data.js)
 * @param {number} [pass] pass number, 0 based (picks the variation)
 * @param {Object<string, string[]>} [chords] the chord shapes (data/music-data.js CHORDS)
 * @returns {object[]} the notes
 */
export function buildPass(track, pass = 0, chords = {}) {
  const sps = stepSeconds(track.bpm);
  const v = variationFor(track, pass);
  const shapes = { ...chords, ...(track.chords ?? {}) };
  const out = [];
  let order = 0;
  /** Add one note. @param {object} n the note fields (step, steps, part, voice, midi?, vel) @returns {void} */
  const add = (n) => {
    const midi = n.midi ?? null;
    out.push({
      time: n.step * sps, dur: n.steps * sps, step: n.step, steps: n.steps, part: n.part, voice: n.voice,
      note: midi === null ? null : midiToName(midi), midi, freq: midi === null ? null : midiToFreq(midi),
      vel: n.vel, section: n.section, bar: n.bar, order: order += 1,
    });
  };
  let barNo = 0;
  for (const name of track.form) {
    const sec = track.sections[name];
    const comps = [...(sec.comp ?? track.comp ?? []), ...(v.extraComp ?? []).filter((c) => !c.sections || c.sections.includes(name))];
    const drums = sec.drums ?? track.drums ?? {};
    const bassRhythm = sec.bass ?? track.bass ?? [];
    const muted = new Set(v.muteMelodyBars?.[name] ?? []);
    for (let b = 0; b < sec.bars; b += 1) {
      const at = (barNo + b) * STEPS_PER_BAR;
      const base = { section: name, bar: barNo + b };
      for (const c of comps) {
        for (const [s, len] of c.rhythm) {
          for (const n of shapes[entryAt(sec.chords[b], s)] ?? []) {
            add({ ...base, step: at + s, steps: len, part: 'comp', voice: c.voice, midi: noteToMidi(n) + 12 * (c.octave ?? 0), vel: c.level });
          }
        }
      }
      for (const [s, interval, len] of bassRhythm) {
        add({ ...base, step: at + s, steps: len, part: 'bass', voice: 'bass', midi: noteToMidi(entryAt(sec.roots[b], s)) + interval, vel: track.levels.bass });
      }
      if (!muted.has(b)) {
        for (const [s, n, len] of sec.melody?.[b] ?? []) {
          add({
            ...base, step: at + s, steps: len, part: 'melody', voice: v.melodyVoice ?? track.voices.melody,
            midi: noteToMidi(n) + 12 * (v.melodyOctave ?? 0), vel: track.levels.melody,
          });
        }
      }
      for (const [lane, pattern] of Object.entries(drums)) {
        for (let s = 0; s < STEPS_PER_BAR; s += 1) {
          const hit = HITS[pattern[s]];
          if (hit) add({ ...base, step: at + s, steps: 1, part: 'drum', voice: lane, vel: hit * (track.levels[lane] ?? 0.03) });
        }
      }
      if (track.riser && (barNo + b + 1) % track.riser.everyBars === 0) {
        add({ ...base, step: at, steps: STEPS_PER_BAR, part: 'riser', voice: track.riser.voice, vel: track.levels.riser ?? 0.04 });
      }
    }
    barNo += sec.bars;
  }
  return out.sort((a, z) => a.step - z.step || PART_ORDER[a.part] - PART_ORDER[z.part] || a.order - z.order);
}

/**
 * Picks the notes that are due before a time, moving a cursor along the loop (and on into the next pass when one
 * ends). The cursor is CHANGED in place: {passStart, pass, index, events, loopSeconds}.
 * @param {{passStart: number, pass: number, index: number, events: object[], loopSeconds: number}} cursor where the
 *   player is: start time of the current pass (audio clock), pass number, next note index, notes of this pass
 * @param {number} horizon schedule everything that starts before this time
 * @param {(pass: number) => object[]} nextPass builds the notes of a pass
 * @returns {{at: number, ev: object}[]} the due notes with their start time on the audio clock, in order
 */
export function collectDue(cursor, horizon, nextPass) {
  const due = [];
  for (let guard = 0; guard < 20000; guard += 1) {
    if (cursor.index >= cursor.events.length) {
      if (cursor.passStart + cursor.loopSeconds >= horizon) break;
      cursor.passStart += cursor.loopSeconds;
      cursor.pass += 1;
      cursor.events = nextPass(cursor.pass);
      cursor.index = 0;
      continue;
    }
    const ev = cursor.events[cursor.index];
    const at = cursor.passStart + ev.time;
    if (at >= horizon) break;
    due.push({ at, ev });
    cursor.index += 1;
  }
  return due;
}

/**
 * The start of the next bar at or after a time.
 * @param {number} origin when bar 1 started (audio clock)
 * @param {number} time the time to look from
 * @param {number} bar seconds per bar
 * @returns {number} the time of the next bar line
 */
export function nextBarTime(origin, time, bar) {
  if (time <= origin) return origin;
  return origin + Math.ceil((time - origin) / bar - 1e-9) * bar;
}

/**
 * Where a player is in its loop: bar (1 based), the section name and the pass.
 * @param {object} track the track
 * @param {number} origin when the first pass started (audio clock)
 * @param {number} time now (audio clock)
 * @returns {{bar: number, bars: number, section: string, pass: number}} the position
 */
export function positionAt(track, origin, time) {
  const bars = trackBars(track);
  const total = Math.max(0, Math.floor((time - origin) / barSeconds(track)));
  const bar = total % bars;
  let left = bar;
  let section = track.form[0];
  for (const name of track.form) {
    section = name;
    if (left < track.sections[name].bars) break;
    left -= track.sections[name].bars;
  }
  return { bar: bar + 1, bars, section, pass: Math.floor(total / bars) };
}

/**
 * The equal-power fade shape: a fade-in rises as sin, a fade-out falls as cos, so a crossfade keeps the loudness even.
 * @param {number} x how far through the fade (0 to 1)
 * @param {'in'|'out'} dir which way
 * @returns {number} gain 0 to 1
 */
export function fadeGain(x, dir) {
  const c = Math.min(1, Math.max(0, x));
  return dir === 'in' ? Math.sin((c * Math.PI) / 2) : Math.cos((c * Math.PI) / 2);
}

/**
 * Both gains of a crossfade at a point (their squares always add up to 1).
 * @param {number} x how far through the crossfade (0 to 1)
 * @returns {{out: number, in: number}} the gain of the old and of the new tune
 */
export function crossfadeGains(x) {
  return { out: fadeGain(x, 'out'), in: fadeGain(x, 'in') };
}

/**
 * Points of a smooth fade from one gain to another (equal-power shape), for linear ramps on a gain.
 * @param {number} from gain at the start
 * @param {number} to gain at the end
 * @param {number} start start time
 * @param {number} dur length in seconds
 * @param {number} [n] number of points after the start
 * @returns {{t: number, v: number}[]} times and gains, the last one is exactly (start + dur, to)
 */
export function fadePoints(from, to, start, dur, n = 12) {
  const pts = [];
  for (let i = 1; i <= n; i += 1) {
    const x = i / n;
    const v = to >= from ? from + (to - from) * fadeGain(x, 'in') : to + (from - to) * fadeGain(x, 'out');
    pts.push({ t: start + dur * x, v: i === n ? to : v });
  }
  return pts;
}
