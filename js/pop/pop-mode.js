// The pop scene the player sees and touches (T1.0, SPEC D9): one full face (head and shoulders) with bumps all over
// it. Press and hold a bump to squeeze it; when all are out, wipe the goo off and the cream heals the skin. A header
// shows the title, how many bumps are left, the sound switch and a "New face" button; a hint line sits below.
// Behind the person the studio room shows (backdrop.js, SPEC D10 and D11), in portrait and landscape: on a phone held
// sideways the header and hint float over the room at the sides (pop.css). The scene fills its container; when the
// window changes size or the phone turns, the face is laid out again for the new size and the round goes on (every
// bump keeps its place on the face, popped ones stay popped).
// Keyboard: Tab to the face, Enter or Space squeezes the next bump, peels or wipes. All text comes from t().
// Nothing here is sent anywhere.
import { faceGeometry, faceMap, layoutFace, faceMood, FACE_BUMPS, loadPopSoundOn, savePopSoundOn } from './logic.js';
import { createPopScene } from './engine.js';
import { createSound } from '../core/sound.js';
import { drawFace, randomFaceSpec } from './face.js';
import { makeCanvas } from './art.js';
import { drawBackdrop, nextBackdropChange } from './backdrop.js';

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
 *   count?: number, tier?: number}} o the text lookup (core/strings.js t), where the sound switch is remembered, the
 *   first face's seed (random when left out), a fixed face spec (a random one per face when left out), whether the
 *   face gets a blackhead strip on the nose, how many bumps per face, and the studio tier for the room behind (0..2)
 * @returns {{node: HTMLElement, mount: (host: HTMLElement) => void, newFace: () => void, unlock: () => void,
 *   setTier: (tier: number) => void, dispose: () => void}} the scene's element and its controls
 */
export function createPopMode({ t, storage, seed: firstSeed, spec: fixedSpec, strip = false, count = FACE_BUMPS, tier: firstTier = 0 }) {
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
  titles.append(title, count_);
  const newBtn = button('pop-btn pop-new', t('pop.newFace'), () => newFace(true));
  head.append(titles, soundSwitch(), newBtn);
  const stage = el('div', 'pop-stage');
  const foot = el('div', 'pop-foot');
  const hint = el('p', 'pop-hint');
  foot.append(hint);
  const done = el('div', 'pop-done');
  done.hidden = true;
  done.append(el('p', 'pop-done__text', t('pop.finale.done')), button('pop-btn pop-btn--main', t('pop.newFace'), () => newFace(true)));
  root.append(head, stage, foot, done);
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
   * The hint text key for a step of the scene.
   * @param {string} step pop, wipe, cream or done
   * @returns {string} the text
   */
  function hintFor(step) {
    if (step === 'wipe') return t('pop.hint.wipe');
    if (step === 'cream' || step === 'done') return t('pop.hint.cream');
    return strip ? t('pop.finale.hint') : t('pop.hint.pop');
  }

  /** Show how many bumps are left (only while popping). @returns {void} */
  function drawCount() {
    const scene = current?.scene;
    count_.textContent = scene && scene.step() === 'pop' ? t('pop.left', { n: scene.left() }) : '';
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
    const mood = faceMood(cleared, c.total, c.healed);
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
  function newFace(focus = false) {
    if (disposed) return;
    current?.scene?.dispose();
    stage.replaceChildren(backdrop);
    paintBackdrop();
    done.hidden = true;
    foot.hidden = false;
    const s = current ? nextSeed() : seed;
    const spec = fixedSpec ?? randomFaceSpec(s);
    const { w, h } = stageSize();
    const dpr = Math.min(2, globalThis.devicePixelRatio || 1);
    const face = faceGeometry(w, h, spec);
    const lay = layoutFace({ seed: s, face, count, strip });
    const canvas = el('canvas', 'pop-canvas');
    canvas.tabIndex = 0;
    canvas.setAttribute('role', 'img');
    canvas.setAttribute('aria-label', t('pop.canvas'));
    stage.append(canvas);
    const c = { canvas, w, h, dpr, face, spec, seed: s, total: lay.pimples.length, healed: false, scene: null };
    current = c;
    sizeCanvas(canvas, w, h);
    c.scene = createPopScene(canvas, {
      width: w, height: h, dpr, reduced: prefersReducedMotion(), sound, buzz,
      texture: faceTexture(c), pimples: lay.pimples, strip: lay.strip,
      onPop: () => {
        drawCount();
        c.scene?.setTexture(faceTexture(c));
      },
      onStep: (step) => {
        hint.textContent = hintFor(step);
        drawCount();
        if (step === 'done') {
          c.healed = true;
          c.scene.setTexture(faceTexture(c));
        }
      },
      onDone: () => {
        if (current !== c) return;
        sound.play('cheer');
        buzz([30, 60, 30, 60, 80]);
        foot.hidden = true;
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
    /** Stop everything when leaving the page. @returns {void} */
    dispose() {
      disposed = true;
      clearTimeout(back.timer);
      clearTimeout(resizeTimer);
      watcher?.disconnect();
      current?.scene?.dispose();
      current = null;
      globalThis.removeEventListener?.('resize', onResize);
      root.remove();
      sound.dispose();
    },
  };
}
