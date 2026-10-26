// The comic player's thinking part: no DOM here, so it can be tested in Node.
// What a strip looks like as data is explained in docs/COMIC-FORMAT.md (short version):
//
//   export const STRIP = {
//     id: 'ch0',                       // also the id kept in save.seenComics
//     title: 'comic.ch0.title',        // string KEY (all text is keys, never text)
//     panels: [{
//       layout: 'wide',                // splash | wide | square | tall | small  (sets the drawing size, see LAYOUTS)
//       scene: { bg: ['#fde', '#fbc'], layers: [ { id: 'him', art: 'husband', x: 1100, y: 820, expr: 'sneaky' },
//                                              { shape: 'rect', x: 0, y: 700, w: 1600, h: 200, fill: '#c96' } ] },
//       camera: { move: 'pushIn', focus: [1100, 500], amount: 0.12, ms: 3000 },   // optional
//       sound: 'pop_small',            // optional, a name from core/soundTable.js, plays when the panel opens
//       bubbles: [                     // shown one by one, in this order; tap shows the next
//         { kind: 'caption', key: 'comic.ch0.p1.cap', at: [800, 70] },
//         { kind: 'say', key: 'comic.ch0.p1.him', at: [1150, 200], to: 'him', sound: 'laugh_evil' },
//       ],
//     }],
//   };
//
// Positions are in the panel's drawing units (LAYOUTS below): x to the right, y downwards, 0,0 = top left.

/** Panel shapes. w and h are drawing units; the panel is always shown with this exact aspect, so art never crops. */
export const LAYOUTS = {
  splash: { w: 1000, h: 1000, alone: true }, // a full-page moment: always alone on its page
  wide: { w: 1600, h: 900, alone: true }, // a cinema-wide panel: alone on its page
  square: { w: 1000, h: 1000, perRow: 2 },
  tall: { w: 900, h: 1200, perRow: 2 },
  small: { w: 800, h: 600, perRow: 3, stack: 2 }, // quick beats: stacked two-high in portrait, three in a row in landscape
};

export const BUBBLE_KINDS = ['say', 'shout', 'think', 'whisper', 'caption'];
export const CAMERA_MOVES = ['none', 'pushIn', 'pullOut', 'panLeft', 'panRight', 'panUp', 'panDown', 'shake', 'custom'];
export const SHAPES = ['rect', 'circle', 'ellipse', 'path']; // plain shapes a layer may be instead of a piece of art
export const MIN_PANELS = 1;
export const MAX_PANELS = 16;
export const STORY_MIN_PANELS = 4; // story strips (chapters) use 4 to 12 panels
export const STORY_MAX_PANELS = 12;

/**
 * Fill in the player's name (and any other {placeholders}) in a text. Only ever used as plain text, never as HTML.
 * @param {string} text text with {name}
 * @param {string} name the player's name
 * @param {Record<string, string|number>} [vars] more placeholders
 * @returns {string} the text with the name filled in
 */
export function fillName(text, name, vars = {}) {
  let out = String(text);
  for (const [k, v] of Object.entries({ ...vars, name })) out = out.split(`{${k}}`).join(String(v));
  return out;
}

/**
 * Check a strip and list everything that is wrong with it (an empty list means it is fine).
 * @param {object} strip the strip data
 * @param {{hasKey?: (key: string) => boolean, sounds?: object, arts?: object, minPanels?: number, maxPanels?: number}} [o]
 *   how to check string keys, the sound table, the art kit (names that `art:` may use) and the allowed panel count
 * @returns {string[]} problems in plain words
 */
export function validateStrip(strip, o = {}) {
  const errs = [];
  const min = o.minPanels ?? MIN_PANELS;
  const max = o.maxPanels ?? MAX_PANELS;
  /** Note a problem. @param {string} where place @param {string} what problem @returns {void} */
  const bad = (where, what) => errs.push(`${strip?.id ?? '?'} ${where}: ${what}`);
  /** Check one string key. @param {string} where place @param {unknown} key the key @returns {void} */
  const key = (where, k) => {
    if (typeof k !== 'string' || !k) bad(where, 'missing text key');
    else if (o.hasKey && !o.hasKey(k)) bad(where, `key "${k}" is not in the string table`);
  };
  /** Check one sound name. @param {string} where place @param {unknown} s sound name @returns {void} */
  const sound = (where, s) => {
    if (s === undefined) return;
    if (typeof s !== 'string' || (o.sounds && !Object.prototype.hasOwnProperty.call(o.sounds, s))) bad(where, `unknown sound "${s}"`);
  };
  if (!strip || typeof strip !== 'object') return ['strip is not an object'];
  if (typeof strip.id !== 'string' || !/^[a-z0-9-]+$/.test(strip.id)) bad('id', 'needs a short lowercase id');
  key('title', strip.title);
  if (!Array.isArray(strip.panels)) return [...errs, `${strip.id} panels: missing`];
  if (strip.panels.length < min || strip.panels.length > max) bad('panels', `has ${strip.panels.length}, allowed ${min} to ${max}`);
  strip.panels.forEach((p, i) => {
    const at = `panel ${i + 1}`;
    const L = LAYOUTS[p?.layout];
    if (!L) { bad(at, `unknown layout "${p?.layout}"`); return; }
    const layers = p.scene?.layers ?? [];
    if (!p.scene || !Array.isArray(layers)) bad(at, 'scene.layers must be a list');
    const ids = new Set();
    layers.forEach((l, j) => {
      if (l.id) ids.add(l.id);
      if (l.art) { if (o.arts && typeof o.arts[l.art] !== 'function') bad(`${at} layer ${j + 1}`, `unknown art "${l.art}"`); }
      else if (!SHAPES.includes(l.shape)) bad(`${at} layer ${j + 1}`, 'needs art or shape (rect, circle, ellipse, path)');
    });
    if (p.camera && !CAMERA_MOVES.includes(p.camera.move)) bad(at, `unknown camera move "${p.camera.move}"`);
    sound(at, p.sound);
    (p.bubbles ?? []).forEach((b, j) => {
      const bw = `${at} bubble ${j + 1}`;
      if (!BUBBLE_KINDS.includes(b.kind)) bad(bw, `unknown kind "${b.kind}"`);
      key(bw, b.key);
      sound(bw, b.sound);
      if (!Array.isArray(b.at) || b.at.length !== 2 || !(b.at[0] >= 0 && b.at[0] <= L.w && b.at[1] >= 0 && b.at[1] <= L.h)) {
        bad(bw, `"at" must be [x, y] inside the ${L.w} x ${L.h} panel`);
      }
      if (b.kind !== 'caption' && b.to !== undefined && !(typeof b.to === 'string' ? ids.has(b.to) : Array.isArray(b.to) && b.to.length === 2)) {
        bad(bw, `"to" must be a layer id in this panel or [x, y]`);
      }
    });
  });
  return errs;
}

/**
 * Every key a strip uses (title, bubbles), for checking the string table.
 * @param {object} strip the strip
 * @returns {string[]} the keys
 */
export function stripKeys(strip) {
  return [strip.title, ...(strip.panels ?? []).flatMap((p) => (p.bubbles ?? []).map((b) => b.key))].filter(Boolean);
}

/**
 * The reading steps of a strip: each tap goes one step further. A panel opens together with its first bubble, every
 * later bubble is one more step, and a panel with no bubbles is one step.
 * @param {object} strip the strip
 * @returns {{panel: number, shown: number}[]} per step: which panel is current and how many of its bubbles show
 */
export function buildSteps(strip) {
  const steps = [];
  strip.panels.forEach((p, panel) => {
    const n = (p.bubbles ?? []).length;
    if (n === 0) steps.push({ panel, shown: 0 });
    for (let shown = 1; shown <= n; shown += 1) steps.push({ panel, shown });
  });
  return steps;
}

/**
 * A fresh reading state at the first step.
 * @param {object} strip the strip
 * @returns {{steps: {panel: number, shown: number}[], i: number, done: boolean, skipped: boolean}} the state
 */
export function startReading(strip) {
  return { steps: buildSteps(strip), i: 0, done: false, skipped: false };
}

/**
 * One tap further: the next bubble or panel, or the end after the last step.
 * @param {{steps: object[], i: number, done: boolean}} s the state
 * @returns {object} the new state (the old one is not changed)
 */
export function advance(s) {
  if (s.done) return s;
  if (s.i + 1 >= s.steps.length) return { ...s, done: true };
  return { ...s, i: s.i + 1 };
}

/**
 * Jump to the end (the skip button).
 * @param {object} s the state
 * @returns {object} the new state, done and marked as skipped
 */
export function skip(s) {
  return s.done ? s : { ...s, done: true, skipped: true };
}

/**
 * Note a comic as seen in a save (for the Comics menu and "seen" checks). Uses the existing seenComics list.
 * @param {object} save the save object
 * @param {string} id the strip id
 * @returns {object} a new save with the id in seenComics (no duplicates)
 */
export function markComicSeen(save, id) {
  const seen = Array.isArray(save?.seenComics) ? save.seenComics : [];
  return seen.includes(id) ? save : { ...save, seenComics: [...seen, id] };
}

/**
 * Split the panels into pages for the screen: in portrait mostly one panel per page (small panels stack two-high),
 * in landscape square, tall and small panels share a row. Splash and wide panels are always alone.
 * @param {object[]} panels the strip's panels
 * @param {'portrait'|'landscape'} orientation the screen
 * @returns {{dir: 'row'|'column', panels: number[]}[]} pages with the panel numbers on each
 */
export function paginate(panels, orientation) {
  const pages = [];
  let cur = null;
  panels.forEach((p, i) => {
    const L = LAYOUTS[p.layout] ?? LAYOUTS.square;
    const room = orientation === 'portrait' ? (L.stack ?? 1) : (L.perRow ?? 1);
    const fits = cur && !L.alone && cur.layout === p.layout && cur.panels.length < room;
    if (fits) { cur.panels.push(i); return; }
    cur = { dir: orientation === 'portrait' ? 'column' : 'row', layout: p.layout, panels: [i] };
    pages.push(cur);
  });
  return pages.map(({ dir, panels: list }) => ({ dir, panels: list }));
}

/**
 * Whether a panel's bubbles go above and below the art instead of on it: on an upright phone a wide panel is too
 * small to hold readable text without covering the faces.
 * @param {string} layout the panel layout
 * @param {'portrait'|'landscape'} orientation the screen
 * @returns {boolean} true = bubbles outside the art
 */
export function bubblesOutside(layout, orientation) {
  return orientation === 'portrait' && layout === 'wide';
}

/**
 * Panel sizes (CSS pixels) for one page so it fits the screen with no overflow.
 * @param {string[]} layouts the layout of each panel on the page
 * @param {'row'|'column'} dir side by side or stacked
 * @param {number} W room across
 * @param {number} H room down
 * @param {number} [gap] space between panels
 * @returns {{w: number, h: number}[]} size per panel
 */
export function fitPage(layouts, dir, W, H, gap = 10) {
  const aspects = layouts.map((l) => { const L = LAYOUTS[l] ?? LAYOUTS.square; return L.w / L.h; });
  const gaps = gap * (aspects.length - 1);
  if (dir === 'row') {
    const h = Math.max(1, Math.min(H, (W - gaps) / aspects.reduce((a, b) => a + b, 0)));
    return aspects.map((a) => ({ w: Math.floor(h * a), h: Math.floor(h) }));
  }
  const w = Math.max(1, Math.min(W, (H - gaps) / aspects.reduce((a, b) => a + 1 / b, 0)));
  return aspects.map((a) => ({ w: Math.floor(w), h: Math.floor(w / a) }));
}

/**
 * The camera's start and end for a panel, each as {s, f}: zoom s with the point f staying in place.
 * @param {object|undefined} cam the panel's camera entry
 * @param {{w: number, h: number}} L the panel layout size
 * @returns {{from: {s: number, f: number[]}, to: {s: number, f: number[]}, ms: number, shake: boolean}} the move
 */
export function cameraPath(cam, L) {
  const mid = [L.w / 2, L.h / 2];
  const still = { s: 1, f: mid };
  const move = cam?.move ?? 'none';
  const amt = cam?.amount ?? (move.startsWith('pan') ? 0.2 : 0.12);
  const ms = cam?.ms ?? (move === 'shake' ? 450 : 3200);
  const f = cam?.focus ?? mid;
  const z = 1 + amt;
  const paths = {
    pushIn: [still, { s: z, f }],
    pullOut: [{ s: z, f }, { s: 1, f }],
    panRight: [{ s: z, f: [0, f[1]] }, { s: z, f: [L.w, f[1]] }],
    panLeft: [{ s: z, f: [L.w, f[1]] }, { s: z, f: [0, f[1]] }],
    panDown: [{ s: z, f: [f[0], 0] }, { s: z, f: [f[0], L.h] }],
    panUp: [{ s: z, f: [f[0], L.h] }, { s: z, f: [f[0], 0] }],
    custom: [cam?.from ?? still, cam?.to ?? still],
  };
  const [from, to] = paths[move] ?? [still, still];
  return { from, to, ms, shake: move === 'shake' };
}

/**
 * Where a drawing point ends up under a camera state (used to aim bubble tails at a speaker after a push-in).
 * @param {number[]} p the point [x, y]
 * @param {{s: number, f: number[]}} cam the camera state
 * @returns {number[]} the moved point
 */
export function camPoint(p, cam) {
  return [cam.f[0] + cam.s * (p[0] - cam.f[0]), cam.f[1] + cam.s * (p[1] - cam.f[1])];
}

/**
 * Keep a bubble box inside the panel, with a margin.
 * @param {{x: number, y: number, w: number, h: number}} box the box (drawing units, x and y = top left)
 * @param {{w: number, h: number}} L the panel size
 * @param {number} [m] margin
 * @returns {{x: number, y: number, w: number, h: number}} the box moved inside
 */
export function clampBox(box, L, m = 16) {
  const x = Math.min(Math.max(box.x, m), Math.max(m, L.w - m - box.w));
  const y = Math.min(Math.max(box.y, m), Math.max(m, L.h - m - box.h));
  return { ...box, x, y };
}

/**
 * Move a bubble so it does not cover bubbles already placed in the panel (on a small phone panel the text cannot
 * shrink below a readable size, so bubbles may need to make room). Tries below, above, right, then left of the bubble
 * in the way, and keeps the spot nearest to where the author put it.
 * @param {{x: number, y: number, w: number, h: number}} box the new bubble
 * @param {{x: number, y: number, w: number, h: number}[]} placed bubbles already in the panel
 * @param {{w: number, h: number}} L the panel size
 * @param {number} [gap] space to keep between bubbles
 * @param {number} [m] margin from the panel edge
 * @returns {{x: number, y: number, w: number, h: number}} the box, moved if needed
 */
export function avoidBoxes(box, placed, L, gap = 8, m = 16) {
  /** Whether two boxes come closer than the gap. @param {object} a box @param {object} b box @returns {boolean} true if too close */
  const hits = (a, b) => a.x < b.x + b.w + gap && b.x < a.x + a.w + gap && a.y < b.y + b.h + gap && b.y < a.y + a.h + gap;
  /** Whether a box is inside the panel. @param {object} a box @returns {boolean} true if inside */
  const inside = (a) => a.x >= m - 0.5 && a.y >= m - 0.5 && a.x + a.w <= L.w - m + 0.5 && a.y + a.h <= L.h - m + 0.5;
  let cur = box;
  for (let tries = 0; tries < 8; tries += 1) {
    const other = placed.find((p) => hits(cur, p));
    if (!other) return cur;
    const options = [
      { ...cur, y: other.y + other.h + gap }, { ...cur, y: other.y - cur.h - gap },
      { ...cur, x: other.x + other.w + gap }, { ...cur, x: other.x - cur.w - gap },
    ].filter(inside).filter((o) => !placed.some((p) => hits(o, p)) || o === cur);
    const fallback = [{ ...cur, y: other.y + other.h + gap }, { ...cur, y: other.y - cur.h - gap }].filter(inside);
    const pool = options.length ? options : fallback;
    if (!pool.length) return cur;
    pool.sort((a, b) => Math.hypot(a.x - box.x, a.y - box.y) - Math.hypot(b.x - box.x, b.y - box.y));
    cur = pool[0];
  }
  return cur;
}

/**
 * The outline of a speech-bubble tail: a curved wedge from the bubble middle towards the speaker, stopping a little
 * short of them.
 * @param {{x: number, y: number, w: number, h: number}} box the bubble (drawing units)
 * @param {number[]} target where the speaker's mouth is
 * @param {number} [base] half width of the tail where it leaves the bubble
 * @returns {string|null} an SVG path, or null when the speaker is inside the bubble
 */
export function tailPath(box, target, base = 0) {
  const c = [box.x + box.w / 2, box.y + box.h / 2];
  const dx = target[0] - c[0];
  const dy = target[1] - c[1];
  const len = Math.hypot(dx, dy);
  const ux = dx / (len || 1);
  const uy = dy / (len || 1);
  // How far from the middle the box edge is in this direction.
  const edge = Math.min(Math.abs(box.w / 2 / (ux || 1e-6)), Math.abs(box.h / 2 / (uy || 1e-6)));
  if (len <= edge + 8) return null;
  const gap = Math.min(40, (len - edge) * 0.18);
  const tip = [target[0] - ux * gap, target[1] - uy * gap];
  const half = base || Math.max(14, Math.min(box.w, box.h) * 0.2);
  const nx = -uy;
  const ny = ux;
  const b1 = [c[0] + nx * half, c[1] + ny * half];
  const b2 = [c[0] - nx * half, c[1] - ny * half];
  const bend = (len - edge) * 0.12;
  const q1 = [(b1[0] + tip[0]) / 2 + nx * bend, (b1[1] + tip[1]) / 2 + ny * bend];
  const q2 = [(b2[0] + tip[0]) / 2 + nx * bend * 0.5, (b2[1] + tip[1]) / 2 + ny * bend * 0.5];
  const f = (p) => `${p[0].toFixed(1)} ${p[1].toFixed(1)}`;
  return `M${f(b1)} Q${f(q1)} ${f(tip)} Q${f(q2)} ${f(b2)} Z`;
}
