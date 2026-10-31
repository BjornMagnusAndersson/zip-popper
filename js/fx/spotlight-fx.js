// The stage spotlight of a boss or event intro (SPEC D45 item 4), ported from the developer effects page
// (js/dev/fx/spotlight.js) for the game. A cartoon lamp can hangs at the top edge, up and to the left of the customer's
// portrait. The room around goes dark (a low-resolution darkness with soft holes for the cone and the pool), the
// lamp clunks on: a soft cone of light down onto the customer, a bright pool round the portrait, dust specks drifting
// in the cone, a flash at the lens, and a little swing on its bracket that settles. Golden Day adds gold glints in the
// light. Every soft shape is painted once into a sprite (sprites.js) and only copied after that, so it is cheap.
// The levels (how dark, how bright, the swing) come from stage-logic.js; this file only draws them.
import { rng } from '../pop/logic.js';
import { clamp, smooth, TAU, rgba } from './sprites.js';

const INK = '#2a211d';
const APEX = 0.07; // the cone's half width at the lens, as a share of its far half width

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
 * Paint a soft round pool (see-through at the edge), drawn squashed into the light pool round the portrait.
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
 * Make the spotlight for one stage size.
 * @param {{W: number, H: number, sc: number, kit: object, plan: object, face: {cx: number, cy: number, r: number},
 *   seed?: number}} o stage size in CSS px, size factor, the sprite kit (sprites.js makeSprites), the stage plan
 *   (stage-logic.js stagePlan), the portrait's middle and radius, a random seed
 * @returns {{draw: (c: CanvasRenderingContext2D, L: object, t: number) => void, state: () => object}} the spotlight:
 *   draw paints it for the levels L at scene time t (seconds)
 */
export function makeSpotlight(o) {
  const { W, H, sc, kit, plan, face: f } = o;
  const look = plan.look;
  const still = plan.still;
  const rand = rng(o.seed ?? 515);
  // Where it hangs: up and to the left of the portrait, the lens just inside the top edge, aimed at the face.
  const canW = clamp(14 * sc, 10, 22); // the lamp can's half width
  const sx = clamp(f.cx - Math.max(f.r * 1.25, W * 0.12), 26 * sc, W - 26 * sc);
  const sy = canW * 2.3 + 4; // low enough that the whole can shows under the top edge
  const tx = f.cx;
  const ty = f.cy - f.r * 0.08;
  const dist = Math.hypot(tx - sx, ty - sy);
  const reach = Math.hypot(W, H) * 1.1; // the cone's length: past the bottom edge
  const farHalf = (f.r * 1.35) / (APEX + (1 - APEX) * (dist / reach));
  const aim = Math.atan2(ty - sy, tx - sx) - Math.PI / 2; // the turn that points the sprite's +y at the face
  const cone = kit.sprite('stage-cone', 128, 256, (c, w, h) => paintCone(c, w, h), 1);
  const coneLit = kit.sprite(`stage-cone:${look.light}`, 128, 256, (c, w, h) => { // the same cone in the day's light colour
    c.drawImage(cone, 0, 0, w, h); // copied, not painted pixel by pixel again (the first frame stays quick)
    c.globalCompositeOperation = 'source-in';
    c.fillStyle = rgba(look.light, 1);
    c.fillRect(0, 0, w, h);
    c.globalCompositeOperation = 'source-over';
  }, 1);
  const hole = kit.sprite('stage-pool:255,255,255', 128, 128, (c, w) => paintPool(c, w, '255,255,255'), 1);
  const pool = kit.sprite(`stage-pool:${look.light}`, 128, 128, (c, w) => paintPool(c, w, look.light), 1);
  const flare = kit.glow(look.light);
  const speck = kit.dot(look.speck, 0.3);
  const glint = kit.glint();
  const specks = [];
  for (let i = 0; i < plan.specks; i += 1) {
    specks.push({
      u: 0.05 + rand() * 0.5, v: rand() * 2 - 1, // along the cone (share of the way to the face and past) and across it
      vu: (rand() - 0.6) * 0.012, vv: (rand() - 0.5) * 0.06,
      size: (1 + rand() * 2.2) * sc, ph: rand() * TAU, tw: 1.5 + rand() * 2.5,
    });
  }
  const glints = [];
  for (let i = 0; i < plan.glints; i += 1) { // Golden Day: gold glints round the portrait, each twinkling in turn
    const a = rand() * TAU;
    const d = f.r * (1.05 + rand() * 0.55);
    glints.push({ x: f.cx + Math.cos(a) * d, y: f.cy + Math.sin(a) * d * 0.95, s: (7 + rand() * 9) * sc, ph: rand() * TAU, sp: 2.2 + rand() * 2.4 });
  }

  /** Draw the cone sprite from the lens, turned by the swing. @param {CanvasRenderingContext2D} c context @param {number} alpha strength @param {number} swing extra turn in radians @param {number} [widen] wider than normal @param {HTMLCanvasElement} [img] which cone (the white one cuts the darkness) @returns {void} */
  function drawCone(c, alpha, swing, widen = 1, img = cone) {
    if (alpha <= 0.003) return;
    c.save();
    c.translate(sx, sy);
    c.rotate(aim + swing);
    c.globalAlpha = clamp(alpha, 0, 1);
    c.drawImage(img, -farHalf * widen, 0, farHalf * 2 * widen, reach);
    c.restore();
  }

  /** Where the pool's middle is now (it moves with the swing). @param {number} swing turn in radians @returns {{x: number, y: number}} centre */
  function poolAt(swing) {
    const a = aim + swing + Math.PI / 2;
    return { x: sx + Math.cos(a) * dist, y: sy + Math.sin(a) * dist };
  }

  /** The darkness over the room, with soft holes for the cone and the pool round the portrait. @param {CanvasRenderingContext2D} c stage context @param {object} L levels @returns {void} */
  function drawDark(c, L) {
    if (L.dark <= 0.005) return;
    const b = kit.buffer('stage-dark', W, H, plan.darkScale);
    const x = b.ctx;
    x.fillStyle = rgba(look.dark, 1);
    x.fillRect(-4, -4, W + 8, H + 8); // past the edges: the low-res layer's last half pixel would show as a light seam
    x.globalCompositeOperation = 'destination-out';
    const on = clamp(L.light, 0, 1);
    drawCone(x, on * 0.7, L.swing, 1.05);
    const p = poolAt(L.swing);
    const pr = f.r * 1.6 * L.grow;
    x.globalAlpha = on * 0.97;
    x.drawImage(hole, p.x - pr, p.y - pr, pr * 2, pr * 2);
    x.globalAlpha = 1;
    x.globalCompositeOperation = 'source-over';
    c.globalAlpha = clamp(L.dark, 0, 1);
    c.drawImage(b.canvas, 0, 0, W, H);
    c.globalAlpha = 1;
  }

  /** The light itself: the cone in the air and the warm pool round the portrait. @param {CanvasRenderingContext2D} c stage context @param {object} L levels @returns {void} */
  function drawLight(c, L) {
    if (L.light <= 0.005) return;
    const k = clamp(L.light, 0, 1.3);
    drawCone(c, k * 0.26 * L.dark, L.swing, 1, coneLit); // a wash of the day's colour (gold, pink, mint, lilac)
    c.globalCompositeOperation = 'lighter';
    drawCone(c, k * (0.08 + 0.12 * L.dark), L.swing, 1, coneLit);
    const p = poolAt(L.swing);
    const pr = f.r * 1.35 * L.grow;
    c.globalAlpha = clamp(k * (0.06 + 0.1 * L.dark), 0, 1);
    c.drawImage(pool, p.x - pr, p.y - pr, pr * 2, pr * 2);
    c.globalAlpha = 1;
  }

  /** The dust specks drifting in the cone: they only show inside it, most when the room is dark. @param {CanvasRenderingContext2D} c stage context @param {object} L levels @param {number} t seconds @returns {void} */
  function drawSpecks(c, L, t) {
    const k = clamp(L.light, 0, 1) * (0.35 + 0.65 * L.dark);
    if (k <= 0.01) return;
    const a = aim + L.swing;
    const ca = Math.cos(a);
    const sa = Math.sin(a);
    c.globalCompositeOperation = 'lighter';
    for (const s of specks) {
      const u = 0.04 + ((((s.u + s.vu * t) - 0.04) % 0.52) + 0.52) % 0.52; // drifts along the cone, round again
      const v = Math.sin(s.ph + s.vv * t * 6) * Math.abs(s.v); // and from side to side
      const along = u * dist * 1.7;
      const half = farHalf * (APEX + (1 - APEX) * (along / reach));
      const lx = (v + Math.sin(t * 0.4 + s.ph) * 0.06) * half * 0.85;
      const ly = along + Math.sin(t * 0.3 + s.ph * 1.7) * 6 * sc;
      const x = sx + lx * ca - ly * sa;
      const y = sy + lx * sa + ly * ca;
      if (x < -4 || x > W + 4 || y < -4 || y > H + 4) continue;
      const edge = 1 - v * v;
      const tw = still ? 0.8 : 0.55 + 0.45 * Math.sin(t * s.tw + s.ph);
      c.globalAlpha = clamp(k * edge * tw * 0.9, 0, 1);
      const z = s.size * 2.2;
      c.drawImage(speck, x - z / 2, y - z / 2, z, z);
    }
    c.globalAlpha = 1;
  }

  /** Golden Day's glints round the portrait: each one flares and fades in turn (still: a steady few). @param {CanvasRenderingContext2D} c stage context @param {object} L levels @param {number} t seconds @returns {void} */
  function drawGlints(c, L, t) {
    const k = clamp(L.light, 0, 1);
    if (!glints.length || k <= 0.02) return;
    c.globalCompositeOperation = 'lighter';
    for (const g of glints) {
      const tw = still ? 0.7 : Math.max(0, Math.sin(t * g.sp + g.ph)) ** 3;
      if (tw <= 0.02) continue;
      const s = g.s * (0.6 + 0.4 * tw);
      c.globalAlpha = clamp(k * tw, 0, 1);
      c.drawImage(glint, g.x - s, g.y - s, s * 2, s * 2);
    }
    c.globalAlpha = 1;
  }

  /** The cartoon lamp can, dimmed with the room but still readable: a rod up off the top, the can, its front ring and the lens (dark until lit, then bright with a glare and the clunk flash). @param {CanvasRenderingContext2D} c stage context @param {object} L levels @returns {void} */
  function drawCan(c, L) {
    const dim = rgba(look.dark, L.dark * 0.5);
    /** Fill the current path in a colour, darken it with the room, outline it. @param {string} col colour @returns {void} */
    const paint = (col) => { c.fillStyle = col; c.fill(); c.fillStyle = dim; c.fill(); c.stroke(); };
    const on = clamp(L.light, 0, 1.3);
    c.globalCompositeOperation = 'source-over';
    c.globalAlpha = clamp(Math.max(L.dark * 1.4, on), 0, 1); // the lamp leaves with the dark when the lights come up
    c.save();
    c.translate(sx, sy);
    c.strokeStyle = INK;
    c.lineWidth = Math.max(2, canW * 0.22);
    c.beginPath(); c.moveTo(0, -canW * 0.4); c.lineTo(0, -H); c.stroke(); // the rod it hangs from
    c.rotate(aim + L.swing);
    const len = canW * 2.4;
    c.lineWidth = Math.max(1.5, canW * 0.14);
    c.beginPath(); c.roundRect(-canW * 0.85, -len, canW * 1.7, len, canW * 0.35); paint(look.villain ? '#4a3a66' : '#4c4860'); // the can
    c.fillStyle = `rgba(255,255,255,${(0.28 - 0.14 * L.dark).toFixed(3)})`; // its shine stripe
    c.fillRect(-canW * 0.55, -len * 0.92, canW * 0.25, len * 0.8);
    c.beginPath(); c.roundRect(-canW, -canW * 0.5, canW * 2, canW * 0.62, canW * 0.2); paint(look.villain ? '#5c4a80' : '#5d5872'); // the front ring
    c.beginPath(); c.ellipse(0, canW * 0.12, canW * 0.86, canW * 0.32, 0, 0, TAU);
    if (on > 0.05) { // the lit lens
      const [r, g, b] = look.light.split(',').map(Number);
      const k = Math.min(1, on);
      c.fillStyle = `rgb(${Math.round(lerp255(120, r, k))},${Math.round(lerp255(110, g, k))},${Math.round(lerp255(120, b, k))})`;
      c.fill(); c.stroke();
    } else paint('#6a657c');
    c.restore();
    if (on > 0.05) { // the glare round the lens, and the clunk flash
      c.globalCompositeOperation = 'lighter';
      const g = canW * (3 + 7 * L.flash);
      c.globalAlpha = clamp(on * 0.5 + L.flash * 0.6, 0, 1);
      c.drawImage(flare, sx - g, sy - g, g * 2, g * 2);
    }
    c.globalAlpha = 1;
  }

  return {
    /**
     * Draw the spotlight for these levels: the darkness, the light, the specks, the glints, then the lamp can.
     * @param {CanvasRenderingContext2D} c stage context (CSS px)
     * @param {object} L levels (stage-logic.js stageLevels)
     * @param {number} t scene time in seconds (frozen when still)
     * @returns {void}
     */
    draw(c, L, t) {
      drawDark(c, L);
      drawLight(c, L);
      drawSpecks(c, L, t);
      drawGlints(c, L, t);
      drawCan(c, L);
    },
    /** Where the lamp hangs and aims, for checks. @returns {object} state */
    state: () => ({ lamp: [Math.round(sx), Math.round(sy)], aim: [Math.round(tx), Math.round(ty)], specks: specks.length, glints: glints.length }),
  };
}

/** Part way from a to b (colour channels). @param {number} a start @param {number} b end @param {number} k 0..1 @returns {number} mixed */
function lerp255(a, b, k) {
  return a + (b - a) * k;
}
