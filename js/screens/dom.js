// Small DOM helpers shared by the non-pop screens (T3.1a): make elements, small cartoon icons, the screen shell and the
// header with a Back button. All text is set as plain text (textContent), never as HTML. Needs css/app.css.

import { starPoints, escapeMeansBack } from './screen-logic.js';

const NS = 'http://www.w3.org/2000/svg';
export const INK = '#2a211d'; // the game's outline colour (as in comic.js and face.js)

/**
 * Make an HTML element with a class and optional plain text.
 * @param {string} tag element name
 * @param {string} [cls] class names
 * @param {string} [text] text (always set as plain text, never HTML)
 * @returns {HTMLElement} the element
 */
export function el(tag, cls = '', text) {
  const node = document.createElement(tag);
  if (cls) node.className = cls;
  if (text !== undefined) node.textContent = text;
  return node;
}

/**
 * Make an SVG element with attributes (null or undefined attributes are left out).
 * @param {string} tag element name
 * @param {Record<string, string|number|null|undefined>} [attrs] attributes
 * @param {SVGElement[]} [kids] children to add
 * @returns {SVGElement} the element
 */
export function svg(tag, attrs = {}, kids = []) {
  const node = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) if (v !== null && v !== undefined) node.setAttribute(k, String(v));
  for (const kid of kids) if (kid) node.appendChild(kid);
  return node;
}

/**
 * Make a button that reports its tap.
 * @param {string} cls class names (app-btn and so on)
 * @param {string} text the label (plain text)
 * @param {(e: Event) => void} onClick what to do on a tap
 * @param {AbortSignal} signal removes the listener when the screen is disposed
 * @returns {HTMLButtonElement} the button
 */
export function button(cls, text, onClick, signal) {
  const b = el('button', cls, text);
  b.type = 'button';
  b.addEventListener('click', onClick, { signal });
  return b;
}

/**
 * Make an SVG star (outlined, glossy when filled) of a given pixel size.
 * @param {boolean} filled true = golden, false = an empty grey one
 * @param {number} size width and height in pixels
 * @returns {SVGElement} the star
 */
export function starIcon(filled, size) {
  const pts = starPoints(50, 54, 44, 19);
  const body = svg('polygon', { points: pts, fill: filled ? '#ffd23f' : '#e6d7cc', stroke: INK, 'stroke-width': 7, 'stroke-linejoin': 'round' });
  const kids = [body];
  if (filled) {
    kids.push(svg('polygon', { points: starPoints(50, 54, 30, 13), fill: '#ffe98a' }));
    kids.push(svg('ellipse', { cx: 38, cy: 34, rx: 6, ry: 3.2, fill: '#fff', opacity: 0.85, transform: 'rotate(-35 38 34)' }));
  }
  return svg('svg', { viewBox: '0 0 100 100', width: size, height: size, 'aria-hidden': 'true', class: 'app-icon' }, kids);
}

/**
 * Small cartoon icons used by the screens.
 * @param {'coin'|'lock'|'check'|'back'|'tool'|'studio'|'outfit'|'bulb'|'heart'} name which icon
 * @returns {SVGElement} a 24 px svg (sized by CSS)
 */
export function icon(name) {
  const stroke = { stroke: INK, 'stroke-width': 3.2, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' };
  const shapes = {
    coin: [svg('circle', { cx: 12, cy: 12, r: 9, fill: '#ffd23f', ...stroke }), svg('path', { d: 'M12 7v10M9.5 9.5c0-1.4 5-1.4 5 0s-5 3.4-5 5 5 1.4 5 0', fill: 'none', ...stroke, 'stroke-width': 2 })],
    lock: [svg('rect', { x: 5, y: 10.5, width: 14, height: 10, rx: 3, fill: '#ffe08a', ...stroke }), svg('path', { d: 'M8 10.5V8a4 4 0 0 1 8 0v2.5', fill: 'none', ...stroke })],
    check: [svg('path', { d: 'M5 12.5l4.5 4.5L19 7', fill: 'none', ...stroke, 'stroke-width': 4 })],
    back: [svg('path', { d: 'M15 5l-7 7 7 7', fill: 'none', ...stroke, 'stroke-width': 4 })],
    tool: [svg('path', { d: 'M4 20l9-9M13 11l3.5-6.5L20 8l-6.5 3.5z', fill: '#c9e6ff', ...stroke })],
    studio: [svg('path', { d: 'M12 3a6 6 0 0 0-3 11.2V17h6v-2.8A6 6 0 0 0 12 3z', fill: '#fff3b0', ...stroke }), svg('path', { d: 'M9.5 20.5h5', fill: 'none', ...stroke })],
    outfit: [svg('path', { d: 'M8 4l-5 4 3 3 2-1.5V20h8v-10.5L18 11l3-3-5-4a4 4 0 0 1-8 0z', fill: '#ffd6e5', ...stroke })],
    bulb: [svg('path', { d: 'M12 3a6 6 0 0 0-3 11.2V17h6v-2.8A6 6 0 0 0 12 3z', fill: '#fff3b0', ...stroke }), svg('path', { d: 'M9.5 20.5h5', fill: 'none', ...stroke })],
    heart: [svg('path', { d: 'M12 20S4 14.5 4 9a4.2 4.2 0 0 1 8-1.6A4.2 4.2 0 0 1 20 9c0 5.5-8 11-8 11z', fill: '#ff7aa8', ...stroke })],
  };
  return svg('svg', { viewBox: '0 0 24 24', 'aria-hidden': 'true', class: `app-icon app-icon--${name}` }, shapes[name] ?? []);
}

const PAINT = '#b9a6f0'; // the lilac "fresh colour" on the wall paint roller
const TRIM = '#f2a33a'; // the apron's orange trim (as comic-art.js OUTFITS.apron)

/**
 * One small cartoon icon per shop item (B40a), kept as plain shape data so a test can check it without a browser:
 * item id -> list of [svg tag, attributes, ink outline width (0 = no outline)], drawn in a 24 x 24 box in this order.
 * An item missing here (a future one) gets its tab's icon instead (tool, studio or outfit).
 */
export const ITEM_ICONS = {
  // two soft white square skin-care pads, one peeking out behind the other, the front one with a blue toner drop and a
  // pressed edge line (stacked pads with a drop do not read as a cookie, and differ from the round patch on its card)
  cottonPad: [
    ['rect', { x: 2.6, y: 3.6, width: 14.5, height: 14.5, rx: 4.2, fill: '#e9e0f2', transform: 'rotate(12 9.8 10.8)' }, 2],
    ['rect', { x: 5.6, y: 7, width: 15, height: 15, rx: 4.4, fill: '#ffffff', transform: 'rotate(-8 13.1 14.5)' }, 2.2],
    ['path', { d: 'M9 17.6a5 5 0 0 1-0.4-5.6', fill: 'none', stroke: '#cfc5e0' }, 1.1],
    ['path', { d: 'M18.8 1.2c1.2 1.7 2.2 2.8 2.2 4.1a2.2 2.2 0 0 1-4.4 0c0-1.3 1-2.4 2.2-4.1z', fill: '#7cc8f2' }, 1.4],
  ],
  // silver tweezers, tips a little apart, tilted
  tweezers: [
    ['path', { d: 'M10 2.8h4v2.6l2.4 14.8h-2.2L12 7.6l-2.2 12.6H7.6L10 5.4z', fill: '#c9e6ff', transform: 'rotate(28 12 12)' }, 2],
    ['path', { d: 'M10.2 5.4h3.6', fill: 'none', transform: 'rotate(28 12 12)' }, 1.4],
  ],
  // a peach nose strip (wide ends, narrow middle) with the black dots stuck on it
  noseStrip: [
    ['path', { d: 'M3 7.5Q12 11.5 21 7.5V16.5Q12 12.5 3 16.5Z', fill: '#f7c59f' }, 2.2],
    ['circle', { cx: 6.6, cy: 11.6, r: 1.05, fill: INK }, 0],
    ['circle', { cx: 9.3, cy: 12.8, r: 1.05, fill: INK }, 0],
    ['circle', { cx: 12, cy: 11.3, r: 1.05, fill: INK }, 0],
    ['circle', { cx: 14.7, cy: 12.8, r: 1.05, fill: INK }, 0],
    ['circle', { cx: 17.4, cy: 11.6, r: 1.05, fill: INK }, 0],
  ],
  // a round see-through sticker on its blue backing card, with a shine
  patch: [
    ['rect', { x: 4, y: 4, width: 16, height: 16, rx: 3.5, fill: '#c9e6ff', transform: 'rotate(-8 12 12)' }, 2.2],
    ['circle', { cx: 12, cy: 12, r: 5.2, fill: '#ffe9c4' }, 1.8],
    ['path', { d: 'M9.4 11a2.9 2.9 0 0 1 1.9-2', fill: 'none', stroke: '#ffffff' }, 1.5],
  ],
  // a folded orange cloth with steam curling up
  warmCloth: [
    ['path', { d: 'M8 12c-1.4-1.5 1.4-2.3 0-3.8s1.4-2.3 0-3.8M12 12c-1.4-1.5 1.4-2.3 0-3.8s1.4-2.3 0-3.8M16 12c-1.4-1.5 1.4-2.3 0-3.8s1.4-2.3 0-3.8', fill: 'none' }, 1.8],
    ['rect', { x: 3.5, y: 14, width: 17, height: 7.5, rx: 1.8, fill: '#ff9a6b' }, 2.2],
    ['path', { d: 'M3.8 17.6h16.4', fill: 'none' }, 1.5],
  ],
  // a blue rubber glove (her glove blue, comic-art.js GLOVE_BLUE) with a rolled cuff
  gloves: [
    ['path', { d: 'M7 21V17L4.6 13.6a1.4 1.4 0 0 1 2.3-1.6L8 13.4V5.6a1.3 1.3 0 0 1 2.6 0V11V4.4a1.3 1.3 0 0 1 2.6 0V11V5.2a1.3 1.3 0 0 1 2.6 0V11.6V7.4a1.3 1.3 0 0 1 2.6 0V15c0 3-1.4 6-3 6Z', fill: '#6fc3ef' }, 2],
    ['rect', { x: 6.2, y: 18.6, width: 9.8, height: 3.4, rx: 1.2, fill: '#bfe6fa' }, 1.8],
  ],
  // a ring light: a glowing ring with a phone in the middle, on a tripod stand
  lamp: [
    ['path', { d: 'M12 19.2V20.4M12 20.4L6.4 22.8M12 20.4V22.8M12 20.4l5.6 2.4', fill: 'none' }, 2],
    ['path', { d: 'M3 10.2a9 9 0 1 0 18 0a9 9 0 1 0-18 0zM6.6 10.2a5.4 5.4 0 1 0 10.8 0a5.4 5.4 0 1 0-10.8 0z', fill: '#ffe066', 'fill-rule': 'evenodd' }, 1.8],
    ['rect', { x: 10.5, y: 8, width: 3, height: 4.6, rx: 0.8, fill: '#ffffff' }, 1.2],
    ['path', { d: 'M5.4 6.8a7.2 7.2 0 0 1 2.6-2.4', fill: 'none', stroke: '#ffffff' }, 1.3],
  ],
  // a green plant in a pot that has two little watching eyes
  plant: [
    ['path', { d: 'M12 13C8 13 5 10 5 6c4 0 7 3 7 7zM12 13c4 0 7-3 7-7-4 0-7 3-7 7zM12 13c-2-2.5-2-6.5 0-9.5 2 3 2 7 0 9.5z', fill: '#7bd389' }, 1.8],
    ['path', { d: 'M6.3 13h11.4l-1.7 8.5H8z', fill: '#f08a5d' }, 2.2],
    ['circle', { cx: 10.3, cy: 17.2, r: 0.9, fill: INK }, 0],
    ['circle', { cx: 13.7, cy: 17.2, r: 0.9, fill: INK }, 0],
  ],
  // a grey pipe bend with a shiny new gold joint and a sparkle
  leakFix: [
    ['path', { d: 'M2 5.5h11a4.5 4.5 0 0 1 4.5 4.5v12h-4.2V10H2z', fill: '#c9d3dc' }, 2],
    ['rect', { x: 12.2, y: 12.2, width: 6.4, height: 3.6, rx: 1, fill: '#ffd23f' }, 1.8],
    ['path', { d: 'M6 13l1 2.4 2.4 1-2.4 1-1 2.4-1-2.4-2.4-1 2.4-1z', fill: '#ffffff' }, 1.4],
  ],
  // a mint salon chair: a padded back with two buttons, a seat and a single pedestal foot
  chair: [
    ['path', { d: 'M12 16V20M6.8 21.8h10.4', fill: 'none' }, 2.4],
    ['path', { d: 'M7.5 2.8h9a2.2 2.2 0 0 1 2.2 2.2V12.4h-13.4V5a2.2 2.2 0 0 1 2.2-2.2z', fill: '#5eead4' }, 2.2],
    ['rect', { x: 8, y: 4.6, width: 8, height: 5.2, rx: 2, fill: '#b5f5ea' }, 0],
    ['circle', { cx: 10.3, cy: 7.2, r: 1, fill: INK }, 0],
    ['circle', { cx: 13.7, cy: 7.2, r: 1, fill: INK }, 0],
    ['rect', { x: 3, y: 11.8, width: 18, height: 4.6, rx: 2.3, fill: '#5eead4' }, 2.2],
  ],
  // a paint roller dripping fresh lilac paint
  wallPaint: [
    ['path', { d: 'M17 6.5h2.5a1 1 0 0 1 1 1V12a1 1 0 0 1-1 1H12v3', fill: 'none' }, 2],
    ['path', { d: 'M6 9v3a1 1 0 0 0 2 0V9', fill: PAINT }, 1.6],
    ['rect', { x: 3, y: 3.5, width: 14, height: 6, rx: 3, fill: PAINT }, 2.2],
    ['rect', { x: 10, y: 15.5, width: 4, height: 6.5, rx: 1.6, fill: '#ff7aa8' }, 2],
  ],
  // a pink hanging sign with white "words" and a sparkle
  sign: [
    ['path', { d: 'M12 3L5.5 9M12 3l6.5 6', fill: 'none' }, 1.8],
    ['rect', { x: 2.5, y: 9, width: 19, height: 10.5, rx: 2.5, fill: '#ff7aa8' }, 2.2],
    ['path', { d: 'M6 12.8h7M15.6 12.8h2.4M6 15.8h12', fill: 'none', stroke: '#ffffff' }, 1.8],
    ['circle', { cx: 12, cy: 3, r: 1.3, fill: INK }, 0],
  ],
  // a cream apron with orange trim, ties and a pocket
  apron: [
    ['path', { d: 'M9 7V5.2a3 3 0 0 1 6 0V7M5.4 12.3L2.6 14.6M18.6 12.3l2.8 2.3', fill: 'none' }, 1.8],
    ['path', { d: 'M8 6.5h8V11l3 1.2-0.5 8.3a1.2 1.2 0 0 1-1.2 1H6.7a1.2 1.2 0 0 1-1.2-1L5 12.2 8 11z', fill: '#fff6e4' }, 2.2],
    ['path', { d: 'M5.6 18.8h12.8', fill: 'none', stroke: TRIM }, 1.8],
    ['rect', { x: 9.5, y: 13.6, width: 5, height: 3.4, rx: 1, fill: TRIM }, 1.6],
  ],
  // a teal V-neck scrubs top with short sleeves and a chest pocket
  scrubs: [
    ['path', { d: 'M8.5 3.5L3 6.5l1.8 4.5 2.7-1V21h9V10l2.7 1L21 6.5l-5.5-3L12 8.5z', fill: '#3fb6a8' }, 2.2],
    ['path', { d: 'M13.2 12.2h2.4V15h-2.4zM14.3 12.2v-1.5', fill: 'none' }, 1.5],
  ],
};

/**
 * The icon of one shop item: its own picture from ITEM_ICONS, or the tab's icon for an item that has none yet.
 * @param {string} id the shop item id (economy-data.js SHOP_ITEMS)
 * @param {'tool'|'studio'|'outfit'} fallback the tab's icon name, used when the item has no icon of its own
 * @returns {SVGElement} a 24 px svg (sized by CSS), hidden from screen readers (the card says the name)
 */
export function itemIcon(id, fallback) {
  const shapes = Object.hasOwn(ITEM_ICONS, id) ? ITEM_ICONS[id] : null;
  if (!shapes) return icon(fallback);
  const kids = shapes.map(([tag, attrs, width]) => svg(tag, {
    stroke: width ? INK : 'none', 'stroke-width': width || null, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', ...attrs,
  }));
  return svg('svg', { viewBox: '0 0 24 24', 'aria-hidden': 'true', class: `app-icon app-icon--item app-icon--${id}` }, kids);
}

/**
 * The shell every screen shares: a section element with its class, an optional label for screen readers, the
 * reduced-motion class and an abort signal so the screen can remove all its listeners at once.
 * @param {string} name screen name (title, menu, shop ...)
 * @param {{label?: string, reducedMotion?: boolean}} [opts] screen label and the player's reduced-motion setting
 * @returns {{node: HTMLElement, signal: AbortSignal, dispose: () => void}} the shell
 */
export function screenShell(name, { label, reducedMotion } = {}) {
  const ac = new AbortController();
  const node = el('section', `app-screen app-screen--${name}${reducedMotion ? ' app-still' : ''}`);
  if (label) node.setAttribute('aria-label', label);
  node.tabIndex = -1; // the game can park keyboard focus on the screen itself after a change (app.js show), so Tab starts at its first control
  return {
    node,
    signal: ac.signal,
    /** Remove the listeners and take the screen out of the page. @returns {void} */
    dispose() {
      ac.abort();
      node.remove();
    },
  };
}

/**
 * The top bar of a list-style screen: a Back button and the screen title.
 * @param {(key: string, vars?: object) => string} t the string function
 * @param {string} title the title text
 * @param {(() => void)|undefined} onBack called when Back is tapped
 * @param {AbortSignal} signal removes the listeners on dispose
 * @returns {HTMLElement} the header
 */
export function header(t, title, onBack, signal) {
  const head = el('header', 'app-head');
  const back = el('button', 'app-btn app-btn--round app-back');
  back.type = 'button';
  back.setAttribute('aria-label', t('ui.back'));
  back.appendChild(icon('back'));
  back.addEventListener('click', () => onBack?.(), { signal });
  // Escape works as Back (T6.1) unless the screen used it first (a confirm or a big picture closing); gone with the screen.
  document.addEventListener('keydown', (e) => { if (head.isConnected && escapeMeansBack(e)) { e.preventDefault(); onBack?.(); } }, { signal });
  head.append(back, el('h1', 'app-head__title', title));
  return head;
}

/**
 * A small rounded pill with a coin icon and a text next to it.
 * @param {string} text the text next to the coin
 * @param {string} [cls] extra class names
 * @returns {HTMLElement} a pill with a coin icon
 */
export function coinPill(text, cls = '') {
  const pill = el('span', `app-pill app-pill--coin ${cls}`.trim());
  pill.append(icon('coin'), el('span', 'app-pill__text', text));
  return pill;
}
