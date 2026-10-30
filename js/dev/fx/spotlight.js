// Effect 5 for the light test page (fx-test.html): the spotlight for a boss entrance. A cartoon stage spotlight hangs
// just above the top edge. Idle: the room is a little dimmed and the spotlight shines a soft cone down onto the face,
// a bright pool round the head, fine dust specks drifting in the cone and a faint floor mist. Fire: the room lights
// go down to near dark, a moment of black, then the spotlight CLUNKS on (a flicker, a flash at the lens, the cone
// swings a little and settles), a puff of floor mist rolls in, it holds, and the room lights come back up. With smoke
// on (shared.haze) the cone lights up the smoke as a shaft and the smoke stands in for the floor mist.
// Party mood: a deeper violet dark and a pinker light. Still: no flicker or swing, slow fades. Lite: fewer specks.
// The darkness is drawn small into a low-res buffer with soft holes cut for the cone and the pool (cheap).
// See the README in core.js for the effect interface.
import { rng } from '../../pop/logic.js';
import { clamp, smooth, lerp, TAU, rgba } from './sprites.js';

const INK = '#2a211d';
const APEX = 0.07; // the cone's half width at the lens, as a share of its far half width
// The trigger's timeline in seconds: dim, dark, clunk, hold, lights up.
const T_DIM = 0.7;
const T_ON = 1.1;
const T_HOLD = 4.0;
const T_UP = 5.1;
const T_END = 6.2;

/**
 * Paint the cone sprite: a long soft wedge, narrow at the top (the lens) and wide at the bottom, flat and bright
 * inside with soft edges, fading a little with distance. Drawn pixel by pixel once (apex at the top middle).
 * @param {CanvasRenderingContext2D} c the sprite's context
 * @param {number} w width
 * @param {number} h height (the cone's length)
 * @returns {void}
 */
function paintCone(c, w, h) {
  const img = c.createImageData(w, h);
  for (let y = 0; y < h; y += 1) {
    const u = y / h;
    const hw = APEX + (1 - APEX) * u;
    const along = smooth(Math.min(1, u * 10)) * (1 - 0.5 * u) + (1 - smooth(u * 3)) * 0.35; // brighter near the lens
    for (let x = 0; x < w; x += 1) {
      const v = Math.abs((x + 0.5 - w / 2) / (w / 2));
      const across = 1 - v / hw;
      if (across <= 0) continue;
      const prof = smooth(Math.min(1, across * 2.4)) * (0.8 + 0.2 * across);
      const p = (y * w + x) * 4;
      img.data[p] = 255; img.data[p + 1] = 255; img.data[p + 2] = 255;
      img.data[p + 3] = Math.round(clamp(prof * along, 0, 1) * 255);
    }
  }
  c.putImageData(img, 0, 0);
}

/**
 * Paint a soft round pool (white, see-through at the edge), drawn squashed into the light pool round the head.
 * @param {CanvasRenderingContext2D} c the sprite's context
 * @param {number} w size
 * @param {string} rgb colour "r,g,b"
 * @returns {void}
 */
function paintPool(c, w, rgb) {
  const g = c.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2);
  g.addColorStop(0, rgba(rgb, 1));
  g.addColorStop(0.55, rgba(rgb, 0.92));
  g.addColorStop(0.8, rgba(rgb, 0.4));
  g.addColorStop(1, rgba(rgb, 0));
  c.fillStyle = g;
  c.fillRect(0, 0, w, w);
}

/**
 * Paint a floor mist strip (white, see-through) that tiles left to right: soft lumps, thicker low down.
 * @param {CanvasRenderingContext2D} c the sprite's context
 * @param {number} w width
 * @param {number} h height
 * @returns {void}
 */
function paintMist(c, w, h) {
  const rand = rng(515);
  for (let k = 0; k < 16; k += 1) {
    const x = rand() * w;
    const y = h * (0.55 + rand() * 0.35);
    const r = h * (0.28 + rand() * 0.3);
    for (const dx of [-w, 0, w]) { // three times, so the strip joins up when tiled
      const g = c.createRadialGradient(x + dx, y, 0, x + dx, y, r);
      g.addColorStop(0, 'rgba(255,255,255,0.55)');
      g.addColorStop(0.6, 'rgba(255,255,255,0.2)');
      g.addColorStop(1, 'rgba(255,255,255,0)');
      c.fillStyle = g;
      c.fillRect(x + dx - r, y - r, r * 2, r * 2);
    }
  }
  c.globalCompositeOperation = 'destination-in'; // fade out upwards
  const g = c.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, 'rgba(0,0,0,0)');
  g.addColorStop(0.45, 'rgba(0,0,0,0.8)');
  g.addColorStop(1, 'rgba(0,0,0,1)');
  c.fillStyle = g;
  c.fillRect(0, 0, w, h);
  c.globalCompositeOperation = 'source-over';
}

/**
 * Make the spotlight for this scene.
 * @param {object} env the page's env (see core.js README)
 * @returns {object} hooks
 */
function make(env) {
  const { W, H, sc, party, still, room } = env;
  const f = env.face ?? { cx: W / 2, cy: H * 0.5, rx: Math.min(W, H) * 0.3, ry: Math.min(W, H) * 0.36 };
  const darkRgb = party ? '10,3,26' : '16,11,32';
  const lightRgb = party ? '250,228,255' : '255,244,216';
  const idleDark = party ? 0.5 : [0.42, 0.38, 0.36][env.tier] ?? 0.38; // how dim the room is when not triggered
  const idleLight = 0.72;
  // Where it hangs: up and to the left of the head, the lens just inside the top edge, aimed at the face.
  const sx = f.cx - (room.land ? W * 0.13 : W * 0.17);
  const sy = room.land ? H * 0.05 : H * 0.035;
  const tx = f.cx;
  const ty = f.cy - f.ry * 0.12;
  const dist = Math.hypot(tx - sx, ty - sy);
  const reach = Math.hypot(W, H) * 1.1; // the cone's length: past the bottom edge
  const halfAtFace = f.rx * 1.3;
  const farHalf = halfAtFace / (APEX + (1 - APEX) * (dist / reach));
  const aim = Math.atan2(ty - sy, tx - sx) - Math.PI / 2; // the turn that points the sprite's +y at the face
  const canW = clamp(15 * sc, 11, 24); // the lamp can's half width
  const dScale = env.lite ? 0.2 : 0.25; // the darkness buffer's pixels per CSS px
  const cone = env.sprite('spot-cone', 128, 256, (c, w, h) => paintCone(c, w, h), 1);
  const hole = env.sprite('spot-pool:255,255,255', 128, 128, (c, w) => paintPool(c, w, '255,255,255'), 1);
  const pool = env.sprite(`spot-pool:${lightRgb}`, 128, 128, (c, w) => paintPool(c, w, lightRgb), 1);
  const flare = env.glow(lightRgb);
  const speck = env.dot('255,250,232', 0.3);
  const mist = env.sprite('spot-mist', 512, 128, (c, w, h) => paintMist(c, w, h), 1);
  const specks = [];
  for (let i = 0, n = env.count(46); i < n; i += 1) {
    specks.push({
      u: 0.06 + env.rand() * 0.55, v: env.rand() * 2 - 1, // along the cone (share of its length) and across it
      vu: (env.rand() - 0.6) * 0.006, vv: (env.rand() - 0.5) * 0.05,
      size: (1 + env.rand() * 2.2) * sc, ph: env.rand() * TAU, tw: 1.5 + env.rand() * 2.5,
    });
  }
  let tt = -1; // seconds since Fire (-1: not fired)
  let fired = 0;

  /** The scene clock for drifting things (frozen when still). @returns {number} seconds */
  const clock = () => (still ? 2 : env.t);

  /**
   * How things are now: the room's darkness, the spotlight's strength, its swing, the pool's size and the mist.
   * @returns {{dark: number, light: number, swing: number, grow: number, mist: number, flash: number}} levels
   */
  function levels() {
    const idle = { dark: idleDark, light: idleLight, swing: 0, grow: 1, mist: 0.3, flash: 0 };
    if (tt < 0 || tt > T_END) return idle;
    const slow = still ? 1.6 : 1; // still: slower, softer fades
    let dark = 0.92;
    let light = 0;
    let swing = 0;
    let grow = 1;
    let flash = 0;
    if (tt < T_DIM * slow) dark = lerp(idleDark, 0.92, smooth(tt / (T_DIM * slow)));
    else if (tt > T_HOLD) dark = lerp(0.92, idleDark, smooth((tt - T_HOLD) / (T_UP - T_HOLD)));
    if (tt < T_DIM) light = idleLight * (1 - smooth(tt / 0.4)); // the spotlight goes out with the room
    else if (tt >= T_ON) {
      const k = tt - T_ON;
      if (still) light = smooth(k / 0.6);
      else if (k < 0.05) light = 1.3; // clunk: on, a flicker, on
      else if (k < 0.11) light = 0.2;
      else if (k < 0.16) light = 1.15;
      else light = 1 + 0.12 * Math.exp(-k * 3);
      if (tt > T_HOLD) light = lerp(light, idleLight, smooth((tt - T_HOLD) / (T_END - T_HOLD)));
      if (!still) {
        swing = 0.055 * Math.exp(-k * 2.4) * Math.sin(k * 8.5 + 0.6); // it swings a little on its bracket and settles
        grow = 1 + 0.1 * Math.exp(-k * 3.5);
        flash = Math.exp(-k * 7);
      }
    }
    const mistUp = tt < T_ON ? 0 : smooth((tt - T_ON) / 0.9) * (1 - smooth((tt - T_HOLD) / (T_END - T_HOLD)));
    return { dark, light, swing, grow, mist: 0.3 + 0.5 * mistUp, flash };
  }

  /** Draw the cone sprite from the lens, turned by the swing. @param {CanvasRenderingContext2D} c context @param {number} alpha strength @param {number} swing extra turn in radians @param {number} [widen] wider than normal @returns {void} */
  function drawCone(c, alpha, swing, widen = 1) {
    if (alpha <= 0.003) return;
    c.save();
    c.translate(sx, sy);
    c.rotate(aim + swing);
    c.globalAlpha = clamp(alpha, 0, 1);
    c.drawImage(cone, -farHalf * widen, 0, farHalf * 2 * widen, reach);
    c.restore();
  }

  /** Where the pool's middle is now (it moves with the swing). @param {number} swing turn in radians @returns {{x: number, y: number}} centre */
  function poolAt(swing) {
    const a = aim + swing + Math.PI / 2;
    return { x: sx + Math.cos(a) * dist, y: sy + Math.sin(a) * dist };
  }

  /** The darkness over the room, with soft holes for the cone and the pool round the head. @param {CanvasRenderingContext2D} c stage context @param {object} L levels @returns {void} */
  function drawDark(c, L) {
    if (L.dark <= 0.005) return;
    const b = env.buffer('spot-dark', dScale);
    const x = b.ctx;
    x.fillStyle = rgba(darkRgb, 1);
    x.fillRect(0, 0, W, H);
    x.globalCompositeOperation = 'destination-out';
    const on = clamp(L.light, 0, 1);
    drawCone(x, on * 0.72, L.swing, 1.05);
    const p = poolAt(L.swing);
    const prx = f.rx * 1.55 * L.grow;
    const pry = f.ry * 1.45 * L.grow;
    x.globalAlpha = on * 0.97;
    x.drawImage(hole, p.x - prx, p.y - pry, prx * 2, pry * 2);
    x.globalAlpha = 1;
    x.globalCompositeOperation = 'source-over';
    c.globalAlpha = clamp(L.dark, 0, 1);
    c.drawImage(b.canvas, 0, 0, W, H);
    c.globalAlpha = 1;
  }

  /** The light itself: the cone in the air, the warm pool on the face, the cone lighting the smoke. @param {CanvasRenderingContext2D} c stage context @param {object} L levels @returns {void} */
  function drawLight(c, L) {
    if (L.light <= 0.005) return;
    const haze = env.shared.haze;
    const soft = haze ? 0.5 : 1; // with smoke the shaft comes from the lit smoke, so the plain cone is softer
    c.globalCompositeOperation = 'lighter';
    drawCone(c, L.light * (0.09 + 0.12 * L.dark) * soft, L.swing);
    const p = poolAt(L.swing);
    const prx = f.rx * 1.25 * L.grow;
    const pry = f.ry * 1.25 * L.grow;
    c.globalAlpha = clamp(L.light * (0.03 + 0.05 * L.dark) * soft, 0, 1);
    c.drawImage(pool, p.x - prx, p.y - pry, prx * 2, pry * 2);
    if (haze) { // the smoke inside the cone glows: a light shaft
      const lit = env.buffer('spot-lit', haze.scale);
      lit.ctx.globalCompositeOperation = 'lighter';
      drawCone(lit.ctx, 1, L.swing);
      lit.ctx.setTransform(1, 0, 0, 1, 0, 0);
      lit.ctx.globalCompositeOperation = 'destination-in';
      lit.ctx.globalAlpha = 1;
      lit.ctx.drawImage(haze.canvas, 0, 0, lit.canvas.width, lit.canvas.height);
      c.globalAlpha = clamp(L.light * (0.07 + 0.12 * L.dark), 0, 1); // the smoke is already light: a little goes far
      c.drawImage(lit.canvas, 0, 0, W, H);
    }
    c.globalAlpha = 1;
  }

  /** The dust specks drifting in the cone: they only show inside it, most when the room is dark. @param {CanvasRenderingContext2D} c stage context @param {object} L levels @returns {void} */
  function drawSpecks(c, L) {
    const k = L.light * (0.35 + 0.65 * L.dark);
    if (k <= 0.01) return;
    const t = clock();
    const a = aim + L.swing;
    const ca = Math.cos(a);
    const sa = Math.sin(a);
    c.globalCompositeOperation = 'lighter';
    for (const s of specks) {
      const along = s.u * reach;
      const half = farHalf * (APEX + (1 - APEX) * s.u);
      const lx = (s.v + Math.sin(t * 0.4 + s.ph) * 0.06) * half * 0.88;
      const ly = along + Math.sin(t * 0.3 + s.ph * 1.7) * 6 * sc;
      const x = sx + lx * ca - ly * sa;
      const y = sy + lx * sa + ly * ca;
      if (x < -4 || x > W + 4 || y < -4 || y > H + 4) continue;
      const edge = 1 - s.v * s.v;
      const tw = still ? 0.8 : 0.55 + 0.45 * Math.sin(t * s.tw + s.ph);
      c.globalAlpha = clamp(k * edge * tw * 0.9, 0, 1);
      const z = s.size * 2.2;
      c.drawImage(speck, x - z / 2, y - z / 2, z, z);
    }
    c.globalAlpha = 1;
  }

  /** The faint floor mist of its own (when smoke is off): two strips rolling along the bottom, lit where the cone falls. @param {CanvasRenderingContext2D} c stage context @param {object} L levels @returns {void} */
  function drawMist(c, L) {
    if (env.shared.haze || L.mist <= 0.01) return;
    const t = clock();
    const b = env.buffer('spot-mist', env.lite ? 0.3 : 0.4);
    const x = b.ctx;
    const base = Math.max(H - room.floorY, H * 0.08);
    for (const [k, o] of [{ h: 2.4, v: 10 }, { h: 3.2, v: -16 }].entries()) {
      const bh = base * o.h * (0.85 + 0.3 * L.mist);
      const bw = bh * 4;
      const off = ((t * o.v * sc + k * bw * 0.4) % bw + bw) % bw;
      x.globalAlpha = k ? 0.7 : 1;
      for (let px = -off; px < W; px += bw) x.drawImage(mist, px, H - bh, bw + 1, bh);
    }
    x.globalAlpha = 1;
    x.globalCompositeOperation = 'source-atop'; // colour it: dim lavender, brighter under the cone
    x.fillStyle = party ? 'rgb(150,112,190)' : 'rgb(150,146,170)';
    x.fillRect(0, 0, W, H);
    const p = poolAt(L.swing);
    const r = f.rx * 2.2;
    x.globalAlpha = clamp(L.light, 0, 1);
    x.drawImage(pool, p.x - r, H - r * 0.8, r * 2, r * 1.6);
    x.globalAlpha = 1;
    x.globalCompositeOperation = 'source-over';
    c.globalAlpha = clamp(L.mist * (0.55 + 0.45 * L.dark), 0, 1);
    c.drawImage(b.canvas, 0, 0, W, H);
    c.globalAlpha = 1;
  }

  /** The cartoon lamp can, dimmed with the room but still readable: a rod up off the stage, the can, its front ring and the lens (dark until lit). @param {CanvasRenderingContext2D} c stage context @param {object} L levels @returns {void} */
  function drawCan(c, L) {
    const dim = rgba(darkRgb, L.dark * 0.55);
    /** Fill the current path in a colour, darken it with the room, outline it. @param {string} col colour @returns {void} */
    const paint = (col) => { c.fillStyle = col; c.fill(); c.fillStyle = dim; c.fill(); c.stroke(); };
    c.globalCompositeOperation = 'source-over';
    c.save();
    c.translate(sx, sy);
    c.strokeStyle = INK;
    c.lineWidth = Math.max(2, canW * 0.22);
    c.beginPath(); c.moveTo(0, -canW * 0.4); c.lineTo(0, -H); c.stroke(); // the rod it hangs from
    c.rotate(aim + L.swing);
    const len = canW * 2.4;
    c.lineWidth = Math.max(1.5, canW * 0.14);
    c.beginPath(); c.roundRect(-canW * 0.85, -len, canW * 1.7, len, canW * 0.35); paint(party ? '#5a4c7a' : '#4c4860'); // the can
    c.fillStyle = `rgba(255,255,255,${(0.28 - 0.14 * L.dark).toFixed(3)})`; // its shine stripe
    c.fillRect(-canW * 0.55, -len * 0.92, canW * 0.25, len * 0.8);
    c.beginPath(); c.roundRect(-canW, -canW * 0.5, canW * 2, canW * 0.62, canW * 0.2); paint(party ? '#6c5c90' : '#5d5872'); // the wider front ring
    c.beginPath(); c.ellipse(0, canW * 0.12, canW * 0.86, canW * 0.32, 0, 0, TAU); paint('#6a657c');
    c.restore();
  }

  /** The lit lens over the darkness, its glare and the clunk flash (only when the spotlight is on). @param {CanvasRenderingContext2D} c stage context @param {object} L levels @returns {void} */
  function drawLens(c, L) {
    const on = clamp(L.light, 0, 1.3);
    if (on > 0.05) {
      c.globalCompositeOperation = 'source-over';
      c.save();
      c.translate(sx, sy);
      c.rotate(aim + L.swing);
      c.fillStyle = `rgb(255,${Math.round(236 + 18 * Math.min(1, on))},${Math.round(190 + 50 * Math.min(1, on))})`;
      c.strokeStyle = INK;
      c.lineWidth = Math.max(1.5, canW * 0.14);
      c.beginPath(); c.ellipse(0, canW * 0.12, canW * 0.86, canW * 0.32, 0, 0, TAU); c.fill(); c.stroke();
      c.restore();
      // the glare round the lens, and the clunk flash
      c.globalCompositeOperation = 'lighter';
      const g = canW * (3 + 7 * L.flash);
      c.globalAlpha = clamp(on * 0.55 + L.flash * 0.6, 0, 1);
      c.drawImage(flare, sx - g, sy - g, g * 2, g * 2);
      c.globalAlpha = 1;
    }
  }

  return {
    /** Drift the dust specks and move the trigger's clock on. @param {number} dt seconds @returns {void} */
    step(dt) {
      if (tt >= 0) { tt += dt; if (tt > T_END) tt = -1; }
      if (still) return;
      for (const s of specks) {
        s.u += s.vu * dt;
        s.v += s.vv * dt;
        if (s.u < 0.04) s.u = 0.6;
        if (s.u > 0.62) s.u = 0.05;
        if (s.v > 1 || s.v < -1) s.vv = -s.vv;
      }
    },
    /** The darkness, mist, light, specks, then the lamp can and its lit lens. @param {CanvasRenderingContext2D} c stage context @returns {void} */
    draw(c) {
      const L = levels();
      drawDark(c, L);
      drawMist(c, L);
      drawLight(c, L);
      drawSpecks(c, L);
      drawCan(c, L);
      drawLens(c, L);
    },
    /** The boss entrance: dim, dark, clunk on, hold, lights up. @returns {void} */
    trigger() { tt = 0; fired += 1; },
    /** The timeline and levels, for checks. @returns {object} state */
    state: () => ({ fired, t: Math.round(tt * 100) / 100, ...Object.fromEntries(Object.entries(levels()).map(([k, v]) => [k, Math.round(v * 100) / 100])) }),
  };
}

export default { id: 'spotlight', num: 5, name: 'Spot', layer: 'front', order: 70, make };
