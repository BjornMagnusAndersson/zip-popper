// Effect 2 for the light test page (fx-test.html): smoke and haze. A handful of big soft lumpy puffs (painted once
// as sprites, then only moved) drift slowly, turning and breathing in size, at three depths: the far ones behind the
// customer, the nearer ones in front. A low floor fog rolls along the bottom. Everything is tinted by the mood: warm
// grey in the studio, violet-pink in the party. It is drawn small into low-res buffers and stretched over the stage
// (smoke is soft, so nobody sees the low resolution, and it costs very little). Its haze picture is left in
// env.shared.haze, so the disco beams can light it up as shafts. Fire: a smoke-machine burst from the floor at one
// side (for a boss entrance) that billows out and settles into the haze. Still: a calm haze that stands still.
// See the README in core.js for the effect interface.
import { rng } from '../../pop/logic.js';
import { clamp, smooth, TAU, rgba } from './sprites.js';

const PUFF_PX = 128; // the puff sprites' size (they are soft, so this is plenty)
const PUFF_KINDS = 4;

/**
 * Paint one lumpy smoke puff (light grey, see-through): a cluster of round blobs, each lit from the top left and
 * shaded below, drawn top to bottom so the lower lumps' lit tops show against the shade of the ones above (a cartoon
 * cloud); wisps cut out with cloudy noise, and a soft round edge so it never shows a hard rim. soft = a thin, hazy
 * version for the background haze; else a thick billow for the smoke machine.
 * @param {CanvasRenderingContext2D} c the sprite's context
 * @param {number} w the sprite's size
 * @param {number} seed which puff
 * @param {HTMLCanvasElement} noise a cloudy noise sprite
 * @param {boolean} soft the hazy version
 * @returns {void}
 */
function paintPuff(c, w, seed, noise, soft) {
  const rand = rng(seed);
  const blobs = [];
  for (let k = 0; k < (soft ? 11 : 10); k += 1) {
    const a = rand() * TAU;
    const d = Math.sqrt(rand()) * w * 0.21;
    blobs.push({ x: w / 2 + Math.cos(a) * d, y: w / 2 + Math.sin(a) * d * 0.72, r: w * (0.12 + rand() * 0.12) });
  }
  blobs.sort((p, q) => p.y - q.y);
  const A = soft ? 0.5 : 0.95;
  for (const { x, y, r } of blobs) {
    const g = c.createRadialGradient(x - r * 0.3, y - r * 0.35, 0, x, y, r);
    g.addColorStop(0, `rgba(255,255,255,${A})`);
    g.addColorStop(soft ? 0.45 : 0.6, `rgba(236,236,242,${A * 0.92})`);
    g.addColorStop(soft ? 0.8 : 0.86, `rgba(200,198,212,${A * 0.38})`);
    g.addColorStop(1, 'rgba(190,188,204,0)');
    c.fillStyle = g;
    c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill();
  }
  c.globalCompositeOperation = 'destination-out'; // wisps and holes
  c.globalAlpha = soft ? 0.55 : 0.32;
  const ox = -rand() * w;
  const oy = -rand() * w;
  c.drawImage(noise, ox, oy, w * 2, w * 2);
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
 * Paint the floor fog band (white, see-through): soft blobs along a strip that tiles left to right, thicker at the
 * bottom, with cloudy holes.
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
      g.addColorStop(0, 'rgba(255,255,255,0.5)');
      g.addColorStop(1, 'rgba(255,255,255,0)');
      c.fillStyle = g;
      c.fillRect(x + dx - r, y - r, r * 2, r * 2);
    }
  }
  c.globalCompositeOperation = 'destination-out';
  c.globalAlpha = 0.5;
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
 * Make the smoke for this scene.
 * @param {object} env the page's env (see core.js README)
 * @returns {object} hooks
 */
function make(env) {
  const { W, H, sc, party, still, room } = env;
  const big = Math.max(W, H);
  const scale = env.lite ? 0.35 : 0.5; // buffer pixels per CSS px
  const noise = env.noise(128, 31, 5);
  const puffs = []; // the thin hazy puffs
  const billows = []; // the thick ones for the smoke machine
  for (let k = 0; k < PUFF_KINDS; k += 1) {
    puffs.push(env.sprite(`puff:${k}`, PUFF_PX, PUFF_PX, (c, w) => paintPuff(c, w, 101 + k * 17, noise, true), 1));
    billows.push(env.sprite(`billow:${k}`, PUFF_PX, PUFF_PX, (c, w) => paintPuff(c, w, 301 + k * 23, noise, false), 1));
  }
  const fog = env.sprite('fog', 512, 128, (c, w, h) => paintFog(c, w, h, noise), 1);
  // The mood's smoke colours: a lighter top and the mood colour lower down.
  const tint = party ? '214,150,240' : ['204,208,190', '232,222,204', '244,242,238'][env.tier];
  const top = party ? '255,206,246' : ['236,234,218', '250,242,228', '255,255,252'][env.tier];
  const thick = party ? 1.25 : [1.05, 0.9, 0.75][env.tier]; // the dingy studio is the smokiest
  // The drifting haze: three depths (0 far, behind the face; 1 and 2 in front).
  const DEPTH = [
    { n: 7, size: 0.42, a: 0.62, v: 5 },
    { n: 5, size: 0.6, a: 0.42, v: 8 },
    { n: 3, size: 0.85, a: 0.26, v: 12 },
  ];
  const haze = [];
  for (const [d, o] of DEPTH.entries()) {
    const n = env.count(o.n);
    for (let i = 0; i < n; i += 1) {
      const s = big * o.size * (0.8 + env.rand() * 0.4);
      haze.push({
        d, s, kind: Math.floor(env.rand() * PUFF_KINDS),
        x: -s * 0.3 + ((i + env.rand() * 0.8) / n) * (W + s * 0.6),
        y: H * (0.04 + env.rand() ** 1.4 * 0.8), // smoke rises: more of it up high, where the beams start

        rot: env.rand() * TAU, spin: (env.rand() - 0.5) * 0.08,
        vx: o.v * sc * (0.7 + env.rand() * 0.6), vy: (env.rand() - 0.5) * 2 * sc,
        a: o.a * thick * (0.75 + env.rand() * 0.5), ph: env.rand() * TAU,
      });
    }
  }
  const burst = []; // the smoke machine's puffs
  let side = 1; // sides take turns, the first burst comes from the left
  let fired = 0; // bursts so far

  /** Seconds the drawing uses for drifting things (frozen when still). @returns {number} seconds */
  const clock = () => (still ? 0 : env.t);

  /** A smoke-machine burst from the floor at one side: puffs that shoot out low, billow up, slow down and settle. @returns {void} */
  function fire() {
    side = -side;
    fired += 1;
    const n = env.count(22);
    const ox = side < 0 ? -W * 0.02 : W * 1.02;
    const oy = room.floorY + (H - room.floorY) * 0.2;
    const dir = side < 0 ? 1 : -1;
    for (let i = 0; i < n; i += 1) {
      const up = 0.18 + env.rand() * 0.42; // radians above the floor
      const speed = (300 + env.rand() * 260) * sc * (1 - i / n * 0.35);
      const p = {
        x: ox, y: oy, vx: Math.cos(up) * speed * dir, vy: -Math.sin(up) * speed,
        s0: big * 0.05, s1: big * (0.28 + env.rand() * 0.3), age: -i * (0.85 / n), life: 7 + env.rand() * 2.5,
        rot: env.rand() * TAU, spin: (env.rand() - 0.5) * 1.2, kind: Math.floor(env.rand() * PUFF_KINDS), a: 0.75 + env.rand() * 0.25,
      };
      if (still) { // no motion: the cloud just fades in where it would settle, and fades away
        for (let k = 0; k < 150; k += 1) moveBurst(p, 1 / 60);
        p.age = -i * 0.02;
      }
      burst.push(p);
    }
  }

  /** Move one burst puff on: it slows down (air drag), floats up a little and grows. @param {object} p puff @param {number} dt seconds @returns {void} */
  function moveBurst(p, dt) {
    p.age += dt;
    if (p.age < 0) return;
    const drag = Math.exp(-2.1 * dt);
    p.vx *= drag;
    p.vy = p.vy * drag - 10 * sc * dt; // a gentle rise
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.spin *= Math.exp(-0.5 * dt);
    p.rot += p.spin * dt;
  }

  /** How big and how thick a burst puff is now. @param {object} p puff @returns {{s: number, a: number}} size and alpha */
  function burstLook(p) {
    const s = p.s0 + (p.s1 - p.s0) * (1 - Math.exp(-p.age * 1.25));
    const a = p.a * smooth(p.age / (still ? 0.8 : 0.12)) * (1 - smooth((p.age - 1.8) / (p.life - 1.8)));
    return { s, a };
  }

  /** Draw one puff sprite into a buffer. @param {CanvasRenderingContext2D} b buffer context @param {HTMLCanvasElement} img the sprite @param {number} x centre x @param {number} y centre y @param {number} s size @param {number} rot turn @param {number} a alpha @param {number} [stretch] wider than tall (haze lies in long wisps) @returns {void} */
  function puffAt(b, img, x, y, s, rot, a, stretch = 1) {
    const sw = s * stretch;
    if (a <= 0.004 || x + sw < 0 || x - sw > W || y + s < 0 || y - s > H) return;
    b.setTransform(scale, 0, 0, scale, 0, 0);
    b.translate(x, y);
    b.scale(stretch, 1 / Math.sqrt(stretch));
    b.rotate(rot);
    b.globalAlpha = clamp(a, 0, 1);
    b.drawImage(img, -s / 2, -s / 2, s, s);
  }

  /** Draw the drifting haze puffs of some depths into a buffer. @param {CanvasRenderingContext2D} b buffer context @param {number[]} depths which depths @returns {void} */
  function drawHaze(b, depths) {
    const t = clock();
    for (const p of haze) {
      if (!depths.includes(p.d)) continue;
      const breathe = 1 + 0.07 * Math.sin(t * 0.33 + p.ph);
      const flick = 0.85 + 0.15 * Math.sin(t * 0.21 + p.ph * 2);
      puffAt(b, puffs[p.kind], p.x, p.y, p.s * breathe, p.rot, p.a * flick, 1.9);
    }
  }

  /** The rolling floor fog: two strips at the bottom, the nearer one bigger and faster. @param {CanvasRenderingContext2D} b buffer context @returns {void} */
  function drawFog(b) {
    const t = clock();
    const floorH = H - room.floorY;
    for (const [k, o] of [{ h: 1, v: 9, a: 0.6 }, { h: 1.35, v: 16, a: 0.45 }].entries()) {
      const bh = Math.max(floorH * 2.6, H * 0.2) * o.h;
      const bw = bh * 4;
      const y0 = H - bh * (k ? 0.78 : 0.95);
      const off = ((t * o.v * sc + k * bw * 0.37) % bw + bw) % bw;
      b.setTransform(scale, 0, 0, scale, 0, 0);
      b.globalAlpha = clamp(o.a * thick, 0, 1);
      for (let x = -off; x < W; x += bw) b.drawImage(fog, x, y0, bw + 1, bh);
    }
    // Smoke rises: a thin layer of it hangs under the ceiling too (the same strip upside down), drifting the other way.
    const ch = H * 0.32;
    const cw = ch * 4;
    const off = ((-t * 6 * sc) % cw + cw) % cw;
    b.setTransform(scale, 0, 0, -scale, 0, ch * 0.9 * scale);
    b.globalAlpha = clamp(0.42 * thick, 0, 1);
    for (let x = -off; x < W; x += cw) b.drawImage(fog, x, 0, cw + 1, ch);
  }

  /** Colour a buffer's white smoke with the mood (lighter at the top, warmer near the lamp). @param {object} buf buffer @returns {void} */
  function tintBuffer(buf) {
    const b = buf.ctx;
    b.setTransform(scale, 0, 0, scale, 0, 0);
    b.globalAlpha = 0.75; // a quarter of the puffs' own light and shade stays
    b.globalCompositeOperation = 'source-atop'; // keeps the smoke's see-through shape, changes its colour
    const g = b.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, rgba(top, 1));
    g.addColorStop(0.7, rgba(tint, 1));
    g.addColorStop(1, rgba(tint, 1));
    b.fillStyle = g;
    b.fillRect(0, 0, W, H);
    if (!party) { // the ceiling bulb lights the smoke round it
      const L = room.lamp;
      const R = Math.min(W, H) * 0.55;
      const lg = b.createRadialGradient(L.x, L.y, 0, L.x, L.y, R);
      lg.addColorStop(0, 'rgba(255,240,196,0.75)');
      lg.addColorStop(1, 'rgba(255,240,196,0)');
      b.fillStyle = lg;
      b.globalAlpha = 1;
      b.fillRect(L.x - R, L.y - R, R * 2, R * 2);
    }
    b.globalAlpha = 1;
    b.globalCompositeOperation = 'source-over';
  }

  let backBuf = null;
  return {
    /** Drift the haze and move the burst on. @param {number} dt seconds @returns {void} */
    step(dt) {
      if (!still) {
        for (const p of haze) {
          p.x += p.vx * dt;
          p.y += p.vy * dt;
          p.rot += p.spin * dt;
          if (p.x - p.s > W) p.x = -p.s; // round again from the left
          if (p.y < H * 0.05 || p.y > H * 0.92) p.vy = -p.vy;
        }
      }
      for (const p of burst) {
        if (still) p.age += dt; else moveBurst(p, dt);
      }
      for (let i = burst.length - 1; i >= 0; i -= 1) if (burst[i].age > burst[i].life) burst.splice(i, 1);
    },
    /** The far haze, behind the customer. @param {CanvasRenderingContext2D} c stage context @returns {void} */
    back(c) {
      backBuf = env.buffer('smoke-back', scale);
      drawHaze(backBuf.ctx, [0]);
      tintBuffer(backBuf);
      c.drawImage(backBuf.canvas, 0, 0, W, H);
    },
    /** The near haze, the floor fog and the burst, in front; and the haze picture for the lights. @param {CanvasRenderingContext2D} c stage context @returns {void} */
    draw(c) {
      const buf = env.buffer('smoke-front', scale);
      const b = buf.ctx;
      drawHaze(b, [1, 2]);
      drawFog(b);
      for (const p of burst) {
        if (p.age < 0) continue;
        const { s, a } = burstLook(p);
        puffAt(b, billows[p.kind], p.x, p.y, s, p.rot, a);
      }
      tintBuffer(buf);
      c.drawImage(buf.canvas, 0, 0, W, H);
      // The haze picture for the light effects: the front smoke plus some of the far haze.
      const hz = env.buffer('smoke-haze', scale);
      hz.ctx.setTransform(1, 0, 0, 1, 0, 0);
      hz.ctx.drawImage(buf.canvas, 0, 0);
      if (backBuf) { hz.ctx.globalAlpha = 0.7; hz.ctx.drawImage(backBuf.canvas, 0, 0); hz.ctx.globalAlpha = 1; }
      env.shared.haze = { canvas: hz.canvas, scale };
    },
    /** A smoke-machine burst (sides take turns). @returns {void} */
    trigger: fire,
    /** Counts for checks. @returns {object} state */
    state: () => ({ haze: haze.length, burst: burst.length, fired, scale }),
  };
}

export default { id: 'smoke', num: 2, name: 'Smoke', layer: 'front', order: 40, make };
