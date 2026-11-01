// The install hint pieces (SPEC D52): the small card on the menu (iPhone and iPad Safari: a Share icon and "tap Share,
// then Add to Home Screen"; Android and Chrome: an Install button for the browser's own prompt; an app's built-in
// browser such as Snapchat or Instagram: "open this page in Safari or Chrome first"; all with "Not now"),
// and the "Install the game" card on the About screen, which explains the same at any time. Which card shows is
// decided in core/install-logic.js; this file only draws. All text comes from the string table.

import { el, svg, button, INK } from './dom.js';

/**
 * A cartoon Share icon (the square with an arrow going up out of it, as on iPhone and iPad).
 * @returns {SVGElement} a 24 px svg (sized by CSS), hidden from screen readers (the text says "Share")
 */
export function shareIcon() {
  const line = { fill: 'none', stroke: INK, 'stroke-width': 2.6, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' };
  return svg('svg', { viewBox: '0 0 24 24', 'aria-hidden': 'true', class: 'app-icon app-icon--share' }, [
    svg('path', { d: 'M8.5 9.5H6.8a1.8 1.8 0 0 0-1.8 1.8v8a1.8 1.8 0 0 0 1.8 1.8h10.4a1.8 1.8 0 0 0 1.8-1.8v-8a1.8 1.8 0 0 0-1.8-1.8h-1.7', ...line, fill: '#c9e6ff' }),
    svg('path', { d: 'M12 14.5V2.8M8.4 6.2L12 2.6l3.6 3.6', ...line }),
  ]);
}

/**
 * A cartoon "install" icon (a phone with a down arrow), for the Android card and the About card.
 * @returns {SVGElement} a 24 px svg (sized by CSS), hidden from screen readers
 */
export function installIcon() {
  const line = { fill: 'none', stroke: INK, 'stroke-width': 2.4, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' };
  return svg('svg', { viewBox: '0 0 24 24', 'aria-hidden': 'true', class: 'app-icon app-icon--install' }, [
    svg('rect', { x: 6, y: 2.5, width: 12, height: 19, rx: 2.6, ...line, fill: '#ffd6e5' }),
    svg('path', { d: 'M12 7v7M9 11.2l3 3 3-3M10.4 18.6h3.2', ...line }),
  ]);
}

/**
 * The menu's install card.
 * @param {{t: (key: string, vars?: object) => string, mode: 'ios'|'android'|'inapp', signal: AbortSignal,
 *   onInstall?: () => void, onDismiss?: () => void}} o t = string function; mode = which card; signal = removes the
 *   listeners when the screen goes; onInstall = the Install button (Android); onDismiss = "Not now"
 * @returns {HTMLElement} the card
 */
export function createInstallCard({ t, mode, signal, onInstall, onDismiss }) {
  const card = el('aside', `app-install app-install--${mode}`);
  card.setAttribute('aria-label', t('ui.install.label'));
  const pic = el('span', 'app-install__pic');
  pic.append(mode === 'ios' ? shareIcon() : installIcon());
  const textKey = { ios: 'ui.install.ios', inapp: 'ui.install.inapp' }[mode] ?? 'ui.install.android';
  const text = el('p', 'app-install__text', t(textKey));
  const row = el('div', 'app-install__row');
  if (mode === 'android') row.append(button('app-btn app-btn--small app-btn--main app-install__go', t('ui.install.button'), () => onInstall?.(), signal));
  row.append(button('app-btn app-btn--small app-install__later', t('ui.install.notNow'), () => onDismiss?.(), signal));
  card.append(pic, text, row);
  return card;
}

/**
 * The About screen's "Install the game" card: what to do on this phone, or that it is already installed.
 * @param {{t: (key: string, vars?: object) => string, mode: 'installed'|'ios'|'iosOther'|'inapp'|'android'|'other', signal: AbortSignal,
 *   onInstall?: () => void}} o t = string function; mode = core/install-logic.js aboutInstallMode; signal = removes the
 *   listeners; onInstall = the Install button (only when the browser's prompt is waiting)
 * @returns {HTMLElement} the card
 */
export function createInstallHelp({ t, mode, signal, onInstall }) {
  const card = el('section', 'app-card app-setcard app-installhelp');
  const head = el('h2', 'app-setcard__title app-with-icon');
  head.append(mode === 'ios' || mode === 'iosOther' ? shareIcon() : installIcon(), el('span', '', t('ui.about.install.title')));
  card.append(head, el('p', 'app-about__text', t(`ui.about.install.${mode}`)));
  if (mode === 'android') card.append(button('app-btn app-btn--main', t('ui.install.button'), () => onInstall?.(), signal));
  return card;
}
