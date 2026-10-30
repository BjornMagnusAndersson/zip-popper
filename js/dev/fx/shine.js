// Effect 4 for the light test page (fx-test.html): the sparkly clean look for the better studio tiers. Now and then a
// soft diagonal shine glides over something shiny in the room (the tiles, the sink, the sign, the spa's pink chair,
// the ring light), cut to that thing's shape, and small four-point glints pop and fade on it as it passes. Tiny
// sparkle motes float in the air instead of dust (more of them in the spa's daylight), and in the spa (tier 2) a few
// rose petals drift down, swaying and flipping over (one side squashed), land on the floor and fade.
// Fire: one big shine sweeps over the whole picture with a bright "ting" glint (and a soft ting sound, unless &mute).
// Tier 0: only a rare dull sweep over the tiles. Still: a calm still frame (a few glints, petals where they are).
// Lite: about half the motes and petals. See the README in core.js for the effect interface.
import { layerSpots } from '../../pop/backdrop.js';
import { clamp, smooth, lerp, TAU } from './sprites.js';
import { paintGlint } from './dust.js';

const SHINE = '255,250,236'; // the sweep's light: a warm white
const PETAL = ['#f59ab6', '#f7b2c6', '#ef8aa8']; // rose petal colours (front sides)
const PETAL_BACK = '#fcd6e1'; // the paler back side
const INK = 'rgba(42,33,29,0.45)';
const params = new URLSearchParams(location.search);

/**
 * Paint the soft shine band sprite (added as light): a soft vertical stripe of light, brightest in the middle.
 * @param {CanvasRenderingContext2D} c the sprite's context
 * @param {number} w width
 * @param {number} h height
 * @returns {void}
 */
function paintBand(c, w, h) {
  const g = c.createLinearGradient(0, 0, w, 0);
  g.addColorStop(0, `rgba(${SHINE},0)`);
  g.addColorStop(0.3, `rgba(${SHINE},0.25)`);
  g.addColorStop(0.47, `rgba(${SHINE},0.9)`);
  g.addColorStop(0.62, `rgba(${SHINE},0.25)`);
  g.addColorStop(1, `rgba(${SHINE},0)`);
  c.fillStyle = g;
  c.fillRect(0, 0, w, h);
  softEnds(c, w, h);
}

/**
 * Paint the gloss sprite (drawn over, like the cartoon shine on the sign): a wide and a thin stripe with crisp
 * edges, in one colour.
 * @param {CanvasRenderingContext2D} c the sprite's context
 * @param {number} w width
 * @param {number} h height
 * @param {string} rgb colour "r,g,b"
 * @returns {void}
 */
function paintGloss(c, w, h, rgb) {
  const g = c.createLinearGradient(0, 0, w, 0);
  for (const [at, a] of [[0, 0], [0.3, 0], [0.34, 0.85], [0.52, 0.85], [0.56, 0], [0.63, 0], [0.66, 0.75], [0.72, 0.75], [0.75, 0], [1, 0]]) {
    g.addColorStop(at, `rgba(${rgb},${a})`);
  }
  c.fillStyle = g;
  c.fillRect(0, 0, w, h);
  softEnds(c, w, h);
}

/** Fade a band sprite out at its two ends. @param {CanvasRenderingContext2D} c the sprite's context @param {number} w width @param {number} h height @returns {void} */
function softEnds(c, w, h) {
  const v = c.createLinearGradient(0, 0, 0, h);
  v.addColorStop(0, 'rgba(0,0,0,1)');
  v.addColorStop(0.15, 'rgba(0,0,0,0)');
  v.addColorStop(0.85, 'rgba(0,0,0,0)');
  v.addColorStop(1, 'rgba(0,0,0,1)');
  c.globalCompositeOperation = 'destination-out';
  c.fillStyle = v;
  c.fillRect(0, 0, w, h);
  c.globalCompositeOperation = 'source-over';
}

/**
 * Paint one rose petal (pointing up, base at the bottom): a rounded cup shape with a notch at the top, a darker
 * base, a soft vein, a thin ink edge.
 * @param {CanvasRenderingContext2D} c the sprite's context
 * @param {number} w width
 * @param {number} h height
 * @param {string} fill main colour
 * @returns {void}
 */
function paintPetal(c, w, h, fill) {
  const m = w / 2;
  c.beginPath();
  c.moveTo(m, h * 0.96);
  c.bezierCurveTo(w * 0.02, h * 0.7, w * 0.0, h * 0.12, w * 0.32, h * 0.06);
  c.quadraticCurveTo(m, h * 0.03, m, h * 0.1);
  c.quadraticCurveTo(m, h * 0.03, w * 0.68, h * 0.06);
  c.bezierCurveTo(w * 1.0, h * 0.12, w * 0.98, h * 0.7, m, h * 0.96);
  c.closePath();
  c.fillStyle = fill;
  c.fill();
  c.save();
  c.clip();
  const g = c.createLinearGradient(0, h, 0, 0);
  g.addColorStop(0, 'rgba(200,60,110,0.35)');
  g.addColorStop(0.45, 'rgba(200,60,110,0)');
  g.addColorStop(1, 'rgba(255,255,255,0.25)');
  c.fillStyle = g;
  c.fillRect(0, 0, w, h);
  c.strokeStyle = 'rgba(255,255,255,0.4)';
  c.lineWidth = Math.max(0.8, w * 0.05);
  c.beginPath(); c.moveTo(m, h * 0.9); c.quadraticCurveTo(m - w * 0.06, h * 0.5, m, h * 0.25); c.stroke();
  c.restore();
  c.strokeStyle = INK;
  c.lineWidth = Math.max(0.8, w * 0.05);
  c.stroke();
}

/** Play a soft bright "ting" (two sine tones, a quick fade), made on the spot with Web Audio. @returns {void} */
function ting() {
  if (params.has('mute') || params.has('shot')) return;
  try {
    const AC = globalThis.AudioContext ?? globalThis.webkitAudioContext;
    if (!AC) return;
    ting.ctx = ting.ctx ?? new AC();
    const ac = ting.ctx;
    const now = ac.currentTime;
    for (const [f, a, d] of [[2093, 0.07, 0.9], [3136, 0.035, 0.6], [4186, 0.015, 0.35]]) {
      const o = ac.createOscillator();
      const g = ac.createGain();
      o.type = 'sine';
      o.frequency.value = f;
      g.gain.setValueAtTime(0, now);
      g.gain.linearRampToValueAtTime(a, now + 0.005);
      g.gain.exponentialRampToValueAtTime(0.0001, now + d);
      o.connect(g).connect(ac.destination);
      o.start(now);
      o.stop(now + d + 0.05);
    }
  } catch { /* no sound: fine */ }
}

/**
 * The shiny things in the room a shine can glide over, for this scene: each has a path (its shape, for clipping), a
 * box and a few spots where glints pop.
 * @param {object} env the page's env
 * @returns {{id: string, path: (c: CanvasRenderingContext2D) => void, box: number[], hot: number[][]}[]} targets
 */
function shinyThings(env) {
  const { W, H, tier, room } = env;
  const land = W > H;
  const spots = layerSpots(W, H, false);
  const u = spots.u;
  const out = [];
  const t = Math.max(26, Math.min(54, Math.round(Math.min(W, H) / 8.5)));
  out.push({ // the tiles (the whole band of them)
    id: 'tiles', box: [0, room.tileTop, W, room.floorY - room.tileTop],
    /** The tiles' shape. @param {CanvasRenderingContext2D} c context @returns {void} */
    path: (c) => { c.rect(0, room.tileTop, W, room.floorY - room.tileTop); },
    hot: [0, 1, 2, 3, 4, 5].map((i) => [((i * 3 + 1) % Math.max(2, Math.floor(W / t))) * t + t * 0.8, room.tileTop + (i % 3) * t + t * 0.22]),
  });
  const sx = land ? W * 0.12 : W * 0.1; // the sink (the same sums as backdrop.js drawRoom)
  const sy = land ? H * 0.56 : room.tileTop + t * 0.6;
  const ss = land ? Math.max(60, Math.min(110, W * 0.11)) : Math.max(56, W * 0.18);
  out.push({
    id: 'sink', box: [sx - ss / 2, sy - ss * 0.3, ss, ss * 0.72],
    /** The basin and the tap. @param {CanvasRenderingContext2D} c context @returns {void} */
    path: (c) => {
      c.moveTo(sx - ss / 2, sy);
      c.lineTo(sx + ss / 2, sy);
      c.quadraticCurveTo(sx + ss / 2, sy + ss * 0.42, sx, sy + ss * 0.42);
      c.quadraticCurveTo(sx - ss / 2, sy + ss * 0.42, sx - ss / 2, sy);
      c.rect(sx - ss * 0.05, sy - ss * 0.22, ss * 0.1, ss * 0.22);
      c.rect(sx - ss * 0.05, sy - ss * 0.22, ss * 0.22, ss * 0.07);
      c.rect(sx - ss * 0.14, sy - ss * 0.28, ss * 0.28, ss * 0.06);
    },
    hot: [[sx - ss * 0.32, sy + ss * 0.06], [sx + ss * 0.12, sy - ss * 0.2]],
  });
  if (env.layers.includes('sign')) {
    const p = spots.sign;
    const sw = p.s;
    const sh = p.s * 0.5;
    const top = p.y + sh * 0.4;
    const x0 = p.x - sw / 2;
    out.push({
      id: 'sign', box: [x0, top, sw, sh],
      /** The sign board. @param {CanvasRenderingContext2D} c context @returns {void} */
      path: (c) => { c.roundRect(x0, top, sw, sh, sh * 0.2); },
      hot: [[x0 + sw * 0.1, top + sh * 0.18], [x0 + sw * 0.86, top + sh * 0.82]],
    });
  }
  if (env.layers.includes('chair')) {
    const ch = spots.chair;
    const cw = ch.wide;
    const x0 = ch.x - cw / 2;
    const backH = ch.seat - ch.top;
    out.push({
      id: 'chair', box: [x0, ch.top, cw, backH * 1.1],
      /** The chair's round back and its two wings. @param {CanvasRenderingContext2D} c context @returns {void} */
      path: (c) => {
        c.roundRect(x0 + cw * 0.1, ch.top, cw * 0.8, backH * 1.11, [cw * 0.36, cw * 0.36, u * 2, u * 2]);
        c.roundRect(x0, ch.top + backH * 0.2, cw * 0.2, backH * 0.8, cw * 0.09);
        c.roundRect(x0 + cw * 0.8, ch.top + backH * 0.2, cw * 0.2, backH * 0.8, cw * 0.09);
      },
      hot: [[ch.x - cw * 0.2, ch.top + backH * 0.06], [x0 + cw * 0.07, ch.top + backH * 0.3], [x0 + cw * 0.93, ch.top + backH * 0.3]],
    });
  }
  if (room.ring) {
    const R = room.ring;
    out.push({
      id: 'ring', box: [R.x - R.r * 1.3, R.y - R.r * 1.3, R.r * 2.6, R.r * 2.6],
      /** The ring light's ring. @param {CanvasRenderingContext2D} c context @returns {void} */
      path: (c) => { c.arc(R.x, R.y, R.r * 1.25, 0, TAU); c.moveTo(R.x + R.r * 0.75, R.y); c.arc(R.x, R.y, R.r * 0.75, 0, TAU, true); },
      hot: [[R.x - R.r * 0.72, R.y - R.r * 0.72]],
    });
  }
  if (tier === 0) return out.filter((o) => o.id === 'tiles' || o.id === 'sink');
  return out;
}

/**
 * Make the clean shine for this scene.
 * @param {object} env the page's env (see core.js README)
 * @returns {object} hooks
 */
function make(env) {
  const { W, H, sc, tier, still, party, room } = env;
  const things = shinyThings(env);
  const band = env.sprite('shine-band', 64, 16, paintBand, 1);
  const gloss = env.sprite('shine-gloss', 128, 16, (c, w, h) => paintGloss(c, w, h, '255,255,255'), 1);
  const goldGloss = env.sprite('shine-gloss-gold', 128, 16, (c, w, h) => paintGloss(c, w, h, '250,222,150'), 1); // shows on white tiles
  const glint = env.sprite('dust-glint', 48, 48, paintGlint);
  const mote = env.dot('255,248,226', 0.3, 16);
  const petalS = 4.6 * sc; // half a petal's height in CSS px
  const petals = [];
  const petalSprites = PETAL.map((f) => env.sprite(`petal:${f}`, 18, 22, (c, w, h) => paintPetal(c, w, h, f)));
  const petalBack = env.sprite(`petal:${PETAL_BACK}`, 18, 22, (c, w, h) => paintPetal(c, w, h, PETAL_BACK));
  const strength = party ? 0.6 : [0.35, 0.75, 1][tier] ?? 1; // dull in the dingy room
  const every = [9, 5.5, 3.6][tier] ?? 4; // seconds between sweeps
  const sweeps = []; // the sweeps going on: {thing, t0, dur, big}
  const glints = []; // {x, y, at, life, s, rot}
  let next = still ? Infinity : 1.2; // the first sweep comes soon
  let last = -1; // which thing shone last (so the next is another)
  let fired = 0;

  /** Whether a point is clear of the customer's face (glints and motes stay off the skin). @param {number} x x @param {number} y y @returns {number} 0..1 */
  const offFace = (x, y) => (env.face ? smooth((Math.hypot((x - env.face.cx) / env.face.rx, (y - env.face.cy) / env.face.ry) - 0.95) / 0.2) : 1);

  // The sparkle motes: tier 1 a few, tier 2 more, half of them in the spa's daylight.
  const motes = [];
  const nMotes = tier === 0 ? 0 : env.count(tier === 2 ? 34 : 16);
  const win = room.window;
  for (let i = 0; i < nMotes; i += 1) {
    const inBeam = tier === 2 && i % 2 === 0;
    const y = env.rand() * room.floorY;
    const k = clamp((y - win.y) / (win.by - win.y), 0, 1);
    const x = inBeam ? lerp(lerp(win.x0, win.bx0, k), lerp(win.x1, win.bx1, k), env.rand()) : env.rand() * W;
    motes.push({ x, y, s: (1.2 + env.rand() * 2.2) * sc, ph: env.rand() * TAU, per: 1.8 + env.rand() * 2.4, vx: (env.rand() - 0.5) * 4 * sc, vy: -(1.5 + env.rand() * 3) * sc, star: env.rand() < 0.4 });
  }

  /** Put a petal at the top (or anywhere on the way down, at the start), mostly clear of the face's column. @param {object} p petal @param {boolean} first anywhere on the way down @returns {void} */
  function dropPetal(p, first) {
    let x = env.rand() * W;
    if (env.face && Math.abs(x - env.face.cx) < env.face.rx * 0.8 && env.rand() < 0.7) x = env.rand() < 0.5 ? env.rand() * (env.face.cx - env.face.rx) : env.face.cx + env.face.rx + env.rand() * (W - env.face.cx - env.face.rx);
    p.x0 = x;
    p.y = first ? env.rand() * room.floorY : -petalS * 2 - env.rand() * H * 0.3;
    p.vy = (14 + env.rand() * 10) * sc;
    p.amp = (10 + env.rand() * 16) * sc;
    p.w = 0.9 + env.rand() * 0.7;
    p.ph = env.rand() * TAU;
    p.flip = 1.2 + env.rand() * 1.4;
    p.landY = room.floorY + (H - room.floorY) * (0.15 + env.rand() * 0.75);
    p.landed = -1;
    p.kind = Math.floor(env.rand() * PETAL.length);
    p.size = 0.8 + env.rand() * 0.45;
  }
  if (tier === 2) for (let i = 0, n = env.count(8); i < n; i += 1) { const p = {}; dropPetal(p, true); petals.push(p); }

  /** Start a shine over one thing (or, big, over the whole picture), and line up its glints. @param {object|null} thing what shines (null = everything) @param {number} t now @returns {void} */
  function startSweep(thing, t) {
    const big = !thing;
    const box = big ? [0, 0, W, H] : thing.box;
    const dur = big ? 1.1 : clamp(0.55 + box[2] / (W * 1.2), 0.6, 1.3);
    sweeps.push({ thing, t0: t, dur, big, box });
    const hot = big ? things.flatMap((o) => o.hot) : thing.hot;
    const pick = big ? hot : hot.filter(() => env.rand() < 0.75);
    if (!pick.length && hot.length) pick.push(hot[0]);
    for (const [x, y] of pick) {
      if (offFace(x, y) < 0.5) continue;
      const along = clamp((x - box[0]) / Math.max(1, box[2]), 0, 1); // the glint pops as the band passes it
      glints.push({ x, y, at: t + dur * (0.15 + along * 0.7), life: 0.55 + env.rand() * 0.35, s: (big ? 14 : 9 + env.rand() * 6) * sc, rot: env.rand() * 0.5 - 0.25 });
    }
    if (big) { // the "ting": one big star at the top right of the shine
      const sign = things.find((o) => o.id === 'sign');
      const [x, y] = sign ? sign.hot[0] : [W * 0.82, H * 0.12];
      glints.push({ x, y, at: t + dur * 0.55, life: 1.1, s: 34 * sc, rot: 0, ting: true });
    }
  }

  /** The scene clock (frozen when still). @returns {number} seconds */
  const clock = () => (still ? 0 : env.t);

  /** Draw the sweeps going on (each cut to its thing's shape). @param {CanvasRenderingContext2D} c context @param {boolean} big the big Fire sweep (in front) or the small ones @returns {void} */
  function drawSweeps(c, big) {
    const t = env.t;
    c.globalCompositeOperation = 'lighter';
    for (const s of sweeps) {
      if (s.big !== big) continue;
      const q = (t - s.t0) / s.dur;
      if (q < 0 || q > 1) continue;
      const [bx, by, bw, bh] = s.box;
      const ang = -0.5; // the band leans: a diagonal shine
      const len = Math.hypot(bw, bh) * 1.3;
      const thick = big ? Math.min(W, H) * 0.32 : clamp(Math.min(bw, bh) * 0.8, 24, 90) * (s.thing?.id === 'tiles' ? 1.4 : 1);
      const reach = bw + thick * 2 + Math.abs(Math.tan(ang)) * bh;
      const x = bx - thick - Math.abs(Math.tan(ang)) * bh * 0.5 + smooth(q) * reach;
      c.save();
      if (s.thing) { c.beginPath(); s.thing.path(c); c.clip(); }
      const fade = Math.sin(q * Math.PI) ** 0.5;
      c.translate(x, by + bh / 2);
      c.rotate(ang);
      c.globalCompositeOperation = 'lighter'; // the soft light round it
      c.globalAlpha = clamp((big ? 0.34 : 0.4 * strength) * fade, 0, 1);
      c.drawImage(band, -thick, -len / 2, thick * 2, len);
      c.globalCompositeOperation = 'source-over'; // the crisp cartoon gloss stripes
      const white = s.thing?.id === 'tiles' && tier === 2 ? goldGloss : gloss;
      c.globalAlpha = clamp((big ? 0.3 : 0.5 * strength * (white === goldGloss ? 1.5 : 1)) * fade, 0, 1);
      c.drawImage(white, -thick * 0.5, -len / 2, thick, len);
      c.restore();
    }
  }

  /** Draw the glints popping and fading. @param {CanvasRenderingContext2D} c context @returns {void} */
  function drawGlints(c) {
    const t = env.t;
    c.globalCompositeOperation = 'lighter';
    for (const g of glints) {
      const q = still ? 0.3 : (t - g.at) / g.life;
      if (q < 0 || q > 1) continue;
      const k = smooth(q / 0.22) * (1 - smooth((q - 0.3) / 0.7));
      const s = g.s * (0.4 + 0.8 * k) * 2;
      c.globalAlpha = clamp(k * (g.ting ? 1 : 0.95), 0, 1);
      c.save();
      c.translate(g.x, g.y);
      c.rotate(g.rot + q * (g.ting ? 0.8 : 0.4));
      c.drawImage(glint, -s / 2, -s / 2, s, s);
      c.restore();
    }
  }

  /** Draw the floating sparkle motes (front = the ones near us, which keep off the face). @param {CanvasRenderingContext2D} c context @param {boolean} front near ones @returns {void} */
  function drawMotes(c, front) {
    const t = clock();
    c.globalCompositeOperation = 'lighter';
    for (const [i, m] of motes.entries()) {
      if ((i % 4 === 3) !== front) continue;
      const tw = 0.5 + 0.5 * Math.sin((t / m.per) * TAU + m.ph);
      const k = tw * tw * (front ? offFace(m.x, m.y) : 1);
      if (k < 0.03) continue;
      const s = m.s * (front ? 1.4 : 1) * (0.6 + 0.6 * tw);
      c.globalAlpha = clamp(k * (tier === 2 ? 0.9 : 0.7), 0, 1);
      if (m.star && tw > 0.6) {
        const z = s * 3.2;
        c.drawImage(glint, m.x - z / 2, m.y - z / 2, z, z);
      } else {
        c.drawImage(mote, m.x - s, m.y - s, s * 2, s * 2);
      }
    }
  }

  /** Draw the rose petals: swaying and flipping on the way down, then lying on the floor and fading. @param {CanvasRenderingContext2D} c context @returns {void} */
  function drawPetals(c) {
    if (!petals.length) return;
    const t = clock();
    c.globalCompositeOperation = 'source-over';
    for (const p of petals) {
      let x;
      let y;
      let sx;
      let sy;
      let rot;
      let a = 1;
      if (p.landed >= 0) { // lying flat on the floor
        x = p.lx; y = p.landY; rot = p.lrot; sx = p.lsx; sy = 0.5;
        a = 1 - smooth((p.landed - 2.2) / 1.4);
      } else {
        const sway = Math.sin(t * p.w + p.ph);
        x = p.x0 + sway * p.amp;
        y = p.y;
        rot = Math.cos(t * p.w + p.ph) * 0.9 + p.ph; // it rocks as it swings
        sx = Math.cos(t * p.flip + p.ph * 2); // flips over: one side squashed to nothing and back
        sy = 1;
      }
      if (a <= 0.01 || y < -petalS * 2) continue;
      const h = petalS * 2 * p.size;
      const w = h * (18 / 22);
      c.globalAlpha = clamp(a, 0, 1);
      c.save();
      c.translate(x, y);
      c.rotate(rot);
      c.scale(Math.max(0.08, Math.abs(sx)), sy);
      c.drawImage(sx >= 0 ? petalSprites[p.kind] : petalBack, -w / 2, -h / 2, w, h);
      c.restore();
    }
  }

  return {
    /** Start the next sweep when it is due, drift the motes, let the petals fall, forget what is over. @param {number} dt seconds @returns {void} */
    step(dt) {
      const t = env.t;
      if (!still && t >= next && things.length) {
        let i = Math.floor(env.rand() * things.length);
        if (i === last && things.length > 1) i = (i + 1) % things.length;
        last = i;
        startSweep(things[i], t);
        next = t + every * (0.8 + env.rand() * 0.5);
      }
      if (!still) {
        for (const m of motes) {
          m.x += (m.vx + Math.sin(t * 0.4 + m.ph) * 3 * sc) * dt;
          m.y += m.vy * dt;
          if (m.y < -6) { m.y = room.floorY; m.x = env.rand() * W; }
          if (m.x < -6) m.x = W + 4; else if (m.x > W + 6) m.x = -4;
        }
        for (const p of petals) {
          if (p.landed >= 0) {
            p.landed += dt;
            if (p.landed > 3.8) dropPetal(p, false);
            continue;
          }
          p.y += p.vy * dt * (0.75 + 0.35 * Math.abs(Math.sin(t * p.w + p.ph))); // slower at the ends of its swing
          if (p.y >= p.landY) {
            p.landed = 0;
            p.lx = p.x0 + Math.sin(t * p.w + p.ph) * p.amp;
            p.lrot = Math.cos(t * p.w + p.ph) * 0.9 + p.ph;
            p.lsx = Math.max(0.5, Math.abs(Math.cos(t * p.flip + p.ph * 2)));
          }
        }
      }
      for (let i = sweeps.length - 1; i >= 0; i -= 1) if (t > sweeps[i].t0 + sweeps[i].dur) sweeps.splice(i, 1);
      for (let i = glints.length - 1; i >= 0; i -= 1) if (!still && t > glints[i].at + glints[i].life) glints.splice(i, 1);
    },
    /** Behind the customer: the small sweeps, their glints, the far motes and the petals. @param {CanvasRenderingContext2D} c context @returns {void} */
    draw(c) {
      drawSweeps(c, false);
      drawMotes(c, false);
      drawPetals(c);
      drawGlints(c);
    },
    /** In front: the near motes and the big Fire sweep over everything. @param {CanvasRenderingContext2D} c context @returns {void} */
    front(c) {
      drawMotes(c, true);
      drawSweeps(c, true);
    },
    /** One big shine over the whole picture with a "ting". @returns {void} */
    trigger() {
      fired += 1;
      if (still) glints.length = 0;
      startSweep(null, env.t);
      ting();
    },
    /** For checks. @returns {object} state */
    state: () => ({ things: things.map((o) => o.id), sweeps: sweeps.map((o) => o.thing?.id ?? 'all'), glints: glints.length, motes: motes.length, petals: petals.length, fired }),
  };
}

export default { id: 'shine', num: 4, name: 'Shine', layer: 'back', order: 45, make };
