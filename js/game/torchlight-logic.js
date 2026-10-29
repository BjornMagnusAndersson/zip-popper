// The pure rules of the torchlight special mode (T4.5, chapter 1 "The secret"): she sneaks a pop while her husband
// sleeps on the sofa in the dark, and only a small torch circle lights his face. A hidden wake-up meter (0 = fast
// asleep, 1 = awake) rises while the torch shines on his face (much faster on his eyes), with every pop (louder pops
// more), with an "Ow" (a rough press) and when she takes too long; it slowly falls again while he is left in peace.
// On the way up he twitches, mumbles and shifts (each once per climb), then calms. A full meter means he stirs: popping
// stops for a moment, the bumps she already popped STAY popped, but a half-squeezed bump loses its squeeze and he only
// settles into a light sleep (stirWake: the meter falls to STIR_SETTLE, not to 0), so he is quicker to stir again.
// After the last bump the scripted catch plays (his phone light, CAUGHT).
// No DOM here: screens/torchlight.js shows it, tests/torchlight.test.mjs checks it in Node.

/** The round itself: his 3 bumps (whiteheads, as in chapter 0), a normal irritation scale (the round cannot fail). */
export const TORCHLIGHT_ROUND = { bumpCount: 3, allowedTypes: ['whitehead'], difficulty: 0.6 };

/** The wake-up tuning (first guess, tuned so a calm player wakes him never and a careless one about once). */
export const WAKE = {
  faceRate: 0.035, // per second while the torch's light is on his face
  eyeRate: 0.32, // per second, times how squarely the light sits on his eyes (0..1)
  popBase: 0.07, // every pop
  popLoud: 0.16, // extra for a loud pop (times its loudness 0..1)
  ow: 0.22, // a rough press ("Ow!") makes him flinch
  slowAfter: 9, // seconds without a pop before slowness starts to count
  slowGrow: 0.012, // after that, slowness adds this much more per second for every second she waits
  slowMax: 0.12, // the most slowness adds per second (more than he calms: waiting forever wakes him too)
  calmRate: 0.07, // per second the meter falls while nothing disturbs him (no light on the face)
  calmDelay: 0.6, // seconds after a disturbance before he starts to calm down
};

/** The reactions on the way up, lowest first: each fires once when the meter climbs past `at`. */
export const REACTIONS = [
  { id: 'twitch', at: 0.3 },
  { id: 'mumble', at: 0.55 },
  { id: 'shift', at: 0.8 },
];

/** How far the meter must fall below a reaction's level before that reaction can fire again. */
export const REARM_GAP = 0.12;

/** The meter level at which he stirs (popping pauses, see stirWake). */
export const WAKE_FULL = 1;

/** Where the meter falls after a stir (B28): a light sleep, past the twitch, so the next mumble comes sooner. */
export const STIR_SETTLE = 0.4;

/**
 * Keep a number between two limits.
 * @param {number} v the number
 * @param {number} lo lowest
 * @param {number} hi highest
 * @returns {number} the kept number
 */
function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v));
}

/**
 * A fresh wake-up state: fast asleep, no reaction used, the slowness clock at zero.
 * @returns {{level: number, sincePop: number, quiet: number, fired: string[]}} level 0..1, seconds since the last pop
 *   (or the start), seconds since the last disturbance, reactions used on this climb
 */
export function createWake() {
  return { level: 0, sincePop: 0, quiet: 0, fired: [] };
}

/**
 * How much of the torch light falls on his face and on his eyes. The face is an ellipse; the light counts on the face
 * when the torch circle touches the face ellipse a fair bit, and on the eyes by how close the light's middle is to the
 * nearer eye (1 = right on it, 0 = an eye is outside the circle).
 * @param {{x: number, y: number, r: number}|null} torch the torch circle (screen px), null = no light
 * @param {{cx: number, cy: number, rx: number, ry: number, eyes?: {x: number, y: number}[]}|null} face his face (screen px)
 * @returns {{face: boolean, eyes: number}} the light on him
 */
export function torchLight(torch, face) {
  if (!torch || !face || !(face.rx > 0) || !(face.ry > 0) || !(torch.r > 0)) return { face: false, eyes: 0 };
  // Normalised distance of the torch middle from the face middle, with the face ellipse grown by half the circle.
  const gx = face.rx + torch.r * 0.5;
  const gy = face.ry + torch.r * 0.5;
  const d = Math.hypot((torch.x - face.cx) / gx, (torch.y - face.cy) / gy);
  const onFace = d <= 1;
  let eyes = 0;
  for (const e of face.eyes ?? []) {
    const k = 1 - Math.hypot(torch.x - e.x, torch.y - e.y) / torch.r;
    eyes = Math.max(eyes, clamp(k, 0, 1));
  }
  return { face: onFace, eyes: onFace ? eyes : 0 };
}

/**
 * How loud a pop is, 0..1: big bumps are loud; otherwise a bigger bump of its kind pops a bit louder.
 * @param {{type?: string, r?: number}} bump the popped bump (type and radius in px)
 * @param {Object<string, {radius?: number[]}>} [kinds] the bump table (data/bumps.js BUMPS), for the radius range
 * @returns {number} loudness 0..1
 */
export function popLoudness(bump, kinds = {}) {
  if (!bump) return 0;
  if (bump.type === 'big' || bump.type === 'horn') return 1;
  const [lo, hi] = kinds[bump.type]?.radius ?? [18, 26];
  const k = hi > lo && Number.isFinite(bump.r) ? clamp((bump.r - lo) / (hi - lo), 0, 1) : 0.5;
  return 0.3 + 0.4 * k;
}

/**
 * Raise the meter by an amount (a disturbance): the calm-down clock starts again.
 * @param {object} s the wake state
 * @param {number} amount how much (0..1)
 * @returns {object} the new state
 */
function disturb(s, amount) {
  return { ...s, level: clamp(s.level + amount, 0, WAKE_FULL), quiet: 0 };
}

/**
 * How much her slowness adds to the meter per second: nothing for the first seconds after a pop, then a little more
 * every second she waits (up to WAKE.slowMax).
 * @param {number} sincePop seconds since the last pop (or the start)
 * @returns {number} per second
 */
export function slowness(sincePop) {
  return clamp((sincePop - WAKE.slowAfter) * WAKE.slowGrow, 0, WAKE.slowMax);
}

/**
 * Time passes: the light on his face and eyes and her slowness raise the meter; with no light on him (and a moment
 * after the last disturbance) he calms down again. Reactions are re-armed once the meter has fallen well below them.
 * @param {object} s the wake state (createWake)
 * @param {number} dt seconds since the last step (big jumps are capped at half a second)
 * @param {{face: boolean, eyes: number}} light the torch light on him (torchLight)
 * @returns {object} the new state
 */
export function stepWake(s, dt, light = { face: false, eyes: 0 }) {
  const t = clamp(Number.isFinite(dt) ? dt : 0, 0, 0.5);
  const rise = light.face ? WAKE.faceRate + WAKE.eyeRate * clamp(light.eyes ?? 0, 0, 1) : 0;
  const sincePop = s.sincePop + t;
  let level = s.level + (rise + slowness(sincePop)) * t;
  const quiet = rise > 0 ? 0 : s.quiet + t; // slowness is a slow pressure, not a disturbance: he still calms
  if (!light.face && quiet >= WAKE.calmDelay) level -= WAKE.calmRate * t;
  level = clamp(level, 0, WAKE_FULL);
  const fired = s.fired.filter((id) => level > (REACTIONS.find((r) => r.id === id)?.at ?? 0) - REARM_GAP);
  return { ...s, level, sincePop, quiet, fired };
}

/**
 * A bump was popped: the pop's noise raises the meter (louder = more) and the slowness clock starts again.
 * @param {object} s the wake state
 * @param {number} loudness 0..1 (popLoudness)
 * @returns {object} the new state
 */
export function popWake(s, loudness = 0.5) {
  return { ...disturb(s, WAKE.popBase + WAKE.popLoud * clamp(loudness, 0, 1)), sincePop: 0 };
}

/**
 * A rough press ("Ow!"): he flinches in his sleep.
 * @param {object} s the wake state
 * @returns {object} the new state
 */
export function owWake(s) {
  return disturb(s, WAKE.ow);
}

/**
 * The reactions that fire now: every reaction the meter has climbed past and that has not fired on this climb. The
 * returned state remembers them, so each fires once until the meter falls back below it.
 * @param {object} s the wake state
 * @returns {{state: object, fire: string[]}} the new state and the reaction ids to show (lowest first)
 */
export function takeReactions(s) {
  const fire = REACTIONS.filter((r) => s.level >= r.at && !s.fired.includes(r.id)).map((r) => r.id);
  if (!fire.length) return { state: s, fire };
  return { state: { ...s, fired: [...s.fired, ...fire] }, fire };
}

/**
 * After a stir he settles again, but only into a light sleep (B28): the meter falls to STIR_SETTLE (not to 0), the
 * reactions below that level count as used (so the twitch does not fire again at once), and the slowness and calm-down
 * clocks start again (so a slow player is not woken straight away a second time).
 * @param {object} s the wake state (only kept for its shape; every field is set)
 * @returns {object} the new state
 */
export function stirWake(s) {
  const fired = REACTIONS.filter((r) => r.at <= STIR_SETTLE).map((r) => r.id);
  return { ...s, level: STIR_SETTLE, sincePop: 0, quiet: 0, fired };
}

/**
 * Whether he is awake now (the meter is full): he stirs, popping pauses and he settles again (stirWake).
 * @param {object} s the wake state
 * @returns {boolean} true = he wakes
 */
export function isAwake(s) {
  return s.level >= WAKE_FULL - 1e-9;
}

/**
 * Whether the scripted catch starts: every bump is popped (and he did not wake first).
 * @param {number} left bumps still to pop
 * @param {object} s the wake state
 * @returns {boolean} true = play the catch
 */
export function isCaught(left, s) {
  return left <= 0 && !isAwake(s);
}

/**
 * The scripted catch, as timed steps (seconds from the last pop): a held breath, his phone light turns on, the big
 * CAUGHT, then the Continue button. With reduced motion the steps come a little later and nothing flashes or shakes
 * (the screen fades instead).
 * @param {boolean} [reduced] reduced motion is on
 * @returns {{at: number, step: 'hush'|'phone'|'caught'|'continue'}[]} the steps in order
 */
export function catchScript(reduced = false) {
  return reduced
    ? [{ at: 0, step: 'hush' }, { at: 1.2, step: 'phone' }, { at: 2.6, step: 'caught' }, { at: 3.6, step: 'continue' }]
    : [{ at: 0, step: 'hush' }, { at: 1.0, step: 'phone' }, { at: 1.8, step: 'caught' }, { at: 2.8, step: 'continue' }];
}

/** The torch circle's size: a share of his face width, never smaller than a fingertip area or too big. */
export const TORCH = { share: 0.62, min: 64, max: 150, keyStep: 24 };

/**
 * The torch circle's radius for a face size.
 * @param {number} rx the face's half width (screen px)
 * @returns {number} radius (screen px)
 */
export function torchRadius(rx) {
  return clamp((Number.isFinite(rx) ? rx : 100) * TORCH.share, TORCH.min, TORCH.max);
}

/**
 * Move the torch by the arrow keys, kept inside the stage.
 * @param {{x: number, y: number}} at where the torch is
 * @param {string} key the key (ArrowLeft, ArrowRight, ArrowUp, ArrowDown)
 * @param {{w: number, h: number}} box the stage size
 * @param {number} [step] px per press
 * @returns {{x: number, y: number}|null} the new place, or null for another key
 */
export function moveTorchByKey(at, key, box, step = TORCH.keyStep) {
  const moves = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
  const m = moves[key];
  if (!m) return null;
  return { x: clamp(at.x + m[0] * step, 0, box.w), y: clamp(at.y + m[1] * step, 0, box.h) };
}

/**
 * Pick the mumble line for the n-th mumble (they take turns, so the same line never shows twice in a row).
 * @param {number} n how many mumbles came before (0 based)
 * @param {number} count how many lines there are
 * @returns {number} line number 1..count
 */
export function mumbleIndex(n, count) {
  const c = Math.max(1, Math.floor(count));
  return (Math.max(0, Math.floor(n)) % c) + 1;
}
