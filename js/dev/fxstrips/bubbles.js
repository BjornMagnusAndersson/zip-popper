// Speech bubbles for the effect strips page (fx-strips.html, developer only). A copy of the small drawing glue in the
// game's comic player (js/game/comic.js: hugPoints, bubbleShapes, bubblePad, bubbleGroup), so the bubbles look exactly
// like the game's while the game file stays untouched. The placing rules (clampBox, avoidBoxes, tailPath) are the
// game's own, imported from comic-logic.js. Needs css/comic.css (comic-bub, comic-text classes).
import { tailPath } from '../../game/comic-logic.js';
import { svgEl, INK } from '../../game/comic.js';

const CAPTION = '#ffe08a';

/**
 * Points round a box on a rounded-square curve that hugs it (shout spikes and thought-cloud puffs).
 * @param {{x: number, y: number, w: number, h: number}} b the box
 * @param {number} n how many points
 * @param {number} grow how far out (1 = on the curve)
 * @returns {number[][]} points [x, y]
 */
function hugPoints(b, n, grow) {
  const cx = b.x + b.w / 2;
  const cy = b.y + b.h / 2;
  return Array.from({ length: n }, (_, i) => {
    const a = (i / n) * Math.PI * 2 + 0.2;
    const c = Math.cos(a);
    const s = Math.sin(a);
    return [cx + Math.sign(c) * Math.abs(c) ** 0.45 * (b.w / 2) * grow, cy + Math.sign(s) * Math.abs(s) ** 0.45 * (b.h / 2) * grow];
  });
}

/**
 * The shapes of one bubble (body and tail), drawn three times by bubbleGroup (shadow, ink, white).
 * @param {string} kind say, shout, think, whisper or caption
 * @param {{x: number, y: number, w: number, h: number}} b the bubble box
 * @param {number[]|null} target where the tail points, or null for no tail
 * @param {number} em the font size (same units as the box)
 * @returns {{tag: string, attrs: object}[]} shapes
 */
function bubbleShapes(kind, b, target, em) {
  const out = [];
  if (kind === 'caption') {
    out.push({ tag: 'rect', attrs: { x: b.x, y: b.y, width: b.w, height: b.h, rx: em * 0.25 } });
    return out;
  }
  if (kind === 'shout') {
    const n = Math.max(14, Math.round((b.w + b.h) / (em * 1.3)));
    const cx = b.x + b.w / 2;
    const cy = b.y + b.h / 2;
    const pts = hugPoints(b, n * 2, 1).map((p, i) => {
      const k = i % 2 ? 1.02 : 1.2;
      return [cx + (p[0] - cx) * k, cy + (p[1] - cy) * k];
    });
    out.push({ tag: 'polygon', attrs: { points: pts.map((p) => p.map((v) => v.toFixed(1)).join(',')).join(' ') } });
  } else if (kind === 'think') {
    out.push({ tag: 'rect', attrs: { x: b.x, y: b.y, width: b.w, height: b.h, rx: Math.min(b.h / 2, em * 1.4) } });
    const n = Math.max(8, Math.round((b.w + b.h) / (em * 1.6)));
    for (const p of hugPoints(b, n, 0.98)) out.push({ tag: 'circle', attrs: { cx: p[0], cy: p[1], r: em * 0.85 } });
  } else {
    out.push({ tag: 'rect', attrs: { x: b.x, y: b.y, width: b.w, height: b.h, rx: Math.min(b.h / 2, em * 1.5) } });
  }
  if (!target) return out;
  if (kind === 'think') {
    const c = [b.x + b.w / 2, b.y + b.h / 2];
    const d = Math.hypot(target[0] - c[0], target[1] - c[1]) || 1;
    const edge = Math.min(b.w, b.h) / 2 + em;
    [0.35, 0.6, 0.82].forEach((f, i) => {
      const k = (edge + (d - edge) * f) / d;
      out.push({ tag: 'circle', attrs: { cx: c[0] + (target[0] - c[0]) * k, cy: c[1] + (target[1] - c[1]) * k, r: em * (0.5 - i * 0.13) } });
    });
    return out;
  }
  const d = tailPath(b, target, kind === 'shout' ? em * 0.7 : em * 0.55);
  if (d) out.push({ tag: 'path', attrs: { d } });
  return out;
}

/**
 * How far a bubble's shape reaches beyond its text box (spikes and cloud puffs need more room).
 * @param {string} kind bubble kind
 * @param {number} em font size
 * @returns {number} the extra room
 */
export function bubblePad(kind, em) {
  return kind === 'shout' ? em * 1.1 : kind === 'think' ? em * 0.9 : em * 0.4;
}

/**
 * Draw one bubble: a soft shadow, a thick ink copy of body and tail, and the white body and tail on top.
 * @param {string} kind bubble kind
 * @param {{x: number, y: number, w: number, h: number}} box the text box
 * @param {number[]|null} target where the tail points
 * @param {number} em font size
 * @param {number} u units per CSS pixel (outline width, shadow offset)
 * @param {number} [stop] how far before the target the tail ends (the speaker's head size)
 * @returns {SVGElement} the bubble group (hidden until it gets is-on)
 */
export function bubbleGroup(kind, box, target, em, u, stop = 0) {
  let aim = target;
  if (target && stop > 0) {
    const cx = box.x + box.w / 2;
    const cy = box.y + box.h / 2;
    const d = Math.hypot(target[0] - cx, target[1] - cy) || 1;
    const room = d - Math.min(box.w, box.h) / 2;
    const back = Math.min(stop, room * 0.55);
    aim = [target[0] - ((target[0] - cx) / d) * back, target[1] - ((target[1] - cy) / d) * back];
  }
  const shapes = bubbleShapes(kind, box, aim, em);
  const g = svgEl('g', { class: 'comic-bub' });
  const shadow = svgEl('g', { fill: 'rgba(42,33,29,0.22)', transform: `translate(${4 * u} ${5 * u})` });
  const outline = svgEl('g', {
    fill: kind === 'whisper' ? 'none' : INK, stroke: INK, 'stroke-width': 6.4 * u, 'stroke-linejoin': 'round',
    'stroke-dasharray': kind === 'whisper' ? `${em * 0.6} ${em * 0.4}` : null,
  });
  const fill = svgEl('g', { fill: kind === 'caption' ? CAPTION : kind === 'whisper' ? '#f3f7ff' : '#fff' });
  for (const s of shapes) {
    shadow.appendChild(svgEl(s.tag, s.attrs));
    outline.appendChild(svgEl(s.tag, s.attrs));
    fill.appendChild(svgEl(s.tag, s.attrs));
  }
  g.append(shadow, outline, fill);
  return g;
}
