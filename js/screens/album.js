// The Face album screen (T8.2, SPEC D24b): every face she has cleared in her studio, drawn clean and glowing from its
// saved recipe (screens/reveal.js faceCanvas, the real face drawing code), with its best stars under it. The named
// regulars come first in the order she meets them; the ones she has not met yet are locked "?" silhouettes. Then the
// walk-ins (strangers), the most recent first. Tapping a face opens it larger with its name, best stars and visits.
// The list scrolls with the shop's "more below" arrow. Back and the Escape key close it (Escape closes the big face
// first). The rules (what shows, the counts) are in album-logic.js; the game passes the saved album in.
// All text comes from the string table.

import { el, svg, icon, header, button, starIcon, screenShell } from './dom.js';
import { canScrollMore, starStates } from './screen-logic.js';
import { albumView, albumLook, entryNameKey } from './album-logic.js';
import { faceCanvas } from './reveal.js';

/** The size of a face tile's picture and of the big face, in CSS px (4:5, like the reveal). */
const THUMB = { w: 96, h: 120 };
const BIG = { w: 224, h: 280 };
/** How many tile pictures are drawn per animation frame (so a full album never freezes the screen). */
const PER_FRAME = 3;

/**
 * A row of small stars (filled up to the count).
 * @param {number} stars 0 to 3
 * @param {number} size star size in px
 * @param {string} label what screen readers say
 * @returns {HTMLElement} the row
 */
function starRow(stars, size, label) {
  const row = el('span', 'app-album__stars');
  row.setAttribute('role', 'img');
  row.setAttribute('aria-label', label);
  for (const on of starStates(stars)) row.append(starIcon(on, size));
  return row;
}

/**
 * The grey head-and-shoulders silhouette of a regular she has not met yet.
 * @returns {SVGElement} the picture
 */
function silhouette() {
  return svg('svg', { viewBox: '0 0 96 120', 'aria-hidden': 'true', class: 'app-albumtile__shadow' }, [
    svg('path', { d: 'M8 120c2-22 18-32 40-32s38 10 40 32z', fill: '#c9b4a8' }),
    svg('ellipse', { cx: 48, cy: 52, rx: 26, ry: 32, fill: '#c9b4a8' }),
  ]);
}

/**
 * Build the Face album screen.
 * @param {{t: (key: string, vars?: object) => string, faces?: object[], onBack?: () => void, reducedMotion?: boolean}} opts
 *   t = string function; faces = the saved album (save.albumFaces); onBack = Back (or Escape) was pressed
 * @returns {{node: HTMLElement, dispose: () => void}} the screen
 */
export function createAlbumScreen({ t, faces = [], onBack, reducedMotion = false }) {
  const shell = screenShell('album', { label: t('ui.album.title'), reducedMotion });
  const view = albumView(faces);
  const head = header(t, t('ui.album.title'), onBack, shell.signal);
  const count = el('p', 'app-album__count'); // two short lines, so the title keeps its room
  count.append(el('span', '', t('ui.album.faces', { n: view.faces })), el('span', '', t('ui.album.met', { met: view.met, total: view.total })));
  head.append(count);
  const panel = el('div', 'app-body app-shoplist app-albumlist');
  const frame = el('div', 'app-shoplistframe');
  const more = el('button', 'app-shopmore');
  more.type = 'button';
  more.setAttribute('aria-label', t('ui.shop.moreBelow'));
  more.append(icon('back'));
  frame.append(panel, more);
  const dpr = Math.min(2, globalThis.devicePixelRatio || 1);
  const queue = []; // [holder, entry]: tile pictures still to draw
  let raf = 0;
  let detail = null; // the big face, while it is open

  /** Draw a few waiting tile pictures, then come back next frame for the rest. @returns {void} */
  function drawSome() {
    raf = 0;
    for (let i = 0; i < PER_FRAME && queue.length; i += 1) {
      const [holder, entry] = queue.shift();
      const pic = faceCanvas(albumLook(entry), THUMB.w, THUMB.h, dpr);
      pic.className = 'app-albumtile__pic';
      holder.append(pic);
    }
    if (queue.length) raf = requestAnimationFrame(drawSome);
  }

  /**
   * One face tile: a button with the clean face, the name and the best stars.
   * @param {object} entry the album entry
   * @returns {HTMLElement} the tile
   */
  function faceTile(entry) {
    const name = t(entryNameKey(entry));
    const tile = button('app-albumtile', '', () => openDetail(entry, tile), shell.signal);
    tile.setAttribute('aria-label', t('ui.album.tile', { name, n: entry.stars }));
    const holder = el('span', 'app-albumtile__frame');
    holder.setAttribute('aria-hidden', 'true');
    queue.push([holder, entry]);
    const label = el('span', 'app-albumtile__name', name);
    label.setAttribute('aria-hidden', 'true');
    const stars = starRow(entry.stars, 18, '');
    stars.setAttribute('aria-hidden', 'true');
    stars.removeAttribute('role');
    tile.append(holder, label, stars);
    return tile;
  }

  /** A locked tile for a regular she has not met yet. @returns {HTMLElement} the tile */
  function lockedTile() {
    const tile = el('div', 'app-albumtile app-albumtile--locked');
    tile.setAttribute('role', 'img');
    tile.setAttribute('aria-label', t('ui.album.lockedHint'));
    const holder = el('span', 'app-albumtile__frame');
    holder.append(silhouette(), el('span', 'app-albumtile__q', t('ui.album.lockedMark')));
    tile.append(holder, el('span', 'app-albumtile__name', t('ui.album.locked')));
    return tile;
  }

  /**
   * One section: a heading and its grid of tiles.
   * @param {string} titleKey heading string key
   * @param {HTMLElement[]} tiles the tiles
   * @returns {HTMLElement} the section
   */
  function section(titleKey, tiles) {
    const sec = el('section', 'app-album__section');
    const grid = el('div', 'app-albumgrid');
    grid.append(...tiles);
    sec.append(el('h2', 'app-album__heading', t(titleKey)), grid);
    return sec;
  }

  panel.append(section('ui.album.regulars', view.regulars.map((r) => (r.entry ? faceTile(r.entry) : lockedTile()))));
  if (view.strangers.length) panel.append(section('ui.album.strangers', view.strangers.map(faceTile)));
  else panel.append(el('p', 'app-album__empty', t(view.met ? 'ui.album.noStrangers' : 'ui.album.empty')));

  /**
   * Show one face large over the album (a small dialog): the clean face with sparkles, the name, the best stars and
   * the visits, and a Close button. Escape or Close puts focus back on the tile.
   * @param {object} entry the album entry
   * @param {HTMLElement} from the tile that opened it
   * @returns {void}
   */
  function openDetail(entry, from) {
    closeDetail(false);
    const name = t(entryNameKey(entry));
    const box = el('div', 'app-albumdetail');
    box.setAttribute('role', 'dialog');
    box.setAttribute('aria-modal', 'true');
    box.setAttribute('aria-label', name);
    const card = el('div', 'app-card app-albumdetail__card');
    const pic = faceCanvas(albumLook(entry, true), BIG.w, BIG.h, dpr);
    pic.className = 'app-albumdetail__pic';
    pic.setAttribute('role', 'img');
    pic.setAttribute('aria-label', t('ui.album.picture', { name }));
    const close = button('app-btn app-btn--main', t('ui.album.close'), () => closeDetail(true), shell.signal);
    card.append(
      pic, el('h2', 'app-albumdetail__name', name), starRow(entry.stars, 40, t('ui.album.best', { n: entry.stars })),
      el('p', 'app-albumdetail__visits', t('ui.album.visits', { n: entry.times })), close,
    );
    box.append(card);
    box.addEventListener('click', (e) => { if (e.target === box) closeDetail(true); }, { signal: shell.signal });
    frame.inert = true;
    head.inert = true;
    shell.node.append(box);
    detail = { box, from };
    close.focus({ preventScroll: true });
  }

  /**
   * Close the big face, if it is open.
   * @param {boolean} refocus true = put keyboard focus back on the tile it came from
   * @returns {void}
   */
  function closeDetail(refocus) {
    if (!detail) return;
    const { box, from } = detail;
    detail = null;
    box.remove();
    frame.inert = false;
    head.inert = false;
    if (refocus) from?.focus({ preventScroll: true });
  }

  /** Show the "more below" arrow only while the list can scroll further down. @returns {void} */
  function updateMore() {
    more.hidden = !canScrollMore(panel.scrollTop, panel.clientHeight, panel.scrollHeight);
  }
  more.addEventListener('click', () => panel.scrollBy({ top: Math.max(120, panel.clientHeight * 0.8), behavior: reducedMotion ? 'auto' : 'smooth' }), { signal: shell.signal });
  panel.addEventListener('scroll', updateMore, { passive: true, signal: shell.signal });
  window.addEventListener('resize', updateMore, { signal: shell.signal });
  shell.node.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    e.preventDefault();
    if (detail) closeDetail(true); else onBack?.();
  }, { signal: shell.signal });
  const watcher = typeof ResizeObserver === 'function' ? new ResizeObserver(updateMore) : null;
  watcher?.observe(panel);
  more.hidden = true;
  requestAnimationFrame(updateMore);
  raf = requestAnimationFrame(drawSome);

  shell.node.append(head, frame);
  return {
    node: shell.node,
    /** Stop drawing and watching, and remove the screen. @returns {void} */
    dispose() { cancelAnimationFrame(raf); watcher?.disconnect(); shell.dispose(); },
  };
}
