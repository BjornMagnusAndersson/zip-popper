// The art kit for the effect strips page (fx-strips.html, developer only): the game's comic art kit (comic-art.js,
// unchanged) plus a few extras these test strips need, drawn the same way (thick ink outlines, flat cartoon colours):
// head accessories (the Evil Horns, sunglasses, a prom tiara, the pearly Unicorn zit, a clean shine), a prom sash,
// and props (a smoke machine, a disco ball rope hook, a sponge, foam, a coin purse, motion lines). Cartoon only.
// A character layer may carry `acc: {...}` (see accessories below); everything else is a normal comic layer.
import { svgEl as el, INK } from '../../game/comic.js';
import { ARTS, CHARACTERS, POSES, headSpot, dressHeroine, studioKit, tint } from '../../game/comic-art.js';

/** Ink outline attributes. @param {number} [w] width @returns {object} attributes */
const ink = (w = 6) => ({ stroke: INK, 'stroke-width': w, 'stroke-linejoin': 'round', 'stroke-linecap': 'round' });
let gid = 0;

// Two extra poses for these strips only, added to the kit's table on this page (the game file is not changed):
// dancing while sitting (her arms up in the chair) and cracking the knuckles (fists together in front of the chest).
POSES.fxDance = { ...POSES.sit, arms: POSES.cheer.arms, open: [true, true] };
POSES.fxKnuckles = { arms: [[[-150, -230], [-34, -310]], [[150, -230], [34, -310]]], legs: 'stand' };

/**
 * A curved, pointy Evil Horn in head units (its base on the forehead), ivory with purple-tinted ridges and a pale halo
 * so it stands out. side -1 = the left one (curls out to the left), 1 = the right one.
 * @param {number} side which side
 * @param {number} size 1 = about 150 units tall
 * @param {boolean} flat a flat dark shape (for a silhouette)
 * @returns {SVGElement} the horn
 */
function hornShape(side, size, flat) {
  const g = el('g', { transform: `translate(${side * 48} -84) scale(${side * size} ${size})` });
  const d = 'M-30 6 C-34 -50 -10 -104 40 -150 C34 -96 34 -48 32 6 Q0 16 -30 6Z';
  if (flat) { g.appendChild(el('path', { d, fill: flat })); return g; }
  const id = `fxh${gid += 1}`;
  g.appendChild(el('defs', {}, [el('linearGradient', { id, x1: 0, y1: 1, x2: 0.4, y2: 0 }, [
    el('stop', { offset: 0, 'stop-color': '#fff7e4' }), el('stop', { offset: 0.55, 'stop-color': '#ecd9b6' }), el('stop', { offset: 1, 'stop-color': '#b89bd8' })])]));
  g.appendChild(el('path', { d, fill: 'none', stroke: 'rgba(255,248,232,0.9)', 'stroke-width': 18 }));
  g.appendChild(el('path', { d, fill: `url(#${id})`, ...ink(6) }));
  for (const [y, w] of [[-34, 30], [-74, 24], [-110, 16]]) g.appendChild(el('path', { d: `M${-26 + (-y) * 0.12} ${y + 4} Q${4 + (-y) * 0.2} ${y + 12} ${w + (-y) * 0.16} ${y - 4}`, fill: 'none', stroke: '#8a64b8', 'stroke-width': 5, 'stroke-linecap': 'round', opacity: 0.8 }));
  g.appendChild(el('path', { d: 'M-14 -10 C-16 -44 -4 -74 14 -98', fill: 'none', stroke: '#ffffff', 'stroke-width': 7, 'stroke-linecap': 'round', opacity: 0.8 }));
  return g;
}

/**
 * Cool dark sunglasses over both eyes (head units), with a white glint on each lens.
 * @param {boolean} flat no glints (for a silhouette)
 * @returns {SVGElement} the glasses
 */
function shades(flat) {
  const g = el('g');
  for (const s of [-1, 1]) {
    g.appendChild(el('path', { d: `M${s * 6} -16 L${s * 74} -20 Q${s * 80} 20 ${s * 44} 26 Q${s * 10} 26 ${s * 6} -16Z`, fill: '#1e1a2c', ...ink(5) }));
    if (!flat) g.appendChild(el('path', { d: `M${s * 22} -6 L${s * 36} -12 M${s * 18} 6 L${s * 50} -10`, stroke: '#ffffff', 'stroke-width': 5, 'stroke-linecap': 'round', opacity: 0.85 }));
  }
  g.appendChild(el('path', { d: 'M-8 -14 Q0 -20 8 -14', fill: 'none', ...ink(6) }));
  return g;
}

/**
 * A prom queen's tiara on top of the head (head units): a gold band with three points and pink gems.
 * @returns {SVGElement} the tiara
 */
function tiara() {
  const g = el('g', { transform: 'translate(0 -122)' });
  g.appendChild(el('path', { d: 'M-70 18 L-62 -14 L-38 4 L-18 -34 L0 -6 L18 -34 L38 4 L62 -14 L70 18 Q0 4 -70 18Z', fill: '#ffd25a', ...ink(5) }));
  for (const [x, y, r] of [[-18, -18, 9], [18, -18, 9], [0, 4, 11], [-56, 0, 6], [56, 0, 6]]) g.appendChild(el('circle', { cx: x, cy: y, r, fill: '#f27eb2', ...ink(3) }));
  g.appendChild(el('path', { d: 'M-52 10 Q0 0 52 10', fill: 'none', stroke: '#fff3c4', 'stroke-width': 4, 'stroke-linecap': 'round' }));
  return g;
}

/**
 * A zit on the face (head units): a soft pink dome with a head. kind 'pearl' = the Unicorn zit (a pearly head with a
 * mother-of-pearl rainbow sheen and glitter specks); else a plain cartoon whitehead.
 * @param {{x?: number, y?: number, r?: number, kind?: string}} z where and how big (default on her right cheek)
 * @returns {SVGElement} the zit
 */
function zit(z) {
  const x = z.x ?? 58;
  const y = z.y ?? 30;
  const r = z.r ?? 18;
  const g = el('g');
  g.appendChild(el('circle', { cx: x, cy: y, r: r * 1.35, fill: '#f49aa8', opacity: 0.55 }));
  g.appendChild(el('circle', { cx: x, cy: y, r: r * 0.95, fill: '#f2a7b4', ...ink(3.5) }));
  if (z.kind === 'pearl') {
    const id = `fxp${gid += 1}`;
    const rb = `fxr${gid += 1}`;
    g.appendChild(el('defs', {}, [
      el('radialGradient', { id, cx: 0.35, cy: 0.3, r: 0.8 }, [el('stop', { offset: 0, 'stop-color': '#ffffff' }), el('stop', { offset: 0.55, 'stop-color': '#f6eefc' }), el('stop', { offset: 1, 'stop-color': '#d9c8ee' })]),
      el('linearGradient', { id: rb, x1: 0, y1: 0, x2: 1, y2: 1 }, ['#ffb0da', '#ffd9a6', '#b3f0cb', '#a9d6ff', '#cbb5ff'].map((c, i) => el('stop', { offset: i / 4, 'stop-color': c }))),
    ]));
    g.appendChild(el('circle', { cx: x, cy: y - r * 0.08, r: r * 0.66, fill: `url(#${id})`, stroke: '#7e64a3', 'stroke-width': 3 }));
    g.appendChild(el('circle', { cx: x, cy: y - r * 0.08, r: r * 0.66, fill: `url(#${rb})`, opacity: 0.45 }));
    for (const [dx, dy, c] of [[-0.25, 0.1, '#3f7ff2'], [0.2, -0.2, '#2cc27a'], [0.15, 0.28, '#ff4f93'], [-0.1, -0.32, '#ffffff']]) {
      g.appendChild(el('rect', { x: x + dx * r - 2.5, y: y + dy * r - 2.5, width: 5, height: 5, fill: c, transform: `rotate(45 ${x + dx * r} ${y + dy * r})` }));
    }
    g.appendChild(el('ellipse', { cx: x - r * 0.24, cy: y - r * 0.34, rx: r * 0.2, ry: r * 0.1, fill: '#ffffff', transform: `rotate(-35 ${x - r * 0.24} ${y - r * 0.34})` }));
  } else {
    g.appendChild(el('circle', { cx: x, cy: y - r * 0.1, r: r * 0.5, fill: '#fff6dc', ...ink(3) }));
  }
  return g;
}

/**
 * A prom sash across the body (body units: shoulders at about -360, hips at -170), pink with a gold edge.
 * @param {number} down the pose's sit drop (POSES.down)
 * @returns {SVGElement} the sash
 */
function sash(down) {
  const g = el('g', { transform: `translate(0 ${down})` });
  g.appendChild(el('path', { d: 'M-70 -372 L-30 -380 L84 -196 L50 -176Z', fill: '#f27eb2', ...ink(5) }));
  g.appendChild(el('path', { d: 'M-58 -366 L68 -186', stroke: '#ffd25a', 'stroke-width': 5, 'stroke-dasharray': '10 8' }));
  return g;
}

/**
 * A character from the game's kit, plus any accessories in `l.acc`: horns (size, 1 = about 150 units), shades, tiara,
 * zit ({x, y, r, kind}), sash. In a silhouette the accessories are flat dark shapes too.
 * @param {string} who a CHARACTERS key
 * @param {Function} base the kit's drawing function for that character
 * @returns {(l: object, kit: object) => {node: SVGElement, mouth: number[], reach: number}} the drawing function
 */
function withAccessories(who, base) {
  return (l, kit) => {
    const r = base(l, kit);
    const acc = l.acc;
    if (!acc) return r;
    const flat = l.silhouette ? (l.silhouette === true ? INK : l.silhouette) : null;
    const hs = headSpot(who, l);
    const fx = l.flip ? -1 : 1;
    const hg = el('g', { transform: `translate(${hs.x} ${hs.y}) scale(${fx * hs.scale} ${hs.scale}) rotate(${hs.tilt * fx})` });
    if (acc.zit && !flat) hg.appendChild(zit(acc.zit));
    if (acc.shades) hg.appendChild(shades(!!flat));
    if (acc.tiara && !flat) hg.appendChild(tiara());
    if (acc.horns) for (const s of [-1, 1]) hg.appendChild(hornShape(s, acc.horns, flat));
    const g = el('g', {}, [r.node]);
    if (acc.sash && !flat) {
      const c = { ...CHARACTERS[who], ...l };
      const s = (c.scale ?? 1) * (c.size ?? 1);
      const pose = POSES[c.pose] ?? POSES.stand;
      g.appendChild(el('g', { transform: `translate(${l.x ?? 0} ${l.y ?? 0}) scale(${fx * s} ${s}) translate(0 ${pose.shift ?? 0})` }, [sash(pose.down ?? 0)]));
    }
    g.appendChild(hg);
    return { ...r, node: g };
  };
}

/**
 * A smoke machine on the floor: a dark box with a dial, a little red light and a nozzle (x, y = floor middle).
 * @param {object} l layer: x, y, scale, flip
 * @returns {{node: SVGElement}} the machine
 */
function smokeMachine(l) {
  const s = l.scale ?? 1;
  const g = el('g', { transform: `translate(${l.x ?? 0} ${l.y ?? 0}) scale(${(l.flip ? -1 : 1) * s} ${s})` });
  g.appendChild(el('rect', { x: -90, y: -110, width: 180, height: 104, rx: 14, fill: '#4c4860', ...ink(6) }));
  g.appendChild(el('rect', { x: 90, y: -86, width: 46, height: 34, rx: 6, fill: '#6a657c', ...ink(5) }));
  g.appendChild(el('circle', { cx: -40, cy: -58, r: 22, fill: '#c9d3de', ...ink(4) }));
  g.appendChild(el('path', { d: 'M-40 -58 L-28 -72', ...ink(5) }));
  g.appendChild(el('circle', { cx: 30, cy: -78, r: 9, fill: '#e8505b', ...ink(3) }));
  g.appendChild(el('rect', { x: 8, y: -52, width: 60, height: 12, rx: 5, fill: '#2b2f3a' }));
  for (const sx of [-60, 60]) g.appendChild(el('rect', { x: sx - 14, y: -8, width: 28, height: 10, rx: 4, fill: '#2b2f3a' }));
  return { node: g };
}

/**
 * A yellow kitchen sponge with a green scrubby top and a few holes (x, y = middle), turned by rotate.
 * @param {object} l layer: x, y, scale, rotate
 * @returns {{node: SVGElement}} the sponge
 */
function sponge(l) {
  const s = l.scale ?? 1;
  const g = el('g', { transform: `translate(${l.x ?? 0} ${l.y ?? 0}) rotate(${l.rotate ?? 0}) scale(${s})` });
  g.appendChild(el('rect', { x: -60, y: -30, width: 120, height: 64, rx: 14, fill: '#ffd25a', ...ink(5) }));
  g.appendChild(el('rect', { x: -60, y: -42, width: 120, height: 24, rx: 10, fill: '#59b85f', ...ink(5) }));
  for (const [x, y] of [[-30, 8], [6, 16], [30, 0], [-6, -2]]) g.appendChild(el('circle', { cx: x, cy: y, r: 5, fill: '#e2b553' }));
  return { node: g };
}

/**
 * Soap foam: a cluster of white bubbles with ink rims and shines (x, y = middle, r = spread).
 * @param {object} l layer: x, y, r, n (how many)
 * @returns {{node: SVGElement}} the foam
 */
function foam(l) {
  const r = l.r ?? 80;
  const g = el('g', { transform: `translate(${l.x ?? 0} ${l.y ?? 0})` });
  const n = l.n ?? 9;
  for (let i = 0; i < n; i += 1) {
    const a = i * 2.4;
    const d = r * (0.2 + ((i * 0.37) % 0.8));
    const rr = r * (0.16 + ((i * 0.53) % 0.2));
    const x = Math.cos(a) * d;
    const y = Math.sin(a) * d * 0.7;
    g.appendChild(el('circle', { cx: x, cy: y, r: rr, fill: '#ffffff', ...ink(3.5) }));
    g.appendChild(el('circle', { cx: x - rr * 0.35, cy: y - rr * 0.35, r: rr * 0.22, fill: '#bfe4fb' }));
  }
  return { node: g };
}

/**
 * Comic motion lines: short curved strokes round a point (x, y = middle, r = reach), for scrubbing or a quick move.
 * @param {object} l layer: x, y, r, n, color
 * @returns {{node: SVGElement}} the lines
 */
function motion(l) {
  const r = l.r ?? 120;
  const g = el('g', { transform: `translate(${l.x ?? 0} ${l.y ?? 0})` });
  const n = l.n ?? 6;
  for (let i = 0; i < n; i += 1) {
    const a = (i / n) * Math.PI * 2 + 0.3;
    const x0 = Math.cos(a) * r * 0.7;
    const y0 = Math.sin(a) * r * 0.7;
    const x1 = Math.cos(a + 0.35) * r;
    const y1 = Math.sin(a + 0.35) * r;
    g.appendChild(el('path', { d: `M${x0.toFixed(1)} ${y0.toFixed(1)} Q${(Math.cos(a + 0.15) * r * 0.95).toFixed(1)} ${(Math.sin(a + 0.15) * r * 0.95).toFixed(1)} ${x1.toFixed(1)} ${y1.toFixed(1)}`, fill: 'none', stroke: l.color ?? INK, 'stroke-width': 7, 'stroke-linecap': 'round' }));
  }
  return { node: g };
}

/**
 * A little round coin purse with a clasp (x, y = bottom middle), open with coins peeking out when open.
 * @param {object} l layer: x, y, scale, open
 * @returns {{node: SVGElement}} the purse
 */
function purse(l) {
  const s = l.scale ?? 1;
  const g = el('g', { transform: `translate(${l.x ?? 0} ${l.y ?? 0}) scale(${s})` });
  if (l.open) for (const [x, y] of [[-20, -96], [14, -104], [0, -86]]) g.appendChild(el('ellipse', { cx: x, cy: y, rx: 18, ry: 14, fill: '#ffd25a', ...ink(4) }));
  g.appendChild(el('path', { d: 'M-60 -70 Q-70 0 0 0 Q70 0 60 -70Z', fill: '#9b7fd1', ...ink(5) }));
  g.appendChild(el('path', { d: 'M-60 -70 L60 -70', ...ink(6) }));
  for (const sx of [-1, 1]) g.appendChild(el('circle', { cx: sx * 10, cy: -80, r: 9, fill: '#ffd25a', ...ink(3.5) }));
  return { node: g };
}

/**
 * A big five-point cartoon star (gold with a lighter top and an ink outline), x, y = middle, r = size.
 * @param {object} l layer: x, y, r, rotate, color
 * @returns {{node: SVGElement}} the star
 */
function star(l) {
  const r = l.r ?? 60;
  const pts = [];
  for (let i = 0; i < 10; i += 1) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const k = i % 2 ? 0.46 : 1;
    pts.push(`${(Math.cos(a) * r * k).toFixed(1)},${(Math.sin(a) * r * k).toFixed(1)}`);
  }
  const g = el('g', { transform: `translate(${l.x ?? 0} ${l.y ?? 0}) rotate(${l.rotate ?? 0})` });
  g.appendChild(el('polygon', { points: pts.join(' '), fill: l.color ?? '#ffd25a', ...ink(Math.max(4, r * 0.09)) }));
  g.appendChild(el('polygon', { points: pts.join(' '), fill: '#fff3c4', opacity: 0.6, transform: `translate(${-r * 0.08} ${-r * 0.12}) scale(0.5)` }));
  return { node: g };
}

/**
 * A plain sign board on two strings from a nail (the clean studio's new sign), with the kit's painted CLEAN! word.
 * @param {object} l layer: x, y (the nail), w, h, tilt, color (board)
 * @returns {{node: SVGElement}} the sign
 */
function signBoard(l) {
  const x = l.x ?? 0;
  const y = l.y ?? 0;
  const w = l.w ?? 250;
  const h = l.h ?? 130;
  const top = y + 40;
  const g = el('g', { transform: `rotate(${l.tilt ?? 0} ${x} ${y})` });
  g.appendChild(el('path', { d: `M${x} ${y} L${x - w * 0.4} ${top} M${x} ${y} L${x + w * 0.4} ${top}`, fill: 'none', ...ink(3.5) }));
  g.appendChild(el('rect', { x: x - w / 2, y: top, width: w, height: h, rx: 12, fill: l.color ?? '#fffdf4', ...ink(5) }));
  const word = ARTS.signWord({ x: x - w * 0.08, y: top + h * 0.7, w: w * 0.7, size: h * 0.5 });
  if (word?.node) g.appendChild(word.node);
  g.appendChild(el('path', { d: `M${x + w * 0.33} ${top + h * 0.5} l${w * 0.05} ${h * 0.16} l${w * 0.1} ${-h * 0.34}`, fill: 'none', stroke: '#3fae8c', 'stroke-width': 8, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }));
  g.appendChild(el('circle', { cx: x, cy: y, r: 7, fill: '#8a96a6', ...ink(3) }));
  return { node: g };
}

/**
 * A gold rope hanging from the ceiling with a tassel (x = where, y = how far down the tassel hangs).
 * @param {object} l layer: x, y
 * @returns {{node: SVGElement}} the rope
 */
function rope(l) {
  const x = l.x ?? 0;
  const y = l.y ?? 300;
  const g = el('g');
  g.appendChild(el('path', { d: `M${x} -10 Q${x + 12} ${y * 0.5} ${x} ${y}`, fill: 'none', stroke: INK, 'stroke-width': 14, 'stroke-linecap': 'round' }));
  g.appendChild(el('path', { d: `M${x} -10 Q${x + 12} ${y * 0.5} ${x} ${y}`, fill: 'none', stroke: '#ffd25a', 'stroke-width': 7, 'stroke-linecap': 'round' }));
  g.appendChild(el('path', { d: `M${x - 16} ${y} L${x + 16} ${y} L${x + 26} ${y + 60} L${x - 26} ${y + 60}Z`, fill: '#e8505b', ...ink(5) }));
  return { node: g };
}

/** The test strips' own props by name. */
const EXTRA = { smokeMachine, sponge, foam, motion, purse, star, signBoard, rope };

/**
 * Draw one plain-shape layer (rect, circle, ellipse, path), as the game's comic player does for simple scenery.
 * @param {object} l the layer: shape plus x, y, w, h, r, rx, ry, d, fill, stroke (true = ink), sw, opacity, rotate
 * @returns {SVGElement} the shape
 */
export function drawShape(l) {
  const common = {
    fill: l.fill ?? 'none', stroke: l.stroke === true ? INK : l.stroke, 'stroke-width': l.stroke ? (l.sw ?? 10) : null,
    'stroke-linejoin': 'round', 'stroke-linecap': 'round', opacity: l.opacity,
    transform: l.rotate ? `rotate(${l.rotate} ${l.x ?? 0} ${l.y ?? 0})` : null,
  };
  if (l.shape === 'rect') return el('rect', { ...common, x: l.x, y: l.y, width: l.w, height: l.h, rx: l.rx });
  if (l.shape === 'circle') return el('circle', { ...common, cx: l.x, cy: l.y, r: l.r });
  if (l.shape === 'ellipse') return el('ellipse', { ...common, cx: l.x, cy: l.y, rx: l.rx, ry: l.ry });
  return el('path', { ...common, d: l.d });
}

/**
 * The art kit for these strips: the game's kit with her in scrubs (cap rule as in the game) and her blue gloves, the
 * characters able to wear accessories, and the extra props.
 * @returns {Record<string, Function>} art name -> function(layer) returning {node, mouth?, reach?}
 */
export function makeKit() {
  const base = studioKit(dressHeroine(ARTS, 'scrubs'), { gloves: true });
  const kit = { ...base, ...EXTRA };
  for (const who of Object.keys(CHARACTERS)) kit[who] = withAccessories(who, base[who]);
  return kit;
}

/**
 * Draw one layer with the kit: art from the kit, or a plain shape.
 * @param {Record<string, Function>} kit the art kit (makeKit)
 * @param {object} l the layer
 * @returns {{node: SVGElement|null, mouth?: number[], reach?: number}} the drawing
 */
export function drawLayer(kit, l) {
  if (l.art) {
    const f = kit[l.art];
    if (typeof f !== 'function') { console.error(`fx-strips: unknown art "${l.art}"`); return { node: null }; }
    const r = f(l, { svgEl: el, INK });
    return r?.node ? r : { node: r ?? null };
  }
  return { node: drawShape(l) };
}

export { tint };
