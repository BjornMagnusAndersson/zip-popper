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
import { makeFxLayer } from '../fx/fx-layer.js';
import { makeConfetti } from '../fx/confetti-fx.js';
import { makeCoinFlight } from '../fx/coins-fx.js';
import { makeHeartPuff } from '../fx/heart-puff-fx.js';
import { RESULT_FX, HEART_PUFF, celebration, coinCounter, pinDropWait } from '../fx/celebrate-logic.js';

/** How the pin drops into the jar on the result card (owner 2026-10-29): the fall, in ms (the wait before it: celebrate-logic.js pinDropWait). */
const PIN_DROP = { fall: 650 };
/** The running pin-drop animation frame (one result screen at a time), so dispose can stop it. */
let jarFrame = 0;

/**
 * The little pin jar picture for the "Pin taken away!" line: the jar with the pins in it, and the new pin dropping in
 * while the lid hovers (reduced motion: the jar as it ends up, no fall).
 * @param {number} count pins in the jar now (the new one included)
 * @param {boolean} still true = reduced motion
 * @param {number} [waitMs] how long the pin waits before it drops (after a 3-star burst it waits for the burst, R9)
 * @returns {HTMLCanvasElement} the picture (decorative: the line beside it says it in words)
 */
function pinJarPicture(count, still, waitMs = RESULT_FX.pinWait * 1000) {
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
    const drop = Math.min(1, Math.max(0, (now - start - waitMs) / PIN_DROP.fall));
    draw(drop);
    if (drop < 1) jarFrame = requestAnimationFrame(step);
  };
  cancelAnimationFrame(jarFrame);
  jarFrame = requestAnimationFrame(step);
  return c;
}

/**
 * A box on the page as a point and a size inside another box (the effects layer's place for it).
 * @param {DOMRect|null|undefined} r the box on the page
 * @param {DOMRect} base the layer's box on the page
 * @param {number} [share] the size as a share of the box's smaller half side
 * @returns {{x: number, y: number, r: number}|null} the middle and size in layer px, or null
 */
function spotIn(r, base, share = 1) {
  if (!r || !r.width) return null;
  return { x: r.left + r.width / 2 - base.left, y: r.top + r.height / 2 - base.top, r: (Math.min(r.width, r.height) / 2) * share };
}

/**
 * The bottom edge of the reveal picture under the customer's face, inside the effects layer: the tip coins hop out
 * from there (R7: off the mouth and chin, where the reveal's shine and chin glint play, and never near the eyes).
 * @param {DOMRect|null|undefined} card the reveal card's box on the page
 * @param {DOMRect|null|undefined} face the box round the face on the page (reveal.js faceCentre), for the middle
 * @param {DOMRect} base the layer's box on the page
 * @returns {{x: number, y: number, r: number}|null} the spot in layer px, or null
 */
function belowReveal(card, face, base) {
  if (!card || !card.width) return null;
  const x = face?.width ? face.left + face.width / 2 : card.left + card.width / 2;
  const w = face?.width || card.width * 0.6;
  return { x: x - base.left, y: card.bottom + 6 - base.top, r: w * 0.22 }; // just under the edge: the hop's top stays below the chin
}

/**
 * Where the heart puff starts, measured now inside the screen: the middle and size of the star row, and the top of the
 * title (the big heart rises above it).
 * @param {{node: HTMLElement, starRow?: HTMLElement|null, titleNode?: HTMLElement|null}} o the screen and its parts
 * @returns {{from: {x: number, y: number, w: number, h: number}|null, top: number|null}} the places in layer px
 */
function heartsPlace(o) {
  const base = o.node.getBoundingClientRect();
  const r = o.starRow?.getBoundingClientRect();
  const t = o.titleNode?.getBoundingClientRect();
  return {
    from: r?.width ? { x: r.left + r.width / 2 - base.left, y: r.top + r.height / 2 - base.top, w: r.width, h: r.height } : null,
    top: t?.height ? t.top - base.top : null,
  };
}

/**
 * Her heart puff (D46-25, fx/heart-puff-fx.js) on a story round's result: on its own layer UNDER the title and the
 * stars (CSS app-result--hearts), so the hearts come out from behind them; its soft sound ("pff", a twinkle and the
 * big heart's "ba-dum") plays when it starts. Reduced motion: a few still hearts (the sound still plays).
 * @param {{node: HTMLElement, starRow: HTMLElement|null, titleNode: HTMLElement|null, still: boolean, lite: boolean,
 *   playSound?: (name: string) => void}} o the screen, its parts, reduced motion, Lighter graphics, the sound player
 * @returns {{layer: ReturnType<typeof makeFxLayer>, state: () => object|null}} the layer and its state, for checks
 */
function startHearts(o) {
  const layer = makeFxLayer(o.node, { lite: o.lite, className: 'app-fx app-result__hearts' });
  let puff = null;
  if (o.still) {
    /** Paint the still hearts once the screen is in the page. @returns {void} */
    const paint = () => {
      const p = heartsPlace(o);
      if (p.from) layer.still((c, W, H) => makeHeartPuff({ kit: layer.kit, W, H, from: p.from, top: p.top, lite: o.lite, still: true }).paintStill(c, W, H));
    };
    requestAnimationFrame(paint);
    layer.add(() => { o.playSound?.('hearts'); return null; }, HEART_PUFF.at);
  } else {
    layer.add((W, H) => {
      o.playSound?.('hearts');
      const p = heartsPlace(o);
      return p.from ? (puff = makeHeartPuff({ kit: layer.kit, W, H, from: p.from, top: p.top, lite: o.lite })) : null;
    }, HEART_PUFF.at);
  }
  return { layer, state: () => puff?.state() ?? null };
}

/**
 * Start the result moment's effects (SPEC D45 item 2) on a layer over the screen: confetti on 3 stars (petals in the
 * spa; her heart puff instead after a story round before the studio, D46-25), and the tip coins flying from the
 * customer's face into the Total line's coin, which bumps and counts up to the
 * true total as each lands. Reduced motion: no coins fly (the total shows at once with a still glint) and only a few
 * still confetti pieces at the edges. Lighter graphics: about half the pieces and coins. Taps go through the layer.
 * @param {{node: HTMLElement, kind: 'confetti'|'petals'|'hearts'|null, failed: boolean, rows: object[]|null, totalPill: HTMLElement|null,
 *   fromNode: HTMLElement|null, reveal: object|null, still: boolean, lite: boolean, starRow?: HTMLElement|null,
 *   titleNode?: HTMLElement|null, playSound?: (name: string) => void}} o the screen, its celebration
 *   (celebrate-logic.js celebration), its result and the parts the coins fly between (fromNode = where they start
 *   without a reveal card), the stars and the title (the heart puff starts there) and the sound player
 * @returns {{dispose: () => void, state: () => object}} the effects
 */
function startEffects(o) {
  const layer = makeFxLayer(o.node, { lite: o.lite, className: 'app-fx app-result__fx' });
  const hearts = o.kind === 'hearts' ? startHearts(o) : null;
  const kind = o.kind === 'hearts' ? null : o.kind; // the confetti or petals on the layer over the screen
  let confetti = null;
  let coins = null;
  const counter = o.rows && o.totalPill && !o.failed ? coinCounter(o.rows, { lite: o.lite, still: o.still }) : null;
  const text = o.totalPill?.querySelector('.app-pill__text') ?? null;
  if (counter && text) text.textContent = String(counter.start);
  if (o.still) {
    if (counter && counter.total > 0 && o.rows.some((r) => r.id === 'tip')) o.totalPill.classList.add('app-pill--glint'); // a soft still glint
    if (kind) {
      /** Draw the few still confetti pieces (or petals) once the screen is in the page. @returns {void} */
      const paint = () => layer.still((c, W, H) => makeConfetti({ kit: layer.kit, kind, W, H, lite: o.lite, still: true }).paintStill(c, W, H));
      requestAnimationFrame(paint);
    }
  } else {
    if (kind) layer.add((W, H) => (confetti = makeConfetti({ kit: layer.kit, kind, W, H, lite: o.lite })), RESULT_FX.confettiAt);
    if (counter?.coins && text) {
      /** Where the layer is on the page now. @returns {DOMRect} its box */
      const base = () => o.node.getBoundingClientRect();
      layer.add((W, H) => (coins = makeCoinFlight({
        kit: layer.kit, n: counter.coins, W, H, lite: o.lite, playSound: o.playSound, // a "ting" per coin, a "ding" for the last
        from: () => belowReveal(o.reveal?.node?.getBoundingClientRect(), o.reveal?.faceCentre?.(), base()) ?? spotIn(o.fromNode?.getBoundingClientRect(), base(), 0.5) ?? { x: W / 2, y: H * 0.3, r: 20 },
        to: () => spotIn(o.totalPill.querySelector('.app-icon')?.getBoundingClientRect(), base()) ?? { x: W / 2, y: H / 2, r: 10 },
        onLand: (i) => {
          text.textContent = String(counter.steps[i] ?? counter.total);
          o.totalPill.animate?.([{ transform: 'scale(1)' }, { transform: 'scale(1.22)' }, { transform: 'scale(1)' }], { duration: 220, easing: 'ease-out' });
        },
      })), RESULT_FX.coinsAt);
    }
  }
  return {
    /** Stop every effect and take the layer away (the true total stays on the counter). @returns {void} */
    dispose() { layer.dispose(); hearts?.layer.dispose(); if (counter && text) text.textContent = String(counter.total); },
    /** For checks. @returns {object} state */
    state: () => ({
      kind: o.kind, busy: layer.busy() || Boolean(hearts?.layer.busy()), confetti: confetti?.state() ?? null, coins: coins?.state() ?? null,
      hearts: hearts?.state() ?? null, counter: counter ? { ...counter, shown: text?.textContent ?? null } : null,
    }),
  };
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
 *   pinCount = after a pin visit (game/pin-jar.js), the pins now in the jar: a "Pin taken away!" line; null = none;
 *   tier = the studio tier 0..2 (the spa, 2, gets petals instead of confetti, D45); lowDetail = Lighter graphics (about
 *   half the confetti and coins); party = one of Prom Penny's party visits (3 stars: confetti, in the spa too, R2);
 *   story = a story round before the studio (Hubby, chapter 0): her heart puff instead of confetti (D46-25);
 *   playSound = plays a sound by name (the heart puff's soft sound)
 * @returns {{node: HTMLElement, dispose: () => void, fxState: () => object}} the screen; fxState = the effects, for checks
 */
export function createResultScreen({
  t, stars = 0, failed = false, payout, reputationChange = 0, skipPenalty = 0, factKey, reactionKey, playerName = '',
  onContinue, onShop, onTryAgain, onNext, reducedMotion = false, tagKey = null, tagVars = null, reveal = null, stampKey = null,
  skills = [], pinCount = null, tier = 0, lowDetail = false, party = false, story = false, playSound = null,
}) {
  const kind = celebration({ stars, failed, tier, party, story }); // the 3-star burst (D45), her heart puff (D46-25), or null
  const shell = screenShell('result', { label: t(resultTitleKey({ stars, failed })), reducedMotion });
  if (failed) shell.node.classList.add('app-result--fail');
  const body = el('div', `app-body app-result${reveal ? ' app-result--reveal' : ''}${kind === 'hearts' ? ' app-result--hearts' : ''}`);
  if (reveal) body.append(reveal.node); // the before and after card first (T8.2)

  const top = el('div', 'app-result__top');
  if (failed) top.append(el('p', 'app-huff', t('ui.result.fail.huff')));
  const title = el('h1', 'app-result__title', t(resultTitleKey({ stars, failed })));
  top.append(title);
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
  let rows = null; // the coin rows and the Total line's pill (the tip coins fly into it, D45)
  let totalPill = null;
  let tipPill = null;
  if (failed) {
    main.append(el('p', 'app-result__text', t('ui.result.fail.text')));
  } else {
    if (payout) { // no payout = a round before the studio opens (chapters 0 to 4, SPEC D32h): no coin card
      const coins = el('div', 'app-card app-coins');
      coins.setAttribute('role', 'table');
      coins.setAttribute('aria-label', t('ui.result.coins'));
      rows = coinRows(payout);
      for (const row of rows) {
        const line = el('div', `app-coins__row${row.id === 'total' ? ' app-coins__row--total' : ''}`);
        line.setAttribute('role', 'row');
        const pill = coinPill(String(row.amount));
        if (row.id === 'total') totalPill = pill;
        if (row.id === 'tip') tipPill = pill;
        line.append(el('span', 'app-coins__label', t(row.key)), pill);
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
      pin.append(pinJarPicture(pinCount, reducedMotion, pinDropWait(kind) * 1000), el('span', '', t('ui.pin.taken', { n: pinCount })));
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
  // The result moment's effects (D45): confetti on 3 stars (petals in the spa; her heart puff after a story round,
  // D46-25), the tip coins to the Total line.
  const fx = startEffects({
    node: shell.node, kind, failed, rows, totalPill, fromNode: tipPill, reveal, still: reducedMotion, lite: lowDetail,
    starRow, titleNode: title, playSound,
  });
  /** Stop the effects and the reveal (if any) and remove the screen. @returns {void} */
  const dispose = () => { fx.dispose(); reveal?.dispose?.(); cancelAnimationFrame(jarFrame); shell.dispose(); };
  return { node: shell.node, dispose, fxState: () => ({ ...fx.state(), reveal: reveal?.sparkleState?.() ?? null }) };
}
