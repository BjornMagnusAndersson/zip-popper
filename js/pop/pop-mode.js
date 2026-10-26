// The pop scene the player sees and touches (T1.0, SPEC D9): one full face (head and shoulders) with bumps all over
// it. Press and hold a bump to squeeze it; when all are out, wipe the goo off and the cream heals the skin. A header
// shows the title, how many bumps are left, the sound switch and a "New face" button; a hint line sits below.
// Behind the person the studio room shows (backdrop.js, SPEC D10 and D11), in portrait and landscape: on a phone held
// sideways the header and hint float over the room at the sides (pop.css). The scene fills its container; when the
// window changes size or the phone turns, the face is laid out again for the new size and the round goes on (every
// bump keeps its place on the face, popped ones stay popped).
// Tools (T1.2, docs/TOOLS.md): a small tool bar under the face (at the bottom right on a phone held sideways): tap a
// tool, then use it on the face. The hint line says what the tool in hand does. A wrong tool on a bump is an "Ow!":
// a bubble, the face winces for a moment, and the Ow counter (game/scoring.js) goes up. The warm cloth's button shows
// the warm meter. In this demo every built tool is available (chapter unlocks are data only, data/tools.js).
// Irritation (T1.2b, TOOLS.md decision 3): Ows and cold pops fill a small meter beside the counter line and redden
// the cheeks. In a Story/Career round (career: true; the demo is free play unless the page has ?career) a full meter
// is a fail (SPEC D15): the customer storms off and the player picks "Try again" (same customer, fresh face, no pay)
// or "Next customer" (a reputation hit, a hook only until reputation exists). Free play never fails.
// Keyboard: Tab to the face, Enter or Space squeezes the next bump, peels or wipes. All text comes from t().
// Nothing here is sent anywhere.
import { faceGeometry, faceMap, layoutFace, faceMood, FACE_BUMPS, loadPopSoundOn, savePopSoundOn } from './logic.js';
import { createPopScene } from './engine.js';
import { createSound } from '../core/sound.js';
import { drawFace, randomFaceSpec } from './face.js';
import { makeCanvas } from './art.js';
import { drawBackdrop, nextBackdropChange } from './backdrop.js';
import { toolBarIds, START_TOOL, isFail } from './tool-logic.js';
import { createRound, registerPop, registerOw, registerCleanup, registerFail } from '../game/scoring.js';

/** How much reputation "Next customer" after a fail costs (first guess; reputation itself comes in T3.x). */
export const FAIL_REPUTATION_HIT = 1;

/** Small pictures for the tool buttons (decoration only; the name under each comes from the string table). */
const TOOL_ICONS = {
  fingers: '<path d="M8 21c-2-2-3.5-4.5-3.5-7V11a1.5 1.5 0 0 1 3 0v1V5a1.6 1.6 0 0 1 3.2 0v5-1.5a1.6 1.6 0 0 1 3.2 0V11v-1a1.6 1.6 0 0 1 3.2 0v4.5c0 3-1.2 5-2.6 6.5z" fill="#ffd9c7" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/>',
  cottonPad: '<circle cx="12" cy="12" r="8.5" fill="#fff" stroke="currentColor" stroke-width="1.4"/><circle cx="12" cy="12" r="5" fill="none" stroke="#9aa8b4" stroke-width="1.2" stroke-dasharray="2 2"/>',
  tweezers: '<path d="M5 3l6.8 17.5M19 3l-6.8 17.5" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/>',
  noseStrip: '<rect x="3" y="8" width="18" height="8" rx="3" fill="#f5f1e8" stroke="currentColor" stroke-width="1.4"/><circle cx="8" cy="12" r="1" fill="#3a2a22"/><circle cx="12" cy="11" r="1" fill="#3a2a22"/><circle cx="15.5" cy="13" r="1" fill="#3a2a22"/>',
  warmCloth: '<rect x="4" y="10" width="16" height="10" rx="2.5" fill="#ffb3c4" stroke="currentColor" stroke-width="1.4"/><path d="M8.5 8c1-1.5-1-2.5 0-4M12 8c1-1.5-1-2.5 0-4M15.5 8c1-1.5-1-2.5 0-4" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>',
  patch: '<circle cx="12" cy="12" r="8.5" fill="#faecd6" stroke="currentColor" stroke-width="1.4"/><ellipse cx="9" cy="8.8" rx="2.6" ry="1.3" transform="rotate(-35 9 8.8)" fill="#fff"/>',
};

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
 * Create the pop scene.
 * @param {{t: (key: string, vars?: object) => string, storage?: Storage, seed?: number, spec?: object, strip?: boolean,
 *   count?: number, tier?: number, career?: boolean, onReputationHit?: (amount: number) => void}} o the text lookup
 *   (core/strings.js t), where the sound switch is remembered, the first face's seed (random when left out), a fixed
 *   face spec (a random one per face when left out), whether the face gets a blackhead strip on the nose, how many
 *   bumps per face, the studio tier for the room behind (0..2), career = a Story/Career round that can fail (free play
 *   when false), and the reputation hook called by "Next customer" after a fail
 * @returns {{node: HTMLElement, mount: (host: HTMLElement) => void, newFace: () => void, unlock: () => void,
 *   setTier: (tier: number) => void, results: () => object[], dispose: () => void}} the scene's element and its controls
 */
export function createPopMode({
  t, storage, seed: firstSeed, spec: fixedSpec, strip = false, count = FACE_BUMPS, tier: firstTier = 0, career = false,
  onReputationHit = () => {},
}) {
  const mode = career ? 'career' : 'free';
  const results = []; // every finished or failed customer's round data (game/scoring.js), newest last
  const sound = createSound({ sfxOn: loadPopSoundOn(storage), onChange: (s) => savePopSoundOn(storage, s.sfxOn) });
  let seed = Number.isFinite(firstSeed) && firstSeed > 0 ? Math.floor(firstSeed) : 1 + Math.floor(Math.random() * 2e9);
  let current = null; // {scene, canvas, w, h, dpr, face, spec, seed, total, healed}
  let disposed = false;
  let tier = firstTier;
  const backdrop = el('canvas', 'pop-backdrop'); // the studio room, behind the face canvas
  backdrop.setAttribute('aria-hidden', 'true');
  const back = { w: 0, h: 0, dpr: 1, timer: 0, start: performance.now() };

  const root = el('section', 'pop-game');
  root.setAttribute('role', 'region');
  root.setAttribute('aria-label', t('pop.region'));
  const head = el('div', 'pop-head');
  const titles = el('div', 'pop-titles');
  const title = el('p', 'pop-title', t('pop.title'));
  const count_ = el('p', 'pop-count');
  count_.setAttribute('aria-live', 'polite');
  // The irritation meter beside the counter line (it fills with Ows and cold pops, SPEC D15).
  const irrMeter = el('span', 'pop-irr');
  irrMeter.setAttribute('role', 'meter');
  irrMeter.setAttribute('aria-label', t('pop.meter'));
  irrMeter.setAttribute('aria-valuemin', '0');
  irrMeter.setAttribute('aria-valuemax', '100');
  irrMeter.setAttribute('aria-valuenow', '0');
  irrMeter.title = t('pop.meter');
  const irrFill = el('span', 'pop-irr__fill');
  irrMeter.append(irrFill);
  const countLine = el('div', 'pop-countline');
  countLine.append(count_, irrMeter);
  titles.append(title, countLine);
  const newBtn = button('pop-btn pop-new', t('pop.newFace'), () => newFace(true));
  head.append(titles, soundSwitch(), newBtn);
  const stage = el('div', 'pop-stage');
  const foot = el('div', 'pop-foot');
  const hint = el('p', 'pop-hint');
  foot.append(hint);
  const done = el('div', 'pop-done');
  done.hidden = true;
  done.append(el('p', 'pop-done__text', t('pop.finale.done')), button('pop-btn pop-btn--main', t('pop.newFace'), () => newFace(true)));
  // The tool bar: one button per tool (picture and name); the one in hand is pressed. The warm cloth shows its meter.
  let toolId = START_TOOL;
  const toolIds = toolBarIds({ demo: true });
  const bar = el('div', 'pop-tools');
  bar.setAttribute('role', 'toolbar');
  bar.setAttribute('aria-label', t('pop.tools'));
  const toolButtons = new Map();
  let warmFill = null;
  for (const id of toolIds) {
    const b = button('pop-tool', '', () => pickTool(id));
    const name = t(`tool.${id}.name`);
    b.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true">${TOOL_ICONS[id] ?? ''}</svg>`;
    b.append(el('span', 'pop-tool__name', name));
    b.title = name;
    b.setAttribute('aria-pressed', String(id === toolId));
    if (id === 'warmCloth') {
      const meter = el('span', 'pop-tool__meter');
      meter.setAttribute('aria-hidden', 'true');
      warmFill = el('span', 'pop-tool__fill');
      meter.append(warmFill);
      b.append(meter);
    }
    toolButtons.set(id, b);
    bar.append(b);
  }
  // The fail overlay (SPEC D15): the customer stormed off. Try again (same customer) or Next customer.
  const fail = el('div', 'pop-fail');
  fail.hidden = true;
  fail.setAttribute('role', 'dialog');
  fail.setAttribute('aria-label', t('pop.fail.title'));
  fail.append(
    el('p', 'pop-fail__title', t('pop.fail.title')),
    el('p', 'pop-fail__text', t('pop.fail.text')),
    button('pop-btn pop-btn--main', t('pop.fail.again'), () => newFace(true, true)),
    button('pop-btn', t('pop.fail.next'), () => nextAfterFail()),
  );
  root.append(head, stage, bar, foot, done, fail);
  root.addEventListener('pointerdown', () => sound.unlock(), true);

  /** The seed for the next face. @returns {number} seed */
  const nextSeed = () => { seed = (seed * 7919 + 17) % 2147483647; return seed; };

  /** The sound on/off switch (an icon button that swaps itself when pressed). @returns {HTMLButtonElement} the switch */
  function soundSwitch() {
    const isOn = sound.isOn();
    const b = button(`pop-btn pop-sound${isOn ? '' : ' pop-sound--off'}`, '', () => {
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
   * The hint text for a step of the scene (while popping: what the tool in hand does).
   * @param {string} step pop, wipe, cream or done
   * @returns {string} the text
   */
  function hintFor(step) {
    if (step === 'wipe') return t('pop.hint.wipe');
    if (step === 'cream' || step === 'done') return t('pop.hint.cream');
    return t(`tool.${toolId}.hint`);
  }

  /**
   * Pick up a tool from the tool bar: press its button, hand it to the scene, and show what it does.
   * @param {string} id a tool id
   * @returns {void}
   */
  function pickTool(id) {
    toolId = id;
    for (const [k, b] of toolButtons) b.setAttribute('aria-pressed', String(k === id));
    current?.scene?.setTool(id);
    if ((current?.scene?.step() ?? 'pop') === 'pop') hint.textContent = hintFor('pop');
  }

  /**
   * Show the warm meter on the warm cloth's button.
   * @param {number} w warmth 0..1
   * @returns {void}
   */
  function showWarmth(w) {
    if (warmFill) warmFill.style.transform = `scaleX(${w})`;
    toolButtons.get('warmCloth')?.classList.toggle('pop-tool--warm', w > 0);
  }

  /**
   * Show the irritation meter: its fill, and a warning colour when it is nearly full.
   * @param {number} lv irritation 0..1
   * @returns {void}
   */
  function showIrritation(lv) {
    irrFill.style.transform = `scaleX(${lv})`;
    irrMeter.classList.toggle('pop-irr--high', lv >= 0.7);
    irrMeter.setAttribute('aria-valuenow', String(Math.round(lv * 100)));
  }

  /**
   * The customer storms off (SPEC D15, cartoon only): popping stops, a huff and a door-slam thud, the face slides away
   * (fades, with reduced motion), and the fail overlay offers Try again or Next customer. The round gets no stars.
   * @param {object} c the current face
   * @returns {void}
   */
  function stormOff(c) {
    c.failed = true;
    newBtn.disabled = true; // only the two fail choices now
    c.scene?.halt();
    c.round = registerFail(c.round);
    clearTimeout(c.winceTimer);
    c.wince = true;
    c.scene?.setTexture(faceTexture(c));
    sound.play('ow_customer');
    buzz([60, 40, 120]);
    c.canvas.classList.add('pop-canvas--storm');
    foot.hidden = true;
    bar.hidden = true;
    c.failTimer = setTimeout(() => {
      if (current !== c) return;
      sound.play('splat'); // the door slams
      fail.hidden = false;
      fail.querySelector('button')?.focus({ preventScroll: true });
    }, prefersReducedMotion() ? 250 : 700);
  }

  /** After a fail: take the reputation hit (a hook for now) and show the next customer. @returns {void} */
  function nextAfterFail() {
    const c = current;
    if (c?.failed) {
      c.round = registerFail(c.round, { reputationHit: FAIL_REPUTATION_HIT });
      try { onReputationHit(FAIL_REPUTATION_HIT); } catch (e) { console.warn('onReputationHit failed:', e); }
      results.push(c.round);
      c.counted = true;
    }
    newFace(true);
  }

  /**
   * A wrong-tool press: an "Ow!" bubble over the bump, the face winces for a moment, and the Ow is counted.
   * @param {object} c the current face
   * @param {{x: number, y: number}} at where the bump is (scene px)
   * @returns {void}
   */
  function showOw(c, at) {
    c.round = registerOw(c.round);
    drawCount();
    const bubble = el('p', 'pop-ow', t('pop.ow'));
    bubble.setAttribute('aria-hidden', 'true'); // the counter line says it for screen readers
    bubble.style.left = `${at.x}px`;
    bubble.style.top = `${at.y}px`;
    stage.append(bubble);
    setTimeout(() => bubble.remove(), 900);
    clearTimeout(c.winceTimer);
    c.wince = true;
    c.scene?.setTexture(faceTexture(c));
    c.winceTimer = setTimeout(() => {
      if (current !== c || !c.scene) return;
      c.wince = false;
      c.scene.setTexture(faceTexture(c));
    }, 700);
  }

  /** Show how many bumps are left and how many Ow so far (only while popping). @returns {void} */
  function drawCount() {
    const scene = current?.scene;
    if (!scene || scene.step() !== 'pop') { count_.textContent = ''; return; }
    const ows = current.round?.owCount ?? 0;
    count_.textContent = ows ? t('pop.leftOws', { left: scene.left(), ows }) : t('pop.left', { n: scene.left() });
  }

  /** The size of the free area for the canvas, measured. @returns {{w: number, h: number}} CSS px */
  function stageSize() {
    const r = stage.getBoundingClientRect();
    return { w: Math.max(240, Math.round(r.width)), h: Math.max(240, Math.round(r.height)) };
  }

  /**
   * Give a canvas its on-screen size in CSS px.
   * @param {HTMLCanvasElement} cv the canvas
   * @param {number} w width
   * @param {number} h height
   * @returns {void}
   */
  function sizeCanvas(cv, w, h) {
    cv.style.width = `${w}px`;
    cv.style.height = `${h}px`;
  }

  /**
   * Paint the studio room behind the face for this moment, and plan the next repaint (only while the lamp flickers;
   * never with reduced motion). Repaints the whole room when the stage size changed.
   * @returns {void}
   */
  function paintBackdrop() {
    clearTimeout(back.timer);
    if (disposed) return;
    const { w, h } = stageSize();
    const dpr = Math.min(2, globalThis.devicePixelRatio || 1);
    if (w !== back.w || h !== back.h || dpr !== back.dpr) {
      Object.assign(back, { w, h, dpr });
      backdrop.width = Math.round(w * dpr);
      backdrop.height = Math.round(h * dpr);
      sizeCanvas(backdrop, w, h);
    }
    const ctx = backdrop.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const reduced = prefersReducedMotion();
    const time = (performance.now() - back.start) / 1000;
    drawBackdrop(ctx, w, h, { tier, time, reduced, dpr });
    const next = nextBackdropChange(time, tier, reduced);
    if (Number.isFinite(next)) back.timer = setTimeout(() => requestAnimationFrame(paintBackdrop), next * 1000);
  }

  /**
   * Paint the face picture for its present state (redder and sadder with more bumps left). Only the person is
   * painted; around them the picture is see-through so the studio room behind shows.
   * @param {object} c the current face
   * @returns {HTMLCanvasElement} the texture
   */
  function faceTexture(c) {
    const cleared = c.scene ? c.scene.all().filter((p) => p.popped).length : 0;
    const mood = c.wince && !c.healed ? 'ow' : faceMood(cleared, c.total, c.healed); // a short wince after an Ow
    const redness = c.healed ? 0 : 1 - cleared / Math.max(1, c.total);
    const { canvas, ctx } = makeCanvas(c.w, c.h, c.dpr);
    ctx.lineCap = 'butt';
    // face.js paints its own plain wall over the whole width first; with width 0 that wall is skipped (zero-size fill,
    // zero-length tile lines), so only the person is drawn. Everything else in face.js reads cx, cy, rx, ry and height.
    drawFace(ctx, { ...c.face, width: 0 }, c.spec, { mood, redness, seed: c.seed, dpr: c.dpr });
    return canvas;
  }

  /**
   * The stage changed size (window resized, phone turned): repaint the room and move the round in progress to the
   * new size. The face is laid out again for the new size and every bump, mark and bit of goo keeps its place on it.
   * @returns {void}
   */
  function relayout() {
    if (disposed) return;
    paintBackdrop();
    const c = current;
    if (!c?.scene) return;
    const { w, h } = stageSize();
    if (w === c.w && h === c.h) return;
    const face = faceGeometry(w, h, c.spec);
    const move = faceMap(c.face, face);
    Object.assign(c, { w, h, face });
    sizeCanvas(c.canvas, w, h);
    c.scene.resize(w, h, faceTexture(c), move);
  }

  /**
   * Start a fresh face: new person, new bumps, sized to the stage as it is now.
   * @param {boolean} [focus] move keyboard focus to the face (after the button was used)
   * @returns {void}
   */
  function newFace(focus = false, again = false) {
    if (disposed) return;
    const prev = current;
    if (prev && !again && !prev.counted && (prev.failed || prev.healed)) results.push(prev.round); // a finished customer
    prev?.scene?.dispose();
    clearTimeout(prev?.failTimer);
    fail.hidden = true;
    showIrritation(0);
    newBtn.disabled = false;
    stage.replaceChildren(backdrop);
    paintBackdrop();
    done.hidden = true;
    foot.hidden = false;
    bar.hidden = false;
    showWarmth(0);
    clearTimeout(current?.winceTimer);
    const s = again && prev ? prev.seed : current ? nextSeed() : seed; // Try again = the same customer, a fresh face
    const spec = again && prev ? prev.spec : fixedSpec ?? randomFaceSpec(s);
    const { w, h } = stageSize();
    const dpr = Math.min(2, globalThis.devicePixelRatio || 1);
    const face = faceGeometry(w, h, spec);
    const clownNose = (spec.accessories ?? []).includes('clown-nose'); // no nose strip over a clown nose
    const lay = layoutFace({ seed: s, face, count, strip: strip && !clownNose });
    const canvas = el('canvas', 'pop-canvas');
    canvas.tabIndex = 0;
    canvas.setAttribute('role', 'img');
    canvas.setAttribute('aria-label', t('pop.canvas'));
    stage.append(canvas);
    const c = {
      canvas, w, h, dpr, face, spec, seed: s, total: lay.pimples.length, healed: false, scene: null,
      round: createRound(lay.pimples.length), wince: false, winceTimer: 0, patches: 0,
    };
    current = c;
    sizeCanvas(canvas, w, h);
    c.scene = createPopScene(canvas, {
      width: w, height: h, dpr, reduced: prefersReducedMotion(), sound, buzz,
      texture: faceTexture(c), pimples: lay.pimples, strip: lay.strip,
      tool: toolId, tools: toolIds, face: { cx: face.cx, cy: face.cy, rx: face.rx, ry: face.ry },
      onOw: (at) => { if (current === c) showOw(c, at); },
      onWarm: (wv) => { if (current === c) showWarmth(wv); },
      onIrritation: (lv) => {
        if (current !== c) return;
        showIrritation(lv);
        if (!c.failed && isFail(lv, mode)) stormOff(c);
      },
      onPatch: (n) => { c.patches = n; }, // the tip bonus for patches comes with the tips system
      onNote: (n) => { if (n === 'patchFirst' && current === c) hint.textContent = t('tool.patch.notYet'); },
      onPop: () => {
        c.round = registerPop(c.round, { timeSeconds: performance.now() / 1000, clean: true });
        drawCount();
        c.scene?.setTexture(faceTexture(c));
      },
      onStep: (step) => {
        hint.textContent = hintFor(step);
        drawCount();
        if (step === 'done') {
          c.round = registerCleanup(c.round);
          c.healed = true;
          c.scene.setTexture(faceTexture(c));
        }
      },
      onDone: () => {
        if (current !== c) return;
        sound.play('cheer');
        buzz([30, 60, 30, 60, 80]);
        foot.hidden = true;
        bar.hidden = true;
        done.hidden = false;
        done.querySelector('button')?.focus({ preventScroll: true });
      },
    });
    canvas.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { if (c.scene.keyPress()) e.preventDefault(); }
    });
    hint.textContent = hintFor('pop');
    drawCount();
    if (focus) canvas.focus({ preventScroll: true });
  }

  let resizeTimer = 0;
  /** Window or stage size changed: lay the scene out again a moment later (once the size has settled). @returns {void} */
  const onResize = () => { clearTimeout(resizeTimer); resizeTimer = setTimeout(relayout, 120); };
  const watcher = typeof ResizeObserver === 'function' ? new ResizeObserver(onResize) : null; // also catches bar size changes

  return {
    node: root,
    /**
     * Put the scene into a page element and show the first face (it needs to be in the page to measure its size).
     * @param {HTMLElement} host the element to fill
     * @returns {void}
     */
    mount(host) {
      host.append(root);
      globalThis.addEventListener?.('resize', onResize);
      watcher?.observe(stage);
      requestAnimationFrame(() => newFace(false));
    },
    /** Show a new face. @returns {void} */
    newFace: () => newFace(true),
    /** Wake the popping sounds up (call from inside a tap). @returns {void} */
    unlock: () => sound.unlock(),
    /**
     * Change the studio room behind the face (SPEC D11: it follows the studio upgrades).
     * @param {number} next tier 0..2
     * @returns {void}
     */
    setTier(next) { tier = next; paintBackdrop(); },
    /** Every finished or failed customer so far (round data with stars, Ows, failed and reputationHit). @returns {object[]} rounds */
    results: () => results.slice(),
    /** Stop everything when leaving the page. @returns {void} */
    dispose() {
      disposed = true;
      clearTimeout(back.timer);
      clearTimeout(resizeTimer);
      watcher?.disconnect();
      clearTimeout(current?.winceTimer);
      clearTimeout(current?.failTimer);
      current?.scene?.dispose();
      current = null;
      globalThis.removeEventListener?.('resize', onResize);
      root.remove();
      sound.dispose();
    },
  };
}
