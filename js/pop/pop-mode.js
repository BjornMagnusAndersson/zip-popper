// The pimple-popper play mode of the popper game: the part the player sees and touches.
// - After each answer a sheet slides up from the bottom with a close-up skin patch to squeeze and pop; then wipe the
//   goo off and the cream heals the skin. Every five answers a big round with big pimples and a blackhead strip.
//   Writing or commenting on the Icelandic earns golden bonus pimples. The answer buttons stay usable above the sheet.
// - "Skip popping" closes it; the pimples wait (the screen shows a chip that opens them again).
// - At the end of a batch: the grand finale, a cartoon teenager's face full of pimples to clear, over the diploma.
// Loaded only when the player has chosen Pimple popper (review-screen.js imports it with import()), and it brings its
// own stylesheet (css/pop.css) the same way, so Classic players never download any of it. Self-contained:
// besides its own files in js/pop and js/core it needs only the small interface passed to createPopMode (text lookup,
// language, storage, the page element), so it can be lifted into a separate game later.
// Nothing here is sent anywhere.
import {
  roundFor, bankAdd, bankTake, bankCount, layoutPatch, faceSpots, faceMood, PIMPLE_TYPES, onFeature, loadPopSoundOn, savePopSoundOn,
} from './logic.js';
import { createPopScene } from './engine.js';
import { createSound } from '../core/sound.js';
import { makeSkinTexture, makeFaceTexture, faceBox, noseStrip } from './art.js';

const CSS_URL = new URL('../../css/pop.css', import.meta.url).href;

/** Add the pop mode's stylesheet to the page once (it is not in index.html, to keep the app light). @returns {void} */
function loadStyles() {
  if (typeof document === 'undefined' || document.querySelector('link[data-pop-css]')) return;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = CSS_URL;
  link.dataset.reviewPop = '';
  document.head.append(link);
}

/**
 * Whether the person asked for less motion.
 * @returns {boolean} true = calm version
 */
function prefersReducedMotion() {
  try { return Boolean(globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches); } catch { return false; }
}

/**
 * Create an element with an optional class and text.
 * @param {string} tag element name
 * @param {string} [cls] class names
 * @param {string} [text] text content
 * @returns {HTMLElement} the element
 */
function el(tag, cls, text) {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text !== undefined) n.textContent = text;
  return n;
}

/**
 * A button.
 * @param {string} cls class names
 * @param {string} text visible text
 * @param {() => void} onClick click handler
 * @returns {HTMLButtonElement} the button
 */
function button(cls, text, onClick) {
  const b = el('button', cls, text);
  b.type = 'button';
  b.addEventListener('click', onClick);
  return b;
}

/**
 * A short buzz on phones that can.
 * @param {number|number[]} pattern milliseconds on/off
 * @returns {void}
 */
function buzz(pattern) {
  try { globalThis.navigator?.vibrate?.(pattern); } catch { /* not allowed */ }
}

/**
 * Create the pimple-popper mode for the review page.
 * @param {{uid: string, storage?: Storage, host?: HTMLElement, t: (key: string) => string, lang: () => string,
 *   onBankChange?: (waiting: number) => void}} o the account, where switches are remembered, the page element (it gets
 *   the class "has-pop-sheet" while the sheet is open), the text lookup, the app language, and a callback with the
 *   number of pimples waiting behind the chip
 * @returns {object} node, isOpen(), waiting(), onAnswer(), openBank(), closeAll(), unlock(), refresh(), dispose()
 */
export function createPopMode({ uid, storage, host, t, lang, onBankChange }) {
  loadStyles();
  const sound = createSound({ sfxOn: loadPopSoundOn(storage), onChange: (s) => savePopSoundOn(storage, s.sfxOn) });
  const layer = el('div', 'pop-layer');
  let bank = { small: 0, big: 0, gold: 0 };
  let snoozed = false; // "Skip popping" was pressed: wait for the chip
  let sheet = null; // {node, scene, canvas, title, count, bonus, hint, take, size}
  let finale = null; // {node, scene, ...}
  let seed = 1 + [...String(uid)].reduce((a, c) => a + c.charCodeAt(0), 0);
  let disposed = false;

  /**
   * Text with {placeholders}; the "<key>.one" text is used for 1 (Icelandic 21, 31 ... too) when the table has one.
   * @param {string} key string-table key
   * @param {Record<string, string|number>} vars values
   * @returns {string} the text
   */
  const say = (key, vars) => {
    const n = Number(vars.n);
    const one = lang() === 'is' ? n % 10 === 1 && n % 100 !== 11 : n === 1;
    const single = `${key}.one`;
    let out = t(one && t(single) !== single ? single : key);
    for (const [k, v] of Object.entries(vars)) out = out.replace(`{${k}}`, String(v));
    return out;
  };

  layer.addEventListener('pointerdown', () => sound.unlock(), true);

  /** The next seed for a new patch. @returns {number} seed */
  const nextSeed = () => { seed = (seed * 7919 + 17) % 2147483647; return seed; };

  /** Pimples waiting behind the chip (none while the sheet or the finale is open). @returns {number} count */
  const waiting = () => (sheet || finale ? 0 : bankCount(bank));

  /** Tell the screen how many pimples wait, so it can show or hide its chip. @returns {void} */
  function drawChip() {
    try { onBankChange?.(waiting()); } catch (e) { console.warn('onBankChange failed:', e); }
  }

  /** The sheet's own sound switch. @returns {HTMLButtonElement} the switch */
  function soundSwitch() {
    const isOn = sound.isOn();
    const b = button(`pop-sound${isOn ? '' : ' pop-sound--off'}`, '', () => {
      sound.setOn(!sound.isOn());
      if (sound.isOn()) sound.play('pop_small');
      const fresh = soundSwitch();
      b.replaceWith(fresh);
      fresh.focus();
    });
    const label = t(isOn ? 'pop.soundOff' : 'pop.soundOn');
    b.setAttribute('aria-label', label);
    b.setAttribute('aria-pressed', String(isOn));
    b.title = label;
    b.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9h4l5-4v14l-5-4H4z" fill="currentColor"/>'
      + (isOn ? '<circle cx="18" cy="12" r="2.6" fill="none" stroke="currentColor" stroke-width="2"/>'
        : '<path d="M16.5 9.5l5 5m0-5l-5 5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>') + '</svg>';
    return b;
  }

  /**
   * The hint under the patch for a step.
   * @param {string} step pop, wipe, cream or done
   * @param {boolean} strip whether there is a strip to peel
   * @returns {string} the hint
   */
  function hintFor(step, strip) {
    if (step === 'wipe') return t('pop.hint.wipe');
    if (step === 'cream' || step === 'done') return t('pop.hint.cream');
    return t(strip ? 'pop.hint.strip' : 'pop.hint.pop');
  }

  /** The height the sheet gets on this screen (the answer buttons sit above it). @returns {number} px */
  function sheetHeight() {
    return Math.round(Math.min((globalThis.innerHeight || 740) * 0.4, 320));
  }

  /** The drawing area of the open sheet, measured. @returns {{w: number, h: number}} size in px */
  function stageSize() {
    const r = sheet.stage.getBoundingClientRect();
    return { w: Math.max(200, Math.round(r.width)), h: Math.max(120, Math.round(r.height)) };
  }

  /** Open the sheet with the next patch from the bank (or close it when the bank is empty). @returns {void} */
  function openSheet() {
    if (disposed || finale) return;
    if (!bankCount(bank)) { closeSheet(); return; }
    const { take, rest } = bankTake(bank);
    bank = rest;
    const reduced = prefersReducedMotion();
    const dpr = Math.min(2, globalThis.devicePixelRatio || 1);
    const s = nextSeed();
    if (!sheet) {
      const node = el('section', 'pop-sheet');
      node.setAttribute('role', 'region');
      node.setAttribute('aria-label', t('pop.region'));
      const head = el('div', 'pop-sheet__head');
      const titles = el('div', 'pop-sheet__titles');
      const title = el('p', 'pop-sheet__title');
      const meta = el('p', 'pop-sheet__count');
      const count = el('span', '');
      count.setAttribute('aria-live', 'polite');
      const bonus = el('span', 'pop-bonus');
      meta.append(count, bonus);
      titles.append(title, meta);
      const skip = button('pop-skip', t('pop.skip'), skipPopping);
      head.append(titles, skip);
      const stage = el('div', 'pop-sheet__stage');
      const foot = el('div', 'pop-sheet__foot');
      const hint = el('p', 'pop-sheet__hint');
      foot.append(hint, soundSwitch());
      node.append(head, stage, foot);
      const h = sheetHeight();
      node.style.height = `${h}px`;
      layer.append(node);
      sheet = { node, stage, title, count, bonus, hint };
      host?.classList.add('has-pop-sheet');
      host?.style.setProperty('--pop-h', `${h}px`);
      requestAnimationFrame(() => node.classList.add('is-open'));
    }
    sheet.scene?.dispose();
    sheet.stage.replaceChildren();
    sheet.take = take;
    sheet.title.textContent = t(take.big ? 'pop.titleBig' : 'pop.title');
    sheet.bonus.textContent = take.gold ? say('pop.bonus', { n: take.gold }) : '';
    sheet.bonus.hidden = !take.gold;
    sheet.hint.textContent = hintFor('pop', take.strip);
    sheet.count.textContent = say('pop.left', { n: take.small + take.big + take.gold });
    const size = stageSize();
    sheet.size = size;
    const lay = layoutPatch({ seed: s, width: size.w, height: size.h, ...take });
    const canvas = el('canvas', 'pop-canvas');
    canvas.tabIndex = 0;
    canvas.setAttribute('role', 'img');
    canvas.setAttribute('aria-label', t('pop.canvas'));
    canvas.style.width = `${size.w}px`;
    canvas.style.height = `${size.h}px`;
    sheet.stage.append(canvas);
    sheet.canvas = canvas;
    sheet.scene = createPopScene(canvas, {
      width: size.w, height: size.h, dpr, reduced, sound, buzz,
      texture: makeSkinTexture(size.w, size.h, dpr, s),
      pimples: lay.pimples, strip: lay.strip,
      onPop: () => drawCount(),
      onStep: (step) => { if (sheet) { sheet.hint.textContent = hintFor(step, false); drawCount(); } },
      onDone: () => { if (bankCount(bank) && !snoozed) openSheet(); else closeSheet(); },
    });
    canvas.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { if (sheet?.scene.keyPress()) e.preventDefault(); }
    });
    drawCount();
    drawChip();
  }

  /** Show how many pimples are left on the patch. @returns {void} */
  function drawCount() {
    if (!sheet?.scene) return;
    const left = sheet.scene.left();
    sheet.count.textContent = sheet.scene.step() === 'pop' ? say('pop.left', { n: left }) : '';
  }

  /**
   * Close the sheet (after the healing, after Skip, or when the mode is turned off).
   * @returns {void}
   */
  function closeSheet() {
    if (!sheet) { drawChip(); return; }
    const s = sheet;
    sheet = null;
    s.scene?.dispose();
    host?.classList.remove('has-pop-sheet');
    s.node.classList.remove('is-open');
    setTimeout(() => s.node.remove(), prefersReducedMotion() ? 0 : 260);
    drawChip();
  }

  /** "Skip popping": the pimples still on the patch wait in the bank behind the chip. @returns {void} */
  function skipPopping() {
    if (sheet?.scene && sheet.scene.step() === 'pop') {
      const left = sheet.scene.all().filter((p) => !p.popped);
      bank = bankAdd(bank, {
        big: left.filter((p) => p.type === 'big').length,
        gold: left.filter((p) => p.type === 'gold').length,
        small: left.filter((p) => p.type !== 'big' && p.type !== 'gold').length,
      });
    }
    snoozed = true;
    closeSheet();
    host?.querySelector('.review-btn--ok, .review-finish__title')?.focus?.({ preventScroll: true });
  }

  /** Make the face picture for the finale in its present state. @param {object} f finale state @returns {HTMLCanvasElement} texture */
  function faceTexture(f) {
    const cleared = f.scene ? f.scene.all().filter((p) => p.popped).length : 0;
    const total = f.total;
    const mood = faceMood(cleared, total, f.healed);
    f.mood = mood;
    return makeFaceTexture(f.w, f.h, f.dpr, f.seed, { mood, redness: f.healed ? 0 : 1 - cleared / Math.max(1, total) });
  }

  /** The grand finale: the big face over the finish screen. @returns {void} */
  function openFinale() {
    if (disposed) return;
    closeSheet();
    bank = { small: 0, big: 0, gold: 0 };
    snoozed = false;
    finale?.scene?.dispose();
    finale?.node.remove();
    const node = el('section', 'pop-finale');
    node.setAttribute('role', 'dialog');
    node.setAttribute('aria-modal', 'true');
    node.setAttribute('aria-label', t('pop.finale.title'));
    const head = el('div', 'pop-sheet__head pop-finale__head');
    const titles = el('div', 'pop-sheet__titles');
    const title = el('p', 'pop-sheet__title', t('pop.finale.title'));
    const count = el('p', 'pop-sheet__count');
    count.setAttribute('aria-live', 'polite');
    titles.append(title, count);
    const skip = button('pop-skip', t('pop.skip'), closeFinale);
    head.append(titles, skip);
    const stage = el('div', 'pop-finale__stage');
    const foot = el('div', 'pop-sheet__foot pop-finale__foot');
    const hint = el('p', 'pop-sheet__hint', t('pop.finale.hint'));
    foot.append(hint, soundSwitch());
    const done = el('div', 'pop-finale__done');
    done.hidden = true;
    done.append(el('p', 'pop-finale__done-text', t('pop.finale.done')), button('review-btn review-btn--ok', t('pop.finale.close'), closeFinale));
    node.append(head, stage, foot, done);
    layer.append(node);
    const vw = globalThis.innerWidth || 360;
    const vh = globalThis.innerHeight || 740;
    const w = Math.min(vw, 640);
    const h = Math.max(320, vh - 120);
    const dpr = Math.min(2, globalThis.devicePixelRatio || 1);
    const f = { node, title, count, hint, done, w, h, dpr, seed: nextSeed(), total: 0, healed: false, mood: 'sad' };
    finale = f;
    const box = faceBox(w, h);
    const unit = box.rx / 190; // pimple sizes follow the size of the face
    const pimples = faceSpots(f.seed).filter((s) => !onFeature(s)).map((s, i) => {
      const [a, b] = PIMPLE_TYPES[s.type].r;
      return { id: `f${i}`, type: s.type, x: box.cx + s.u * box.rx, y: box.cy + s.v * box.ry, r: ((a + b) / 2) * s.size * unit, axis: (i * 1.3) % Math.PI, hold: PIMPLE_TYPES[s.type].hold };
    });
    f.total = pimples.length;
    const canvas = el('canvas', 'pop-canvas pop-finale__canvas');
    canvas.tabIndex = 0;
    canvas.setAttribute('role', 'img');
    canvas.setAttribute('aria-label', t('pop.canvas'));
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    stage.append(canvas);
    f.canvas = canvas;
    f.scene = createPopScene(canvas, {
      width: w, height: h, dpr, reduced: prefersReducedMotion(), sound, buzz,
      texture: faceTexture(f), pimples, strip: noseStrip(box, f.seed),
      onPop: (p, left) => {
        count.textContent = say('pop.left', { n: left });
        f.scene?.setTexture(faceTexture(f));
      },
      onStep: (step) => {
        hint.textContent = step === 'pop' ? t('pop.finale.hint') : hintFor(step, false);
        if (step !== 'pop') count.textContent = '';
        if (step === 'done') {
          f.healed = true;
          f.scene.setTexture(faceTexture(f));
        }
      },
      onDone: () => {
        if (finale !== f) return;
        sound.play('cheer');
        buzz([30, 60, 30, 60, 80]);
        foot.hidden = true;
        done.hidden = false;
        done.querySelector('button')?.focus({ preventScroll: true });
      },
    });
    canvas.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { if (f.scene.keyPress()) e.preventDefault(); }
    });
    node.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeFinale(); });
    count.textContent = say('pop.left', { n: f.total });
    requestAnimationFrame(() => node.classList.add('is-open'));
    canvas.focus({ preventScroll: true });
    drawChip();
  }

  /** Close the finale (Skip popping or Done). @returns {void} */
  function closeFinale() {
    if (!finale) return;
    const f = finale;
    finale = null;
    f.scene?.dispose();
    f.node.remove();
    drawChip();
    host?.querySelector('.review-finish__title')?.focus?.({ preventScroll: true });
  }

  return {
    node: layer,
    /** Whether the sheet or the finale is showing now. @returns {boolean} true when open */
    isOpen: () => Boolean(sheet || finale),
    waiting,
    /**
     * An answer was saved: in pimple mode it brings pimples (or the face finale at the end of the batch).
     * @param {string} status 'ok', 'edit' or 'comment'
     * @param {string[]} milestones from the session
     * @param {string} [batch] 'ui' or 'doubts'
     * @returns {void}
     */
    onAnswer(status, milestones, batch) {
      if (disposed) return;
      const round = roundFor(status, milestones, batch);
      if (round.face) { setTimeout(openFinale, prefersReducedMotion() ? 100 : 500); return; }
      bank = bankAdd(bank, round);
      if (sheet?.scene && sheet.scene.step() === 'pop' && !round.big) {
        // Add the new pimples to the patch that is open.
        const { take, rest } = bankTake(bank);
        const lay = layoutPatch({ seed: nextSeed(), width: sheet.size.w, height: sheet.size.h, small: take.small, gold: take.gold, avoid: sheet.scene.all().filter((p) => !p.popped) });
        if (sheet.scene.add(lay.pimples)) bank = { ...rest, big: rest.big + take.big };
        if (take.gold) { sheet.bonus.textContent = say('pop.bonus', { n: take.gold }); sheet.bonus.hidden = false; }
        drawCount();
      } else if (!sheet && !snoozed) openSheet();
      drawChip();
    },
    /** Wake the popping sounds up (call from inside a tap). @returns {void} */
    unlock: () => sound.unlock(),
    /** The chip was tapped: open the waiting pimples. @returns {void} */
    openBank() { snoozed = false; openSheet(); },
    /** Close the sheet and the finale (the player turned the mode off). @returns {void} */
    closeAll() { closeSheet(); closeFinale(); },
    /** After a language change: relabel what is open. @returns {void} */
    refresh() {
      if (sheet) {
        sheet.node.setAttribute('aria-label', t('pop.region'));
        sheet.node.querySelector('.pop-skip').textContent = t('pop.skip');
        sheet.hint.textContent = hintFor(sheet.scene?.step() ?? 'pop', Boolean(sheet.take?.strip && sheet.scene?.step() === 'pop'));
        drawCount();
      }
      drawChip();
    },
    /** Close everything when leaving the page. @returns {void} */
    dispose() {
      disposed = true;
      sheet?.scene?.dispose();
      finale?.scene?.dispose();
      sheet = null;
      finale = null;
      layer.replaceChildren();
      host?.classList.remove('has-pop-sheet');
      sound.dispose();
    },
  };
}
