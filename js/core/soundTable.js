// The sound table: every sound in the game has a NAME, and this table says where its sound comes from.
// The game only ever asks for a name, e.g. play('laugh_evil').
//
// To use a real recording instead of the generated sound, change that one line, for example
//   laugh_evil: { type: 'synth', voice: 'laughEvil' },
// into
//   laugh_evil: { type: 'file', url: 'assets/audio/laugh_evil.mp3', fallback: 'laughEvil' },
// and put the file in src/assets/audio/. If the file is missing or cannot be played, the generated sound
// named in "fallback" is used, so a missing file never means silence.
//
// category 'sfx' is switched by the sound switch, 'music' by the music switch.

export const SOUND_TABLE = {
  // popping
  pop_small: { type: 'synth', voice: 'pop', category: 'sfx' },
  pop_big: { type: 'synth', voice: 'bigpop', category: 'sfx' },
  pop_gold: { type: 'synth', voice: 'goldpop', category: 'sfx' },
  squish: { type: 'synth', voice: 'squish', category: 'sfx' },
  squelch: { type: 'synth', voice: 'squelch', category: 'sfx' },
  splat: { type: 'synth', voice: 'splat', category: 'sfx' },
  // tools and care
  tweeze: { type: 'synth', voice: 'tweeze', category: 'sfx' },
  peel: { type: 'synth', voice: 'peel', category: 'sfx' },
  wipe: { type: 'synth', voice: 'wipe', category: 'sfx' },
  cream_heal: { type: 'synth', voice: 'cream', category: 'sfx' },
  // voices and reactions (placeholders until recordings exist)
  ooh_happy: { type: 'synth', voice: 'ooh', category: 'sfx' },
  laugh_evil: { type: 'synth', voice: 'laughEvil', category: 'sfx' },
  ow_customer: { type: 'synth', voice: 'ow', category: 'sfx' },
  // rewards
  cheer: { type: 'synth', voice: 'cheer', category: 'sfx' },
  cash: { type: 'synth', voice: 'cash', category: 'sfx' },
};
