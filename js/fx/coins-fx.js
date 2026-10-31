// The tip coins on the result screen (SPEC D45 item 2), from the effects test page's coins (js/dev/fx/coins.js): a
// handful of shiny cartoon gold coins hop out from under the customer's reveal picture (its bottom edge, so they never
// cover the shine on her face; result.js says where) with a little pop-and-settle, spinning (each squashes as it turns
// and shows its bright rim edge-on; a band of light sweeps across the face as it turns and a crisp white star glints
// when it faces us), each in a soft golden glow and leaving a short trail of twinkling stars and gold dust, arc up,
// then swoop one after the other into the coin counter (the Total line's coin). Each landing gives a little golden
// burst (a flash, a ring and a spray of sparkles) and a glow on the counter, a soft "ting" one step higher than the
// one before (sound coin_land), and calls onLand, so the screen can bump the counter and count it up (result.js;
// celebrate-logic.js coinSteps makes it end at the true total). The last coin gives a bigger burst with a big glint,
// a brighter "ding" (coin_last) and a second of sparkles rising over the Total (owner 2026-10-31: "not magical and
// shiny enough").
// Reduced motion: no coins fly (result.js shows the total at once with a still glint). Lighter graphics: fewer coins,
// about half the sparkles and no blur ghosts behind the coins.
// It draws on an effects layer (fx-layer.js). Where the face and the counter are is asked again every frame, so a
// scrolled screen or a turned phone still sends the coins to the right place. Every picture is a sprite painted once.
import { clamp, smooth, lerp, TAU } from './sprites.js';
import { rng } from '../pop/logic.js';
import { COIN_FLIGHT } from './celebrate-logic.js';

const INK = '#2a211d';
/** The game's coin icon squiggle (screens/dom.js icon('coin')), in its 24 px box. */
const SQUIGGLE = 'M12 7v10M9.5 9.5c0-1.4 5-1.4 5 0s-5 3.4-5 5 5 1.4 5 0';
/** The coin sprites' size in CSS px (a coin is drawn at about 20 to 36 px, so they stay crisp). */
const COIN_PX = 44;
/** How many shine-band pictures of the face are painted (the band glides across the face as the coin turns). */
export const COIN_BANDS = 9;

/**
 * The magic round the coins: a flying coin drops a trail sparkle every `every` coin sizes it travels (and a few while
 * it hops slowly; twice as far apart with Lighter graphics), which lives life + up to lifeRand seconds; at most `max`
 * sparkles at once (half with Lighter graphics); ring / ringLast = sparkles sprayed by a landing / by the last coin's;
 * rise = sparkles floating up over the Total for riseFor seconds after the last coin (all about half with Lighter graphics).
 */
export const COIN_SPARKS = { every: 0.6, life: 0.36, lifeRand: 0.24, max: 360, ring: 7, ringLast: 16, rise: 12, riseFor: 1.0 };

/**
 * A coin's size as it hops out: it pops up from small to a little too big, then settles at full size.
 * @param {number} t seconds since it left
 * @returns {number} scale (1 = full size)
 */
export function coinPop(t) {
  if (!(t > 0)) return 0.35;
  if (t < 0.11) return lerp(0.35, 1.25, smooth(t / 0.11));
  if (t < 0.24) return lerp(1.25, 1, smooth((t - 0.11) / 0.13));
  return 1;
}

/**
 * Paint a coin face: a raised rim lit from the top left, a warm gold face sunk a little inside it, the game's coin
 * squiggle stamped in (a light edge, a shadow and a deep-gold stroke), an ink outline and a cartoon shine. With a band
 * step, also the moving shine: a soft white band (and a thin line beside it) across the face, at that step of
 * COIN_BANDS (the first and last steps have it just off the coin).
 * @param {CanvasRenderingContext2D} c the sprite's context @param {number} w size @param {number} [band] shine band step (-1 = none)
 * @returns {void}
 */
export function paintCoin(c, w, band = -1) {
  const m = w / 2;
  const r = w * 0.44;
  const fr = r * 0.8; // the face inside the rim
  const rim = c.createLinearGradient(m - r, m - r, m + r, m + r);
  rim.addColorStop(0, '#fffbe0');
  rim.addColorStop(0.3, '#ffe27a');
  rim.addColorStop(0.62, '#f5b52a');
  rim.addColorStop(1, '#b0640a');
  c.fillStyle = rim;
  c.beginPath(); c.arc(m, m, r, 0, TAU); c.fill();
  const g = c.createRadialGradient(m - fr * 0.4, m - fr * 0.45, fr * 0.05, m, m, fr * 1.1);
  g.addColorStop(0, '#fff8d0');
  g.addColorStop(0.28, '#ffe25a');
  g.addColorStop(0.7, '#fbb522');
  g.addColorStop(1, '#de8010');
  c.fillStyle = g;
  c.beginPath(); c.arc(m, m, fr, 0, TAU); c.fill();
  const lip = c.createLinearGradient(m - fr, m - fr, m + fr, m + fr); // the face sits lower: shade up left, a bright lip down right
  lip.addColorStop(0, 'rgba(140,72,0,0.8)');
  lip.addColorStop(1, 'rgba(255,248,210,0.95)');
  c.strokeStyle = lip;
  c.lineWidth = w * 0.035;
  c.beginPath(); c.arc(m, m, fr, 0, TAU); c.stroke();
  c.save(); // the squiggle, stamped in
  const k = (fr * 2.1) / 24;
  c.translate(m - 12 * k, m - 12 * k);
  c.scale(k, k);
  c.lineCap = 'round';
  c.lineJoin = 'round';
  const sq = new Path2D(SQUIGGLE);
  c.lineWidth = 2.7;
  c.strokeStyle = 'rgba(255,250,215,0.95)';
  c.translate(-0.6, -0.6); c.stroke(sq);
  c.strokeStyle = 'rgba(110,52,0,0.85)';
  c.translate(1.2, 1.2); c.stroke(sq);
  c.translate(-0.6, -0.6);
  c.lineWidth = 2.2;
  c.strokeStyle = '#b26c08';
  c.stroke(sq);
  c.restore();
  if (band >= 0) {
    const x = lerp(-1.75, 1.75, band / (COIN_BANDS - 1)) * fr;
    c.save();
    c.beginPath(); c.arc(m, m, r, 0, TAU); c.clip();
    c.translate(m, m);
    c.rotate(-0.6);
    const b = c.createLinearGradient(x - fr * 0.5, 0, x + fr * 0.5, 0);
    b.addColorStop(0, 'rgba(255,255,240,0)');
    b.addColorStop(0.32, 'rgba(255,255,235,0.6)');
    b.addColorStop(0.5, 'rgba(255,255,255,1)');
    b.addColorStop(0.68, 'rgba(255,255,235,0.6)');
    b.addColorStop(1, 'rgba(255,255,240,0)');
    c.fillStyle = b;
    c.fillRect(x - fr * 0.5, -r, fr, r * 2);
    c.fillStyle = 'rgba(255,255,245,0.7)';
    c.fillRect(x + fr * 0.6, -r, fr * 0.12, r * 2);
    c.restore();
  }
  c.strokeStyle = INK;
  c.lineWidth = w * 0.07;
  c.beginPath(); c.arc(m, m, r, 0, TAU); c.stroke();
  c.fillStyle = 'rgba(255,255,255,0.9)'; // the cartoon shine
  c.beginPath(); c.ellipse(m - r * 0.5, m - r * 0.5, r * 0.2, r * 0.085, -0.78, 0, TAU); c.fill();
  c.beginPath(); c.arc(m - r * 0.17, m - r * 0.7, r * 0.055, 0, TAU); c.fill();
}

/** Paint the coin's rim (what shows edge-on): a gold disc, bright down the middle like a lit edge, with an ink outline. @param {CanvasRenderingContext2D} c the sprite's context @param {number} w size @returns {void} */
function paintRim(c, w) {
  const m = w / 2;
  const r = w * 0.44;
  const g = c.createLinearGradient(m - r, 0, m + r, 0);
  g.addColorStop(0, '#9a5806');
  g.addColorStop(0.3, '#f0ae2c');
  g.addColorStop(0.48, '#fff0a8');
  g.addColorStop(0.62, '#f5c040');
  g.addColorStop(1, '#a05c05');
  c.fillStyle = g;
  c.beginPath(); c.arc(m, m, r, 0, TAU); c.fill();
  c.strokeStyle = INK;
  c.lineWidth = w * 0.07;
  c.stroke();
}

/**
 * Paint the crisp star glint: a warm glow, a white four-point star with long thin rays and a thin gold edge (so it
 * shows on the cream card too), and two short diagonal rays.
 * @param {CanvasRenderingContext2D} c the sprite's context @param {number} w size @returns {void}
 */
function paintCoinGlint(c, w) {
  const m = w / 2;
  const g = c.createRadialGradient(m, m, 0, m, m, m * 0.55);
  g.addColorStop(0, 'rgba(255,250,225,0.95)');
  g.addColorStop(0.35, 'rgba(255,214,90,0.45)');
  g.addColorStop(1, 'rgba(255,200,60,0)');
  c.fillStyle = g;
  c.fillRect(0, 0, w, w);
  c.lineJoin = 'round';
  starPath(c, m, m, m * 0.95, 0.09);
  c.strokeStyle = 'rgba(206,130,8,0.9)';
  c.lineWidth = w * 0.035;
  c.stroke();
  c.fillStyle = '#ffffff';
  c.fill();
  c.translate(m, m);
  c.rotate(Math.PI / 4);
  starPath(c, 0, 0, m * 0.42, 0.12);
  c.stroke();
  c.fill();
  c.setTransform(1, 0, 0, 1, 0, 0);
}

/** Paint a coin's blur ghost (what a fast coin leaves behind it for a blink): a soft golden disc. @param {CanvasRenderingContext2D} c the sprite's context @param {number} w size @returns {void} */
function paintGhost(c, w) {
  const m = w / 2;
  const g = c.createRadialGradient(m, m, 0, m, m, m * 0.46);
  g.addColorStop(0, 'rgba(255,240,170,0.95)');
  g.addColorStop(0.7, 'rgba(255,200,50,0.8)');
  g.addColorStop(1, 'rgba(250,180,30,0)');
  c.fillStyle = g;
  c.fillRect(0, 0, w, w);
}

/** Paint a tiny trail star: a gold glow and a cream-white four-point star with a gold edge. @param {CanvasRenderingContext2D} c the sprite's context @param {number} w size @returns {void} */
function paintSpark(c, w) {
  const m = w / 2;
  const g = c.createRadialGradient(m, m, 0, m, m, m);
  g.addColorStop(0, 'rgba(255,214,80,0.9)');
  g.addColorStop(0.4, 'rgba(255,186,30,0.42)');
  g.addColorStop(1, 'rgba(255,180,30,0)');
  c.fillStyle = g;
  c.fillRect(0, 0, w, w);
  starPath(c, m, m, m * 0.92, 0.14);
  c.strokeStyle = 'rgba(222,140,8,1)';
  c.lineWidth = w * 0.06;
  c.lineJoin = 'round';
  c.stroke();
  c.fillStyle = '#ffffff';
  c.fill();
}

/**
 * A four-point star (the game's sparkle shape) round (x, y).
 * @param {CanvasRenderingContext2D} c context @param {number} x centre x @param {number} y centre y @param {number} z ray length
 * @param {number} [pinch] how fat the rays are near the middle (share of z)
 * @returns {void}
 */
export function starPath(c, x, y, z, pinch = 0.18) {
  const k = z * pinch;
  c.beginPath();
  c.moveTo(x, y - z);
  c.quadraticCurveTo(x + k, y - k, x + z, y);
  c.quadraticCurveTo(x + k, y + k, x, y + z);
  c.quadraticCurveTo(x - k, y + k, x - z, y);
  c.quadraticCurveTo(x - k, y - k, x, y - z);
  c.closePath();
}

/**
 * Make the tip coins' flight for an effects layer.
 * @param {{kit: object, n: number, from: () => {x: number, y: number, r: number}, to: () => {x: number, y: number, r: number},
 *   onLand?: (i: number) => void, W: number, H: number, seed?: number, lite?: boolean,
 *   playSound?: (name: string) => void}} o kit = the layer's sprite kit; n = how many coins;
 *   from = where they burst out (the face's middle and size, in layer CSS px); to = the counter's coin (middle and
 *   radius); onLand(i) = coin i (0 first) landed; W, H = the layer's size now; lite = Lighter graphics; playSound =
 *   the sound player (a "ting" per landing, the "ding" for the last)
 * @returns {{step: (dt: number, W: number, H: number) => void, draw: (c: CanvasRenderingContext2D) => void, done: () => boolean,
 *   state: () => object}} the effect
 */
export function makeCoinFlight(o) {
  const rand = rng(o.seed ?? 29);
  const lite = Boolean(o.lite);
  const faces = []; // the face with the shine band at each step, painted when first needed
  /** The coin face with the shine band at step b (painted the first time, then kept). @param {number} b step @returns {HTMLCanvasElement} sprite */
  const faceAt = (b) => (faces[b] ??= o.kit.sprite(`coin-face2:${b}`, COIN_PX, COIN_PX, (c, w) => paintCoin(c, w, b)));
  const rim = o.kit.sprite('coin-rim2', COIN_PX, COIN_PX, (c, w) => paintRim(c, w));
  const glint = o.kit.sprite('coin-glint', 40, 40, (c, w) => paintCoinGlint(c, w));
  const spark = o.kit.sprite('coin-spark', 16, 16, (c, w) => paintSpark(c, w));
  const ghost = o.kit.sprite('coin-ghost', 32, 32, (c, w) => paintGhost(c, w), 1);
  const dust = o.kit.dot('255,184,30', 0.5, 16);
  const glow = o.kit.glow('255,180,24');
  const flash = o.kit.dot('255,248,215', 0.3);
  let W = o.W;
  let H = o.H;
  const S = clamp(Math.min(W, H), 300, 800); // the burst's size follows the screen's short side
  const D = clamp(S * 0.072, 20, 34); // a coin's size in flight
  const every = COIN_SPARKS.every * D * (lite ? 2 : 1); // px of flight between two trail sparkles
  const maxSparks = lite ? COIN_SPARKS.max / 2 : COIN_SPARKS.max;
  /** A sparkle count, about half with Lighter graphics. @param {number} n full count @returns {number} count */
  const share = (n) => (lite ? Math.ceil(n / 2) : n);
  const coins = [];
  const sparks = []; // trail dust and stars, the landings' sprays and the sparkles rising over the Total
  const bursts = []; // the landings' flashes and rings
  let landed = 0;
  let sparked = 0; // sparkles made so far (for checks)
  let shine = 0; // the counter's glow and glint after a landing
  let rise = 0; // seconds of rising sparkles still to come over the Total (after the last coin)
  let riseNext = 0;
  let target = o.to();

  /**
   * Send one coin out: a small hop up and out toward the counter's side (low, so it never flies over the eyes; the
   * coins after it a moment later), then home in on the counter.
   * @param {number} i which @returns {void}
   */
  function launch(i) {
    const src = o.from();
    const dir = Math.sign(target.x - src.x) || 1;
    const a = -Math.PI / 2 + dir * (0.6 + (rand() - 0.5) * 1.1 + ((i / Math.max(1, o.n - 1)) - 0.5) * 0.3);
    const v = S * (0.42 + rand() * 0.2);
    coins.push({
      i, x: src.x + (rand() - 0.5) * src.r * 0.8, y: src.y + (rand() - 0.5) * src.r * 0.3,
      vx: Math.cos(a) * v * 0.8, vy: Math.sin(a) * v, age: -i * COIN_FLIGHT.stagger, fly: COIN_FLIGHT.fly + rand() * COIN_FLIGHT.flyRand,
      home: null, spin: rand() * TAU, vs: (9 + rand() * 7) * (rand() < 0.5 ? -1 : 1),
      emit: rand() * every, hist: [], speed: 0,
    });
  }

  /** Add a sparkle unless there are too many already. @param {object} s the sparkle (x, y, vx, vy, life, star, size, drag, grav) @returns {void} */
  function addSpark(s) {
    if (sparks.length >= maxSparks) return;
    s.age = 0;
    s.tw = rand() * TAU;
    sparks.push(s);
    sparked += 1;
  }

  /**
   * A flying coin's trail: remember where it was (for the blur ghosts, not with Lighter graphics) and drop twinkling
   * stars and gold dust along the way it just came, drifting back a little.
   * @param {object} p coin @param {number} lx x a frame ago @param {number} ly y a frame ago @param {number} dt seconds @returns {void}
   */
  function trail(p, lx, ly, dt) {
    const vx = (p.x - lx) / Math.max(dt, 1e-3);
    const vy = (p.y - ly) / Math.max(dt, 1e-3);
    p.speed = Math.hypot(vx, vy);
    if (!lite) { p.hist.unshift(lx, ly); p.hist.length = Math.min(p.hist.length, 4); }
    p.emit -= p.speed * dt + D * 3 * dt; // by the way travelled, and a few while it hops slowly
    while (p.emit <= 0) {
      p.emit += every;
      const star = rand() < 0.6;
      const back = rand();
      addSpark({
        x: lerp(p.x, lx, back) + (rand() - 0.5) * D * 0.6, y: lerp(p.y, ly, back) + (rand() - 0.5) * D * 0.6,
        vx: -vx * 0.06 + (rand() - 0.5) * S * 0.12, vy: -vy * 0.06 + (rand() - 0.5) * S * 0.12,
        life: COIN_SPARKS.life + rand() * COIN_SPARKS.lifeRand, star, size: D * (star ? 0.2 + rand() * 0.18 : 0.14 + rand() * 0.1),
        drag: 3, grav: star ? -S * 0.05 : S * 0.3,
      });
    }
  }

  /**
   * A coin lands in the counter: a flash, a ring and a spray of sparkles round it, the counter glows, a "ting". The
   * last one: a bigger burst with a big glint, a "ding" and sparkles rising over the Total for a second.
   * @param {boolean} last the last coin @returns {void}
   */
  function land(last) {
    shine = 1;
    bursts.push({ age: 0, life: last ? 0.62 : 0.34, big: last });
    const n = share(last ? COIN_SPARKS.ringLast : COIN_SPARKS.ring);
    const r = target.r;
    const turn = rand() * 0.3;
    for (let k = 0; k < n; k += 1) {
      const a = Math.PI * (0.3 + 1.4 * ((k + 0.5) / n)) + turn + (rand() - 0.5) * 0.3; // all round, but not over the number on the right
      const v = S * (last ? 0.55 : 0.34) * (0.7 + rand() * 0.5);
      addSpark({
        x: target.x + Math.cos(a) * r * 0.7, y: target.y + Math.sin(a) * r * 0.7, vx: Math.cos(a) * v, vy: Math.sin(a) * v,
        life: (last ? 0.5 : 0.3) + rand() * 0.25, star: k % 3 !== 0, size: D * (last ? 0.4 : 0.3) * (0.7 + rand() * 0.5),
        drag: 6, grav: S * 0.1,
      });
    }
    if (last) { rise = COIN_SPARKS.riseFor; riseNext = 0; }
    o.playSound?.(last ? 'coin_last' : 'coin_land');
  }

  /** The sparkles rising over the Total after the last coin: one now and then, from round the counter, floating up. @param {number} dt seconds @returns {void} */
  function rising(dt) {
    rise -= dt;
    riseNext -= dt;
    const gap = COIN_SPARKS.riseFor / share(COIN_SPARKS.rise);
    const r = target.r;
    while (riseNext <= 0 && rise > 0) {
      riseNext += gap;
      addSpark({
        x: target.x + (rand() * 6 - 1.5) * r, y: target.y - r * (1.1 + rand() * 0.7), vx: (rand() - 0.5) * S * 0.03, vy: -S * (0.1 + rand() * 0.08),
        life: 0.6 + rand() * 0.4, star: rand() < 0.75, size: D * (0.24 + rand() * 0.14), drag: 0.6, grav: 0,
      });
    }
  }

  /** Move a coin on: an arc, then a swoop along a curve into the counter (faster as it goes). @param {object} p coin @param {number} dt seconds @returns {boolean} true when it has landed */
  function move(p, dt) {
    p.age += dt;
    if (p.age < 0) return false;
    p.spin += p.vs * dt;
    if (p.age < p.fly) {
      p.vy += S * 2.1 * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      return false;
    }
    if (!p.home) p.home = { x0: p.x, y0: p.y, cx: p.x + p.vx * 0.22, cy: p.y + p.vy * 0.22 - S * 0.06, u: 0, dur: COIN_FLIGHT.home + rand() * COIN_FLIGHT.homeRand };
    const h = p.home;
    h.u += dt / h.dur;
    const u = Math.min(1, h.u) ** 1.6;
    p.x = (1 - u) ** 2 * h.x0 + 2 * (1 - u) * u * h.cx + u * u * target.x;
    p.y = (1 - u) ** 2 * h.y0 + 2 * (1 - u) * u * h.cy + u * u * target.y;
    return h.u >= 1;
  }

  /**
   * Draw one spinning coin: the rim edge-on, the face squashed by the turn with the shine band at the step that goes
   * with the turn (it sweeps across as the face comes round), and a crisp white star glint when it faces us.
   * @param {CanvasRenderingContext2D} c context @param {number} x centre x @param {number} y centre y @param {number} d size
   * @param {number} spin turn @returns {void}
   */
  function drawCoin(c, x, y, d, spin) {
    const cs = Math.cos(spin);
    const sn = Math.sin(spin);
    const fw = d * Math.abs(cs);
    const th = d * 0.18 * Math.abs(sn);
    const side = Math.sign(cs * sn) || 1;
    c.drawImage(rim, x - (fw + th) / 2, y - d / 2, fw + th, d);
    if (fw > 0.6) {
      const q = (((spin / Math.PI) % 1) + 1.5) % 1; // 0 edge-on, 0.5 facing us, 1 edge-on again
      c.drawImage(faceAt(Math.min(COIN_BANDS - 1, Math.floor(q * COIN_BANDS))), x - fw / 2 + side * th * 0.5, y - d / 2, fw, d);
    }
    const f = Math.max(0, Math.abs(cs) - 0.82) / 0.18;
    if (f > 0.05) {
      const z = d * 1.15 * f;
      c.drawImage(glint, x - d * 0.2 - z / 2, y - d * 0.22 - z / 2, z, z);
    }
  }

  for (let i = 0; i < o.n; i += 1) launch(i);

  return {
    /** Fly the coins (with their trails), land them on the counter (burst, glow, sound, onLand) and move the sparkles. @param {number} dt seconds @param {number} w layer width @param {number} h layer height @returns {void} */
    step(dt, w, h) {
      W = w || W;
      H = h || H;
      target = o.to();
      shine *= Math.exp(-4 * dt);
      for (let i = coins.length - 1; i >= 0; i -= 1) {
        const p = coins[i];
        const lx = p.x;
        const ly = p.y;
        const down = move(p, dt);
        if (!down) { if (p.age >= 0) trail(p, lx, ly, dt); continue; }
        coins.splice(i, 1);
        land(landed === o.n - 1);
        o.onLand?.(landed);
        landed += 1;
      }
      for (let i = sparks.length - 1; i >= 0; i -= 1) {
        const s = sparks[i];
        s.age += dt;
        if (s.age >= s.life) { sparks[i] = sparks[sparks.length - 1]; sparks.pop(); continue; } // the one moved in has had its step
        const k = Math.exp(-s.drag * dt);
        s.vx *= k;
        s.vy = s.vy * k + s.grav * dt;
        s.x += s.vx * dt;
        s.y += s.vy * dt;
      }
      for (let i = bursts.length - 1; i >= 0; i -= 1) {
        bursts[i].age += dt;
        if (bursts[i].age >= bursts[i].life) bursts.splice(i, 1);
      }
      if (rise > 0) rising(dt);
    },
    /** The sparkles, each coin's glow, blur ghosts and the coin itself, then the landing bursts and the counter's glow and glint. @param {CanvasRenderingContext2D} c context (CSS px) @returns {void} */
    draw(c) {
      for (const s of sparks) {
        const u = s.age / s.life;
        const tw = 0.62 + 0.38 * Math.sin(s.age * 26 + s.tw); // the twinkle
        c.globalAlpha = clamp((u < 0.12 ? u / 0.12 : (1 - u) / 0.88) * (s.star ? 1 : tw), 0, 1);
        const z = s.size * (s.star ? tw : 1) * (1 - u * 0.35);
        c.drawImage(s.star ? spark : dust, s.x - z, s.y - z, z * 2, z * 2);
      }
      for (const p of coins) {
        if (p.age < 0) continue;
        const pop = coinPop(p.age);
        const d = D * (p.home ? lerp(pop, Math.max(0.55, (target.r * 2.2) / D), smooth(p.home.u)) : pop);
        c.globalAlpha = 0.75;
        c.drawImage(glow, p.x - d * 1.3, p.y - d * 1.3, d * 2.6, d * 2.6);
        const fast = clamp(p.speed / (S * 2.5), 0, 1);
        for (let g = 0; g < p.hist.length && fast > 0.1; g += 2) {
          const z = d * (g ? 0.8 : 0.92);
          c.globalAlpha = fast * (g ? 0.22 : 0.4);
          c.drawImage(ghost, p.hist[g] - z / 2, p.hist[g + 1] - z / 2, z, z);
        }
        c.globalAlpha = 1;
        drawCoin(c, p.x, p.y, d, p.spin);
      }
      const r = target.r;
      if (shine > 0.02) { // the counter glows a moment (one glow for all landings, so a quick run never blots out the number)
        c.globalAlpha = clamp(shine * 0.5, 0, 1);
        const z = r * 2.7 * (0.75 + 0.25 * shine);
        c.drawImage(glow, target.x - z, target.y - z, z * 2, z * 2);
        c.globalCompositeOperation = 'lighter';
        c.globalAlpha = clamp(shine * shine * 0.55, 0, 1);
        const f = r * 1.25;
        c.drawImage(flash, target.x - f, target.y - f, f * 2, f * 2);
        c.globalCompositeOperation = 'source-over';
      }
      for (const b of bursts) { // each landing: a bright ring growing out; the last one a bigger ring and a big glint
        const u = b.age / b.life;
        const rr = r * (1.05 + smooth(u) * (b.big ? 2.6 : 1.5));
        c.globalAlpha = (1 - u) * 0.9;
        c.strokeStyle = '#ffc23a';
        c.lineWidth = Math.max(1, r * (b.big ? 0.34 : 0.24) * (1 - u));
        c.beginPath(); c.arc(target.x, target.y, rr, 0, TAU); c.stroke();
        c.strokeStyle = '#fffbe6';
        c.lineWidth = Math.max(0.5, r * 0.1 * (1 - u));
        c.stroke();
        if (b.big) {
          const z = r * 2.8 * Math.sin(Math.PI * Math.min(1, u * 1.25));
          c.globalAlpha = 1;
          c.save();
          c.translate(target.x - r * 0.35, target.y - r * 0.45); // up on the coin's left, so the number stays readable
          c.rotate(u * 0.9);
          c.drawImage(glint, -z, -z, z * 2, z * 2);
          c.restore();
        }
      }
      if (shine > 0.05) { // a little star glint up on the counter's coin
        const s = r * 1.05 * shine;
        c.globalAlpha = 1;
        c.save();
        c.translate(target.x - r * 0.45, target.y - r * 0.5);
        c.rotate(shine * 0.6);
        c.drawImage(glint, -s, -s, s * 2, s * 2);
        c.restore();
      }
      c.globalAlpha = 1;
    },
    /** Whether every coin has landed and the last burst, glow and sparkle are over. @returns {boolean} done */
    done: () => coins.length === 0 && sparks.length === 0 && bursts.length === 0 && rise <= 0 && shine <= 0.02,
    /** Counts, for checks. @returns {object} state */
    state: () => ({ flying: coins.length, landed, sparks: sparks.length, sparked, bursts: bursts.length, ghosts: !lite }),
  };
}
