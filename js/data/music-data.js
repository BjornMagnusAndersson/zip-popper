// The background music (T6.1a, SPEC D18): two original tunes written as plain data, played by core/music.js with
// generated instruments (core/music-voices.js). Music is data, the player is code: to change a tune, edit the notes
// here; nothing else needs to change.
//
// How to read a track
// - bpm = beats per minute. A bar has 4 beats = 16 steps (a step is a 16th note). Step 0 is the start of the bar,
//   4 = beat 2, 8 = beat 3, 12 = beat 4.
// - form = the order of the sections in one loop (each section has its own number of bars).
// - chords: one entry per bar, a chord name from CHORDS, or [[step, name], [step, name]] for two chords in one bar.
// - roots: the bass note of each bar (same shape as chords). bass = the bass rhythm: [step, interval, length] where
//   interval is in semitones above the root (0 = root, 7 = fifth, 12 = octave).
// - comp = how the chords are played: [{voice, rhythm: [[step, length], ...], level}].
// - melody: one list per bar of [step, note, length]. A length of 1 = a 16th, 2 = an 8th, 4 = a quarter, 16 = a bar.
// - drums: one 16-character line per drum: 'x' = hit, '-' = soft hit, '.' = nothing.
// - variations: every time the loop comes round, the next variation is used (pass 1 = variations[0], and so on), so
//   the tune does not repeat exactly for a few minutes.
// - levels: how loud each part is (0 to 1, small numbers on purpose: the music stays under the sound effects).

// The music table, in the same style as core/soundTable.js: every tune has a NAME. To replace a generated tune with a
// recording later, change its line from { type: 'synth', track: 'calm' } to
// { type: 'file', url: 'assets/audio/music-calm.mp3', fallback: 'calm' }. (Only 'synth' is played so far; a 'file'
// entry falls back to its generated track until file playback is built.)
export const MUSIC_TABLE = {
  calm: { type: 'synth', track: 'calm' },
  hectic: { type: 'synth', track: 'hectic' },
};

/** Chord shapes (the notes the chord instruments play; the bass plays the root separately). All in C major. */
export const CHORDS = {
  C: ['G3', 'C4', 'E4'],
  Cmaj7: ['G3', 'B3', 'E4'],
  Am: ['A3', 'C4', 'E4'],
  Am7: ['G3', 'C4', 'E4'],
  F: ['A3', 'C4', 'F4'],
  Fmaj7: ['A3', 'C4', 'E4'],
  G: ['G3', 'B3', 'D4'],
  G6: ['G3', 'B3', 'E4'],
  Gsus: ['G3', 'C4', 'D4'],
  G7: ['G3', 'B3', 'F4'],
  Dm7: ['A3', 'C4', 'F4'],
  Em: ['G3', 'B3', 'E4'],
  Em7: ['G3', 'B3', 'D4'],
};

/** Calm and happy: menus, comics, shop, free play and normal customers. 20 bars at 92 bpm, about 52 seconds. */
const CALM = {
  id: 'calm',
  bpm: 92,
  key: 'C',
  scale: 'major',
  chords: CHORDS, // the chord shapes above
  chromatic: [], // notes outside the scale that are allowed on purpose (none yet)
  finishBarOnLeave: false,
  form: ['A', 'B', 'T'],
  voices: { melody: 'marimba' },
  levels: { melody: 0.2, bass: 0.17, shaker: 0.03, tick: 0.045 },
  comp: [{ voice: 'pad', rhythm: [[0, 16]], level: 0.035 }],
  drums: { shaker: '-.x.-.x.-.x.-.x.' },
  bass: [[0, 0, 8], [10, 7, 2], [12, 0, 4]],
  sections: {
    // A: the main tune, a question (bars 1 to 4) and an answer (bars 5 to 8).
    A: {
      bars: 8,
      chords: ['Cmaj7', 'Am7', 'Fmaj7', 'G6', 'Cmaj7', 'Am7', 'Dm7', [[0, 'Gsus'], [8, 'G']]],
      roots: ['C3', 'A2', 'F2', 'G2', 'C3', 'A2', 'D3', 'G2'],
      melody: [
        [[0, 'E5', 4], [4, 'G5', 2], [6, 'A5', 2], [8, 'G5', 6], [14, 'E5', 2]],
        [[0, 'C5', 4], [4, 'E5', 4], [8, 'D5', 2], [10, 'C5', 2], [12, 'A4', 4]],
        [[0, 'A4', 2], [2, 'C5', 2], [4, 'F5', 4], [8, 'E5', 4], [12, 'C5', 4]],
        [[0, 'D5', 10], [12, 'G4', 2], [14, 'B4', 2]],
        [[0, 'E5', 4], [4, 'G5', 2], [6, 'A5', 2], [8, 'C6', 6], [14, 'A5', 2]],
        [[0, 'G5', 4], [4, 'E5', 4], [8, 'C5', 4], [12, 'E5', 4]],
        [[0, 'F5', 4], [4, 'E5', 2], [6, 'D5', 2], [8, 'C5', 4], [12, 'D5', 4]],
        [[0, 'D5', 8], [10, 'E5', 2], [12, 'F5', 2], [14, 'G5', 2]],
      ],
    },
    // B: a lighter middle part that floats higher, with a soft rim tick on beats 2 and 4.
    B: {
      bars: 8,
      chords: ['Fmaj7', 'Em7', 'Dm7', 'Cmaj7', 'Fmaj7', 'Em7', 'Dm7', [[0, 'Gsus'], [8, 'G']]],
      roots: ['F2', 'E2', 'D3', 'C3', 'F2', 'E2', 'D3', 'G2'],
      bass: [[0, 0, 6], [6, 0, 2], [8, 7, 8]],
      drums: { shaker: '-.x.-.x.-.x.-.x.', tick: '....-.......-...' },
      melody: [
        [[0, 'A5', 6], [6, 'G5', 2], [8, 'F5', 4], [12, 'E5', 4]],
        [[0, 'G5', 6], [6, 'E5', 2], [8, 'D5', 4], [12, 'B4', 4]],
        [[0, 'F5', 6], [6, 'E5', 2], [8, 'D5', 4], [12, 'A4', 4]],
        [[0, 'E5', 8], [8, 'D5', 2], [10, 'C5', 2], [12, 'D5', 4]],
        [[0, 'A5', 4], [4, 'C6', 4], [8, 'A5', 4], [12, 'G5', 4]],
        [[0, 'G5', 4], [4, 'B5', 4], [8, 'G5', 4], [12, 'E5', 4]],
        [[0, 'F5', 4], [4, 'A5', 4], [8, 'G5', 2], [10, 'F5', 2], [12, 'E5', 2], [14, 'D5', 2]],
        [[0, 'D5', 12], [12, 'B4', 4]],
      ],
    },
    // T: the turnaround that leads back to the start.
    T: {
      bars: 4,
      chords: ['Am7', 'Dm7', 'Gsus', 'G7'],
      roots: ['A2', 'D3', 'G2', 'G2'],
      bass: [[0, 0, 12], [12, 7, 4]],
      melody: [
        [[0, 'C5', 4], [4, 'E5', 4], [8, 'A5', 8]],
        [[0, 'F5', 4], [4, 'A5', 4], [8, 'C6', 8]],
        [[0, 'A5', 4], [4, 'G5', 4], [8, 'D5', 8]],
        [[0, 'G5', 2], [2, 'F5', 2], [4, 'E5', 2], [6, 'D5', 2], [8, 'B4', 4], [12, 'D5', 4]],
      ],
    },
  },
  variations: [
    { id: 'plain' },
    { id: 'bells', melodyVoice: 'glock' }, // the same tune on soft bells
    { // a breather: no tune in the first half of A, soft piano chords instead
      id: 'breather', muteMelodyBars: { A: [0, 1, 2, 3] },
      extraComp: [{ voice: 'keys', rhythm: [[0, 3], [6, 2], [10, 4]], level: 0.05, sections: ['A'] }],
    },
  ],
};

/** Happy but hectic: rounds with a hurry or combo request, later competitions and timed events. 16 bars at 148 bpm. */
const HECTIC = {
  id: 'hectic',
  bpm: 148,
  key: 'C',
  scale: 'major',
  chords: CHORDS, // the chord shapes above
  chromatic: [],
  finishBarOnLeave: true, // when the hurry ends, the bar is played to its end before the calm tune fades in
  form: ['A', 'B'],
  voices: { melody: 'pluck' },
  levels: { melody: 0.15, bass: 0.18, hat: 0.022, tick: 0.05, riser: 0.05 },
  comp: [
    { voice: 'pad', rhythm: [[0, 16]], level: 0.02 },
    { voice: 'pluck', rhythm: [[2, 1], [6, 1], [10, 1], [14, 1]], level: 0.04 },
  ],
  drums: { hat: 'x-x-x-x-x-x-x-x-', tick: '....x.......x...' },
  bass: [[0, 0, 2], [3, 0, 1], [4, 12, 2], [8, 0, 2], [10, 7, 2], [12, 12, 2], [14, 7, 2]],
  riser: { everyBars: 8, voice: 'riser' }, // a soft whoosh in the last bar of every 8
  sections: {
    A: {
      bars: 8,
      chords: ['C', 'G', 'Am', 'F', 'C', 'G', 'F', 'G'],
      roots: ['C3', 'G2', 'A2', 'F2', 'C3', 'G2', 'F2', 'G2'],
      melody: [
        [[0, 'G5', 2], [2, 'E5', 2], [4, 'G5', 2], [6, 'A5', 2], [8, 'G5', 2], [10, 'E5', 2], [12, 'C5', 2], [14, 'E5', 2]],
        [[0, 'D5', 2], [2, 'B4', 2], [4, 'D5', 2], [6, 'G5', 2], [8, 'D5', 4], [12, 'B4', 2], [14, 'D5', 2]],
        [[0, 'E5', 2], [2, 'C5', 2], [4, 'E5', 2], [6, 'A5', 2], [8, 'G5', 2], [10, 'E5', 2], [12, 'C5', 2], [14, 'E5', 2]],
        [[0, 'F5', 2], [2, 'A5', 2], [4, 'C6', 2], [6, 'A5', 2], [8, 'G5', 4], [12, 'E5', 2], [14, 'D5', 2]],
        [[0, 'C5', 2], [2, 'E5', 2], [4, 'G5', 2], [6, 'C6', 2], [8, 'B5', 2], [10, 'G5', 2], [12, 'E5', 2], [14, 'G5', 2]],
        [[0, 'D5', 2], [2, 'G5', 2], [4, 'B5', 2], [6, 'G5', 2], [8, 'A5', 2], [10, 'G5', 2], [12, 'F5', 2], [14, 'D5', 2]],
        [[0, 'C5', 2], [2, 'F5', 2], [4, 'A5', 2], [6, 'F5', 2], [8, 'E5', 2], [10, 'F5', 2], [12, 'A5', 2], [14, 'C6', 2]],
        [[0, 'B5', 4], [4, 'A5', 2], [6, 'G5', 2], [8, 'D5', 8]],
      ],
    },
    B: {
      bars: 8,
      chords: ['F', 'G', 'Em', 'Am', 'F', 'G', 'C', 'G7'],
      roots: ['F2', 'G2', 'E2', 'A2', 'F2', 'G2', 'C3', 'G2'],
      drums: { hat: 'x-x-x-x-x-x-x-x-', tick: '....x.......x.-.' },
      melody: [
        [[0, 'A5', 3], [3, 'A5', 1], [4, 'G5', 2], [6, 'F5', 2], [8, 'A5', 2], [10, 'C6', 2], [12, 'A5', 2], [14, 'F5', 2]],
        [[0, 'G5', 3], [3, 'G5', 1], [4, 'F5', 2], [6, 'D5', 2], [8, 'G5', 2], [10, 'B5', 2], [12, 'G5', 2], [14, 'D5', 2]],
        [[0, 'E5', 3], [3, 'E5', 1], [4, 'D5', 2], [6, 'B4', 2], [8, 'E5', 2], [10, 'G5', 2], [12, 'B5', 2], [14, 'G5', 2]],
        [[0, 'A5', 4], [4, 'G5', 2], [6, 'E5', 2], [8, 'C5', 2], [10, 'E5', 2], [12, 'A5', 2], [14, 'B5', 2]],
        [[0, 'C6', 3], [3, 'C6', 1], [4, 'A5', 2], [6, 'F5', 2], [8, 'C6', 2], [10, 'A5', 2], [12, 'F5', 2], [14, 'A5', 2]],
        [[0, 'B5', 3], [3, 'B5', 1], [4, 'G5', 2], [6, 'D5', 2], [8, 'B5', 2], [10, 'G5', 2], [12, 'D5', 2], [14, 'G5', 2]],
        [[0, 'C6', 2], [2, 'G5', 2], [4, 'E5', 2], [6, 'G5', 2], [8, 'C6', 2], [10, 'D6', 2], [12, 'E6', 2], [14, 'D6', 2]],
        [[0, 'D6', 4], [4, 'B5', 4], [8, 'G5', 8]],
      ],
    },
  },
  variations: [
    { id: 'plain' },
    { id: 'low', melodyVoice: 'marimba', melodyOctave: -1 }, // the tune an octave lower on marimba
    { // a breather: no tune in the first half of A, the bass carries it
      id: 'breather', muteMelodyBars: { A: [0, 1, 2, 3] },
      extraComp: [{ voice: 'marimba', rhythm: [[0, 2], [3, 1], [8, 2], [11, 1]], level: 0.05, sections: ['A'] }],
    },
  ],
};

/** Every track by id. */
export const TRACKS = { calm: CALM, hectic: HECTIC };
