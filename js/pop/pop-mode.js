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
// Zoom (T1.4): the whole face is always the start (SPEC D9). Optional zoom 1x to 3x with two fingers, the +, - and
// "whole face" buttons, the mouse wheel, or the keys + - 0 and arrows (engine.js has the gesture rule). The room
// behind zooms along. Every new customer starts at the whole face again.
// Keyboard: Tab to the face, Enter or Space squeezes the next bump, peels or wipes. All text comes from t().
// Two-finger squeeze (T1.7): with the Settings switch on (squeeze: true) the scene lets two fingers round a bump
// squeeze it (engine.js); the fingers' hint line then adds a short squeeze tip, and the very first time a one-time
// hint says how (until the first pop).
// Three ways to play (T3.1b):
// - the demo (the old path, what index.html uses today): random faces, every built tool, "New face" button.
// - startRound(...): ONE customer driven by the game: exactly their bumps and bump kinds, only the tools the player
//   owns, hold times and rough chance from skill by use, a touchier or calmer irritation meter (difficulty), and the
//   customer's request in a small banner that shows done or missed live. No "New face" button. When the customer is
//   done (all bumps handled and the cleanup finished) or stormed off and the player chose Try again or Next customer,
//   onFinish is called once with everything the game needs (round-logic.js finishPayload).
// - startFree(...): free play: random faces, the owned tools, never fails, no onFinish, "New face" button.
// The pure rules for rounds live in round-logic.js. Nothing here is sent anywhere.
// Hooks for a special mode wrapped round the scene (T4.5 torchlight, screens/torchlight.js): startRound may fix the
// face's mood (mood: 'sleep') and pass onPop and onOw listeners; setMood, halt, faceBox and bumps let the wrapper
// change the face, stop popping, and know where the face, its eyes and the bumps are on screen.
// Field guide (T6.5): with onGuide a small "?" button in the header opens the guide (the game shows it over the scene;
// it is left out of hurry rounds, whose clock cannot pause). With seenKinds, each new face tells the game which kinds
// she meets for the first time (onSeenKinds), and the hint line says "New: ...!" for them, one at a time.
// Twists (T8.3): startRound's twist goes to the engine (fidgety sway, ticklish giggle, sensitive skin), shows as a
// small label beside the meter, and its tip sits on the hint line until the first pop; a giggle shows "Hehehe!".
import { faceGeometry, faceMap, layoutFace, faceMood, FACE_BUMPS, loadPopSoundOn, savePopSoundOn, ZOOM_MAX, ZOOM_STEP } from './logic.js';
import { createPopScene } from './engine.js';
import { createSound } from '../core/sound.js';
import { drawFace, randomFaceSpec } from './face.js';
import { makeCanvas } from './art.js';
import { sceneRatio } from './perf-logic.js';
import { drawBackdrop, nextBackdropChange, backdropKind, roomLeaks, dripLands, nextDripLanding } from './backdrop.js';
import { toolBarIds, START_TOOL, isFail } from './tool-logic.js';
import { canSqueeze } from './squeeze-logic.js';
import { createRound, registerPop, registerOw, registerCleanup, registerFail, allHandled } from '../game/scoring.js';
import {
  applyMastery, irritationScales, roundTools, roundFaceSetup, requestView, finishPayload, END_PAUSE, END_PAUSE_REDUCED,
  stripChance, stripHintKey, wipeHintKey, hiddenMs, clockSeconds,
} from './round-logic.js';
import { kindsOnFace, newKindQueue, hintQueueAfterPop, newKindHintKey } from '../screens/guide-logic.js';

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
 *   count?: number, tier?: number, layers?: string[], career?: boolean, onReputationHit?: (amount: number) => void,
 *   reducedMotion?: boolean, squeeze?: boolean, squeezeHint?: boolean, onSqueezeHint?: () => void,
 *   sfxVolume?: number, lowDetail?: boolean, onSlow?: () => void}} o the text lookup
 *   (core/strings.js t), where the sound switch is remembered, the first face's seed (random when left out), a fixed
 *   face spec (a random one per face when left out), whether the face gets a blackhead strip on the nose, how many
 *   bumps per face, the studio tier for the room behind (0..2) and its owned upgrade layers (T5.1a), career = a Story/Career round that can fail (free play
 *   when false), the reputation hook called by "Next customer" after a fail, and reducedMotion = true for the calm
 *   version whatever the phone says (the player's Settings switch). Field guide (T6.5): onGuide = the "?" button
 *   was pressed (left out = no button); seenKinds = the kinds she has met (left out = no first-time hints);
 *   onSeenKinds(kinds) = she just met these kinds on a new face. sfxVolume = the Settings effects volume, 0 to 1.
 *   lowDetail = the Settings switch "Lighter graphics" (the scene drawn at pixel ratio 1); onSlow = the frames stayed
 *   slow, so the scene switched to lighter graphics by itself (pop/perf-logic.js; the caller saves the switch)
 * @returns {{node: HTMLElement, mount: (host: HTMLElement) => void, newFace: () => void, unlock: () => void,
 *   setTier: (tier: number, layers?: string[]) => void, results: () => object[], startRound: (o: object) => void,
 *   startFree: (o?: object) => void, setUnlockedTools: (list: string[]) => void, dispose: () => void}} the scene's
 *   element and its controls (startRound and startFree: see their own comments below)
 */
export function createPopMode({
  t, storage, seed: firstSeed, spec: fixedSpec, strip = false, count = FACE_BUMPS, tier: firstTier = 0, layers: firstLayers = [], career = false,
  onReputationHit = () => {}, reducedMotion = false, squeeze = false, squeezeHint = false, onSqueezeHint = () => {},
  onGuide = null, seenKinds = null, onSeenKinds = () => {}, lowDetail = false, onSlow = () => {}, sfxVolume = 1,
}) {
  let lighter = Boolean(lowDetail); // lighter graphics (owner 2026-10-28: older phones): the scene at pixel ratio 1
  const seenSet = Array.isArray(seenKinds) ? new Set(seenKinds) : null; // the kinds met so far (T6.5), null = no hints
  // Two-finger squeeze (T1.7): squeeze = the Settings switch; squeezeHint = show "squeeze between two fingers" until
  // the first pop of this scene (onSqueezeHint is told once, so the game shows it only once ever).
  let squeezeHintOn = Boolean(squeeze && squeezeHint);
  /** Calm version: the player's own setting (reducedMotion, T3.1c) or the phone's. @returns {boolean} true = less motion */
  const still = () => reducedMotion === true || prefersReducedMotion();
  const results = []; // every finished or failed customer's round data (game/scoring.js), newest last
  // sfxVolume = the Settings effects slider (0 to 1), so pop sounds follow it like the menus and comics do.
  const sound = createSound({ sfxOn: loadPopSoundOn(storage), sfxVolume, onChange: (s) => savePopSoundOn(storage, s.sfxOn) });
  let seed = Number.isFinite(firstSeed) && firstSeed > 0 ? Math.floor(firstSeed) : 1 + Math.floor(Math.random() * 2e9);
  let freshSeed = true; // the next face uses `seed` as it is (the first face, or after startFree with a seed)
  let current = null; // {scene, canvas, w, h, dpr, face, spec, seed, total, healed, round, owed, ...}
  let disposed = false;
  let ready = false; // mounted and measured: faces can be laid out
  let tier = firstTier;
  let layers = Array.isArray(firstLayers) ? [...firstLayers] : []; // owned studio upgrades drawn in the room (T5.1a)
  let pins = 0; // home-popping pins in the jar on the shelf (game/pin-jar.js; startRound and startFree say how many)
  let room = 'studio'; // the room behind the face: 'studio' or 'home' (startRound's room, SPEC D19)
  let moodOverride = null; // a fixed face mood from startRound or setMood (e.g. 'sleep'), null = the usual moods
  // How faces are made now: 'demo' (the old path), 'round' (one customer, startRound) or 'free' (startFree).
  // round: {customer, setup, holdFactors, roughReductions, irritation, request, onFinish, failMode, seed}
  let cfg = { kind: 'demo', failMode: career ? 'career' : 'free', unlockedTools: null };
  const backdrop = el('canvas', 'pop-backdrop'); // the studio room, behind the face canvas
  backdrop.setAttribute('aria-hidden', 'true');
  const back = { w: 0, h: 0, dpr: 1, timer: 0, start: performance.now() };

  const root = el('section', 'pop-game');
  // Reduced motion (the player's switch or the phone's): pop.css stops the Ow float, storm-off slide and hint flash.
  root.classList.toggle('pop-still', still());
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
  // The customer's twist (T8.3) as a small label beside the meter while that customer is in the chair.
  const twistChip = el('span', 'pop-twist');
  twistChip.hidden = true;
  countLine.append(count_, irrMeter, twistChip);
  // The customer's request (T3.1b): a small banner under the counter line, only in a round with a request. The text
  // stays; a mark says done or missed (read out once), and a hurry request counts its seconds down (not read out).
  const reqBox = el('p', 'pop-req');
  reqBox.hidden = true;
  const reqText = el('span', 'pop-req__text');
  const reqTime = el('span', 'pop-req__time');
  reqTime.setAttribute('aria-hidden', 'true');
  const reqState = el('span', 'pop-req__state');
  reqState.setAttribute('aria-live', 'polite');
  reqBox.append(reqText, reqTime, reqState);
  titles.append(title, countLine, reqBox);
  const newBtn = button('pop-btn pop-new', t('pop.newFace'), () => newFace(true));
  // The Field guide's "?" button (T6.5): in the header, so it never covers a bump or the zoom buttons.
  const guideBtn = typeof onGuide === 'function' ? button('pop-btn pop-guide', t('pop.guideMark'), () => onGuide()) : null;
  guideBtn?.setAttribute('aria-label', t('pop.guide'));
  if (guideBtn) guideBtn.title = t('pop.guide');
  head.append(titles, soundSwitch(), ...(guideBtn ? [guideBtn] : []), newBtn);
  const stage = el('div', 'pop-stage');
  const foot = el('div', 'pop-foot');
  const hint = el('p', 'pop-hint');
  foot.append(hint);
  const done = el('div', 'pop-done');
  done.hidden = true;
  done.append(el('p', 'pop-done__text', t('pop.finale.done')), button('pop-btn pop-btn--main', t('pop.newFace'), () => newFace(true)));
  // The tool bar: one button per tool (picture and name); the one in hand is pressed. The warm cloth shows its meter.
  let toolId = START_TOOL;
  let clothBack = START_TOOL; // the tool in hand before the warm cloth (SPEC D37: lifting the cloth goes back to it)
  let toolIds = toolBarIds({ demo: true });
  const bar = el('div', 'pop-tools');
  bar.setAttribute('role', 'toolbar');
  bar.setAttribute('aria-label', t('pop.tools'));
  const toolButtons = new Map();
  let warmFill = null;
  buildToolBar(toolIds);

  /**
   * Fill the tool bar with one button per tool in the list (the old buttons go). If the tool in hand is not in the
   * list any more, fingers are picked up instead.
   * @param {string[]} ids tool ids, in bar order
   * @returns {void}
   */
  function buildToolBar(ids) {
    toolIds = [...ids];
    toolButtons.clear();
    warmFill = null;
    bar.replaceChildren();
    if (!toolIds.includes(toolId)) toolId = START_TOOL;
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
  }
  // The fail overlay (SPEC D15): the customer stormed off. Try again (same customer) or Next customer.
  const fail = el('div', 'pop-fail');
  fail.hidden = true;
  fail.setAttribute('role', 'dialog');
  fail.setAttribute('aria-label', t('pop.fail.title'));
  const failNote = el('p', 'pop-fail__text pop-fail__note'); // what "Next customer" costs (a customer round with a known cost only)
  failNote.hidden = true;
  const failNext = button('pop-btn', t('pop.fail.next'), () => (cfg.kind === 'round' ? finishRound(current, 'next') : nextAfterFail()));
  fail.append(
    el('p', 'pop-fail__title', t('pop.fail.title')),
    el('p', 'pop-fail__text', t('pop.fail.text')),
    failNote,
    button('pop-btn pop-btn--main', t('pop.fail.again'), () => (cfg.kind === 'round' ? finishRound(current, 'again') : newFace(true, true))),
    failNext,
  );
  // The escape overlay (the husband in armor, chapter 2): the first pop is refused, he runs off unharmed. One button,
  // no retry, no cost, no pay.
  const escape = el('div', 'pop-fail pop-fail--escape');
  escape.hidden = true;
  escape.setAttribute('role', 'dialog');
  escape.setAttribute('aria-label', t('pop.escape.title'));
  escape.append(
    el('p', 'pop-fail__title', t('pop.escape.title')),
    el('p', 'pop-fail__text', t('pop.escape.text')),
    button('pop-btn pop-btn--main', t('pop.escape.next'), () => finishRound(current, 'escape')),
  );
  /**
   * Set the header and the fail choice texts for what is being played (B3, B5): a customer round shows the customer's
   * name and what "Next customer" costs in reputation; free play and the demo show the plain texts.
   * @param {string|null} customerName the customer's name, or null
   * @param {number|null} skipCost reputation "Next customer" costs, or null when unknown
   * @returns {void}
   */
  function setRoundTexts(customerName, skipCost) {
    title.textContent = customerName ? t('pop.titleCustomer', { name: customerName }) : t('pop.title');
    const cost = Number.isFinite(skipCost) && skipCost > 0 ? Math.floor(skipCost) : null;
    failNext.textContent = cost ? t('pop.fail.nextCost', { n: cost }) : t('pop.fail.next');
    failNote.textContent = cost ? t('pop.fail.skipNote', { n: cost }) : '';
    failNote.hidden = !cost;
  }
  // Zoom buttons (T1.4, SPEC D9): the whole face is always the start; +, - and "whole face" are an optional extra
  // for small bumps. They float over the room beside the face (pop.css). Two fingers, the wheel and keys do the same.
  const zoomBox = el('div', 'pop-zoom');
  zoomBox.setAttribute('role', 'toolbar');
  zoomBox.setAttribute('aria-label', t('pop.zoom.group'));
  const zoomIn = zoomButton('in', '<path d="M12 5v14M5 12h14"/>', () => current?.scene?.zoomBy(ZOOM_STEP));
  const zoomOut = zoomButton('out', '<path d="M5 12h14"/>', () => current?.scene?.zoomBy(1 / ZOOM_STEP));
  const zoomReset = zoomButton('reset', '<path d="M4 9V4h5M15 4h5v5M20 15v5h-5M9 20H4v-5"/>', () => current?.scene?.resetView());
  zoomBox.append(zoomIn, zoomOut, zoomReset);
  root.append(head, stage, bar, foot, done, fail, escape);
  root.addEventListener('keydown', onZoomKey);
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
   * One round zoom button with a drawn icon; its name (for screen readers and the mouse tip) comes from the strings.
   * @param {string} kind in, out or reset
   * @param {string} paths the SVG lines of the icon
   * @param {() => void} onClick what it does
   * @returns {HTMLButtonElement} the button
   */
  function zoomButton(kind, paths, onClick) {
    const b = button(`pop-btn pop-zoom__btn pop-zoom__${kind}`, '', onClick);
    const label = t(`pop.zoom.${kind}`);
    b.setAttribute('aria-label', label);
    b.title = label;
    b.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round">${paths}</g></svg>`;
    return b;
  }

  /**
   * The zoom view changed: zoom the studio room behind the same way (so the face and room move together) and grey
   * out the buttons that cannot do more.
   * @param {{z: number, x: number, y: number}} v the view (logic.js)
   * @returns {void}
   */
  function showView(v) {
    backdrop.style.transformOrigin = '0 0';
    backdrop.style.transform = v.z > 1 ? `scale(${v.z}) translate(${-v.x}px, ${-v.y}px)` : '';
    zoomIn.disabled = v.z >= ZOOM_MAX - 1e-6;
    zoomOut.disabled = v.z <= 1 + 1e-6;
    zoomReset.disabled = zoomOut.disabled;
    zoomBox.classList.toggle('pop-zoom--on', v.z > 1 + 1e-6);
  }

  /**
   * Zoom keys anywhere in the scene: + and - zoom, 0 shows the whole face, arrow keys slide the view while zoomed.
   * @param {KeyboardEvent} e the key
   * @returns {void}
   */
  function onZoomKey(e) {
    const scene = current?.scene;
    if (!scene || e.ctrlKey || e.metaKey || e.altKey) return;
    const step = 40; // screen px per arrow press
    const pans = { ArrowLeft: [step, 0], ArrowRight: [-step, 0], ArrowUp: [0, step], ArrowDown: [0, -step] };
    if (e.key === '+' || e.key === '=') scene.zoomBy(ZOOM_STEP);
    else if (e.key === '-' || e.key === '_') scene.zoomBy(1 / ZOOM_STEP);
    else if (e.key === '0') scene.resetView();
    else if (pans[e.key] && scene.view().z > 1) scene.panBy(...pans[e.key]);
    else return;
    e.preventDefault();
  }

  /**
   * The hint text for a step of the scene (while popping: what the tool in hand does).
   * @param {string} step pop, wipe, cream or done
   * @param {boolean} [newOk] false = the tool's own hint even while a first-time hint is waiting (a tool was picked)
   * @returns {string} the text
   */
  function hintFor(step, newOk = true) {
    if (step === 'pop' && newOk && twistHintKey()) return t(twistHintKey()); // the twist's tip until the first pop (T8.3)
    if (step === 'pop' && newOk && newHintKind()) return t(newKindHintKey(newHintKind())); // "New: Evil Horn! ..." (T6.5)
    const stripKey = step === 'pop' && newOk ? stripHintKey({
      stripOnFace: Boolean(current?.hasStrip && !current.stripPeeled && current.scene?.stripOn?.()),
      stuck: Boolean(current?.scene?.stripStuck?.()), owned: toolIds.includes('noseStrip'), toolInHand: toolId,
    }) : null;
    if (stripKey) return t(stripKey); // "Dotty nose: try the nose strip for a bonus!" (the strip is optional)
    if (step === 'wipe') { // the nose strip tip while it is still on (B55), else the wipe hint (pad tip: B13 round 2b)
      return t(wipeHintKey({
        stripOnFace: Boolean(current?.hasStrip && !current.stripPeeled && current.scene?.stripOn?.()),
        stuck: Boolean(current?.scene?.stripStuck?.()), owned: toolIds.includes('noseStrip'), toolInHand: toolId,
        padOwned: toolIds.includes('cottonPad'),
      }));
    }
    if (step === 'cream' || step === 'done') return t('pop.hint.cream');
    if (squeeze && canSqueeze(toolId)) { // T1.7: the squeeze switch is on and fingers (or the cotton pad, D43) are in hand
      if (squeezeHintOn) return t('round.squeezeHint');
      return t(toolId === 'cottonPad' ? 'pop.squeezeTipPad' : 'pop.squeezeTip'); // a short hint with the squeeze in it (keeps the hint line short)
    }
    return t(`tool.${toolId}.hint`);
  }

  /**
   * The kind whose first-time hint is due on the face in play (T6.5), or null. The one-time squeeze hint goes first.
   * @returns {string|null} a guide kind id
   */
  function newHintKind() {
    return !squeezeHintOn && !twistHintKey() && current?.newQueue?.length ? current.newQueue[0] : null;
  }

  /**
   * The customer's twist tip that is due on the hint line (T8.3: "Sensitive skin: warm cloth first!"), until the first
   * pop of the face; the one-time squeeze hint goes first. Null when there is none.
   * @returns {string|null} a string key
   */
  function twistHintKey() {
    return !squeezeHintOn && current?.twistHint ? current.twistHint : null;
  }

  /**
   * Put the hint for a step on the hint line; a first-time hint is marked (and flashes once, never with reduced motion).
   * @param {string} step pop, wipe, cream or done
   * @param {boolean} [newOk] false = the tool's own hint (see hintFor)
   * @returns {void}
   */
  function paintHint(step, newOk = true) {
    const fresh = step === 'pop' && newOk && (Boolean(twistHintKey()) || Boolean(newHintKind()));
    const text = hintFor(step, newOk);
    const changed = hint.textContent !== text;
    hint.textContent = text;
    hint.classList.toggle('pop-hint--new', fresh);
    if (fresh && changed && !still()) { // restart the little flash
      hint.classList.remove('pop-hint--flash');
      void hint.offsetWidth;
      hint.classList.add('pop-hint--flash');
    } else if (!fresh) hint.classList.remove('pop-hint--flash');
  }

  /**
   * Note the guide kinds on a face just laid out (T6.5): the ones she meets for the first time are told to the game
   * (onSeenKinds) and remembered here, and come back as the face's first-time hint queue. Off in the demo and when the
   * game passed no seenKinds.
   * @param {{pimples: object[], strip: object|null, decoys: object[]}} lay the layout (logic.js layoutFace)
   * @returns {string[]} the hint queue (guide-logic.js newKindQueue)
   */
  function meetKinds(lay) {
    if (!seenSet || cfg.kind === 'demo') return [];
    const kinds = kindsOnFace(lay);
    const queue = newKindQueue(kinds, [...seenSet]);
    const fresh = kinds.filter((k) => !seenSet.has(k));
    for (const k of fresh) seenSet.add(k);
    if (fresh.length) {
      try { onSeenKinds(fresh); } catch (e) { console.warn('onSeenKinds failed:', e); }
    }
    return queue;
  }

  /**
   * Pick up a tool from the tool bar: press its button, hand it to the scene, and show what it does.
   * @param {string} id a tool id
   * @returns {void}
   */
  function pickTool(id) {
    if (id === 'warmCloth' && toolId !== 'warmCloth') clothBack = toolId; // lifting the cloth gives this one back (SPEC D37)
    toolId = id;
    for (const [k, b] of toolButtons) b.setAttribute('aria-pressed', String(k === id));
    current?.scene?.setTool(id);
    const step = current?.scene?.step() ?? 'pop';
    if (step === 'pop' || step === 'wipe') paintHint(step, false); // the picked tool's hint (a first-time hint comes back after the next pop)
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
    c.popEnd ??= elapsedFor(c); // the round's clock stops here
    drawRequest(c);
    clearTimeout(c.winceTimer);
    c.wince = true;
    c.scene?.setTexture(faceTexture(c));
    sound.play('ow_customer');
    buzz([60, 40, 120]);
    c.canvas.classList.add('pop-canvas--storm');
    foot.hidden = true;
    bar.hidden = true;
    zoomBox.hidden = true;
    c.failTimer = setTimeout(() => {
      if (current !== c) return;
      sound.play('splat'); // the door slams
      fail.hidden = false;
      fail.querySelector('button')?.focus({ preventScroll: true });
    }, still() ? 250 : 700);
  }

  /**
   * The husband in armor refuses the first pop (chapter 2): the visor slams shut, the face slides away unharmed, and a
   * single Continue button follows. No stars, no pay, no reputation change, no retry (applyRound's escape branch).
   * @param {object} c the current face
   * @returns {void}
   */
  function armorEscape(c) {
    c.failed = true;
    c.escaped = true;
    newBtn.disabled = true;
    c.round = registerFail(c.round);
    c.popEnd ??= elapsedFor(c);
    clearTimeout(c.winceTimer);
    sound.play('splat'); // CLANK
    buzz([40, 30, 90]);
    c.canvas.classList.add('pop-canvas--storm');
    foot.hidden = true;
    bar.hidden = true;
    zoomBox.hidden = true;
    c.failTimer = setTimeout(() => {
      if (current !== c) return;
      escape.hidden = false;
      escape.querySelector('button')?.focus({ preventScroll: true });
    }, still() ? 250 : 700);
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
    if (at.id && at.type !== 'decoy') c.owed.add(at.id); // this bump's pop will not count as clean
    drawCount();
    drawRequest(c);
    const owKey = at.type === 'decoy' ? 'pop.owDecoy' : at.hot ? 'pop.owHot' : 'pop.ow'; // a mole is not a bump; the cloth left on too long (D41)
    const bubble = el('p', 'pop-ow', t(owKey));
    bubble.setAttribute('aria-hidden', 'true'); // the counter line says it for screen readers
    const sp = c.scene?.toScreen(at.x, at.y) ?? at; // where the bump is on screen (zoomed or not)
    bubble.style.left = `${sp.x}px`;
    bubble.style.top = `${sp.y}px`;
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

  /**
   * The ticklish customer giggled (T8.3): a "Hehehe!" bubble over the bump and a happy face for a moment. Not an Ow
   * (the counter does not change); the engine already let go of the press.
   * @param {object} c the current face
   * @param {{x: number, y: number}} at where the bump is (scene px)
   * @returns {void}
   */
  function showGiggle(c, at) {
    const bubble = el('p', 'pop-ow pop-giggle', t('pop.giggle'));
    bubble.setAttribute('aria-hidden', 'true');
    const sp = c.scene?.toScreen(at.x, at.y) ?? at;
    bubble.style.left = `${sp.x}px`;
    bubble.style.top = `${sp.y}px`;
    stage.append(bubble);
    setTimeout(() => bubble.remove(), 900);
    clearTimeout(c.giggleTimer);
    c.giggle = true;
    c.scene?.setTexture(faceTexture(c));
    c.giggleTimer = setTimeout(() => {
      if (current !== c || !c.scene) return;
      c.giggle = false;
      c.scene.setTexture(faceTexture(c));
    }, 600);
  }

  /**
   * The bumps are done but the nose dots are still on (owner 2026-10-28: easy to forget, and left on they cost the
   * third star): the customer says so in a bubble over the nose, the Nose strip button glows until the strip goes on,
   * and the hint line (which says what to do) flashes once. Only when she owns the strip and it is not on yet.
   * @param {object} c the current face
   * @returns {void}
   */
  function noseNudge(c) {
    if (!c.strip || c.stripPeeled || !toolIds.includes('noseStrip') || c.scene?.stripStuck?.() || !c.scene?.stripOn?.()) return;
    const bubble = el('p', 'pop-ow pop-nudge', t('pop.noseNudge'));
    bubble.setAttribute('aria-hidden', 'true'); // the hint line says it for screen readers
    const sp = c.scene?.toScreen(c.strip.x + c.strip.w / 2, c.strip.y) ?? { x: c.strip.x, y: c.strip.y };
    bubble.style.left = `${sp.x}px`;
    bubble.style.top = `${sp.y}px`;
    stage.append(bubble);
    setTimeout(() => bubble.remove(), 2600);
    toolButtons.get('noseStrip')?.classList.add('pop-tool--nudge');
    if (!still()) { // restart the hint line's little flash
      hint.classList.remove('pop-hint--flash');
      void hint.offsetWidth;
      hint.classList.add('pop-hint--flash');
    }
  }

  /** Stop the Nose strip button's glow (the strip went on, came off, or the face is done). @returns {void} */
  function endNoseNudge() {
    toolButtons.get('noseStrip')?.classList.remove('pop-tool--nudge');
  }

  /** Show how many bumps are left and how many Ow so far (only while popping). @returns {void} */
  function drawCount() {
    const scene = current?.scene;
    if (!scene || scene.step() !== 'pop') { count_.textContent = ''; return; }
    const ows = current.round?.owCount ?? 0;
    count_.textContent = ows ? t('pop.leftOws', { left: scene.left(), ows }) : t('pop.left', { n: scene.left() });
  }

  /**
   * Seconds the customer has been popped so far: from the first look at the face to the last bump handled (or the
   * storm-off); after that the clock stands still.
   * @param {object} c the current face
   * @returns {number} seconds
   */
  function elapsedFor(c) {
    return c.popEnd ?? clockSeconds(c.startAt, performance.now(), hiddenSince); // stands still while the page is hidden (B83)
  }

  let hiddenSince = null; // when the page went hidden (phone call, app switch, lock screen), null while on show (B83)
  /**
   * The page was hidden or shown again (B83): the round clock (a hurry request, the daily "Beat the clock") stands
   * still while hidden; on return the face's start moves on by the hidden time, so it goes on where it stopped.
   * @returns {void}
   */
  function onVisibility() {
    const doc = globalThis.document;
    const now = performance.now();
    if (doc?.hidden) { hiddenSince ??= now; return; }
    if (hiddenSince === null) return;
    if (current) current.startAt += hiddenMs(hiddenSince, now);
    hiddenSince = null;
    drawRequest(current);
  }

  /**
   * Show the request banner for a face: its text, a hurry countdown, and done or missed once that is clear. Stops the
   * countdown ticker when the request is no longer open.
   * @param {object|null} c the current face
   * @returns {void}
   */
  function drawRequest(c) {
    if (!c || current !== c) return;
    const v = c.request ? requestView(c.request, c.round, elapsedFor(c)) : null;
    reqBox.hidden = !v;
    if (!v) { clearInterval(c.reqTimer); return; }
    reqText.textContent = t(v.key, v.vars);
    reqTime.textContent = v.secondsLeft === null ? '' : t('round.request.timeLeft', { seconds: v.secondsLeft });
    const state = v.status === 'done' ? t('request.done') : v.status === 'failed' ? t('request.missed') : '';
    if (reqState.textContent !== state) reqState.textContent = state;
    reqBox.classList.toggle('pop-req--done', v.status === 'done');
    reqBox.classList.toggle('pop-req--missed', v.status === 'failed');
    if (v.status !== 'open') clearInterval(c.reqTimer);
  }

  /**
   * End a customer round (round mode only) and tell the game, once: after the cleanup, or after a storm-off when the
   * player picked Try again ('again') or Next customer ('next'). The face stays on screen; the game decides what next.
   * @param {object|null} c the face of the round
   * @param {'again'|'next'|'escape'|null} [choice] the fail choice (null for a finished customer; 'escape' = the armor's refusal)
   * @returns {void}
   */
  function finishRound(c, choice = null) {
    if (!c || c.finished || cfg.kind !== 'round') return;
    c.finished = true;
    clearTimeout(c.endTimer);
    clearInterval(c.reqTimer);
    fail.hidden = true;
    escape.hidden = true;
    if (!c.counted) { results.push(c.round); c.counted = true; }
    const payload = finishPayload({
      round: c.round, elapsedSeconds: elapsedFor(c), cleanBumpTypes: c.cleanTypes, cleanBumpTools: c.cleanTools,
      popTypes: c.popTypes, failChoice: c.failed ? choice : null, request: c.request,
      patches: c.patches, stripPeeled: c.stripPeeled, // patch tips and the nose strip bonus (B13 round 2c)
      stripLeft: Boolean(c.hasStrip && !c.stripPeeled), // nose dots left on: at most 2 stars (owner 2026-10-28)
    });
    try { c.onFinish?.(payload); } catch (e) { console.warn('onFinish failed:', e); }
  }

  /** The size of the free area for the canvas, measured. @returns {{w: number, h: number}} CSS px */
  function stageSize() {
    const r = stage.getBoundingClientRect();
    return { w: Math.max(240, Math.round(r.width)), h: Math.max(240, Math.round(r.height)) };
  }

  /**
   * The boxes of the tool bar, the zoom buttons and the hint that lie over the stage (landscape puts them on top of
   * the room), in stage CSS px. Hidden ones and ones outside the stage (portrait: the bar sits below it) are left out.
   * @returns {{x: number, y: number, w: number, h: number}[]} boxes
   */
  function coveredRects() {
    const s = stage.getBoundingClientRect();
    const out = [];
    for (const node of [bar, zoomBox, foot]) {
      if (node.hidden) continue;
      const r = node.getBoundingClientRect();
      if (r.width <= 0 || r.height <= 0) continue;
      const box = { x: r.left - s.left, y: r.top - s.top, w: r.width, h: r.height };
      if (box.x >= s.width || box.y >= s.height || box.x + box.w <= 0 || box.y + box.h <= 0) continue;
      out.push(box);
    }
    return out;
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
    const dpr = sceneRatio(globalThis.devicePixelRatio, lighter);
    if (w !== back.w || h !== back.h || dpr !== back.dpr) {
      Object.assign(back, { w, h, dpr });
      backdrop.width = Math.round(w * dpr);
      backdrop.height = Math.round(h * dpr);
      sizeCanvas(backdrop, w, h);
    }
    const ctx = backdrop.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const reduced = still();
    const time = (performance.now() - back.start) / 1000;
    drawBackdrop(ctx, w, h, { room, tier, layers, time, reduced, dpr, pins });
    const leak = roomLeaks(backdropKind(room, tier), layers);
    // The leak plinks into the bucket now and then (owner 2026-10-28: a little annoying, so she wants it fixed); the
    // sound switch decides, so it also plinks with reduced motion (the drop then just hangs still).
    if (leak && dripLands(back.last ?? time, time)) sound.play('drip');
    back.last = time;
    const next = Math.min(nextBackdropChange(time, backdropKind(room, tier), reduced, leak), leak && reduced ? nextDripLanding(time) + 0.01 : Infinity);
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
    // a short wince after an Ow; a short happy face after a giggle (ticklish, T8.3)
    // a reluctant customer (the chapter 0 husband) keeps the stern face even as his skin clears up
    const usual = cfg.kind === 'round' && cfg.reluctant ? 'grim' : faceMood(cleared, c.total, c.healed);
    const mood = c.wince && !c.healed ? 'ow' : c.giggle && !c.healed ? 'happy' : moodOverride ?? usual;
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
    clearTimeout(prev?.endTimer);
    clearInterval(prev?.reqTimer);
    root.classList.remove('pop-game--ending'); // a new face: the game's Menu button may show again
    fail.hidden = true;
    escape.hidden = true;
    showIrritation(0);
    newBtn.disabled = false;
    newBtn.hidden = cfg.kind === 'round'; // a customer round has no "New face" (the game picks the next customer)
    stage.replaceChildren(backdrop, zoomBox);
    zoomBox.hidden = false;
    showView({ z: 1, x: 0, y: 0 }); // every new customer starts with the whole face (SPEC D9)
    paintBackdrop();
    done.hidden = true;
    foot.hidden = false;
    bar.hidden = false;
    showWarmth(0);
    clearTimeout(current?.winceTimer);
    const round = cfg.kind === 'round';
    let s; // Try again = the same customer, a fresh face; a round uses the seed the game gave
    if (again && prev) s = prev.seed;
    else if (round) s = cfg.seed;
    else if (freshSeed) { s = seed; freshSeed = false; } else s = nextSeed();
    let spec;
    if (again && prev) spec = prev.spec;
    else if (round) spec = cfg.setup.spec;
    else spec = (cfg.kind === 'demo' ? fixedSpec : null) ?? randomFaceSpec(s);
    const { w, h } = stageSize();
    const dpr = sceneRatio(globalThis.devicePixelRatio, lighter); // 1 with lighter graphics
    const face = faceGeometry(w, h, spec);
    const clownNose = (spec.accessories ?? []).includes('clown-nose'); // no nose strip over a clown nose
    const wantStrip = round ? cfg.setup.strip : cfg.kind === 'free' ? toolIds.includes('noseStrip') && stripChance(s) : strip;
    const lay = layoutFace({
      seed: s, face, count: round ? cfg.setup.count : cfg.kind === 'free' ? FACE_BUMPS : count, strip: wantStrip && !clownNose,
      allowed: round ? cfg.setup.allowed : null, decoys: round ? cfg.setup.decoys : true,
      mix: round ? cfg.setup.mix : null, grown: round ? cfg.setup.grown : 0, // a boss face's own bumps (T8.4)
    });
    // Skill by use (ECONOMY.md section 4): faster holds and fewer rough presses for kinds the player has mastered.
    const pimples = cfg.kind === 'demo' ? lay.pimples : applyMastery(lay.pimples, cfg.holdFactors, cfg.roughReductions);
    const canvas = el('canvas', 'pop-canvas');
    canvas.tabIndex = 0;
    canvas.setAttribute('role', 'img');
    canvas.setAttribute('aria-label', t('pop.canvas'));
    stage.append(canvas);
    const c = {
      canvas, w, h, dpr, face, spec, seed: s, total: pimples.length, healed: false, scene: null,
      round: createRound(pimples.length), wince: false, winceTimer: 0, patches: 0, stripPeeled: false, hasStrip: Boolean(lay.strip),
      strip: lay.strip ?? null, // where the nose dots are (scene px), for the reminder bubble (noseNudge)
      owed: new Set(), cleanTypes: [], cleanTools: [], popTypes: [], startAt: performance.now(), popEnd: null, finished: false,
      request: round ? cfg.request : null, onFinish: round ? cfg.onFinish : null, endTimer: 0, reqTimer: 0,
      hooks: round ? cfg.hooks : {}, // a special mode's onPop and onOw listeners (T4.5)
      newQueue: meetKinds(lay), // first-time hints for the kinds she meets on this face (T6.5)
      twistHint: round ? cfg.twistHint : null, // the twist's tip on the hint line until the first pop (T8.3)
      giggle: false, giggleTimer: 0, // a short happy face after a giggle (ticklish, T8.3)
    };
    current = c;
    endNoseNudge(); // a new face: no reminder glow left over from the last one
    sizeCanvas(canvas, w, h);
    c.scene = createPopScene(canvas, {
      width: w, height: h, dpr, reduced: still(), sound, buzz, squeeze,
      texture: faceTexture(c), pimples, strip: lay.strip, decoys: lay.decoys,
      tool: toolId, tools: toolIds, face: { cx: face.cx, cy: face.cy, rx: face.rx, ry: face.ry },
      irritation: round ? cfg.irritation : undefined,
      twist: round ? cfg.twist : null, // the customer's twist (T8.3; the hurry twist is the request banner)
      onGiggle: (at) => { if (current === c) showGiggle(c, at); },
      refuse: round && cfg.escape ? () => { if (current === c && !c.failed) armorEscape(c); } : undefined, // chapter 2: the armor wins
      gloves: round && cfg.gloves, // her blue gloves on the fingertips once she owns them (SPEC D32e)
      onOw: (at) => {
        if (current !== c) return;
        showOw(c, at);
        try { c.hooks.onOw?.(at); } catch (e) { console.warn('onOw failed:', e); }
      },
      onWarm: (wv) => { if (current === c) showWarmth(wv); },
      onSlow: () => { // frames stayed slow (an older phone): lighter graphics from now on (this room now, the next face)
        if (lighter) return;
        lighter = true;
        paintBackdrop();
        try { onSlow(); } catch (e) { console.warn('onSlow failed:', e); }
      },
      onWarmLift: () => { // the cloth came off: back to the tool she had (SPEC D37), so she can pop the warm bumps
        if (current === c && toolId === 'warmCloth' && c.scene?.step() === 'pop') pickTool(toolIds.includes(clothBack) ? clothBack : START_TOOL);
      },
      onView: (v) => { if (current === c) showView(v); },
      onIrritation: (lv) => {
        if (current !== c) return;
        showIrritation(lv);
        if (!c.failed && isFail(lv, cfg.failMode)) stormOff(c);
      },
      onPatch: (n) => { c.patches = n; }, // each patched spot pays a small tip (economy.js roundPayout)
      onStripPeeled: () => { // the peeled nose strip pays a bonus (economy.js roundPayout)
        c.stripPeeled = true;
        endNoseNudge();
        if (current === c && c.scene?.step() === 'wipe') paintHint('wipe'); // peeled while wiping (B55): the strip tip goes
      },
      onStripStuck: () => { // stuck on while wiping (B55): "peel it"; the button's reminder glow has done its job
        if (current !== c) return;
        endNoseNudge();
        if (c.scene?.step() === 'wipe') paintHint('wipe');
      },
      covered: () => coveredRects(), // where the tool bar and buttons sit over the face, so the wipe pad rests clear of them
      onNote: (n) => { if (n === 'patchFirst' && current === c) { hint.textContent = t('tool.patch.notYet'); hint.classList.remove('pop-hint--new', 'pop-hint--flash'); } },
      onPop: (p) => {
        const shownNew = newHintKind(); // a first-time hint that was due before this pop (T6.5)
        const shownTwist = Boolean(twistHintKey()); // the twist's tip was on show: it has done its job (T8.3)
        c.twistHint = null;
        if (c.newQueue.length) { // a first-time hint is done once that kind is popped; the next one shows
          c.newQueue = shownNew ? hintQueueAfterPop(c.newQueue, p.type) : c.newQueue.filter((k) => k !== p.type);
        }
        if (squeezeHintOn) { // the one-time squeeze hint has done its job: back to the tool's hint
          squeezeHintOn = false;
          try { onSqueezeHint(); } catch (e) { console.warn('onSqueezeHint failed:', e); }
          if (c.scene?.step() === 'pop') paintHint('pop');
        } else if ((shownNew || shownTwist) && c.scene?.step() === 'pop') paintHint('pop');
        const clean = !c.owed.has(p.id); // clean = no Ow on this bump (counts for mastery and pay)
        c.round = registerPop(c.round, { timeSeconds: performance.now() / 1000, clean });
        c.popTypes.push(p.type);
        if (clean) { c.cleanTypes.push(p.type); c.cleanTools.push(p.tool ?? START_TOOL); } // the tool counts for the pad bonus
        if (allHandled(c.round)) c.popEnd ??= elapsedFor(c);
        drawCount();
        drawRequest(c);
        c.scene?.setTexture(faceTexture(c));
        try { c.hooks.onPop?.(p, c.scene?.left() ?? 0); } catch (e) { console.warn('onPop failed:', e); }
      },
      onStep: (step) => {
        paintHint(step);
        drawCount();
        if (step === 'wipe' && current === c) noseNudge(c); // every bump done, the nose dots still on: remind her
        else endNoseNudge();
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
        if (round) { // a moment to see the glowing face, then the game takes over
          // During this pause leaving would lose the finished customer (no pay, no stars): the game's Menu button
          // hides (app.css .pop-game--ending) and ending() says so.
          c.ending = true;
          root.classList.add('pop-game--ending');
          const pause = (still() ? END_PAUSE_REDUCED : END_PAUSE) * 1000;
          c.endTimer = setTimeout(() => finishRound(c, null), pause);
          return;
        }
        done.hidden = false;
        done.querySelector('button')?.focus({ preventScroll: true });
      },
    });
    canvas.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { if (c.scene.keyPress()) e.preventDefault(); }
    });
    paintHint('pop');
    drawCount();
    drawRequest(c);
    if (c.request?.type === 'hurry') c.reqTimer = setInterval(() => drawRequest(c), 250); // the hurry clock; stops once done or missed
    if (focus) canvas.focus({ preventScroll: true });
  }

  /**
   * Start a face now if the scene is mounted and measured (otherwise mount() starts it).
   * @param {boolean} focus move keyboard focus to the face
   * @returns {void}
   */
  function startNow(focus) {
    if (ready && !disposed) newFace(focus);
    else if (focus) wantFocus = true; // asked before the first measure: the face takes keyboard focus once it is there
  }

  let resizeTimer = 0;
  let wantFocus = false; // a round or free play asked for the face before the scene was measured (see startNow)
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
      globalThis.document?.addEventListener?.('visibilitychange', onVisibility); // the round clock pauses while hidden (B83)
      globalThis.addEventListener?.('pagehide', onVisibility);
      globalThis.addEventListener?.('pageshow', onVisibility);
      watcher?.observe(stage);
      requestAnimationFrame(() => { ready = true; newFace(wantFocus); wantFocus = false; }); // the demo face, or a round/free play asked for before
    },
    /**
     * Play ONE customer (T3.1b). Their face, exactly bumpCount bumps of the allowed kinds (decoys and the Evil Horn
     * and ingrown-hair rules as usual), only the owned tools (fingers always), mastery hold times and rough chances,
     * the meter's difficulty, and the request banner. Calling it again starts the round afresh (the game does that
     * for "Try again", with the same seed for the same face). Before mount() it waits for the mount.
     * @param {{customer: {face: object}, bumpCount: number, allowedTypes: string[], difficulty?: number, seed?: number,
     *   holdFactors?: Object<string, number>, roughReductions?: Object<string, number>, unlockedTools?: string[],
     *   request?: object|null, room?: string, tier?: number, layers?: string[], career?: boolean, decoys?: boolean,
     *   onFinish: (result: object) => void}} o customer = chapter-logic.js customerSpec customer; difficulty =
     *   customerSpec difficulty (1 = normal); seed = the face (random when left out); holdFactors / roughReductions =
     *   per bump kind from economy.js holdFactor / roughReduction; unlockedTools = owned tools; request = requests.js
     *   pickRequest result or null; room = 'home' (living room, SPEC D19) or 'studio' (default); tier = studio
     *   room 0..2; layers = owned studio upgrades drawn in the studio (save.studioLayers, T5.1a); career = false makes a round that cannot fail (default
     *   true); decoys = false keeps moles and freckles off (default true); onFinish gets round-logic.js finishPayload;
     *   customerName = shown in the header ("Popping Pilot Pete", else "Pop them!"); skipCost = what "Next customer"
     *   costs in reputation, shown on the fail choice (left out = no cost shown). twist = the customer's twist
     *   (T8.3, data/twists.js: 'fidgety', 'ticklish', 'sensitive', or 'hurry' for a hurry request; shown as a label
     *   in the header, the first three also change the play); twistHintKey = its tip for the hint line (until the
     *   first pop). boss = a boss or event customer's face rules (T8.4, data/bosses.js bossSpec `boss`) and
     *   bossNameKey = its name, shown in gold in the twist chip's place.
     *   For a special mode (T4.5): mood = a fixed face mood ('sleep'; an Ow still winces), onPop(bump, left) after
     *   every pop and onOw(at) after every Ow.
     * @returns {void}
     */
    startRound(o = {}) {
      const tools = roundTools(o.unlockedTools ?? [START_TOOL]);
      const seed0 = Number.isFinite(o.seed) && o.seed > 0 ? Math.floor(o.seed) : 1 + Math.floor(Math.random() * 2e9);
      cfg = {
        kind: 'round', failMode: o.career === false ? 'free' : 'career', unlockedTools: o.unlockedTools ?? [START_TOOL],
        setup: roundFaceSetup({
          customer: o.customer, bumpCount: o.bumpCount, allowedTypes: o.allowedTypes, unlockedTools: tools, decoys: o.decoys,
          seed: seed0, request: o.request ?? null, // the nose strip: about 2 faces in 5, never with a hurry request
          boss: o.boss ?? null, // a boss or event face (T8.4): its own bump mix, the nose strip always on, grown horns
        }),
        seed: seed0,
        holdFactors: o.holdFactors ?? {}, roughReductions: o.roughReductions ?? {}, irritation: irritationScales(o.difficulty),
        request: o.request ?? null, onFinish: typeof o.onFinish === 'function' ? o.onFinish : null,
        hooks: { onPop: typeof o.onPop === 'function' ? o.onPop : null, onOw: typeof o.onOw === 'function' ? o.onOw : null },
        escape: o.customer?.escape === true, // the husband in armor (chapter 2) refuses the first pop and runs off
        reluctant: o.customer?.reluctant === true, // the chapter 0 husband: stern the whole round, never beams (owner 2026-10-28)
        gloves: o.gloves === true, // she owns the gloves (app-logic.js roundArgs, SPEC D32e)
        twist: typeof o.twist === 'string' ? o.twist : null, // T8.3: the customer's twist
        twistHint: typeof o.twistHintKey === 'string' ? o.twistHintKey : null,
      };
      // The chip shows the twist's name, or a boss or event's name in gold (T8.4: a boss has no twist).
      const chipKey = typeof o.bossNameKey === 'string' ? o.bossNameKey : cfg.twist ? `twist.${cfg.twist}.name` : null;
      twistChip.hidden = !chipKey;
      twistChip.textContent = chipKey ? t(chipKey) : '';
      twistChip.classList.toggle('pop-twist--boss', typeof o.bossNameKey === 'string');
      moodOverride = typeof o.mood === 'string' ? o.mood : null;
      if (guideBtn) guideBtn.hidden = o.request?.type === 'hurry'; // a hurry clock cannot pause: no guide in that round (T6.5)
      setRoundTexts(typeof o.customerName === 'string' && o.customerName ? o.customerName : null, o.skipCost);
      buildToolBar(tools);
      room = o.room === 'home' ? 'home' : 'studio';
      if (Number.isFinite(o.tier)) tier = o.tier;
      if (Array.isArray(o.layers)) layers = [...o.layers];
      pins = Number(o.pins) || 0;
      paintBackdrop();
      startNow(true);
    },
    /**
     * Free play (SPEC section 5): random faces, the owned tools, mastery still helps, never fails, no onFinish, and
     * the "New face" button. Before mount() it waits for the mount.
     * @param {{unlockedTools?: string[], tier?: number, layers?: string[], seed?: number, holdFactors?: Object<string, number>,
     *   roughReductions?: Object<string, number>}} [o] owned tools (all built ones when left out), studio room 0..2,
     *   its owned upgrade layers (T5.1a), the first face's seed, and mastery as for startRound
     * @returns {void}
     */
    startFree(o = {}) {
      cfg = {
        kind: 'free', failMode: 'free', unlockedTools: o.unlockedTools ?? null,
        holdFactors: o.holdFactors ?? {}, roughReductions: o.roughReductions ?? {},
      };
      if (Number.isFinite(o.seed) && o.seed > 0) { seed = Math.floor(o.seed); freshSeed = true; }
      if (guideBtn) guideBtn.hidden = false;
      twistChip.hidden = true; // free play has no twists (T8.3)
      setRoundTexts(null, null);
      buildToolBar(roundTools(cfg.unlockedTools));
      room = 'studio'; // free play is always in the studio
      if (Number.isFinite(o.tier)) tier = o.tier;
      if (Array.isArray(o.layers)) layers = [...o.layers];
      pins = Number(o.pins) || 0;
      paintBackdrop();
      startNow(true);
    },
    /**
     * The player's tools changed (a tool was bought): rebuild the tool bar (fingers always) and tell the face in play.
     * The nose strip on a face already in play does not change; the next face uses the new list.
     * @param {string[]} list owned tool ids
     * @returns {void}
     */
    setUnlockedTools(list) {
      cfg.unlockedTools = Array.isArray(list) ? [...list] : null;
      buildToolBar(roundTools(cfg.unlockedTools));
      current?.scene?.setTools(toolIds);
      pickTool(toolId); // press the button of the tool in hand (fingers when the old one is gone)
    },
    /** Show a new face. @returns {void} */
    newFace: () => newFace(true),
    /**
     * Fix the face's mood (a special mode: 'sleep', 'grim' when he wakes), or null for the usual moods. Repaints.
     * @param {string|null} mood a face.js mood or null
     * @returns {void}
     */
    setMood(mood) {
      moodOverride = typeof mood === 'string' ? mood : null;
      if (current?.scene) current.scene.setTexture(faceTexture(current));
    },
    /** Stop popping on the face in play (presses do nothing any more; a special mode's scripted end). @returns {void} */
    halt() { current?.scene?.halt(); },
    /**
     * Where the face in play is on screen (stage px, through the zoom): its middle, half width and height, and its two
     * eyes. Null before the first face.
     * @returns {{cx: number, cy: number, rx: number, ry: number, eyes: {x: number, y: number}[]}|null} the face box
     */
    faceBox() {
      const c = current;
      if (!c?.scene) return null;
      const { cx, cy, rx, ry, features: ft } = c.face;
      const mid = c.scene.toScreen(cx, cy);
      const edge = c.scene.toScreen(cx + rx, cy + ry);
      const eyes = ft ? [-1, 1].map((s) => c.scene.toScreen(cx + s * rx * ft.eyeU, cy + ry * ft.eyeV)) : [];
      return { cx: mid.x, cy: mid.y, rx: edge.x - mid.x, ry: edge.y - mid.y, eyes };
    },
    /**
     * The bumps still to pop on the face in play, on screen (stage px, through the zoom).
     * @returns {{x: number, y: number, r: number}[]} the bumps
     */
    bumps() {
      const c = current;
      if (!c?.scene) return [];
      const z = c.scene.view?.().z ?? 1;
      return c.scene.all().filter((p) => !p.popped).map((p) => ({ ...c.scene.toScreen(p.x, p.y), r: p.r * z }));
    },
    /** Wake the popping sounds up (call from inside a tap). @returns {void} */
    unlock: () => sound.unlock(),
    /**
     * Whether a finished customer is in the short pause before the game takes over (leaving now would lose them).
     * @returns {boolean} true = do not leave yet
     */
    ending: () => Boolean(current?.ending && !current.finished),
    /**
     * Change the studio room behind the face (SPEC D11: it follows the studio upgrades).
     * @param {number} next tier 0..2
     * @param {string[]} [nextLayers] the owned upgrade layers (left out = keep the ones shown now)
     * @returns {void}
     */
    setTier(next, nextLayers) { tier = next; if (Array.isArray(nextLayers)) layers = [...nextLayers]; paintBackdrop(); },
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
      clearTimeout(current?.endTimer);
      clearInterval(current?.reqTimer);
      current?.scene?.dispose();
      current = null;
      globalThis.removeEventListener?.('resize', onResize);
      globalThis.document?.removeEventListener?.('visibilitychange', onVisibility);
      globalThis.removeEventListener?.('pagehide', onVisibility);
      globalThis.removeEventListener?.('pageshow', onVisibility);
      root.remove();
      sound.dispose();
    },
  };
}
