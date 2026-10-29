// The rules of the phone-scroll special mode (T4.6, chapter 4 "Rock bottom"), kept apart from the screen so Node can
// test them. 2:42 am: she scrolls a feed of cartoon face videos on her phone. Each video card has a few tiny bumps to
// tap pop-it style (no score, no money, no failing). The feed moves on by itself after a while (later if she is
// popping, sooner when every bump is done); she may also flick, but only slowly. Likes tick up on the other people's
// videos, the "videos watched" counter and the phone clock creep up, and her cold tea gets colder. After the last video comes
// the idea card ("I could do this for a living") and its Continue goes on to strip 5.
// Everything here is pure: plain objects in, new plain objects out (screens/phone-scroll.js draws it).

import { rng } from '../pop/logic.js';

/** The numbers of the mode (seconds unless said otherwise). */
export const PHONE = {
  cards: 9, // video cards before the idea card
  dwell: 7, // a card stays this long on its own before the feed moves on
  afterPop: 2.5, // ...but never sooner than this after her last pop
  afterClear: 1.3, // every bump on the card popped: the feed moves on this soon after the last pop
  flickGap: 0.9, // she can only flick slowly: the least time between two moves
  startWatched: 203, // the "videos watched" counter at the first card (the idea card shows 212, as in strip 4)
  clockStart: { h: 2, m: 42 }, // the phone clock at the first card; one minute per card (the idea card is 2:51)
  handles: 8, // how many handles (special.phoneScroll.handle1..N) and captions (caption1..N) the strings have
  captions: 8,
  skins: ['fair', 'light', 'tan', 'olive', 'brown', 'deep'], // comic-art.js SKIN keys
  hairColors: ['black', 'brown', 'blonde', 'ginger', 'grey', 'blue', 'pink'], // comic-art.js HAIR keys
  hairStyles: 4, // how many hair shapes the screen can draw
  minBumps: 3,
  maxBumps: 5,
  teaStart: 0.3, // the tea's warmth at the first card: already cold (strip 4: "The tea went cold on Tuesday", SPEC D32b)
};

/** Where tiny bumps can sit on a video face (0..1 of the face picture; away from the eyes and the mouth). */
export const SPOTS = [
  { x: 0.42, y: 0.3 }, { x: 0.58, y: 0.27 }, { x: 0.5, y: 0.36 }, // forehead
  { x: 0.29, y: 0.6 }, { x: 0.33, y: 0.68 }, { x: 0.71, y: 0.6 }, { x: 0.67, y: 0.69 }, // cheeks
  { x: 0.5, y: 0.56 }, // nose
  { x: 0.45, y: 0.84 }, { x: 0.56, y: 0.83 }, // chin
];

/** The tea's lines: card index -> line number (special.phoneScroll.tea1..3). */
export const TEA_LINES = { 2: 1, 5: 2, 8: 3 };

/**
 * Shuffle a list with a random function (a copy; the list stays as it was).
 * @param {any[]} list the list
 * @param {() => number} rand random numbers 0..1
 * @returns {any[]} the shuffled copy
 */
function shuffled(list, rand) {
  const out = [...list];
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/**
 * Make tonight's feed: video cards (each a cartoon face with a few tiny bumps, a handle, a caption and its likes),
 * then the idea card last. The same seed always gives the same feed.
 * @param {number} seed any whole number
 * @param {number} [cards] how many video cards
 * @returns {object[]} the cards: {kind: 'video', skin, hairColor, hairStyle, bumps: {x, y, r}[], handle, caption,
 *   likes, likeRate} and finally {kind: 'idea'}
 */
export function makeFeed(seed, cards = PHONE.cards) {
  const rand = rng(seed);
  const handles = shuffled(Array.from({ length: PHONE.handles }, (_, i) => i + 1), rand);
  const captions = shuffled(Array.from({ length: PHONE.captions }, (_, i) => i + 1), rand);
  const feed = [];
  for (let i = 0; i < cards; i += 1) {
    const n = PHONE.minBumps + Math.floor(rand() * (PHONE.maxBumps - PHONE.minBumps + 1));
    const bumps = shuffled(SPOTS, rand).slice(0, n).map((p) => ({ x: p.x, y: p.y, r: 0.035 + rand() * 0.02 }));
    feed.push({
      kind: 'video',
      skin: PHONE.skins[Math.floor(rand() * PHONE.skins.length)],
      hairColor: PHONE.hairColors[Math.floor(rand() * PHONE.hairColors.length)],
      hairStyle: Math.floor(rand() * PHONE.hairStyles),
      bumps,
      handle: handles[i % handles.length],
      caption: captions[i % captions.length],
      likes: Math.round(80 + rand() * rand() * 48000), // mostly small, now and then a big one
      likeRate: 0.6 + rand() * 3, // likes per second while the card is on show
    });
  }
  feed.push({ kind: 'idea' });
  return feed;
}

/**
 * The scroll at the start: the first card, nothing popped.
 * @param {object[]} feed the cards (makeFeed)
 * @param {number} [now] the time now (seconds)
 * @returns {{feed: object[], index: number, popped: number[][], shownAt: number, lastPopAt: number, lastMoveAt: number}} state
 */
export function createScroll(feed, now = 0) {
  return { feed, index: 0, popped: feed.map(() => []), shownAt: now, lastPopAt: -Infinity, lastMoveAt: -Infinity };
}

/**
 * The card on show.
 * @param {object} s the state
 * @returns {object} the card
 */
export function currentCard(s) {
  return s.feed[s.index];
}

/**
 * Whether the idea card (the last one) is on show.
 * @param {object} s the state
 * @returns {boolean} true on the idea card
 */
export function isIdea(s) {
  return currentCard(s)?.kind === 'idea';
}

/**
 * Pop one tiny bump on the card on show (nothing happens if it is popped already or there is no such bump).
 * @param {object} s the state
 * @param {number} bump which bump (index on the card)
 * @param {number} now the time now (seconds)
 * @returns {object} the new state (the same object when nothing changed)
 */
export function popBump(s, bump, now) {
  const card = currentCard(s);
  if (card?.kind !== 'video' || !card.bumps[bump] || s.popped[s.index].includes(bump)) return s;
  const popped = s.popped.map((p, i) => (i === s.index ? [...p, bump] : p));
  return { ...s, popped, lastPopAt: now };
}

/**
 * Whether a bump on the card on show is popped.
 * @param {object} s the state
 * @param {number} bump which bump
 * @returns {boolean} true when popped
 */
export function isPopped(s, bump) {
  return s.popped[s.index]?.includes(bump) ?? false;
}

/**
 * Whether every bump on the card on show is popped (false on the idea card).
 * @param {object} s the state
 * @returns {boolean} true when the card is done
 */
export function allPopped(s) {
  const card = currentCard(s);
  return card?.kind === 'video' && s.popped[s.index].length >= card.bumps.length;
}

/**
 * Whether the feed should move on by itself now: after the dwell time (but not right after a pop), or soon after the
 * last bump on the card was popped. Never on the idea card (that one waits for Continue).
 * @param {object} s the state
 * @param {number} now the time now (seconds)
 * @returns {boolean} true = move on
 */
export function advanceDue(s, now) {
  if (currentCard(s)?.kind !== 'video') return false;
  if (allPopped(s)) return now - s.lastPopAt >= PHONE.afterClear;
  return now - s.shownAt >= PHONE.dwell && now - s.lastPopAt >= PHONE.afterPop;
}

/**
 * Whether she may flick (or tap Next) to the next card now: only from a video card, and only slowly.
 * @param {object} s the state
 * @param {number} now the time now (seconds)
 * @returns {boolean} true = the flick counts
 */
export function canFlick(s, now) {
  const gap = PHONE.flickGap - 1e-9; // a hair of slack for rounding in the times
  return currentCard(s)?.kind === 'video' && now - s.lastMoveAt >= gap && now - s.shownAt >= gap;
}

/**
 * Go to the next card (stays on the idea card at the end).
 * @param {object} s the state
 * @param {number} now the time now (seconds)
 * @returns {object} the new state
 */
export function nextCard(s, now) {
  if (s.index >= s.feed.length - 1) return s;
  return { ...s, index: s.index + 1, shownAt: now, lastMoveAt: now };
}

/**
 * The "videos watched" counter for a card.
 * @param {number} index the card index
 * @returns {number} the number shown
 */
export function watchedCount(index) {
  return PHONE.startWatched + index;
}

/**
 * The phone clock for a card (one minute later per card).
 * @param {number} index the card index
 * @returns {{h: number, mm: string}} hour and two-digit minutes
 */
export function clockAt(index) {
  const total = PHONE.clockStart.h * 60 + PHONE.clockStart.m + index;
  const h = Math.floor(total / 60) % 12 || 12;
  return { h, mm: String(total % 60).padStart(2, '0') };
}

/**
 * How many likes a video has after some seconds on show (they tick up on their own).
 * @param {{likes: number, likeRate: number}} card the video card
 * @param {number} seconds how long it has been on show
 * @returns {number} the likes
 */
export function likesAt(card, seconds) {
  return Math.floor(card.likes + card.likeRate * Math.max(0, seconds));
}

/**
 * The string to show for a number of likes: plain under 1000, then "12.4k".
 * @param {number} n the likes
 * @returns {{key: 'likes'|'likesK', n: string}} the string key end (special.phoneScroll.<key>) and its {n}
 */
export function likeText(n) {
  if (n < 1000) return { key: 'likes', n: String(n) };
  const k = Math.floor(n / 100) / 10;
  return { key: 'likesK', n: k >= 100 ? String(Math.floor(k)) : k.toFixed(1) };
}

/**
 * How warm her tea still is on a card: PHONE.teaStart (already cold, no steam) at the first card, 0 = stone cold
 * by the idea card.
 * @param {number} index the card index
 * @param {number} total how many cards the feed has (the idea card included)
 * @returns {number} warmth 0..1
 */
export function teaWarmth(index, total) {
  if (total <= 1) return 0;
  return Math.max(0, Math.min(1, 1 - index / (total - 1))) * PHONE.teaStart;
}

/**
 * The tea's line on a card, if it says something there.
 * @param {number} index the card index
 * @returns {number|null} the line number (special.phoneScroll.teaN) or null
 */
export function teaLine(index) {
  return TEA_LINES[index] ?? null;
}

/**
 * Her face on a card: quiet at first, a bit sad as the night drags on, lit up on the idea card.
 * @param {number} index the card index
 * @param {number} total how many cards the feed has (the idea card included)
 * @returns {'neutral'|'sad'|'happy'} a comic-art.js expression
 */
export function herMood(index, total) {
  if (index >= total - 1) return 'happy';
  return index >= Math.floor((total - 1) / 2) ? 'sad' : 'neutral';
}

/**
 * Keyboard focus: where an arrow key moves the focus in a row of buttons (it wraps round).
 * @param {number} at the button with the focus now (-1 = none)
 * @param {number} count how many buttons
 * @param {string} key the key
 * @returns {number|null} the new button, or null when the key is not an arrow
 */
export function moveFocus(at, count, key) {
  if (count <= 0) return null;
  if (key === 'ArrowRight' || key === 'ArrowDown') return at < 0 ? 0 : (at + 1) % count;
  if (key === 'ArrowLeft' || key === 'ArrowUp') return at < 0 ? count - 1 : (at - 1 + count) % count;
  return null;
}

/**
 * Which tiny bump a tap on the face means (B86): on a small phone the 44 px tap areas of close bumps overlap, so the
 * tap goes to the nearest bump centre that is not popped yet and is within reach (not just the top button).
 * @param {{x: number, y: number}[]} bumps the bumps of the card (centres, 0..1 of the face)
 * @param {number[]} popped the bumps already popped (indexes)
 * @param {number} x the tap, 0..1 across the face
 * @param {number} y the tap, 0..1 down the face
 * @param {number} reach how far a tap may be from a centre (0..1 of the face width; half the tap area)
 * @returns {number} the bump index, or -1 when no open bump is within reach
 */
export function nearestBump(bumps, popped, x, y, reach) {
  let best = -1;
  let bestD = Infinity;
  bumps.forEach((b, i) => {
    if (popped.includes(i)) return;
    const d = Math.hypot(b.x - x, b.y - y);
    if (d <= reach && d < bestD) { best = i; bestD = d; }
  });
  return best;
}
