// PLACEHOLDER (T3.1c) for the two small special modes inside the story: chapter 1 "torchlight" (T4.5 replaces this)
// and chapter 4 "phoneScroll" (T4.6 replaces this). Shows the chapter title, "Coming soon" and a Continue button
// that lets the story go on. State comes in, the tap goes out through a callback: no saving here.

import { el, button, screenShell } from './dom.js';
import { mascotArt } from './mascot.js';

/**
 * Build the "coming soon" screen of a special mode.
 * @param {{t: (key: string, vars?: object) => string, titleKey?: string, onContinue?: () => void, reducedMotion?: boolean}} opts
 *   t = string function; titleKey = the chapter title key; onContinue = Continue was tapped
 * @returns {{node: HTMLElement, dispose: () => void}} the screen
 */
export function createSpecialScreen({ t, titleKey, onContinue, reducedMotion = false }) {
  const shell = screenShell('special', { label: t('ui.special.title'), reducedMotion });
  const body = el('div', 'app-body app-body--center app-special');
  const card = el('div', 'app-card app-special__card');
  const art = el('div', 'app-special__art');
  art.append(mascotArt());
  if (titleKey) card.append(el('p', 'app-special__chapter', t(titleKey)));
  card.append(
    el('h1', 'app-special__title', t('ui.special.title')),
    el('p', 'app-special__text', t('ui.special.text')),
  );
  const go = button('app-btn app-btn--main app-btn--big', t('ui.special.continue'), () => onContinue?.(), shell.signal);
  card.append(go);
  body.append(art, card);
  shell.node.append(body);
  requestAnimationFrame(() => go.focus({ preventScroll: true }));
  return { node: shell.node, dispose: shell.dispose };
}
