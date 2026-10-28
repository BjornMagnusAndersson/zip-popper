// The comic art kit: the heroine, the husband and props, drawn as SVG in the game's cartoon style (soft shaded skin,
// rosy cheeks, the same skin tones, hair and shirt colours as the pop scene in face.js, plus a friendly ink outline
// so they sit well inside comic panels). No pictures, no real people, no blood: playful only.
// The only word painted in the art itself is the studio sign's "CLEAN!" (string art.sign.clean, B9); all other words
// go in bubbles.
//
// Everything is data, so a strip just names what it wants:
//   { id: 'her', art: 'heroine', x: 420, y: 880, scale: 1, expr: 'bliss', pose: 'pop', outfit: 'everyday', look: 1 }
//   { id: 'him', art: 'husband', x: 1100, y: 860, flip: true, expr: 'scheming', pose: 'sit', hold: 'remote' }
//   { art: 'sofa', x: 1100, y: 880, w: 760 }
// x, y = the point on the floor under the figure (for 'bust' and 'lie': the bottom middle of the chest).
// scale 1 = a standing figure about 620 units tall. flip mirrors left-right. look: -1 or 1 = eyes glance that way.
// Options per piece: see CHARACTERS, OUTFITS, EXPRESSIONS, POSES, HOLDS and PROPS below. Add a new character, outfit,
// expression or pose by adding a row to those tables. Every art function returns { node, mouth } (mouth in panel units).

import { t, hasString } from '../core/strings.js';

export const INK = '#2a211d'; // the outline colour (face.js 'black')
export const GLOVE_BLUE = '#6fc3ef'; // her rubber gloves, the same blue as the inspector's glove box (SPEC D32e)
/** Skin tones, the same middle colours as face.js SKIN_TONES. */
export const SKIN = { fair: '#f6d6c2', light: '#ebb795', tan: '#d29a6c', olive: '#c09468', brown: '#946040', deep: '#62402e' };
/** Hair colours, the same as face.js HAIR_COLOURS. */
export const HAIR = { black: '#2a211d', brown: '#6e4528', blonde: '#e2b553', ginger: '#d0672e', grey: '#b5b4ba', blue: '#4f86e8', pink: '#f08cbf' };

/** The cast. A strip layer can override any of these (e.g. hairColor) for one panel. */
export const CHARACTERS = {
  heroine: { skin: 'light', hair: 'bun', hairColor: 'brown', outfit: 'everyday', build: 'slim', lashes: true, nose: 'button', eyeColor: '#4d8a5a' },
  husband: { skin: 'tan', hair: 'tuft', hairColor: 'black', beard: true, outfit: 'hoodie', build: 'stocky', nose: 'round', eyeColor: '#5d4030' },
  // Support group (strip 3 on). size = height compared with the heroine (multiplies scale).
  greta: { skin: 'fair', hair: 'topknot', hairColor: '#f4f1ea', glasses: '#8e5bd0', outfit: 'cardigan', build: 'round', lashes: true, nose: 'round', eyeColor: '#5b7ce6', size: 0.92 },
  nils: { skin: 'olive', hair: 'bald', hairColor: 'ginger', beard: true, outfit: 'flannel', build: 'lanky', nose: 'round', eyeColor: '#4d8a5a', size: 1.16 },
  penny: { skin: 'deep', hair: 'bob', hairColor: 'pink', outfit: 'sunny', build: 'slim', lashes: true, nose: 'button', eyeColor: '#5d4030', size: 0.84 },
  // The hygiene inspector (strip 5 on): neat combover, tiny moustache, drab suit and tie; holds a clipboard or magnifier.
  inspector: { skin: 'brown', hair: 'combover', hairColor: 'grey', moustache: true, outfit: 'suit', build: 'lanky', nose: 'round', eyeColor: '#5d4030', size: 1.04 },
  // The landlord (strip "plan", a one-off): a short, cheerful salesman with slicked hair, lost in a loud, too-big suit.
  landlord: { skin: 'fair', hair: 'slick', hairColor: 'black', outfit: 'bigsuit', build: 'boxy', nose: 'round', eyeColor: '#5b7ce6', size: 0.86 },
};

/** Body shapes: half widths of shoulders and hips, belly bulge, head size. */
const BUILDS = {
  slim: { shoulder: 80, hip: 74, belly: 4, head: 1 },
  stocky: { shoulder: 100, hip: 94, belly: 26, head: 1.04 },
  round: { shoulder: 90, hip: 100, belly: 34, head: 1 },
  lanky: { shoulder: 84, hip: 68, belly: 0, head: 0.95 },
  // Wide padded shoulders and a small head: a suit two sizes too big (the landlord).
  boxy: { shoulder: 124, hip: 100, belly: 8, head: 0.9 },
};

/** Clothes. top/pants/shoes colours; sleeve long or short; extras: apron (+ apronTrim), hood, dots, stripes, armor,
 * vneck, and the scrubs bits (T5.2): tunic (top hangs over the hips), pocket (chest pocket with pens), badge (clip-on
 * name badge, no words), clogs (round clogs with holes) and cap (a puffy scrub cap over the hair, dotted). */
export const OUTFITS = {
  // Her outfit tiers (T5.2, game/studio.js): 1 everyday, 2 the apron over her everyday clothes, 3 scrubs.
  everyday: { top: '#e66a8f', pants: '#4a5c9a', shoes: '#fff4ea', sleeve: 'long' },
  apron: { top: '#e66a8f', pants: '#4a5c9a', shoes: '#fff4ea', sleeve: 'long', apron: '#fff6e4', apronTrim: '#f2a33a' },
  scrubs: { top: '#3fb6a8', pants: '#2f978c', shoes: '#f27eb2', sleeve: 'short', vneck: true, tunic: true, pocket: true, badge: true, clogs: true, cap: '#3fb6a8' },
  pajamas: { top: '#b9a6f0', pants: '#b9a6f0', shoes: '#f27eb2', sleeve: 'long', dots: '#ffffff' },
  hoodie: { top: '#6a7be6', pants: '#7d8597', shoes: '#e8e4dc', sleeve: 'long', hood: true },
  stripes: { top: '#9fd3c7', pants: '#9fd3c7', shoes: '#6a7be6', sleeve: 'long', stripes: '#ffffff' },
  armor: { top: '#c9d3de', pants: '#c9d3de', shoes: '#9aa6b4', sleeve: 'long', armor: true },
  cardigan: { top: '#9b7fd1', pants: '#6e5a8a', shoes: '#c9473f', sleeve: 'long', vneck: true, dots: '#b9a6f0' },
  flannel: { top: '#c9473f', pants: '#4a5c9a', shoes: '#6e4528', sleeve: 'long', stripes: '#9e2f2a' },
  sunny: { top: '#ffd25a', pants: '#3fae8c', shoes: '#e66a8f', sleeve: 'short', dots: '#ffffff' },
  suit: { top: '#8c8a66', pants: '#64634a', shoes: '#3a2f28', sleeve: 'long', tie: '#e8505b' },
  // The landlord's loud mustard check suit, far too big: baggy = long jacket, wide sleeves, cuffs over the hands.
  bigsuit: { top: '#e0a63a', pants: '#c48d2c', shoes: '#6e4528', sleeve: 'long', tie: '#6a7be6', check: '#b9822a', baggy: true },
};

/** Faces. eyes: open wide side half arc closed sad squint; brows: flat up high worried angry sly; mouth: smile grin
 * laugh o frown smirk wobbly flat evil; extras: blush sweat tear sparkle zzz; tilt = head tilt in degrees. */
export const EXPRESSIONS = {
  neutral: { eyes: 'open', brows: 'flat', mouth: 'smile' },
  happy: { eyes: 'arc', brows: 'up', mouth: 'grin', blush: true },
  bliss: { eyes: 'arc', brows: 'up', mouth: 'laugh', blush: true, sparkle: true, tilt: -5 },
  sneaky: { eyes: 'side', brows: 'sly', mouth: 'smirk' },
  shocked: { eyes: 'wide', brows: 'high', mouth: 'o', sweat: true },
  sad: { eyes: 'sad', brows: 'worried', mouth: 'wobbly', tear: true },
  proud: { eyes: 'closed', brows: 'up', mouth: 'smirk', sparkle: true, tilt: -7 },
  scheming: { eyes: 'half', brows: 'angry', mouth: 'evil' },
  grumpy: { eyes: 'half', brows: 'angry', mouth: 'frown' },
  sleepy: { eyes: 'closed', brows: 'flat', mouth: 'flat', zzz: true },
  ow: { eyes: 'squint', brows: 'worried', mouth: 'o', sweat: true },
  // Peering hard at something too small or too dark to see (milestone "First lamp").
  squint: { eyes: 'squint', brows: 'angry', mouth: 'flat', tilt: 6 },
};

/** Body poses: [elbow, hand] for the figure's left (viewer's left) and right arm, relative to the floor point;
 * legs: stand, sit or none; hipY = height of the hips; down = how far the upper body sinks (sitting). */
export const POSES = {
  stand: { arms: [[[-112, -270], [-116, -175]], [[112, -270], [116, -175]]], legs: 'stand' },
  wave: { arms: [[[-112, -270], [-116, -175]], [[175, -400], [190, -530]]], legs: 'stand', open: [false, true] },
  cheer: { arms: [[[-170, -400], [-190, -540]], [[170, -400], [190, -540]]], legs: 'stand', open: [true, true] },
  // Both hands high above the head, close together, holding something up like a trophy (milestone "First plant", B10).
  lift: { arms: [[[-160, -480], [-100, -690]], [[160, -480], [100, -690]]], legs: 'stand' },
  point: { arms: [[[-112, -270], [-116, -175]], [[185, -350], [275, -365]]], legs: 'stand', point: true },
  hips: { arms: [[[-175, -280], [-90, -205]], [[175, -280], [90, -205]]], legs: 'stand' },
  pop: { arms: [[[-175, -320], [-128, -470]], [[175, -320], [128, -470]]], legs: 'stand', wiggle: true },
  shrug: { arms: [[[-165, -290], [-200, -380]], [[165, -290], [200, -380]]], legs: 'stand', open: [true, true] },
  // The hand cups the chin (R7: after the pop on his chin he used to cover an eye with the facepalm).
  chin: { arms: [[[-112, -270], [-116, -175]], [[135, -300], [22, -392]]], legs: 'stand' },
  facepalm: { arms: [[[-112, -270], [-116, -175]], [[150, -320], [40, -505]]], legs: 'stand' },
  sit: { arms: [[[-118, -230], [-104, -150]], [[118, -230], [104, -150]]], legs: 'sit', hipY: -100, down: 75 },
  // Sitting with no arms drawn, for scenes that draw the arms themselves (strip 'plan' panel 1: his hands hold the plan).
  sitHands: { arms: null, legs: 'sit', hipY: -100, down: 75 },
  bust: { arms: [[[-112, -270], [-116, -175]], [[112, -270], [116, -175]]], legs: 'none', shift: 260 },
  lie: { arms: null, legs: 'none', shift: 260 },
};

/** Things a figure can hold in the right hand. */
export const HOLDS = ['remote', 'torch', 'phone', 'snack', 'tweezers', 'clipboard', 'magnifier', 'gloves', 'highlighter', 'book', 'key', 'pen', 'pipeJoint'];

let gid = 0; // counter for unique gradient ids

/**
 * Make an SVG element (attributes that are null or undefined are left out).
 * @param {string} tag element name
 * @param {Record<string, unknown>} [a] attributes
 * @param {(SVGElement|null|undefined|false)[]} [kids] children
 * @returns {SVGElement} the element
 */
function el(tag, a = {}, kids = []) {
  const n = document.createElementNS('http://www.w3.org/2000/svg', tag);
  for (const [k, v] of Object.entries(a)) if (v !== null && v !== undefined && v !== false) n.setAttribute(k, String(v));
  for (const k of kids) if (k) n.appendChild(k);
  return n;
}

/**
 * Mix a '#rrggbb' colour towards white (amount > 0) or black (amount < 0).
 * @param {string} hex colour
 * @param {number} amount -1 .. 1
 * @returns {string} '#rrggbb'
 */
export function tint(hex, amount) {
  const n = parseInt(hex.slice(1), 16);
  const to = amount > 0 ? 255 : 0;
  const k = Math.abs(amount);
  // Moves one colour channel toward black or white by k, returns it as two hex digits.
  const ch = (v) => Math.round(v + (to - v) * k).toString(16).padStart(2, '0');
  return `#${ch((n >> 16) & 255)}${ch((n >> 8) & 255)}${ch(n & 255)}`;
}

/**
 * A soft radial shading (light from the top left, like the pop scene) as a gradient in a <defs>.
 * @param {SVGElement} parent where to put the <defs>
 * @param {string} base the middle colour
 * @param {number} [light] how much lighter the lit side is
 * @param {number} [dark] how much darker the shaded edge is
 * @returns {string} 'url(#id)' to use as a fill
 */
function shading(parent, base, light = 0.22, dark = 0.16) {
  const id = `ca${gid += 1}`;
  parent.appendChild(el('defs', {}, [el('radialGradient', { id, cx: 0.36, cy: 0.3, r: 0.85 }, [
    el('stop', { offset: 0, 'stop-color': tint(base, light) }),
    el('stop', { offset: 0.55, 'stop-color': base }),
    el('stop', { offset: 1, 'stop-color': tint(base, -dark) }),
  ])]));
  return `url(#${id})`;
}

/** Outline attributes in ink. @param {number} [w] width @returns {object} attributes */
const ink = (w = 6) => ({ stroke: INK, 'stroke-width': w, 'stroke-linejoin': 'round', 'stroke-linecap': 'round' });

/** Ink line with no fill. @param {string} d path @param {number} [w] width @param {object} [a] more attributes @returns {SVGElement} path */
const line = (d, w = 6, a = {}) => el('path', { d, fill: 'none', ...ink(w), ...a });

/**
 * One eye at (x, y); side = -1 for the left eye, 1 for the right.
 * @param {string} kind eye kind (see EXPRESSIONS)
 * @param {number} x centre
 * @param {number} y centre
 * @param {number} side -1 or 1
 * @param {object} o look direction, eye colour, lashes, skin fill (for lids)
 * @returns {SVGElement} the eye
 */
function eye(kind, x, y, side, o) {
  const g = el('g', { transform: `translate(${x} ${y})` });
  const lx = (o.look ?? 0) * 5;
  if (kind === 'arc') { g.appendChild(line('M-15 5 Q0 -13 15 5', 6.5)); return g; }
  if (kind === 'closed') { g.appendChild(line('M-15 -1 Q0 9 15 -1', 6)); if (o.lashes) g.appendChild(line(`M${side * 14} 0 l${side * 7} -4`, 4)); return g; }
  if (kind === 'squint') { g.appendChild(line(side < 0 ? 'M-12 -10 L10 0 L-12 10' : 'M12 -10 L-10 0 L12 10', 6)); return g; }
  const wide = kind === 'wide';
  const rx = wide ? 20 : 16;
  const ry = wide ? 25 : 20;
  const shift = kind === 'side' ? (o.look || 1) * 7 : lx;
  const irisR = wide ? 7.5 : 10.5;
  const iy = kind === 'half' ? 6 : 2;
  g.appendChild(el('ellipse', { rx, ry, fill: '#fff', ...ink(4.5) }));
  g.appendChild(el('circle', { cx: shift, cy: iy, r: irisR, fill: o.eyeColor }));
  g.appendChild(el('circle', { cx: shift, cy: iy, r: irisR * 0.5, fill: INK }));
  g.appendChild(el('circle', { cx: shift - irisR * 0.35, cy: iy - irisR * 0.4, r: irisR * 0.3, fill: '#fff' }));
  // Eyelids: a skin-coloured lid over the top with an ink edge.
  const lid = { half: 'M-21 -27 L21 -27 L21 1 Q0 -3 -21 1Z', side: 'M-21 -27 L21 -27 L21 -7 Q0 -9 -21 -7Z',
    sad: side < 0 ? 'M-21 -27 L21 -27 L21 -12 Q0 -12 -21 0Z' : 'M-21 -27 L21 -27 L21 0 Q0 -12 -21 -12Z' }[kind];
  if (lid) {
    g.appendChild(el('path', { d: lid, fill: o.skinFill }));
    const edge = { half: 'M-17 1 Q0 -3 17 1', side: 'M-17 -7 Q0 -9 17 -7', sad: side < 0 ? 'M-17 -11 Q0 -11 17 -2' : 'M-17 -2 Q0 -11 17 -11' }[kind];
    g.appendChild(line(edge, 5));
  }
  if (o.lashes) g.appendChild(line(`M${side * 13} ${lid ? -4 : -15} l${side * 8} -6`, 4));
  return g;
}

/**
 * One eyebrow over an eye; side -1 = left, 1 = right. "Inner" is the end near the nose.
 * @param {string} kind brow kind
 * @param {number} x eye centre
 * @param {number} y brow height
 * @param {number} side -1 or 1
 * @param {string} colour hair colour
 * @returns {SVGElement} the brow
 */
function brow(kind, x, y, side, colour) {
  const k = kind === 'sly' ? (side < 0 ? 'high' : 'angry') : kind;
  const [inner, outer, arch] = { flat: [0, 0, -3], up: [-6, -4, -9], high: [-18, -14, -14], worried: [-12, 4, -4], angry: [10, -8, 0] }[k] ?? [0, 0, -3];
  const ix = x - side * 18;
  const ox = x + side * 18;
  return el('path', { d: `M${ix} ${y + inner} Q${x} ${y + arch + (inner + outer) / 2} ${ox} ${y + outer}`, fill: 'none', stroke: tint(colour, -0.25), 'stroke-width': 8, 'stroke-linecap': 'round' });
}

/**
 * The mouth, centred at (0, y).
 * @param {string} kind mouth kind
 * @param {number} y height
 * @returns {SVGElement} the mouth
 */
function mouth(kind, y) {
  const g = el('g', { transform: `translate(0 ${y})` });
  const dark = '#6e2430';
  const tongue = '#ee7d8c';
  /** An open mouth with teeth along the top and a tongue. @param {string} d outline @param {number} w half width @param {number} t tooth line @param {number} b bottom @returns {void} */
  const open = (d, w, t, b) => {
    const id = `cm${gid += 1}`;
    g.appendChild(el('defs', {}, [el('clipPath', { id }, [el('path', { d })])]));
    g.appendChild(el('path', { d, fill: dark }));
    g.appendChild(el('g', { 'clip-path': `url(#${id})` }, [
      el('rect', { x: -w, y: t - 30, width: w * 2, height: 30 + 8, fill: '#fff' }),
      el('ellipse', { cx: 0, cy: b, rx: w * 0.6, ry: 14, fill: tongue }),
    ]));
    g.appendChild(el('path', { d, fill: 'none', ...ink(5) }));
  };
  if (kind === 'smile') g.appendChild(line('M-24 -2 Q0 18 24 -2', 6));
  else if (kind === 'flat') g.appendChild(line('M-16 4 L16 4', 6));
  else if (kind === 'frown') g.appendChild(line('M-20 10 Q0 -8 20 10', 6));
  else if (kind === 'smirk') g.appendChild(line('M-20 6 Q6 12 26 -8', 6));
  else if (kind === 'wobbly') g.appendChild(line('M-22 8 q5.5 -7 11 0 t11 0 t11 0 t11 0', 5.5));
  else if (kind === 'grin') open('M-30 -4 Q0 2 30 -4 Q26 30 0 32 Q-26 30 -30 -4Z', 30, 2, 30);
  else if (kind === 'laugh') open('M-34 -8 Q0 0 34 -8 Q30 44 0 46 Q-30 44 -34 -8Z', 34, -1, 44);
  else if (kind === 'o') open('M0 -16 C16 -16 16 26 0 26 C-16 26 -16 -16 0 -16Z', 16, -16, 26);
  else if (kind === 'evil') {
    open('M-38 -12 Q0 8 38 -12 Q24 28 0 28 Q-24 28 -38 -12Z', 38, 6, 30);
    for (const x of [-18, -6, 6, 18]) g.appendChild(line(`M${x} ${x === -18 || x === 18 ? 0 : 3} l0 9`, 2.5));
  }
  return g;
}

/**
 * Little extras round a head: sweat drop, tear, sparkles, sleepy Zs (drawn shapes, not text).
 * @param {object} e the expression
 * @param {number} r head radius
 * @returns {SVGElement} the extras
 */
function extras(e, r) {
  const g = el('g');
  // Draws a small water drop at x, y, scaled by s (for sweat and tears).
  const drop = (x, y, s) => el('path', { d: `M${x} ${y - 16 * s} C${x + 12 * s} ${y} ${x + 10 * s} ${y + 12 * s} ${x} ${y + 12 * s} C${x - 10 * s} ${y + 12 * s} ${x - 12 * s} ${y} ${x} ${y - 16 * s}Z`, fill: '#9ad8ff', ...ink(4) });
  if (e.sweat) g.appendChild(drop(r * 0.95, -r * 0.55, 1.3));
  if (e.tear) { g.appendChild(drop(-44, 46, 1)); g.appendChild(drop(46, 52, 0.8)); }
  if (e.sparkle) {
    for (const [x, y, s] of [[-r * 1.25, -r * 0.7, 1], [r * 1.2, -r * 0.95, 0.75], [r * 1.35, r * 0.1, 0.55]]) {
      g.appendChild(el('path', { d: `M${x} ${y - 22 * s} Q${x + 4 * s} ${y - 4 * s} ${x + 22 * s} ${y} Q${x + 4 * s} ${y + 4 * s} ${x} ${y + 22 * s} Q${x - 4 * s} ${y + 4 * s} ${x - 22 * s} ${y} Q${x - 4 * s} ${y - 4 * s} ${x} ${y - 22 * s}Z`, fill: '#ffe27a', ...ink(3.5) }));
    }
  }
  if (e.zzz) {
    for (const [x, y, s] of [[r * 0.95, -r * 0.9, 1], [r * 1.3, -r * 1.3, 0.8], [r * 1.6, -r * 1.6, 0.6]]) {
      g.appendChild(line(`M${x} ${y} l${18 * s} 0 l${-18 * s} ${20 * s} l${18 * s} 0`, 5 * s, { stroke: '#5b7ce6' }));
    }
  }
  return g;
}

/** More hair styles: back(fill, col) draws behind the head, front(fill, col) over it; each returns SVG nodes. */
const HAIRDOS = {
  topknot: {
    /** Greta: a tidy cap of hair and a big round bun on top. @param {string} fill @param {string} col @returns {SVGElement[]} */
    back: (fill, col) => [
      el('path', { d: 'M-110 0 C-128 -140 128 -140 110 0 C112 30 104 50 96 56 L-96 56 C-104 50 -112 30 -110 0Z', fill, ...ink() }),
      el('circle', { cx: 0, cy: -150, r: 60, fill, ...ink() }),
      line('M-30 -170 Q0 -192 30 -170 M-36 -146 Q0 -124 36 -146', 4, { stroke: tint(col, -0.25), opacity: 0.7 }),
    ],
    /** Greta's front: hair swept back with a middle parting. @param {string} fill @param {string} col @returns {SVGElement[]} */
    front: (fill, col) => [
      el('path', { d: 'M-106 -10 C-112 -100 -40 -128 0 -124 C40 -128 112 -100 106 -10 C96 -60 50 -82 4 -70 C-46 -82 -96 -60 -106 -10Z', fill, ...ink() }),
      line('M0 -122 L2 -74 M-70 -88 Q-40 -104 -14 -100 M70 -88 Q40 -104 16 -100', 4, { stroke: tint(col, -0.25), opacity: 0.7 }),
    ],
  },
  bob: {
    /** Penny: a round bob down to the chin. @param {string} fill @param {string} col @returns {SVGElement[]} */
    back: (fill) => [el('path', { d: 'M-122 -10 C-140 -170 140 -170 122 -10 C126 40 128 76 112 92 L-112 92 C-128 76 -126 40 -122 -10Z', fill, ...ink() })],
    /** Penny's front: a straight blunt fringe and side pieces. @param {string} fill @param {string} col @returns {SVGElement[]} */
    front: (fill, col) => [
      el('path', { d: 'M-112 -8 C-116 -110 -50 -138 0 -136 C50 -138 116 -110 112 -8 L104 -52 Q0 -40 -104 -52Z', fill, ...ink() }),
      el('path', { d: 'M-112 -30 C-118 20 -116 70 -106 92 L-80 92 C-90 60 -92 10 -90 -30Z M112 -30 C118 20 116 70 106 92 L80 92 C90 60 92 10 90 -30Z', fill, ...ink(5) }),
      line('M-60 -110 Q-10 -124 40 -114', 4, { stroke: tint(col, 0.35), opacity: 0.8 }),
    ],
  },
  combover: {
    /** The inspector: short neat sides behind the ears. @param {string} fill @returns {SVGElement[]} */
    back: (fill) => [el('path', { d: 'M-112 -10 C-122 -60 -100 -96 -76 -100 L-80 40 L-108 40Z M112 -10 C122 -60 100 -96 76 -100 L80 40 L108 40Z', fill, ...ink(5) })],
    /** The inspector's front: a few strands combed over a shiny top, with a hard side parting. @param {string} fill @param {string} col @returns {SVGElement[]} */
    front: (fill, col) => [
      line('M-40 -96 Q-10 -110 20 -106', 7, { stroke: '#ffffff', opacity: 0.5 }),
      el('path', { d: 'M-108 -6 C-116 -50 -104 -84 -64 -100 C-20 -118 50 -116 96 -86 C70 -92 30 -96 -10 -88 C-50 -80 -80 -60 -86 -4Z', fill, ...ink(5) }),
      line('M-60 -94 Q0 -110 70 -92 M-70 -78 Q-10 -96 60 -84', 3.5, { stroke: tint(col, -0.25), opacity: 0.7 }),
    ],
  },
  slick: {
    /** The landlord: short neat sides behind the ears. @param {string} fill @returns {SVGElement[]} */
    back: (fill) => [el('path', { d: 'M-114 -6 C-124 -70 -96 -110 -60 -116 L-84 30 L-110 30Z M114 -6 C124 -70 96 -110 60 -116 L84 30 L110 30Z', fill, ...ink(5) })],
    /** The landlord's front: glossy hair slicked back, a big curly quiff on top and two shine lines. @param {string} fill @returns {SVGElement[]} */
    front: (fill) => [
      el('path', { d: 'M-108 -10 C-120 -96 -60 -136 0 -134 C64 -136 120 -96 108 -10 C100 -56 70 -86 30 -92 C-10 -96 -70 -80 -108 -10Z', fill, ...ink(5) }),
      el('path', { d: 'M-40 -120 C-50 -170 10 -196 50 -170 C78 -150 64 -116 36 -120 C50 -140 30 -160 6 -150 C-14 -142 -16 -126 -40 -120Z', fill, ...ink(5) }),
      line('M-70 -96 Q-30 -118 20 -112 M-10 -160 Q14 -176 40 -164', 6, { stroke: '#ffffff', opacity: 0.55 }),
    ],
  },
  bald: {
    /** Nils: nothing behind the head. @returns {SVGElement[]} */
    back: () => [],
    /** Nils's front: a shiny top and two tufts over the ears. @param {string} fill @returns {SVGElement[]} */
    front: (fill) => [
      line('M-50 -88 Q-20 -104 14 -100', 7, { stroke: '#ffffff', opacity: 0.55 }),
      el('path', { d: 'M-108 -4 C-118 -40 -104 -70 -80 -76 C-92 -50 -90 -24 -84 0Z M108 -4 C118 -40 104 -70 80 -76 C92 -50 90 -24 84 0Z', fill, ...ink(5) }),
    ],
  },
};

/**
 * Round glasses over the eyes (big, cartoon, see-through).
 * @param {string} colour frame colour
 * @returns {SVGElement} the glasses
 */
function glasses(colour) {
  const g = el('g');
  for (const s of [-1, 1]) {
    g.appendChild(el('circle', { cx: s * 40, cy: 0, r: 34, fill: '#dff3ff', opacity: 0.35 }));
    g.appendChild(el('circle', { cx: s * 40, cy: 0, r: 34, fill: 'none', stroke: colour, 'stroke-width': 7 }));
    g.appendChild(line(`M${s * 74} -4 L${s * 102} -10`, 6, { stroke: colour }));
  }
  g.appendChild(line('M-8 -4 Q0 -12 8 -4', 6, { stroke: colour }));
  return g;
}

/**
 * The hair behind the head (drawn before the face).
 * @param {object} c the character
 * @param {string} col hair colour
 * @param {SVGElement} parent for the shading defs
 * @returns {SVGElement|null} back hair
 */
function hairBack(c, col, parent) {
  if (HAIRDOS[c.hair]) return el('g', {}, HAIRDOS[c.hair].back(shading(parent, col, 0.18, 0.2), col));
  if (c.hair !== 'bun') return null;
  const fill = shading(parent, col, 0.18, 0.2);
  return el('g', {}, [
    el('path', { d: 'M-112 -20 C-132 -150 132 -150 112 -20 C122 50 112 112 86 128 L-86 128 C-112 112 -122 50 -112 -20Z', fill, ...ink() }),
    el('circle', { cx: 18, cy: -128, r: 54, fill, ...ink() }),
    line('M-4 -150 Q18 -170 40 -150', 4, { stroke: tint(col, 0.35), opacity: 0.8 }),
    el('path', { d: 'M-28 -96 Q18 -72 62 -98 L58 -84 Q18 -60 -24 -82Z', fill: '#f27eb2', ...ink(4.5) }),
  ]);
}

/**
 * The hair in front (fringe, tuft) and the beard.
 * @param {object} c the character
 * @param {string} col hair colour
 * @param {SVGElement} parent for the shading defs
 * @returns {SVGElement} front hair
 */
function hairFront(c, col, parent) {
  const fill = shading(parent, col, 0.2, 0.18);
  const g = el('g');
  if (c.hair === 'bun') {
    g.appendChild(el('path', { d: 'M-106 -18 C-108 -104 -30 -134 30 -124 C86 -114 112 -70 106 -12 C92 -54 58 -76 18 -72 C-14 -58 -60 -40 -106 -18Z', fill, ...ink() }));
    g.appendChild(line('M-60 -98 Q-20 -112 26 -106', 4, { stroke: tint(col, 0.35), opacity: 0.8 }));
    g.appendChild(el('path', { d: 'M-106 -18 C-116 24 -112 64 -98 92 C-96 60 -94 20 -84 -6Z', fill, ...ink(5) }));
  } else if (HAIRDOS[c.hair]) {
    for (const n of HAIRDOS[c.hair].front(fill, col)) g.appendChild(n);
  } else if (c.hair !== 'none') {
    g.appendChild(el('path', { d: 'M-104 -14 C-110 -96 -52 -130 0 -128 C58 -130 112 -96 104 -14 C94 -58 60 -82 10 -80 C-36 -84 -84 -64 -104 -14Z', fill, ...ink() }));
    g.appendChild(el('path', { d: 'M-8 -126 C-14 -170 26 -184 38 -160 C20 -166 8 -152 10 -128Z', fill, ...ink(5) }));
    g.appendChild(line('M-40 -110 Q0 -122 40 -112', 4, { stroke: tint(col, 0.3), opacity: 0.8 }));
  }
  if (c.beard) {
    g.appendChild(el('path', { d: 'M-100 6 C-98 92 -52 132 0 134 C52 132 98 92 100 6 C88 44 66 72 38 66 C20 50 -20 50 -38 66 C-66 72 -88 44 -100 6Z', fill, ...ink(5), opacity: 0.96 }));
  }
  return g;
}

/**
 * A whole head (hair, face, expression) centred at 0,0, radius about 105.
 * @param {object} c the character with options
 * @param {object} e the expression
 * @returns {{node: SVGElement, mouthY: number}} the head and where its mouth is
 */
function head(c, e) {
  const g = el('g', { transform: `rotate(${(e.tilt ?? 0) * (c.flip ? -1 : 1)})` });
  const skin = SKIN[c.skin] ?? c.skin;
  const col = HAIR[c.hairColor] ?? c.hairColor;
  // `helmet: true` on a layer = his knight's helmet over everyday clothes; `helmet: false` = the armor without its
  // helmet, his own hair shows (strip "plan" panel 1: the helmet is his cereal bowl, owner 2026-10-28).
  const armor = c.helmet === false ? false : OUTFITS[c.outfit]?.armor || c.helmet === true;
  const skinFill = shading(g, skin);
  const back = armor ? null : hairBack(c, col, g);
  if (back) g.appendChild(back);
  for (const s of [-1, 1]) {
    g.appendChild(el('ellipse', { cx: s * 102, cy: 8, rx: 20, ry: 28, fill: skinFill, ...ink(5) }));
  }
  g.appendChild(el('ellipse', { cx: 0, cy: 0, rx: 104, ry: 114, fill: skinFill, ...ink() }));
  // Rosy cheeks, always a little, more when blushing (the pop-scene faces have them too).
  for (const s of [-1, 1]) g.appendChild(el('ellipse', { cx: s * 60, cy: 36, rx: 22, ry: 14, fill: '#f06e7e', opacity: e.blush ? 0.5 : 0.22 }));
  const o = { look: c.look ?? 0, eyeColor: c.eyeColor, lashes: c.lashes, skinFill };
  for (const s of [-1, 1]) g.appendChild(eye(e.eyes, s * 38, 0, s, o));
  if (c.glasses) g.appendChild(glasses(c.glasses));
  g.appendChild(c.nose === 'round'
    ? el('ellipse', { cx: 0, cy: 28, rx: 15, ry: 12, fill: tint(skin, -0.06), ...ink(4.5) })
    : line('M-6 24 Q2 34 8 26', 5));
  if (!armor) g.appendChild(hairFront(c, col, g));
  else if (c.beard) g.appendChild(hairFront({ ...c, hair: 'none' }, col, g).lastChild);
  const cap = OUTFITS[c.outfit]?.cap;
  // `cap: false` on the layer = the cap is off (T5.2b): her own hair and bun, drawn underneath anyway, show.
  if (cap && !armor && c.cap !== false) g.appendChild(scrubCap(cap));
  g.appendChild(mouth(e.mouth, 62));
  // A tiny clipped moustache under the nose (the inspector).
  if (c.moustache) g.appendChild(el('path', { d: 'M-26 50 Q-24 38 -4 40 L0 44 L4 40 Q24 38 26 50 Q0 56 -26 50Z', fill: col, ...ink(4) }));
  // Brows go over the fringe, as in most cartoons, so raised brows always show.
  for (const s of [-1, 1]) g.appendChild(brow(e.brows, s * 38, -38, s, col));
  if (armor) g.appendChild(helmet(c));
  g.appendChild(extras(e, 104));
  return { node: g, mouthY: 64 };
}

/**
 * A knight's helmet over the head, visor up (face shows) or down (only the eyes peek out).
 * @param {object} c the character (c.visor: 'up' or 'down')
 * @returns {SVGElement} the helmet
 */
function helmet(c) {
  const g = el('g');
  const steel = shading(g, '#c9d3de', 0.35, 0.3);
  const down = c.visor === 'down';
  g.appendChild(el('path', { d: 'M-128 70 C-140 -60 -90 -150 0 -152 C90 -150 140 -60 128 70 L104 70 C108 -20 70 -96 0 -98 C-70 -96 -108 -20 -104 70Z', fill: steel, ...ink() }));
  g.appendChild(el('path', { d: 'M-128 70 L-128 132 L-80 150 L-90 80Z M128 70 L128 132 L80 150 L90 80Z', fill: steel, ...ink() }));
  // c.plumes: extra plumes as the armor gets fancier (running gag), fanned out behind the first one.
  const fancy = ['#ffd25a', '#6a7be6', '#3fae8c', '#f27eb2'];
  for (let i = 0; i < (c.plumes ?? 0); i += 1) {
    g.appendChild(el('path', { d: 'M0 -152 C-30 -210 40 -250 90 -232 C50 -220 30 -190 24 -150Z', fill: fancy[i % 4], ...ink(5), transform: `rotate(${(i % 2 ? 1 : -1) * (28 + 22 * Math.floor(i / 2)) - 10} 6 -150)` }));
  }
  g.appendChild(el('path', { d: 'M0 -152 C-30 -210 40 -250 90 -232 C50 -220 30 -190 24 -150Z', fill: '#e8505b', ...ink(5) }));
  g.appendChild(line('M0 -150 L0 -98', 5));
  if (down) {
    g.appendChild(el('path', { d: 'M-104 -40 C-100 -100 100 -100 104 -40 L104 110 C60 140 -60 140 -104 110Z', fill: steel, ...ink() }));
    g.appendChild(el('rect', { x: -78, y: -14, width: 156, height: 26, rx: 12, fill: '#2b2f3a', ...ink(4) }));
    for (const s of [-1, 1]) g.appendChild(el('circle', { cx: s * 34, cy: -1, r: 7, fill: '#fff6c8' }));
    for (const y of [50, 70, 90]) g.appendChild(line(`M-40 ${y} L40 ${y}`, 5));
  } else {
    g.appendChild(el('path', { d: 'M-110 -86 C-80 -150 80 -150 110 -86 L100 -66 C70 -112 -70 -112 -100 -66Z', fill: steel, ...ink(5) }));
  }
  for (const [x, y] of [[-112, 30], [112, 30], [-90, -110], [90, -110]]) g.appendChild(el('circle', { cx: x, cy: y, r: 5, fill: '#8a96a6' }));
  if (c.cozy) {
    // A knitted hat pulled over the helmet (Greta's gift): ribbed band, knit rows and a pompom.
    g.appendChild(el('path', { d: 'M-122 -40 C-130 -150 -70 -196 0 -196 C70 -196 130 -150 122 -40Z', fill: c.cozy, ...ink() }));
    for (const y of [-80, -120, -160]) g.appendChild(line(`M${-110 + (y + 40) * -0.25} ${y} Q0 ${y - 16} ${110 + (y + 40) * 0.25} ${y}`, 4, { stroke: tint(c.cozy, -0.2) }));
    g.appendChild(el('rect', { x: -130, y: -60, width: 260, height: 40, rx: 18, fill: tint(c.cozy, 0.3), ...ink(5) }));
    for (let x = -110; x <= 110; x += 22) g.appendChild(line(`M${x} -54 l0 28`, 3.5, { stroke: tint(c.cozy, -0.15) }));
    g.appendChild(el('circle', { cx: 0, cy: -214, r: 34, fill: tint(c.cozy, 0.45), ...ink(5) }));
  }
  if (c.nightcap) {
    // A long floppy night-cap over the helmet (bedtime armor, strip 4): stripes, drooping tip and a pompom.
    g.appendChild(el('path', { d: 'M-108 -100 C-96 -214 60 -258 150 -204 C204 -170 226 -110 230 -36 L200 -40 C190 -110 156 -158 104 -148 L108 -100Z', fill: c.nightcap, ...ink() }));
    for (const [x, y, x2, y2] of [[-60, -178, 40, -214], [96, -214, 130, -150], [168, -170, 214, -120]]) g.appendChild(line(`M${x} ${y} Q${(x + x2) / 2 + 10} ${(y + y2) / 2 - 16} ${x2} ${y2}`, 12, { stroke: '#ffffff', opacity: 0.75 }));
    g.appendChild(el('rect', { x: -124, y: -122, width: 248, height: 40, rx: 18, fill: '#ffffff', ...ink(5) }));
    g.appendChild(el('circle', { cx: 216, cy: -24, r: 32, fill: '#ffffff', ...ink(5) }));
  }
  return g;
}

/**
 * A chest pocket on her left (the viewer's right) with a pen and a little torch peeking out (scrubs, T5.2).
 * @param {string} top the shirt colour
 * @param {number} sy shoulder height
 * @returns {SVGElement} the pocket
 */
function chestPocket(top, sy) {
  const g = el('g');
  g.appendChild(el('rect', { x: 32, y: sy + 66, width: 11, height: 44, rx: 5, fill: '#6a7be6', ...ink(3.5) }));
  g.appendChild(el('rect', { x: 49, y: sy + 76, width: 12, height: 36, rx: 4, fill: '#ffd25a', ...ink(3.5) }));
  g.appendChild(el('rect', { x: 22, y: sy + 92, width: 50, height: 50, rx: 7, fill: tint(top, -0.08), ...ink(4.5) }));
  g.appendChild(line(`M26 ${sy + 102} L68 ${sy + 102}`, 3, { stroke: tint(top, 0.4) }));
  return g;
}

/**
 * A clip-on name badge on her right (the viewer's left): pink stripe, a tiny smiling photo, two lines for a name (no
 * words, so nothing to translate) (scrubs, T5.2).
 * @param {number} sy shoulder height
 * @returns {SVGElement} the badge
 */
function nameBadge(sy) {
  const g = el('g', { transform: `rotate(-6 -50 ${sy + 108})` });
  g.appendChild(el('rect', { x: -58, y: sy + 70, width: 16, height: 14, rx: 3, fill: '#c9d3de', ...ink(3) }));
  g.appendChild(el('rect', { x: -76, y: sy + 78, width: 52, height: 62, rx: 7, fill: '#ffffff', ...ink(4.5) }));
  g.appendChild(el('path', { d: `M-76 ${sy + 92} L-76 ${sy + 85} Q-76 ${sy + 78} -69 ${sy + 78} L-31 ${sy + 78} Q-24 ${sy + 78} -24 ${sy + 85} L-24 ${sy + 92}Z`, fill: '#f27eb2' }));
  g.appendChild(el('circle', { cx: -50, cy: sy + 107, r: 10, fill: '#ffd9c2', ...ink(3) }));
  g.appendChild(line(`M-55 ${sy + 109} Q-50 ${sy + 114} -45 ${sy + 109}`, 2.5));
  for (const y of [sy + 125, sy + 132]) g.appendChild(line(`M-68 ${y} L${y === sy + 125 ? -32 : -42} ${y}`, 3, { opacity: 0.45 }));
  g.appendChild(line(`M-76 ${sy + 92} L-24 ${sy + 92}`, 3));
  return g;
}

/**
 * A bib apron worn over the clothes (outfit tier 2, T5.2): neck strap, bib, waist ties with a bow, a skirt down over
 * the thighs with a trimmed hem and a big pocket (a heart on it, tweezers peeking out). Drawn after the torso so the
 * skirt can hang over the legs.
 * @param {object} b the build
 * @param {object} out the outfit (apron = cloth colour, apronTrim = trim colour)
 * @param {number} sy shoulder height
 * @param {number} hy hip height
 * @param {string} legKind stand, sit or none (sitting: the skirt ends on the lap)
 * @param {SVGElement} parent for the shading defs
 * @returns {SVGElement} the apron
 */
function apronFront(b, out, sy, hy, legKind, parent) {
  const g = el('g');
  const trim = out.apronTrim ?? tint(out.apron, -0.25);
  const wy = Math.round(sy + (hy - sy) * 0.52); // waist
  const hem = legKind === 'sit' ? hy + 22 : hy + 96;
  const hw = b.hip + 16;
  for (const s of [-1, 1]) {
    g.appendChild(line(`M${s * 44} ${sy + 38} L${s * 25} ${sy - 8}`, 16));
    g.appendChild(line(`M${s * 44} ${sy + 38} L${s * 25} ${sy - 8}`, 8, { stroke: out.apron }));
  }
  const d = `M-48 ${sy + 34} L48 ${sy + 34} L56 ${wy} Q${hw - 6} ${wy + 50} ${hw} ${hem} Q0 ${hem + 16} ${-hw} ${hem} Q${-hw + 6} ${wy + 50} -56 ${wy}Z`;
  g.appendChild(el('path', { d, fill: shading(parent, out.apron, 0.1, 0.12), ...ink(5) }));
  g.appendChild(line(`M${-hw + 3} ${hem - 13} Q0 ${hem + 3} ${hw - 3} ${hem - 13}`, 9, { stroke: trim }));
  g.appendChild(line(`M-40 ${sy + 46} L40 ${sy + 46}`, 6, { stroke: trim }));
  // Waist ties: the band round the waist and a bow on her left.
  g.appendChild(el('rect', { x: -b.shoulder + 4, y: wy - 9, width: b.shoulder * 2 - 8, height: 18, rx: 8, fill: trim, ...ink(4) }));
  const bx = b.shoulder - 4;
  for (const r of [-28, 28]) g.appendChild(el('ellipse', { cx: bx + 4, cy: wy + r * 0.5, rx: 20, ry: 10, fill: trim, ...ink(4), transform: `rotate(${r} ${bx} ${wy})` }));
  for (const r of [16, 46]) g.appendChild(el('path', { d: `M${bx} ${wy} l10 34 l-14 -6Z`, fill: trim, ...ink(3.5), transform: `rotate(${r - 30} ${bx} ${wy})` }));
  g.appendChild(el('circle', { cx: bx, cy: wy, r: 9, fill: tint(trim, -0.1), ...ink(4) }));
  // The pocket (only when the skirt is long enough to carry it).
  if (legKind !== 'sit') {
    const py = wy + 40;
    g.appendChild(line(`M12 ${py + 2} L22 ${py - 30} L32 ${py + 2}`, 11));
    g.appendChild(line(`M12 ${py + 2} L22 ${py - 30} L32 ${py + 2}`, 5, { stroke: '#d7dee7' }));
    g.appendChild(el('rect', { x: -44, y: py, width: 88, height: 58, rx: 10, fill: tint(out.apron, -0.05), ...ink(4.5) }));
    g.appendChild(line(`M-44 ${py + 12} L44 ${py + 12}`, 5, { stroke: trim }));
    g.appendChild(el('path', { d: `M0 ${py + 48} C-22 ${py + 34} -16 ${py + 20} 0 ${py + 28} C16 ${py + 20} 22 ${py + 34} 0 ${py + 48}Z`, fill: '#e8505b', ...ink(3) }));
  }
  return g;
}

/**
 * The bottom of a scrubs top hanging over the hips, with small side slits (T5.2). Drawn after the torso; its top edge
 * has no outline, so it joins the shirt without a seam.
 * @param {object} b the build
 * @param {object} out the outfit
 * @param {number} hy hip height
 * @param {string} legKind stand or sit (sitting: a shorter hem)
 * @param {SVGElement} parent for the shading defs
 * @returns {SVGElement} the hem
 */
function tunicHem(b, out, hy, legKind, parent) {
  const g = el('g');
  const top = hy - 24;
  const bot = legKind === 'sit' ? hy + 14 : hy + 36;
  const w = b.hip + 8;
  g.appendChild(el('path', { d: `M${-b.hip} ${top} L${b.hip} ${top} L${w} ${bot} Q0 ${bot + 10} ${-w} ${bot}Z`, fill: shading(parent, out.top, 0.18, 0.18) }));
  g.appendChild(el('path', { d: `M${-b.hip} ${top} L${-w} ${bot} Q0 ${bot + 10} ${w} ${bot} L${b.hip} ${top}`, fill: 'none', ...ink(5) }));
  for (const s of [-1, 1]) g.appendChild(line(`M${s * (w - 14)} ${bot + 2} L${s * (w - 18)} ${bot - 22}`, 4));
  return g;
}

/**
 * A puffy scrub cap over the hair, bun and all, with a band over the forehead and white dots (scrubs, T5.2). In head
 * units (centre 0,0, radius about 105).
 * @param {string} col the cap colour
 * @returns {SVGElement} the cap
 */
function scrubCap(col) {
  const g = el('g');
  const d = 'M-112 -18 C-126 -100 -94 -156 -30 -166 C-12 -200 64 -204 82 -160 C120 -140 128 -76 112 -18 Q0 -70 -112 -18Z';
  g.appendChild(el('path', { d, fill: shading(g, col, 0.25, 0.2), ...ink() }));
  const id = `cc${gid += 1}`;
  g.appendChild(el('defs', {}, [el('clipPath', { id }, [el('path', { d })])]));
  const dots = el('g', { 'clip-path': `url(#${id})` });
  for (let row = 0; row < 6; row += 1) for (let x = -120; x < 130; x += 34) dots.appendChild(el('circle', { cx: x + (row % 2 ? 17 : 0), cy: -200 + row * 32, r: 6, fill: '#ffffff', opacity: 0.8 }));
  g.appendChild(dots);
  g.appendChild(line('M-28 -170 Q-10 -150 -6 -118', 4, { opacity: 0.35 }));
  g.appendChild(el('path', { d: 'M-114 -16 Q0 -70 114 -16 L110 -40 Q0 -90 -110 -40Z', fill: tint(col, -0.12), ...ink(4.5) }));
  return g;
}

/**
 * The torso (shirt with outfit details), from the shoulders down to the hips.
 * @param {object} c the character
 * @param {object} b the build
 * @param {object} out the outfit
 * @param {number} sy shoulder height
 * @param {number} hy hip height
 * @param {SVGElement} parent for the shading defs
 * @returns {SVGElement} torso
 */
function torso(c, b, out, sy, hy, parent) {
  const g = el('g');
  const sw = b.shoulder;
  const hw = b.hip;
  const bel = b.belly;
  const d = `M${-sw} ${sy + 34} Q${-sw} ${sy} ${-sw + 34} ${sy} L${sw - 34} ${sy} Q${sw} ${sy} ${sw} ${sy + 34} Q${hw + bel + 10} ${(sy + hy) / 2 + 30} ${hw} ${hy} L${-hw} ${hy} Q${-hw - bel - 10} ${(sy + hy) / 2 + 30} ${-sw} ${sy + 34}Z`;
  const fill = shading(parent, out.top, 0.18, 0.18);
  g.appendChild(el('path', { d, fill, ...ink() }));
  const id = `ct${gid += 1}`;
  g.appendChild(el('defs', {}, [el('clipPath', { id }, [el('path', { d })])]));
  const inside = el('g', { 'clip-path': `url(#${id})` });
  g.appendChild(inside);
  if (out.dots) for (let y = sy + 30; y < hy; y += 48) for (let x = -sw; x < sw; x += 48) inside.appendChild(el('circle', { cx: x + ((y / 48) % 2 ? 24 : 0), cy: y, r: 8, fill: out.dots, opacity: 0.85 }));
  if (out.stripes) for (let y = sy + 24; y < hy; y += 40) inside.appendChild(el('rect', { x: -sw - 30, y, width: sw * 2 + 60, height: 14, fill: out.stripes, opacity: 0.8 }));
  if (out.hood) {
    inside.appendChild(el('rect', { x: -52, y: hy - 90, width: 104, height: 54, rx: 18, fill: tint(out.top, -0.12), ...ink(4) }));
    inside.appendChild(line(`M-18 ${sy + 4} l-4 60 M18 ${sy + 4} l4 60`, 4, { stroke: '#fff' }));
  }
  if (out.armor) {
    inside.appendChild(el('path', { d: `M-60 ${sy + 30} Q0 ${sy + 70} 60 ${sy + 30} M${-hw} ${hy - 50} Q0 ${hy - 30} ${hw} ${hy - 50}`, fill: 'none', ...ink(5) }));
    inside.appendChild(el('rect', { x: -hw - 20, y: hy - 40, width: hw * 2 + 40, height: 26, fill: '#8a6a3a', ...ink(4) }));
    inside.appendChild(el('rect', { x: -18, y: hy - 42, width: 36, height: 30, rx: 4, fill: '#ffd25a', ...ink(4) }));
  }
  if (out.vneck) inside.appendChild(el('path', { d: `M-34 ${sy - 2} L0 ${sy + 54} L34 ${sy - 2}`, fill: tint(out.top, -0.15), ...ink(5) }));
  if (out.tunic) {
    // Scrubs: a lighter piping round the V, and two seams down the sides.
    inside.appendChild(line(`M-40 ${sy - 2} L0 ${sy + 66} L40 ${sy - 2}`, 6, { stroke: tint(out.top, 0.45) }));
    for (const s of [-1, 1]) inside.appendChild(line(`M${s * (sw - 20)} ${sy + 70} Q${s * (hw - 6)} ${(sy + hy) / 2 + 40} ${s * (hw - 14)} ${hy}`, 3.5, { opacity: 0.35 }));
  }
  if (out.pocket) inside.appendChild(chestPocket(out.top, sy));
  if (out.badge) inside.appendChild(nameBadge(sy));
  if (out.tie) {
    // A suit: white shirt in a deep V, a tie, and jacket lapels.
    inside.appendChild(el('path', { d: `M-44 ${sy - 2} L0 ${sy + 120} L44 ${sy - 2}Z`, fill: '#fbf8f0', ...ink(5) }));
    inside.appendChild(el('path', { d: `M-12 ${sy + 4} L12 ${sy + 4} L8 ${sy + 22} L16 ${sy + 104} L0 ${sy + 124} L-16 ${sy + 104} L-8 ${sy + 22}Z`, fill: out.tie, ...ink(4) }));
    for (const s of [-1, 1]) inside.appendChild(el('path', { d: `M${s * 44} ${sy - 2} L${s * 4} ${sy + 126} L${s * 30} ${sy + 60} L${s * 66} ${sy + 40}Z`, fill: tint(out.top, -0.1), ...ink(4.5) }));
  }
  if (out.check) {
    // A loud check pattern (the landlord's suit): crossing bands, see-through, under the lapels.
    for (let x = -sw; x < sw; x += 46) inside.insertBefore(el('rect', { x, y: sy - 10, width: 12, height: hy - sy + 20, fill: out.check, opacity: 0.5 }), inside.firstChild);
    for (let y = sy + 20; y < hy; y += 46) inside.insertBefore(el('rect', { x: -sw - 20, y, width: sw * 2 + 40, height: 12, fill: out.check, opacity: 0.5 }), inside.firstChild);
  }
  if (out.baggy) {
    // A jacket far too long: it hangs well below the hips, with a split at the back and a sagging crease.
    const jw = hw + bel + 18;
    g.appendChild(el('path', { d: `M${-hw - 4} ${hy - 30} L${hw + 4} ${hy - 30} L${jw} ${hy + 70} Q${jw * 0.5} ${hy + 84} 8 ${hy + 74} L0 ${hy + 30} L-8 ${hy + 74} Q${-jw * 0.5} ${hy + 84} ${-jw} ${hy + 70}Z`, fill, ...ink(5) }));
    if (out.check) for (let x = -jw + 10; x < jw; x += 46) g.appendChild(line(`M${x} ${hy - 26} L${x + (x < 0 ? -4 : 4)} ${hy + 64}`, 12, { stroke: out.check, opacity: 0.5 }));
    g.appendChild(line(`M${-hw + 20} ${hy + 20} q20 14 46 4 M${hw - 20} ${hy + 30} q-20 12 -42 0`, 4, { opacity: 0.4 }));
    for (const by of [hy - 70, hy - 20]) g.appendChild(el('circle', { cx: 0, cy: by, r: 9, fill: '#6e4528', ...ink(3) }));
  }
  if (out.hood) g.appendChild(el('path', { d: `M${-sw + 20} ${sy + 6} Q0 ${sy + 50} ${sw - 20} ${sy + 6} Q${sw - 10} ${sy - 40} 0 ${sy - 30} Q${-sw + 10} ${sy - 40} ${-sw + 20} ${sy + 6}Z`, fill: tint(out.top, -0.1), ...ink(5) }));
  return g;
}

/**
 * One arm from the shoulder through the elbow to the hand, with sleeve and hand.
 * @param {number[]} sh shoulder
 * @param {number[]} elb elbow
 * @param {number[]} hand hand
 * @param {object} out outfit
 * @param {string} skinFill hand fill
 * @param {{open?: boolean, wiggle?: boolean, point?: boolean, hold?: boolean, side: number}} o hand shape (hold: no hand here)
 * @returns {SVGElement} arm
 */
function arm(sh, elb, hand, out, skinFill, o) {
  const g = el('g');
  const d = `M${sh[0]} ${sh[1]} Q${elb[0]} ${elb[1]} ${hand[0]} ${hand[1]}`;
  const sleeve = out.armor ? '#c9d3de' : out.top;
  const fat = out.baggy ? 18 : 0; // baggy sleeves are much wider
  g.appendChild(el('path', { d, fill: 'none', stroke: INK, 'stroke-width': 52 + fat, 'stroke-linecap': 'round' }));
  g.appendChild(el('path', { d, fill: 'none', stroke: out.sleeve === 'short' ? skinFill : sleeve, 'stroke-width': 40 + fat, 'stroke-linecap': 'round' }));
  if (out.sleeve === 'short') {
    const mid = [(sh[0] + elb[0]) / 2, (sh[1] + elb[1]) / 2];
    g.appendChild(el('path', { d: `M${sh[0]} ${sh[1]} L${mid[0]} ${mid[1]}`, stroke: INK, 'stroke-width': 56, 'stroke-linecap': 'round' }));
    g.appendChild(el('path', { d: `M${sh[0]} ${sh[1]} L${mid[0]} ${mid[1]}`, stroke: sleeve, 'stroke-width': 44, 'stroke-linecap': 'round' }));
  }
  if (out.armor) g.appendChild(el('circle', { cx: elb[0] * 0.5 + (sh[0] + hand[0]) * 0.25, cy: elb[1] * 0.5 + (sh[1] + hand[1]) * 0.25, r: 22, fill: '#aeb9c6', ...ink(4.5) }));
  if (o.hold) return g; // a hand holding something is drawn over the thing instead (see drawCharacter)
  const hf = out.armor ? '#aeb9c6' : o.handFill ?? skinFill; // handFill = her blue gloves (SPEC D32e)
  if (o.open || o.wiggle) {
    g.appendChild(el('g', { transform: `translate(${hand[0]} ${hand[1]})` }, [openHand(hf, o)]));
  } else {
    const turn = Math.atan2(hand[1] - elb[1], hand[0] - elb[0]) * 180 / Math.PI - 90; // fingers follow the forearm
    g.appendChild(el('g', { transform: `translate(${hand[0]} ${hand[1]}) rotate(${turn})` }, [closedHand(hf, o)]));
  }
  if (out.baggy) {
    // A wide cuff swallowing the wrist (the sleeves are too long), tilted along the forearm.
    const t = 0.78;
    const cx = (1 - t) * (1 - t) * sh[0] + 2 * (1 - t) * t * elb[0] + t * t * hand[0];
    const cy = (1 - t) * (1 - t) * sh[1] + 2 * (1 - t) * t * elb[1] + t * t * hand[1];
    const a = Math.atan2(hand[1] - elb[1], hand[0] - elb[0]) * 180 / Math.PI;
    g.appendChild(el('ellipse', { cx, cy, rx: 22, ry: 36, fill: tint(out.top, -0.08), ...ink(5), transform: `rotate(${a} ${cx} ${cy})` }));
  }
  return g;
}

/**
 * An open cartoon hand at (0, 0), fingers fanned upwards: four separate fingers (index to pinky) and a thumb on the
 * body side. Wiggle ("happy hands") tilts the fan, bends every other finger a little and adds small motion lines.
 * @param {string} hf hand fill
 * @param {{wiggle?: boolean, side: number}} o hand shape
 * @returns {SVGElement} the hand
 */
function openHand(hf, o) {
  const g = el('g');
  const inner = -o.side; // the thumb side, towards the body
  const tilt = o.wiggle ? 7 * o.side : 0;
  const lens = [32, 37, 34, 27]; // index, middle, ring, pinky
  g.appendChild(el('rect', { x: -6.5, y: -41, width: 13, height: 30, rx: 6.5, fill: hf, ...ink(4.5), transform: `rotate(${inner * 78 + tilt})` }));
  lens.forEach((len, i) => {
    const l = len - (o.wiggle && i % 2 ? 6 : 0);
    g.appendChild(el('rect', { x: -6, y: -14 - l, width: 12, height: l, rx: 6, fill: hf, ...ink(4.5), transform: `rotate(${inner * (48 - 32 * i) + tilt})` }));
  });
  g.appendChild(el('circle', { r: 25, fill: hf, ...ink(5) }));
  if (o.wiggle) for (const s of [-1, 1]) g.appendChild(line(`M${s * 50} -56 q${s * 10} -6 ${s * 6} -18 M${s * 58} -28 q${s * 12} -2 ${s * 14} -14`, 4));
  return g;
}

/**
 * A closed cartoon hand at (0, 0) with the fingers towards +y: a rounded fist with three short knuckle lines
 * (four curled fingers) and a thumb on the body side. Pointing: the index finger sticks out, three stay curled.
 * @param {string} hf hand fill
 * @param {{point?: boolean, side: number}} o hand shape
 * @returns {SVGElement} the hand
 */
function closedHand(hf, o) {
  const g = el('g');
  const tx = o.point ? o.side : -o.side; // the thumb side in this frame (on top when pointing)
  if (o.point) g.appendChild(el('rect', { x: tx * 12 - 7.5, y: 6, width: 15, height: 50, rx: 7.5, fill: hf, ...ink(4.5) }));
  g.appendChild(el('ellipse', { cx: 0, cy: 2, rx: 25, ry: 27, fill: hf, ...ink(5) }));
  for (const x of o.point ? [0, -tx * 12] : [-12, 0, 12]) {
    const edge = 2 + 27 * Math.sqrt(1 - (x / 25) ** 2) - 1;
    g.appendChild(line(`M${x} ${edge.toFixed(1)} L${x * 0.9} 14`, 4));
  }
  g.appendChild(el('ellipse', { cx: tx * 18, cy: -3, rx: 8.5, ry: 15, fill: hf, ...ink(4.5), transform: `rotate(${tx * -18} ${tx * 18} -3)` }));
  return g;
}

/**
 * The legs: standing (two legs and shoes) or sitting seen from the front (knees towards us).
 * @param {string} kind stand or sit
 * @param {number} hy hip height
 * @param {object} b build
 * @param {object} out outfit
 * @returns {SVGElement|null} legs
 */
function legs(kind, hy, b, out) {
  if (kind === 'none') return null;
  const g = el('g');
  const x = b.hip * 0.48;
  const w = b.hip * 0.82;
  const pants = out.armor ? '#c9d3de' : out.pants;
  for (const s of [-1, 1]) {
    if (kind === 'sit') {
      g.appendChild(el('rect', { x: s * x - w / 2, y: hy - 10, width: w, height: -hy - 12, rx: w / 2.4, fill: pants, ...ink() }));
      g.appendChild(el('ellipse', { cx: s * x, cy: hy + 8, rx: w / 2 + 4, ry: 30, fill: tint(pants, 0.08), ...ink(5) }));
    } else {
      g.appendChild(el('rect', { x: s * x - w / 2, y: hy - 30, width: w, height: -hy + 10, rx: w / 2.6, fill: pants, ...ink() }));
    }
    if (out.armor) g.appendChild(el('circle', { cx: s * x, cy: kind === 'sit' ? hy + 8 : hy / 2, r: 18, fill: '#aeb9c6', ...ink(4) }));
    if (out.clogs) {
      // Round cartoon clogs (scrubs, T5.2): a white sole, a domed toe and three holes.
      const cx = s * (x + 8);
      g.appendChild(el('rect', { x: cx - w / 2 - 14, y: -14, width: w + 28, height: 16, rx: 8, fill: '#ffffff', ...ink(4.5) }));
      g.appendChild(el('path', { d: `M${cx - w / 2 - 12} -12 Q${cx - w / 2 - 10} -46 ${cx} -46 Q${cx + w / 2 + 10} -46 ${cx + w / 2 + 12} -12Z`, fill: out.shoes, ...ink(5) }));
      for (const dx of [-14, 0, 14]) g.appendChild(el('circle', { cx: cx + dx + s * 6, cy: -28, r: 4.5, fill: tint(out.shoes, -0.3) }));
    } else {
      g.appendChild(el('ellipse', { cx: s * (x + 8), cy: -8, rx: w / 2 + 12, ry: 20, fill: out.shoes, ...ink(5) }));
    }
  }
  return g;
}

/**
 * Something small held in the right hand.
 * @param {string} what remote, torch, phone, snack or tweezers
 * @param {number[]} at the hand
 * @param {number} [k] size (the layer's holdScale, default 1; the torch ignores it)
 * @returns {SVGElement|null} the thing
 */
function heldThing(what, at, k = 1) {
  const g = el('g', { transform: `translate(${at[0]} ${at[1]}) scale(${k})` });
  if (what === 'remote') {
    g.appendChild(el('rect', { x: -14, y: -62, width: 28, height: 78, rx: 9, fill: '#3a3f4a', ...ink(4.5) }));
    g.appendChild(el('circle', { cx: 0, cy: -46, r: 6, fill: '#e8505b' }));
  } else if (what === 'phone') {
    g.appendChild(el('rect', { x: -22, y: -70, width: 44, height: 78, rx: 9, fill: '#2b2f3a', ...ink(4.5) }));
    g.appendChild(el('rect', { x: -16, y: -63, width: 32, height: 58, rx: 4, fill: '#8fe3ff' }));
  } else if (what === 'torch') {
    return el('g', { transform: `translate(${at[0]} ${at[1]})` }, [torchShape(true)]);
  } else if (what === 'tweezers') {
    // Steel tweezers standing up out of the fist, joined at the bottom, tips at the top (holdScale 3 = crowbar size).
    for (const s of [-1, 1]) g.appendChild(el('path', { d: `M${s * 4} 34 L${s * 24} -122 L${s * 10} -126 L${s * -2} 30Z`, fill: '#d7dee7', ...ink(4) }));
    g.appendChild(el('circle', { cx: 0, cy: 34, r: 9, fill: '#8a96a6', ...ink(3.5) }));
    g.appendChild(line('M-14 -40 L-20 -100', 3, { stroke: '#ffffff', opacity: 0.8 }));
  } else if (what === 'clipboard') {
    // A clipboard held up by its bottom edge: brown board, paper with scribble lines and a ticked box, metal clip.
    g.appendChild(el('rect', { x: -60, y: -176, width: 120, height: 170, rx: 10, fill: '#b07a4a', ...ink(4.5) }));
    g.appendChild(el('rect', { x: -48, y: -158, width: 96, height: 140, rx: 3, fill: '#fffaf2', ...ink(3) }));
    for (const y of [-126, -104, -82, -60]) g.appendChild(line(`M-34 ${y} L${y % 44 ? 30 : 20} ${y}`, 3.5, { opacity: 0.5 }));
    g.appendChild(el('rect', { x: -36, y: -46, width: 16, height: 16, fill: 'none', ...ink(3) }));
    g.appendChild(line('M-34 -40 l6 8 l14 -18', 3.5, { stroke: '#e8505b' }));
    g.appendChild(el('rect', { x: -26, y: -186, width: 52, height: 24, rx: 6, fill: '#c9d3de', ...ink(4) }));
  } else if (what === 'magnifier') {
    // A magnifying glass: wooden handle down into the fist, a big ring with shiny glass on top.
    g.appendChild(el('rect', { x: -10, y: -70, width: 20, height: 90, rx: 9, fill: '#8a5a32', ...ink(4.5) }));
    g.appendChild(el('circle', { cx: 0, cy: -124, r: 58, fill: '#dff3ff', opacity: 0.55 }));
    g.appendChild(el('circle', { cx: 0, cy: -124, r: 58, fill: 'none', stroke: '#c9a24a', 'stroke-width': 14 }));
    g.appendChild(el('circle', { cx: 0, cy: -124, r: 66, fill: 'none', ...ink(4) }));
    g.appendChild(el('circle', { cx: 0, cy: -124, r: 50, fill: 'none', ...ink(3) }));
    g.appendChild(line('M-28 -146 Q-18 -164 4 -168', 6, { stroke: '#ffffff', opacity: 0.9 }));
  } else if (what === 'gloves') {
    g.appendChild(el('g', { transform: 'translate(0 18) scale(0.85)' }, [gloveBox()]));
  } else if (what === 'highlighter') {
    // A fat neon-yellow highlighter pen, chisel tip up (the psychology books, strip "books" on).
    g.appendChild(el('rect', { x: -14, y: -86, width: 28, height: 104, rx: 10, fill: '#e9f542', ...ink(4.5) }));
    g.appendChild(el('path', { d: 'M-10 -86 L-6 -112 L8 -104 L10 -86Z', fill: '#c8d900', ...ink(3.5) }));
    g.appendChild(el('rect', { x: -16, y: -30, width: 32, height: 14, rx: 4, fill: '#2b2f3a' }));
  } else if (what === 'book') {
    // An open book held up by its spine: two pages with lines, some lines already highlighted yellow.
    g.appendChild(el('path', { d: 'M0 -20 Q-50 -40 -96 -26 L-96 -150 Q-50 -164 0 -144Z M0 -20 Q50 -40 96 -26 L96 -150 Q50 -164 0 -144Z', fill: '#fffaf2', ...ink(4.5) }));
    g.appendChild(el('path', { d: 'M-96 -26 L-96 -14 Q-50 -28 0 -8 Q50 -28 96 -14 L96 -26', fill: '#6a7be6', ...ink(4) }));
    for (const [i, y] of [-128, -108, -88, -68, -48].entries()) {
      for (const s of [-1, 1]) {
        if ((i + (s > 0 ? 1 : 0)) % 2 === 0) g.appendChild(line(`M${s * 18} ${y} L${s * 80} ${y - 4}`, 12, { stroke: '#e9f542', opacity: 0.85 }));
        g.appendChild(line(`M${s * 18} ${y} L${s * 80} ${y - 4}`, 3, { opacity: 0.45 }));
      }
    }
  } else if (what === 'key') {
    // A huge old rusty key held by its ring, the shaft and the teeth up (strip "plan": the keys to the studio).
    g.appendChild(el('rect', { x: -11, y: -190, width: 22, height: 180, rx: 8, fill: '#c07a3e', ...ink(4.5) }));
    g.appendChild(el('path', { d: 'M11 -186 L58 -186 L58 -160 L44 -160 L44 -146 L58 -146 L58 -126 L11 -126Z', fill: '#c07a3e', ...ink(4.5) }));
    g.appendChild(el('circle', { cx: 0, cy: 6, r: 34, fill: '#c07a3e', ...ink(5) }));
    g.appendChild(el('circle', { cx: 0, cy: 6, r: 15, fill: 'none', ...ink(4.5) }));
    for (const [x, y, r] of [[-4, -150, 6], [4, -96, 5], [-3, -50, 7], [44, -170, 5], [-18, 24, 6]]) g.appendChild(el('circle', { cx: x, cy: y, r, fill: '#8a4f24', opacity: 0.7 }));
    g.appendChild(line('M-5 -176 L-5 -60', 4, { stroke: '#f2b47a', opacity: 0.8 }));
  } else if (what === 'pen') {
    // A ballpoint pen held for writing, tip down and a little to the front.
    const pg = el('g', { transform: 'rotate(24)' });
    pg.appendChild(el('rect', { x: -8, y: -70, width: 16, height: 118, rx: 6, fill: '#6a7be6', ...ink(4) }));
    pg.appendChild(el('path', { d: 'M-8 48 L8 48 L0 70Z', fill: '#fff8ee', ...ink(3.5) }));
    pg.appendChild(el('rect', { x: -10, y: -78, width: 20, height: 18, rx: 5, fill: '#2b2f3a', ...ink(3) }));
    g.appendChild(pg);
  } else if (what === 'pipeJoint') {
    // The shiny new pipe joint held up like a trophy (strip "mleak"): two short pipe stubs and the chrome collar.
    for (const sx of [-1, 1]) g.appendChild(el('rect', { x: sx > 0 ? 30 : -62, y: -84, width: 32, height: 32, rx: 5, fill: '#cfd8de', ...ink(4) }));
    g.appendChild(chromeJoint(0, -68, 24));
  } else if (what === 'snack') {
    g.appendChild(el('path', { d: 'M-30 -70 L30 -70 L24 10 L-24 10Z', fill: '#f3a33a', ...ink(4.5) }));
    for (const [x, y] of [[-14, -78], [4, -84], [18, -76]]) g.appendChild(el('circle', { cx: x, cy: y, r: 11, fill: '#fff4c8', ...ink(3.5) }));
  } else return null;
  return g;
}

/**
 * A box of rubber gloves (the inspector's gift): blue and white card box, a glove picture on the front and a puffy
 * glove popping out of the slot on top. Bottom middle at 0,0, about 190 units tall.
 * @returns {SVGElement} the box
 */
function gloveBox() {
  const g = el('g');
  const blue = GLOVE_BLUE;
  // The glove sticking out of the top: palm and four fingers, slightly puffed with air.
  for (const [a, len] of [[-34, 54], [-12, 66], [10, 62], [32, 50]]) g.appendChild(el('rect', { x: -12, y: -len, width: 24, height: len, rx: 12, fill: blue, ...ink(4), transform: `translate(${a * 1.4 + 4} -150) rotate(${a * 0.6})` }));
  g.appendChild(el('ellipse', { cx: 6, cy: -142, rx: 58, ry: 28, fill: blue, ...ink(4.5) }));
  g.appendChild(el('rect', { x: -86, y: -140, width: 172, height: 140, rx: 8, fill: '#ffffff', ...ink(5) }));
  g.appendChild(el('rect', { x: -86, y: -60, width: 172, height: 60, rx: 6, fill: tint(blue, -0.15), ...ink(4) }));
  g.appendChild(el('rect', { x: -40, y: -152, width: 92, height: 18, rx: 9, fill: '#2b2f3a', ...ink(3) }));
  // Glove picture on the front (no words: words go in bubbles) and a plus sign.
  g.appendChild(el('path', { d: 'M-50 -72 L-50 -106 Q-50 -114 -44 -114 Q-38 -114 -38 -106 L-38 -120 Q-38 -128 -32 -128 Q-26 -128 -26 -120 L-26 -122 Q-26 -130 -20 -130 Q-14 -130 -14 -122 L-14 -114 Q-14 -120 -8 -120 Q-2 -120 -2 -112 L-2 -86 Q-2 -72 -16 -72Z', fill: blue, ...ink(3.5) }));
  g.appendChild(el('path', { d: 'M38 -118 l0 44 M16 -96 l44 0', stroke: '#e8505b', 'stroke-width': 14, 'stroke-linecap': 'round' }));
  return g;
}

/**
 * A torch (flashlight), optionally with a warm beam of light, pointing up and to the right.
 * @param {boolean} beam draw the light
 * @returns {SVGElement} the torch
 */
function torchShape(beam) {
  const g = el('g', { transform: 'rotate(-35)' });
  if (beam) {
    const id = `cb${gid += 1}`;
    g.appendChild(el('defs', {}, [el('linearGradient', { id, x1: 0, y1: 1, x2: 0, y2: 0 }, [
      el('stop', { offset: 0, 'stop-color': '#fff3a8', 'stop-opacity': 0.9 }), el('stop', { offset: 1, 'stop-color': '#fff3a8', 'stop-opacity': 0 })])]));
    g.appendChild(el('path', { d: 'M-16 -70 L-90 -330 L90 -330 L16 -70Z', fill: `url(#${id})` }));
  }
  g.appendChild(el('rect', { x: -13, y: -50, width: 26, height: 70, rx: 6, fill: '#e8505b', ...ink(4.5) }));
  g.appendChild(el('path', { d: 'M-20 -50 L-24 -74 L24 -74 L20 -50Z', fill: '#c9d3de', ...ink(4.5) }));
  g.appendChild(el('ellipse', { cx: 0, cy: -74, rx: 22, ry: 6, fill: '#fff6c8', ...ink(3.5) }));
  return g;
}

/**
 * Draw a character from the CHARACTERS table with a pose, expression and outfit.
 * @param {string} who a key of CHARACTERS
 * @param {object} l the layer (x, y, scale, flip, expr, pose, outfit, hold, look, visor, and any CHARACTERS field)
 * @returns {{node: SVGElement, mouth: number[]}} the drawing and the mouth point in panel units
 */
export function drawCharacter(who, l) {
  const c = { ...CHARACTERS[who], ...l };
  const e = EXPRESSIONS[c.expr] ?? EXPRESSIONS.neutral;
  const pose = POSES[c.pose] ?? POSES.stand;
  const out = OUTFITS[c.outfit] ?? OUTFITS.everyday;
  const b = BUILDS[c.build] ?? BUILDS.slim;
  const s = (c.scale ?? 1) * (c.size ?? 1);
  const fx = c.flip ? -1 : 1;
  const body = el('g');
  const down = pose.down ?? 0;
  const shift = pose.shift ?? 0;
  const hy = pose.hipY ?? -170;
  const sy = -385 + down;
  const headY = -515 + down;
  const skinFill = shading(body, SKIN[c.skin] ?? c.skin);
  // Gloves (SPEC D32e): true = her blue gloves, or a colour; the hands are drawn in it instead of skin.
  const handFill = c.gloves ? (c.gloves === true ? GLOVE_BLUE : c.gloves) : skinFill;
  const shoulders = [[-b.shoulder + 22, sy + 26], [b.shoulder - 22, sy + 26]];
  const legNode = legs(pose.legs, hy, b, out);
  if (legNode) body.appendChild(legNode);
  if (pose.legs === 'sit') body.appendChild(el('rect', { x: -b.hip - 4, y: hy - 30, width: b.hip * 2 + 8, height: 40, rx: 18, fill: out.armor ? '#c9d3de' : out.pants, ...ink(5) }));
  body.appendChild(el('rect', { x: -26, y: headY + 90, width: 52, height: sy - headY - 80, fill: skinFill, ...ink(5) }));
  body.appendChild(torso(c, b, out, sy, hy, body));
  if (out.tunic && pose.legs !== 'none') body.appendChild(tunicHem(b, out, hy, pose.legs, body));
  if (out.apron) body.appendChild(apronFront(b, out, sy, hy, pose.legs, body));
  if (out.armor) for (const sx of [-1, 1]) body.appendChild(el('path', { d: `M${sx * (b.shoulder + 26)} ${sy + 50} C${sx * (b.shoulder + 30)} ${sy - 30} ${sx * 20} ${sy - 30} ${sx * 30} ${sy + 20}Z`, fill: '#d7dee7', ...ink(5) }));
  const h = head({ ...c, flip: c.flip }, e);
  h.node.setAttribute('transform', `translate(0 ${headY}) scale(${b.head}) ${h.node.getAttribute('transform')}`);
  body.appendChild(h.node);
  if (pose.arms) {
    pose.arms.forEach(([elb, hand], i) => {
      const side = i ? 1 : -1;
      const dy = [elb[1] + down, hand[1] + down];
      const held = i === 1 && c.hold ? heldThing(c.hold, [hand[0], dy[1]], c.holdScale) : null;
      // `grip: true` on the layer = the scene draws her right fist round its own prop (the watering can), so the arm
      // stops at the wrist (owner 2026-10-28: an open hand showed under the fist).
      const o = { open: pose.open?.[i], wiggle: pose.wiggle, point: pose.point && i === 1, side, hold: !!held || (i === 1 && c.grip === true), handFill };
      body.appendChild(arm(shoulders[i], [elb[0], dy[0]], [hand[0], dy[1]], out, skinFill, o));
      if (held) {
        // The fist goes over the thing, fingers wrapped across it and the thumb on top, so it looks gripped.
        const turn = 90 + (c.hold === 'torch' ? -35 : 0);
        body.appendChild(held);
        body.appendChild(el('g', { transform: `translate(${hand[0]} ${dy[1]}) rotate(${turn}) scale(0.9)` }, [closedHand(out.armor ? '#aeb9c6' : handFill, { side })]));
      }
    });
  }
  if (c.silhouette) {
    // A flat dark shape of the figure (a big triumphant moment against rays): flood colour cut to the figure's outline.
    const fid = `cf${gid += 1}`;
    body.appendChild(el('defs', {}, [el('filter', { id: fid }, [
      el('feFlood', { 'flood-color': c.silhouette === true ? INK : c.silhouette }), el('feComposite', { in2: 'SourceAlpha', operator: 'in' })])]));
    body.setAttribute('filter', `url(#${fid})`);
  }
  const node = el('g', { transform: `translate(${c.x ?? 0} ${c.y ?? 0}) scale(${fx * s} ${s}) translate(0 ${shift})` }, [body]);
  const my = headY + h.mouthY * b.head + shift;
  return { node, mouth: [(c.x ?? 0), (c.y ?? 0) + my * s], reach: 105 * b.head * s };
}

/**
 * A comfy three-seat sofa seen from the front; seat top is 125 units above the floor at scale 1, as figures sit.
 * @param {object} l layer: x, y (floor, middle), w width (default 820), scale, color
 * @returns {{node: SVGElement}} the sofa
 */
function sofa(l) {
  const s = l.scale ?? 1;
  const w = l.w ?? 820;
  const col = l.color ?? '#3fae8c';
  const g = el('g');
  const fill = shading(g, col, 0.18, 0.2);
  const back = shading(g, tint(col, -0.08), 0.15, 0.2);
  const hw = w / 2;
  for (const sx of [-1, 1]) g.appendChild(el('rect', { x: sx * (hw - 40) - 10, y: -24, width: 20, height: 26, rx: 4, fill: '#6e4528', ...ink(4) }));
  g.appendChild(el('rect', { x: -hw + 60, y: -380, width: w - 120, height: 280, rx: 60, fill: back, ...ink() }));
  const n = 3;
  const cw = (w - 200) / n;
  for (let i = 0; i < n; i += 1) {
    g.appendChild(el('rect', { x: -hw + 100 + i * cw + 6, y: -352, width: cw - 12, height: 220, rx: 40, fill: tint(col, 0.04), ...ink(5) }));
  }
  g.appendChild(el('rect', { x: -hw + 70, y: -125, width: w - 140, height: 105, rx: 30, fill, ...ink() }));
  for (let i = 1; i < n; i += 1) g.appendChild(line(`M${-hw + 100 + i * cw} -120 l0 40`, 4, { opacity: 0.5 }));
  for (const sx of [-1, 1]) g.appendChild(el('rect', { x: sx > 0 ? hw - 110 : -hw, y: -235, width: 110, height: 215, rx: 50, fill, ...ink() }));
  return { node: el('g', { transform: `translate(${l.x ?? 0} ${l.y ?? 0}) scale(${s})` }, [g]) };
}

/**
 * A bed seen from the foot end: headboard and two pillows. Put sleepers ('bust' pose) on the pillows, then a
 * 'blanket' layer over them.
 * @param {object} l layer: x, y (floor, middle), w width (default 900), scale, color (headboard)
 * @returns {{node: SVGElement}} the bed
 */
function bed(l) {
  const s = l.scale ?? 1;
  const w = l.w ?? 900;
  const hw = w / 2;
  const g = el('g');
  const wood = shading(g, l.color ?? '#b07a4a', 0.15, 0.2);
  g.appendChild(el('path', { d: `M${-hw} 0 L${-hw} -560 Q${-hw} -660 ${-hw + 100} -660 L${hw - 100} -660 Q${hw} -660 ${hw} -560 L${hw} 0Z`, fill: wood, ...ink() }));
  g.appendChild(el('rect', { x: -hw + 50, y: -600, width: w - 100, height: 180, rx: 40, fill: tint(l.color ?? '#b07a4a', -0.12), ...ink(5), opacity: 0.6 }));
  for (const sx of [-1, 1]) g.appendChild(el('rect', { x: sx * hw * 0.48 - 170, y: -470, width: 340, height: 150, rx: 70, fill: '#fffaf2', ...ink() }));
  g.appendChild(el('rect', { x: -hw + 20, y: -330, width: w - 40, height: 330, rx: 30, fill: '#fffaf2', ...ink() }));
  return { node: el('g', { transform: `translate(${l.x ?? 0} ${l.y ?? 0}) scale(${s})` }, [g]) };
}

/**
 * The blanket over a bed (draw it after the sleepers). torch: 'left' or 'right' makes a glowing tent where someone
 * is secretly popping by torchlight.
 * @param {object} l layer: x, y, w (same as the bed), scale, color, torch
 * @returns {{node: SVGElement}} the blanket
 */
function blanket(l) {
  const s = l.scale ?? 1;
  const w = l.w ?? 900;
  const hw = w / 2;
  const col = l.color ?? '#6a7be6';
  const g = el('g');
  const fill = shading(g, col, 0.15, 0.2);
  const tent = l.torch === 'left' ? -1 : l.torch === 'right' ? 1 : 0;
  const tx = tent * hw * 0.48;
  const top = tent ? `L${tx - 200} -360 Q${tx - 150} -500 ${tx} -520 Q${tx + 150} -500 ${tx + 200} -360` : '';
  const d = tent > 0
    ? `M${-hw - 10} 0 L${-hw - 10} -330 Q${-hw * 0.4} -370 ${tx - 200} -360 ${top.slice(top.indexOf('Q'))} Q${hw} -350 ${hw + 10} -330 L${hw + 10} 0Z`
    : tent < 0
      ? `M${-hw - 10} 0 L${-hw - 10} -330 Q${-hw} -350 ${tx - 200} -360 ${top.slice(top.indexOf('Q'))} Q${hw * 0.4} -370 ${hw + 10} -330 L${hw + 10} 0Z`
      : `M${-hw - 10} 0 L${-hw - 10} -330 Q0 -380 ${hw + 10} -330 L${hw + 10} 0Z`;
  if (tent) {
    const id = `cg${gid += 1}`;
    g.appendChild(el('defs', {}, [el('radialGradient', { id }, [
      el('stop', { offset: 0, 'stop-color': '#fff3a8', 'stop-opacity': 0.95 }), el('stop', { offset: 1, 'stop-color': '#ffd25a', 'stop-opacity': 0 })])]));
    g.appendChild(el('ellipse', { cx: tx, cy: -380, rx: 330, ry: 220, fill: `url(#${id})` }));
  }
  g.appendChild(el('path', { d, fill, ...ink() }));
  g.appendChild(el('path', { d: `M${-hw - 10} -300 Q0 -340 ${hw + 10} -300 L${hw + 10} -250 Q0 -290 ${-hw - 10} -250Z`, fill: '#fffaf2', ...ink(5), opacity: tent ? 0 : 1 }));
  for (let i = -2; i <= 2; i += 1) g.appendChild(line(`M${i * hw * 0.38} -40 q${30} -90 ${10} -200`, 4, { opacity: 0.25 }));
  if (tent) {
    const id = `cl${gid += 1}`;
    g.appendChild(el('defs', {}, [el('linearGradient', { id, x1: 0, y1: 0, x2: 0, y2: 1 }, [
      el('stop', { offset: 0, 'stop-color': '#fff3a8', 'stop-opacity': 0.85 }), el('stop', { offset: 1, 'stop-color': '#fff3a8', 'stop-opacity': 0 })])]));
    g.appendChild(el('path', { d: `M${tx - 70} -500 Q${tx} -530 ${tx + 70} -500 L${tx + 120} -300 L${tx - 120} -300Z`, fill: `url(#${id})` }));
    for (const a of [-50, -20, 20, 50]) g.appendChild(line(`M${tx + a * 2.6} ${-480 - Math.abs(a)} l${a * 0.8} ${-40 + Math.abs(a) * 0.3}`, 5, { stroke: '#ffd25a' }));
  }
  return { node: el('g', { transform: `translate(${l.x ?? 0} ${l.y ?? 0}) scale(${s})` }, [g]) };
}

/**
 * A suit of armor on a stand (the empty one he buys), visor down, with a proud plume.
 * @param {object} l layer: x, y (floor), scale, flip
 * @returns {{node: SVGElement}} the armor
 */
function armorStand(l) {
  const g = el('g');
  g.appendChild(el('rect', { x: -110, y: -20, width: 220, height: 24, rx: 8, fill: '#6e4528', ...ink(5) }));
  g.appendChild(el('rect', { x: -8, y: -160, width: 16, height: 150, fill: '#6e4528', ...ink(4) }));
  const knight = drawCharacter('husband', { ...l, x: 0, y: -10, scale: 1, flip: false, outfit: 'armor', visor: 'down', expr: l.expr ?? 'neutral', pose: l.pose ?? 'stand', beard: false });
  g.appendChild(knight.node);
  const s = l.scale ?? 1;
  return { node: el('g', { transform: `translate(${l.x ?? 0} ${l.y ?? 0}) scale(${(l.flip ? -1 : 1) * s} ${s})` }, [g]) };
}

/**
 * A comic burst (the jagged "POP!" star behind a sound word), cartoon only, no goo.
 * @param {object} l layer: x, y (middle), r radius (default 160), color, points
 * @returns {{node: SVGElement}} the burst
 */
function burst(l) {
  const r = l.r ?? 160;
  const n = l.points ?? 14;
  const pts = [];
  for (let i = 0; i < n * 2; i += 1) {
    const a = (i / (n * 2)) * Math.PI * 2;
    const k = i % 2 ? 0.62 : 1 - (i % 4 === 0 ? 0 : 0.12);
    pts.push(`${(Math.cos(a) * r * k).toFixed(1)},${(Math.sin(a) * r * k).toFixed(1)}`);
  }
  const g = el('g', { transform: `translate(${l.x ?? 0} ${l.y ?? 0}) rotate(${l.rotate ?? 8})` }, [
    el('polygon', { points: pts.join(' '), fill: l.color ?? '#ffe27a', ...ink(7) }),
    el('polygon', { points: pts.join(' '), fill: '#fff', opacity: 0.45, transform: 'scale(0.55)' }),
  ]);
  return { node: g };
}

/**
 * A few twinkling sparkles (for glowing skin, a proud moment or a magic reveal).
 * @param {object} l layer: x, y (middle), r spread (default 120), color
 * @returns {{node: SVGElement}} the sparkles
 */
function sparkles(l) {
  const r = l.r ?? 120;
  const g = el('g', { transform: `translate(${l.x ?? 0} ${l.y ?? 0})` });
  for (const [x, y, s] of [[-0.8, -0.4, 1], [0.6, -0.8, 0.7], [0.9, 0.3, 0.85], [-0.3, 0.7, 0.6], [0.1, -0.1, 0.45]]) {
    const cx = x * r;
    const cy = y * r;
    const k = 30 * s * (r / 120);
    g.appendChild(el('path', { d: `M${cx} ${cy - k} Q${cx + k * 0.18} ${cy - k * 0.18} ${cx + k} ${cy} Q${cx + k * 0.18} ${cy + k * 0.18} ${cx} ${cy + k} Q${cx - k * 0.18} ${cy + k * 0.18} ${cx - k} ${cy} Q${cx - k * 0.18} ${cy - k * 0.18} ${cx} ${cy - k}Z`, fill: l.color ?? '#ffe27a', ...ink(3.5) }));
  }
  return { node: g };
}

/**
 * A torch (flashlight) on its own, e.g. for a close-up.
 * @param {object} l layer: x, y, scale, rotate, beam (default true)
 * @returns {{node: SVGElement}} the torch
 */
function torch(l) {
  const s = l.scale ?? 1;
  return { node: el('g', { transform: `translate(${l.x ?? 0} ${l.y ?? 0}) rotate(${l.rotate ?? 0}) scale(${s})` }, [torchShape(l.beam ?? true)]) };
}

/** Rooms: wall and floor colours, wallpaper stripes, the view out of the window and which furniture shows. */
export const ROOMS = {
  living: {
    wall: ['#fde3c8', '#f6cdab'], stripes: '#f9d7b6', skirting: '#fff3e3', floor: '#c98f6b', boards: '#a8724f',
    sky: ['#8fd3ff', '#dff4ff'], cloud: true, curtains: '#e8735a', picture: true, plant: true, lamp: true,
  },
  bedroom: {
    wall: ['#2a2b55', '#3d3c72'], stripes: '#33336a', skirting: '#4b4a86', floor: '#3a2f4f', boards: '#2c2340',
    sky: ['#10153a', '#2a3470'], moon: true, stars: true, curtains: '#7b6ad8', picture: false, plant: false, lamp: false,
  },
  // Kitchen (breakfast, strip 2): sunny yellow wall, pale tiled floor, green curtains, the plant on the floor.
  kitchen: {
    wall: ['#fff2c9', '#ffe2a0'], stripes: '#fbe7b4', skirting: '#ffffff', floor: '#e6d2bc', boards: '#cbb197',
    sky: ['#ffd9a8', '#dff4ff'], cloud: true, curtains: '#6fbf4c', picture: false, plant: true, lamp: false,
  },
  // Community hall (support group): pale green paint, grey lino, a notice board, the plant in the corner.
  hall: {
    wall: ['#e2eed3', '#cfe2bf'], stripes: '#d6e7c6', skirting: '#f4f8ee', floor: '#b9c3cf', boards: '#a2adbb',
    sky: ['#8fd3ff', '#dff4ff'], cloud: true, curtains: '#f2c14e', picture: false, plant: true, lamp: false, board: true,
  },
  // Her first studio, tier 0 (strip 5 on), matching the game's dingy room (pop/backdrop.js): greenish grey paint with
  // stains and peeling bits, grimy tiles, a sagging ceiling with a leak, a bare flickering bulb, a door, the "Clean!"
  // sign (the painted word CLEAN!, a small tick, sparkles and a stain) and a cheap lamp. Options: leakX, bulbX, signX, signTilt,
  // signY (its nail's height as a share of the floor line, default 0.12), doorX, doorOpen, leak/bulb/sign/door false to hide one.
  studio: {
    wall: ['#8e9b83', '#7b8872'], stripes: '#86937c', skirting: '#5f6a56', floor: '#4f5648', boards: '#3c4237',
    sky: ['#aab4bf', '#dde3e8'], cloud: true, curtains: '#a89a6a', picture: false, plant: true, lamp: true,
    shabby: true, leak: true, bulb: true, sign: true, door: true,
  },
  // The closed launderette (strip "plan"): the same shabby room before it became her studio, only dustier: a row of
  // dusty washing machines (washers: true or a list of 0..1 positions), cobwebs in the top corners, a cracked sink
  // (sinkX) and lost socks on the floor. No "Clean!" sign yet. Options as the studio, plus washers/cobwebs/sink/socks false.
  launderette: {
    wall: ['#9aa38f', '#868f7b'], stripes: '#919a86', skirting: '#5f6a56', floor: '#585e50', boards: '#454a3e',
    sky: ['#aab4bf', '#dde3e8'], cloud: true, curtains: '#a89a6a', picture: false, plant: false, lamp: false,
    shabby: true, leak: true, bulb: true, sign: false, door: true, washers: true, cobwebs: true, sink: true, socks: true,
  },
};

/**
 * The dingy studio's wall (tier 0): grimy tiles low down, water stains, peeling paint, cracks, a door and a sagging
 * ceiling patch with a drop hanging from it. Drawn into the room before the window.
 * @param {SVGElement} g the room group @param {object} r room options @param {number} w width @param {number} F floor line
 * @returns {void}
 */
function shabbyWall(g, r, w, F) {
  const k = Math.min(F / 600, w / 1000);
  const t = 52 * k; // tile size
  const top = F - 22 - t * 4;
  g.appendChild(el('rect', { x: 0, y: top, width: w, height: F - 22 - top, fill: '#b4bba1' }));
  for (let y = top; y < F - 22; y += t) {
    for (let x = Math.round((y - top) / t) % 2 ? -t / 2 : 0; x < w; x += t) {
      const n = (Math.round(x / t) * 7 + Math.round(y / t) * 3) % 11;
      if (n === 4) g.appendChild(el('rect', { x, y, width: t, height: t, fill: '#5d6650' })); // a missing tile
      else if (n % 3 === 0) g.appendChild(el('rect', { x: x + 2, y: y + 2, width: t - 4, height: t - 4, fill: '#a3ab8f' }));
      if (n === 7) g.appendChild(line(`M${x + t * 0.2} ${y + 2} l${t * 0.25} ${t * 0.4} l${-t * 0.1} ${t * 0.3} l${t * 0.2} ${t * 0.3}`, 3, { stroke: '#3f463a' }));
    }
  }
  for (let y = top; y <= F - 22; y += t) g.appendChild(line(`M0 ${y} L${w} ${y}`, 3, { stroke: '#6c7560' }));
  g.appendChild(el('rect', { x: 0, y: top - 8, width: w, height: 10, fill: '#9aa287', ...ink(3) }));
  // Olive-brown water stains (never anything like blood), peeling flakes and cracks.
  const sid = `cst${gid += 1}`;
  g.appendChild(el('defs', {}, [el('radialGradient', { id: sid }, [el('stop', { offset: 0, 'stop-color': '#786834', 'stop-opacity': 0.12 }), el('stop', { offset: 0.8, 'stop-color': '#786834', 'stop-opacity': 0.3 }), el('stop', { offset: 1, 'stop-color': '#786834', 'stop-opacity': 0 })])]));
  for (const [fx, fy, rr] of [[0.12, 0.3, 90], [0.46, 0.55, 70], [0.86, 0.38, 110], [0.64, 0.18, 60]]) g.appendChild(el('ellipse', { cx: w * fx, cy: F * fy, rx: rr * k, ry: rr * k * 0.8, fill: `url(#${sid})` }));
  for (const [fx, fy, s] of [[0.3, 0.22, 1], [0.56, 0.36, 0.8], [0.93, 0.6, 0.9], [0.06, 0.62, 0.7]]) {
    const x = w * fx;
    const y = F * fy;
    const q = 40 * k * s;
    g.appendChild(el('path', { d: `M${x} ${y} l${q} ${-q * 0.3} l${q * 0.4} ${q * 0.7} l${-q * 0.6} ${q * 0.5} l${-q * 0.7} ${-q * 0.2}Z`, fill: '#b8b29a', ...ink(3) }));
    g.appendChild(el('path', { d: `M${x + q * 1.4} ${y + q * 0.4} q${q * 0.4} ${-q * 0.3} ${q * 0.2} ${-q * 0.8}`, fill: '#d6d0b4', ...ink(3) }));
  }
  for (const [fx, fy, len] of [[0.97, 0, 0.4], [0.03, 0.3, 0.3], [0.4, 0.04, 0.2]]) {
    const x = w * fx;
    const y = F * fy;
    const d = F * len;
    g.appendChild(line(`M${x} ${y} l${-d * 0.1} ${d * 0.3} l${d * 0.12} ${d * 0.2} l${-d * 0.08} ${d * 0.25} l${d * 0.1} ${d * 0.25}`, 3.5, { stroke: '#3f463a' }));
  }
  if (r.door) {
    // A tired wooden door, open (dark doorway, the door leaf swung in) or shut (scuffed, with a knob).
    const dh = F * 0.84;
    const dw = Math.min(dh * 0.48, 300 * k);
    const dx = w * (r.doorX ?? 0.12) - dw / 2;
    const dy = F - dh;
    g.appendChild(el('rect', { x: dx - 14 * k, y: dy - 14 * k, width: dw + 28 * k, height: dh + 14 * k, fill: '#7a6a50', ...ink(5) }));
    g.appendChild(el('rect', { x: dx, y: dy, width: dw, height: dh, fill: r.doorOpen ? '#3a3f36' : '#9a7a52', ...ink(5) }));
    if (r.doorOpen) {
      g.appendChild(el('path', { d: `M${dx} ${dy} L${dx + dw * 0.28} ${dy + dh * 0.06} L${dx + dw * 0.28} ${F - dh * 0.03} L${dx} ${F}Z`, fill: '#9a7a52', ...ink(5) }));
      g.appendChild(el('path', { d: `M${dx + dw * 0.28} ${F} L${dx + dw * 1.3} ${F + 60 * k} L${dx + dw * 1.6} ${F + 60 * k} L${dx + dw} ${F}Z`, fill: '#e8dfb0', opacity: 0.35 }));
    } else {
      for (const fy of [0.12, 0.56]) g.appendChild(el('rect', { x: dx + dw * 0.16, y: dy + dh * fy, width: dw * 0.68, height: dh * 0.32, rx: 6, fill: 'none', ...ink(3.5), opacity: 0.6 }));
      g.appendChild(el('circle', { cx: dx + dw * 0.84, cy: dy + dh * 0.55, r: 10 * k, fill: '#c9a24a', ...ink(3) }));
    }
  }
  if (r.leak) {
    // The sagging ceiling: a damp bulge with stain rings, and a fat drop hanging under it.
    const lx = w * (r.leakX ?? 0.5);
    const s = 150 * k;
    g.appendChild(el('path', { d: `M${lx - s * 1.4} 0 Q${lx - s * 0.8} ${s * 0.1} ${lx - s * 0.5} ${s * 0.32} Q${lx} ${s * 0.6} ${lx + s * 0.5} ${s * 0.32} Q${lx + s * 0.8} ${s * 0.1} ${lx + s * 1.4} 0Z`, fill: '#a39e7c', ...ink(5) }));
    g.appendChild(el('ellipse', { cx: lx, cy: s * 0.22, rx: s * 0.6, ry: s * 0.14, fill: '#786834', opacity: 0.35 }));
    g.appendChild(line(`M${lx - s * 0.9} ${s * 0.14} Q${lx} ${s * 0.4} ${lx + s * 0.9} ${s * 0.14}`, 3, { stroke: '#786834', opacity: 0.6 }));
    g.appendChild(el('path', { d: `M${lx} ${s * 0.44} C${lx + 14 * k} ${s * 0.44 + 22 * k} ${lx + 14 * k} ${s * 0.44 + 38 * k} ${lx} ${s * 0.44 + 38 * k} C${lx - 14 * k} ${s * 0.44 + 38 * k} ${lx - 14 * k} ${s * 0.44 + 22 * k} ${lx} ${s * 0.44}Z`, fill: '#9ad8ff', ...ink(3.5) }));
  }
}

/**
 * The studio sign's word, "CLEAN!" from the string table (B9), hand-painted: chunky green letters with a dark rim,
 * squeezed or stretched to fill the given width so it never runs off the board in any language. Gives nothing when
 * the string table is not loaded (then the sign keeps its big tick only).
 * @param {number} x middle of the word @param {number} y its baseline @param {number} width how wide it is painted
 * @param {number} size letter height @param {number} k panel size unit (for the rim)
 * @param {object} [o] extras: fill (letter colour), opacity, rotate (degrees, round the middle of the baseline)
 * @returns {SVGElement|null} the text element, or null
 */
function signWord(x, y, width, size, k, o = {}) {
  if (!hasString('art.sign.clean')) return null;
  const word = el('text', {
    x, y, 'text-anchor': 'middle', 'font-size': size, 'font-weight': 900, 'letter-spacing': size * 0.04,
    'font-family': "'Arial Rounded MT Bold', 'Comic Sans MS', 'Chalkboard SE', system-ui, sans-serif",
    textLength: width, lengthAdjust: 'spacingAndGlyphs', fill: o.fill ?? '#3fae8c', stroke: INK, 'stroke-width': 3.5 * k,
    'stroke-linejoin': 'round', 'paint-order': 'stroke', opacity: o.opacity,
    transform: o.rotate ? `rotate(${o.rotate} ${x} ${y})` : null,
  });
  word.textContent = t('art.sign.clean');
  return word;
}

/**
 * The sign's word on its own, for a strip that draws the sign board itself (strip mapron's fallen sign):
 * { art: 'signWord', x, y (middle of the baseline), w (how wide), size (letter height), rotate (degrees) }.
 * @param {object} l the layer
 * @returns {{node: SVGElement}} the word (an empty group when the string table is not loaded)
 */
function signWordProp(l) {
  const size = l.size ?? 46;
  return { node: signWord(l.x ?? 0, l.y ?? 0, l.w ?? size * 3.5, size, size / 46, { rotate: l.rotate }) ?? el('g') };
}

/**
 * The dingy studio's things in front of the wall: the bare bulb on its cord (with flicker marks) and the "Clean!"
 * sign hanging crooked from a nail (the painted word CLEAN! with a small tick, sparkles, plus a stain that says
 * otherwise).
 * @param {SVGElement} g the room group @param {object} r room options @param {number} w width @param {number} F floor line
 * @returns {void}
 */
function shabbyFront(g, r, w, F) {
  const k = Math.min(F / 600, w / 1000);
  if (r.sign) {
    const sx = w * (r.signX ?? 0.72);
    const sy = F * (r.signY ?? 0.12);
    const sw = 250 * k;
    const sh = 130 * k;
    const top = sy + 40 * k;
    const sg = el('g', { transform: `rotate(${r.signTilt ?? -7} ${sx} ${sy})` });
    sg.appendChild(line(`M${sx} ${sy} L${sx - sw * 0.4} ${top} M${sx} ${sy} L${sx + sw * 0.4} ${top}`, 3.5));
    sg.appendChild(el('rect', { x: sx - sw / 2, y: top, width: sw, height: sh, rx: 10 * k, fill: '#f6f1de', ...ink(5) }));
    const word = signWord(sx - sw * 0.1, top + sh * 0.7, sw * 0.68, sh * 0.5, k);
    if (word) {
      sg.appendChild(word);
      sg.appendChild(line(`M${sx + sw * 0.3} ${top + sh * 0.5} l${sw * 0.05} ${sh * 0.16} l${sw * 0.1} ${-sh * 0.34}`, 9 * k, { stroke: '#3fae8c' }));
      // The stain that says otherwise, low over the middle of the word (the word still reads).
      sg.appendChild(el('ellipse', { cx: sx - sw * 0.02, cy: top + sh * 0.76, rx: 26 * k, ry: 17 * k, fill: '#786834', opacity: 0.38 }));
      sg.appendChild(el('path', { d: `M${sx - sw * 0.03} ${top + sh * 0.86} q${4 * k} ${10 * k} ${-2 * k} ${sh * 0.12}`, fill: 'none', stroke: '#786834', 'stroke-width': 6 * k, 'stroke-linecap': 'round', opacity: 0.38 }));
    } else {
      sg.appendChild(el('ellipse', { cx: sx + sw * 0.3, cy: top + sh * 0.72, rx: 30 * k, ry: 18 * k, fill: '#786834', opacity: 0.35 }));
      sg.appendChild(line(`M${sx - sw * 0.28} ${top + sh * 0.5} l${sw * 0.12} ${sh * 0.24} l${sw * 0.26} ${-sh * 0.46}`, 14 * k, { stroke: '#3fae8c' }));
    }
    for (const [fx, fy, q] of (word ? [[0.5, 0.02, 20], [0.47, 0.98, 13], [-0.5, 0.04, 12]] : [[0.26, 0.3, 22], [0.36, 0.7, 14], [-0.38, 0.28, 12]])) {
      const cx = sx + sw * fx;
      const cy = sy + 40 * k + sh * fy;
      const z = q * k;
      g.appendChild(el('path', { d: `M${cx} ${cy - z} Q${cx + z * 0.2} ${cy - z * 0.2} ${cx + z} ${cy} Q${cx + z * 0.2} ${cy + z * 0.2} ${cx} ${cy + z} Q${cx - z * 0.2} ${cy + z * 0.2} ${cx - z} ${cy} Q${cx - z * 0.2} ${cy - z * 0.2} ${cx} ${cy - z}Z`, fill: '#ffe27a', ...ink(2.5), transform: `rotate(${r.signTilt ?? -7} ${sx} ${sy})` }));
    }
    sg.appendChild(el('circle', { cx: sx, cy: sy, r: 7 * k, fill: '#8a96a6', ...ink(3) }));
    g.appendChild(sg);
  }
  if (r.bulb) {
    // A bare bulb on a cord from the ceiling, a weak yellow glow and little flicker marks.
    const bx = w * (r.bulbX ?? 0.32);
    const by = F * 0.2;
    const gl = `cbg${gid += 1}`;
    g.appendChild(el('defs', {}, [el('radialGradient', { id: gl }, [el('stop', { offset: 0, 'stop-color': '#ffe496', 'stop-opacity': 0.55 }), el('stop', { offset: 1, 'stop-color': '#ffe496', 'stop-opacity': 0 })])]));
    g.appendChild(el('circle', { cx: bx, cy: by, r: 170 * k, fill: `url(#${gl})` }));
    g.appendChild(line(`M${bx} 0 L${bx} ${by - 24 * k}`, 4));
    g.appendChild(el('rect', { x: bx - 11 * k, y: by - 34 * k, width: 22 * k, height: 18 * k, fill: '#8d9389', ...ink(3.5) }));
    g.appendChild(el('ellipse', { cx: bx, cy: by, rx: 20 * k, ry: 24 * k, fill: '#fff2bf', ...ink(4) }));
    for (const s of [-1, 1]) g.appendChild(line(`M${bx + s * 34 * k} ${by - 10 * k} l${s * 14 * k} ${-6 * k} l${-s * 4 * k} ${12 * k} l${s * 14 * k} ${-6 * k}`, 3.5, { stroke: '#e8b830' }));
  }
}

/**
 * A cobweb in a corner: threads fanning out from the corner point, joined by sagging rings.
 * @param {SVGElement} g where to draw @param {number} x corner x @param {number} y corner y @param {number} size reach
 * @param {number} dx 1 = the web spreads right, -1 = left @returns {void}
 */
function cobweb(g, x, y, size, dx) {
  const angles = [0, 22, 45, 68, 90].map((a) => (a * Math.PI) / 180);
  /** A point on the web: angle a (radians) and distance r from the corner. @param {number} a @param {number} r @returns {number[]} x, y */
  const pt = (a, r) => [x + dx * Math.cos(a) * r, y + Math.sin(a) * r];
  for (const a of angles) { const [ex, ey] = pt(a, size); g.appendChild(line(`M${x} ${y} L${ex} ${ey}`, 2.5, { stroke: '#f4f4ee', opacity: 0.85 })); }
  for (const f of [0.35, 0.62, 0.9]) {
    let d = '';
    angles.forEach((a, i) => {
      const [px, py] = pt(a, size * f);
      if (!i) { d = `M${px} ${py}`; return; }
      const [qx, qy] = pt((a + angles[i - 1]) / 2, size * f * 0.82);
      d += ` Q${qx} ${qy} ${px} ${py}`;
    });
    g.appendChild(line(d, 2.5, { stroke: '#f4f4ee', opacity: 0.85 }));
  }
}

/**
 * The closed launderette's things (room kind 'launderette'): dusty front-loading washing machines along the wall
 * (one with a forgotten sock behind the glass), a cracked sink with a dripping tap, cobwebs and lost socks.
 * @param {SVGElement} g the room group @param {object} r room options @param {number} w width @param {number} F floor line
 * @returns {void}
 */
function laundry(g, r, w, F) {
  const k = Math.min(F / 600, w / 1000);
  if (r.cobwebs) { cobweb(g, 0, 0, 150 * k, 1); cobweb(g, w, 0, 170 * k, -1); }
  if (r.sink) {
    // A wall sink: a pipe down to the floor, a chipped basin with a zigzag crack, a tap with a drop on it.
    const sx = w * (r.sinkX ?? 0.3);
    const sy = F - 190 * k;
    g.appendChild(el('rect', { x: sx - 12 * k, y: sy + 40 * k, width: 24 * k, height: F - sy - 30 * k, fill: '#a4adb6', ...ink(4) }));
    g.appendChild(el('path', { d: `M${sx - 18 * k} ${sy - 120 * k} L${sx - 18 * k} ${sy - 84 * k} L${sx + 30 * k} ${sy - 84 * k} L${sx + 30 * k} ${sy - 64 * k}`, fill: 'none', ...ink(14 * k + 6) }));
    g.appendChild(el('path', { d: `M${sx - 18 * k} ${sy - 120 * k} L${sx - 18 * k} ${sy - 84 * k} L${sx + 30 * k} ${sy - 84 * k} L${sx + 30 * k} ${sy - 64 * k}`, fill: 'none', stroke: '#c9d3de', 'stroke-width': 14 * k, 'stroke-linejoin': 'round' }));
    g.appendChild(el('circle', { cx: sx - 18 * k, cy: sy - 126 * k, r: 16 * k, fill: '#c9d3de', ...ink(4) }));
    g.appendChild(el('path', { d: `M${sx - 120 * k} ${sy - 40 * k} L${sx + 120 * k} ${sy - 40 * k} L${sx + 96 * k} ${sy + 50 * k} L${sx - 96 * k} ${sy + 50 * k}Z`, fill: '#ece9df', ...ink(5) }));
    g.appendChild(el('rect', { x: sx - 128 * k, y: sy - 52 * k, width: 256 * k, height: 20 * k, rx: 8 * k, fill: '#f6f3ea', ...ink(4.5) }));
    g.appendChild(line(`M${sx + 40 * k} ${sy - 32 * k} l-14 ${22 * k} l18 ${14 * k} l-16 ${26 * k} l12 ${14 * k}`, 4));
    g.appendChild(el('path', { d: `M${sx - 96 * k} ${sy - 52 * k} l14 ${-0.1 * k} l-6 ${12 * k}Z`, fill: '#9aa287' })); // a chip
    g.appendChild(el('ellipse', { cx: sx - 50 * k, cy: sy + 10 * k, rx: 34 * k, ry: 12 * k, fill: '#786834', opacity: 0.25 }));
    const dy = sy - 52 * k;
    g.appendChild(el('path', { d: `M${sx + 30 * k} ${dy - 14 * k} C${sx + 40 * k} ${dy} ${sx + 40 * k} ${dy + 10 * k} ${sx + 30 * k} ${dy + 10 * k} C${sx + 20 * k} ${dy + 10 * k} ${sx + 20 * k} ${dy} ${sx + 30 * k} ${dy - 14 * k}Z`, fill: '#9ad8ff', ...ink(3) }));
  }
  const spots = r.washers === true ? [0.6, 0.73, 0.86] : Array.isArray(r.washers) ? r.washers : [];
  spots.forEach((fx, i) => {
    // A front-loading washing machine, grey with dust, standing against the wall.
    const mw = 190 * k;
    const mh = 230 * k;
    const x = w * fx - mw / 2;
    const y = F + 26 * k - mh;
    g.appendChild(el('rect', { x, y, width: mw, height: mh, rx: 14 * k, fill: '#dcdad0', ...ink(5) }));
    g.appendChild(el('rect', { x: x + 4 * k, y: y + 4 * k, width: mw - 8 * k, height: 44 * k, rx: 10 * k, fill: '#c9c6b8' }));
    g.appendChild(line(`M${x} ${y + 48 * k} L${x + mw} ${y + 48 * k}`, 4));
    g.appendChild(el('circle', { cx: x + mw * 0.8, cy: y + 26 * k, r: 12 * k, fill: '#a4adb6', ...ink(3.5) }));
    for (const bx of [0.18, 0.32]) g.appendChild(el('rect', { x: x + mw * bx, y: y + 20 * k, width: 18 * k, height: 12 * k, rx: 4 * k, fill: '#8a96a6', ...ink(3) }));
    const cx = x + mw / 2;
    const cy = y + 48 * k + (mh - 48 * k) / 2;
    g.appendChild(el('circle', { cx, cy, r: 66 * k, fill: '#b9bcb2', ...ink(5) }));
    g.appendChild(el('circle', { cx, cy, r: 50 * k, fill: '#5b6b70', ...ink(4) }));
    if (i === 1) {
      // A forgotten pink sock behind the glass.
      g.appendChild(el('path', { d: `M${cx - 20 * k} ${cy - 18 * k} l${16 * k} ${26 * k} q${8 * k} ${14 * k} ${26 * k} ${6 * k} l${4 * k} ${-10 * k} l${-22 * k} ${-6 * k} l${-12 * k} ${-24 * k}Z`, fill: '#f27eb2', ...ink(3) }));
    }
    g.appendChild(line(`M${cx - 30 * k} ${cy - 26 * k} Q${cx - 14 * k} ${cy - 40 * k} ${cx + 6 * k} ${cy - 40 * k}`, 6 * k, { stroke: '#ffffff', opacity: 0.6 }));
    // Dust: pale grey patches on the lid and the front.
    for (const [ex, ey, rr] of [[0.3, 0.1, 30], [0.75, 0.86, 26], [0.15, 0.6, 18]]) g.appendChild(el('ellipse', { cx: x + mw * ex, cy: y + mh * ey, rx: rr * k, ry: rr * k * 0.5, fill: '#9c9a8c', opacity: 0.35 }));
    if (r.cobwebs && i === spots.length - 1) cobweb(g, x + mw - 6 * k, y + 52 * k, 60 * k, -1);
  });
  if (r.socks && spots.length) {
    // Lost socks on the floor in front of the machines (every launderette has them).
    for (const [fx, col, rot] of [[spots[0] - 0.06, '#6a7be6', -20], [spots[spots.length - 1] + 0.05, '#ffd25a', 30]]) {
      const sx = w * fx;
      const sy = F + 60 * k;
      g.appendChild(el('path', { d: `M${sx} ${sy} l${18 * k} ${-30 * k} l${16 * k} ${8 * k} l${-10 * k} ${20 * k} q${30 * k} ${4 * k} ${26 * k} ${18 * k} q${-6 * k} ${12 * k} ${-36 * k} ${2 * k}Z`, fill: col, ...ink(3.5), transform: `rotate(${rot} ${sx} ${sy})` }));
    }
  }
}

/**
 * A room filling the panel: wall with soft stripes, floor boards, a window with curtains (sky, cloud or moon and
 * stars), and optionally a picture, a plant and a floor lamp.
 * @param {object} l layer: kind (a key of ROOMS), w and h (the panel size), floorY (height of the floor line),
 *   windowX (0..1 across), and any ROOMS field to switch an item on or off; plantSill (true or a scale) draws the
 *   sad little plant from the plan strip on the window sill instead of the big floor plant (it keeps plantEyes and
 *   plantScarf, and droops when its eyes are sad); plantShelf (true or a scale) puts that little plant, drooping, on
 *   a small crate at plantX instead (comic-art.js studioKit, SPEC D32j); plantHighlight draws yellow highlighter
 *   stripes across whichever plant is there
 * @returns {{node: SVGElement}} the room
 */
function room(l) {
  const r = { ...(ROOMS[l.kind] ?? ROOMS.living), ...l };
  const w = l.w ?? 1600;
  const h = l.h ?? 900;
  const F = l.floorY ?? h * 0.74;
  const g = el('g');
  const wid = `cw${gid += 1}`;
  const sid = `cs${gid += 1}`;
  g.appendChild(el('defs', {}, [
    el('linearGradient', { id: wid, x1: 0, y1: 0, x2: 0, y2: 1 }, [el('stop', { offset: 0, 'stop-color': r.wall[0] }), el('stop', { offset: 1, 'stop-color': r.wall[1] })]),
    el('linearGradient', { id: sid, x1: 0, y1: 0, x2: 0, y2: 1 }, [el('stop', { offset: 0, 'stop-color': r.sky[0] }), el('stop', { offset: 1, 'stop-color': r.sky[1] })]),
  ]));
  g.appendChild(el('rect', { width: w, height: F, fill: `url(#${wid})` }));
  for (let x = 40; x < w; x += 90) g.appendChild(el('rect', { x, y: 0, width: 36, height: F, fill: r.stripes, opacity: 0.55 }));
  g.appendChild(el('rect', { y: F, width: w, height: h - F, fill: r.floor }));
  for (const f of [0.18, 0.42, 0.72]) g.appendChild(el('path', { d: `M0 ${F + (h - F) * f} L${w} ${F + (h - F) * f}`, stroke: r.boards, 'stroke-width': 4 }));
  for (let x = 120; x < w; x += 260) g.appendChild(el('path', { d: `M${x} ${F + (h - F) * 0.18} l0 ${(h - F) * 0.24} M${x + 130} ${F + (h - F) * 0.42} l0 ${(h - F) * 0.3}`, stroke: r.boards, 'stroke-width': 4 }));
  g.appendChild(el('rect', { y: F - 22, width: w, height: 24, fill: r.skirting, ...ink(4) }));
  if (r.shabby) shabbyWall(g, r, w, F);
  // The window.
  const ww = Math.min(w * 0.26, 360);
  const wh = F * 0.5;
  const wx = w * (l.windowX ?? 0.7) - ww / 2;
  const wy = F * 0.14;
  g.appendChild(el('rect', { x: wx, y: wy, width: ww, height: wh, fill: `url(#${sid})`, ...ink(7) }));
  if (r.cloud) for (const [cx, cy, rr] of [[0.3, 0.35, 34], [0.45, 0.3, 44], [0.6, 0.36, 32]]) g.appendChild(el('circle', { cx: wx + ww * cx, cy: wy + wh * cy, r: rr * ww / 360, fill: '#fff' }));
  if (r.moon) {
    g.appendChild(el('circle', { cx: wx + ww * 0.66, cy: wy + wh * 0.3, r: ww * 0.13, fill: '#fff3c4', ...ink(4) }));
    g.appendChild(el('circle', { cx: wx + ww * 0.62, cy: wy + wh * 0.27, r: ww * 0.025, fill: '#e8d9a0' }));
  }
  if (r.stars) for (const [sx, sy] of [[0.2, 0.2], [0.35, 0.55], [0.82, 0.62], [0.5, 0.15], [0.15, 0.75]]) {
    const cx = wx + ww * sx;
    const cy = wy + wh * sy;
    g.appendChild(el('path', { d: `M${cx} ${cy - 9} L${cx + 2.5} ${cy - 2.5} L${cx + 9} ${cy} L${cx + 2.5} ${cy + 2.5} L${cx} ${cy + 9} L${cx - 2.5} ${cy + 2.5} L${cx - 9} ${cy} L${cx - 2.5} ${cy - 2.5}Z`, fill: '#fff6c8' }));
  }
  if (l.outside) {
    // Someone or something seen through the window (art layers in panel units), cut to the glass.
    const oid = `co${gid += 1}`;
    g.appendChild(el('defs', {}, [el('clipPath', { id: oid }, [el('rect', { x: wx, y: wy, width: ww, height: wh })])]));
    g.appendChild(el('g', { 'clip-path': `url(#${oid})` }, l.outside.map((o) => ARTS[o.art](o).node)));
  }
  g.appendChild(el('path', { d: `M${wx + ww / 2} ${wy} l0 ${wh} M${wx} ${wy + wh * 0.5} l${ww} 0`, stroke: '#fff8ee', 'stroke-width': 12 }));
  g.appendChild(el('rect', { x: wx, y: wy, width: ww, height: wh, fill: 'none', stroke: '#fff8ee', 'stroke-width': 14 }));
  g.appendChild(el('rect', { x: wx - 7, y: wy - 7, width: ww + 14, height: wh + 14, fill: 'none', ...ink(5) }));
  g.appendChild(el('rect', { x: wx - 24, y: wy + wh, width: ww + 48, height: 20, rx: 6, fill: '#fff8ee', ...ink(5) }));
  // Curtains: a wavy drape on each side, gathered with a tie.
  for (const s of [-1, 1]) {
    const x0 = s < 0 ? wx - 40 : wx + ww + 40;
    const x1 = s < 0 ? wx + ww * 0.16 : wx + ww * 0.84;
    const d = `M${x0} ${wy - 30} L${x1} ${wy - 30} Q${x1 - s * 30} ${wy + wh * 0.45} ${x1 - s * 6} ${wy + wh * 0.62} Q${x1 + s * 10} ${wy + wh * 0.9} ${x1 + s * 4} ${wy + wh + 50} L${x0} ${wy + wh + 50}Z`;
    g.appendChild(el('path', { d, fill: r.curtains, ...ink(5) }));
    g.appendChild(line(`M${(x0 + x1) / 2} ${wy - 20} q${s * 10} ${wh * 0.4} ${-s * 4} ${wh + 60}`, 3.5, { opacity: 0.35 }));
    g.appendChild(el('rect', { x: Math.min(x0, x1 - s * 6) + 4, y: wy + wh * 0.6, width: Math.abs(x1 - s * 6 - x0) - 8, height: 16, rx: 8, fill: tint(r.curtains, 0.35), ...ink(4) }));
  }
  g.appendChild(el('rect', { x: wx - 70, y: wy - 44, width: ww + 140, height: 14, rx: 7, fill: '#8a6a3a', ...ink(4) }));
  if (r.picture) {
    const px = w * (l.pictureX ?? 0.24) - 100;
    const py = F * 0.2;
    g.appendChild(el('rect', { x: px, y: py, width: 200, height: 150, fill: '#cfeefa', ...ink(6) }));
    g.appendChild(el('path', { d: `M${px} ${py + 150} L${px + 70} ${py + 70} L${px + 120} ${py + 120} L${px + 150} ${py + 90} L${px + 200} ${py + 150}Z`, fill: '#59b85f', ...ink(4) }));
    g.appendChild(el('circle', { cx: px + 150, cy: py + 40, r: 20, fill: '#ffd25a', ...ink(4) }));
    g.appendChild(el('rect', { x: px - 10, y: py - 10, width: 220, height: 170, fill: 'none', stroke: '#b07a4a', 'stroke-width': 12 }));
    g.appendChild(el('rect', { x: px - 16, y: py - 16, width: 232, height: 182, fill: 'none', ...ink(4) }));
  }
  if (r.plant && (l.plantSill || l.plantShelf)) {
    // R8: the small plant she adopted in the plan strip (not yet the shop's living plant): on the window sill where she
    // put it (strip 5), or later on a small crate at plantX (SPEC D32j).
    const want = l.plantSill || l.plantShelf;
    const s = typeof want === 'number' ? want : 0.5 * F / 600; // B91, B92: was 0.32, too small to see on a phone
    let x = wx + ww * 0.74;
    let y = wy + wh + 2;
    if (!l.plantSill) {
      // On a small wooden crate on the floor, where the big plant's pot stands: below the speech bubbles, and in the
      // same spot the strips aim their jokes and eyes at.
      x = w * (l.plantX ?? 0.06);
      const k = F / 600;
      y = F - 14 * k;
      g.appendChild(el('rect', { x: x - 62 * k, y, width: 124 * k, height: 36 * k, rx: 4 * k, fill: '#a07a48', ...ink(4) }));
      g.appendChild(line(`M${x - 52 * k} ${y + 18 * k} L${x + 52 * k} ${y + 18 * k}`, 3, { opacity: 0.5 }));
    }
    g.appendChild(plant({ x, y: y + 2, scale: s, eyes: l.plantEyes, scarf: l.plantScarf || undefined, droop: l.plantSill ? l.plantEyes === 'sad' : true }).node);
    // She highlighted everything (strip "books"): yellow stripes across the leaves.
    if (l.plantHighlight) for (const [dy, i] of [[160, 0], [205, 1], [250, 2]]) g.appendChild(el('path', { d: `M${x - (100 - i * 14) * s} ${y - dy * s} L${x + (100 - i * 14) * s} ${y - dy * s - 20 * s}`, stroke: '#e9f542', 'stroke-width': 22 * s, opacity: 0.75, 'stroke-linecap': 'round' }));
  } else if (r.plant) {
    const px = w * (l.plantX ?? 0.06);
    for (const [a, len] of [[-40, 150], [-15, 190], [10, 170], [35, 140], [-60, 110], [55, 105]]) {
      g.appendChild(el('ellipse', { cx: 0, cy: -len / 2, rx: 24, ry: len / 2, fill: a % 20 ? '#3fae8c' : '#59b85f', ...ink(4), transform: `translate(${px} ${F - 80}) rotate(${a})` }));
    }
    g.appendChild(el('path', { d: `M${px - 55} ${F - 90} L${px + 55} ${F - 90} L${px + 42} ${F + 20} L${px - 42} ${F + 20}Z`, fill: '#e8735a', ...ink(5) }));
    if (l.plantEyes) {
      // Running gag: the plant watches. Eyes on the pot: 'sad' (droopy lids), 'wide' (amazed) or 'smug' (half shut, smirk).
      const k = l.plantEyes;
      for (const s of [-1, 1]) {
        g.appendChild(el('ellipse', { cx: px + s * 18, cy: F - 46, rx: 13, ry: k === 'wide' ? 18 : 14, fill: '#ffffff', ...ink(3.5) }));
        g.appendChild(el('circle', { cx: px + s * 18, cy: F - (k === 'sad' ? 40 : 44), r: k === 'wide' ? 5 : 6.5, fill: INK }));
        if (k !== 'wide') g.appendChild(el('path', { d: `M${px + s * 18 - 15} ${F - 50 + (k === 'sad' ? s * -4 : 0)} L${px + s * 18 + 15} ${F - 50 + (k === 'sad' ? s * 4 : 0)} L${px + s * 18 + 15} ${F - 62} L${px + s * 18 - 15} ${F - 62}Z`, fill: '#e8735a', ...ink(3.5) }));
      }
      if (k === 'smug') g.appendChild(line(`M${px - 14} ${F - 14} Q${px + 4} ${F - 4} ${px + 18} ${F - 20}`, 4));
      if (k === 'wide') g.appendChild(el('ellipse', { cx: px, cy: F - 12, rx: 8, ry: 10, fill: INK }));
    }
    if (l.plantScarf) {
      // Running gag: Greta has knitted the plant a scarf (striped, with a dangling end).
      g.appendChild(el('path', { d: `M${px - 30} ${F - 150} Q${px} ${F - 130} ${px + 34} ${F - 152} L${px + 36} ${F - 120} Q${px} ${F - 98} ${px - 32} ${F - 118}Z`, fill: l.plantScarf, ...ink(4) }));
      g.appendChild(el('path', { d: `M${px + 18} ${F - 120} L${px + 46} ${F - 50} L${px + 70} ${F - 60} L${px + 38} ${F - 126}Z`, fill: l.plantScarf, ...ink(4) }));
      g.appendChild(line(`M${px - 10} ${F - 140} l0 30 M${px + 12} ${F - 142} l0 30 M${px + 36} ${F - 90} l20 -8`, 5, { stroke: '#ffffff', opacity: 0.8 }));
    }
    // She highlighted everything (strip "books"): yellow stripes across the leaves.
    if (l.plantHighlight) for (const [dy, i] of [[-120, 0], [-170, 1], [-220, 2]]) g.appendChild(el('path', { d: `M${px - 70 + i * 10} ${F + dy} L${px + 70 - i * 10} ${F + dy - 14}`, stroke: '#e9f542', 'stroke-width': 16, opacity: 0.75 }));
  }
  if (r.board) {
    // A cork notice board with pinned papers and doodles (no words: words go in bubbles).
    const bx = w * (l.boardX ?? 0.26) - 130;
    const by = F * 0.18;
    g.appendChild(el('rect', { x: bx, y: by, width: 260, height: 180, rx: 6, fill: '#d9a86c', ...ink(6) }));
    for (const [x, y, c, rot] of [[20, 18, '#fff8ee', -4], [110, 26, '#ffe27a', 5], [180, 90, '#bfe4fb', -6], [36, 100, '#ffd8e6', 3]]) {
      g.appendChild(el('rect', { x: bx + x, y: by + y, width: 64, height: 62, fill: c, ...ink(3), transform: `rotate(${rot} ${bx + x + 32} ${by + y + 31})` }));
      g.appendChild(el('circle', { cx: bx + x + 32, cy: by + y + 6, r: 6, fill: '#e8505b', ...ink(2) }));
    }
    g.appendChild(el('path', { d: `M${bx + 68} ${by + 126} c-10 -14 -30 0 0 18 c30 -18 10 -32 0 -18Z`, fill: '#e8505b' }));
    g.appendChild(el('circle', { cx: bx + 142, cy: by + 58, r: 12, fill: '#f0a43a' }));
  }
  if (r.shabby) shabbyFront(g, r, w, F);
  if (r.washers || r.sink || r.cobwebs || r.socks) laundry(g, r, w, F);
  if (r.lamp) {
    const lx = w * (l.lampX ?? 0.94);
    const gl = `cl${gid += 1}`;
    g.appendChild(el('defs', {}, [el('radialGradient', { id: gl }, [el('stop', { offset: 0, 'stop-color': '#fff3a8', 'stop-opacity': 0.7 }), el('stop', { offset: 1, 'stop-color': '#fff3a8', 'stop-opacity': 0 })])]));
    g.appendChild(el('circle', { cx: lx, cy: F * 0.42, r: 190, fill: `url(#${gl})` }));
    g.appendChild(el('path', { d: `M${lx} ${F * 0.45} L${lx} ${F + 30}`, stroke: INK, 'stroke-width': 10 }));
    g.appendChild(el('ellipse', { cx: lx, cy: F + 34, rx: 50, ry: 12, fill: '#6e4528', ...ink(4) }));
    g.appendChild(el('path', { d: `M${lx - 46} ${F * 0.28} L${lx + 46} ${F * 0.28} L${lx + 78} ${F * 0.46} L${lx - 78} ${F * 0.46}Z`, fill: '#ffd25a', ...ink(5) }));
  }
  return { node: g };
}

/**
 * A comic "big moment" background: bright rays from a point, filling the panel.
 * @param {object} l layer: x, y (centre), w, h (panel size), n rays (default 18), colors [two colours]
 * @returns {{node: SVGElement}} the rays
 */
function rays(l) {
  const w = l.w ?? 1000;
  const h = l.h ?? 1000;
  const n = l.n ?? 18;
  const [c1, c2] = l.colors ?? ['#ffe9a8', '#ffd25a'];
  const cx = l.x ?? w / 2;
  const cy = l.y ?? h / 2;
  const R = Math.hypot(w, h);
  const g = el('g', {}, [el('rect', { width: w, height: h, fill: c1 })]);
  for (let i = 0; i < n; i += 1) {
    const a0 = (i / n) * Math.PI * 2;
    const a1 = a0 + Math.PI / n;
    g.appendChild(el('path', { d: `M${cx} ${cy} L${cx + Math.cos(a0) * R} ${cy + Math.sin(a0) * R} L${cx + Math.cos(a1) * R} ${cy + Math.sin(a1) * R}Z`, fill: c2 }));
  }
  return { node: g };
}

/**
 * A folding chair seen from the front (metal frame, coloured seat and back). The seat is 125 units above the floor
 * at scale 1, as figures sit; put it before a sitter (same x, y, scale) so the sitter covers the seat.
 * @param {object} l layer: x, y (floor, middle), scale, color (seat and back)
 * @returns {{node: SVGElement}} the chair
 */
function chair(l) {
  const s = l.scale ?? 1;
  const col = l.color ?? '#f0a43a';
  const metal = '#8fa3b8';
  const g = el('g');
  for (const sx of [-1, 1]) g.appendChild(el('rect', { x: sx * 96 - 9, y: -440, width: 18, height: 440, rx: 8, fill: metal, ...ink(4) }));
  g.appendChild(el('rect', { x: -112, y: -440, width: 224, height: 110, rx: 22, fill: col, ...ink(5) }));
  g.appendChild(line('M-80 -404 Q0 -416 80 -404', 4, { stroke: '#ffffff', opacity: 0.5 }));
  g.appendChild(line('M-80 -110 L80 0 M80 -110 L-80 0', 14, { stroke: INK }));
  g.appendChild(line('M-80 -110 L80 0 M80 -110 L-80 0', 7, { stroke: metal }));
  g.appendChild(el('rect', { x: -118, y: -138, width: 236, height: 30, rx: 12, fill: col, ...ink(5) }));
  return { node: el('g', { transform: `translate(${l.x ?? 0} ${l.y ?? 0}) scale(${(l.flip ? -1 : 1) * s} ${s})` }, [g]) };
}

/**
 * A big community-hall coffee urn on a little table, with a tap, a red light and a stack of paper cups.
 * @param {object} l layer: x, y (floor, middle of the table), scale, steam (default true), table (default true)
 * @returns {{node: SVGElement}} the urn
 */
function urn(l) {
  const s = l.scale ?? 1;
  const g = el('g');
  const top = l.table === false ? 0 : -300;
  if (l.table !== false) {
    for (const sx of [-1, 1]) g.appendChild(el('rect', { x: sx * 150 - 10, y: top, width: 20, height: -top, fill: '#8a6a3a', ...ink(4) }));
    g.appendChild(el('rect', { x: -190, y: top - 24, width: 380, height: 30, rx: 8, fill: '#c98f6b', ...ink(5) }));
    g.appendChild(el('path', { d: `M-180 ${top + 6} L180 ${top + 6} L170 ${top + 60} L-170 ${top + 60}Z`, fill: '#ffffff', ...ink(4) }));
    for (let x = -160; x < 170; x += 40) g.appendChild(el('rect', { x, y: top + 10, width: 20, height: 46, fill: '#e8505b', opacity: 0.35 }));
  }
  const b = top - 24;
  const steel = shading(g, '#c9d3de', 0.35, 0.3);
  g.appendChild(el('rect', { x: -100, y: b - 250, width: 140, height: 250, rx: 22, fill: steel, ...ink() }));
  g.appendChild(el('path', { d: `M-96 ${b - 246} Q-30 ${b - 300} 36 ${b - 246}Z`, fill: steel, ...ink(5) }));
  g.appendChild(el('circle', { cx: -30, cy: b - 286, r: 12, fill: INK }));
  for (const sx of [-1, 1]) g.appendChild(el('path', { d: `M${-30 + sx * 70} ${b - 190} q${sx * 34} 0 ${sx * 34} 40 q0 40 ${-sx * 34} 40`, fill: 'none', ...ink(8) }));
  g.appendChild(line(`M-80 ${b - 200} L-80 ${b - 60}`, 6, { stroke: '#ffffff', opacity: 0.6 }));
  g.appendChild(el('rect', { x: -48, y: b - 64, width: 36, height: 22, rx: 6, fill: '#2b2f3a', ...ink(4) }));
  g.appendChild(el('rect', { x: -38, y: b - 44, width: 16, height: 20, fill: '#2b2f3a', ...ink(4) }));
  g.appendChild(el('circle', { cx: 10, cy: b - 140, r: 10, fill: '#ff4d5a', ...ink(3) }));
  // Paper cups, stacked.
  for (let i = 0; i < 4; i += 1) g.appendChild(el('path', { d: `M90 ${b - i * 16} L140 ${b - i * 16} L136 ${b - 30 - i * 16} L94 ${b - 30 - i * 16}Z`, fill: i % 2 ? '#fff8ee' : '#f3e6d4', ...ink(4) }));
  if (l.steam !== false) for (const dx of [-50, -10]) g.appendChild(line(`M${dx} ${b - 300} q-16 -30 0 -60 q16 -30 0 -60`, 6, { stroke: '#ffffff', opacity: 0.8 }));
  return { node: el('g', { transform: `translate(${l.x ?? 0} ${l.y ?? 0}) scale(${s})` }, [g]) };
}

/**
 * A dented tin bucket catching the leak (strip 5 on): handle, a little water inside and ripple rings.
 * @param {object} l layer: x, y (floor, middle), scale, ripple (default true)
 * @returns {{node: SVGElement}} the bucket
 */
function bucket(l) {
  const s = l.scale ?? 1;
  const g = el('g');
  const tin = shading(g, '#5f7f86', 0.25, 0.25);
  g.appendChild(el('path', { d: 'M-96 -150 Q0 -260 96 -150', fill: 'none', ...ink(6) }));
  g.appendChild(el('path', { d: 'M-90 -150 L90 -150 L72 0 L-72 0Z', fill: tin, ...ink() }));
  g.appendChild(el('ellipse', { cx: 0, cy: -150, rx: 90, ry: 22, fill: '#3e555a', ...ink(5) }));
  g.appendChild(el('ellipse', { cx: 0, cy: -146, rx: 74, ry: 14, fill: '#9ad8ff' }));
  if (l.ripple !== false) for (const rr of [16, 34, 54]) g.appendChild(el('ellipse', { cx: 0, cy: -146, rx: rr, ry: rr * 0.22, fill: 'none', stroke: '#ffffff', 'stroke-width': 3, opacity: 0.85 }));
  for (const y of [-110, -40]) g.appendChild(line(`M${-86 + (y + 150) * 0.12} ${y} L${86 - (y + 150) * 0.12} ${y}`, 4, { opacity: 0.4 }));
  g.appendChild(el('path', { d: 'M30 -100 q14 10 4 26', fill: 'none', ...ink(4) })); // a dent
  return { node: el('g', { transform: `translate(${l.x ?? 0} ${l.y ?? 0}) scale(${s})` }, [g]) };
}

/**
 * A falling water drop (the leak) with motion lines above it; splash: true adds a small cartoon splash crown instead.
 * @param {object} l layer: x, y (middle of the drop), r size (default 20), splash
 * @returns {{node: SVGElement}} the drop
 */
function drip(l) {
  const r = l.r ?? 20;
  const g = el('g', { transform: `translate(${l.x ?? 0} ${l.y ?? 0})` });
  if (l.splash) {
    for (const a of [-60, -30, 0, 30, 60]) g.appendChild(el('path', { d: `M0 0 L${-r * 0.3} ${-r * 1.6} Q0 ${-r * 2} ${r * 0.3} ${-r * 1.6}Z`, fill: '#9ad8ff', ...ink(3), transform: `rotate(${a})` }));
    g.appendChild(el('ellipse', { cx: 0, cy: 0, rx: r * 1.4, ry: r * 0.4, fill: '#9ad8ff', ...ink(3) }));
    return { node: g };
  }
  g.appendChild(el('path', { d: `M0 ${-r * 1.4} C${r * 0.8} ${-r * 0.2} ${r} ${r * 0.9} 0 ${r * 0.9} C${-r} ${r * 0.9} ${-r * 0.8} ${-r * 0.2} 0 ${-r * 1.4}Z`, fill: '#9ad8ff', ...ink(4) }));
  g.appendChild(el('ellipse', { cx: -r * 0.3, cy: r * 0.1, rx: r * 0.18, ry: r * 0.3, fill: '#ffffff', opacity: 0.8 }));
  for (const dx of [-0.5, 0.5]) g.appendChild(line(`M${dx * r} ${-r * 2} l0 ${-r * 1.2}`, 3.5, { opacity: 0.5 }));
  return { node: g };
}

/**
 * The shiny new pipe joint (the leakFix upgrade, as in the game's pop/backdrop.js newJoint): a chrome collar with two
 * bolts, a white shine and a little four-point sparkle. Middle at (x, y); r = the pipe's half thickness.
 * @param {number} x middle @param {number} y middle @param {number} r pipe half thickness @param {boolean} [spark] add the sparkle (default true)
 * @returns {SVGElement} the joint
 */
function chromeJoint(x, y, r, spark = true) {
  const g = el('g');
  const id = `cj${gid += 1}`;
  g.appendChild(el('defs', {}, [el('linearGradient', { id, x1: 0, y1: 0, x2: 0, y2: 1 }, [
    el('stop', { offset: 0, 'stop-color': '#ffffff' }), el('stop', { offset: 0.45, 'stop-color': '#cfd8de' }), el('stop', { offset: 1, 'stop-color': '#8e9aa3' })])]));
  g.appendChild(el('rect', { x: x - r * 1.5, y: y - r * 1.5, width: r * 3, height: r * 3, rx: r * 0.5, fill: `url(#${id})`, ...ink(5) }));
  for (const dx of [-0.85, 0.85]) g.appendChild(el('circle', { cx: x + dx * r, cy: y + r * 0.2, r: r * 0.28, fill: '#7d8890', ...ink(2.5) }));
  g.appendChild(el('rect', { x: x - r * 1.1, y: y - r * 1.15, width: r * 2.2, height: r * 0.35, rx: r * 0.17, fill: '#ffffff', opacity: 0.85 }));
  if (spark) {
    const sx = x + r * 1.8;
    const sy = y + r * 1.5;
    const q = r * 0.9;
    g.appendChild(el('path', { d: `M${sx} ${sy - q} Q${sx + q * 0.15} ${sy - q * 0.15} ${sx + q} ${sy} Q${sx + q * 0.15} ${sy + q * 0.15} ${sx} ${sy + q} Q${sx - q * 0.15} ${sy + q * 0.15} ${sx - q} ${sy} Q${sx - q * 0.15} ${sy - q * 0.15} ${sx} ${sy - q}Z`, fill: '#ffffff', ...ink(2.5) }));
  }
  return g;
}

/**
 * The studio's old ceiling pipe (strip "mleak"; the same pipe the game's studio shows, pop/backdrop.js): a long grey
 * pipe across the panel with one joint. joint 'old' = a dull square collar with a brown drip stain under it and a drop
 * hanging from it; 'new' = the shiny chrome joint (leak fixed).
 * @param {object} l layer: y (pipe middle), w (length, default 1600), x (left end, default 0), jointX, r (half
 *   thickness, default 20), joint ('old' | 'new', default 'old'), drop (false = no hanging drop), stain (false = no stain)
 * @returns {{node: SVGElement}} the pipe
 */
function pipe(l) {
  const g = el('g');
  const r = l.r ?? 20;
  const x0 = l.x ?? 0;
  const w = l.w ?? 1600;
  const y = l.y ?? 60;
  const jx = l.jointX ?? x0 + w / 2;
  const old = (l.joint ?? 'old') === 'old';
  if (old && l.stain !== false) g.appendChild(el('ellipse', { cx: jx, cy: y + r * 4, rx: r * 1.1, ry: r * 3, fill: '#786834', opacity: 0.35 }));
  g.appendChild(el('rect', { x: x0 - 10, y: y - r, width: w + 20, height: r * 2, fill: '#6f7468', ...ink(5) }));
  g.appendChild(el('rect', { x: x0, y: y - r * 0.8, width: w, height: r * 0.45, fill: '#ffffff', opacity: 0.25 }));
  for (const bx of [jx - w * 0.3, jx + w * 0.3]) {
    // Two wall brackets holding the pipe up.
    g.appendChild(el('rect', { x: bx - r * 0.5, y: y - r * 1.3, width: r, height: r * 2.6, rx: r * 0.3, fill: '#8d9389', ...ink(4) }));
  }
  if (old) {
    g.appendChild(el('rect', { x: jx - r * 1.4, y: y - r * 1.4, width: r * 2.8, height: r * 2.8, rx: r * 0.3, fill: '#8d9389', ...ink(5) }));
    g.appendChild(el('path', { d: `M${jx - r * 0.6} ${y - r * 1.2} q${r * 0.3} ${r} 0 ${r * 2.4}`, fill: 'none', stroke: '#9a6a3a', 'stroke-width': r * 0.4, opacity: 0.7, 'stroke-linecap': 'round' }));
    if (l.drop !== false) g.appendChild(el('path', { d: `M${jx} ${y + r * 1.4} C${jx + r * 0.7} ${y + r * 2.4} ${jx + r * 0.7} ${y + r * 3.2} ${jx} ${y + r * 3.2} C${jx - r * 0.7} ${y + r * 3.2} ${jx - r * 0.7} ${y + r * 2.4} ${jx} ${y + r * 1.4}Z`, fill: '#9ad8ff', ...ink(3.5) }));
  } else {
    g.appendChild(chromeJoint(jx, y, r));
  }
  return { node: g };
}

/**
 * A wooden stepladder seen from the front (strip "mleak" on): two rails narrowing to a top step, round rungs, rubber
 * feet and the back legs peeking out behind. bend (0..1) makes it bow under a heavy load: the rails curve outwards and
 * the rungs sag; creak: true adds strain marks and little cracks. A figure stands on the top step at y - h * scale.
 * @param {object} l layer: x, y (floor, middle), h (height, default 600), w (width at the floor, default 300), steps
 *   (rungs, default 4), bend (0..1), creak, wobble (motion marks at the feet: it rocks), scale
 * @returns {{node: SVGElement}} the ladder
 */
function ladder(l) {
  const s = l.scale ?? 1;
  const h = l.h ?? 600;
  const hw = (l.w ?? 300) / 2;
  const tw = hw * 0.7;
  const bend = l.bend ?? 0;
  const bow = bend * hw * 0.45;
  const sag = bend * 44;
  const wood = '#d39a5a';
  const g = el('g');
  /** Where a rail is at height t (0 = floor, 1 = top), as a curve from the foot to the top. @param {number} t @returns {number} x (right rail) */
  const railX = (t) => (1 - t) * (1 - t) * hw + 2 * (1 - t) * t * ((hw + tw) / 2 + bow) + t * t * tw;
  // The back legs, darker, splayed out behind.
  for (const sx of [-1, 1]) {
    const d = `M${sx * (hw + 34)} 0 Q${sx * ((hw + tw) / 2 + 30 + bow)} ${-h / 2} ${sx * (tw - 6)} ${-h + 16}`;
    g.appendChild(el('path', { d, fill: 'none', stroke: INK, 'stroke-width': 24, 'stroke-linecap': 'round' }));
    g.appendChild(el('path', { d, fill: 'none', stroke: tint(wood, -0.25), 'stroke-width': 13, 'stroke-linecap': 'round' }));
  }
  const n = l.steps ?? 4;
  for (let i = 1; i <= n; i += 1) {
    const t = i / (n + 1);
    const x = railX(t);
    const y = -h * t;
    const d = `M${-x} ${y} Q0 ${y + sag * 2} ${x} ${y}`;
    g.appendChild(el('path', { d, fill: 'none', stroke: INK, 'stroke-width': 26, 'stroke-linecap': 'round' }));
    g.appendChild(el('path', { d, fill: 'none', stroke: wood, 'stroke-width': 15, 'stroke-linecap': 'round' }));
    g.appendChild(el('path', { d: `M${-x + 14} ${y - 3} Q0 ${y + sag * 2 - 3} ${x - 14} ${y - 3}`, fill: 'none', stroke: '#ffffff', 'stroke-width': 3, opacity: 0.4 }));
  }
  for (const sx of [-1, 1]) {
    const d = `M${sx * hw} 0 Q${sx * ((hw + tw) / 2 + bow)} ${-h / 2} ${sx * tw} ${-h}`;
    g.appendChild(el('path', { d, fill: 'none', stroke: INK, 'stroke-width': 32, 'stroke-linecap': 'round' }));
    g.appendChild(el('path', { d, fill: 'none', stroke: wood, 'stroke-width': 20, 'stroke-linecap': 'round' }));
    g.appendChild(el('path', { d: `M${sx * (hw - 4)} -30 Q${sx * ((hw + tw) / 2 + bow - 4)} ${-h / 2} ${sx * (tw - 4)} ${-h + 30}`, fill: 'none', stroke: tint(wood, -0.2), 'stroke-width': 4, opacity: 0.6 }));
    g.appendChild(el('rect', { x: sx * hw - 18, y: -12, width: 36, height: 16, rx: 6, fill: '#3a3f4a', ...ink(4) }));
  }
  // The top step: a wide board with a paint-tray notch and a knot in the wood.
  g.appendChild(el('rect', { x: -tw - 26, y: -h - 26, width: tw * 2 + 52, height: 34, rx: 8, fill: wood, ...ink(5) }));
  g.appendChild(el('ellipse', { cx: tw * 0.4, cy: -h - 9, rx: 9, ry: 5, fill: 'none', ...ink(3), opacity: 0.6 }));
  if (l.creak) {
    // Strain marks beside the bowed rails and two small cracks: it is not built for this much armor.
    const ym = -h * 0.5;
    const xm = railX(0.5);
    for (const sx of [-1, 1]) {
      g.appendChild(line(`M${sx * (xm + 40)} ${ym - 60} q${sx * 22} 30 0 60 M${sx * (xm + 70)} ${ym - 80} q${sx * 30} 40 0 80`, 5));
      g.appendChild(line(`M${sx * (xm - 6)} ${ym - 18} l${sx * 10} 10 l${-sx * 8} 8 l${sx * 10} 10`, 4));
    }
  }
  // Wobble: thick motion marks at the feet, halfway up and beside the top step (B97: the thin ones at the feet alone
  // were hidden behind people and captions).
  if (l.wobble) for (const sx of [-1, 1]) {
    const xm = railX(0.5);
    g.appendChild(line(`M${sx * (hw + 44)} -36 q${sx * 24} 20 ${sx * 6} 42 M${sx * (hw + 76)} -60 q${sx * 30} 28 ${sx * 8} 62`, 9));
    g.appendChild(line(`M${sx * (xm + 50)} ${-h * 0.5 - 50} q${sx * 30} 50 0 100 M${sx * (xm + 100)} ${-h * 0.5 - 80} q${sx * 40} 80 0 160`, 10));
    g.appendChild(line(`M${sx * (tw + 70)} ${-h - 60} q${sx * 30} 45 0 90 M${sx * (tw + 120)} ${-h - 90} q${sx * 40} 70 0 140`, 10));
  }
  return { node: el('g', { transform: `translate(${l.x ?? 0} ${l.y ?? 0}) scale(${(l.flip ? -1 : 1) * s} ${s})` }, [g]) };
}

/**
 * A box of rubber gloves on its own (the inspector's gift; "Gloves. Always gloves.").
 * @param {object} l layer: x, y (bottom middle), scale, rotate
 * @returns {{node: SVGElement}} the box
 */
function gloves(l) {
  return { node: el('g', { transform: `translate(${l.x ?? 0} ${l.y ?? 0}) rotate(${l.rotate ?? 0}) scale(${l.scale ?? 1})` }, [gloveBox()]) };
}

/**
 * The plant on its own (milestone "First plant" on): a lush leafy plant in a terracotta pot, for close-ups and for
 * carrying around. Same look as the room's plant, but it scales. Running gag: it watches with eyes on the pot.
 * @param {object} l layer: x, y (floor, middle of the pot), scale, eyes ('sad' | 'wide' | 'smug' | 'happy'),
 *   scarf (colour of Greta's knitted scarf), bud (true or a colour: a round pink bud on top), sweat (a worried drop),
 *   droop (true: a limp, pale plant with leaves flopping sideways)
 * @returns {{node: SVGElement}} the plant
 */
function plant(l) {
  const g = el('g');
  // A drooping plant (R7, droop: the sad plant in the dump): fewer, shorter leaves that flop sideways, a duller green.
  const leaves = l.droop ? [[-112, 110], [-86, 150], [-58, 125], [60, 125], [88, 150], [114, 105]] : [[-72, 130], [-48, 190], [-24, 240], [0, 270], [24, 235], [48, 185], [72, 125]];
  for (const [a, len] of leaves) {
    const lg = el('g', { transform: `translate(0 -130) rotate(${a})` });
    lg.appendChild(el('ellipse', { cx: 0, cy: -len / 2, rx: 28, ry: len / 2, fill: l.droop ? '#8aa86a' : Math.abs(a) % 48 ? '#3fae8c' : '#59b85f', ...ink(5) }));
    lg.appendChild(line(`M0 -8 L0 ${-len * 0.8}`, 3.5, { stroke: '#2e8a6c', opacity: 0.6 }));
    g.appendChild(lg);
  }
  if (l.bud) {
    // A round bud on a little stem (it looks a lot like something poppable).
    g.appendChild(line('M8 -200 Q30 -250 46 -282', 6, { stroke: '#2e8a6c' }));
    g.appendChild(el('circle', { cx: 50, cy: -298, r: 24, fill: l.bud === true ? '#ff9cb5' : l.bud, ...ink(5) }));
    g.appendChild(el('ellipse', { cx: 42, cy: -308, rx: 7, ry: 9, fill: '#ffffff', opacity: 0.75 }));
  }
  g.appendChild(el('path', { d: 'M-62 -130 L62 -130 L48 0 L-48 0Z', fill: '#e8735a', ...ink(6) }));
  g.appendChild(el('rect', { x: -74, y: -152, width: 148, height: 30, rx: 8, fill: '#f08b70', ...ink(6) }));
  if (l.scarf) {
    // Greta's knitted scarf around the stems, with a dangling end and white stripes.
    g.appendChild(el('path', { d: 'M-40 -190 Q0 -170 44 -192 L46 -156 Q0 -134 -42 -154Z', fill: l.scarf, ...ink(5) }));
    g.appendChild(el('path', { d: 'M22 -158 L58 -76 L86 -88 L48 -164Z', fill: l.scarf, ...ink(5) }));
    g.appendChild(line('M-14 -178 l0 34 M14 -180 l0 34 M46 -112 l24 -10', 6, { stroke: '#ffffff', opacity: 0.8 }));
  }
  const k = l.eyes;
  if (k) {
    // Eyes on the pot, like the room's plant: sad (droopy lids), wide (amazed), smug (half shut, smirk), happy (^ ^).
    for (const s of [-1, 1]) {
      if (k === 'happy') {
        g.appendChild(line(`M${s * 24 - 15} -72 Q${s * 24} -94 ${s * 24 + 15} -72`, 6));
        continue;
      }
      g.appendChild(el('ellipse', { cx: s * 24, cy: -78, rx: 17, ry: k === 'wide' ? 24 : 18, fill: '#ffffff', ...ink(4) }));
      g.appendChild(el('circle', { cx: s * 24, cy: k === 'sad' ? -70 : -76, r: k === 'wide' ? 6 : 8.5, fill: INK }));
      if (k !== 'wide') g.appendChild(el('path', { d: `M${s * 24 - 20} ${-84 + (k === 'sad' ? -s * 6 : 0)} L${s * 24 + 20} ${-84 + (k === 'sad' ? s * 6 : 0)} L${s * 24 + 20} -100 L${s * 24 - 20} -100Z`, fill: '#e8735a', ...ink(4) }));
    }
    if (k === 'smug') g.appendChild(line('M-18 -36 Q6 -22 24 -44', 5));
    if (k === 'happy') g.appendChild(line('M-20 -44 Q0 -22 20 -44', 5));
    if (k === 'sad') g.appendChild(line('M-14 -30 Q0 -42 14 -30', 5));
    if (k === 'wide') g.appendChild(el('ellipse', { cx: 0, cy: -34, rx: 10, ry: 13, fill: INK }));
  }
  if (l.sweat) g.appendChild(el('path', { d: 'M76 -150 C90 -128 92 -112 78 -110 C64 -112 66 -128 76 -150Z', fill: '#9ad8ff', ...ink(3.5) }));
  const s = l.scale ?? 1;
  return { node: el('g', { transform: `translate(${l.x ?? 0} ${l.y ?? 0}) scale(${l.flip ? -s : s} ${s})` }, [g]) };
}

/**
 * A small scruffy dog (milestone "First 3-star day" on): tan fur, a brown patch and floppy ears, a red collar.
 * Faces right; flip faces left. About 230 units tall at scale 1.
 * @param {object} l layer: x, y (floor, middle), scale, flip, stance ('stand' | 'run' | 'sleep' | 'peek' = head and
 *   paws only, to hide behind something), face ('happy' | 'bark' | 'scared' | 'sleep'), color (fur)
 * @returns {{node: SVGElement, mouth: number[]}} the dog
 */
function dog(l) {
  const fur = l.color ?? '#f2d29b';
  const patch = '#b5793f';
  const pose = l.stance ?? 'stand';
  const face = l.face ?? (pose === 'sleep' ? 'sleep' : 'happy');
  const g = el('g');
  // Draws a tail: a thick dark stroke with a thinner fur-coloured stroke on top.
  const tail = (d) => { g.appendChild(line(d, 24)); g.appendChild(line(d, 13, { stroke: fur })); };
  const lift = pose === 'run' ? -40 : 0;
  // Head position: resting on the paws when asleep, else up front.
  const [hx, hy] = pose === 'sleep' ? [96, -62] : [85, -165 + lift];
  if (pose === 'run') for (const y of [-70, -110, -150]) g.appendChild(line(`M-150 ${y} l-90 0`, 6, { opacity: 0.6 }));
  if (pose === 'sleep') {
    tail('M-90 -30 Q-110 10 -40 10');
    g.appendChild(el('ellipse', { cx: 0, cy: -48, rx: 100, ry: 46, fill: fur, ...ink(6) }));
    g.appendChild(el('ellipse', { cx: -24, cy: -64, rx: 34, ry: 20, fill: patch }));
    for (const z of [[150, -150, 16], [185, -195, 22]]) g.appendChild(line(`M${z[0]} ${z[1]} l${z[2]} 0 l${-z[2]} ${z[2]} l${z[2]} 0`, 4));
  } else if (pose !== 'peek') {
    if (pose === 'run') tail(`M-78 ${-104 + lift} L-150 ${-122 + lift}`);
    else if (face === 'scared') tail('M-78 -84 Q-100 -40 -60 -28');
    else tail('M-78 -110 Q-124 -150 -108 -205');
    // Legs: straight when standing, stretched front and back when running.
    for (const [x, a] of [[-55, 50], [-25, 40], [35, -40], [62, -50]]) {
      g.appendChild(el('rect', { x: x - 12, y: -82 + lift, width: 24, height: 82, rx: 12, fill: fur, ...ink(5), transform: pose === 'run' ? `rotate(${a} ${x} ${-82 + lift})` : '' }));
    }
    g.appendChild(el('ellipse', { cx: 0, cy: -95 + lift, rx: 86, ry: 50, fill: fur, ...ink(6) }));
    g.appendChild(el('ellipse', { cx: -22, cy: -112 + lift, rx: 34, ry: 22, fill: patch }));
  }
  // Far ear, head, snout, nose, near ear, collar.
  const earTurn = face === 'bark' || pose === 'run' ? 110 : face === 'scared' ? 8 : 28;
  g.appendChild(el('ellipse', { cx: 0, cy: 30, rx: 15, ry: 32, fill: tint(patch, -0.2), ...ink(4), transform: `translate(${hx + 18} ${hy - 42}) rotate(${-earTurn * 0.6})` }));
  g.appendChild(el('circle', { cx: hx, cy: hy, r: 50, fill: fur, ...ink(6) }));
  g.appendChild(el('ellipse', { cx: hx + 40, cy: hy + 15, rx: 32, ry: 24, fill: '#fbe6c2', ...ink(5) }));
  g.appendChild(el('ellipse', { cx: hx + 67, cy: hy + 7, rx: 12, ry: 9, fill: INK }));
  // Mouth and eyes by face.
  if (face === 'bark') {
    g.appendChild(el('ellipse', { cx: hx + 48, cy: hy + 36, rx: 18, ry: 15, fill: '#7a2b2b', ...ink(4) }));
    g.appendChild(el('ellipse', { cx: hx + 48, cy: hy + 44, rx: 9, ry: 6, fill: '#ff8fa3' }));
    for (const a of [-30, 0, 30]) g.appendChild(line(`M${hx + 90} ${hy + 20} l40 0`, 5, { transform: `rotate(${a} ${hx + 80} ${hy + 20})` }));
  } else if (face === 'happy') {
    g.appendChild(line(`M${hx + 26} ${hy + 30} Q${hx + 42} ${hy + 44} ${hx + 60} ${hy + 30}`, 4));
    g.appendChild(el('path', { d: `M${hx + 36} ${hy + 36} q8 22 18 0Z`, fill: '#ff8fa3', ...ink(3) }));
  } else if (face === 'scared') {
    g.appendChild(line(`M${hx + 28} ${hy + 34} q8 -6 14 0 q8 6 14 0`, 4));
    g.appendChild(el('path', { d: `M${hx - 46} ${hy - 40} C${hx - 34} ${hy - 20} ${hx - 34} ${hy - 6} ${hx - 46} ${hy - 6} C${hx - 58} ${hy - 6} ${hx - 58} ${hy - 20} ${hx - 46} ${hy - 40}Z`, fill: '#9ad8ff', ...ink(3) }));
  }
  if (face === 'sleep') g.appendChild(line(`M${hx + 2} ${hy - 12} Q${hx + 12} ${hy - 4} ${hx + 22} ${hy - 12}`, 5));
  else if (face === 'happy') g.appendChild(line(`M${hx + 2} ${hy - 12} Q${hx + 12} ${hy - 24} ${hx + 22} ${hy - 12}`, 5));
  else {
    const big = face === 'scared' || face === 'bark';
    g.appendChild(el('ellipse', { cx: hx + 12, cy: hy - 14, rx: big ? 14 : 9, ry: big ? 17 : 11, fill: '#ffffff', ...ink(4) }));
    g.appendChild(el('circle', { cx: hx + 15, cy: hy - 12, r: face === 'scared' ? 4 : 7, fill: INK }));
  }
  g.appendChild(el('ellipse', { cx: 0, cy: 34, rx: 18, ry: 38, fill: patch, ...ink(5), transform: `translate(${hx - 22} ${hy - 38}) rotate(${earTurn})` }));
  if (pose !== 'sleep') {
    g.appendChild(el('rect', { x: hx - 34, y: hy + 40, width: 60, height: 14, rx: 7, fill: '#e8505b', ...ink(4), transform: `rotate(-18 ${hx - 4} ${hy + 47})` }));
    g.appendChild(el('circle', { cx: hx + 2, cy: hy + 62, r: 9, fill: '#ffd25a', ...ink(3) }));
  }
  if (pose === 'peek' || pose === 'sleep') for (const dx of [-10, 50]) g.appendChild(el('ellipse', { cx: hx + dx, cy: hy + 52, rx: 20, ry: 12, fill: fur, ...ink(4) }));
  const s = l.scale ?? 1;
  const f = l.flip ? -1 : 1;
  const mouth = [(l.x ?? 0) + f * s * (hx + 50), (l.y ?? 0) + s * (hy + 30)];
  return { node: el('g', { transform: `translate(${l.x ?? 0} ${l.y ?? 0}) scale(${f * s} ${s})` }, [g]), mouth };
}

/**
 * Her hand-drawn business plan on a sheet of paper (strip "plan"): a stick-figure her with happy hands, one VERY big
 * pimple, and a price list (lines and coins). No words, so nothing to translate. Centre at 0,0, 300 x 380 units.
 * @param {boolean} [tape] two strips of tape on the top corners (stuck to a door)
 * @returns {SVGElement} the sheet
 */
function planSheet(tape = false) {
  const g = el('g');
  g.appendChild(el('path', { d: 'M-150 -190 L150 -190 L150 160 L120 190 L-150 190Z', fill: '#fffaf0', ...ink(5) }));
  g.appendChild(el('path', { d: 'M150 160 L120 160 L120 190Z', fill: '#e8dfc8', ...ink(3.5) }));
  for (let y = -150; y < 180; y += 34) g.appendChild(line(`M-140 ${y} L140 ${y}`, 2, { stroke: '#9fd3e8', opacity: 0.7 }));
  // The stick figure (her, with her bun), arms up, next to the big pimple with shine and wiggle lines.
  g.appendChild(el('circle', { cx: -92, cy: -128, r: 20, fill: 'none', ...ink(4) }));
  g.appendChild(el('circle', { cx: -84, cy: -150, r: 9, fill: '#6e4528', ...ink(3) }));
  g.appendChild(line('M-92 -108 L-92 -50 M-92 -50 L-110 -14 M-92 -50 L-74 -14 M-92 -92 L-120 -122 M-92 -92 L-64 -122', 4));
  g.appendChild(el('circle', { cx: 40, cy: -90, r: 74, fill: '#ff9cb5', ...ink(5) }));
  g.appendChild(el('circle', { cx: 40, cy: -108, r: 28, fill: '#fff8ee' }));
  g.appendChild(line('M-6 -168 l-12 -14 M40 -176 l0 -14 M86 -168 l12 -14 M126 -96 l16 0', 4, { stroke: '#e8505b' }));
  // Price list: three rows, a line and a coin each, then a heart.
  for (const [i, y] of [24, 70, 116].entries()) {
    g.appendChild(line(`M-120 ${y} L${10 - i * 22} ${y}`, 6, { opacity: 0.7 }));
    for (let c = 0; c <= i; c += 1) g.appendChild(el('circle', { cx: 60 + c * 28, cy: y - 2, r: 12, fill: '#ffd25a', ...ink(3) }));
  }
  g.appendChild(el('path', { d: 'M-100 166 c-10 -14 -30 0 0 18 c30 -18 10 -32 0 -18Z', fill: '#e8505b', ...ink(2.5) }));
  if (tape) for (const s of [-1, 1]) g.appendChild(el('rect', { x: s * 130 - 34, y: -204, width: 68, height: 26, fill: '#f6ecc0', opacity: 0.9, ...ink(2.5), transform: `rotate(${s * 30} ${s * 130} -191)` }));
  return g;
}

/**
 * The business plan as a prop (strip "plan"): the sheet on a table, held up, or taped to a door.
 * @param {object} l layer: x, y (middle), scale, rotate (degrees; 180 = upside down), tape
 * @returns {{node: SVGElement}} the sheet
 */
function plan(l) {
  return { node: el('g', { transform: `translate(${l.x ?? 0} ${l.y ?? 0}) rotate(${l.rotate ?? 0}) scale(${l.scale ?? 1})` }, [planSheet(l.tape)]) };
}

/**
 * A little shop seen from the street, filling the panel (strip "plan": the closed launderette that becomes her studio):
 * sky, a tired plaster front, a long blank sign board (only the ghost of the old washing-machine logo), a faded
 * striped awning, a dusty shop window and a wooden door, pavement in front.
 * @param {object} l layer: w, h (panel size), floorY (pavement line), doorX and windowX (0..1 across), sky [two
 *   colours], sun (true = a low evening sun), glow (warm light inside), plantEyes (the plant on the window sill:
 *   'sad' | 'wide' | 'smug' | 'happy'; leave out = no plant), plan (her business plan taped to the door)
 * @returns {{node: SVGElement}} the shop front
 */
function shopfront(l) {
  const w = l.w ?? 1600;
  const h = l.h ?? 900;
  const F = l.floorY ?? h * 0.86;
  const k = Math.min(F / 780, w / 1000);
  const g = el('g');
  const sid = `csk${gid += 1}`;
  const [s0, s1] = l.sky ?? ['#8fd3ff', '#dff4ff'];
  g.appendChild(el('defs', {}, [el('linearGradient', { id: sid, x1: 0, y1: 0, x2: 0, y2: 1 }, [el('stop', { offset: 0, 'stop-color': s0 }), el('stop', { offset: 1, 'stop-color': s1 })])]));
  g.appendChild(el('rect', { width: w, height: h, fill: `url(#${sid})` }));
  if (l.sun) {
    g.appendChild(el('circle', { cx: w * 0.9, cy: F * 0.1, r: 150 * k, fill: '#fff3c4', opacity: 0.45 }));
    g.appendChild(el('circle', { cx: w * 0.9, cy: F * 0.1, r: 80 * k, fill: '#ffe27a', ...ink(5) }));
  }
  // The building front, from the roof line down to the pavement; neighbours peek in at both sides.
  const top = F * 0.08;
  const x0 = w * 0.05;
  const x1 = w * 0.95;
  for (const [nx, nw] of [[-20, x0 + 24], [x1 - 4, w - x1 + 24]]) g.appendChild(el('rect', { x: nx, y: top + 30 * k, width: nw, height: F - top, fill: '#b98a6a', ...ink(5) }));
  g.appendChild(el('rect', { x: x0, y: top, width: x1 - x0, height: F - top, fill: '#e6d3b0', ...ink(6) }));
  g.appendChild(el('rect', { x: x0 - 14 * k, y: top - 20 * k, width: x1 - x0 + 28 * k, height: 28 * k, rx: 6 * k, fill: '#8a96a6', ...ink(4.5) })); // the gutter
  // Peeling plaster: a few bare brick patches and a crack.
  for (const [fx, fy] of [[0.12, 0.62], [0.88, 0.5], [0.5, 0.06]]) {
    const bx = w * fx;
    const by = F * fy + top;
    g.appendChild(el('path', { d: `M${bx - 50 * k} ${by} q${30 * k} ${-26 * k} ${70 * k} ${-10 * k} q${30 * k} ${20 * k} ${10 * k} ${44 * k} q${-50 * k} ${16 * k} ${-80 * k} ${-34 * k}Z`, fill: '#c98f6b', ...ink(3) }));
    g.appendChild(line(`M${bx - 30 * k} ${by + 4 * k} l${50 * k} 0 M${bx - 10 * k} ${by + 18 * k} l${44 * k} 0`, 3, { opacity: 0.5 }));
  }
  g.appendChild(line(`M${w * 0.42} ${top + 6} l${-12 * k} ${40 * k} l${16 * k} ${30 * k} l${-10 * k} ${36 * k}`, 3.5, { opacity: 0.6 }));
  // The blank sign board, with only the faded ghost of the old launderette logo (a machine door and bubbles).
  const sy0 = top + F * 0.05;
  const sh = F * 0.17;
  g.appendChild(el('rect', { x: w * 0.1, y: sy0, width: w * 0.8, height: sh, rx: 10 * k, fill: '#a9bcc4', ...ink(6) }));
  g.appendChild(el('rect', { x: w * 0.1 + 16 * k, y: sy0 + 14 * k, width: w * 0.8 - 32 * k, height: sh - 28 * k, rx: 6 * k, fill: 'none', stroke: '#c9d7dc', 'stroke-width': 6 * k }));
  const gx = w * 0.5;
  const gy = sy0 + sh / 2;
  g.appendChild(el('circle', { cx: gx, cy: gy, r: sh * 0.32, fill: 'none', stroke: '#93a8b0', 'stroke-width': 8 * k, opacity: 0.8 }));
  for (const [bx, by, br] of [[0.62, -0.1, 0.1], [0.7, 0.14, 0.07], [0.38, 0.08, 0.08]]) g.appendChild(el('circle', { cx: gx + (bx - 0.5) * sh * 3, cy: gy + by * sh, r: br * sh, fill: 'none', stroke: '#93a8b0', 'stroke-width': 6 * k, opacity: 0.8 }));
  // A faded striped awning with a scalloped edge.
  const ay = sy0 + sh + 10 * k;
  const ah = F * 0.08;
  const ax0 = w * 0.08;
  const ax1 = w * 0.92;
  g.appendChild(el('path', { d: `M${ax0} ${ay} L${ax1} ${ay} L${ax1 + 20 * k} ${ay + ah} L${ax0 - 20 * k} ${ay + ah}Z`, fill: '#f3e3e0', ...ink(5) }));
  const n = Math.round((ax1 - ax0) / (70 * k));
  const sw = (ax1 - ax0 + 40 * k) / n;
  for (let i = 0; i < n; i += 2) g.appendChild(el('path', { d: `M${ax0 + ((ax1 - ax0) / n) * i} ${ay} L${ax0 + ((ax1 - ax0) / n) * (i + 1)} ${ay} L${ax0 - 20 * k + sw * (i + 1)} ${ay + ah} L${ax0 - 20 * k + sw * i} ${ay + ah}Z`, fill: '#e8a2b4', opacity: 0.8 }));
  let sc = `M${ax0 - 20 * k} ${ay + ah}`;
  for (let i = 0; i < n; i += 1) sc += ` q${sw / 2} ${30 * k} ${sw} 0`;
  g.appendChild(el('path', { d: `${sc} Z`, fill: '#f3e3e0', ...ink(4.5) }));
  // The shop window: dusty glass, a sill inside, optionally the plant on it and warm light.
  const wy0 = ay + ah + 46 * k;
  const ww = Math.min(w * 0.42, 600 * k);
  const wx0 = w * (l.windowX ?? 0.66) - ww / 2;
  const wy1 = F - 70 * k;
  const gid2 = `cgl${gid += 1}`;
  const glass = l.glow ? ['#ffe9a8', '#ffc870'] : ['#5d7780', '#3f545b'];
  g.appendChild(el('defs', {}, [el('linearGradient', { id: gid2, x1: 0, y1: 0, x2: 0, y2: 1 }, [el('stop', { offset: 0, 'stop-color': glass[0] }), el('stop', { offset: 1, 'stop-color': glass[1] })])]));
  g.appendChild(el('rect', { x: wx0 - 16 * k, y: wy0 - 16 * k, width: ww + 32 * k, height: F - wy0 + 16 * k, fill: '#8a6a4a', ...ink(5) }));
  g.appendChild(el('rect', { x: wx0, y: wy0, width: ww, height: wy1 - wy0, fill: `url(#${gid2})`, ...ink(5) }));
  if (l.plantEyes) {
    const ps = ((wy1 - wy0) * 0.62) / 420;
    g.appendChild(plant({ x: wx0 + ww * 0.72, y: wy1 - 10 * k, scale: ps, eyes: l.plantEyes }).node);
  }
  g.appendChild(el('rect', { x: wx0 - 8 * k, y: wy1 - 12 * k, width: ww + 16 * k, height: 16 * k, rx: 5 * k, fill: '#c9a27a', ...ink(4) }));
  // Dust streaks and a shine across the glass.
  g.appendChild(el('path', { d: `M${wx0 + ww * 0.1} ${wy1 - 20 * k} L${wx0 + ww * 0.36} ${wy0 + 20 * k} L${wx0 + ww * 0.46} ${wy0 + 20 * k} L${wx0 + ww * 0.2} ${wy1 - 20 * k}Z`, fill: '#ffffff', opacity: 0.22 }));
  if (!l.glow) for (const [fx, fy, rr] of [[0.3, 0.7, 60], [0.8, 0.3, 50]]) g.appendChild(el('ellipse', { cx: wx0 + ww * fx, cy: wy0 + (wy1 - wy0) * fy, rx: rr * k, ry: rr * k * 0.6, fill: '#c9c6b8', opacity: 0.25 }));
  // The door: tired wood, a glass panel at the top, a brass knob, a step.
  const dw = 230 * k;
  const dx = w * (l.doorX ?? 0.28) - dw / 2;
  const dy = wy0 - 20 * k;
  g.appendChild(el('rect', { x: dx - 14 * k, y: dy - 14 * k, width: dw + 28 * k, height: F - dy + 14 * k, fill: '#7a6a50', ...ink(5) }));
  g.appendChild(el('rect', { x: dx, y: dy, width: dw, height: F - dy, fill: '#5f8f8a', ...ink(5) }));
  g.appendChild(el('rect', { x: dx + dw * 0.14, y: dy + 20 * k, width: dw * 0.72, height: (F - dy) * 0.36, rx: 6 * k, fill: l.glow ? '#ffe2a0' : '#4f646b', ...ink(4) }));
  g.appendChild(el('rect', { x: dx + dw * 0.16, y: dy + (F - dy) * 0.56, width: dw * 0.68, height: (F - dy) * 0.32, rx: 6 * k, fill: 'none', ...ink(3.5), opacity: 0.6 }));
  g.appendChild(el('circle', { cx: dx + dw * 0.84, cy: dy + (F - dy) * 0.52, r: 12 * k, fill: '#c9a24a', ...ink(3) }));
  if (l.plan) {
    const ps = Math.min(dw * 0.6 / 300, (F - dy) * 0.3 / 380);
    g.appendChild(el('g', { transform: `translate(${dx + dw / 2} ${dy + 20 * k + (F - dy) * 0.18}) rotate(-4) scale(${ps})` }, [planSheet(true)]));
  }
  g.appendChild(el('rect', { x: dx - 30 * k, y: F - 4 * k, width: dw + 60 * k, height: 24 * k, rx: 4 * k, fill: '#b5b4ba', ...ink(4) }));
  // The pavement: slabs and a kerb, and warm light spilling out when the lamp is on inside.
  g.appendChild(el('rect', { y: F + 20 * k, width: w, height: h - F, fill: '#a9a8ae' }));
  g.appendChild(line(`M0 ${F + 20 * k} L${w} ${F + 20 * k}`, 5));
  for (let x = 60 * k; x < w; x += 220 * k) g.appendChild(line(`M${x} ${F + 20 * k} l${-30 * k} ${h - F}`, 3, { stroke: '#8f8e94' }));
  if (l.glow) g.appendChild(el('path', { d: `M${wx0} ${F + 20 * k} L${wx0 + ww} ${F + 20 * k} L${wx0 + ww * 1.2} ${h} L${wx0 - ww * 0.2} ${h}Z`, fill: '#ffe496', opacity: 0.35 }));
  return { node: g };
}

/** Props, rooms and effects by name. */
export const PROPS = { sofa, bed, blanket, armor: armorStand, torch, burst, sparkles, room, rays, chair, urn, bucket, drip, gloves, plant, dog, plan, shopfront, pipe, ladder, signWord: signWordProp };

/** Every art piece a strip can name with `art:` (characters and props). Each takes the layer and returns { node, mouth? }. */
export const ARTS = {
  ...Object.fromEntries(Object.keys(CHARACTERS).map((who) => [who, (l) => drawCharacter(who, l)])),
  ...PROPS,
};

/**
 * The art kit with the heroine dressed in an outfit (T5.2 outfit tiers): every heroine layer that names no outfit of
 * its own wears this one; layers with their own outfit (pajamas, the apron strip) stay as they are.
 * @param {Record<string, Function>} arts an art kit (usually ARTS)
 * @param {string|null|undefined} outfit an OUTFITS name, or nothing = the kit unchanged
 * @returns {Record<string, Function>} the art kit to hand the comic player
 */
export function dressHeroine(arts, outfit) {
  if (!outfit || !(outfit in OUTFITS) || typeof arts.heroine !== 'function') return arts;
  const cap = !!OUTFITS[outfit].cap;
  /** Her layer in the outfit; with a cap outfit the cap comes off when she relaxes (capOnFor, T5.2b). @param {object} l @returns {object} */
  const dress = (l) => (cap ? { ...l, outfit, cap: capOnFor(l) } : { ...l, outfit });
  return { ...arts, heroine: (l, kit) => arts.heroine(l.outfit === undefined ? dress(l) : l, kit) };
}

/**
 * The art kit with her studio and hands as she has them now (SPEC D32e and D32j), for strips set in her studio after
 * the shop opens:
 * - gloves: true = every heroine layer that does not say otherwise wears her blue gloves (she owns them, after the scare);
 * - livingPlant: false = the studio's plant is the sad little plant (the one the game's tier-0 studio shows) on a
 *   small crate at its spot, and a plant on its own droops (she has not bought the living plant yet); true = the strips draw the
 *   big plant as they are.
 * @param {Record<string, Function>} arts an art kit (usually ARTS, maybe already dressed)
 * @param {{gloves?: boolean, livingPlant?: boolean}|null} [o] what she has (null or nothing = the kit unchanged)
 * @returns {Record<string, Function>} the art kit to hand the comic player
 */
export function studioKit(arts, o = null) {
  if (!o) return arts;
  const kit = { ...arts };
  if (o.gloves && typeof arts.heroine === 'function') kit.heroine = (l, k) => arts.heroine(l.gloves === undefined ? { ...l, gloves: true } : l, k);
  if (o.livingPlant === false) {
    // A studio room keeps its own plantSill if it sets one, else its plant sits on the shelf; a stand-alone plant droops.
    if (typeof arts.room === 'function') kit.room = (l, k) => arts.room(l.kind === 'studio' && l.plantSill === undefined && l.plantShelf === undefined ? { ...l, plantShelf: true } : l, k);
    if (typeof arts.plant === 'function') kit.plant = (l, k) => arts.plant(l.droop === undefined ? { ...l, droop: true } : l, k);
  }
  return kit;
}

/** Poses where she is relaxed, celebrating or seen close up: in a `dressed` strip her scrub cap is off there (T5.2b). */
export const CAP_OFF_POSES = ['cheer', 'lift', 'sit', 'bust', 'wave', 'shrug'];
/** Things in her hand that mean she is at work (then the cap stays on, whatever the pose). */
export const WORK_HOLDS = ['tweezers', 'gloves', 'magnifier'];

/**
 * Whether her scrub cap is on in a comic layer (T5.2b): a layer's own `cap` (true or false) wins; otherwise the cap is
 * on while she works (popping, standing at the chair, a work tool in hand) and off when she relaxes, celebrates or is
 * seen close up (CAP_OFF_POSES), so her bun shows.
 * @param {object} l the heroine layer
 * @returns {boolean} true = cap on
 */
export function capOnFor(l) {
  if (typeof l.cap === 'boolean') return l.cap;
  if (WORK_HOLDS.includes(l.hold)) return true;
  return !CAP_OFF_POSES.includes(l.pose ?? 'stand');
}

/**
 * Where a figure's head sits and how big it is, in the layer's units (T5.2b: the studio view floats her cap from
 * there). Matches drawCharacter: the head centre, its scale and its tilt.
 * @param {string} who a key of CHARACTERS
 * @param {object} l the layer (x, y, scale, flip, pose, expr)
 * @returns {{x: number, y: number, scale: number, tilt: number, flip: number}} head centre, head scale (1 = radius
 *   about 105), tilt in degrees and flip (-1 = mirrored)
 */
export function headSpot(who, l) {
  const c = { ...CHARACTERS[who], ...l };
  const pose = POSES[c.pose] ?? POSES.stand;
  const b = BUILDS[c.build] ?? BUILDS.slim;
  const s = (c.scale ?? 1) * (c.size ?? 1);
  const fx = c.flip ? -1 : 1;
  const tilt = (EXPRESSIONS[c.expr] ?? EXPRESSIONS.neutral).tilt ?? 0;
  return {
    x: c.x ?? 0,
    y: (c.y ?? 0) + s * (-515 + (pose.down ?? 0) + (pose.shift ?? 0)),
    scale: s * b.head,
    tilt,
    flip: fx,
  };
}

/**
 * Her scrub cap on its own, in head units (centre of the head at 0,0; T5.2b: the cap she takes off in the studio view).
 * @param {string} [col] the cap colour (default the scrubs cap)
 * @returns {SVGElement} the cap
 */
export function drawScrubCap(col = OUTFITS.scrubs.cap) {
  return scrubCap(col);
}

/**
 * Check one art layer's options against the tables (for tests and the comic test page).
 * @param {object} l the layer
 * @returns {string[]} problems in plain words (empty = fine)
 */
export function checkArtLayer(l) {
  const errs = [];
  if (!(l.art in CHARACTERS) && !(l.art in PROPS)) return [`unknown art "${l.art}"`];
  if (l.expr !== undefined && !(l.expr in EXPRESSIONS)) errs.push(`unknown expression "${l.expr}"`);
  if (l.pose !== undefined && !(l.pose in POSES)) errs.push(`unknown pose "${l.pose}"`);
  if (l.outfit !== undefined && !(l.outfit in OUTFITS)) errs.push(`unknown outfit "${l.outfit}"`);
  if (l.hold !== undefined && !HOLDS.includes(l.hold)) errs.push(`unknown thing to hold "${l.hold}"`);
  if (l.skin !== undefined && !(l.skin in SKIN)) errs.push(`unknown skin tone "${l.skin}"`);
  if (l.hairColor !== undefined && !(l.hairColor in HAIR)) errs.push(`unknown hair colour "${l.hairColor}"`);
  if (l.art === 'room' && !(l.kind in ROOMS)) errs.push(`unknown room "${l.kind}"`);
  if (l.art === 'room' && l.outside) for (const o of l.outside) errs.push(...checkArtLayer(o).map((e) => `outside the window: ${e}`));
  return errs;
}
