// The About screen (T3.1a): the "this is a cartoon, not medical advice" line (SPEC section 1) and a credits placeholder.

import { el, icon, header, screenShell } from './dom.js';
import { mascotArt } from './mascot.js';
import { VERSION } from '../core/version.js';

/**
 * Build the About screen.
 * @param {{t: (key: string, vars?: object) => string, onBack?: () => void, reducedMotion?: boolean}} opts
 *   t = string function; onBack = Back
 * @returns {{node: HTMLElement, dispose: () => void}} the screen
 */
export function createAboutScreen({ t, onBack, reducedMotion = false }) {
  const shell = screenShell('about', { label: t('ui.about.title'), reducedMotion });
  const head = header(t, t('ui.about.title'), onBack, shell.signal);
  const body = el('div', 'app-body app-about');
  const art = el('div', 'app-about__art');
  art.append(mascotArt());
  const note = el('section', 'app-card app-setcard');
  const noteHead = el('h2', 'app-setcard__title app-with-icon');
  noteHead.append(icon('heart'), el('span', '', t('ui.about.cartoon.title')));
  note.append(noteHead, el('p', 'app-about__text', t('ui.about.disclaimer')));
  const credits = el('section', 'app-card app-setcard');
  credits.append(el('h2', 'app-setcard__title', t('ui.about.credits.title')), el('p', 'app-about__text', t('ui.about.credits.text')));
  credits.append(el('p', 'app-about__version', t('ui.about.version', { version: VERSION })));
  body.append(art, note, credits);
  shell.node.append(head, body);
  return { node: shell.node, dispose: shell.dispose };
}
