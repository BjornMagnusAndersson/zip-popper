// PLACEHOLDER scrub job (T3.1c). T5.1b replaces this with the real wipe-and-scrub mini-game.
// After a studio upgrade is bought it needs a clean spot (SPEC D12-1, D16: the job is required): the player rubs a
// dirty patch clean by dragging a finger (or the mouse) over it. Keyboard and switch players press Space (or Enter)
// again and again: each press scrubs away one more strip. When the patch is clean enough the grime vanishes, a
// "Sparkling clean" line shows and Continue reports the job done (onDone). No animation at all, so reduced motion
// needs nothing extra. The cartoon grime is plain grey-brown smudges, nothing gross.

import { el, button, screenShell } from './dom.js';
import { scrubGrid, wipeCells, scrubShare, SCRUB_DONE, SCRUB_KEY_STEP } from './screen-logic.js';

const W = 480; // drawing size of the patch (CSS scales it to fit)
const H = 300;
const BRUSH = 34; // brush radius in drawing pixels

/**
 * Paint the clean spot under the grime: cream tiles with ink grout and a little sparkle.
 * @param {CanvasRenderingContext2D} ctx the base canvas
 * @returns {void}
 */
function paintClean(ctx) {
  ctx.fillStyle = '#fff3e6';
  ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = 'rgba(42, 33, 29, 0.35)';
  ctx.lineWidth = 3;
  for (let x = 0; x <= W; x += 60) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
  for (let y = 0; y <= H; y += 60) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.ellipse(120, 80, 34, 12, -0.6, 0, Math.PI * 2);
  ctx.fill();
}

/**
 * Paint the grime layer: a grey-brown film with darker cartoon smudges (the same picture every time).
 * @param {CanvasRenderingContext2D} ctx the grime canvas
 * @returns {void}
 */
function paintGrime(ctx) {
  ctx.globalCompositeOperation = 'source-over';
  ctx.fillStyle = '#8f8068';
  ctx.fillRect(0, 0, W, H);
  let s = 7;
  /** A steady pseudo-random number 0..1 (same smudges every time). @returns {number} the number */
  const rnd = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
  for (let i = 0; i < 26; i += 1) {
    ctx.fillStyle = i % 3 === 0 ? 'rgba(92, 78, 60, 0.75)' : 'rgba(120, 108, 84, 0.7)';
    ctx.beginPath();
    ctx.ellipse(rnd() * W, rnd() * H, 18 + rnd() * 40, 10 + rnd() * 26, rnd() * Math.PI, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.strokeStyle = 'rgba(70, 60, 46, 0.6)';
  ctx.lineWidth = 5;
  ctx.lineCap = 'round';
  for (let i = 0; i < 6; i += 1) { // a few cobweb-ish streaks
    const x = rnd() * W;
    const y = rnd() * H;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.quadraticCurveTo(x + 30, y + 20, x + 70 * rnd(), y + 50);
    ctx.stroke();
  }
}

/**
 * Build the scrub job screen.
 * @param {{t: (key: string, vars?: object) => string, itemNameKey: string, onDone?: () => void, reducedMotion?: boolean}} opts
 *   t = string function; itemNameKey = the bought item's name key; onDone = the patch is clean and Continue was tapped
 * @returns {{node: HTMLElement, dispose: () => void}} the screen
 */
export function createScrubScreen({ t, itemNameKey, onDone, reducedMotion = false }) {
  const shell = screenShell('scrub', { label: t('ui.scrub.title'), reducedMotion });
  const body = el('div', 'app-body app-scrub');
  const card = el('div', 'app-card app-scrub__card');
  card.append(
    el('h1', 'app-scrub__title', t('ui.scrub.title')),
    el('p', 'app-scrub__text', t('ui.scrub.text', { item: t(itemNameKey) })),
  );
  const frame = el('div', 'app-scrub__frame');
  const base = el('canvas', 'app-scrub__base');
  const grime = el('canvas', 'app-scrub__grime');
  for (const c of [base, grime]) { c.width = W; c.height = H; }
  base.setAttribute('aria-hidden', 'true');
  grime.tabIndex = 0;
  grime.setAttribute('role', 'button');
  grime.setAttribute('aria-label', t('ui.scrub.area'));
  frame.append(base, grime);
  paintClean(base.getContext('2d'));
  const gtx = grime.getContext('2d');
  paintGrime(gtx);
  const meter = el('p', 'app-scrub__meter');
  meter.setAttribute('aria-live', 'polite');
  const keys = el('p', 'app-scrub__keys', t('ui.scrub.keys'));
  const done = el('p', 'app-scrub__done', t('ui.scrub.done'));
  done.hidden = true;
  const go = button('app-btn app-btn--main app-btn--big', t('ui.scrub.continue'), () => onDone?.(), shell.signal);
  go.hidden = true;
  body.append(card, frame, meter, keys, done, go);
  shell.node.append(body);

  let grid = scrubGrid();
  let finished = false;
  let last = null; // the last brush point while dragging (drawing px)

  /** Show the clean share, and finish when it is clean enough. @returns {void} */
  function update() {
    const share = scrubShare(grid);
    meter.textContent = t('ui.scrub.progress', { n: Math.round(share * 100) });
    if (finished || share < SCRUB_DONE) return;
    finished = true;
    gtx.clearRect(0, 0, W, H); // the last specks go too
    done.hidden = false;
    go.hidden = false;
    keys.hidden = true;
    go.focus({ preventScroll: true });
  }

  /**
   * Rub at a point: erase the grime in a round brush and count the cells under it as clean.
   * @param {number} x drawing px
   * @param {number} y drawing px
   * @returns {void}
   */
  function rubAt(x, y) {
    gtx.globalCompositeOperation = 'destination-out';
    gtx.beginPath();
    gtx.arc(x, y, BRUSH, 0, Math.PI * 2);
    gtx.fill();
    grid = wipeCells(grid, x / W, y / H, BRUSH / W, BRUSH / H);
  }

  /** Where a pointer is on the patch, in drawing px. @param {PointerEvent} e the pointer @returns {{x: number, y: number}} the point */
  function toPatch(e) {
    const r = grime.getBoundingClientRect();
    return { x: ((e.clientX - r.left) / Math.max(1, r.width)) * W, y: ((e.clientY - r.top) / Math.max(1, r.height)) * H };
  }

  /** Rub along a drag from the last point to this one (in small steps so a fast swipe leaves no gaps). @param {PointerEvent} e the pointer @returns {void} */
  function drag(e) {
    if (finished || last === null) return;
    const p = toPatch(e);
    const steps = Math.max(1, Math.ceil(Math.hypot(p.x - last.x, p.y - last.y) / (BRUSH / 2)));
    for (let i = 1; i <= steps; i += 1) rubAt(last.x + ((p.x - last.x) * i) / steps, last.y + ((p.y - last.y) * i) / steps);
    last = p;
    update();
  }

  const opts = { signal: shell.signal };
  grime.addEventListener('pointerdown', (e) => {
    if (finished) return;
    grime.setPointerCapture?.(e.pointerId);
    last = toPatch(e);
    rubAt(last.x, last.y);
    update();
  }, opts);
  grime.addEventListener('pointermove', drag, opts);
  for (const type of ['pointerup', 'pointercancel', 'pointerleave']) grime.addEventListener(type, () => { last = null; }, opts);
  grime.addEventListener('keydown', (e) => {
    if (finished || (e.key !== ' ' && e.key !== 'Enter')) return;
    e.preventDefault();
    // Each press scrubs the next dirty cells in reading order (SCRUB_KEY_STEP of the patch at most).
    const dirty = grid.cells.map((c, i) => (c ? -1 : i)).filter((i) => i >= 0).slice(0, Math.ceil(grid.cells.length * SCRUB_KEY_STEP));
    for (const i of dirty) {
      const cx = ((i % grid.cols) + 0.5) / grid.cols;
      const cy = (Math.floor(i / grid.cols) + 0.5) / grid.rows;
      rubAt(cx * W, cy * H);
    }
    update();
  }, opts);
  update();
  requestAnimationFrame(() => grime.focus({ preventScroll: true }));
  return { node: shell.node, dispose: shell.dispose };
}
