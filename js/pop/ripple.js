// The juicy pop's see-through ripple (SPEC D45 item 1, from pop test G's makeRipple): no line and no colour, only a
// light bend of what is already on the pop canvas (the face, the goo), travelling out from the bump like a ring of
// water and fading as it goes. The outer half of the wave magnifies a little and the inner half shrinks a little, so
// the picture bends as if seen through a thin glass ring.
// How: the frame is drawn on a hidden canvas while a wave is alive (engine.js render), copied to the shown canvas in
// one go, and then thin rings of that hidden frame are stroked back on (as a pattern), each scaled very slightly about
// the bump. The rings are cut where the bend changes by under one device pixel, so features bend smoothly. Reading
// the hidden canvas, never the shown one half way through a frame, keeps phones from flashing a half-drawn picture
// (B114). The waves live in scene px and are placed through the zoom view each frame, so they line up with the
// player's zoom and pan. engine.js never starts one with reduced motion or Lighter graphics.

/**
 * Smooth 0..1 ramp.
 * @param {number} u input
 * @returns {number} eased 0..1
 */
const smooth = (u) => (u <= 0 ? 0 : u >= 1 ? 1 : u * u * (3 - 2 * u));

/**
 * The bend at distance x (px) from the wave's middle: pushed out past the middle, pulled in before it, nothing far off.
 * @param {number} x px from the middle (outwards +)
 * @param {number} a the strongest bend (px)
 * @param {number} s the wave's half-width (px)
 * @returns {number} px
 */
export const bendAt = (x, a, s) => a * 1.6487 * (x / s) * Math.exp(-(x * x) / (2 * s * s)); // 1.6487 = e^0.5: the peak is a

/**
 * Make a ripple player for one pop scene.
 * @returns {{start: (x: number, y: number, now: number, o: object) => void, busy: () => boolean, warmUp: (n?: number) => void,
 *   clear: () => void, draw: (c: CanvasRenderingContext2D, src: HTMLCanvasElement, now: number, place: {at: (x: number, y: number) => {x: number, y: number}, z: number, dpr: number}) => void}}
 *   the ripple
 */
export function makeRipple() {
  const waves = [];
  const STEP = 0.9; // device px of bend between one ring and the next (smaller is smoother but costs more rings)
  const MAX_WAVES = 4; // waves alive at once (each costs a few dozen thin rings a frame)
  let warm = 0; // frames still to run the whole path once, invisibly, so the phone sets it up then and not at the pop (B114)
  return {
    /**
     * Start a ripple at a scene point. Knobs (scene px unless said): far (how far out it goes), r0 (where it starts),
     * life (seconds), amp (the strongest bend), width (the wave's half-width), waves ([[delay s, strength, reach]...]).
     * @param {number} x scene x
     * @param {number} y scene y
     * @param {number} now the scene's clock (seconds)
     * @param {{far: number, r0: number, life: number, amp: number, width: number, waves: number[][]}} o knobs
     * @returns {void}
     */
    start(x, y, now, o) {
      for (const [delay, k, reach] of o.waves) waves.push({ x, y, t0: now + delay, k, far: o.far * reach, r0: o.r0, life: o.life, amp: o.amp, width: o.width });
      if (waves.length > MAX_WAVES) waves.splice(0, waves.length - MAX_WAVES); // quick pops in a row: the oldest (by now faint) waves go
    },
    /** Whether the frame should be drawn on the hidden canvas now (a wave is alive, or still warming up). @returns {boolean} yes */
    busy: () => warm > 0 || waves.length > 0,
    /** Run the whole path invisibly for the next n frames (a new scene, a new canvas size). @param {number} [n] frames @returns {void} */
    warmUp(n = 3) { warm = Math.max(warm, n); },
    /** Forget every wave (the scene changed size). @returns {void} */
    clear() { waves.length = 0; },
    /**
     * Bend the shown canvas along each live wave (weaker ones first, so the main wave lies on top where they cross).
     * @param {CanvasRenderingContext2D} c the shown canvas's context (the hidden frame is already copied onto it)
     * @param {HTMLCanvasElement} src the hidden canvas this frame was drawn on (the same size)
     * @param {number} now the scene's clock (seconds)
     * @param {{at: (x: number, y: number) => {x: number, y: number}, z: number, dpr: number}} place at = a scene point
     *   on the canvas now (CSS px, through the zoom view), z = the zoom, dpr = device px per CSS px
     * @returns {void}
     */
    draw(c, src, now, place) {
      for (let i = waves.length - 1; i >= 0; i -= 1) if (now - waves[i].t0 > waves[i].life) waves.splice(i, 1);
      const live = waves.filter((w) => now >= w.t0).sort((p, q) => p.k - q.k);
      const warming = warm > 0 && !live.length;
      if (warm > 0) warm -= 1;
      if ((!live.length && !warming) || !src) return;
      const pat = c.createPattern(src, 'no-repeat');
      if (!pat || !pat.setTransform || typeof DOMMatrix !== 'function') return;
      c.save();
      c.setTransform(1, 0, 0, 1, 0, 0); // work in device px
      if (warming) { // one ring of the picture laid exactly on itself: no change on screen, but the path is set up
        pat.setTransform(new DOMMatrix([1, 0, 0, 1, 0, 0]));
        c.strokeStyle = pat;
        c.lineWidth = 2;
        c.beginPath();
        c.arc(src.width / 2, src.height / 2, Math.min(src.width, src.height) / 4, 0, Math.PI * 2);
        c.stroke();
      }
      const zs = place.z * place.dpr; // scene px to device px
      const za = Math.min(place.z, 1.6) * place.dpr; // the bend grows with the zoom only a little (it stays a light bend)
      for (const w of live) {
        const u = (now - w.t0) / w.life;
        const R = (w.r0 + (w.far - w.r0) * (1 - (1 - u) ** 2)) * zs; // fast at first, slowing as it spreads
        const a = w.amp * w.k * za * (1 - u) ** 1.6 * smooth(u / 0.12); // in quickly, fading as it goes
        const s = w.width * zs * (0.8 + 0.5 * u); // and a little wider as it goes
        if (a < STEP * 0.6) continue;
        const at = place.at(w.x, w.y);
        const cx = at.x * place.dpr;
        const cy = at.y * place.dpr;
        // Walk across the wave, inside to outside, cutting it into rings where the bend moves on by one STEP.
        let from = -3 * s;
        let lvl = Math.round(bendAt(from, a, s) / STEP);
        for (let x = from + 0.5; x <= 3 * s + 0.5; x += 0.5) {
          const now2 = x > 3 * s ? 0 : Math.round(bendAt(x, a, s) / STEP);
          if (now2 === lvl) continue;
          const r = R + (from + x) / 2; // this ring's middle
          const d = lvl * STEP; // its bend
          if (lvl !== 0 && R + from > x - from + 2 && r > Math.abs(d) * 3) {
            const k = r / (r - d); // scaled about the bump so a point at r shows the picture from r - d
            pat.setTransform(new DOMMatrix([k, 0, 0, k, cx - k * cx, cy - k * cy]));
            c.strokeStyle = pat; // set again after the change, to be safe in every browser
            c.lineWidth = x - from + 1; // a pixel of overlap, so no seam shows between rings
            c.beginPath();
            c.arc(cx, cy, r, 0, Math.PI * 2);
            c.stroke();
          }
          from = x;
          lvl = now2;
        }
      }
      c.restore();
    },
  };
}
