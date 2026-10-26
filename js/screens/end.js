// The "To be continued" screen (T3.1c): the end of version 1, after the teaser strip of chapter 5. A thank-you line
// with the player's name (plain text) and a button back to the main menu.

import { el, button, screenShell } from './dom.js';
import { mascotArt } from './mascot.js';

/**
 * Build the end screen.
 * @param {{t: (key: string, vars?: object) => string, textKey?: string, playerName?: string, onMenu?: () => void,
 *   reducedMotion?: boolean}} opts t = string function; textKey = the headline key (chapter.toBeContinued);
 *   playerName = for the thank-you line; onMenu = Back to menu was tapped
 * @returns {{node: HTMLElement, dispose: () => void}} the screen
 */
export function createEndScreen({ t, textKey = 'chapter.toBeContinued', playerName = '', onMenu, reducedMotion = false }) {
  const shell = screenShell('end', { label: t(textKey), reducedMotion });
  const body = el('div', 'app-body app-body--center app-end');
  const art = el('div', 'app-end__art');
  art.append(mascotArt());
  const card = el('div', 'app-card app-end__card');
  card.append(
    el('h1', 'app-end__title', t(textKey)),
    el('p', 'app-end__thanks', t('ui.end.title', { name: playerName || t('name.default') })),
    el('p', 'app-end__text', t('ui.end.text')),
    button('app-btn app-btn--main app-btn--big', t('ui.end.menu'), () => onMenu?.(), shell.signal),
  );
  body.append(art, card);
  shell.node.append(body);
  return { node: shell.node, dispose: shell.dispose };
}
