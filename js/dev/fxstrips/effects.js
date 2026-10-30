// This page's own effects for the effect strips (fx-strips.html, developer only), written to the light test page's
// effect interface (README at the top of js/dev/fx/core.js). They read env.opt (their fx entry in the strip) and
// env.pt(x, y) (drawing units to panel px). Cartoon only: soft light, gem sand and sparkle.
//   dark   the lights go out: a dark wash that fades in, with an optional soft glow where light still spills in
//   gems   the Unicorn zit's pop: a fountain of fine gem sand (diamond, sapphire, emerald, ruby) that rains down and
//          settles on the floor, glitter that hangs and twinkles, a pastel rainbow ring (ideas from popfx/i.js)
//   prism  rainbow light: soft pastel rays fanning out from a point and sweeping slowly, with a pearly halo
//   pearl  a pearly glow and little four-point glints twinkling round a point
//   flash  a quick flash of light over the whole panel (a CLUNK, a POP)
//   stars  big cartoon result stars that pop in one by one (one per Fire), with a ring of sparkles
import { clamp, smooth, TAU, rgba } from '../fx/sprites.js';

const INK = '#2a211d';
// The gem sand's colours (popfx/i.js): diamond white and ice, sapphire, emerald, ruby (pinkish, never like blood).
const SAND = ['#ffffff', '#3f7ff2', '#2cc27a', '#ff4f93', '#d9f0ff', '#a9caff', '#a4f3c6', '#ffb8d4', '#ffffff', '#1b3c99', '#117443', '#bd1f62'];
const RAINBOW = ['255,150,205', '255,214,150', '255,246,160', '160,240,190', '150,205,255', '196,170,255'];

/**
 * A four-point star path (the game's sparkle shape) round (x, y).
 * @param {CanvasRenderingContext2D} c context @param {number} x centre x @param {number} y centre y @param {number} z ray length
 * @returns {void}
 */
function starPath(c, x, y, z) {
  const p = z * 0.2;
  c.beginPath();
  c.moveTo(x, y - z);
  c.quadraticCurveTo(x + p, y - p, x + z, y);
  c.quadraticCurveTo(x + p, y + p, x, y + z);
  c.quadraticCurveTo(x - p, y + p, x - z, y);
  c.quadraticCurveTo(x - p, y - p, x, y - z);
  c.closePath();
}

/**
 * Darkness: the lights go out (fades in from nothing over opt.fadeIn seconds to opt.a), with an optional soft glow
 * of light spilling in at opt.glow {x, y, r, rgb} (drawing units). Fire: fade to opt.a2 (default 0) over opt.fade2.
 * @param {object} env the panel's env
 * @returns {object} hooks
 */
function makeDark(env) {
  const { W, H, still } = env;
  const o = env.opt;
  const rgb = o.rgb ?? '14,8,30';
  const target = o.a ?? 0.85;
  const fadeIn = still ? 0 : (o.fadeIn ?? 0.8);
  const glow = o.glow ? { ...o.glow, p: env.pt(o.glow.x, o.glow.y), r: o.glow.r * env.k } : null;
  const halo = glow ? env.glow(glow.rgb ?? '190,140,255') : null;
  const hole = glow ? env.glow('255,255,255') : null;
  let t = 0;
  let from = 0;
  let to = target;
  let t0 = 0;
  let dur = fadeIn;
  /** How dark it is now. @returns {number} 0..1 */
  const level = () => (dur <= 0 ? to : from + (to - from) * smooth((t - t0) / dur));
  return {
    /** Move the fade on. @param {number} dt seconds @returns {void} */
    step(dt) { t += dt; },
    /** The dark wash, with a soft hole and glow where light spills in. @param {CanvasRenderingContext2D} c context @returns {void} */
    draw(c) {
      const a = level();
      if (a <= 0.005) return;
      if (!glow) { c.fillStyle = rgba(rgb, a); c.fillRect(0, 0, W, H); return; }
      const b = env.buffer('dark', 0.25);
      b.ctx.fillStyle = rgba(rgb, 1);
      b.ctx.fillRect(0, 0, W, H);
      b.ctx.globalCompositeOperation = 'destination-out';
      b.ctx.globalAlpha = 0.75;
      b.ctx.drawImage(hole, glow.p[0] - glow.r, glow.p[1] - glow.r, glow.r * 2, glow.r * 2);
      c.globalAlpha = a;
      c.drawImage(b.canvas, 0, 0, W, H);
      c.globalCompositeOperation = 'lighter';
      c.globalAlpha = a * 0.5;
      c.drawImage(halo, glow.p[0] - glow.r, glow.p[1] - glow.r, glow.r * 2, glow.r * 2);
    },
    /** Fade to the second level (lights back up). @returns {void} */
    trigger() { from = level(); to = o.a2 ?? 0; t0 = t; dur = still ? 0 : (o.fade2 ?? 0.6); },
    /** For checks. @returns {object} state */
    state: () => ({ dark: Number(level().toFixed(2)) }),
  };
}

/**
 * Paint one gem grain sprite: a little cut gem (a rhombus with a light and a dark facet and a thin dark rim).
 * @param {CanvasRenderingContext2D} c the sprite's context @param {number} w size @param {string} col colour
 * @returns {void}
 */
function paintGem(c, w, col) {
  const m = w / 2;
  const r = w * 0.42;
  c.beginPath(); c.moveTo(m, m - r); c.lineTo(m + r * 0.8, m); c.lineTo(m, m + r); c.lineTo(m - r * 0.8, m); c.closePath();
  c.fillStyle = col;
  c.fill();
  c.fillStyle = 'rgba(255,255,255,0.55)';
  c.beginPath(); c.moveTo(m, m - r); c.lineTo(m + r * 0.8, m); c.lineTo(m, m); c.closePath(); c.fill();
  c.fillStyle = 'rgba(20,20,60,0.25)';
  c.beginPath(); c.moveTo(m, m + r); c.lineTo(m - r * 0.8, m); c.lineTo(m, m); c.closePath(); c.fill();
  c.strokeStyle = 'rgba(42,33,60,0.7)';
  c.lineWidth = Math.max(1, w * 0.07);
  c.beginPath(); c.moveTo(m, m - r); c.lineTo(m + r * 0.8, m); c.lineTo(m, m + r); c.lineTo(m - r * 0.8, m); c.closePath(); c.stroke();
}

/**
 * The Unicorn zit's gem sand pop. opt: p [x, y] (drawing units, where it bursts), floor (drawing units, where the
 * sand lands; default the room's floor), n (grains), up (how high, share of the panel height), spread (sideways),
 * pre (seconds already gone by at the burst: the sand has landed). Fire: the burst. Still: the sand is shown settled.
 * @param {object} env the panel's env
 * @returns {object} hooks
 */
function makeGems(env) {
  const { W, H, sc, still } = env;
  const o = env.opt;
  const [ox, oy] = env.pt(...(o.p ?? [500, 400]));
  const floor = o.floor !== undefined ? o.floor * env.k : env.room.floorY + (H - env.room.floorY) * 0.5;
  const sprites = SAND.map((col) => env.sprite(`gem:${col}`, 16, 16, (c, w) => paintGem(c, w, col)));
  const glint = env.dot('255,255,255', 0.2);
  const grains = [];
  const glitter = [];
  let tt = -1; // seconds since the burst
  let fired = 0;

  /** The burst: grains shot up in a fountain, glitter scattered round the pop. @returns {void} */
  function burst() {
    fired += 1;
    tt = 0;
    const n = env.count(o.n ?? 150);
    for (let i = 0; i < n; i += 1) {
      const a = -Math.PI / 2 + (env.rand() - 0.5) * (o.spread ?? 2.2);
      const v = H * (o.up ?? 1.1) * (0.45 + env.rand() * 0.6);
      grains.push({
        x: ox, y: oy, vx: Math.cos(a) * v * 0.75, vy: Math.sin(a) * v, s: (3 + env.rand() * 4.5) * sc,
        img: sprites[Math.floor(env.rand() * sprites.length)], rot: env.rand() * TAU, vr: (env.rand() - 0.5) * 14,
        rest: false, ph: env.rand() * TAU, landX: 0, age: -env.rand() * 0.15, floorY: floor + (env.rand() - 0.5) * H * 0.06,
      });
    }
    for (let i = 0, m = env.count(36); i < m; i += 1) {
      const a = env.rand() * TAU;
      const d = Math.min(W, H) * (0.1 + env.rand() * 0.42);
      glitter.push({ x: ox + Math.cos(a) * d, y: oy + Math.sin(a) * d * 0.8, vy: (4 + env.rand() * 8) * sc, s: (2.5 + env.rand() * 4) * sc, ph: env.rand() * TAU, w: 2 + env.rand() * 3, col: SAND[i % 8] });
    }
    const pre = still ? 4 : (o.pre ?? 0); // opt.pre: seconds already gone by (the sand has landed when the panel opens)
    if (pre > 0) {
      for (const g of grains) { for (let k = 0; k < pre * 30; k += 1) move(g, 1 / 30); }
      tt = pre;
    }
  }

  /** Move one grain: a fountain arc, a little bounce on the floor, then it lies there. @param {object} g grain @param {number} dt seconds @returns {void} */
  function move(g, dt) {
    g.age += dt;
    if (g.age < 0 || g.rest) return;
    g.vy += H * 1.6 * dt;
    g.vx *= Math.exp(-0.6 * dt);
    g.x += g.vx * dt;
    g.y += g.vy * dt;
    g.rot += g.vr * dt;
    if (g.y > g.floorY && g.vy > 0) {
      g.y = g.floorY;
      if (g.vy > H * 0.25) { g.vy *= -0.3; g.vx *= 0.5; } else { g.rest = true; g.rot = Math.round(g.rot / (Math.PI / 2)) * (Math.PI / 2) + 0.3; }
    }
  }

  return {
    /** Move the sand and glitter on. @param {number} dt seconds @returns {void} */
    step(dt) {
      if (tt >= 0) tt += dt;
      if (still) return;
      for (const g of grains) move(g, dt);
      for (const g of glitter) { g.y += g.vy * dt; if (g.y > floor) g.y = floor; }
    },
    /** The rainbow ring, the grains, the glitter. @param {CanvasRenderingContext2D} c context @returns {void} */
    draw(c) {
      const t = still ? 1 : env.t;
      if (tt >= 0 && tt < 0.9 && !still) { // the soft rainbow ring that spreads out at the pop
        const u = tt / 0.9;
        const R = Math.min(W, H) * (0.05 + 0.4 * smooth(u));
        c.globalAlpha = (1 - u) * 0.85;
        c.lineWidth = Math.max(2, 7 * sc * (1 - u * 0.6));
        c.lineCap = 'round';
        for (let i = 0; i < 12; i += 1) {
          const a0 = (i / 12) * TAU + tt * 1.5;
          c.strokeStyle = `hsl(${(i / 12) * 360}, 90%, 80%)`;
          c.beginPath(); c.arc(ox, oy, R, a0, a0 + TAU / 12 + 0.02); c.stroke();
        }
      }
      c.globalAlpha = 1;
      for (const g of grains) {
        if (g.age < 0) continue;
        c.save();
        c.translate(g.x, g.y);
        c.rotate(g.rot);
        c.drawImage(g.img, -g.s / 2, -g.s / 2, g.s, g.s);
        c.restore();
      }
      c.globalCompositeOperation = 'lighter'; // a few resting grains catch the light now and then
      for (const [i, g] of grains.entries()) {
        if (i % 6) continue;
        const k = Math.max(0, Math.sin(t * 2.2 + g.ph)) ** 8;
        if (k < 0.05 || g.age < 0) continue;
        const z = g.s * 3.2 * k;
        c.globalAlpha = k;
        c.drawImage(glint, g.x - z / 2, g.y - z / 2, z, z);
      }
      c.globalCompositeOperation = 'source-over';
      for (const g of glitter) { // hanging glitter: little four-point stars that twinkle
        const k = still ? 0.8 : Math.max(0, Math.sin(t * g.w + g.ph));
        if (k < 0.08) continue;
        c.globalAlpha = k;
        c.fillStyle = g.col === '#ffffff' ? '#fffdf0' : g.col;
        starPath(c, g.x, g.y, g.s * (0.6 + 0.5 * k));
        c.fill();
        c.strokeStyle = 'rgba(126,100,163,0.6)';
        c.lineWidth = 1;
        c.stroke();
      }
      c.globalAlpha = 1;
    },
    /** The burst. @returns {void} */
    trigger: burst,
    /** For checks. @returns {object} state */
    state: () => ({ fired, grains: grains.length, resting: grains.filter((g) => g.rest).length }),
  };
}

/**
 * Paint one soft ray sprite (pointing right, the start at the left): narrow at the start, wide and faint far off.
 * @param {CanvasRenderingContext2D} c the sprite's context @param {number} w length @param {number} h width at the far end
 * @param {string} rgb colour "r,g,b"
 * @returns {void}
 */
function paintRay(c, w, h, rgb) {
  const img = c.createImageData(w, h);
  const [r, g, b] = rgb.split(',').map(Number);
  for (let x = 0; x < w; x += 1) {
    const u = x / w;
    const half = (h / 2) * (0.08 + 0.92 * u);
    const along = smooth(u / 0.06) * (1 - u) ** 1.3;
    for (let y = 0; y < h; y += 1) {
      const across = Math.abs(y - h / 2) / half;
      if (across >= 1) continue;
      const a = (1 - smooth(across)) * along;
      const p = (y * w + x) * 4;
      img.data[p] = r; img.data[p + 1] = g; img.data[p + 2] = b; img.data[p + 3] = Math.round(a * 255);
    }
  }
  c.putImageData(img, 0, 0);
}

/**
 * Rainbow light from a point: soft pastel rays fanning out round opt.dir (radians, default straight up) and sweeping
 * slowly, a pearly halo at the point. opt: p [x, y], n rays, len (share of the panel's diagonal), dir, spread, a.
 * It grows in over opt.grow seconds. Fire: a bright flare that settles.
 * @param {object} env the panel's env
 * @returns {object} hooks
 */
function makePrism(env) {
  const { W, H, still } = env;
  const o = env.opt;
  const [ox, oy] = env.pt(...(o.p ?? [500, 400]));
  const n = o.n ?? 7;
  const len = Math.hypot(W, H) * (o.len ?? 0.9);
  const dir = o.dir ?? -Math.PI / 2;
  const spread = o.spread ?? 2.6;
  const rays = Array.from({ length: n }, (_, i) => ({
    rgb: RAINBOW[i % RAINBOW.length], off: (n > 1 ? i / (n - 1) - 0.5 : 0) * spread, ph: env.rand() * TAU, sp: 0.35 + env.rand() * 0.3,
    half: 0.07 + env.rand() * 0.05,
  }));
  const sprites = Object.fromEntries(RAINBOW.map((rgb) => [rgb, env.sprite(`ray:${rgb}`, 256, 64, (c, w, h) => paintRay(c, w, h, rgb), 1)]));
  const halo = env.glow('240,220,255');
  const core = env.dot('255,255,255', 0.25);
  let t = 0;
  let flare = -1;
  /** How strong it is now (grows in, flares on Fire). @returns {number} strength */
  const strength = () => (still ? 1 : smooth(t / (o.grow ?? 1.2))) * (o.a ?? 0.8) + (flare >= 0 ? 0.9 * Math.exp(-flare * 2.2) : 0);
  return {
    /** Move the sweep and the flare on. @param {number} dt seconds @returns {void} */
    step(dt) { t += dt; if (flare >= 0) flare += dt; },
    /** The rays (added light, drawn small and stretched), then the halo and the bright point. @param {CanvasRenderingContext2D} c context @returns {void} */
    draw(c) {
      const k = strength();
      if (k <= 0.01) return;
      const b = env.buffer('prism', 0.5);
      b.ctx.globalCompositeOperation = 'lighter';
      for (const r of rays) {
        const a = dir + r.off + (still ? 0 : Math.sin(t * r.sp + r.ph) * 0.18);
        const hw = len * Math.tan(r.half) * (1 + (flare >= 0 ? 0.4 * Math.exp(-flare * 2) : 0));
        b.ctx.save();
        b.ctx.translate(ox, oy);
        b.ctx.rotate(a);
        b.ctx.globalAlpha = 0.85;
        b.ctx.drawImage(sprites[r.rgb], 0, -hw, len, hw * 2);
        b.ctx.restore();
      }
      c.globalCompositeOperation = 'lighter';
      c.globalAlpha = clamp(k * 0.75, 0, 1);
      c.drawImage(b.canvas, 0, 0, W, H);
      const z = Math.min(W, H) * (0.22 + 0.04 * Math.sin(t * 2.1));
      c.globalAlpha = clamp(k * 0.6, 0, 1);
      c.drawImage(halo, ox - z, oy - z, z * 2, z * 2);
      const zc = Math.min(W, H) * 0.05;
      c.globalAlpha = clamp(k, 0, 1);
      c.drawImage(core, ox - zc, oy - zc, zc * 2, zc * 2);
    },
    /** A bright flare. @returns {void} */
    trigger() { flare = 0; },
    /** For checks. @returns {object} state */
    state: () => ({ strength: Number(strength().toFixed(2)) }),
  };
}

/**
 * A pearly glow and little white four-point glints twinkling round a point. opt: p [x, y], r (drawing units, how far
 * the glints sit), n glints, rgb (glow colour). Fire: every glint flashes at once.
 * @param {object} env the panel's env
 * @returns {object} hooks
 */
function makePearl(env) {
  const { sc, still } = env;
  const o = env.opt;
  const [ox, oy] = env.pt(...(o.p ?? [500, 400]));
  const R = (o.r ?? 60) * env.k;
  const halo = env.glow(o.rgb ?? '236,214,255');
  const glints = Array.from({ length: o.n ?? 6 }, (_, i) => ({ a: i * 2.4 + env.rand(), d: 0.6 + env.rand() * 0.7, w: 1.6 + env.rand() * 2.2, ph: env.rand() * TAU, s: (5 + env.rand() * 5) * sc }));
  let t = 0;
  let pop = -1;
  return {
    /** Move the twinkle on. @param {number} dt seconds @returns {void} */
    step(dt) { t += dt; if (pop >= 0) pop += dt; },
    /** The glow (added light) and the glints. @param {CanvasRenderingContext2D} c context @returns {void} */
    draw(c) {
      const tt = still ? 1 : t;
      const boost = pop >= 0 ? Math.exp(-pop * 2.5) : 0;
      c.globalCompositeOperation = 'lighter';
      c.globalAlpha = clamp(0.55 + 0.15 * Math.sin(tt * 2.3) + boost * 0.4, 0, 1);
      const z = R * (1.7 + 0.5 * boost);
      c.drawImage(halo, ox - z, oy - z, z * 2, z * 2);
      c.globalCompositeOperation = 'source-over';
      for (const g of glints) {
        const k = still ? 0.75 : Math.max(boost, Math.max(0, Math.sin(tt * g.w + g.ph)) ** 3);
        if (k < 0.05) continue;
        const x = ox + Math.cos(g.a + tt * 0.2) * R * g.d;
        const y = oy + Math.sin(g.a + tt * 0.2) * R * g.d;
        c.globalAlpha = k;
        c.fillStyle = '#fffdf6';
        starPath(c, x, y, g.s * (0.6 + 0.6 * k));
        c.fill();
        c.strokeStyle = 'rgba(126,100,163,0.75)';
        c.lineWidth = 1.2;
        c.stroke();
      }
      c.globalAlpha = 1;
    },
    /** Every glint flashes. @returns {void} */
    trigger() { pop = 0; },
  };
}

/**
 * A quick flash of light over the whole panel (screen space). opt: rgb, a (how bright). Fire: the flash.
 * @param {object} env the panel's env
 * @returns {object} hooks
 */
function makeFlash(env) {
  const { W, H, still } = env;
  const o = env.opt;
  let t = -1;
  return {
    /** Move the flash on. @param {number} dt seconds @returns {void} */
    step(dt) { if (t >= 0) t += dt; },
    /** The flash, fading fast. @param {CanvasRenderingContext2D} c context @returns {void} */
    draw(c) {
      if (t < 0) return;
      const k = (o.a ?? 0.8) * (still ? 0.3 * Math.sin(Math.min(1, t / 0.6) * Math.PI) : Math.exp(-t * 7));
      if (k < 0.01) return;
      c.globalCompositeOperation = 'lighter';
      c.fillStyle = rgba(o.rgb ?? '255,250,230', k);
      c.fillRect(0, 0, W, H);
    },
    /** Flash now. @returns {void} */
    trigger() { t = 0; },
  };
}

/**
 * Paint a big five-point cartoon star sprite (gold, a lighter top, an ink outline).
 * @param {CanvasRenderingContext2D} c the sprite's context @param {number} w size
 * @returns {void}
 */
function paintStar(c, w) {
  const m = w / 2;
  /** The star outline at a size. @param {number} r radius @param {number} dx shift x @param {number} dy shift y @returns {void} */
  const shape = (r, dx, dy) => {
    c.beginPath();
    for (let i = 0; i < 10; i += 1) {
      const a = -Math.PI / 2 + (i * Math.PI) / 5;
      const k = i % 2 ? 0.46 : 1;
      const x = m + dx + Math.cos(a) * r * k;
      const y = m + dy + Math.sin(a) * r * k;
      if (i) c.lineTo(x, y); else c.moveTo(x, y);
    }
    c.closePath();
  };
  c.lineJoin = 'round';
  shape(w * 0.44, 0, 0);
  c.fillStyle = '#ffd25a';
  c.fill();
  c.lineWidth = w * 0.05;
  c.strokeStyle = INK;
  c.stroke();
  shape(w * 0.22, -w * 0.04, -w * 0.06);
  c.fillStyle = 'rgba(255,243,196,0.75)';
  c.fill();
}

/**
 * Result stars that pop in one by one. opt: spots [[x, y, r], ...] (drawing units). Each Fire pops the next star in
 * with a bounce and a ring of sparkles; they stay and shine now and then.
 * @param {object} env the panel's env
 * @returns {object} hooks
 */
function makeStars(env) {
  const { sc, still } = env;
  const o = env.opt;
  const img = env.sprite('fxs-star', 96, 96, paintStar);
  const glint = env.dot('255,250,220', 0.2);
  const stars = (o.spots ?? []).map(([x, y, r]) => ({ p: env.pt(x, y), r: r * env.k, born: -1 }));
  let t = 0;
  let shown = 0;
  return {
    /** Move the clock on. @param {number} dt seconds @returns {void} */
    step(dt) { t += dt; },
    /** The stars (popping in), their sparkle rings and shines. @param {CanvasRenderingContext2D} c context @returns {void} */
    draw(c) {
      for (const [i, s] of stars.entries()) {
        if (s.born < 0) continue;
        const a = t - s.born;
        const pop = still ? 1 : a < 0.18 ? smooth(a / 0.18) * 1.3 : 1 + 0.3 * Math.exp(-(a - 0.18) * 9) * Math.cos((a - 0.18) * 20);
        const z = s.r * 2.2 * pop;
        c.save();
        c.translate(s.p[0], s.p[1]);
        c.rotate((still ? 0 : (1 - Math.min(1, a / 0.4)) * -0.5) + (i - 1) * 0.12);
        c.drawImage(img, -z / 2, -z / 2, z, z);
        c.restore();
        if (!still && a < 0.7) { // the sparkle ring
          const u = a / 0.7;
          c.fillStyle = '#fff6c8';
          c.strokeStyle = INK;
          c.lineWidth = 1.2;
          c.globalAlpha = 1 - u;
          for (let k = 0; k < 8; k += 1) {
            const ang = (k / 8) * TAU + i;
            const d = s.r * (1.1 + 1.3 * smooth(u));
            starPath(c, s.p[0] + Math.cos(ang) * d, s.p[1] + Math.sin(ang) * d, 6 * sc * (1 - u * 0.5));
            c.fill();
            c.stroke();
          }
          c.globalAlpha = 1;
        }
        const sh = still ? 0 : Math.max(0, Math.sin(t * 1.7 + i * 2)) ** 12; // a shine now and then
        if (sh > 0.05) {
          c.globalCompositeOperation = 'lighter';
          c.globalAlpha = sh;
          const g = s.r * 1.4;
          c.drawImage(glint, s.p[0] + s.r * 0.35 - g / 2, s.p[1] - s.r * 0.45 - g / 2, g, g);
          c.globalCompositeOperation = 'source-over';
          c.globalAlpha = 1;
        }
      }
    },
    /** Pop the next star in. @returns {void} */
    trigger() { if (shown < stars.length) { stars[shown].born = t; shown += 1; } },
    /** For checks. @returns {object} state */
    state: () => ({ shown }),
  };
}

/** This page's effects, in the light test page's module shape (id, layer, order, make). */
export const STRIP_EFFECTS = [
  { id: 'dark', num: 21, name: 'Dark', layer: 'front', order: 30, make: makeDark },
  { id: 'gems', num: 22, name: 'Gems', layer: 'front', order: 85, make: makeGems },
  { id: 'prism', num: 23, name: 'Prism', layer: 'front', order: 62, make: makePrism },
  { id: 'pearl', num: 24, name: 'Pearl', layer: 'front', order: 75, make: makePearl },
  { id: 'flash', num: 25, name: 'Flash', layer: 'glass', order: 90, make: makeFlash },
  { id: 'stars', num: 26, name: 'Stars', layer: 'front', order: 88, make: makeStars },
];
