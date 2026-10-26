// The studio view (T5.1c): her whole studio, full size, no customer in front. The room is the same drawing as the pop
// scene's backdrop (pop/backdrop.js drawStudio, in its 'view' places), with every studio upgrade she has bought and
// scrubbed; she stands in it (game/comic-art.js heroine, in her best outfit) next to her chair. Under the picture (beside
// it when the phone is held sideways): a short line about the tier and one caption per upgrade. A Back button.
// The picture is painted again when the screen changes size (turning the phone). Nothing moves (reduced motion is
// already met: the studio view's light is steady).

import { el, svg, icon, header, screenShell } from './dom.js';
import { drawStudio, layerSpots } from '../pop/backdrop.js';
import { drawCharacter } from '../game/comic-art.js';
import { studioCaptions } from '../game/studio.js';

const FIGURE_HEIGHT = 640; // comic-art.js: a standing figure at scale 1 is about this tall, floor to the top of the bun

/**
 * Build the studio view screen.
 * @param {{t: (key: string, vars?: object) => string, tier?: number, layers?: string[], outfit?: string,
 *   onBack?: () => void, reducedMotion?: boolean}} opts
 *   t = string function; tier = studio tier 0..2; layers = owned studio upgrades (draw order); outfit = what she wears
 *   (comic-art.js OUTFITS name); onBack = Back
 * @returns {{node: HTMLElement, dispose: () => void}} the screen
 */
export function createStudioScreen({ t, tier = 0, layers = [], outfit = 'everyday', onBack, reducedMotion = false }) {
  const shell = screenShell('studio', { label: t('ui.studio.title'), reducedMotion });
  const head = header(t, t('ui.studio.title'), onBack, shell.signal);
  const caps = studioCaptions(tier, layers);

  const body = el('div', 'app-studio');
  const stage = el('div', 'app-studio__stage');
  stage.setAttribute('role', 'img');
  stage.setAttribute('aria-label', `${t('ui.studio.picture')} ${t(caps.tierKey)}`);
  const canvas = el('canvas', 'app-studio__room');
  const her = svg('svg', { class: 'app-studio__her', 'aria-hidden': 'true' });
  stage.append(canvas, her);

  const notes = el('div', 'app-studio__notes');
  notes.append(el('p', 'app-studio__tier', t(caps.tierKey)));
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
    drawStudio(ctx, w, h, tier, layers, { view: true });
    const hero = layerSpots(w, h, true).hero;
    her.setAttribute('viewBox', `0 0 ${w} ${h}`);
    const shadow = svg('ellipse', { cx: hero.x, cy: hero.floor, rx: hero.h * 0.17, ry: hero.h * 0.025, fill: 'rgba(40,20,30,0.22)' });
    const figure = drawCharacter('heroine', {
      x: hero.x, y: hero.floor, scale: hero.h / FIGURE_HEIGHT, pose: 'hips', expr: 'happy', outfit, look: -1,
    }).node;
    her.replaceChildren(shadow, figure);
  }

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
    /** Stop watching the size and take the screen away. @returns {void} */
    dispose() {
      watch?.disconnect();
      if (frame) cancelAnimationFrame(frame);
      shell.dispose();
    },
  };
}
