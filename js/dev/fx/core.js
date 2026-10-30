// Shared part of the light, smoke and particle effects test page (fx-test.html, developer only; the game is not
// changed). It paints the game's studio room, the face and the effects in layers, runs the frame loop, builds the bar
// and the address options, and gives window.__fx hooks for screenshots. Ideas: docs/IDEAS.md, "Light, smoke and
// particle effects, 2026-10-30". Cartoon only: soft light, smoke and sparkle, nothing scary.
//
// Address options: ?fx=disco,smoke (effects on, by id), &tier=0..2 (studio tier), &party (dark party mood), &noface,
// &still (reduced motion: nothing moves; a phone set to reduce motion starts still, &motion ignores that), &lite (like the game's "Lighter graphics": half the particles, pixel ratio 1),
// &who=<regular id> (default greta), &own=lamp,plant (extra owned studio items in every tier), &shot (a pretend clock for screenshots: window.__fx.run(ms) moves time on).
// The readout at the bottom left: frames per second and the JavaScript ms per frame (the GPU's share is not in it).
//
// ---------------------------------------------------------------------------------------------------------------
// README for effect authors (the next helpers: read this, then copy disco.js or smoke.js as a pattern)
// ---------------------------------------------------------------------------------------------------------------
// An effect is one file in js/dev/fx/ with
//   export default { id: 'disco', num: 1, name: 'Disco', layer: 'front', order: 60, make };
//     id     short lowercase word, used in the address (?fx=disco) and in __fx.trigger('disco')
//     num    its number in the IDEAS list (1..12); shown big on its bar button, buttons are sorted by it
//     name   one short word under the number on the button (keep it 7 letters or fewer), and in the stage label
//     layer  where draw(ctx) goes, back to front:
//              'back'  over the room, behind the face (dust shaft, bokeh, lamp glow)
//              'front' over the face and the room (smoke, beams, light spots)
//              'glass' over everything, screen space (confetti, coins, vignette, colour wash)
//     order  optional, inside a layer lower draws first (default 50). Smoke is 40 so the disco beams (60) can light it.
// Then add it to the list in js/dev/fx-test.js and to the PRECACHE list in src/sw.js.
//
// make(env) is called when the effect is switched on, and again (fresh) after any scene change (tier, party, face,
// still, lite, a turn of the phone). It returns hooks; only draw is needed:
//   step(dt)       each frame, dt = seconds since the last frame (at most 0.05). Also called when still is on: then
//                  keep things where they are (a slow fade in or out is fine).
//   draw(ctx)      draw on your layer. ctx is the stage canvas in CSS px (the pixel ratio is already applied). The
//                  page saves and restores ctx round every call, so you may change globalAlpha, composite, transform.
//   back(ctx), front(ctx), glass(ctx)   optional: extra drawing on another layer (disco draws its ball in front).
//   trigger()      optional: fire the one-off part (a boss spotlight, a smoke-machine puff, confetti). The Fire
//                  button and __fx.trigger() call it.
//   stop()         optional: the effect is switched off or about to be made again.
//   state()        optional: a small object for checks (shows up in __fx.state().effects[id]).
//
// env (read it in make and in the hooks; env.t and env.shared are live, the rest is fixed until the next make):
//   W, H           stage size in CSS px;  dpr pixel ratio (1 with lite);  sc size factor (1 on a 260 px short side,
//                  0.6..1.6: multiply sizes and speeds by it so phones and tablets look alike)
//   t              seconds since the page started (scene clock; follows __fx.run in shot mode)
//   tier 0..2, party, still, lite (booleans), layers (owned studio items, e.g. ['leakFix', 'sign']), pal (the
//                  tier's colours from backdrop.js backdropPalette)
//   face           {cx, cy, rx, ry, top, chin} in CSS px (top = about the top of the hair), or null with noface
//   room           useful spots worked out from backdrop.js's layout:
//                    floorY (wall meets floor), tileTop (top of the tiles), land (sideways screen),
//                    lamp {x, y, r} the ceiling bulb, ring {x, y, r} the ring light (only with the 'lamp' upgrade, else null),
//                    window {x0, x1, y, bx0, bx1, by} the spa's daylight shaft: top edge x0..x1 at y, bottom edge
//                    bx0..bx1 at by (the room has no window drawn; this is where tier 2's light falls from),
//                    shelf {x, y, len}, bucket {x, y, s} (floor point and height)
//   rand()         a seeded random 0..1, its own per effect, the same every make (repeatable screenshots)
//   count(n)       how many particles to use: n, or about half with lite (never below 1)
//   mood           {rgb, dark}: the scene's light tint as "r,g,b" (warm grey in the studio, violet-pink in party), and
//                  how dark the room is (0 bright .. 1 dark)
//   sprite(key, w, h, paint, res?)  paint a sprite once and keep it (see sprites.js). THE key to cheap effects:
//                  never build gradients every frame, draw them once into a sprite and drawImage the sprite.
//   dot(rgb, core?, size?)  a ready soft light dot sprite;  glow(rgb, size?)  a big soft halo sprite
//   noise(size, seed, cells?)  a soft cloudy white noise sprite (texture)
//   buffer(key, scale)  a cleared low-resolution stage-sized canvas {canvas, ctx, scale} (ctx draws in CSS px):
//                  draw soft things into it, then ctx.drawImage(b.canvas, 0, 0, W, H) once. Much cheaper for smoke.
//   shared         a board where effects leave things for each other (read with care: may be missing):
//                    shared.haze   {canvas, scale}  set by smoke each frame: its low-res haze picture (alpha =
//                                  how thick the haze is). Light effects can mask their light by it so beams show
//                                  as shafts in the smoke (see disco.js drawAllBeams).
//                    shared.lights [{x, y, rgb, a}]  light sources this frame (disco puts its ball here).
// Helpers to import from sprites.js: clamp, smooth, lerp, TAU, rgba(rgb, a), seedOf(word).
// Keep counts small, reuse sprites, use 'lighter' (additive) for light, and test with ?lite and ?still.
// ---------------------------------------------------------------------------------------------------------------
import { faceGeometry, rng } from '../../pop/logic.js';
import { makeFaceTexture } from '../../pop/face.js';
import { REGULARS } from '../../data/customers.js';
import { drawBackdrop, backdropPalette, backdropKind, nextBackdropChange, roomLeaks, layerSpots, leakGeometry, shelfSpot } from '../../pop/backdrop.js';
import { makeSprites, seedOf, clamp } from './sprites.js';

const params = new URLSearchParams(location.search);
const SHOT = params.has('shot');
const realNow = performance.now.bind(performance); // the real clock, kept for the frame cost even in shot mode
const fakeClock = SHOT ? installFakeClock() : null; // before anything asks for a frame

/** The owned studio items shown for each tier on this page (tier 1: 2 items, tier 2: all six, as in the game). */
const TIER_LAYERS = { 0: [], 1: ['leakFix', 'sign'], 2: ['leakFix', 'wallPaint', 'sign', 'chair', 'plant', 'lamp'] };

/**
 * Shot mode: a pretend clock. requestAnimationFrame and performance.now follow window.__fx.run(ms) instead of real
 * time, so a screenshot always shows the same moment (the same as the pop test page's).
 * @returns {{run: (ms: number) => void}} the clock
 */
function installFakeClock() {
  let vt = 1000;
  let nextId = 1;
  const queue = new Map();
  performance.now = () => vt;
  window.requestAnimationFrame = (cb) => { const id = nextId; nextId += 1; queue.set(id, cb); return id; };
  window.cancelAnimationFrame = (id) => { queue.delete(id); };
  return {
    /** Move the pretend time on by ms, one 16 ms frame at a time. @param {number} ms milliseconds @returns {void} */
    run(ms) {
      for (let done = 0; done < ms; done += 16) {
        vt += 16;
        const due = [...queue.values()];
        queue.clear();
        for (const cb of due) { try { cb(vt); } catch (e) { console.error(e); } }
      }
    },
  };
}

/** Where the ceiling bulb hangs (the same sums as lampSpot in pop/backdrop.js). @param {number} w width @param {number} h height @returns {{x: number, y: number, r: number}} bulb */
function lampSpot(w, h) {
  const r = Math.max(8, Math.min(16, Math.min(w, h) * 0.028));
  return w > h ? { x: w * 0.2, y: h * 0.34, r } : { x: w * 0.17, y: h * 0.11, r };
}

/**
 * The room's useful spots for a stage size and tier (see the README: env.room), from backdrop.js's layout.
 * @param {number} w width
 * @param {number} h height
 * @param {number} tier 0..2
 * @param {string[]} layers owned studio items
 * @returns {object} the spots
 */
function roomSpots(w, h, tier, layers) {
  const land = w > h;
  const spots = layerSpots(w, h, false);
  const leak = leakGeometry(w, h);
  const sh = shelfSpot(w, h, tier);
  return {
    land,
    floorY: h * (land ? 0.86 : 0.9),
    tileTop: h * (land ? 0.5 : 0.42),
    lamp: lampSpot(w, h),
    ring: layers.includes('lamp') ? { ...spots.lamp } : null,
    window: { x0: w * 0.55, x1: w * 0.8, y: 0, bx0: w * 0.7, bx1: w * 1.05, by: h * 0.85 },
    shelf: { x: sh.x, y: sh.y, len: sh.len },
    bucket: { x: leak.backX, y: leak.floorMid, s: leak.backS },
  };
}

/**
 * Build the page from a list of effect modules: the bar, the stage, the loop and the window.__fx hooks.
 * @param {object[]} list effect modules ({id, num, name, layer, order?, make}, see the README above)
 * @returns {void}
 */
export function start(list) {
  const EFFECTS = [...list].sort((a, b) => (a.num ?? 99) - (b.num ?? 99));
  const byId = Object.fromEntries(EFFECTS.map((m) => [m.id, m]));
  const stage = document.getElementById('stage');
  const view = document.getElementById('view');
  const labelEl = document.getElementById('label');
  const fpsEl = document.getElementById('fps');
  const ctx = view.getContext('2d');
  const who = REGULARS.find((c) => c.id === (params.get('who') ?? 'greta')) ?? REGULARS[0];

  // What is shown (the bar and the address change these).
  const S = {
    on: (params.get('fx') ?? 'disco').split(',').filter((id) => byId[id]),
    tier: [0, 1, 2].includes(Number(params.get('tier'))) ? Number(params.get('tier')) : 0,
    party: params.has('party'),
    face: !params.has('noface'),
    still: params.has('still'),
    lite: params.has('lite'),
  };
  try { S.still = S.still || (!params.has('motion') && Boolean(globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches)); } catch { /* no setting */ }

  let W = 0;
  let H = 0;
  let dpr = 1;
  let tex = null; // the face picture (see-through round the person)
  let texParty = null; // the same, dimmed and tinted for the party mood
  let base = null; // the env every effect's env is made from
  const running = new Map(); // id -> {mod, hooks}
  const sprites = makeSprites(() => dpr);
  let T = 0; // scene seconds
  let last = -1;
  const costs = []; // ms per frame (step + draw), the last 120
  let frames = 0;
  let fps = 0;
  let fpsFrames = 0;
  let fpsSince = realNow();

  /** Measure the stage, paint the face pictures and make every effect fresh (start, a turn of the phone, lite). @returns {void} */
  function layout() {
    const box = stage.getBoundingClientRect();
    W = Math.max(200, Math.round(box.width));
    H = Math.max(200, Math.round(box.height));
    dpr = S.lite ? 1 : Math.min(2, globalThis.devicePixelRatio || 1);
    view.width = Math.round(W * dpr);
    view.height = Math.round(H * dpr);
    sprites.clear();
    const geo = faceGeometry(W, H, who.face);
    tex = makeFaceTexture(W, H, dpr, geo, who.face, { mood: 'happy', redness: 0.35, seed: 5, background: false }); // only the person: the room comes from backdrop.js
    texParty = document.createElement('canvas');
    texParty.width = tex.width;
    texParty.height = tex.height;
    const pc = texParty.getContext('2d');
    pc.drawImage(tex, 0, 0);
    pc.globalCompositeOperation = 'source-atop'; // only over the person: a dim violet party light
    pc.fillStyle = 'rgba(34,14,62,0.5)';
    pc.fillRect(0, 0, texParty.width, texParty.height);
    texParty.faceLife = tex.faceLife;
    rebuild(geo);
  }

  /** Make the shared env for the scene now and every switched-on effect fresh. @param {object} [geo] face geometry (kept from the last layout when left out) @returns {void} */
  function rebuild(geo = base?.geo) {
    for (const r of running.values()) r.hooks.stop?.();
    running.clear();
    const own = (params.get('own') ?? '').split(',').filter(Boolean); // &own=lamp,plant: extra owned studio items in every tier
    const layers = [...new Set([...TIER_LAYERS[S.tier], ...own])];
    base = {
      geo,
      W, H, dpr, sc: clamp(Math.min(W, H) / 260, 0.6, 1.6),
      t: T, tier: S.tier, party: S.party, still: S.still, lite: S.lite, layers, pal: backdropPalette(S.tier),
      face: S.face && geo ? { cx: geo.cx, cy: geo.cy, rx: geo.rx, ry: geo.ry, top: geo.cy - geo.ry * 1.15, chin: geo.cy + geo.ry } : null,
      room: roomSpots(W, H, S.tier, layers),
      mood: S.party ? { rgb: '226,150,255', dark: 0.75 } : { rgb: ['196,200,184', '236,222,200', '246,244,236'][S.tier], dark: [0.25, 0.1, 0][S.tier] },
      /** How many particles to use (about half with lite). @param {number} n full count @returns {number} count */
      count: (n) => Math.max(1, Math.round(S.lite ? n * 0.5 : n)),
      sprite: sprites.sprite, dot: sprites.dot, glow: sprites.glow, noise: sprites.noise,
      /** A cleared low-res stage-sized canvas (see sprites.js buffer). @param {string} key name @param {number} scale px per CSS px @returns {object} buffer */
      buffer: (key, scale) => sprites.buffer(key, W, H, scale),
      shared: {},
    };
    for (const id of S.on) make(id);
    showChoice();
  }

  /** Switch one effect on: make its hooks with its own env (its own seeded random). @param {string} id effect id @returns {void} */
  function make(id) {
    const mod = byId[id];
    if (!mod) return;
    const env = Object.create(base);
    env.rand = rng(seedOf(id));
    try { running.set(id, { mod, hooks: mod.make(env) ?? {} }); } catch (e) { console.error(`fx ${id}:`, e); }
  }

  /** The hooks to call for a layer, in draw order. @param {'back'|'front'|'glass'} layer which layer @returns {Function[]} draw calls */
  function drawersFor(layer) {
    const out = [];
    for (const { mod, hooks } of running.values()) {
      if (mod.layer === layer && hooks.draw) out.push([mod.order ?? 50, mod.num ?? 99, (c) => hooks.draw(c)]);
      if (hooks[layer]) out.push([mod.order ?? 50, mod.num ?? 99, (c) => hooks[layer](c)]);
    }
    return out.sort((a, b) => a[0] - b[0] || a[1] - b[1]).map((x) => x[2]);
  }

  const roomPic = { canvas: document.createElement('canvas'), key: '', next: -1 }; // the room, painted only when it changes

  /** Paint the room (and the party's dimming) into its own canvas when it looks different (the bulb's flicker, the drip, the spa's twinkles), as the game does. @returns {void} */
  function paintRoom() {
    const key = `${W}x${H}@${dpr}:${S.tier}:${S.party}:${S.still}:${S.lite}`;
    if (key !== roomPic.key) {
      roomPic.canvas.width = Math.round(W * dpr);
      roomPic.canvas.height = Math.round(H * dpr);
      roomPic.key = key;
      roomPic.next = -1;
    }
    if (T < roomPic.next) return;
    const rc = roomPic.canvas.getContext('2d');
    rc.setTransform(dpr, 0, 0, dpr, 0, 0);
    drawBackdrop(rc, W, H, { room: 'studio', tier: S.tier, layers: base.layers, time: T, reduced: S.still, dpr, twinkle: !S.lite });
    if (S.party) { // the party mood: lights down, a deep violet room, so the coloured light pops
      rc.fillStyle = 'rgba(16,6,34,0.7)';
      rc.fillRect(0, 0, W, H);
    }
    const kind = backdropKind('studio', S.tier);
    roomPic.next = T + nextBackdropChange(T, kind, S.still, roomLeaks(kind, base.layers), !S.lite);
  }

  /** Draw one frame: room, back effects, face, front effects, glass effects. @returns {void} */
  function render() {
    const c = ctx;
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.globalAlpha = 1;
    c.globalCompositeOperation = 'source-over';
    paintRoom();
    c.drawImage(roomPic.canvas, 0, 0);
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    base.shared.lights = [];
    base.shared.haze = null;
    for (const d of drawersFor('back')) { c.save(); try { d(c); } catch (e) { console.error(e); } c.restore(); }
    if (S.face && tex) {
      const pic = S.party ? texParty : tex;
      c.drawImage(pic, 0, 0, W, H);
      if (!S.still && !S.party) tex.faceLife?.draw(c, T); // blinks (not in party: they would show untinted)
    }
    for (const d of drawersFor('front')) { c.save(); try { d(c); } catch (e) { console.error(e); } c.restore(); }
    for (const d of drawersFor('glass')) { c.save(); try { d(c); } catch (e) { console.error(e); } c.restore(); }
  }

  /** One animation frame: move every effect on, draw, and keep the frame cost and fps. @param {number} ms time stamp @returns {void} */
  function frame(ms) {
    requestAnimationFrame(frame);
    const now = ms / 1000;
    const dt = last < 0 ? 0 : clamp(now - last, 0, 0.05);
    last = now;
    if (!base) return;
    const t0 = realNow();
    T += dt;
    base.t = T;
    for (const { hooks } of running.values()) { try { hooks.step?.(dt); } catch (e) { console.error(e); } }
    render();
    costs.push(realNow() - t0);
    if (costs.length > 120) costs.shift();
    frames += 1;
    fpsFrames += 1;
    const rn = realNow();
    if (rn - fpsSince >= 1000) {
      fps = Math.round((fpsFrames * 1000) / (rn - fpsSince));
      fpsFrames = 0;
      fpsSince = rn;
      fpsEl.textContent = `${fps} fps ${avgCost().toFixed(1)} ms`;
    }
  }

  /** The average frame cost (step + draw) over the last frames, in ms. @returns {number} ms */
  function avgCost() {
    return costs.length ? costs.reduce((a, b) => a + b, 0) / costs.length : 0;
  }

  /** Mark the bar buttons, the stage label and the address for what is shown now. @returns {void} */
  function showChoice() {
    for (const b of document.querySelectorAll('[data-fx]')) b.setAttribute('aria-pressed', String(S.on.includes(b.dataset.fx)));
    const flags = { party: S.party, face: S.face, still: S.still, lite: S.lite };
    for (const [k, v] of Object.entries(flags)) document.getElementById(`b-${k}`)?.setAttribute('aria-pressed', String(v));
    const tierBtn = document.getElementById('b-tier');
    if (tierBtn) tierBtn.textContent = `Tier ${S.tier}`;
    const names = S.on.map((id) => `${byId[id].num} ${byId[id].name}`).join(' + ') || 'no effects';
    labelEl.textContent = `${names} | tier ${S.tier}${S.party ? ' party' : ''}${S.still ? ' still' : ''}${S.lite ? ' lite' : ''}`;
    const q = new URLSearchParams(location.search);
    q.set('fx', S.on.join(','));
    q.set('tier', String(S.tier));
    for (const [k, v] of [['party', S.party], ['noface', !S.face], ['still', S.still], ['lite', S.lite]]) { if (v) q.set(k, ''); else q.delete(k); }
    try { history.replaceState(null, '', `?${q.toString().replace(/=(&|$)/g, '$1').replace(/%2C/g, ',')}`); } catch { /* not allowed: fine */ }
  }

  /** Switch an effect on or off. @param {string} id effect id @returns {void} */
  function toggle(id) {
    if (S.on.includes(id)) {
      S.on = S.on.filter((x) => x !== id);
      running.get(id)?.hooks.stop?.();
      running.delete(id);
    } else {
      S.on = [...S.on, id];
      make(id);
    }
    showChoice();
  }

  /** Fire the one-off part of one effect, or of every effect that has one. @param {string} [id] effect id @returns {void} */
  function trigger(id) {
    for (const [k, r] of running) if (!id || k === id) { try { r.hooks.trigger?.(); } catch (e) { console.error(e); } }
  }

  /** Make a bar button. @param {HTMLElement} parent where it goes @param {string} id element id @param {string} text label @param {() => void} onTap what a tap does @returns {HTMLButtonElement} button */
  function button(parent, id, text, onTap) {
    const b = document.createElement('button');
    b.type = 'button';
    if (id) b.id = id;
    b.textContent = text;
    b.addEventListener('click', onTap);
    parent.append(b);
    return b;
  }

  // The bar: one two-line button per effect (number and short name), then the scene buttons (the fps readout sits on the stage).
  const fxGroup = document.getElementById('fxs');
  for (const m of EFFECTS) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'fxb';
    b.dataset.fx = m.id;
    b.title = m.name;
    const n = document.createElement('b');
    n.textContent = String(m.num ?? '');
    const s = document.createElement('small');
    s.textContent = m.name;
    b.append(n, s);
    b.addEventListener('click', () => toggle(m.id));
    fxGroup.append(b);
  }
  const sceneGroup = document.getElementById('scene');
  button(sceneGroup, 'b-tier', 'Tier 0', () => { S.tier = (S.tier + 1) % 3; rebuild(); });
  button(sceneGroup, 'b-party', 'Party', () => { S.party = !S.party; rebuild(); });
  button(sceneGroup, 'b-face', 'Face', () => { S.face = !S.face; rebuild(); });
  button(sceneGroup, 'b-still', 'Still', () => { S.still = !S.still; rebuild(); });
  button(sceneGroup, 'b-lite', 'Lite', () => { S.lite = !S.lite; layout(); });
  button(sceneGroup, 'b-fire', 'Fire', () => trigger());
  button(document.getElementById('hidebar'), 'b-hide', 'Bar', () => { document.body.classList.toggle('min'); layout(); });

  let timer = 0;
  window.addEventListener('resize', () => { clearTimeout(timer); timer = setTimeout(layout, 150); });
  layout();
  requestAnimationFrame(frame);

  window.__fx = {
    /** Move the pretend clock on (shot mode only). @param {number} ms milliseconds @returns {void} */
    run(ms) { fakeClock?.run(ms); },
    /** What is shown and how fast it runs. @returns {object} state */
    state: () => ({
      fx: [...S.on], tier: S.tier, party: S.party, face: S.face, still: S.still, lite: S.lite, W, H, dpr, t: T,
      fps, ms: avgCost(), msMax: costs.length ? Math.max(...costs) : 0, frames, sprites: sprites.size(),
      effects: Object.fromEntries([...running].map(([k, r]) => [k, r.hooks.state?.() ?? {}])),
    }),
    /** Fire one effect's one-off part (or every effect's). @param {string} [id] effect id @returns {void} */
    trigger,
    /** Change what is shown: any of {fx: ['disco'], tier, party, face, still, lite}. @param {object} o changes @returns {void} */
    set(o) {
      if (Array.isArray(o.fx)) S.on = o.fx.filter((id) => byId[id]);
      for (const k of ['party', 'face', 'still']) if (k in o) S[k] = Boolean(o[k]);
      if ('tier' in o && [0, 1, 2].includes(Number(o.tier))) S.tier = Number(o.tier);
      if ('lite' in o && Boolean(o.lite) !== S.lite) { S.lite = Boolean(o.lite); layout(); return; }
      rebuild();
    },
    /** Forget the frame costs measured so far (before a timing run). @returns {void} */
    resetCost() { costs.length = 0; },
    ready: true,
  };
}
