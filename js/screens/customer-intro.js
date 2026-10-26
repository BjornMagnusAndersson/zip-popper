// The customer intro (T3.1a): who is in the chair, their one-line story (with the player's name filled in), an optional
// deadline joke, the request if they have one, and a Start button. The customer comes in as string keys (the same keys
// data/customers.js and data/chapters.js hold); the request as {key, vars} (requests.js describeRequest).

import { el, button, icon, screenShell } from './dom.js';

/**
 * Build the customer intro.
 * @param {{t: (key: string, vars?: object) => string, customer: {nameKey: string, introKey: string, deadlineKey?: string},
 *   playerName?: string, request?: {key: string, vars?: object}|null, step?: {n: number, total: number}|null,
 *   portrait?: HTMLElement|null, hintKey?: string|null, onStart?: () => void, onMenu?: () => void, reducedMotion?: boolean}} opts
 *   t = string function; customer = the customer's string keys; playerName = for the {name} in the story; request = what
 *   they ask for, or null; step = "customer n of total" or null; portrait = an optional picture (a canvas, say) the game
 *   draws for the customer; hintKey = an optional tip line (a string key, such as the "buy tweezers" hint);
 *   onStart = the Start button; onMenu = an optional small "Menu" button (back to the main menu)
 * @returns {{node: HTMLElement, dispose: () => void}} the screen
 */
export function createCustomerIntroScreen({
  t, customer, playerName = '', request = null, step = null, portrait = null, hintKey = null, onStart, onMenu, reducedMotion = false,
}) {
  const name = t(customer.nameKey);
  const shell = screenShell('intro', { label: name, reducedMotion });
  const body = el('div', 'app-body app-intro');
  const left = el('div', 'app-intro__who');
  if (step) left.append(el('p', 'app-intro__step', t('ui.intro.step', { n: step.n, total: step.total })));
  if (portrait) {
    const frame = el('div', 'app-intro__portrait');
    frame.append(portrait);
    left.append(frame);
  }
  left.append(el('h1', 'app-intro__name', name));

  const right = el('div', 'app-intro__what');
  const bubble = el('div', 'app-card app-bubble');
  bubble.append(el('p', 'app-bubble__text', t(customer.introKey, { name: playerName })));
  if (customer.deadlineKey) bubble.append(el('p', 'app-bubble__deadline', t(customer.deadlineKey, { name: playerName })));
  right.append(bubble);
  if (request) {
    const note = el('div', 'app-note');
    note.append(el('p', 'app-note__label', t('ui.intro.request')), el('p', 'app-note__text', t(request.key, request.vars ?? {})));
    right.append(note);
  }
  if (hintKey) {
    const hint = el('p', 'app-intro__hint');
    hint.append(icon('bulb'), el('span', '', t(hintKey)));
    right.append(hint);
  }
  right.append(button('app-btn app-btn--main app-btn--big app-intro__start', t('ui.intro.start'), () => onStart?.(), shell.signal));
  if (onMenu) right.append(button('app-btn app-btn--small app-intro__menu', t('ui.intro.menu'), () => onMenu(), shell.signal));
  body.append(left, right);
  shell.node.append(body);
  return { node: shell.node, dispose: shell.dispose };
}
