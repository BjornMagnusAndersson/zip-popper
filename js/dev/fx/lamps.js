// Effect 6 for the light test page (fx-test.html): glow and flicker on the room's lamps. Soft glow halos on the
// ceiling lamp (tier 0 the bare bulb, tier 1 under its shade with a soft cone of light below it, tier 2 the glass
// globe), on the ring light when it is owned, and in the spa on the shelf's candle (its flame sways and its glow
// breathes) and the diffuser on the floor (a soft pink light in its mist). In the dingy studio the cheap bulb's halo
// flickers along with the room's own flicker (backdrop.js lampLevel, the room light dips with it), and a little cartoon
// moth loops round the bulb, now and then diving in and bumping into it (a tiny "tink"). Tiers 1 and 2: a steady warm
// glow, no moth. Fire: a flicker burst (the room dips, the bulb goes dim and buzzes) and then the light steadies with
// a warm swell. Still: steady halos and the moth resting on the cord. See the README in core.js for the interface.
import { lampLevel, leakGeometry, layerSpots } from '../../pop/backdrop.js';
import { clamp, smooth, TAU } from './sprites.js';
import { paintGlint } from './dust.js';

const BURST = 1.7; // seconds the Fire flicker burst takes (the last part is the light steadying)
const INK = '#2a211d';

/** A repeatable random 0..1 for a whole number. @param {number} n any number @returns {number} 0..1 */
function hash(n) {
  const x = Math.sin(n * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
}

/**
 * Paint a ring-shaped halo (for the ring light): light along a circle, fading softly inwards and outwards.
 * @param {CanvasRenderingContext2D} c the sprite's context
 * @param {number} w the sprite's size
 * @param {string} rgb colour "r,g,b"
 * @returns {void}
 */
function paintRingHalo(c, w, rgb) {
  const m = w / 2;
  const g = c.createRadialGradient(m, m, 0, m, m, m);
  g.addColorStop(0, `rgba(${rgb},0.08)`);
  g.addColorStop(0.22, `rgba(${rgb},0.25)`);
  g.addColorStop(0.36, `rgba(${rgb},0.9)`);
  g.addColorStop(0.5, `rgba(${rgb},0.3)`);
  g.addColorStop(0.75, `rgba(${rgb},0.07)`);
  g.addColorStop(1, `rgba(${rgb},0)`);
  c.fillStyle = g;
  c.fillRect(0, 0, w, w);
}

/**
 * Paint the soft cone of light under a lamp shade (pointing down): bright at the top, wide and faint below.
 * @param {CanvasRenderingContext2D} c the sprite's context
 * @param {number} w width
 * @param {number} h height
 * @param {string} rgb colour "r,g,b"
 * @returns {void}
 */
function paintCone(c, w, h, rgb) {
  const [r, g, b] = rgb.split(',').map(Number);
  const img = c.createImageData(w, h);
  for (let y = 0; y < h; y += 1) {
    const v = y / h;
    const hw = 0.22 + 0.78 * v; // half width as a share of w / 2
    const along = smooth(v / 0.06) * (1 - v) ** 1.6;
    for (let x = 0; x < w; x += 1) {
      const u = Math.abs((x + 0.5 - w / 2) / (w / 2)) / hw;
      if (u >= 1) continue;
      const p = (y * w + x) * 4;
      img.data[p] = r; img.data[p + 1] = g; img.data[p + 2] = b;
      img.data[p + 3] = Math.round(clamp((1 - smooth((u - 0.4) / 0.6)) * along, 0, 1) * 255);
    }
  }
  c.putImageData(img, 0, 0);
}

/**
 * Draw the cartoon moth, seen from above: a fuzzy little body with its head up, two pairs of rounded wings out to
 * the sides that flap (squashed in and out), feathery antennae and two big eyes.
 * @param {CanvasRenderingContext2D} c context
 * @param {number} x middle x
 * @param {number} y middle y
 * @param {number} s size (about the wingspan / 2)
 * @param {number} flap 0..1 how open the wings are (1 = spread wide)
 * @param {number} tilt how far it leans into its turns, radians
 * @param {number} light 0..1 how lit it is (the bulb's flicker)
 * @returns {void}
 */
function drawMoth(c, x, y, s, flap, tilt, light) {
  const lw = Math.max(0.9, s * 0.09);
  c.save();
  c.translate(x, y);
  c.rotate(tilt);
  c.strokeStyle = 'rgba(42,33,29,0.85)';
  c.lineWidth = lw;
  c.lineJoin = 'round';
  const shade = 0.55 + 0.45 * light;
  /** A colour darkened with the light. @param {number[]} rgb colour @returns {string} css */
  const col = (rgb) => `rgb(${(rgb[0] * shade) | 0},${(rgb[1] * shade) | 0},${(rgb[2] * shade) | 0})`;
  const open = 0.22 + 0.78 * flap;
  for (const side of [-1, 1]) {
    c.save();
    c.scale(side * open, 1);
    c.beginPath(); // the lower wing
    c.moveTo(s * 0.06, s * 0.05);
    c.bezierCurveTo(s * 0.5, s * 0.02, s * 0.78, s * 0.42, s * 0.5, s * 0.66);
    c.quadraticCurveTo(s * 0.22, s * 0.8, s * 0.06, s * 0.4);
    c.closePath();
    c.fillStyle = col([214, 196, 160]);
    c.fill(); c.stroke();
    c.beginPath(); // the upper wing, bigger, over it
    c.moveTo(s * 0.06, -s * 0.18);
    c.bezierCurveTo(s * 0.4, -s * 0.72, s * 1.05, -s * 0.6, s * 0.98, -s * 0.12);
    c.quadraticCurveTo(s * 0.92, s * 0.22, s * 0.08, s * 0.12);
    c.closePath();
    c.fillStyle = col([236, 222, 190]);
    c.fill(); c.stroke();
    c.fillStyle = col([190, 162, 124]); // a soft spot on it
    c.beginPath(); c.ellipse(s * 0.6, -s * 0.24, s * 0.14, s * 0.11, 0.3, 0, TAU); c.fill();
    c.restore();
  }
  c.fillStyle = col([158, 130, 100]); // the fuzzy body
  c.beginPath(); c.ellipse(0, s * 0.12, s * 0.16, s * 0.46, 0, 0, TAU); c.fill(); c.stroke();
  c.beginPath(); c.arc(0, -s * 0.38, s * 0.19, 0, TAU); c.fill(); c.stroke(); // the head
  c.strokeStyle = col([120, 96, 72]); // the feathery antennae
  c.lineWidth = lw;
  c.lineCap = 'round';
  c.beginPath();
  c.moveTo(-s * 0.08, -s * 0.54); c.quadraticCurveTo(-s * 0.18, -s * 0.85, -s * 0.38, -s * 0.9);
  c.moveTo(s * 0.08, -s * 0.54); c.quadraticCurveTo(s * 0.18, -s * 0.85, s * 0.38, -s * 0.9);
  c.stroke();
  for (const ex of [-1, 1]) { // two big shiny eyes
    c.fillStyle = '#ffffff';
    c.beginPath(); c.arc(ex * s * 0.09, -s * 0.4, s * 0.085, 0, TAU); c.fill();
    c.fillStyle = INK;
    c.beginPath(); c.arc(ex * s * 0.09, -s * 0.38, s * 0.045, 0, TAU); c.fill();
  }
  c.restore();
}

/**
 * Make the lamp glows for this scene.
 * @param {object} env the page's env (see core.js README)
 * @returns {object} hooks
 */
function make(env) {
  const { W, H, sc, tier, still, party, room } = env;
  const L = room.lamp;
  const warm = party ? '255,190,236' : ['255,214,128', '255,222,160', '255,240,206'][tier] ?? '255,222,160';
  const halo = env.glow(warm, 128);
  const core = env.dot(warm, 0.35, 32);
  const ringRgb = '255,248,226';
  const ringHalo = env.sprite('lamps-ringhalo', 96, 96, (c, w) => paintRingHalo(c, w, ringRgb), 1);
  const ringGlow = env.glow(ringRgb, 128);
  const cone = env.sprite(`lamps-cone:${warm}`, 96, 128, (c, w, h) => paintCone(c, w, h, warm), 1);
  const glint = env.sprite('dust-glint', 48, 48, paintGlint);
  const flameGlow = env.glow('255,196,110', 64);
  const pinkGlow = env.glow('255,200,226', 64);
  const strength = party ? 0.7 : 1;
  const spa = tier === 2;
  // The spa's candle and diffuser (the same sums as backdrop.js spaShelf and diffuser).
  const shelf = room.shelf;
  const k = shelf.len / 120;
  let candle = spa ? { x: shelf.x + 65 * k, y: shelf.y - 31 * k, k } : null;
  if (candle && env.layers.includes('sign')) { // on a sideways screen the sign hangs in front of the candle: no glow then
    const sg = layerSpots(W, H, false).sign;
    const top = sg.y + sg.s * 0.2;
    if (Math.abs(candle.x - sg.x) < sg.s * 0.55 && candle.y > top - 4 && candle.y < top + sg.s * 0.5 + 4) candle = null;
  }
  const leak = leakGeometry(W, H);
  const diffuser = spa && env.layers.includes('leakFix') ? { x: leak.backX, y: leak.floorMid - leak.backS * 0.92, s: leak.backS } : null;
  const ring = room.ring;

  // The moth (tier 0 only): it loops round the bulb and now and then dives in and bumps it.
  const moth = tier === 0 ? {
    x: L.x + L.r * 3, y: L.y - L.r, vx: 0, vy: 0, th: 0.4, dive: 2.6, diving: false, tink: -9, tx: 0, ty: 0, bumps: 0,
  } : null;
  const mothS = Math.max(9, L.r * 1.1);
  let burst = -1; // seconds since the Fire burst started (-1 = none)
  let fired = 0;

  /** How bright the main lamp is now: the room's own flicker (tier 0), or the Fire burst and its steadying swell. @returns {number} 0..1.3 */
  function level() {
    if (burst >= 0 && burst < BURST) {
      const flick = BURST - 0.55;
      if (burst < flick) {
        const step = Math.floor(burst * 18);
        return hash(step * 7 + fired * 31) < 0.55 ? 0.12 + 0.3 * hash(step + 3) : 0.95;
      }
      const q = (burst - flick) / 0.55; // the light steadies: up from dim, a little warm swell over 1, then 1
      return 0.5 + 0.5 * smooth(q * 1.6) + 0.22 * Math.sin(Math.min(1, q) * Math.PI) * smooth(q * 2);
    }
    return still ? 1 : lampLevel(env.t, tier, false);
  }

  /** Move the moth on: steer round the bulb in loops with a fluttery wobble; dive in, bump, bounce out. @param {number} dt seconds @returns {void} */
  function flyMoth(dt) {
    const m = moth;
    const t = env.t;
    m.th += dt * (2.1 + 0.6 * Math.sin(t * 0.7));
    m.dive -= dt;
    if (m.dive <= 0 && !m.diving) m.diving = true;
    let tx = L.x + Math.cos(m.th) * L.r * (3.1 + 0.6 * Math.sin(t * 1.3)); // a wobbly loop round the bulb
    let ty = L.y + L.r * 0.4 + Math.sin(m.th * 1.0) * L.r * (2.0 + 0.5 * Math.cos(t * 0.9)) + Math.sin(m.th * 2) * L.r * 0.5;
    if (m.diving) { tx = L.x; ty = L.y; }
    const pull = m.diving ? 26 : 14;
    m.vx += ((tx - m.x) * pull - m.vx * 3.2 + Math.sin(t * 9.1 + 1) * 260 * sc * 0.4) * dt;
    m.vy += ((ty - m.y) * pull - m.vy * 3.2 + Math.cos(t * 7.7) * 260 * sc * 0.4) * dt;
    m.x += m.vx * dt;
    m.y += m.vy * dt;
    const dx = m.x - L.x;
    const dy = m.y - L.y;
    const d = Math.hypot(dx, dy) || 1;
    const touch = L.r * 1.05 + mothS * 0.35;
    if (d < touch) { // bonk: pushed back out of the glass, a tiny tink, and back to looping for a while
      m.x = L.x + (dx / d) * touch;
      m.y = L.y + (dy / d) * touch;
      const sp = 150 * sc;
      m.vx = (dx / d) * sp;
      m.vy = (dy / d) * sp - 20 * sc;
      if (m.diving) { m.tink = t; m.tx = L.x + (dx / d) * L.r; m.ty = L.y + (dy / d) * L.r; m.bumps += 1; }
      m.diving = false;
      m.dive = 2.2 + hash(m.bumps * 5 + 1) * 2.2;
    }
  }

  /** Draw the main lamp's glow for the tier (tier 1 also its cone of light). @param {CanvasRenderingContext2D} c context @param {number} lv brightness @returns {void} */
  function drawLampGlow(c, lv) {
    c.globalCompositeOperation = 'lighter';
    const a = clamp(lv, 0, 1.3) * strength;
    if (tier === 1) { // under the shade: the light falls downwards
      const cy = L.y + L.r * 0.1;
      const cw = L.r * 9;
      const ch = Math.min(H * 0.62, L.r * 20);
      c.globalAlpha = clamp(0.2 * a, 0, 1);
      c.drawImage(cone, L.x - cw / 2, cy, cw, ch);
      c.globalAlpha = clamp(0.55 * a, 0, 1);
      c.drawImage(halo, L.x - L.r * 4, cy - L.r * 2.6, L.r * 8, L.r * 6);
      c.globalAlpha = clamp(0.5 * a, 0, 1);
      c.drawImage(core, L.x - L.r * 2.1, cy - L.r * 0.9, L.r * 4.2, L.r * 2.2);
      return;
    }
    const gy = spa ? L.y + L.r * 0.2 : L.y;
    const big = spa ? 11 : 9;
    c.globalAlpha = clamp((spa ? 0.4 : 0.5) * a, 0, 1);
    c.drawImage(halo, L.x - L.r * big, gy - L.r * big, L.r * big * 2, L.r * big * 2);
    c.globalAlpha = clamp((spa ? 0.5 : 0.65) * a, 0, 1);
    c.drawImage(halo, L.x - L.r * 3.4, gy - L.r * 3.4, L.r * 6.8, L.r * 6.8);
    c.globalAlpha = clamp((spa ? 0.35 : 0.55) * a, 0, 1);
    c.drawImage(core, L.x - L.r * 1.7, gy - L.r * 1.7, L.r * 3.4, L.r * 3.4);
  }

  /** While the Fire burst has the lamp dim: the room dips and the bulb (or globe) shows dark. @param {CanvasRenderingContext2D} c context @param {number} lv brightness @returns {void} */
  function drawDim(c, lv) {
    if (!(burst >= 0 && burst < BURST) || lv >= 0.95) return;
    const d = clamp(1 - lv, 0, 1);
    c.globalCompositeOperation = 'source-over';
    c.globalAlpha = 1;
    c.fillStyle = `rgba(10,14,16,${(d * 0.32).toFixed(3)})`;
    c.fillRect(0, 0, W, H);
    c.fillStyle = `rgba(150,146,118,${(d * 0.9).toFixed(3)})`;
    c.beginPath();
    if (spa) c.arc(L.x, L.y + L.r * 0.2, L.r * 1.25, 0, TAU);
    else if (tier === 1) c.ellipse(L.x, L.y - L.r * 0.05, L.r * 1.85, L.r * 0.28, 0, 0, TAU);
    else c.ellipse(L.x, L.y, L.r * 0.85, L.r, 0, 0, TAU);
    c.fill();
  }

  /** The ring light's glow (steady, it is the good new lamp). @param {CanvasRenderingContext2D} c context @returns {void} */
  function drawRing(c) {
    if (!ring) return;
    c.globalCompositeOperation = 'lighter';
    c.globalAlpha = 0.24 * strength;
    c.drawImage(ringGlow, ring.x - ring.r * 5, ring.y - ring.r * 5, ring.r * 10, ring.r * 10);
    c.globalAlpha = 0.42 * strength;
    const s = ring.r * 2.8;
    c.drawImage(ringHalo, ring.x - s, ring.y - s, s * 2, s * 2);
  }

  /** The spa candle's breathing glow and swaying flame, and the diffuser's soft pink light. @param {CanvasRenderingContext2D} c context @returns {void} */
  function drawSpaLights(c) {
    const t = still ? 0 : env.t;
    if (candle) {
      const { x, y } = candle;
      const ck = candle.k;
      const breathe = 0.85 + 0.1 * Math.sin(t * 5.3) + 0.05 * Math.sin(t * 13.1 + 1);
      c.globalCompositeOperation = 'lighter';
      c.globalAlpha = clamp(0.75 * breathe * strength, 0, 1);
      const g = 30 * ck * breathe;
      c.drawImage(flameGlow, x - g, y - g, g * 2, g * 2);
      c.globalAlpha = clamp(0.5 * breathe, 0, 1);
      c.drawImage(flameGlow, x - g * 2.6, y - g * 2.6, g * 5.2, g * 5.2);
      c.globalCompositeOperation = 'source-over'; // the flame on top of the painted one, swaying
      c.globalAlpha = 1;
      const sway = (Math.sin(t * 3.7) * 0.6 + Math.sin(t * 8.3) * 0.4) * 1.6 * ck;
      const tall = 1 + 0.08 * Math.sin(t * 6.1);
      c.fillStyle = '#ffc94d';
      c.beginPath();
      c.moveTo(x + sway, y - 6.5 * ck * tall);
      c.quadraticCurveTo(x + 6.5 * ck, y + 3 * ck, x, y + 6 * ck);
      c.quadraticCurveTo(x - 6.5 * ck, y + 3 * ck, x + sway, y - 6.5 * ck * tall);
      c.fill();
      c.fillStyle = '#fff6d8';
      c.beginPath(); c.ellipse(x + sway * 0.3, y + 2.2 * ck, 2 * ck, 3 * ck, 0, 0, TAU); c.fill();
    }
    if (diffuser) {
      const { x, y, s } = diffuser;
      const b = 0.8 + 0.2 * Math.sin(t * 0.9);
      c.globalCompositeOperation = 'lighter';
      c.globalAlpha = clamp(0.45 * b * strength, 0, 1);
      c.drawImage(pinkGlow, x - s * 0.9, y - s * 1.2, s * 1.8, s * 1.8);
      c.globalAlpha = clamp(0.3 * b, 0, 1);
      c.drawImage(pinkGlow, x - s * 0.5, y - s * 0.1, s, s * 0.9);
    }
  }

  /** The moth (and its tink against the glass). @param {CanvasRenderingContext2D} c context @param {number} lv brightness @returns {void} */
  function drawMothNow(c, lv) {
    if (!moth) return;
    c.globalAlpha = 1;
    c.globalCompositeOperation = 'source-over';
    if (still) { // resting on the cord just above the bulb, wings open
      drawMoth(c, L.x + L.r * 0.15, L.y - L.r * 2.9, mothS, 1, 0.12, 1);
      return;
    }
    const t = env.t;
    const flap = Math.abs(Math.sin(t * 19 + moth.x * 0.01));
    const tilt = clamp(moth.vx * 0.003, -0.55, 0.55); // it leans into the way it flies
    drawMoth(c, moth.x, moth.y, mothS, flap, tilt, clamp(lv, 0.3, 1));
    const q = (t - moth.tink) / 0.35;
    if (q >= 0 && q < 1) {
      c.globalCompositeOperation = 'lighter';
      c.globalAlpha = 1 - q;
      const s = L.r * (1 + q * 1.2);
      c.drawImage(glint, moth.tx - s / 2, moth.ty - s / 2, s, s);
    }
  }

  return {
    /** Fly the moth and run the Fire burst. @param {number} dt seconds @returns {void} */
    step(dt) {
      if (burst >= 0) { burst += dt; if (burst > BURST + 0.2) burst = -1; }
      if (moth && !still) flyMoth(dt);
    },
    /** Behind the customer: the dim room in the burst, the halos and glows, the moth. @param {CanvasRenderingContext2D} c context @returns {void} */
    draw(c) {
      const lv = level();
      env.shared.lights?.push({ x: L.x, y: L.y, rgb: warm, a: clamp(lv, 0, 1) });
      drawDim(c, lv);
      drawLampGlow(c, lv);
      drawRing(c);
      drawSpaLights(c);
      drawMothNow(c, lv);
    },
    /** A flicker burst, then the light steadies. @returns {void} */
    trigger() { fired += 1; burst = 0; },
    /** For checks. @returns {object} state */
    state: () => ({ lamp: { x: Math.round(L.x), y: Math.round(L.y), r: Math.round(L.r) }, moth: moth ? { x: Math.round(moth.x), y: Math.round(moth.y), bumps: moth.bumps } : null, ring: Boolean(ring), candle: Boolean(candle), diffuser: Boolean(diffuser), level: Number(level().toFixed(2)), fired }),
  };
}

export default { id: 'lamps', num: 6, name: 'Lamps', layer: 'back', order: 20, make };
