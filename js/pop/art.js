// Drawings for the pop scene, all made in code on canvas (no pictures, no photos, no real people): skin with pores,
// the bumps (whitehead, pink, blackhead, big, golden bonus, Evil Horn), glossy goo worms and drops (cream-coloured, never blood),
// the pink marks that fade, a blackhead strip with its peel, a cotton pad, cream dollops and tweezers. The face itself
// is drawn in face.js. engine.js moves all of it.
import { rng } from './logic.js';

// Goo colours and feel per kind (see gooLook). Bright, saturated, cartoon goo colours; never pale, never blood.
// width/speed/sag/reach/drip are factors on the strand's thickness, squirt speed, droop, length and lens drips.
const GOO_LOOK = {
  white: { body: '#fffef6', shade: '#e3e0cf', edge: '#9e9a86', hi: '#ffffff', width: 0.8, speed: 1.35, sag: 0.55, reach: 1.15, drip: 0.8, sparkle: false },
  cream: { body: '#fbe39a', shade: '#e8bf5a', edge: '#9c7224', hi: '#fffbe8', width: 1.3, speed: 0.75, sag: 1.6, reach: 0.9, drip: 1.3, sparkle: false },
  gold: { body: '#ffd84a', shade: '#f2a81c', edge: '#9e5f08', hi: '#fffbe0', width: 1, speed: 1, sag: 1, reach: 1, drip: 1, sparkle: true },
  horn: { body: '#eaf0a6', shade: '#c4cf5c', edge: '#6f7f24', hi: '#fbffe8', width: 0.9, speed: 0.85, sag: 1.2, reach: 0.7, drip: 0.7, sparkle: false },
};

/**
 * A new canvas of a size in CSS pixels, sharp on phones (dpr = device pixels per CSS pixel).
 * @param {number} w width
 * @param {number} h height
 * @param {number} dpr pixel ratio
 * @returns {{canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D}} the canvas, already scaled
 */
export function makeCanvas(w, h, dpr) {
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(w * dpr));
  canvas.height = Math.max(1, Math.round(h * dpr));
  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return { canvas, ctx };
}

/**
 * Paint skin into a rectangle: warm base, soft blotches, fine grain, pores and a gentle sheen.
 * @param {CanvasRenderingContext2D} ctx where to paint (CSS pixel units)
 * @param {number} w width
 * @param {number} h height
 * @param {number} dpr pixel ratio (for the grain)
 * @param {number} seed seed for the random details
 * @param {{poreSize?: number, redness?: number, tone?: string[]}} [o] pore scale, how red the skin is (0..1) and the
 *   skin colours as three '#rrggbb' stops (light, middle, shaded); a warm light tone when left out
 * @returns {void}
 */
export function paintSkin(ctx, w, h, dpr, seed, o = {}) {
  const rand = rng(seed);
  const pore = o.poreSize ?? 1;
  const tone = o.tone ?? ['#f3caa9', '#ebb795', '#dea385'];
  const base = ctx.createLinearGradient(0, 0, w, h);
  base.addColorStop(0, tone[0]);
  base.addColorStop(0.55, tone[1]);
  base.addColorStop(1, tone[2]);
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, w, h);
  // Soft blotches, a little redder or lighter here and there.
  for (let i = 0; i < 46; i += 1) {
    const x = rand() * w;
    const y = rand() * h;
    const r = 20 + rand() * 80;
    const warm = rand() < 0.55;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, warm ? `rgba(214,120,100,${0.05 + 0.05 * (o.redness ?? 0.5)})` : 'rgba(255,232,214,0.09)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }
  // Fine grain, made once as a small tile of noise and laid over the whole skin.
  try {
    const tile = Math.round(96 * dpr);
    const { canvas: nc, ctx: nx } = makeCanvas(tile, tile, 1);
    const img = nx.createImageData(tile, tile);
    for (let i = 0; i < img.data.length; i += 4) {
      const v = rand() * 255;
      img.data[i] = v; img.data[i + 1] = v * 0.8; img.data[i + 2] = v * 0.7; img.data[i + 3] = 22;
    }
    nx.putImageData(img, 0, 0);
    ctx.save();
    ctx.scale(1 / dpr, 1 / dpr);
    ctx.fillStyle = ctx.createPattern(nc, 'repeat');
    ctx.globalCompositeOperation = 'multiply';
    ctx.fillRect(0, 0, w * dpr, h * dpr);
    ctx.restore();
  } catch { /* no image data (very old browsers): smooth skin is fine too */ }
  // Pores: tiny dark dips with a light lower rim.
  const pores = Math.round((w * h) / (150 * pore * pore));
  for (let i = 0; i < pores; i += 1) {
    const x = rand() * w;
    const y = rand() * h;
    const r = (0.45 + rand() * 0.75) * pore;
    ctx.fillStyle = `rgba(140,70,52,${0.16 + rand() * 0.2})`;
    ctx.beginPath();
    ctx.ellipse(x, y, r, r * 0.8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,236,222,0.22)';
    ctx.beginPath();
    ctx.ellipse(x, y + r * 0.9, r * 0.9, r * 0.4, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  // A few fine lines in the skin.
  ctx.strokeStyle = 'rgba(160,90,70,0.07)';
  ctx.lineWidth = 0.8;
  for (let i = 0; i < 10; i += 1) {
    const x = rand() * w;
    const y = rand() * h;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.quadraticCurveTo(x + 20 + rand() * 30, y + (rand() - 0.5) * 20, x + 40 + rand() * 50, y + (rand() - 0.5) * 16);
    ctx.stroke();
  }
  // Sheen from a soft light above left.
  const sheen = ctx.createRadialGradient(w * 0.3, h * 0.2, 0, w * 0.3, h * 0.2, Math.max(w, h) * 0.8);
  sheen.addColorStop(0, 'rgba(255,245,235,0.18)');
  sheen.addColorStop(1, 'rgba(120,60,40,0.08)');
  ctx.fillStyle = sheen;
  ctx.fillRect(0, 0, w, h);
}

/**
 * One pimple. amt = how hard it is squeezed (0..1, plus wobble); appear = 0..1 while it grows in.
 * @param {CanvasRenderingContext2D} ctx the context
 * @param {{x: number, y: number, r: number, type: string}} p the pimple
 * @param {number} amt squeeze
 * @param {number} appear growth
 * @param {number} time seconds (for the golden twinkle)
 * @returns {void}
 */
export function drawPimple(ctx, p, amt, appear, time) {
  const s = p.r * appear * (1 + 0.45 * amt);
  if (s <= 0.3) return;
  const { x, y, type } = p;
  const halo = {
    red: ['rgba(232,104,104,0.55)', 2.5], whitehead: ['rgba(232,128,116,0.36)', 1.9], big: ['rgba(226,96,96,0.58)', 2.3],
    blackhead: ['rgba(170,110,90,0.16)', 1.6], gold: ['rgba(255,196,70,0.5)', 2.3], horn: ['rgba(214,104,140,0.45)', 2.1],
    hair: ['rgba(232,104,104,0.5)', 2.2],
  }[type] ?? ['rgba(232,128,116,0.36)', 1.9];
  const hr = s * halo[1];
  const g = ctx.createRadialGradient(x, y, s * 0.4, x, y, hr);
  g.addColorStop(0, halo[0]);
  g.addColorStop(1, 'rgba(232,104,104,0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, hr, 0, Math.PI * 2);
  ctx.fill();
  // Shadow under the bump (makes it stand up from the skin).
  ctx.fillStyle = 'rgba(120,50,40,0.16)';
  ctx.beginPath();
  ctx.ellipse(x + s * 0.18, y + s * 0.3, s * 1.0, s * 0.85, 0, 0, Math.PI * 2);
  ctx.fill();
  if (type === 'blackhead') {
    const rim = ctx.createRadialGradient(x - s * 0.3, y - s * 0.3, 0, x, y, s * 1.2);
    rim.addColorStop(0, '#f6d0b4');
    rim.addColorStop(1, 'rgba(226,170,140,0)');
    ctx.fillStyle = rim;
    ctx.beginPath(); ctx.arc(x, y, s * 1.2, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#3a2a22';
    ctx.beginPath(); ctx.arc(x, y, s * (0.5 + 0.1 * amt), 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.45)';
    ctx.beginPath(); ctx.arc(x - s * 0.18, y - s * 0.18, s * 0.14, 0, Math.PI * 2); ctx.fill();
    return;
  }
  if (type === 'horn') { // the Evil Horn: a pink swollen base with a little cartoon horn poking out (it rises and wiggles as it is squeezed)
    const base = ctx.createRadialGradient(x - s * 0.25, y - s * 0.1, s * 0.1, x, y + s * 0.15, s * 0.9);
    base.addColorStop(0, '#ffe2d8'); base.addColorStop(0.6, '#f6a7ad'); base.addColorStop(1, 'rgba(240,140,150,0.55)');
    ctx.fillStyle = base;
    ctx.beginPath(); ctx.ellipse(x, y + s * 0.3, s * 1.0, s * 0.64, 0, 0, Math.PI * 2); ctx.fill();
    ctx.lineWidth = Math.max(1.5, s * 0.08); // a pale rim, so the base reads on dark skin too
    ctx.strokeStyle = 'rgba(255,236,226,0.85)';
    ctx.stroke();
    const wiggle = amt > 0.05 ? Math.sin(time * 26) * 0.07 * Math.min(1, amt) : 0;
    drawHorn(ctx, x, y + s * 0.42 - s * 0.2 * Math.min(1, amt), s * 1.65, wiggle); // big enough to read on a phone
    return;
  }
  const dome = ctx.createRadialGradient(x - s * 0.3, y - s * 0.35, s * 0.1, x, y, s * 1.05);
  if (type === 'gold') {
    dome.addColorStop(0, '#fff8d0'); dome.addColorStop(0.5, '#f6cc4a'); dome.addColorStop(1, 'rgba(214,140,30,0.2)');
  } else {
    dome.addColorStop(0, '#ffc9bf'); dome.addColorStop(0.55, type === 'whitehead' ? '#f0a092' : '#ea7c78'); dome.addColorStop(1, 'rgba(206,92,88,0.15)');
  }
  ctx.fillStyle = dome;
  ctx.beginPath(); ctx.arc(x, y, s, 0, Math.PI * 2); ctx.fill();
  if (type === 'hair' && amt < 0.04) { // an ingrown hair: a tiny dark curl shows through the skin (it slides out when pulled)
    ctx.strokeStyle = 'rgba(60,36,30,0.72)';
    ctx.lineWidth = Math.max(1.2, s * 0.13);
    ctx.lineCap = 'round';
    ctx.beginPath();
    for (let i = 0; i <= 24; i += 1) { // a little spiral, about one and a half turns
      const a = i / 24 * Math.PI * 3;
      const rr = s * (0.12 + 0.4 * i / 24);
      const px = x + Math.cos(a) * rr;
      const py = y + Math.sin(a) * rr * 0.8;
      if (i) ctx.lineTo(px, py); else ctx.moveTo(px, py);
    }
    ctx.stroke();
  }
  // The creamy head: always on whiteheads and big ones, grows on pink ones as they are squeezed.
  const headR = type === 'whitehead' ? s * (0.55 + 0.15 * amt)
    : type === 'big' ? s * (0.42 + 0.2 * amt)
      : type === 'red' ? s * 0.38 * Math.min(1, amt * 1.4) : 0;
  if (headR > 0.5) {
    const hd = ctx.createRadialGradient(x - headR * 0.3, y - headR * 0.35, 0, x, y, headR);
    hd.addColorStop(0, '#fffef6'); hd.addColorStop(0.6, '#f7ecbe'); hd.addColorStop(1, '#e6cf8c');
    ctx.fillStyle = hd;
    ctx.beginPath(); ctx.arc(x, y - s * 0.05, headR, 0, Math.PI * 2); ctx.fill();
  }
  // Shine: stretched skin shines more.
  ctx.fillStyle = `rgba(255,255,255,${0.45 + 0.4 * Math.min(1, amt)})`;
  ctx.beginPath();
  ctx.ellipse(x - s * 0.36, y - s * 0.42, s * 0.26, s * 0.15, -0.6, 0, Math.PI * 2);
  ctx.fill();
  if (type === 'gold') drawTwinkle(ctx, x + s * 0.55, y - s * 0.6, s * (0.45 + 0.25 * Math.sin(time * 5 + x)), 0.9);
}

/**
 * A little cartoon horn (the Evil Horn): ivory, curled to one side, with two ridges and a shine. Its base sits on
 * (x, y) and it points up (turned by angle); it is about 1.3 times size tall. No goo, no blood: just a silly horn.
 * @param {CanvasRenderingContext2D} ctx the context
 * @param {number} x base centre x
 * @param {number} y base centre y
 * @param {number} size about the bump's radius
 * @param {number} [angle] turn in radians (0 = straight up)
 * @returns {void}
 */
export function drawHorn(ctx, x, y, size, angle = 0) {
  if (size <= 0.5) return;
  const bw = size * 0.95; // width at the base
  const hh = size * 1.3; // height
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  /** The horn's outline. @returns {void} */
  const outline = () => {
    ctx.beginPath();
    ctx.moveTo(-bw / 2, 0);
    ctx.bezierCurveTo(-bw * 0.5, -hh * 0.55, -bw * 0.05, -hh * 0.85, bw * 0.38, -hh);
    ctx.bezierCurveTo(bw * 0.12, -hh * 0.7, bw * 0.5, -hh * 0.35, bw / 2, 0);
    ctx.quadraticCurveTo(0, bw * 0.16, -bw / 2, 0);
    ctx.closePath();
  };
  const g = ctx.createLinearGradient(-bw / 2, 0, bw / 2, -hh);
  g.addColorStop(0, '#fff7e4'); g.addColorStop(0.55, '#f1dfb8'); g.addColorStop(1, '#d9bd8a');
  outline();
  ctx.lineWidth = Math.max(3, size * 0.2); // a pale halo round the horn, so it stands out on dark skin
  ctx.strokeStyle = 'rgba(255,248,232,0.9)';
  ctx.stroke();
  ctx.fillStyle = g;
  ctx.fill();
  ctx.lineWidth = Math.max(1, size * 0.07);
  ctx.strokeStyle = '#9a7650';
  ctx.stroke();
  ctx.save();
  outline();
  ctx.clip();
  ctx.strokeStyle = 'rgba(154,118,80,0.6)'; // ridges round the horn
  ctx.lineWidth = Math.max(1, size * 0.05);
  for (const k of [0.3, 0.55]) {
    ctx.beginPath();
    ctx.moveTo(-bw * 0.6, -hh * k + bw * 0.05);
    ctx.quadraticCurveTo(0, -hh * k + bw * 0.18, bw * 0.6, -hh * k - bw * 0.1);
    ctx.stroke();
  }
  ctx.restore();
  ctx.fillStyle = 'rgba(255,255,255,0.75)'; // shine
  ctx.beginPath();
  ctx.ellipse(-bw * 0.2, -hh * 0.4, size * 0.07, size * 0.24, 0.25, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/**
 * Where the points of a silly long curly hair are: it leaves (x, y) in direction dir and curls in loops along the
 * way (a stretched spring), waving gently. Shared by drawHair and the engine (the tweezers hold the last point).
 * @param {number} x root x
 * @param {number} y root y
 * @param {number} dir direction in radians the hair goes
 * @param {number} reach how far the hair has come out, in px (straight-line distance to the tip, about)
 * @param {number} scale scene scale (loop size)
 * @param {number} time seconds, for the wave (0 = still, for reduced motion)
 * @returns {{x: number, y: number}[]} points from the root to the tip
 */
export function hairPoints(x, y, dir, reach, scale, time) {
  const R = 8 * scale; // loop radius
  const a = R * 0.5; // advance per radian: below R, so the curve makes loops
  const turns = Math.max(0, reach) / a;
  const n = Math.max(2, Math.ceil(turns * 5));
  const c = Math.cos(dir);
  const sn = Math.sin(dir);
  const pts = [];
  for (let i = 0; i <= n; i += 1) {
    const th = (i / n) * turns;
    const u = a * th - R * Math.sin(th) * 0.9;
    const k = turns > 0 ? th / turns : 0;
    const v = R * (1 - Math.cos(th)) * 0.7 + Math.sin(th * 0.18 - time * 3) * R * 1.4 * k; // the curl, plus a wave
    pts.push({ x: x + c * u - sn * v, y: y + sn * u + c * v });
  }
  return pts;
}

/**
 * A silly long curly hair (the ingrown hair coming out): a dark wiry line with a pale halo so it reads on any skin.
 * Cartoon only: no blood, no root bulb, just a springy hair.
 * @param {CanvasRenderingContext2D} ctx the context
 * @param {{x: number, y: number}[]} pts the points (hairPoints)
 * @param {number} width line width in px
 * @returns {void}
 */
export function drawHair(ctx, pts, width) {
  if (pts.length < 2) return;
  /** Trace the hair's path. @returns {void} */
  const path = () => {
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i += 1) ctx.lineTo(pts[i].x, pts[i].y);
  };
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  path();
  ctx.strokeStyle = 'rgba(255,246,236,0.75)'; // pale halo
  ctx.lineWidth = width * 2.6;
  ctx.stroke();
  path();
  ctx.strokeStyle = '#3b2620';
  ctx.lineWidth = width;
  ctx.stroke();
  ctx.restore();
}

/**
 * A four-pointed twinkle star.
 * @param {CanvasRenderingContext2D} ctx the context
 * @param {number} x centre x
 * @param {number} y centre y
 * @param {number} r size
 * @param {number} alpha opacity
 * @returns {void}
 */
export function drawTwinkle(ctx, x, y, r, alpha) {
  if (r <= 0) return;
  ctx.fillStyle = `rgba(255,252,220,${alpha})`;
  ctx.beginPath();
  ctx.moveTo(x, y - r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.quadraticCurveTo(x, y, x, y + r);
  ctx.quadraticCurveTo(x, y, x - r, y);
  ctx.quadraticCurveTo(x, y, x, y - r);
  ctx.fill();
}

/**
 * The soft pink mark left where a pimple was (it fades away when the skin heals; never a wound).
 * @param {CanvasRenderingContext2D} ctx the context
 * @param {{x: number, y: number, r: number}} m the mark
 * @param {number} alpha opacity
 * @returns {void}
 */
export function drawMark(ctx, m, alpha = 1) {
  const g = ctx.createRadialGradient(m.x, m.y, 0, m.x, m.y, m.r * 1.5);
  g.addColorStop(0, `rgba(236,128,124,${0.42 * alpha})`);
  g.addColorStop(1, 'rgba(236,128,124,0)');
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(m.x, m.y, m.r * 1.5, 0, Math.PI * 2); ctx.fill();
}

/**
 * A decoy drawn as part of the skin (T1.3b): a small raised mole, a tiny beauty mark, a freckle cluster, or a bigger
 * flat brown "suspicious mole". No redness glow and no shine like a bump; dark tones with some see-through, so they
 * read on light and dark skin alike.
 * @param {CanvasRenderingContext2D} ctx the context
 * @param {{kind: string, x: number, y: number, r: number, axis?: number, dots?: {u: number, v: number, s: number}[]}} d the decoy
 * @returns {void}
 */
export function drawDecoy(ctx, d) {
  const { x, y, r } = d;
  ctx.save();
  if (d.kind === 'freckles') {
    ctx.fillStyle = 'rgba(122,70,38,0.72)';
    for (const f of d.dots ?? []) {
      ctx.beginPath(); ctx.arc(x + f.u * r, y + f.v * r, Math.max(2, f.s * r * 1.3), 0, Math.PI * 2); ctx.fill();
    }
  } else if (d.kind === 'beauty') {
    ctx.fillStyle = 'rgba(42,24,18,0.9)';
    ctx.beginPath(); ctx.arc(x, y, Math.max(1.8, r), 0, Math.PI * 2); ctx.fill();
  } else if (d.kind === 'suspicious') { // flat and brown, a bit lopsided: two overlapping soft ovals, no shine
    ctx.translate(x, y);
    ctx.rotate(d.axis ?? 0);
    ctx.fillStyle = 'rgba(112,68,40,0.82)';
    ctx.beginPath(); ctx.ellipse(0, 0, r, r * 0.82, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(78,46,28,0.55)';
    ctx.beginPath(); ctx.ellipse(r * 0.22, r * 0.08, r * 0.6, r * 0.5, 0.4, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(64,36,22,0.5)';
    ctx.lineWidth = Math.max(1, r * 0.1);
    ctx.beginPath(); ctx.ellipse(0, 0, r, r * 0.82, 0, 0, Math.PI * 2); ctx.stroke();
  } else { // mole: a small dark raised dot with a soft little highlight
    const g = ctx.createRadialGradient(x - r * 0.35, y - r * 0.35, r * 0.1, x, y, r);
    g.addColorStop(0, 'rgba(110,72,52,0.95)');
    g.addColorStop(1, 'rgba(46,26,18,0.95)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(x, y, Math.max(2.4, r), 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
}

/**
 * The goo of one kind of bump: its colours and how it moves (T1.6). Every kind looks different:
 * white = milky white, thin and quick; cream = thick yellow custard that sags and drips; gold = glitter goo;
 * horn = a small dab of pale green-yellow. Unknown kinds (and the blackhead plug) use white.
 * @param {string|undefined} goo the goo kind from data/bumps.js ('white', 'cream', 'gold', 'horn')
 * @returns {{body: string, shade: string, edge: string, hi: string, width: number, speed: number, sag: number,
 *   reach: number, drip: number, sparkle: boolean}} colours plus feel factors (1 = the old default)
 */
export function gooLook(goo) {
  return GOO_LOOK[goo] ?? GOO_LOOK.white;
}

/** Which goo kind an item carries (older items only had a gold flag). @param {{goo?: string, gold?: boolean}} s item @returns {object} look */
const lookOf = (s) => gooLook(s.goo ?? (s.gold ? 'gold' : 'white'));

/**
 * Keep a list of live goo items under a cap by dropping the oldest ones (so a pop-pop-pop chain never piles up).
 * @param {any[]} list the list (changed in place; oldest first)
 * @param {number} max the most items to keep
 * @returns {number} how many were dropped
 */
export function capList(list, max) {
  const extra = list.length - max;
  if (extra <= 0) return 0;
  list.splice(0, extra);
  return extra;
}

/**
 * The drips of a lens splat at an age: each slides down at its own speed and slows to a stop.
 * Pure, so tests can check it. The splat's `drips` (count) and `size` (scale) are the "amount" knobs:
 * a normal big pimple uses about 3 drips at size 1; a later super zit can ask for many drips at a huge size.
 * @param {{r: number, seed: number, drips?: number, size?: number}} s the splat (r = radius in px)
 * @param {number} age seconds since it hit the lens
 * @returns {{x: number, w: number, len: number}[]} for each drip: offset from the middle, width, length below the middle
 */
export function splatDrips(s, age) {
  const rand = rng((s.seed ^ 0x5bd1e995) >>> 0);
  const n = Math.max(0, Math.round(s.drips ?? 3));
  const r = s.r * (s.size ?? 1);
  const out = [];
  for (let i = 0; i < n; i += 1) {
    const x = ((i + 0.5) / n - 0.5) * r * 1.3 + (rand() - 0.5) * r * 0.25;
    const w = r * (0.16 + rand() * 0.12);
    const speed = 0.5 + rand() * 0.9; // in radii per second at the start
    const far = r * (0.9 + rand() * 1.4); // where it stops
    const t = Math.max(0, age - rand() * 0.25);
    const len = r * 0.55 + far * (1 - Math.exp(-t * speed * r / far));
    out.push({ x, w, len: Math.min(len, r * 0.55 + far) });
  }
  return out;
}

/**
 * A worm of glossy goo (like toothpaste out of a tube): soft shadow, darker rim, body, a round squelchy head that
 * stretches while it comes out, and a shiny streak. Colour and look per goo kind (gooLook).
 * @param {CanvasRenderingContext2D} ctx the context
 * @param {{pts: {x: number, y: number}[], w: number, goo?: string, gold?: boolean, tip?: boolean, len?: number, max?: number}} s
 *   the strand (tip = dark blackhead tip; len/max = how far it has come out)
 * @returns {void}
 */
export function drawStrand(ctx, s) {
  const pts = s.pts;
  if (!pts.length) return;
  const c = lookOf(s);
  /** Trace part of the strand's line, shifted a little. @param {number} dx shift x @param {number} dy shift y @param {number} from first point @returns {void} */
  const trace = (dx, dy, from = 0) => {
    ctx.beginPath();
    ctx.moveTo(pts[from].x + dx, pts[from].y + dy);
    for (let i = from + 3; i < pts.length; i += 3) ctx.lineTo(pts[i].x + dx, pts[i].y + dy); // every third point is plenty
    const e = pts[pts.length - 1];
    ctx.lineTo(e.x + dx + 0.01, e.y + dy);
  };
  const e = pts[pts.length - 1];
  const b = pts[Math.max(0, pts.length - 4)];
  const ang = Math.atan2(e.y - b.y, e.x - b.x);
  const grow = s.max ? Math.max(0, 1 - (s.len ?? s.max) / s.max) : 0; // 1 just out, 0 when done
  const hr = s.w * 0.62; // the head is a little fatter than the worm
  /** The round head at the end, stretched along the worm while it squirts out. @param {number} growBy extra radius @returns {void} */
  const head = (growBy) => { ctx.beginPath(); ctx.ellipse(e.x, e.y, hr * (1 + grow * 0.45) + growBy, hr * (1 - grow * 0.2) + growBy, ang, 0, Math.PI * 2); };
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = 'rgba(110,60,30,0.2)'; // soft shadow on the skin
  ctx.lineWidth = s.w + 2;
  trace(s.w * 0.25, s.w * 0.4); ctx.stroke();
  ctx.strokeStyle = c.edge;
  ctx.lineWidth = s.w + 1.6;
  trace(0, 0); ctx.stroke();
  ctx.fillStyle = c.edge; head(0.8); ctx.fill();
  ctx.strokeStyle = c.shade; // the darker underside gives it roundness
  ctx.lineWidth = s.w;
  trace(0, 0); ctx.stroke();
  ctx.fillStyle = c.shade; head(0); ctx.fill();
  ctx.strokeStyle = c.body;
  ctx.lineWidth = s.w * 0.62;
  trace(-s.w * 0.1, -s.w * 0.14); ctx.stroke();
  ctx.fillStyle = c.body;
  ctx.beginPath(); ctx.ellipse(e.x - hr * 0.12, e.y - hr * 0.15, hr * 0.78 * (1 + grow * 0.4), hr * 0.72, ang, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = c.hi;
  ctx.lineWidth = Math.max(0.8, s.w * 0.2);
  if (pts.length > 6) { trace(-s.w * 0.2, -s.w * 0.24, 3); ctx.stroke(); }
  ctx.fillStyle = c.hi;
  ctx.beginPath(); ctx.arc(e.x - hr * 0.35, e.y - hr * 0.4, Math.max(0.7, hr * 0.24), 0, Math.PI * 2); ctx.fill();
  if (s.tip) { // the dark tip of a blackhead plug
    ctx.fillStyle = '#3a2a22';
    ctx.beginPath(); ctx.arc(e.x, e.y, s.w * 0.55, 0, Math.PI * 2); ctx.fill();
  }
  if (c.sparkle) for (let i = 2; i < pts.length; i += 6) drawTwinkle(ctx, pts[i].x + s.w * 0.4, pts[i].y - s.w * 0.4, s.w * 0.5, 0.85);
}

/**
 * A drop of goo. Flying: lifted off the skin with its shadow below, stretched along its flight. Landed: a glossy blob
 * that squashes flat when it hits, then wobbles round, with a tiny smear behind it where it slid.
 * @param {CanvasRenderingContext2D} ctx the context
 * @param {{x: number, y: number, r: number, z?: number, vx?: number, vy?: number, vz?: number, goo?: string, gold?: boolean,
 *   age?: number, sa?: number}} d the drop (z = height above the skin; age = seconds since it landed; sa = slide angle)
 * @returns {void}
 */
export function drawDrop(ctx, d) {
  const z = d.z ?? 0;
  const c = lookOf(d);
  const r = d.r * (1 + z / 160);
  if (z > 0.5) { // flying: shadow on the skin, body stretched along the way it moves
    ctx.fillStyle = 'rgba(110,60,30,0.16)';
    ctx.beginPath(); ctx.ellipse(d.x, d.y, d.r, d.r * 0.7, 0, 0, Math.PI * 2); ctx.fill();
    const y = d.y - z * 0.6;
    const vx = d.vx ?? 0;
    const vy = (d.vy ?? 0) - (d.vz ?? 0) * 0.6;
    const sp = Math.hypot(vx, vy);
    const st = Math.min(0.7, sp / 400); // stretch
    const a = Math.atan2(vy, vx);
    ctx.fillStyle = c.edge;
    ctx.beginPath(); ctx.ellipse(d.x, y, r * (1 + st) + 0.7, r * (1 - st * 0.4) + 0.7, a, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = c.body;
    ctx.beginPath(); ctx.ellipse(d.x, y, r * (1 + st), r * (1 - st * 0.4), a, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = c.hi;
    ctx.beginPath(); ctx.arc(d.x - r * 0.3, y - r * 0.32, r * 0.28, 0, Math.PI * 2); ctx.fill();
    return;
  }
  // Landed: squash flat on impact, bounce back with a small wobble (age), then stay put.
  const age = d.age ?? 1;
  const k = age < 0.35 ? Math.exp(-age * 9) * Math.cos(age * 30) : 0;
  const rx = r * (1 + 0.45 * k);
  const ry = r * 0.86 * (1 - 0.4 * k);
  if (d.sa !== undefined && r > 1.4) { // a tiny smear where it slid on the skin
    const tx = d.x - Math.cos(d.sa) * r * 1.1;
    const ty = d.y - Math.sin(d.sa) * r * 1.1;
    ctx.strokeStyle = c.shade;
    ctx.lineCap = 'round';
    ctx.lineWidth = r * 1.2;
    ctx.beginPath(); ctx.moveTo(tx, ty); ctx.lineTo(d.x, d.y); ctx.stroke();
  }
  ctx.fillStyle = c.edge;
  ctx.beginPath(); ctx.ellipse(d.x, d.y, rx + 0.7, ry + 0.7, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = c.shade;
  ctx.beginPath(); ctx.ellipse(d.x, d.y, rx, ry, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = c.body;
  ctx.beginPath(); ctx.ellipse(d.x - rx * 0.12, d.y - ry * 0.16, rx * 0.74, ry * 0.68, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = c.hi;
  ctx.beginPath(); ctx.ellipse(d.x - rx * 0.36, d.y - ry * 0.36, rx * 0.28, ry * 0.2, -0.5, 0, Math.PI * 2); ctx.fill();
  if (c.sparkle && d.r > 2.4) drawTwinkle(ctx, d.x + rx * 0.5, d.y - ry * 0.6, rx * 0.8, 0.8);
}

/**
 * A juicy cartoon splat of goo on the "camera lens" (the glass in front of the picture), drawn in screen space:
 * a lumpy blob with a few flecks around it, a darker rim, glossy highlights like goo on glass, and drips that
 * slide down and slow to a stop. It fades softly at the end (s.a). Colour per goo kind.
 * Amount knobs (for a later super zit): s.size scales the whole splat, s.drips is how many drips run down.
 * Normal big pimples use size 1 and about 3 drips; a super zit can call it full-screen with many drips.
 * @param {CanvasRenderingContext2D} ctx the context (screen transform)
 * @param {{x: number, y: number, r: number, a: number, seed: number, age?: number, born?: number, goo?: string,
 *   gold?: boolean, size?: number, drips?: number}} s the splat (age = seconds on the lens)
 * @param {number} [now] the time, used for the age when s.age is not set
 * @returns {void}
 */
export function drawSplat(ctx, s, now) {
  const rand = rng(s.seed);
  const c = lookOf(s);
  const age = s.age ?? Math.max(0, (now ?? 0) - (s.born ?? 0));
  const r = s.r * (s.size ?? 1);
  const hit = Math.min(1, age / 0.12); // it slaps on: a quick grow with a little overshoot
  const k = hit < 1 ? 0.6 + hit * 0.55 : 1 + Math.exp(-age * 12) * 0.12;
  const rr = r * k;
  ctx.save();
  ctx.globalAlpha = Math.max(0, Math.min(1, s.a)) * 0.95;
  // The blob outline: lumpy points joined by smooth curves; flecks and drips join the same path.
  const n = 11;
  const pts = [];
  for (let i = 0; i < n; i += 1) {
    const a = (i / n) * Math.PI * 2;
    const q = rr * (0.74 + rand() * 0.38);
    pts.push([s.x + Math.cos(a) * q, s.y + Math.sin(a) * q * 0.88]);
  }
  /** Trace the whole splat (blob, flecks, drips), grown by g px. @param {number} g grow @returns {void} */
  const shape = (g) => {
    ctx.beginPath();
    for (let i = 0; i <= n; i += 1) {
      const p0 = pts[i % n];
      const p1 = pts[(i + 1) % n];
      const ex = (p0[0] - s.x) / rr * g;
      const ey = (p0[1] - s.y) / rr * g;
      const mx = (p0[0] + p1[0]) / 2 + ex;
      const my = (p0[1] + p1[1]) / 2 + ey;
      if (i === 0) ctx.moveTo(mx, my); else ctx.quadraticCurveTo(p0[0] + ex, p0[1] + ey, mx, my);
    }
    ctx.closePath();
    const fr = rng(s.seed + 7);
    for (let i = 0; i < 4; i += 1) { // flecks flung around the blob
      const a = fr() * Math.PI * 2;
      const d = rr * (1.15 + fr() * 0.45);
      const fx = s.x + Math.cos(a) * d;
      const fy = s.y + Math.sin(a) * d * 0.88;
      const f = rr * (0.07 + fr() * 0.09) + g * 0.45; // a thin rim, so flecks read as drops, not rings
      ctx.moveTo(fx + f, fy);
      ctx.arc(fx, fy, f, 0, Math.PI * 2);
    }
    for (const dr of drips) { // each drip: a column that narrows a little, with a round bead at the end
      const x = s.x + dr.x * k;
      const top = s.y + rr * 0.3;
      const end = s.y + dr.len * k;
      const hw = dr.w / 2 + g;
      ctx.moveTo(x + hw, top); // same turning way as the blob, so the fill has no holes
      ctx.lineTo(x + hw * 0.8, end);
      ctx.lineTo(x - hw * 0.8, end);
      ctx.lineTo(x - hw, top);
      ctx.closePath();
      ctx.moveTo(x + hw * 1.15, end);
      ctx.arc(x, end, hw * 1.15, 0, Math.PI * 2);
    }
  };
  const drips = splatDrips(s, age);
  const g = ctx.createRadialGradient(s.x - rr * 0.3, s.y - rr * 0.35, rr * 0.1, s.x, s.y, rr * 1.6);
  g.addColorStop(0, c.body);
  g.addColorStop(0.55, c.body);
  g.addColorStop(1, c.shade);
  ctx.fillStyle = c.edge; // the darker rim
  shape(Math.max(1.2, rr * 0.06)); ctx.fill();
  ctx.fillStyle = g;
  shape(0); ctx.fill();
  // Glossy highlights like light on wet glass: a big curved shine, a small dot, and a glint on each drip bead.
  ctx.fillStyle = c.hi;
  ctx.beginPath(); ctx.ellipse(s.x - rr * 0.32, s.y - rr * 0.34, rr * 0.34, rr * 0.13, -0.6, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(s.x + rr * 0.05, s.y - rr * 0.52, rr * 0.06, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(s.x + rr * 0.38, s.y + rr * 0.22, rr * 0.08, 0, Math.PI * 2); ctx.fill();
  for (const dr of drips) {
    const hw = dr.w / 2;
    const x = s.x + dr.x * k;
    const end = s.y + dr.len * k;
    ctx.beginPath(); ctx.arc(x - hw * 0.35, end - hw * 0.35, hw * 0.3, 0, Math.PI * 2); ctx.fill();
  }
  if (c.sparkle) for (let i = 0; i < 3; i += 1) drawTwinkle(ctx, s.x + (rand() - 0.5) * rr * 1.2, s.y + (rand() - 0.5) * rr, rr * 0.25, 0.9);
  ctx.restore();
}

/**
 * A fingertip pressing into the skin, seen from above: a rounded finger coming in from outside, with its nail.
 * @param {CanvasRenderingContext2D} ctx the context
 * @param {number} x where the tip presses
 * @param {number} y where the tip presses
 * @param {number} angle direction from the tip towards the hand (radians)
 * @param {number} width finger width
 * @param {number} alpha opacity (fades in as the squeeze starts)
 * @param {boolean} [glove] true = in her blue rubber glove (SPEC D32e): blue, no nail, a long rubber shine
 * @returns {void}
 */
export function drawFinger(ctx, x, y, angle, width, alpha, glove = false) {
  if (alpha <= 0) return;
  const len = width * 3.2;
  const hw = width / 2;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.shadowColor = 'rgba(70,30,20,0.35)';
  ctx.shadowBlur = width * 0.35;
  ctx.shadowOffsetY = width * 0.12;
  const g = ctx.createLinearGradient(0, -hw, 0, hw);
  const stops = glove ? ['#4d9fcc', '#9ad9f7', '#74c2ea', '#3f8dba'] : ['#d5937a', '#f5c8ad', '#eab196', '#c98068'];
  [0, 0.35, 0.7, 1].forEach((at, i) => g.addColorStop(at, stops[i]));
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(len, -hw);
  ctx.lineTo(hw, -hw);
  ctx.arc(hw, 0, hw, -Math.PI / 2, Math.PI / 2, true);
  ctx.lineTo(len, hw);
  ctx.closePath();
  ctx.fill();
  ctx.shadowColor = 'transparent';
  if (glove) {
    // Rubber: a long soft shine along the finger and a cuff ring near the hand, no nail.
    ctx.fillStyle = 'rgba(255,255,255,0.45)';
    ctx.beginPath(); ctx.ellipse(width * 1.3, -hw * 0.42, width * 1.05, hw * 0.14, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(40,90,130,0.45)';
    ctx.lineWidth = Math.max(1, width * 0.08);
    ctx.beginPath(); ctx.moveTo(width * 2.7, -hw * 0.95); ctx.quadraticCurveTo(width * 2.6, 0, width * 2.7, hw * 0.95); ctx.stroke();
    ctx.restore();
    return;
  }
  // The nail, near the tip.
  const ng = ctx.createLinearGradient(0, -hw * 0.6, 0, hw * 0.6);
  ng.addColorStop(0, '#f3cfc4');
  ng.addColorStop(0.5, '#fbe6de');
  ng.addColorStop(1, '#e9b9ab');
  ctx.fillStyle = ng;
  ctx.beginPath();
  ctx.moveTo(width * 1.55, -hw * 0.62);
  ctx.lineTo(width * 0.45, -hw * 0.62);
  ctx.quadraticCurveTo(width * 0.12, 0, width * 0.45, hw * 0.62);
  ctx.lineTo(width * 1.55, hw * 0.62);
  ctx.quadraticCurveTo(width * 1.7, 0, width * 1.55, -hw * 0.62);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.55)'; // shine on the nail
  ctx.beginPath(); ctx.ellipse(width * 0.95, -hw * 0.28, width * 0.38, hw * 0.12, 0, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = 'rgba(160,90,70,0.35)'; // knuckle crease
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(width * 2.4, -hw * 0.7); ctx.quadraticCurveTo(width * 2.3, 0, width * 2.4, hw * 0.7); ctx.stroke();
  ctx.restore();
}

/**
 * A rounded rectangle path.
 * @param {CanvasRenderingContext2D} ctx the context
 * @param {number} x left
 * @param {number} y top
 * @param {number} w width
 * @param {number} h height
 * @param {number} r corner radius
 * @returns {void}
 */
function roundRect(ctx, x, y, w, h, r) {
  const rr = Math.max(0, Math.min(r, w / 2, h / 2));
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

/**
 * The blackhead strip, peeled `q` of the way from the left: the stuck part, and the flap folded back showing the
 * little dark plugs it pulled out.
 * @param {CanvasRenderingContext2D} ctx the context
 * @param {{x: number, y: number, w: number, h: number, dots: {x: number, y: number}[]}} s the strip
 * @param {number} q peel progress 0..1
 * @param {number} lift extra lift when it flies off (0..1)
 * @returns {void}
 */
export function drawStrip(ctx, s, q, lift = 0) {
  const fold = s.x + q * s.w;
  // Tiny blackheads still under the part that has not been peeled show through faintly.
  if (q < 1) {
    const stuck = s.x + s.w - fold;
    ctx.save();
    ctx.shadowColor = 'rgba(60,30,20,0.25)';
    ctx.shadowBlur = 4;
    ctx.shadowOffsetY = 1.5;
    roundRect(ctx, fold, s.y, stuck, s.h, Math.min(s.h * 0.35, stuck / 2));
    ctx.fillStyle = '#f5f1e8';
    ctx.fill();
    ctx.restore();
    ctx.save();
    roundRect(ctx, fold, s.y, stuck, s.h, Math.min(s.h * 0.35, stuck / 2));
    ctx.clip();
    ctx.fillStyle = 'rgba(190,170,140,0.35)';
    for (let x = fold + 4; x < s.x + s.w; x += 7) for (let y = s.y + 4; y < s.y + s.h; y += 7) { ctx.beginPath(); ctx.arc(x, y, 0.9, 0, Math.PI * 2); ctx.fill(); }
    ctx.restore();
  }
  if (q <= 0.01) {
    // A little tab on the left to show where to pull.
    ctx.fillStyle = '#e9e2d2';
    roundRect(ctx, s.x - s.h * 0.35, s.y + s.h * 0.2, s.h * 0.5, s.h * 0.6, s.h * 0.2);
    ctx.fill();
    return;
  }
  // The flap: folded back over itself to the left, lifted a little.
  const len = q * s.w;
  ctx.save();
  ctx.translate(fold, s.y - lift * s.h * 3);
  ctx.rotate(-0.18 - 0.35 * q - lift * 0.6);
  ctx.shadowColor = 'rgba(60,30,20,0.3)';
  ctx.shadowBlur = 8;
  ctx.shadowOffsetY = 4;
  roundRect(ctx, -len * 0.92, 0, len * 0.92, s.h, s.h * 0.3);
  ctx.fillStyle = '#ece4d3';
  ctx.fill();
  ctx.shadowColor = 'transparent';
  // The plugs it pulled out (mirrored, on the sticky side).
  for (const d of s.dots) {
    if (d.x > fold) continue;
    const fx = -(fold - d.x) * 0.92;
    const fy = d.y - s.y;
    ctx.fillStyle = '#f2e3b0';
    ctx.beginPath(); ctx.ellipse(fx, fy, 1.4, 3.2, 0.3, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#3a2a22';
    ctx.beginPath(); ctx.arc(fx, fy - 2.4, 1.3, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
}

/**
 * Tiny blackheads (the dots under the strip) on the skin.
 * @param {CanvasRenderingContext2D} ctx the context
 * @param {{x: number, y: number}[]} dots positions
 * @param {number} fromX only dots right of this x are drawn (left of it the strip has pulled them out)
 * @returns {void}
 */
export function drawStripDots(ctx, dots, fromX) {
  ctx.fillStyle = 'rgba(58,42,34,0.75)';
  for (const d of dots) if (d.x > fromX) { ctx.beginPath(); ctx.arc(d.x, d.y, 1.3, 0, Math.PI * 2); ctx.fill(); }
}

/**
 * The cotton pad for wiping.
 * @param {CanvasRenderingContext2D} ctx the context
 * @param {number} x centre x
 * @param {number} y centre y
 * @param {number} r radius
 * @returns {void}
 */
export function drawPad(ctx, x, y, r) {
  ctx.save();
  ctx.shadowColor = 'rgba(40,30,30,0.25)';
  ctx.shadowBlur = 8;
  ctx.shadowOffsetY = 3;
  const g = ctx.createRadialGradient(x - r * 0.3, y - r * 0.3, r * 0.1, x, y, r);
  g.addColorStop(0, '#ffffff');
  g.addColorStop(1, '#e7ebef');
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
  ctx.strokeStyle = 'rgba(170,180,190,0.5)';
  ctx.setLineDash([2, 3]);
  ctx.lineWidth = 1;
  for (const k of [0.45, 0.75]) { ctx.beginPath(); ctx.arc(x, y, r * k, 0, Math.PI * 2); ctx.stroke(); }
  ctx.setLineDash([]);
}

/**
 * A dollop of healing cream with a little swirl on top.
 * @param {CanvasRenderingContext2D} ctx the context
 * @param {number} x centre x
 * @param {number} y centre y
 * @param {number} r size
 * @param {number} alpha opacity (fades as it is rubbed in)
 * @returns {void}
 */
export function drawCream(ctx, x, y, r, alpha) {
  if (alpha <= 0 || r <= 0) return;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = 'rgba(200,190,200,0.6)';
  ctx.beginPath(); ctx.ellipse(x + r * 0.15, y + r * 0.25, r, r * 0.7, 0, 0, Math.PI * 2); ctx.fill();
  const g = ctx.createRadialGradient(x - r * 0.3, y - r * 0.4, 0, x, y, r);
  g.addColorStop(0, '#ffffff');
  g.addColorStop(1, '#eef0fb');
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.ellipse(x, y, r, r * 0.72, 0, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(x, y - r * 0.4, r * 0.55, r * 0.42, 0, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath();
  ctx.moveTo(x - r * 0.15, y - r * 0.7);
  ctx.quadraticCurveTo(x + r * 0.1, y - r * 1.25, x + r * 0.32, y - r * 0.95);
  ctx.quadraticCurveTo(x + r * 0.15, y - r * 0.75, x - r * 0.15, y - r * 0.7);
  ctx.fill();
  ctx.restore();
}

/**
 * Tweezers coming in from the upper right; their tips close on (x, y) as they grip, then they pull up.
 * @param {CanvasRenderingContext2D} ctx the context
 * @param {number} x tip x
 * @param {number} y tip y
 * @param {number} open 0 = closed, 1 = wide open
 * @param {number} scale size
 * @returns {void}
 */
export function drawTweezers(ctx, x, y, open, scale) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(-0.85);
  const len = 120 * scale;
  const gap = (3 + 9 * open) * scale;
  for (const side of [-1, 1]) {
    const g = ctx.createLinearGradient(0, side * gap, 0, side * (gap + 6 * scale));
    g.addColorStop(0, '#eef2f5');
    g.addColorStop(1, '#8b969f');
    ctx.fillStyle = g;
    ctx.strokeStyle = 'rgba(60,70,80,0.5)';
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(0, side * 1);
    ctx.lineTo(len, side * (gap + 7 * scale));
    ctx.lineTo(len, side * (gap + 1 * scale));
    ctx.lineTo(4 * scale, side * 0.2);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }
  ctx.restore();
}

/**
 * The warm cloth held on the face: a folded, soft pink towel with little wavy steam lines rising from it.
 * @param {CanvasRenderingContext2D} ctx the context
 * @param {number} x centre x
 * @param {number} y centre y
 * @param {number} r size (half the width)
 * @param {number} time seconds, for the steam wobble (0 = still, for reduced motion)
 * @param {number} [heat] the hottest bump under it, 0..1 (SPEC D41): from half way the towel turns red, shakes a
 *   little and steams harder, so the warning shows even though the cloth covers the bump
 * @returns {void}
 */
export function drawCloth(ctx, x, y, r, time, heat = 0) {
  const hot = Math.max(0, Math.min(1, (heat - 0.4) / 0.6)); // the warning part, 0..1
  ctx.save();
  ctx.translate(x + (time && hot ? Math.sin(time * 55) * r * 0.06 * hot : 0), y);
  ctx.rotate(-0.12);
  ctx.shadowColor = 'rgba(70,30,30,0.3)';
  ctx.shadowBlur = r * 0.3;
  ctx.shadowOffsetY = r * 0.1;
  roundRect(ctx, -r, -r * 0.62, r * 2, r * 1.24, r * 0.28);
  ctx.fillStyle = hot ? `rgb(255,${Math.round(179 - 95 * hot)},${Math.round(196 - 120 * hot)})` : '#ffb3c4'; // pink, red when too hot
  ctx.fill();
  ctx.shadowColor = 'transparent';
  ctx.strokeStyle = 'rgba(255,255,255,0.7)'; // the fold and the stripes of a towel
  ctx.lineWidth = Math.max(1.5, r * 0.08);
  for (const k of [-0.62, 0.62]) { ctx.beginPath(); ctx.moveTo(k * r, -r * 0.5); ctx.lineTo(k * r, r * 0.5); ctx.stroke(); }
  ctx.strokeStyle = 'rgba(200,90,120,0.35)';
  ctx.beginPath(); ctx.moveTo(-r * 0.9, 0); ctx.lineTo(r * 0.9, 0); ctx.stroke();
  ctx.strokeStyle = 'rgba(255,255,255,0.75)'; // steam
  ctx.lineCap = 'round';
  ctx.lineWidth = Math.max(1.5, r * (0.07 + 0.05 * hot)); // thicker steam when too hot
  for (const s of [-0.45, 0, 0.45]) {
    const rise = ((time * (0.8 + 1.2 * hot) + s + 1) % 1) * r * 0.3; // faster too
    ctx.globalAlpha = time ? 1 - rise / (r * 0.3) : 0.8;
    ctx.beginPath();
    ctx.moveTo(s * r, -r * 0.75 - rise);
    ctx.bezierCurveTo(s * r + r * 0.15, -r * 0.95 - rise, s * r - r * 0.15, -r * 1.1 - rise, s * r, -r * 1.3 - rise);
    ctx.stroke();
  }
  ctx.restore();
}

/**
 * A bump the warm cloth has warmed (SPEC D37): a soft pink glow round it and two little steam curls above it, both
 * fading as it cools, and a ring that grows out once when it has just got fully warm.
 * @param {CanvasRenderingContext2D} ctx the context
 * @param {number} x bump centre x
 * @param {number} y bump centre y
 * @param {number} r bump radius
 * @param {number} warm its warmth, 0..1
 * @param {number} time seconds, for the steam drift (0 = still, for reduced motion)
 * @param {number} since seconds since it got fully warm (Infinity = not yet)
 * @param {number} [heat] extra heat 0..1 (too hot, SPEC D41): from half way the glow turns red and the steam gets
 *   heavy and wobbles, a warning before "Ow, too hot!"
 * @returns {void}
 */
export function drawWarmBump(ctx, x, y, r, warm, time, since, heat = 0) {
  const k = Math.max(0, Math.min(1, warm));
  const R = Math.max(r * 2.4, 14);
  ctx.save();
  const g = ctx.createRadialGradient(x, y, r * 0.4, x, y, R);
  const hot = Math.max(0, Math.min(1, (heat - 0.4) / 0.6)); // the warning part of the heat, 0..1
  const gg = Math.round(120 - 80 * hot); // pink turns red as it gets too hot
  g.addColorStop(0, `rgba(255,${gg},${Math.round(110 - 60 * hot)},${0.34 * k + 0.3 * hot})`);
  g.addColorStop(1, `rgba(255,${gg},${Math.round(110 - 60 * hot)},0)`);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, R, 0, Math.PI * 2);
  ctx.fill();
  if (k > 0.35) { // steam curls
    const s = Math.max(6, r * 1.1) * (1 + 0.5 * hot); // bigger steam when too hot
    ctx.strokeStyle = 'rgba(255,255,255,0.9)';
    ctx.lineCap = 'round';
    ctx.lineWidth = Math.max(1.5, s * 0.16);
    for (const dx of hot > 0 ? [-0.6, 0, 0.6] : [-0.45, 0.45]) { // a third curl when too hot
      const rise = time ? ((time * 0.7 + (dx > 0 ? 0.5 : 0)) % 1) * s * 0.6 : s * 0.2; // the two curls take turns
      ctx.globalAlpha = (k - 0.35) / 0.65 * (time ? 1 - rise / (s * 0.6) : 0.8);
      const bx = x + dx * s + (time && hot ? Math.sin(time * 40 + dx * 5) * s * 0.12 * hot : 0); // too hot: it wobbles
      const by = y - r - s * 0.3 - rise;
      ctx.beginPath();
      ctx.moveTo(bx, by);
      ctx.bezierCurveTo(bx + s * 0.3, by - s * 0.3, bx - s * 0.3, by - s * 0.6, bx, by - s * 0.9);
      ctx.stroke();
    }
  }
  if (since < 0.6) { // just got fully warm: one ring grows out and fades
    const t = since / 0.6;
    ctx.globalAlpha = 1 - t;
    ctx.strokeStyle = '#ffd23f';
    ctx.lineWidth = Math.max(2, r * 0.25);
    ctx.beginPath();
    ctx.arc(x, y, r * (1.2 + t * 1.4), 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();
}

/**
 * A hydrocolloid patch on a popped spot: a round, see-through sticker with a soft shine.
 * @param {CanvasRenderingContext2D} ctx the context
 * @param {number} x centre x
 * @param {number} y centre y
 * @param {number} r radius
 * @returns {void}
 */
export function drawPatch(ctx, x, y, r) {
  ctx.save();
  ctx.shadowColor = 'rgba(80,40,30,0.18)';
  ctx.shadowBlur = 3;
  ctx.shadowOffsetY = 1;
  ctx.fillStyle = 'rgba(250,236,214,0.78)';
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
  ctx.strokeStyle = 'rgba(214,190,160,0.9)';
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  ctx.beginPath(); ctx.ellipse(x - r * 0.35, y - r * 0.4, r * 0.32, r * 0.16, -0.6, 0, Math.PI * 2); ctx.fill();
}

/**
 * Cartoon ouch lines round a bump that got the wrong tool: short pink strokes bursting out, then fading.
 * @param {CanvasRenderingContext2D} ctx the context
 * @param {number} x bump x
 * @param {number} y bump y
 * @param {number} r bump radius
 * @param {number} k progress 0..1
 * @param {boolean} reduced reduced motion: the lines do not burst out, they only fade
 * @returns {void}
 */
export function drawOuch(ctx, x, y, r, k, reduced) {
  const out = reduced ? 0.5 : Math.min(1, k * 3);
  ctx.save();
  ctx.globalAlpha = Math.max(0, 1 - k);
  ctx.strokeStyle = '#ff5c8a';
  ctx.lineCap = 'round';
  ctx.lineWidth = Math.max(2, r * 0.16);
  for (let i = 0; i < 6; i += 1) {
    const a = -Math.PI / 2 + (i - 2.5) * 0.55;
    const r0 = r * (1.3 + out * 0.4);
    const r1 = r0 + r * 0.55;
    ctx.beginPath();
    ctx.moveTo(x + Math.cos(a) * r0, y + Math.sin(a) * r0);
    ctx.lineTo(x + Math.cos(a) * r1, y + Math.sin(a) * r1);
    ctx.stroke();
  }
  ctx.restore();
}
