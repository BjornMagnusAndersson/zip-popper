// The moving part of the pimple-popper mode (T2.17d): one canvas scene with a skin patch (or the big face) and its
// pimples. Press and hold a pimple and pressure builds: two finger dents push in, the skin around it stretches (a
// small mesh warp of the skin picture), the head swells and shines, and then it pops with a wet sound, a buzz, worms
// and drops of glossy goo (and splats on the "lens" for the big ones). Blackheads are pulled out with tweezers; big
// rounds and the face have a blackhead strip to peel off. When everything is out: wipe the goo away with a cotton pad,
// then cream goes on and a clean sweep leaves the skin smooth. Reduced motion: no wobble, no splats, fades instead of
// sweeps, still fully playable. Keyboard: Enter or Space squeezes the next pimple, peels, or wipes for you.
// The drawing loop only runs while something moves; dispose() stops it.
import { pressureStep, tapPressure, hitTest, rng } from './logic.js';
import {
  makeCanvas, drawPimple, drawMark, drawStrand, drawDrop, drawSplat, drawStrip, drawStripDots, drawPad, drawCream,
  drawTweezers, drawFinger,
} from './art.js';

const GRID = 8; // mesh cells across the squeezed area
const WIPE_CELL = 10; // px; goo coverage is counted in cells this size
const WIPE_DONE = 0.8; // part of the goo that must be wiped before it counts as clean

/**
 * Smooth 0..1 ramp.
 * @param {number} t input 0..1
 * @returns {number} eased value
 */
const smooth = (t) => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t));

/**
 * The affine map that takes three source points to three destination points.
 * @param {number[]} s source x0,y0,x1,y1,x2,y2
 * @param {number[]} d destination x0,y0,x1,y1,x2,y2
 * @returns {number[]|null} [a, b, c, d, e, f] for setTransform, or null when the triangle is flat
 */
function affine(s, d) {
  const [x0, y0, x1, y1, x2, y2] = s;
  const den = (x1 - x0) * (y2 - y0) - (x2 - x0) * (y1 - y0);
  if (Math.abs(den) < 1e-6) return null;
  const a = ((d[2] - d[0]) * (y2 - y0) - (d[4] - d[0]) * (y1 - y0)) / den;
  const c = ((d[4] - d[0]) * (x1 - x0) - (d[2] - d[0]) * (x2 - x0)) / den;
  const b = ((d[3] - d[1]) * (y2 - y0) - (d[5] - d[1]) * (y1 - y0)) / den;
  const dd = ((d[5] - d[1]) * (x1 - x0) - (d[3] - d[1]) * (x2 - x0)) / den;
  return [a, b, c, dd, d[0] - a * x0 - c * y0, d[1] - b * x0 - dd * y0];
}

/**
 * Create a pimple scene on a canvas.
 * @param {HTMLCanvasElement} canvas the canvas (its CSS size should be width x height)
 * @param {{width: number, height: number, dpr?: number, texture: HTMLCanvasElement, pimples: object[], strip?: object|null,
 *   reduced?: boolean, sound?: {play: (name: string, o?: object) => void}, buzz?: (p: number|number[]) => void,
 *   onPop?: (p: object, left: number) => void, onStep?: (step: string) => void, onDone?: () => void}} o options
 * @returns {object} add(pimples), left(), step(), setTexture(tex), targets(), stripBox(), keyPress(), dispose()
 */
export function createPopScene(canvas, o) {
  const w = o.width;
  const h = o.height;
  const dpr = o.dpr ?? Math.min(2, globalThis.devicePixelRatio || 1);
  const reduced = Boolean(o.reduced);
  const scale = Math.max(0.6, Math.min(1.6, Math.min(w, h) / 260));
  const rand = rng(Math.round(w * 13 + h * 7 + o.pimples.length));
  canvas.width = Math.round(w * dpr);
  canvas.height = Math.round(h * dpr);
  const ctx = canvas.getContext('2d');
  let texture = o.texture;
  let raf = 0;
  let last = 0;
  let time = 0;
  let disposed = false;
  let step = 'pop'; // pop (pimples and strip, any order) | wipe | cream | done
  const pimples = o.pimples.map((p) => ({ ...p, pressure: 0, popped: false, appear: reduced ? 1 : 0, wob: 0, wobV: 0 }));
  const strip = o.strip ? { ...o.strip, q: 0, lift: 0, off: false, flying: false } : null;
  const marks = []; // pink spots where pimples were (healed by the cream)
  const strands = []; // goo worms
  const drops = []; // goo drops in the air
  const blobs = []; // goo drops that landed
  const splats = []; // goo on the lens
  const tweezers = []; // tweezers pulling a blackhead out
  let hold = null; // {p, id, since} the pimple being squeezed
  let peel = null; // {id, x0, q0} the strip being peeled
  let wipe = null; // {dirt, cells, dirty, clean, pad, auto, fading}
  let cream = null; // {dollops, t}
  let keyHold = null; // {p, until} a key press squeezing
  const warnedThresholds = new Set();
  let lastWipeSound = -1;

  /**
   * Play a sound through the scene's sound player (if any).
   * @param {string} name sound name
   * @param {object} [opt] options
   * @returns {void}
   */
  const play = (name, opt) => { try { o.sound?.play(name, opt); } catch { /* sound is optional */ } };

  /**
   * A short buzz on phones that can.
   * @param {number|number[]} pattern milliseconds
   * @returns {void}
   */
  const buzz = (pattern) => { try { o.buzz?.(pattern); } catch { /* not allowed */ } };

  /** Start the drawing loop if it is not running. @returns {void} */
  function kick() {
    if (raf || disposed) return;
    last = performance.now();
    raf = requestAnimationFrame(frame);
  }

  /**
   * Turn a pointer event into scene coordinates.
   * @param {PointerEvent} e the event
   * @returns {{x: number, y: number}} the point
   */
  function local(e) {
    const r = canvas.getBoundingClientRect();
    return { x: ((e.clientX - r.left) * w) / (r.width || w), y: ((e.clientY - r.top) * h) / (r.height || h) };
  }

  /**
   * How far a point of skin moves while a pimple is squeezed: pushed in by the two fingers, bulging out at the middle.
   * @param {object} p the pimple
   * @param {number} a squeeze amount (pressure plus wobble)
   * @param {number} x skin x
   * @param {number} y skin y
   * @returns {number[]} [dx, dy]
   */
  function displace(p, a, x, y) {
    const R = p.r * 4.4;
    const vx = x - p.x;
    const vy = y - p.y;
    const d = Math.hypot(vx, vy);
    const fall = smooth(1 - d / R);
    if (fall <= 0) return [0, 0];
    const ax = Math.cos(p.axis);
    const ay = Math.sin(p.axis);
    const bulge = 0.6 * a * Math.exp(-((d / (p.r * 1.7)) ** 2));
    let dx = vx * bulge;
    let dy = vy * bulge;
    const reach = p.r * 1.9 * (1 - 0.2 * Math.max(0, a));
    for (const side of [-1, 1]) {
      const fx = p.x + ax * side * reach;
      const fy = p.y + ay * side * reach;
      const k = -side * p.r * 1.0 * a * Math.exp(-((Math.hypot(x - fx, y - fy) / (p.r * 1.1)) ** 2));
      dx += ax * k;
      dy += ay * k;
    }
    return [dx * fall, dy * fall];
  }

  /**
   * Draw the skin around a squeezed pimple stretched by the fingers (a small triangle mesh of the skin picture).
   * @param {object} p the pimple
   * @param {number} a squeeze amount
   * @param {boolean} fingers draw the fingers and folds (not during the jiggle after a pop)
   * @returns {void}
   */
  function drawWarp(p, a, fingers) {
    const R = p.r * 4.4;
    const n = GRID;
    const pts = [];
    const x0 = p.x - R;
    const y0 = p.y - R;
    const cell = (R * 2) / n;
    for (let j = 0; j <= n; j += 1) {
      for (let i = 0; i <= n; i += 1) {
        const sx = x0 + i * cell;
        const sy = y0 + j * cell;
        const [dx, dy] = displace(p, a, sx, sy);
        pts.push([sx, sy, sx + dx, sy + dy]);
      }
    }
    /**
     * Copy one triangle of skin from where it was to where it is pushed.
     * @param {number[]} A vertex
     * @param {number[]} B vertex
     * @param {number[]} C vertex
     * @returns {void}
     */
    const tri = (A, B, C) => {
      const m = affine([A[0] * dpr, A[1] * dpr, B[0] * dpr, B[1] * dpr, C[0] * dpr, C[1] * dpr], [A[2], A[3], B[2], B[3], C[2], C[3]]);
      if (!m) return;
      const cx = (A[2] + B[2] + C[2]) / 3;
      const cy = (A[3] + B[3] + C[3]) / 3;
      ctx.save();
      ctx.beginPath();
      for (const [k, V] of [A, B, C].entries()) { // grown by half a pixel so no seams show between triangles
        const ex = V[2] + Math.sign(V[2] - cx) * 0.6;
        const ey = V[3] + Math.sign(V[3] - cy) * 0.6;
        if (k === 0) ctx.moveTo(ex, ey); else ctx.lineTo(ex, ey);
      }
      ctx.closePath();
      ctx.clip();
      ctx.setTransform(m[0] * dpr, m[1] * dpr, m[2] * dpr, m[3] * dpr, m[4] * dpr, m[5] * dpr);
      const sx = Math.max(0, Math.floor(Math.min(A[0], B[0], C[0]) * dpr) - 2);
      const sy = Math.max(0, Math.floor(Math.min(A[1], B[1], C[1]) * dpr) - 2);
      const ex = Math.min(texture.width, Math.ceil(Math.max(A[0], B[0], C[0]) * dpr) + 2);
      const ey = Math.min(texture.height, Math.ceil(Math.max(A[1], B[1], C[1]) * dpr) + 2);
      if (ex > sx && ey > sy) ctx.drawImage(texture, sx, sy, ex - sx, ey - sy, sx, sy, ex - sx, ey - sy);
      ctx.restore();
    };
    for (let j = 0; j < n; j += 1) {
      for (let i = 0; i < n; i += 1) {
        const A = pts[j * (n + 1) + i];
        const B = pts[j * (n + 1) + i + 1];
        const C = pts[(j + 1) * (n + 1) + i];
        const D = pts[(j + 1) * (n + 1) + i + 1];
        tri(A, B, D);
        tri(A, D, C);
      }
    }
    if (a <= 0.04 || !fingers) return;
    // Finger dents (soft shadows), fingertips pressing, and the stretched shine in the middle.
    const ax = Math.cos(p.axis);
    const ay = Math.sin(p.axis);
    const reach = p.r * 1.9 * (1 - 0.2 * a);
    const k = Math.min(1, a);
    // Bunched-up skin between the fingers and the pimple: a dark fold with a light ridge on each side.
    for (const side of [-1, 1]) {
      const base = p.axis + (side < 0 ? Math.PI : 0);
      ctx.lineCap = 'round';
      ctx.strokeStyle = `rgba(130,55,40,${0.32 * k})`;
      ctx.lineWidth = 1.6;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r * (1.3 + 0.2 * k), base - 0.7, base + 0.7); ctx.stroke();
      ctx.strokeStyle = `rgba(255,232,218,${0.45 * k})`;
      ctx.lineWidth = 1.4;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r * (1.42 + 0.2 * k), base - 0.6, base + 0.6); ctx.stroke();
    }
    for (const side of [-1, 1]) {
      const fx = p.x + ax * side * reach;
      const fy = p.y + ay * side * reach;
      const g = ctx.createRadialGradient(fx, fy, 0, fx, fy, p.r * 1.5);
      g.addColorStop(0, `rgba(120,50,36,${0.3 * Math.min(1, a)})`);
      g.addColorStop(1, 'rgba(120,50,36,0)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(fx, fy, p.r * 1.5, 0, Math.PI * 2); ctx.fill();
    }
    // Two fingertips pressing in from both sides (drawn after the dents so they sit on top).
    for (const side of [-1, 1]) {
      const fx = p.x + ax * side * (reach + p.r * 0.1);
      const fy = p.y + ay * side * (reach + p.r * 0.1);
      drawFinger(ctx, fx, fy, p.axis + (side < 0 ? Math.PI : 0), Math.max(18, p.r * 1.7), Math.min(1, a * 3));
    }
    const shine = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 2.2);
    shine.addColorStop(0, `rgba(255,236,228,${0.22 * Math.min(1, a)})`);
    shine.addColorStop(1, 'rgba(255,236,228,0)');
    ctx.fillStyle = shine;
    ctx.beginPath(); ctx.arc(p.x, p.y, p.r * 2.2, 0, Math.PI * 2); ctx.fill();
  }

  /**
   * The squeeze direction that keeps both fingers on the picture best (near an edge they come from inside).
   * @param {object} p the pimple
   * @returns {number} the angle in radians
   */
  function fingerAxis(p) {
    let best = p.axis;
    let bestRoom = -Infinity;
    for (const a of [p.axis, 0, Math.PI / 4, Math.PI / 2, (3 * Math.PI) / 4]) {
      let room = Infinity;
      for (const side of [-1, 1]) {
        const fx = p.x + Math.cos(a) * side * p.r * 3;
        const fy = p.y + Math.sin(a) * side * p.r * 3;
        room = Math.min(room, fx, fy, w - fx, h - fy);
      }
      if (room > bestRoom + 4) { best = a; bestRoom = room; }
    }
    return best;
  }

  /**
   * Squirt the goo out of a pimple that just popped.
   * @param {object} p the pimple
   * @returns {void}
   */
  function squirt(p) {
    const gold = p.type === 'gold';
    const count = p.type === 'big' ? 2 : 1;
    for (let i = 0; i < count; i += 1) {
      const ang = -Math.PI / 2 + (rand() - 0.5) * 2.6;
      const max = p.r * (p.type === 'big' ? 2.6 + rand() * 1.8 : 2 + rand() * 1.4);
      strands.push({
        x: p.x, y: p.y, ang, curl: (rand() - 0.5) * 0.05 / scale, sag: 0.006 + rand() * 0.008, len: 0, max,
        speed: max / (p.type === 'big' ? 0.55 : 0.35), w: p.r * (p.type === 'big' ? 0.3 : 0.42), gold, pts: [],
      });
    }
    const n = { whitehead: 4, red: 6, big: 12, gold: 8 }[p.type] ?? 4;
    for (let i = 0; i < n; i += 1) {
      const a = rand() * Math.PI * 2;
      const v = (30 + rand() * 110) * scale;
      drops.push({ x: p.x, y: p.y, z: 0.1, vx: Math.cos(a) * v, vy: Math.sin(a) * v, vz: 120 + rand() * 160, r: (1.2 + rand() * (p.type === 'big' ? 3 : 2)) * scale, gold });
    }
    if (p.type === 'big' && !reduced) {
      const k = 2 + Math.round(rand());
      for (let i = 0; i < k; i += 1) {
        splats.push({ x: Math.max(30, Math.min(w - 30, p.x + (rand() - 0.5) * w * 0.7)), y: Math.max(30, Math.min(h * 0.7, p.y + (rand() - 0.6) * h * 0.6)), r: (14 + rand() * 12) * scale, drip: 0, a: 1, born: time + i * 0.06, seed: Math.round(rand() * 1e6) });
      }
    }
  }

  /**
   * Pop a pimple: goo (or the tweezers pull a blackhead), sound, buzz, wobble, and a pink mark left behind.
   * @param {object} p the pimple
   * @returns {void}
   */
  function pop(p) {
    p.popped = true;
    p.pressure = 0;
    if (hold?.p === p) hold = null;
    if (keyHold?.p === p) keyHold = null;
    if (p.type === 'blackhead') {
      tweezers.push({ x: p.x, y: p.y, t: 0, r: p.r });
      play('tweeze');
      buzz(14);
    } else {
      squirt(p);
      play(p.type === 'big' ? 'pop_big' : p.type === 'gold' ? 'pop_gold' : 'pop_small');
      buzz(p.type === 'big' ? [30, 40, 50] : 24);
    }
    marks.push({ x: p.x, y: p.y, r: p.r * (p.type === 'blackhead' ? 0.9 : 1.1) });
    if (!reduced) { p.wob = p.type === 'blackhead' ? 0 : 0.55; p.wobV = 0; }
    const left = pimples.filter((q) => !q.popped).length;
    try { o.onPop?.(p, left); } catch (e) { console.warn('onPop failed:', e); }
    maybeNextStep();
    kick();
  }

  /** After the last pimple and the strip: start wiping (or straight to the cream when there is no goo). @returns {void} */
  function maybeNextStep() {
    if (step !== 'pop') return;
    if (pimples.some((p) => !p.popped) || (strip && !strip.off)) return;
    // Wait until the goo has landed, then start the wipe.
    const start = () => {
      if (disposed || step !== 'pop') return;
      if (drops.length || strands.some((s) => s.len < s.max) || tweezers.length || (strip && strip.flying)) { setTimeout(start, 120); return; }
      beginWipe();
    };
    setTimeout(start, reduced ? 200 : 450);
  }

  /**
   * Change the step and tell the controller.
   * @param {string} s the new step
   * @returns {void}
   */
  function setStep(s) {
    step = s;
    try { o.onStep?.(s); } catch (e) { console.warn('onStep failed:', e); }
    kick();
  }

  /** Put all the goo on its own layer so the pad can wipe it off; count how much there is. @returns {void} */
  function beginWipe() {
    if (!strands.length && !blobs.length) { beginCream(); return; }
    const { canvas: dirt, ctx: dc } = makeCanvas(w, h, dpr);
    for (const s of strands) drawStrand(dc, s);
    for (const b of blobs) drawDrop(dc, b);
    const cols = Math.ceil(w / WIPE_CELL);
    const rows = Math.ceil(h / WIPE_CELL);
    const cells = new Uint8Array(cols * rows); // 1 = goo here, 2 = wiped
    let dirty = 0;
    try {
      const data = dc.getImageData(0, 0, dirt.width, dirt.height).data;
      for (let r = 0; r < rows; r += 1) {
        for (let c = 0; c < cols; c += 1) {
          let found = false;
          for (let yy = r * WIPE_CELL; yy < Math.min(h, (r + 1) * WIPE_CELL) && !found; yy += 3) {
            for (let xx = c * WIPE_CELL; xx < Math.min(w, (c + 1) * WIPE_CELL); xx += 3) {
              if (data[(Math.floor(yy * dpr) * dirt.width + Math.floor(xx * dpr)) * 4 + 3] > 40) { found = true; break; }
            }
          }
          if (found) { cells[r * cols + c] = 1; dirty += 1; }
        }
      }
    } catch {
      // No pixel access: count the goo by its positions instead.
      for (const s of [...strands.flatMap((st) => st.pts), ...blobs]) {
        const i = Math.floor(s.y / WIPE_CELL) * cols + Math.floor(s.x / WIPE_CELL);
        if (cells[i] === 0) { cells[i] = 1; dirty += 1; }
      }
    }
    strands.length = 0;
    blobs.length = 0;
    wipe = { dirt, dc, cells, cols, rows, dirty: Math.max(1, dirty), clean: 0, pad: { x: w - 40 * scale, y: h - 40 * scale }, last: null, id: null, auto: null, fade: 0 };
    setStep('wipe');
  }

  /**
   * Wipe the goo where the pad is.
   * @param {number} x pad x
   * @param {number} y pad y
   * @returns {void}
   */
  function wipeAt(x, y) {
    if (!wipe || wipe.fade) return;
    const r = 30 * scale;
    const from = wipe.last ?? { x, y };
    const dist = Math.hypot(x - from.x, y - from.y);
    const steps = Math.max(1, Math.ceil(dist / 4));
    wipe.dc.save();
    wipe.dc.globalCompositeOperation = 'destination-out';
    for (let i = 1; i <= steps; i += 1) {
      const px = from.x + ((x - from.x) * i) / steps;
      const py = from.y + ((y - from.y) * i) / steps;
      wipe.dc.beginPath(); wipe.dc.arc(px, py, r * 0.9, 0, Math.PI * 2); wipe.dc.fill();
      const c0 = Math.max(0, Math.floor((px - r) / WIPE_CELL));
      const c1 = Math.min(wipe.cols - 1, Math.floor((px + r) / WIPE_CELL));
      const r0 = Math.max(0, Math.floor((py - r) / WIPE_CELL));
      const r1 = Math.min(wipe.rows - 1, Math.floor((py + r) / WIPE_CELL));
      for (let rr = r0; rr <= r1; rr += 1) {
        for (let cc = c0; cc <= c1; cc += 1) {
          const k = rr * wipe.cols + cc;
          if (wipe.cells[k] === 1 && Math.hypot((cc + 0.5) * WIPE_CELL - px, (rr + 0.5) * WIPE_CELL - py) < r) { wipe.cells[k] = 2; wipe.clean += 1; }
        }
      }
    }
    wipe.dc.restore();
    wipe.last = { x, y };
    wipe.pad = { x, y };
    if (dist > 4 && time - lastWipeSound > 0.2) { lastWipeSound = time; play('wipe'); }
    if (wipe.clean / wipe.dirty >= WIPE_DONE) { wipe.fade = 0.0001; wipe.auto = null; }
    kick();
  }

  /** Wipe for the player (keyboard): the pad sweeps back and forth across the patch. @returns {void} */
  function autoWipe() {
    if (!wipe || wipe.fade || wipe.auto) return;
    wipe.auto = { t: 0 };
    wipe.last = null;
    kick();
  }

  /** Dab cream on every pink mark and rub it in with a clean sweep. @returns {void} */
  function beginCream() {
    wipe = null;
    cream = { t: 0, dollops: marks.map((m, i) => ({ x: m.x, y: m.y, r: Math.max(6, m.r * 1.1), at: i * 0.08 })) };
    play('cream_heal');
    setStep('cream');
  }

  /**
   * One step of the physics.
   * @param {number} dt seconds since the last frame
   * @returns {boolean} true while something still moves
   */
  function update(dt) {
    let busy = false;
    for (const p of pimples) {
      if (p.appear < 1) { p.appear = Math.min(1, p.appear + dt * 3.5); busy = true; }
      if (!p.popped) {
        const held = hold?.p === p || (keyHold?.p === p && time < keyHold.until);
        const before = p.pressure;
        if (keyHold?.p === p && time < keyHold.until) p.pressure = Math.min(keyHold.target, p.pressure + dt * 2.4);
        else if (keyHold?.p !== p || hold?.p === p) p.pressure = pressureStep(p.pressure, dt, hold?.p === p, p.hold);
        for (const th of [0.3, 0.6, 0.85]) {
          const key = `${p.id}:${th}`;
          if (before < th && p.pressure >= th && !warnedThresholds.has(key)) { warnedThresholds.add(key); play('squish', { level: th }); buzz(6); }
          if (p.pressure < th - 0.15) warnedThresholds.delete(key);
        }
        if (p.pressure >= 1) pop(p);
        if (held || (p.pressure > 0 && keyHold?.p !== p)) busy = true;
      }
      if (p.wob || p.wobV) {
        p.wobV += (-190 * p.wob - 9 * p.wobV) * dt;
        p.wob += p.wobV * dt;
        if (Math.abs(p.wob) < 0.008 && Math.abs(p.wobV) < 0.05) { p.wob = 0; p.wobV = 0; } else busy = true;
      }
      if (p.type === 'gold' && !p.popped && !reduced) busy = true; // it twinkles
    }
    for (const s of strands) {
      if (s.len >= s.max) continue;
      busy = true;
      s.len = Math.min(s.max, s.len + s.speed * dt);
      const pts = [];
      let x = s.x;
      let y = s.y;
      let a = s.ang;
      for (let d = 0; d <= s.len; d += 1.5) {
        pts.push({ x, y });
        a += s.curl * 1.5;
        x += Math.cos(a) * 1.5;
        y += Math.sin(a) * 1.5 + s.sag * d;
      }
      s.pts = pts;
    }
    for (let i = drops.length - 1; i >= 0; i -= 1) {
      const d = drops[i];
      busy = true;
      d.x += d.vx * dt;
      d.y += d.vy * dt;
      d.vz -= 700 * dt;
      d.z += d.vz * dt;
      if (d.z <= 0) { drops.splice(i, 1); blobs.push({ x: d.x, y: d.y, r: d.r, gold: d.gold }); }
    }
    for (let i = splats.length - 1; i >= 0; i -= 1) {
      const s = splats[i];
      busy = true;
      const age = time - s.born;
      s.drip = Math.min(s.r * 1.6, Math.max(0, age) * s.r * 0.6);
      if (age > 2.4) s.a = Math.max(0, 1 - (age - 2.4) / 0.8);
      if (s.a <= 0) splats.splice(i, 1);
    }
    for (let i = tweezers.length - 1; i >= 0; i -= 1) {
      tweezers[i].t += dt;
      busy = true;
      if (tweezers[i].t > 0.8) tweezers.splice(i, 1);
    }
    if (strip && !strip.off) {
      if (!peel && strip.q > 0.6 && strip.q < 1) strip.q = Math.min(1, strip.q + dt * 2.2);
      if (strip.q >= 1 && !strip.flying) { strip.flying = true; play('peel'); buzz([12, 30, 18]); }
      if (strip.flying) {
        strip.lift = Math.min(1, strip.lift + dt * (reduced ? 4 : 2.2));
        if (strip.lift >= 1) { strip.off = true; strip.flying = false; maybeNextStep(); }
      }
      if (strip.flying || (!peel && strip.q > 0.6 && strip.q < 1)) busy = true;
    }
    if (hold || peel) busy = true;
    if (wipe) {
      if (wipe.auto) {
        busy = true;
        wipe.auto.t += dt;
        const t = wipe.auto.t / 1.6;
        const rows = 4;
        const row = Math.min(rows - 1, Math.floor(t * rows));
        const f = t * rows - row;
        const x = row % 2 ? w - 20 - f * (w - 40) : 20 + f * (w - 40);
        wipeAt(x, ((row + 0.5) / rows) * h);
        if (t >= 1 && !wipe.fade) wipe.fade = 0.0001;
      }
      if (wipe.fade) {
        busy = true;
        wipe.fade += dt * 3;
        if (wipe.fade >= 1) beginCream();
      }
    }
    if (cream) {
      busy = true;
      cream.t += dt;
      if (cream.t > (reduced ? 1.2 : 1.9) && step === 'cream') {
        step = 'done';
        marks.length = 0;
        try { o.onStep?.('done'); } catch { /* ignore */ }
        setTimeout(() => { if (!disposed) o.onDone?.(); }, 350);
      }
      if (step === 'done') busy = cream.t < 2.6;
    }
    return busy;
  }

  /**
   * Where the clean sweep is during the cream step (x of its edge), or null before it starts.
   * @returns {number|null} x
   */
  function sweepX() {
    if (!cream || reduced) return null;
    const s = (cream.t - 0.6) / 1.1;
    if (s <= 0) return null;
    return -60 + smooth(s) * (w + 120);
  }

  /** Draw the whole scene once. @returns {void} */
  function render() {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    ctx.drawImage(texture, 0, 0, w, h);
    const sx = sweepX();
    const fadeAll = reduced && cream ? Math.max(0, 1 - Math.max(0, cream.t - 0.5) / 0.6) : 1;
    // Stretched skin around the pimple being squeezed (and the jiggle after a pop).
    for (const p of pimples) {
      const a = (p.popped ? 0 : p.pressure) + p.wob;
      const shake = !reduced && !p.popped && p.pressure > 0.8 ? Math.sin(time * 70) * 0.03 : 0;
      if (p.type !== 'blackhead' && Math.abs(a) > 0.01) drawWarp(p, a + shake, !p.popped);
    }
    for (const m of marks) {
      const alpha = sx === null ? fadeAll : m.x < sx ? 0 : 1;
      if (alpha > 0) drawMark(ctx, m, alpha);
    }
    if (strip && !strip.off) drawStripDots(ctx, strip.dots, strip.x + strip.q * strip.w);
    for (const p of pimples) if (!p.popped) drawPimple(ctx, p, p.pressure, p.appear, time);
    for (const s of strands) drawStrand(ctx, s);
    for (const b of blobs) drawDrop(ctx, b);
    if (wipe) {
      ctx.save();
      ctx.globalAlpha = wipe.fade ? Math.max(0, 1 - wipe.fade) : 1;
      ctx.drawImage(wipe.dirt, 0, 0, w, h);
      ctx.restore();
    }
    // Tweezers: open over a blackhead while it is squeezed, then pull the plug up and away.
    for (const p of pimples) {
      if (p.type === 'blackhead' && !p.popped && p.pressure > 0.02) drawTweezers(ctx, p.x, p.y, 1 - p.pressure, scale);
    }
    for (const tw of tweezers) {
      const up = smooth(tw.t / 0.6) * 46 * scale;
      ctx.save();
      ctx.globalAlpha = Math.max(0, 1 - Math.max(0, tw.t - 0.5) / 0.3);
      drawStrand(ctx, { pts: [{ x: tw.x, y: tw.y - up + tw.r * 2.2 }, { x: tw.x, y: tw.y - up }], w: tw.r * 0.9, tip: true });
      drawTweezers(ctx, tw.x, tw.y - up, 0, scale);
      ctx.restore();
    }
    if (strip && !strip.off) {
      ctx.save();
      ctx.globalAlpha = 1 - strip.lift;
      drawStrip(ctx, strip, strip.q, strip.lift);
      ctx.restore();
    }
    for (const d of drops) drawDrop(ctx, d);
    if (wipe && !wipe.fade) drawPad(ctx, wipe.pad.x, wipe.pad.y, 26 * scale);
    if (cream) {
      for (const d of cream.dollops) {
        const grow = smooth((cream.t - d.at) / 0.18);
        const gone = sx === null ? fadeAll : d.x < sx ? Math.max(0, 1 - (sx - d.x) / 40) : 1;
        drawCream(ctx, d.x, d.y, d.r * grow, gone * (grow > 0 ? 1 : 0));
      }
      if (sx !== null && !reduced) {
        const g = ctx.createLinearGradient(sx - 70, 0, sx + 10, 0);
        g.addColorStop(0, 'rgba(255,255,255,0)');
        g.addColorStop(0.75, 'rgba(255,250,240,0.42)');
        g.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = g;
        ctx.fillRect(sx - 70, 0, 80, h);
      }
      if (step === 'done') { // a soft fresh glow over the clean skin
        const a = Math.max(0, 0.22 - Math.abs(cream.t - 2.1) * 0.3);
        ctx.fillStyle = `rgba(255,248,236,${a})`;
        ctx.fillRect(0, 0, w, h);
      }
    }
    for (const s of splats) if (time >= s.born) drawSplat(ctx, s);
  }

  /**
   * One animation frame.
   * @param {number} now time stamp
   * @returns {void}
   */
  function frame(now) {
    raf = 0;
    if (disposed) return;
    const dt = Math.min(0.05, Math.max(0, (now - last) / 1000));
    last = now;
    time += dt;
    const busy = update(dt);
    render();
    if (busy && !raf) raf = requestAnimationFrame(frame); // a kick() during this frame may already have asked for the next
  }

  /** Finger or mouse down: squeeze a pimple, grab the strip, or start wiping. @param {PointerEvent} e event @returns {void} */
  function onDown(e) {
    if (e.button > 0) return;
    const pt = local(e);
    if (step === 'pop') {
      if (strip && !strip.off && !strip.flying && pt.x > strip.x - 14 && pt.x < strip.x + strip.w + 6 && pt.y > strip.y - 12 && pt.y < strip.y + strip.h + 12) {
        peel = { id: e.pointerId, x0: pt.x, q0: strip.q };
      } else {
        const p = hitTest(pimples, pt.x, pt.y);
        if (!p) return;
        if (p.pressure < 0.05) p.axis = fingerAxis(p);
        hold = { p, id: e.pointerId, since: time };
        play('squish', { level: 0.1 });
      }
    } else if (step === 'wipe' && wipe && !wipe.fade) {
      wipe.id = e.pointerId;
      wipe.auto = null;
      wipe.last = null;
      wipeAt(pt.x, pt.y);
    } else return;
    e.preventDefault();
    try { canvas.setPointerCapture(e.pointerId); } catch { /* fine without */ }
    kick();
  }

  /** Finger moves: peel the strip further, or move the pad. @param {PointerEvent} e event @returns {void} */
  function onMove(e) {
    if (peel && e.pointerId === peel.id) {
      const pt = local(e);
      strip.q = Math.max(strip.q, Math.min(1, peel.q0 + (pt.x - peel.x0) / strip.w));
      if (Math.floor(strip.q * 5) !== Math.floor((strip.q - 0.02) * 5)) buzz(4);
      kick();
    } else if (wipe && wipe.id === e.pointerId) {
      const pt = local(e);
      wipeAt(pt.x, pt.y);
    }
  }

  /** Finger up: let go of the pimple (a quick tap still gives a little pressure). @param {PointerEvent} e event @returns {void} */
  function onUp(e) {
    if (hold && e.pointerId === hold.id) {
      if (time - hold.since < 0.2 && !hold.p.popped) hold.p.pressure = Math.min(1, hold.p.pressure + 0.2);
      if (hold.p.pressure >= 1) pop(hold.p);
      hold = null;
    }
    if (peel && e.pointerId === peel.id) peel = null;
    if (wipe && wipe.id === e.pointerId) { wipe.id = null; wipe.last = null; }
    kick();
  }

  /**
   * Enter or Space: squeeze the next pimple a bit, peel the strip a bit, or wipe for the player.
   * @returns {boolean} true when something happened
   */
  function keyPress() {
    if (step === 'pop') {
      const p = pimples.find((q) => !q.popped);
      if (p) {
        keyHold = { p, until: time + 0.25, target: tapPressure(p.pressure) };
        play('squish', { level: keyHold.target });
        kick();
        return true;
      }
      if (strip && !strip.off) { strip.q = Math.min(1, strip.q + 0.34); kick(); return true; }
    }
    if (step === 'wipe') { autoWipe(); return true; }
    return false;
  }

  canvas.addEventListener('pointerdown', onDown);
  canvas.addEventListener('pointermove', onMove);
  canvas.addEventListener('pointerup', onUp);
  canvas.addEventListener('pointercancel', onUp);
  // Debug and smoke-test hook: where the pimples still are (scene coordinates = CSS pixels of the canvas).
  canvas.popTargets = () => pimples.filter((p) => !p.popped).map((p) => ({ x: p.x, y: p.y, r: p.r, type: p.type }));
  canvas.popStrip = () => (strip && !strip.off ? { x: strip.x, y: strip.y, w: strip.w, h: strip.h } : null);
  canvas.popStep = () => step;
  render();
  kick();

  return {
    /**
     * Add more pimples while the patch is open (they grow in). Only while popping.
     * @param {object[]} list pimples from layoutPatch
     * @returns {boolean} true when they were added
     */
    add(list) {
      if (step !== 'pop') return false;
      for (const p of list) pimples.push({ ...p, pressure: 0, popped: false, appear: reduced ? 1 : 0, wob: 0, wobV: 0 });
      kick();
      return true;
    },
    /** Pimples still to pop. @returns {number} count */
    left: () => pimples.filter((p) => !p.popped).length,
    /** Every pimple in the scene (popped or not). @returns {object[]} the pimples */
    all: () => pimples,
    /** The step now: pop, wipe, cream or done. @returns {string} the step */
    step: () => step,
    /**
     * Swap the background picture (the face changes mood as it is cleared).
     * @param {HTMLCanvasElement} tex the new texture
     * @returns {void}
     */
    setTexture(tex) { texture = tex; kick(); if (!raf) render(); },
    keyPress,
    /** Stop the loop and the listeners. @returns {void} */
    dispose() {
      disposed = true;
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
      canvas.removeEventListener('pointerdown', onDown);
      canvas.removeEventListener('pointermove', onMove);
      canvas.removeEventListener('pointerup', onUp);
      canvas.removeEventListener('pointercancel', onUp);
    },
  };
}
