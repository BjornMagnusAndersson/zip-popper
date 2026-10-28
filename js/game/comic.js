// The comic player: shows a strip (plain data, see docs/COMIC-FORMAT.md) panel by panel over the whole screen.
// The art is SVG; every speech bubble and caption is live text from the string table laid over it (never baked in),
// with the player's name filled in for {name}. Tap, Enter or Space shows the next bubble or panel, Esc or the Skip
// button jumps to the end, and the end card offers Replay. Reduced motion: no camera moves, bubbles appear at once.
// Needs css/comic.css. The thinking part (steps, pages, camera maths, checks) is in comic-logic.js.
import { t } from '../core/strings.js';
import {
  LAYOUTS, startReading, advance, skip, paginate, fitPage, cameraPath, camPoint, clampBox, avoidBoxes, tailPath, fillName,
  bubblesOutside,
} from './comic-logic.js';

const NS = 'http://www.w3.org/2000/svg';
export const INK = '#2a211d'; // the game's outline colour (face.js)
const PAPER = '#fffdf6';
const CAPTION = '#ffe08a';
let uid = 0;

/**
 * Make an SVG element with attributes (null or undefined attributes are left out).
 * @param {string} tag element name
 * @param {Record<string, string|number|null|undefined>} [attrs] attributes
 * @param {SVGElement[]} [kids] children to add
 * @returns {SVGElement} the element
 */
export function svgEl(tag, attrs = {}, kids = []) {
  const el = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) if (v !== null && v !== undefined) el.setAttribute(k, String(v));
  for (const kid of kids) if (kid) el.appendChild(kid);
  return el;
}

/**
 * Make an HTML element with a class and optional plain text.
 * @param {string} tag element name
 * @param {string} cls class names
 * @param {string} [text] text (always set as plain text, never HTML)
 * @returns {HTMLElement} the element
 */
function htmlEl(tag, cls, text) {
  const el = document.createElement(tag);
  el.className = cls;
  if (text !== undefined) el.textContent = text;
  return el;
}

/** Whether the phone asks for less motion. @returns {boolean} true when reduced motion is on */
function prefersStill() {
  try { return Boolean(globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches); } catch { return false; }
}

/**
 * Draw one plain-shape layer (rect, circle, ellipse, path) for placeholder art and simple scenery.
 * @param {object} l the layer: shape plus x, y, w, h, r, rx, ry, d, fill, stroke, sw (stroke width), opacity, rotate
 * @returns {SVGElement} the shape
 */
function drawShape(l) {
  const common = {
    fill: l.fill ?? 'none', stroke: l.stroke === true ? INK : l.stroke, 'stroke-width': l.stroke ? (l.sw ?? 10) : null,
    'stroke-linejoin': 'round', 'stroke-linecap': 'round', opacity: l.opacity,
    transform: l.rotate ? `rotate(${l.rotate} ${l.x ?? 0} ${l.y ?? 0})` : null,
  };
  if (l.shape === 'rect') return svgEl('rect', { ...common, x: l.x, y: l.y, width: l.w, height: l.h, rx: l.rx });
  if (l.shape === 'circle') return svgEl('circle', { ...common, cx: l.x, cy: l.y, r: l.r });
  if (l.shape === 'ellipse') return svgEl('ellipse', { ...common, cx: l.x, cy: l.y, rx: l.rx, ry: l.ry });
  return svgEl('path', { ...common, d: l.d });
}

/**
 * Draw a panel's background: one colour, or a list of colours as a top-to-bottom gradient.
 * @param {string|string[]|undefined} bg the background
 * @param {{w: number, h: number}} L the panel size
 * @returns {SVGElement} a group with the background
 */
function drawBackground(bg, L) {
  const g = svgEl('g');
  if (Array.isArray(bg)) {
    const id = `cbg${uid += 1}`;
    const stops = bg.map((c, i) => svgEl('stop', { offset: bg.length > 1 ? i / (bg.length - 1) : 0, 'stop-color': c }));
    g.appendChild(svgEl('defs', {}, [svgEl('linearGradient', { id, x1: 0, y1: 0, x2: 0, y2: 1 }, stops)]));
    g.appendChild(svgEl('rect', { width: L.w, height: L.h, fill: `url(#${id})` }));
  } else {
    g.appendChild(svgEl('rect', { width: L.w, height: L.h, fill: bg ?? PAPER }));
  }
  return g;
}

/**
 * The CSS transform for a camera state (zoom s with the point f kept in place).
 * @param {{s: number, f: number[]}} c camera state
 * @returns {string} transform text
 */
function camCss(c) {
  return `translate(${(c.f[0] * (1 - c.s)).toFixed(2)}px, ${(c.f[1] * (1 - c.s)).toFixed(2)}px) scale(${c.s})`;
}

/**
 * Points round a box on a rounded-square curve that hugs it (used for shout spikes and thought-cloud puffs).
 * @param {{x: number, y: number, w: number, h: number}} b the box
 * @param {number} n how many points
 * @param {number} grow how far out (1 = on the curve)
 * @returns {number[][]} points [x, y]
 */
function hugPoints(b, n, grow) {
  const cx = b.x + b.w / 2;
  const cy = b.y + b.h / 2;
  return Array.from({ length: n }, (_, i) => {
    const a = (i / n) * Math.PI * 2 + 0.2;
    const c = Math.cos(a);
    const s = Math.sin(a);
    return [cx + Math.sign(c) * Math.abs(c) ** 0.45 * (b.w / 2) * grow, cy + Math.sign(s) * Math.abs(s) ** 0.45 * (b.h / 2) * grow];
  });
}

/**
 * The shapes of one bubble (body and tail), drawn twice by the caller: once thick in ink, once in white on top, so
 * the body and tail share one clean outline.
 * @param {string} kind say, shout, think, whisper or caption
 * @param {{x: number, y: number, w: number, h: number}} b the bubble box in drawing units
 * @param {number[]|null} target the speaker's mouth (drawing units), or null for no tail
 * @param {number} em the font size in drawing units
 * @returns {{tag: string, attrs: object}[]} shapes to draw
 */
function bubbleShapes(kind, b, target, em) {
  const out = [];
  if (kind === 'caption') {
    out.push({ tag: 'rect', attrs: { x: b.x, y: b.y, width: b.w, height: b.h, rx: em * 0.25 } });
    return out;
  }
  if (kind === 'shout') {
    const n = Math.max(14, Math.round((b.w + b.h) / (em * 1.3)));
    const pts = hugPoints(b, n * 2, 1).map((p, i) => {
      const k = i % 2 ? 1.02 : 1.2;
      const cx = b.x + b.w / 2;
      const cy = b.y + b.h / 2;
      return [cx + (p[0] - cx) * k, cy + (p[1] - cy) * k];
    });
    out.push({ tag: 'polygon', attrs: { points: pts.map((p) => p.map((v) => v.toFixed(1)).join(',')).join(' ') } });
  } else if (kind === 'think') {
    out.push({ tag: 'rect', attrs: { x: b.x, y: b.y, width: b.w, height: b.h, rx: Math.min(b.h / 2, em * 1.4) } });
    const n = Math.max(8, Math.round((b.w + b.h) / (em * 1.6)));
    for (const p of hugPoints(b, n, 0.98)) out.push({ tag: 'circle', attrs: { cx: p[0], cy: p[1], r: em * 0.85 } });
  } else {
    out.push({ tag: 'rect', attrs: { x: b.x, y: b.y, width: b.w, height: b.h, rx: Math.min(b.h / 2, em * 1.5) } });
  }
  if (!target) return out;
  if (kind === 'think') {
    // A trail of three shrinking puffs towards the thinker.
    const c = [b.x + b.w / 2, b.y + b.h / 2];
    const d = Math.hypot(target[0] - c[0], target[1] - c[1]) || 1;
    const edge = Math.min(b.w, b.h) / 2 + em;
    [0.35, 0.6, 0.82].forEach((f, i) => {
      const k = (edge + (d - edge) * f) / d;
      out.push({ tag: 'circle', attrs: { cx: c[0] + (target[0] - c[0]) * k, cy: c[1] + (target[1] - c[1]) * k, r: em * (0.5 - i * 0.13) } });
    });
    return out;
  }
  const d = tailPath(b, target, kind === 'shout' ? em * 0.7 : em * 0.55);
  if (d) out.push({ tag: 'path', attrs: { d } });
  return out;
}

/**
 * How far a bubble's shape reaches beyond its text box (spikes and cloud puffs need more room).
 * @param {string} kind bubble kind
 * @param {number} em font size (same units as the result)
 * @returns {number} the extra room
 */
function bubblePad(kind, em) {
  return kind === 'shout' ? em * 1.1 : kind === 'think' ? em * 0.9 : em * 0.4;
}

/**
 * Draw one bubble: a soft shadow, a thick ink copy of the body and tail, and the white body and tail on top, so the
 * two share one clean outline.
 * @param {string} kind bubble kind
 * @param {{x: number, y: number, w: number, h: number}} box the text box
 * @param {number[]|null} target where the tail points
 * @param {number} em font size
 * @param {number} u units per CSS pixel (for outline width and shadow offset)
 * @param {number} [stop] how far before the target the tail should end (the speaker's head size), same units as box
 * @returns {SVGElement} the bubble group (hidden until revealed)
 */
function bubbleGroup(kind, box, target, em, u, stop = 0) {
  let aim = target;
  if (target && stop > 0) {
    // Pull the tail's end back towards the bubble, to the edge of the speaker's head (but keep a real tail).
    const cx = box.x + box.w / 2;
    const cy = box.y + box.h / 2;
    const d = Math.hypot(target[0] - cx, target[1] - cy) || 1;
    const room = d - Math.min(box.w, box.h) / 2;
    const back = Math.min(stop, room * 0.55);
    aim = [target[0] - ((target[0] - cx) / d) * back, target[1] - ((target[1] - cy) / d) * back];
  }
  const shapes = bubbleShapes(kind, box, aim, em);
  const g = svgEl('g', { class: 'comic-bub' });
  const shadow = svgEl('g', { fill: 'rgba(42,33,29,0.22)', transform: `translate(${4 * u} ${5 * u})` });
  const outline = svgEl('g', {
    fill: kind === 'whisper' ? 'none' : INK, stroke: INK, 'stroke-width': 6.4 * u, 'stroke-linejoin': 'round',
    'stroke-dasharray': kind === 'whisper' ? `${em * 0.6} ${em * 0.4}` : null,
  });
  const fill = svgEl('g', { fill: kind === 'caption' ? CAPTION : kind === 'whisper' ? '#f3f7ff' : '#fff' });
  for (const s of shapes) {
    shadow.appendChild(svgEl(s.tag, s.attrs));
    outline.appendChild(svgEl(s.tag, s.attrs));
    fill.appendChild(svgEl(s.tag, s.attrs));
  }
  g.append(shadow, outline, fill);
  return g;
}

/**
 * Start the comic player over the page and show the first panel.
 * @param {object} strip the strip data
 * @param {{root?: HTMLElement, name?: string, vars?: Record<string, string|number>, reducedMotion?: boolean,
 *   sound?: {play: (n: string) => unknown}, arts?: Record<string, Function>, onSeen?: (id: string, info: {skipped: boolean}) => void,
 *   onClose?: () => void}} [opts] where to show it, the player's name, more {placeholders} for the texts (for example
 *   {kind} in the mastery strip), motion setting, the sound player, the art kit
 *   (art name -> function(layer) returning {node, mouth}), and callbacks: onSeen when the strip was read or skipped
 *   (save it with markComicSeen), onClose when the player leaves with Continue
 * @returns {{next: () => void, skip: () => void, replay: () => void, close: () => void, readonly state: object}} controls
 */
export function playComic(strip, opts = {}) {
  const root = opts.root ?? document.body;
  const still = opts.reducedMotion ?? prefersStill();
  const name = opts.name || t('comic.defaultName');
  const vars = opts.vars ?? {};
  const arts = opts.arts ?? {};
  let state = startReading(strip);
  let pages = [];
  let pageOf = [];
  let page = -1;
  let views = new Map(); // panel number -> drawn panel
  let resizeTimer = 0;

  const box = htmlEl('div', `comic${still ? ' comic--still' : ''}`);
  box.setAttribute('role', 'dialog');
  box.setAttribute('aria-modal', 'true');
  box.setAttribute('aria-label', t(strip.title));
  box.tabIndex = -1;
  const top = htmlEl('div', 'comic-top');
  const title = htmlEl('p', 'comic-title', t(strip.title));
  const skipBtn = htmlEl('button', 'comic-btn', t('comic.skip'));
  skipBtn.type = 'button';
  top.append(title, skipBtn);
  const stage = htmlEl('div', 'comic-stage');
  const hint = htmlEl('p', 'comic-hint', t('comic.hint'));
  const live = htmlEl('p', 'comic-live');
  live.setAttribute('aria-live', 'polite');
  const end = htmlEl('div', 'comic-end');
  end.hidden = true;
  const endText = htmlEl('p', 'comic-end__text', fillName(t(strip.endTitleKey ?? 'comic.end'), name, vars));
  const replayBtn = htmlEl('button', 'comic-btn', t('comic.replay'));
  const goBtn = htmlEl('button', 'comic-btn comic-btn--main', t('comic.continue'));
  replayBtn.type = 'button';
  goBtn.type = 'button';
  end.append(endText);
  if (strip.endKey) end.append(htmlEl('p', 'comic-end__more', fillName(t(strip.endKey), name, vars))); // a strip's own end line
  end.append(htmlEl('div', 'comic-end__row'));
  end.lastChild.append(replayBtn, goBtn);
  box.append(top, stage, hint, end, live);
  root.appendChild(box);

  /** Play a named sound if a sound player was given. @param {string|undefined} s sound name @returns {void} */
  const play = (s) => { if (s) try { opts.sound?.play(s); } catch { /* sound is optional */ } };

  /** The current screen shape. @returns {'portrait'|'landscape'} orientation */
  const orientation = () => (stage.clientWidth >= stage.clientHeight ? 'landscape' : 'portrait');

  /** Work out the pages for the current screen shape. @returns {void} */
  function repaginate() {
    pages = paginate(strip.panels, orientation());
    pageOf = [];
    pages.forEach((pg, i) => pg.panels.forEach((p) => { pageOf[p] = i; }));
  }

  /**
   * Draw one panel (art, bubbles hidden) into its slot on the page.
   * @param {number} i panel number
   * @param {HTMLElement} slot the empty panel box, already sized
   * @param {{w: number, h: number}} size its size in CSS pixels
   * @param {boolean} animate true = camera move and entry animation, false = shown as it ends
   * @returns {object} the drawn panel
   */
  function drawPanel(i, slot, size, animate) {
    const p = strip.panels[i];
    const L = LAYOUTS[p.layout];
    const scale = size.w / L.w;
    const cam = cameraPath(p.camera, L);
    const art = svgEl('svg', { class: 'comic-art', viewBox: `0 0 ${L.w} ${L.h}`, 'aria-hidden': 'true' });
    const camG = svgEl('g', { class: 'comic-cam' });
    camG.appendChild(drawBackground(p.scene?.bg, L));
    const mouths = {};
    const reaches = {}; // head size per speaker, so tails stop at the head instead of crossing the face
    for (const l of p.scene?.layers ?? []) {
      let node;
      let mouth;
      if (l.art && typeof arts[l.art] === 'function') {
        const r = arts[l.art](l, { svgEl, INK });
        node = r?.node ?? r;
        mouth = r?.mouth;
        if (l.id) reaches[l.id] = r?.reach ?? 0;
      } else {
        node = drawShape(l);
      }
      if (node) camG.appendChild(node);
      if (l.id) mouths[l.id] = l.mouth ?? mouth ?? [l.x ?? L.w / 2, l.y ?? L.h / 2];
    }
    art.appendChild(camG);
    const balloons = svgEl('svg', { class: 'comic-balloons', viewBox: `0 0 ${L.w} ${L.h}`, 'aria-hidden': 'true' });
    slot.classList.add('is-on');
    slot.setAttribute('aria-label', t('comic.panelLabel', { n: i + 1, total: strip.panels.length }));
    const fontPx = Math.round(Math.max(14, Math.min(24, Math.min(size.w, size.h) * 0.055)));
    /** Where a bubble's tail should point (drawing units, after the camera move), or null. @param {object} b bubble @returns {number[]|null} point */
    const aimOf = (b) => {
      const raw = b.kind === 'caption' || b.to === undefined ? null : (typeof b.to === 'string' ? mouths[b.to] : b.to);
      return raw ? camPoint(raw, cam.to) : null;
    };
    /** How far short of the mouth a tail stops (most of the speaker's head size, after the camera zoom). @param {object} b bubble @returns {number} drawing units */
    const stopOf = (b) => (typeof b.to === 'string' ? (reaches[b.to] ?? 0) * 0.8 * cam.to.s : 0);
    /** A text box for a bubble, at its font size and widest width. @param {object} b bubble @param {number} maxW widest (px) @returns {HTMLElement} the box */
    const textBox = (b, maxW) => {
      const div = htmlEl('div', `comic-text comic-text--${b.kind}`, fillName(t(b.key), name, vars));
      div.style.fontSize = `${b.kind === 'caption' ? Math.max(13, fontPx - 2) : fontPx}px`;
      div.style.maxWidth = `${Math.max(120, Math.min(size.w - 24, maxW))}px`;
      return div;
    };
    /** Fix a text box's width at its natural size, so it cannot wrap again when moved. @param {HTMLElement} div box @returns {number} width in px */
    const fixWidth = (div) => {
      const wPx = Math.ceil(div.getBoundingClientRect().width);
      div.style.width = `${wPx}px`;
      return wPx;
    };
    let bubbles;

    if (bubblesOutside(p.layout, orientation())) {
      // Upright phone, wide panel: the art is small, so the bubbles sit above and below it with their tails reaching
      // in, and the faces stay clear. Captions and bubbles in the top half go above, the rest below.
      slot.classList.add('comic-panel--out');
      slot.style.height = 'auto';
      const artBox = htmlEl('div', 'comic-artbox');
      artBox.style.width = `${size.w}px`;
      artBox.style.height = `${size.h}px`;
      artBox.appendChild(art);
      const above = htmlEl('div', 'comic-band');
      const below = htmlEl('div', 'comic-band');
      slot.append(balloons, above, artBox, below);
      bubbles = (p.bubbles ?? []).map((b, j) => {
        const div = textBox(b, b.w ? b.w * scale * 1.6 : size.w * 0.86);
        (b.kind !== 'caption' && b.at[1] > L.h * 0.6 ? below : above).appendChild(div);
        const wPx = fixWidth(div);
        const pad = bubblePad(b.kind, fontPx);
        div.style.marginLeft = `${Math.max(pad + 4, Math.min(size.w - wPx - pad - 4, b.at[0] * scale - wPx / 2))}px`;
        div.style.margin = `${pad + 5}px 0 ${pad + 5}px ${div.style.marginLeft}`;
        return { b, j, div, text: div.textContent };
      });
      // Very rare: so many bubbles that the panel is taller than the screen. Then the art gets smaller.
      const over = slot.offsetHeight - Number(slot.dataset.room || Infinity);
      if (over > 0) {
        const k = Math.max(0.5, (size.h - over) / size.h);
        artBox.style.width = `${size.w * k}px`;
        artBox.style.height = `${size.h * k}px`;
      }
      const sr = slot.getBoundingClientRect();
      const ar = art.getBoundingClientRect();
      const k = ar.width / L.w;
      balloons.setAttribute('viewBox', `0 0 ${sr.width} ${sr.height}`);
      for (const it of bubbles) {
        const r = it.div.getBoundingClientRect();
        const aim = aimOf(it.b);
        const target = aim ? [ar.left - sr.left + aim[0] * k, ar.top - sr.top + aim[1] * k] : null;
        it.g = bubbleGroup(it.b.kind, { x: r.left - sr.left, y: r.top - sr.top, w: r.width, h: r.height }, target, fontPx, 1, stopOf(it.b) * k);
        balloons.appendChild(it.g);
      }
    } else {
      // Bubbles inside the art: measure each text at its real size, then draw the bubble shape round it.
      const texts = htmlEl('div', 'comic-texts');
      slot.append(art, balloons, texts);
      const placed = []; // bubbles already placed, so later ones can make room
      bubbles = (p.bubbles ?? []).map((b, j) => {
        const div = textBox(b, b.w ? b.w * scale : size.w * (b.kind === 'caption' ? 0.86 : 0.5));
        texts.appendChild(div);
        const bw = fixWidth(div) / scale;
        const bh = div.offsetHeight / scale;
        const em = fontPx / scale;
        const pad = bubblePad(b.kind, em);
        const margin = pad + 6 / scale;
        const bx = avoidBoxes(clampBox({ x: b.at[0] - bw / 2, y: b.at[1] - bh / 2, w: bw, h: bh }, L, margin), placed, L, pad + 8 / scale, margin);
        placed.push({ x: bx.x - pad, y: bx.y - pad, w: bx.w + pad * 2, h: bx.h + pad * 2 });
        div.style.left = `${bx.x * scale}px`;
        div.style.top = `${bx.y * scale}px`;
        const g = bubbleGroup(b.kind, bx, aimOf(b), em, 1 / scale, stopOf(b));
        balloons.appendChild(g);
        return { b, j, g, div, text: div.textContent };
      });
    }

    if (animate && !still) {
      slot.classList.add('is-new');
      if (cam.shake) {
        const k = 18;
        camG.animate([0, 1, -1, 0.8, -0.6, 0.35, 0].map((v, n) => ({ transform: `translate(${v * k * (n % 2 ? 1 : -0.6)}px, ${v * k * 0.5}px)` })),
          { duration: cam.ms, easing: 'ease-out' });
      } else if (cam.from !== cam.to) {
        camG.animate([{ transform: camCss(cam.from) }, { transform: camCss(cam.to) }],
          { duration: cam.ms, easing: 'cubic-bezier(.25,.6,.3,1)', fill: 'forwards' });
      }
      play(p.sound);
    } else if (!cam.shake) {
      camG.style.transform = camCss(cam.to);
    }
    return { i, bubbles, shown: 0 };
  }

  /**
   * Show the bubbles of a drawn panel up to a count; new ones pop in (the first one a moment after the panel).
   * @param {object} view the drawn panel
   * @param {number} upTo how many bubbles should show
   * @param {boolean} animate false = show at once
   * @returns {void}
   */
  function reveal(view, upTo, animate) {
    for (let j = view.shown; j < upTo; j += 1) {
      const bub = view.bubbles[j];
      for (const el of [bub.g, bub.div]) {
        el.classList.add('is-on');
        if (animate && !still) el.classList.add(j === 0 ? 'is-pop-late' : 'is-pop');
      }
      if (animate) {
        play(bub.b.sound);
        live.textContent = bub.text;
      }
    }
    view.shown = Math.max(view.shown, upTo);
  }

  /**
   * Draw a whole page: earlier panels finished, the current one entering, later ones as empty slots.
   * @param {number} pi page number
   * @param {{panel: number, shown: number}} step the current step
   * @param {boolean} animate false after a resize (nothing moves again)
   * @returns {void}
   */
  function buildPage(pi, step, animate) {
    stage.textContent = '';
    views = new Map();
    const pg = pages[pi];
    const el = htmlEl('div', `comic-page comic-page--${pg.dir}`);
    stage.appendChild(el);
    const cs = getComputedStyle(stage);
    const roomW = stage.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight) - 6; // 6 = panel shadow
    const roomH = stage.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom) - 6;
    const sizes = fitPage(pg.panels.map((i) => strip.panels[i].layout), pg.dir, roomW, roomH);
    pg.panels.forEach((i, k) => {
      const slot = htmlEl('div', 'comic-panel');
      slot.setAttribute('role', 'group');
      slot.style.width = `${sizes[k].w}px`;
      slot.style.height = `${sizes[k].h}px`;
      slot.dataset.size = JSON.stringify(sizes[k]);
      slot.dataset.room = String(roomH);
      el.appendChild(slot);
      if (i < step.panel) reveal(drawPanel(i, slot, sizes[k], false), (strip.panels[i].bubbles ?? []).length, false);
      else if (i === step.panel) views.set(i, drawPanel(i, slot, sizes[k], animate));
    });
    page = pi;
  }

  /** Bring the screen up to the current step. @param {boolean} [animate] false after a resize @returns {void} */
  function render(animate = true) {
    const step = state.steps[state.i];
    if (!step) return;
    const pi = pageOf[step.panel];
    if (pi !== page) buildPage(pi, step, animate);
    let view = views.get(step.panel);
    if (!view) {
      const slot = stage.querySelectorAll('.comic-panel')[pages[pi].panels.indexOf(step.panel)];
      view = drawPanel(step.panel, slot, JSON.parse(slot.dataset.size), animate);
      views.set(step.panel, view);
    }
    reveal(view, step.shown, animate);
  }

  /** Show the end card and tell the game the strip was seen. @returns {void} */
  function finish() {
    end.hidden = false;
    hint.hidden = true;
    try { opts.onSeen?.(strip.id, { skipped: state.skipped }); } catch { /* the save hook is optional */ }
    goBtn.focus();
  }

  /** One tap further (next bubble, next panel or the end). @returns {void} */
  function next() {
    if (state.done) return;
    state = advance(state);
    if (state.done) finish(); else render();
  }

  /** Jump to the end card. @returns {void} */
  function doSkip() {
    if (state.done) return;
    state = skip(state);
    finish();
  }

  /** Read the strip again from the first panel. @returns {void} */
  function replay() {
    state = startReading(strip);
    end.hidden = true;
    hint.hidden = false;
    page = -1;
    box.focus();
    render();
  }

  /** Taps on the comic: anywhere except the buttons goes one step further. @param {Event} e tap @returns {void} */
  const onTap = (e) => { if (!e.target.closest('button')) next(); };
  /** Keys: Enter, Space or Right arrow go on, Esc skips. @param {KeyboardEvent} e key @returns {void} */
  const onKey = (e) => {
    if (e.target.closest?.('button') && (e.key === 'Enter' || e.key === ' ')) return; // the button handles it
    if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowRight') { e.preventDefault(); next(); }
    else if (e.key === 'Escape') { e.preventDefault(); doSkip(); }
  };
  /** Redraw the page for a new screen size or turn, without moving anything again. @returns {void} */
  const onResize = () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => { repaginate(); page = -1; render(false); }, 120);
  };

  /** Remove the comic and stop listening. @returns {void} */
  function close() {
    clearTimeout(resizeTimer);
    box.removeEventListener('click', onTap);
    box.removeEventListener('keydown', onKey);
    globalThis.removeEventListener('resize', onResize);
    box.remove();
    try { opts.onClose?.(); } catch { /* optional */ }
  }

  box.addEventListener('click', onTap);
  box.addEventListener('keydown', onKey);
  globalThis.addEventListener('resize', onResize);
  skipBtn.addEventListener('click', doSkip);
  replayBtn.addEventListener('click', replay);
  goBtn.addEventListener('click', close);
  repaginate();
  box.focus();
  render();

  return { next, skip: doSkip, replay, close, get state() { return state; } };
}
