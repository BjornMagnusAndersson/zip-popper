// The studio room behind the face in the pop scene (T1.0b, SPEC D10 and D11). It follows the studio upgrades:
// tier 0 = "dingy and dank" (grimy tiles, cracked and peeling paint, a flickering bare bulb, a bucket and an old sink),
// tier 1 = a bit better, tier 2 = clean, sparkly and spa-like. Tiers 1 and 2 are only a recolour of tier 0 for now;
// task T5.1 gives them their own drawings (add them as new cases in drawRoom).
// Cartoon only: stains are olive and brown water marks, never anything like blood.
// The still room is painted once per size and tier into an offscreen canvas (cheap on phones); only the lamp's light
// is drawn on top each time it changes. With reduced motion the lamp never flickers.
// The pure parts (lampLevel, nextBackdropChange) need no DOM, so they can be tested in Node.
import { rng } from './logic.js';

/** The backdrop tiers there are (same as the studio tiers in SPEC section 4). */
export const BACKDROP_TIERS = [0, 1, 2];

/**
 * Colours per tier. Tier 0 is muted greenish greys; 1 and 2 are placeholder recolours until T5.1.
 * grime: how many stains, cracks and peeling bits (0 = none); flicker: whether the bare bulb flickers.
 */
const PALETTES = {
  0: {
    wallTop: '#7d8a77', wallBottom: '#6b7866', tile: '#b4bba1', grout: '#6c7560', floor: '#4b5245', floorLine: '#3c4237',
    stain: '120,104,52', peel: '#b8b29a', crack: '#3f463a', pipe: '#6f7468', metal: '#8d9389', bucket: '#5f7f86',
    sink: '#c9cbbf', shelf: '#6b5a44', light: '255,228,150', bulb: '#fff2bf', vignette: 'rgba(24,34,26,0.5)', grime: 1, flicker: true,
  },
  1: {
    wallTop: '#c9b48f', wallBottom: '#b9a37f', tile: '#e6ddc8', grout: '#a99c80', floor: '#7a6650', floorLine: '#634f3c',
    stain: '140,112,60', peel: '#d8c8a6', crack: '#7d6a50', pipe: '#9a8f7a', metal: '#b8b1a2', bucket: '#5f8fa0',
    sink: '#f1eee4', shelf: '#8a6a48', light: '255,236,190', bulb: '#fff7dc', vignette: 'rgba(60,44,24,0.3)', grime: 0.35, flicker: false,
  },
  2: {
    wallTop: '#e9f5f2', wallBottom: '#d3ece7', tile: '#ffffff', grout: '#bfe0da', floor: '#c7b8d8', floorLine: '#a998bf',
    stain: '0,0,0', peel: '#ffffff', crack: '#bfe0da', pipe: '#d8e6e3', metal: '#e4ecea', bucket: '#f6a6c1',
    sink: '#ffffff', shelf: '#e8c9a8', light: '255,250,235', bulb: '#ffffff', vignette: 'rgba(120,150,150,0.12)', grime: 0, flicker: false,
  },
};

/**
 * A repeatable random number 0..1 for a whole number (the same input always gives the same output).
 * @param {number} n any number
 * @returns {number} 0..1
 */
function hash(n) {
  const x = Math.sin(n * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
}

/**
 * The palette for a tier (unknown tiers fall back to tier 0).
 * @param {number} tier 0, 1 or 2
 * @returns {object} the colours
 */
function paletteFor(tier) {
  return PALETTES[tier] ?? PALETTES[0];
}

const BURST_EVERY = 4.5; // seconds: at most one flicker burst in each stretch this long
const BURST_LEN = 0.6; // seconds a burst lasts
const BURST_STEPS = 16; // light changes per second during a burst

/**
 * When the flicker burst in a stretch of time starts, or null when that stretch has none.
 * @param {number} k which stretch (time / BURST_EVERY, rounded down)
 * @returns {number|null} the start in seconds
 */
function burstStart(k) {
  if (hash(k * 7 + 1) < 0.35) return null; // some stretches stay steady
  return k * BURST_EVERY + hash(k * 13 + 5) * (BURST_EVERY - BURST_LEN);
}

/**
 * How bright the room's bare bulb is at a moment: steady (1) most of the time, with a short buzzy flicker now and
 * then in the dingy tier. Never flickers with reduced motion or in the better tiers.
 * @param {number} time seconds since the scene started
 * @param {number} [tier] studio tier 0..2
 * @param {boolean} [reduced] reduced motion is on
 * @returns {number} 0..1 (1 = fully lit)
 */
export function lampLevel(time, tier = 0, reduced = false) {
  if (reduced || !paletteFor(tier).flicker || !Number.isFinite(time)) return 1;
  const k = Math.floor(time / BURST_EVERY);
  const start = burstStart(k);
  if (start === null || time < start || time >= start + BURST_LEN) return 1;
  const step = Math.floor((time - start) * BURST_STEPS);
  return hash(k * 31 + step) < 0.45 ? 0.3 + 0.2 * hash(step + k) : 1;
}

/**
 * How long until the backdrop looks different (so the page only redraws it when needed).
 * @param {number} time seconds since the scene started
 * @param {number} [tier] studio tier 0..2
 * @param {boolean} [reduced] reduced motion is on
 * @returns {number} seconds (Infinity = it never changes)
 */
export function nextBackdropChange(time, tier = 0, reduced = false) {
  if (reduced || !paletteFor(tier).flicker) return Infinity;
  const k = Math.floor(time / BURST_EVERY);
  const start = burstStart(k);
  if (start !== null && time >= start && time < start + BURST_LEN) {
    const local = time - start;
    return Math.max(0.01, (Math.floor(local * BURST_STEPS) + 1) / BURST_STEPS - local);
  }
  for (let j = k; j < k + 3; j += 1) {
    const s = burstStart(j);
    if (s !== null && s > time) return Math.max(0.01, s - time);
  }
  return BURST_EVERY * 2;
}

/**
 * Where the lamp hangs: off to one side, clear of the head (and in landscape below the floating header).
 * @param {number} w width
 * @param {number} h height
 * @returns {{x: number, y: number, r: number}} bulb centre and radius in CSS px
 */
function lampSpot(w, h) {
  const r = Math.max(8, Math.min(16, Math.min(w, h) * 0.028));
  return w > h ? { x: w * 0.25, y: h * 0.34, r } : { x: w * 0.17, y: h * 0.11, r };
}

/**
 * A wobbly crack line going down from a point.
 * @param {CanvasRenderingContext2D} ctx the context
 * @param {number} x start x
 * @param {number} y start y
 * @param {number} len length
 * @param {() => number} rand random numbers
 * @param {string} colour line colour
 * @returns {void}
 */
function crack(ctx, x, y, len, rand, colour) {
  ctx.strokeStyle = colour;
  ctx.lineWidth = 1.4;
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(x, y);
  let px = x;
  let py = y;
  const n = 5 + Math.floor(rand() * 3);
  for (let i = 0; i < n; i += 1) {
    px += (rand() - 0.5) * len * 0.45;
    py += len / n;
    ctx.lineTo(px, py);
    if (i === 2) { ctx.moveTo(px, py); ctx.lineTo(px + len * 0.2, py + len * 0.12); ctx.moveTo(px, py); } // a little side branch
  }
  ctx.stroke();
}

/**
 * A soft olive-brown water stain (a blotch with a darker rim).
 * @param {CanvasRenderingContext2D} ctx the context
 * @param {number} x centre x
 * @param {number} y centre y
 * @param {number} r size
 * @param {string} rgb the stain colour as "r,g,b"
 * @param {number} a strength 0..1
 * @returns {void}
 */
function stain(ctx, x, y, r, rgb, a) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, `rgba(${rgb},${0.1 * a})`);
  g.addColorStop(0.75, `rgba(${rgb},${0.22 * a})`);
  g.addColorStop(1, `rgba(${rgb},0)`);
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.ellipse(x, y, r, r * 0.8, 0, 0, Math.PI * 2); ctx.fill();
}

/**
 * A curled-up patch of peeling paint: a lighter flake with a shadow under its curled edge.
 * @param {CanvasRenderingContext2D} ctx the context
 * @param {number} x centre x
 * @param {number} y centre y
 * @param {number} s size
 * @param {object} pal palette
 * @param {() => number} rand random numbers
 * @returns {void}
 */
function peel(ctx, x, y, s, pal, rand) {
  // The bare plaster where the paint came off: a flat, jagged patch with a thin dark rim.
  ctx.beginPath();
  const n = 9;
  for (let i = 0; i < n; i += 1) {
    const a = (i / n) * Math.PI * 2;
    const rr = s * (0.55 + rand() * 0.35);
    const px = x + Math.cos(a) * rr;
    const py = y + Math.sin(a) * rr * 0.55;
    if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fillStyle = pal.peel;
  ctx.fill();
  ctx.strokeStyle = 'rgba(40,48,36,0.45)';
  ctx.lineWidth = 1;
  ctx.stroke();
  // A flap of paint still hanging on at the top edge, curling forward (wall colour, with a light edge).
  const fx = x + s * (rand() - 0.5) * 0.6;
  const fy = y - s * 0.4;
  ctx.beginPath();
  ctx.moveTo(fx - s * 0.3, fy);
  ctx.quadraticCurveTo(fx - s * 0.1, fy + s * 0.55, fx + s * 0.25, fy + s * 0.45);
  ctx.quadraticCurveTo(fx + s * 0.15, fy + s * 0.15, fx + s * 0.3, fy);
  ctx.closePath();
  ctx.fillStyle = pal.wallTop;
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.45)';
  ctx.stroke();
}

/**
 * The tiled lower wall: tiles with slightly different shades, dirty grout, a few cracked tiles, one missing tile and
 * a grimy band near the floor.
 * @param {CanvasRenderingContext2D} ctx the context
 * @param {number} w width
 * @param {number} top where the tiles start
 * @param {number} bottom where the floor starts
 * @param {number} t tile size
 * @param {object} pal palette
 * @param {() => number} rand random numbers
 * @returns {void}
 */
function tiles(ctx, w, top, bottom, t, pal, rand) {
  ctx.fillStyle = pal.grout;
  ctx.fillRect(0, top, w, bottom - top);
  const cols = Math.ceil(w / t) + 1;
  const rows = Math.ceil((bottom - top) / t);
  const missing = pal.grime > 0.5 ? [Math.floor(rand() * cols), Math.floor(rand() * rows)] : null;
  const gap = Math.max(2, t * 0.06);
  for (let r = 0; r < rows; r += 1) {
    for (let c = 0; c < cols; c += 1) {
      const x = c * t + gap / 2;
      const y = top + r * t + gap / 2;
      const s = t - gap;
      if (missing && c === missing[0] && r === missing[1]) {
        ctx.fillStyle = 'rgba(40,46,36,0.75)';
        ctx.fillRect(x, y, s, s);
        ctx.fillStyle = 'rgba(255,255,255,0.12)';
        ctx.fillRect(x, y + s - 3, s, 3);
        continue;
      }
      const shadeK = (rand() - 0.5) * 0.1 * (0.5 + pal.grime);
      ctx.fillStyle = pal.tile;
      ctx.fillRect(x, y, s, s);
      ctx.fillStyle = shadeK > 0 ? `rgba(255,255,255,${shadeK})` : `rgba(30,40,30,${-shadeK * 1.6})`;
      ctx.fillRect(x, y, s, s);
      ctx.fillStyle = 'rgba(255,255,255,0.22)'; // a cartoon shine stroke on each tile
      ctx.fillRect(x + s * 0.12, y + s * 0.12, s * 0.28, Math.max(1.5, s * 0.05));
      if (pal.grime > 0.5 && rand() < 0.045) crack(ctx, x + s * (0.2 + rand() * 0.6), y + 2, s * 0.9, rand, pal.crack);
    }
  }
  if (pal.grime > 0) {
    // Grimy band near the floor and drips running down from the top of the tiles.
    const g = ctx.createLinearGradient(0, bottom - t * 1.6, 0, bottom);
    g.addColorStop(0, `rgba(${pal.stain},0)`);
    g.addColorStop(1, `rgba(${pal.stain},${0.35 * pal.grime})`);
    ctx.fillStyle = g;
    ctx.fillRect(0, bottom - t * 1.6, w, t * 1.6);
    const n = Math.round(6 * pal.grime + w / 260);
    for (let i = 0; i < n; i += 1) {
      const x = rand() * w;
      const len = t * (0.8 + rand() * 1.6);
      const dg = ctx.createLinearGradient(0, top, 0, top + len);
      dg.addColorStop(0, `rgba(${pal.stain},${0.28 * pal.grime})`);
      dg.addColorStop(1, `rgba(${pal.stain},0)`);
      ctx.fillStyle = dg;
      ctx.beginPath(); ctx.ellipse(x, top + len / 2, 3 + rand() * 5, len / 2, 0, 0, Math.PI * 2); ctx.fill();
    }
  }
  // The top edge of the tiles: a bullnose trim.
  ctx.fillStyle = pal.tile;
  ctx.fillRect(0, top - t * 0.16, w, t * 0.16);
  ctx.fillStyle = 'rgba(30,40,30,0.25)';
  ctx.fillRect(0, top - 1, w, 2);
}

/**
 * A wonky little shelf with a dusty bottle and a chipped mug on it.
 * @param {CanvasRenderingContext2D} ctx the context
 * @param {number} x left
 * @param {number} y top of the plank
 * @param {number} len plank length
 * @param {object} pal palette
 * @returns {void}
 */
function shelf(ctx, x, y, len, pal) {
  const k = len / 120;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(pal.grime > 0.5 ? 0.04 : 0); // a bit crooked in the dingy room
  ctx.fillStyle = 'rgba(20,28,20,0.25)';
  ctx.fillRect(4 * k, 6 * k, len, 8 * k);
  ctx.fillStyle = pal.shelf;
  ctx.fillRect(0, 0, len, 8 * k);
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  for (const bx of [12, len / k - 20]) ctx.fillRect(bx * k, 8 * k, 6 * k, 14 * k); // brackets
  // Bottle.
  ctx.fillStyle = '#7f9c7a';
  ctx.beginPath(); ctx.roundRect(22 * k, -40 * k, 20 * k, 40 * k, 5 * k); ctx.fill();
  ctx.fillRect(28 * k, -52 * k, 8 * k, 14 * k);
  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  ctx.fillRect(26 * k, -34 * k, 4 * k, 26 * k);
  // Mug with a chip.
  ctx.fillStyle = '#d8d2bd';
  ctx.beginPath(); ctx.roundRect(62 * k, -24 * k, 24 * k, 24 * k, 4 * k); ctx.fill();
  ctx.strokeStyle = '#d8d2bd';
  ctx.lineWidth = 4 * k;
  ctx.beginPath(); ctx.arc(88 * k, -12 * k, 6 * k, -1.2, 1.2); ctx.stroke();
  ctx.fillStyle = pal.wallTop;
  ctx.beginPath(); ctx.moveTo(70 * k, -24 * k); ctx.lineTo(76 * k, -24 * k); ctx.lineTo(73 * k, -19 * k); ctx.closePath(); ctx.fill();
  ctx.restore();
}

/**
 * An old wall sink: a rounded basin, one tap, a pipe going down.
 * @param {CanvasRenderingContext2D} ctx the context
 * @param {number} x centre x
 * @param {number} y top of the basin
 * @param {number} s width
 * @param {object} pal palette
 * @returns {void}
 */
function sink(ctx, x, y, s, pal) {
  ctx.fillStyle = pal.pipe;
  ctx.fillRect(x - s * 0.06, y + s * 0.3, s * 0.12, s * 0.9);
  ctx.fillStyle = 'rgba(20,28,20,0.25)';
  ctx.beginPath(); ctx.ellipse(x + 4, y + s * 0.3, s * 0.52, s * 0.22, 0, 0, Math.PI); ctx.fill();
  ctx.fillStyle = pal.sink;
  ctx.beginPath();
  ctx.moveTo(x - s / 2, y);
  ctx.lineTo(x + s / 2, y);
  ctx.quadraticCurveTo(x + s / 2, y + s * 0.42, x, y + s * 0.42);
  ctx.quadraticCurveTo(x - s / 2, y + s * 0.42, x - s / 2, y);
  ctx.fill();
  ctx.fillStyle = 'rgba(30,40,30,0.2)';
  ctx.fillRect(x - s / 2, y, s, s * 0.06);
  if (pal.grime > 0.5) stain(ctx, x + s * 0.15, y + s * 0.22, s * 0.16, pal.stain, 1.2);
  ctx.fillStyle = pal.metal; // the tap
  ctx.fillRect(x - s * 0.05, y - s * 0.22, s * 0.1, s * 0.22);
  ctx.fillRect(x - s * 0.05, y - s * 0.22, s * 0.22, s * 0.07);
  ctx.fillRect(x - s * 0.14, y - s * 0.28, s * 0.28, s * 0.06);
}

/**
 * A bucket on the floor with a mop handle sticking out.
 * @param {CanvasRenderingContext2D} ctx the context
 * @param {number} x centre x
 * @param {number} floor floor y (bottom of the bucket)
 * @param {number} s height
 * @param {object} pal palette
 * @returns {void}
 */
function bucket(ctx, x, floor, s, pal) {
  ctx.fillStyle = 'rgba(15,20,15,0.3)';
  ctx.beginPath(); ctx.ellipse(x, floor, s * 0.55, s * 0.1, 0, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#8a6a48';
  ctx.lineWidth = Math.max(3, s * 0.07);
  ctx.beginPath(); ctx.moveTo(x - s * 0.1, floor - s * 0.6); ctx.lineTo(x - s * 0.45, floor - s * 1.9); ctx.stroke(); // mop handle
  ctx.fillStyle = pal.bucket;
  ctx.beginPath();
  ctx.moveTo(x - s * 0.45, floor - s);
  ctx.lineTo(x + s * 0.45, floor - s);
  ctx.lineTo(x + s * 0.36, floor);
  ctx.lineTo(x - s * 0.36, floor);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = 'rgba(0,0,0,0.2)';
  ctx.beginPath(); ctx.ellipse(x, floor - s, s * 0.45, s * 0.1, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.2)';
  ctx.fillRect(x - s * 0.3, floor - s * 0.85, s * 0.08, s * 0.7);
  ctx.strokeStyle = 'rgba(30,30,30,0.45)'; // handle
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(x, floor - s, s * 0.42, Math.PI * 1.05, Math.PI * 1.95); ctx.stroke();
}

/**
 * A small cobweb in the top corner.
 * @param {CanvasRenderingContext2D} ctx the context
 * @param {number} x corner x
 * @param {number} y corner y
 * @param {number} s size
 * @param {number} dir 1 = web grows to the right, -1 = to the left
 * @returns {void}
 */
function cobweb(ctx, x, y, s, dir) {
  ctx.strokeStyle = 'rgba(235,240,230,0.45)';
  ctx.lineWidth = 1;
  const spokes = 5;
  for (let i = 0; i <= spokes; i += 1) {
    const a = (i / spokes) * (Math.PI / 2);
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + dir * Math.cos(a) * s, y + Math.sin(a) * s); ctx.stroke();
  }
  for (let ring = 1; ring <= 3; ring += 1) {
    const rr = (s * ring) / 3.4;
    ctx.beginPath();
    for (let i = 0; i <= spokes; i += 1) {
      const a = (i / spokes) * (Math.PI / 2);
      const px = x + dir * Math.cos(a) * rr;
      const py = y + Math.sin(a) * rr;
      if (i === 0) ctx.moveTo(px, py); else ctx.quadraticCurveTo(x + dir * Math.cos(a - 0.15) * rr * 0.85, y + Math.sin(a - 0.15) * rr * 0.85, px, py);
    }
    ctx.stroke();
  }
}

/**
 * Paint the still part of the room (everything but the lamp's light) for a tier.
 * Tiers 1 and 2: the same room recoloured and cleaned up for now (T5.1 adds their own pieces here).
 * @param {CanvasRenderingContext2D} ctx where to paint (CSS px)
 * @param {number} w width
 * @param {number} h height
 * @param {number} tier 0, 1 or 2
 * @returns {void}
 */
function drawRoom(ctx, w, h, tier) {
  const pal = paletteFor(tier);
  const rand = rng(9173 + tier);
  const land = w > h;
  const floorY = h * (land ? 0.86 : 0.9);
  const tileTop = h * (land ? 0.5 : 0.42);
  const t = Math.max(26, Math.min(54, Math.round(Math.min(w, h) / 8.5)));
  // Painted upper wall.
  const wall = ctx.createLinearGradient(0, 0, 0, tileTop);
  wall.addColorStop(0, pal.wallTop);
  wall.addColorStop(1, pal.wallBottom);
  ctx.fillStyle = wall;
  ctx.fillRect(0, 0, w, tileTop);
  if (pal.grime > 0) {
    for (let i = 0; i < 2 + Math.round(w / 400); i += 1) stain(ctx, rand() * w, tileTop * (0.2 + rand() * 0.6), t * (0.6 + rand() * 0.7), pal.stain, pal.grime * 0.8);
    for (let i = 0; i < Math.round((2 + w / 260) * pal.grime); i += 1) {
      peel(ctx, w * (0.05 + rand() * 0.9), tileTop * (0.15 + rand() * 0.7), t * (0.35 + rand() * 0.35), pal, rand);
    }
    if (pal.grime > 0.5) {
      crack(ctx, w * 0.93, 0, tileTop * 0.45, rand, pal.crack);
      crack(ctx, w * 0.06, tileTop * 0.3, tileTop * 0.5, rand, pal.crack);
    }
  }
  // A pipe along the top with a joint (and, in the dingy room, a brown drip stain under it).
  const py = Math.max(6, h * 0.035);
  const pr = Math.max(4, t * 0.13);
  ctx.fillStyle = pal.pipe;
  ctx.fillRect(0, py - pr, w, pr * 2);
  ctx.fillStyle = 'rgba(255,255,255,0.25)';
  ctx.fillRect(0, py - pr, w, pr * 0.5);
  const jx = w * (land ? 0.62 : 0.72);
  ctx.fillStyle = pal.metal;
  ctx.fillRect(jx - pr * 1.4, py - pr * 1.4, pr * 2.8, pr * 2.8);
  if (pal.grime > 0.5) {
    const len = Math.min(tileTop * 0.35, t * 2.2);
    const dg = ctx.createLinearGradient(0, py, 0, py + len);
    dg.addColorStop(0, `rgba(${pal.stain},0.4)`);
    dg.addColorStop(1, `rgba(${pal.stain},0)`);
    ctx.fillStyle = dg;
    ctx.beginPath(); ctx.ellipse(jx, py + len / 2, pr * 0.9, len / 2, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(190,215,220,0.85)'; // a cartoon water drop hanging from the joint
    ctx.beginPath(); ctx.arc(jx, py + pr * 2.4, pr * 0.55, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.moveTo(jx - pr * 0.5, py + pr * 2.3); ctx.lineTo(jx, py + pr * 1.3); ctx.lineTo(jx + pr * 0.5, py + pr * 2.3); ctx.fill();
  }
  tiles(ctx, w, tileTop, floorY, t, pal, rand);
  // Floor.
  ctx.fillStyle = pal.floor;
  ctx.fillRect(0, floorY, w, h - floorY);
  ctx.strokeStyle = pal.floorLine;
  ctx.lineWidth = 2;
  for (let x = -w; x < w * 2; x += t * 1.6) { ctx.beginPath(); ctx.moveTo(x, floorY); ctx.lineTo(w / 2 + (x - w / 2) * 1.8, h); ctx.stroke(); }
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.fillRect(0, floorY, w, 3);
  // Furniture: a shelf high up on the right, an old sink on the left, a bucket and mop on the right.
  const shelfLen = Math.max(70, Math.min(130, w * 0.2));
  if (land) {
    shelf(ctx, w * 0.78, h * 0.34, shelfLen, pal);
    sink(ctx, w * 0.12, h * 0.56, Math.max(60, Math.min(110, w * 0.11)), pal);
    bucket(ctx, w * 0.84, floorY + (h - floorY) * 0.55, Math.max(34, Math.min(70, h * 0.14)), pal);
  } else {
    shelf(ctx, w - shelfLen - w * 0.05, h * 0.2, shelfLen, pal);
    sink(ctx, w * 0.1, tileTop + t * 0.6, Math.max(56, w * 0.18), pal);
    bucket(ctx, w * 0.88, floorY + (h - floorY) * 0.55, Math.max(30, w * 0.1), pal);
  }
  if (pal.grime > 0.5) cobweb(ctx, w, py + pr, Math.max(36, t * 1.3), -1);
  // The lamp's cord and socket (the light itself is drawn on top each time, see drawLight).
  const L = lampSpot(w, h);
  ctx.strokeStyle = '#2f342c';
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(L.x, 0); ctx.quadraticCurveTo(L.x + 4, L.y * 0.5, L.x, L.y - L.r * 1.6); ctx.stroke();
  ctx.fillStyle = '#3a3f37';
  ctx.beginPath(); ctx.roundRect(L.x - L.r * 0.55, L.y - L.r * 1.8, L.r * 1.1, L.r * 1.0, 2); ctx.fill();
  // Dank corners: a dark vignette.
  const v = ctx.createRadialGradient(w / 2, h * 0.45, Math.min(w, h) * 0.35, w / 2, h * 0.45, Math.hypot(w, h) * 0.62);
  v.addColorStop(0, 'rgba(0,0,0,0)');
  v.addColorStop(1, pal.vignette);
  ctx.fillStyle = v;
  ctx.fillRect(0, 0, w, h);
}

/**
 * The lamp's light: the glowing bulb and a warm pool of light on the wall (dimmer and the room darker while it flickers).
 * @param {CanvasRenderingContext2D} ctx where to draw (CSS px)
 * @param {number} w width
 * @param {number} h height
 * @param {number} tier 0..2
 * @param {number} level brightness 0..1 (lampLevel)
 * @returns {void}
 */
function drawLight(ctx, w, h, tier, level) {
  const pal = paletteFor(tier);
  const L = lampSpot(w, h);
  if (level < 1) {
    ctx.fillStyle = `rgba(10,16,12,${(1 - level) * 0.3})`;
    ctx.fillRect(0, 0, w, h);
  }
  const R = Math.min(w, h) * 0.5;
  const g = ctx.createRadialGradient(L.x, L.y, L.r, L.x, L.y, R);
  g.addColorStop(0, `rgba(${pal.light},${0.42 * level})`);
  g.addColorStop(1, `rgba(${pal.light},0)`);
  ctx.fillStyle = g;
  ctx.fillRect(L.x - R, L.y - R, R * 2, R * 2);
  ctx.fillStyle = level > 0.6 ? pal.bulb : '#9c9878';
  ctx.beginPath(); ctx.ellipse(L.x, L.y, L.r * 0.85, L.r, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = `rgba(255,255,255,${0.7 * level})`;
  ctx.beginPath(); ctx.arc(L.x - L.r * 0.3, L.y - L.r * 0.3, L.r * 0.25, 0, Math.PI * 2); ctx.fill();
}

const cache = new Map(); // "w x h @ dpr : tier" -> offscreen canvas with the still room

/**
 * The still room for a size and tier, painted once into an offscreen canvas (only the two newest sizes are kept).
 * @param {number} w width in CSS px
 * @param {number} h height in CSS px
 * @param {number} tier 0..2
 * @param {number} dpr pixel ratio
 * @returns {HTMLCanvasElement} the painted room
 */
function roomCanvas(w, h, tier, dpr) {
  const key = `${w}x${h}@${dpr}:${tier}`;
  let c = cache.get(key);
  if (c) return c;
  c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(w * dpr));
  c.height = Math.max(1, Math.round(h * dpr));
  const cx = c.getContext('2d');
  cx.setTransform(dpr, 0, 0, dpr, 0, 0);
  drawRoom(cx, w, h, tier);
  cache.set(key, c);
  while (cache.size > 2) cache.delete(cache.keys().next().value);
  return c;
}

/**
 * Draw the studio room behind the face: the cached still room, then the lamp light for this moment.
 * @param {CanvasRenderingContext2D} ctx where to draw (already scaled so 1 unit = 1 CSS px)
 * @param {number} w width in CSS px
 * @param {number} h height in CSS px
 * @param {{tier?: number, time?: number, reduced?: boolean, dpr?: number}} [o] studio tier 0..2 (SPEC D11), seconds
 *   since the scene started (for the flicker), reduced motion (steady light), pixel ratio (read from ctx when left out)
 * @returns {void}
 */
export function drawBackdrop(ctx, w, h, o = {}) {
  const tier = BACKDROP_TIERS.includes(o.tier) ? o.tier : 0;
  const dpr = o.dpr ?? (ctx.getTransform?.().a || 1);
  ctx.drawImage(roomCanvas(Math.round(w), Math.round(h), tier, dpr), 0, 0, w, h);
  drawLight(ctx, w, h, tier, lampLevel(o.time ?? 0, tier, Boolean(o.reduced)));
}
