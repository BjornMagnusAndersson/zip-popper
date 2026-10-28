// The studio room behind the face in the pop scene (T1.0b, SPEC D10 and D11). It follows the studio upgrades:
// tier 0 = "dingy and dank" (grimy tiles, cracked and peeling paint, a flickering bare bulb, a bucket and an old sink),
// tier 1 = a bit better (mostly cleaned, warmer, a few repairs: filler patches, one new tile, tape on the pipe, a
// shade on the bulb, a towel), tier 2 = clean, sparkly and spa-like (mint and white, a glowing globe lamp, a spa
// shelf with towels, a candle and a little plant, a diffuser, sparkles, soft light). T5.1a.
// On top, each studio upgrade the player owns draws its own object (game/studio.js says which and in what order):
// wallPaint (fresh lavender wall with a stencilled band), sign (a shiny new sign with a tick), chair (a pink tufted
// wingback chair behind the customer), plant (a hanging plant with little eyes on its pot) and lamp (a ring light on
// a stand). They sit where the face does not cover them, in portrait and landscape. drawStudio paints the same room
// without the face in mind, for the studio view (T5.1c), with the wall of fame: a gold frame per mastered kind of bump
// and an empty nail for the rest (R8j, fameSpots and fameFrame).
// Before the studio (chapters 0 to 4, SPEC D19) the pop scene is at home instead: room 'home' paints the couple's
// living room in the comics' colours, with a floor lamp whose warm light breathes gently (steady with reduced motion).
// Cartoon only: stains are olive and brown water marks, never anything like blood.
// The still room is painted once per size, tier and set of layers into an offscreen canvas (cheap on phones); only the
// lamp's light is drawn on top each time it changes. With reduced motion the lamp never flickers.
// The pure parts (lampLevel, nextBackdropChange) need no DOM, so they can be tested in Node.
import { rng } from './logic.js';
import { drawPimple, drawHair, hairPoints } from './art.js';
import { studioLayersShown, studioKey } from '../game/studio.js';
import { BUMP_IDS } from '../data/bumps.js';
import { pinsDrawn } from '../game/pin-jar.js';

/** The backdrop tiers there are (same as the studio tiers in SPEC section 4). */
export const BACKDROP_TIERS = [0, 1, 2];

/**
 * Colours per tier. Tier 0 is muted greenish greys; tier 1 warm creams and browns; tier 2 mint, white and gold.
 * grime: how many stains, cracks and peeling bits (0 = none); flicker: whether the bare bulb flickers;
 * repairs: tier 1's mended bits (filler patches, a new tile, tape, a bulb shade, a towel); spa: tier 2's spa look.
 */
const PALETTES = {
  0: {
    wallTop: '#7d8a77', wallBottom: '#6b7866', tile: '#b4bba1', grout: '#6c7560', floor: '#4b5245', floorLine: '#3c4237',
    stain: '120,104,52', peel: '#b8b29a', crack: '#3f463a', pipe: '#6f7468', metal: '#8d9389', bucket: '#5f7f86',
    sink: '#c9cbbf', shelf: '#6b5a44', light: '255,228,150', bulb: '#fff2bf', vignette: 'rgba(24,34,26,0.5)', grime: 1, flicker: true,
  },
  1: {
    wallTop: '#d9c39c', wallBottom: '#c9b087', tile: '#ece3cf', grout: '#b3a487', floor: '#86694d', floorLine: '#6c533c',
    stain: '140,112,60', peel: '#e6d6b4', crack: '#7d6a50', pipe: '#a39782', metal: '#c2bbac', bucket: '#4f9bb0',
    sink: '#f6f3ea', shelf: '#9a744c', light: '255,226,170', bulb: '#fff7dc', vignette: 'rgba(70,46,22,0.28)', grime: 0.3,
    flicker: false, repairs: true, patch: '#e8d7b5', newTile: '#fbf6ea', tape: '#9aa3ab', towel: '#5fb8c9', shade: '#f2e6c9', mat: '#c9604d',
  },
  2: {
    wallTop: '#eaf7f3', wallBottom: '#d2ede6', tile: '#ffffff', grout: '#c4e4dd', floor: '#d9c6a6', floorLine: '#c3ad8a',
    stain: '0,0,0', peel: '#ffffff', crack: '#bfe0da', pipe: '#ffffff', metal: '#e0bd62', bucket: '#f6a6c1',
    sink: '#ffffff', shelf: '#e2c49c', light: '255,248,228', bulb: '#ffffff', vignette: 'rgba(110,150,140,0.14)', grime: 0,
    flicker: false, spa: true, towel: '#f9c6d6', towel2: '#bfe8de', rug: '#f4d9e4', leaf: '#5fbf8e', leafDark: '#3f9c72',
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
 * @param {boolean} [leak] the room drips (roomLeaks): the drop moves too
 * @returns {number} seconds (Infinity = it never changes)
 */
export function nextBackdropChange(time, tier = 0, reduced = false, leak = false) {
  if (reduced) return Infinity;
  if (leak) return Math.min(nextDripChange(time), nextBackdropChange(time, tier, false, false));
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
  return w > h ? { x: w * 0.2, y: h * 0.34, r } : { x: w * 0.17, y: h * 0.11, r };
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
export function stain(ctx, x, y, r, rgb, a) {
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
 * @param {boolean} [sadPlant] true = the comics' sad little plant (in Greta's scarf) stands where the mug was
 * @returns {void}
 */
function shelf(ctx, x, y, len, pal, sadPlant = false) {
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
  if (sadPlant) {
    sadPlantOnShelf(ctx, 74 * k, k);
    ctx.restore();
    return;
  }
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
 * @param {string} [colour] thread colour (the scrub job draws darker, thicker webs)
 * @param {number} [lw] thread width
 * @returns {void}
 */
export function cobweb(ctx, x, y, s, dir, colour = 'rgba(235,240,230,0.45)', lw = 1) {
  ctx.strokeStyle = colour;
  ctx.lineWidth = lw;
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
 * @param {number} [plantBelow] B17: 0 = the plant stands on top of the case; more = it stands on the first shelf whose
 *   space starts at least this low (CSS px), so the zoom buttons at the top right never hide it (portrait)
 * @returns {void}
 */
function homeBookshelf(ctx, x, top, bw, floorY, u, pal, rand, plantBelow = 0) {
  const lw = Math.max(1.2, u * 0.4);
  const side = Math.max(4, u * 1.4);
  box(ctx, x, top, bw, floorY - top, u * 0.8);
  inked(ctx, pal.shelf, lw, pal);
  ctx.fillStyle = '#7d5232'; // the dark inside of the case
  ctx.fillRect(x + side, top + side, bw - side * 2, floorY - top - side * 2);
  const books = ['#e8735a', '#4f86e8', '#ffd25a', '#7b6ad8', '#3fae8c', '#f08cbf', '#fff3e3', '#d0672e'];
  const rows = Math.max(3, Math.round((floorY - top) / (u * 15)));
  const rh = (floorY - top - side * 2) / rows;
  // B17: the shelf row the plant stands in (-1 = on top), and the plant's place and size there.
  let plantRow = -1;
  for (let r = 0; plantBelow > 0 && r < rows - 1; r += 1) if (top + side + rh * r >= plantBelow) { plantRow = r; break; }
  const plantS = Math.min(rh * 0.38, Math.max(16, u * 7));
  const plantX = x + bw * 0.45;
  for (let r = 0; r < rows; r += 1) {
    const base = top + side + rh * (r + 1);
    let bx = x + side + u * 0.6;
    const end = r === plantRow ? plantX - plantS * 0.8 : x + bw - side - u * 0.6; // books stop where the plant stands
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
    if (r === plantRow) homePlant(ctx, plantX, base - u * 0.3, plantS, pal, lw); // standing on this row's plank
    box(ctx, x + side * 0.6, base - u * 0.3, bw - side * 1.2, Math.max(3, u * 1.1), 1); // the shelf plank
    inked(ctx, pal.shelf, lw * 0.8, pal);
  }
  if (plantRow < 0) homePlant(ctx, x + bw * 0.32, top, Math.max(16, u * 7), pal, lw);
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
    // B17: the zoom buttons (three of 48 px with 8 px gaps, 10 px from the top) cover the top of the case, so the
    // plant stands on a shelf below them.
    homeBookshelf(ctx, w * 0.83, h * 0.17, w * 0.22, floorY, u, pal, rand, 10 + 48 * 3 + 8 * 2 + 12);
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

// ---- The studio's tier pieces and upgrade layers (T5.1a) ----

/** The soft ink line of outlined pieces (the same as the comics). */
const INK = { ink: '#2a211d' };
/** The wallPaint upgrade's fresh wall: a soft lavender with a white stencilled band of pink dots. */
const PAINT = { wallTop: '#efe6fb', wallBottom: '#dfd0f4', band: '#ffffff', dot: '#f08fb0' };
/** Leaf greens for the plants. */
const LEAF = '#5fbf8e';
const LEAF_DARK = '#3f9c72';

/**
 * A four-point cartoon sparkle (a star with curved sides).
 * @param {CanvasRenderingContext2D} ctx the context
 * @param {number} x centre x
 * @param {number} y centre y
 * @param {number} z half size
 * @param {string} colour fill colour
 * @param {number} [alpha] see-through 0..1
 * @returns {void}
 */
export function sparkle(ctx, x, y, z, colour, alpha = 1) {
  ctx.globalAlpha = alpha;
  ctx.fillStyle = colour;
  ctx.beginPath();
  ctx.moveTo(x, y - z);
  ctx.quadraticCurveTo(x + z * 0.18, y - z * 0.18, x + z, y);
  ctx.quadraticCurveTo(x + z * 0.18, y + z * 0.18, x, y + z);
  ctx.quadraticCurveTo(x - z * 0.18, y + z * 0.18, x - z, y);
  ctx.quadraticCurveTo(x - z * 0.18, y - z * 0.18, x, y - z);
  ctx.fill();
  ctx.globalAlpha = 1;
}

/**
 * A smoothed-over filler patch on the wall (tier 1's repairs): a paler blob with trowel swooshes.
 * @param {CanvasRenderingContext2D} ctx the context
 * @param {number} x centre x
 * @param {number} y centre y
 * @param {number} s size
 * @param {object} pal palette
 * @returns {void}
 */
function fillerPatch(ctx, x, y, s, pal) {
  ctx.fillStyle = pal.patch;
  ctx.beginPath(); ctx.ellipse(x, y, s, s * 0.62, -0.15, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.55)';
  ctx.lineWidth = Math.max(1, s * 0.06);
  for (let i = 0; i < 3; i += 1) {
    ctx.beginPath(); ctx.arc(x - s * 0.35 + i * s * 0.32, y + s * 0.25, s * 0.38, Math.PI * 1.15, Math.PI * 1.7); ctx.stroke();
  }
}

/**
 * The white stencilled band of the freshly painted wall (wallPaint upgrade): a white stripe with pink dots.
 * @param {CanvasRenderingContext2D} ctx the context
 * @param {number} w width
 * @param {number} y top of the band
 * @param {number} u size unit
 * @returns {void}
 */
function paintBand(ctx, w, y, u) {
  const bh = Math.max(7, u * 2.4);
  ctx.fillStyle = PAINT.band;
  ctx.fillRect(0, y, w, bh);
  ctx.fillStyle = 'rgba(214,110,150,0.25)';
  ctx.fillRect(0, y + bh, w, Math.max(1, u * 0.3));
  ctx.fillStyle = PAINT.dot;
  const step = Math.max(14, u * 5);
  for (let x = step / 2; x < w; x += step) {
    ctx.beginPath(); ctx.arc(x, y + bh / 2, bh * 0.24, 0, Math.PI * 2); ctx.fill();
  }
}

/**
 * Tier 2's ceiling: a white moulding with a thin gold line instead of the old pipe.
 * @param {CanvasRenderingContext2D} ctx the context
 * @param {number} w width
 * @param {number} py middle of where the pipe would be
 * @param {number} pr the pipe's half thickness
 * @param {object} pal palette
 * @returns {void}
 */
function cornice(ctx, w, py, pr, pal) {
  ctx.fillStyle = 'rgba(60,110,100,0.12)';
  ctx.fillRect(0, 0, w, py + pr * 1.6);
  ctx.fillStyle = pal.pipe;
  ctx.fillRect(0, 0, w, py + pr * 1.2);
  ctx.fillStyle = pal.metal;
  ctx.fillRect(0, py + pr * 0.6, w, Math.max(1.5, pr * 0.3));
}

/**
 * Tier 2's spa shelf: a light wooden plank with rolled towels, a lit candle and a little succulent in a pot.
 * @param {CanvasRenderingContext2D} ctx the context
 * @param {number} x left
 * @param {number} y top of the plank
 * @param {number} len plank length
 * @param {object} pal palette
 * @returns {void}
 */
function spaShelf(ctx, x, y, len, pal) {
  const k = len / 120;
  const lw = Math.max(1, 1.5 * k);
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = 'rgba(60,110,100,0.15)';
  ctx.fillRect(4 * k, 6 * k, len, 8 * k);
  box(ctx, 0, 0, len, 8 * k, 2 * k);
  inked(ctx, pal.shelf, lw, INK);
  for (const [cx, cy, col] of [[14, -9, pal.towel], [32, -9, pal.towel2], [23, -25, pal.towel]]) { // rolled towels
    ctx.beginPath(); ctx.arc(cx * k, cy * k, 8.5 * k, 0, Math.PI * 2);
    inked(ctx, col, lw, INK);
    ctx.strokeStyle = 'rgba(42,33,29,0.35)';
    ctx.lineWidth = lw * 0.8;
    ctx.beginPath(); ctx.arc(cx * k, cy * k, 4 * k, 0.4, Math.PI * 1.8); ctx.stroke();
  }
  const g = ctx.createRadialGradient(65 * k, -32 * k, 0, 65 * k, -32 * k, 20 * k); // the candle's warm glow
  g.addColorStop(0, 'rgba(255,214,140,0.55)');
  g.addColorStop(1, 'rgba(255,214,140,0)');
  ctx.fillStyle = g;
  ctx.fillRect(45 * k, -52 * k, 40 * k, 40 * k);
  box(ctx, 58 * k, -22 * k, 14 * k, 22 * k, 2 * k);
  inked(ctx, '#fff6e6', lw, INK);
  ctx.fillStyle = '#ffc94d'; // the flame
  ctx.beginPath(); ctx.moveTo(65 * k, -37 * k);
  ctx.quadraticCurveTo(71 * k, -28 * k, 65 * k, -25 * k);
  ctx.quadraticCurveTo(59 * k, -28 * k, 65 * k, -37 * k);
  ctx.fill();
  for (const a of [-50, -25, 0, 25, 50]) { // the succulent's fat leaves
    ctx.save();
    ctx.translate(96 * k, -15 * k);
    ctx.rotate((a * Math.PI) / 180);
    ctx.beginPath(); ctx.ellipse(0, -7 * k, 3.6 * k, 7.5 * k, 0, 0, Math.PI * 2);
    inked(ctx, a ? LEAF : LEAF_DARK, lw * 0.8, INK);
    ctx.restore();
  }
  ctx.beginPath();
  ctx.moveTo(86 * k, -16 * k); ctx.lineTo(106 * k, -16 * k); ctx.lineTo(103 * k, 0); ctx.lineTo(89 * k, 0); ctx.closePath();
  inked(ctx, '#f4a07a', lw, INK);
  ctx.restore();
}

/**
 * Tier 2's diffuser on the floor (instead of the bucket): a pink ceramic drop with soft steam curls rising.
 * @param {CanvasRenderingContext2D} ctx the context
 * @param {number} x centre x
 * @param {number} floor floor y (its bottom)
 * @param {number} s height
 * @param {object} pal palette
 * @returns {void}
 */
function diffuser(ctx, x, floor, s, pal) {
  const lw = Math.max(1.2, s * 0.04);
  ctx.fillStyle = 'rgba(60,90,80,0.18)';
  ctx.beginPath(); ctx.ellipse(x, floor, s * 0.5, s * 0.09, 0, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath();
  ctx.moveTo(x - s * 0.12, floor - s * 0.92);
  ctx.bezierCurveTo(x - s * 0.55, floor - s * 0.5, x - s * 0.5, floor, x, floor);
  ctx.bezierCurveTo(x + s * 0.5, floor, x + s * 0.55, floor - s * 0.5, x + s * 0.12, floor - s * 0.92);
  ctx.closePath();
  inked(ctx, pal.bucket, lw, INK);
  ctx.fillStyle = 'rgba(255,255,255,0.4)';
  ctx.beginPath(); ctx.ellipse(x - s * 0.18, floor - s * 0.42, s * 0.06, s * 0.18, 0.2, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.75)'; // steam curls
  ctx.lineWidth = Math.max(2, s * 0.06);
  ctx.lineCap = 'round';
  for (const dx of [-0.12, 0.1]) {
    ctx.beginPath();
    ctx.moveTo(x + s * dx, floor - s);
    ctx.bezierCurveTo(x + s * (dx - 0.3), floor - s * 1.3, x + s * (dx + 0.3), floor - s * 1.5, x + s * dx, floor - s * 1.85);
    ctx.stroke();
  }
  ctx.lineCap = 'butt';
}

/**
 * A towel hanging from a hook on the wall (tiers 1 and 2), with two stripes.
 * @param {CanvasRenderingContext2D} ctx the context
 * @param {number} x middle
 * @param {number} y the hook
 * @param {number} s towel height
 * @param {string} colour towel colour
 * @returns {void}
 */
function towel(ctx, x, y, s, colour) {
  const lw = Math.max(1, s * 0.03);
  ctx.beginPath(); ctx.arc(x, y, s * 0.06, 0, Math.PI * 2);
  inked(ctx, '#c2bbac', lw, INK);
  box(ctx, x - s * 0.24, y + s * 0.04, s * 0.48, s, s * 0.08);
  inked(ctx, colour, lw, INK);
  ctx.fillStyle = 'rgba(255,255,255,0.6)';
  for (const f of [0.72, 0.84]) ctx.fillRect(x - s * 0.24, y + s * f, s * 0.48, s * 0.05);
}

/**
 * Where each studio upgrade sits, in portrait and landscape. Sizes go by u = 1% of the short side.
 * Pop scene (view false): places the face does not cover (and clear of the scene's buttons); the chair is a big
 * back that peeks out round the customer's head.
 * Studio view (view true, T5.1c, no face): the room as a room. She stands on the floor (hero: where her feet are and
 * how tall she is), the empty chair stands beside her at a chair's size (about two thirds of her height, clear of the
 * sink), and the ring light stands on its tripod at about her head height.
 * @param {number} w width
 * @param {number} h height
 * @param {boolean} [view] true = the full studio view's places and sizes
 * @returns {object} u, floorY and a spot per layer (sign, chair, plant, lamp); in the view also hero {x, floor, h}
 */
export function layerSpots(w, h, view = false) {
  const u = Math.min(w, h) / 100;
  const land = w > h;
  const floorY = h * (land ? 0.86 : 0.9);
  if (view) return viewSpots(w, h, u, land, floorY);
  if (land) {
    return {
      u, floorY,
      sign: { x: w * 0.83, y: h * 0.06, s: Math.max(70, Math.min(150, w * 0.14)) },
      chair: { x: w * 0.5, top: h * 0.12, wide: Math.min(w * 0.5, h * 1.1), seat: h * 0.72 },
      plant: { x: w * 0.68, y: h * 0.2, s: Math.max(18, u * 8) },
      lamp: { x: w * 0.31, y: h * 0.52, r: Math.max(14, u * 7) },
    };
  }
  return {
    u, floorY,
    sign: { x: w * 0.72, y: h * 0.035, s: Math.max(64, Math.min(130, w * 0.22)) },
    chair: { x: w * 0.5, top: h * 0.14, wide: w * 0.96, seat: h * 0.72 },
    plant: { x: w * 0.075, y: h * 0.2, s: Math.max(18, u * 8) },
    lamp: { x: w * 0.925, y: h * 0.43, r: Math.max(14, u * 6.5) },
  };
}

/**
 * The studio view's places (layerSpots with view true). Everything stands on one line a little way into the floor
 * (ground), so she, the chair and the ring light look as if they stand in the room, not on the wall's edge.
 * @param {number} w width
 * @param {number} h height
 * @param {number} u size unit
 * @param {boolean} land landscape
 * @param {number} floorY where the wall meets the floor
 * @returns {object} the spots
 */
function viewSpots(w, h, u, land, floorY) {
  const ground = floorY + (h - floorY) * 0.45;
  const heroH = land ? Math.min(h * 0.68, w * 0.5) : Math.min(h * 0.46, w * 0.9);
  const cw = heroH * 0.43; // the chair's width: its top reaches about two thirds of her height
  const chairX = land ? w * 0.43 : w * 0.38;
  const chair = { x: chairX, wide: cw, top: ground - cw * 1.55, seat: ground - cw * 0.5, floor: ground };
  const lampR = Math.max(9, heroH * 0.075);
  return {
    u, floorY, ground,
    hero: { x: land ? w * 0.63 : w * 0.72, floor: ground, h: heroH },
    sign: land ? { x: w * 0.83, y: h * 0.06, s: Math.max(70, Math.min(150, w * 0.14)) }
      : { x: w * 0.72, y: h * 0.035, s: Math.max(64, Math.min(130, w * 0.22)) },
    chair,
    plant: land ? { x: w * 0.07, y: h * 0.16, s: Math.max(16, u * 7) } : { x: w * 0.075, y: h * 0.2, s: Math.max(18, u * 8) },
    lamp: { x: land ? w * 0.27 : w * 0.925, y: ground - heroH * 0.86, r: lampR, floor: ground },
  };
}

/**
 * The sign upgrade: a shiny new sign hanging straight from a nail, with a big green tick, a pink heart and gold
 * sparkles (no words: the old sign in the comics has none either) and no stain this time.
 * @param {CanvasRenderingContext2D} ctx the context
 * @param {{x: number, y: number, s: number}} p the nail and the sign's width
 * @param {number} u size unit
 * @returns {void}
 */
function shinySign(ctx, p, u) {
  const sw = p.s;
  const sh = p.s * 0.5;
  const top = p.y + sh * 0.4;
  const x0 = p.x - sw / 2;
  const lw = Math.max(1.4, u * 0.5);
  ctx.strokeStyle = INK.ink;
  ctx.lineWidth = Math.max(1, u * 0.35);
  ctx.beginPath(); ctx.moveTo(x0 + sw * 0.15, top); ctx.lineTo(p.x, p.y); ctx.lineTo(x0 + sw * 0.85, top); ctx.stroke();
  ctx.fillStyle = 'rgba(40,30,30,0.18)';
  box(ctx, x0 + u * 0.8, top + u, sw, sh, sh * 0.2); ctx.fill();
  box(ctx, x0, top, sw, sh, sh * 0.2);
  inked(ctx, '#fffaf0', lw, INK);
  ctx.strokeStyle = '#3fae8c';
  ctx.lineWidth = Math.max(2, sh * 0.07);
  box(ctx, x0 + sh * 0.1, top + sh * 0.1, sw - sh * 0.2, sh * 0.8, sh * 0.14); ctx.stroke();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.lineWidth = Math.max(3, sh * 0.14);
  ctx.beginPath();
  ctx.moveTo(x0 + sw * 0.2, top + sh * 0.5); ctx.lineTo(x0 + sw * 0.32, top + sh * 0.7); ctx.lineTo(x0 + sw * 0.52, top + sh * 0.28);
  ctx.stroke();
  ctx.lineCap = 'butt';
  const hx = x0 + sw * 0.73; // a pink heart
  const hy = top + sh * 0.5;
  const hz = sh * 0.2;
  ctx.beginPath();
  ctx.moveTo(hx, hy + hz);
  ctx.bezierCurveTo(hx - hz * 1.6, hy - hz * 0.2, hx - hz * 0.7, hy - hz * 1.3, hx, hy - hz * 0.45);
  ctx.bezierCurveTo(hx + hz * 0.7, hy - hz * 1.3, hx + hz * 1.6, hy - hz * 0.2, hx, hy + hz);
  inked(ctx, '#f48fb1', lw * 0.8, INK);
  ctx.fillStyle = 'rgba(255,255,255,0.45)'; // a gloss streak across the corner
  ctx.beginPath();
  ctx.moveTo(x0 + sw * 0.08, top + sh * 0.12); ctx.lineTo(x0 + sw * 0.18, top + sh * 0.12); ctx.lineTo(x0 + sw * 0.1, top + sh * 0.88); ctx.lineTo(x0 + sw * 0.04, top + sh * 0.88);
  ctx.closePath(); ctx.fill();
  sparkle(ctx, x0 + sw * 0.96, top + sh * 0.05, sh * 0.2, '#ffd25a');
  sparkle(ctx, x0 + sw * 0.03, top + sh * 0.95, sh * 0.13, '#ffd25a');
  ctx.beginPath(); ctx.arc(p.x, p.y, Math.max(2, u * 0.7), 0, Math.PI * 2);
  inked(ctx, '#c2c8d0', lw * 0.7, INK);
}

/**
 * The chair upgrade: a padded pink wingback chair with buttoned tufting, rolled arms, a seat and wooden legs. In
 * the pop scene the customer sits in front of it, so its wings and round top peek out around the head.
 * @param {CanvasRenderingContext2D} ctx the context
 * @param {{x: number, top: number, wide: number, seat: number}} c middle, top of the back, width, top of the seat
 * @param {number} floorY floor
 * @param {number} u size unit
 * @returns {void}
 */
function wingChair(ctx, c, floorY, u) {
  if (c.floor !== undefined) floorY = c.floor; // the studio view: it stands on the view's ground line
  const W = c.wide;
  const x0 = c.x - W / 2;
  const backH = c.seat - c.top;
  const lw = Math.max(1.4, u * 0.5);
  const fill = '#ef86a8';
  const dark = '#dc6b92';
  ctx.fillStyle = 'rgba(40,20,30,0.2)'; // shadow on the floor
  ctx.beginPath(); ctx.ellipse(c.x, floorY + u, W * 0.5, u * 2.5, 0, 0, Math.PI * 2); ctx.fill();
  const seatH = backH * 0.22;
  for (const lx of [x0 + W * 0.17, x0 + W * 0.83]) {
    box(ctx, lx - W * 0.025, c.seat + seatH * 0.8, W * 0.05, Math.max(u, floorY - c.seat - seatH * 0.8 + u), u * 0.6);
    inked(ctx, '#8a5a3a', lw, INK);
  }
  ctx.beginPath();
  ctx.roundRect(x0 + W * 0.1, c.top, W * 0.8, backH + seatH * 0.5, [W * 0.36, W * 0.36, u * 2, u * 2]);
  inked(ctx, fill, lw, INK);
  ctx.save(); // buttoned tufting, kept inside the back
  ctx.beginPath();
  ctx.roundRect(x0 + W * 0.1, c.top, W * 0.8, backH, [W * 0.36, W * 0.36, 0, 0]);
  ctx.clip();
  const rows = 5;
  const step = W * 0.13;
  for (let r = 0; r < rows; r += 1) {
    const y = c.top + backH * (0.16 + r * 0.17);
    for (let x = x0 + W * 0.18 + (r % 2) * step * 0.5; x < x0 + W * 0.86; x += step) {
      ctx.strokeStyle = 'rgba(150,40,80,0.28)';
      ctx.lineWidth = Math.max(1, u * 0.3);
      ctx.beginPath();
      ctx.moveTo(x - step * 0.35, y - backH * 0.06); ctx.lineTo(x, y); ctx.lineTo(x + step * 0.35, y - backH * 0.06);
      ctx.moveTo(x - step * 0.35, y + backH * 0.06); ctx.lineTo(x, y); ctx.lineTo(x + step * 0.35, y + backH * 0.06);
      ctx.stroke();
      ctx.fillStyle = '#b94a72';
      ctx.beginPath(); ctx.arc(x, y, Math.max(1.6, u * 0.65), 0, Math.PI * 2); ctx.fill();
    }
  }
  ctx.restore();
  ctx.fillStyle = 'rgba(255,255,255,0.3)'; // shine on the round top
  ctx.beginPath(); ctx.ellipse(c.x - W * 0.17, c.top + backH * 0.07, W * 0.12, Math.max(2, u * 1.3), -0.35, 0, Math.PI * 2); ctx.fill();
  for (const side of [-1, 1]) { // the wings, then the rolled arms in front of them
    const wx = side < 0 ? x0 : x0 + W * 0.8;
    box(ctx, wx, c.top + backH * 0.2, W * 0.2, backH * 0.8, W * 0.09);
    inked(ctx, dark, lw, INK);
    ctx.fillStyle = 'rgba(255,255,255,0.22)';
    box(ctx, wx + W * 0.05, c.top + backH * 0.26, W * 0.035, backH * 0.4, W * 0.02); ctx.fill();
  }
  box(ctx, x0 + W * 0.12, c.seat, W * 0.76, seatH, u * 2);
  inked(ctx, fill, lw, INK);
  for (const side of [-1, 1]) {
    const ax = side < 0 ? x0 - W * 0.02 : x0 + W * 0.78;
    box(ctx, ax, c.seat - seatH * 0.4, W * 0.24, seatH * 1.3, seatH * 0.5);
    inked(ctx, fill, lw, INK);
  }
}

/**
 * The plant upgrade: a plant hanging from the ceiling in a coral pot on three cords, with trailing vines, and two
 * little eyes on the pot (the plant from the comics, judging quietly).
 * @param {CanvasRenderingContext2D} ctx the context
 * @param {{x: number, y: number, s: number}} p middle of the pot rim and the pot's size
 * @param {number} u size unit
 * @returns {void}
 */
function hangingPlant(ctx, p, u) {
  const s = p.s;
  const lw = Math.max(1.2, u * 0.4);
  ctx.strokeStyle = '#c9a26b';
  ctx.lineWidth = Math.max(1, u * 0.3);
  for (const dx of [-0.55, 0, 0.55]) { ctx.beginPath(); ctx.moveTo(p.x, 0); ctx.lineTo(p.x + dx * s, p.y - s * 0.3); ctx.stroke(); }
  for (const [dx, len, sway] of [[-0.45, 2.6, -1], [0.05, 3.4, 1], [0.45, 2.1, 1]]) { // vines with leaves
    const x1 = p.x + dx * s;
    const cx = x1 + sway * s * 0.5;
    const y2 = p.y + len * s;
    ctx.strokeStyle = LEAF_DARK;
    ctx.lineWidth = Math.max(1, u * 0.35);
    ctx.beginPath(); ctx.moveTo(x1, p.y); ctx.quadraticCurveTo(cx, p.y + len * s * 0.5, x1, y2); ctx.stroke();
    for (let i = 1; i <= 5; i += 1) {
      const q = i / 5;
      const lx = (1 - q) * (1 - q) * x1 + 2 * (1 - q) * q * cx + q * q * x1;
      const ly = p.y + len * s * q;
      const side = i % 2 ? 1 : -1;
      ctx.beginPath(); ctx.ellipse(lx + side * s * 0.13, ly, s * 0.15, s * 0.09, side * 0.5, 0, Math.PI * 2);
      inked(ctx, i % 2 ? LEAF : LEAF_DARK, lw * 0.7, INK);
    }
  }
  for (const [a, len] of [[-55, 0.7], [50, 0.7], [-25, 0.95], [20, 0.9], [0, 1.05]]) { // leaves above the rim
    ctx.save();
    ctx.translate(p.x, p.y - s * 0.25);
    ctx.rotate((a * Math.PI) / 180);
    ctx.beginPath(); ctx.ellipse(0, -len * s * 0.45, s * 0.16, len * s * 0.45, 0, 0, Math.PI * 2);
    inked(ctx, a % 20 ? LEAF : LEAF_DARK, lw, INK);
    ctx.restore();
  }
  ctx.beginPath(); // the pot: a round bowl with a rim
  ctx.moveTo(p.x - s * 0.6, p.y - s * 0.3);
  ctx.lineTo(p.x + s * 0.6, p.y - s * 0.3);
  ctx.quadraticCurveTo(p.x + s * 0.58, p.y + s * 0.45, p.x, p.y + s * 0.45);
  ctx.quadraticCurveTo(p.x - s * 0.58, p.y + s * 0.45, p.x - s * 0.6, p.y - s * 0.3);
  inked(ctx, '#e8735a', lw, INK);
  box(ctx, p.x - s * 0.66, p.y - s * 0.4, s * 1.32, s * 0.2, s * 0.08);
  inked(ctx, '#f08c70', lw, INK);
  for (const ex of [-0.2, 0.2]) { // the eyes, glancing sideways
    ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.ellipse(p.x + ex * s, p.y + s * 0.05, s * 0.1, s * 0.12, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = INK.ink;
    ctx.beginPath(); ctx.arc(p.x + ex * s + s * 0.04, p.y + s * 0.07, s * 0.05, 0, Math.PI * 2); ctx.fill();
  }
}

/**
 * The lamp upgrade: a ring light on a stand with a tripod foot and a soft halo (the lamp from the comics).
 * @param {CanvasRenderingContext2D} ctx the context
 * @param {{x: number, y: number, r: number}} L middle of the ring and its radius
 * @param {number} floorY floor
 * @param {number} u size unit
 * @returns {void}
 */
function ringLight(ctx, L, floorY, u) {
  if (L.floor !== undefined) floorY = L.floor; // the studio view: it stands on the view's ground line
  const lw = Math.max(1.2, u * 0.45);
  const R = L.r * 3.4;
  const g = ctx.createRadialGradient(L.x, L.y, L.r * 0.5, L.x, L.y, R);
  g.addColorStop(0, 'rgba(255,251,226,0.6)');
  g.addColorStop(0.4, 'rgba(255,251,226,0.22)');
  g.addColorStop(1, 'rgba(255,251,226,0)');
  ctx.fillStyle = g;
  ctx.fillRect(L.x - R, L.y - R, R * 2, R * 2);
  ctx.strokeStyle = '#4a5160';
  ctx.lineWidth = Math.max(2, u * 0.7);
  ctx.beginPath();
  ctx.moveTo(L.x, floorY - u * 4); ctx.lineTo(L.x - u * 5, floorY + u * 0.5);
  ctx.moveTo(L.x, floorY - u * 4); ctx.lineTo(L.x + u * 5, floorY + u * 0.5);
  ctx.moveTo(L.x, floorY - u * 4); ctx.lineTo(L.x + u * 1, floorY + u * 2);
  ctx.stroke();
  box(ctx, L.x - u * 0.7, L.y + L.r * 1.1, u * 1.4, Math.max(u, floorY - u * 3.5 - L.y - L.r * 1.1), u * 0.5);
  inked(ctx, '#8a96a6', lw, INK);
  ctx.lineWidth = L.r * 0.46;
  ctx.strokeStyle = '#3a3f4a';
  ctx.beginPath(); ctx.arc(L.x, L.y, L.r, 0, Math.PI * 2); ctx.stroke();
  ctx.lineWidth = L.r * 0.28;
  ctx.strokeStyle = '#fffbe6';
  ctx.beginPath(); ctx.arc(L.x, L.y, L.r, 0, Math.PI * 2); ctx.stroke();
  sparkle(ctx, L.x - L.r * 0.7, L.y - L.r * 0.7, L.r * 0.3, '#ffffff', 0.9);
}

/**
 * The comics' sad little plant, standing on the plank (the shop's hanging plant replaces it): a terracotta pot, three
 * drooping leaves, a red scarf (Greta knitted it) and sad eyes. Drawn in the shelf's own coordinates.
 * @param {CanvasRenderingContext2D} ctx the context (already moved to the plank)
 * @param {number} cx middle of the pot, in plank units
 * @param {number} k plank scale (plank length / 120)
 * @returns {void}
 */
function sadPlantOnShelf(ctx, cx, k) {
  const lw = Math.max(1, k * 1.4);
  for (const [dx, len, a] of [[-5, 20, -1.1], [0, 24, 0.1], [5, 19, 1.1]]) { // leaves that flop over the rim
    ctx.save();
    ctx.translate(cx + dx * k, -20 * k);
    ctx.rotate(a);
    ctx.beginPath(); ctx.ellipse(0, -len * k * 0.4, 4.5 * k, len * k * 0.4, 0, 0, Math.PI * 2);
    inked(ctx, '#7fae6a', lw, INK);
    ctx.restore();
  }
  ctx.beginPath(); // the pot
  ctx.moveTo(cx - 13 * k, -22 * k); ctx.lineTo(cx + 13 * k, -22 * k); ctx.lineTo(cx + 10 * k, 0); ctx.lineTo(cx - 10 * k, 0); ctx.closePath();
  inked(ctx, '#d9805f', lw, INK);
  ctx.fillStyle = '#a85a45';
  ctx.fillRect(cx - 14 * k, -26 * k, 28 * k, 5 * k);
  ctx.fillStyle = '#e8505b'; // the scarf round the neck of the plant
  ctx.fillRect(cx - 12 * k, -22 * k, 24 * k, 4 * k);
  ctx.fillRect(cx + 7 * k, -22 * k, 4 * k, 12 * k);
  for (const ex of [-4, 4]) { // sad eyes: white, a pupil looking down, a droopy lid
    ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.arc(cx + ex * k, -11 * k, 2.6 * k, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = INK.ink;
    ctx.beginPath(); ctx.arc(cx + ex * k, -10 * k, 1.2 * k, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#d9805f';
    ctx.beginPath(); ctx.arc(cx + ex * k, -11.5 * k, 2.8 * k, Math.PI, Math.PI * 2); ctx.fill();
  }
}

/**
 * The studio's first sign (the comics' "Clean!" sign that is never clean): a grubby, crooked board on one nail with
 * a brown water stain and no words. The shop's shiny sign replaces it.
 * @param {CanvasRenderingContext2D} ctx the context
 * @param {{x: number, y: number, s: number}} p the nail and the sign's width
 * @param {number} u size unit
 * @returns {void}
 */
function oldSign(ctx, p, u) {
  const sw = p.s * 0.9;
  const sh = p.s * 0.42;
  const lw = Math.max(1.2, u * 0.45);
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.rotate(0.12); // hangs off a single nail, crooked
  ctx.strokeStyle = INK.ink;
  ctx.lineWidth = Math.max(1, u * 0.3);
  ctx.beginPath(); ctx.moveTo(-sw * 0.3, sh * 0.4); ctx.lineTo(0, 0); ctx.lineTo(sw * 0.1, sh * 0.4); ctx.stroke();
  box(ctx, -sw * 0.5, sh * 0.4, sw, sh, sh * 0.12);
  inked(ctx, '#d6cfae', lw, INK);
  ctx.fillStyle = 'rgba(120,96,50,0.45)'; // a brown water stain running down the board
  ctx.beginPath(); ctx.ellipse(sw * 0.18, sh * 0.75, sw * 0.16, sh * 0.2, 0.3, 0, Math.PI * 2); ctx.fill();
  ctx.fillRect(sw * 0.14, sh * 0.75, sw * 0.05, sh * 0.45);
  ctx.strokeStyle = 'rgba(70,60,40,0.55)'; // two wobbly lines where a word was once written
  ctx.lineWidth = Math.max(1, sh * 0.09);
  ctx.beginPath(); ctx.moveTo(-sw * 0.36, sh * 0.78); ctx.quadraticCurveTo(-sw * 0.1, sh * 0.68, sw * 0.08, sh * 0.8); ctx.stroke();
  ctx.beginPath(); ctx.arc(0, 0, Math.max(2, u * 0.6), 0, Math.PI * 2);
  inked(ctx, '#a9aeb5', lw * 0.7, INK);
  ctx.restore();
}

/**
 * The studio's first chair (the one plain chair in the comics): a wooden chair with two slats in its back, a flat seat
 * and four legs, in the same place as the shop's wingback chair (which replaces it).
 * @param {CanvasRenderingContext2D} ctx the context
 * @param {{x: number, top: number, wide: number, seat: number, floor?: number}} c middle, top of the back, width, seat
 * @param {number} floorY floor
 * @param {number} u size unit
 * @returns {void}
 */
function oldChair(ctx, c, floorY, u) {
  if (c.floor !== undefined) floorY = c.floor;
  const W = c.wide * 0.8;
  const x0 = c.x - W / 2;
  const lw = Math.max(1.4, u * 0.5);
  const wood = '#9a8f6a';
  const dark = '#7d7352';
  ctx.fillStyle = 'rgba(40,30,20,0.2)';
  ctx.beginPath(); ctx.ellipse(c.x, floorY + u, W * 0.5, u * 2.2, 0, 0, Math.PI * 2); ctx.fill();
  const seatH = Math.max(u * 1.6, (c.seat - c.top) * 0.12);
  for (const lx of [x0 + W * 0.1, x0 + W * 0.9]) { // legs
    box(ctx, lx - W * 0.03, c.seat + seatH * 0.8, W * 0.06, Math.max(u, floorY - c.seat - seatH * 0.8 + u), u * 0.5);
    inked(ctx, dark, lw, INK);
  }
  for (const px of [x0 + W * 0.08, x0 + W * 0.84]) { // back posts
    box(ctx, px, c.top, W * 0.08, c.seat - c.top + seatH * 0.4, u * 0.5);
    inked(ctx, wood, lw, INK);
  }
  for (const f of [0.12, 0.42]) { // slats
    box(ctx, x0 + W * 0.1, c.top + (c.seat - c.top) * f, W * 0.8, (c.seat - c.top) * 0.18, u * 0.5);
    inked(ctx, wood, lw, INK);
  }
  box(ctx, x0, c.seat, W, seatH, u * 0.8);
  inked(ctx, wood, lw, INK);
}

/**
 * Where the shelf is (the dingy shelf or the spa shelf: the same place), so things drawn on top later sit on it.
 * @param {number} w width
 * @param {number} h height
 * @param {number|string} kind backdrop kind 0..2
 * @returns {{x: number, y: number, len: number, rot: number}} left end, top of the plank, length and tilt
 */
export function shelfSpot(w, h, kind) {
  const land = w > h;
  const len = Math.max(70, Math.min(130, w * 0.2));
  const pal = paletteFor(kind);
  return { x: land ? w * 0.78 : w - len - w * 0.05, y: h * (land ? 0.34 : 0.2), len, rot: !pal.spa && pal.grime > 0.5 ? 0.04 : 0 };
}

/**
 * The pin jar on the right end of the shelf (owner 2026-10-28, game/pin-jar.js): a little glass jar with a red lid,
 * filling up with the home-popping safety pins she took away from customers. Nothing before the first pin.
 * @param {CanvasRenderingContext2D} ctx the context
 * @param {number} w width
 * @param {number} h height
 * @param {number|string} kind backdrop kind 0..2
 * @param {number} count pins to draw (game/pin-jar.js pinsDrawn)
 * @returns {void}
 */
export function drawPinJar(ctx, w, h, kind, count) {
  if (!(count > 0)) return;
  const { x, y, len, rot } = shelfSpot(w, h, kind);
  const k = len / 120;
  const lw = Math.max(1, 1.3 * k);
  const jw = 15 * k;
  const jh = 22 * k;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.translate(113 * k, 0);
  box(ctx, -jw / 2, -jh, jw, jh, 3 * k); // the glass, a faint tint
  ctx.fillStyle = 'rgba(215,238,245,0.45)';
  ctx.fill();
  const cols = ['#e2524f', '#4f8fe2', '#f2c14e', '#5fbf8e', '#c46fe0'];
  for (let i = 0; i < count; i += 1) { // the pins: rows of four from the bottom up, each a little tilted
    const row = Math.floor(i / 4);
    const px = (-4.5 + (i % 4) * 3 + (row % 2) * 1.2) * k;
    const py = -2.5 * k - row * 2.6 * k;
    const a = ((i * 37) % 7 - 3) * 0.25;
    ctx.save();
    ctx.translate(px, py);
    ctx.rotate(a);
    ctx.strokeStyle = '#9aa4ab';
    ctx.lineWidth = Math.max(0.8, 0.8 * k);
    ctx.beginPath(); ctx.moveTo(-2.2 * k, 0); ctx.lineTo(2.2 * k, 0); ctx.stroke();
    ctx.fillStyle = cols[i % cols.length];
    ctx.beginPath(); ctx.arc(-2.4 * k, 0, 0.95 * k, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }
  box(ctx, -jw / 2, -jh, jw, jh, 3 * k); // the glass outline and a shine on top of the pins
  ctx.strokeStyle = INK.ink;
  ctx.lineWidth = lw;
  ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  ctx.fillRect(-jw / 2 + 2 * k, -jh + 3 * k, 1.8 * k, jh - 7 * k);
  box(ctx, -jw / 2 - 1 * k, -jh - 4 * k, jw + 2 * k, 4.5 * k, 1.5 * k); // the red lid
  inked(ctx, '#e2524f', lw, INK);
  ctx.restore();
}

/**
 * The leak's drip (owner 2026-10-28: alive, and a tiny bit annoying, so players want it fixed). One cycle in seconds:
 * the drop swells under the joint (grow), falls (fall), plinks into the bucket and splashes (splash), then a short rest.
 */
export const DRIP = { every: 6.5, grow: 4.8, fall: 0.45, splash: 0.55 };

/**
 * Where the leaking joint and the bucket under it are, for a room size (the room drawing and the moving drip share it).
 * @param {number} w width
 * @param {number} h height
 * @returns {{py: number, pr: number, jx: number, backX: number, backS: number, floorMid: number}} the pipe's centre y
 *   and half thickness, the joint's x; the bucket's x, height and floor (bottom) y
 */
export function leakGeometry(w, h) {
  const land = w > h;
  const t = Math.max(26, Math.min(54, Math.round(Math.min(w, h) / 8.5)));
  const floorY = h * (land ? 0.86 : 0.9);
  const x = w * (land ? 0.95 : 0.89); // off to the right, clear of the sign and of the face
  return {
    py: Math.max(6, h * 0.035), pr: Math.max(4, t * 0.13), jx: x,
    backX: x, backS: land ? Math.max(34, Math.min(70, h * 0.14)) : Math.max(30, w * 0.1), floorMid: floorY + (h - floorY) * 0.55,
  };
}

/**
 * Whether a room drips: the studio (any tier) until the leakFix upgrade; never at home.
 * @param {number|string} kind backdrop kind (backdropKind: 0..2 or 'home')
 * @param {string[]} [layers] owned studio layers
 * @returns {boolean} true = the drip shows (and plinks)
 */
export function roomLeaks(kind, layers = []) {
  return kind !== 'home' && !(Array.isArray(layers) && layers.includes('leakFix'));
}

/**
 * The drip at a moment: how far the drop has swollen, or fallen, or splashed (each 0..1, or null when not in that
 * part). With reduced motion the drop just hangs, full size and still.
 * @param {number} time seconds since the scene started
 * @param {boolean} [reduced] reduced motion is on
 * @returns {{grow: number|null, fall: number|null, splash: number|null}} the parts
 */
export function dripAt(time, reduced = false) {
  if (reduced || !Number.isFinite(time)) return { grow: 1, fall: null, splash: null };
  const c = ((time % DRIP.every) + DRIP.every) % DRIP.every;
  if (c < DRIP.grow) return { grow: c / DRIP.grow, fall: null, splash: null };
  if (c < DRIP.grow + DRIP.fall) return { grow: null, fall: (c - DRIP.grow) / DRIP.fall, splash: null };
  const sp = c - DRIP.grow - DRIP.fall;
  return { grow: null, fall: null, splash: sp < DRIP.splash ? sp / DRIP.splash : null };
}

/**
 * Whether a drop landed in the bucket between two moments (for the plink sound).
 * @param {number} t0 the earlier time, seconds (not counted)
 * @param {number} t1 the later time, seconds (counted)
 * @returns {boolean} true when a drop landed in (t0, t1]
 */
export function dripLands(t0, t1) {
  if (!(Number.isFinite(t0) && Number.isFinite(t1) && t1 > t0)) return false;
  const lands = DRIP.grow + DRIP.fall;
  const at = Math.floor((t1 - lands) / DRIP.every) * DRIP.every + lands;
  return at > t0 && at <= t1;
}

/**
 * How long until the next drop lands in the bucket (with reduced motion the drop is still, but the plink plays on).
 * @param {number} time seconds since the scene started
 * @returns {number} seconds, more than 0
 */
export function nextDripLanding(time) {
  const lands = DRIP.grow + DRIP.fall;
  const c = (((time - lands) % DRIP.every) + DRIP.every) % DRIP.every;
  return Math.max(0.01, DRIP.every - c);
}

/**
 * How long until the drip looks different: a slow step while it swells, smooth frames while it falls and splashes.
 * @param {number} time seconds since the scene started
 * @param {boolean} [reduced] reduced motion is on (then it never changes)
 * @returns {number} seconds (Infinity = never)
 */
export function nextDripChange(time, reduced = false) {
  if (reduced) return Infinity;
  const d = dripAt(time);
  if (d.grow !== null) return Math.min(0.15, DRIP.grow - (((time % DRIP.every) + DRIP.every) % DRIP.every) + 0.001);
  if (d.fall !== null || d.splash !== null) return 1 / 30;
  return Math.max(0.01, DRIP.every - (((time % DRIP.every) + DRIP.every) % DRIP.every));
}

/**
 * Draw the drip for a moment: a cartoon water drop swelling under the joint, falling into the bucket, and a little
 * splash ring with two droplets at the bucket's rim.
 * @param {CanvasRenderingContext2D} ctx the context
 * @param {number} w width
 * @param {number} h height
 * @param {number} time seconds since the scene started
 * @param {boolean} [reduced] reduced motion is on (a still drop)
 * @returns {void}
 */
export function drawDrip(ctx, w, h, time, reduced = false) {
  const { py, pr, jx, backS, floorMid } = leakGeometry(w, h);
  const d = dripAt(time, reduced);
  const hang = py + pr * 1.3; // where the drop hangs from
  const rim = floorMid - backS; // the bucket's water line
  const R = pr * 0.8;
  ctx.save();
  /** One drop: round at the bottom, pointed on top. @param {number} x centre x @param {number} y centre y @param {number} r radius @param {number} [stretch] taller when falling @returns {void} */
  const drop = (x, y, r, stretch = 1) => {
    ctx.fillStyle = 'rgba(175,210,222,0.92)';
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI);
    ctx.quadraticCurveTo(x - r, y - r * 1.2 * stretch, x, y - r * 2 * stretch);
    ctx.quadraticCurveTo(x + r, y - r * 1.2 * stretch, x + r, y);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.beginPath(); ctx.arc(x - r * 0.35, y - r * 0.2, r * 0.28, 0, Math.PI * 2); ctx.fill();
  };
  if (d.grow !== null) {
    const r = R * (0.3 + 0.7 * d.grow);
    drop(jx, hang + r * 1.6, r, 0.8 + 0.3 * d.grow);
  } else if (d.fall !== null) {
    drop(jx, hang + R * 1.6 + (rim - hang - R * 1.6) * d.fall * d.fall, R * 0.85, 1.5);
  } else if (d.splash !== null) {
    const k = d.splash;
    ctx.globalAlpha = 1 - k;
    ctx.strokeStyle = 'rgba(175,210,222,0.95)';
    ctx.lineWidth = Math.max(1.5, pr * 0.25);
    ctx.beginPath(); ctx.ellipse(jx, rim, backS * (0.08 + 0.25 * k), backS * (0.03 + 0.06 * k), 0, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = 'rgba(175,210,222,0.95)';
    for (const s of [-1, 1]) {
      ctx.beginPath(); ctx.arc(jx + s * backS * 0.18 * k, rim - backS * 0.35 * Math.sin(Math.PI * k), Math.max(1.5, pr * 0.22), 0, Math.PI * 2); ctx.fill();
    }
  }
  ctx.restore();
}

/**
 * The leakFix upgrade's shiny new pipe joint (owner 2026-10-28): a bright chrome collar with two bolts, a shine and a
 * little sparkle, on the old pipe where the dripping joint was.
 * @param {CanvasRenderingContext2D} ctx the context
 * @param {number} x joint centre x
 * @param {number} y pipe centre y
 * @param {number} r pipe half thickness
 * @returns {void}
 */
function newJoint(ctx, x, y, r) {
  const g = ctx.createLinearGradient(0, y - r * 1.5, 0, y + r * 1.5);
  g.addColorStop(0, '#ffffff');
  g.addColorStop(0.45, '#cfd8de');
  g.addColorStop(1, '#8e9aa3');
  box(ctx, x - r * 1.5, y - r * 1.5, r * 3, r * 3, r * 0.5);
  inked(ctx, g, Math.max(1, r * 0.18), INK);
  ctx.fillStyle = '#7d8890'; // two bolts
  for (const dx of [-0.85, 0.85]) { ctx.beginPath(); ctx.arc(x + dx * r, y, r * 0.28, 0, Math.PI * 2); ctx.fill(); }
  ctx.fillStyle = 'rgba(255,255,255,0.85)'; // shine
  ctx.fillRect(x - r * 1.1, y - r * 1.15, r * 2.2, r * 0.35);
  sparkle(ctx, x + r * 1.7, y + r * 1.4, r * 1.1, '#ffffff', 0.95);
}

/**
 * Draw one studio upgrade in its spot (wallPaint is part of the wall and leakFix part of the ceiling pipe, both
 * painted with the room, so they are skipped here).
 * @param {CanvasRenderingContext2D} ctx the context
 * @param {string} id the layer id (game/studio.js STUDIO_LAYERS)
 * @param {object} spots layerSpots result
 * @returns {void}
 */
function drawLayer(ctx, id, spots) {
  if (id === 'sign') shinySign(ctx, spots.sign, spots.u);
  else if (id === 'chair') wingChair(ctx, spots.chair, spots.floorY, spots.u);
  else if (id === 'plant') hangingPlant(ctx, spots.plant, spots.u);
  else if (id === 'lamp') ringLight(ctx, spots.lamp, spots.floorY, spots.u);
}

/** How much each frame on the wall of fame leans (radians), so the row looks hung by hand. */
const FAME_TILTS = [-0.05, 0.04, -0.02, 0.06, -0.04, 0.03, -0.06];

/**
 * The wall of fame in the studio view (R8j): one nail per kind of bump (data/bumps.js order) where that kind's Master
 * diploma hangs. Upright: two rows (4 and 3) on the upper wall, left of the shelf and under the sign; sideways: one row
 * along the top, between the ceiling lamp's cord and the sign, above her head. Only the studio view has it: in the pop
 * scene the face covers that wall.
 * @param {number} w width
 * @param {number} h height
 * @returns {{type: string, x: number, y: number, s: number, tilt: number}[]} per kind: the nail (x, y), the frame's
 *   width (s; it is 1.2 s tall and hangs 0.25 s below the nail) and its lean
 */
export function fameSpots(w, h) {
  const n = BUMP_IDS.length;
  if (w > h) {
    const s = Math.min(w * 0.05, h * 0.085);
    return BUMP_IDS.map((type, i) => ({ type, x: w * (0.3 + (0.42 * i) / (n - 1)), y: h * 0.085, s, tilt: FAME_TILTS[i % 7] }));
  }
  const s = Math.min(w * 0.11, h * 0.07);
  const top = Math.ceil(n / 2);
  return BUMP_IDS.map((type, i) => {
    const row = i < top ? 0 : 1;
    const col = row ? i - top + 0.5 : i;
    // from 0.27 of the width: clear of the hanging plant and its vines on the left, and of the shelf on the right
    return { type, x: w * (0.27 + col * 0.13), y: h * (row ? 0.305 : 0.19), s, tilt: FAME_TILTS[i % 7] };
  });
}

/**
 * A tiny bump of a kind on the diploma in a frame (the Field guide's pictures, much smaller).
 * @param {CanvasRenderingContext2D} ctx the context
 * @param {string} type bump id
 * @param {number} x middle of the skin circle
 * @param {number} y middle of the skin circle
 * @param {number} r the skin circle's radius
 * @returns {void}
 */
function fameBump(ctx, type, x, y, r) {
  /** One bump, standing still. @param {number} k its size as a share of r @param {number} [dx] @param {number} [dy] @returns {void} */
  const bump = (k, dx = 0, dy = 0) => drawPimple(ctx, { x: x + dx * r, y: y + dy * r, r: r * k, type }, 0, 1, 0.35);
  if (type === 'horn') bump(0.42, 0, 0.26);
  else if (type === 'hair') {
    bump(0.32, -0.38, 0.38);
    drawHair(ctx, hairPoints(x - r * 0.38, y + r * 0.38, -0.7, r * 1.6, r / 46, 0), Math.max(0.8, r * 0.06));
  } else bump({ whitehead: 0.48, red: 0.5, blackhead: 0.38, big: 0.66, gold: 0.5 }[type] ?? 0.48);
}

/**
 * One spot on the wall of fame: a gold frame with the kind's diploma (cream paper, the bump on a patch of skin, two
 * lines of writing and a red seal) hanging on a string from its nail, or, not earned yet, only the nail and a faint
 * dashed outline where the frame will go.
 * @param {CanvasRenderingContext2D} ctx the context
 * @param {{type: string, x: number, y: number, s: number, tilt: number}} p the spot (fameSpots)
 * @param {boolean} earned true = that kind is a Master
 * @returns {void}
 */
export function fameFrame(ctx, p, earned) {
  const s = p.s;
  const fh = s * 1.2;
  const drop = s * 0.25;
  const lw = Math.max(1, s * 0.045);
  ctx.save();
  ctx.translate(p.x, p.y);
  if (earned) {
    ctx.rotate(p.tilt);
    ctx.strokeStyle = INK.ink;
    ctx.lineWidth = Math.max(1, s * 0.03);
    ctx.beginPath(); ctx.moveTo(-s * 0.3, drop + s * 0.06); ctx.lineTo(0, 0); ctx.lineTo(s * 0.3, drop + s * 0.06); ctx.stroke();
    ctx.fillStyle = 'rgba(30,20,20,0.22)';
    box(ctx, -s / 2 + s * 0.07, drop + s * 0.07, s, fh, s * 0.06); ctx.fill();
    box(ctx, -s / 2, drop, s, fh, s * 0.06);
    inked(ctx, '#e8b84a', lw, INK);
    ctx.fillStyle = '#f7d77a'; // the frame's lighter inner edge
    box(ctx, -s * 0.44, drop + s * 0.06, s * 0.88, fh - s * 0.12, s * 0.04); ctx.fill();
    box(ctx, -s * 0.37, drop + s * 0.13, s * 0.74, fh - s * 0.26, s * 0.03);
    inked(ctx, '#fff7e2', lw * 0.6, INK);
    const cy = drop + fh * 0.4;
    const r = s * 0.22;
    ctx.save();
    ctx.beginPath(); ctx.arc(0, cy, r, 0, Math.PI * 2);
    inked(ctx, '#f8cfb2', lw * 0.6, INK);
    ctx.clip();
    fameBump(ctx, p.type, 0, cy, r);
    ctx.restore();
    ctx.strokeStyle = 'rgba(42,33,29,0.45)'; // two lines of writing
    ctx.lineWidth = Math.max(0.8, s * 0.025);
    for (const [f, len] of [[0.7, 0.24], [0.78, 0.16]]) { ctx.beginPath(); ctx.moveTo(-s * len, drop + fh * f); ctx.lineTo(s * len, drop + fh * f); ctx.stroke(); }
    ctx.beginPath(); ctx.arc(s * 0.2, drop + fh * 0.86, s * 0.075, 0, Math.PI * 2); // the red seal
    inked(ctx, '#e8505b', lw * 0.5, INK);
  } else {
    ctx.setLineDash([s * 0.1, s * 0.08]);
    ctx.strokeStyle = 'rgba(42,33,29,0.3)';
    ctx.lineWidth = Math.max(1, s * 0.035);
    box(ctx, -s / 2, drop, s, fh, s * 0.06); ctx.stroke();
    ctx.setLineDash([]);
  }
  ctx.beginPath(); ctx.arc(0, 0, Math.max(1.5, s * 0.06), 0, Math.PI * 2); // the nail
  inked(ctx, '#a9aeb5', lw * 0.7, INK);
  ctx.restore();
}

/**
 * The whole wall of fame: every kind's spot, framed for the Masters, an empty nail for the rest.
 * @param {CanvasRenderingContext2D} ctx the context
 * @param {number} w width
 * @param {number} h height
 * @param {string[]} masters the bump ids that are Masters
 * @returns {void}
 */
function fameWall(ctx, w, h, masters) {
  for (const p of fameSpots(w, h)) fameFrame(ctx, p, masters.includes(p.type));
}

/**
 * Paint the still part of the room (everything but the ceiling lamp's light) for a tier and the owned upgrades.
 * Tier 0 dingy and dank, tier 1 a bit better (repairs), tier 2 the spa; then each owned layer in draw order.
 * @param {CanvasRenderingContext2D} ctx where to paint (CSS px)
 * @param {number} w width
 * @param {number} h height
 * @param {number|string} tier 0, 1 or 2, or 'home' for the living room
 * @param {string[]} [layers] owned studio layer ids (save.studioLayers); the home room ignores them
 * @param {boolean} [view] true = the studio view's places and sizes for the layers (layerSpots); the pop scene leaves
 *   it out
 * @param {string[]|null} [masters] the studio view's wall of fame: the bump ids that are Masters (each gets its framed
 *   diploma, the rest an empty nail); null = no wall of fame
 * @returns {void}
 */
function drawRoom(ctx, w, h, tier, layers = [], view = false, masters = null) {
  const pal = paletteFor(tier);
  if (pal.pulse) { drawHome(ctx, w, h, pal); return; }
  const shown = studioLayersShown(layers);
  const painted = shown.includes('wallPaint');
  const rand = rng(9173 + tier);
  const land = w > h;
  const u = Math.min(w, h) / 100;
  const floorY = h * (land ? 0.86 : 0.9);
  const tileTop = h * (land ? 0.5 : 0.42);
  const t = Math.max(26, Math.min(54, Math.round(Math.min(w, h) / 8.5)));
  // Upper wall: the tier's paint, or the fresh wallPaint colour (which covers every stain, crack and patch).
  const wc = painted ? PAINT : pal;
  const wall = ctx.createLinearGradient(0, 0, 0, tileTop);
  wall.addColorStop(0, wc.wallTop);
  wall.addColorStop(1, wc.wallBottom);
  ctx.fillStyle = wall;
  ctx.fillRect(0, 0, w, tileTop);
  if (pal.grime > 0 && !painted) {
    for (let i = 0; i < 2 + Math.round(w / 400); i += 1) stain(ctx, rand() * w, tileTop * (0.2 + rand() * 0.6), t * (0.6 + rand() * 0.7), pal.stain, pal.grime * 0.8);
    for (let i = 0; i < Math.round((2 + w / 260) * pal.grime); i += 1) {
      peel(ctx, w * (0.05 + rand() * 0.9), tileTop * (0.15 + rand() * 0.7), t * (0.35 + rand() * 0.35), pal, rand);
    }
    if (pal.grime > 0.5) {
      crack(ctx, w * 0.93, 0, tileTop * 0.45, rand, pal.crack);
      crack(ctx, w * 0.06, tileTop * 0.3, tileTop * 0.5, rand, pal.crack);
    }
  }
  if (pal.repairs && !painted) { // where the worst cracks were: smoothed over with filler
    fillerPatch(ctx, w * 0.06, tileTop * 0.55, t * 0.5, pal);
    fillerPatch(ctx, w * (land ? 0.7 : 0.92), tileTop * (land ? 0.62 : 0.3), t * 0.45, pal);
  }
  if (pal.spa) { // soft daylight falling across the wall
    const beam = ctx.createLinearGradient(w * 0.6, 0, w * 0.85, h * 0.8);
    beam.addColorStop(0, 'rgba(255,255,255,0.35)');
    beam.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = beam;
    ctx.beginPath(); ctx.moveTo(w * 0.55, 0); ctx.lineTo(w * 0.8, 0); ctx.lineTo(w * 1.05, h * 0.85); ctx.lineTo(w * 0.7, h * 0.85); ctx.closePath(); ctx.fill();
  }
  // The ceiling: an old pipe with a joint (tiers 0 and 1: in 0 a brown drip stain under it, in 1 taped up), or the
  // spa's white moulding (tier 2). It drips in every tier until the leakFix upgrade (owner 2026-10-28: paint and
  // furniture never fixed the leak): then a shiny new joint, no stain, no drop, no bucket.
  const leakFixed = shown.includes('leakFix');
  const { py, pr, jx } = leakGeometry(w, h); // the joint sits right over the bucket, clear of the sign
  if (pal.spa) {
    cornice(ctx, w, py, pr, pal);
  } else {
    ctx.fillStyle = pal.pipe;
    ctx.fillRect(0, py - pr, w, pr * 2);
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    ctx.fillRect(0, py - pr, w, pr * 0.5);
    if (leakFixed) newJoint(ctx, jx, py, pr);
    else {
      ctx.fillStyle = pal.metal;
      ctx.fillRect(jx - pr * 1.4, py - pr * 1.4, pr * 2.8, pr * 2.8);
    }
  }
  if (pal.repairs && !leakFixed) { // grey tape wrapped round the joint (it still drips through)
    ctx.fillStyle = pal.tape;
    ctx.save(); ctx.translate(jx, py); ctx.rotate(-0.25);
    ctx.fillRect(-pr * 2, -pr * 0.55, pr * 4, pr * 1.1);
    ctx.rotate(0.5);
    ctx.fillRect(-pr * 1.9, -pr * 0.5, pr * 3.8, pr * 1);
    ctx.restore();
  }
  if (pal.grime > 0.5 && !leakFixed) { // the brown drip stain under the joint
    const len = Math.min(tileTop * 0.35, t * 2.2);
    const dg = ctx.createLinearGradient(0, py, 0, py + len);
    dg.addColorStop(0, `rgba(${pal.stain},0.4)`);
    dg.addColorStop(1, `rgba(${pal.stain},0)`);
    ctx.fillStyle = dg;
    ctx.beginPath(); ctx.ellipse(jx, py + len / 2, pr * 0.9, len / 2, 0, 0, Math.PI * 2); ctx.fill();
  }
  // (the drop itself moves, so it is drawn on top each time: drawDrip)
  if (painted) paintBand(ctx, w, py + pr * 1.9, u);
  tiles(ctx, w, tileTop, floorY, t, pal, rand);
  if (pal.repairs) { // one brand-new tile where the missing one was
    const gap = Math.max(2, t * 0.06);
    const c = land ? Math.floor((w * 0.27) / t) : 0;
    const x = c * t + gap / 2;
    const y = tileTop + t + gap / 2;
    ctx.fillStyle = pal.newTile;
    ctx.fillRect(x, y, t - gap, t - gap);
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.fillRect(x + (t - gap) * 0.12, y + (t - gap) * 0.12, (t - gap) * 0.4, Math.max(2, t * 0.06));
    sparkle(ctx, x + (t - gap) * 0.78, y + (t - gap) * 0.3, t * 0.14, '#ffffff', 0.9);
  }
  // Floor.
  ctx.fillStyle = pal.floor;
  ctx.fillRect(0, floorY, w, h - floorY);
  ctx.strokeStyle = pal.floorLine;
  ctx.lineWidth = 2;
  for (let x = -w; x < w * 2; x += t * 1.6) { ctx.beginPath(); ctx.moveTo(x, floorY); ctx.lineTo(w / 2 + (x - w / 2) * 1.8, h); ctx.stroke(); }
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.fillRect(0, floorY, w, 3);
  if (pal.spa) { // a soft round rug
    ctx.fillStyle = pal.rug;
    ctx.beginPath(); ctx.ellipse(w / 2, floorY + (h - floorY) * 0.6, w * 0.32, (h - floorY) * 0.35, 0, 0, Math.PI * 2); ctx.fill();
  }
  // Furniture: a shelf high up on the right, a sink on the left, a bucket and mop (the spa: a diffuser) on the right.
  const shelfLen = Math.max(70, Math.min(130, w * 0.2));
  const sinkX = land ? w * 0.12 : w * 0.1;
  const sinkY = land ? h * 0.56 : tileTop + t * 0.6;
  const sinkS = land ? Math.max(60, Math.min(110, w * 0.11)) : Math.max(56, w * 0.18);
  const { backX, backS, floorMid } = leakGeometry(w, h);
  if (pal.repairs) { // a little bath mat under the sink
    ctx.fillStyle = pal.mat;
    ctx.beginPath(); ctx.roundRect(sinkX - sinkS * 0.45, floorY + (h - floorY) * 0.25, sinkS * 0.9, (h - floorY) * 0.45, 6); ctx.fill();
  }
  if (pal.spa) spaShelf(ctx, land ? w * 0.78 : w - shelfLen - w * 0.05, h * (land ? 0.34 : 0.2), shelfLen, pal);
  else shelf(ctx, land ? w * 0.78 : w - shelfLen - w * 0.05, h * (land ? 0.34 : 0.2), shelfLen, pal, !shown.includes('plant')); // the sad plant until the shop's one arrives
  sink(ctx, sinkX, sinkY, sinkS, pal);
  if (pal.towel) towel(ctx, sinkX + sinkS * 0.72, sinkY - sinkS * 0.3, sinkS * 0.55, pal.towel);
  if (!leakFixed) bucket(ctx, backX, floorMid, backS, pal); // under the drip until the leak is fixed (pink in the spa)
  else if (pal.spa) diffuser(ctx, backX, floorMid, backS, pal);
  if (pal.grime > 0.5) cobweb(ctx, w, py + pr, Math.max(36, t * 1.3), -1);
  // The ceiling lamp's cord and socket (the light itself is drawn on top each time, see drawLight). Gold in the spa.
  const L = lampSpot(w, h);
  ctx.strokeStyle = pal.spa ? pal.metal : '#2f342c';
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(L.x, 0); ctx.quadraticCurveTo(L.x + 4, L.y * 0.5, L.x, L.y - L.r * 1.6); ctx.stroke();
  ctx.fillStyle = pal.spa ? pal.metal : '#3a3f37';
  ctx.beginPath(); ctx.roundRect(L.x - L.r * 0.55, L.y - L.r * 1.8, L.r * 1.1, L.r * 1.0, 2); ctx.fill();
  if (view && Array.isArray(masters)) fameWall(ctx, w, h, masters); // on the wall, behind the furniture (R8j)
  // The upgrades the player owns, back to front.
  const spots = layerSpots(w, h, view);
  // The first versions the comics show (R7): the plain chair and the crooked sign stay until the shop's ones replace them.
  if (!shown.includes('chair')) oldChair(ctx, spots.chair, spots.floorY, spots.u);
  if (!shown.includes('sign')) oldSign(ctx, spots.sign, spots.u);
  for (const id of shown) drawLayer(ctx, id, spots);
  if (pal.spa) { // sparkles all over: everything is clean
    const sp = rng(4242);
    for (let i = 0; i < 14; i += 1) {
      sparkle(ctx, sp() * w, sp() * floorY, u * (1 + sp() * 1.8), i % 3 ? '#ffffff' : '#f3d27a', 0.9);
    }
  }
  // The corners: a vignette (dark and dank in tier 0, soft in the better tiers).
  const v = ctx.createRadialGradient(w / 2, h * 0.45, Math.min(w, h) * 0.35, w / 2, h * 0.45, Math.hypot(w, h) * 0.62);
  v.addColorStop(0, 'rgba(0,0,0,0)');
  v.addColorStop(1, pal.vignette);
  ctx.fillStyle = v;
  ctx.fillRect(0, 0, w, h);
}

/**
 * The ceiling lamp's light: a warm pool of light on the wall and the lamp itself. Tier 0: a bare bulb (dimmer and
 * the room darker while it flickers). Tier 1: the bulb under a simple enamel shade. Tier 2: a glowing glass globe
 * with a big soft light.
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
  const R = Math.min(w, h) * (pal.spa ? 0.7 : 0.5);
  const g = ctx.createRadialGradient(L.x, L.y, L.r, L.x, L.y, R);
  g.addColorStop(0, `rgba(${pal.light},${(pal.spa ? 0.5 : 0.42) * level})`);
  g.addColorStop(1, `rgba(${pal.light},0)`);
  ctx.fillStyle = g;
  ctx.fillRect(L.x - R, L.y - R, R * 2, R * 2);
  if (pal.spa) { // the glass globe
    const gr = L.r * 1.25;
    const gy = L.y + L.r * 0.2;
    const gg = ctx.createRadialGradient(L.x - gr * 0.3, gy - gr * 0.3, gr * 0.1, L.x, gy, gr);
    gg.addColorStop(0, '#ffffff');
    gg.addColorStop(1, '#fff3d6');
    ctx.fillStyle = gg;
    ctx.beginPath(); ctx.arc(L.x, gy, gr, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(224,189,98,0.8)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.beginPath(); ctx.ellipse(L.x - gr * 0.4, gy - gr * 0.35, gr * 0.18, gr * 0.28, 0.6, 0, Math.PI * 2); ctx.fill();
    return;
  }
  ctx.fillStyle = level > 0.6 ? pal.bulb : '#9c9878';
  ctx.beginPath(); ctx.ellipse(L.x, L.y, L.r * 0.85, L.r, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = `rgba(255,255,255,${0.7 * level})`;
  ctx.beginPath(); ctx.arc(L.x - L.r * 0.3, L.y - L.r * 0.3, L.r * 0.25, 0, Math.PI * 2); ctx.fill();
  if (pal.repairs) { // a simple enamel shade over the bulb, lit from inside at its rim
    ctx.beginPath();
    ctx.moveTo(L.x - L.r * 0.5, L.y - L.r * 1.8);
    ctx.lineTo(L.x + L.r * 0.5, L.y - L.r * 1.8);
    ctx.lineTo(L.x + L.r * 1.9, L.y - L.r * 0.05);
    ctx.lineTo(L.x - L.r * 1.9, L.y - L.r * 0.05);
    ctx.closePath();
    inked(ctx, pal.shade, 1.4, INK);
    ctx.fillStyle = `rgba(255,240,200,${0.9 * level})`;
    ctx.beginPath(); ctx.ellipse(L.x, L.y - L.r * 0.05, L.r * 1.85, L.r * 0.28, 0, 0, Math.PI * 2); ctx.fill();
  }
}

/**
 * Paint the whole studio, full size, for a tier and the owned upgrades: the still room and the ceiling lamp's light
 * (steady, never flickering). For the studio view screen (T5.1c); the pop scene uses drawBackdrop instead.
 * @param {CanvasRenderingContext2D} ctx where to paint (already scaled so 1 unit = 1 CSS px)
 * @param {number} w width in CSS px
 * @param {number} h height in CSS px
 * @param {number} tier studio tier 0..2 (unknown tiers fall back to 0)
 * @param {string[]} [layers] owned studio layer ids (save.studioLayers)
 * @param {{view?: boolean, masters?: string[], pins?: number}} [o] pins = pins in the jar (game/pin-jar.js); view: true (default) = the studio view's places and sizes for the
 *   layers (no face in front, so the chair is chair-sized and stands on the floor); false = the pop scene's places;
 *   masters = the wall of fame's framed diplomas (bump ids; left out = no wall of fame, R8j)
 * @returns {void}
 */
export function drawStudio(ctx, w, h, tier, layers = [], o = {}) {
  const kind = backdropKind('studio', tier);
  drawRoom(ctx, w, h, kind, layers, o.view !== false, o.masters ?? null);
  drawLight(ctx, w, h, kind, 1);
  if (roomLeaks(kind, layers)) drawDrip(ctx, w, h, 0, true); // a still drop hanging from the joint
  drawPinJar(ctx, w, h, kind, pinsDrawn(o.pins)); // the pin jar on the shelf (game/pin-jar.js)
}

/**
 * Where each studio upgrade sits in its close-up for the scrub job (T5.1b): big and in the middle. The grime recipes
 * in screens/scrub-logic.js are placed to match these, as shares of the picture.
 * @param {string} id studio item id (lamp, plant, chair, sign, leakFix; anything else gets no spot)
 * @param {number} w width
 * @param {number} h height
 * @returns {{u: number, floorY: number, spot: object|null}} size unit, floor line and the item's spot for its drawer
 */
export function closeupSpot(id, w, h) {
  const floorY = h * 0.86;
  if (id === 'lamp') { const r = h * 0.22; return { u: r / 7, floorY, spot: { x: w / 2, y: h * 0.37, r, floor: h * 0.93 } }; }
  if (id === 'chair') {
    const cw = h * 0.57;
    const ground = h * 0.95;
    return { u: cw / 40, floorY, spot: { x: w / 2, wide: cw, top: ground - cw * 1.55, seat: ground - cw * 0.5, floor: ground } };
  }
  if (id === 'plant') { const s = h * 0.2; return { u: s / 8, floorY, spot: { x: w / 2, y: h * 0.3, s } }; }
  if (id === 'sign') { const s = Math.min(w * 0.69, h * 1.1); return { u: s / 29, floorY, spot: { x: w / 2, y: h * 0.1, s } }; }
  if (id === 'leakFix') { const r = Math.min(h * 0.07, w * 0.07); return { u: r / 3, floorY, spot: { x: w / 2, y: h * 0.3, r } }; }
  return { u: h / 40, floorY, spot: null };
}

/**
 * The freshly painted wall up close (the wallPaint upgrade): lavender paint, the stencilled band, the skirting board
 * and a strip of floor.
 * @param {CanvasRenderingContext2D} ctx the context
 * @param {number} w width
 * @param {number} h height
 * @param {number} floorY floor line
 * @returns {void}
 */
function closeupWall(ctx, w, h, floorY) {
  const u = h / 40;
  const g = ctx.createLinearGradient(0, 0, 0, floorY);
  g.addColorStop(0, PAINT.wallTop);
  g.addColorStop(1, PAINT.wallBottom);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, floorY);
  paintBand(ctx, w, h * 0.08, u);
  ctx.fillStyle = '#86694d';
  ctx.fillRect(0, floorY, w, h - floorY);
  box(ctx, -4, floorY - u * 1.6, w + 8, u * 1.8, 0); // skirting board
  inked(ctx, '#ffffff', Math.max(1.2, u * 0.3), INK);
}

/**
 * Paint a studio upgrade up close, clean, for the scrub job (T5.1b): a warm wall with soft light behind it, the floor
 * (none under the leak's ceiling pipe, B97),
 * and the item drawn by the same drawer as in the room (ringLight, wingChair, hangingPlant, shinySign), only bigger.
 * The wallPaint upgrade is the wall itself. The grime goes on top in screens/scrub.js.
 * @param {CanvasRenderingContext2D} ctx where to paint (CSS px)
 * @param {number} w width
 * @param {number} h height
 * @param {string} id studio item id
 * @returns {void}
 */
export function drawCloseup(ctx, w, h, id) {
  const { u, floorY, spot } = closeupSpot(id, w, h);
  if (id === 'wallPaint') { closeupWall(ctx, w, h, floorY); return; }
  const pal = PALETTES[1];
  const ceiling = id === 'leakFix'; // B97: the pipe is a view up at the ceiling, so no floor strip under it
  const wallEnd = ceiling ? h : floorY;
  const g = ctx.createLinearGradient(0, 0, 0, wallEnd);
  g.addColorStop(0, pal.wallTop);
  g.addColorStop(1, pal.wallBottom);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, wallEnd);
  const glow = ctx.createRadialGradient(w / 2, h * 0.45, h * 0.05, w / 2, h * 0.45, w * 0.55);
  glow.addColorStop(0, 'rgba(255,248,228,0.55)');
  glow.addColorStop(1, 'rgba(255,248,228,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, w, wallEnd);
  if (!ceiling) {
    ctx.fillStyle = pal.floor;
    ctx.fillRect(0, floorY, w, h - floorY);
    ctx.fillStyle = 'rgba(0,0,0,0.22)';
    ctx.fillRect(0, floorY, w, Math.max(2, h * 0.01));
  }
  if (id === 'lamp') ringLight(ctx, spot, floorY, u);
  else if (id === 'chair') wingChair(ctx, spot, floorY, u);
  else if (id === 'plant') hangingPlant(ctx, spot, u);
  else if (id === 'sign') shinySign(ctx, spot, u);
  else if (id === 'leakFix') { // the old pipe across the top of the wall, with the shiny new joint in the middle
    const { x, y, r } = spot;
    ctx.fillStyle = PALETTES[1].pipe;
    ctx.fillRect(0, y - r, w, r * 2);
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    ctx.fillRect(0, y - r, w, r * 0.5);
    newJoint(ctx, x, y, r);
  }
}

const cache = new Map(); // "w x h @ dpr : tier : layers" -> offscreen canvas with the still room

/**
 * The still room for a size, tier and set of layers, painted once into an offscreen canvas (only the two newest are
 * kept).
 * @param {number} w width in CSS px
 * @param {number} h height in CSS px
 * @param {number|string} tier 0..2 or 'home'
 * @param {number} dpr pixel ratio
 * @param {string[]} [layers] owned studio layer ids
 * @returns {HTMLCanvasElement} the painted room
 */
function roomCanvas(w, h, tier, dpr, layers = []) {
  const key = `${w}x${h}@${dpr}:${studioKey(tier, tier === 'home' ? [] : layers)}`;
  let c = cache.get(key);
  if (c) return c;
  c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(w * dpr));
  c.height = Math.max(1, Math.round(h * dpr));
  const cx = c.getContext('2d');
  cx.setTransform(dpr, 0, 0, dpr, 0, 0);
  drawRoom(cx, w, h, tier, layers);
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
 * @param {{room?: string, tier?: number, layers?: string[], time?: number, reduced?: boolean, dpr?: number, pins?: number}} [o] pins =
 *   the pins in the jar on the shelf (game/pin-jar.js); room
 *   'studio' (default) or 'home' (SPEC D19), studio tier 0..2 (SPEC D11), the owned studio layers (save.studioLayers,
 *   T5.1a; the home room ignores them), seconds since the scene started (for the flicker or the home lamp's
 *   breathing), reduced motion (steady light), pixel ratio (read from ctx when left out)
 * @returns {void}
 */
export function drawBackdrop(ctx, w, h, o = {}) {
  const tier = backdropKind(o.room, o.tier);
  const dpr = o.dpr ?? (ctx.getTransform?.().a || 1);
  ctx.drawImage(roomCanvas(Math.round(w), Math.round(h), tier, dpr, o.layers ?? []), 0, 0, w, h);
  drawLight(ctx, w, h, tier, lampLevel(o.time ?? 0, tier, Boolean(o.reduced)));
  if (roomLeaks(tier, o.layers)) drawDrip(ctx, w, h, o.time ?? 0, Boolean(o.reduced)); // drip... drip...
  if (tier !== 'home') drawPinJar(ctx, w, h, tier, pinsDrawn(o.pins)); // the pin jar on the shelf (game/pin-jar.js)
}
