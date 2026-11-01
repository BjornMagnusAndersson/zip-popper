// The About screen (T3.1a): the "this is a cartoon, not medical advice" line (SPEC section 1) and a credits placeholder.
// SPEC D52: also "Install the game" (what to do on this phone, any time) and "Send feedback", when the game passes them.

import { el, icon, button, header, screenShell } from './dom.js';
import { createInstallHelp } from './install-card.js';
import { mascotArt } from './mascot.js';
import { VERSION } from '../core/version.js';

/**
 * Build the About screen.
 * @param {{t: (key: string, vars?: object) => string, onBack?: () => void, reducedMotion?: boolean, onFeedback?: () => void,
 *   installMode?: string|null, onInstall?: () => void}} opts
 *   t = string function; onBack = Back; onFeedback = the "Send feedback" button (left out = no card); installMode = what
 *   the "Install the game" card says (core/install-logic.js aboutInstallMode; null = no card); onInstall = its Install button
 * @returns {{node: HTMLElement, dispose: () => void}} the screen
 */
export function createAboutScreen({ t, onBack, reducedMotion = false, onFeedback, installMode = null, onInstall }) {
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
  // "Version 110", not "Version v110" (C17): the version id starts with a v
  credits.append(el('p', 'app-about__version', t('ui.about.version', { version: String(VERSION).replace(/^v/i, '') })));
  body.append(art, note);
  if (onFeedback) { // SPEC D52: the feedback form, also from here
    const fb = el('section', 'app-card app-setcard');
    fb.append(el('h2', 'app-setcard__title', t('ui.about.feedback.title')), el('p', 'app-about__text', t('ui.about.feedback.text')),
      button('app-btn app-btn--main', t('ui.menu.feedback'), () => onFeedback(), shell.signal));
    body.append(fb);
  }
  if (installMode) body.append(createInstallHelp({ t, mode: installMode, signal: shell.signal, onInstall }));
  body.append(credits);
  shell.node.append(head, body);
  return { node: shell.node, dispose: shell.dispose };
}
