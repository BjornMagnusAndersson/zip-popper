// The Master diploma (D34, owner 2026-10-28): when a kind of bump reaches the top mastery level (Master), a framed
// cartoon diploma shows after the result screen: the kind's picture on a gold rosette, "Master of the Whitehead", her
// name, a funny line from Greta and Nils for that kind, their signatures and a Continue button. Once per kind; the
// kind's card on the Field guide's "Pop mastery" tab keeps a gold ribbon. All text comes from the string table.

import { el, button, screenShell } from './dom.js';
import { drawPicture } from './guide.js';

/**
 * Build the diploma screen.
 * @param {{t: (key: string, vars?: object) => string, type: string, playerName?: string, onContinue?: () => void,
 *   reducedMotion?: boolean}} opts t = string function; type = the bump id she mastered; playerName = her name;
 *   onContinue = the Continue button
 * @returns {{node: HTMLElement, dispose: () => void}} the screen
 */
export function createDiplomaScreen({ t, type, playerName = '', onContinue, reducedMotion = false }) {
  const kind = t(`ui.guide.${type}.name`);
  const shell = screenShell('diploma', { label: t('ui.diploma.title', { kind }), reducedMotion });
  const body = el('div', 'app-body app-body--center app-diploma');
  const card = el('div', 'app-diploma__card');
  const rosette = el('div', 'app-diploma__rosette');
  const art = drawPicture(type, Math.min(2, globalThis.devicePixelRatio || 1));
  art.className = 'app-diploma__art';
  art.setAttribute('role', 'img');
  art.setAttribute('aria-label', t('ui.guide.picture', { name: kind }));
  rosette.append(art);
  card.append(
    el('p', 'app-diploma__head', t('ui.diploma.head')),
    rosette,
    el('h1', 'app-diploma__title', t('ui.diploma.title', { kind })),
    el('p', 'app-diploma__name', t('ui.diploma.awarded', { name: playerName || t('ui.diploma.noName') })),
    el('p', 'app-diploma__line', t(`ui.diploma.${type}`)),
    el('p', 'app-diploma__speed', t('ui.diploma.speed')),
    el('p', 'app-diploma__sign', t('ui.diploma.signed')),
    button('app-btn app-btn--main app-btn--big', t('ui.diploma.continue'), () => onContinue?.(), shell.signal),
  );
  body.append(card);
  shell.node.append(body);
  return { node: shell.node, dispose: shell.dispose };
}
