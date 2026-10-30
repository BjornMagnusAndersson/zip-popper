// Pop effects test page, variant H: Bubble and ooze. A look-and-feel test only (see popfx/shared.js for the hooks).
// The bump, crater and goo drawing come from popfx/g.js. Cartoon only: creamy goo, a soft pink crater, never red.
import { KIND, CALM, smooth, play, later, buzz, tone, hiss, sc, bp, T, holdId, rand } from './shared.js';
import { gooOf, throb, outDir, drawDome, drawCrater, drawGooBall, gooShadow, drawGooRibbon, stepFlyers, drawFlyer, drawLanded, leanIn, makeGlass } from './g.js';

/**
 * H: bubble and ooze, softer and less cartoon than D. While held the head swells in throbs, the skin over it opens
 * like a little mouth, the goo wells up in it as a glossy dome, overflows the rim and runs a little way down the
 * cheek. At full pressure a final release: the dome of goo bulges and bursts, a squirt of goo shoots out sideways in
 * a line, a splash of thick drops goes all round and lands with weight, a soft pale ring and a jolt of the view, the
 * run slides on a bit further, and the bump sinks into a soft pink crater that heals back to smooth
 * skin about two seconds later.
 * @returns {object} the variant
 */
function makeH() {
  const big = KIND === 'big';
  const g = gooOf(bp);
  const openAng = bp.axis + Math.PI / 2;
  const dir = outDir();
  const flying = [];
  const landed = [];
  const glass = makeGlass();
  const runMax = bp.r * (big ? 1.5 : 0.95); // how far it runs while held
  const runMore = bp.r * (big ? 0.7 : 0.45); // and on at the release
  const w0 = Math.max(3, bp.r * (big ? 0.46 : 0.42)); // the run's thickness once clear of the mouth
  let phase = 0;
  let peak = 0; // the highest pressure so far: the opening and the run do not go back in
  let popAt = -1;
  let pop0 = null; // the dome at the pop
  let saidOpen = false;
  let saidRun = false;
  /** The dome now: size, tightness, throb, head, how far the mouth is open and how much goo has welled up. @returns {object} dome */
  const domeNow = () => {
    const pr = bp.pressure;
    const k = CALM ? 0 : throb(phase) * smooth((pr - 0.1) / 0.25);
    const s = bp.r * (1 + 0.5 * pr + 0.1 * k);
    const hr = s * (big ? 0.42 + 0.26 * pr : 0.5 + 0.18 * pr) * (1 + 0.06 * k);
    const open = smooth((peak - 0.38) / 0.3);
    const well = smooth((Math.max(pr, peak * 0.75) - 0.5) / 0.4);
    return { s, pr, k, hr, open, well, head: smooth(pr / 0.8) };
  };
  /** The glossy dome of goo in the mouth: its radius. @param {object} d the dome @returns {number} px */
  const wellR = (d) => d.hr * 0.78 * d.open * (0.6 + 0.55 * d.well) * (1 + 0.08 * d.k);
  /** How long the run down the cheek is now. @returns {number} px */
  const runLen = () => {
    if (popAt < 0) return runMax * smooth((peak - 0.74) / 0.26);
    return pop0.run + runMore * smooth((T - popAt) / 0.55);
  };
  /** The run's middle line: out of the mouth along dir, bending down under its weight. @param {number} L length @returns {{x: number, y: number}[]} points */
  const runPts = (L) => {
    const pts = [];
    let x = bp.x;
    let y = bp.y - bp.r * 0.06;
    for (let q = 0; q <= L; q += 2) {
      pts.push({ x, y });
      const h = dir + (Math.PI / 2 - dir) * 0.65 * smooth(q / (bp.r * 2.2));
      x += Math.cos(h) * 2;
      y += Math.sin(h) * 2;
    }
    return pts;
  };
  /**
   * Draw the run with its drip head, if it has started: wide where it pours over the rim, narrowing to a thick run,
   * with a fat drip at the end; at the release a swell of goo slides down it.
   * @param {CanvasRenderingContext2D} c context
   * @param {number} L length
   * @param {number} root how fat it leaves the mouth (0..1)
   * @param {number} mw the welled-up goo's radius (the run starts as wide as it)
   * @param {number} t seconds since the release, or -1
   * @returns {void}
   */
  const drawRun = (c, L, root, mw, t) => {
    if (L < 2) return;
    const pts = runPts(bp.r * 0.4 + L);
    const n = pts.length;
    const at = t >= 0 ? smooth(t / 0.55) * n : -1e9; // where the swell is
    const swell = t >= 0 ? 0.55 * (1 - smooth((t - 0.45) / 0.3)) : 0;
    const wide = Math.max(w0, mw * 1.6); // as wide as the welled-up goo where it pours over the rim
    /** The run's thickness at point i: wide at the root, a thick run after, the swell sliding down at the release. @param {number} i point @returns {number} px */
    const wAt = (i) => {
      const q = i * 2;
      const base = w0 + (wide - w0) * Math.exp(-Math.max(0, q - mw * 0.7) / (bp.r * 0.55));
      return base * root * (1 - 0.22 * (i / n)) * (1 + swell * Math.exp(-((((i - at) * 2) / (bp.r * 0.45)) ** 2)));
    };
    drawGooRibbon(c, pts, wAt, g);
    const e = pts[n - 1];
    const er = wAt(n - 1) * 0.58 * (1 + 0.12 * smooth(L / runMax));
    gooShadow(c, e.x + er * 0.2, e.y + er * 0.45, er, er * 0.7, 0.16);
    drawGooBall(c, e.x, e.y + er * 0.1, er, er * 1.05, 0, g);
  };
  return {
    /** The game's own bump is hidden (drawn here instead); the skin is pushed harder with each throb. @returns {object} look */
    look() {
      const d = domeNow();
      return { amt: -3, warp: d.pr * 1.1 + 0.12 * d.k, jx: 0, jy: 0 };
    },
    /** The throbs (a low blub each), the mouth opening and the run starting (a sound each), the flung drops. @param {number} sdt scene seconds @returns {void} */
    step(sdt) {
      if (!bp.popped) {
        peak = Math.max(peak, bp.pressure);
        if (holdId !== null && bp.pressure > 0.1) {
          const before = Math.floor(phase);
          phase += sdt * (1.1 + 3.2 * bp.pressure);
          if (Math.floor(phase) > before && !CALM) tone(130 + 90 * bp.pressure, 95 + 60 * bp.pressure, 0, 0.13, 0.04);
        }
        if (!saidOpen && peak > 0.42) { saidOpen = true; hiss(0, 0.22, { type: 'bandpass', f0: 450, f1: 1100, q: 1.6, vol: 0.05, attack: 0.05 }); }
        if (!saidRun && peak > 0.78) { saidRun = true; play('drip'); }
      }
      stepFlyers(flying, landed, sdt);
      glass.step(sdt);
    },
    /** The goo drops on the screen glass. @param {CanvasRenderingContext2D} c context @returns {void} */
    screen: (c) => glass.draw(c, g),
    /** Lean in on the bump, with a short springy jolt at the release. @returns {object|null} camera */
    cam() {
      const base = leanIn(popAt, big ? 0.22 : 0.3);
      if (CALM || popAt < 0) return base;
      const t = T - popAt;
      const kick = (big ? 0.07 : 0.05) * Math.exp(-t * 9) * Math.cos(t * 34);
      const z = (base?.sx ?? 1) * (1 + kick);
      return Math.abs(z - 1) < 0.001 ? null : { ax: bp.x, ay: bp.y, sx: z, sy: z };
    },
    /** The bump with its mouth, the welling goo and the run; after the release the crater, the run and the goo left. @param {CanvasRenderingContext2D} c context @param {object} p bump @returns {void} */
    afterBump(c, p) {
      if (!bp.popped) {
        const d = domeNow();
        drawDome(c, p.x, p.y, d.s, { pr: d.pr, head: d.head, hr: d.hr, goo: g, open: d.open, openAng, bead: d.open > 0.05 ? 0 : smooth((d.pr - 0.25) / 0.2) * 0.8, big, fill: 0.4 + 0.6 * d.well });
        const m = wellR(d);
        drawRun(c, runLen(), smooth(d.well / 0.6), m, -1);
        if (m > 0.6) drawGooBall(c, p.x, p.y - d.hr * 0.06 - m * 0.12 * d.well, m, m * (0.74 + 0.1 * d.well), openAng * 0.1, g);
        return;
      }
      const t = T - popAt;
      const sink = smooth((t - 0.08) / 0.45);
      const settle = smooth((t - 0.8) / 1.3); // the crater heals back to smooth skin about two seconds after the release
      const R = pop0.s * 0.34 * (1 - 0.25 * settle); // a small dip, not a hole
      if (sink < 1) {
        c.save();
        c.globalAlpha = 1 - sink * sink;
        const s = pop0.s * (1 - sink) + R * 1.25 * sink;
        drawDome(c, p.x, p.y, s, { pr: 1 - sink, head: 1, hr: pop0.hr * (1 - sink) + R * sink, goo: g, open: 1, openAng, bead: 0, big, fill: 1 - sink * 0.5 });
        c.restore();
      }
      if (sink > 0 && settle < 1) {
        c.save();
        c.globalAlpha = sink * (1 - settle);
        drawCrater(c, p.x, p.y, R, 1 - 0.6 * settle, openAng, g, 0);
        c.restore();
      }
      // The goo in the mouth: one last surge as it lets go, then it drains down the run to a small dollop in the crater.
      const surge = CALM ? 0.3 * Math.sin(Math.PI * Math.min(1, t / 0.2)) : 1.6 * Math.sin(Math.PI * Math.min(1, t / 0.12)); // a big bulge as it lets go
      const drain = smooth(t / 0.6);
      const m0 = Math.max(pop0.m, pop0.hr * 0.5);
      const m = m0 * (1 + 0.3 * surge) * (1 - 0.55 * drain);
      drawRun(c, runLen(), 1, m0 * (1 - 0.75 * drain), t); // its root narrows as the mouth empties, so the crater shows
      drawGooBall(c, p.x + R * 0.08 * drain, p.y - pop0.hr * 0.1 * (1 - drain) + R * 0.1 * drain, m * (1 + 0.15 * drain), m * (0.8 - 0.15 * drain), openAng * 0.1, g);
    },
    /** The landed drops, on the skin under the fingertips. @param {CanvasRenderingContext2D} c context @returns {void} */
    mid(c) {
      for (const s of landed) drawLanded(c, s, g);
    },
    /**
     * The final release: the goo bulges and bursts, a squirt of goo shoots out in a line (out and a little up, away
     * from the run), a splash of thick drops goes all round, a soft pale ring, a pop, a plop, a squelch and a buzz.
     * @returns {void}
     */
    pop() {
      const d = domeNow();
      pop0 = { s: d.s, hr: d.hr, m: wellR(d), run: runLen() }; // runLen() before popAt is set: the run so far
      popAt = T;
      const k = big ? 1.2 : 1;
      /** Where a drop leaves the mouth going way a. @param {number} a angle @param {number} rr how far out (of the goo's radius) @returns {{x: number, y: number}} point */
      const at = (a, rr) => ({ x: bp.x + Math.cos(a) * pop0.m * rr, y: bp.y - d.hr * 0.1 + Math.sin(a) * pop0.m * rr });
      // The squirt: drops leaving the same way at rising speeds, so they string out into a line of goo in the air.
      const sq = Math.cos(dir) > 0 ? Math.PI - 0.1 : 0.1; // sideways, the other way from the run, a touch downwards (it arcs up a little, below the eyes)
      const ns = CALM ? 3 : big ? 7 : 5;
      for (let i = 0; i < ns; i += 1) {
        const v = (240 + i * (CALM ? 50 : 75)) * sc * k;
        flying.push({ ...at(sq, 0.6), z: 4, vx: Math.cos(sq) * v, vy: Math.sin(sq) * v, vz: 75 + i * 6, r: (5.2 - i * 0.45) * sc * k });
      }
      // The splash: thick drops all round, flatter upwards so they keep clear of the eyes, more of them down the run's way.
      const n = CALM ? 6 : big ? 22 : 16;
      for (let i = 0; i < n; i += 1) {
        const a0 = i % 3 === 0 ? dir + (rand() - 0.5) * 1.4 : (i / n) * Math.PI * 2 + rand() * 0.4;
        const a = Math.sin(a0) < 0 ? Math.atan2(Math.sin(a0) * 0.5, Math.cos(a0)) : a0;
        const v = (200 + rand() * 260) * sc * k;
        const r = (i % 4 === 0 ? 4.4 + rand() * 1.4 : 2.4 + rand() * 1.6) * sc * k;
        flying.push({ ...at(a, 0.8), z: 3, vx: Math.cos(a) * v, vy: Math.sin(a) * v, vz: 60 + rand() * 70, r });
      }
      glass.hit(big ? 3 : 2, bp.x, bp.y);
      play(big ? 'pop_big' : 'pop_small');
      tone(big ? 300 : 420, big ? 90 : 130, 0, 0.16, 0.2);
      hiss(0, big ? 0.4 : 0.3, { type: 'bandpass', f0: 1500, f1: 400, q: 0.7, vol: 0.1, attack: 0.02 });
      later(0.08, 'squelch');
      buzz(big ? [55, 30, 90] : [35, 20, 50]);
    },
    /** The soft pale ring at the release and the flung drops in the air, over everything. @param {CanvasRenderingContext2D} c context @returns {void} */
    over(c) {
      if (popAt >= 0) {
        const u = (T - popAt) / 0.4;
        if (u >= 0 && u <= 1) {
          c.save();
          c.globalAlpha = (1 - u * u) * 0.5;
          c.strokeStyle = '#fffdf2';
          c.lineWidth = Math.max(1.5, 7 * sc * (1 - u));
          c.beginPath(); c.arc(bp.x, bp.y, bp.r * (1.2 + (big ? 4 : 3.4) * (1 - (1 - u) ** 3)), 0, Math.PI * 2); c.stroke();
          c.restore();
        }
      }
      for (const d of flying) drawFlyer(c, d, g);
    },
  };
}

export default { id: 'H', name: 'Bubble and ooze', make: makeH };
