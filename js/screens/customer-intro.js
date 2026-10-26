// The customer intro (T3.1a): who is in the chair, their one-line story (with the player's name filled in), an optional
// deadline joke, the request if they have one, and a Start button. The customer comes in as string keys (the same keys
// data/customers.js and data/chapters.js hold); the request as {key, vars} (requests.js describeRequest).

import { el, button, icon, screenShell } from './dom.js';

/**
 * Build the customer intro.
 * @param {{t: (key: string, vars?: object) => string, customer: {nameKey: string, introKey: string, deadlineKey?: string},
 *   playerName?: string, request?: {key: string, vars?: object, labelKey?: string}|null,
 *   step?: {n: number, total?: number, key?: string, vars?: object}|null,
 *   portrait?: HTMLElement|null, hintKey?: string|null,
 *   twist?: {nameKey: string, lineKey: string, lineVars?: object, hintKey?: string|null}|null,
 *   boss?: {labelKey: string, nameKey: string, lineKey: string, rewardKey?: string, hintKey?: string|null}|null,
 *   onStart?: () => void, onMenu?: () => void, reducedMotion?: boolean}} opts
 *   t = string function; customer = the customer's string keys; playerName = for the {name} in the story; request = what
 *   they ask for, or null; step = "customer n of total" or null (step.key + step.vars = another line in that pill,
 *   such as Keep working's "Keep working: customer n", T5.4); portrait = an optional picture (a canvas, say) the game
 *   draws for the customer; hintKey = an optional tip line (a string key, such as the "buy tweezers" hint);
 *   onStart = the Start button; onMenu = an optional small "Menu" button (back to the main menu); twist = the
 *   customer's twist as string keys (data/twists.js describeTwist, T8.3), shown as a pill above the request, or null
 *   (lineVars = the {placeholders} of its line: the hurry twist shows the hurry request's line with its seconds);
 *   boss = a boss or event customer (data/bosses.js describeBoss, T8.4): a gold pill in the twist's place with
 *   "Event" or "Boss", its name, a funny line, the reward and a tip (a boss has no twist and no request)
 * @returns {{node: HTMLElement, dispose: () => void}} the screen
 */
export function createCustomerIntroScreen({
  t, customer, playerName = '', request = null, step = null, portrait = null, hintKey = null, twist = null, boss = null, onStart, onMenu,
  reducedMotion = false,
}) {
  const name = t(customer.nameKey);
  const shell = screenShell('intro', { label: name, reducedMotion });
  const body = el('div', 'app-body app-intro');
  const left = el('div', 'app-intro__who');
  if (step) left.append(el('p', 'app-intro__step', t(step.key ?? 'ui.intro.step', { n: step.n, total: step.total, ...(step.vars ?? {}) })));
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
  if (twist) { // the customer's twist (T8.3): "Twist: Ticklish", its funny line and a tip
    const pill = el('div', 'app-twist');
    const head = el('p', 'app-twist__head');
    head.append(el('span', 'app-twist__label', t('ui.intro.twist')), el('span', 'app-twist__name', t(twist.nameKey)));
    pill.append(head, el('p', `app-twist__line${twist.lineVars ? ' app-twist__line--request' : ''}`, t(twist.lineKey, twist.lineVars ?? {})));
    if (twist.hintKey) {
      const tip = el('p', 'app-twist__tip');
      tip.append(icon('bulb'), el('span', '', t(twist.hintKey)));
      pill.append(tip);
    }
    right.append(pill);
  }
  if (boss) { // a boss or event customer (T8.4): "EVENT Hair Day", its line, the reward and a tip, in gold
    const pill = el('div', 'app-twist app-twist--boss');
    const head = el('p', 'app-twist__head');
    head.append(el('span', 'app-twist__label', t(boss.labelKey)), el('span', 'app-twist__name', t(boss.nameKey)));
    pill.append(head, el('p', 'app-twist__line', t(boss.lineKey, { name: playerName })));
    if (boss.rewardKey) pill.append(el('p', 'app-twist__reward', t(boss.rewardKey)));
    if (boss.hintKey) {
      const tip = el('p', 'app-twist__tip');
      tip.append(icon('bulb'), el('span', '', t(boss.hintKey)));
      pill.append(tip);
    }
    right.append(pill);
  }
  if (request) {
    const note = el('div', 'app-note');
    // request.labelKey = another label for the box (the daily challenge's goal, T8.5); else "Special request".
    note.append(el('p', 'app-note__label', t(request.labelKey ?? 'ui.intro.request')), el('p', 'app-note__text', t(request.key, request.vars ?? {})));
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
