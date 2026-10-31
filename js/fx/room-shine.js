// The sparkly clean look for the better studio tiers (SPEC D45 item 3), the game's version of the test page's shine
// effect (js/dev/fx/shine.js). Now and then a soft diagonal shine glides over something shiny in the room (the tiles,
// the sink, the sign, the spa's pink chair, the ring light), cut to that thing's shape, and small four-point glints pop
// and fade on it as it passes. In the spa tiny sparkle motes float in the air (half of them in the daylight) and a few
// rose petals drift down, swaying and flipping over, land on the floor and fade. Still: a calm still frame (a few
// glints, the petals where they are). All of it is drawn on the room's own layer, behind the customer.
import { clamp, smooth, lerp, TAU } from './sprites.js';
import { fxCount } from './room-logic.js';

const SHINE = '255,250,236'; // the sweep's light: a warm white
const PETAL = ['#f59ab6', '#f7b2c6', '#ef8aa8']; // rose petal colours (front sides)
const PETAL_BACK = '#fcd6e1'; // the paler back side
const INK = 'rgba(42,33,29,0.45)';

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
 * Paint the gloss sprite (drawn over, like the cartoon shine on the sign): a wide and a thin stripe with crisp edges.
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
 * Paint one rose petal (pointing up, base at the bottom): a rounded cup shape with a notch at the top, a darker base,
 * a soft vein, a thin ink edge.
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

/**
 * The shiny things in the room a shine can glide over: each has a path (its shape, for clipping), a box and a few
 * spots where glints pop.
 * @param {object} room the room's spots (room-fx.js roomSpots)
 * @returns {{id: string, path: (c: CanvasRenderingContext2D) => void, box: number[], hot: number[][]}[]} targets
 */
export function shinyThings(room) {
  const { W, H, land, spots, layers } = room;
  const u = spots.u;
  const out = [];
  const t = Math.max(26, Math.min(54, Math.round(Math.min(W, H) / 8.5)));
  const tileTop = room.tileTop;
  const floorY = room.floorY;
  out.push({ // the tiles (the whole band of them)
    id: 'tiles', box: [0, tileTop, W, floorY - tileTop],
    /** The tiles' shape. @param {CanvasRenderingContext2D} c context @returns {void} */
    path: (c) => { c.rect(0, tileTop, W, floorY - tileTop); },
    hot: [0, 1, 2, 3, 4, 5].map((i) => [((i * 3 + 1) % Math.max(2, Math.floor(W / t))) * t + t * 0.8, tileTop + (i % 3) * t + t * 0.22]),
  });
  const sx = land ? W * 0.12 : W * 0.1; // the sink (the same sums as backdrop.js drawRoom)
  const sy = land ? H * 0.56 : tileTop + t * 0.6;
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
  if (layers.includes('sign')) {
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
  if (layers.includes('chair')) {
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
  return out;
}

/**
 * Make the clean shine for the room.
 * @param {{W: number, H: number, sc: number, kit: object, rand: () => number, tier: number, still: boolean,
 *   share: number, room: object, sweeps: boolean, sparkles: boolean, petals: boolean,
 *   avoid?: {x: number, y: number, w: number, h: number}[]}} o picture size and size factor,
 *   the sprite kit, seeded random numbers, the studio tier, still (reduced motion), the particle share, the room's
 *   spots (room-fx.js), which parts to show, and boxes where no glint pops and no sweep runs (the pop scene's zoom
 *   buttons: glints there washed out their icons, audit A5)
 * @returns {{step: (dt: number, t: number) => void, draw: (c: CanvasRenderingContext2D) => void, state: () => object}} hooks
 */
export function makeShine(o) {
  const { W, H, sc, kit, rand, tier, still, room } = o;
  const avoid = Array.isArray(o.avoid) ? o.avoid : [];
  /** Whether a spot lies in or near a box kept clear (the zoom buttons). @param {number} x x @param {number} y y @param {number} pad margin in CSS px @returns {boolean} kept clear */
  const blocked = (x, y, pad) => avoid.some((b) => x > b.x - pad && x < b.x + b.w + pad && y > b.y - pad && y < b.y + b.h + pad);
  // things whose middle sits behind the zoom buttons get no sweep (in the pop scene upright: the ring light)
  const things = (o.sweeps ? shinyThings(room) : []).filter((th) => !blocked(th.box[0] + th.box[2] / 2, th.box[1] + th.box[3] / 2, 0));
  const band = kit.sprite('shine-band', 64, 16, paintBand, 1);
  const gloss = kit.sprite('shine-gloss', 128, 16, (c, w, h) => paintGloss(c, w, h, '255,255,255'), 1);
  const goldGloss = kit.sprite('shine-gloss-gold', 128, 16, (c, w, h) => paintGloss(c, w, h, '250,222,150'), 1); // shows on white tiles
  const glint = kit.glint();
  const mote = kit.dot('255,248,226', 0.3, 16);
  const petalS = 4.6 * sc; // half a petal's height in CSS px
  const petals = [];
  const petalSprites = PETAL.map((f) => kit.sprite(`petal:${f}`, 18, 22, (c, w, h) => paintPetal(c, w, h, f)));
  const petalBack = kit.sprite(`petal:${PETAL_BACK}`, 18, 22, (c, w, h) => paintPetal(c, w, h, PETAL_BACK));
  const strength = [0.35, 0.75, 1][tier] ?? 1;
  const every = [9, 5.5, 3.6][tier] ?? 4; // seconds between sweeps
  const sweeps = []; // the sweeps going on: {thing, t0, dur, box}
  const glints = []; // {x, y, at, life, s, rot}
  let T = 0;
  let next = still ? Infinity : 1.2; // the first sweep comes soon
  let last = -1; // which thing shone last (so the next is another)

  // The sparkle motes (the spa): half of them in the daylight.
  const motes = [];
  const win = room.window;
  for (let i = 0, n = o.sparkles ? fxCount(34, o.share) : 0; i < n; i += 1) {
    const inBeam = i % 2 === 0;
    const y = rand() * room.floorY;
    const k = clamp((y - win.y) / (win.by - win.y), 0, 1);
    const x = inBeam ? lerp(lerp(win.x0, win.bx0, k), lerp(win.x1, win.bx1, k), rand()) : rand() * W;
    motes.push({ x, y, s: (1.2 + rand() * 2.2) * sc, ph: rand() * TAU, per: 1.8 + rand() * 2.4, vx: (rand() - 0.5) * 4 * sc, vy: -(1.5 + rand() * 3) * sc, star: rand() < 0.4, near: i % 4 === 3 });
  }

  /** Put a petal at the top (or anywhere on the way down, at the start), mostly clear of the middle. @param {object} p petal @param {boolean} first anywhere on the way down @returns {void} */
  function dropPetal(p, first) {
    let x = rand() * W;
    const mid = room.clear; // [x0, x1] the column the customer's face covers (pop scene), or null
    if (mid && x > mid[0] && x < mid[1] && rand() < 0.7) x = rand() < 0.5 ? rand() * mid[0] : mid[1] + rand() * (W - mid[1]);
    p.x0 = x;
    p.y = first ? rand() * room.floorY : -petalS * 2 - rand() * H * 0.3;
    p.vy = (14 + rand() * 10) * sc;
    p.amp = (10 + rand() * 16) * sc;
    p.w = 0.9 + rand() * 0.7;
    p.ph = rand() * TAU;
    p.flip = 1.2 + rand() * 1.4;
    p.landY = room.floorY + (H - room.floorY) * (0.15 + rand() * 0.75);
    p.landed = -1;
    p.kind = Math.floor(rand() * PETAL.length);
    p.size = 0.8 + rand() * 0.45;
  }
  if (o.petals) for (let i = 0, n = fxCount(8, Math.max(0.6, o.share)); i < n; i += 1) { const p = {}; dropPetal(p, true); petals.push(p); }

  /** Start a shine over one thing and line up its glints. @param {object} thing what shines @param {number} t now @returns {void} */
  function startSweep(thing, t) {
    const box = thing.box;
    const dur = clamp(0.55 + box[2] / (W * 1.2), 0.6, 1.3);
    sweeps.push({ thing, t0: t, dur, box });
    const pick = thing.hot.filter(() => rand() < 0.75);
    if (!pick.length && thing.hot.length) pick.push(thing.hot[0]);
    for (const [x, y] of pick) {
      const along = clamp((x - box[0]) / Math.max(1, box[2]), 0, 1); // the glint pops as the band passes it
      const s = (9 + rand() * 6) * sc;
      if (blocked(x, y, s * 1.2)) continue; // never behind the zoom buttons (its full drawn size round it)
      glints.push({ x, y, at: t + dur * (0.15 + along * 0.7), life: 0.55 + rand() * 0.35, s, rot: rand() * 0.5 - 0.25 });
    }
  }
  if (still) for (const th of things.slice(0, 3)) for (const [x, y] of th.hot.slice(0, 1)) if (!blocked(x, y, 9 * sc * 1.2)) glints.push({ x, y, at: 0, life: 1, s: 9 * sc, rot: 0 }); // a few calm glints

  /** Draw the sweeps going on (each cut to its thing's shape). @param {CanvasRenderingContext2D} c context @returns {void} */
  function drawSweeps(c) {
    for (const s of sweeps) {
      const q = (T - s.t0) / s.dur;
      if (q < 0 || q > 1) continue;
      const [bx, by, bw, bh] = s.box;
      const ang = -0.5; // the band leans: a diagonal shine
      const len = Math.hypot(bw, bh) * 1.3;
      const thick = clamp(Math.min(bw, bh) * 0.8, 24, 90) * (s.thing.id === 'tiles' ? 1.4 : 1);
      const reach = bw + thick * 2 + Math.abs(Math.tan(ang)) * bh;
      const x = bx - thick - Math.abs(Math.tan(ang)) * bh * 0.5 + smooth(q) * reach;
      c.save();
      c.beginPath();
      s.thing.path(c);
      c.clip();
      const fade = Math.sin(q * Math.PI) ** 0.5;
      c.translate(x, by + bh / 2);
      c.rotate(ang);
      c.globalCompositeOperation = 'lighter'; // the soft light round it
      c.globalAlpha = clamp(0.4 * strength * fade, 0, 1);
      c.drawImage(band, -thick, -len / 2, thick * 2, len);
      c.globalCompositeOperation = 'source-over'; // the crisp cartoon gloss stripes
      const gold = s.thing.id === 'tiles' && tier === 2;
      c.globalAlpha = clamp(0.5 * strength * (gold ? 1.5 : 1) * fade, 0, 1);
      c.drawImage(gold ? goldGloss : gloss, -thick * 0.5, -len / 2, thick, len);
      c.restore();
    }
  }

  /** Draw the glints popping and fading. @param {CanvasRenderingContext2D} c context @returns {void} */
  function drawGlints(c) {
    c.globalCompositeOperation = 'lighter';
    for (const g of glints) {
      const q = still ? 0.3 : (T - g.at) / g.life;
      if (q < 0 || q > 1) continue;
      const k = smooth(q / 0.22) * (1 - smooth((q - 0.3) / 0.7));
      const s = g.s * (0.4 + 0.8 * k) * 2;
      c.globalAlpha = clamp(k * 0.95, 0, 1);
      c.save();
      c.translate(g.x, g.y);
      c.rotate(g.rot + q * 0.4);
      c.drawImage(glint, -s / 2, -s / 2, s, s);
      c.restore();
    }
  }

  /** Draw the floating sparkle motes. @param {CanvasRenderingContext2D} c context @returns {void} */
  function drawMotes(c) {
    const t = still ? 0 : T;
    c.globalCompositeOperation = 'lighter';
    for (const m of motes) {
      const tw = 0.5 + 0.5 * Math.sin((t / m.per) * TAU + m.ph);
      const k = tw * tw;
      if (k < 0.03) continue;
      const s = m.s * (m.near ? 1.4 : 1) * (0.6 + 0.6 * tw);
      if (avoid.length && blocked(m.x, m.y, s * 1.6)) continue; // no sparkle behind the zoom buttons
      c.globalAlpha = clamp(k * 0.9, 0, 1);
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
    const t = still ? 0 : T;
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
    /** Start the next sweep when it is due, drift the motes, let the petals fall, forget what is over. @param {number} dt seconds @param {number} t the clock @returns {void} */
    step(dt, t) {
      T = t;
      if (still) return;
      if (t >= next && things.length) {
        let i = Math.floor(rand() * things.length);
        if (i === last && things.length > 1) i = (i + 1) % things.length;
        last = i;
        startSweep(things[i], t);
        next = t + every * (0.8 + rand() * 0.5);
      }
      for (const m of motes) {
        m.x += (m.vx + Math.sin(t * 0.4 + m.ph) * 3 * sc) * dt;
        m.y += m.vy * dt;
        if (m.y < -6) { m.y = room.floorY; m.x = rand() * W; }
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
      for (let i = sweeps.length - 1; i >= 0; i -= 1) if (t > sweeps[i].t0 + sweeps[i].dur) sweeps.splice(i, 1);
      for (let i = glints.length - 1; i >= 0; i -= 1) if (t > glints[i].at + glints[i].life) glints.splice(i, 1);
    },
    /** The sweeps, the motes, the petals and the glints. @param {CanvasRenderingContext2D} c context @returns {void} */
    draw(c) {
      c.save();
      drawSweeps(c);
      drawMotes(c);
      drawPetals(c);
      drawGlints(c);
      c.restore();
    },
    /** Nothing of the shine stands still, so nothing is baked into the room. @returns {void} */
    bake() {},
    /** For checks. @returns {object} state */
    state: () => ({ things: things.map((x) => x.id), sweeps: sweeps.length, glints: glints.length, motes: motes.length, petals: petals.length }),
  };
}
