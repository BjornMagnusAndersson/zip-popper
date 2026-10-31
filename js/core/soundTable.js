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
  pop_juicy: { type: 'synth', voice: 'juicypop', category: 'sfx' }, // the juicy pop (SPEC D45): the wet pop, a hiss and a deflate, {big, grand}
  blub: { type: 'synth', voice: 'blub', category: 'sfx' }, // a soft blub with each throb of a juicy bump being squeezed, {level}
  squish: { type: 'synth', voice: 'squish', category: 'sfx' },
  squeeze: { type: 'synth', voice: 'squeak', category: 'sfx' }, // two-finger squeeze (T1.7): a short squeak, higher with {level}
  squelch: { type: 'synth', voice: 'squelch', category: 'sfx' },
  splat: { type: 'synth', voice: 'splat', category: 'sfx' },
  creak: { type: 'synth', voice: 'creak', category: 'sfx' }, // the Evil Horn creaking out (T1.3); {tick, level}: one creak while squeezed
  horn_crack: { type: 'synth', voice: 'hornCrack', category: 'sfx' }, // the Evil Horn's big pop: crack, whoosh, thwack in the wall, boing, ding; {calm}
  pluck: { type: 'synth', voice: 'pluck', category: 'sfx' }, // the long ingrown hair flopping out (T1.3)
  // tools and care
  tweeze: { type: 'synth', voice: 'tweeze', category: 'sfx' },
  peel: { type: 'synth', voice: 'peel', category: 'sfx' },
  wipe: { type: 'synth', voice: 'wipe', category: 'sfx' },
  cream_heal: { type: 'synth', voice: 'cream', category: 'sfx' },
  // the studio
  drip: { type: 'synth', voice: 'drip', category: 'sfx' }, // the leak plinking into the bucket (until "Fix the leak")
  clunk: { type: 'synth', voice: 'clunk', category: 'sfx' }, // the stage spotlight at a boss or event intro (SPEC D45), {look}
  // voices and reactions (placeholders until recordings exist)
  ooh_happy: { type: 'synth', voice: 'ooh', category: 'sfx' },
  laugh_evil: { type: 'synth', voice: 'laughEvil', category: 'sfx' },
  ow_customer: { type: 'synth', voice: 'ow', category: 'sfx' },
  // the ticklish customer giggles (T8.3, B52). Owner 2026-10-28 picked a real recording after three synth tries:
  // "giggle2" by Reitanna, freesound.org/s/235167, CC0 (public domain), levelled. The synth voice is the fallback.
  giggle: { type: 'file', url: 'assets/audio/giggle.wav', fallback: 'giggle', category: 'sfx' },
  // the warm cloth left on too long (D41, B101), played with the Ow. Owner 2026-10-28 picked "cooking oil" by cvgre,
  // freesound.org/s/754892, CC0 (public domain), cut to its best 1.1 s with a fade. The synth voice is the fallback.
  sizzle: { type: 'file', url: 'assets/audio/sizzle.wav', fallback: 'sizzle', category: 'sfx' },
  // the sleeping husband by torchlight (chapter 1, B28): quiet, low and soft
  sleep_twitch: { type: 'synth', voice: 'sleepTwitch', category: 'sfx' }, // a tiny "hnf"
  sleep_mumble: { type: 'synth', voice: 'sleepMumble', category: 'sfx' }, // a lazy "mmh"
  sleep_shift: { type: 'synth', voice: 'sleepShift', category: 'sfx' }, // the blanket rustles
  sleep_stir: { type: 'synth', voice: 'sleepStir', category: 'sfx' }, // a bigger rustle and a drowsy "hm?"
  // rewards
  cheer: { type: 'synth', voice: 'cheer', category: 'sfx' },
  cash: { type: 'synth', voice: 'cash', category: 'sfx' },
  hearts: { type: 'synth', voice: 'hearts', category: 'sfx' }, // her heart puff after Hubby's round (SPEC D46-25): a soft puff, a twinkle, "ba-dum"
};
