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
// The face built ahead (B99(4), SPEC D40): the game may mount the scene hidden while the customer intro shows
// (mount(host, {hidden: true})) and call prepare(o) with the round's arguments; the face is then laid out at once and
// painted in small steps when the phone is idle (the room, the face's still layers, the first picture). startRound
// with the same face uses it (finishing any steps left, never starting over); if anything changed (stage size, pixel
// ratio, Lighter graphics, another face) it builds fresh as before. After a face starts, its layout and first picture
// stay for Try again (D15). At most that one kept face plus the face in play.
import { faceGeometry, faceMap, faceMood, FACE_BUMPS, loadPopSoundOn, savePopSoundOn, ZOOM_MAX, ZOOM_STEP } from './logic.js';
import { createPopScene } from './engine.js';
import { createSound } from '../core/sound.js';
import { drawFace, randomFaceSpec, faceLayerCanvases, renewFaceLife } from './face.js';
import { makeCanvas } from './art.js';
import { faceLayout, roundInputs, buildKey, copyLayout } from './prep-logic.js';
import { sceneRatio } from './perf-logic.js';
import { drawBackdrop, nextBackdropChange, backdropKind, roomLeaks, dripLands, nextDripLanding, bulbOff } from './backdrop.js';
import { syncRoomFx } from '../fx/room-fx.js';
import { syncPartyFx } from '../fx/party-fx.js';
import { isPartyDay } from '../fx/stage-logic.js';
import { createPauseTimers } from './pause-timers.js';
import { toolBarIds, START_TOOL, isFail } from './tool-logic.js';
import { canSqueeze } from './squeeze-logic.js';
import { createRound, registerPop, registerOw, registerCleanup, registerFail, allHandled } from '../game/scoring.js';
import {
  applyMastery, applyColdHorn, irritationScales, roundTools, roundFaceSetup, requestView, finishPayload, END_PAUSE, END_PAUSE_REDUCED,
  stripChance, stripHintKey, wipeHintKey, clockSeconds, startPause, endPause, isPaused, comboClock,
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
 *   sfxVolume?: number, lowDetail?: boolean, onSlow?: () => void, zoom?: boolean, gentlePops?: boolean}} o the text lookup
 *   (core/strings.js t), where the sound switch is remembered, the first face's seed (random when left out), a fixed
 *   face spec (a random one per face when left out), whether the face gets a blackhead strip on the nose, how many
 *   bumps per face, the studio tier for the room behind (0..2) and its owned upgrade layers (T5.1a), career = a Story/Career round that can fail (free play
 *   when false), the reputation hook called by "Next customer" after a fail, and reducedMotion = true for the calm
 *   version whatever the phone says (the player's Settings switch). Field guide (T6.5): onGuide = the "?" button
 *   was pressed (left out = no button); seenKinds = the kinds she has met (left out = no first-time hints);
 *   onSeenKinds(kinds) = she just met these kinds on a new face. sfxVolume = the Settings effects volume, 0 to 1.
 *   lowDetail = the Settings switch "Lighter graphics" (the scene drawn at pixel ratio 1); onSlow = the frames stayed
 *   slow, so the scene switched to lighter graphics by itself (pop/perf-logic.js; the caller saves the switch);
 *   zoom = false turns zooming off (no buttons, pinch, wheel or keys; the torchlight dark, B28); gentlePops = the
 *   Settings switch "Gentle pops" (SPEC D45: the calm pop instead of the juicy one)
 * @returns {{node: HTMLElement, mount: (host: HTMLElement) => void, newFace: () => void, unlock: () => void,
 *   setTier: (tier: number, layers?: string[]) => void, results: () => object[], startRound: (o: object) => void,
 *   startFree: (o?: object) => void, setUnlockedTools: (list: string[]) => void, dispose: () => void}} the scene's
 *   element and its controls (startRound and startFree: see their own comments below)
 */
export function createPopMode({
  t, storage, seed: firstSeed, spec: fixedSpec, strip = false, count = FACE_BUMPS, tier: firstTier = 0, layers: firstLayers = [], career = false,
  onReputationHit = () => {}, reducedMotion = false, squeeze = false, squeezeHint = false, onSqueezeHint = () => {},
  onGuide = null, seenKinds = null, onSeenKinds = () => {}, lowDetail = false, onSlow = () => {}, zoom = true, gentlePops = false, sfxVolume = 1,
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
  let party = false; // Prom Penny's party day (D45 item 6): fairy lights in the room behind her (fx/party-fx.js)
  let moodOverride = null; // a fixed face mood from startRound or setMood (e.g. 'sleep'), null = the usual moods
  // How faces are made now: 'demo' (the old path), 'round' (one customer, startRound) or 'free' (startFree).
  // round: {customer, setup, holdFactors, roughReductions, irritation, request, onFinish, failMode, seed}
  let cfg = { kind: 'demo', failMode: career ? 'career' : 'free', unlockedTools: null };
  const backdrop = el('canvas', 'pop-backdrop'); // the studio room, behind the face canvas
  backdrop.setAttribute('aria-hidden', 'true');
  const back = { w: 0, h: 0, dpr: 1, timer: 0, start: performance.now() };
  const timers = createPauseTimers(); // the short bubble, face and end-of-round timers: they stand still while the round is paused (B106(2))

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
        padOwned: toolIds.includes('cottonPad'), goo: !current?.scene?.wipeEmpty?.(), // no goo: never "wipe" (B110(7))
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
    timers.cancel(c.winceTimer);
    c.wince = true;
    c.scene?.setTexture(faceTexture(c));
    sound.play('ow_customer');
    buzz([60, 40, 120]);
    c.canvas.classList.add('pop-canvas--storm');
    foot.hidden = true;
    bar.hidden = true;
    zoomBox.hidden = true;
    c.failTimer = timers.later(() => {
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
    timers.cancel(c.winceTimer);
    sound.play('splat'); // CLANK
    buzz([40, 30, 90]);
    c.canvas.classList.add('pop-canvas--storm');
    foot.hidden = true;
    bar.hidden = true;
    zoomBox.hidden = true;
    c.failTimer = timers.later(() => {
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
    timers.later(() => bubble.remove(), 900);
    timers.cancel(c.winceTimer);
    c.wince = true;
    c.scene?.setTexture(faceTexture(c));
    c.winceTimer = timers.later(() => {
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
    timers.later(() => bubble.remove(), 900);
    timers.cancel(c.giggleTimer);
    c.giggle = true;
    c.scene?.setTexture(faceTexture(c));
    c.giggleTimer = timers.later(() => {
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
    timers.later(() => bubble.remove(), 2600);
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
    return c.popEnd ?? clockSeconds(c.startAt, performance.now(), pause.since); // stands still while paused (hidden page B83, Field guide B48)
  }

  let pause = { since: null, reasons: [] }; // why the round stands still: 'hidden' (phone call, app switch, lock screen, B83), 'guide' (B48) and/or 'away' (the game's menu, D48)
  let away = false; // the game took the scene off the page with its Menu button (D48): kept as it is until it comes back
  let pausedTotalMs = 0; // all the pauses that ended so far: the combo clock leaves them out so a chain never breaks over a pause
  /**
   * Stand still for a reason, or go on again. While paused the round clock (a hurry request, the daily "Beat the clock")
   * and the combo clock stand still and the scene's time is frozen (scene.setPaused); when the last reason ends, the
   * face's start moves on by the whole paused time, so everything goes on where it stopped (B83 and B48 share this).
   * @param {string} reason 'hidden' or 'guide'
   * @param {boolean} on true = pause for this reason, false = this reason is over
   * @returns {void}
   */
  function setRoundPause(reason, on) {
    const now = performance.now();
    if (on) pause = startPause(pause, reason, now);
    else {
      if (!pause.reasons.includes(reason)) return;
      const end = endPause(pause, reason, now);
      pause = end.pause;
      pausedTotalMs += end.shiftMs;
      if (current) current.startAt += end.shiftMs;
      back.start += end.shiftMs; // the room's drip and sparkles go on where they stopped (B106(2))
    }
    current?.scene?.setPaused?.(isPaused(pause));
    timers.setPaused(isPaused(pause)); // the Ow and giggle bubbles, the wince and the end-of-round wait stand still too
    for (const b of stage.querySelectorAll('.pop-ow')) b.style.animationPlayState = isPaused(pause) ? 'paused' : '';
    if (isPaused(pause)) clearTimeout(back.timer); // the room stands still: no repaints, no plink
    else if (!on && back.w) paintBackdrop(); // and goes on
    const c = current; // the hurry banner's ticker: off while paused (nothing runs, D48), on again after if the clock is still open
    if (c && isPaused(pause)) { clearInterval(c.reqTimer); c.reqTimer = 0; }
    else if (c && c.request?.type === 'hurry' && !c.requestEnded && !c.finished && !c.reqTimer) c.reqTimer = setInterval(() => drawRequest(c), 250);
    if (!on) drawRequest(current);
  }

  /**
   * The page was hidden or shown again (B83): the round pauses while hidden and goes on where it stopped on return.
   * @returns {void}
   */
  function onVisibility() {
    setRoundPause('hidden', Boolean(globalThis.document?.hidden));
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
    if (v.status !== 'open' && !c.requestEnded) {
      c.requestEnded = true; // tell the game once, so the hectic music can stop (B14)
      try { c.hooks.onRequestEnd?.(v.status); } catch (e) { console.warn('onRequestEnd failed:', e); }
    }
  }

  /**
   * Show the request banner as a new face starts, before the stage is measured (B99(4)): the banner makes the header
   * taller, so the face is laid out for the stage it really gets (it was laid out first and shrunk a moment later, and
   * the before and after reveal measured the smaller stage). drawRequest takes over once the face is there.
   * @returns {void}
   */
  function previewRequest() {
    const v = cfg.kind === 'round' && cfg.request ? requestView(cfg.request, createRound(1), 0) : null;
    reqBox.hidden = !v;
    if (!v) return;
    reqText.textContent = t(v.key, v.vars);
    reqTime.textContent = v.secondsLeft === null ? '' : t('round.request.timeLeft', { seconds: v.secondsLeft });
    reqBox.classList.remove('pop-req--done', 'pop-req--missed');
  }

  /**
   * Put the hint line and the bump counter a new face will start with on show before the stage is measured (B99(4)): a
   * long hint (a twist's tip, "New: ..." for a first-time kind) makes the foot taller and the counter beside a boss's
   * name chip the header, and the face was laid out first and then shrunk a moment later (a full repaint right after
   * Start). The kinds and the nose strip do not depend on the stage size, so a layout at any size tells which hint it
   * will be. Only the texts and the hint's mark; paintHint and drawCount do the rest later.
   * @param {{pimples: object[], strip: object|null, decoys: object[]}} lay the face's layout (at any stage size)
   * @returns {void}
   */
  function previewHint(lay) {
    const real = current;
    current = { // the new face as hintFor sees it at its start
      twistHint: cfg.kind === 'round' ? cfg.twistHint : null,
      newQueue: seenSet && cfg.kind !== 'demo' ? newKindQueue(kindsOnFace(lay), [...seenSet]) : [],
      hasStrip: Boolean(lay.strip), stripPeeled: false,
      scene: { stripOn: () => Boolean(lay.strip), stripStuck: () => false },
    };
    try {
      hint.textContent = hintFor('pop');
      hint.classList.toggle('pop-hint--new', Boolean(twistHintKey()) || Boolean(newHintKind()));
    } finally {
      current = real;
    }
    count_.textContent = t('pop.left', { n: lay.pimples.length }); // the counter line too (drawCount puts the real one; same height)
  }

  /**
   * The stage size a new face is laid out for: measured with the request banner and the hint line it will start with
   * (previewRequest, previewHint), so the face is not laid out again a moment after it shows.
   * @param {number} s the face seed
   * @param {object} spec the face spec
   * @returns {{w: number, h: number}} the stage size in CSS px
   */
  function measureFor(s, spec) {
    previewRequest();
    const first = stageSize();
    previewHint(faceLayout(faceInputs(s, spec, first.w, first.h)).lay);
    return stageSize();
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
    timers.cancel(c.endTimer);
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
   * Where the zoom buttons sit over the room (stage CSS px, rounded), so the room's shine glints keep clear of them
   * (audit A5). Empty when they are hidden.
   * @returns {{x: number, y: number, w: number, h: number}[]} at most one box
   */
  function zoomClear() {
    if (zoomBox.hidden || !zoomBox.isConnected) return [];
    const s = stage.getBoundingClientRect();
    const r = zoomBox.getBoundingClientRect();
    if (r.width <= 0 || r.height <= 0) return [];
    return [{ x: Math.round(r.left - s.left), y: Math.round(r.top - s.top), w: Math.round(r.width), h: Math.round(r.height) }];
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
   * Paint the studio room behind the face for this moment, and plan the next repaint (only while something moves: the
   * lamp's flicker, the drip, the sparkles, the room's dust and shine at about 16 frames a second; never with reduced
   * motion). Repaints the whole room when the stage size changed. While the scene is hidden (built ahead, B99(4)) it
   * paints only when asked with prepOnly, and then plans no repaint and plays no drip.
   * @param {boolean} [prepOnly] true = one paint for the face built ahead (no timer, no sound)
   * @returns {void}
   */
  function paintBackdrop(prepOnly = false) {
    clearTimeout(back.timer);
    const once = prepOnly === true; // (a frame's timestamp, from requestAnimationFrame, is not a true)
    if (disposed || (hiddenNow && !once)) return;
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
    const frozen = isPaused(pause); // the round is paused (Field guide, hidden page): the room stands still (B106(2))
    const time = ((frozen ? pause.since : performance.now()) - back.start) / 1000;
    // The room's light and particle effects (SPEC D45: dust in the light, the moth, the mood, shine, petals), behind
    // the face; still with reduced motion or lighter graphics, so they then cost no extra repaints.
    // The shine glints keep clear of the zoom buttons (A5).
    syncFx(w, h, dpr);
    drawBackdrop(ctx, w, h, { room, tier, layers, time, reduced, dpr, pins, twinkle: !lighter, fx: back.fx }); // lighter graphics: still sparkles (B33d)
    back.party = syncPartyFx(back.party, { on: party, w, h, dpr, reduced, lite: lighter }); // Prom Penny's day: fairy lights (D45)
    back.party?.frame(ctx, time);
    if (once) return;
    const leak = roomLeaks(backdropKind(room, tier), layers);
    // The leak plinks into the bucket now and then (owner 2026-10-28: a little annoying, so she wants it fixed); the
    // sound switch decides, so it also plinks with reduced motion (the drop then just hangs still).
    if (leak && !frozen && dripLands(back.last ?? time, time)) sound.play('drip');
    back.last = time;
    const off = bulbOff(backdropKind(room, tier), layers); // the old bulb is off with the ring light: no flicker repaints (A3)
    const next = Math.min(nextBackdropChange(time, backdropKind(room, tier), reduced, leak, !lighter, off), leak && reduced ? nextDripLanding(time) + 0.01 : Infinity, back.fx.next(), back.party?.next() ?? Infinity);
    if (!frozen && Number.isFinite(next)) back.timer = setTimeout(() => requestAnimationFrame(paintBackdrop), next * 1000);
  }

  /**
   * Keep the room's effects for this stage size and pixel ratio, or make them fresh (fx/room-fx.js syncRoomFx). The
   * shine glints keep clear of the zoom buttons (A5).
   * @param {number} w stage width in CSS px
   * @param {number} h stage height in CSS px
   * @param {number} dpr pixel ratio
   * @returns {void}
   */
  function syncFx(w, h, dpr) {
    back.fx = syncRoomFx(back.fx, { w, h, dpr, kind: backdropKind(room, tier), layers, where: 'pop', reduced: still(), lite: lighter, avoid: zoomClear() });
  }

  /**
   * Paint the face picture for its present state (redder and sadder with more bumps left). Only the person is
   * painted; around them the picture is see-through so the studio room behind shows.
   * @param {object} c the current face
   * @returns {HTMLCanvasElement} the texture
   */
  function faceTexture(c) {
    const { mood, redness } = textureLook(c);
    const { canvas, ctx } = makeCanvas(c.w, c.h, c.dpr);
    ctx.lineCap = 'butt';
    // Only the person: the room behind comes from backdrop.js, so face.js skips its own plain wall (B19).
    drawFace(ctx, c.face, c.spec, { mood, redness, seed: c.seed, dpr: c.dpr, background: false });
    return canvas;
  }

  /**
   * The first picture of a new face: the one built ahead (or kept from the last try of the same face), with a fresh
   * idle life, or painted now. Remembered on the face (c.firstTexture) for Try again.
   * @param {object} c the new face (no scene yet)
   * @param {HTMLCanvasElement|null} ready the picture built ahead, or null
   * @returns {HTMLCanvasElement} the picture
   */
  function firstTexture(c, ready) {
    const tex = ready ? renewFaceLife(ready, c.face, c.spec, { mood: textureLook(c).mood, seed: c.seed, dpr: c.dpr }) : faceTexture(c);
    c.firstTexture = tex;
    return tex;
  }

  /**
   * The mood and redness of a face picture for the face's present state.
   * @param {object} c the face
   * @returns {{mood: string, redness: number}} the look
   */
  function textureLook(c) {
    const cleared = c.scene ? c.scene.all().filter((p) => p.popped).length : 0;
    // a short wince after an Ow; a short happy face after a giggle (ticklish, T8.3)
    // a reluctant customer (the chapter 0 husband) keeps the stern face even as his skin clears up
    const usual = cfg.kind === 'round' && cfg.reluctant ? 'grim' : faceMood(cleared, c.total, c.healed);
    const mood = c.wince && !c.healed ? 'ow' : c.giggle && !c.healed ? 'happy' : moodOverride ?? usual;
    const redness = c.healed ? 0 : 1 - cleared / Math.max(1, c.total);
    return { mood, redness };
  }

  // ---- The face built ahead (B99(4)) and kept for Try again ----
  // ahead = {key, face, lay, texture, steps, cancel, holdWhile, kept}: one face only. key = buildKey of its settings;
  // lay = an untouched copy of its layout; texture = its first picture once painted (null until then); steps = the
  // painting still to do, one per idle moment; kept = it is the face just played, kept for Try again.
  let ahead = null;
  let hiddenNow = false; // mounted hidden (built ahead while the customer intro shows): no repaints, no layout watching
  let flushCanvas = null; // a 1 x 1 canvas: drawing a picture onto it makes the browser really paint that picture now

  /**
   * Make the browser paint a canvas's drawing now (it saves drawing up until the picture is first used), so the work
   * happens in this idle moment and not in the round's first frame.
   * @param {HTMLCanvasElement|null} cv the canvas
   * @returns {void}
   */
  function flush(cv) {
    if (!cv?.width || !cv.height) return;
    flushCanvas ??= el('canvas');
    flushCanvas.width = 1;
    flushCanvas.height = 1;
    flushCanvas.getContext('2d')?.drawImage(cv, 0, 0, 1, 1);
  }

  /**
   * Wait for an idle moment of the phone (requestIdleCallback where it exists, else the next turn of the event loop).
   * @param {() => void} fn what to run then
   * @param {number} [ms] wait at least this long first (ms)
   * @returns {() => void} cancels the wait
   */
  function whenIdle(fn, ms = 0) {
    let id = 0;
    let gone = false;
    /** Run it, unless cancelled. @returns {void} */
    const run = () => { if (!gone) fn(); };
    /** Ask the phone for its next idle moment. @returns {void} */
    const ask = () => {
      if (gone) return;
      if (typeof globalThis.requestIdleCallback === 'function') id = globalThis.requestIdleCallback(run, { timeout: 600 });
      else id = setTimeout(run, 0);
    };
    const pre = ms > 0 ? setTimeout(ask, ms) : 0;
    if (!pre) ask();
    return () => {
      gone = true;
      clearTimeout(pre);
      if (typeof globalThis.cancelIdleCallback === 'function') globalThis.cancelIdleCallback(id);
      clearTimeout(id);
    };
  }

  /**
   * The face settings of the next face (what layoutFace gets), as newFace lays it out: a round's setup, or free play's
   * and the demo's own rules.
   * @param {number} s the face seed
   * @param {object} spec the face spec
   * @param {number} w stage width
   * @param {number} h stage height
   * @returns {object} the settings (prep-logic.js faceLayout)
   */
  function faceInputs(s, spec, w, h) {
    if (cfg.kind === 'round') return roundInputs(cfg.setup, s, w, h);
    const wantStrip = cfg.kind === 'free' ? toolIds.includes('noseStrip') && stripChance(s) : strip;
    return { seed: s, spec, w, h, count: cfg.kind === 'free' ? FACE_BUMPS : count, strip: Boolean(wantStrip), allowed: null, decoys: true, mix: null, grown: 0 };
  }

  /**
   * The name of a face build: its settings plus what else its first picture depends on.
   * @param {object} inputs the face settings (faceInputs)
   * @param {number} dpr the pixel ratio
   * @returns {string} the name
   */
  function faceKey(inputs, dpr) {
    return buildKey(inputs, { dpr, lighter, mood: moodOverride, reluctant: cfg.kind === 'round' && cfg.reluctant === true });
  }

  /** Forget the face built ahead or kept (and stop painting it). @returns {void} */
  function dropAhead() {
    ahead?.cancel?.();
    ahead = null;
  }

  /**
   * Run the next painting step of the face built ahead, then wait for the next idle moment. While holdWhile says so
   * (the boss intro's stage moment is playing) it waits instead.
   * @returns {void}
   */
  function aheadStep() {
    const a = ahead;
    if (!a || disposed) return;
    a.cancel = null;
    let hold = false;
    try { hold = Boolean(a.holdWhile?.()); } catch { hold = false; }
    if (hold) { a.cancel = whenIdle(aheadStep, 150); return; }
    runStep(a);
    if (a.steps.length) a.cancel = whenIdle(aheadStep);
  }

  /**
   * Run one painting step of a face built ahead; a step that fails stops the rest (the round then paints fresh).
   * @param {object} a the face built ahead
   * @returns {void}
   */
  function runStep(a) {
    const step = a.steps.shift();
    try { step?.(); } catch (e) {
      console.warn('building the face ahead failed:', e);
      a.steps.length = 0;
      a.texture = null;
    }
  }

  /**
   * The face built ahead or kept, if it is the face asked for (same name): its painting is finished now (never started
   * over), and it comes back with a fresh copy of its layout. Anything else is dropped.
   * @param {string} key the name of the face asked for (faceKey)
   * @returns {{face: object, lay: object, texture: HTMLCanvasElement|null}|null} the face, or null = build fresh
   */
  function takeAhead(key) {
    const a = ahead;
    if (!a || a.key !== key) { dropAhead(); return null; }
    a.cancel?.();
    a.cancel = null;
    while (a.steps.length) runStep(a);
    const lay = copyLayout(a.lay);
    if (!lay) { dropAhead(); return null; }
    return { face: a.face, lay, texture: a.texture };
  }

  /**
   * The stage changed size (window resized, phone turned): repaint the room and move the round in progress to the
   * new size. The face is laid out again for the new size and every bump, mark and bit of goo keeps its place on it.
   * @returns {void}
   */
  function relayout() {
    if (disposed || away || hiddenNow) return; // away (D48): off the page, nothing to measure; setAway(false) lays it out again; hidden: built ahead, no face yet
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
    timers.cancel(prev?.failTimer);
    timers.cancel(prev?.endTimer);
    clearInterval(prev?.reqTimer);
    root.classList.remove('pop-game--ending'); // a new face: the game's Menu button may show again
    fail.hidden = true;
    escape.hidden = true;
    showIrritation(0);
    newBtn.disabled = false;
    newBtn.hidden = cfg.kind === 'round'; // a customer round has no "New face" (the game picks the next customer)
    stage.replaceChildren(backdrop, zoomBox);
    zoomBox.hidden = zoom === false; // no zoom buttons when zooming is off (B28)
    showView({ z: 1, x: 0, y: 0 }); // every new customer starts with the whole face (SPEC D9)
    paintBackdrop();
    done.hidden = true;
    foot.hidden = false;
    bar.hidden = false;
    showWarmth(0);
    timers.cancel(current?.winceTimer);
    const round = cfg.kind === 'round';
    let s; // Try again = the same customer, a fresh face; a round uses the seed the game gave
    if (again && prev) s = prev.seed;
    else if (round) s = cfg.seed;
    else if (freshSeed) { s = seed; freshSeed = false; } else s = nextSeed();
    let spec;
    if (again && prev) spec = prev.spec;
    else if (round) spec = cfg.setup.spec;
    else spec = (cfg.kind === 'demo' ? fixedSpec : null) ?? randomFaceSpec(s);
    const { w, h } = measureFor(s, spec); // with the request banner and the hint line as they will be
    const dpr = sceneRatio(globalThis.devicePixelRatio, lighter); // 1 with lighter graphics
    // The face: a round's setup or free play's and the demo's rules (no nose strip over a clown nose; a boss face's own
    // bumps, T8.4). Built ahead during the intro, or kept from the last try of this same face, when nothing changed
    // since (B99(4)); else laid out fresh.
    const inputs = faceInputs(s, spec, w, h);
    const key = faceKey(inputs, dpr);
    const built = takeAhead(key);
    const { face, lay } = built ?? faceLayout(inputs);
    const keepLay = built ? ahead.lay : copyLayout(lay); // an untouched copy for Try again
    // Skill by use (ECONOMY.md section 4): faster holds and fewer rough presses for kinds the player has mastered.
    // The Big Evil Horn boss's horns are harder while cold (SPEC D49, data/bosses.js coldHorn; only that boss has one).
    const pimples = cfg.kind === 'demo' ? lay.pimples
      : applyColdHorn(applyMastery(lay.pimples, cfg.holdFactors, cfg.roughReductions), round ? cfg.setup.coldHorn : null);
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
      hooks: round ? cfg.hooks : {}, // the game's onPop, onOw and onRequestEnd listeners (T4.5, B14)
      requestEnded: false, // onRequestEnd was called for this face (once)
      newQueue: meetKinds(lay), // first-time hints for the kinds she meets on this face (T6.5)
      twistHint: round ? cfg.twistHint : null, // the twist's tip on the hint line until the first pop (T8.3)
      giggle: false, giggleTimer: 0, // a short happy face after a giggle (ticklish, T8.3)
    };
    current = c;
    endNoseNudge(); // a new face: no reminder glow left over from the last one
    sizeCanvas(canvas, w, h);
    c.scene = createPopScene(canvas, {
      width: w, height: h, dpr, reduced: still(), sound, buzz, squeeze, zoom: zoom !== false,
      juicy: !gentlePops, lite: lighter, grandFirst: round && cfg.grandFirst === true, // the juicy pop (SPEC D45); Hubby's first pop in chapter 0 is the big show (D46-26)
      texture: firstTexture(c, built?.texture ?? null), pimples, strip: lay.strip, decoys: lay.decoys,
      boss: round && cfg.setup.grown > 0, // the Big Evil Horn boss (the only face whose horns grow, data/bosses.js grownHorns): its horns glow spooky violet
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
      onSlow: () => { // frames stayed slow (an older phone): lighter graphics from now on (this room and this face now)
        if (lighter) return;
        lighter = true;
        paintBackdrop();
        if (current === c && c.scene?.setRatio) { c.dpr = sceneRatio(globalThis.devicePixelRatio, true); c.scene.setRatio(c.dpr, faceTexture(c)); } // B99(2)
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
        c.round = registerPop(c.round, { timeSeconds: comboClock(performance.now(), pausedTotalMs, pause.since), clean });
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
        if (round) { // a moment to see the glowing face, then the game takes over
          // The hint line and tools go invisible but the bars keep their room and colour (pop.css .pop-game--ending):
          // hiding them outright made the scene grow and the face jump in size just before the result screen
          // (owner 2026-10-29: "a weird flicker").
          // During this pause leaving would lose the finished customer (no pay, no stars): the game's Menu button
          // hides (app.css .pop-game--ending) and ending() says so.
          c.ending = true;
          root.classList.add('pop-game--ending');
          const pause = (still() ? END_PAUSE_REDUCED : END_PAUSE) * 1000;
          c.endTimer = timers.later(() => finishRound(c, null), pause);
          return;
        }
        foot.hidden = true;
        bar.hidden = true;
        done.hidden = false;
        done.querySelector('button')?.focus({ preventScroll: true });
      },
    });
    canvas.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { if (c.scene.keyPress()) e.preventDefault(); }
    });
    // Kept for Try again (D15, B99(4)): this face's untouched layout and first picture (the one face kept besides the
    // face in play; a different next face drops it).
    ahead = keepLay ? { key, face, lay: keepLay, texture: c.firstTexture, steps: [], cancel: null, kept: true } : null;
    if (isPaused(pause)) c.scene.setPaused(true); // a new face made while the guide is open (or the page hidden) starts frozen
    hint.textContent = ''; // (the preview put the same text there: this way a first-time hint still flashes)
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

  /**
   * Set a customer round up without starting it (prepare(), B99(4)): startRound's own setting up.
   * @param {object} o the startRound arguments
   * @returns {void}
   */
  const configureRound = (o) => api.startRound(o, true);

  const api = {
    node: root,
    /**
     * Put the scene into a page element and show the first face (it needs to be in the page to measure its size).
     * hidden = true (B99(4)): the scene goes in hidden and untouchable behind the screen on show (pop.css .pop-prep, at
     * the very same size), with no face, so prepare() can measure the stage and build the next face ahead; show()
     * makes it the visible scene.
     * @param {HTMLElement} host the element to fill
     * @param {{hidden?: boolean}} [opts] hidden = mount it hidden for prepare()
     * @returns {void}
     */
    mount(host, opts = {}) {
      if (opts.hidden === true) {
        hiddenNow = true;
        root.classList.replace('pop-game', 'pop-prep');
        root.inert = true;
        root.setAttribute('aria-hidden', 'true');
      }
      host.append(root);
      globalThis.addEventListener?.('resize', onResize);
      globalThis.document?.addEventListener?.('visibilitychange', onVisibility); // the round clock pauses while hidden (B83)
      globalThis.addEventListener?.('pagehide', onVisibility);
      globalThis.addEventListener?.('pageshow', onVisibility);
      watcher?.observe(stage);
      if (hiddenNow) { ready = true; return; } // in the page and measurable now; the face comes with prepare() or startRound()
      requestAnimationFrame(() => { ready = true; newFace(wantFocus); wantFocus = false; }); // the demo face, or a round/free play asked for before
    },
    /**
     * Make a scene mounted hidden the visible scene (B99(4)): call it before startRound. Nothing for a visible scene.
     * @returns {void}
     */
    show() {
      if (!hiddenNow || disposed) return;
      hiddenNow = false;
      root.classList.replace('pop-prep', 'pop-game');
      root.inert = false;
      root.removeAttribute('aria-hidden');
    },
    /**
     * Build the next customer's face ahead while the scene is mounted hidden (B99(4)): sets the round up as startRound
     * does (header, tools, room) without starting it, lays the face out at once for the stage as it is now, and paints
     * the room, the face's still layers and the first picture in small steps at idle moments. startRound with the same
     * face then uses it. holdWhile = wait while this says true (the boss intro's stage moment must not stutter).
     * @param {object} o the startRound arguments (as startRound; listeners are not needed yet)
     * @param {{holdWhile?: () => boolean}} [opts] when to wait
     * @returns {{w: number, h: number}|null} the stage size the face is laid out for (the intro portrait uses it, B59),
     *   or null when nothing could be built (not mounted)
     */
    prepare(o = {}, opts = {}) {
      if (disposed || !ready) return null;
      configureRound(o);
      newBtn.hidden = true; // as newFace does for a round, before measuring (the header's width decides its height)
      stage.replaceChildren(backdrop, zoomBox);
      zoomBox.hidden = zoom === false;
      showView({ z: 1, x: 0, y: 0 });
      const { w, h } = measureFor(cfg.seed, cfg.setup.spec); // as newFace does
      const dpr = sceneRatio(globalThis.devicePixelRatio, lighter);
      const inputs = faceInputs(cfg.seed, cfg.setup.spec, w, h);
      const { face, lay } = faceLayout(inputs);
      const keep = copyLayout(lay);
      dropAhead();
      if (!keep) return { w, h };
      const a = { key: faceKey(inputs, dpr), face, lay: keep, texture: null, steps: [], cancel: null, holdWhile: opts.holdWhile ?? null };
      const c = { w, h, dpr, face, spec: cfg.setup.spec, seed: cfg.seed, total: lay.pimples.length, healed: false, scene: null, wince: false, giggle: false };
      let layers = [];
      a.steps.push(
        () => syncFx(w, h, dpr), // the room's light and dust effects (their sprites)
        () => paintBackdrop(true), // the still room and the effects' still parts
        () => flush(backdrop),
        () => { layers = faceLayerCanvases(face, c.spec, c.seed, dpr); }, // the face's still layers
        () => flush(layers[0]),
        () => flush(layers[1]),
        () => { a.texture = faceTexture(c); }, // the first picture
        () => flush(a.texture),
      );
      ahead = a;
      a.cancel = whenIdle(aheadStep);
      return { w, h };
    },
    /**
     * For checks: the face built ahead or kept now (B99(4)).
     * @returns {{ready: boolean, kept: boolean, stepsLeft: number, painted: boolean}|null} its state, or null
     */
    aheadState: () => (ahead ? { ready: !ahead.steps.length, kept: Boolean(ahead.kept), stepsLeft: ahead.steps.length, painted: Boolean(ahead.texture) } : null),
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
     *   costs in reputation, shown on the fail choice (left out = no cost shown); retryOnly = true hides "Next customer"
     *   (a story round before the studio opens, app-logic.js roundArgs). grandFirst = true gives the first pop the
     *   grand show (chapter 0's Hubby only, D46-26; the torchlight leaves it off). twist = the customer's twist
     *   (T8.3, data/twists.js: 'fidgety', 'ticklish', 'sensitive', or 'hurry' for a hurry request; shown as a label
     *   in the header, the first three also change the play); twistHintKey = its tip for the hint line (until the
     *   first pop). boss = a boss or event customer's face rules (T8.4, data/bosses.js bossSpec `boss`) and
     *   bossNameKey = its name, shown in gold in the twist chip's place.
     *   For a special mode (T4.5): mood = a fixed face mood ('sleep'; an Ow still winces), onPop(bump, left) after
     *   every pop and onOw(at) after every Ow. onRequestEnd(status) runs once when the request is done or missed
     *   ('done' or 'failed'), so the game can end the hectic music (B14).
     * @param {boolean} [setupOnly] true = only set the round up, do not start it (prepare(), B99(4))
     * @returns {void}
     */
    startRound(o = {}, setupOnly = false) {
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
        hooks: {
          onPop: typeof o.onPop === 'function' ? o.onPop : null, onOw: typeof o.onOw === 'function' ? o.onOw : null,
          onRequestEnd: typeof o.onRequestEnd === 'function' ? o.onRequestEnd : null,
        },
        escape: o.customer?.escape === true, // the husband in armor (chapter 2) refuses the first pop and runs off
        reluctant: o.customer?.reluctant === true, // the chapter 0 husband: stern the whole round, never beams (owner 2026-10-28)
        grandFirst: o.grandFirst === true, // the first pop is the grand show: only chapter 0's Hubby round (D46-26, app-logic.js roundArgs)
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
      failNext.hidden = o.retryOnly === true; // a story round (Hubby): only Try again after a storm-off
      if (o.retryOnly === true) failNote.hidden = true;
      buildToolBar(tools);
      room = o.room === 'home' ? 'home' : 'studio';
      party = isPartyDay(o); // Prom Penny's event day: fairy lights behind her (D45 item 6)
      if (Number.isFinite(o.tier)) tier = o.tier;
      if (Array.isArray(o.layers)) layers = [...o.layers];
      pins = Number(o.pins) || 0;
      if (setupOnly === true) return; // prepare(): set up, not started (B99(4))
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
      party = false;
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
      // press the button of the tool in hand (fingers when the old one is gone); the hint line keeps a first-time hint (D48)
      for (const [k, b] of toolButtons) b.setAttribute('aria-pressed', String(k === toolId));
      current?.scene?.setTool(toolId);
      const step = current?.scene?.step() ?? 'pop';
      if (step === 'pop' || step === 'wipe') paintHint(step);
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
    /** Let popping go on after halt() (the torchlight stir is a pause, B28). @returns {void} */
    resume() { current?.scene?.resume(); },
    /** Take all goo off the face in play at once (the torchlight catch, B28). @returns {void} */
    clearGoo() { current?.scene?.clearGoo(); },
    /**
     * Freeze the round while the Field guide is open over it (B48), or let it go on: the scene's time, the irritation
     * meter, the Evil Horn growth, the twists, the combo clock and the round clock all stand still, the same way as
     * while the page is hidden (B83). Both pauses can overlap.
     * @param {boolean} on true = freeze, false = go on exactly where it stopped
     * @returns {void}
     */
    setPaused(on) { setRoundPause('guide', Boolean(on)); },
    /**
     * The game's Menu button took the scene off the page, or put it back (SPEC D48: Menu pauses the round). Away = the
     * same freeze as the Field guide (no frames, timers, room repaints or hurry ticker) and no size watching; back = it
     * is laid out again for the stage as it is now (the phone may have turned) and goes on exactly where it stopped.
     * Call setAway(false) after the scene is back in the page.
     * @param {boolean} on true = away, false = back
     * @returns {void}
     */
    setAway(on) {
      const next = Boolean(on);
      if (next === away || disposed) return;
      away = next;
      if (away) {
        clearTimeout(resizeTimer);
        watcher?.unobserve(stage);
        globalThis.removeEventListener?.('resize', onResize);
        setRoundPause('away', true);
        return;
      }
      globalThis.addEventListener?.('resize', onResize);
      watcher?.observe(stage);
      setRoundPause('away', false);
      relayout();
    },
    /** Whether the scene is away (SPEC D48). @returns {boolean} true while away */
    away: () => away,
    /**
     * Settings changed while the scene was away (SPEC D48): the sound switch and effects volume, and Lighter graphics
     * (the room and the face at the new sharpness). Gentle pops, the squeeze and the calm version stay as they were for
     * the face in play (the next face uses the new ones).
     * @param {{sound?: boolean, sfxVolume?: number, lowDetail?: boolean}} s the settings now
     * @returns {void}
     */
    applySettings(s = {}) {
      if (disposed) return;
      if (typeof s.sound === 'boolean' && s.sound !== sound.isOn()) {
        sound.setOn(s.sound);
        head.querySelector('.pop-sound')?.replaceWith(soundSwitch()); // the switch's picture follows
      }
      if (Number.isFinite(s.sfxVolume)) sound.setVolume(s.sfxVolume);
      if (typeof s.lowDetail === 'boolean' && s.lowDetail !== lighter) {
        lighter = s.lowDetail;
        if (!away) paintBackdrop();
        const c = current;
        if (c?.scene?.setRatio) { c.dpr = sceneRatio(globalThis.devicePixelRatio, lighter); c.scene.setRatio(c.dpr, faceTexture(c)); }
      }
    },
    /** Whether the round is frozen now (hidden page, open guide or away). @returns {boolean} true while paused */
    paused: () => isPaused(pause),
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
    /** The stage element where the face is drawn (a special mode measures it and lays its own layers over it). */
    stage,
    /** Put a special mode's own title in the header (B29). @param {string} text the title @returns {void} */
    setTitle(text) { title.textContent = text; },
    /** Add a button at the start of the header, such as a special mode's Menu (B29). @param {HTMLElement} btn the button @returns {void} */
    addHeadButton(btn) { head.prepend(btn); },
    /** Add a line at the top of the foot, above the hint, such as a special mode's how-to (B29). @param {HTMLElement} line the line @returns {void} */
    addFootLine(line) { foot.prepend(line); },
    /** Hide the foot (hint and how-to) for a special mode's scripted end, such as the torchlight catch. @returns {void} */
    hideFoot() { foot.hidden = true; },
    /** Add a line right under the title, such as the daily goal chip (T8.5, B29). @param {HTMLElement} line the line @returns {void} */
    addTitleLine(line) { title.after(line); },
    /** The canvas of the face in play (a special mode plays class animations on it), or null. @returns {HTMLCanvasElement|null} the canvas */
    faceCanvas: () => current?.canvas ?? null,
    /** Wake the popping sounds up (call from inside a tap). @returns {void} */
    unlock: () => sound.unlock(),
    /**
     * Play a sound through the scene's own sound switch and volume (a special mode's own sounds, B28).
     * @param {string} name a sound table name
     * @param {object} [opts] the voice's options
     * @returns {void}
     */
    play: (name, opts) => { sound.play(name, opts); },
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
      timers.cancel(current?.winceTimer);
      timers.cancel(current?.failTimer);
      timers.cancel(current?.endTimer);
      timers.clear();
      clearInterval(current?.reqTimer);
      current?.scene?.dispose();
      current = null;
      dropAhead(); // the face built ahead or kept for Try again goes too (B99(4))
      globalThis.removeEventListener?.('resize', onResize);
      globalThis.document?.removeEventListener?.('visibilitychange', onVisibility);
      globalThis.removeEventListener?.('pagehide', onVisibility);
      globalThis.removeEventListener?.('pageshow', onVisibility);
      root.remove();
      sound.dispose();
    },
  };
  return api;
}
