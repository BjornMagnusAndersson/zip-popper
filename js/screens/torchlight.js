// The torchlight special mode (T4.5, chapter 1 "The secret"; replaces the Coming soon screen for this chapter, the
// phone-scroll chapter still uses special.js). Night in the living room: the husband sleeps on the sofa and the room
// is dark; only a small torch circle follows her finger (the mouse on a computer), so his face shows only inside the
// light. His 3 bumps are popped by the SAME pop scene as every round (pop/pop-mode.js: hold, or the two-finger squeeze
// when that switch is on); this screen only wraps it: a dark layer over the room with a hole for the torch, his
// sleeping face, a hidden wake-up meter (game/torchlight-logic.js) and his reactions (a twitch, a mumble in a bubble,
// a shift on the sofa, then he calms). If the meter fills he stirs and the round starts again softly (no penalty, no
// money). After the last pop the scripted catch plays (his phone light comes on, a big CAUGHT) and Continue calls
// onContinue, so the story goes on to strip 2.
// Keyboard: the arrow keys move the torch, Space or Enter pops (the torch jumps to the bump being popped).
// Reduced motion: no shaking, no shifting, no flash (the light fades in slowly). All text comes from t().

import { createPopMode } from '../pop/pop-mode.js';
import { BUMPS } from '../data/bumps.js';
import {
  createWake, stepWake, popWake, owWake, takeReactions, isAwake, isCaught, catchScript, torchLight, torchRadius,
  popLoudness, moveTorchByKey, mumbleIndex,
} from '../game/torchlight-logic.js';

/** How many mumble lines the string table has (special.torchlight.mumble1 .. mumbleN). */
const MUMBLES = 4;
/** How long a bubble stays up (ms). */
const BUBBLE_MS = 2200;
/** How long he stirs before the round starts again (ms; shorter with reduced motion). */
const STIR_MS = 2600;
const STIR_MS_STILL = 1800;

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
 * Whether the phone or computer asked for less motion.
 * @returns {boolean} true = calm version
 */
function prefersReducedMotion() {
  try { return Boolean(globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches); } catch { return false; }
}

/**
 * Whether the main pointer can hover (a mouse): then the keyboard line is shown too.
 * @returns {boolean} true on a computer
 */
function hasMouse() {
  try { return Boolean(globalThis.matchMedia?.('(hover: hover)').matches); } catch { return false; }
}

/**
 * A short buzz on phones that can (the game's vibration switch wraps navigator.vibrate).
 * @param {number|number[]} pattern milliseconds on/off
 * @returns {void}
 */
function buzz(pattern) {
  try { globalThis.navigator?.vibrate?.(pattern); } catch { /* not allowed */ }
}

/**
 * Build the torchlight screen and start its round.
 * @param {{t: (key: string, vars?: object) => string, popOptions?: object, roundArgs: object, reducedMotion?: boolean,
 *   onContinue?: () => void, onMenu?: () => void}} o t = string function; popOptions = extra createPopMode options
 *   (storage for the sound switch, squeeze, squeezeHint, onSqueezeHint); roundArgs = the startRound arguments
 *   (app-logic.js torchlightArgs); reducedMotion = the player's calm switch; onContinue = after the catch;
 *   onMenu = the Menu button
 * @returns {{node: HTMLElement, dispose: () => void}} the screen (show it like any other screen)
 */
export function createTorchlightScreen({ t, popOptions = {}, roundArgs, reducedMotion = false, onContinue, onMenu }) {
  /** Calm version: the player's switch or the phone's. @returns {boolean} true = less motion */
  const still = () => reducedMotion === true || prefersReducedMotion();
  const node = el('section', `tl${still() ? ' tl--still' : ''}`);
  node.setAttribute('aria-label', t('special.torchlight.region'));
  const pop = createPopMode({ t, reducedMotion, ...popOptions });
  pop.mount(node);
  const scene = pop.node;
  scene.classList.add('tl-scene');
  const stage = pop.stage;
  if (onMenu) { // the same Menu button as in a customer round
    const menu = el('button', 'pop-btn pop-menu', t('ui.pop.menu'));
    menu.type = 'button';
    menu.addEventListener('click', () => onMenu());
    pop.addHeadButton(menu);
  }
  // The how-to line sits in the pop scene's foot, above its own hint (hold or squeeze).
  const howto = el('p', 'tl-howto', t('special.torchlight.howto'));
  if (hasMouse()) howto.append(' ', el('span', 'tl-howto__keys', t('special.torchlight.howtoKeys')));
  pop.addFootLine(howto);
  // The night: a dark layer over the room and his face with a hole for the torch (pointer events go through it).
  const dark = el('div', 'tl-dark');
  dark.setAttribute('aria-hidden', 'true');
  const zzz = el('p', 'tl-zzz', t('special.torchlight.zzz'));
  zzz.setAttribute('aria-hidden', 'true');
  const bubble = el('p', 'tl-bubble');
  bubble.setAttribute('aria-live', 'polite');
  bubble.hidden = true;
  const notice = el('p', 'tl-notice');
  notice.setAttribute('role', 'status');
  notice.hidden = true;
  // The catch: his phone light, the big CAUGHT and Continue.
  const phone = el('div', 'tl-phone');
  phone.setAttribute('aria-hidden', 'true');
  phone.hidden = true;
  const caught = el('div', 'tl-caught');
  caught.setAttribute('role', 'dialog');
  caught.setAttribute('aria-label', t('special.torchlight.caught'));
  caught.hidden = true;
  const stamp = el('p', 'tl-caught__stamp', t('special.torchlight.caught'));
  const go = el('button', 'pop-btn pop-btn--main tl-caught__go', t('special.torchlight.continue'));
  go.type = 'button';
  go.hidden = true;
  let continued = false;
  go.addEventListener('click', () => {
    if (continued) return;
    continued = true;
    onContinue?.();
  });
  caught.append(stamp, go);
  scene.append(dark, phone, zzz, bubble, notice, caught);

  let phase = 'play'; // play, stir (he is waking: the round starts again soon) or catch (the scripted end)
  let wake = createWake();
  let mumbles = 0;
  let torch = null; // {x, y} in scene px (the pop scene's own box), null until the face is laid out
  const pointers = new Map(); // fingers (or the mouse) down on the scene: id -> {x, y}
  const timers = new Set();
  let bubbleTimer = 0;
  let raf = 0;
  let last = performance.now();
  let disposed = false;
  let drawn = '';

  /**
   * Run something later, and forget it when the screen goes.
   * @param {() => void} fn what to run
   * @param {number} ms after how long
   * @returns {number} the timer
   */
  function later(fn, ms) {
    const id = setTimeout(() => { timers.delete(id); if (!disposed) fn(); }, ms);
    timers.add(id);
    return id;
  }

  /** Where the stage is inside the scene (scene px). @returns {{x: number, y: number, w: number, h: number}} box */
  function stageBox() {
    const s = scene.getBoundingClientRect();
    const r = stage.getBoundingClientRect();
    return { x: r.left - s.left, y: r.top - s.top, w: r.width, h: r.height };
  }

  /**
   * His face on screen in scene px (the pop scene reports stage px), or null before the face is laid out.
   * @returns {{cx: number, cy: number, rx: number, ry: number, eyes: {x: number, y: number}[]}|null} the face
   */
  function faceNow() {
    const f = pop.faceBox();
    if (!f) return null;
    const b = stageBox();
    return { cx: f.cx + b.x, cy: f.cy + b.y, rx: f.rx, ry: f.ry, eyes: f.eyes.map((e) => ({ x: e.x + b.x, y: e.y + b.y })) };
  }

  /**
   * A pointer event's place in scene px.
   * @param {PointerEvent} e the event
   * @returns {{x: number, y: number}} the place
   */
  function pointAt(e) {
    const s = scene.getBoundingClientRect();
    return { x: e.clientX - s.left, y: e.clientY - s.top };
  }

  /**
   * A finger or the mouse moved or came down: the torch follows (between two fingers while squeezing).
   * @param {PointerEvent} e the event
   * @returns {void}
   */
  function onPointer(e) {
    if (phase === 'catch') return;
    if (e.type === 'pointerdown' || e.buttons || e.pointerType === 'mouse') pointers.set(e.pointerId, pointAt(e));
    if (e.pointerType === 'mouse' && !e.buttons && e.type !== 'pointerdown') { torch = pointAt(e); pointers.delete(e.pointerId); return; }
    const all = [...pointers.values()];
    if (all.length) torch = { x: all.reduce((s, p) => s + p.x, 0) / all.length, y: all.reduce((s, p) => s + p.y, 0) / all.length };
  }

  /**
   * A finger was lifted: it no longer steers the torch (the torch stays where it was).
   * @param {PointerEvent} e the event
   * @returns {void}
   */
  function onPointerEnd(e) {
    pointers.delete(e.pointerId);
  }

  /**
   * Keys: the arrows move the torch (the pop scene's own arrow keys only pan a zoomed view, so they are kept from it);
   * Space or Enter on the face moves the torch onto the bump the keyboard pops next, then the pop scene pops.
   * @param {KeyboardEvent} e the key
   * @returns {void}
   */
  function onKey(e) {
    if (phase !== 'play' || !torch || e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.key === ' ' || e.key === 'Enter') {
      if (!e.target?.classList?.contains('pop-canvas')) return;
      const next = pop.bumps()[0];
      if (next) { const b = stageBox(); torch = { x: next.x + b.x, y: next.y + b.y }; }
      return;
    }
    const s = scene.getBoundingClientRect();
    const moved = moveTorchByKey(torch, e.key, { w: s.width, h: s.height });
    if (!moved) return;
    torch = moved;
    e.preventDefault();
    e.stopPropagation();
  }

  /**
   * Show a line in his speech bubble near his head for a moment.
   * @param {string} text the line
   * @returns {void}
   */
  function say(text) {
    bubble.textContent = text;
    bubble.hidden = false;
    clearTimeout(bubbleTimer);
    bubbleTimer = later(() => { bubble.hidden = true; }, BUBBLE_MS);
  }

  /**
   * Play a class animation on his face once (nothing with reduced motion).
   * @param {string} cls the class (tl-twitch or tl-shift)
   * @param {number} ms how long it runs
   * @returns {void}
   */
  function animateFace(cls, ms) {
    if (still()) return;
    const canvas = pop.faceCanvas();
    if (!canvas) return;
    canvas.classList.remove(cls);
    void canvas.offsetWidth; // restart the animation if it was already on
    canvas.classList.add(cls);
    later(() => canvas.classList.remove(cls), ms);
  }

  /**
   * One of his reactions on the way up the meter: a twitch, a mumble, a shift on the sofa.
   * @param {string} id twitch, mumble or shift
   * @returns {void}
   */
  function react(id) {
    if (id === 'twitch') {
      animateFace('tl-twitch', 500);
      say(t('special.torchlight.twitch'));
      buzz(12);
    } else if (id === 'mumble') {
      say(t(`special.torchlight.mumble${mumbleIndex(mumbles, MUMBLES)}`));
      mumbles += 1;
    } else if (id === 'shift') {
      animateFace('tl-shift', 1500);
      say(t('special.torchlight.shift'));
      buzz([20, 40, 20]);
    }
  }

  /** The meter is full: he stirs; popping stops, and a moment later the round starts again softly. @returns {void} */
  function stir() {
    phase = 'stir';
    pop.halt();
    say(t('special.torchlight.stir'));
    notice.textContent = t('special.torchlight.stirNotice');
    notice.hidden = false;
    animateFace('tl-shift', 1500);
    buzz([30, 60, 30]);
    later(restart, still() ? STIR_MS_STILL : STIR_MS);
  }

  /** Start the round again (a fresh face, the same bumps, the meter back to asleep). @returns {void} */
  function restart() {
    wake = createWake();
    phase = 'play';
    notice.hidden = true;
    torch = null; // placed again below his face once the new face is laid out
    startRound();
  }

  /**
   * A bump popped: the noise raises the meter; the last one starts the scripted catch.
   * @param {{type?: string, r?: number}} bump the bump
   * @param {number} left bumps still to pop
   * @returns {void}
   */
  function onPop(bump, left) {
    if (phase !== 'play') return;
    const caughtNow = isCaught(left, wake); // checked before this pop's noise: the last pop always ends in the catch
    wake = popWake(wake, popLoudness(bump, BUMPS));
    if (caughtNow) startCatch();
  }

  /** A rough press ("Ow!"): he flinches in his sleep. @returns {void} */
  function onOw() {
    if (phase === 'play') wake = owWake(wake);
  }

  /** The scripted catch: a held breath, his phone light, the big CAUGHT, then Continue. @returns {void} */
  function startCatch() {
    phase = 'catch';
    pop.halt();
    pointers.clear();
    bubble.hidden = true;
    pop.hideFoot();
    for (const { at, step } of catchScript(still())) {
      later(() => {
        if (step === 'phone') {
          phone.hidden = false;
          scene.classList.add('tl-scene--lit');
          zzz.hidden = true;
          pop.setMood('grim'); // eyes open: he was awake
        } else if (step === 'caught') {
          caught.hidden = false;
          say(t('special.torchlight.caughtLine'));
          clearTimeout(bubbleTimer); // his line stays up
          buzz([40, 50, 80]);
        } else if (step === 'continue') {
          go.hidden = false;
          go.focus({ preventScroll: true });
        }
      }, at * 1000);
    }
  }

  /** Start (or restart) the round in the pop scene with this screen's listeners. @returns {void} */
  function startRound() {
    pop.startRound({ ...roundArgs, onPop, onOw, onFinish: () => {} });
    pop.setTitle(t('special.torchlight.title')); // after startRound, which puts "Pop them!" there
  }

  /**
   * Paint the night for this moment: the dark layer's hole at the torch, and the Zzz and the bubble above his head.
   * @param {{cx: number, cy: number, rx: number, ry: number}|null} face his face (scene px)
   * @returns {void}
   */
  function paint(face) {
    if (!face || !torch) return;
    const r = torchRadius(face.rx);
    const key = `${Math.round(torch.x)},${Math.round(torch.y)},${Math.round(r)},${Math.round(face.cx)},${Math.round(face.cy)}`;
    if (key === drawn) return;
    drawn = key;
    dark.style.setProperty('--tl-x', `${torch.x}px`);
    dark.style.setProperty('--tl-y', `${torch.y}px`);
    dark.style.setProperty('--tl-r', `${r}px`);
    const topY = face.cy - face.ry * 1.05;
    zzz.style.left = `${face.cx + face.rx * 0.75}px`;
    zzz.style.top = `${topY}px`;
    bubble.style.left = `${face.cx}px`;
    bubble.style.top = `${Math.max(8, topY - face.ry * 0.25)}px`;
  }

  /** One frame: the meter follows the light and the time, his reactions fire, and the night is painted. @returns {void} */
  function tick() {
    raf = 0;
    if (disposed) return;
    const now = performance.now();
    // At most a tenth of a second per frame: no frames run while the page is hidden, and the first frame back must not
    // count the whole hidden time (he would wake up at once after a phone call, B83).
    const dt = Math.min(0.1, Math.max(0, (now - last) / 1000));
    last = now;
    const face = faceNow();
    if (face && !torch) torch = { x: face.cx, y: Math.min(face.cy + face.ry * 1.35, stageBox().y + stageBox().h - 20) };
    if (phase === 'play' && face && torch) {
      wake = stepWake(wake, dt, torchLight({ ...torch, r: torchRadius(face.rx) }, face));
      const out = takeReactions(wake);
      wake = out.state;
      for (const id of out.fire) react(id);
      if (isAwake(wake)) stir();
    }
    paint(face);
    raf = requestAnimationFrame(tick);
  }

  scene.addEventListener('pointerdown', onPointer, { capture: true, passive: true });
  scene.addEventListener('pointermove', onPointer, { capture: true, passive: true });
  scene.addEventListener('pointerup', onPointerEnd, { capture: true, passive: true });
  scene.addEventListener('pointercancel', onPointerEnd, { capture: true, passive: true });
  scene.addEventListener('keydown', onKey, true);
  startRound();
  raf = requestAnimationFrame(tick);
  // Debug and smoke-test hook (like pop-mode's canvas.popTargets): the phase, the hidden meter, the face and torch.
  node.torchDebug = () => ({ phase, level: wake.level, face: faceNow(), torch });

  return {
    node,
    /** Wake the popping sounds up (call from inside a tap). @returns {void} */
    unlock: () => pop.unlock(),
    /** Stop everything and take the screen away. @returns {void} */
    dispose() {
      disposed = true;
      cancelAnimationFrame(raf);
      for (const id of timers) clearTimeout(id);
      timers.clear();
      pop.dispose();
      node.remove();
    },
  };
}
