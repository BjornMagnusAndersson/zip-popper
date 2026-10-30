// The comic player of the effect strips page (fx-strips.html, developer only; the game is not changed). It lays a
// strip out in pages exactly as the game's comic player does (comic-logic.js paginate and fitPage, the same panel
// frames and bubbles from css/comic.css), but each panel is ONE canvas painted every frame: the room picture, the
// effects behind the people, the people picture, the effects in front (all moved by the panel's camera), then the
// screen-space effects. The art pictures are made from the game's comic art kit (SVG, painted once by raster.js).
// The bubbles stay live text over the canvas. Only the newest panel moves; older panels on the page keep their
// last frame, like a printed comic.
//
// A strip here is plain data (see strips-*.js):
//   { id, title, panels: [{ layout, scene: { bg, back: [layers], backB: [layers], fore: [layers] },
//       camera, env: { tier, party, face: '<layer id>' | {x, y, r}, room: {spots in drawing units} },
//       fx: [{ id, name?, at?: beat, delay?, layer?, order?, alpha?, fadeIn?, drop?: {dur, h, delay}, env?: {...},
//              settle? }],
//       beats: [{ say?: {kind, text, at, to, w}, wait?, fire?: ['id' | ['id', delay]], shake?, shakeAt?,
//                 swap?: {layerId: {changes}}, swapAt?, room?: 'B', roomAt?, fade? }] }] }
// One tap = one beat. A beat shows its bubble (wait = seconds after the beat), fires effect triggers (with delays),
// shakes the panel, changes layers (swap, e.g. a new face) or fades the room to backB (the clean studio).
// Effects (fx) are the light test page's modules (js/dev/fx/*.js, see the README in core.js) or this page's own
// (effects.js); env here is that README's env worked out for the panel (its size, the face, the room's lamp and
// window spots), plus env.opt (the fx entry) and env.pt(x, y) (drawing units to panel px) for this page's effects.
import { LAYOUTS, paginate, fitPage, cameraPath, camPoint, clampBox, avoidBoxes } from '../../game/comic-logic.js';
import { svgEl } from '../../game/comic.js';
import { headSpot } from '../../game/comic-art.js';
import { rng } from '../../pop/logic.js';
import { makeSprites, seedOf, clamp, smooth, lerp } from '../fx/sprites.js';
import { bubbleGroup, bubblePad } from './bubbles.js';
import { rasterize } from './raster.js';
import { drawLayer } from './kit.js';

const MAX_PX = 2400; // the art pictures are never bigger than this on a side
const SETTLE = 2.4; // seconds an older panel's effects run (unseen) before its still frame is kept

/**
 * Make an HTML element with a class and optional plain text.
 * @param {string} tag element name @param {string} cls class names @param {string} [text] text (plain, never HTML)
 * @returns {HTMLElement} the element
 */
function htmlEl(tag, cls, text) {
  const e = document.createElement(tag);
  e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
}

/** An ease-out curve (fast start, soft end), like the game's camera. @param {number} u 0..1 @returns {number} eased */
const easeOut = (u) => 1 - (1 - u) ** 3;
/** An ease-out with a little overshoot and settle (a thing dropping in on a spring). @param {number} u 0..1 @returns {number} eased */
const easeBack = (u) => { const c = 1.9; const x = u - 1; return 1 + (c + 1) * x ** 3 + c * x ** 2; };

/**
 * The scene's light tint, as the light test page has it (core.js): warm grey in the studio, violet-pink at a party.
 * @param {number} tier 0..2 @param {boolean} party party mood
 * @returns {{rgb: string, dark: number}} mood
 */
function moodOf(tier, party) {
  return party ? { rgb: '226,150,255', dark: 0.75 } : { rgb: ['196,200,184', '236,222,200', '246,244,236'][tier] ?? '236,222,200', dark: [0.25, 0.1, 0][tier] ?? 0.1 };
}

/**
 * Start the player in a stage element.
 * @param {{stage: HTMLElement, kit: object, effects: Record<string, object>, still: boolean, lite: boolean,
 *   now: () => number, onEnd: () => void}} o where it goes, the art kit, the effect modules by id, the motion and
 *   lite settings, the real clock (for the frame cost) and what to do after the last beat
 * @returns {object} controls: play, next, replay, relayout, tick, state
 */
export function createPlayer(o) {
  const { stage, kit, effects, still, lite } = o;
  let strip = null;
  let steps = [];
  let si = 0;
  let pages = [];
  let pageOf = [];
  let page = -1;
  let views = new Map();
  let active = null;
  let done = false;
  let pending = 0; // art pictures still being painted
  const costs = [];

  /** The screen's shape now. @returns {'portrait'|'landscape'} orientation */
  const orientation = () => (stage.clientWidth >= stage.clientHeight ? 'landscape' : 'portrait');

  /**
   * Where the room's lamp, window, tiles and floor are in a panel (drawing units), from its studio room layer, with the
   * panel's own changes on top; then turned into panel px for the effects (env.room in the core.js README).
   * @param {object} v the panel view @param {object} [over] changes (drawing units)
   * @returns {object} the room spots in px
   */
  function roomOf(v, over = {}) {
    const rl = (v.p.scene.back ?? []).find((l) => l.art === 'room') ?? {};
    const w = rl.w ?? v.L.w;
    const h = rl.h ?? v.L.h;
    const F = rl.floorY ?? h * 0.74;
    const kk = Math.min(F / 600, w / 1000);
    const ww = Math.min(w * 0.26, 360);
    const wx = w * (rl.windowX ?? 0.7) - ww / 2;
    const wy = F * 0.14;
    const u = {
      floorY: F, tileTop: rl.shabby === false ? F * 0.62 : F - 22 - 52 * kk * 4,
      lamp: { x: w * (rl.bulbX ?? 0.32), y: F * 0.2, r: 22 * kk },
      ring: rl.ringLight ? { x: w * (rl.lampX ?? 0.94), y: F * 0.52, r: 58 * (F / 600) } : null,
      window: { x0: wx, x1: wx + ww, y: wy, bx0: wx + ww * 0.5 + (F - wy) * 0.3, bx1: wx + ww * 1.5 + (F - wy) * 0.45, by: F + (h - F) * 0.5 },
      shelf: { x: w * 0.85, y: F * 0.45, len: 120 }, bucket: { x: w * 0.8, y: F + 40, s: 60 },
      ...over,
    };
    /** A spot (number, point object or null) in px. @param {*} x value @returns {*} the value in px */
    const px = (x) => (typeof x === 'number' ? x * v.k : x && typeof x === 'object' ? Object.fromEntries(Object.entries(x).map(([a, b]) => [a, px(b)])) : x);
    const out = px(u);
    out.land = v.W > v.H;
    return out;
  }

  /**
   * The face the effects aim at (env.face): a character layer's head (by id), or a spot {x, y, r} in drawing units.
   * @param {object} v the panel view @param {string|object|null} f which
   * @returns {object|null} {cx, cy, rx, ry, top, chin} in panel px
   */
  function faceOf(v, f) {
    if (!f) return null;
    let x;
    let y;
    let rx;
    let ry;
    if (typeof f === 'string') {
      const l = v.layers().find((q) => q.id === f);
      if (!l) return null;
      const hs = headSpot(l.art, l);
      x = hs.x; y = hs.y; rx = 100 * hs.scale; ry = 110 * hs.scale;
    } else {
      x = f.x; y = f.y; rx = f.r ?? f.rx; ry = f.ry ?? (f.r ?? f.rx) * 1.1;
    }
    const cx = x * v.k;
    const cy = y * v.k;
    return { cx, cy, rx: rx * v.k, ry: ry * v.k, top: cy - ry * v.k * 1.15, chin: cy + ry * v.k };
  }

  /**
   * A point on a person (drawing units), for this page's effects (fx entry p): a layer id = the zit on that person's
   * face (acc.zit) or else the middle of the head; {id, x, y} = a spot in that person's head units.
   * @param {object} v the panel view @param {string|{id: string, x: number, y: number}} ref which
   * @returns {number[]} [x, y]
   */
  function pointOf(v, ref) {
    const id = typeof ref === 'string' ? ref : ref.id;
    const l = v.layers().find((q) => q.id === id);
    if (!l) return [v.L.w / 2, v.L.h / 2];
    const hs = headSpot(l.art, l);
    const spot = typeof ref === 'string' ? (l.acc?.zit ?? { x: 0, y: 0 }) : ref;
    const zx = spot.x ?? 58;
    const zy = spot.y ?? 30;
    const a = (hs.tilt * hs.flip * Math.PI) / 180;
    const rx = zx * Math.cos(a) - zy * Math.sin(a);
    const ry = zx * Math.sin(a) + zy * Math.cos(a);
    return [hs.x + hs.flip * hs.scale * rx, hs.y + hs.scale * ry];
  }

  /**
   * The shiny things the shine effect glides over (its env.shiny), from the panel's list in drawing units:
   * [{id, box: [x, y, w, h], round (corner radius), hot: [[x, y], ...] (where glints pop)}].
   * @param {object} v the panel view @param {object[]} list the things
   * @returns {object[]} the things in px, each with a path(c) that outlines it
   */
  function shinyOf(v, list) {
    return list.map((s) => {
      const [x, y, w, h] = s.box.map((n) => n * v.k);
      const r = (s.round ?? 0) * v.k;
      return {
        id: s.id, box: [x, y, w, h], hot: (s.hot ?? []).map(([a, b]) => [a * v.k, b * v.k]),
        /** The thing's outline. @param {CanvasRenderingContext2D} c context @returns {void} */
        path: (c) => { if (r > 0 && c.roundRect) c.roundRect(x, y, w, h, r); else c.rect(x, y, w, h); },
      };
    });
  }

  /**
   * The env every effect in a panel is made from (the core.js README's env for this panel).
   * @param {object} v the panel view
   * @returns {object} env
   */
  function baseEnv(v) {
    const e = v.p.env ?? {};
    const tier = e.tier ?? 0;
    const party = !!e.party;
    const { W, H, dpr } = v;
    return {
      W, H, dpr, sc: clamp(Math.min(W, H) / 260, 0.6, 1.6), t: 0, tier, party, still, lite, layers: e.layers ?? [], pal: null,
      face: faceOf(v, e.face), room: roomOf(v, e.room), mood: moodOf(tier, party), k: v.k, L: v.L,
      // The reveal's glint spots for a comic head (its eyes sit on the middle line): cheeks, forehead, nose, chin, temple.
      spots: [[-0.66, 0.42, 0.55], [0.66, 0.4, 0.45], [0.04, -0.68, 0.45], [0.02, 0.3, 0.32], [-0.16, 0.82, 0.32], [0.78, -0.44, 0.3]], // smaller: the glints are sized for the light test page's big face
      /** Drawing units to panel px. @param {number} x x @param {number} y y @returns {number[]} [x, y] px */
      pt: (x, y) => [x * v.k, y * v.k],
      /** How many particles to use (about half with lite). @param {number} n full count @returns {number} count */
      count: (n) => Math.max(1, Math.round(lite ? n * 0.5 : n)),
      sprite: v.sprites.sprite, dot: v.sprites.dot, glow: v.sprites.glow, noise: v.sprites.noise,
      /** A cleared low-res panel-sized canvas (sprites.js buffer). @param {string} key name @param {number} scale px per CSS px @returns {object} buffer */
      buffer: (key, scale) => v.sprites.buffer(key, W, H, scale),
      shared: {},
    };
  }

  /**
   * The env for one effect: the panel's, with the effect's own changes (fx entry env: tier, party, face, room...).
   * @param {object} v the panel view @param {object} spec the fx entry
   * @returns {object} env
   */
  function envFor(v, spec) {
    const env = Object.create(v.base);
    env.rand = rng(seedOf(spec.name ?? spec.id));
    env.opt = spec.p !== undefined && !Array.isArray(spec.p) ? { ...spec, p: pointOf(v, spec.p) } : spec;
    for (const [key, val] of Object.entries(spec.env ?? {})) {
      if (key === 'face') env.face = faceOf(v, val);
      else if (key === 'room') env.room = roomOf(v, val);
      else if (key === 'shiny') env.shiny = shinyOf(v, val);
      else env[key] = val;
    }
    if (spec.env && ('tier' in spec.env || 'party' in spec.env)) env.mood = moodOf(env.tier, env.party);
    return env;
  }

  /**
   * Draw a list of layers with the kit (hidden layers left out), noting where each speaker's mouth is.
   * @param {object} v the panel view @param {object[]} layers the layers @param {object} [mouths] mouth points by id (filled in)
   * @returns {SVGElement[]} the drawings
   */
  function drawLayers(v, layers, mouths = {}) {
    const out = [];
    for (const raw of layers ?? []) {
      const l = v.swaps[raw.id] ? { ...raw, ...v.swaps[raw.id] } : raw;
      if (l.hidden) continue;
      const r = drawLayer(kit, l);
      if (r.node) out.push(r.node);
      if (l.id) mouths[l.id] = { at: l.mouth ?? r.mouth ?? [l.x ?? v.L.w / 2, l.y ?? v.L.h / 2], reach: r.reach ?? 0 };
    }
    return out;
  }

  /**
   * Paint one of the panel's art pictures (back = the background and room, backB = the other room, fore = the people).
   * @param {object} v the panel view @param {'back'|'backB'|'fore'} which which picture
   * @returns {Promise<void>} done when painted
   */
  function paint(v, which) {
    const sc = v.p.scene;
    const nodes = which === 'fore' ? drawLayers(v, sc.fore) : drawLayers(v, which === 'back' ? sc.back : sc.backB);
    if (which !== 'fore') {
      const bg = which === 'back' ? sc.bg : (sc.bgB ?? sc.bg);
      nodes.unshift(svgEl('rect', { width: v.L.w, height: v.L.h, fill: Array.isArray(bg) ? bg[0] : (bg ?? '#fffdf6') }));
    }
    pending += 1;
    return rasterize(nodes, v.L, v.pw, v.ph).then((pic) => { pending -= 1; if (v.gone) return; v.pics[which] = pic; });
  }

  /**
   * Set up one panel in its slot: the canvas, the art pictures, the bubbles (placed now, shown later) and the env.
   * @param {number} i panel number @param {HTMLElement} slot the panel box (sized) @param {{w: number, h: number}} size its size
   * @param {boolean} animate camera move and entry animation (false after a turn of the phone or for older panels)
   * @returns {object} the panel view
   */
  function makeView(i, slot, size, animate) {
    const p = strip.panels[i];
    const L = LAYOUTS[p.layout];
    const W = size.w - 6; // inside the 3 px frame
    const H = size.h - 6;
    const dpr = lite ? 1 : Math.min(2, globalThis.devicePixelRatio || 1);
    const cam = cameraPath(p.camera, L);
    const zmax = Math.max(1, cam.from.s, cam.to.s);
    const kpx = Math.min(1, MAX_PX / (Math.max(W, H) * dpr * zmax));
    const canvas = htmlEl('canvas', 'fxs-canvas');
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    const v = {
      i, p, L, W, H, k: W / L.w, dpr, slot, canvas, ctx: canvas.getContext('2d'), pw: Math.round(W * dpr * zmax * kpx), ph: Math.round(H * dpr * zmax * kpx),
      T: 0, queue: [], running: new Map(), pics: {}, swaps: {}, shakes: [], mix: null, beat: -1, live: true, gone: false,
      cam, animCam: animate && !still, animate, bubbles: [], sprites: makeSprites(() => dpr), tmp: null,
      /** The panel's layers with the swaps so far. @returns {object[]} layers */
      layers: () => [...(p.scene.back ?? []), ...(p.scene.fore ?? [])].map((l) => (v.swaps[l.id] ? { ...l, ...v.swaps[l.id] } : l)),
    };
    const balloons = svgEl('svg', { class: 'comic-balloons', viewBox: `0 0 ${L.w} ${L.h}`, 'aria-hidden': 'true' });
    const texts = htmlEl('div', 'comic-texts');
    slot.append(canvas, balloons, texts);
    v.base = baseEnv(v);
    const mouths = {};
    drawLayers(v, p.scene.back ?? [], mouths); // only for the mouth spots: the pictures are painted below
    drawLayers(v, p.scene.fore ?? [], mouths);
    placeBubbles(v, balloons, texts, mouths);
    v.ready = false;
    Promise.all([paint(v, 'back'), paint(v, 'fore'), p.scene.backB ? paint(v, 'backB') : null]).then(() => {
      if (v.gone) return;
      v.ready = true;
      slot.classList.add('is-on');
      if (animate && !still) slot.classList.add('is-new');
      if (!v.live) settle(v);
    });
    return v;
  }

  /**
   * Measure and place every bubble of a panel (hidden until its beat), the way the game's player does inside a panel.
   * @param {object} v the panel view @param {SVGElement} balloons the bubble shapes layer @param {HTMLElement} texts the text layer
   * @param {object} mouths mouth spots by layer id
   * @returns {void}
   */
  function placeBubbles(v, balloons, texts, mouths) {
    const { L, W, H } = v;
    const scale = v.k;
    const fontPx = Math.round(Math.max(14, Math.min(24, Math.min(W, H) * 0.055)));
    const em = fontPx / scale;
    const placed = [];
    v.p.beats.forEach((beat, bi) => {
      const b = beat.say;
      if (!b) return;
      const div = htmlEl('div', `comic-text comic-text--${b.kind}`, b.text);
      div.style.fontSize = `${b.kind === 'caption' ? Math.max(13, fontPx - 2) : fontPx}px`;
      div.style.maxWidth = `${Math.max(120, Math.min(W - 24, b.w ? b.w * scale : W * (b.kind === 'caption' ? 0.86 : 0.5)))}px`;
      texts.appendChild(div);
      const wPx = Math.ceil(div.getBoundingClientRect().width);
      div.style.width = `${wPx}px`;
      const bw = wPx / scale;
      const bh = div.offsetHeight / scale;
      const pad = bubblePad(b.kind, em);
      const margin = pad + 6 / scale;
      const bx = avoidBoxes(clampBox({ x: b.at[0] - bw / 2, y: b.at[1] - bh / 2, w: bw, h: bh }, L, margin), placed, L, pad + 8 / scale, margin);
      placed.push({ x: bx.x - pad, y: bx.y - pad, w: bx.w + pad * 2, h: bx.h + pad * 2 });
      div.style.left = `${bx.x * scale}px`;
      div.style.top = `${bx.y * scale}px`;
      const m = typeof b.to === 'string' ? mouths[b.to] : null;
      const raw = b.kind === 'caption' || b.to === undefined ? null : (m ? m.at : b.to);
      const aim = raw ? camPoint(raw, v.cam.to) : null;
      const g = bubbleGroup(b.kind, bx, aim, em, 1 / scale, m ? m.reach * 0.8 * v.cam.to.s : 0);
      balloons.appendChild(g);
      v.bubbles[bi] = { g, div };
    });
  }

  /** Run something at a time after now in a panel's scene clock. @param {object} v view @param {number} delay seconds @param {() => void} fn what @returns {void} */
  function at(v, delay, fn) {
    v.queue.push({ t: v.T + Math.max(0, delay), fn });
  }

  /** Run everything in a panel's queue that is due. @param {object} v view @returns {void} */
  function runQueue(v) {
    for (;;) {
      const i = v.queue.findIndex((q) => q.t <= v.T + 1e-6);
      if (i < 0) return;
      const [q] = v.queue.splice(i, 1);
      try { q.fn(); } catch (e) { console.error(e); }
    }
  }

  /** Switch an effect on in a panel. @param {object} v view @param {object} spec fx entry @returns {void} */
  function makeFx(v, spec) {
    const mod = effects[spec.id];
    if (!mod) { console.error(`fx-strips: unknown effect "${spec.id}"`); return; }
    try { v.running.set(spec.name ?? spec.id, { mod, spec, born: v.T, hooks: mod.make(envFor(v, spec)) ?? {} }); } catch (e) { console.error(`fx ${spec.id}:`, e); }
  }

  /** Fire an effect's one-off part. @param {object} v view @param {string} name fx name (or id) @returns {void} */
  function trigger(v, name) {
    const r = v.running.get(name);
    if (!r) { console.warn(`fx-strips: "${name}" is not on in this panel yet`); return; }
    try { r.hooks.trigger?.(); } catch (e) { console.error(e); }
  }

  /** Show one beat's bubble. @param {object} v view @param {number} bi beat @param {boolean} animate pop in @returns {void} */
  function showBubble(v, bi, animate) {
    const bub = v.bubbles[bi];
    if (!bub) return;
    for (const e of [bub.g, bub.div]) {
      e.classList.add('is-on');
      if (animate && !still) e.classList.add('is-pop');
    }
  }

  /**
   * Apply one beat to a panel: effects that start now, its bubble, triggers, a shake, layer swaps, the room fade.
   * @param {object} v view @param {number} bi beat number @param {boolean} live true = as it plays (waits, pops, fades), false = at once
   * @returns {void}
   */
  function applyBeat(v, bi, live) {
    const b = v.p.beats[bi] ?? {};
    v.beat = bi;
    for (const spec of v.p.fx ?? []) if ((spec.at ?? 0) === bi) at(v, spec.delay ?? 0, () => makeFx(v, spec));
    if (v.bubbles[bi]) at(v, live && !still ? (b.wait ?? (bi === 0 ? 0.3 : 0)) : 0, () => showBubble(v, bi, live));
    for (const f of b.fire ?? []) {
      const [name, delay = 0] = Array.isArray(f) ? f : [f, 0];
      at(v, delay, () => trigger(v, name));
    }
    if (b.shake && live) at(v, b.shakeAt ?? 0, () => v.shakes.push({ t0: v.T, dur: typeof b.shake === 'number' ? b.shake : 0.45, amp: b.shakeAmp ?? 1 }));
    if (b.swap) {
      at(v, live ? (b.swapAt ?? 0) : 0, () => {
        for (const [id, ch] of Object.entries(b.swap)) v.swaps[id] = { ...(v.swaps[id] ?? {}), ...ch };
        const ids = Object.keys(b.swap);
        const inBack = (v.p.scene.back ?? []).some((l) => ids.includes(l.id));
        paint(v, 'fore');
        if (inBack) paint(v, 'back');
      });
    }
    if (b.room) at(v, live ? (b.roomAt ?? 0) : 0, () => { v.mix = { t0: v.T, dur: live && !still ? (b.fade ?? 0.8) : 0 }; });
  }

  /**
   * An older panel: run its effects for a moment unseen, paint one still frame and keep it.
   * @param {object} v view
   * @returns {void}
   */
  function settle(v) {
    const secs = v.p.settle ?? SETTLE;
    for (let t = 0; t < secs; t += 1 / 30) step(v, 1 / 30);
    v.shakes.length = 0;
    render(v);
  }

  /** Move a panel's clock and effects on by dt. @param {object} v view @param {number} dt seconds @returns {void} */
  function step(v, dt) {
    v.T += dt;
    v.base.t = v.T;
    runQueue(v);
    for (const { hooks } of v.running.values()) { try { hooks.step?.(dt); } catch (e) { console.error(e); } }
  }

  /** The camera now (zoom s and the point f that stays put, drawing units). @param {object} v view @returns {{s: number, f: number[]}} camera */
  function camNow(v) {
    const c = v.cam;
    if (!v.animCam || c.shake) return c.shake ? { s: 1, f: [v.L.w / 2, v.L.h / 2] } : c.to;
    const e = easeOut(clamp(v.T / (c.ms / 1000), 0, 1));
    return { s: lerp(c.from.s, c.to.s, e), f: [lerp(c.from.f[0], c.to.f[0], e), lerp(c.from.f[1], c.to.f[1], e)] };
  }

  /** The panel's shake now (a quick jolt that dies away), in px. @param {object} v view @returns {number[]} [dx, dy] */
  function shakeNow(v) {
    let dx = 0;
    let dy = 0;
    if (still) return [0, 0];
    const list = v.cam.shake && v.animCam ? [...v.shakes, { t0: 0, dur: v.cam.ms / 1000, amp: 1 }] : v.shakes;
    for (const s of list) {
      const u = (v.T - s.t0) / s.dur;
      if (u < 0 || u > 1) continue;
      const k = (1 - u) ** 2 * s.amp * Math.min(v.W, v.H) * 0.03;
      dx += Math.sin(u * 46) * k;
      dy += Math.cos(u * 39) * k * 0.6;
    }
    return [dx, dy];
  }

  /** The effects' draw calls for one layer, in order. @param {object} v view @param {string} layer back, front or glass @returns {Array} [run, hook name] pairs */
  function drawersFor(v, layer) {
    const out = [];
    for (const r of v.running.values()) {
      const main = r.spec.layer ?? r.mod.layer;
      const order = r.spec.order ?? r.mod.order ?? 50;
      if (main === layer && r.hooks.draw) out.push([order, r.mod.num ?? 99, r, 'draw']);
      if (r.hooks[layer]) out.push([order, r.mod.num ?? 99, r, layer]);
    }
    return out.sort((a, b) => a[0] - b[0] || a[1] - b[1]).map((x) => [x[2], x[3]]);
  }

  /**
   * Call one effect's draw hook: dropped in from above (drop), and faded (alpha, fadeIn) through a spare canvas.
   * @param {object} v view @param {CanvasRenderingContext2D} c the panel's context @param {object} r the running effect @param {string} name hook
   * @returns {void}
   */
  function callHook(v, c, r, name) {
    c.save();
    try {
      const s = r.spec;
      if (s.drop) {
        const u = clamp((v.T - r.born - (s.drop.delay ?? 0)) / (still ? 0.001 : (s.drop.dur ?? 1.2)), 0, 1);
        c.translate(0, -(1 - easeBack(u)) * v.H * (s.drop.h ?? 0.45));
      }
      const a = (s.alpha ?? 1) * (s.fadeIn && !still ? smooth((v.T - r.born) / s.fadeIn) : 1);
      if (a >= 0.995) { r.hooks[name](c); return; }
      if (a <= 0.005) return;
      if (!v.tmp) { v.tmp = document.createElement('canvas'); v.tmp.width = v.canvas.width; v.tmp.height = v.canvas.height; }
      const tc = v.tmp.getContext('2d');
      tc.setTransform(1, 0, 0, 1, 0, 0);
      tc.globalAlpha = 1;
      tc.globalCompositeOperation = 'source-over';
      tc.clearRect(0, 0, v.tmp.width, v.tmp.height);
      tc.setTransform(c.getTransform());
      tc.save();
      r.hooks[name](tc);
      tc.restore();
      c.setTransform(1, 0, 0, 1, 0, 0);
      c.globalAlpha = a;
      c.globalCompositeOperation = s.blend ?? 'source-over';
      c.drawImage(v.tmp, 0, 0);
    } catch (e) { console.error(e); } finally { c.restore(); }
  }

  /** Paint a panel's frame: room, back effects, people, front effects (under the camera), then the glass effects. @param {object} v view @returns {void} */
  function render(v) {
    const c = v.ctx;
    const { W, H, dpr, k } = v;
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.globalAlpha = 1;
    c.globalCompositeOperation = 'source-over';
    c.clearRect(0, 0, v.canvas.width, v.canvas.height);
    const cam = camNow(v);
    const [ox, oy] = shakeNow(v);
    const camT = [dpr * cam.s, 0, 0, dpr * cam.s, dpr * (cam.f[0] * k * (1 - cam.s) + ox), dpr * (cam.f[1] * k * (1 - cam.s) + oy)];
    c.setTransform(...camT);
    if (v.pics.back) c.drawImage(v.pics.back, 0, 0, W, H);
    if (v.mix && v.pics.backB) {
      c.globalAlpha = v.mix.dur > 0 ? smooth((v.T - v.mix.t0) / v.mix.dur) : 1;
      c.drawImage(v.pics.backB, 0, 0, W, H);
      c.globalAlpha = 1;
    }
    v.base.shared.lights = [];
    v.base.shared.haze = null;
    for (const [r, name] of drawersFor(v, 'back')) callHook(v, c, r, name);
    if (v.pics.fore) c.drawImage(v.pics.fore, 0, 0, W, H);
    for (const [r, name] of drawersFor(v, 'front')) callHook(v, c, r, name);
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    for (const [r, name] of drawersFor(v, 'glass')) callHook(v, c, r, name);
  }

  /** Forget the panels on screen (a new page, strip or layout). @returns {void} */
  function dropViews() {
    for (const v of views.values()) { v.gone = true; for (const r of v.running.values()) r.hooks.stop?.(); }
    views = new Map();
    active = null;
  }

  /**
   * Lay out one page: older panels as still frames, the current one playing up to the current beat, later ones empty.
   * @param {number} pi page number @param {{panel: number, beat: number}} st the current step @param {boolean} animate play the current beat
   * @returns {void}
   */
  function buildPage(pi, st, animate) {
    dropViews();
    stage.textContent = '';
    const pg = pages[pi];
    const el = htmlEl('div', `comic-page comic-page--${pg.dir}`);
    stage.appendChild(el);
    const cs = getComputedStyle(stage);
    const roomW = stage.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight) - 6;
    const roomH = stage.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom) - 6;
    const sizes = fitPage(pg.panels.map((i) => strip.panels[i].layout), pg.dir, roomW, roomH);
    pg.panels.forEach((i, k) => {
      const slot = htmlEl('div', 'comic-panel');
      slot.style.width = `${sizes[k].w}px`;
      slot.style.height = `${sizes[k].h}px`;
      slot.dataset.size = JSON.stringify(sizes[k]);
      slot.dataset.panel = String(i);
      el.appendChild(slot);
      if (i < st.panel) {
        const v = makeView(i, slot, sizes[k], false);
        v.live = false;
        strip.panels[i].beats.forEach((_, bi) => applyBeat(v, bi, false));
        views.set(i, v);
      } else if (i === st.panel) {
        startPanel(i, slot, sizes[k], st.beat, animate);
      }
    });
    page = pi;
  }

  /**
   * Start the current panel in its slot, with its beats up to one applied (the last one as it plays).
   * @param {number} i panel @param {HTMLElement} slot its box @param {{w: number, h: number}} size its size @param {number} beat the current beat
   * @param {boolean} animate play the current beat (false: everything at once, e.g. after a turn of the phone)
   * @returns {void}
   */
  function startPanel(i, slot, size, beat, animate) {
    const v = makeView(i, slot, size, animate);
    for (let bi = 0; bi < beat; bi += 1) applyBeat(v, bi, false);
    applyBeat(v, beat, animate);
    views.set(i, v);
    active = v;
  }

  /** Bring the screen to the current step (a new page, a new panel on this page, or the next beat). @param {boolean} animate as it plays @returns {void} */
  function show(animate) {
    const st = steps[si];
    const pi = pageOf[st.panel];
    if (pi !== page) { buildPage(pi, st, animate); return; }
    if (!active || st.panel !== active.i) {
      if (active) { active.live = false; if (active.ready) render(active); }
      const slot = stage.querySelector(`.comic-panel[data-panel="${st.panel}"]`);
      startPanel(st.panel, slot, JSON.parse(slot.dataset.size), st.beat, animate);
      return;
    }
    applyBeat(active, st.beat, animate);
  }

  /** Work out the pages for the screen shape now. @returns {void} */
  function repaginate() {
    pages = paginate(strip.panels, orientation());
    pageOf = [];
    pages.forEach((pg, i) => pg.panels.forEach((p) => { pageOf[p] = i; }));
  }

  return {
    /** Start a strip from its first beat. @param {object} s the strip @returns {void} */
    play(s) {
      strip = { ...s, panels: s.panels.map((p) => ({ ...p, beats: p.beats?.length ? p.beats : [{}] })) };
      steps = strip.panels.flatMap((p, panel) => p.beats.map((_, beat) => ({ panel, beat })));
      si = 0;
      done = false;
      page = -1;
      repaginate();
      show(true);
    },
    /** One tap further: the next beat, panel or page; after the last one the end card. @returns {void} */
    next() {
      if (!strip || done) return;
      if (si + 1 >= steps.length) { done = true; o.onEnd?.(); return; }
      si += 1;
      show(true);
    },
    /** Lay the page out again for a new screen size, without playing anything again. @returns {void} */
    relayout() {
      if (!strip) return;
      repaginate();
      page = -1;
      show(false);
    },
    /** One frame: the current panel's clock, effects and picture (older panels keep their frame). @param {number} dt seconds @returns {void} */
    tick(dt) {
      const v = active;
      if (!v || !v.ready || !v.live) return;
      const t0 = o.now();
      step(v, dt);
      render(v);
      costs.push(o.now() - t0);
      if (costs.length > 120) costs.shift();
    },
    /** Forget the frame costs so far (before a timing run). @returns {void} */
    resetCost() { costs.length = 0; },
    /** What is shown, for checks and screenshots. @returns {object} state */
    state() {
      const v = active;
      return {
        strip: strip?.id, step: si, steps: steps.length, panel: steps[si]?.panel, beat: steps[si]?.beat, done, pending,
        page, pages: pages.length, ready: !!v?.ready, t: v ? Number(v.T.toFixed(2)) : 0,
        size: v ? { w: v.W, h: v.H } : null,
        ms: costs.length ? costs.reduce((a, b) => a + b, 0) / costs.length : 0, msMax: costs.length ? Math.max(...costs) : 0,
        effects: v ? Object.fromEntries([...v.running].map(([k, r]) => [k, r.hooks.state?.() ?? {}])) : {},
      };
    },
  };
}
