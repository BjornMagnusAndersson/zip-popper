// The comic art kit: the heroine, the husband and props, drawn as SVG in the game's cartoon style (soft shaded skin,
// rosy cheeks, the same skin tones, hair and shirt colours as the pop scene in face.js, plus a friendly ink outline
// so they sit well inside comic panels). No pictures, no real people, no blood: playful only.
//
// Everything is data, so a strip just names what it wants:
//   { id: 'her', art: 'heroine', x: 420, y: 880, scale: 1, expr: 'bliss', pose: 'pop', outfit: 'everyday', look: 1 }
//   { id: 'him', art: 'husband', x: 1100, y: 860, flip: true, expr: 'scheming', pose: 'sit', hold: 'remote' }
//   { art: 'sofa', x: 1100, y: 880, w: 760 }
// x, y = the point on the floor under the figure (for 'bust' and 'lie': the bottom middle of the chest).
// scale 1 = a standing figure about 620 units tall. flip mirrors left-right. look: -1 or 1 = eyes glance that way.
// Options per piece: see CHARACTERS, OUTFITS, EXPRESSIONS, POSES, HOLDS and PROPS below. Add a new character, outfit,
// expression or pose by adding a row to those tables. Every art function returns { node, mouth } (mouth in panel units).

export const INK = '#2a211d'; // the outline colour (face.js 'black')
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
};

/** Body shapes: half widths of shoulders and hips, belly bulge, head size. */
const BUILDS = {
  slim: { shoulder: 80, hip: 74, belly: 4, head: 1 },
  stocky: { shoulder: 100, hip: 94, belly: 26, head: 1.04 },
  round: { shoulder: 90, hip: 100, belly: 34, head: 1 },
  lanky: { shoulder: 84, hip: 68, belly: 0, head: 0.95 },
};

/** Clothes. top/pants/shoes colours; sleeve long or short; extras: apron, hood, dots, stripes, armor, vneck. */
export const OUTFITS = {
  everyday: { top: '#e66a8f', pants: '#4a5c9a', shoes: '#fff4ea', sleeve: 'long' },
  apron: { top: '#f0a43a', pants: '#4a5c9a', shoes: '#fff4ea', sleeve: 'long', apron: '#fff8ee' },
  scrubs: { top: '#3fb6a8', pants: '#3fb6a8', shoes: '#ffffff', sleeve: 'short', vneck: true },
  pajamas: { top: '#b9a6f0', pants: '#b9a6f0', shoes: '#f27eb2', sleeve: 'long', dots: '#ffffff' },
  hoodie: { top: '#6a7be6', pants: '#7d8597', shoes: '#e8e4dc', sleeve: 'long', hood: true },
  stripes: { top: '#9fd3c7', pants: '#9fd3c7', shoes: '#6a7be6', sleeve: 'long', stripes: '#ffffff' },
  armor: { top: '#c9d3de', pants: '#c9d3de', shoes: '#9aa6b4', sleeve: 'long', armor: true },
  cardigan: { top: '#9b7fd1', pants: '#6e5a8a', shoes: '#c9473f', sleeve: 'long', vneck: true, dots: '#b9a6f0' },
  flannel: { top: '#c9473f', pants: '#4a5c9a', shoes: '#6e4528', sleeve: 'long', stripes: '#9e2f2a' },
  sunny: { top: '#ffd25a', pants: '#3fae8c', shoes: '#e66a8f', sleeve: 'short', dots: '#ffffff' },
  suit: { top: '#8c8a66', pants: '#64634a', shoes: '#3a2f28', sleeve: 'long', tie: '#e8505b' },
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
};

/** Body poses: [elbow, hand] for the figure's left (viewer's left) and right arm, relative to the floor point;
 * legs: stand, sit or none; hipY = height of the hips; down = how far the upper body sinks (sitting). */
export const POSES = {
  stand: { arms: [[[-112, -270], [-116, -175]], [[112, -270], [116, -175]]], legs: 'stand' },
  wave: { arms: [[[-112, -270], [-116, -175]], [[175, -400], [190, -530]]], legs: 'stand', open: [false, true] },
  cheer: { arms: [[[-170, -400], [-190, -540]], [[170, -400], [190, -540]]], legs: 'stand', open: [true, true] },
  point: { arms: [[[-112, -270], [-116, -175]], [[185, -350], [275, -365]]], legs: 'stand', point: true },
  hips: { arms: [[[-175, -280], [-90, -205]], [[175, -280], [90, -205]]], legs: 'stand' },
  pop: { arms: [[[-175, -320], [-128, -470]], [[175, -320], [128, -470]]], legs: 'stand', wiggle: true },
  shrug: { arms: [[[-165, -290], [-200, -380]], [[165, -290], [200, -380]]], legs: 'stand', open: [true, true] },
  facepalm: { arms: [[[-112, -270], [-116, -175]], [[150, -320], [40, -505]]], legs: 'stand' },
  sit: { arms: [[[-118, -230], [-104, -150]], [[118, -230], [104, -150]]], legs: 'sit', hipY: -100, down: 75 },
  bust: { arms: [[[-112, -270], [-116, -175]], [[112, -270], [116, -175]]], legs: 'none', shift: 260 },
  lie: { arms: null, legs: 'none', shift: 260 },
};

/** Things a figure can hold in the right hand. */
export const HOLDS = ['remote', 'torch', 'phone', 'snack', 'tweezers', 'clipboard', 'magnifier', 'gloves'];

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
  const armor = OUTFITS[c.outfit]?.armor;
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
  if (out.apron) {
    inside.appendChild(el('path', { d: `M-56 ${sy + 40} L56 ${sy + 40} L${hw - 6} ${hy + 4} L${-hw + 6} ${hy + 4}Z`, fill: out.apron, ...ink(5) }));
    inside.appendChild(el('rect', { x: -32, y: sy + 120, width: 64, height: 42, rx: 8, fill: tint(out.apron, -0.06), ...ink(4) }));
  }
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
  if (out.tie) {
    // A suit: white shirt in a deep V, a tie, and jacket lapels.
    inside.appendChild(el('path', { d: `M-44 ${sy - 2} L0 ${sy + 120} L44 ${sy - 2}Z`, fill: '#fbf8f0', ...ink(5) }));
    inside.appendChild(el('path', { d: `M-12 ${sy + 4} L12 ${sy + 4} L8 ${sy + 22} L16 ${sy + 104} L0 ${sy + 124} L-16 ${sy + 104} L-8 ${sy + 22}Z`, fill: out.tie, ...ink(4) }));
    for (const s of [-1, 1]) inside.appendChild(el('path', { d: `M${s * 44} ${sy - 2} L${s * 4} ${sy + 126} L${s * 30} ${sy + 60} L${s * 66} ${sy + 40}Z`, fill: tint(out.top, -0.1), ...ink(4.5) }));
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
  g.appendChild(el('path', { d, fill: 'none', stroke: INK, 'stroke-width': 52, 'stroke-linecap': 'round' }));
  g.appendChild(el('path', { d, fill: 'none', stroke: out.sleeve === 'short' ? skinFill : sleeve, 'stroke-width': 40, 'stroke-linecap': 'round' }));
  if (out.sleeve === 'short') {
    const mid = [(sh[0] + elb[0]) / 2, (sh[1] + elb[1]) / 2];
    g.appendChild(el('path', { d: `M${sh[0]} ${sh[1]} L${mid[0]} ${mid[1]}`, stroke: INK, 'stroke-width': 56, 'stroke-linecap': 'round' }));
    g.appendChild(el('path', { d: `M${sh[0]} ${sh[1]} L${mid[0]} ${mid[1]}`, stroke: sleeve, 'stroke-width': 44, 'stroke-linecap': 'round' }));
  }
  if (out.armor) g.appendChild(el('circle', { cx: elb[0] * 0.5 + (sh[0] + hand[0]) * 0.25, cy: elb[1] * 0.5 + (sh[1] + hand[1]) * 0.25, r: 22, fill: '#aeb9c6', ...ink(4.5) }));
  if (o.hold) return g; // a hand holding something is drawn over the thing instead (see drawCharacter)
  const hf = out.armor ? '#aeb9c6' : skinFill;
  if (o.open || o.wiggle) {
    g.appendChild(el('g', { transform: `translate(${hand[0]} ${hand[1]})` }, [openHand(hf, o)]));
  } else {
    const turn = Math.atan2(hand[1] - elb[1], hand[0] - elb[0]) * 180 / Math.PI - 90; // fingers follow the forearm
    g.appendChild(el('g', { transform: `translate(${hand[0]} ${hand[1]}) rotate(${turn})` }, [closedHand(hf, o)]));
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
    g.appendChild(el('ellipse', { cx: s * (x + 8), cy: -8, rx: w / 2 + 12, ry: 20, fill: out.shoes, ...ink(5) }));
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
  const blue = '#6fc3ef';
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
  const shoulders = [[-b.shoulder + 22, sy + 26], [b.shoulder - 22, sy + 26]];
  const legNode = legs(pose.legs, hy, b, out);
  if (legNode) body.appendChild(legNode);
  if (pose.legs === 'sit') body.appendChild(el('rect', { x: -b.hip - 4, y: hy - 30, width: b.hip * 2 + 8, height: 40, rx: 18, fill: out.armor ? '#c9d3de' : out.pants, ...ink(5) }));
  body.appendChild(el('rect', { x: -26, y: headY + 90, width: 52, height: sy - headY - 80, fill: skinFill, ...ink(5) }));
  body.appendChild(torso(c, b, out, sy, hy, body));
  if (out.armor) for (const sx of [-1, 1]) body.appendChild(el('path', { d: `M${sx * (b.shoulder + 26)} ${sy + 50} C${sx * (b.shoulder + 30)} ${sy - 30} ${sx * 20} ${sy - 30} ${sx * 30} ${sy + 20}Z`, fill: '#d7dee7', ...ink(5) }));
  const h = head({ ...c, flip: c.flip }, e);
  h.node.setAttribute('transform', `translate(0 ${headY}) scale(${b.head}) ${h.node.getAttribute('transform')}`);
  body.appendChild(h.node);
  if (pose.arms) {
    pose.arms.forEach(([elb, hand], i) => {
      const side = i ? 1 : -1;
      const dy = [elb[1] + down, hand[1] + down];
      const held = i === 1 && c.hold ? heldThing(c.hold, [hand[0], dy[1]], c.holdScale) : null;
      const o = { open: pose.open?.[i], wiggle: pose.wiggle, point: pose.point && i === 1, side, hold: !!held };
      body.appendChild(arm(shoulders[i], [elb[0], dy[0]], [hand[0], dy[1]], out, skinFill, o));
      if (held) {
        // The fist goes over the thing, fingers wrapped across it and the thumb on top, so it looks gripped.
        const turn = 90 + (c.hold === 'torch' ? -35 : 0);
        body.appendChild(held);
        body.appendChild(el('g', { transform: `translate(${hand[0]} ${dy[1]}) rotate(${turn}) scale(0.9)` }, [closedHand(out.armor ? '#aeb9c6' : skinFill, { side })]));
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
  // sign (a tick and sparkles; the word goes in a bubble) and a cheap lamp. Options: leakX, bulbX, signX, signTilt,
  // doorX, doorOpen, leak/bulb/sign/door false to hide one.
  studio: {
    wall: ['#8e9b83', '#7b8872'], stripes: '#86937c', skirting: '#5f6a56', floor: '#4f5648', boards: '#3c4237',
    sky: ['#aab4bf', '#dde3e8'], cloud: true, curtains: '#a89a6a', picture: false, plant: true, lamp: true,
    shabby: true, leak: true, bulb: true, sign: true, door: true,
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
 * The dingy studio's things in front of the wall: the bare bulb on its cord (with flicker marks) and the "Clean!"
 * sign hanging crooked from a nail (a tick and sparkles, plus a stain that says otherwise).
 * @param {SVGElement} g the room group @param {object} r room options @param {number} w width @param {number} F floor line
 * @returns {void}
 */
function shabbyFront(g, r, w, F) {
  const k = Math.min(F / 600, w / 1000);
  if (r.sign) {
    const sx = w * (r.signX ?? 0.72);
    const sy = F * 0.12;
    const sw = 250 * k;
    const sh = 130 * k;
    const sg = el('g', { transform: `rotate(${r.signTilt ?? -7} ${sx} ${sy})` });
    sg.appendChild(line(`M${sx} ${sy} L${sx - sw * 0.4} ${sy + 40 * k} M${sx} ${sy} L${sx + sw * 0.4} ${sy + 40 * k}`, 3.5));
    sg.appendChild(el('rect', { x: sx - sw / 2, y: sy + 40 * k, width: sw, height: sh, rx: 10 * k, fill: '#f6f1de', ...ink(5) }));
    sg.appendChild(el('ellipse', { cx: sx + sw * 0.3, cy: sy + 40 * k + sh * 0.72, rx: 30 * k, ry: 18 * k, fill: '#786834', opacity: 0.35 }));
    sg.appendChild(line(`M${sx - sw * 0.28} ${sy + 40 * k + sh * 0.5} l${sw * 0.12} ${sh * 0.24} l${sw * 0.26} ${-sh * 0.46}`, 14 * k, { stroke: '#3fae8c' }));
    for (const [fx, fy, q] of [[0.26, 0.3, 22], [0.36, 0.7, 14], [-0.38, 0.28, 12]]) {
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
 * A room filling the panel: wall with soft stripes, floor boards, a window with curtains (sky, cloud or moon and
 * stars), and optionally a picture, a plant and a floor lamp.
 * @param {object} l layer: kind (a key of ROOMS), w and h (the panel size), floorY (height of the floor line),
 *   windowX (0..1 across), and any ROOMS field to switch an item on or off
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
  if (r.plant) {
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
 * A box of rubber gloves on its own (the inspector's gift; "Gloves. Always gloves.").
 * @param {object} l layer: x, y (bottom middle), scale, rotate
 * @returns {{node: SVGElement}} the box
 */
function gloves(l) {
  return { node: el('g', { transform: `translate(${l.x ?? 0} ${l.y ?? 0}) rotate(${l.rotate ?? 0}) scale(${l.scale ?? 1})` }, [gloveBox()]) };
}

/** Props, rooms and effects by name. */
export const PROPS = { sofa, bed, blanket, armor: armorStand, torch, burst, sparkles, room, rays, chair, urn, bucket, drip, gloves };

/** Every art piece a strip can name with `art:` (characters and props). Each takes the layer and returns { node, mouth? }. */
export const ARTS = {
  ...Object.fromEntries(Object.keys(CHARACTERS).map((who) => [who, (l) => drawCharacter(who, l)])),
  ...PROPS,
};

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
