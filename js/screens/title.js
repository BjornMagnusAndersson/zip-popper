// The title screen (T3.1a): the game's name, a smiling cartoon mascot, "Tap to start" (the whole picture is the button)
// and a small About button in the corner. State comes in, every action goes out through a callback: no saving here.

import { el, button, screenShell } from './dom.js';
import { mascotArt } from './mascot.js';

/**
 * Build the title screen.
 * @param {{t: (key: string, vars?: object) => string, onStart?: () => void, onAbout?: () => void, reducedMotion?: boolean}} opts
 *   t = string function; onStart = the player tapped to start; onAbout = the About button; reducedMotion = still version
 * @returns {{node: HTMLElement, dispose: () => void}} the screen
 */
export function createTitleScreen({ t, onStart, onAbout, reducedMotion = false }) {
  const shell = screenShell('title', { label: t('ui.title.name'), reducedMotion });
  const tap = el('button', 'app-title__tap');
  tap.type = 'button';
  tap.addEventListener('click', () => onStart?.(), { signal: shell.signal });
  const art = el('div', 'app-title__art');
  art.append(mascotArt());
  const words = el('div', 'app-title__words');
  words.append(
    el('h1', 'app-title__name', t('ui.title.name')),
    el('p', 'app-title__tagline', t('ui.title.tagline')),
    el('span', 'app-title__start', t('ui.title.start')),
  );
  tap.append(art, words);
  const about = button('app-btn app-btn--small app-title__about', t('ui.title.about'), () => onAbout?.(), shell.signal);
  shell.node.append(tap, about);
  return { node: shell.node, dispose: shell.dispose };
}
