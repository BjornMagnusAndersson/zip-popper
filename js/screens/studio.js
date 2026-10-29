// The studio view (T5.1c): her whole studio, full size, no customer in front. The room is the same drawing as the pop
// scene's backdrop (pop/backdrop.js drawStudio, in its 'view' places), with every studio upgrade she has bought and
// scrubbed; she stands in it (game/comic-art.js heroine, in her best outfit) next to her chair. Under the picture (beside
// it when the phone is held sideways): a short line about the tier and one caption per upgrade. A Back button.
// The picture is painted again when the screen changes size (turning the phone). The room itself stands still; only
// its moving parts live on their own see-through layer on top (B33d, B97(2)): the spa's sparkles twinkle and the
// leak's drop swells, falls and plinks into the bucket (the plink follows the sound switch, as in the pop scene, and
// also plays with reduced motion, when the drop just hangs still). It all stops when the screen closes.
// In scrubs (T5.2b) she starts with her scrub cap on and a hint line says so: tapping her (or Enter/Space, she is a
// button) takes the cap off with a little hop, the cap floats over onto the chair, and her bun shows; again puts it
// back. With reduced motion the cap just swaps, no hop and no flight.
// The wall of fame (R8j): a gold frame on the wall for each kind of bump she has mastered, an empty nail for the rest
// (pop/backdrop.js fameSpots). Each frame is a button that opens its diploma again. Right after a new Master's diploma
// ("Hang it up!") the screen opens in hang mode: the new frame drops onto its nail with a little swing (no motion with
// reduced motion), a line says so, and Continue goes on with the game.

import { el, svg, icon, header, screenShell, button } from './dom.js';
import {
  drawStudio, drawStudioMotion, nextStudioChange, layerSpots, fameSpots, fameFrame, roomLeaks, backdropKind, dripLands,
  nextDripLanding,
} from '../pop/backdrop.js';
import { BUMP_IDS } from '../data/bumps.js';
import { drawCharacter, drawScrubCap, headSpot, OUTFITS } from '../game/comic-art.js';
import { studioCaptions, capFlight, studioCapStart, CAP_FLIGHT_MS } from '../game/studio.js';

const FIGURE_HEIGHT = 640; // comic-art.js: a standing figure at scale 1 is about this tall, floor to the top of the bun

/**
 * Build the studio view screen.
 * @param {{t: (key: string, vars?: object) => string, tier?: number, layers?: string[], outfit?: string,
 *   masters?: string[], hang?: string|null, pins?: number, onDiploma?: (type: string) => void, onContinue?: () => void,
 *   onBack?: () => void, reducedMotion?: boolean, sound?: {play: (name: string) => void}}} opts
 *   t = string function; tier = studio tier 0..2; layers = owned studio upgrades (draw order); outfit = what she wears
 *   (comic-art.js OUTFITS name); masters = the mastered bump ids (their frames hang on the wall of fame); hang = a bump id
 *   whose frame was just earned (hang mode: it drops onto the wall, and a Continue button shows); onDiploma = a frame
 *   was tapped; onContinue = Continue in hang mode; onBack = Back; pins = home-popping pins in the jar on the shelf
 *   (game/pin-jar.js; a caption line once there is one); sound = the game's sound player, for the leak's plink
 *   (left out = no plink)
 * @returns {{node: HTMLElement, dispose: () => void}} the screen
 */
export function createStudioScreen({
  t, tier = 0, layers = [], outfit = 'everyday', masters = [], hang = null, pins = 0, onDiploma, onContinue, onBack, reducedMotion = false,
  sound = null,
}) {
  const shell = screenShell('studio', { label: t('ui.studio.title'), reducedMotion });
  const head = header(t, t('ui.studio.title'), onBack, shell.signal);
  const caps = studioCaptions(tier, layers);
  const kindName = (type) => t(`ui.guide.${type}.name`); // a bump kind's name, for the lines and the frame buttons
  let dropping = Boolean(hang) && !reducedMotion; // the new frame is still on its way to the wall

  const body = el('div', 'app-studio');
  const stage = el('div', 'app-studio__stage');
  const canvas = el('canvas', 'app-studio__room');
  canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-label', `${t('ui.studio.picture')} ${t(caps.tierKey)}`);
  const fx = el('canvas', 'app-studio__fx'); // the moving parts: the spa's sparkles and the drip (B33d, B97(2))
  fx.setAttribute('aria-hidden', 'true');
  const her = svg('svg', { class: 'app-studio__her', 'aria-hidden': 'true' });
  const wall = el('div', 'app-studio__wall'); // the frame buttons and the frame that is dropping in
  stage.append(canvas, fx, her, wall);
  const capState = studioCapStart(outfit, OUTFITS);
  let capOn = capState.capOn;
  // The cap toggle (scrubs only): a see-through button over her, so it works by tap, mouse and keyboard.
  const tap = capState.toggle ? el('button', 'app-studio__tap') : null;
  if (tap) {
    tap.type = 'button';
    stage.append(tap);
  }

  const notes = el('div', 'app-studio__notes');
  if (hang) {
    notes.append(el('p', 'app-studio__hung', t('ui.studio.hung', { kind: kindName(hang) })));
    notes.append(button('app-btn app-btn--main app-studio__go', t('ui.studio.continue'), () => (onContinue ?? onBack)?.(), shell.signal));
  }
  notes.append(el('p', 'app-studio__fame', t('ui.studio.fame', { n: masters.length, total: BUMP_IDS.length })));
  notes.append(el('p', 'app-studio__hint', t(masters.length ? 'ui.studio.fameHint' : 'ui.studio.fameEmpty')));
  notes.append(el('p', 'app-studio__tier', t(caps.tierKey)));
  if (tap) notes.append(el('p', 'app-studio__hint', t('ui.studio.capHint')));
  if (pins > 0) notes.append(el('p', 'app-studio__tier', t('ui.studio.pinJar', { n: pins }))); // the pin jar on the shelf
  if (caps.emptyKey) notes.append(el('p', 'app-studio__empty', t(caps.emptyKey)));
  else {
    const list = el('ul', 'app-studio__list');
    for (const key of caps.layerKeys) {
      const li = el('li', 'app-studio__item');
      li.append(icon('check'), el('span', '', t(key)));
      list.append(li);
    }
    notes.append(list);
  }
  body.append(stage, notes);
  shell.node.append(head, body);

  let size = '';
  let frame = 0;
  let geo = null; // the picture's size and her place, from the last paint
  let flight = 0; // the cap flight's animation frame (0 = none)

  /** Paint the room and place her for the stage's current size (skipped while the size is unchanged). @returns {void} */
  function paint() {
    frame = 0;
    const w = stage.clientWidth;
    const h = stage.clientHeight;
    if (w < 2 || h < 2 || `${w}x${h}` === size) return;
    size = `${w}x${h}`;
    const dpr = Math.min(2, globalThis.devicePixelRatio || 1);
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    drawStudio(ctx, w, h, tier, layers, { view: true, masters: dropping ? masters.filter((m) => m !== hang) : masters, pins, moving: true });
    fx.width = canvas.width;
    fx.height = canvas.height;
    const spots = layerSpots(w, h, true);
    geo = { w, h, dpr, hero: spots.hero, chair: spots.chair };
    her.setAttribute('viewBox', `0 0 ${w} ${h}`);
    stopFlight();
    drawHer();
    placeFrames(w, h, dpr);
    drawMotion();
  }

  const leaks = roomLeaks(backdropKind('studio', tier), layers); // the drip shows (and plinks) until "Fix the leak"
  const opened = performance.now(); // the moving parts' clock starts when the screen opens
  let motionTimer = 0; // the wait before the next moving-parts frame (0 = none)
  let motionFrame = 0; // the animation frame asked for after that wait (0 = none)
  let lastTime = null; // the moving parts' time at the last frame, to hear each drop land once

  /** Stop the moving parts' next frame (the screen closes, or a frame is drawn now). @returns {void} */
  function stopMotion() {
    clearTimeout(motionTimer);
    if (motionFrame) cancelAnimationFrame(motionFrame);
    motionTimer = 0;
    motionFrame = 0;
  }

  /**
   * Draw the moving parts for this moment on their own layer (the sparkles, the drop), plink when a drop landed since
   * the last frame, and plan the next frame: only while something moves; with reduced motion only the plinks go on.
   * @returns {void}
   */
  function drawMotion() {
    stopMotion();
    if (!geo || shell.signal.aborted) return;
    const time = (performance.now() - opened) / 1000;
    const fc = fx.getContext('2d');
    fc.setTransform(1, 0, 0, 1, 0, 0);
    fc.clearRect(0, 0, fx.width, fx.height);
    fc.setTransform(geo.dpr, 0, 0, geo.dpr, 0, 0);
    drawStudioMotion(fc, geo.w, geo.h, tier, layers, time, reducedMotion);
    // the plink follows the sound switch (the sound player), never while the page is hidden
    if (leaks && sound && !globalThis.document?.hidden && dripLands(lastTime ?? time, time)) sound.play('drip');
    lastTime = time;
    const plinks = leaks && sound && reducedMotion ? nextDripLanding(time) + 0.01 : Infinity;
    const next = Math.min(nextStudioChange(time, tier, layers, reducedMotion), plinks);
    if (Number.isFinite(next)) motionTimer = setTimeout(() => { motionTimer = 0; motionFrame = requestAnimationFrame(drawMotion); }, next * 1000);
  }

  /**
   * Put a button over each framed diploma (it opens that diploma), and in hang mode the new frame dropping onto its
   * nail; when it lands, the room is painted again with that frame in it.
   * @param {number} w picture width @param {number} h picture height @param {number} dpr pixel ratio
   * @returns {void}
   */
  function placeFrames(w, h, dpr) {
    wall.replaceChildren();
    const spots = fameSpots(w, h).filter((q) => masters.includes(q.type));
    for (const p of spots) {
      if (!masters.includes(p.type)) continue;
      // the tap area is never wider than the gap to the nearest framed neighbour in its row, so two never overlap
      const gap = spots.reduce((m, q) => (q !== p && Math.abs(q.y - p.y) < 1 ? Math.min(m, Math.abs(q.x - p.x)) : m), Infinity);
      const bw = Math.min(Math.max(40, p.s * 1.3), gap);
      const bh = Math.max(44, p.s * 1.6);
      if (onDiploma) {
        const b = button('app-studio__frame', '', () => onDiploma(p.type), shell.signal);
        b.setAttribute('aria-label', t('ui.studio.frame', { kind: kindName(p.type) }));
        Object.assign(b.style, { left: `${p.x - bw / 2}px`, top: `${p.y + p.s * 0.85 - bh / 2}px`, width: `${bw}px`, height: `${bh}px` });
        wall.append(b);
      }
      if (dropping && p.type === hang) {
        const cw = p.s * 1.5;
        const ch = p.s * 1.8;
        const drop = el('canvas', 'app-studio__drop');
        drop.width = Math.round(cw * dpr);
        drop.height = Math.round(ch * dpr);
        drop.setAttribute('aria-hidden', 'true');
        Object.assign(drop.style, { left: `${p.x - cw / 2}px`, top: `${p.y - p.s * 0.15}px`, width: `${cw}px`, height: `${ch}px` });
        const dc = drop.getContext('2d');
        dc.setTransform(dpr, 0, 0, dpr, 0, 0);
        fameFrame(dc, { ...p, x: cw / 2, y: p.s * 0.15 }, true);
        drop.addEventListener('animationend', () => { dropping = false; size = ''; paint(); }, { once: true, signal: shell.signal });
        wall.append(drop);
      }
    }
  }

  /** Her layer for the studio view (standing, hands on hips, cap on or off). @returns {object} the comic-art layer */
  function herLayer() {
    const hero = geo.hero;
    return { x: hero.x, y: hero.floor, scale: hero.h / FIGURE_HEIGHT, pose: 'hips', expr: 'happy', outfit, look: -1, cap: capOn };
  }

  /** Where the cap sits on her head, in picture pixels. @returns {{x: number, y: number, scale: number, rot: number}} */
  function capOnHead() {
    const spot = headSpot('heroine', herLayer());
    return { x: spot.x, y: spot.y, scale: spot.scale, rot: spot.tilt };
  }

  /** Where the cap rests on the chair seat when it is off, in picture pixels. @returns {{x: number, y: number, scale: number, rot: number}} */
  function capOnChair() {
    const chair = geo.chair;
    const scale = headSpot('heroine', herLayer()).scale * 0.75;
    return { x: chair.x + chair.wide * 0.06, y: chair.seat + 20 * scale, scale, rot: -12 };
  }

  /**
   * One cap drawing at a place (picture pixels).
   * @param {{x: number, y: number, scale: number, rot: number}} p the place
   * @returns {SVGElement} the cap group
   */
  function capAt(p) {
    const g = svg('g', { transform: capTransform(p) });
    g.append(drawScrubCap());
    return g;
  }

  /** The SVG transform that puts the cap at a place. @param {{x: number, y: number, scale: number, rot: number}} p @returns {string} */
  function capTransform(p) {
    return `translate(${p.x} ${p.y}) rotate(${p.rot}) scale(${p.scale})`;
  }

  /**
   * Draw her (and the cap on the chair when it is off) for the current state.
   * @param {{x: number, y: number, scale: number, rot: number}|null} [flying] the cap mid-flight (then it is drawn
   *   there instead of on her head or the chair)
   * @param {number} [hop] her hop 0..1
   * @returns {SVGElement|null} the flying cap's group, to move it frame by frame
   */
  function drawHer(flying = null, hop = 0) {
    if (!geo) return null;
    const hero = geo.hero;
    const shadow = svg('ellipse', { cx: hero.x, cy: hero.floor, rx: hero.h * 0.17, ry: hero.h * 0.025, fill: 'rgba(40,20,30,0.22)' });
    const figure = svg('g', { class: 'app-studio__figure', transform: `translate(0 ${-hop * hero.h * 0.05})` });
    figure.append(drawCharacter('heroine', { ...herLayer(), cap: flying ? false : capOn }).node);
    const parts = [shadow, figure];
    let capNode = null;
    if (flying) parts.push(capNode = capAt(flying));
    else if (tap && !capOn) parts.push(capAt(capOnChair()));
    her.replaceChildren(...parts);
    if (tap) {
      // The button covers her from the floor to the top of her bun.
      Object.assign(tap.style, {
        left: `${((hero.x - hero.h * 0.22) / geo.w) * 100}%`, top: `${((hero.floor - hero.h * 1.02) / geo.h) * 100}%`,
        width: `${((hero.h * 0.44) / geo.w) * 100}%`, height: `${((hero.h * 1.04) / geo.h) * 100}%`,
      });
      tap.setAttribute('aria-label', t(capOn ? 'ui.studio.capOff' : 'ui.studio.capOn'));
    }
    return capNode;
  }

  /** Stop a cap flight that is under way (the state is already the new one). @returns {void} */
  function stopFlight() {
    if (flight) cancelAnimationFrame(flight);
    flight = 0;
  }

  /** Take the cap off, or put it back on: a little hop and the cap floats to the chair or back (instant with reduced motion). @returns {void} */
  function toggleCap() {
    if (!geo) return;
    stopFlight();
    const from = capOn ? capOnHead() : capOnChair();
    capOn = !capOn;
    const to = capOn ? capOnHead() : capOnChair();
    if (reducedMotion || typeof requestAnimationFrame !== 'function') {
      drawHer();
      return;
    }
    const lift = geo.hero.h * 0.22;
    const start = performance.now();
    const node = drawHer(capFlight(0, from, to, lift), 0);
    const figure = her.querySelector('.app-studio__figure');
    /** Move the cap (and her hop) one frame on; draw the final state when the flight is over. @param {number} now @returns {void} */
    const step = (now) => {
      const k = (now - start) / CAP_FLIGHT_MS;
      if (k >= 1) {
        flight = 0;
        drawHer();
        return;
      }
      const p = capFlight(k, from, to, lift);
      node.setAttribute('transform', capTransform(p));
      figure.setAttribute('transform', `translate(0 ${-p.hop * geo.hero.h * 0.05})`);
      flight = requestAnimationFrame(step);
    };
    flight = requestAnimationFrame(step);
  }
  tap?.addEventListener('click', toggleCap, { signal: shell.signal });

  /** Paint on the next frame (several size changes in a row paint once). @returns {void} */
  function schedule() {
    if (!frame) frame = requestAnimationFrame(paint);
  }

  const watch = typeof ResizeObserver === 'function' ? new ResizeObserver(schedule) : null;
  watch?.observe(stage);
  if (!watch) globalThis.addEventListener('resize', schedule, { signal: shell.signal });
  schedule();

  return {
    node: shell.node,
    /** Stop watching the size and the moving parts, and take the screen away. @returns {void} */
    dispose() {
      watch?.disconnect();
      if (frame) cancelAnimationFrame(frame);
      stopFlight();
      stopMotion();
      shell.dispose();
    },
  };
}
