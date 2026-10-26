// The little cartoon mascot of the title and menu screens (T3.1a): a round, smiling face with rosy cheeks and one
// big shiny bump with a sparkle. Pure SVG drawing, playful and clean (no blood, no goo).

import { svg, INK } from './dom.js';

/**
 * Draw the mascot face.
 * @returns {SVGElement} an svg with viewBox 0 0 200 200 (sized by CSS)
 */
export function mascotArt() {
  const stroke = { stroke: INK, 'stroke-width': 6, 'stroke-linejoin': 'round', 'stroke-linecap': 'round' };
  const face = svg('g', { class: 'app-mascot__face' }, [
    svg('ellipse', { cx: 100, cy: 188, rx: 54, ry: 7, fill: 'rgba(42,33,29,0.18)' }),
    svg('circle', { cx: 100, cy: 104, r: 78, fill: '#ffd9c2', ...stroke }),
    svg('path', { d: 'M52 62c14-22 52-30 86-12', fill: 'none', stroke: '#fff', 'stroke-width': 9, 'stroke-linecap': 'round', opacity: 0.55 }),
    svg('ellipse', { cx: 52, cy: 124, rx: 15, ry: 10, fill: '#ff9ec0', opacity: 0.85 }),
    svg('ellipse', { cx: 148, cy: 124, rx: 15, ry: 10, fill: '#ff9ec0', opacity: 0.85 }),
    svg('ellipse', { cx: 72, cy: 98, rx: 9, ry: 13, fill: INK }),
    svg('ellipse', { cx: 128, cy: 98, rx: 9, ry: 13, fill: INK }),
    svg('circle', { cx: 75, cy: 93, r: 3.6, fill: '#fff' }),
    svg('circle', { cx: 131, cy: 93, r: 3.6, fill: '#fff' }),
    svg('path', { d: 'M76 132c12 16 36 16 48 0', fill: '#fff', ...stroke }),
    // the shiny bump on the cheek
    svg('circle', { cx: 140, cy: 66, r: 17, fill: '#fff7d6', ...stroke }),
    svg('ellipse', { cx: 135, cy: 60, rx: 5.5, ry: 3.6, fill: '#fff', transform: 'rotate(-35 135 60)' }),
  ]);
  const sparkle = svg('path', { d: 'M174 30l4 11 11 4-11 4-4 11-4-11-11-4 11-4z', fill: '#ffd23f', ...stroke, 'stroke-width': 4, class: 'app-mascot__sparkle' });
  const sparkle2 = svg('path', { d: 'M26 40l3 8 8 3-8 3-3 8-3-8-8-3 8-3z', fill: '#fff', ...stroke, 'stroke-width': 3.5, class: 'app-mascot__sparkle app-mascot__sparkle--b' });
  return svg('svg', { viewBox: '0 0 200 200', class: 'app-mascot', 'aria-hidden': 'true' }, [face, sparkle, sparkle2]);
}
