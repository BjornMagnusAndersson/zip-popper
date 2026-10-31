// The Master diploma (D34, owner 2026-10-28): when a kind of bump reaches the top mastery level (Master), a framed
// cartoon diploma shows after the result screen: the kind's picture on a gold rosette, "Master of the Whitehead", her
// name, a funny line from Greta and Nils for that kind, their signatures and a "Hang it up!" button (it then hangs on
// the studio's wall of fame, R8j, where a tap opens it again). Once per kind; the kind's card on the Field guide's
// "Pop mastery" tab keeps a gold ribbon. All text comes from the string table.

import { el, button, screenShell } from './dom.js';
import { drawPicture } from './guide.js';
import { makeFxLayer } from '../fx/fx-layer.js';
import { makeConfetti } from '../fx/confetti-fx.js';

/** When the diploma's confetti goes off, in seconds after the screen opens (SPEC D45 item 7). */
const DIPLOMA_CONFETTI_AT = 0.3;

/**
 * Build the diploma screen.
 * @param {{t: (key: string, vars?: object) => string, type: string, playerName?: string, onContinue?: () => void,
 *   buttonKey?: string, reducedMotion?: boolean, celebrate?: boolean, lowDetail?: boolean}} opts t = string function;
 *   type = the bump id she mastered; playerName = her name; onContinue = the button; buttonKey = its label ("Hang it
 *   up!" for a new Master, "Back to the studio" when read again from the wall of fame, R8j); celebrate = a new Master:
 *   confetti over the screen (D45; a few still pieces at the edges with reduced motion); lowDetail = Lighter graphics
 *   (about half the confetti)
 * @returns {{node: HTMLElement, dispose: () => void, fxState: () => object|null}} the screen; fxState = for checks
 */
export function createDiplomaScreen({
  t, type, playerName = '', onContinue, buttonKey = 'ui.diploma.continue', reducedMotion = false, celebrate = false, lowDetail = false,
}) {
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
    button('app-btn app-btn--main app-btn--big', t(buttonKey), () => onContinue?.(), shell.signal),
  );
  body.append(card);
  shell.node.append(body);
  // A new Master: confetti over the screen (taps go through the layer); stopped when the screen closes.
  const layer = celebrate ? makeFxLayer(shell.node, { lite: lowDetail, className: 'app-fx app-diploma__fx' }) : null;
  let confetti = null;
  if (layer && reducedMotion) {
    requestAnimationFrame(() => layer.still((c, W, H) => makeConfetti({ kit: layer.kit, kind: 'confetti', W, H, lite: lowDetail, still: true, seed: 23 }).paintStill(c, W, H)));
  } else if (layer) {
    layer.add((W, H) => (confetti = makeConfetti({ kit: layer.kit, kind: 'confetti', W, H, lite: lowDetail, seed: 23 })), DIPLOMA_CONFETTI_AT);
  }
  return {
    node: shell.node,
    /** Stop the confetti and remove the screen. @returns {void} */
    dispose() { layer?.dispose(); shell.dispose(); },
    /** The confetti, for checks. @returns {object|null} state */
    fxState: () => (layer ? { busy: layer.busy(), confetti: confetti?.state() ?? null } : null),
  };
}
