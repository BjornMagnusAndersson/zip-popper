// Shared part of the pop effects test page (pop-fx-test.html, a look-and-feel test only, not part of the game): the
// face, the bump, the hold input, the bar, the sounds, the goo, the frame loop and the drawing helpers. Each variant
// (popfx/a.js .. f.js) is a module { id, name, make() } whose make() returns hooks; see the README comment at start().
// Address options: ?v=A..F, ?kind=whitehead|big, ?who=<regular id> (default greta), ?still (calm version, as with the
// phone's reduce-motion setting), ?mute, ?shot (a pretend clock for screenshots: window.__fx.down(), .run(ms), .state()).
// Cartoon only: the goo is creamy white or yellow, never red, no wounds.
import { faceGeometry, rng } from '../../pop/logic.js';
import { makeFaceTexture } from '../../pop/face.js';
import { drawPimple, drawMark, drawStrand, drawDrop, drawFinger, gooLook } from '../../pop/art.js';
import { createPopScene } from '../../pop/engine.js';
import { effectiveHold, START_TOOL } from '../../pop/tool-logic.js';
import { bumpInfo } from '../../data/bumps.js';
import { REGULARS } from '../../data/customers.js';
import { createSound } from '../../core/sound.js';

export const params = new URLSearchParams(location.search);
export const SHOT = params.has('shot');
export const fakeClock = SHOT ? installFakeClock() : null; // before anything asks for a frame

export const INK = '#3b2620'; // the dark cartoon outline colour
export let V = 'A'; // the variant shown (set in start)
let VARIANTS = {}; // id -> the variant module (see the README comment above start())
export let KIND = ['big', 'red', 'horn'].includes(params.get('kind')) ? 'big' : 'whitehead';
export let CALM = params.has('still');
try { CALM = CALM || Boolean(globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches); } catch { /* no setting: full motion */ }
export const who = REGULARS.find((c) => c.id === (params.get('who') ?? 'greta')) ?? REGULARS[0];

export const stage = document.getElementById('stage');
export const mine = document.getElementById('mine');
export const engCanvas = document.getElementById('engine');
export const hintEl = document.getElementById('hint');
export const labelEl = document.getElementById('label');
export const mctx = mine.getContext('2d');
export const sound = createSound({ sfxOn: !params.has('mute'), musicOn: false });

/**
 * Shot mode: a pretend clock. requestAnimationFrame and performance.now (used by this page and by the engine) follow
 * window.__fx.run(ms) instead of real time, so a screenshot always shows the same moment.
 * @returns {{run: (ms: number) => void}} the clock
 */
export function installFakeClock() {
  let vt = 1000;
  let nextId = 1;
  const queue = new Map();
  performance.now = () => vt;
  window.requestAnimationFrame = (cb) => { const id = nextId; nextId += 1; queue.set(id, cb); return id; };
  window.cancelAnimationFrame = (id) => { queue.delete(id); };
  return {
    /** Move the pretend time on by ms, one 16 ms frame at a time. @param {number} ms milliseconds @returns {void} */
    run(ms) {
      for (let done = 0; done < ms; done += 16) {
        vt += 16;
        const due = [...queue.values()];
        queue.clear();
        for (const cb of due) { try { cb(vt); } catch (e) { console.error(e); } }
      }
    },
  };
}

// ---------- small maths ----------

/** Smooth 0..1 ramp. @param {number} u input @returns {number} eased */
export const smooth = (u) => (u <= 0 ? 0 : u >= 1 ? 1 : u * u * (3 - 2 * u));
/** Keep a number between lo and hi. @param {number} v value @param {number} lo low @param {number} hi high @returns {number} clamped */
export const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
/** Ease out with a little overshoot (a cartoon "boing" into place). @param {number} u 0..1 @returns {number} eased */
export const backOut = (u) => { const c = 1.9; const x = clamp(u, 0, 1) - 1; return 1 + (c + 1) * x ** 3 + c * x ** 2; };
/** Real seconds (the pretend clock in shot mode). @returns {number} seconds */
export const nowSec = () => performance.now() / 1000;

// ---------- sound and buzz ----------

/** Play a sound from the game's sound table (silent before the first tap or with sound off). @param {string} name sound name @param {object} [o] options @returns {void} */
export function play(name, o) {
  try { sound.play(name, o); } catch { /* sound is optional */ }
}

/** Play a sound from the game's table a moment later. @param {number} sec delay in seconds @param {string} name sound name @returns {void} */
export function later(sec, name) {
  setTimeout(() => play(name), sec * 1000);
}

/** A short buzz on phones that can (not in shot mode). @param {number|number[]} pattern milliseconds @returns {void} */
export function buzz(pattern) {
  if (SHOT) return;
  try { navigator?.vibrate?.(pattern); } catch { /* not allowed here */ }
}

export let localOut = null; // this page's own gain into the game's audio context
export let noiseBuf = null; // one second of white noise for the page's own sounds

/** The audio context and this page's output, or null before the first tap, with sound off or in shot mode. @returns {{ac: AudioContext, out: GainNode}|null} audio */
export function audioOut() {
  if (SHOT || !sound.isOn()) return null;
  const ac = sound.context();
  if (!ac) return null;
  if (!localOut || localOut.context !== ac) {
    localOut = ac.createGain();
    localOut.gain.value = 0.55;
    localOut.connect(ac.destination);
    noiseBuf = ac.createBuffer(1, ac.sampleRate, ac.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i += 1) d[i] = Math.random() * 2 - 1;
  }
  return { ac, out: localOut };
}

/**
 * One soft note that slides from f0 to f1 and fades out.
 * @param {number} f0 start pitch in Hz
 * @param {number} f1 end pitch in Hz
 * @param {number} at seconds from now
 * @param {number} dur length in seconds
 * @param {number} vol loudness (0.4 is loud)
 * @param {OscillatorType} [type] wave
 * @returns {void}
 */
export function tone(f0, f1, at, dur, vol, type = 'sine') {
  const a = audioOut();
  if (!a) return;
  const t0 = a.ac.currentTime + 0.01 + at;
  const osc = a.ac.createOscillator();
  const g = a.ac.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(f0, t0);
  if (f1 !== f0) osc.frequency.exponentialRampToValueAtTime(f1, t0 + dur);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(vol, t0 + 0.008);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(g).connect(a.out);
  osc.start(t0);
  osc.stop(t0 + dur + 0.05);
}

/**
 * A soft filtered hiss (wet sounds), its filter sliding from f0 to f1.
 * @param {number} at seconds from now
 * @param {number} dur length
 * @param {{type?: BiquadFilterType, f0?: number, f1?: number, q?: number, vol?: number, attack?: number}} o filter and loudness
 * @returns {void}
 */
export function hiss(at, dur, o) {
  const a = audioOut();
  if (!a) return;
  const t0 = a.ac.currentTime + 0.01 + at;
  const src = a.ac.createBufferSource();
  src.buffer = noiseBuf;
  src.loop = true;
  const f = a.ac.createBiquadFilter();
  f.type = o.type ?? 'lowpass';
  f.frequency.setValueAtTime(o.f0 ?? 600, t0);
  if (o.f1) f.frequency.exponentialRampToValueAtTime(o.f1, t0 + dur);
  f.Q.value = o.q ?? 0.8;
  const g = a.ac.createGain();
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(o.vol ?? 0.1, t0 + (o.attack ?? 0.01));
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  src.connect(f).connect(g).connect(a.out);
  src.start(t0);
  src.stop(t0 + dur + 0.05);
}

/** A soft bell note (the party pop's chime): a sine with two quiet overtones. @param {number} f pitch @param {number} at seconds from now @param {number} vol loudness @returns {void} */
export function bell(f, at, vol) {
  tone(f, f, at, 0.9, vol);
  tone(f * 2, f * 2, at, 0.45, vol * 0.2);
  tone(f * 3.01, f * 3.01, at, 0.22, vol * 0.06);
}

// ---------- the scene ----------

export let W = 0; // stage size in CSS px
export let H = 0;
export let dpr = 1;
export let sc = 1; // goo size factor, as the engine's (smaller screens, smaller goo)
export let face = null; // the face geometry
export let tex = null; // the face picture
export let texHappy = null; // the same face, happier (E)
export let bp = null; // the bump
export let holdId = null; // the pointer holding the bump
export let T = 0; // scene seconds (slower in slow motion, stopped in the hit-stop)
export let realT = 0; // real seconds since the last reset
export let popReal = -1; // real seconds at the pop
export let lastFrame = 0;
export let fx = null; // the variant's own state and drawing
export let rand = rng(11);
export let squishSteps = [];
export let engine = null; // A: the real pop scene
export let aPopped = false;
export const strands = []; // goo worms, as in the engine
export const drops = []; // goo drops in the air
export const blobs = []; // goo drops that landed
export const marks = []; // the pink spot where the bump was

/** The bump on the cheek for this face and kind, with its hold time as in the game (bare fingers). @returns {object} the bump */
export function newBump() {
  const info = bumpInfo(KIND);
  const [r0, r1] = info.radius;
  const b = {
    id: 1, type: KIND, zone: 'cheek', axis: 0,
    x: face.cx + face.rx * 0.5, y: face.cy + face.ry * 0.3, r: ((r0 + r1) / 2) * face.unit,
    hold: effectiveHold(info.hold, START_TOOL, KIND, 0), goo: info.goo === 'cream' ? 'cream' : 'white',
    pressure: 0, popped: false, wob: 0, wobV: 0,
  };
  b.axis = fingerAxis(b);
  return b;
}

/** The squeeze direction that keeps both cartoon fingers on the screen best, chosen as the engine does. @param {object} p the bump @returns {number} angle in radians */
function fingerAxis(p) {
  let best = p.axis;
  let bestRoom = -Infinity;
  for (const a of [p.axis, 0, Math.PI / 4, Math.PI / 2, (3 * Math.PI) / 4]) {
    let room = Infinity;
    for (const side of [-1, 1]) {
      const fx0 = p.x + Math.cos(a) * side * p.r * 3;
      const fy0 = p.y + Math.sin(a) * side * p.r * 3;
      room = Math.min(room, fx0, fy0, W - fx0, H - fy0);
    }
    if (room > bestRoom + 4) { best = a; bestRoom = room; }
  }
  return best;
}

/** Measure the stage, paint the face and start over (on start, a turn of the phone, or a new variant or kind). @returns {void} */
export function layout() {
  const box = stage.getBoundingClientRect();
  W = Math.max(200, Math.round(box.width));
  H = Math.max(200, Math.round(box.height));
  dpr = Math.min(2, globalThis.devicePixelRatio || 1);
  sc = Math.max(0.6, Math.min(1.6, Math.min(W, H) / 260));
  face = faceGeometry(W, H, who.face);
  const tdpr = V === 'C' ? Math.min(4, dpr * 2) : dpr; // the close-up needs a sharper picture
  tex = makeFaceTexture(W, H, tdpr, face, who.face, { mood: 'grim', redness: 0.7, seed: 5 });
  texHappy = V === 'E' ? makeFaceTexture(W, H, tdpr, face, who.face, { mood: 'relief', redness: 0.25, seed: 5 }) : null;
  mine.width = Math.round(W * dpr);
  mine.height = Math.round(H * dpr);
  reset();
}

/** Put a fresh bump back and clear the goo (Replay, a new press after a pop). @returns {void} */
export function reset() {
  rand = rng(KIND === 'big' ? 23 : 11);
  bp = newBump();
  holdId = null;
  T = 0;
  realT = 0;
  popReal = -1;
  strands.length = 0;
  drops.length = 0;
  blobs.length = 0;
  marks.length = 0;
  squishSteps = [0.3, 0.55, 0.74, 0.9];
  fx?.stop?.();
  fx = VARIANTS[V].make();
  mine.hidden = Boolean(fx.engine);
  engCanvas.hidden = !fx.engine;
  if (fx.engine) buildEngine();
  else if (engine) { engine.dispose(); engine = null; }
  hint('Press and hold the bump');
  showChoice();
}

/** A: the game's own pop scene with this one bump (a second bump far off screen keeps it from moving on to the wipe). @returns {void} */
export function buildEngine() {
  engine?.dispose();
  aPopped = false;
  const etex = makeFaceTexture(W, H, dpr, face, who.face, { mood: 'grim', redness: 0.7, seed: 5 });
  engine = createPopScene(engCanvas, {
    width: W, height: H, dpr, texture: etex, reduced: CALM, sound, buzz, zoom: false,
    pimples: [{ ...newBump() }, { id: 2, type: 'whitehead', zone: 'cheek', axis: 0, x: -5000, y: -5000, r: 6 }],
    face: { cx: face.cx, cy: face.cy, rx: face.rx, ry: face.ry },
    random: () => 0.999, // never a rough-press "Ow" on this page
    onPop: () => { aPopped = true; hint('Press again or tap Replay'); },
  });
}

/** Show a line of help at the bottom. @param {string} text the help @returns {void} */
export function hint(text) {
  hintEl.textContent = text;
  hintEl.hidden = !text;
}

/** The hold look of the bump now: how swollen (amt), how hard the skin is pushed (warp), and a tremble (jx, jy). @returns {{amt: number, warp: number, jx: number, jy: number}} look */
export function holdLook() {
  return fx.look?.() ?? { amt: bp.pressure, warp: bp.pressure, jx: 0, jy: 0 };
}

/** The pop itself: the bump is gone, a pink mark stays, the skin jiggles, and the variant does its show. @returns {void} */
export function doPop() {
  bp.popped = true;
  popReal = realT;
  marks.push({ x: bp.x, y: bp.y, r: bp.r * 1.1 });
  if (!CALM) { bp.wob = 0.55; bp.wobV = 0; }
  fx.pop();
  hint('Press again or tap Replay');
}

/**
 * Squirt goo out of the bump like the game does (worms and drops), with knobs for a bigger show.
 * @param {object} p the bump
 * @param {{strands?: number, reach?: number, width?: number, drops?: number, speed?: number, size?: number, lift?: number, ang?: number, spread?: number}} [o] knobs (1 = the game)
 * @returns {void}
 */
export function squirt(p, o = {}) {
  const look = gooLook(p.goo);
  const big = p.type === 'big';
  const count = o.strands ?? (big ? 2 : 1);
  for (let i = 0; i < count; i += 1) {
    const ang = o.ang !== undefined ? o.ang + (rand() - 0.5) * (o.spread ?? 0.8) + (i % 2 ? 0.9 : -0.2) * (i ? 1 : 0) : -Math.PI / 2 + (rand() - 0.5) * 2.6;
    const max = p.r * look.reach * (big ? 2.6 + rand() * 1.8 : 2 + rand() * 1.4) * (o.reach ?? 1);
    strands.push({
      x: p.x, y: p.y, ang, curl: ((rand() - 0.5) * 0.05) / sc, sag: (0.006 + rand() * 0.008) * look.sag, len: 0, max,
      speed: (max / (big ? 0.55 : 0.35)) * look.speed, w: p.r * (big ? 0.3 : 0.42) * look.width * (o.width ?? 1), goo: p.goo, pts: [],
    });
  }
  const n = o.drops ?? bumpInfo(p.type)?.drops ?? 4;
  for (let i = 0; i < n; i += 1) {
    const a = rand() * Math.PI * 2;
    const v = (30 + rand() * 110) * sc * look.speed * (o.speed ?? 1);
    drops.push({
      x: p.x, y: p.y, z: 0.1, vx: Math.cos(a) * v, vy: Math.sin(a) * v, vz: ((120 + rand() * 160) / Math.sqrt(look.width)) * (o.lift ?? 1),
      r: (1.2 + rand() * (big ? 3 : 2)) * sc * Math.sqrt(look.width) * (o.size ?? 1), goo: p.goo,
    });
  }
}

/** Move the goo on (worms grow, drops fly and land, landed drops settle), as the engine does. @param {number} dt scene seconds @returns {void} */
export function stepGoo(dt) {
  for (const s of strands) {
    if (s.len >= s.max) continue;
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
    d.x += d.vx * dt;
    d.y += d.vy * dt;
    d.vz -= 700 * dt;
    d.z += d.vz * dt;
    if (d.z <= 0) {
      drops.splice(i, 1);
      blobs.push({ x: d.x, y: d.y, r: d.r, goo: d.goo, age: CALM ? 1 : 0, sa: Math.atan2(d.vy, d.vx) });
    }
  }
  for (const b of blobs) if (b.age < 0.4) b.age += dt;
}

/** One step of everything: the hold, the pop, the jiggle, the goo and the variant. @param {number} dt real seconds @returns {void} */
export function step(dt) {
  realT += dt;
  const sdt = dt * (fx.rate?.() ?? 1);
  T += sdt;
  if (!bp.popped) {
    if (holdId !== null) {
      bp.pressure = Math.min(1, bp.pressure + dt / bp.hold);
      while (squishSteps.length && bp.pressure >= squishSteps[0]) { play('squish', { level: squishSteps.shift() }); buzz(6); }
      if (bp.pressure >= 1) doPop();
    } else bp.pressure = Math.max(0, bp.pressure - dt * 0.5);
  }
  if (bp.wob || bp.wobV) {
    bp.wobV += (-190 * bp.wob - 9 * bp.wobV) * sdt;
    bp.wob += bp.wobV * sdt;
    if (Math.abs(bp.wob) < 0.008 && Math.abs(bp.wobV) < 0.05) { bp.wob = 0; bp.wobV = 0; }
  }
  stepGoo(sdt);
  fx.step?.(sdt, dt);
}

/** One animation frame of this page's own scene (A draws itself). @param {number} ms time stamp @returns {void} */
export function frame(ms) {
  requestAnimationFrame(frame);
  const now = ms / 1000;
  const dt = Math.min(0.05, Math.max(0, now - lastFrame));
  lastFrame = now;
  if (!bp || fx.engine) return;
  step(dt);
  render();
}

// ---------- drawing ----------

/**
 * The affine map that takes three source points to three destination points (copied from the engine).
 * @param {number[]} s source x0,y0,x1,y1,x2,y2
 * @param {number[]} d destination x0,y0,x1,y1,x2,y2
 * @returns {number[]|null} [a, b, c, d, e, f], or null when the triangle is flat
 */
export function affine(s, d) {
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
 * How far a point of skin moves while the bump is squeezed: pushed in by the two fingers, bulging at the middle (as in the engine).
 * @param {object} p the bump
 * @param {number} a squeeze amount
 * @param {number} x skin x
 * @param {number} y skin y
 * @returns {number[]} [dx, dy]
 */
export function displace(p, a, x, y) {
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
    const fx0 = p.x + ax * side * reach;
    const fy0 = p.y + ay * side * reach;
    const k = -side * p.r * a * Math.exp(-((Math.hypot(x - fx0, y - fy0) / (p.r * 1.1)) ** 2));
    dx += ax * k;
    dy += ay * k;
  }
  return [dx * fall, dy * fall];
}

/**
 * The skin round the squeezed bump stretched by the fingers (a small triangle mesh of the face picture), with the
 * folds, finger dents and shine, as in the engine.
 * @param {CanvasRenderingContext2D} c the context (scene px)
 * @param {HTMLCanvasElement} picture the face picture
 * @param {object} p the bump
 * @param {number} a squeeze amount
 * @param {boolean} fingers draw the folds and dents (not in the jiggle after the pop)
 * @returns {void}
 */
export function drawWarp(c, picture, p, a, fingers) {
  const ts = picture.width / W; // picture pixels per scene px
  const R = p.r * 4.4;
  const n = 8;
  const cell = (R * 2) / n;
  const pts = [];
  for (let j = 0; j <= n; j += 1) {
    for (let i = 0; i <= n; i += 1) {
      const sx = p.x - R + i * cell;
      const sy = p.y - R + j * cell;
      const [dx, dy] = displace(p, a, sx, sy);
      pts.push([sx, sy, sx + dx, sy + dy]);
    }
  }
  /** Copy one triangle of skin from where it was to where it is pushed. @param {number[]} A vertex @param {number[]} B vertex @param {number[]} C vertex @returns {void} */
  const tri = (A, B, C) => {
    const m = affine([A[0] * ts, A[1] * ts, B[0] * ts, B[1] * ts, C[0] * ts, C[1] * ts], [A[2], A[3], B[2], B[3], C[2], C[3]]);
    if (!m) return;
    const cx = (A[2] + B[2] + C[2]) / 3;
    const cy = (A[3] + B[3] + C[3]) / 3;
    c.save();
    c.beginPath();
    for (const [k, Q] of [A, B, C].entries()) {
      const ex = Q[2] + Math.sign(Q[2] - cx) * 0.6;
      const ey = Q[3] + Math.sign(Q[3] - cy) * 0.6;
      if (k === 0) c.moveTo(ex, ey); else c.lineTo(ex, ey);
    }
    c.closePath();
    c.clip();
    c.transform(m[0], m[1], m[2], m[3], m[4], m[5]);
    const sx = Math.max(0, Math.floor(Math.min(A[0], B[0], C[0]) * ts) - 2);
    const sy = Math.max(0, Math.floor(Math.min(A[1], B[1], C[1]) * ts) - 2);
    const ex = Math.min(picture.width, Math.ceil(Math.max(A[0], B[0], C[0]) * ts) + 2);
    const ey = Math.min(picture.height, Math.ceil(Math.max(A[1], B[1], C[1]) * ts) + 2);
    if (ex > sx && ey > sy) c.drawImage(picture, sx, sy, ex - sx, ey - sy, sx, sy, ex - sx, ey - sy);
    c.restore();
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
  const k = Math.min(1, a);
  const reach = p.r * 1.9 * (1 - 0.2 * a);
  for (const side of [-1, 1]) {
    const base = p.axis + (side < 0 ? Math.PI : 0);
    c.lineCap = 'round';
    c.strokeStyle = `rgba(130,55,40,${0.32 * k})`;
    c.lineWidth = 1.6;
    c.beginPath(); c.arc(p.x, p.y, p.r * (1.3 + 0.2 * k), base - 0.7, base + 0.7); c.stroke();
    c.strokeStyle = `rgba(255,232,218,${0.45 * k})`;
    c.lineWidth = 1.4;
    c.beginPath(); c.arc(p.x, p.y, p.r * (1.42 + 0.2 * k), base - 0.6, base + 0.6); c.stroke();
    const fx0 = p.x + Math.cos(p.axis) * side * reach;
    const fy0 = p.y + Math.sin(p.axis) * side * reach;
    const g = c.createRadialGradient(fx0, fy0, 0, fx0, fy0, p.r * 1.5);
    g.addColorStop(0, `rgba(120,50,36,${0.3 * k})`);
    g.addColorStop(1, 'rgba(120,50,36,0)');
    c.fillStyle = g;
    c.beginPath(); c.arc(fx0, fy0, p.r * 1.5, 0, Math.PI * 2); c.fill();
  }
  const shine = c.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 2.2);
  shine.addColorStop(0, `rgba(255,236,228,${0.22 * k})`);
  shine.addColorStop(1, 'rgba(255,236,228,0)');
  c.fillStyle = shine;
  c.beginPath(); c.arc(p.x, p.y, p.r * 2.2, 0, Math.PI * 2); c.fill();
}

/** The two cartoon fingertips squeezing from both sides, as in the game. @param {CanvasRenderingContext2D} c context @param {object} p the bump @param {number} a squeeze amount @returns {void} */
export function drawFingertips(c, p, a) {
  if (a <= 0.04) return;
  const reach = p.r * 1.9 * (1 - 0.2 * a);
  for (const side of [-1, 1]) {
    const x = p.x + Math.cos(p.axis) * side * (reach + p.r * 0.1);
    const y = p.y + Math.sin(p.axis) * side * (reach + p.r * 0.1);
    drawFinger(c, x, y, p.axis + (side < 0 ? Math.PI : 0), Math.max(18, p.r * 1.7), Math.min(1, a * 3), false);
  }
}

/** Draw the face with the bump, the goo and the variant's extras (scene px; the close-up draws it again, zoomed). @param {CanvasRenderingContext2D} c the context @returns {void} */
export function drawWorld(c) {
  const picture = fx.texture?.() ?? tex;
  c.drawImage(picture, 0, 0, W, H);
  const lk = holdLook();
  const p = { ...bp, x: bp.x + lk.jx, y: bp.y + lk.jy };
  const shake = !CALM && !bp.popped && bp.pressure > 0.8 ? Math.sin(realT * 70) * 0.03 : 0;
  const a = (bp.popped ? 0 : lk.warp) + bp.wob;
  if (Math.abs(a) > 0.01) drawWarp(c, picture, p, a + shake, !bp.popped);
  if (!CALM) picture.faceLife?.draw(c, nowSec());
  for (const m of marks) drawMark(c, m, 1);
  if (!bp.popped) drawPimple(c, p, lk.amt, 1, T);
  fx.afterBump?.(c, p, lk);
  for (const s of strands) drawStrand(c, s);
  for (const b of blobs) drawDrop(c, b);
  fx.mid?.(c, p);
  if (!bp.popped) drawFingertips(c, p, a + shake); // only while held: after the pop the skin's jiggle (wob) must not bring the fingers back for a flash (B114)
  for (const d of drops) drawDrop(c, d);
  fx.over?.(c, p);
}

let hidden = null; // a hidden canvas the world is drawn on first while a variant asks (offscreen hook, the ripple)

/** The hidden world canvas, the size of the stage (made once, remade on a new size). @returns {{canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D}} it */
function hiddenWorld() {
  if (!hidden) hidden = { canvas: document.createElement('canvas'), ctx: null };
  if (hidden.canvas.width !== mine.width || hidden.canvas.height !== mine.height || !hidden.ctx) {
    hidden.canvas.width = mine.width;
    hidden.canvas.height = mine.height;
    hidden.ctx = hidden.canvas.getContext('2d');
  }
  return hidden;
}

/**
 * Draw one frame: the camera (shake, squash), the world, then whatever sits on the "glass". While the variant's
 * offscreen() says so, the world is drawn on a hidden canvas first and then copied to the shown one in one go, and the
 * screen hook gets that hidden canvas to sample (so the ripple never reads the shown canvas half way through a frame,
 * which on some phones could flash a half-drawn picture, B114).
 * @returns {void}
 */
export function render() {
  const off = fx.offscreen?.() ? hiddenWorld() : null;
  const c = off ? off.ctx : mctx;
  c.setTransform(1, 0, 0, 1, 0, 0);
  c.fillStyle = '#bcdcd6';
  c.fillRect(0, 0, mine.width, mine.height);
  c.setTransform(dpr, 0, 0, dpr, 0, 0);
  c.save();
  const cam = fx.cam?.();
  if (cam) {
    const ax = cam.ax ?? W / 2;
    const ay = cam.ay ?? H / 2;
    c.translate(ax + (cam.dx ?? 0), ay + (cam.dy ?? 0));
    if (cam.rot) c.rotate(cam.rot);
    c.scale(cam.sx ?? 1, cam.sy ?? 1);
    c.translate(-ax, -ay);
  }
  drawWorld(c);
  c.restore();
  if (off) { // the finished world onto the shown canvas in one copy
    mctx.setTransform(1, 0, 0, 1, 0, 0);
    mctx.globalCompositeOperation = 'copy';
    mctx.drawImage(off.canvas, 0, 0);
    mctx.globalCompositeOperation = 'source-over';
    mctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  fx.screen?.(mctx, off?.canvas ?? null);
}

/** A five-point star path round (0, 0). @param {CanvasRenderingContext2D} c context @param {number} s size @returns {void} */
export function starPath(c, s) {
  c.beginPath();
  for (let i = 0; i < 10; i += 1) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const rr = i % 2 ? s * 0.45 : s;
    if (i) c.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); else c.moveTo(Math.cos(a) * rr, Math.sin(a) * rr);
  }
  c.closePath();
}

/** A heart path round (0, 0), point down. @param {CanvasRenderingContext2D} c context @param {number} s size @returns {void} */
export function heartPath(c, s) {
  c.beginPath();
  c.moveTo(0, s * 0.85);
  c.bezierCurveTo(-s * 1.35, -s * 0.05, -s * 0.65, -s * 1.05, 0, -s * 0.38);
  c.bezierCurveTo(s * 0.65, -s * 1.05, s * 1.35, -s * 0.05, 0, s * 0.85);
  c.closePath();
}

/** A four-point sparkle path round (0, 0). @param {CanvasRenderingContext2D} c context @param {number} s size @returns {void} */
export function sparklePath(c, s) {
  c.beginPath();
  c.moveTo(0, -s);
  c.quadraticCurveTo(s * 0.14, -s * 0.14, s, 0);
  c.quadraticCurveTo(s * 0.14, s * 0.14, 0, s);
  c.quadraticCurveTo(-s * 0.14, s * 0.14, -s, 0);
  c.quadraticCurveTo(-s * 0.14, -s * 0.14, 0, -s);
  c.closePath();
}

/** A white ring that spreads out from the bump at the pop. @param {CanvasRenderingContext2D} c context @param {object} p the bump @param {number} t seconds since the pop @param {number} life seconds it lasts @param {number} spread how far, in bump radii @returns {void} */
export function drawRing(c, p, t, life, spread) {
  if (t < 0 || t > life) return;
  const u = t / life;
  c.save();
  c.globalAlpha = (1 - u) * 0.9;
  c.strokeStyle = '#fffdf2';
  c.lineWidth = Math.max(1.5, 4 * sc * (1 - u));
  c.beginPath(); c.arc(p.x, p.y, p.r * (1.1 + spread * smooth(u)), 0, Math.PI * 2); c.stroke();
  c.restore();
}

// ---------- input and the bar ----------

/** A pointer event in scene px on this page's canvas. @param {PointerEvent} e event @returns {{x: number, y: number}} point */
export function scenePt(e) {
  const r = mine.getBoundingClientRect();
  return { x: ((e.clientX - r.left) * W) / (r.width || W), y: ((e.clientY - r.top) * H) / (r.height || H) };
}

/** A press on this page's canvas: after a pop it starts over; on the bump it starts squeezing. @param {PointerEvent} e event @returns {void} */
export function onDown(e) {
  if (e.button > 0) return;
  e.preventDefault();
  if (bp.popped) reset();
  const pt = scenePt(e);
  if (Math.hypot(pt.x - bp.x, pt.y - bp.y) > Math.max(46, bp.r * 2.4)) return;
  holdId = e.pointerId;
  try { mine.setPointerCapture(e.pointerId); } catch { /* fine without */ }
  play('squish', { level: 0.1 });
  hint('');
}

/** The finger or mouse let go. @param {PointerEvent} e event @returns {void} */
export function onUp(e) {
  if (e.pointerId !== holdId) return;
  holdId = null;
  if (!bp.popped) hint('Keep holding until it pops');
}

/** Mark the chosen variant and kind on the bar, the label and the address. @returns {void} */
export function showChoice() {
  for (const b of document.querySelectorAll('[data-v]')) b.setAttribute('aria-pressed', String(b.dataset.v === V));
  document.getElementById('kind').textContent = KIND === 'big' ? 'Big bump' : 'Whitehead';
  document.getElementById('snd').textContent = sound.isOn() ? 'Sound on' : 'Sound off';
  labelEl.textContent = `${V}. ${VARIANTS[V].name}${CALM ? ' (calm)' : ''}`;
  const q = new URLSearchParams(location.search);
  q.set('v', V);
  q.set('kind', KIND);
  try { history.replaceState(null, '', `?${q}`); } catch { /* not allowed: fine */ }
}

// README for variant authors. A variant is a module in popfx/ with
//   export default { id: 'B', name: 'Squish and burst', make: makeB };
// make() is called on every reset (Replay, a new press after the pop, a new variant, kind or screen size) and
// returns an object of hooks. Only pop() is needed; leave out any other hook:
//   pop()                    the bump just popped (bp.popped is already true, a pink mark is down). Start the show,
//                            play sounds (play with a name from the game's sound table, or tone/hiss/bell here) and buzz(pattern).
//   look()                   -> {amt, warp, jx, jy}: while held, how swollen the bump is drawn (drawPimple amt; 1 = the
//                            game at full pressure), how hard the skin is pushed (warp), and a tremble offset in px.
//   step(sdt, dt)            each frame: sdt = scene seconds (slow in slow motion), dt = real seconds.
//   afterBump(c, p, lk)      draw over the bump (also called after the pop: then draw your own leftovers).
//   mid(c, p)                draw after the landed goo, under the cartoon fingertips.
//   over(c, p)               draw over everything in the scene (scene px, moves with the camera).
//   screen(c, world)         draw on the "glass" (screen px, after the camera; the close-up bubble, lens goo); world
//                            is the hidden canvas the frame was drawn on while offscreen() is true, else null.
//   offscreen()              -> true while the variant wants the frame drawn on a hidden canvas first (the ripple).
//   cam()                    -> {dx, dy, rot, sx, sy, ax, ay} or null: shake (dx, dy, rot) and squash (sx, sy round
//                            the point ax, ay) of the whole scene.
//   rate()                   -> the time rate (1 = normal, 0.2 = slow motion); applies to sdt and the goo.
//   texture()                -> the face picture to show (tex, or texHappy which E asks for in layout()).
//   stop()                   a reset is coming: stop running sounds.
//   engine: true             (A only) the page shows the real game engine instead of this page's drawing.
// What a variant can read (live, from this file): bp (the bump {x, y, r, type, goo, pressure, popped, wob}), T and
// realT (scene and real seconds since the reset), popReal (real seconds at the pop, -1 before), holdId (null = not
// held), W, H, sc (goo size factor), face (geometry), tex, texHappy, KIND ('whitehead' | 'big'), CALM (the calm
// version: no shake, no squash, no wobble), rand() (seeded random, the same every reset). Goo: squirt(bp, knobs) the
// game's worms and drops, drops/strands/blobs arrays. Drawing: drawWorld(c) (the whole scene again, e.g. zoomed),
// drawRing, starPath, heartPath, sparklePath, INK (outline colour), smooth, clamp, backOut. The art itself comes from
// pop/art.js (drawPimple, drawDrop, drawStrand, drawSplat, gooLook...). Add a new variant to pop-fx-test.js's list and
// to the PRECACHE list in src/sw.js.

/** Build the bar's buttons and hook up the presses, the turn of the phone and the shot hooks. @param {object[]} list the variant modules @returns {void} */
export function start(list) {
  VARIANTS = Object.fromEntries(list.map((m) => [m.id, m]));
  const asked = (params.get('v') ?? '').toUpperCase();
  V = VARIANTS[asked] ? asked : 'A';
  const vars = document.getElementById('vars');
  for (const k of Object.keys(VARIANTS)) {
    const b = document.createElement('button');
    b.type = 'button';
    b.dataset.v = k;
    b.textContent = k;
    b.title = VARIANTS[k].name;
    b.addEventListener('click', () => { V = k; layout(); });
    vars.append(b);
  }
  document.getElementById('kind').addEventListener('click', () => { KIND = KIND === 'big' ? 'whitehead' : 'big'; layout(); });
  document.getElementById('snd').addEventListener('click', () => { sound.setOn(!sound.isOn()); if (sound.isOn()) sound.unlock(); showChoice(); });
  document.getElementById('replay').addEventListener('click', () => reset());
  document.addEventListener('pointerdown', () => sound.unlock(), true); // the first tap wakes the audio
  // A: a press after the pop starts a fresh game scene first (its own press then lands on the new scene).
  stage.addEventListener('pointerdown', () => { if (fx.engine && aPopped) buildEngine(); }, true);
  mine.addEventListener('pointerdown', onDown);
  mine.addEventListener('pointerup', onUp);
  mine.addEventListener('pointercancel', onUp);
  mine.addEventListener('contextmenu', (e) => e.preventDefault());
  engCanvas.addEventListener('contextmenu', (e) => e.preventDefault());
  let timer = 0;
  window.addEventListener('resize', () => { clearTimeout(timer); timer = setTimeout(layout, 150); });
  layout();
  requestAnimationFrame(frame);
  window.__fx = {
    /** Where the bump is on the screen (CSS px). @returns {{x: number, y: number}} point */
    target() {
      const r = (fx.engine ? engCanvas : mine).getBoundingClientRect();
      return { x: r.left + (bp.x * r.width) / W, y: r.top + (bp.y * r.height) / H };
    },
    /** Press on the bump (a mouse press, so the engine does not wait for a second finger). @returns {void} */
    down() {
      const p = window.__fx.target();
      const init = { bubbles: true, cancelable: true, clientX: p.x, clientY: p.y, pointerId: 5, pointerType: 'mouse', isPrimary: true, button: 0, buttons: 1 };
      (fx.engine ? engCanvas : mine).dispatchEvent(new PointerEvent('pointerdown', init));
    },
    /** Let go. @returns {void} */
    up() {
      const p = window.__fx.target();
      (fx.engine ? engCanvas : mine).dispatchEvent(new PointerEvent('pointerup', { bubbles: true, clientX: p.x, clientY: p.y, pointerId: 5, pointerType: 'mouse', isPrimary: true }));
    },
    /** Move the pretend clock on (shot mode only). @param {number} ms milliseconds @returns {void} */
    run(ms) { fakeClock?.run(ms); },
    /** What is going on now. @returns {object} state */
    state: () => ({ v: V, kind: KIND, popped: fx.engine ? aPopped : bp.popped, pressure: bp.pressure, hold: bp.hold }),
    ready: true,
  };
}

