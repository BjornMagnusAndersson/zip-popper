// The room's lamps glowing (SPEC D45 item 3), the game's version of the test page's lamp effect (js/dev/fx/lamps.js).
// Soft glow halos on the ceiling lamp (tier 0 the bare bulb, tier 1 under its shade with a soft cone of light, tier 2
// the glass globe), on the ring light when it is owned, and in the spa on the shelf's candle (its flame sways and its
// glow breathes) and the diffuser (a soft pink light in its mist). In the dingy studio the cheap bulb's halo flickers
// with the room's own flicker (pop/backdrop.js lampLevel) and a little cartoon moth loops round the bulb, now and then
// diving in and bumping into it (a tiny glint). The ring light sends the moth away; the scrub job of the ring light
// blows it off for good (makeMoth leave). Still: steady halos and the moth resting on the cord.
// Once the ring light is bought in the dingy studio the old bulb is off (no glow, no flicker: the mlamp strip). The
// dingy bulb's halo is drawn every frame (one small sprite), so it dips with the bulb when it flickers. In the pop
// scene the ring light only gets a faint glow, no bright ring halo (it sat behind the zoom buttons, audit A5).
import { lampLevel, drawBulbDip } from '../pop/backdrop.js';
import { clamp, smooth, TAU, hash } from './sprites.js';

const INK = '#2a211d';

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
 * Paint the dingy bulb's whole glow into one sprite (the wide halo, the inner halo and the bright core, as added
 * light), so it can be drawn every frame with one copy and dip with the bulb. The sprite spans 9 bulb radii each way.
 * @param {CanvasRenderingContext2D} c the sprite's context
 * @param {number} w the sprite's size
 * @param {HTMLCanvasElement} halo the soft halo sprite
 * @param {HTMLCanvasElement} core the bright core sprite
 * @returns {void}
 */
function paintBulbGlow(c, w, halo, core) {
  const m = w / 2;
  const r = w / 18; // one bulb radius in the sprite
  c.globalCompositeOperation = 'lighter';
  c.globalAlpha = 0.5;
  c.drawImage(halo, 0, 0, w, w);
  c.globalAlpha = 0.65;
  c.drawImage(halo, m - r * 3.4, m - r * 3.4, r * 6.8, r * 6.8);
  c.globalAlpha = 0.55;
  c.drawImage(core, m - r * 1.7, m - r * 1.7, r * 3.4, r * 3.4);
  c.globalAlpha = 1;
  c.globalCompositeOperation = 'source-over';
}

/**
 * Draw the cartoon moth, seen from above: a fuzzy little body with its head up, two pairs of rounded wings out to the
 * sides that flap (squashed in and out), feathery antennae and two big eyes.
 * @param {CanvasRenderingContext2D} c context
 * @param {number} x middle x
 * @param {number} y middle y
 * @param {number} s size (about the wingspan / 2)
 * @param {number} flap 0..1 how open the wings are (1 = spread wide)
 * @param {number} tilt how far it leans into its turns, radians
 * @param {number} light 0..1 how lit it is (the bulb's flicker)
 * @returns {void}
 */
export function drawMoth(c, x, y, s, flap, tilt, light) {
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
 * Make the little moth that loops round a light, now and then dives in and bumps it (a tiny glint), and can be sent
 * off for good (leave: it tumbles away out of the picture, a tiny joke when the new ring light arrives).
 * @param {{lamp: {x: number, y: number, r: number}, sc: number, size: number, orbit: number[], still: boolean,
 *   kit: object, W: number, H: number, rest?: number[]}} o the light it loves (centre and radius), the size factor, the
 *   moth's size, its loop's radii [across, up and down], still = it rests (on the cord, or at rest), the sprite kit,
 *   the picture size (for leaving), where it rests when still ([x, y], default on the cord above the lamp)
 * @returns {{step: (dt: number, t: number) => void, draw: (c: CanvasRenderingContext2D, light: number) => void,
 *   leave: (push?: number[]) => void, gone: () => boolean, state: () => object}} the moth
 */
export function makeMoth(o) {
  const L = o.lamp;
  const S = o.size;
  const [ox, oy] = o.orbit;
  const glint = o.kit.glint();
  const m = { x: L.x + ox, y: L.y - oy * 0.5, vx: 0, vy: 0, th: 0.4, dive: 2.6, diving: false, tink: -9, tx: 0, ty: 0, bumps: 0 };
  let T = 0;
  let leaving = -1; // seconds since it was sent off (-1 = it stays)
  let spin = 0; // its tumble while it is blown away
  let gone = false;

  /** Steer round the light in loops with a fluttery wobble; dive in, bump, bounce out. @param {number} dt seconds @returns {void} */
  function fly(dt) {
    const t = T;
    m.th += dt * (2.1 + 0.6 * Math.sin(t * 0.7));
    m.dive -= dt;
    if (m.dive <= 0 && !m.diving) m.diving = true;
    let tx = L.x + Math.cos(m.th) * ox * (1 + 0.2 * Math.sin(t * 1.3)); // a wobbly loop round the light
    let ty = L.y + L.r * 0.4 + Math.sin(m.th) * oy * (1 + 0.25 * Math.cos(t * 0.9)) + Math.sin(m.th * 2) * oy * 0.25;
    if (m.diving) { tx = L.x; ty = L.y; }
    const pull = m.diving ? 26 : 14;
    m.vx += ((tx - m.x) * pull - m.vx * 3.2 + Math.sin(t * 9.1 + 1) * 104 * o.sc) * dt;
    m.vy += ((ty - m.y) * pull - m.vy * 3.2 + Math.cos(t * 7.7) * 104 * o.sc) * dt;
    m.x += m.vx * dt;
    m.y += m.vy * dt;
    const dx = m.x - L.x;
    const dy = m.y - L.y;
    const d = Math.hypot(dx, dy) || 1;
    const touch = L.r * 1.05 + S * 0.35;
    if (d < touch) { // bonk: pushed back out of the glass, a tiny glint, and back to looping for a while
      m.x = L.x + (dx / d) * touch;
      m.y = L.y + (dy / d) * touch;
      const sp = 150 * o.sc;
      m.vx = (dx / d) * sp;
      m.vy = (dy / d) * sp - 20 * o.sc;
      if (m.diving) { m.tink = t; m.tx = L.x + (dx / d) * L.r; m.ty = L.y + (dy / d) * L.r; m.bumps += 1; }
      m.diving = false;
      m.dive = 2.2 + hash(m.bumps * 5 + 1) * 2.2;
    }
  }

  /** Blown away: it tumbles off to the right in a fluttery wobble, faster and faster, until it is out of the picture. @param {number} dt seconds @returns {void} */
  function flyOff(dt) {
    leaving += dt;
    m.vx += (200 * o.sc + Math.sin(T * 11) * 120 * o.sc) * dt;
    m.vy += ((o.H * 0.3 - m.y) * 2.2 - m.vy * 0.8 + Math.cos(T * 9) * 260 * o.sc) * dt; // out through the upper part of the picture
    m.x += m.vx * dt;
    m.y += m.vy * dt;
    spin += dt * 9;
    if (m.x > o.W + S * 3 || m.y < -S * 3 || m.x < -S * 3 || leaving > 4) gone = true;
  }

  return {
    /** Move the moth on. @param {number} dt seconds @param {number} t the clock @returns {void} */
    step(dt, t) {
      T = t;
      if (gone) return;
      if (leaving >= 0) flyOff(dt);
      else if (!o.still) fly(dt);
    },
    /** Draw it (and its glint against the glass). @param {CanvasRenderingContext2D} c context @param {number} light 0..1 how lit @returns {void} */
    draw(c, light) {
      if (gone) return;
      c.save();
      c.globalAlpha = 1;
      c.globalCompositeOperation = 'source-over';
      if (o.still && leaving < 0) { // resting, wings open
        const [rx, ry] = o.rest ?? [L.x + L.r * 0.15, L.y - L.r * 2.9];
        drawMoth(c, rx, ry, S, 1, 0.12, 1);
        c.restore();
        return;
      }
      const flap = Math.abs(Math.sin(T * 19 + m.x * 0.01));
      const tilt = leaving >= 0 ? spin : clamp(m.vx * 0.003, -0.55, 0.55); // it leans into the way it flies, or tumbles
      drawMoth(c, m.x, m.y, S, flap, tilt, clamp(light, 0.3, 1));
      const q = (T - m.tink) / 0.35;
      if (q >= 0 && q < 1 && leaving < 0) {
        c.globalCompositeOperation = 'lighter';
        c.globalAlpha = 1 - q;
        const s = L.r * (1 + q * 1.2);
        c.drawImage(glint, m.tx - s / 2, m.ty - s / 2, s, s);
      }
      c.restore();
    },
    /** Send it off: a gust blows it away out of the picture. @param {number[]} [push] a first push [vx, vy] in px/s @returns {void} */
    leave(push = [160, -120]) {
      if (leaving >= 0 || gone) return;
      if (o.still) { gone = true; return; } // reduced motion: it is simply gone
      leaving = 0;
      m.vx = push[0] * o.sc; // the gust takes over from its own flutter
      m.vy = push[1] * o.sc;
      m.y = Math.max(m.y, S * 1.5); // never already half out of the picture at the top
    },
    /** Whether it has flown out of the picture. @returns {boolean} gone */
    gone: () => gone,
    /** For checks. @returns {object} state */
    state: () => ({ x: Math.round(m.x), y: Math.round(m.y), bumps: m.bumps, leaving: leaving >= 0, gone }),
  };
}

/**
 * Make the lamp glows for the room.
 * @param {{W: number, H: number, sc: number, kit: object, tier: number, still: boolean, lamp: {x: number, y: number,
 *   r: number}, ring: {x: number, y: number, r: number}|null, candle: {x: number, y: number, k: number}|null,
 *   diffuser: {x: number, y: number, s: number}|null, moth: boolean, dim: boolean, calm?: boolean, baked?: boolean,
 *   off?: boolean, softRing?: boolean, under?: boolean}} o
 *   (baked = the still glows are painted once into the still room by bake, not every frame, except the dingy bulb's,
 *   which dips with its flicker; under = the caller draws that halo under the bulb with under() (the pop scene);
 *   off = the old bulb is off for good, tier 0 with the ring light: no glow, no flicker;
 *   softRing = the pop scene: only a faint glow round the ring light, no bright ring halo) picture size
 *   and size factor, the sprite kit, the studio tier, still (nothing moves: reduced motion, or the pop scene with
 *   lighter graphics), calm = reduced motion (the bulb never flickers), the ceiling bulb, the ring light (or null), the spa's
 *   candle flame and diffuser (or null), whether the moth flies here, dim = also draw the room dipping while the bulb
 *   flickers (the studio view, whose still room has the light baked in; the pop scene's room dips by itself)
 * @returns {{step: (dt: number, t: number) => void, draw: (c: CanvasRenderingContext2D) => void,
 *   under: (c: CanvasRenderingContext2D, t: number) => void, bake: (c: CanvasRenderingContext2D) => void,
 *   state: () => object}} hooks
 */
export function makeLamps(o) {
  const { W, H, kit, tier, still } = o;
  const L = o.lamp;
  const warm = ['255,214,128', '255,222,160', '255,240,206'][tier] ?? '255,222,160';
  const halo = kit.glow(warm, 128);
  const core = kit.dot(warm, 0.35, 32);
  const ringRgb = '255,248,226';
  const ringHalo = kit.sprite('lamps-ringhalo', 96, 96, (c, w) => paintRingHalo(c, w, ringRgb), 1);
  const ringGlow = kit.glow(ringRgb, 128);
  const cone = tier === 1 ? kit.sprite(`lamps-cone:${warm}`, 96, 128, (c, w, h) => paintCone(c, w, h, warm), 1) : null;
  const flameGlow = kit.glow('255,196,110', 64);
  const pinkGlow = kit.glow('255,200,226', 64);
  const spa = tier === 2;
  const off = Boolean(o.off) && tier === 0;
  // the dingy bulb's glow in one small sprite, drawn every frame so it dips with the flicker (audit A4)
  const bulbGlow = tier === 0 && !off ? kit.sprite(`lamps-bulbglow:${warm}`, 160, 160, (c, w) => paintBulbGlow(c, w, halo, core), 1) : null;
  const moth = o.moth ? makeMoth({
    lamp: L, sc: o.sc, size: Math.max(9, L.r * 1.1), orbit: [L.r * 3.1, L.r * 2.0], still, kit, W, H,
  }) : null;
  let T = 0;

  /** How bright the ceiling lamp is now (the room's own flicker in tier 0; steady with reduced motion or off). @returns {number} 0..1 */
  const level = () => (off ? 1 : lampLevel(T, tier, Boolean(o.calm)));

  /** Draw the ceiling lamp's glow for the tier (tier 1 also its cone of light; none when the old bulb is off). @param {CanvasRenderingContext2D} c context @param {number} lv brightness @returns {void} */
  function drawLampGlow(c, lv) {
    if (off) return;
    c.globalCompositeOperation = 'lighter';
    const a = clamp(lv, 0, 1.3);
    if (bulbGlow) { // the dingy bulb: its whole glow in one copy
      c.globalAlpha = clamp(a, 0, 1);
      c.drawImage(bulbGlow, L.x - L.r * 9, L.y - L.r * 9, L.r * 18, L.r * 18);
      return;
    }
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

  /** The studio view while the bulb flickers: the room round the bulb dips a little and the bulb shows dull (as the pop scene's room does, backdrop.js drawBulbDip). @param {CanvasRenderingContext2D} c context @param {number} lv brightness @returns {void} */
  function drawDim(c, lv) {
    if (!o.dim || lv >= 1) return;
    c.globalCompositeOperation = 'source-over';
    c.globalAlpha = 1;
    drawBulbDip(c, W, H, lv);
    if (lv <= 0.6) {
      c.fillStyle = '#9c9878';
      c.beginPath(); c.ellipse(L.x, L.y, L.r * 0.85, L.r, 0, 0, TAU); c.fill();
    }
  }

  /** The ring light's glow (steady, it is the good new lamp); in the pop scene only a faint glow, no bright ring halo. @param {CanvasRenderingContext2D} c context @returns {void} */
  function drawRing(c) {
    const R = o.ring;
    if (!R) return;
    c.globalCompositeOperation = 'lighter';
    c.globalAlpha = o.softRing ? 0.14 : 0.24;
    c.drawImage(ringGlow, R.x - R.r * 5, R.y - R.r * 5, R.r * 10, R.r * 10);
    if (o.softRing) return; // the pop scene: the halo sat behind the zoom buttons and washed out their icons (A5)
    c.globalAlpha = 0.42;
    const s = R.r * 2.8;
    c.drawImage(ringHalo, R.x - s, R.y - s, s * 2, s * 2);
  }

  /** The spa's still glows: the candle's wide glow and the diffuser's soft pink light. @param {CanvasRenderingContext2D} c context @param {number} t the clock (0 = still) @returns {void} */
  function drawSpaGlows(c, t) {
    if (o.candle) {
      const { x, y, k: ck } = o.candle;
      const breathe = 0.85 + 0.1 * Math.sin(t * 5.3) + 0.05 * Math.sin(t * 13.1 + 1);
      const g = 30 * ck * breathe;
      c.globalCompositeOperation = 'lighter';
      c.globalAlpha = clamp(0.5 * breathe, 0, 1);
      c.drawImage(flameGlow, x - g * 2.6, y - g * 2.6, g * 5.2, g * 5.2);
    }
    if (o.diffuser) {
      const { x, y, s } = o.diffuser;
      const b = 0.8 + 0.2 * Math.sin(t * 0.9);
      c.globalCompositeOperation = 'lighter';
      c.globalAlpha = clamp(0.45 * b, 0, 1);
      c.drawImage(pinkGlow, x - s * 0.9, y - s * 1.2, s * 1.8, s * 1.8);
      c.globalAlpha = clamp(0.3 * b, 0, 1);
      c.drawImage(pinkGlow, x - s * 0.5, y - s * 0.1, s, s * 0.9);
    }
  }

  /** The spa candle's breathing inner glow and its swaying flame. @param {CanvasRenderingContext2D} c context @returns {void} */
  function drawSpaLights(c) {
    const t = still ? 0 : T;
    if (o.candle) {
      const { x, y, k: ck } = o.candle;
      const breathe = 0.85 + 0.1 * Math.sin(t * 5.3) + 0.05 * Math.sin(t * 13.1 + 1);
      c.globalCompositeOperation = 'lighter';
      c.globalAlpha = clamp(0.75 * breathe, 0, 1);
      const g = 30 * ck * breathe;
      c.drawImage(flameGlow, x - g, y - g, g * 2, g * 2);
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
  }

  return {
    /** Fly the moth on. @param {number} dt seconds @param {number} t the clock @returns {void} */
    step(dt, t) {
      T = t;
      moth?.step(dt, t);
    },
    /**
     * The dip while the bulb flickers (studio view), the glows (unless baked into the still room), the candle's flame
     * and the moth.
     * @param {CanvasRenderingContext2D} c context
     * @returns {void}
     */
    draw(c) {
      const lv = level();
      c.save();
      drawDim(c, lv);
      if (!o.baked) {
        drawLampGlow(c, lv);
        drawRing(c);
        drawSpaGlows(c, still ? 0 : T);
      } else if (bulbGlow && !o.under) {
        drawLampGlow(c, lv); // the dingy bulb's halo every frame, so it dips with the bulb (A4)
      }
      drawSpaLights(c);
      c.restore();
      moth?.draw(c, lv);
    },
    /**
     * The dingy bulb's halo for a moment, drawn under the bulb (the pop scene calls it before the room's bulb is
     * painted, so the bulb stays crisp on top, as when the halo was baked in). Nothing in the other tiers or when off.
     * @param {CanvasRenderingContext2D} c context
     * @param {number} t the clock (the room's own time, so it flickers with the room)
     * @returns {void}
     */
    under(c, t) {
      if (!bulbGlow || !o.under) return;
      c.save();
      drawLampGlow(c, lampLevel(t, tier, Boolean(o.calm)));
      c.restore();
    },
    /** Paint the still glows once into the still room (baked; the dingy bulb's halo is drawn every frame instead). @param {CanvasRenderingContext2D} c context @returns {void} */
    bake(c) {
      if (!o.baked) return;
      c.save();
      if (!bulbGlow) drawLampGlow(c, 1);
      drawRing(c);
      drawSpaGlows(c, 0);
      c.restore();
    },
    /** For checks. @returns {object} state */
    state: () => ({ level: Number(level().toFixed(2)), off, bulbGlow: Boolean(bulbGlow), softRing: Boolean(o.softRing), moth: moth ? moth.state() : null, ring: Boolean(o.ring), candle: Boolean(o.candle), diffuser: Boolean(o.diffuser) }),
  };
}
