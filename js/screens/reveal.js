// The before and after reveal (T8.2, SPEC D24b) and the one place that draws a saved face: the result screen shows
// the customer twice, BEFORE (every bump, as the round started) and AFTER (clean, glowing, sparkly), stacked in one
// frame with a wipe slider between them. It slides once by itself when it opens (not with reduced motion: then it
// rests half and half), and the player can drag it or use the arrow keys. The Face album (album.js) draws its clean
// faces with faceCanvas from here.
// Every face is drawn from its saved recipe (album-logic.js faceSetup: seed, face parts, layout settings, stage size)
// with the REAL face and bump drawing code. Only its public calls are used, all in this file: logic.js faceGeometry
// and layoutFace, face.js drawFace, art.js makeCanvas, drawPimple, drawDecoy and drawStripDots. No screenshots of the
// pop scene and no stored pixels. All text comes from the string table.

import { el, svg, INK } from './dom.js';
import { revealFaces, sliderKey, autoWipe, SLIDER_REST } from './album-logic.js';
import { faceGeometry, layoutFace } from '../pop/logic.js';
import { drawFace } from '../pop/face.js';
import { makeCanvas, drawPimple, drawDecoy, drawStripDots } from '../pop/art.js';
import { makeFxLayer } from '../fx/fx-layer.js';
import { makeRevealSparkle } from '../fx/reveal-fx.js';
import { RESULT_FX } from '../fx/celebrate-logic.js';

/** The reveal pictures' drawing size in CSS px (4:5, head and shoulders); CSS scales them to the frame. */
export const REVEAL_SIZE = { w: 240, h: 300 };

/**
 * The part of the round's stage that holds the head, hair, sparkles and some shoulders, and how it is scaled to fill a
 * picture: stage point (x, y) lands at (x * k + ox, y * k + oy) in the picture.
 * @param {{cx: number, cy: number, rx: number, ry: number}} face the face geometry on the round's stage
 * @param {number} w picture width @param {number} h picture height
 * @returns {{x0: number, y0: number, x1: number, y1: number, k: number, ox: number, oy: number}} the part and the fit
 */
function pictureFit(face, w, h) {
  const x0 = face.cx - face.rx * 1.5;
  const x1 = face.cx + face.rx * 1.5;
  const y0 = face.cy - face.ry * 1.56;
  const y1 = face.cy + face.ry * 1.42;
  const k = Math.min(w / (x1 - x0), h / (y1 - y0));
  return { x0, y0, x1, y1, k, ox: (w - (x1 - x0) * k) / 2 - x0 * k, oy: (h - (y1 - y0) * k) / 2 - y0 * k };
}

/**
 * Where the face sits in a reveal picture, as shares of the picture (any size of the same 4:5 shape), with its
 * features (the eyes), for the reveal sparkle (fx/reveal-fx.js).
 * @param {{w: number, h: number, spec: object}} look the face recipe (album-logic.js revealFaces)
 * @returns {{cx: number, cy: number, rx: number, ry: number, features: object}} cx, rx in shares of the width; cy, ry of the height
 */
export function revealFaceBox(look) {
  const { w, h } = REVEAL_SIZE;
  const face = faceGeometry(look.w, look.h, look.spec);
  const { k, ox, oy } = pictureFit(face, w, h);
  return { cx: (face.cx * k + ox) / w, cy: (face.cy * k + oy) / h, rx: (face.rx * k) / w, ry: (face.ry * k) / h, features: face.features };
}

/**
 * Draw one look of a saved face onto a new canvas: the head and shoulders fill the picture (the room around them is
 * left see-through, so the frame's own background shows). A clean look has no bumps and no nose dots (unless she never
 * peeled the strip: look.stripLeft keeps them); moles and freckles stay (they are part of the face). The sparkly look
 * adds a soft glow behind the head.
 * @param {{seed: number, spec: object, count: number, kinds: string[], strip: boolean, decoys: boolean, w: number,
 *   h: number, clean?: boolean, mood?: string, redness?: number, sparkles?: boolean}} look the face recipe plus the look
 *   (album-logic.js revealFaces gives both looks)
 * @param {number} w picture width in CSS px
 * @param {number} h picture height in CSS px
 * @param {number} [dpr] device pixels per CSS pixel
 * @returns {HTMLCanvasElement} the picture
 */
export function faceCanvas(look, w, h, dpr = Math.min(2, globalThis.devicePixelRatio || 1)) {
  const { canvas, ctx } = makeCanvas(w, h, dpr);
  // The face is laid out on the stage size the round had, so the bumps and moles sit exactly where they were.
  const face = faceGeometry(look.w, look.h, look.spec);
  const lay = layoutFace({
    seed: look.seed, face, count: look.count, strip: look.strip, allowed: look.kinds, decoys: look.decoys,
    mix: look.mix ?? null, grown: look.grown ?? 0, // a boss face's own bumps (T8.4)
  });
  const { x0, y0, x1, y1, k, ox, oy } = pictureFit(face, w, h);
  ctx.setTransform(dpr * k, 0, 0, dpr * k, dpr * ox, dpr * oy);
  ctx.lineCap = 'butt';
  if (look.sparkles) { // a soft, warm glow behind the head
    const g = ctx.createRadialGradient(face.cx, face.cy - face.ry * 0.2, face.rx * 0.4, face.cx, face.cy - face.ry * 0.2, face.rx * 1.7);
    g.addColorStop(0, 'rgba(255,250,225,0.95)');
    g.addColorStop(1, 'rgba(255,250,225,0)');
    ctx.fillStyle = g;
    ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
  }
  // As pop-mode.js does: background false skips face.js's plain wall, so only the person is drawn.
  drawFace(ctx, face, look.spec, { mood: look.mood, redness: look.redness ?? 0, seed: look.seed, dpr: dpr * k, background: false });
  for (const d of lay.decoys ?? []) drawDecoy(ctx, d);
  if (lay.strip && (!look.clean || look.stripLeft)) drawStripDots(ctx, lay.strip.dots, -Infinity); // left on: still there
  if (!look.clean) {
    for (const p of lay.pimples) drawPimple(ctx, p, 0, 1, 0.4); // standing still, fully grown in (as the round began)
  }
  return canvas;
}

/**
 * The customer intro's portrait WITH the round's bumps (B59: an event or boss face shows its own bumps on the intro, so
 * the player sees what the event is about). The same face drawing as the reveal's BEFORE picture, with the intro's
 * grim, a bit red look; every face part and bump comes from the saved recipe (album-logic.js faceSetup).
 * @param {ReturnType<typeof import('./album-logic.js').faceSetup>} setup the face recipe of this round
 * @param {string} label what screen readers say
 * @param {number} [w] picture width in CSS px
 * @param {number} [h] picture height in CSS px
 * @returns {HTMLCanvasElement} the picture (class app-intro__face, as the plain intro portrait)
 */
export function bumpPortrait(setup, label, w = 220, h = 240) {
  const canvas = faceCanvas({ ...revealFaces(setup).before, mood: 'grim', redness: 0.6 }, w, h);
  canvas.className = 'app-intro__face';
  canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-label', label);
  return canvas;
}

/**
 * Whether the reveal should stay still: the game's Reduced motion switch or the phone's own setting.
 * @param {boolean} reducedMotion the game's switch
 * @returns {boolean} true = no automatic slide
 */
function stillWanted(reducedMotion) {
  if (reducedMotion) return true;
  try { return Boolean(globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches); } catch { return false; }
}

/**
 * The little round handle on the wipe line: two arrows pointing left and right.
 * @returns {SVGElement} the icon
 */
function knobIcon() {
  const stroke = { fill: 'none', stroke: INK, 'stroke-width': 3.2, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' };
  return svg('svg', { viewBox: '0 0 24 24', 'aria-hidden': 'true', class: 'app-icon' }, [
    svg('path', { d: 'M9 7l-5 5 5 5', ...stroke }), svg('path', { d: 'M15 7l5 5-5 5', ...stroke }),
  ]);
}

/**
 * Build the before and after reveal card.
 * @param {{t: (key: string, vars?: object) => string, setup: ReturnType<typeof import('./album-logic.js').faceSetup>,
 *   reducedMotion?: boolean, name?: string, lowDetail?: boolean, sparkle?: boolean}} opts t = string function; setup =
 *   the customer's face recipe; reducedMotion = the game's switch (no automatic slide); name = the customer's name, for
 *   screen readers; lowDetail = Lighter graphics (the sparkle at pixel ratio 1); sparkle = false leaves out the reveal
 *   sparkle (SPEC D45: a light sweep and glints on the clean face while the slide is almost across)
 * @returns {{node: HTMLElement, value: () => number, dispose: () => void, faceCentre: () => DOMRect|null,
 *   sparkleState: () => object|null}} the card; value() = the slider now (0..1); faceCentre = where the face is on
 *   the page now (for the tip coins, fx/coins-fx.js); sparkleState = for checks
 */
export function createReveal({ t, setup, reducedMotion = false, name = '', lowDetail = false, sparkle = true }) {
  const ac = new AbortController();
  const signal = ac.signal;
  const looks = revealFaces(setup);
  const still = stillWanted(reducedMotion);
  const node = el('figure', 'app-reveal');
  const frame = el('div', 'app-reveal__frame');
  frame.tabIndex = 0;
  frame.setAttribute('role', 'slider');
  frame.setAttribute('aria-label', name ? t('ui.reveal.labelName', { name }) : t('ui.reveal.label'));
  frame.setAttribute('aria-valuemin', '0');
  frame.setAttribute('aria-valuemax', '100');
  const before = el('div', 'app-reveal__pic app-reveal__pic--before');
  const after = el('div', 'app-reveal__pic app-reveal__pic--after');
  const line = el('span', 'app-reveal__line');
  const knob = el('span', 'app-reveal__knob');
  knob.append(knobIcon());
  const tagAfter = el('span', 'app-reveal__tag app-reveal__tag--after', t('ui.reveal.after'));
  const tagBefore = el('span', 'app-reveal__tag app-reveal__tag--before', t('ui.reveal.before'));
  for (const n of [before, after, line, knob, tagAfter, tagBefore]) n.setAttribute('aria-hidden', 'true');
  frame.append(before, after, line, knob, tagAfter, tagBefore);
  node.append(frame);

  let value = still ? SLIDER_REST : 0; // 0 = all BEFORE, 1 = all AFTER (after shows on the left, up to the line)
  let raf = 0;
  let dragging = null; // the pointer id while a finger or the mouse drags the line

  /** Show the slider at a value: the after picture is cut off at the line. @param {number} v 0..1 @returns {void} */
  function setValue(v) {
    value = Math.min(1, Math.max(0, v));
    const pct = Math.round(value * 100);
    after.style.clipPath = `inset(0 ${100 - value * 100}% 0 0)`;
    line.style.left = `${value * 100}%`;
    knob.style.left = `clamp(22px, ${value * 100}%, calc(100% - 22px))`; // the handle stays whole at the two ends
    frame.setAttribute('aria-valuenow', String(pct));
    frame.setAttribute('aria-valuetext', t('ui.reveal.value', { pct }));
    tagAfter.classList.toggle('app-reveal__tag--dim', value < 0.18);
    tagBefore.classList.toggle('app-reveal__tag--dim', value > 0.82);
  }

  let touched = false; // the player moved the slider: no automatic slide any more
  /** Stop the automatic slide (the player took over). @returns {void} */
  function stopAuto() {
    touched = true;
    cancelAnimationFrame(raf);
    raf = 0;
  }

  /** Run the automatic slide once (album-logic.js autoWipe). @returns {void} */
  function playAuto() {
    const start = performance.now();
    /** One frame of the slide. @param {number} now the frame time @returns {void} */
    const step = (now) => {
      const { value: v, done } = autoWipe((now - start) / 1000);
      setValue(v);
      raf = done ? 0 : requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
  }

  /** The slider value under a pointer. @param {PointerEvent} e the event @returns {number} 0..1 */
  function valueAt(e) {
    const r = frame.getBoundingClientRect();
    return r.width ? (e.clientX - r.left) / r.width : value;
  }

  frame.addEventListener('pointerdown', (e) => {
    if (e.button !== undefined && e.button > 0) return;
    stopAuto();
    dragging = e.pointerId;
    try { frame.setPointerCapture(e.pointerId); } catch { /* not every browser can capture */ }
    setValue(valueAt(e));
  }, { signal });
  frame.addEventListener('pointermove', (e) => { if (dragging === e.pointerId) setValue(valueAt(e)); }, { signal });
  for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) {
    frame.addEventListener(type, (e) => { if (dragging === e.pointerId) dragging = null; }, { signal });
  }
  frame.addEventListener('keydown', (e) => {
    const next = sliderKey(value, e.key);
    if (next === null) return;
    e.preventDefault();
    stopAuto();
    setValue(next);
  }, { signal });

  setValue(value);
  const box = revealFaceBox(looks.after);
  let layer = null; // the sparkle's effects layer inside the AFTER picture (D45)
  let shine = null;
  // Draw a moment after the screen is in the page (drawing two faces takes a little time), then slide once.
  const drawRaf = requestAnimationFrame(() => {
    if (signal.aborted) return;
    const { w, h } = REVEAL_SIZE;
    before.append(faceCanvas(looks.before, w, h));
    after.append(faceCanvas(looks.after, w, h));
    if (!still && !touched) playAuto();
    if (!sparkle) return;
    layer = makeFxLayer(after, { lite: lowDetail, className: 'app-fx app-reveal__fx' });
    shine = makeRevealSparkle({ kit: layer.kit, face: box, features: box.features });
    if (still) layer.still((c, W, H) => shine.paintStill(c, W, H)); // a soft still glow, nothing moves
    else layer.add(shine, RESULT_FX.sparkleAt); // as the slide is almost across
  });

  return {
    node,
    /** The slider now. @returns {number} 0 = all before, 1 = all after */
    value: () => value,
    /** Where the face's middle is on the page now, and its size (the tip coins burst out of it). @returns {DOMRect|null} a box round the face */
    faceCentre() {
      const r = frame.getBoundingClientRect();
      if (!r.width) return null;
      return new DOMRect(r.left + (box.cx - box.rx) * r.width, r.top + (box.cy - box.ry) * r.height, box.rx * 2 * r.width, box.ry * 2 * r.height);
    },
    /** The sparkle's state, for checks. @returns {object|null} state */
    sparkleState: () => (shine ? { ...shine.state(), busy: layer?.busy() ?? false } : null),
    /** Stop the slide and the sparkle and remove the listeners. @returns {void} */
    dispose() { cancelAnimationFrame(drawRaf); stopAuto(); layer?.dispose(); ac.abort(); },
  };
}
