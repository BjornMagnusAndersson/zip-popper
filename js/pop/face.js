// The parts-based cartoon face for the pop scene (T2.1): head and shoulders on a bathroom-mirror background, drawn in
// code (no pictures, no real people). A face spec names one part of each kind from data/customers.js FACE_PARTS
// (shape, skinTone, hair, hairColor, eyes, brows, mouth, accessories); the mood (grim, ow, relief, glowing) changes
// the eyes, brows and mouth. Everything that lies on the face sits where faceGeometry (logic.js) says, so the bumps
// from layoutFace always land on bare skin, never on an eye, brow, mouth, lens, moustache or clown nose.
import { makeCanvas, paintSkin } from './art.js';
import { rng } from './logic.js';
import { FACE_PARTS, makeCustomer } from '../data/customers.js';

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
/** The four moods a face can show; older mood names from faceMood() are mapped onto these. */
export const MOODS = ['grim', 'ow', 'relief', 'glowing'];
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
  const ch = (v) => Math.round(v + (to - v) * k);
  return `rgba(${ch((n >> 16) & 255)},${ch((n >> 8) & 255)},${ch(n & 255)},${alpha})`;
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

/**
 * Turn a face spec into everything the drawing needs: part ids checked against FACE_PARTS (unknown ones get a
 * default), and colours as '#rrggbb'. Older specs ({skin, hair: '#colour', eyes: '#colour', shirt}) still work.
 * @param {object} [spec] the face spec
 * @returns {{shape: string, skin: string, hairStyle: string, hair: string, eyes: string, eyeColour: string,
 *   brows: string, mouth: string, acc: string[], shirt: string, accent: string, accent2: string}} the look
 */
export function faceLook(spec = DEFAULT_FACE_SPEC) {
  const s = spec ?? DEFAULT_FACE_SPEC;
  const isHex = (v) => typeof v === 'string' && /^#[0-9a-f]{6}$/i.test(v);
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
    eyeColour: isHex(s.eyes) ? s.eyes : pick(EYE_COLOURS),
    brows: part('brows', s.brows, 'flat'),
    mouth: part('mouth', s.mouth, 'smile'),
    acc,
    shirt: isHex(s.shirt) ? s.shirt : pick(SHIRT_COLOURS),
    accent,
    accent2: pick(ACCENTS.filter((c) => c !== accent)),
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
  const base = look.skin;
  ctx.fillStyle = shade(base, -0.08);
  ctx.fillRect(cx - rx * 0.42, cy + ry * 0.6, rx * 0.84, ry * 0.6);
  const neckShadow = ctx.createLinearGradient(0, cy + ry * 0.8, 0, cy + ry * 1.12);
  neckShadow.addColorStop(0, 'rgba(90,40,30,0.32)');
  neckShadow.addColorStop(1, 'rgba(90,40,30,0)');
  ctx.fillStyle = neckShadow;
  ctx.fillRect(cx - rx * 0.42, cy + ry * 0.8, rx * 0.84, ry * 0.32);
  const top = cy + ry * 1.04;
  const hood = ctx.createLinearGradient(0, top, 0, h);
  hood.addColorStop(0, look.shirt);
  hood.addColorStop(1, shade(look.shirt, -0.25));
  ctx.fillStyle = hood;
  ctx.beginPath();
  ctx.moveTo(cx - rx * 1.9, h + 4);
  ctx.bezierCurveTo(cx - rx * 1.85, top + ry * 0.12, cx - rx * 1.2, top, cx - rx * 0.5, top);
  ctx.quadraticCurveTo(cx, top + ry * 0.25, cx + rx * 0.5, top);
  ctx.bezierCurveTo(cx + rx * 1.2, top, cx + rx * 1.85, top + ry * 0.12, cx + rx * 1.9, h + 4);
  ctx.closePath();
  ctx.fill();
  if (!look.acc.includes('scarf')) {
    ctx.strokeStyle = '#f2f2f2';
    ctx.lineWidth = Math.max(2, rx * 0.02);
    ctx.lineCap = 'round';
    for (const s of [-1, 1]) { ctx.beginPath(); ctx.moveTo(cx + s * rx * 0.22, top + ry * 0.12); ctx.lineTo(cx + s * rx * 0.26, top + ry * 0.45); ctx.stroke(); }
  }
}

/**
 * Fill a hair shape in the hair colour with a soft shade at the bottom and a glossy shine band near the top.
 * The current path is the shape.
 * @param {CanvasRenderingContext2D} ctx the context
 * @param {object} f the face geometry
 * @param {string} hair hair colour
 * @param {number} [shineV] where the shine sits, in face units
 * @param {number} [dark] how much darker (0..1), for hair behind the head
 * @returns {void}
 */
function fillHair(ctx, f, hair, shineV = -0.95, dark = 0) {
  const { cx, cy, rx, ry } = f;
  const g = ctx.createLinearGradient(0, cy - ry * 1.3, 0, cy + ry * 0.4);
  g.addColorStop(0, shade(hair, 0.08 - dark));
  g.addColorStop(1, shade(hair, -0.18 - dark));
  ctx.fillStyle = g;
  ctx.fill();
  ctx.save();
  ctx.clip();
  ctx.strokeStyle = shade(hair, 0.5, 0.35);
  ctx.lineWidth = rx * 0.05;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.ellipse(cx - rx * 0.1, cy + ry * (shineV + 0.3), rx * 0.6, ry * 0.32, 0, Math.PI * 1.2, Math.PI * 1.45);
  ctx.stroke();
  ctx.restore();
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
    fillHair(ctx, f, hair, -1.15);
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
    fillHair(ctx, f, hair);
    return;
  }
  if (st === 'bun') { // the bun on top, with a hair tie
    ctx.beginPath();
    ctx.ellipse(cx, cy - ry * 1.2, rx * 0.34, ry * 0.24, 0, 0, Math.PI * 2);
    fillHair(ctx, f, hair, -1.35);
  }
  if (st === 'ponytail') { // a tail swinging out on the right
    ctx.beginPath();
    ctx.moveTo(cx + rx * 0.55, cy - ry * 1.0);
    ctx.bezierCurveTo(cx + rx * 1.3, cy - ry * 1.05, cx + rx * 1.32, cy - ry * 0.3, cx + rx * 1.2, cy + ry * 0.35);
    ctx.quadraticCurveTo(cx + rx * 1.12, cy + ry * 0.75, cx + rx * 0.98, cy + ry * 0.9);
    ctx.quadraticCurveTo(cx + rx * 1.05, cy + ry * 0.2, cx + rx * 0.8, cy - ry * 0.5);
    ctx.closePath();
    fillHair(ctx, f, hair, -0.7);
    ctx.fillStyle = look.accent;
    ctx.beginPath();
    ctx.ellipse(cx + rx * 1.06, cy - ry * 0.78, rx * 0.07, ry * 0.08, 0.6, 0, Math.PI * 2);
    ctx.fill();
  }
  // The back of the head (fills the temples behind the front hair).
  const low = st === 'bob' ? 0.45 : -0.05;
  ctx.beginPath();
  ctx.moveTo(cx - rx * 1.06, cy + ry * low);
  topArc(ctx, f, low, 1.07, 1.12);
  ctx.lineTo(cx + rx * 1.06, cy + ry * low);
  ctx.closePath();
  fillHair(ctx, f, hair, -0.95, 0.14); // a touch darker than the front hair
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
  const X = (u) => cx + u * rx;
  const Y = (v) => cy + v * ry;
  if (st === 'bald') {
    ctx.fillStyle = 'rgba(255,255,255,0.28)';
    ctx.beginPath();
    ctx.ellipse(X(-0.3), Y(-0.86), rx * 0.22, ry * 0.07, -0.35, 0, Math.PI * 2);
    ctx.fill();
    for (const s of [-1, 1]) { // tufts above the ears, outside the bare-skin oval
      ctx.beginPath();
      ctx.moveTo(X(s * 1.0), Y(-0.42));
      ctx.quadraticCurveTo(X(s * 1.13), Y(-0.3), X(s * 1.05), Y(-0.06));
      ctx.quadraticCurveTo(X(s * 0.99), Y(-0.2), X(s * 1.0), Y(-0.42));
      fillHair(ctx, f, hair);
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
    fillHair(ctx, f, hair, -1.2);
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
  if (st === 'short') bulges(9, 0.07);
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
  fillHair(ctx, f, hair);
  // Texture: strands for straight hair, little curls for curly hair.
  ctx.lineCap = 'round';
  ctx.strokeStyle = shade(hair, 0.28, 0.55);
  ctx.lineWidth = Math.max(1.2, rx * 0.012);
  if (st === 'curly' || st === 'afro') {
    const rand = rng(7);
    ctx.strokeStyle = shade(hair, 0.3, 0.5);
    for (let i = 0; i < 14; i += 1) { // small round curls: a light rim on top of each
      const u = -0.8 + rand() * 1.6;
      const v = -1.06 + rand() * Math.max(0.05, hairline(f, u) - 0.1 + 1.06);
      const r = rx * (0.05 + rand() * 0.03);
      ctx.beginPath(); ctx.arc(X(u), Y(v), r, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke();
    }
  } else {
    for (let i = 0; i < 9; i += 1) {
      const u = -0.7 + i * 0.175;
      const from = st === 'bun' || st === 'ponytail' ? -1.08 : -1.04;
      ctx.beginPath();
      ctx.moveTo(X(u * 0.6), Y(from));
      ctx.quadraticCurveTo(X(u * 0.85 + 0.04), Y((from + hairline(f, u)) / 2), X(u * 0.92), Y(hairline(f, u) - 0.02));
      ctx.stroke();
    }
  }
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
      ctx.quadraticCurveTo(X(s * 1.2), Y(0), X(s * 1.1), Y(-0.55));
      ctx.closePath();
      fillHair(ctx, f, hair, -0.4);
    }
  }
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
  const X = (u) => cx + u * rx;
  const Y = (v) => cy + v * ry;
  const has = (a) => look.acc.includes(a);
  const lw = Math.max(1.5, rx * 0.018);
  if (has('beanie')) {
    const c = look.accent;
    const bottom = (u) => hairline(f, u) + 0.03;
    // The dome.
    ctx.beginPath();
    ctx.moveTo(X(1.08), Y(bottom(1.08) - 0.12));
    topArc(ctx, f, bottom(1.08) - 0.12, 1.1, 1.2, -0.04);
    ctx.closePath();
    const g = ctx.createLinearGradient(0, Y(-1.3), 0, Y(-0.6));
    g.addColorStop(0, shade(c, 0.15));
    g.addColorStop(1, shade(c, -0.1));
    ctx.fillStyle = g;
    ctx.fill();
    // The folded brim with ribs.
    ctx.beginPath();
    for (let i = 0; i <= 24; i += 1) { const u = -1.1 + (2.2 * i) / 24; ctx.lineTo(X(u), Y(bottom(u) - 0.16)); }
    for (let i = 24; i >= 0; i -= 1) { const u = -1.1 + (2.2 * i) / 24; ctx.lineTo(X(u), Y(bottom(u))); }
    ctx.closePath();
    ctx.fillStyle = shade(c, -0.15);
    ctx.fill();
    ctx.strokeStyle = shade(c, -0.35, 0.6);
    ctx.lineWidth = lw;
    for (let i = 1; i < 16; i += 1) { const u = -1.1 + (2.2 * i) / 16; ctx.beginPath(); ctx.moveTo(X(u), Y(bottom(u) - 0.14)); ctx.lineTo(X(u), Y(bottom(u) - 0.02)); ctx.stroke(); }
    // The pom-pom.
    ctx.fillStyle = look.accent2;
    ctx.beginPath();
    for (let i = 0; i < 10; i += 1) { const a = (i / 10) * Math.PI * 2; ctx.moveTo(X(0) + Math.cos(a) * rx * 0.14, Y(-1.3) + Math.sin(a) * rx * 0.14); ctx.arc(X(0) + Math.cos(a) * rx * 0.1, Y(-1.3) + Math.sin(a) * rx * 0.1, rx * 0.07, 0, Math.PI * 2); }
    ctx.fill();
  }
  if (has('hat')) { // a round little bowler with a ribbon
    const c = look.accent;
    const brimV = f.features.hairTop - 0.07;
    ctx.fillStyle = shade(c, -0.25);
    ctx.beginPath();
    ctx.ellipse(X(0), Y(brimV), rx * 1.18, ry * 0.08, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(X(-0.7), Y(brimV));
    ctx.bezierCurveTo(X(-0.76), Y(-1.42), X(0.76), Y(-1.42), X(0.7), Y(brimV));
    ctx.closePath();
    const g = ctx.createLinearGradient(X(-0.7), 0, X(0.7), 0);
    g.addColorStop(0, shade(c, 0.1));
    g.addColorStop(1, shade(c, -0.2));
    ctx.fillStyle = g;
    ctx.fill();
    ctx.fillStyle = look.accent2;
    ctx.beginPath();
    ctx.moveTo(X(-0.71), Y(brimV - 0.02));
    ctx.lineTo(X(-0.73), Y(brimV - 0.12));
    ctx.lineTo(X(0.73), Y(brimV - 0.12));
    ctx.lineTo(X(0.71), Y(brimV - 0.02));
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.4)';
    ctx.lineWidth = rx * 0.04;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(X(-0.1), Y(-1.0), rx * 0.42, Math.PI * 1.2, Math.PI * 1.45);
    ctx.stroke();
  }
  if (has('pilot-cap')) { // navy captain's cap: crown, gold-braided band, shiny visor and a winged badge
    const bandBottom = f.features.hairTop - 0.06;
    ctx.fillStyle = '#2c3a66';
    ctx.beginPath();
    ctx.moveTo(X(-0.9), Y(bandBottom - 0.12));
    ctx.bezierCurveTo(X(-1.2), Y(-1.2), X(-0.9), Y(-1.4), X(0), Y(-1.4));
    ctx.bezierCurveTo(X(0.9), Y(-1.4), X(1.2), Y(-1.2), X(0.9), Y(bandBottom - 0.12));
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#1d2747';
    ctx.fillRect(X(-0.9), Y(bandBottom - 0.14), rx * 1.8, ry * 0.14);
    ctx.strokeStyle = '#e8c04a';
    ctx.lineWidth = lw * 1.4;
    ctx.beginPath(); ctx.moveTo(X(-0.88), Y(bandBottom - 0.07)); ctx.lineTo(X(0.88), Y(bandBottom - 0.07)); ctx.stroke();
    // Visor: a black glossy crescent just above the hairline.
    ctx.fillStyle = '#15161c';
    ctx.beginPath();
    ctx.moveTo(X(-0.72), Y(bandBottom));
    ctx.lineTo(X(0.72), Y(bandBottom));
    ctx.quadraticCurveTo(X(0), Y(f.features.hairTop + 0.08), X(-0.72), Y(bandBottom));
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.35)';
    ctx.lineWidth = lw;
    ctx.beginPath(); ctx.moveTo(X(-0.4), Y(bandBottom + 0.02)); ctx.quadraticCurveTo(X(0), Y(bandBottom + 0.06), X(0.4), Y(bandBottom + 0.02)); ctx.stroke();
    // Badge with wings.
    ctx.fillStyle = '#f2cc55';
    for (const s of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(X(s * 0.06), Y(bandBottom - 0.24));
      ctx.quadraticCurveTo(X(s * 0.3), Y(bandBottom - 0.32), X(s * 0.42), Y(bandBottom - 0.3));
      ctx.quadraticCurveTo(X(s * 0.25), Y(bandBottom - 0.2), X(s * 0.06), Y(bandBottom - 0.18));
      ctx.fill();
    }
    ctx.beginPath(); ctx.arc(X(0), Y(bandBottom - 0.22), rx * 0.07, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#c0392b';
    ctx.beginPath(); ctx.arc(X(0), Y(bandBottom - 0.22), rx * 0.035, 0, Math.PI * 2); ctx.fill();
  }
  if (has('headband')) { // a stretchy band along the hairline with a knot on the left
    const c = look.accent;
    ctx.beginPath();
    for (let i = 0; i <= 24; i += 1) { const u = -1.04 + (2.08 * i) / 24; ctx.lineTo(X(u), Y(hairline(f, u) - 0.14)); }
    for (let i = 24; i >= 0; i -= 1) { const u = -1.04 + (2.08 * i) / 24; ctx.lineTo(X(u), Y(hairline(f, u) - 0.04)); }
    ctx.closePath();
    ctx.fillStyle = c;
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.7)';
    ctx.lineWidth = lw;
    ctx.beginPath();
    for (let i = 0; i <= 24; i += 1) { const u = -1.0 + (2.0 * i) / 24; ctx.lineTo(X(u), Y(hairline(f, u) - 0.09)); }
    ctx.stroke();
    ctx.fillStyle = shade(c, -0.1);
    for (const s of [-1, 1]) {
      ctx.beginPath();
      ctx.ellipse(X(-0.78 + s * 0.12), Y(hairline(f, -0.78) - 0.16), rx * 0.13, rx * 0.07, s * 0.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  if (has('tiara')) { // a small golden crown with a pink gem
    const baseV = -1.05;
    ctx.beginPath();
    ctx.moveTo(X(-0.42), Y(baseV + 0.02));
    const pts = [[-0.42, -1.2], [-0.26, -1.12], [-0.14, -1.27], [0, -1.16], [0.14, -1.27], [0.26, -1.12], [0.42, -1.2]];
    for (const [u, v] of pts) ctx.lineTo(X(u), Y(v));
    ctx.lineTo(X(0.42), Y(baseV + 0.02));
    ctx.quadraticCurveTo(X(0), Y(baseV - 0.04), X(-0.42), Y(baseV + 0.02));
    const g = ctx.createLinearGradient(0, Y(-1.3), 0, Y(baseV));
    g.addColorStop(0, '#fff2a8');
    g.addColorStop(1, '#d9a520');
    ctx.fillStyle = g;
    ctx.fill();
    ctx.strokeStyle = '#b07d12';
    ctx.lineWidth = Math.max(1, lw * 0.6);
    ctx.stroke();
    ctx.fillStyle = '#f06aa8';
    ctx.beginPath(); ctx.arc(X(0), Y(-1.1), rx * 0.05, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#7fd4f0';
    for (const s of [-1, 1]) { ctx.beginPath(); ctx.arc(X(s * 0.24), Y(-1.08), rx * 0.03, 0, Math.PI * 2); ctx.fill(); }
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.beginPath(); ctx.arc(X(-0.02), Y(-1.115), rx * 0.016, 0, Math.PI * 2); ctx.fill();
  }
  if (has('veil')) { // the front of the veil: a pearl band on top of the head
    ctx.fillStyle = '#fffaf0';
    for (let i = 0; i <= 10; i += 1) {
      const u = -0.6 + (1.2 * i) / 10;
      ctx.beginPath();
      ctx.arc(X(u), Y(-1.06 + 0.12 * u * u), rx * 0.04, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  if (has('flower')) drawFlower(ctx, X(0.8), Y(-0.82), rx * 0.2, look.accent2);
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
  const X = (u) => cx + u * rx;
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
  for (const s of [-1, 1]) {
    ctx.fillStyle = shade(look.skin, -0.04);
    ctx.beginPath();
    ctx.ellipse(cx + s * rx * 0.98, cy - ry * 0.02, rx * 0.17, ry * 0.2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = shade(look.skin, -0.35, 0.45);
    ctx.beginPath();
    ctx.ellipse(cx + s * rx * 1.0, cy - ry * 0.02, rx * 0.07, ry * 0.11, 0, 0, Math.PI * 2);
    ctx.fill();
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
 * One eye in the face's style and mood: happy closed arcs when glowing, squeezed shut (> <) when it hurts, else open
 * with a stern slanted lid line when grim (eyes still wide awake), a small droop in meh and a lift from below in relief.
 * @param {CanvasRenderingContext2D} ctx the context
 * @param {number} x centre x
 * @param {number} y centre y
 * @param {number} s size (half the eye width)
 * @param {string} style the eye style id
 * @param {string} mood the mood
 * @param {number} side -1 = left eye, 1 = right eye
 * @param {string} iris iris colour
 * @param {string} lid lid colour (the skin, a little darker)
 * @returns {void}
 */
function drawEye(ctx, x, y, s, style, mood, side, iris, lid) {
  const ink = '#3a2a24';
  const size = style === 'tiny' ? s * 1.6 : s; // closed tiny eyes are drawn as big as the others, so the mood reads
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  if (mood === 'glowing') {
    ctx.strokeStyle = ink;
    ctx.lineWidth = Math.max(2, size * 0.17);
    ctx.beginPath();
    ctx.arc(x, y + size * 0.3, size * 0.7, Math.PI * 1.15, Math.PI * 1.85);
    ctx.stroke();
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
    ctx.fillStyle = '#2a201c';
    ctx.beginPath();
    ctx.ellipse(x, y, s * 0.42, s * 0.55, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(x - s * 0.12, y - s * 0.2, s * 0.15, 0, Math.PI * 2); ctx.fill();
    const drop = MOOD_LID[mood] ?? 0;
    if (mood === 'grim') { // a stern lid: a straight line slanted down towards the nose, the dot stays open
      const yOut = y - s * 0.6;
      const yIn = y - s * 0.12;
      ctx.fillStyle = lid;
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
      ctx.fillStyle = lid;
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
  const shut = grim ? Math.min(0.06 + styleLid * 0.25, 0.18) : Math.max(styleLid, MOOD_LID[mood] ?? 0); // grim: only a sliver, never half shut
  const tiltFill = grim ? 0.42 : 0.1; // how steeply the lid slopes down towards the nose (in eye heights)
  const tiltLine = grim ? 0.34 : 0.08;
  const bowFill = grim ? 0.06 : 0.18; // how much the lid sags in the middle
  const bowLine = grim ? 0.05 : 0.16;
  ctx.fillStyle = '#fbf8f4';
  ctx.beginPath();
  ctx.ellipse(x, y, s, h, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.save();
  ctx.clip();
  const ix = x + side * s * 0.05;
  const iy = y + h * 0.08;
  const ir = s * ik;
  const g = ctx.createRadialGradient(ix, iy - ir * 0.3, ir * 0.2, ix, iy, ir);
  g.addColorStop(0, shade(iris, 0.25));
  g.addColorStop(1, shade(iris, -0.25));
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(ix, iy, ir, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#1d2630';
  ctx.beginPath(); ctx.arc(ix, iy, ir * 0.48, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.beginPath(); ctx.arc(ix - ir * 0.35, iy - ir * 0.35, ir * 0.24, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(ix + ir * 0.3, iy + ir * 0.32, ir * 0.11, 0, Math.PI * 2); ctx.fill();
  if (style === 'sparkly') { // a second big sparkle
    ctx.beginPath(); ctx.arc(ix + ir * 0.38, iy - ir * 0.3, ir * 0.15, 0, Math.PI * 2); ctx.fill();
  }
  // Lids: the upper lid comes down (sleepy or grim); a lower lid lifts in relief, like a smile in the eyes.
  ctx.fillStyle = lid;
  const lidY = y - h + 2 * h * shut;
  if (shut > 0.02) {
    ctx.beginPath();
    ctx.moveTo(x - s * 1.1, y - h * 1.2);
    ctx.lineTo(x + s * 1.1, y - h * 1.2);
    ctx.lineTo(x + s * 1.1, lidY - side * h * tiltFill);
    ctx.quadraticCurveTo(x, lidY + h * bowFill, x - s * 1.1, lidY + side * h * tiltFill);
    ctx.closePath();
    ctx.fill();
  }
  if (mood === 'relief') {
    ctx.beginPath();
    ctx.ellipse(x, y + h * 1.25, s * 1.15, h * 0.62, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
  // The lash line along the top of the open part.
  ctx.strokeStyle = ink;
  ctx.lineWidth = Math.max(1.5, s * 0.13);
  ctx.beginPath();
  if (shut > 0.02) {
    ctx.moveTo(x - s * 0.98, lidY + side * h * tiltLine);
    ctx.quadraticCurveTo(x, lidY + h * bowLine, x + s * 0.98, lidY - side * h * tiltLine);
  } else {
    ctx.ellipse(x, y, s, h, 0, Math.PI * 1.05, Math.PI * 1.95);
  }
  ctx.stroke();
  if (style === 'sparkly' || style === 'wide') { // little lashes at the outer corner
    ctx.lineWidth = Math.max(1.2, s * 0.09);
    const ox = x + side * s * 0.92;
    const oy = shut > 0.02 ? lidY - h * tiltLine : y - h * 0.35;
    for (const k of [0, 1]) { ctx.beginPath(); ctx.moveTo(ox - side * s * 0.1 * k, oy - k * s * 0.05); ctx.lineTo(ox + side * s * 0.22, oy - s * (0.18 + 0.12 * k)); ctx.stroke(); }
  }
}

/** Brow style -> [thickness, arch, how much the inner end is raised at rest] (rx units). */
const BROW_STYLES = {
  flat: [0.055, 0.015, 0], arched: [0.05, 0.075, 0], thick: [0.09, 0.03, 0], worried: [0.055, 0.03, 0.05], thin: [0.028, 0.05, 0],
};
/** Mood -> [inner end raised, whole brow raised, outer end lowered] (ry units). Grim lowers the brow and points it down towards the nose (stern), ow pleads, glowing lifts. */
const MOOD_BROWS = {
  grim: [-0.08, -0.015, -0.02], meh: [0, 0, 0], ow: [0.08, 0, 0.03], relief: [0, 0.02, 0], glowing: [0.01, 0.03, -0.01],
};

/**
 * Both eyebrows in the face's style, tilted by the mood.
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
  ctx.strokeStyle = look.hairStyle === 'bald' ? shade('#6e4528', -0.2) : shade(look.hair, -0.25);
  ctx.lineCap = 'round';
  ctx.lineWidth = lw;
  for (const s of [-1, 1]) {
    const yIn = cy + ry * (ft.browV - lift - raise);
    const yOut = cy + ry * (ft.browV - raise + outerDrop);
    const xIn = cx + s * rx * (ft.eyeU - 0.17);
    const xOut = cx + s * rx * (ft.eyeU + 0.2);
    ctx.beginPath();
    ctx.moveTo(xIn, yIn);
    ctx.quadraticCurveTo(cx + s * rx * (ft.eyeU + 0.02), Math.min(yIn, yOut) - arch * rx * (mood === 'grim' ? 0.4 : 1), xOut, yOut); // grim brows are straighter
    ctx.stroke();
    if (look.brows === 'thick') { // a few hairs sticking out make it bushy
      ctx.lineWidth = Math.max(1, lw * 0.25);
      for (const k of [0.25, 0.5, 0.75]) {
        const x = xIn + (xOut - xIn) * k;
        const y = yIn + (yOut - yIn) * k - arch * rx * 0.9 * (1 - (2 * k - 1) ** 2);
        ctx.beginPath(); ctx.moveTo(x, y - lw * 0.3); ctx.lineTo(x + s * lw * 0.35, y - lw * 0.62); ctx.stroke();
      }
      ctx.lineWidth = lw;
    }
  }
}

/**
 * The nose: a soft side shadow, nostrils and a highlight on the tip.
 * @param {CanvasRenderingContext2D} ctx the context
 * @param {object} f the face geometry
 * @param {string} base skin colour
 * @returns {void}
 */
function drawNose(ctx, f, base) {
  const { cx, cy, rx, ry, features: ft } = f;
  const nv = ft.noseV;
  ctx.strokeStyle = shade(base, -0.4, 0.5);
  ctx.lineWidth = rx * 0.035;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(cx + rx * 0.06, cy + ry * (nv - 0.26));
  ctx.quadraticCurveTo(cx + rx * 0.15, cy + ry * (nv - 0.06), cx + rx * 0.12, cy + ry * (nv + 0.04));
  ctx.stroke();
  ctx.fillStyle = shade(base, -0.55, 0.55);
  for (const s of [-1, 1]) { ctx.beginPath(); ctx.ellipse(cx + s * rx * 0.08, cy + ry * (nv + 0.06), rx * 0.04, ry * 0.018, s * 0.3, 0, Math.PI * 2); ctx.fill(); }
  ctx.fillStyle = 'rgba(255,240,230,0.45)';
  ctx.beginPath();
  ctx.ellipse(cx - rx * 0.02, cy + ry * (nv - 0.02), rx * 0.06, ry * 0.03, 0, 0, Math.PI * 2);
  ctx.fill();
}

/**
 * The mouth in the face's style and mood: a frown, grimace or open frown when grim, a wide open "O" when it hurts,
 * a smile or grin in relief, a big open smile when glowing.
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
  const lineCol = '#7c3238';
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  /**
   * A mouth drawn as one line: curve > 0 smiles, < 0 frowns; wobble adds a wave.
   * @param {number} curve how far the middle sits below the corners (ry units)
   * @param {number} [wobble] wave height (ry units)
   * @param {number} [wk] width factor
   * @returns {void}
   */
  const line = (curve, wobble = 0, wk = 1) => {
    ctx.strokeStyle = lineCol;
    ctx.lineWidth = Math.max(2, rx * 0.05);
    ctx.beginPath();
    for (let i = 0; i <= 24; i += 1) {
      const k = i / 24;
      const u = (2 * k - 1);
      const y = my - curve * ry * (u * u) + wobble * ry * Math.sin(k * Math.PI * 4);
      const x = cx + u * mw * wk;
      if (i === 0) ctx.moveTo(x, y + curve * ry * 0.5); else ctx.lineTo(x, y + curve * ry * 0.5);
    }
    ctx.stroke();
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
    outline();
    ctx.fillStyle = o.clench ? '#fffdf8' : '#5e2130';
    ctx.fill();
    ctx.save();
    ctx.clip();
    const midTop = my + ry * (top + corner) / 2; // the middle of the top lip
    const midBottom = my + ry * (bottom + corner) / 2; // the middle of the bottom lip
    if (o.tongue) { ctx.fillStyle = '#ef7d8a'; ctx.beginPath(); ctx.ellipse(cx, midBottom, w * 0.55, (midBottom - midTop) * 0.45, 0, 0, Math.PI * 2); ctx.fill(); }
    if (o.teeth) { ctx.fillStyle = '#fffdf8'; ctx.fillRect(cx - w, midTop - ry, w * 2, ry + (midBottom - midTop) * 0.3); }
    if (o.clench) { // gritted teeth: a line across and a few gaps
      ctx.strokeStyle = 'rgba(120,90,90,0.6)';
      ctx.lineWidth = Math.max(1, rx * 0.015);
      const mid = (midTop + midBottom) / 2;
      ctx.beginPath(); ctx.moveTo(cx - w, mid); ctx.lineTo(cx + w, mid); ctx.stroke();
      for (const k of [-0.5, 0, 0.5]) { ctx.beginPath(); ctx.moveTo(cx + k * w, midTop - ry * 0.05); ctx.lineTo(cx + k * w, midBottom + ry * 0.05); ctx.stroke(); }
    }
    ctx.restore();
    outline();
    ctx.strokeStyle = lineCol;
    ctx.lineWidth = Math.max(1.5, rx * 0.03);
    ctx.stroke();
  };
  if (mood === 'ow') { open(0.02, -0.1, 0.2, { teeth: true, tongue: true, wk: st === 'small' ? 0.9 : 0.72 }); return; }
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
 * Accessories that sit on the face: moustache, clown nose, glasses and sunglasses (all inside faceGeometry's keep-out boxes).
 * @param {CanvasRenderingContext2D} ctx the context
 * @param {object} f the face geometry
 * @param {object} look the face look
 * @returns {void}
 */
function drawFaceWear(ctx, f, look) {
  const { cx, cy, rx, ry, features: ft } = f;
  const X = (u) => cx + u * rx;
  const Y = (v) => cy + v * ry;
  const has = (a) => look.acc.includes(a);
  if (has('moustache')) {
    const y = Y(ft.noseV + 0.16);
    ctx.fillStyle = look.hairStyle === 'bald' ? '#6e4528' : shade(look.hair, -0.1);
    for (const s of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(X(0), y - ry * 0.05);
      ctx.bezierCurveTo(X(s * 0.18), y - ry * 0.1, X(s * 0.3), y - ry * 0.02, X(s * 0.33), y - ry * 0.06);
      ctx.bezierCurveTo(X(s * 0.31), y + ry * 0.05, X(s * 0.14), y + ry * 0.06, X(0), y + ry * 0.01);
      ctx.closePath();
      ctx.fill();
    }
    ctx.strokeStyle = 'rgba(255,255,255,0.25)';
    ctx.lineWidth = Math.max(1, rx * 0.012);
    for (const s of [-1, 1]) { ctx.beginPath(); ctx.moveTo(X(s * 0.06), y - ry * 0.04); ctx.quadraticCurveTo(X(s * 0.17), y - ry * 0.06, X(s * 0.26), y - ry * 0.03); ctx.stroke(); }
  }
  if (has('clown-nose')) {
    const x = X(0);
    const y = Y(ft.noseV);
    const r = rx * 0.11;
    // Elastic strap to the ears so it reads as a clown's nose, not as a bump.
    ctx.strokeStyle = '#2b2b33';
    ctx.lineWidth = Math.max(1.5, rx * 0.012);
    for (const s of [-1, 1]) { ctx.beginPath(); ctx.moveTo(x + s * r * 0.9, y); ctx.quadraticCurveTo(X(s * 0.5), y - ry * 0.02, X(s * 0.93), y - ry * 0.05); ctx.stroke(); }
    const g = ctx.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.1, x, y, r);
    g.addColorStop(0, '#ff8a80');
    g.addColorStop(0.6, '#e8303a');
    g.addColorStop(1, '#a51d2a');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    ctx.beginPath(); ctx.ellipse(x - r * 0.35, y - r * 0.42, r * 0.28, r * 0.17, -0.5, 0, Math.PI * 2); ctx.fill();
  }
  if (has('glasses') || has('sunglasses')) {
    const sun = has('sunglasses');
    const frame = sun ? '#1d1b26' : shade(look.accent, -0.35);
    const lw = Math.max(2, rx * 0.035);
    const r = rx * 0.2;
    const ey = Y(ft.eyeV);
    for (const s of [-1, 1]) {
      const ex = X(s * ft.eyeU);
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
      if (sun) {
        const g = ctx.createLinearGradient(0, ey - r * 0.6, 0, ey + r * 0.7);
        g.addColorStop(0, '#2a2f55');
        g.addColorStop(1, '#6b3f7a');
        ctx.fillStyle = g;
      } else {
        ctx.fillStyle = 'rgba(210,235,255,0.18)';
      }
      ctx.fill();
      ctx.strokeStyle = frame;
      ctx.lineWidth = lw;
      ctx.stroke();
      // A glint across the glass.
      ctx.strokeStyle = sun ? 'rgba(255,255,255,0.55)' : 'rgba(255,255,255,0.7)';
      ctx.lineWidth = Math.max(1.5, rx * 0.022);
      ctx.beginPath();
      ctx.moveTo(ex - r * 0.5, ey - r * (sun ? 0.25 : 0.45));
      ctx.lineTo(ex - r * 0.15, ey - r * (sun ? 0.5 : 0.7));
      ctx.stroke();
      // The arm towards the ear.
      ctx.strokeStyle = frame;
      ctx.lineWidth = lw;
      ctx.beginPath();
      ctx.moveTo(ex + s * r, ey - r * (sun ? 0.5 : 0.2));
      ctx.lineTo(X(s * 0.99), Y(ft.eyeV - 0.04));
      ctx.stroke();
    }
    ctx.beginPath(); // the bridge
    ctx.moveTo(X(-ft.eyeU) + r, ey - r * (sun ? 0.45 : 0.15));
    ctx.quadraticCurveTo(X(0), ey - r * 0.55, X(ft.eyeU) - r, ey - r * (sun ? 0.45 : 0.15));
    ctx.stroke();
  }
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
 * Draw the whole person into a context: background, veil and back hair, shoulders and neckwear, ears, skin with angry
 * red patches that calm down as bumps are cleared, front hair, headwear, brows, eyes, nose, mouth and face-wear.
 * @param {CanvasRenderingContext2D} ctx where to draw (CSS pixel units)
 * @param {object} face the face geometry from faceGeometry(w, h, spec)
 * @param {object} spec the face spec (face part ids, see DEFAULT_FACE_SPEC)
 * @param {{mood?: string, redness?: number, seed?: number, dpr?: number}} [o] mood ('grim'|'ow'|'relief'|'glowing',
 *   or faceMood's 'sad'|'meh'|'happy'|'glow'), redness 0..1, a seed for the skin details, and the pixel ratio
 * @returns {void}
 */
export function drawFace(ctx, face, spec = DEFAULT_FACE_SPEC, o = {}) {
  const mood = MOOD_ALIAS[o.mood] ?? (MOODS.includes(o.mood) ? o.mood : 'grim');
  const redness = o.redness ?? 1;
  const seed = o.seed ?? 1;
  const f = face;
  const { cx, cy, rx, ry } = f;
  const look = faceLook(spec);
  const base = look.skin;
  drawBackground(ctx, f.width, f.height);
  drawBackHair(ctx, f, look);
  drawShoulders(ctx, f, look);
  drawNeckwear(ctx, f, look);
  drawEars(ctx, f, look);
  // The skin inside the head outline.
  ctx.save();
  headPath(ctx, f);
  ctx.clip();
  ctx.save();
  ctx.translate(cx - rx * 1.15, cy - ry * 1.15);
  paintSkin(ctx, rx * 2.3, ry * 2.35, o.dpr ?? 1, seed, { poreSize: Math.max(0.7, f.unit * 0.8), redness, tone: [shade(base, 0.12), shade(base, 0), shade(base, -0.1)] });
  ctx.restore();
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
  // Roundness: lighter in the middle, a soft shadow at the edges, and a glossy shine on the forehead and cheek.
  const round = ctx.createRadialGradient(cx - rx * 0.2, cy - ry * 0.25, rx * 0.2, cx, cy, rx * 1.3);
  round.addColorStop(0, 'rgba(255,240,228,0.16)');
  round.addColorStop(0.7, 'rgba(0,0,0,0)');
  round.addColorStop(1, 'rgba(90,40,30,0.32)');
  ctx.fillStyle = round;
  ctx.fillRect(cx - rx * 1.3, cy - ry * 1.3, rx * 2.6, ry * 2.6);
  // Rosy cheeks when things get better.
  if (mood === 'relief' || mood === 'glowing') {
    for (const s of [-1, 1]) {
      const x = cx + s * rx * 0.55;
      const y = cy + ry * 0.22;
      const g = ctx.createRadialGradient(x, y, 0, x, y, rx * 0.24);
      g.addColorStop(0, `rgba(255,120,140,${mood === 'glowing' ? 0.45 : 0.32})`);
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
  // A soft outline so the head reads clearly on a small screen.
  headPath(ctx, f);
  ctx.strokeStyle = shade(base, -0.4, 0.45);
  ctx.lineWidth = Math.max(1.2, rx * 0.012);
  ctx.stroke();
  drawFrontHair(ctx, f, look);
  drawHeadwear(ctx, f, look);
  drawEarrings(ctx, f, look);
  drawBrows(ctx, f, look, mood);
  const ft = f.features;
  for (const s of [-1, 1]) drawEye(ctx, cx + s * rx * ft.eyeU, cy + ry * ft.eyeV, rx * ft.eyeS, look.eyes, mood, s, look.eyeColour, shade(base, -0.06));
  drawNose(ctx, f, base);
  drawMouth(ctx, f, look, mood);
  drawFaceWear(ctx, f, look);
  drawMoodExtras(ctx, f, mood);
}

/**
 * The scene picture (background plus person) as a canvas the engine copies and warps while squeezing.
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
