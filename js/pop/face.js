// The parts-based cartoon face for the pop scene (T2.1): head and shoulders on a bathroom-mirror background, drawn in
// code (no pictures, no real people). A face spec names one part of each kind from data/customers.js FACE_PARTS
// (shape, skinTone, hair, hairColor, eyes, brows, mouth, accessories); the mood (grim, ow, relief, glowing) changes
// the eyes, brows and mouth. Everything that lies on the face sits where faceGeometry (logic.js) says, so the bumps
// from layoutFace always land on bare skin, never on an eye, brow, mouth, lens, moustache or clown nose.
// Story characters (T2.4, pop/characters.js): `character: 'husband'` draws the husband as the comics show him (curl
// of black hair, full black beard with a bare chin spot, ball nose, blue hoodie), and `armor` puts him in his knight's
// helmet (visor up, plumes, shoulder plates, optional knitted hat and laser cracks).
// Look upgrade (T8.1, SPEC D24a): soft painted light from the upper left (forehead, cheekbones, nose bridge and chin
// catch the light, the edges, eye sockets, under the nose, lip and jaw are softly shaded in a warm skin shadow, never
// grey), ears with inner shading, hair with strands, a shine band and a light rim, eyes with a ringed iris, lid
// shadow, crease and lashes, tapered brows, a nose with wings and a lit tip, and lips with colour and a highlight.
// The geometry (logic.js faceGeometry) is unchanged, so bumps sit exactly where they did.
// Speed (T8.1): the still parts are painted once per face and size into two cached layers (under: body, ears, skin,
// nose; over: hair, beard, headwear, helmet), and each new picture after a pop only adds the parts that change
// (redness, blush, brows, eyes, mouth, glasses). Idle life (makeFaceLife): the picture carries a small plan for
// blinks and glances, which the pop scene (engine.js) draws on top of the picture, only the eyes, only when they move.
import { makeCanvas, paintSkin } from './art.js';
import { rng, HATS, wornAccessories } from './logic.js';
import { FACE_PARTS, makeCustomer } from '../data/customers.js';
import {
  CHARACTER_FACES, PLUME_COLOURS, HELMET, BEARD_FUZZ, BEARD_DROP, CHIN_PATCH, resolveFaceSpec, armorOptions, beardTop,
  guardEdge,
} from './characters.js';

/** Skin tones (FACE_PARTS.skinTone ids, plus two older names) -> the middle colour; lighter and shaded tones are mixed from it. */
export const SKIN_TONES = {
  fair: '#f6d6c2',
  light: '#ebb795',
  tan: '#d29a6c',
  olive: '#c09468',
  brown: '#946040',
  deep: '#62402e',
  porcelain: '#f4d3bd',
  warm: '#dba27a',
};
/** Hair colours (FACE_PARTS.hairColor ids) -> colour. */
export const HAIR_COLOURS = {
  black: '#2a211d',
  brown: '#6e4528',
  blonde: '#e2b553',
  ginger: '#d0672e',
  grey: '#b5b4ba',
  blue: '#4f86e8',
  pink: '#f08cbf',
};
/** Shirt colours to pick from. */
export const SHIRT_COLOURS = ['#6a7be6', '#e66a8f', '#3fae8c', '#f0a43a', '#8a63d2', '#e8735a'];
/** Eye colours to pick from. */
export const EYE_COLOURS = ['#5a86b4', '#5d4030', '#4d8a5a', '#7a6a4a', '#8a5fb0'];
/** Bright colours for accessories (hat, beanie, bowtie, scarf, flower, frames). */
const ACCENTS = ['#e8505b', '#f3a33a', '#3fb6a8', '#5b7ce6', '#c065d6', '#f27eb2', '#59b85f'];
/** The moods a face can show (sleep: eyes shut, fast asleep, for the torchlight special mode T4.5); older mood names
 * from faceMood() are mapped onto these. */
export const MOODS = ['grim', 'ow', 'relief', 'glowing', 'sleep'];
const MOOD_ALIAS = { sad: 'grim', meh: 'meh', happy: 'relief', glow: 'glowing' };

/** The face used when no spec is given. */
export const DEFAULT_FACE_SPEC = {
  shape: 'oval', skinTone: 'light', hair: 'short', hairColor: 'brown', eyes: 'round', brows: 'flat', mouth: 'smile', accessories: [],
};

/**
 * A random face spec from a seed (so "New face" gives a different person each time), built the same way as a
 * generated customer's face.
 * @param {number} seed any whole number
 * @returns {object} the spec (face part ids, see DEFAULT_FACE_SPEC)
 */
export function randomFaceSpec(seed) {
  return { ...makeCustomer(seed + 101, { chapter: 5 }).face, size: 1 };
}

/**
 * Mix a '#rrggbb' colour towards white (amount > 0) or black (amount < 0).
 * @param {string} hex the colour
 * @param {number} amount -1 .. 1
 * @param {number} [alpha] opacity 0..1
 * @returns {string} a css colour
 */
function shade(hex, amount, alpha = 1) {
  const n = parseInt(hex.slice(1), 16);
  const to = amount > 0 ? 255 : 0;
  const k = Math.abs(amount);
  // Moves one colour channel toward black or white by amount, as a 0 to 255 number.
  const ch = (v) => Math.round(v + (to - v) * k);
  return `rgba(${ch((n >> 16) & 255)},${ch((n >> 8) & 255)},${ch(n & 255)},${alpha})`;
}

/**
 * A '#rrggbb' colour as three numbers.
 * @param {string} hex the colour
 * @returns {number[]} [r, g, b], 0..255
 */
function rgbOf(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/**
 * Three colour numbers as a css colour.
 * @param {number[]} c [r, g, b]
 * @param {number} [a] opacity 0..1
 * @returns {string} the css colour
 */
function css(c, a = 1) {
  return `rgba(${Math.round(c[0])},${Math.round(c[1])},${Math.round(c[2])},${a})`;
}

/**
 * Mix two colours.
 * @param {number[]} a [r, g, b]
 * @param {number[]} b [r, g, b]
 * @param {number} k 0 = all a, 1 = all b
 * @returns {number[]} the mix
 */
function mixRgb(a, b, k) {
  return [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];
}

/**
 * How light a colour looks.
 * @param {string} hex the colour
 * @returns {number} 0 (black) .. 1 (white)
 */
function lightness(hex) {
  const [r, g, b] = rgbOf(hex);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
}

/**
 * The skin's own shadow colour: deeper and warmer (towards red-brown), never grey.
 * @param {string} hex the skin colour
 * @returns {number[]} [r, g, b]
 */
function skinDeep(hex) {
  const [r, g, b] = rgbOf(hex);
  return [r * 0.55, g * 0.36, b * 0.36];
}

/**
 * The light that falls on the skin: a warm cream, a little more golden on darker skin.
 * @param {string} hex the skin colour
 * @returns {number[]} [r, g, b]
 */
function skinLit(hex) {
  return mixRgb([255, 246, 236], [255, 216, 174], Math.max(0, Math.min(1, 1 - lightness(hex))));
}

/**
 * A soft oval spot of colour that fades out to nothing at its edge (light or shade painted over the skin).
 * @param {CanvasRenderingContext2D} ctx the context
 * @param {number} x centre x
 * @param {number} y centre y
 * @param {number} rx half width
 * @param {number} ry half height
 * @param {number[]} c the colour [r, g, b]
 * @param {number} a opacity in the middle
 * @param {number} [rot] turn in radians
 * @returns {void}
 */
function softSpot(ctx, x, y, rx, ry, c, a, rot = 0) {
  if (!(a > 0) || !(rx > 0) || !(ry > 0)) return;
  ctx.save();
  ctx.translate(x, y);
  if (rot) ctx.rotate(rot);
  ctx.scale(1, ry / rx);
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, rx);
  g.addColorStop(0, css(c, a));
  g.addColorStop(0.45, css(c, a * 0.72));
  g.addColorStop(0.75, css(c, a * 0.28));
  g.addColorStop(1, css(c, 0));
  ctx.fillStyle = g;
  ctx.fillRect(-rx, -rx, rx * 2, rx * 2);
  ctx.restore();
}

/**
 * A whole number from a text (the same text always gives the same number), used to pick colours for a face.
 * @param {string} s the text
 * @returns {number} the number
 */
function hashText(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i += 1) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

// The clash rule (HATS, wornAccessories, B56) lives in logic.js since B60, so the layout counts only what is worn;
// wornAccessories is passed on from here too, for older callers.
export { wornAccessories };

/**
 * Turn a face spec into everything the drawing needs: part ids checked against FACE_PARTS (unknown ones get a
 * default), and colours as '#rrggbb'. Older specs ({skin, hair: '#colour', eyes: '#colour', shirt}) still work.
 * @param {object} [spec] the face spec
 * @returns {{shape: string, skin: string, hairStyle: string, hair: string, eyes: string, eyeColour: string,
 *   brows: string, mouth: string, acc: string[], shirt: string, accent: string, accent2: string}} the look
 */
export function faceLook(spec = DEFAULT_FACE_SPEC) {
  const s = resolveFaceSpec(spec ?? DEFAULT_FACE_SPEC); // a story character (characters.js) brings his own parts
  // True when a value is a #rrggbb colour text.
  const isHex = (v) => typeof v === 'string' && /^#[0-9a-f]{6}$/i.test(v);
  // Returns the value if it is a known part of this kind, else the default.
  const part = (kind, v, dflt) => (FACE_PARTS[kind].includes(v) ? v : dflt);
  const acc = (Array.isArray(s.accessories) ? s.accessories : []).filter((a) => FACE_PARTS.accessories.includes(a));
  const key = JSON.stringify([s.shape, s.skinTone ?? s.skin, s.hair, s.hairColor, s.eyes, s.brows, s.mouth, acc]);
  const rand = rng(hashText(key));
  /** Pick one item of a list with this face's own random numbers. @param {any[]} list the list @returns {any} the item */
  const pick = (list) => list[Math.floor(rand() * list.length)];
  const skinId = s.skinTone ?? s.skin;
  const accent = pick(ACCENTS);
  return {
    shape: part('shape', s.shape, 'oval'),
    skin: isHex(skinId) ? skinId : SKIN_TONES[skinId] ?? SKIN_TONES.light,
    hairStyle: part('hair', s.hair, 'short'),
    hair: isHex(s.hair) ? s.hair : HAIR_COLOURS[s.hairColor] ?? HAIR_COLOURS.brown,
    eyes: part('eyes', s.eyes, 'round'),
    eyeColour: isHex(s.eyes) ? s.eyes : isHex(s.eyeColour) ? s.eyeColour : pick(EYE_COLOURS),
    brows: part('brows', s.brows, 'flat'),
    mouth: part('mouth', s.mouth, 'smile'),
    acc: wornAccessories(acc), // B56: never two hats, or a crown on a cap
    shirt: isHex(s.shirt) ? s.shirt : pick(SHIRT_COLOURS),
    accent,
    accent2: pick(ACCENTS.filter((c) => c !== accent)),
    // Character extras (T2.4), all off for ordinary customers.
    character: CHARACTER_FACES[s.character] ? s.character : null,
    beard: s.beard === true,
    tuft: s.tuft === true,
    smoothHair: s.smoothHair === true,
    roundNose: s.nose === 'round',
    blush: s.blush === true,
    armor: armorOptions(s.armor),
  };
}

/**
 * How far the head outline reaches out from the bare-skin oval in one direction (always 1 or more, so every bump
 * that layoutFace puts inside the oval is on skin). Square heads get corners, hearts a wide brow and a pointed chin,
 * chubby faces full jowls.
 * @param {string} shape the head shape id
 * @param {number} t the direction, an angle (0 = right, positive = downwards)
 * @returns {number} the reach (1 = on the oval)
 */
function headReach(shape, t) {
  const c = Math.abs(Math.cos(t));
  const s = Math.sin(t);
  /** The reach of a rounded square ("superellipse"); bigger n = squarer. @param {number} n power @returns {number} reach */
  const sq = (n) => (c ** n + Math.abs(s) ** n) ** (-1 / n);
  switch (shape) {
    case 'round': return sq(2.25);
    case 'square': return s < 0 ? sq(2.8) : sq(3.8);
    case 'heart': return s < 0 ? sq(3) : 1 + 0.06 * s ** 10;
    case 'long': return sq(2.35);
    case 'chubby': return s < 0 ? sq(2.15) : sq(2.7) + 0.05 * Math.sin(2 * t) ** 2;
    default: return 1 + 0.03 * Math.max(0, -s); // oval
  }
}

/**
 * A point on the head outline (or on a copy of it scaled up, for hair and hats).
 * @param {object} f the face geometry
 * @param {number} t the direction (0 = right, positive = downwards)
 * @param {number} [sx] scale across
 * @param {number} [sy] scale up and down
 * @param {number} [dv] shift down, in face units
 * @returns {number[]} [x, y] in CSS px
 */
function headPoint(f, t, sx = 1, sy = 1, dv = 0) {
  const k = headReach(f.features.shape, t);
  return [f.cx + f.rx * sx * k * Math.cos(t), f.cy + f.ry * (sy * k * Math.sin(t) + dv)];
}

/**
 * The head outline path.
 * @param {CanvasRenderingContext2D} ctx the context
 * @param {object} f the face geometry
 * @returns {void}
 */
function headPath(ctx, f) {
  ctx.beginPath();
  for (let i = 0; i < 120; i += 1) {
    const [x, y] = headPoint(f, (i / 120) * Math.PI * 2);
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  }
  ctx.closePath();
}

/**
 * Add the top of a scaled head outline to the current path, from the right side over the top to the left side.
 * @param {CanvasRenderingContext2D} ctx the context
 * @param {object} f the face geometry
 * @param {number} sideV where the arc starts and ends, in face units (negative = above the middle)
 * @param {number} sx scale across
 * @param {number} sy scale up and down
 * @param {number} [dv] shift down
 * @returns {void}
 */
function topArc(ctx, f, sideV, sx, sy, dv = 0) {
  const t0 = Math.asin(Math.max(-0.95, Math.min(0.95, (sideV - dv) / sy)));
  const n = 48;
  for (let i = 0; i <= n; i += 1) {
    const t = t0 + (i / n) * (-Math.PI - 2 * t0);
    const [x, y] = headPoint(f, t, sx, sy, dv);
    ctx.lineTo(x, y);
  }
}

/**
 * The hairline height at u, in face units (layoutFace keeps bumps 0.07 below it).
 * @param {object} f the face geometry
 * @param {number} u -1 .. 1
 * @returns {number} v
 */
function hairline(f, u) {
  return f.features.hairTop + f.features.hairCurve * u * u;
}

/**
 * Where the top of the head outline is at x-unit u (the dome's edge), in face units (R8: the veil's pearls on a bald head).
 * @param {object} f the face geometry
 * @param {number} u -1 .. 1
 * @returns {number} v of the outline's top edge at u
 */
function headTopV(f, u) {
  let lo = -1.6;
  let hi = 0;
  for (let i = 0; i < 24; i += 1) {
    const mid = (lo + hi) / 2;
    if (insideHeadOutline(f.features.shape, u, mid, 1, 1)) hi = mid; else lo = mid;
  }
  return hi;
}

/**
 * Where the head outline is at height v, as a positive u (R7: the bald side tufts follow it).
 * @param {object} f the face geometry
 * @param {number} v height in face units
 * @returns {number} u of the outline's right edge at v
 */
function headEdgeU(f, v) {
  let lo = 0.5;
  let hi = 1.6;
  for (let i = 0; i < 24; i += 1) {
    const mid = (lo + hi) / 2;
    if (insideHeadOutline(f.features.shape, mid, v, 1, 1)) lo = mid; else hi = mid;
  }
  return lo;
}

/**
 * The background: a calm bathroom-mirror mint with faint tiles.
 * @param {CanvasRenderingContext2D} ctx the context
 * @param {number} w width
 * @param {number} h height
 * @returns {void}
 */
function drawBackground(ctx, w, h) {
  const bg = ctx.createLinearGradient(0, 0, 0, h);
  bg.addColorStop(0, '#d6eeea');
  bg.addColorStop(1, '#a7d1cc');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = 'rgba(255,255,255,0.35)';
  ctx.lineWidth = 1;
  for (let x = 0; x < w; x += 44) { ctx.beginPath(); ctx.moveTo(x + 0.5, 0); ctx.lineTo(x + 0.5, h); ctx.stroke(); }
  for (let y = 0; y < h; y += 44) { ctx.beginPath(); ctx.moveTo(0, y + 0.5); ctx.lineTo(w, y + 0.5); ctx.stroke(); }
}

/**
 * Neck and shoulders in a hoodie.
 * @param {CanvasRenderingContext2D} ctx the context
 * @param {object} f the face geometry
 * @param {object} look the face look (faceLook)
 * @returns {void}
 */
function drawShoulders(ctx, f, look) {
  const { cx, cy, rx, ry, height: h } = f;
  drawNeck(ctx, f, look.skin);
  const top = cy + ry * 1.04;
  const hood = ctx.createLinearGradient(0, top, 0, h);
  hood.addColorStop(0, shade(look.shirt, 0.04));
  hood.addColorStop(1, shade(look.shirt, -0.25));
  ctx.fillStyle = hood;
  ctx.beginPath();
  ctx.moveTo(cx - rx * 1.9, h + 4);
  ctx.bezierCurveTo(cx - rx * 1.85, top + ry * 0.12, cx - rx * 1.2, top, cx - rx * 0.5, top);
  ctx.quadraticCurveTo(cx, top + ry * 0.25, cx + rx * 0.5, top);
  ctx.bezierCurveTo(cx + rx * 1.2, top, cx + rx * 1.85, top + ry * 0.12, cx + rx * 1.9, h + 4);
  ctx.closePath();
  ctx.fill();
  // Cloth shading: light on the left shoulder, shade on the right, the chin's shadow on the collar, two soft folds.
  ctx.save();
  ctx.clip();
  softSpot(ctx, cx - rx * 1.3, top + ry * 0.32, rx * 0.75, ry * 0.32, [255, 255, 255], 0.16);
  softSpot(ctx, cx + rx * 1.45, top + ry * 0.7, rx * 0.8, ry * 0.7, [20, 10, 30], 0.16);
  softSpot(ctx, cx, top + ry * 0.04, rx * 0.7, ry * 0.2, [20, 10, 30], 0.2);
  ctx.strokeStyle = shade(look.shirt, -0.35, 0.2);
  ctx.lineWidth = rx * 0.03;
  ctx.lineCap = 'round';
  for (const s of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(cx + s * rx * 1.12, h + 4);
    ctx.quadraticCurveTo(cx + s * rx * 1.02, top + ry * 0.75, cx + s * rx * 0.86, top + ry * 0.45);
    ctx.stroke();
  }
  ctx.restore();
  // A ribbed band round the neckline.
  ctx.lineCap = 'round';
  ctx.strokeStyle = shade(look.shirt, -0.14);
  ctx.lineWidth = rx * 0.07;
  ctx.beginPath();
  ctx.moveTo(cx - rx * 0.5, top);
  ctx.quadraticCurveTo(cx, top + ry * 0.25, cx + rx * 0.5, top);
  ctx.stroke();
  ctx.strokeStyle = shade(look.shirt, 0.25, 0.6);
  ctx.lineWidth = Math.max(1, rx * 0.012);
  ctx.beginPath();
  ctx.moveTo(cx - rx * 0.52, top + ry * 0.03);
  ctx.quadraticCurveTo(cx, top + ry * 0.29, cx + rx * 0.52, top + ry * 0.03);
  ctx.stroke();
  if (!look.acc.includes('scarf')) {
    ctx.lineWidth = Math.max(2, rx * 0.02);
    for (const s of [-1, 1]) {
      const x0 = cx + s * rx * 0.22;
      const y0 = top + ry * 0.14;
      ctx.strokeStyle = 'rgba(30,20,40,0.18)'; // a faint shadow beside each string
      ctx.beginPath(); ctx.moveTo(x0 + rx * 0.015, y0); ctx.lineTo(x0 + s * rx * 0.04 + rx * 0.015, top + ry * 0.46); ctx.stroke();
      ctx.strokeStyle = '#f4f2ee';
      ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x0 + s * rx * 0.04, top + ry * 0.45); ctx.stroke();
      ctx.fillStyle = '#d9d4cc'; // the little tip
      ctx.beginPath(); ctx.ellipse(x0 + s * rx * 0.042, top + ry * 0.47, rx * 0.016, ry * 0.03, 0, 0, Math.PI * 2); ctx.fill();
    }
  }
}

/**
 * The neck: a round column, shaded at its sides, with the chin's soft shadow across the top.
 * @param {CanvasRenderingContext2D} ctx the context
 * @param {object} f the face geometry
 * @param {string} base skin colour
 * @returns {void}
 */
function drawNeck(ctx, f, base) {
  const { cx, cy, rx, ry } = f;
  const deep = skinDeep(base);
  const x0 = cx - rx * 0.42;
  ctx.fillStyle = css(mixRgb(rgbOf(base), deep, 0.12));
  ctx.fillRect(x0, cy + ry * 0.6, rx * 0.84, ry * 0.6);
  const side = ctx.createLinearGradient(x0, 0, x0 + rx * 0.84, 0);
  side.addColorStop(0, css(deep, 0.32));
  side.addColorStop(0.3, css(deep, 0.02));
  side.addColorStop(0.62, css(deep, 0.06));
  side.addColorStop(1, css(deep, 0.42));
  ctx.fillStyle = side;
  ctx.fillRect(x0, cy + ry * 0.6, rx * 0.84, ry * 0.6);
  const under = ctx.createLinearGradient(0, cy + ry * 0.8, 0, cy + ry * 1.14);
  under.addColorStop(0, css(deep, 0.5));
  under.addColorStop(1, css(deep, 0));
  ctx.fillStyle = under;
  ctx.fillRect(x0, cy + ry * 0.8, rx * 0.84, ry * 0.34);
}

/**
 * Fill a hair shape (the current path) with depth: the hair colour, lighter on top and darker below, a darker band
 * just inside its edge, a thin light rim on the lit upper-left side, strands that follow the hair's flow, and a glossy
 * shine band (curly hair gets fluffy curls instead of strands and rim).
 * @param {CanvasRenderingContext2D} ctx the context
 * @param {object} f the face geometry
 * @param {string} hair hair colour
 * @param {number} [shineV] where the shine sits, in face units
 * @param {number} [dark] how much darker (0..1), for hair behind the head
 * @param {{flow?: string, from?: number[], box?: number[], count?: number, seed?: number, up?: boolean}} [o] how the
 *   strands run: 'crown' (out from a point, `from` [u, v]; `up` = upwards), 'down' (hanging inside `box`
 *   [u0, v0, u1, v1]), 'swirl' (round `from`, for a bun), 'curl' (little curls inside `box`) or 'none'
 * @returns {void}
 */
function fillHair(ctx, f, hair, shineV = -0.95, dark = 0, o = {}) {
  const { cx, cy, rx, ry } = f;
  const flow = o.flow ?? 'crown';
  const g = ctx.createLinearGradient(0, cy - ry * 1.35, 0, cy + ry * 0.5);
  g.addColorStop(0, shade(hair, 0.1 - dark));
  g.addColorStop(0.5, shade(hair, -0.06 - dark));
  g.addColorStop(1, shade(hair, -0.28 - dark));
  ctx.fillStyle = g;
  ctx.fill();
  ctx.save();
  ctx.clip();
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  if (flow !== 'curl') {
    ctx.strokeStyle = shade(hair, -0.5, 0.28); // the edge turns away: a soft darker band inside it
    ctx.lineWidth = rx * 0.07;
    ctx.stroke();
    // A thin light rim where the light catches the outer edge: an oval gradient round the head (a little to the
    // right, so the left rim is brighter) keeps it off the hairline, which lies inside the oval.
    ctx.save();
    ctx.translate(cx + rx * 0.12, cy - ry * 0.05);
    ctx.scale(1, ry / rx);
    const rim = ctx.createRadialGradient(0, 0, rx * 0.98, 0, 0, rx * 1.22);
    rim.addColorStop(0, shade(hair, 0.6, 0));
    rim.addColorStop(1, shade(hair, 0.6, 0.6));
    ctx.strokeStyle = rim;
    ctx.lineWidth = rx * 0.028;
    ctx.stroke();
    ctx.restore();
  }
  hairStrands(ctx, f, hair, flow, o);
  if (flow === 'down') { // hanging hair: a long soft sheen down its lit side
    const [u0, v0, u1, v1] = o.box;
    const x = cx + rx * (u0 + (u1 - u0) * 0.32);
    const sheen = ctx.createLinearGradient(x - rx * 0.06, 0, x + rx * 0.06, 0);
    sheen.addColorStop(0, shade(hair, 0.5, 0));
    sheen.addColorStop(0.5, shade(hair, 0.5, 0.22));
    sheen.addColorStop(1, shade(hair, 0.5, 0));
    ctx.fillStyle = sheen;
    ctx.fillRect(x - rx * 0.06, cy + ry * v0, rx * 0.12, ry * (v1 - v0));
  } else if (flow !== 'curl') { // the shine band across the top: a wide soft one with a brighter core
    for (const [wk, a] of [[0.11, 0.18], [0.035, 0.32]]) {
      ctx.strokeStyle = shade(hair, 0.55, a);
      ctx.lineWidth = rx * wk;
      ctx.beginPath();
      ctx.ellipse(cx - rx * 0.1, cy + ry * (shineV + 0.3), rx * 0.62, ry * 0.34, 0, Math.PI * 1.17, Math.PI * 1.5);
      ctx.stroke();
    }
  }
  ctx.restore();
}

/**
 * Strands (or curls) inside a hair shape that is already the clip: thin lines in a lighter and a darker shade that
 * follow the flow (see fillHair). Painted only into the cached layers, so their number does not cost per frame.
 * @param {CanvasRenderingContext2D} ctx the context
 * @param {object} f the face geometry
 * @param {string} hair hair colour
 * @param {string} flow 'crown', 'down', 'swirl', 'curl' or 'none'
 * @param {{from?: number[], box?: number[], count?: number, seed?: number, up?: boolean}} o where they run
 * @returns {void}
 */
function hairStrands(ctx, f, hair, flow, o) {
  if (flow === 'none') return;
  const { cx, cy, rx, ry } = f;
  // Turns a face x-unit (u) into a canvas x position.
  const X = (u) => cx + u * rx;
  // Turns a face y-unit (v) into a canvas y position.
  const Y = (v) => cy + v * ry;
  const rand = rng(o.seed ?? 5);
  const lw = Math.max(0.7, rx * 0.009);
  const light = shade(hair, 0.38, 0.32);
  const darkC = shade(hair, -0.42, 0.34);
  if (flow === 'curl') { // fluffy curls: soft lumps, each with a dark crease under it and a light top (no outlines)
    const [u0, v0, u1, v1] = o.box ?? [-1.2, -1.4, 1.2, -0.3];
    const n = Math.round((o.count ?? 46) * 0.9);
    const c = rgbOf(hair);
    const lo = mixRgb(c, [0, 0, 0], 0.5);
    const hi = mixRgb(c, [255, 255, 255], 0.4);
    for (let i = 0; i < n; i += 1) {
      const x = X(u0 + rand() * (u1 - u0));
      const y = Y(v0 + rand() * (v1 - v0));
      const r = rx * (0.07 + rand() * 0.05);
      softSpot(ctx, x + r * 0.1, y + r * 0.62, r * 1.1, r * 0.34, lo, 0.38);
      softSpot(ctx, x - r * 0.2, y - r * 0.15, r * 0.9, r * 0.6, hi, 0.32);
    }
    return;
  }
  const n = o.count ?? (flow === 'down' ? 26 : 34);
  const paths = [new Path2D(), new Path2D()]; // light strands, dark strands
  for (let i = 0; i < n; i += 1) {
    const p = paths[rand() < 0.62 ? 0 : 1];
    if (flow === 'down') {
      const [u0, v0, u1, v1] = o.box;
      const u = u0 + ((u1 - u0) * (i + rand() * 0.8)) / n;
      const bend = (rand() - 0.5) * 0.12;
      const top = v0 + rand() * (v1 - v0) * 0.2;
      p.moveTo(X(u), Y(top));
      p.quadraticCurveTo(X(u + bend), Y((top + v1) / 2), X(u + bend * 0.4 + (rand() - 0.5) * 0.05), Y(v1));
    } else if (flow === 'swirl') {
      const [fu, fv] = o.from ?? [0, -1.2];
      const r = rx * (0.06 + rand() * 0.26);
      const a = rand() * Math.PI * 2;
      p.moveTo(X(fu) + Math.cos(a) * r, Y(fv) + Math.sin(a) * r * 0.7);
      p.ellipse(X(fu), Y(fv), r, r * 0.7, 0, a, a + 0.9 + rand() * 0.8);
    } else { // crown: from near a point, sweeping out to the edges
      const [fu, fv] = o.from ?? [0.08, -1.12];
      const a = (o.up ? Math.PI : 0) + Math.PI * (0.04 + (0.92 * (i + rand() * 0.8)) / n);
      const r0 = 0.06 + rand() * 0.28;
      const r1 = r0 + 0.55 + rand() * 0.9;
      const bend = (rand() - 0.5) * 0.4;
      const am = a + bend;
      const rm = (r0 + r1) / 2;
      p.moveTo(X(fu + Math.cos(a) * r0), Y(fv + Math.sin(a) * r0));
      p.quadraticCurveTo(X(fu + Math.cos(am) * rm), Y(fv + Math.sin(am) * rm), X(fu + Math.cos(a) * r1), Y(fv + Math.sin(a) * r1));
    }
  }
  ctx.lineWidth = lw;
  ctx.strokeStyle = light;
  ctx.stroke(paths[0]);
  ctx.strokeStyle = darkC;
  ctx.stroke(paths[1]);
}

/**
 * The hair (and veil) behind the head: long hair, bob, bun, ponytail, afro cloud, or a plain back for short styles.
 * @param {CanvasRenderingContext2D} ctx the context
 * @param {object} f the face geometry
 * @param {object} look the face look
 * @returns {void}
 */
function drawBackHair(ctx, f, look) {
  const { cx, cy, rx, ry } = f;
  const hair = look.hair;
  const st = look.hairStyle;
  if (look.acc.includes('veil')) { // a soft white veil falling behind the head to the shoulders
    ctx.fillStyle = 'rgba(255,255,255,0.75)';
    ctx.beginPath();
    ctx.moveTo(cx - rx * 0.5, cy - ry * 1.05);
    ctx.bezierCurveTo(cx - rx * 1.25, cy - ry * 0.8, cx - rx * 1.45, cy + ry * 0.6, cx - rx * 1.5, cy + ry * 1.5);
    ctx.lineTo(cx + rx * 1.5, cy + ry * 1.5);
    ctx.bezierCurveTo(cx + rx * 1.45, cy + ry * 0.6, cx + rx * 1.25, cy - ry * 0.8, cx + rx * 0.5, cy - ry * 1.05);
    if (st === 'bald' || st === 'mohawk') { // a bare head: the top of the veil follows the dome (no flat edge above it)
      const yMid = cy + ry * (headTopV(f, 0) + 0.05);
      ctx.quadraticCurveTo(cx, 2 * yMid - (cy - ry * 1.05), cx - rx * 0.5, cy - ry * 1.05);
    }
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgba(210,220,235,0.8)';
    ctx.lineWidth = Math.max(1, rx * 0.012);
    for (const s of [-1, 1]) for (const k of [0.95, 1.15, 1.32]) {
      ctx.beginPath(); ctx.moveTo(cx + s * rx * 0.6, cy - ry * 0.9); ctx.quadraticCurveTo(cx + s * rx * k, cy, cx + s * rx * (k + 0.1), cy + ry * 1.45); ctx.stroke();
    }
  }
  if (st === 'bald' || st === 'mohawk') return;
  if (st === 'afro') { // a big round cloud of puffs
    ctx.beginPath();
    const n = 18;
    for (let i = 0; i < n; i += 1) {
      const a = (i / n) * Math.PI * 2;
      const x = cx + Math.cos(a) * rx * 1.02;
      const y = cy - ry * 0.4 + Math.sin(a) * ry * 0.8;
      ctx.moveTo(x + rx * 0.2, y);
      ctx.arc(x, y, rx * 0.2, 0, Math.PI * 2);
    }
    ctx.moveTo(cx + rx * 1.05, cy - ry * 0.4);
    ctx.ellipse(cx, cy - ry * 0.4, rx * 1.05, ry * 0.82, 0, 0, Math.PI * 2);
    fillHair(ctx, f, hair, -1.15, 0, { flow: 'curl', box: [-1.25, -1.35, 1.25, 0.35], count: 64 });
    return;
  }
  if (st === 'long') { // falls down behind the shoulders
    ctx.beginPath();
    ctx.moveTo(cx - rx * 1.08, cy - ry * 0.2);
    topArc(ctx, f, -0.2, 1.1, 1.14);
    ctx.lineTo(cx + rx * 1.08, cy - ry * 0.2);
    ctx.bezierCurveTo(cx + rx * 1.3, cy + ry * 0.5, cx + rx * 1.3, cy + ry * 1.2, cx + rx * 1.2, cy + ry * 1.55);
    ctx.quadraticCurveTo(cx, cy + ry * 1.65, cx - rx * 1.2, cy + ry * 1.55);
    ctx.bezierCurveTo(cx - rx * 1.3, cy + ry * 1.2, cx - rx * 1.3, cy + ry * 0.5, cx - rx * 1.08, cy - ry * 0.2);
    fillHair(ctx, f, hair, -0.95, 0, { flow: 'down', box: [-1.32, -0.3, 1.32, 1.62], count: 40 });
    return;
  }
  // The bun on top (B56: not under a hat, beanie or cap, where it used to poke out above the crown).
  if (st === 'bun' && !look.acc.some((a) => a === 'beanie' || a === 'hat' || a === 'pilot-cap')) {
    ctx.beginPath();
    ctx.ellipse(cx, cy - ry * 1.2, rx * 0.34, ry * 0.24, 0, 0, Math.PI * 2);
    fillHair(ctx, f, hair, -1.35, 0, { flow: 'swirl', from: [0, -1.2], count: 16 });
  }
  if (st === 'ponytail') { // a tail swinging out on the right
    ctx.beginPath();
    ctx.moveTo(cx + rx * 0.55, cy - ry * 1.0);
    ctx.bezierCurveTo(cx + rx * 1.3, cy - ry * 1.05, cx + rx * 1.32, cy - ry * 0.3, cx + rx * 1.2, cy + ry * 0.35);
    ctx.quadraticCurveTo(cx + rx * 1.12, cy + ry * 0.75, cx + rx * 0.98, cy + ry * 0.9);
    ctx.quadraticCurveTo(cx + rx * 1.05, cy + ry * 0.2, cx + rx * 0.8, cy - ry * 0.5);
    ctx.closePath();
    fillHair(ctx, f, hair, -0.7, 0, { flow: 'down', box: [0.78, -1.0, 1.34, 0.95], count: 16 });
    // The hair tie. B60: under a beanie, bowler or pilot cap it sat on the hat's corner or brim tip (or peeked out
    // beside the cap), so there it slides further down the tail, below the hat's edge.
    const hatOn = look.acc.some((a) => HATS.includes(a));
    ctx.fillStyle = look.accent;
    ctx.beginPath();
    if (hatOn) ctx.ellipse(cx + rx * 1.15, cy - ry * 0.32, rx * 0.075, ry * 0.07, 0.2, 0, Math.PI * 2);
    else ctx.ellipse(cx + rx * 1.06, cy - ry * 0.78, rx * 0.07, ry * 0.08, 0.6, 0, Math.PI * 2);
    ctx.fill();
  }
  // The back of the head (fills the temples behind the front hair).
  const low = st === 'bob' ? 0.45 : -0.05;
  ctx.beginPath();
  ctx.moveTo(cx - rx * 1.06, cy + ry * low);
  topArc(ctx, f, low, 1.07, 1.12);
  ctx.lineTo(cx + rx * 1.06, cy + ry * low);
  ctx.closePath();
  fillHair(ctx, f, hair, -0.95, 0.14, { seed: 9 }); // a touch darker than the front hair
}

/**
 * The front hair (over the forehead): a cap over the top of the head and a hairline edge in the style's shape
 * (tufts, curls, a centre parting, smooth pulled-back hair, straight bangs), never lower than 0.07 below the hairline.
 * Bald heads get a shine and two side tufts, mohawks a row of spikes.
 * @param {CanvasRenderingContext2D} ctx the context
 * @param {object} f the face geometry
 * @param {object} look the face look
 * @returns {void}
 */
function drawFrontHair(ctx, f, look) {
  const { cx, cy, rx, ry } = f;
  const hair = look.hair;
  const st = look.hairStyle;
  // Turns a face x-unit (u) into a canvas x position.
  const X = (u) => cx + u * rx;
  // Turns a face y-unit (v) into a canvas y position.
  const Y = (v) => cy + v * ry;
  if (st === 'bald') {
    ctx.fillStyle = 'rgba(255,255,255,0.28)';
    ctx.beginPath();
    ctx.ellipse(X(-0.3), Y(-0.86), rx * 0.22, ry * 0.07, -0.35, 0, Math.PI * 2);
    ctx.fill();
    // Under a beanie the tufts are tucked in (owner 2026-10-28: they peeked out below it as loose pink smudges).
    if (look.acc.includes('beanie')) return;
    // Tufts above the ears: a crescent that hugs the head outline (R7: they stood off the head as loose dark slivers).
    for (const s of [-1, 1]) {
      const vs = [];
      for (let v = -0.48; v <= -0.16 + 1e-9; v += 0.04) vs.push(v);
      ctx.beginPath();
      vs.forEach((v, i) => { const x = X(s * (headEdgeU(f, v) + 0.012)); if (i) ctx.lineTo(x, Y(v)); else ctx.moveTo(x, Y(v)); });
      for (let i = vs.length - 1; i >= 0; i -= 1) {
        const v = vs[i];
        const inset = 0.15 * Math.sin(((v + 0.48) / 0.32) * Math.PI); // thickest in the middle, a point at both ends
        ctx.lineTo(X(s * (headEdgeU(f, v) + 0.012 - inset)), Y(v));
      }
      ctx.closePath();
      const e0 = headEdgeU(f, -0.48) + 0.012;
      const e1 = headEdgeU(f, -0.16) + 0.012;
      fillHair(ctx, f, hair, -0.95, 0, { flow: 'down', box: s < 0 ? [-Math.max(e0, e1), -0.48, -Math.min(e0, e1) + 0.15, -0.16] : [Math.min(e0, e1) - 0.15, -0.48, Math.max(e0, e1), -0.16], count: 8 });
    }
    return;
  }
  if (st === 'mohawk') {
    // Shaved sides: a faint shadow of stubble on the scalp above the hairline.
    ctx.save();
    headPath(ctx, f);
    ctx.clip();
    ctx.fillStyle = shade(hair, 0, 0.22);
    ctx.beginPath();
    ctx.moveTo(X(-1.1), Y(hairline(f, 1.1) - 0.05));
    for (let i = 0; i <= 20; i += 1) { const u = -1.1 + (2.2 * i) / 20; ctx.lineTo(X(u), Y(hairline(f, u) - 0.05)); }
    ctx.lineTo(X(1.1), Y(-1.3));
    ctx.lineTo(X(-1.1), Y(-1.3));
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    // B56: under a hat, beanie or cap the crest is squashed flat (its root used to peek out under the brim).
    if (look.acc.some((a) => HATS.includes(a))) return;
    // The spiky strip on top.
    const base = f.features.hairTop + 0.04;
    ctx.beginPath();
    ctx.moveTo(X(-0.2), Y(base + 0.01));
    const spikes = 5;
    for (let i = 0; i < spikes; i += 1) {
      const u0 = -0.2 + (0.4 * i) / spikes;
      const u1 = -0.2 + (0.4 * (i + 1)) / spikes;
      const tip = -1.24 - 0.1 * Math.sin(((i + 0.5) / spikes) * Math.PI);
      ctx.lineTo(X((u0 + u1) / 2 - 0.03), Y(tip));
      ctx.lineTo(X(u1), Y(-1.0));
    }
    ctx.lineTo(X(0.2), Y(base + 0.01));
    ctx.quadraticCurveTo(X(0), Y(base + 0.03), X(-0.2), Y(base + 0.01));
    fillHair(ctx, f, hair, -1.2, 0, { flow: 'crown', from: [0, base], up: true, count: 22 });
    return;
  }
  // The cap: over the top of the head from one side to the other, then back along the hairline.
  const sideV = st === 'long' || st === 'bob' ? 0.05 : -0.22;
  const sx = st === 'curly' ? 1.1 : st === 'afro' ? 1.08 : 1.06;
  const sy = st === 'curly' || st === 'afro' ? 1.16 : 1.12;
  const edgeU = 0.98;
  ctx.beginPath();
  ctx.moveTo(X(sx * 0.98), Y(sideV));
  topArc(ctx, f, sideV, sx, sy);
  ctx.lineTo(X(-sx * 0.98), Y(sideV));
  ctx.lineTo(X(-edgeU), Y(hairline(f, edgeU)));
  /** The hairline edge with n soft bulges hanging down by drop (face units). @param {number} n bulges @param {number} drop depth @returns {void} */
  const bulges = (n, drop) => {
    for (let i = 0; i < n; i += 1) {
      const u0 = -edgeU + (2 * edgeU * i) / n;
      const u1 = -edgeU + (2 * edgeU * (i + 1)) / n;
      const um = (u0 + u1) / 2;
      ctx.quadraticCurveTo(X(um), Y(hairline(f, um) + drop), X(u1), Y(hairline(f, u1)));
    }
  };
  if (st === 'short' && !look.smoothHair) bulges(9, 0.07);
  else if (st === 'curly' || st === 'afro') bulges(st === 'afro' ? 9 : 12, 0.07);
  else if (st === 'bob') { // straight-cut bangs
    for (let i = 0; i <= 24; i += 1) {
      const u = -edgeU + (2 * edgeU * i) / 24;
      ctx.lineTo(X(u), Y(Math.min(hairline(f, u) + 0.06, f.features.hairTop + 0.06 + 0.04 * u * u)));
    }
  } else { // smooth hair; long hair has a centre parting
    for (let i = 0; i <= 24; i += 1) {
      const u = -edgeU + (2 * edgeU * i) / 24;
      const part = st === 'long' ? 0.07 * Math.exp(-(u * u) / 0.006) : 0;
      ctx.lineTo(X(u), Y(hairline(f, u) + 0.03 - part));
    }
  }
  ctx.closePath();
  if (st === 'curly') { // B56: a bumpy edge of curls round the top, so it reads as hair and not as a shower cap
    const t0 = Math.asin(Math.max(-0.95, Math.min(0.95, (sideV - 0.42) / sy))); // not down the sides (stray balls)
    for (let i = 0; i <= 8; i += 1) {
      const t = t0 + (i / 8) * (-Math.PI - 2 * t0);
      const [x, y] = headPoint(f, t, sx * 0.97, sy * 0.98);
      const r = rx * 0.11 * (0.65 + 0.35 * Math.sin((i / 8) * Math.PI)); // smaller towards the ends
      ctx.moveTo(x + r, y);
      ctx.arc(x, y, r, 0, Math.PI * 2, true); // the same turning way as the cap, so they add to it
    }
  }
  // Texture: little curls for curly hair, strands for straight hair (pulled back towards a bun or ponytail, from the
  // parting for long hair, only a few for the husband's smooth hair).
  if (st === 'curly') fillHair(ctx, f, hair, -0.95, 0, { flow: 'curl', box: [-1.2, -1.3, 1.2, -0.25], count: 60, seed: 7 });
  else if (st === 'afro') fillHair(ctx, f, hair, -0.95, 0, { flow: 'curl', box: [-1.08, -1.25, 1.08, -0.6], count: 44, seed: 7 });
  else if (look.smoothHair) fillHair(ctx, f, hair, -0.95, 0, { count: 12, seed: 3 });
  else fillHair(ctx, f, hair, -0.95, 0, { from: st === 'bun' || st === 'ponytail' ? [0, -1.32] : st === 'long' ? [0, -1.1] : [0.08, -1.14], count: 40 });
  // Long hair and the bob also hang down beside the face (outside the bare-skin oval).
  if (st === 'long' || st === 'bob') {
    const end = st === 'long' ? 0.95 : 0.42;
    for (const s of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(X(s * 0.97), Y(-0.45));
      for (let i = 0; i <= 12; i += 1) {
        const v = -0.45 + ((end + 0.45) * i) / 12;
        ctx.lineTo(X(s * (Math.sqrt(Math.max(0, 1 - v * v)) * 1.0 + 0.035)), Y(v));
      }
      ctx.quadraticCurveTo(X(s * 1.0), Y(end + 0.1), X(s * 1.22), Y(end + 0.04));
      // Back up the outer edge to the top of the head outline (B56: it used to end at 1.1, a spike in the air).
      ctx.quadraticCurveTo(X(s * 1.2), Y(0), X(s * 1.0), Y(-0.5));
      ctx.closePath();
      fillHair(ctx, f, hair, -0.4, 0, { flow: 'down', box: s < 0 ? [-1.22, -0.45, -0.95, end + 0.1] : [0.95, -0.45, 1.22, end + 0.1], count: 10, seed: 12 + s });
    }
  }
  if (look.tuft) drawTuft(ctx, f, hair);
}

/**
 * The husband's curl: one hooked lock of hair standing up on top of the head, like the comic's.
 * @param {CanvasRenderingContext2D} ctx the context
 * @param {object} f the face geometry
 * @param {string} hair hair colour
 * @returns {void}
 */
function drawTuft(ctx, f, hair) {
  // Turns a face x-unit (u) into a canvas x position.
  const X = (u) => f.cx + u * f.rx;
  // Turns a face y-unit (v) into a canvas y position.
  const Y = (v) => f.cy + v * f.ry;
  ctx.beginPath();
  ctx.moveTo(X(-0.1), Y(-1.08));
  ctx.bezierCurveTo(X(-0.16), Y(-1.36), X(0.16), Y(-1.5), X(0.32), Y(-1.32));
  ctx.bezierCurveTo(X(0.16), Y(-1.36), X(0.05), Y(-1.27), X(0.1), Y(-1.08));
  ctx.closePath();
  fillHair(ctx, f, hair, -1.3, 0, { flow: 'none' });
  ctx.strokeStyle = shade(hair, 0.35, 0.6);
  ctx.lineWidth = Math.max(1.2, f.rx * 0.014);
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(X(-0.07), Y(-1.14));
  ctx.quadraticCurveTo(X(-0.07), Y(-1.36), X(0.14), Y(-1.4));
  ctx.stroke();
}

/**
 * Hats, caps, bands and the tiara (drawn over the hair), plus the flower tucked above the right temple.
 * Their lower edges follow the hairline that faceGeometry uses, so they never cover a bump.
 * @param {CanvasRenderingContext2D} ctx the context
 * @param {object} f the face geometry
 * @param {object} look the face look
 * @returns {void}
 */
function drawHeadwear(ctx, f, look) {
  const { cx, cy, rx, ry } = f;
  // Turns a face x-unit (u) into a canvas x position.
  const X = (u) => cx + u * rx;
  // Turns a face y-unit (v) into a canvas y position.
  const Y = (v) => cy + v * ry;
  // True when the look wears the named accessory.
  const has = (a) => look.acc.includes(a);
  const lw = Math.max(1.5, rx * 0.018);
  if (has('beanie')) {
    // Owner 2026-10-28: the folded band stuck out past the sides like little wings. Now the beanie is one shape (the
    // dome down to its lower edge) and the band is cut from the bottom of that same shape, so it never sticks out.
    // Owner 2026-10-28 (v74 test): the lower corners still flared out past the head like a bell, with a flat end. Now
    // the sides hug the head (a little bulkier than it) and the lower edge curves up into them in a round corner.
    const c = look.accent;
    const sx = 1.08; // how much wider than the head the knit is
    const afro = look.hairStyle === 'afro'; // see below: the knit goes over the whole cloud of curls
    const round = afro ? 0.4 : 0.24; // how far in from the side the corner starts to curve up
    const lift = afro ? 0.24 : 0.12; // how high the corner curves up (more on an afro: the curls puff out under it)
    let side = 1.06; // half the beanie's width at its lower edge (worked out below)
    // Lower edge of the beanie at x-unit u, just under the hairline, curving up at the ends into a round corner.
    const bottom = (u) => {
      const a = Math.min(Math.abs(u), side);
      const k = Math.min(1, Math.max(0, a - (side - round)) / round);
      return hairline(f, a) + 0.03 - lift * (1 - Math.sqrt(1 - k * k));
    };
    // Owner 2026-10-28: on an afro the curls stuck out over the top of the beanie (a small hat sunk into the hair). There
    // the knit stretches over the whole cloud of curls (an oval as big as the cloud in drawBackHair), so the curls
    // only puff out below it at the sides.
    const oV = -0.4; // the afro oval's middle, in y-units
    const oA = 1.27; // its half width
    const oB = 0.85 + (0.2 * rx) / ry; // its half height (the cloud's outer puffs reach 0.2 rx past its own oval)
    // The angle on the afro oval at height v (negative = above its middle).
    const oAngle = (v) => Math.asin(Math.max(-0.95, Math.min(0.95, (v - oV) / oB)));
    // Where the top's curve meets the lower edge: settle the width so the corner ends exactly on the knit's side.
    for (let i = 0; i < 6; i += 1) {
      if (afro) { side = oA * Math.cos(oAngle(bottom(side))); continue; }
      const t0 = Math.asin(Math.max(-0.95, Math.min(0.95, (bottom(side) + 0.04) / 1.2)));
      side = (headPoint(f, t0, sx, 1.2, -0.04)[0] - cx) / rx;
    }
    const top = afro ? oV - oB : -1.3; // the crown's highest point (the pom-pom sits there)
    // The whole beanie's outline: along the lower edge from left to right, then over the top of a larger head.
    const shape = () => {
      ctx.beginPath();
      for (let i = 0; i <= 32; i += 1) { const u = -side + (2 * side * i) / 32; ctx.lineTo(X(u), Y(bottom(u))); }
      if (afro) { const a0 = oAngle(bottom(side)); ctx.ellipse(X(0), Y(oV), oA * rx, oB * ry, 0, a0, Math.PI - a0, true); } else topArc(ctx, f, bottom(side), sx, 1.2, -0.04);
      ctx.closePath();
    };
    shape();
    const g = ctx.createLinearGradient(0, Y(top), 0, Y(-0.6));
    g.addColorStop(0, shade(c, 0.15));
    g.addColorStop(1, shade(c, -0.1));
    ctx.fillStyle = g;
    ctx.fill();
    // The folded band with ribs: the lower part of the same shape.
    ctx.save();
    shape();
    ctx.clip();
    ctx.beginPath();
    for (let i = 0; i <= 24; i += 1) { const u = -1.3 + (2.6 * i) / 24; ctx.lineTo(X(u), Y(bottom(u) - 0.16)); }
    ctx.lineTo(X(1.3), Y(bottom(1.3) + 0.2));
    ctx.lineTo(X(-1.3), Y(bottom(-1.3) + 0.2));
    ctx.closePath();
    ctx.fillStyle = shade(c, -0.15);
    ctx.fill();
    ctx.strokeStyle = shade(c, -0.35, 0.6);
    ctx.lineWidth = lw;
    for (let i = 1; i < 16; i += 1) { const u = -side + (2 * side * i) / 16; ctx.beginPath(); ctx.moveTo(X(u), Y(bottom(u) - 0.14)); ctx.lineTo(X(u), Y(bottom(u) - 0.02)); ctx.stroke(); }
    ctx.strokeStyle = shade(c, -0.3, 0.8); // the fold's top edge
    ctx.lineWidth = lw * 1.2;
    ctx.beginPath();
    for (let i = 0; i <= 24; i += 1) { const u = -side + (2 * side * i) / 24; ctx.lineTo(X(u), Y(bottom(u) - 0.16)); }
    ctx.stroke();
    ctx.restore();
    // The pom-pom.
    ctx.fillStyle = look.accent2;
    ctx.beginPath();
    for (let i = 0; i < 10; i += 1) { const a = (i / 10) * Math.PI * 2; ctx.moveTo(X(0) + Math.cos(a) * rx * 0.14, Y(top) + Math.sin(a) * rx * 0.14); ctx.arc(X(0) + Math.cos(a) * rx * 0.1, Y(top) + Math.sin(a) * rx * 0.1, rx * 0.07, 0, Math.PI * 2); }
    ctx.fill();
  }
  if (has('hat')) { // a round bowler with a ribbon (owner 2026-10-28: it must sit ON the head for every hair style)
    // Built like the beanie: the crown hugs the head's own outline, and the ribbon and brim follow the hairline
    // curve down towards the ears, so there is never a gap of wall between the hat and a bald or short-haired head.
    const c = look.accent;
    // B104: on an afro the head-sized crown sank into the curl cloud (curls bulged out on both sides nearly to its top).
    // There the crown is the same oval as the cloud (as the beanie, see above) and the brim is wider, so the curls
    // only puff out below the brim at the sides.
    const afro = look.hairStyle === 'afro';
    const oV = -0.4; // the afro oval's middle, its half width and half height (as the beanie's)
    const oA = 1.27;
    const oB = 0.85 + (0.2 * rx) / ry;
    // The angle on the afro oval at height v (negative = above its middle).
    const oAngle = (v) => Math.asin(Math.max(-0.95, Math.min(0.95, (v - oV) / oB)));
    // Where the hat meets the head at x-unit u: a gentler curve than the hairline and never below it (bumps stay
    // below the hairline, so none is covered). On an afro it follows the brim all the way out to the cloud's side.
    const edge = (u) => f.features.hairTop + 0.2 * (afro ? u * u : Math.min(1, u * u));
    let cw = 0.9; // half the crown width at the ribbon, in rx units (a little wider than the head there)
    for (let i = 0; afro && i < 6; i += 1) cw = oA * Math.cos(oAngle(edge(cw) - 0.04)); // on an afro: the cloud's side
    // The brim's top edge at u: one smooth arch along the hat's edge that droops a little past the head (no curl: a
    // curl only works on a tall forehead, and the hat has to stay above the hairline).
    const brimTop = (u) => f.features.hairTop + 0.2 * u * u - 0.06;
    const tip = afro ? cw + 0.2 : 1.2; // half the brim width (on an afro a little past the crown)
    // How thick the brim looks at u: thickest in front, thinner at the tips.
    const brimThick = (u) => 0.12 - 0.09 * Math.min(1, Math.max(0, (Math.abs(u) * 1.2) / tip - 0.6) / 0.6) ** 1.5; // soft tips, no square cut
    // The crown's outline: along the hat's edge from left to right, then over the top of a taller copy of the head
    // (on an afro: over the top of the curl cloud's oval).
    const crown = () => {
      ctx.beginPath();
      for (let i = 0; i <= 24; i += 1) { const u = -cw + (2 * cw * i) / 24; ctx.lineTo(X(u), Y(edge(u) - 0.04)); }
      if (afro) { const a0 = oAngle(edge(cw) - 0.04); ctx.ellipse(X(0), Y(oV), oA * rx, oB * ry, 0, a0, Math.PI - a0, true); } else topArc(ctx, f, edge(cw) - 0.04, cw + 0.02, 1.34, -0.02);
      ctx.closePath();
    };
    // A soft shadow the brim throws on the hair and forehead, just under its front.
    ctx.fillStyle = 'rgba(60,30,30,0.16)';
    ctx.beginPath();
    for (let i = 0; i <= 20; i += 1) { const u = -0.9 + (1.8 * i) / 20; ctx.lineTo(X(u), Y(brimTop(u) + brimThick(u) - 0.01)); }
    for (let i = 20; i >= 0; i -= 1) { const u = -0.9 + (1.8 * i) / 20; ctx.lineTo(X(u), Y(brimTop(u) + brimThick(u) + 0.05 * (1 - u * u))); }
    ctx.closePath();
    ctx.fill();
    // The crown, lit from the left.
    crown();
    const g = ctx.createLinearGradient(X(-cw), 0, X(cw), 0);
    g.addColorStop(0, shade(c, 0.12));
    g.addColorStop(1, shade(c, -0.2));
    ctx.fillStyle = g;
    ctx.fill();
    // The ribbon: a band round the bottom of the crown that follows the same curve as the brim, cut to the crown.
    ctx.save();
    crown();
    ctx.clip();
    const rw = Math.max(1.1, cw + 0.1); // how far out the ribbon is drawn (it is cut to the crown)
    ctx.beginPath();
    for (let i = 0; i <= 24; i += 1) { const u = -rw + (2 * rw * i) / 24; ctx.lineTo(X(u), Y(brimTop(u) - 0.15)); }
    for (let i = 24; i >= 0; i -= 1) { const u = -rw + (2 * rw * i) / 24; ctx.lineTo(X(u), Y(brimTop(u) + 0.02)); }
    ctx.closePath();
    ctx.fillStyle = look.accent2;
    ctx.fill();
    ctx.strokeStyle = shade(look.accent2, -0.3, 0.7); // its top edge, so it reads as wrapped round the hat
    ctx.lineWidth = lw;
    ctx.beginPath();
    for (let i = 0; i <= 24; i += 1) { const u = -rw + (2 * rw * i) / 24; ctx.lineTo(X(u), Y(brimTop(u) - 0.15)); }
    ctx.stroke();
    ctx.restore();
    // The brim: a curved band in front of the ribbon, curling up at both tips, with a lighter top edge.
    ctx.beginPath();
    for (let i = 0; i <= 32; i += 1) { const u = -tip + (2 * tip * i) / 32; ctx.lineTo(X(u), Y(brimTop(u))); }
    for (let i = 32; i >= 0; i -= 1) { const u = -tip + (2 * tip * i) / 32; ctx.lineTo(X(u), Y(brimTop(u) + brimThick(u))); }
    ctx.closePath();
    ctx.fillStyle = shade(c, -0.22);
    ctx.fill();
    ctx.strokeStyle = shade(c, 0.08);
    ctx.lineWidth = lw * 1.3;
    ctx.lineCap = 'round';
    ctx.beginPath();
    for (let i = 1; i < 32; i += 1) { const u = -tip + (2 * tip * i) / 32; ctx.lineTo(X(u), Y(brimTop(u) + 0.01)); }
    ctx.stroke();
    // A shine on the dome.
    ctx.strokeStyle = 'rgba(255,255,255,0.4)';
    ctx.lineWidth = rx * 0.04;
    ctx.beginPath(); // on the dome's upper left, inside the crown
    if (afro) ctx.ellipse(X(0), Y(oV), oA * rx * 0.8, oB * ry * 0.78, 0, -2.55, -1.95); // the big dome: along its curve
    else {
      ctx.moveTo(X(-0.62), Y(edge(0) - 0.2));
      ctx.quadraticCurveTo(X(-0.55), Y(edge(0) - 0.36), X(-0.3), Y(edge(0) - 0.42));
    }
    ctx.stroke();
  }
  if (has('pilot-cap')) { // navy captain's cap: crown, gold-braided band, shiny visor and a winged badge
    // Owner 2026-10-28: it sat flat on top of bald and mohawk heads with wall showing under it. Now built like the
    // beanie: the band follows the hairline curve down towards the ears, so the cap sits ON every head.
    const bandBottom = (u) => hairline(f, Math.max(-1, Math.min(1, u))) - 0.03; // at the hairline (bumps stay below it)
    const bandTop = (u) => bandBottom(u) - 0.15; // the band's top edge at u
    const top = f.features.hairTop - 0.6; // the crown's flat top
    const cw = 1.0; // half the band width
    // The crown: up from the band's ends, bulging out a little (a captain's cap is wider on top), across the top.
    ctx.fillStyle = '#2c3a66';
    ctx.beginPath();
    ctx.moveTo(X(-cw), Y(bandTop(-cw) + 0.02));
    ctx.bezierCurveTo(X(-1.24), Y(bandTop(-cw) - 0.2), X(-1.22), Y(top), X(0), Y(top));
    ctx.bezierCurveTo(X(1.22), Y(top), X(1.24), Y(bandTop(cw) - 0.2), X(cw), Y(bandTop(cw) + 0.02));
    for (let i = 12; i >= 0; i -= 1) { const u = -cw + (2 * cw * i) / 12; ctx.lineTo(X(u), Y(bandTop(u) + 0.02)); }
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.12)'; // a soft sheen on the top
    ctx.beginPath(); ctx.ellipse(X(-0.35), Y(top + 0.1), rx * 0.45, ry * 0.06, -0.08, 0, Math.PI * 2); ctx.fill();
    // The band, curved like the head, with a gold braid along it.
    ctx.fillStyle = '#1d2747';
    ctx.beginPath();
    for (let i = 0; i <= 16; i += 1) { const u = -cw + (2 * cw * i) / 16; ctx.lineTo(X(u), Y(bandTop(u))); }
    for (let i = 16; i >= 0; i -= 1) { const u = -cw + (2 * cw * i) / 16; ctx.lineTo(X(u), Y(bandBottom(u))); }
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#e8c04a';
    ctx.lineWidth = lw * 1.4;
    ctx.beginPath();
    for (let i = 0; i <= 16; i += 1) { const u = -cw * 0.98 + (1.96 * cw * i) / 16; ctx.lineTo(X(u), Y(bandBottom(u) - 0.075)); }
    ctx.stroke();
    // Visor: a black glossy crescent along the front of the band, just above the hairline.
    ctx.fillStyle = '#15161c';
    ctx.beginPath();
    for (let i = 0; i <= 12; i += 1) { const u = -0.72 + (1.44 * i) / 12; ctx.lineTo(X(u), Y(bandBottom(u) - 0.01)); }
    ctx.quadraticCurveTo(X(0), Y(f.features.hairTop + 0.09), X(-0.72), Y(bandBottom(-0.72) - 0.01));
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.35)';
    ctx.lineWidth = lw;
    ctx.beginPath(); ctx.moveTo(X(-0.4), Y(bandBottom(-0.4) + 0.02)); ctx.quadraticCurveTo(X(0), Y(bandBottom(0) + 0.06), X(0.4), Y(bandBottom(0.4) + 0.02)); ctx.stroke();
    // Badge with wings, on the front of the crown above the band.
    const by = bandTop(0) - 0.09;
    ctx.fillStyle = '#f2cc55';
    for (const s of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(X(s * 0.06), Y(by - 0.02));
      ctx.quadraticCurveTo(X(s * 0.3), Y(by - 0.1), X(s * 0.42), Y(by - 0.08));
      ctx.quadraticCurveTo(X(s * 0.25), Y(by + 0.02), X(s * 0.06), Y(by + 0.04));
      ctx.fill();
    }
    ctx.beginPath(); ctx.arc(X(0), Y(by), rx * 0.07, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#c0392b';
    ctx.beginPath(); ctx.arc(X(0), Y(by), rx * 0.035, 0, Math.PI * 2); ctx.fill();
  }
  if (has('headband')) drawHeadband(ctx, f, look);
  if (has('tiara')) { // a small golden crown with a pink gem, resting on the hairline (R7: it used to float above bald and short heads)
    const drop = look.hairStyle === 'bald' || look.hairStyle === 'mohawk' ? 0.09 : 0; // a bare head: sit lower, on the dome
    // The tiara's lower edge at u: just above the hairline, so it follows the curve of the head.
    const base = (u) => hairline(f, u) - 0.03 + drop;
    // Peak heights above the base at each u (the ends are short, the points between them are tall).
    const pts = [[-0.42, 0.13], [-0.26, 0.2], [-0.14, 0.33], [0, 0.22], [0.14, 0.33], [0.26, 0.2], [0.42, 0.13]];
    ctx.beginPath();
    ctx.moveTo(X(-0.42), Y(base(-0.42)));
    for (const [u, h] of pts) ctx.lineTo(X(u), Y(base(u) - h));
    ctx.lineTo(X(0.42), Y(base(0.42)));
    for (let i = 10; i >= 0; i -= 1) { const u = -0.42 + (0.84 * i) / 10; ctx.lineTo(X(u), Y(base(u) + 0.02)); }
    ctx.closePath();
    const g = ctx.createLinearGradient(0, Y(base(0) - 0.34), 0, Y(base(0)));
    g.addColorStop(0, '#fff2a8');
    g.addColorStop(1, '#d9a520');
    ctx.fillStyle = g;
    ctx.fill();
    ctx.strokeStyle = '#b07d12';
    ctx.lineWidth = Math.max(1, lw * 0.6);
    ctx.stroke();
    ctx.fillStyle = '#f06aa8';
    ctx.beginPath(); ctx.arc(X(0), Y(base(0) - 0.05), rx * 0.05, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#7fd4f0';
    for (const s of [-1, 1]) { ctx.beginPath(); ctx.arc(X(s * 0.24), Y(base(0.24) - 0.03), rx * 0.03, 0, Math.PI * 2); ctx.fill(); }
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.beginPath(); ctx.arc(X(-0.02), Y(base(0) - 0.065), rx * 0.016, 0, Math.PI * 2); ctx.fill();
  }
  if (has('veil')) { // the front of the veil: a pearl band on top of the head
    // On a bare head (bald, mohawk) the band sits on the dome itself (owner 2026-10-28: it floated above it).
    const bare = look.hairStyle === 'bald' || look.hairStyle === 'mohawk';
    ctx.fillStyle = '#fffaf0';
    for (let i = 0; i <= 10; i += 1) {
      const u = -0.6 + (1.2 * i) / 10;
      const v = bare ? headTopV(f, u) + 0.05 : -1.06 + 0.12 * u * u;
      ctx.beginPath();
      ctx.arc(X(u), Y(v), rx * 0.04, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  if (has('flower')) { // tucked into the hair above the right temple (B56: pulled in onto the head, so it never floats)
    const [fu, fv] = flowerSpot(f.features.shape, look.hairStyle);
    drawFlower(ctx, X(fu), Y(fv), rx * 0.2, look.accent2);
  }
}

/** Hair style -> how far its outline reaches past the head outline [across, up and down] (B56: where a band over
 * the hair must end so it seems to go round the back of the head instead of sticking out into the air). */
const HAIR_REACH = { bald: [1, 1], mohawk: [1, 1], curly: [1.1, 1.16], afro: [1.08, 1.16], long: [1.1, 1.14] };

/**
 * Whether a point (in face units) lies inside the head outline scaled by sx and sy (B56).
 * @param {string} shape the head shape id
 * @param {number} u across, face units
 * @param {number} v down, face units
 * @param {number} sx scale across
 * @param {number} sy scale up and down
 * @returns {boolean} true = inside
 */
export function insideHeadOutline(shape, u, v, sx, sy) {
  return Math.hypot(u / sx, v / sy) <= headReach(shape, Math.atan2(v / sy, u / sx));
}

/**
 * Where the flower sits (B56), in face units: above the right temple, tucked into the edge of the hair, or pulled in
 * onto a bare head (bald, mohawk) so it never hangs in the air beside the dome.
 * @param {string} shape the head shape id
 * @param {string} hairStyle the hair style id
 * @returns {number[]} [u, v] its centre
 */
export function flowerSpot(shape, hairStyle) {
  if (hairStyle !== 'bald' && hairStyle !== 'mohawk') return [0.8, -0.82]; // in the hair's edge, as it always was
  const t = Math.atan2(-0.82, 0.8); // the same direction, pulled in onto the bare head
  const k = Math.min(Math.hypot(0.8, 0.82), headReach(shape, t) * 0.95); // logic.js keeps bumps off it
  return [k * Math.cos(t), k * Math.sin(t)];
}

/**
 * Where the headband lies (B56), in face units: its upper and lower edge at each u, and how far it reaches to each
 * side before it disappears round the back of the hair (or the bald head). Bald heads and mohawks wear it right on
 * the hairline (no hair to show under it). It never reaches below the hairline, so it never covers a bump.
 * @param {object} f the face geometry
 * @param {string} hairStyle the hair style id
 * @returns {{top: (u: number) => number, bottom: (u: number) => number, reach: [number, number], end: number}}
 *   the edges, the scale of the outline it is cut to, and the u where its middle line leaves that outline (> 0)
 */
export function headbandPath(f, hairStyle) {
  const reach = HAIR_REACH[hairStyle] ?? [1.07, 1.12];
  const bare = hairStyle === 'bald' || hairStyle === 'mohawk';
  const ft = f.features;
  // The lower edge at u: just above the hairline (hugging the dome on a bare head).
  const bottom = (u) => hairline(f, u) - (bare ? 0.01 : 0.04);
  // The upper edge at u.
  const top = (u) => bottom(u) - 0.11;
  let end = 0;
  for (let u = 0; u <= 1.4; u += 0.01) {
    if (!insideHeadOutline(ft.shape, u, (top(u) + bottom(u)) / 2, reach[0] - 0.02, reach[1] - 0.02)) break;
    end = u;
  }
  return { top, bottom, reach, end };
}

/**
 * The headband (B56): a stretchy band over the hair along the hairline. It is cut to the outline of the hair (or of
 * the head when bald), and darkens towards its ends, so it reads as going round the back of the head; a little bow
 * sits on it on the left, always on the band.
 * @param {CanvasRenderingContext2D} ctx the context
 * @param {object} f the face geometry
 * @param {object} look the face look
 * @returns {void}
 */
function drawHeadband(ctx, f, look) {
  const { cx, cy, rx, ry } = f;
  // Turns a face x-unit (u) into a canvas x position.
  const X = (u) => cx + u * rx;
  // Turns a face y-unit (v) into a canvas y position.
  const Y = (v) => cy + v * ry;
  const c = look.accent;
  const band = headbandPath(f, look.hairStyle);
  const n = 32;
  ctx.save();
  ctx.beginPath(); // the outline it is cut to
  for (let i = 0; i < 96; i += 1) {
    const [x, y] = headPoint(f, (i / 96) * Math.PI * 2, band.reach[0] - 0.01, band.reach[1] - 0.01);
    if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y);
  }
  ctx.closePath();
  ctx.clip();
  ctx.beginPath();
  for (let i = 0; i <= n; i += 1) { const u = -1.4 + (2.8 * i) / n; ctx.lineTo(X(u), Y(band.top(u))); }
  for (let i = n; i >= 0; i -= 1) { const u = -1.4 + (2.8 * i) / n; ctx.lineTo(X(u), Y(band.bottom(u))); }
  ctx.closePath();
  const g = ctx.createLinearGradient(X(-band.end), 0, X(band.end), 0); // rounds away at both ends
  g.addColorStop(0, shade(c, -0.35));
  g.addColorStop(0.2, shade(c, 0.05));
  g.addColorStop(0.45, shade(c, 0.12));
  g.addColorStop(0.8, c);
  g.addColorStop(1, shade(c, -0.4));
  ctx.fillStyle = g;
  ctx.fill();
  ctx.strokeStyle = shade(c, -0.35, 0.8);
  ctx.lineWidth = Math.max(1, rx * 0.012);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(255,255,255,0.55)'; // the stretchy stitch line
  ctx.lineWidth = Math.max(1.2, rx * 0.014);
  ctx.beginPath();
  for (let i = 0; i <= n; i += 1) { const u = -1.4 + (2.8 * i) / n; ctx.lineTo(X(u), Y((band.top(u) + band.bottom(u)) / 2)); }
  ctx.stroke();
  ctx.restore();
  // The bow, on the band two thirds of the way out on the left, tilted with it.
  const ku = -0.62 * band.end;
  const kv = (band.top(ku) + band.bottom(ku)) / 2;
  const slope = Math.atan2((band.bottom(ku + 0.02) - band.bottom(ku - 0.02)) * ry, 0.04 * rx);
  ctx.save();
  ctx.translate(X(ku), Y(kv));
  ctx.rotate(slope);
  ctx.fillStyle = shade(c, -0.08);
  ctx.strokeStyle = shade(c, -0.4, 0.8);
  ctx.lineWidth = Math.max(1, rx * 0.01);
  for (const s of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.bezierCurveTo(s * rx * 0.08, -ry * 0.09, s * rx * 0.17, -ry * 0.06, s * rx * 0.15, 0);
    ctx.bezierCurveTo(s * rx * 0.17, ry * 0.06, s * rx * 0.08, ry * 0.09, 0, 0);
    ctx.fill();
    ctx.stroke();
  }
  ctx.fillStyle = shade(c, -0.2);
  ctx.beginPath();
  ctx.ellipse(0, 0, rx * 0.035, ry * 0.04, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

/**
 * A five-petal flower with a yellow centre.
 * @param {CanvasRenderingContext2D} ctx the context
 * @param {number} x centre x
 * @param {number} y centre y
 * @param {number} r flower radius
 * @param {string} colour petal colour
 * @returns {void}
 */
function drawFlower(ctx, x, y, r, colour) {
  ctx.fillStyle = colour;
  ctx.strokeStyle = shade(colour, -0.3, 0.6);
  ctx.lineWidth = Math.max(1, r * 0.05);
  for (let i = 0; i < 5; i += 1) {
    const a = (i / 5) * Math.PI * 2 - Math.PI / 2;
    ctx.beginPath();
    ctx.ellipse(x + Math.cos(a) * r * 0.52, y + Math.sin(a) * r * 0.52, r * 0.42, r * 0.3, a, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }
  ctx.fillStyle = '#ffd34d';
  ctx.beginPath(); ctx.arc(x, y, r * 0.28, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  ctx.beginPath(); ctx.arc(x - r * 0.08, y - r * 0.08, r * 0.08, 0, Math.PI * 2); ctx.fill();
}

/**
 * Things worn below the face: a scarf round the neck and a bowtie on the collar.
 * @param {CanvasRenderingContext2D} ctx the context
 * @param {object} f the face geometry
 * @param {object} look the face look
 * @returns {void}
 */
function drawNeckwear(ctx, f, look) {
  const { cx, cy, rx, ry } = f;
  // Turns a face x-unit (u) into a canvas x position.
  const X = (u) => cx + u * rx;
  // Turns a face y-unit (v) into a canvas y position.
  const Y = (v) => cy + v * ry;
  if (look.acc.includes('scarf')) {
    const c = look.accent;
    ctx.fillStyle = c;
    ctx.beginPath();
    ctx.moveTo(X(-0.62), Y(0.92));
    ctx.quadraticCurveTo(X(0), Y(1.02), X(0.62), Y(0.92));
    ctx.quadraticCurveTo(X(0.78), Y(1.1), X(0.6), Y(1.24));
    ctx.quadraticCurveTo(X(0), Y(1.34), X(-0.6), Y(1.24));
    ctx.quadraticCurveTo(X(-0.78), Y(1.1), X(-0.62), Y(0.92));
    ctx.fill();
    ctx.beginPath(); // the hanging end
    ctx.moveTo(X(-0.45), Y(1.15));
    ctx.lineTo(X(-0.15), Y(1.18));
    ctx.lineTo(X(-0.2), Y(1.75));
    ctx.lineTo(X(-0.5), Y(1.72));
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = look.accent2;
    ctx.lineWidth = rx * 0.05;
    for (const v of [1.4, 1.58]) { ctx.beginPath(); ctx.moveTo(X(-0.47), Y(v)); ctx.lineTo(X(-0.18), Y(v + 0.01)); ctx.stroke(); }
    ctx.strokeStyle = 'rgba(255,255,255,0.3)';
    ctx.lineWidth = rx * 0.025;
    ctx.beginPath(); ctx.moveTo(X(-0.5), Y(1.04)); ctx.quadraticCurveTo(X(0), Y(1.13), X(0.5), Y(1.04)); ctx.stroke();
  }
  if (look.acc.includes('bowtie')) {
    const y = Y(f.features.shape === 'heart' ? 1.2 : 1.14);
    const c = look.accent;
    ctx.fillStyle = c;
    for (const s of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(X(0), y);
      ctx.lineTo(X(s * 0.36), y - ry * 0.11);
      ctx.quadraticCurveTo(X(s * 0.42), y, X(s * 0.36), y + ry * 0.11);
      ctx.closePath();
      ctx.fill();
    }
    ctx.fillStyle = 'rgba(255,255,255,0.75)';
    for (const [u, dv] of [[-0.24, -0.04], [-0.17, 0.05], [0.2, -0.03], [0.27, 0.05]]) { ctx.beginPath(); ctx.arc(X(u), y + dv * ry, rx * 0.025, 0, Math.PI * 2); ctx.fill(); }
    ctx.fillStyle = shade(c, -0.2);
    ctx.beginPath(); ctx.ellipse(X(0), y, rx * 0.07, ry * 0.065, 0, 0, Math.PI * 2); ctx.fill();
  }
}

/**
 * Ears, with earrings when the face has them.
 * @param {CanvasRenderingContext2D} ctx the context
 * @param {object} f the face geometry
 * @param {object} look the face look
 * @returns {void}
 */
function drawEars(ctx, f, look) {
  const { cx, cy, rx, ry } = f;
  const c = rgbOf(look.skin);
  const deep = skinDeep(look.skin);
  const lit = skinLit(look.skin);
  for (const s of [-1, 1]) {
    const x = cx + s * rx * 0.98;
    const y = cy - ry * 0.02;
    const w = rx * 0.17;
    const h = ry * 0.2;
    // The ear: shaded where it tucks in behind the head, lighter on its outer edge (more on the lit left side).
    const g = ctx.createLinearGradient(x - s * w, 0, x + s * w, 0);
    g.addColorStop(0, css(mixRgb(c, deep, 0.4)));
    g.addColorStop(0.5, css(mixRgb(c, deep, 0.08)));
    g.addColorStop(1, css(mixRgb(c, lit, s < 0 ? 0.14 : 0.02)));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.ellipse(x, y, w, h, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = css(deep, 0.35);
    ctx.lineWidth = Math.max(1, rx * 0.01);
    ctx.stroke();
    // The bowl inside, darkest in its middle.
    const bx = x + s * w * 0.1;
    const by = y + h * 0.06;
    const bowl = ctx.createRadialGradient(bx, by, 0, bx, by, w * 0.55);
    bowl.addColorStop(0, css(deep, 0.6));
    bowl.addColorStop(1, css(deep, 0.12));
    ctx.fillStyle = bowl;
    ctx.beginPath();
    ctx.ellipse(bx, by, w * 0.44, h * 0.56, 0, 0, Math.PI * 2);
    ctx.fill();
    // The rim (helix) and the soft ridge inside it catch the light.
    ctx.lineCap = 'round';
    ctx.strokeStyle = css(lit, s < 0 ? 0.4 : 0.2);
    ctx.lineWidth = Math.max(1, rx * 0.02);
    ctx.beginPath();
    ctx.ellipse(x, y, w * 0.8, h * 0.84, 0, s < 0 ? Math.PI * 0.62 : -Math.PI * 0.45, s < 0 ? Math.PI * 1.45 : Math.PI * 0.38);
    ctx.stroke();
    ctx.strokeStyle = css(lit, 0.22);
    ctx.lineWidth = Math.max(1, rx * 0.012);
    ctx.beginPath();
    ctx.ellipse(bx + s * w * 0.12, by, w * 0.34, h * 0.46, 0, s < 0 ? Math.PI * 0.75 : -Math.PI * 0.25, s < 0 ? Math.PI * 1.25 : Math.PI * 0.25);
    ctx.stroke();
  }
}

/**
 * Earrings: a gold stud with a hanging drop on each ear lobe (drawn over the hair so they show with long hair too).
 * @param {CanvasRenderingContext2D} ctx the context
 * @param {object} f the face geometry
 * @param {object} look the face look
 * @returns {void}
 */
function drawEarrings(ctx, f, look) {
  if (!look.acc.includes('earrings')) return;
  const { cx, cy, rx, ry } = f;
  for (const s of [-1, 1]) {
    const x = cx + s * rx * 1.04;
    const y = cy + ry * 0.16;
    ctx.strokeStyle = '#d9a520';
    ctx.lineWidth = Math.max(1.5, rx * 0.02);
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y + ry * 0.07); ctx.stroke();
    const g = ctx.createRadialGradient(x - rx * 0.02, y + ry * 0.1, 0, x, y + ry * 0.12, rx * 0.07);
    g.addColorStop(0, '#fff6c9');
    g.addColorStop(1, '#d9a520');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(x, y + ry * 0.12, rx * 0.06, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#f2cc55';
    ctx.beginPath(); ctx.arc(x, y, rx * 0.03, 0, Math.PI * 2); ctx.fill();
  }
}

/** Eye style -> [white height / width, iris radius / width, upper lid that is always there (0..1)]. */
const EYE_SHAPES = {
  round: [0.62, 0.46, 0], wide: [0.82, 0.36, 0], sleepy: [0.6, 0.44, 0.45], sparkly: [0.74, 0.56, 0], squint: [0.36, 0.42, 0.1], tiny: [0, 0, 0],
};
/** Mood -> how far the upper lid comes down (0..1). Grim is not here: it keeps the eyes wide open and slants the lid instead. */
const MOOD_LID = { meh: 0.18, relief: 0.06, glowing: 0, ow: 0 };

/**
 * One eye in the face's style and mood: happy closed arcs when glowing, squeezed shut (> <) when it hurts, asleep, or
 * open: a soft lid crease, a shaded eye white, a ringed iris with fine lines, the pupil and two catchlights, the upper
 * lid's shadow on the eyeball, the lid itself (sleepy, a stern slanted lid when grim, a lift from below in relief), a
 * soft lower lash line and the upper lash line with a flick at the outer corner.
 * The idle life (makeFaceLife) draws the same eye again over the picture with the iris moved (a glance) or the lid
 * coming down (a blink); `over` then leaves out the see-through crease, which the picture already has.
 * @param {CanvasRenderingContext2D} ctx the context
 * @param {number} x centre x
 * @param {number} y centre y
 * @param {number} s size (half the eye width)
 * @param {string} style the eye style id
 * @param {string} mood the mood
 * @param {number} side -1 = left eye, 1 = right eye
 * @param {string} iris iris colour
 * @param {string} skin skin colour (the lids are made from it)
 * @param {{gx?: number, gy?: number, blink?: number, over?: boolean}} [o] where the eye looks (iris shift in eye
 *   half-widths and heights), how far a blink has closed it (0..1), and whether it is drawn over the picture
 * @returns {void}
 */
function drawEye(ctx, x, y, s, style, mood, side, iris, skin, o = {}) {
  const gx = o.gx ?? 0;
  const gy = o.gy ?? 0;
  const blink = Math.max(0, Math.min(1, o.blink ?? 0));
  const ink = '#2e211c';
  const deep = skinDeep(skin);
  const lidC = css(mixRgb(rgbOf(skin), deep, 0.2)); // as dark as the shaded skin round the eye, so a blink blends in
  const size = style === 'tiny' ? s * 1.6 : s; // closed tiny eyes are drawn as big as the others, so the mood reads
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  if (mood === 'glowing') { // happy closed arcs with two little lashes at the outer end
    ctx.strokeStyle = ink;
    ctx.lineWidth = Math.max(2, size * 0.17);
    ctx.beginPath();
    ctx.arc(x, y + size * 0.3, size * 0.7, Math.PI * 1.15, Math.PI * 1.85);
    ctx.stroke();
    const a = side > 0 ? Math.PI * 1.85 : Math.PI * 1.15;
    const ex = x + Math.cos(a) * size * 0.7;
    const ey = y + size * 0.3 + Math.sin(a) * size * 0.7;
    ctx.lineWidth = Math.max(1.2, size * 0.08);
    for (const k of [0, 1]) {
      ctx.beginPath();
      ctx.moveTo(ex - side * size * 0.06 * k, ey - size * 0.05 * k);
      ctx.lineTo(ex + side * size * 0.2, ey - size * (0.08 + 0.14 * k));
      ctx.stroke();
    }
    return;
  }
  if (mood === 'sleep') { // fast asleep: a relaxed shut lid, a soft curve sagging down with three little lashes
    ctx.strokeStyle = ink;
    ctx.lineWidth = Math.max(2, size * 0.16);
    ctx.beginPath();
    ctx.arc(x, y - size * 0.35, size * 0.75, Math.PI * 0.18, Math.PI * 0.82);
    ctx.stroke();
    ctx.lineWidth = Math.max(1.4, size * 0.09);
    for (const k of [-0.45, 0, 0.45]) {
      const a = Math.PI * 0.5 - k;
      const lx = x + Math.cos(a) * size * 0.75;
      const ly = y - size * 0.35 + Math.sin(a) * size * 0.75;
      ctx.beginPath(); ctx.moveTo(lx, ly); ctx.lineTo(lx + Math.cos(a) * size * 0.22, ly + Math.sin(a) * size * 0.22); ctx.stroke();
    }
    return;
  }
  if (mood === 'ow') {
    ctx.strokeStyle = ink;
    ctx.lineWidth = Math.max(2, size * 0.18);
    ctx.beginPath();
    ctx.moveTo(x + side * size * 0.65, y - size * 0.42);
    ctx.lineTo(x - side * size * 0.55, y);
    ctx.lineTo(x + side * size * 0.65, y + size * 0.42);
    ctx.stroke();
    return;
  }
  if (style === 'tiny') { // dot eyes
    if (blink > 0.4) { // a blink: the dot is covered by its lid and a little closed curve shows
      ctx.fillStyle = lidC;
      ctx.beginPath(); ctx.ellipse(x, y, s * 0.62, s * 0.78, 0, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = ink;
      ctx.lineWidth = Math.max(1.5, s * 0.22);
      ctx.beginPath(); ctx.arc(x, y - s * 0.3, s * 0.5, Math.PI * 0.22, Math.PI * 0.78); ctx.stroke();
      return;
    }
    if (o.over) return; // nothing else moves on a dot eye
    const dg = ctx.createRadialGradient(x - s * 0.12, y - s * 0.18, s * 0.05, x, y, s * 0.6);
    dg.addColorStop(0, '#4a3a33');
    dg.addColorStop(1, '#1e1714');
    ctx.fillStyle = dg;
    ctx.beginPath();
    ctx.ellipse(x, y, s * 0.42, s * 0.55, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(x - s * 0.12, y - s * 0.2, s * 0.15, 0, Math.PI * 2); ctx.fill();
    const drop = MOOD_LID[mood] ?? 0;
    if (mood === 'grim') { // a stern lid: a straight line slanted down towards the nose, the dot stays open
      const yOut = y - s * 0.6;
      const yIn = y - s * 0.12;
      ctx.fillStyle = lidC;
      ctx.beginPath();
      ctx.moveTo(x - side * s * 0.7, yIn);
      ctx.lineTo(x + side * s * 0.7, yOut);
      ctx.lineTo(x + side * s * 0.7, y - s * 1.0);
      ctx.lineTo(x - side * s * 0.7, y - s * 1.0);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = ink;
      ctx.lineWidth = Math.max(1.5, s * 0.22);
      ctx.beginPath(); ctx.moveTo(x - side * s * 0.66, yIn); ctx.lineTo(x + side * s * 0.66, yOut); ctx.stroke();
    } else if (drop > 0.1) { // a droopy lid line across the top of the dot
      ctx.fillStyle = lidC;
      ctx.fillRect(x - s * 0.6, y - s * 0.75, s * 1.2, s * (0.3 + drop));
      ctx.strokeStyle = ink;
      ctx.lineWidth = Math.max(1.5, s * 0.22);
      ctx.beginPath(); ctx.moveTo(x - s * 0.62, y - s * (0.45 - drop) - side * s * 0.12); ctx.lineTo(x + s * 0.62, y - s * (0.45 - drop) + side * s * 0.12); ctx.stroke();
    }
    return;
  }
  const [hk, ik, styleLid] = EYE_SHAPES[style] ?? EYE_SHAPES.round;
  const h = s * hk;
  const grim = mood === 'grim';
  const rest = grim ? Math.min(0.06 + styleLid * 0.25, 0.18) : Math.max(styleLid, MOOD_LID[mood] ?? 0); // grim: only a sliver, never half shut
  const shut = rest + (1 - rest) * blink; // a blink brings the upper lid all the way down
  const tiltFill = grim ? 0.42 : 0.1; // how steeply the lid slopes down towards the nose (in eye heights)
  const tiltLine = grim ? 0.34 : 0.08;
  const bowFill = grim ? 0.06 : 0.18; // how much the lid sags in the middle
  const bowLine = grim ? 0.05 : 0.16;
  const lidY = y - h + 2 * h * shut;
  /** The upper lid as the current path: from above the eye down to the lid line, k eye half-widths to each side. @param {number} k reach @returns {void} */
  const lidPath = (k) => {
    ctx.beginPath();
    ctx.moveTo(x - s * k, y - h * 1.2 - s * 0.2);
    ctx.lineTo(x + s * k, y - h * 1.2 - s * 0.2);
    ctx.lineTo(x + s * k, lidY - side * h * tiltFill);
    ctx.quadraticCurveTo(x, lidY + h * bowFill, x - s * k, lidY + side * h * tiltFill);
    ctx.closePath();
  };
  if (!o.over) { // the soft crease of the upper lid
    ctx.strokeStyle = css(deep, 0.3);
    ctx.lineWidth = Math.max(1, s * 0.075);
    ctx.beginPath();
    ctx.ellipse(x + side * s * 0.05, y + h * 0.2, s * 1.0, h * 1.25 + s * 0.28, 0, Math.PI * 1.15, Math.PI * 1.85);
    ctx.stroke();
  }
  if (blink > 0.02) { // a closing lid also covers the lash line it leaves behind, just outside the eye
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(x, y, s * 1.14, h + s * 0.16, 0, 0, Math.PI * 2);
    ctx.clip();
    ctx.fillStyle = lidC;
    lidPath(1.2);
    ctx.fill();
    ctx.restore();
  }
  // The eye white, a little shaded towards its corners.
  const wg = ctx.createRadialGradient(x - side * s * 0.05, y + h * 0.2, s * 0.1, x, y, s * 1.05);
  wg.addColorStop(0, '#fffefb');
  wg.addColorStop(0.6, '#f8f2ed');
  wg.addColorStop(1, '#dccdc6');
  ctx.fillStyle = wg;
  ctx.beginPath();
  ctx.ellipse(x, y, s, h, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.save();
  ctx.clip();
  const ix = x + side * s * 0.05 + gx * s;
  const iy = y + h * 0.08 + gy * h;
  const ir = s * ik;
  // The iris: light round the pupil, a dark ring at its edge, fine light lines.
  const g = ctx.createRadialGradient(ix, iy - ir * 0.2, ir * 0.05, ix, iy, ir);
  g.addColorStop(0, shade(iris, 0.42));
  g.addColorStop(0.45, shade(iris, 0.08));
  g.addColorStop(0.8, shade(iris, -0.25));
  g.addColorStop(1, shade(iris, -0.62));
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(ix, iy, ir, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = shade(iris, 0.5, 0.35);
  ctx.lineWidth = Math.max(0.6, ir * 0.07);
  ctx.beginPath();
  for (let k = 0; k < 12; k += 1) {
    const a = (k / 12) * Math.PI * 2 + 0.25;
    const r1 = ir * (k % 2 ? 0.76 : 0.88);
    ctx.moveTo(ix + Math.cos(a) * ir * 0.52, iy + Math.sin(a) * ir * 0.52);
    ctx.lineTo(ix + Math.cos(a) * r1, iy + Math.sin(a) * r1);
  }
  ctx.stroke();
  ctx.fillStyle = '#121820';
  ctx.beginPath(); ctx.arc(ix, iy, ir * 0.46, 0, Math.PI * 2); ctx.fill();
  // The upper lid's soft shadow on the eyeball.
  const top = y - h + 2 * h * rest;
  const sh = ctx.createLinearGradient(0, top, 0, top + h * 0.95);
  sh.addColorStop(0, 'rgba(70,36,30,0.34)');
  sh.addColorStop(1, 'rgba(70,36,30,0)');
  ctx.fillStyle = sh;
  ctx.fillRect(x - s, top, s * 2, h * 0.95);
  // Catchlights.
  ctx.fillStyle = '#fff';
  ctx.beginPath(); ctx.arc(ix - ir * 0.36, iy - ir * 0.38, ir * 0.25, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(ix + ir * 0.32, iy + ir * 0.3, ir * 0.1, 0, Math.PI * 2); ctx.fill();
  if (style === 'sparkly') { // a second big sparkle
    ctx.beginPath(); ctx.arc(ix + ir * 0.38, iy - ir * 0.3, ir * 0.15, 0, Math.PI * 2); ctx.fill();
  }
  // The soft lower lash line, just inside the eye's edge.
  ctx.strokeStyle = css(deep, 0.42);
  ctx.lineWidth = Math.max(1, s * 0.1);
  ctx.beginPath();
  ctx.ellipse(x, y, s, h, 0, Math.PI * 0.12, Math.PI * 0.88);
  ctx.stroke();
  // Lids: the upper lid comes down (sleepy, grim or a blink); a lower lid lifts in relief, like a smile in the eyes.
  ctx.fillStyle = lidC;
  if (shut > 0.02) { lidPath(1.1); ctx.fill(); }
  if (mood === 'relief') {
    ctx.beginPath();
    ctx.ellipse(x, y + h * 1.25, s * 1.15, h * 0.62, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
  // The lash line along the top of the open part, heavier at the outer corner, with a little flick.
  ctx.strokeStyle = ink;
  ctx.lineWidth = Math.max(1.5, s * 0.14);
  ctx.beginPath();
  if (shut > 0.02) {
    ctx.moveTo(x - s * 0.98, lidY + side * h * tiltLine);
    ctx.quadraticCurveTo(x, lidY + h * bowLine, x + s * 0.98, lidY - side * h * tiltLine);
  } else {
    ctx.ellipse(x, y, s, h, 0, Math.PI * 1.05, Math.PI * 1.95);
  }
  ctx.stroke();
  const ox = x + side * s * 0.97;
  const oy = shut > 0.02 ? lidY - h * tiltLine : y - h * 0.18;
  if (shut <= 0.02) { // heavier towards the outer corner
    ctx.lineWidth = Math.max(2, s * 0.2);
    ctx.beginPath();
    ctx.ellipse(x, y, s, h, 0, side > 0 ? Math.PI * 1.72 : Math.PI * 1.06, side > 0 ? Math.PI * 1.94 : Math.PI * 1.28);
    ctx.stroke();
  }
  ctx.lineWidth = Math.max(1.3, s * 0.11);
  ctx.beginPath();
  ctx.moveTo(ox - side * s * 0.06, oy + s * 0.02);
  ctx.lineTo(ox + side * s * 0.17, oy - s * 0.1);
  ctx.stroke();
  if ((style === 'sparkly' || style === 'wide') && blink < 0.3) { // little lashes at the outer corner
    ctx.lineWidth = Math.max(1.2, s * 0.09);
    const lx = x + side * s * 0.92;
    const ly = shut > 0.02 ? lidY - h * tiltLine : y - h * 0.35;
    for (const k of [0, 1]) { ctx.beginPath(); ctx.moveTo(lx - side * s * 0.1 * k, ly - k * s * 0.05); ctx.lineTo(lx + side * s * 0.22, ly - s * (0.18 + 0.12 * k)); ctx.stroke(); }
  }
}

/** Brow style -> [thickness, arch, how much the inner end is raised at rest] (rx units). */
const BROW_STYLES = {
  flat: [0.055, 0.015, 0], arched: [0.05, 0.075, 0], thick: [0.09, 0.03, 0], worried: [0.055, 0.03, 0.05], thin: [0.028, 0.05, 0],
};
/** Mood -> [inner end raised, whole brow raised, outer end lowered] (ry units). Grim lowers the brow and points it down towards the nose (stern), ow pleads, glowing lifts. */
const MOOD_BROWS = {
  grim: [-0.08, -0.015, -0.02], meh: [0, 0, 0], ow: [0.08, 0, 0.03], relief: [0, 0.02, 0], glowing: [0.01, 0.03, -0.01],
  sleep: [0.02, -0.01, 0.02],
};

/**
 * The colour of the brows and moustache: the customer's own hair colour, on bald heads too (B91: they used to be a
 * fixed brown there).
 * @param {object} look the face look
 * @returns {string} a '#rrggbb' colour
 */
function facialHair(look) {
  return look.hair;
}

/**
 * Both eyebrows in the face's style, tilted by the mood: a tapered shape (full near the nose, thin to a point at the
 * outer end) with fine hairs slanting up and outwards on top.
 * @param {CanvasRenderingContext2D} ctx the context
 * @param {object} f the face geometry
 * @param {object} look the face look
 * @param {string} mood the mood
 * @returns {void}
 */
function drawBrows(ctx, f, look, mood) {
  const { cx, cy, rx, ry, features: ft } = f;
  const [thick, arch, rest] = BROW_STYLES[look.brows] ?? BROW_STYLES.flat;
  const [inner, raise, outerDrop] = MOOD_BROWS[mood] ?? MOOD_BROWS.meh;
  const lift = Math.max(mood === 'grim' ? -0.09 : -0.05, Math.min(0.06, rest + inner)); // kept inside faceGeometry's eye box
  const lw = thick * rx;
  const col = facialHair(look);
  const body = shade(col, -0.28);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  for (const s of [-1, 1]) {
    const yIn = cy + ry * (ft.browV - lift - raise);
    const yOut = cy + ry * (ft.browV - raise + outerDrop);
    const xIn = cx + s * rx * (ft.eyeU - 0.17);
    const xOut = cx + s * rx * (ft.eyeU + 0.2);
    const qx = cx + s * rx * (ft.eyeU + 0.02);
    const qy = Math.min(yIn, yOut) - arch * rx * (mood === 'grim' ? 0.4 : 1); // grim brows are straighter
    /** A point on the brow's middle line. @param {number} t 0 = inner end .. 1 = outer end @returns {number[]} [x, y] */
    const at = (t) => [(1 - t) ** 2 * xIn + 2 * t * (1 - t) * qx + t * t * xOut, (1 - t) ** 2 * yIn + 2 * t * (1 - t) * qy + t * t * yOut];
    /** How thick the brow is. @param {number} t 0 = inner end .. 1 = outer end @returns {number} px */
    const width = (t) => lw * (t < 0.3 ? 0.8 + 0.2 * (t / 0.3) : 1 - 0.7 * ((t - 0.3) / 0.7) ** 1.2);
    const n = 14;
    const sideA = [];
    const sideB = [];
    for (let i = 0; i <= n; i += 1) {
      const t = i / n;
      const [px, py] = at(t);
      const [ax, ay] = at(Math.max(0, t - 0.02));
      const [bx, by] = at(Math.min(1, t + 0.02));
      const len = Math.hypot(bx - ax, by - ay) || 1;
      const nx = -(by - ay) / len;
      const ny = (bx - ax) / len;
      const half = width(t) / 2;
      sideA.push([px + nx * half, py + ny * half]);
      sideB.push([px - nx * half, py - ny * half]);
    }
    ctx.beginPath();
    sideA.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    for (let i = n; i >= 0; i -= 1) ctx.lineTo(sideB[i][0], sideB[i][1]);
    ctx.closePath();
    ctx.fillStyle = body;
    ctx.fill();
    ctx.strokeStyle = body; // rounds off the ends
    ctx.lineWidth = Math.max(0.8, lw * 0.2);
    ctx.stroke();
    // Fine hairs: lighter ones and darker ones, slanting up and outwards.
    ctx.lineWidth = Math.max(0.6, Math.min(lw * 0.1, rx * 0.007));
    for (const [hc, off] of [[shade(col, 0.12, 0.3), 0], [shade(col, -0.55, 0.4), 0.5]]) {
      ctx.strokeStyle = hc;
      ctx.beginPath();
      for (let k = 0; k < 9; k += 1) {
        const t = (k + 0.3 + off * 0.6) / 9.6;
        const [px, py] = at(t);
        const wv = width(t);
        ctx.moveTo(px - s * wv * 0.3, py + wv * 0.32);
        ctx.lineTo(px + s * wv * 0.45, py - wv * 0.42);
      }
      ctx.stroke();
    }
    if (look.brows === 'thick') { // a few hairs sticking out make it bushy
      ctx.strokeStyle = body;
      ctx.lineWidth = Math.max(1, lw * 0.25);
      for (const k of [0.25, 0.5, 0.75]) {
        const [x, y] = at(k);
        ctx.beginPath(); ctx.moveTo(x, y - lw * 0.3); ctx.lineTo(x + s * lw * 0.35, y - lw * 0.75); ctx.stroke();
      }
    }
  }
}

/**
 * The nose: the shaded side of the bridge, a soft shadow under the tip, a lit tip with a shine, the cartoon side line
 * running into the right nostril wing, the left wing, and the nostrils.
 * @param {CanvasRenderingContext2D} ctx the context
 * @param {object} f the face geometry
 * @param {string} base skin colour
 * @returns {void}
 */
function drawNose(ctx, f, base) {
  const { cx, cy, rx, ry, features: ft } = f;
  const nv = ft.noseV;
  const deep = skinDeep(base);
  const lit = skinLit(base);
  softSpot(ctx, cx + rx * 0.085, cy + ry * (nv - 0.13), rx * 0.055, ry * 0.17, deep, 0.2);
  softSpot(ctx, cx + rx * 0.01, cy + ry * (nv + 0.085), rx * 0.15, ry * 0.035, deep, 0.36);
  softSpot(ctx, cx - rx * 0.015, cy + ry * (nv - 0.015), rx * 0.09, ry * 0.055, lit, 0.24);
  ctx.lineCap = 'round';
  ctx.strokeStyle = css(deep, 0.45);
  ctx.lineWidth = rx * 0.03;
  ctx.beginPath();
  ctx.moveTo(cx + rx * 0.06, cy + ry * (nv - 0.26));
  ctx.quadraticCurveTo(cx + rx * 0.15, cy + ry * (nv - 0.06), cx + rx * 0.12, cy + ry * (nv + 0.04));
  ctx.stroke();
  ctx.strokeStyle = css(deep, 0.28);
  ctx.lineWidth = Math.max(1, rx * 0.018);
  ctx.beginPath();
  ctx.moveTo(cx - rx * 0.07, cy + ry * (nv - 0.005));
  ctx.quadraticCurveTo(cx - rx * 0.145, cy + ry * (nv + 0.035), cx - rx * 0.095, cy + ry * (nv + 0.075));
  ctx.stroke();
  ctx.fillStyle = css(deep, 0.62);
  for (const s of [-1, 1]) {
    ctx.beginPath();
    ctx.ellipse(cx + s * rx * 0.075, cy + ry * (nv + 0.06), rx * 0.036, ry * 0.016, s * 0.3, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = css(lit, 0.6);
  ctx.beginPath();
  ctx.ellipse(cx - rx * 0.025, cy + ry * (nv - 0.03), rx * 0.04, ry * 0.02, -0.2, 0, Math.PI * 2);
  ctx.fill();
}

/**
 * The mouth in the face's style and mood: a frown, grimace or open frown when grim, a wide open "O" when it hurts,
 * a smile or grin in relief, a big open smile when glowing. Closed mouths get a coloured lower lip with a highlight
 * and a darker upper lip; open ones get lips round them, a dark inside, shaded teeth and a tongue.
 * @param {CanvasRenderingContext2D} ctx the context
 * @param {object} f the face geometry
 * @param {object} look the face look
 * @param {string} mood the mood
 * @returns {void}
 */
function drawMouth(ctx, f, look, mood) {
  const { cx, cy, rx, ry, features: ft } = f;
  const my = cy + ry * ft.mouthV;
  const mw = rx * ft.mouthW;
  const st = look.mouth;
  const lt = lightness(look.skin);
  const lip = mixRgb(rgbOf(look.skin), lt > 0.5 ? [208, 92, 106] : [128, 44, 58], 0.5);
  const lipDark = mixRgb(lip, [72, 18, 30], 0.5);
  const lineCol = css(mixRgb(lipDark, [52, 14, 22], 0.35));
  const lipH = ry * 0.04;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  /**
   * A closed mouth drawn as one line with lips: curve > 0 smiles, < 0 frowns; wobble adds a wave.
   * @param {number} curve how far the middle sits below the corners (ry units)
   * @param {number} [wobble] wave height (ry units)
   * @param {number} [wk] width factor
   * @returns {void}
   */
  const line = (curve, wobble = 0, wk = 1) => {
    const pts = [];
    for (let i = 0; i <= 24; i += 1) {
      const k = i / 24;
      const u = 2 * k - 1;
      pts.push([cx + u * mw * wk, my - curve * ry * (u * u) + wobble * ry * Math.sin(k * Math.PI * 4) + curve * ry * 0.5, u]);
    }
    /** The line, then back along it shifted down by d at the middle (up when d < 0), as the current path. @param {number} d px @returns {void} */
    const band = (d) => {
      ctx.beginPath();
      pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
      for (let i = pts.length - 1; i >= 0; i -= 1) { const [x, y, u] = pts[i]; ctx.lineTo(x, y + d * (1 - u * u) ** 0.8); }
      ctx.closePath();
    };
    band(lipH);
    ctx.fillStyle = css(lip, 0.8);
    ctx.fill();
    band(-lipH * 0.55);
    ctx.fillStyle = css(lipDark, 0.55);
    ctx.fill();
    softSpot(ctx, cx - mw * wk * 0.12, pts[12][1] + lipH * 0.5, mw * wk * 0.3, lipH * 0.32, [255, 242, 238], lt > 0.5 ? 0.45 : 0.3);
    ctx.strokeStyle = lineCol;
    ctx.lineWidth = Math.max(2, rx * 0.045);
    ctx.beginPath();
    pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ctx.stroke();
    ctx.strokeStyle = css(skinDeep(look.skin), 0.35); // little dimples at the corners
    ctx.lineWidth = Math.max(1, rx * 0.016);
    for (const [x, y, u] of [pts[0], pts[24]]) {
      ctx.beginPath();
      ctx.moveTo(x + u * rx * 0.012, y - ry * 0.022);
      ctx.quadraticCurveTo(x + u * rx * 0.03, y, x + u * rx * 0.012, y + ry * 0.022);
      ctx.stroke();
    }
  };
  /**
   * An open mouth: corners, top lip and bottom lip as curves; dark inside with teeth on top and a tongue below.
   * @param {number} corner corner height (ry units from the mouth line)
   * @param {number} top top edge control (ry units)
   * @param {number} bottom bottom edge control (ry units)
   * @param {{teeth?: boolean, tongue?: boolean, wk?: number, clench?: boolean}} o what shows inside and the width factor
   * @returns {void}
   */
  const open = (corner, top, bottom, o = {}) => {
    const w = mw * (o.wk ?? 1);
    /** The mouth outline as the current path. @returns {void} */
    const outline = () => {
      ctx.beginPath();
      ctx.moveTo(cx - w, my + corner * ry);
      ctx.quadraticCurveTo(cx, my + top * ry, cx + w, my + corner * ry);
      ctx.quadraticCurveTo(cx, my + bottom * ry, cx - w, my + corner * ry);
      ctx.closePath();
    };
    const midTop = my + ry * (top + corner) / 2; // the middle of the top lip
    const midBottom = my + ry * (bottom + corner) / 2; // the middle of the bottom lip
    outline();
    if (o.clench) ctx.fillStyle = '#fffdf8';
    else {
      const inside = ctx.createLinearGradient(0, midTop, 0, midBottom);
      inside.addColorStop(0, '#3a1019');
      inside.addColorStop(1, '#6e2534');
      ctx.fillStyle = inside;
    }
    ctx.fill();
    ctx.save();
    ctx.clip();
    if (o.tongue) {
      const tg = ctx.createRadialGradient(cx - w * 0.12, midBottom - (midBottom - midTop) * 0.15, 0, cx, midBottom, w * 0.6);
      tg.addColorStop(0, '#f7a3ad');
      tg.addColorStop(1, '#d65a6c');
      ctx.fillStyle = tg;
      ctx.beginPath(); ctx.ellipse(cx, midBottom, w * 0.55, (midBottom - midTop) * 0.45, 0, 0, Math.PI * 2); ctx.fill();
    }
    if (o.teeth) {
      const tb = midTop + (midBottom - midTop) * 0.3;
      const tg = ctx.createLinearGradient(0, midTop - ry * 0.02, 0, tb);
      tg.addColorStop(0, '#d8cfca');
      tg.addColorStop(0.45, '#fffdf8');
      tg.addColorStop(1, '#eee7df');
      ctx.fillStyle = tg;
      ctx.fillRect(cx - w, midTop - ry, w * 2, tb - midTop + ry);
      ctx.strokeStyle = 'rgba(150,120,120,0.3)'; // the gap between the two front teeth
      ctx.lineWidth = Math.max(1, rx * 0.01);
      ctx.beginPath(); ctx.moveTo(cx, midTop); ctx.lineTo(cx, tb - ry * 0.005); ctx.stroke();
    }
    if (o.clench) { // gritted teeth: a line across and a few gaps
      ctx.strokeStyle = 'rgba(120,90,90,0.6)';
      ctx.lineWidth = Math.max(1, rx * 0.015);
      const mid = (midTop + midBottom) / 2;
      ctx.beginPath(); ctx.moveTo(cx - w, mid); ctx.lineTo(cx + w, mid); ctx.stroke();
      for (const k of [-0.5, 0, 0.5]) { ctx.beginPath(); ctx.moveTo(cx + k * w, midTop - ry * 0.05); ctx.lineTo(cx + k * w, midBottom + ry * 0.05); ctx.stroke(); }
    }
    ctx.restore();
    // The lips round it, a fine dark line on them and a highlight on the lower lip.
    outline();
    ctx.strokeStyle = css(lip);
    ctx.lineWidth = Math.max(2.5, rx * 0.045);
    ctx.stroke();
    ctx.strokeStyle = lineCol;
    ctx.lineWidth = Math.max(1.2, rx * 0.016);
    ctx.stroke();
    softSpot(ctx, cx - w * 0.12, midBottom + rx * 0.014, w * 0.3, rx * 0.012, [255, 242, 238], lt > 0.5 ? 0.5 : 0.35);
  };
  if (mood === 'ow') { open(0.02, -0.1, 0.2, { teeth: true, tongue: true, wk: st === 'small' ? 0.9 : 0.72 }); return; }
  if (mood === 'sleep') { open(0.0, -0.03, 0.05, { wk: 0.38 }); return; } // a small slack "o" of a sleeper
  if (mood === 'glowing') { open(-0.04, 0.03, st === 'small' ? 0.2 : 0.26, { teeth: true, tongue: true }); return; }
  if (mood === 'relief') {
    if (st === 'grin') open(-0.03, 0.02, 0.2, { teeth: true });
    else if (st === 'open') open(-0.02, 0.02, 0.2, { tongue: true });
    else if (st === 'wobbly') line(0.05, 0.012);
    else line(st === 'flat' ? 0.035 : 0.06);
    return;
  }
  if (mood === 'grim') {
    if (st === 'grin') open(0.01, -0.07, 0.11, { clench: true, wk: 0.85 });
    else if (st === 'open') open(0.04, -0.1, 0.03, { wk: 0.75 });
    else if (st === 'wobbly') line(-0.04, 0.014);
    else line(st === 'flat' ? -0.015 : -0.035);
    return;
  }
  // meh: in between
  if (st === 'wobbly') line(0, 0.012);
  else line(st === 'smile' || st === 'grin' ? 0.015 : 0, 0, st === 'grin' ? 0.85 : 1);
}

/**
 * Accessories on the face that never move: a moustache and a clown nose (both inside faceGeometry's keep-out boxes).
 * Glasses are drawn by drawGlasses, over the eyes.
 * @param {CanvasRenderingContext2D} ctx the context
 * @param {object} f the face geometry
 * @param {object} look the face look
 * @returns {void}
 */
function drawFaceWear(ctx, f, look) {
  const { cx, cy, rx, ry, features: ft } = f;
  // Turns a face x-unit (u) into a canvas x position.
  const X = (u) => cx + u * rx;
  // Turns a face y-unit (v) into a canvas y position.
  const Y = (v) => cy + v * ry;
  // True when the look wears the named accessory.
  const has = (a) => look.acc.includes(a);
  if (has('moustache')) {
    const y = Y(ft.noseV + 0.16);
    const col = shade(facialHair(look), -0.1);
    ctx.fillStyle = css(skinDeep(look.skin), 0.25); // its soft shadow on the lip
    for (const s of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(X(0), y - ry * 0.02);
      ctx.bezierCurveTo(X(s * 0.18), y - ry * 0.06, X(s * 0.3), y + ry * 0.02, X(s * 0.33), y - ry * 0.02);
      ctx.bezierCurveTo(X(s * 0.31), y + ry * 0.09, X(s * 0.14), y + ry * 0.1, X(0), y + ry * 0.05);
      ctx.closePath();
      ctx.fill();
    }
    ctx.fillStyle = col;
    for (const s of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(X(0), y - ry * 0.05);
      ctx.bezierCurveTo(X(s * 0.18), y - ry * 0.1, X(s * 0.3), y - ry * 0.02, X(s * 0.33), y - ry * 0.06);
      ctx.bezierCurveTo(X(s * 0.31), y + ry * 0.05, X(s * 0.14), y + ry * 0.06, X(0), y + ry * 0.01);
      ctx.closePath();
      ctx.fill();
      ctx.save(); // hairs combed outwards, lighter on top and darker below
      ctx.clip();
      ctx.lineCap = 'round';
      ctx.lineWidth = Math.max(0.8, rx * 0.01);
      for (const [hc, dy] of [[shade(facialHair(look), 0.35, 0.45), -0.02], [shade(facialHair(look), -0.45, 0.45), 0.025]]) {
        ctx.strokeStyle = hc;
        ctx.beginPath();
        for (let k = 0; k < 7; k += 1) {
          const u = s * (0.03 + k * 0.045);
          ctx.moveTo(X(u), y + ry * (dy - 0.04));
          ctx.lineTo(X(u + s * 0.05), y + ry * (dy + 0.03));
        }
        ctx.stroke();
      }
      ctx.restore();
    }
  }
  if (has('clown-nose')) {
    const x = X(0);
    const y = Y(ft.noseV);
    const r = rx * 0.11;
    // Elastic strap to the ears so it reads as a clown's nose, not as a bump.
    ctx.strokeStyle = '#2b2b33';
    ctx.lineWidth = Math.max(1.5, rx * 0.012);
    for (const s of [-1, 1]) { ctx.beginPath(); ctx.moveTo(x + s * r * 0.9, y); ctx.quadraticCurveTo(X(s * 0.5), y - ry * 0.02, X(s * 0.93), y - ry * 0.05); ctx.stroke(); }
    softSpot(ctx, x + r * 0.15, y + r * 0.95, r * 1.1, r * 0.35, skinDeep(look.skin), 0.4); // its shadow on the lip
    const g = ctx.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.1, x, y, r);
    g.addColorStop(0, '#ff8a80');
    g.addColorStop(0.6, '#e8303a');
    g.addColorStop(1, '#a51d2a');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    ctx.beginPath(); ctx.ellipse(x - r * 0.35, y - r * 0.42, r * 0.28, r * 0.17, -0.5, 0, Math.PI * 2); ctx.fill();
  }
}

/**
 * Glasses or sunglasses: for each eye the lens (tinted glass and a glint), its frame and the arm to the ear, then the
 * bridge; the frame casts a soft shadow on the skin. With `only` it draws one lens and frame again over the picture
 * (the idle life has just drawn that eye again): the glass then covers only the eye, so the skin is never tinted twice.
 * @param {CanvasRenderingContext2D} ctx the context
 * @param {object} f the face geometry
 * @param {object} look the face look
 * @param {{side: number, eye: {x: number, y: number, s: number, h: number}}|null} [only] one eye only (the idle life)
 * @returns {void}
 */
function drawGlasses(ctx, f, look, only = null) {
  const sun = look.acc.includes('sunglasses');
  if (!sun && !look.acc.includes('glasses')) return;
  const { cx, cy, rx, ry, features: ft } = f;
  // Turns a face x-unit (u) into a canvas x position.
  const X = (u) => cx + u * rx;
  // Turns a face y-unit (v) into a canvas y position.
  const Y = (v) => cy + v * ry;
  const frame = sun ? '#1d1b26' : shade(look.accent, -0.35);
  const lw = Math.max(2, rx * 0.035);
  const r = rx * 0.2;
  const ey = Y(ft.eyeV);
  /** One lens as the current path. @param {number} ex the lens centre x @returns {void} */
  const lens = (ex) => {
    ctx.beginPath();
    if (sun) { // a rounded, slightly droopy lens
      ctx.moveTo(ex - r, ey - r * 0.62);
      ctx.lineTo(ex + r, ey - r * 0.62);
      ctx.bezierCurveTo(ex + r * 1.05, ey + r * 0.2, ex + r * 0.6, ey + r * 0.72, ex, ey + r * 0.7);
      ctx.bezierCurveTo(ex - r * 0.6, ey + r * 0.72, ex - r * 1.05, ey + r * 0.2, ex - r, ey - r * 0.62);
    } else {
      ctx.arc(ex, ey, r, 0, Math.PI * 2);
    }
    ctx.closePath();
  };
  ctx.lineCap = 'round';
  for (const s of only ? [only.side] : [-1, 1]) {
    const ex = X(s * ft.eyeU);
    if (!only) { // the frame's soft shadow on the skin, a little down and to the right
      ctx.save();
      ctx.translate(rx * 0.012, ry * 0.03);
      lens(ex);
      ctx.strokeStyle = css(skinDeep(look.skin), 0.18);
      ctx.lineWidth = lw * 1.3;
      ctx.stroke();
      ctx.restore();
    }
    ctx.save();
    if (only) { ctx.beginPath(); ctx.ellipse(only.eye.x, only.eye.y, only.eye.s, only.eye.h, 0, 0, Math.PI * 2); ctx.clip(); }
    lens(ex);
    if (sun) {
      const g = ctx.createLinearGradient(0, ey - r * 0.6, 0, ey + r * 0.7);
      g.addColorStop(0, '#2a2f55');
      g.addColorStop(1, '#6b3f7a');
      ctx.fillStyle = g;
    } else {
      ctx.fillStyle = 'rgba(210,235,255,0.18)';
    }
    ctx.fill();
    // A glint across the glass.
    ctx.strokeStyle = sun ? 'rgba(255,255,255,0.55)' : 'rgba(255,255,255,0.7)';
    ctx.lineWidth = Math.max(1.5, rx * 0.022);
    ctx.beginPath();
    ctx.moveTo(ex - r * 0.5, ey - r * (sun ? 0.25 : 0.45));
    ctx.lineTo(ex - r * 0.15, ey - r * (sun ? 0.5 : 0.7));
    ctx.stroke();
    ctx.restore();
    lens(ex);
    ctx.strokeStyle = frame;
    ctx.lineWidth = lw;
    ctx.stroke();
    if (only) continue;
    // The arm towards the ear.
    ctx.beginPath();
    ctx.moveTo(ex + s * r, ey - r * (sun ? 0.5 : 0.2));
    ctx.lineTo(X(s * 0.99), Y(ft.eyeV - 0.04));
    ctx.stroke();
  }
  if (only) return;
  ctx.beginPath(); // the bridge
  ctx.moveTo(X(-ft.eyeU) + r, ey - r * (sun ? 0.45 : 0.15));
  ctx.quadraticCurveTo(X(0), ey - r * 0.55, X(ft.eyeU) - r, ey - r * (sun ? 0.45 : 0.15));
  ctx.stroke();
}

/**
 * Glowing: little twinkles around the head. Ow: a sweat drop beside the forehead.
 * @param {CanvasRenderingContext2D} ctx the context
 * @param {object} f the face geometry
 * @param {string} mood the mood
 * @returns {void}
 */
function drawMoodExtras(ctx, f, mood) {
  const { cx, cy, rx, ry } = f;
  if (mood === 'glowing') {
    for (const [u, v, k] of [[-1.25, -0.75, 1], [1.28, -0.5, 0.8], [1.12, -1.15, 0.6], [-1.2, 0.35, 0.7], [1.25, 0.45, 0.9]]) {
      const x = cx + u * rx;
      const y = cy + v * ry;
      const r = rx * 0.11 * k;
      ctx.fillStyle = 'rgba(255,250,215,0.95)';
      ctx.beginPath();
      ctx.moveTo(x, y - r);
      ctx.quadraticCurveTo(x, y, x + r, y);
      ctx.quadraticCurveTo(x, y, x, y + r);
      ctx.quadraticCurveTo(x, y, x - r, y);
      ctx.quadraticCurveTo(x, y, x, y - r);
      ctx.fill();
    }
  }
  if (mood === 'ow') {
    const x = cx - rx * 1.1;
    const y = cy - ry * 0.55;
    const r = rx * 0.07;
    ctx.fillStyle = 'rgba(140,200,245,0.95)';
    ctx.beginPath();
    ctx.moveTo(x, y - r * 2);
    ctx.quadraticCurveTo(x + r * 1.1, y - r * 0.2, x, y + r);
    ctx.quadraticCurveTo(x - r * 1.1, y - r * 0.2, x, y - r * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    ctx.beginPath(); ctx.arc(x - r * 0.3, y - r * 0.1, r * 0.25, 0, Math.PI * 2); ctx.fill();
  }
}

/**
 * The beard (T2.4): from the sideburns round the jaw and chin, hanging a little below the chin, with a moustache over
 * the upper lip and a wavy top edge. Its top edge is characters.js beardTop, the same line the bump layout keeps clear.
 * A small bare patch round the mouth keeps the mouth readable in every mood, and a bare spot on the chin (characters.js
 * CHIN_PATCH) holds his chin bump.
 * @param {CanvasRenderingContext2D} ctx the context
 * @param {object} f the face geometry
 * @param {object} look the face look
 * @returns {void}
 */
function drawBeard(ctx, f, look) {
  const { cx, cy, rx, ry, features: ft } = f;
  // Turns a face x-unit (u) into a canvas x position.
  const X = (u) => cx + u * rx;
  // Turns a face y-unit (v) into a canvas y position.
  const Y = (v) => cy + v * ry;
  const hair = look.hair;
  const end = 0.98; // where the sideburns meet the head outline beside the ears
  /** The beard outline as the current path. @returns {void} */
  const outline = () => {
    ctx.beginPath();
    ctx.moveTo(X(-end), Y(beardTop(-end)));
    const n = 22;
    for (let i = 0; i < n; i += 1) { // the top edge in little upward tufts
      const u0 = -end + (2 * end * i) / n;
      const u1 = -end + (2 * end * (i + 1)) / n;
      const um = (u0 + u1) / 2;
      ctx.quadraticCurveTo(X(um), Y(beardTop(um) - BEARD_FUZZ * 1.6), X(u1), Y(beardTop(u1)));
    }
    const t0 = Math.asin(Math.max(-0.99, Math.min(0.99, beardTop(end))));
    for (let i = 0; i <= 40; i += 1) { // round the jaw, hanging below the chin
      const t = t0 + ((Math.PI - 2 * t0) * i) / 40;
      const [x, y] = headPoint(f, t, 1.03, 1.0);
      const s = Math.max(0, Math.sin(t));
      ctx.lineTo(x, y + BEARD_DROP * ry * s ** 6);
    }
    ctx.closePath();
  };
  outline();
  const g = ctx.createLinearGradient(0, Y(0.2), 0, Y(1.2));
  g.addColorStop(0, shade(hair, 0.16));
  g.addColorStop(1, shade(hair, -0.1));
  ctx.fillStyle = g;
  ctx.fill();
  ctx.strokeStyle = shade(hair, -0.3, 0.6);
  ctx.lineWidth = Math.max(1.2, rx * 0.012);
  ctx.stroke();
  // Texture: short curly strokes in a lighter shade, and a glossy shine on the chin.
  ctx.save();
  outline();
  ctx.clip();
  const rand = rng(41);
  ctx.strokeStyle = shade(hair, 0.32, 0.45);
  ctx.lineWidth = Math.max(1, rx * 0.012);
  ctx.lineCap = 'round';
  for (let i = 0; i < 26; i += 1) {
    const u = -0.9 + rand() * 1.8;
    const v = beardTop(u) + 0.06 + rand() * (1.05 - beardTop(u));
    const r = rx * (0.04 + rand() * 0.03);
    ctx.beginPath(); ctx.arc(X(u), Y(v), r, Math.PI * 0.15, Math.PI * 0.85); ctx.stroke();
  }
  ctx.strokeStyle = shade(hair, 0.55, 0.35);
  ctx.lineWidth = rx * 0.045;
  ctx.beginPath();
  ctx.ellipse(X(-0.05), Y(0.78), rx * 0.62, ry * 0.3, 0, Math.PI * 0.62, Math.PI * 0.82);
  ctx.stroke();
  ctx.restore();
  // The bare patch round the mouth (lips and skin), so the mouth shows in every mood.
  const hole = ctx.createRadialGradient(cx, Y(ft.mouthV), 0, cx, Y(ft.mouthV), rx * (ft.mouthW + 0.06));
  hole.addColorStop(0, shade(look.skin, -0.04));
  hole.addColorStop(0.7, shade(look.skin, -0.12));
  hole.addColorStop(1, shade(look.skin, -0.3, 0));
  ctx.fillStyle = hole;
  ctx.beginPath();
  ctx.ellipse(cx, Y(ft.mouthV + 0.01), rx * (ft.mouthW + 0.06), ry * 0.08, 0, 0, Math.PI * 2);
  ctx.fill();
  // The bare spot on the chin where his chin bump sits (a squircle, so the layout's box fits inside it).
  const { a, b, v: pv } = CHIN_PATCH;
  ctx.beginPath();
  for (let i = 0; i < 48; i += 1) {
    const t = (i / 48) * Math.PI * 2;
    const c = Math.cos(t);
    const s = Math.sin(t);
    const x = X(a * Math.sign(c) * Math.abs(c) ** 0.5);
    const y = Y(pv + b * Math.sign(s) * Math.abs(s) ** 0.5);
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  }
  ctx.closePath();
  const spot = ctx.createRadialGradient(X(-0.04), Y(pv - 0.04), 0, cx, Y(pv), rx * a * 1.2);
  spot.addColorStop(0, shade(look.skin, 0.04));
  spot.addColorStop(0.75, shade(look.skin, -0.08));
  spot.addColorStop(1, shade(look.skin, -0.25));
  ctx.fillStyle = spot;
  ctx.fill();
  // Little tufts of beard round its edge, so it reads as a bare spot in the beard and not as a box.
  ctx.fillStyle = shade(hair, 0.08);
  for (let i = 0; i < 26; i += 1) {
    const t = (i / 26) * Math.PI * 2;
    /** A point on the spot's edge, pulled in by k. @param {number} tt angle @param {number} k scale @returns {number[]} px */
    const at = (tt, k) => {
      const c = Math.cos(tt);
      const s = Math.sin(tt);
      return [X(k * a * Math.sign(c) * Math.abs(c) ** 0.5), Y(pv + k * b * Math.sign(s) * Math.abs(s) ** 0.5)];
    };
    ctx.beginPath();
    ctx.moveTo(...at(t - 0.11, 1.02));
    ctx.lineTo(...at(t, 0.9));
    ctx.lineTo(...at(t + 0.11, 1.02));
    ctx.closePath();
    ctx.fill();
  }
}

/**
 * A round ball nose like the comic's: a soft shadow under it, a shaded ball lit from the upper left, a light outline,
 * two hints of nostrils and a shine.
 * @param {CanvasRenderingContext2D} ctx the context
 * @param {object} f the face geometry
 * @param {string} base skin colour
 * @returns {void}
 */
function drawRoundNose(ctx, f, base) {
  const { cx, cy, rx, ry, features: ft } = f;
  const x = cx;
  const y = cy + ry * (ft.noseV - 0.02);
  const w = rx * 0.15;
  const h = ry * 0.1;
  const c = rgbOf(base);
  const deep = skinDeep(base);
  softSpot(ctx, x + w * 0.12, y + h * 0.95, w * 1.05, h * 0.4, deep, 0.3);
  const g = ctx.createRadialGradient(x - w * 0.35, y - h * 0.4, w * 0.1, x, y, w * 1.1);
  g.addColorStop(0, css(mixRgb(c, skinLit(base), 0.25)));
  g.addColorStop(0.6, base);
  g.addColorStop(1, shade(base, -0.16));
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.ellipse(x, y, w, h, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = css(deep, 0.5);
  ctx.lineWidth = Math.max(1.2, rx * 0.016);
  ctx.stroke();
  ctx.fillStyle = css(deep, 0.45);
  for (const s of [-1, 1]) {
    ctx.beginPath();
    ctx.ellipse(x + s * w * 0.42, y + h * 0.62, w * 0.17, h * 0.13, s * 0.4, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = 'rgba(255,245,235,0.65)';
  ctx.beginPath();
  ctx.ellipse(x - w * 0.35, y - h * 0.38, w * 0.28, h * 0.2, -0.3, 0, Math.PI * 2);
  ctx.fill();
}

/**
 * A glossy steel fill (light from the top left, a bright band and a darker lower edge), the game's shiny look.
 * @param {CanvasRenderingContext2D} ctx the context
 * @param {number} x0 start x
 * @param {number} y0 start y
 * @param {number} x1 end x
 * @param {number} y1 end y
 * @returns {CanvasGradient} the gradient
 */
function steelFill(ctx, x0, y0, x1, y1) {
  const g = ctx.createLinearGradient(x0, y0, x1, y1);
  g.addColorStop(0, '#f4f7fb');
  g.addColorStop(0.3, '#d3dbe5');
  g.addColorStop(0.62, '#a9b4c2');
  g.addColorStop(0.8, '#c9d3de');
  g.addColorStop(1, '#8794a5');
  return g;
}

/** The soft outline round steel parts. @param {CanvasRenderingContext2D} ctx the context @param {object} f the face geometry @returns {void} */
function steelEdge(ctx, f) {
  ctx.strokeStyle = 'rgba(62,72,88,0.8)';
  ctx.lineWidth = Math.max(1.5, f.rx * 0.018);
  ctx.lineJoin = 'round';
  ctx.stroke();
}

/**
 * A round rivet head on steel.
 * @param {CanvasRenderingContext2D} ctx the context
 * @param {number} x centre x
 * @param {number} y centre y
 * @param {number} r radius
 * @returns {void}
 */
function rivet(ctx, x, y, r) {
  const g = ctx.createRadialGradient(x - r * 0.4, y - r * 0.4, r * 0.1, x, y, r);
  g.addColorStop(0, '#ffffff');
  g.addColorStop(1, '#7d8999');
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
}

/**
 * The armored body instead of the hoodie: neck, a steel collar (gorget), the breastplate and round shoulder plates
 * (pauldrons) with two bands each.
 * @param {CanvasRenderingContext2D} ctx the context
 * @param {object} f the face geometry
 * @param {object} look the face look
 * @returns {void}
 */
function drawArmorBody(ctx, f, look) {
  const { cx, cy, rx, ry, height: h } = f;
  // Turns a face x-unit (u) into a canvas x position.
  const X = (u) => cx + u * rx;
  // Turns a face y-unit (v) into a canvas y position.
  const Y = (v) => cy + v * ry;
  drawNeck(ctx, f, look.skin);
  const top = Y(1.04);
  // The breastplate (same outline as the hoodie), with a ridge down the middle.
  ctx.beginPath();
  ctx.moveTo(X(-1.9), h + 4);
  ctx.bezierCurveTo(X(-1.85), top + ry * 0.12, X(-1.2), top, X(-0.5), top);
  ctx.quadraticCurveTo(cx, top + ry * 0.25, X(0.5), top);
  ctx.bezierCurveTo(X(1.2), top, X(1.85), top + ry * 0.12, X(1.9), h + 4);
  ctx.closePath();
  ctx.fillStyle = steelFill(ctx, X(-1.2), top, X(1.2), top + ry * 0.9);
  ctx.fill();
  steelEdge(ctx, f);
  ctx.strokeStyle = 'rgba(62,72,88,0.5)';
  ctx.lineWidth = Math.max(1.5, rx * 0.02);
  ctx.beginPath(); ctx.moveTo(cx, top + ry * 0.3); ctx.lineTo(cx, h + 4); ctx.stroke();
  ctx.strokeStyle = 'rgba(255,255,255,0.55)';
  ctx.beginPath(); ctx.moveTo(cx - rx * 0.03, top + ry * 0.32); ctx.lineTo(cx - rx * 0.03, h + 4); ctx.stroke();
  // The collar: two overlapping steel rings round the neck.
  for (const [v0, v1, w0, w1] of [[1.1, 1.3, 0.78, 0.9], [0.92, 1.14, 0.62, 0.8]]) {
    ctx.beginPath();
    ctx.moveTo(X(-w0), Y(v0));
    ctx.quadraticCurveTo(cx, Y(v0 + 0.12), X(w0), Y(v0));
    ctx.lineTo(X(w1), Y(v1));
    ctx.quadraticCurveTo(cx, Y(v1 + 0.14), X(-w1), Y(v1));
    ctx.closePath();
    ctx.fillStyle = steelFill(ctx, X(-w1), Y(v0), X(w1), Y(v1 + 0.1));
    ctx.fill();
    steelEdge(ctx, f);
  }
  // The shoulder plates: a dome with two bands below it, and a rivet.
  for (const s of [-1, 1]) {
    const px = X(s * 1.4);
    const py = top + ry * 0.2;
    for (const [k, dy] of [[0.86, 0.3], [0.94, 0.16], [1, 0]]) {
      ctx.beginPath();
      ctx.ellipse(px, py + ry * dy, rx * 0.66 * k, ry * 0.36 * k, s * 0.18, Math.PI, Math.PI * 2);
      ctx.closePath();
      ctx.fillStyle = steelFill(ctx, px - rx * 0.5, py - ry * 0.35, px + rx * 0.4, py + ry * 0.4);
      ctx.fill();
      steelEdge(ctx, f);
    }
    ctx.strokeStyle = 'rgba(255,255,255,0.7)';
    ctx.lineWidth = rx * 0.035;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.ellipse(px, py, rx * 0.5, ry * 0.26, s * 0.18, Math.PI * 1.2, Math.PI * 1.45);
    ctx.stroke();
    rivet(ctx, px - s * rx * 0.05, py - ry * 0.18, rx * 0.045);
  }
}

/**
 * One plume (a curved feather) standing on the helmet's crest, drawn from its base at the top of the helmet.
 * @param {CanvasRenderingContext2D} ctx the context
 * @param {object} f the face geometry
 * @param {string} colour the feather colour
 * @param {number} side 1 = curls to the right, -1 = to the left
 * @param {number} turn extra turn outwards and down, in radians
 * @returns {void}
 */
function drawPlume(ctx, f, colour, side, turn) {
  const { cx, cy, rx, ry } = f;
  const bx = cx;
  const by = cy - ry * 1.16;
  ctx.save();
  ctx.translate(bx, by);
  ctx.scale(side, 1);
  ctx.rotate(turn);
  /** A point relative to the base, in face units. @param {number} u across @param {number} v down @returns {number[]} px */
  const P = (u, v) => [u * rx, v * ry];
  ctx.beginPath();
  ctx.moveTo(...P(-0.04, 0));
  ctx.bezierCurveTo(...P(-0.22, -0.34), ...P(0.3, -0.5), ...P(0.8, -0.36));
  ctx.bezierCurveTo(...P(0.46, -0.32), ...P(0.3, -0.2), ...P(0.16, 0.02));
  ctx.closePath();
  const g = ctx.createLinearGradient(0, -ry * 0.45, rx * 0.3, 0);
  g.addColorStop(0, shade(colour, 0.25));
  g.addColorStop(1, shade(colour, -0.2));
  ctx.fillStyle = g;
  ctx.fill();
  ctx.strokeStyle = shade(colour, -0.45, 0.8);
  ctx.lineWidth = Math.max(1.2, rx * 0.016);
  ctx.stroke();
  ctx.strokeStyle = shade(colour, 0.5, 0.7); // the feather's barbs
  ctx.lineWidth = Math.max(1, rx * 0.012);
  ctx.lineCap = 'round';
  for (const k of [0.25, 0.45, 0.65]) {
    ctx.beginPath();
    ctx.moveTo(...P(0.02 + k * 0.5, -0.3 * k - 0.04));
    ctx.quadraticCurveTo(...P(0.1 + k * 0.6, -0.36 * k - 0.1), ...P(0.18 + k * 0.7, -0.38 * k - 0.08));
    ctx.stroke();
  }
  ctx.restore();
}

/**
 * The knitted hat pulled over the helmet (Greta's gift in the comics): a dome with knit rows, a ribbed band that
 * stays above the helmet's brow edge, and a pompom.
 * @param {CanvasRenderingContext2D} ctx the context
 * @param {object} f the face geometry
 * @param {string} c the hat colour
 * @returns {void}
 */
function drawCozyHat(ctx, f, c) {
  const { cx, cy, rx, ry } = f;
  // Turns a face x-unit (u) into a canvas x position.
  const X = (u) => cx + u * rx;
  // Turns a face y-unit (v) into a canvas y position.
  const Y = (v) => cy + v * ry;
  // Bottom edge of the hat at x-unit u, a little above the hairline.
  // Bottom edge of the hat at x-unit u, a little above the hairline.
  const bottom = (u) => hairline(f, u) - 0.04;
  ctx.beginPath();
  ctx.moveTo(X(1.16), Y(bottom(1.16) - 0.14));
  topArc(ctx, f, bottom(1.16) - 0.14, 1.18, 1.24, -0.02);
  ctx.closePath();
  const g = ctx.createLinearGradient(0, Y(-1.3), 0, Y(-0.6));
  g.addColorStop(0, shade(c, 0.18));
  g.addColorStop(1, shade(c, -0.12));
  ctx.fillStyle = g;
  ctx.fill();
  ctx.strokeStyle = shade(c, -0.4, 0.7);
  ctx.lineWidth = Math.max(1.2, rx * 0.014);
  ctx.stroke();
  ctx.strokeStyle = shade(c, -0.22, 0.6); // knit rows
  ctx.lineWidth = Math.max(1, rx * 0.014);
  for (const v of [-0.92, -1.06, -1.18]) {
    const w = Math.sqrt(Math.max(0, 1 - ((v + 0.02) / 1.24) ** 2)) * 1.12;
    ctx.beginPath(); ctx.moveTo(X(-w), Y(v + 0.06)); ctx.quadraticCurveTo(cx, Y(v - 0.06), X(w), Y(v + 0.06)); ctx.stroke();
  }
  // The ribbed band.
  ctx.beginPath();
  for (let i = 0; i <= 24; i += 1) { const u = -1.16 + (2.32 * i) / 24; ctx.lineTo(X(u), Y(bottom(u) - 0.16)); }
  for (let i = 24; i >= 0; i -= 1) { const u = -1.16 + (2.32 * i) / 24; ctx.lineTo(X(u), Y(bottom(u))); }
  ctx.closePath();
  ctx.fillStyle = shade(c, 0.22);
  ctx.fill();
  ctx.strokeStyle = shade(c, -0.4, 0.7);
  ctx.stroke();
  ctx.strokeStyle = shade(c, -0.15, 0.6);
  for (let i = 1; i < 16; i += 1) { const u = -1.16 + (2.32 * i) / 16; ctx.beginPath(); ctx.moveTo(X(u), Y(bottom(u) - 0.14)); ctx.lineTo(X(u), Y(bottom(u) - 0.02)); ctx.stroke(); }
  // The pompom, off to the left so the plumes stay clear.
  const px = X(-0.42);
  const py = Y(-1.32);
  ctx.fillStyle = shade(c, 0.45);
  ctx.beginPath();
  for (let i = 0; i < 10; i += 1) { const a = (i / 10) * Math.PI * 2; ctx.moveTo(px + Math.cos(a) * rx * 0.2, py + Math.sin(a) * rx * 0.2); ctx.arc(px + Math.cos(a) * rx * 0.1, py + Math.sin(a) * rx * 0.1, rx * 0.08, 0, Math.PI * 2); }
  ctx.fill();
}

/**
 * The knight's helmet (T2.4), visor up: a steel dome with a ridge, the visor lifted onto the forehead, cheek guards
 * down the sides, and an open front where the face shows (its edges are the same lines the bump layout uses:
 * the brow edge is the hairline in faceGeometry, the cheek guards are characters.js guardEdge). Plumes on top, an
 * optional knitted hat, and laser cracks for the last boss.
 * @param {CanvasRenderingContext2D} ctx the context
 * @param {object} f the face geometry
 * @param {{plumes: number, cozy: string|null, cracked: boolean}} armor the armor options
 * @returns {void}
 */
function drawHelmet(ctx, f, armor) {
  const { cx, cy, rx, ry } = f;
  // Turns a face x-unit (u) into a canvas x position.
  const X = (u) => cx + u * rx;
  // Turns a face y-unit (v) into a canvas y position.
  const Y = (v) => cy + v * ry;
  const brow = (u) => hairline(f, u) + 0.03; // the brow edge of the opening
  const top = HELMET.guardBottom;
  const g0 = guardEdge(top);
  const browU = HELMET.guard[0][1];
  // Plumes behind first (extra ones fan out), the red one in front.
  for (let i = armor.plumes - 1; i >= 1; i -= 1) {
    drawPlume(ctx, f, PLUME_COLOURS[i % PLUME_COLOURS.length], i % 2 ? -1 : 1, 0.38 * Math.floor(i / 2) + (i % 2 ? 0.1 : 0.25));
  }
  if (armor.plumes > 0 && !armor.cozy) drawPlume(ctx, f, PLUME_COLOURS[0], 1, 0);
  /** The inner edge of the opening, from the left guard's tip up, along the brow and down the right guard. @returns {void} */
  const opening = () => {
    for (let i = 0; i <= 20; i += 1) { const v = top - ((top - brow(browU)) * i) / 20; ctx.lineTo(X(-guardEdge(v)), Y(v)); }
    for (let i = 0; i <= 24; i += 1) { const u = -browU + (2 * browU * i) / 24; ctx.lineTo(X(u), Y(brow(u))); }
    for (let i = 0; i <= 20; i += 1) { const v = brow(browU) + ((top - brow(browU)) * i) / 20; ctx.lineTo(X(guardEdge(v)), Y(v)); }
  };
  // The shell: up the right side, over the dome, down the left, and back round the opening.
  ctx.beginPath();
  ctx.moveTo(X(1.16), Y(top - 0.04));
  ctx.lineTo(X(1.2), Y(-0.2));
  topArc(ctx, f, -0.2, 1.2, 1.18);
  ctx.lineTo(X(-1.16), Y(top - 0.04));
  ctx.quadraticCurveTo(X(-0.9), Y(top + 0.06), X(-g0), Y(top));
  opening();
  ctx.quadraticCurveTo(X(0.9), Y(top + 0.06), X(1.16), Y(top - 0.04));
  ctx.closePath();
  const g = ctx.createRadialGradient(X(-0.4), Y(-0.85), rx * 0.04, X(0), Y(-0.3), rx * 1.45);
  g.addColorStop(0, '#ffffff');
  g.addColorStop(0.18, '#e4eaf1');
  g.addColorStop(0.55, '#c0cad6');
  g.addColorStop(0.85, '#96a2b1');
  g.addColorStop(1, '#7b8797');
  ctx.fillStyle = g;
  ctx.fill();
  steelEdge(ctx, f);
  // A rolled rim round the opening: a darker band with a light line, so the face sits inside the helmet.
  ctx.beginPath();
  ctx.moveTo(X(-g0), Y(top));
  opening();
  ctx.strokeStyle = '#8692a2';
  ctx.lineWidth = rx * 0.05;
  ctx.lineJoin = 'round';
  ctx.stroke();
  ctx.strokeStyle = 'rgba(255,255,255,0.7)';
  ctx.lineWidth = rx * 0.016;
  ctx.stroke();
  // The ridge over the top of the dome.
  ctx.lineCap = 'round';
  ctx.strokeStyle = 'rgba(62,72,88,0.55)';
  ctx.lineWidth = rx * 0.03;
  ctx.beginPath(); ctx.moveTo(X(0.02), Y(-1.16)); ctx.lineTo(X(0.02), Y(brow(0) - 0.02)); ctx.stroke();
  ctx.strokeStyle = 'rgba(255,255,255,0.65)';
  ctx.lineWidth = rx * 0.016;
  ctx.beginPath(); ctx.moveTo(X(-0.02), Y(-1.15)); ctx.lineTo(X(-0.02), Y(brow(0) - 0.03)); ctx.stroke();
  if (armor.cozy) {
    drawCozyHat(ctx, f, armor.cozy);
  } else {
    // The visor, lifted up onto the forehead: a curved plate with a dark eye slit and a hinge rivet on each side.
    ctx.beginPath();
    ctx.moveTo(X(-1.1), Y(-0.6));
    ctx.quadraticCurveTo(cx, Y(-1.08), X(1.1), Y(-0.6));
    ctx.lineTo(X(1.12), Y(-0.74));
    ctx.quadraticCurveTo(cx, Y(-1.26), X(-1.12), Y(-0.74));
    ctx.closePath();
    ctx.fillStyle = steelFill(ctx, X(-0.6), Y(-1.1), X(0.4), Y(-0.6));
    ctx.fill();
    steelEdge(ctx, f);
    ctx.strokeStyle = '#2b2f3a';
    ctx.lineWidth = ry * 0.035;
    ctx.beginPath(); ctx.moveTo(X(-0.62), Y(-0.86)); ctx.quadraticCurveTo(cx, Y(-1.08), X(0.62), Y(-0.86)); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,0.75)';
    ctx.lineWidth = rx * 0.022;
    ctx.beginPath(); ctx.moveTo(X(-0.7), Y(-0.75)); ctx.quadraticCurveTo(X(-0.4), Y(-0.92), X(-0.1), Y(-0.95)); ctx.stroke();
    for (const s of [-1, 1]) rivet(ctx, X(s * 1.08), Y(-0.66), rx * 0.06);
  }
  if (armor.plumes > 0 && armor.cozy) drawPlume(ctx, f, PLUME_COLOURS[0], 1, 0); // poking out of the hat
  // Rivets down the cheek guards.
  for (const s of [-1, 1]) for (const v of [-0.1, 0.25, 0.6]) rivet(ctx, X(s * (guardEdge(v) + 0.2)), Y(v), rx * 0.04);
  if (armor.cracked) drawCracks(ctx, f);
}

/**
 * Laser cracks in the steel (the last boss, chapter 11): dark zigzags with a light edge, on the dome and both guards.
 * @param {CanvasRenderingContext2D} ctx the context
 * @param {object} f the face geometry
 * @returns {void}
 */
function drawCracks(ctx, f) {
  // Turns a face x-unit (u) into a canvas x position.
  const X = (u) => f.cx + u * f.rx;
  // Turns a face y-unit (v) into a canvas y position.
  const Y = (v) => f.cy + v * f.ry;
  const cracks = [
    [[-0.55, -1.0], [-0.42, -0.86], [-0.5, -0.76], [-0.38, -0.62]],
    [[0.6, -0.95], [0.5, -0.82], [0.62, -0.72], [0.55, -0.6]],
    [[-1.12, 0.1], [-0.98, 0.2], [-1.06, 0.32], [-0.92, 0.42]],
    [[1.14, 0.3], [1.0, 0.4], [1.08, 0.52], [0.94, 0.62]],
  ];
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  for (const [col, w, dx] of [['rgba(255,255,255,0.7)', 0.014, 0.012], ['#2b2f3a', 0.018, 0]]) {
    ctx.strokeStyle = col;
    ctx.lineWidth = Math.max(1.2, f.rx * w);
    for (const c of cracks) {
      ctx.beginPath();
      c.forEach(([u, v], i) => (i ? ctx.lineTo(X(u + dx), Y(v + dx)) : ctx.moveTo(X(u + dx), Y(v + dx))));
      ctx.stroke();
    }
  }
}

/** Headwear whose lower edge casts a shadow on the forehead (logic.js HEADWEAR_LINES). */
const HAT_ITEMS = ['beanie', 'pilot-cap', 'hat', 'headband'];

/**
 * The soft painted light and shade on the skin (inside the head outline, light from the upper left): the face turns
 * away from the light towards its edges (with a warm band where light turns to shade), the right side and the jaw are
 * a little darker, the forehead, cheekbones, nose bridge and chin catch the light, the eye sockets, inner eye corners
 * and the dip under the lower lip are softly shaded, the cheeks have a little blush, the hairline (or a hat or the
 * helmet) casts a soft shadow, and fair faces with ginger hair get a few pale freckles. Shading is kept away from the
 * middle of the cheeks, forehead and chin so the bumps there stay easy to see.
 * @param {CanvasRenderingContext2D} ctx the context (clipped to the head)
 * @param {object} f the face geometry
 * @param {object} look the face look
 * @returns {void}
 */
function shadeHead(ctx, f, look) {
  const { cx, cy, rx, ry, features: ft } = f;
  const base = look.skin;
  const deep = skinDeep(base);
  const lit = skinLit(base);
  const lt = lightness(base);
  const glow = 1 + (1 - lt) * 0.7; // darker skin shows its highlights a little stronger...
  const dim = Math.min(1, 0.62 + 0.5 * lt); // ...and needs less shade at its edges (it would go nearly black)
  ctx.save();
  ctx.translate(cx - rx * 0.1, cy - ry * 0.12);
  ctx.scale(1, ry / rx);
  const R = rx * 1.2;
  const round = ctx.createRadialGradient(0, 0, 0, 0, 0, R);
  round.addColorStop(0, css(deep, 0));
  round.addColorStop(0.56, css(deep, 0));
  round.addColorStop(0.74, css([214, 96, 84], 0.06));
  round.addColorStop(0.88, css(deep, 0.2 * dim));
  round.addColorStop(1, css(deep, 0.42 * dim));
  ctx.fillStyle = round;
  ctx.fillRect(-R * 1.3, -R * 1.3, R * 2.6, R * 2.6);
  ctx.restore();
  let lg = ctx.createLinearGradient(cx + rx * 0.15, 0, cx + rx * 1.15, 0);
  lg.addColorStop(0, css(deep, 0));
  lg.addColorStop(1, css(deep, 0.16 * dim));
  ctx.fillStyle = lg;
  ctx.fillRect(cx + rx * 0.15, cy - ry * 1.4, rx * 1.1, ry * 2.8);
  lg = ctx.createLinearGradient(0, cy + ry * 0.6, 0, cy + ry * 1.1);
  lg.addColorStop(0, css(deep, 0));
  lg.addColorStop(1, css(deep, 0.22 * dim));
  ctx.fillStyle = lg;
  ctx.fillRect(cx - rx * 1.4, cy + ry * 0.6, rx * 2.8, ry * 0.55);
  softSpot(ctx, cx - rx * 0.2, cy - ry * 0.6, rx * 0.62, ry * 0.3, lit, 0.2 * glow);
  softSpot(ctx, cx - rx * 0.48, cy + ry * 0.05, rx * 0.32, ry * 0.18, lit, 0.16 * glow);
  softSpot(ctx, cx + rx * 0.5, cy + ry * 0.05, rx * 0.28, ry * 0.16, lit, 0.07 * glow);
  softSpot(ctx, cx - rx * 0.035, cy + ry * ((ft.eyeV + ft.noseV) / 2), rx * 0.075, ry * 0.2, lit, 0.16 * glow);
  softSpot(ctx, cx - rx * 0.05, cy + ry * 0.84, rx * 0.22, ry * 0.08, lit, 0.08 * glow);
  // A soft sheen where skin shines most: high on the forehead and on the lit cheekbone.
  softSpot(ctx, cx - rx * 0.28, cy - ry * 0.68, rx * 0.24, ry * 0.07, [255, 255, 255], 0.13, -0.15);
  softSpot(ctx, cx - rx * 0.5, cy + ry * 0.0, rx * 0.13, ry * 0.05, [255, 255, 255], 0.1, -0.3);
  for (const s of [-1, 1]) {
    const ex = cx + s * rx * ft.eyeU;
    const ey = cy + ry * ft.eyeV;
    softSpot(ctx, ex, ey - ry * 0.035, rx * ft.eyeS * 1.9, ry * 0.17, deep, 0.17);
    softSpot(ctx, cx + s * rx * (ft.eyeU - ft.eyeS * 1.05), ey + ry * 0.01, rx * 0.07, ry * 0.07, deep, 0.15);
  }
  softSpot(ctx, cx, cy + ry * (ft.mouthV + 0.115), rx * ft.mouthW * 0.7, ry * 0.045, deep, 0.18);
  const blush = lt > 0.5 ? [236, 104, 112] : [196, 70, 84];
  for (const s of [-1, 1]) softSpot(ctx, cx + s * rx * 0.56, cy + ry * 0.27, rx * 0.26, ry * 0.16, blush, lt > 0.5 ? 0.08 : 0.12);
  if (look.armor || look.acc.some((a) => HAT_ITEMS.includes(a)) || !['bald', 'mohawk'].includes(look.hairStyle)) edgeShadow(ctx, f, deep, look.armor);
  if (look.hair === HAIR_COLOURS.ginger && lt > 0.66 && !look.armor) drawFreckles(ctx, f, look, deep);
}

/**
 * The soft shadow that the hair (or a hat, or the helmet's brow edge and cheek guards) casts on the skin just below
 * its edge: three strokes along the edge, wide and faint to narrow and darker.
 * @param {CanvasRenderingContext2D} ctx the context (clipped to the head)
 * @param {object} f the face geometry
 * @param {number[]} deep the skin's shadow colour
 * @param {object|null} armor the helmet options (null = hair or hat)
 * @returns {void}
 */
function edgeShadow(ctx, f, deep, armor) {
  const { cx, cy, rx, ry } = f;
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  for (const [wk, a, dv] of [[0.2, 0.07, 0.035], [0.12, 0.09, 0.025], [0.06, 0.12, 0.015]]) {
    ctx.strokeStyle = css(deep, a);
    ctx.lineWidth = ry * wk;
    ctx.beginPath();
    for (let i = 0; i <= 24; i += 1) {
      const u = -1.15 + (2.3 * i) / 24;
      const y = cy + ry * (hairline(f, u) + dv + (armor ? 0.03 : 0));
      if (i) ctx.lineTo(cx + u * rx, y); else ctx.moveTo(cx + u * rx, y);
    }
    ctx.stroke();
    if (!armor) continue;
    const v0 = hairline(f, HELMET.guard[0][1]) + 0.03;
    for (const s of [-1, 1]) { // along the cheek guards' inner edge
      ctx.beginPath();
      for (let i = 0; i <= 20; i += 1) {
        const v = v0 + ((HELMET.guardBottom - v0) * i) / 20;
        const x = cx + s * rx * (guardEdge(v) - dv);
        if (i) ctx.lineTo(x, cy + v * ry); else ctx.moveTo(x, cy + v * ry);
      }
      ctx.stroke();
    }
  }
  ctx.restore();
}

/**
 * A few small, pale freckles across the nose and the tops of the cheeks (much smaller and paler than the freckle
 * decoys, so they never look like something to press).
 * @param {CanvasRenderingContext2D} ctx the context
 * @param {object} f the face geometry
 * @param {object} look the face look
 * @param {number[]} deep the skin's shadow colour
 * @returns {void}
 */
function drawFreckles(ctx, f, look, deep) {
  const { cx, cy, rx, ry, features: ft } = f;
  const rand = rng(hashText(look.skin + look.hair));
  for (let i = 0; i < 36; i += 1) {
    const u = (rand() * 2 - 1) * 0.62;
    const v = ft.eyeV + 0.13 + rand() * 0.16 + Math.abs(u) * 0.12;
    ctx.fillStyle = css(deep, 0.16 + rand() * 0.14);
    ctx.beginPath();
    ctx.arc(cx + u * rx, cy + v * ry, rx * (0.005 + rand() * 0.006), 0, Math.PI * 2);
    ctx.fill();
  }
}

/** Cached layers of the still parts of recent faces (newest last): see stillLayers. */
const LAYER_CACHE = [];
/** How many faces (person, size and pixel ratio) keep their layers: the one being popped, plus a little room. */
const LAYER_CACHE_SIZE = 3;

/**
 * Paint part of a face into its own canvas that covers a box of the scene, lined up on whole device pixels so that
 * copying it back (putLayer) is exact.
 * @param {number[]} box [x0, y0, x1, y1] in CSS px (cut to the scene)
 * @param {number} sceneW scene width in CSS px
 * @param {number} sceneH scene height in CSS px
 * @param {number} dpr pixel ratio
 * @param {(ctx: CanvasRenderingContext2D) => void} paint draws in scene CSS px
 * @returns {{canvas: HTMLCanvasElement, x: number, y: number, w: number, h: number}} the layer and where it goes
 */
function paintLayer(box, sceneW, sceneH, dpr, paint) {
  const X0 = Math.max(0, Math.floor(box[0] * dpr));
  const Y0 = Math.max(0, Math.floor(box[1] * dpr));
  const X1 = Math.min(Math.round(sceneW * dpr), Math.ceil(box[2] * dpr));
  const Y1 = Math.min(Math.round(sceneH * dpr), Math.ceil(box[3] * dpr));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, X1 - X0);
  canvas.height = Math.max(1, Y1 - Y0);
  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, -X0, -Y0);
  paint(ctx);
  return { canvas, x: X0 / dpr, y: Y0 / dpr, w: canvas.width / dpr, h: canvas.height / dpr };
}

/**
 * Copy a cached layer into a picture.
 * @param {CanvasRenderingContext2D} ctx the picture (CSS px units)
 * @param {{canvas: HTMLCanvasElement, x: number, y: number, w: number, h: number}} layer the layer
 * @returns {void}
 */
function putLayer(ctx, layer) {
  ctx.drawImage(layer.canvas, layer.x, layer.y, layer.w, layer.h);
}

/**
 * The still parts of a face, painted once per person, size and pixel ratio (T8.1) and kept: `under` = back hair,
 * body, neckwear, ears, the skin with its pores and painted light and shade, and the nose; `over` = the head outline,
 * beard, front hair, headwear, earrings, moustache, clown nose and helmet. Everything that changes with the mood or
 * the redness is drawn between and over them (drawFace).
 * @param {object} f the face geometry
 * @param {object} spec the face spec
 * @param {object} look the face look
 * @param {number} seed the skin seed
 * @param {number} dpr pixel ratio
 * @returns {{under: object, over: object}} the two layers
 */
function stillLayers(f, spec, look, seed, dpr) {
  const key = JSON.stringify([f.cx, f.cy, f.rx, f.ry, f.width > 0 ? f.width : 0, f.height, spec, seed, dpr]);
  const at = LAYER_CACHE.findIndex((e) => e.key === key);
  if (at >= 0) {
    const [hit] = LAYER_CACHE.splice(at, 1);
    LAYER_CACHE.push(hit);
    return hit;
  }
  const { cx, cy, rx, ry } = f;
  const sceneW = f.width > 0 ? f.width : cx * 2; // the face is always centred, so a missing width is twice cx
  const base = look.skin;
  const armor = look.armor;
  const under = paintLayer([cx - rx * 2.2, 0, cx + rx * 2.2, f.height], sceneW, f.height, dpr, (ctx) => {
    if (!armor) drawBackHair(ctx, f, look);
    if (armor) drawArmorBody(ctx, f, look); else drawShoulders(ctx, f, look);
    drawNeckwear(ctx, f, look);
    if (!armor) drawEars(ctx, f, look);
    ctx.save();
    headPath(ctx, f);
    ctx.clip();
    ctx.save();
    ctx.translate(cx - rx * 1.15, cy - ry * 1.15);
    const c = rgbOf(base);
    paintSkin(ctx, rx * 2.3, ry * 2.35, dpr, seed, {
      poreSize: Math.max(0.7, f.unit * 0.8), redness: 0.5,
      tone: [css(mixRgb(c, skinLit(base), 0.08)), base, css(mixRgb(c, skinDeep(base), 0.1))],
    });
    ctx.restore();
    shadeHead(ctx, f, look);
    ctx.restore();
    if (look.roundNose) drawRoundNose(ctx, f, base); else drawNose(ctx, f, base);
  });
  const over = paintLayer([cx - rx * 2.2, cy - ry * 2.5, cx + rx * 2.2, cy + ry * 1.7], sceneW, f.height, dpr, (ctx) => {
    headPath(ctx, f); // a soft outline so the head reads clearly on a small screen
    ctx.strokeStyle = css(skinDeep(base), 0.5);
    ctx.lineWidth = Math.max(1.2, rx * 0.012);
    ctx.stroke();
    if (look.beard) drawBeard(ctx, f, look);
    if (!armor) drawFrontHair(ctx, f, look);
    drawHeadwear(ctx, f, look);
    drawEarrings(ctx, f, look);
    drawFaceWear(ctx, f, look);
    if (armor) drawHelmet(ctx, f, armor);
  });
  const entry = { key, under, over };
  LAYER_CACHE.push(entry);
  if (LAYER_CACHE.length > LAYER_CACHE_SIZE) LAYER_CACHE.shift();
  return entry;
}

/**
 * A mood name tidied up: faceMood's older names are mapped onto MOODS (plus 'meh'); anything unknown is grim.
 * @param {string} [m] the mood
 * @returns {string} the mood
 */
function moodOf(m) {
  return MOOD_ALIAS[m] ?? (MOODS.includes(m) ? m : 'grim');
}

/**
 * Draw the whole person into a context: background, the still layers (body, ears, skin, nose; hair, beard, headwear,
 * helmet), and between and over them what changes: angry red patches that calm down as bumps are cleared, mood blush
 * and glow, brows, eyes, mouth, glasses and mood extras. The picture's canvas also gets its idle life
 * (canvas.faceLife, see makeFaceLife), which the pop scene draws on top.
 * @param {CanvasRenderingContext2D} ctx where to draw (CSS pixel units)
 * @param {object} face the face geometry from faceGeometry(w, h, spec)
 * @param {object} spec the face spec (face part ids, see DEFAULT_FACE_SPEC)
 * @param {{mood?: string, redness?: number, seed?: number, dpr?: number, background?: boolean}} [o] mood
 *   ('grim'|'ow'|'relief'|'glowing', or faceMood's 'sad'|'meh'|'happy'|'glow'), redness 0..1, a seed for the skin
 *   details, the pixel ratio, and background: false to draw only the person, without the plain wall (pop scene, reveal)
 * @returns {void}
 */
export function drawFace(ctx, face, spec = DEFAULT_FACE_SPEC, o = {}) {
  const mood = moodOf(o.mood);
  const redness = o.redness ?? 1;
  const seed = o.seed ?? 1;
  const f = face;
  const { cx, cy, rx, ry } = f;
  const look = faceLook(spec);
  if (o.background !== false) drawBackground(ctx, f.width, f.height);
  const layers = stillLayers(f, spec, look, seed, o.dpr ?? 1);
  putLayer(ctx, layers.under);
  ctx.save();
  headPath(ctx, f);
  ctx.clip();
  // Angry, red patches (fade away as the face is cleared).
  if (redness > 0.02) {
    const rand = rng(seed + 3);
    const zones = [[-0.55, 0.2], [0.55, 0.2], [0, -0.62], [-0.35, -0.64], [0.35, -0.62], [0, 0.8], [-0.5, 0.58], [0.5, 0.58], [0, 0.08]];
    for (const [u, v] of zones) {
      const x = cx + u * rx + (rand() - 0.5) * rx * 0.2;
      const y = cy + v * ry + (rand() - 0.5) * ry * 0.1;
      const r = rx * (0.24 + rand() * 0.12);
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, `rgba(226,96,92,${0.3 * redness})`);
      g.addColorStop(1, 'rgba(226,96,92,0)');
      ctx.fillStyle = g;
      ctx.fillRect(x - r, y - r, r * 2, r * 2);
    }
  }
  // Rosy cheeks when things get better (always a little for a character with blush, like the comic).
  if (mood === 'relief' || mood === 'glowing' || look.blush) {
    for (const s of [-1, 1]) {
      const x = cx + s * rx * 0.55;
      const y = cy + ry * 0.22;
      const g = ctx.createRadialGradient(x, y, 0, x, y, rx * 0.24);
      g.addColorStop(0, `rgba(255,120,140,${mood === 'glowing' ? 0.45 : mood === 'relief' ? 0.32 : 0.2})`);
      g.addColorStop(1, 'rgba(255,130,145,0)');
      ctx.fillStyle = g;
      ctx.fillRect(x - rx * 0.3, y - rx * 0.3, rx * 0.6, rx * 0.6);
    }
  }
  if (mood === 'glowing') { // a healthy glow over the whole face
    const g = ctx.createRadialGradient(cx - rx * 0.3, cy - ry * 0.4, 0, cx - rx * 0.3, cy - ry * 0.4, rx * 1.1);
    g.addColorStop(0, 'rgba(255,250,235,0.3)');
    g.addColorStop(1, 'rgba(255,250,235,0)');
    ctx.fillStyle = g;
    ctx.fillRect(cx - rx * 1.3, cy - ry * 1.3, rx * 2.6, ry * 2.6);
  }
  ctx.restore();
  putLayer(ctx, layers.over);
  drawBrows(ctx, f, look, mood);
  const ft = f.features;
  for (const s of [-1, 1]) drawEye(ctx, cx + s * rx * ft.eyeU, cy + ry * ft.eyeV, rx * ft.eyeS, look.eyes, mood, s, look.eyeColour, look.skin);
  drawMouth(ctx, f, look, mood);
  drawGlasses(ctx, f, look);
  drawMoodExtras(ctx, f, mood);
  if (ctx.canvas) ctx.canvas.faceLife = makeFaceLife(f, spec, { mood, seed, look, dpr: o.dpr ?? 1 });
  if (ctx.canvas) ctx.canvas.skinAt = skinTest(f, layers); // where the bare skin is (the pop scene's goo lands only there)
}

/**
 * A test for where the bare skin is on a face picture (owner 2026-10-31: goo that lands on hair, a hat or the room
 * must not stay there): the head outline with the front hair, beard, headwear and helmet (the `over` layer) cut out,
 * as a small mask made the first time it is asked and kept with the still layers.
 * @param {object} f the face geometry
 * @param {{over: object, skin?: object|null}} entry the face's still layers (stillLayers)
 * @returns {(x: number, y: number) => boolean|null} (x, y in scene px) -> true on skin, false off it, null when no mask
 *   can be made (no canvas, or pixel reading is blocked): then the caller uses its own skin oval
 */
function skinTest(f, entry) {
  return (x, y) => {
    if (entry.skin === undefined) entry.skin = skinMask(f, entry.over);
    const m = entry.skin;
    if (!m) return null;
    const i = Math.floor(x * m.k);
    const j = Math.floor(y * m.k);
    if (i < 0 || j < 0 || i >= m.w || j >= m.h) return false;
    return m.data[j * m.w + i] === 1;
  };
}

/**
 * Paint the skin mask once (a quarter of the scene's size): the head outline, minus the over layer; read back as one
 * byte per mask pixel (1 = skin). A blank or scrambled read (some privacy settings) gives null.
 * @param {object} f the face geometry
 * @param {{canvas: HTMLCanvasElement, x: number, y: number, w: number, h: number}} over the over layer
 * @returns {{w: number, h: number, k: number, data: Uint8Array}|null} the mask, or null
 */
function skinMask(f, over) {
  try {
    const K = 0.25;
    const w = Math.max(1, Math.ceil((f.width > 0 ? f.width : f.cx * 2) * K));
    const h = Math.max(1, Math.ceil(f.height * K));
    const cv = document.createElement('canvas');
    cv.width = w;
    cv.height = h;
    const c = cv.getContext('2d', { willReadFrequently: true });
    c.setTransform(K, 0, 0, K, 0, 0);
    headPath(c, f);
    c.fillStyle = '#ffffff';
    c.fill();
    c.globalCompositeOperation = 'destination-out'; // hair, beard, hats and helmet are not skin
    putLayer(c, over);
    const px = c.getImageData(0, 0, w, h).data;
    const data = new Uint8Array(w * h);
    let n = 0;
    for (let i = 0; i < w * h; i += 1) if (px[i * 4 + 3] > 140) { data[i] = 1; n += 1; }
    if (n < Math.PI * f.rx * f.ry * K * K * 0.35) return null; // far too little skin: the read was blank or scrambled
    return { w, h, k: K, data };
  } catch {
    return null;
  }
}

/** Mood -> the idle life (T8.1): seconds between blinks [min, max], seconds between glances [min, max], how long a
 * glance holds [min, max], and how far the eyes look (gx sideways, gy up (-) or down, in eye half-widths / heights).
 * Grim glances sideways often (suspicious), relief looks softly up and about; moods that are not here (glowing and
 * ow have closed eyes, sleep is asleep) never blink or glance. */
const LIFE_PLANS = {
  grim: { blink: [2.4, 4.6], look: [2.6, 5.5], hold: [0.5, 1.1], gx: 0.26, gy: 0.06 },
  meh: { blink: [2.8, 5.2], look: [4, 7], hold: [0.7, 1.4], gx: 0.18, gy: 0.04 },
  relief: { blink: [3, 5.6], look: [3.5, 6.5], hold: [0.9, 1.7], gx: 0.14, gy: -0.16 },
};
/** Seconds one blink takes (down quickly, a moment shut, up again). */
const BLINK_TIME = 0.2;
/** Seconds a flinch takes (a goo drop flying at an eye): snapped shut, squeezed a moment, open again. */
const FLINCH_TIME = 0.45;
/** Seconds the eyes take to move into a glance, or back. */
const GLANCE_MOVE = 0.09;

/**
 * The idle life of a face picture (T8.1): when it blinks and where it glances, as a pure plan over time, and how to
 * draw it. Only the eyes are drawn again (and the glasses over them), only while they are not at rest, each into a
 * small canvas of its own that is repainted only when the eye's state changes, so a held glance costs two small copies. The breathing sway is a whole-canvas move the pop scene does itself
 * (`breath`: px up and seconds per breath). Nothing here runs with reduced motion: the pop scene never asks.
 * @param {object} face the face geometry
 * @param {object} spec the face spec
 * @param {{mood?: string, seed?: number, look?: object, dpr?: number, debugBlink?: boolean|object}} [o] the mood, a
 *   seed for the timing, the face look if already known, the pixel ratio of the picture, and debugBlink = true: always
 *   blinking and glancing in turn (to time the worst case), or a fixed state {blink, gx, gy} (for preview pictures)
 * @returns {{breath: {px: number, period: number}, busy: (t: number) => boolean, next: (t: number) => number,
 *   draw: (ctx: CanvasRenderingContext2D, t: number) => void, eyes: {side: number, x: number, y: number, rx: number, ry: number}[],
 *   flinch: (t: number) => boolean}} busy = something is moving at t (seconds), next = seconds from t until the next
 *   movement starts (Infinity = never), draw = the moving eyes at t over the picture, eyes = where the eyes are (scene
 *   px, with lids and lenses: the goo keep-out), flinch = shut the eyes for a moment at t (a goo drop flying at one)
 */
export function makeFaceLife(face, spec, o = {}) {
  const look = o.look ?? faceLook(spec);
  const mood = moodOf(o.mood);
  const plan = LIFE_PLANS[mood];
  const debug = o.debugBlink === true || typeof o.debugBlink === 'object' ? o.debugBlink : null;
  const eyesMove = Boolean(plan) && !look.acc.includes('sunglasses'); // sunglasses hide the eyes
  const glances = eyesMove && look.eyes !== 'tiny'; // dot eyes only blink
  const glasses = look.acc.includes('glasses');
  const rand = rng(((o.seed ?? 1) * 7919 + 17) >>> 0);
  /** A random number in a range. @param {number[]} r [min, max] @returns {number} the number */
  const between = (r) => r[0] + rand() * (r[1] - r[0]);
  let started = false;
  let blinkAt = 0; // when the current or next blink starts
  let lookAt = 0; // when the current or next glance starts
  let lookEnd = 0; // when it starts to move back
  let gx = 0;
  let gy = 0;
  let flinchAt = -Infinity; // when a goo drop flying at an eye last made her flinch (engine.js, owner 2026-10-31)
  /**
   * How shut a flinch keeps the eyes at t: snapped shut, squeezed a moment, then open again (0..1).
   * @param {number} t seconds
   * @returns {number} 0 = open .. 1 = shut
   */
  const flinchK = (t) => {
    const d = t - flinchAt;
    if (d < 0 || d >= FLINCH_TIME) return 0;
    return d < 0.05 ? d / 0.05 : d < 0.3 ? 1 : 1 - (d - 0.3) / (FLINCH_TIME - 0.3);
  };
  /** Pick the next glance's length and direction (it starts at lookAt). @returns {void} */
  const planGlance = () => {
    lookEnd = lookAt + GLANCE_MOVE + between(plan.hold);
    gx = (rand() < 0.5 ? -1 : 1) * plan.gx * (0.7 + rand() * 0.3);
    gy = plan.gy * (0.5 + rand() * 0.5);
  };
  /** Move the plan on to time t: past blinks and glances are replaced by the next ones. @param {number} t seconds @returns {void} */
  const advance = (t) => {
    if (!started || t - blinkAt > 60 || t - lookEnd > 60) { // the first look at the face (or back after a long pause)
      started = true;
      blinkAt = t + 1 + rand() * 2;
      lookAt = t + 1.8 + rand() * 2.5;
      planGlance();
    }
    while (t >= blinkAt + BLINK_TIME) blinkAt += rand() < 0.15 ? 0.32 : between(plan.blink); // now and then a quick double blink
    while (t >= lookEnd + GLANCE_MOVE) { lookAt = lookEnd + GLANCE_MOVE + between(plan.look); planGlance(); }
  };
  /** How shut the eyes are and where they look at t. @param {number} t seconds @returns {{blink: number, gx: number, gy: number}} state */
  const state = (t) => {
    if (debug === true) return { blink: Math.round(((t * 3) % 1) * 5) / 5, gx: (0.2 * Math.round(((t * 1.3) % 1) * 4)) / 4, gy: 0 };
    if (debug) return { blink: debug.blink ?? 0, gx: debug.gx ?? 0, gy: debug.gy ?? 0 };
    advance(t);
    const d = t - blinkAt;
    let blink = 0;
    if (d >= 0 && d < BLINK_TIME) blink = d < 0.07 ? d / 0.07 : d < 0.1 ? 1 : 1 - (d - 0.1) / 0.1;
    blink = Math.max(blink, flinchK(t)); // a flinch at a flying goo drop shuts the eyes too
    let k = 0;
    if (glances && t >= lookAt && t < lookEnd + GLANCE_MOVE) {
      k = t < lookAt + GLANCE_MOVE ? (t - lookAt) / GLANCE_MOVE : t < lookEnd ? 1 : 1 - (t - lookEnd) / GLANCE_MOVE;
      k = Math.round(k * 4) / 4; // in steps, so each step's picture is made once (sprite)
    }
    return { blink: Math.round(blink * 5) / 5, gx: gx * k, gy: gy * k };
  };
  const ft = face.features;
  const es = face.rx * ft.eyeS;
  const hk = (EYE_SHAPES[look.eyes] ?? EYE_SHAPES.round)[0];
  const slots = {}; // per eye (-1, 1): its own small canvas and the state last painted into it
  /**
   * One eye (with the glasses over it) in a state, painted into that eye's own small canvas, which is made once and
   * painted again only when the state changes: while a glance holds, a frame just copies two small pictures.
   * @param {number} s -1 = left eye, 1 = right eye
   * @param {{blink: number, gx: number, gy: number}} st the state
   * @returns {{canvas: HTMLCanvasElement, x: number, y: number, w: number, h: number}} the picture and where it goes
   */
  const sprite = (s, st) => {
    const key = `${st.blink} ${st.gx.toFixed(4)} ${st.gy.toFixed(4)}`;
    const x = face.cx + s * face.rx * ft.eyeU;
    const y = face.cy + face.ry * ft.eyeV;
    let slot = slots[s];
    if (!slot) {
      const bw = Math.max(es * 1.55, face.rx * 0.25); // room for the lid, the lashes and a lens with its frame
      let painter = null;
      const layer = paintLayer([x - bw, y - bw, x + bw, y + bw], face.cx * 2, face.height, o.dpr ?? 1, (c) => { painter = c; });
      slot = { layer, ctx: painter, key: '' };
      slots[s] = slot;
    }
    if (slot.key !== key) {
      const c = slot.ctx;
      c.save();
      c.setTransform(1, 0, 0, 1, 0, 0);
      c.clearRect(0, 0, slot.layer.canvas.width, slot.layer.canvas.height);
      c.restore();
      drawEye(c, x, y, es, look.eyes, mood, s, look.eyeColour, look.skin, { ...st, over: true });
      if (glasses) drawGlasses(c, face, look, { side: s, eye: { x, y, s: es, h: es * hk } });
      slot.key = key;
    }
    return slot.layer;
  };
  const sleepy = mood === 'sleep';
  const lens = glasses || look.acc.includes('sunglasses');
  // The eyes' spots in scene px, with room for the lids, lashes and any lens: no goo may settle there (engine.js).
  const eyes = [-1, 1].map((s) => ({
    side: s, x: face.cx + s * face.rx * ft.eyeU, y: face.cy + face.ry * ft.eyeV,
    rx: lens ? Math.max(es * 1.35, face.rx * 0.22) : es * 1.3, ry: Math.max(es * hk, es * 0.55) * 1.45 + es * 0.15,
  }));
  return {
    breath: { px: sleepy ? 2 : mood === 'glowing' ? 1.5 : 1.2, period: sleepy ? 5.6 : 4.4 },
    eyes,
    /**
     * Flinch at a goo drop flying at an eye (owner 2026-10-31): both eyes snap shut for a moment, as a real flinch.
     * Faces whose eyes do not move (closed, asleep, sunglasses) do not flinch.
     * @param {number} t seconds (the same clock as draw)
     * @returns {boolean} true when the eyes shut
     */
    flinch(t) {
      if (!eyesMove || debug) return false;
      flinchAt = t - 0.05 * flinchK(t); // from how shut they are now: a new flinch, or a shut one held a little longer
      return true;
    },
    /** Whether the eyes are moving at t. @param {number} t seconds @returns {boolean} moving */
    busy(t) {
      if (!eyesMove) return false;
      if (debug) return true;
      if (flinchK(t) > 0) return true;
      advance(t);
      if (t >= blinkAt && t < blinkAt + BLINK_TIME) return true;
      return glances && ((t >= lookAt && t < lookAt + GLANCE_MOVE) || (t >= lookEnd && t < lookEnd + GLANCE_MOVE));
    },
    /** Seconds from t until the eyes next start to move. @param {number} t seconds @returns {number} seconds */
    next(t) {
      if (!eyesMove) return Infinity;
      advance(t);
      let soon = Infinity;
      for (const at of glances ? [blinkAt, lookAt, lookEnd] : [blinkAt]) if (at > t) soon = Math.min(soon, at - t);
      return soon;
    },
    /** Draw the eyes as they are at t over the picture (nothing while they rest). @param {CanvasRenderingContext2D} ctx scene px @param {number} t seconds @returns {void} */
    draw(ctx, t) {
      if (!eyesMove) return;
      const st = state(t);
      if (st.blink < 0.01 && Math.abs(st.gx) < 0.004 && Math.abs(st.gy) < 0.004) return;
      for (const s of [-1, 1]) putLayer(ctx, sprite(s, st));
    },
  };
}

/**
 * The scene picture (background plus person) as a canvas the engine copies and warps while squeezing. The canvas
 * carries the face's idle life as canvas.faceLife (see drawFace).
 * @param {number} w scene width in CSS px
 * @param {number} h scene height in CSS px
 * @param {number} dpr pixel ratio
 * @param {object} face the face geometry from faceGeometry(w, h, spec)
 * @param {object} spec the face spec
 * @param {{mood?: string, redness?: number, seed?: number}} [o] mood, redness 0..1 and seed
 * @returns {HTMLCanvasElement} the texture
 */
export function makeFaceTexture(w, h, dpr, face, spec, o = {}) {
  const { canvas, ctx } = makeCanvas(w, h, dpr);
  drawFace(ctx, face, spec, { ...o, dpr });
  return canvas;
}
