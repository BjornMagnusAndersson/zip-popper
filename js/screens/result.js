// The result screen (T3.1a): 0 to 3 cartoon stars, the coin breakdown (pops, tip, combo, request, total), the reputation
// change, an info-card fact and a Continue button. A fail variant (the customer stormed off) shows "Try again" and
// "Next customer" with the reputation cost of skipping. Numbers come from economy.js roundPayout; this file only draws.
// T8.2: an optional before and after card (screens/reveal.js) goes on top, beside the stars.
// D34: under the customer's line, "Level up!" for a kind of bump that went up a mastery level, or how many clean pops
// the closest kind still needs.

import { el, button, starIcon, icon, coinPill, screenShell } from './dom.js';
import { starStates, coinRows, resultTitleKey, reputationLine } from './screen-logic.js';
import { drawPinJarPicture } from '../pop/backdrop.js';
import { pinsDrawn } from '../game/pin-jar.js';

/** How the pin drops into the jar on the result card (owner 2026-10-29): a short wait, then the fall, in ms. */
const PIN_DROP = { wait: 500, fall: 650 };
/** The running pin-drop animation frame (one result screen at a time), so dispose can stop it. */
let jarFrame = 0;

/**
 * The little pin jar picture for the "Pin taken away!" line: the jar with the pins in it, and the new pin dropping in
 * while the lid hovers (reduced motion: the jar as it ends up, no fall).
 * @param {number} count pins in the jar now (the new one included)
 * @param {boolean} still true = reduced motion
 * @returns {HTMLCanvasElement} the picture (decorative: the line beside it says it in words)
 */
function pinJarPicture(count, still) {
  const W = 34;
  const H = 52;
  const dpr = Math.min(3, window.devicePixelRatio || 1);
  const c = el('canvas', 'app-result__jar');
  c.width = W * dpr;
  c.height = H * dpr;
  c.setAttribute('aria-hidden', 'true');
  const ctx = c.getContext('2d');
  const n = pinsDrawn(count);
  /** Draw the jar with the newest pin this far down. @param {number} drop 0..1 @returns {void} */
  const draw = (drop) => {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    drawPinJarPicture(ctx, W, H, n, drop);
  };
  if (still) { draw(1); return c; }
  draw(0);
  const start = performance.now();
  /** One animation step. @param {number} now time in ms @returns {void} */
  const step = (now) => {
    const drop = Math.min(1, Math.max(0, (now - start - PIN_DROP.wait) / PIN_DROP.fall));
    draw(drop);
    if (drop < 1) jarFrame = requestAnimationFrame(step);
  };
  cancelAnimationFrame(jarFrame);
  jarFrame = requestAnimationFrame(step);
  return c;
}

/**
 * The kinds' names as one phrase: "whiteheads", "whiteheads and red bumps", "whiteheads, red bumps and blackheads".
 * @param {string[]} keys the string keys of the kinds' names
 * @param {(key: string, vars?: object) => string} t string function
 * @returns {string} the phrase ('' for none)
 */
function kindList(keys, t) {
  const names = keys.map((k) => t(k));
  if (names.length < 2) return names.join('');
  return t('ui.skill.kindList', { list: names.slice(0, -1).join(', '), last: names[names.length - 1] });
}

/**
 * Build the result screen.
 * @param {{t: (key: string, vars?: object) => string, stars?: number, failed?: boolean,
 *   payout?: {popCoins?: number, tip?: number, combo?: number, requestBonus?: number, total?: number},
 *   reputationChange?: number, skipPenalty?: number, factKey?: string, reactionKey?: string, playerName?: string,
 *   onContinue?: () => void, onShop?: () => void, onTryAgain?: () => void, onNext?: () => void, reducedMotion?: boolean,
 *   tagKey?: string|null, tagVars?: object|null, reveal?: {node: HTMLElement, dispose?: () => void}|null,
 *   stampKey?: string|null, skills?: ReturnType<typeof import('../game/app-logic.js').skillNews>, pinCount?: number|null}} opts
 *   t = string function; stars = 0 to 3; failed = the customer stormed off; payout = from roundPayout; reputationChange =
 *   points earned (not failed); skipPenalty = reputation "Next customer" costs (failed); factKey = info-card string key;
 *   reactionKey = what the customer says (a resultKeys string key); playerName = for the {name} in that line;
 *   onContinue = Continue; onShop = an optional "Shop" button beside Continue; onTryAgain / onNext = the two fail choices;
 *   tagKey + tagVars = an optional small line under the stars (Keep working's reduced pay, T5.4);
 *   reveal = the before and after card (T8.2, screens/reveal.js createReveal) shown as the top card, or null;
 *   stampKey = the name key of a finished boss or event (T8.4): a gold "New stamp!" line under the coins, or null;
 *   skills = the skill lines (app-logic.js skillNews, D34): level ups, or how many clean pops the next level needs;
 *   pinCount = after a pin visit (game/pin-jar.js), the pins now in the jar: a "Pin taken away!" line; null = none
 * @returns {{node: HTMLElement, dispose: () => void}} the screen
 */
export function createResultScreen({
  t, stars = 0, failed = false, payout, reputationChange = 0, skipPenalty = 0, factKey, reactionKey, playerName = '',
  onContinue, onShop, onTryAgain, onNext, reducedMotion = false, tagKey = null, tagVars = null, reveal = null, stampKey = null,
  skills = [], pinCount = null,
}) {
  const shell = screenShell('result', { label: t(resultTitleKey({ stars, failed })), reducedMotion });
  if (failed) shell.node.classList.add('app-result--fail');
  const body = el('div', `app-body app-result${reveal ? ' app-result--reveal' : ''}`);
  if (reveal) body.append(reveal.node); // the before and after card first (T8.2)

  const top = el('div', 'app-result__top');
  if (failed) top.append(el('p', 'app-huff', t('ui.result.fail.huff')));
  top.append(el('h1', 'app-result__title', t(resultTitleKey({ stars, failed }))));
  const starRow = el('div', 'app-stars');
  starRow.setAttribute('role', 'img');
  starRow.setAttribute('aria-label', t('ui.result.stars', { n: failed ? 0 : stars }));
  starStates(failed ? 0 : stars).forEach((on, i) => {
    const s = el('span', `app-star${on ? ' app-star--on' : ''}`);
    s.style.setProperty('--i', String(i));
    s.append(starIcon(on, 72));
    starRow.append(s);
  });
  top.append(starRow);
  if (tagKey) top.append(el('p', 'app-result__tag', t(tagKey, tagVars ?? {}))); // e.g. "Keep working pay: 60%" (T5.4)

  const left = el('div', 'app-result__left');
  const main = el('div', 'app-result__right');
  if (failed) {
    main.append(el('p', 'app-result__text', t('ui.result.fail.text')));
  } else {
    if (payout) { // no payout = a round before the studio opens (chapters 0 to 4, SPEC D32h): no coin card
      const coins = el('div', 'app-card app-coins');
      coins.setAttribute('role', 'table');
      coins.setAttribute('aria-label', t('ui.result.coins'));
      for (const row of coinRows(payout)) {
        const line = el('div', `app-coins__row${row.id === 'total' ? ' app-coins__row--total' : ''}`);
        line.setAttribute('role', 'row');
        line.append(el('span', 'app-coins__label', t(row.key)), coinPill(String(row.amount)));
        coins.append(line);
      }
      main.append(coins);
    }
    if (stampKey) { // a finished boss or event (T8.4): its stamp went into the Face album
      const stamp = el('p', 'app-result__stamp');
      stamp.append(starIcon(true, 24), el('span', '', t('ui.result.stamp', { name: t(stampKey) })));
      main.append(stamp);
    }
    if (pinCount) { // a pin visit (owner 2026-10-28): she took the customer's pin from home away, into the jar
      const pin = el('p', 'app-result__stamp app-result__pin');
      pin.append(pinJarPicture(pinCount, reducedMotion), el('span', '', t('ui.pin.taken', { n: pinCount })));
      main.append(pin);
    }
    if (reactionKey) main.append(el('p', 'app-result__quote', t(reactionKey, { name: playerName })));
    for (const line of skills) { // D34: "Level up! Whitehead: level 3" or "Red bump: 4 more clean pops to level 2"
      const news = el('div', `app-skillnews${line.up ? ' app-skillnews--up' : ''}`);
      const words = el('p', 'app-skillnews__text', t(line.key, {
        ...line.vars, kind: t(line.kindKey), levelName: t(line.levelKey), kinds: kindList(line.kindKeys ?? [], t),
      }));
      news.append(line.up ? starIcon(true, 24) : icon('bulb'), words);
      if (!line.up && typeof line.share === 'number') {
        const bar = el('span', 'app-skillcard__bar app-skillnews__bar');
        bar.setAttribute('aria-hidden', 'true');
        const fill = el('span', 'app-skillcard__fill');
        fill.style.width = `${Math.round(line.share * 100)}%`;
        bar.append(fill);
        news.append(bar);
      }
      main.append(news);
    }
  }
  const rep = reputationLine({ failed, reputationChange, skipPenalty });
  if (rep) {
    const pill = el('p', `app-rep${failed ? ' app-rep--cost' : ''}`);
    pill.append(icon('heart'), el('span', 'app-rep__text', t(rep.key, rep.vars)));
    main.append(pill);
  }
  if (!failed && factKey) {
    const fact = el('div', 'app-card app-fact');
    fact.append(icon('bulb'), el('p', 'app-fact__text', t(factKey)));
    left.append(fact);
  }

  const actions = el('div', 'app-actions');
  if (failed) {
    actions.append(
      button('app-btn app-btn--main', t('ui.result.again'), () => onTryAgain?.(), shell.signal),
      button('app-btn', t('ui.result.next'), () => onNext?.(), shell.signal),
    );
  } else {
    actions.append(button('app-btn app-btn--main app-btn--big', t('ui.result.continue'), () => onContinue?.(), shell.signal));
    if (onShop) actions.append(button('app-btn', t('ui.result.shop'), () => onShop(), shell.signal));
  }
  main.append(actions);
  left.prepend(top);
  body.append(left, main);
  shell.node.append(body);
  /** Stop the reveal (if any) and remove the screen. @returns {void} */
  const dispose = () => { reveal?.dispose?.(); cancelAnimationFrame(jarFrame); shell.dispose(); };
  return { node: shell.node, dispose };
}
