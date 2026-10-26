// The Field guide screen (T6.5, SPEC D22): one cartoon card per kind of bump, the nose strip, the decoys and the warm
// cloth, each with a small picture (drawn with the pop scene's own drawing code, pop/art.js), its name, a short funny
// line, "What to use" and a tip. Cards she has not met yet show as a locked "?" card (no spoilers). The list scrolls
// with the shop's "more below" arrow. Which cards are open is decided in guide-logic.js; the game passes them in.
// It opens from the main menu (a normal screen) or over the pop scene (overlay: true, from the "?" button there); Back
// and the Escape key close it. All text comes from the string table.

import { el, icon, header, screenShell } from './dom.js';
import { canScrollMore } from './screen-logic.js';
import { guideCount, useText } from './guide-logic.js';
import {
  makeCanvas, drawPimple, drawHair, hairPoints, drawDecoy, drawStrip, drawCloth,
} from '../pop/art.js';

/** The size of a card's picture in CSS px. */
const PIC = 76;

/**
 * Draw the picture of one card on a round patch of cartoon skin (pop/art.js drawings, standing still).
 * @param {string} id the card's kind id
 * @param {number} dpr device pixels per CSS pixel
 * @returns {HTMLCanvasElement} the picture
 */
function drawPicture(id, dpr) {
  const { canvas, ctx } = makeCanvas(PIC, PIC, dpr);
  const c = PIC / 2;
  ctx.save();
  ctx.beginPath();
  ctx.arc(c, c, c - 1, 0, Math.PI * 2);
  ctx.clip();
  // Smooth, light cartoon skin (the pop scene's pores and grain look muddy this small), with a soft shine.
  const skin = ctx.createRadialGradient(c * 0.7, c * 0.6, 2, c, c, c * 1.1);
  skin.addColorStop(0, '#ffe6d4');
  skin.addColorStop(0.6, '#f8cfb2');
  skin.addColorStop(1, '#eab593');
  ctx.fillStyle = skin;
  ctx.fillRect(0, 0, PIC, PIC);
  /** Draw one bump of a kind, standing still. @param {string} type bump id @param {number} r radius @param {number} [x] x @param {number} [y] y @returns {void} */
  const bump = (type, r, x = c, y = c + 2) => drawPimple(ctx, { x, y, r, type }, 0, 1, 0.35);
  if (id === 'whitehead') bump('whitehead', 18);
  else if (id === 'red') bump('red', 19);
  else if (id === 'blackhead') bump('blackhead', 14);
  else if (id === 'big') bump('big', 25);
  else if (id === 'gold') bump('gold', 19);
  else if (id === 'horn') bump('horn', 16, c, c + 10);
  else if (id === 'hair') { // the small bump with its silly curly hair already half out
    bump('hair', 12, c - 14, c + 14);
    drawHair(ctx, hairPoints(c - 14, c + 14, -0.7, 62, 0.8, 0), 2);
  } else if (id === 'noseStrip') { // the strip half peeled, showing the tiny dots it pulled out
    const dots = [[16, 34], [24, 40], [31, 33], [39, 41], [47, 35], [55, 40], [61, 34]].map(([x, y]) => ({ x, y }));
    drawStrip(ctx, { x: 10, y: 28, w: 56, h: 18, dots }, 0.45);
  } else if (id === 'decoys') { // a mole, a freckle cluster and a beauty mark: part of the face, not bumps
    drawDecoy(ctx, { kind: 'mole', x: 24, y: 28, r: 7 });
    drawDecoy(ctx, { kind: 'freckles', x: 49, y: 44, r: 14, dots: [{ u: -0.6, v: -0.3, s: 0.16 }, { u: 0.1, v: -0.6, s: 0.14 }, { u: 0.6, v: 0, s: 0.16 }, { u: -0.1, v: 0.45, s: 0.15 }] });
    drawDecoy(ctx, { kind: 'beauty', x: 26, y: 54, r: 3.5 });
  } else if (id === 'warmCloth') drawCloth(ctx, c, c + 8, 22, 0);
  else drawTwistPicture(ctx, id, c);
  ctx.restore();
  return canvas;
}

/**
 * The little cartoon on a customer twist card (T8.3), on the same skin patch: sway lines, a feather, rosy cheeks or a
 * clock. Lines only, standing still.
 * @param {CanvasRenderingContext2D} ctx the card picture
 * @param {string} id the twist id
 * @param {number} c the middle of the picture
 * @returns {void}
 */
function drawTwistPicture(ctx, id, c) {
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = '#5a3a2e';
  ctx.lineWidth = 3;
  if (id === 'fidgety') { // a small face leaning over, with sway lines on both sides
    ctx.save();
    ctx.translate(c, c + 2);
    ctx.rotate(-0.25);
    ctx.fillStyle = '#ffdcc4';
    ctx.beginPath(); ctx.ellipse(0, 0, 15, 18, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#5a3a2e';
    for (const s of [-1, 1]) { ctx.beginPath(); ctx.arc(s * 6, -4, 2, 0, Math.PI * 2); ctx.fill(); }
    ctx.beginPath(); ctx.arc(0, 4, 6, 0.2, Math.PI - 0.2); ctx.stroke();
    ctx.restore();
    for (const s of [-1, 1]) {
      for (const k of [0, 1]) {
        ctx.beginPath();
        ctx.arc(c, c + 2, 24 + k * 7, s < 0 ? Math.PI - 0.5 : -0.5, s < 0 ? Math.PI + 0.5 : 0.5);
        ctx.stroke();
      }
    }
  } else if (id === 'ticklish') { // a soft feather
    ctx.save();
    ctx.translate(c, c);
    ctx.rotate(-0.7);
    ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.ellipse(0, -4, 9, 24, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, 26); ctx.lineTo(0, -24); ctx.stroke();
    ctx.lineWidth = 1.6;
    for (let y = -16; y <= 12; y += 6) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(-7, y - 4); ctx.moveTo(0, y); ctx.lineTo(7, y - 4); ctx.stroke();
    }
    ctx.restore();
  } else if (id === 'sensitive') { // rosy cheeks and a small sparkle
    for (const s of [-1, 1]) {
      const g = ctx.createRadialGradient(c + s * 15, c + 6, 0, c + s * 15, c + 6, 13);
      g.addColorStop(0, 'rgba(235,60,70,0.75)');
      g.addColorStop(1, 'rgba(235,60,70,0)');
      ctx.fillStyle = g;
      ctx.fillRect(c + s * 15 - 13, c - 7, 26, 26);
    }
    ctx.beginPath(); ctx.arc(c, c + 8, 6, 0.2, Math.PI - 0.2); ctx.stroke();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2.4;
    ctx.beginPath(); ctx.moveTo(c + 16, c - 24); ctx.lineTo(c + 16, c - 12); ctx.moveTo(c + 10, c - 18); ctx.lineTo(c + 22, c - 18); ctx.stroke();
  } else if (id === 'hurry') { // an alarm clock
    ctx.fillStyle = '#fff6e0';
    ctx.beginPath(); ctx.arc(c, c + 3, 20, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(c, c + 3); ctx.lineTo(c, c - 9); ctx.moveTo(c, c + 3); ctx.lineTo(c + 9, c + 7); ctx.stroke();
    for (const s of [-1, 1]) { ctx.beginPath(); ctx.arc(c + s * 15, c - 17, 6, Math.PI, 0); ctx.stroke(); }
  }
}

/**
 * Build the Field guide screen.
 * @param {{t: (key: string, vars?: object) => string, cards: ReturnType<typeof import('./guide-logic.js').guideCards>,
 *   twistCards?: object[], onBack?: () => void, overlay?: boolean, reducedMotion?: boolean}} opts t = string
 *   function; cards = the cards (guide-logic.js guideCards); twistCards = the customer twist cards under a
 *   "Customers" heading (guide-logic.js twistCards, T8.3; left out = none); onBack = Back (or Escape) was pressed;
 *   overlay = shown over the pop scene (it then lies on top as a dialog and takes keyboard focus)
 * @returns {{node: HTMLElement, focus: () => void, dispose: () => void}} the screen
 */
export function createGuideScreen({ t, cards, twistCards = [], onBack, overlay = false, reducedMotion = false }) {
  const shell = screenShell(`guide${overlay ? ' app-screen--overlay' : ''}`, { label: t('ui.guide.title'), reducedMotion });
  if (overlay) {
    shell.node.setAttribute('role', 'dialog');
    shell.node.setAttribute('aria-modal', 'true');
  }
  const head = header(t, t('ui.guide.title'), onBack, shell.signal);
  const { open, total } = guideCount([...cards, ...twistCards]);
  head.append(el('p', 'app-guide__count', t('ui.guide.count', { open, total }))); // in the top row, so the list gets the room
  const panel = el('div', 'app-body app-shoplist app-guidelist');
  const frame = el('div', 'app-shoplistframe');
  const more = el('button', 'app-shopmore');
  more.type = 'button';
  more.setAttribute('aria-label', t('ui.shop.moreBelow'));
  more.append(icon('back'));
  frame.append(panel, more);
  const dpr = Math.min(2, globalThis.devicePixelRatio || 1);

  /** Draw one card (open or locked). @param {ReturnType<typeof import('./guide-logic.js').guideCards>[number]} card the card @returns {HTMLElement} the card */
  function cardNode(card) {
    const node = el('article', `app-guidecard${card.open ? '' : ' app-guidecard--locked'}`);
    const pic = el('div', 'app-guidecard__pic');
    const text = el('div', 'app-guidecard__text');
    if (!card.open) {
      pic.append(el('span', 'app-guidecard__q', t('ui.guide.lockedMark')));
      pic.setAttribute('aria-hidden', 'true');
      const lockedLine = card.kind === 'twist' ? 'ui.guide.twistLocked' : 'ui.guide.lockedHint';
      text.append(el('h2', 'app-guidecard__name', t('ui.guide.locked')), el('p', 'app-guidecard__line', t(lockedLine)));
      node.append(pic, text);
      return node;
    }
    const name = t(card.nameKey);
    const art = drawPicture(card.id, dpr);
    art.className = 'app-guidecard__art';
    art.setAttribute('role', 'img');
    art.setAttribute('aria-label', t('ui.guide.picture', { name }));
    pic.append(art);
    const use = el('p', 'app-guidecard__use');
    use.append(el('span', 'app-guidecard__label', t('ui.guide.use')), el('span', 'app-guidecard__tools', useText(t, card.tools)));
    const tip = el('p', 'app-guidecard__tip');
    tip.append(icon('bulb'), el('span', '', t(card.tipKey)));
    // A customer twist card (T8.3) has no "What to use" line: its tip says what to do.
    text.append(el('h2', 'app-guidecard__name', name), el('p', 'app-guidecard__line', t(card.lineKey)), ...(card.kind === 'twist' ? [] : [use]), tip);
    node.append(pic, text);
    return node;
  }

  for (const card of cards) panel.append(cardNode(card));
  if (twistCards.length) panel.append(el('h2', 'app-guide__group', t('ui.guide.customers'))); // T8.3
  for (const card of twistCards) panel.append(cardNode(card));

  /** Show the "more below" arrow only while the list can scroll further down. @returns {void} */
  function updateMore() {
    more.hidden = !canScrollMore(panel.scrollTop, panel.clientHeight, panel.scrollHeight);
  }
  more.addEventListener('click', () => panel.scrollBy({ top: Math.max(120, panel.clientHeight * 0.8), behavior: reducedMotion ? 'auto' : 'smooth' }), { signal: shell.signal });
  panel.addEventListener('scroll', updateMore, { passive: true, signal: shell.signal });
  window.addEventListener('resize', updateMore, { signal: shell.signal });
  shell.node.addEventListener('keydown', (e) => { if (e.key === 'Escape') { e.preventDefault(); onBack?.(); } }, { signal: shell.signal });
  const watcher = typeof ResizeObserver === 'function' ? new ResizeObserver(updateMore) : null;
  watcher?.observe(panel);
  more.hidden = true;
  requestAnimationFrame(updateMore);

  shell.node.append(head, frame);
  return {
    node: shell.node,
    /** Put keyboard focus on the Back button (used when it opens over the pop scene). @returns {void} */
    focus() { shell.node.querySelector('.app-back')?.focus({ preventScroll: true }); },
    /** Stop watching the list and remove the screen. @returns {void} */
    dispose() { watcher?.disconnect(); shell.dispose(); },
  };
}
