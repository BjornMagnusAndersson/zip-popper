// The studio room behind the face in the pop scene (T1.0b, SPEC D10 and D11). It follows the studio upgrades:
// tier 0 = "dingy and dank" (grimy tiles, cracked and peeling paint, a flickering bare bulb, a bucket and an old sink),
// tier 1 = a bit better, tier 2 = clean, sparkly and spa-like. Tiers 1 and 2 are only a recolour of tier 0 for now;
// task T5.1 gives them their own drawings (add them as new cases in drawRoom).
// Before the studio (chapters 0 to 4, SPEC D19) the pop scene is at home instead: room 'home' paints the couple's
// living room in the comics' colours, with a floor lamp whose warm light breathes gently (steady with reduced motion).
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
  // Their living room at home (SPEC D19: chapters 0 to 4 happen at home). The same colours as the comics' 'living'
  // room (comic-art.js ROOMS.living): peach striped wallpaper, wooden floor, the teal sofa, the yellow floor lamp,
  // the coral plant pot. pulse: the lamp's warm light breathes gently (never flickers).
  home: {
    wallTop: '#fde3c8', wallBottom: '#f1c19c', stripes: '#f9d2ae', dots: '#eeb48a', skirting: '#fff3e3', floor: '#c98f6b',
    boards: '#a8724f', sofa: '#3fae8c', rug: '#e8735a', rugBand: '#ffd25a', frame: '#b07a4a', shelf: '#b07a4a',
    shade: '#ffd25a', wood: '#6e4528', ink: '#2a211d', light: '255,214,140', vignette: 'rgba(96,52,30,0.34)',
    grime: 0, flicker: false, pulse: true,
  },
};

/** The rooms the pop scene can show: the studio (with its tiers) or the couple's living room at home (SPEC D19). */
export const BACKDROP_ROOMS = ['studio', 'home'];

/**
 * Which backdrop to paint: 'home' for the home room, else the studio tier (unknown tiers fall back to 0).
 * @param {string} [room] 'studio' (default) or 'home'
 * @param {number} [tier] studio tier 0..2
 * @returns {number|string} 0, 1, 2 or 'home'
 */
export function backdropKind(room, tier) {
  if (room === 'home') return 'home';
  return BACKDROP_TIERS.includes(tier) ? tier : 0;
}

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
 * The palette for a backdrop kind (unknown kinds fall back to the dingy studio, tier 0).
 * @param {number|string} kind 0, 1, 2 or 'home'
 * @returns {object} the colours
 */
export function backdropPalette(kind) {
  return Object.hasOwn(PALETTES, String(kind)) ? PALETTES[kind] : PALETTES[0];
}

/** Short name used inside this file. @param {number|string} kind backdrop kind @returns {object} the colours */
const paletteFor = backdropPalette;

const BURST_EVERY = 4.5; // seconds: at most one flicker burst in each stretch this long
const BURST_LEN = 0.6; // seconds a burst lasts
const BURST_STEPS = 16; // light changes per second during a burst
const PULSE_SPEED = (Math.PI * 2) / 4.2; // the home lamp breathes once every 4.2 seconds
const PULSE_STEP = 0.1; // seconds between repaints of the home lamp's glow (small steps, so it looks smooth)

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
 * At home the floor lamp's light breathes slowly between about 0.88 and 1 instead (never a flicker).
 * @param {number} time seconds since the scene started
 * @param {number|string} [tier] studio tier 0..2, or 'home' (see backdropKind)
 * @param {boolean} [reduced] reduced motion is on
 * @returns {number} 0..1 (1 = fully lit)
 */
export function lampLevel(time, tier = 0, reduced = false) {
  if (reduced || !Number.isFinite(time)) return 1;
  if (paletteFor(tier).pulse) return 0.94 + 0.045 * Math.sin(time * PULSE_SPEED) + 0.015 * Math.sin(time * PULSE_SPEED * 2.3 + 1);
  if (!paletteFor(tier).flicker) return 1;
  const k = Math.floor(time / BURST_EVERY);
  const start = burstStart(k);
  if (start === null || time < start || time >= start + BURST_LEN) return 1;
  const step = Math.floor((time - start) * BURST_STEPS);
  return hash(k * 31 + step) < 0.45 ? 0.3 + 0.2 * hash(step + k) : 1;
}

/**
 * How long until the backdrop looks different (so the page only redraws it when needed).
 * @param {number} time seconds since the scene started
 * @param {number|string} [tier] studio tier 0..2, or 'home' (see backdropKind)
 * @param {boolean} [reduced] reduced motion is on
 * @returns {number} seconds (Infinity = it never changes)
 */
export function nextBackdropChange(time, tier = 0, reduced = false) {
  if (reduced) return Infinity;
  if (paletteFor(tier).pulse) return PULSE_STEP;
  if (!paletteFor(tier).flicker) return Infinity;
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

// ---- The living room at home (SPEC D19) ----
// Drawn like the comics: flat warm colours with a soft ink outline. The face covers the middle, so the pieces sit
// where they show: the lamp and the picture above and beside the head, the sofa back behind the shoulders, the
// bookshelf at the side. Sizes go by u = 1% of the short side so phones and desktops look alike.

/**
 * Where the floor lamp's shade is: beside the head, next to the sofa arm.
 * @param {number} w width
 * @param {number} h height
 * @returns {{x: number, y: number, s: number}} centre of the shade and its size in CSS px
 */
function homeLampSpot(w, h) {
  const s = Math.max(26, Math.min(64, Math.min(w, h) * 0.11));
  return w > h ? { x: w * 0.165, y: h * 0.24, s } : { x: w * 0.11, y: h * 0.1, s };
}

/**
 * Fill and outline the path just built, comic style (a soft ink line).
 * @param {CanvasRenderingContext2D} ctx the context
 * @param {string} fill fill colour
 * @param {number} lw outline width
 * @param {object} pal palette
 * @returns {void}
 */
function inked(ctx, fill, lw, pal) {
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.strokeStyle = pal.ink;
  ctx.globalAlpha = 0.7;
  ctx.lineWidth = lw;
  ctx.lineJoin = 'round';
  ctx.stroke();
  ctx.globalAlpha = 1;
}

/**
 * A rounded box path (no fill yet).
 * @param {CanvasRenderingContext2D} ctx the context
 * @param {number} x left
 * @param {number} y top
 * @param {number} w width
 * @param {number} h height
 * @param {number} r corner radius
 * @returns {void}
 */
function box(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, Math.max(0, Math.min(r, w / 2, h / 2)));
}

/**
 * The wallpaper: a peach gradient, soft vertical stripes and little four-dot flowers between them.
 * @param {CanvasRenderingContext2D} ctx the context
 * @param {number} w width
 * @param {number} floorY where the floor starts
 * @param {number} u size unit
 * @param {object} pal palette
 * @returns {void}
 */
function homeWall(ctx, w, floorY, u, pal) {
  const g = ctx.createLinearGradient(0, 0, 0, floorY);
  g.addColorStop(0, pal.wallTop);
  g.addColorStop(1, pal.wallBottom);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, floorY);
  const step = u * 11;
  ctx.globalAlpha = 0.6;
  ctx.fillStyle = pal.stripes;
  for (let x = u * 3; x < w; x += step) ctx.fillRect(x, 0, u * 4.2, floorY);
  ctx.globalAlpha = 0.45;
  ctx.fillStyle = pal.dots;
  const d = Math.max(1.2, u * 0.45);
  for (let x = u * 3 + u * 4.2 + (step - u * 4.2) / 2, col = 0; x < w + step; x += step, col += 1) {
    for (let y = (col % 2) * u * 6 + u * 4; y < floorY - u * 4; y += u * 12) {
      for (const [dx, dy] of [[0, -1], [1, 0], [0, 1], [-1, 0]]) {
        ctx.beginPath(); ctx.arc(x + dx * d * 1.6, y + dy * d * 1.6, d, 0, Math.PI * 2); ctx.fill();
      }
    }
  }
  ctx.globalAlpha = 1;
}

/**
 * The wooden floor with boards, the skirting board, and the edge of a coral rug with a yellow band and fringe.
 * @param {CanvasRenderingContext2D} ctx the context
 * @param {number} w width
 * @param {number} h height
 * @param {number} floorY where the floor starts
 * @param {number} u size unit
 * @param {object} pal palette
 * @returns {void}
 */
function homeFloor(ctx, w, h, floorY, u, pal) {
  ctx.fillStyle = pal.floor;
  ctx.fillRect(0, floorY, w, h - floorY);
  ctx.strokeStyle = pal.boards;
  ctx.lineWidth = Math.max(1.5, u * 0.5);
  const fh = h - floorY;
  for (const f of [0.22, 0.5, 0.8]) { ctx.beginPath(); ctx.moveTo(0, floorY + fh * f); ctx.lineTo(w, floorY + fh * f); ctx.stroke(); }
  for (let x = u * 8; x < w; x += u * 26) {
    ctx.beginPath();
    ctx.moveTo(x, floorY + fh * 0.22); ctx.lineTo(x, floorY + fh * 0.5);
    ctx.moveTo(x + u * 13, floorY + fh * 0.5); ctx.lineTo(x + u * 13, floorY + fh * 0.8);
    ctx.stroke();
  }
  // The rug in front of the sofa (its far edge shows; the rest runs out of the picture).
  const ry = floorY + fh * 0.38;
  box(ctx, w * 0.12, ry, w * 0.76, h, u * 1.5);
  inked(ctx, pal.rug, Math.max(1.2, u * 0.4), pal);
  ctx.fillStyle = pal.rugBand;
  ctx.fillRect(w * 0.12 + u * 2, ry + u * 1.6, w * 0.76 - u * 4, Math.max(2, u * 0.9));
  ctx.strokeStyle = '#fff3e3';
  ctx.lineWidth = Math.max(1, u * 0.3);
  for (let x = w * 0.12 + u; x < w * 0.88 - u * 0.5; x += u * 1.6) { ctx.beginPath(); ctx.moveTo(x, ry); ctx.lineTo(x, ry - u * 1.1); ctx.stroke(); }
  // Skirting board along the bottom of the wall.
  box(ctx, -4, floorY - u * 2.4, w + 8, u * 2.6, 0);
  inked(ctx, pal.skirting, Math.max(1.2, u * 0.4), pal);
}

/**
 * A framed picture of green hills and a sun (the same picture as in the comics' living room).
 * @param {CanvasRenderingContext2D} ctx the context
 * @param {number} cx centre x
 * @param {number} cy centre y
 * @param {number} pw picture width (the frame goes around it)
 * @param {number} u size unit
 * @param {object} pal palette
 * @returns {void}
 */
function homePicture(ctx, cx, cy, pw, u, pal) {
  const ph = pw * 0.75;
  const x = cx - pw / 2;
  const y = cy - ph / 2;
  const f = Math.max(4, pw * 0.07);
  const lw = Math.max(1.2, u * 0.4);
  ctx.fillStyle = 'rgba(96,52,30,0.18)'; // a soft shadow on the wall
  ctx.fillRect(x - f + u, y - f + u * 1.2, pw + f * 2, ph + f * 2);
  box(ctx, x - f, y - f, pw + f * 2, ph + f * 2, 2);
  inked(ctx, pal.frame, lw, pal);
  ctx.save();
  box(ctx, x, y, pw, ph, 0);
  ctx.fillStyle = '#cfeefa';
  ctx.fill();
  ctx.clip();
  ctx.beginPath();
  ctx.moveTo(x, y + ph);
  ctx.lineTo(x + pw * 0.35, y + ph * 0.47);
  ctx.lineTo(x + pw * 0.6, y + ph * 0.8);
  ctx.lineTo(x + pw * 0.75, y + ph * 0.6);
  ctx.lineTo(x + pw, y + ph);
  ctx.closePath();
  inked(ctx, '#59b85f', lw, pal);
  ctx.beginPath(); ctx.arc(x + pw * 0.75, y + ph * 0.27, pw * 0.1, 0, Math.PI * 2);
  inked(ctx, '#ffd25a', lw, pal);
  ctx.restore();
  ctx.strokeStyle = 'rgba(255,255,255,0.35)';
  ctx.lineWidth = Math.max(1, f * 0.3);
  ctx.beginPath(); ctx.moveTo(x - f * 0.6, y + ph * 0.6); ctx.lineTo(x - f * 0.6, y - f * 0.6); ctx.lineTo(x + pw * 0.4, y - f * 0.6); ctx.stroke();
}

/**
 * The plant from the comics (green leaves in a coral pot), standing with its pot bottom at (x, y).
 * @param {CanvasRenderingContext2D} ctx the context
 * @param {number} x centre x
 * @param {number} y bottom of the pot
 * @param {number} s pot height
 * @param {object} pal palette
 * @param {number} lw outline width
 * @returns {void}
 */
function homePlant(ctx, x, y, s, pal, lw) {
  for (const [a, len] of [[-60, 0.75], [55, 0.7], [-40, 1], [35, 0.95], [-15, 1.25], [10, 1.15]]) {
    ctx.save();
    ctx.translate(x, y - s * 0.85);
    ctx.rotate((a * Math.PI) / 180);
    ctx.beginPath(); ctx.ellipse(0, -len * s * 0.6, s * 0.17, len * s * 0.6, 0, 0, Math.PI * 2);
    inked(ctx, a % 20 ? '#3fae8c' : '#59b85f', lw, pal);
    ctx.restore();
  }
  ctx.beginPath();
  ctx.moveTo(x - s * 0.5, y - s);
  ctx.lineTo(x + s * 0.5, y - s);
  ctx.lineTo(x + s * 0.38, y);
  ctx.lineTo(x - s * 0.38, y);
  ctx.closePath();
  inked(ctx, '#e8735a', lw, pal);
}

/**
 * A bookshelf against the wall: wooden case, shelves of coloured books (some leaning), a little vase, and the plant
 * on top.
 * @param {CanvasRenderingContext2D} ctx the context
 * @param {number} x left
 * @param {number} top top of the case
 * @param {number} bw case width
 * @param {number} floorY floor (bottom of the case)
 * @param {number} u size unit
 * @param {object} pal palette
 * @param {() => number} rand random numbers
 * @returns {void}
 */
function homeBookshelf(ctx, x, top, bw, floorY, u, pal, rand) {
  const lw = Math.max(1.2, u * 0.4);
  const side = Math.max(4, u * 1.4);
  box(ctx, x, top, bw, floorY - top, u * 0.8);
  inked(ctx, pal.shelf, lw, pal);
  ctx.fillStyle = '#7d5232'; // the dark inside of the case
  ctx.fillRect(x + side, top + side, bw - side * 2, floorY - top - side * 2);
  const books = ['#e8735a', '#4f86e8', '#ffd25a', '#7b6ad8', '#3fae8c', '#f08cbf', '#fff3e3', '#d0672e'];
  const rows = Math.max(3, Math.round((floorY - top) / (u * 15)));
  const rh = (floorY - top - side * 2) / rows;
  for (let r = 0; r < rows; r += 1) {
    const base = top + side + rh * (r + 1);
    let bx = x + side + u * 0.6;
    const end = x + bw - side - u * 0.6;
    while (bx < end - u * 1.5) {
      const bwid = Math.min(end - bx, u * (1.8 + rand() * 1.6));
      const bh = rh * (0.55 + rand() * 0.33);
      if (rand() < 0.12 && end - bx > u * 6) { // a little round vase instead of a book
        ctx.beginPath(); ctx.ellipse(bx + u * 2.2, base - bh * 0.35, u * 1.8, bh * 0.35, 0, 0, Math.PI * 2);
        inked(ctx, '#bfe4fb', lw, pal);
        bx += u * 5;
        continue;
      }
      box(ctx, bx, base - bh, bwid, bh, u * 0.3);
      inked(ctx, books[Math.floor(rand() * books.length)], lw * 0.8, pal);
      ctx.fillStyle = 'rgba(255,255,255,0.35)'; // a band on the spine
      ctx.fillRect(bx + bwid * 0.2, base - bh * 0.78, bwid * 0.6, Math.max(1, u * 0.4));
      bx += bwid + u * 0.15;
    }
    box(ctx, x + side * 0.6, base - u * 0.3, bw - side * 1.2, Math.max(3, u * 1.1), 1); // the shelf plank
    inked(ctx, pal.shelf, lw * 0.8, pal);
  }
  homePlant(ctx, x + bw * 0.32, top, Math.max(16, u * 7), pal, lw);
}

/**
 * The floor lamp's stand and shade (its light is drawn on top each time, see drawHomeLight).
 * @param {CanvasRenderingContext2D} ctx the context
 * @param {{x: number, y: number, s: number}} L the shade (homeLampSpot)
 * @param {number} floorY floor
 * @param {number} u size unit
 * @param {object} pal palette
 * @returns {void}
 */
function homeLamp(ctx, L, floorY, u, pal) {
  const lw = Math.max(1.2, u * 0.45);
  ctx.strokeStyle = pal.ink;
  ctx.lineWidth = Math.max(2.5, L.s * 0.09);
  ctx.beginPath(); ctx.moveTo(L.x, L.y); ctx.lineTo(L.x, floorY + u * 1.5); ctx.stroke();
  ctx.beginPath(); ctx.ellipse(L.x, floorY + u * 1.5, L.s * 0.5, L.s * 0.13, 0, 0, Math.PI * 2);
  inked(ctx, pal.wood, lw, pal);
  ctx.beginPath();
  ctx.moveTo(L.x - L.s * 0.5, L.y - L.s * 0.45);
  ctx.lineTo(L.x + L.s * 0.5, L.y - L.s * 0.45);
  ctx.lineTo(L.x + L.s * 0.85, L.y + L.s * 0.42);
  ctx.lineTo(L.x - L.s * 0.85, L.y + L.s * 0.42);
  ctx.closePath();
  inked(ctx, pal.shade, lw, pal);
  ctx.fillStyle = 'rgba(255,255,255,0.4)'; // a shine stripe on the shade
  ctx.beginPath();
  ctx.moveTo(L.x - L.s * 0.32, L.y - L.s * 0.4); ctx.lineTo(L.x - L.s * 0.2, L.y - L.s * 0.4);
  ctx.lineTo(L.x - L.s * 0.42, L.y + L.s * 0.36); ctx.lineTo(L.x - L.s * 0.58, L.y + L.s * 0.36);
  ctx.closePath(); ctx.fill();
}

/**
 * The back of the teal sofa he sits on: a long padded back with cushions, and a round arm at each end.
 * @param {CanvasRenderingContext2D} ctx the context
 * @param {number} x0 left end
 * @param {number} x1 right end
 * @param {number} top top of the back
 * @param {number} armTop top of the arms
 * @param {number} floorY floor
 * @param {number} u size unit
 * @param {object} pal palette
 * @returns {void}
 */
function homeSofa(ctx, x0, x1, top, armTop, floorY, u, pal) {
  const lw = Math.max(1.4, u * 0.5);
  const armW = Math.max(u * 9, (x1 - x0) * 0.13);
  ctx.fillStyle = 'rgba(96,52,30,0.2)'; // shadow on the floor
  ctx.beginPath(); ctx.ellipse((x0 + x1) / 2, floorY + u * 1.5, (x1 - x0) * 0.52, u * 3, 0, 0, Math.PI * 2); ctx.fill();
  box(ctx, x0 + armW * 0.4, top, x1 - x0 - armW * 0.8, floorY - top, u * 6);
  inked(ctx, '#36997b', lw, pal);
  const n = 3;
  const cw = (x1 - x0 - armW * 2) / n;
  for (let i = 0; i < n; i += 1) {
    box(ctx, x0 + armW + i * cw + u * 0.6, top + u * 2.4, cw - u * 1.2, (floorY - top) * 0.62, u * 4);
    inked(ctx, '#4cbb98', lw * 0.85, pal);
    ctx.fillStyle = 'rgba(255,255,255,0.18)';
    ctx.beginPath(); ctx.ellipse(x0 + armW + i * cw + cw * 0.35, top + u * 5, cw * 0.18, u * 1.2, -0.2, 0, Math.PI * 2); ctx.fill();
  }
  for (const ax of [x0, x1 - armW]) {
    box(ctx, ax, armTop, armW, floorY - armTop, u * 4.5);
    inked(ctx, pal.sofa, lw, pal);
    ctx.fillStyle = 'rgba(255,255,255,0.2)';
    ctx.beginPath(); ctx.ellipse(ax + armW * 0.5, armTop + u * 2.2, armW * 0.3, u * 1.1, 0, 0, Math.PI * 2); ctx.fill();
  }
}

/**
 * Paint the whole still living room: wall, floor and rug, picture, bookshelf with the plant, the floor lamp and the
 * sofa behind him, then a soft warm vignette so the face stays the brightest thing.
 * @param {CanvasRenderingContext2D} ctx where to paint (CSS px)
 * @param {number} w width
 * @param {number} h height
 * @param {object} pal palette (PALETTES.home)
 * @returns {void}
 */
function drawHome(ctx, w, h, pal) {
  const rand = rng(5521);
  const land = w > h;
  const u = Math.min(w, h) / 100;
  const floorY = h * (land ? 0.86 : 0.9);
  homeWall(ctx, w, floorY, u, pal);
  homeFloor(ctx, w, h, floorY, u, pal);
  const L = homeLampSpot(w, h);
  if (land) {
    homePicture(ctx, w * 0.715, h * 0.3, Math.max(70, Math.min(150, w * 0.14)), u, pal);
    homeBookshelf(ctx, w * 0.85, h * 0.2, w * 0.13, floorY, u, pal, rand);
    homeLamp(ctx, L, floorY, u, pal);
    homeSofa(ctx, w * 0.235, w * 0.765, h * 0.56, h * 0.67, floorY, u, pal);
  } else {
    homePicture(ctx, w * 0.6, h * 0.095, Math.max(60, Math.min(150, w * 0.24)), u, pal);
    homeBookshelf(ctx, w * 0.83, h * 0.17, w * 0.22, floorY, u, pal, rand);
    homeLamp(ctx, L, floorY, u, pal);
    homeSofa(ctx, -w * 0.06, w * 1.06, h * 0.6, h * 0.7, floorY, u, pal);
  }
  const v = ctx.createRadialGradient(w / 2, h * 0.45, Math.min(w, h) * 0.38, w / 2, h * 0.45, Math.hypot(w, h) * 0.62);
  v.addColorStop(0, 'rgba(0,0,0,0)');
  v.addColorStop(1, pal.vignette);
  ctx.fillStyle = v;
  ctx.fillRect(0, 0, w, h);
}

/**
 * The floor lamp's light at home: a big soft warm pool on the wall and a glow under the shade, at this brightness.
 * @param {CanvasRenderingContext2D} ctx where to draw (CSS px)
 * @param {number} w width
 * @param {number} h height
 * @param {object} pal palette (PALETTES.home)
 * @param {number} level brightness 0..1 (lampLevel)
 * @returns {void}
 */
function drawHomeLight(ctx, w, h, pal, level) {
  const L = homeLampSpot(w, h);
  const R = Math.min(w, h) * 0.62;
  const g = ctx.createRadialGradient(L.x, L.y, L.s * 0.4, L.x, L.y, R);
  g.addColorStop(0, `rgba(${pal.light},${0.5 * level})`);
  g.addColorStop(0.45, `rgba(${pal.light},${0.18 * level})`);
  g.addColorStop(1, `rgba(${pal.light},0)`);
  ctx.fillStyle = g;
  ctx.fillRect(L.x - R, L.y - R, R * 2, R * 2);
  const by = L.y + L.s * 0.42; // the bright rim under the shade where the bulb peeks out
  ctx.fillStyle = `rgba(255,246,200,${0.85 * level})`;
  ctx.beginPath(); ctx.ellipse(L.x, by, L.s * 0.8, L.s * 0.14, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = `rgba(255,255,240,${0.6 * level})`;
  ctx.beginPath(); ctx.ellipse(L.x, by, L.s * 0.3, L.s * 0.1, 0, 0, Math.PI * 2); ctx.fill();
}

/**
 * Paint the still part of the room (everything but the lamp's light) for a tier.
 * Tiers 1 and 2: the same room recoloured and cleaned up for now (T5.1 adds their own pieces here).
 * @param {CanvasRenderingContext2D} ctx where to paint (CSS px)
 * @param {number} w width
 * @param {number} h height
 * @param {number|string} tier 0, 1 or 2, or 'home' for the living room
 * @returns {void}
 */
function drawRoom(ctx, w, h, tier) {
  const pal = paletteFor(tier);
  if (pal.pulse) { drawHome(ctx, w, h, pal); return; }
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
 * @param {number|string} tier 0..2, or 'home'
 * @param {number} level brightness 0..1 (lampLevel)
 * @returns {void}
 */
function drawLight(ctx, w, h, tier, level) {
  const pal = paletteFor(tier);
  if (pal.pulse) { drawHomeLight(ctx, w, h, pal, level); return; }
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
 * Draw the room behind the face (the studio, or the living room at home): the cached still room, then the lamp
 * light for this moment.
 * @param {CanvasRenderingContext2D} ctx where to draw (already scaled so 1 unit = 1 CSS px)
 * @param {number} w width in CSS px
 * @param {number} h height in CSS px
 * @param {{room?: string, tier?: number, time?: number, reduced?: boolean, dpr?: number}} [o] room 'studio'
 *   (default) or 'home' (SPEC D19), studio tier 0..2 (SPEC D11), seconds since the scene started (for the flicker or
 *   the home lamp's breathing), reduced motion (steady light), pixel ratio (read from ctx when left out)
 * @returns {void}
 */
export function drawBackdrop(ctx, w, h, o = {}) {
  const tier = backdropKind(o.room, o.tier);
  const dpr = o.dpr ?? (ctx.getTransform?.().a || 1);
  ctx.drawImage(roomCanvas(Math.round(w), Math.round(h), tier, dpr), 0, 0, w, h);
  drawLight(ctx, w, h, tier, lampLevel(o.time ?? 0, tier, Boolean(o.reduced)));
}
