// The rules for the studio room's light and particle effects (SPEC D45 item 3): which tier gets which effect, how
// many particles, and how often the picture must be painted again. Pure: no page, no canvas, so it is tested in Node.
// The drawing is in room-fx.js (and room-dust.js, room-lamps.js, room-shine.js, room-mood.js).
//   tier 0 (dingy and dank): fine dust drifting in a soft shaft of light, the cheap bulb's halo flickering with the
//     room's flicker and a little cartoon moth circling it, a dim and slightly green mood. Once the ring light (the
//     'lamp' studio layer) is bought the old bulb is off for good (the mlamp strip: "The old bulb has given up": no
//     halo, no flicker), the moth is gone and the shaft falls from the ring light.
//   tier 1: fewer dust motes, a neutral light mood, now and then a soft shine sweeps over shiny things with glints.
//   tier 2 (spa): shine sweeps, floating sparkle motes, a few rose petals, the candle's glow and the diffuser's light,
//     a warm golden mood at the edges.
//   home (chapters 0 to 4): none of these.
// Reduced motion: a calm still picture (nothing moves, no repaints). Lighter graphics: in the pop scene the effects
// stand still (no extra repaints, like the spa's sparkles); in the studio view and the scrub job half the particles,
// painted less often.

/** Seconds between effect frames while something moves (16 a second: plenty for slow dust, cheap on phones). */
export const FX_STEP = 1 / 16;
/** Seconds between effect frames with Lighter graphics (12 a second), where the effects still move. */
export const FX_STEP_LITE = 1 / 12;
/** The longest step the effects take in one go (after a slow frame or a pause), in seconds. */
export const FX_MAX_DT = 0.1;

/** How much dust each tier has in the air (share of the full amount; 0 = no dust shaft). */
export const DUST_BY_TIER = [1, 0.5, 0];
/** The pop scene uses fewer particles than the studio view: the face covers the middle of the room. */
export const POP_SHARE = 0.6;

/**
 * Which effects the room shows, for a backdrop kind and the owned studio layers.
 * @param {number|string} kind 0, 1, 2 or 'home' (pop/backdrop.js backdropKind)
 * @param {string[]} [layers] owned studio layer ids
 * @param {{reduced?: boolean, lite?: boolean, where?: 'pop'|'view'|'scrub'}} [o] reduced motion; lighter graphics;
 *   where the room is shown (the pop scene behind the face, the studio view, or the scrub job's close-up)
 * @returns {{on: boolean, tier: number, dust: number, moth: boolean, ring: boolean, bulbOff: boolean, flicker: boolean,
 *   mood: number|null, sweeps: boolean, sparkles: boolean, petals: boolean, candle: boolean, diffuser: boolean,
 *   share: number, moving: boolean, step: number}} the plan: dust = share of the full dust (0 = none); bulbOff = the
 *   old ceiling bulb is off (tier 0 with the ring light); share = particle count factor; moving = whether it needs
 *   repaints; step = seconds between them while moving
 */
export function roomFxPlan(kind, layers = [], o = {}) {
  const where = o.where ?? 'pop';
  const lite = Boolean(o.lite);
  const reduced = Boolean(o.reduced);
  const list = Array.isArray(layers) ? layers : [];
  const none = {
    on: false, tier: 0, dust: 0, moth: false, ring: false, bulbOff: false, flicker: false, mood: null, sweeps: false, sparkles: false,
    petals: false, candle: false, diffuser: false, share: 0, moving: false, step: Infinity,
  };
  if (kind === 'home' || ![0, 1, 2].includes(kind)) return none;
  const tier = kind;
  const ring = list.includes('lamp');
  const share = (where === 'pop' ? POP_SHARE : 1) * (lite ? 0.5 : 1);
  const stillHere = reduced || (lite && where === 'pop'); // the pop scene with lighter graphics: a still picture
  return {
    on: true,
    tier,
    dust: DUST_BY_TIER[tier],
    moth: tier === 0 && !ring, // the moth loves the cheap bulb; the new ring light sends it away
    ring,
    bulbOff: tier === 0 && ring, // the old bulb has given up once the ring light is here (audit A3)
    flicker: tier === 0 && !ring,
    mood: tier,
    sweeps: tier >= 1,
    sparkles: tier === 2,
    petals: tier === 2,
    candle: tier === 2,
    diffuser: tier === 2 && list.includes('leakFix'), // the spa's diffuser stands where the bucket was
    share,
    moving: !stillHere,
    step: stillHere ? Infinity : lite ? FX_STEP_LITE : FX_STEP,
  };
}

/**
 * How long until the effects look different (so the room is only painted again when needed).
 * @param {{moving: boolean, step: number}} plan from roomFxPlan
 * @returns {number} seconds (Infinity = never: a still picture)
 */
export function nextRoomFxChange(plan) {
  return plan?.on && plan.moving ? plan.step : Infinity;
}

/**
 * How many particles to use for a full count, with the plan's share (never below one).
 * @param {number} n the full count
 * @param {number} share the plan's share (0..1)
 * @returns {number} count
 */
export function fxCount(n, share) {
  return Math.max(1, Math.round(n * share));
}

/**
 * The seconds of time the effects should move on between two frames: never backwards, never a big jump (after a
 * pause, a hidden page or a slow frame the dust simply goes on).
 * @param {number|null} last the time at the last frame (null = the first frame)
 * @param {number} now the time now
 * @returns {number} seconds 0..FX_MAX_DT
 */
export function fxStepTime(last, now) {
  if (last === null || !Number.isFinite(last) || !Number.isFinite(now)) return 0;
  return Math.max(0, Math.min(FX_MAX_DT, now - last));
}

/** Seconds the scrub job's ending takes: the dust whooshes out, then the light turns clean and warm. */
export const SCRUB_FX_LEN = 3.2;

/**
 * The scrub job's ending at a moment (the dust whoosh into clean light, like the effect strip's WHOOSH beat).
 * @param {number} since seconds since the item came clean (below 0 = still scrubbing)
 * @param {boolean} [reduced] reduced motion: straight to the clean look, nothing flies
 * @returns {{whoosh: number, clean: number, glow: number, done: boolean}} whoosh 0..1 how far the dust has flown out
 *   (1 = gone), clean 0..1 how clean and warm the light is, glow 0..1 the warm swell as it turns clean, done = the
 *   ending is over (no more frames needed)
 */
export function scrubFxAt(since, reduced = false) {
  if (!(since >= 0)) return { whoosh: 0, clean: 0, glow: 0, done: false };
  if (reduced) return { whoosh: 1, clean: 1, glow: 0, done: true };
  /** Smooth 0..1 ramp. @param {number} u input @returns {number} eased */
  const ease = (u) => (u <= 0 ? 0 : u >= 1 ? 1 : u * u * (3 - 2 * u));
  return {
    whoosh: ease(since / 1.8),
    clean: ease((since - 0.4) / 1.4),
    glow: Math.exp(-(((since - 1.7) / 0.5) ** 2)),
    done: since >= SCRUB_FX_LEN,
  };
}
