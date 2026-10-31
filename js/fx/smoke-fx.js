// The floor smoke of a boss or event intro (SPEC D45 item 4), ported from the developer effects page
// (js/dev/fx/smoke.js): two soft mist strips roll along the bottom of the screen, and at the clunk two little smoke
// machines puff thick cartoon billows in from the bottom corners, which slow down, swell and settle. Purple for the
// Big Evil Horn (with a violet glow from below), gold, pink or mint for the event days. Everything is painted once
// into sprites and drawn small into one low-resolution layer that is stretched over the screen (smoke is soft, so the
// low resolution never shows, and it costs very little). Lighter graphics: only the mist strips. Reduced motion: a
// still mist. The amount of smoke comes from stage-logic.js (levels.smoke).
import { rng } from '../pop/logic.js';
import { clamp, smooth, TAU, rgba } from './sprites.js';

const PUFF_PX = 128; // the billow sprites' size (they are soft, so this is plenty)
const PUFF_KINDS = 3;

/**
 * Paint one lumpy smoke billow (light grey, see-through): a cluster of round blobs, each lit from the top left and
 * shaded below, wisps cut out with cloudy noise, and a soft round edge (a cartoon cloud).
 * @param {CanvasRenderingContext2D} c the sprite's context
 * @param {number} w the sprite's size
 * @param {number} seed which billow
 * @param {HTMLCanvasElement} noise a cloudy noise sprite
 * @returns {void}
 */
function paintBillow(c, w, seed, noise) {
  const rand = rng(seed);
  const blobs = [];
  for (let k = 0; k < 10; k += 1) {
    const a = rand() * TAU;
    const d = Math.sqrt(rand()) * w * 0.21;
    blobs.push({ x: w / 2 + Math.cos(a) * d, y: w / 2 + Math.sin(a) * d * 0.72, r: w * (0.12 + rand() * 0.12) });
  }
  blobs.sort((p, q) => p.y - q.y);
  for (const { x, y, r } of blobs) {
    const g = c.createRadialGradient(x - r * 0.3, y - r * 0.35, 0, x, y, r);
    g.addColorStop(0, 'rgba(255,255,255,0.95)');
    g.addColorStop(0.6, 'rgba(236,236,242,0.87)');
    g.addColorStop(0.86, 'rgba(200,198,212,0.36)');
    g.addColorStop(1, 'rgba(190,188,204,0)');
    c.fillStyle = g;
    c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill();
  }
  c.globalCompositeOperation = 'destination-out'; // wisps and holes
  c.globalAlpha = 0.32;
  c.drawImage(noise, -rand() * w, -rand() * w, w * 2, w * 2);
  c.globalAlpha = 1;
  c.globalCompositeOperation = 'destination-in'; // a soft round edge
  const m = c.createRadialGradient(w / 2, w / 2, w * 0.18, w / 2, w / 2, w * 0.5);
  m.addColorStop(0, 'rgba(0,0,0,1)');
  m.addColorStop(1, 'rgba(0,0,0,0)');
  c.fillStyle = m;
  c.fillRect(0, 0, w, w);
  c.globalCompositeOperation = 'source-over';
}

/**
 * Paint the floor mist strip (white, see-through): soft blobs along a strip that tiles left to right, thicker at the
 * bottom, with cloudy holes, fading out upwards.
 * @param {CanvasRenderingContext2D} c the sprite's context
 * @param {number} w width
 * @param {number} h height
 * @param {HTMLCanvasElement} noise a cloudy noise sprite (it tiles)
 * @returns {void}
 */
function paintFog(c, w, h, noise) {
  const rand = rng(77);
  for (let k = 0; k < 22; k += 1) {
    const x = rand() * w;
    const y = h * (0.5 + rand() * 0.4);
    const r = h * (0.25 + rand() * 0.28);
    for (const dx of [-w, 0, w]) { // drawn three times, so the strip joins up when tiled
      const g = c.createRadialGradient(x + dx, y, 0, x + dx, y, r);
      g.addColorStop(0, 'rgba(255,255,255,0.55)');
      g.addColorStop(1, 'rgba(255,255,255,0)');
      c.fillStyle = g;
      c.fillRect(x + dx - r, y - r, r * 2, r * 2);
    }
  }
  c.globalCompositeOperation = 'destination-out';
  c.globalAlpha = 0.45;
  for (let x = 0; x < w; x += h) c.drawImage(noise, x, 0, h, h);
  c.globalAlpha = 1;
  c.globalCompositeOperation = 'destination-in'; // fade out upwards
  const g = c.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, 'rgba(0,0,0,0)');
  g.addColorStop(0.5, 'rgba(0,0,0,0.85)');
  g.addColorStop(1, 'rgba(0,0,0,1)');
  c.fillStyle = g;
  c.fillRect(0, 0, w, h);
  c.globalCompositeOperation = 'source-over';
}

/**
 * Make the floor smoke for one stage size.
 * @param {{W: number, H: number, sc: number, kit: object, plan: object, start?: number}} o stage size in CSS px, size
 *   factor, the sprite kit (sprites.js makeSprites), the stage plan (stage-logic.js stagePlan), and the scene time the
 *   smoke machines puff (seconds, the clunk)
 * @returns {{draw: (c: CanvasRenderingContext2D, L: object, t: number) => void, state: () => object}} the smoke: draw
 *   paints it for the levels L at scene time t
 */
export function makeFloorSmoke(o) {
  const { W, H, sc, kit, plan } = o;
  const look = plan.look;
  const scale = plan.smokeScale;
  const start = o.start ?? 0.55;
  const big = Math.max(W, H);
  const noise = kit.noise(128, 31, 5);
  const fog = kit.sprite('stage-fog', 512, 128, (c, w, h) => paintFog(c, w, h, noise), 1);
  const billows = [];
  for (let k = 0; k < PUFF_KINDS && plan.billows > 0; k += 1) billows.push(kit.sprite(`stage-billow:${k}`, PUFF_PX, PUFF_PX, (c, w) => paintBillow(c, w, 301 + k * 23, noise), 1));
  const rand = rng(909);
  const puffs = [];
  for (let i = 0; i < plan.billows; i += 1) { // half from each bottom corner, a little after one another
    const dir = i % 2 ? -1 : 1;
    const up = 0.12 + rand() * 0.38; // radians above the floor
    const speed = (260 + rand() * 240) * sc;
    puffs.push({
      ox: dir > 0 ? -W * 0.04 : W * 1.04, oy: H * (0.97 + rand() * 0.04), vx: Math.cos(up) * speed * dir, vy: -Math.sin(up) * speed,
      s0: big * 0.04, s1: big * (0.2 + rand() * 0.2), delay: Math.floor(i / 2) * 0.07, rot: rand() * TAU, spin: (rand() - 0.5) * 1.1,
      kind: Math.floor(rand() * PUFF_KINDS), a: 0.7 + rand() * 0.3,
    });
  }
  const DRAG = 2.3;
  let tint = null; // the colour gradient, made once for the layer's context

  /** Where one billow is at an age, how big and how thick (drag slows it, it rises a little and swells). @param {object} p billow @param {number} age seconds since it left @returns {{x: number, y: number, s: number, rot: number, a: number}} look */
  function billowAt(p, age) {
    const go = (1 - Math.exp(-DRAG * age)) / DRAG;
    return {
      x: p.ox + p.vx * go, y: p.oy + p.vy * go - 12 * sc * age,
      s: p.s0 + (p.s1 - p.s0) * (1 - Math.exp(-age * 1.4)), rot: p.rot + p.spin * go, a: p.a * smooth(age / 0.12),
    };
  }

  /** Draw one sprite turned and scaled into the layer. @param {CanvasRenderingContext2D} b layer context @param {HTMLCanvasElement} img sprite @param {object} q {x, y, s, rot, a} @returns {void} */
  function puffAt(b, img, q) {
    if (q.a <= 0.004 || q.x + q.s < 0 || q.x - q.s > W || q.y + q.s < 0 || q.y - q.s > H) return;
    b.setTransform(scale, 0, 0, scale, 0, 0);
    b.translate(q.x, q.y);
    b.rotate(q.rot);
    b.globalAlpha = clamp(q.a, 0, 1);
    b.drawImage(img, -q.s / 2, -q.s / 2, q.s, q.s);
  }

  return {
    /**
     * Draw the smoke for these levels: the two rolling mist strips, the billows, then the colour of the day.
     * @param {CanvasRenderingContext2D} c stage context (CSS px)
     * @param {object} L levels (stage-logic.js stageLevels)
     * @param {number} t scene time in seconds (frozen when still)
     * @returns {void}
     */
    draw(c, L, t) {
      if (L.smoke <= 0.01) return;
      const buf = kit.buffer('stage-smoke', W, H, scale);
      const b = buf.ctx;
      const floorH = H * (W > H ? 0.24 : 0.17);
      for (const [k, s] of [{ h: 1, v: 14, a: 0.75 }, { h: 1.3, v: -22, a: 0.55 }].entries()) {
        const bh = floorH * s.h * (0.7 + 0.3 * L.smoke); // the mist rises as it rolls in
        const bw = bh * 4;
        const y0 = H - bh * (k ? 0.85 : 1);
        const off = ((t * s.v * sc + k * bw * 0.37) % bw + bw) % bw;
        b.setTransform(scale, 0, 0, scale, 0, 0);
        b.globalAlpha = s.a;
        for (let x = -off; x < W; x += bw) b.drawImage(fog, x, y0, bw + 1, bh);
      }
      if (!plan.still) for (const p of puffs) { const age = t - start - p.delay; if (age > 0) puffAt(b, billows[p.kind], billowAt(p, age)); }
      b.setTransform(scale, 0, 0, scale, 0, 0);
      b.globalAlpha = 0.78; // a little of the puffs' own light and shade stays
      b.globalCompositeOperation = 'source-atop'; // keeps the smoke's see-through shape, changes its colour
      if (!tint) {
        tint = b.createLinearGradient(0, H * 0.6, 0, H);
        tint.addColorStop(0, rgba(look.smokeTop, 1));
        tint.addColorStop(1, rgba(look.smoke, 1));
      }
      b.fillStyle = tint;
      b.fillRect(0, 0, W, H);
      b.globalAlpha = 1;
      b.globalCompositeOperation = 'source-over';
      c.globalAlpha = clamp(L.smoke * (look.villain ? 0.95 : 0.85), 0, 1);
      c.drawImage(buf.canvas, 0, 0, W, H);
      if (look.villain) { // the Evil Horn's smoke glows violet from below
        const g = kit.glow('170,90,255');
        const r = Math.max(W, H) * 0.55;
        c.globalCompositeOperation = 'lighter';
        c.globalAlpha = clamp(L.smoke * 0.32, 0, 1);
        c.drawImage(g, W / 2 - r, H - r * 0.45, r * 2, r * 0.9);
        c.globalCompositeOperation = 'source-over';
      }
      c.globalAlpha = 1;
    },
    /** Counts for checks. @returns {object} state */
    state: () => ({ billows: puffs.length, scale }),
  };
}
