// Slow-phone safety net (owner 2026-10-28: the game must not need a top phone). The pop scene watches how long its
// frames take while something moves; when they stay slow for a while, it asks for "lighter graphics" (the scene drawn
// at pixel ratio 1 instead of 2: a quarter of the pixels to paint). Pure logic, no DOM, so it can be tested in Node.

/**
 * frameMs = the average frame time (ms) that counts as slow (about 25 frames a second or worse); frames = how many
 * moving frames it needs to have seen first (so one hitch never counts); maxGap = longer gaps are pauses, not frames;
 * weight = how fast the average follows new frames.
 */
export const SLOW = { frameMs: 40, frames: 45, maxGap: 400, weight: 0.08 };

/**
 * The next state of the slow-frame watcher after one moving frame.
 * @param {{avg: number, n: number, slow: boolean}|null} state the watcher so far (null = fresh)
 * @param {number} gapMs time since the previous moving frame, ms
 * @returns {{avg: number, n: number, slow: boolean}} the new state; slow turns true once and stays true
 */
export function slowStep(state, gapMs) {
  const s = state ?? { avg: 0, n: 0, slow: false };
  if (s.slow || !(gapMs > 0) || gapMs > SLOW.maxGap) return s;
  const avg = s.n === 0 ? gapMs : s.avg + (gapMs - s.avg) * SLOW.weight;
  const n = s.n + 1;
  return { avg, n, slow: n >= SLOW.frames && avg > SLOW.frameMs };
}

/**
 * The pixel ratio to draw the scene at: the screen's own, at most 2 (sharper costs too much), and 1 with lighter
 * graphics.
 * @param {number} deviceRatio the screen's pixel ratio (devicePixelRatio)
 * @param {boolean} lighter lighter graphics are on
 * @returns {number} 1 to 2
 */
export function sceneRatio(deviceRatio, lighter) {
  return lighter ? 1 : Math.min(2, Math.max(1, Number(deviceRatio) || 1));
}
