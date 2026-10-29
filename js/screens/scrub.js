// The wipe-and-scrub job (T5.1b, SPEC D12-1 and D16: required, +1 reputation once). After a studio upgrade is bought
// the player cleans THAT item in a close-up: the item is drawn clean by pop/backdrop.js drawCloseup (the same drawers
// as in the room), and its own grime goes on a layer on top (lamp: dust and cobwebs; plant: dusty leaves; chair:
// sticky stains and crumbs; wall paint: scuffs and old water marks; sign: a hazy film and fingerprints).
// A sponge follows the finger or the mouse; dragging rubs the grime off, soap suds bubble up, a squeak plays (higher
// as it gets cleaner: squeaky clean), little sparkles pop where a spot comes clean and a bar fills. When it is clean
// enough the last specks go, the item sparkles, a short line shows and Continue reports the job done (onDone).
// Keyboard and switch players press Space or Enter again and again (each press scrubs the area under the sponge, then
// the sponge hops to the next dirty area); the arrow keys move the sponge. With reduced motion the suds and sparkles
// still show but do not move or grow. The rules (grime map, progress, key steps) are in scrub-logic.js.
// Cartoon only: grey dust, brown and olive stains, white suds. Nothing gross.

import { el, button, screenShell, INK } from './dom.js';
import { drawCloseup, backdropPalette, cobweb, stain, sparkle } from '../pop/backdrop.js';
import {
  grimeRecipe, grimeMap, rubMap, scrubProgress, scrubDoneNow, progressStep, keyScrub, moveSponge, firstSpongeCell,
  cellCenter, strokePoints, scrubTextKeys, KEY_REACH, KEY_AMOUNT,
} from './scrub-logic.js';

const W = 480; // drawing size of the close-up (CSS scales it to fit)
const H = 300;
const BRUSH = 30; // the sponge's wet patch, radius in drawing px
const REACH = 1.15; // the rules count a little past the visible patch, so what looks clean is clean
const STEP = 12; // drawing px between rubs along a drag
const SQUEAK_EVERY = 140; // ms between squeaks while rubbing
const MAX_SUDS = 60;
const MAX_SPARKS = 24;

/**
 * A repeatable random number maker (the same grime every time).
 * @param {number} seed start value
 * @returns {() => number} numbers 0..1
 */
function seeded(seed) {
  let s = seed;
  return () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
}

/**
 * Dust: a soft grey film with fluffy dust bunnies and specks (lamp and plant). Fluff (film false, the plant's thin
 * vines) is a faint film with more and bigger dust bunnies strung along it.
 * @param {CanvasRenderingContext2D} ctx the grime layer
 * @param {{x: number, y: number, rx: number, ry: number, rot: number}} s the spot in drawing px
 * @param {() => number} rand random numbers
 * @param {boolean} [film] true = a thick film, false = fluff
 * @returns {void}
 */
function dust(ctx, s, rand, film = true) {
  const a0 = film ? 0.92 : 0.4;
  ctx.save();
  ctx.translate(s.x, s.y);
  ctx.rotate(s.rot);
  ctx.scale(1, s.ry / s.rx);
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, s.rx);
  g.addColorStop(0, `rgba(168,156,134,${a0})`);
  g.addColorStop(0.7, `rgba(168,156,134,${a0 * 0.9})`);
  g.addColorStop(1, 'rgba(168,156,134,0)');
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(0, 0, s.rx, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
  for (let i = 0; i < (film ? 3 : 6); i += 1) { // dust bunnies: little grey clouds
    const a = rand() * Math.PI * 2;
    const bx = film ? s.x + Math.cos(a) * s.rx * 0.55 : s.x + (rand() - 0.5) * s.rx;
    const by = film ? s.y + Math.sin(a) * s.ry * 0.55 : s.y + ((i + 0.5) / 6 - 0.5) * s.ry * 1.5;
    const r = film ? Math.min(s.rx, s.ry) * (0.12 + rand() * 0.08) : s.rx * (0.22 + rand() * 0.12);
    for (const [dx, dy, k] of [[-0.8, 0.2, 0.8], [0, -0.2, 1], [0.8, 0.2, 0.75]]) {
      ctx.fillStyle = 'rgba(172,164,148,0.95)';
      ctx.beginPath(); ctx.arc(bx + dx * r, by + dy * r, r * k, 0, Math.PI * 2); ctx.fill();
    }
    ctx.fillStyle = 'rgba(214,208,194,0.95)';
    ctx.beginPath(); ctx.arc(bx - r * 0.2, by - r * 0.45, r * 0.4, 0, Math.PI * 2); ctx.fill();
  }
  ctx.fillStyle = 'rgba(110,100,86,0.75)';
  for (let i = 0; i < 16; i += 1) {
    const a = rand() * Math.PI * 2;
    const d = Math.sqrt(rand()) * 0.85;
    ctx.beginPath(); ctx.arc(s.x + Math.cos(a) * s.rx * d, s.y + Math.sin(a) * s.ry * d, 1.2 + rand() * 1.8, 0, Math.PI * 2); ctx.fill();
  }
}

/**
 * A dusty cobweb in a corner (the room's cobweb drawer, thicker and with a shadow so it shows up close).
 * @param {CanvasRenderingContext2D} ctx the grime layer
 * @param {{x: number, y: number, rx: number, ry: number, rot: number}} s the spot (rot 1 = it grows to the left)
 * @returns {void}
 */
function web(ctx, s) {
  const dir = Math.round(s.rot) === 1 ? -1 : 1;
  const size = Math.min(s.rx, s.ry) * 2;
  const x = s.x - dir * s.rx;
  const y = s.y - s.ry;
  cobweb(ctx, x + 1.5, y + 1.5, size, dir, 'rgba(70,60,50,0.35)', 3.5);
  cobweb(ctx, x, y, size, dir, 'rgba(250,250,244,0.92)', 2);
}

/**
 * A sticky brown juice or coffee stain with a darker rim and a glossy shine.
 * @param {CanvasRenderingContext2D} ctx the grime layer
 * @param {{x: number, y: number, rx: number, ry: number, rot: number}} s the spot
 * @param {() => number} rand random numbers
 * @returns {void}
 */
function sticky(ctx, s, rand) {
  ctx.save();
  ctx.translate(s.x, s.y);
  ctx.rotate(s.rot);
  /** Path of a wobbly blob of this size. @param {number} k size share @returns {void} */
  const blob = (k) => {
    ctx.beginPath();
    const n = 10;
    for (let i = 0; i <= n; i += 1) {
      const a = (i / n) * Math.PI * 2;
      const w = i === n ? 1 : 0.82 + rand() * 0.2;
      const px = Math.cos(a) * s.rx * k * w;
      const py = Math.sin(a) * s.ry * k * w;
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.closePath();
  };
  blob(0.85); // a flat, see-through puddle (not a lump)
  ctx.fillStyle = 'rgba(178,118,52,0.55)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(128,80,34,0.6)';
  ctx.lineWidth = 2;
  ctx.lineJoin = 'round';
  ctx.stroke();
  blob(0.5);
  ctx.fillStyle = 'rgba(150,96,42,0.4)';
  ctx.fill();
  for (let i = 0; i < 3; i += 1) { // little splash drops round it
    const a = rand() * Math.PI * 2;
    ctx.fillStyle = 'rgba(160,104,46,0.6)';
    ctx.beginPath(); ctx.arc(Math.cos(a) * s.rx * 1.05, Math.sin(a) * s.ry * 1.05, 2 + rand() * 2.5, 0, Math.PI * 2); ctx.fill();
  }
  ctx.strokeStyle = 'rgba(255,255,255,0.75)'; // a glossy sticky shine
  ctx.lineWidth = 2.5;
  ctx.lineCap = 'round';
  ctx.beginPath(); ctx.arc(0, 0, Math.min(s.rx, s.ry) * 0.55, Math.PI * 1.1, Math.PI * 1.45); ctx.stroke();
  ctx.restore();
}

/**
 * Crumbs stuck in a sticky film (the chair's seat).
 * @param {CanvasRenderingContext2D} ctx the grime layer
 * @param {{x: number, y: number, rx: number, ry: number}} s the spot
 * @param {() => number} rand random numbers
 * @returns {void}
 */
function crumbs(ctx, s, rand) {
  ctx.fillStyle = 'rgba(150,98,46,0.35)';
  ctx.beginPath(); ctx.ellipse(s.x, s.y, s.rx, s.ry, 0, 0, Math.PI * 2); ctx.fill();
  for (let i = 0; i < 18; i += 1) {
    const a = rand() * Math.PI * 2;
    const d = Math.sqrt(rand()) * 0.85;
    const cx = s.x + Math.cos(a) * s.rx * d;
    const cy = s.y + Math.sin(a) * s.ry * d;
    const r = 2 + rand() * 3;
    ctx.beginPath();
    for (let k = 0; k < 5; k += 1) {
      const b = (k / 5) * Math.PI * 2 + rand();
      ctx.lineTo(cx + Math.cos(b) * r, cy + Math.sin(b) * r * 0.8);
    }
    ctx.closePath();
    ctx.fillStyle = i % 3 ? '#d9a75e' : '#b9813d';
    ctx.fill();
    ctx.strokeStyle = 'rgba(90,56,26,0.8)';
    ctx.lineWidth = 1;
    ctx.stroke();
  }
}

/**
 * Grey-brown shoe scuffs: a few rubbery streaks over a faint smear.
 * @param {CanvasRenderingContext2D} ctx the grime layer
 * @param {{x: number, y: number, rx: number, ry: number, rot: number}} s the spot
 * @param {() => number} rand random numbers
 * @returns {void}
 */
function scuff(ctx, s, rand) {
  ctx.save();
  ctx.translate(s.x, s.y);
  ctx.rotate(s.rot);
  ctx.lineCap = 'round';
  for (let i = 0; i < 3; i += 1) {
    const y = (i - 1) * s.ry * 0.5 + (rand() - 0.5) * 4;
    const x0 = -s.rx * (0.4 + rand() * 0.45);
    const x1 = s.rx * (0.3 + rand() * 0.5);
    ctx.strokeStyle = i === 1 ? 'rgba(62,56,54,0.75)' : 'rgba(88,80,76,0.6)';
    ctx.lineWidth = 3 + rand() * 4;
    ctx.beginPath(); ctx.moveTo(x0, y); ctx.quadraticCurveTo((x0 + x1) / 2, y - s.ry * 0.3, x1, y + (rand() - 0.5) * 6); ctx.stroke();
  }
  ctx.restore();
}

/**
 * An old olive water mark showing through: a soft blotch (the room's stain drawer) with a wobbly tide line and a
 * drip running down from it.
 * @param {CanvasRenderingContext2D} ctx the grime layer
 * @param {{x: number, y: number, rx: number, ry: number}} s the spot
 * @param {() => number} rand random numbers
 * @returns {void}
 */
function water(ctx, s, rand) {
  ctx.save();
  ctx.translate(s.x, s.y);
  ctx.scale(1, s.ry / s.rx);
  stain(ctx, 0, 0, s.rx * 0.95, '140,122,64', 2);
  ctx.beginPath();
  const n = 24;
  for (let i = 0; i <= n; i += 1) {
    const a = (i / n) * Math.PI * 2;
    const r = s.rx * (i === n ? 0.78 : 0.72 + rand() * 0.1);
    if (i === 0) ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r); else ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  ctx.closePath();
  ctx.fillStyle = 'rgba(150,132,70,0.16)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(126,108,52,0.45)';
  ctx.lineWidth = 2;
  ctx.lineJoin = 'round';
  ctx.stroke();
  ctx.restore();
  const g = ctx.createLinearGradient(0, s.y, 0, s.y + s.ry * 1.4); // a drip trail below
  g.addColorStop(0, 'rgba(140,122,64,0.35)');
  g.addColorStop(1, 'rgba(140,122,64,0)');
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.ellipse(s.x + s.rx * 0.2, s.y + s.ry * 0.85, s.rx * 0.12, s.ry * 0.6, 0, 0, Math.PI * 2); ctx.fill();
}

/**
 * A hazy film over the sign's glass, with streaks from a dirty cloth.
 * @param {CanvasRenderingContext2D} ctx the grime layer
 * @param {{x: number, y: number, rx: number, ry: number}} s the spot
 * @returns {void}
 */
function haze(ctx, s) {
  ctx.save();
  ctx.translate(s.x, s.y);
  ctx.scale(1, s.ry / s.rx);
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, s.rx);
  g.addColorStop(0, 'rgba(176,166,146,0.78)');
  g.addColorStop(0.8, 'rgba(176,166,146,0.7)');
  g.addColorStop(1, 'rgba(176,166,146,0)');
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(0, 0, s.rx, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = 'rgba(140,130,112,0.55)';
  ctx.lineWidth = 6;
  ctx.lineCap = 'round';
  for (const k of [-0.45, 0, 0.45]) {
    ctx.beginPath(); ctx.arc(k * s.rx, s.rx * 0.9, s.rx * 0.8, Math.PI * 1.32, Math.PI * 1.68); ctx.stroke();
  }
  ctx.restore();
}

/**
 * A smudgy fingerprint: a grey oval with swirly ridge lines.
 * @param {CanvasRenderingContext2D} ctx the grime layer
 * @param {{x: number, y: number, rx: number, ry: number, rot: number}} s the spot
 * @returns {void}
 */
function smudge(ctx, s) {
  ctx.save();
  ctx.translate(s.x, s.y);
  ctx.rotate(s.rot);
  ctx.fillStyle = 'rgba(120,108,92,0.32)';
  ctx.beginPath(); ctx.ellipse(0, 0, s.rx, s.ry, 0, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = 'rgba(92,82,70,0.5)';
  ctx.lineWidth = 2;
  for (let k = 0.25; k < 1; k += 0.18) {
    ctx.beginPath(); ctx.ellipse(0, s.ry * 0.08 * k, s.rx * k, s.ry * k, 0, Math.PI * 1.05, Math.PI * 2.75); ctx.stroke();
  }
  ctx.restore();
}

/**
 * Paint an item's grime layer from its recipe (scrub-logic.js), in drawing px.
 * @param {CanvasRenderingContext2D} ctx the grime layer (scaled so 1 unit = 1 drawing px)
 * @param {{spots: object[]}} recipe the grime recipe
 * @returns {void}
 */
function paintGrime(ctx, recipe) {
  const rand = seeded(7);
  // Films first (haze, dust), then the marks on top of them.
  const order = ['haze', 'water', 'dust', 'fluff', 'scuff', 'sticky', 'crumbs', 'smudge', 'web'];
  const spots = [...recipe.spots].sort((a, b) => order.indexOf(a.kind) - order.indexOf(b.kind));
  for (const sp of spots) {
    const s = { x: sp.x * W, y: sp.y * H, rx: sp.rx * W, ry: sp.ry * H, rot: sp.rot ?? 0 };
    if (sp.kind === 'dust') dust(ctx, s, rand);
    else if (sp.kind === 'fluff') dust(ctx, s, rand, false);
    else if (sp.kind === 'web') web(ctx, s);
    else if (sp.kind === 'sticky') sticky(ctx, s, rand);
    else if (sp.kind === 'crumbs') crumbs(ctx, s, rand);
    else if (sp.kind === 'scuff') scuff(ctx, s, rand);
    else if (sp.kind === 'water') water(ctx, s, rand);
    else if (sp.kind === 'haze') haze(ctx, s);
    else if (sp.kind === 'smudge') smudge(ctx, s);
  }
}

/**
 * The sponge: a yellow sponge with holes and a green scrubby top, tilted a little.
 * @param {CanvasRenderingContext2D} ctx the effects layer
 * @param {number} x middle x (drawing px)
 * @param {number} y middle y
 * @returns {void}
 */
function drawSponge(ctx, x, y) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(-0.22);
  ctx.fillStyle = 'rgba(40,30,20,0.2)';
  ctx.beginPath(); ctx.roundRect(-30, -16, 64, 40, 9); ctx.fill();
  ctx.beginPath(); ctx.roundRect(-34, -22, 64, 40, 9);
  ctx.fillStyle = '#ffd84a';
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.beginPath(); ctx.roundRect(-34, -22, 64, 13, [9, 9, 0, 0]);
  ctx.fillStyle = '#3fae8c';
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#e8b92e';
  for (const [hx, hy, r] of [[-22, 2, 3.5], [-8, 9, 2.5], [6, 0, 3], [18, 8, 2.5], [-14, 12, 2]]) {
    ctx.beginPath(); ctx.arc(hx, hy, r, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
}

/**
 * One soap bubble (a white bubble with a blue rim and a shine).
 * @param {CanvasRenderingContext2D} ctx the effects layer
 * @param {number} x middle x
 * @param {number} y middle y
 * @param {number} r radius
 * @param {number} a see-through 0..1
 * @returns {void}
 */
function bubble(ctx, x, y, r, a) {
  ctx.globalAlpha = a;
  ctx.fillStyle = 'rgba(255,255,255,0.8)';
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = 'rgba(110,170,205,0.85)';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.fillStyle = '#ffffff';
  ctx.beginPath(); ctx.arc(x - r * 0.35, y - r * 0.35, r * 0.28, 0, Math.PI * 2); ctx.fill();
  ctx.globalAlpha = 1;
}

const SIDE_ITEMS = ['lamp', 'chair', 'plant']; // the close-ups with a narrow item in the middle (they get side panels; the sign fills the width)
const SIDE_W = 0.15; // each side panel's width, as a share of the picture (the grime and the items stay inside the middle)

/**
 * Wrap a drawing context so the close-up's warm tier-1 wall and floor colours come out in another tier's colours
 * (drawCloseup in pop/backdrop.js always paints tier 1; this maps those exact colours while it paints). A tier-1 job
 * is not wrapped. When backdrop.js can take a tier itself, this can go.
 * @param {CanvasRenderingContext2D} ctx the real context
 * @param {number} tier studio tier 0..2
 * @returns {CanvasRenderingContext2D} the context to hand to drawCloseup
 */
function tierColours(ctx, tier) {
  const from = backdropPalette(1);
  const to = backdropPalette(tier);
  if (to === from) return ctx;
  const swap = new Map([[from.wallTop, to.wallTop], [from.wallBottom, to.wallBottom], [from.floor, to.floor]]);
  /** Give a colour its tier version when it is one of the tier-1 wall or floor colours. @param {unknown} c a fill colour @returns {unknown} the colour to use */
  const mapped = (c) => (typeof c === 'string' && swap.has(c) ? swap.get(c) : c);
  /** Make a gradient map its colour stops (it stays a real gradient, so the canvas still accepts it). @param {CanvasGradient} g the gradient @returns {CanvasGradient} the same gradient */
  const gradient = (g) => {
    const add = g.addColorStop.bind(g);
    g.addColorStop = (at, c) => add(at, mapped(c));
    return g;
  };
  return new Proxy(ctx, {
    get: (o, k) => {
      if (k === 'createLinearGradient') return (...a) => gradient(o.createLinearGradient(...a));
      const v = o[k];
      return typeof v === 'function' ? v.bind(o) : v;
    },
    set: (o, k, v) => { o[k] = k === 'fillStyle' ? mapped(v) : v; return true; },
  });
}

/**
 * Fill the empty wall on both sides of a close-up a little: a short tiled wall panel (wainscot) with a rail on top and a
 * skirting board at the bottom, in the studio tier's tile colours, and a soft shade above it so the middle stands out.
 * Only for the narrow items; the grime never reaches the side panels.
 * @param {CanvasRenderingContext2D} ctx the base layer
 * @param {string} itemId the studio item
 * @param {number} tier studio tier 0..2
 * @returns {void}
 */
function drawSides(ctx, itemId, tier) {
  if (!SIDE_ITEMS.includes(itemId)) return;
  const pal = backdropPalette(tier);
  const floorY = H * 0.86;
  const top = H * 0.44; // the panel's top rail
  const pw = W * SIDE_W;
  const rows = 6;
  const tile = (floorY - top) / rows;
  for (const left of [true, false]) {
    const x0 = left ? 0 : W - pw;
    const shade = ctx.createLinearGradient(left ? 0 : W, 0, left ? pw * 1.6 : W - pw * 1.6, 0);
    shade.addColorStop(0, 'rgba(70,46,22,0.22)');
    shade.addColorStop(1, 'rgba(70,46,22,0)');
    ctx.fillStyle = shade;
    ctx.fillRect(left ? 0 : W - pw * 1.6, 0, pw * 1.6, top);
    ctx.fillStyle = pal.tile;
    ctx.fillRect(x0, top, pw, floorY - top);
    ctx.strokeStyle = pal.grout;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    for (let r = 1; r < rows; r += 1) { ctx.moveTo(x0, top + r * tile); ctx.lineTo(x0 + pw, top + r * tile); }
    for (let r = 0; r < rows; r += 1) {
      const shift = r % 2 ? tile * 0.5 : 0; // bricklaid rows
      for (let c = 0; c * tile + shift < pw + tile; c += 1) {
        const lx = (left ? x0 : x0 + pw) + (left ? 1 : -1) * (shift + c * tile);
        if (lx > x0 && lx < x0 + pw) { ctx.moveTo(lx, top + r * tile); ctx.lineTo(lx, top + (r + 1) * tile); }
      }
    }
    ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.28)'; // a soft shine down the tiles
    ctx.fillRect(left ? x0 + pw * 0.12 : x0 + pw * 0.6, top, pw * 0.14, floorY - top);
    ctx.fillStyle = pal.tile; // the rail on top and the skirting board at the bottom
    ctx.strokeStyle = INK;
    ctx.lineWidth = 2;
    ctx.fillRect(x0, top - 6, pw, 7);
    ctx.strokeRect(x0, top - 6, pw, 7);
    ctx.fillRect(x0, floorY - 8, pw, 9);
    ctx.strokeRect(x0, floorY - 8, pw, 9);
    ctx.beginPath(); // the panel's inner edge
    ctx.moveTo(left ? pw : W - pw, top - 6);
    ctx.lineTo(left ? pw : W - pw, floorY + 1);
    ctx.stroke();
  }
}

/**
 * Make a canvas for the close-up, sharp on high-density screens.
 * @param {string} cls class name
 * @param {number} dpr pixel ratio
 * @returns {{canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D}} the canvas and its context in drawing px
 */
function layer(cls, dpr) {
  const canvas = el('canvas', cls);
  canvas.width = Math.round(W * dpr);
  canvas.height = Math.round(H * dpr);
  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return { canvas, ctx };
}

/**
 * Build the scrub job screen.
 * @param {{t: (key: string, vars?: object) => string, itemId?: string, itemNameKey: string, onDone?: () => void,
 *   reducedMotion?: boolean, sound?: {play: (name: string, o?: object) => void}, tier?: number}} opts
 *   t = string function; itemId = the bought studio item (lamp, plant, chair, wallPaint, sign); itemNameKey = its
 *   name key; onDone = it is clean and Continue was tapped; sound = the game's sound player (optional); tier = the
 *   studio's tier 0..2 (the wall and tiles take its colours; 1 = the warm wall when left out)
 * @returns {{node: HTMLElement, dispose: () => void}} the screen
 */
export function createScrubScreen({ t, itemId = '', itemNameKey, onDone, reducedMotion = false, sound, tier = 1 }) {
  const item = t(itemNameKey);
  const keys = scrubTextKeys(itemId);
  const recipe = grimeRecipe(itemId);
  const shell = screenShell('scrub', { label: t('ui.scrub.title'), reducedMotion });
  const body = el('div', 'app-body app-scrub');
  const card = el('div', 'app-card app-scrub__card');
  card.append(el('h1', 'app-scrub__title', t('ui.scrub.title')), el('p', 'app-scrub__text', t(keys.text, { item })));

  const dpr = Math.min(2, Math.max(1, globalThis.devicePixelRatio || 1));
  const frame = el('div', 'app-scrub__frame');
  const base = layer('app-scrub__base', dpr);
  const grime = layer('app-scrub__grime', dpr);
  const fx = layer('app-scrub__fx', dpr);
  base.canvas.setAttribute('aria-hidden', 'true');
  grime.canvas.setAttribute('aria-hidden', 'true');
  const pad = fx.canvas; // the top layer takes the finger, the mouse and the keys
  pad.tabIndex = 0;
  pad.setAttribute('role', 'button');
  pad.setAttribute('aria-label', t('ui.scrub.area', { item }));
  frame.append(base.canvas, grime.canvas, pad);
  drawCloseup(tierColours(base.ctx, tier), W, H, itemId);
  drawSides(base.ctx, itemId, tier);
  paintGrime(grime.ctx, recipe);

  const bar = el('div', 'app-scrub__bar');
  bar.setAttribute('role', 'progressbar');
  bar.setAttribute('aria-valuemin', '0');
  bar.setAttribute('aria-valuemax', '100');
  bar.setAttribute('aria-label', t('ui.scrub.barLabel'));
  const fill = el('div', 'app-scrub__fill');
  const meter = el('span', 'app-scrub__meter');
  bar.append(fill, meter);
  const how = el('p', 'app-scrub__how', t('ui.scrub.how'));
  how.id = 'app-scrub-how';
  const keysLine = el('p', 'app-scrub__keys', t('ui.scrub.keys'));
  keysLine.id = 'app-scrub-keys';
  pad.setAttribute('aria-describedby', 'app-scrub-how app-scrub-keys');
  const doneBox = el('div', 'app-scrub__donebox');
  doneBox.setAttribute('role', 'status');
  doneBox.hidden = true;
  const go = button('app-btn app-btn--main app-btn--big', t('ui.scrub.continue'), () => onDone?.(), shell.signal);
  go.hidden = true;
  body.append(card, frame, bar, how, keysLine, doneBox, go);
  shell.node.append(body);

  let map = grimeMap(recipe);
  let finished = false;
  let at = firstSpongeCell(map); // the keyboard sponge's cell
  let sponge = null; // where the sponge is drawn (drawing px), or null when hidden
  let last = null; // the last rub point while dragging (drawing px)
  let lastSqueak = -Infinity;
  let lastStep = -1;
  let frameId = 0;
  let doneAt = 0;
  const suds = []; // soap bubbles {x, y, r, vx, vy, born, life}
  const sparks = []; // sparkles {x, y, z, born, life, gold}
  const party = []; // the sparkles all over the item when it is clean {x, y, z, phase}
  const rand = seeded(29);

  /** Show the clean share on the bar, and finish when it is clean enough. @returns {void} */
  function update() {
    const p = scrubProgress(map);
    fill.style.width = `${Math.round(p * 100)}%`;
    const step = progressStep(p);
    if (step !== lastStep) { // the text and the screen-reader value change in tens only
      lastStep = step;
      meter.textContent = t('ui.scrub.progress', { n: step });
      bar.setAttribute('aria-valuenow', String(step));
    }
    if (finished || !scrubDoneNow(map)) return;
    finish();
  }

  /** Clean enough: the last specks go, the item sparkles, the lines and Continue show. @returns {void} */
  function finish() {
    finished = true;
    sponge = null;
    last = null;
    grime.ctx.clearRect(0, 0, W, H);
    fill.style.width = '100%';
    meter.textContent = t('ui.scrub.progress', { n: 100 });
    bar.setAttribute('aria-valuenow', '100');
    for (const s of recipe.spots) party.push({ x: s.x * W, y: s.y * H, z: 9 + rand() * 7, phase: rand() * Math.PI * 2 });
    for (let i = 0; i < 6; i += 1) party.push({ x: W * (0.2 + rand() * 0.6), y: H * (0.1 + rand() * 0.75), z: 6 + rand() * 6, phase: rand() * Math.PI * 2 });
    doneAt = performance.now();
    doneBox.replaceChildren(el('p', 'app-scrub__clean', t(keys.clean, { item })), el('p', 'app-scrub__done', t('ui.scrub.done')));
    doneBox.hidden = false;
    go.hidden = false;
    how.hidden = true;
    keysLine.hidden = true;
    sound?.play('cheer');
    go.focus({ preventScroll: true });
    redraw();
  }

  /**
   * Soap bubbles where the sponge rubs.
   * @param {number} x drawing px
   * @param {number} y drawing px
   * @param {number} n how many
   * @returns {void}
   */
  function addSuds(x, y, n) {
    const now = performance.now();
    for (let i = 0; i < n; i += 1) {
      if (suds.length >= MAX_SUDS) suds.shift();
      suds.push({
        x: x + (rand() - 0.5) * BRUSH * 1.6, y: y + (rand() - 0.5) * BRUSH * 1.2, r: 3 + rand() * 6,
        vx: (rand() - 0.5) * 0.02, vy: -0.015 - rand() * 0.02, born: now, life: reducedMotion ? 650 : 700 + rand() * 500,
      });
    }
  }

  /**
   * Cells that just came clean: wipe what is left of their grime and pop a little sparkle in the middle.
   * @param {number[]} cells cell indexes
   * @returns {void}
   */
  function sparkleCells(cells) {
    const g = grime.ctx;
    const now = performance.now();
    for (const i of cells) {
      const c = cellCenter(map, i);
      const cx = c.x * W;
      const cy = c.y * H;
      g.save();
      g.globalCompositeOperation = 'destination-out';
      const rg = g.createRadialGradient(cx, cy, 0, cx, cy, (W / map.cols) * 0.85);
      rg.addColorStop(0, 'rgba(0,0,0,1)');
      rg.addColorStop(0.7, 'rgba(0,0,0,1)');
      rg.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = rg;
      g.fillRect(cx - W / map.cols, cy - H / map.rows * 1.2, (W / map.cols) * 2, (H / map.rows) * 2.4);
      g.restore();
      if (sparks.length >= MAX_SPARKS) sparks.shift();
      sparks.push({ x: cx + (rand() - 0.5) * 10, y: cy + (rand() - 0.5) * 10, z: 7 + rand() * 6, born: now, life: reducedMotion ? 450 : 600, gold: rand() < 0.5 });
    }
  }

  /**
   * Fade the visible grime in a soft patch around a point (the picture only; the rules are counted apart).
   * @param {number} x drawing px
   * @param {number} y drawing px
   * @param {number} rx reach across, drawing px
   * @param {number} ry reach down, drawing px
   * @param {number} amount grime taken off (0..1)
   * @returns {void}
   */
  function eraseAt(x, y, rx, ry, amount) {
    const g = grime.ctx;
    g.save();
    g.globalCompositeOperation = 'destination-out';
    g.globalAlpha = Math.min(1, amount * 1.1);
    g.translate(x, y);
    g.scale(1, ry / rx);
    const rg = g.createRadialGradient(0, 0, 0, 0, 0, rx);
    rg.addColorStop(0, 'rgba(0,0,0,1)');
    rg.addColorStop(0.65, 'rgba(0,0,0,0.9)');
    rg.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = rg;
    g.beginPath(); g.arc(0, 0, rx, 0, Math.PI * 2); g.fill();
    g.restore();
  }

  /**
   * One sponge rub of the finger or the mouse: fade the grime and take it off the cells under the sponge.
   * @param {number} x drawing px
   * @param {number} y drawing px
   * @returns {void}
   */
  function rubAt(x, y) {
    eraseAt(x, y, BRUSH, BRUSH, recipe.hardness);
    const out = rubMap(map, x / W, y / H, (BRUSH * REACH) / W, (BRUSH * REACH) / H, recipe.hardness);
    map = out.map;
    sparkleCells(out.cleaned);
  }

  /** A squeak now and then while rubbing; it gets higher as the item gets cleaner. @returns {void} */
  function squeak() {
    const now = performance.now();
    if (now - lastSqueak < SQUEAK_EVERY) return;
    lastSqueak = now;
    sound?.play('squeeze', { level: 0.3 + 0.6 * scrubProgress(map) });
  }

  /** Where a pointer is on the close-up, in drawing px. @param {PointerEvent} e the pointer @returns {{x: number, y: number}} the point */
  function toPad(e) {
    const r = pad.getBoundingClientRect();
    return { x: ((e.clientX - r.left) / Math.max(1, r.width)) * W, y: ((e.clientY - r.top) / Math.max(1, r.height)) * H };
  }

  /** Paint the effects layer once: suds, sparkles, the clean item's sparkles and the sponge. @param {number} now ms @returns {boolean} true while something still moves or fades */
  function paintFx(now) {
    const c = fx.ctx;
    c.clearRect(0, 0, W, H);
    let alive = false;
    for (let i = suds.length - 1; i >= 0; i -= 1) {
      const b = suds[i];
      const age = (now - b.born) / b.life;
      if (age >= 1) { suds.splice(i, 1); continue; }
      alive = true;
      const ms = now - b.born;
      if (reducedMotion) bubble(c, b.x, b.y, b.r, 0.9);
      else bubble(c, b.x + b.vx * ms, b.y + b.vy * ms, b.r * (1 + age * 0.5), age > 0.6 ? (1 - age) / 0.4 : 0.95);
    }
    for (let i = sparks.length - 1; i >= 0; i -= 1) {
      const s = sparks[i];
      const age = (now - s.born) / s.life;
      if (age >= 1) { sparks.splice(i, 1); continue; }
      alive = true;
      const z = reducedMotion ? s.z : s.z * Math.sin(Math.PI * age);
      sparkle(c, s.x, s.y - (reducedMotion ? 0 : age * 8), z, s.gold ? '#ffd25a' : '#ffffff', 0.95);
    }
    const twinkling = !reducedMotion && finished && now - doneAt < 1800;
    for (const p of party) {
      const k = twinkling ? 0.6 + 0.4 * Math.sin((now - doneAt) / 120 + p.phase) : 1;
      sparkle(c, p.x, p.y, p.z * k, p.z > 12 ? '#ffd25a' : '#ffffff', 0.95);
    }
    if (twinkling) alive = true;
    if (sponge && !finished) drawSponge(c, sponge.x, sponge.y);
    return alive;
  }

  /** Repaint the effects next frame, and keep going while something moves. @returns {void} */
  function redraw() {
    if (frameId) return;
    frameId = requestAnimationFrame(function tick(now) {
      frameId = 0;
      if (shell.signal.aborted) return;
      if (paintFx(now)) frameId = requestAnimationFrame(tick);
    });
  }

  /** Put the drawn sponge on the keyboard sponge's cell. @returns {void} */
  function spongeToKeyCell() {
    const c = cellCenter(map, at);
    sponge = { x: c.x * W, y: c.y * H };
  }

  const opts = { signal: shell.signal };
  let down = false;
  pad.addEventListener('pointerdown', (e) => {
    if (finished) return;
    e.preventDefault();
    pad.setPointerCapture?.(e.pointerId);
    down = true;
    last = toPad(e);
    sponge = last;
    rubAt(last.x, last.y);
    addSuds(last.x, last.y, 3);
    squeak();
    update();
    redraw();
  }, opts);
  pad.addEventListener('pointermove', (e) => {
    if (finished) return;
    const p = toPad(e);
    sponge = p;
    if (down && last) {
      const stroke = strokePoints(last, p, STEP);
      for (const q of stroke.points) rubAt(q.x, q.y);
      if (stroke.points.length) { addSuds(p.x, p.y, Math.min(3, stroke.points.length)); squeak(); }
      last = stroke.last;
      update();
    }
    redraw();
  }, opts);
  for (const type of ['pointerup', 'pointercancel']) pad.addEventListener(type, () => { down = false; last = null; }, opts);
  pad.addEventListener('pointerleave', (e) => {
    down = false;
    last = null;
    if (e.pointerType === 'mouse') { sponge = null; redraw(); }
  }, opts);
  pad.addEventListener('touchmove', (e) => e.preventDefault(), { signal: shell.signal, passive: false }); // no page scroll while scrubbing
  pad.addEventListener('focus', () => { if (!finished && !down) { spongeToKeyCell(); redraw(); } }, opts);
  pad.addEventListener('keydown', (e) => {
    if (finished) return;
    if (e.key.startsWith('Arrow')) {
      e.preventDefault();
      at = moveSponge(map, at, e.key);
      spongeToKeyCell();
      redraw();
      return;
    }
    if (e.key !== ' ' && e.key !== 'Enter') return;
    e.preventDefault();
    const out = keyScrub(map, at);
    if (out.scrubbed === null) return;
    const c = cellCenter(map, out.scrubbed);
    const rx = (KEY_REACH / map.cols) * W;
    const ry = (KEY_REACH / map.rows) * H;
    eraseAt(c.x * W, c.y * H, rx * 1.1, ry * 1.1, KEY_AMOUNT);
    map = out.map;
    sparkleCells(out.cleaned);
    at = out.at;
    addSuds(c.x * W, c.y * H, 6);
    squeak();
    update();
    if (!finished) spongeToKeyCell();
    redraw();
  }, opts);
  update();
  requestAnimationFrame(() => { if (!shell.signal.aborted && !finished) pad.focus({ preventScroll: true }); });
  return { node: shell.node, dispose: shell.dispose };
}
