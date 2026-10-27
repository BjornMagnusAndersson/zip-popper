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
