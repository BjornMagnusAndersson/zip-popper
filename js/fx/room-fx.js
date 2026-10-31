// The studio room's light and particle effects in the game (SPEC D45 item 3), put together for one picture: the pop
// scene's backdrop (pop/pop-mode.js paintBackdrop, behind the face) and the studio view (screens/studio.js, on its
// moving-parts layer). Which tier shows what is in room-logic.js roomFxPlan; the parts are room-mood.js (the colour
// wash), room-lamps.js (lamp glows, the candle, the diffuser and the moth), room-dust.js (dust in the light) and
// room-shine.js (shine sweeps, sparkle motes, petals). Each frame: frame(ctx, time) moves everything on by the time
// since the last frame and draws it; next() says when the next frame is due (Infinity = a still picture).
// The pictures are cheap: every soft shape is painted once into a sprite (sprites.js) and only copied after that.
import { layerSpots, leakGeometry, shelfSpot, lampSpot } from '../pop/backdrop.js';
import { faceGeometry, rng } from '../pop/logic.js';
import { studioLayersShown, studioKey } from '../game/studio.js';
import { makeSprites, seedOf, clamp } from './sprites.js';
import { roomFxPlan, nextRoomFxChange, fxStepTime } from './room-logic.js';
import { makeDust, shaftSpot } from './room-dust.js';
import { makeLamps } from './room-lamps.js';
import { makeShine } from './room-shine.js';
import { makeMood } from './room-mood.js';

/**
 * The room's useful spots for a picture size and tier, from backdrop.js's layout (the same sums as the room drawing).
 * @param {number} W width in CSS px
 * @param {number} H height in CSS px
 * @param {number} tier 0..2
 * @param {string[]} layers owned studio layers
 * @param {boolean} view the studio view's places (true) or the pop scene's (false)
 * @returns {object} W, H, land, floorY, tileTop, lamp (the ceiling bulb), ring (the ring light or null), window (the
 *   daylight shaft's corners), shelf, spots (layerSpots), layers (shown), target (where the ring light points), clear
 *   (the column the face covers, or null), candle and diffuser (the spa's, or null), pool (the window light's floor pool)
 */
export function roomSpots(W, H, tier, layers, view) {
  const land = W > H;
  const shown = studioLayersShown(layers);
  const spots = layerSpots(W, H, view);
  const floorY = H * (land ? 0.86 : 0.9);
  const win = { x0: W * 0.55, x1: W * 0.8, y: 0, bx0: W * 0.7, bx1: W * 1.05, by: H * 0.85 }; // the spa's daylight (backdrop.js drawRoom)
  const ring = shown.includes('lamp') ? { x: spots.lamp.x, y: spots.lamp.y, r: spots.lamp.r } : null;
  const face = view ? null : faceGeometry(W, H, {});
  const ch = spots.chair;
  const target = view ? [ch.x, ch.top + (ch.seat - ch.top) * 0.35] : [face.cx, face.cy];
  const shelf = shelfSpot(W, H, tier);
  let candle = null;
  if (tier === 2) { // the spa shelf's candle (the same sums as backdrop.js spaShelf)
    const k = shelf.len / 120;
    candle = { x: shelf.x + 65 * k, y: shelf.y - 31 * k, k };
    const sg = spots.sign; // on a sideways screen the sign hangs in front of the candle: no glow then
    const top = sg.y + sg.s * 0.2;
    if (shown.includes('sign') && Math.abs(candle.x - sg.x) < sg.s * 0.55 && candle.y > top - 4 && candle.y < top + sg.s * 0.5 + 4) candle = null;
  }
  const leak = leakGeometry(W, H);
  const diffuser = tier === 2 && shown.includes('leakFix') ? { x: leak.backX, y: leak.floorMid - leak.backS * 0.92, s: leak.backS } : null;
  return {
    W, H, land, floorY, tileTop: H * (land ? 0.5 : 0.42), lamp: lampSpot(W, H), ring, window: win, shelf, spots, layers: shown,
    target, clear: face ? [face.cx - face.rx * 1.1, face.cx + face.rx * 1.1] : null, candle, diffuser,
    pool: { x: (win.bx0 + win.bx1) / 2, y: Math.max(win.by, floorY + (H - floorY) * 0.4), rx: (win.bx1 - win.bx0) * 0.6 },
  };
}

/**
 * Make the room's effects for one picture.
 * @param {{w: number, h: number, dpr: number, kind: number|string, layers?: string[], where?: 'pop'|'view',
 *   reduced?: boolean, lite?: boolean}} o picture size in CSS px and pixel ratio, the backdrop kind (0..2 or 'home'),
 *   the owned studio layers, where it is shown, reduced motion, lighter graphics
 * @returns {{key: string, plan: object, frame: (ctx: CanvasRenderingContext2D, time: number) => void,
 *   bake: (ctx: CanvasRenderingContext2D) => void, base: (room: HTMLCanvasElement) => HTMLCanvasElement,
 *   next: () => number, state: () => object}} the effects: frame draws the moving parts for a moment (ctx in CSS px),
 *   bake paints the still parts once (the studio view's still room), base gives the pop scene's still room with them
 *   baked in, next = seconds until the next frame is due
 */
export function makeRoomFx(o) {
  const where = o.where ?? 'pop';
  const layers = o.layers ?? [];
  const plan = roomFxPlan(o.kind, layers, { reduced: o.reduced, lite: o.lite, where });
  const key = roomFxKey(o);
  const parts = [];
  let last = null;
  if (plan.on) {
    const W = Math.round(o.w);
    const H = Math.round(o.h);
    const kit = makeSprites(() => o.dpr);
    const sc = clamp(Math.min(W, H) / 260, 0.6, 1.6);
    const still = !plan.moving;
    const room = roomSpots(W, H, plan.tier, layers, where === 'view');
    /** A seeded random maker for one part (the same every time). @param {string} name part @returns {() => number} numbers */
    const rand = (name) => rng(seedOf(`${name}:${where}`));
    // baked: the parts that stand still (the mood, the light shaft, the lamp glows) are painted once into the still
    // room picture (bake), so each frame only draws the small moving things: a full-screen layer every frame is what
    // costs on an old phone (measured with tools/perf.mjs, D40).
    const base = { W, H, sc, kit, tier: plan.tier, still, baked: true };
    parts.push(makeMood({ ...base }));
    parts.push(makeLamps({ ...base, lamp: room.lamp, ring: room.ring, candle: plan.candle ? room.candle : null, diffuser: plan.diffuser ? room.diffuser : null, moth: plan.moth, dim: where === 'view', calm: Boolean(o.reduced) }));
    if (plan.dust > 0) {
      parts.push(makeDust({
        ...base, rand: rand('dust'), amount: plan.dust, share: plan.share, shaft: shaftSpot(room), ring: room.ring, pool: room.pool,
        haze: where === 'view' && !o.lite && !still, strength: [0.4, 0.34][plan.tier] ?? 0.4, // the drifting haze: studio view only
      }));
    }
    if (plan.sweeps || plan.sparkles || plan.petals) {
      parts.push(makeShine({ ...base, rand: rand('shine'), share: plan.share, room, sweeps: plan.sweeps, sparkles: plan.sparkles, petals: plan.petals }));
    }
  }
  let baseCanvas = null; // the still room with the still effects baked in (base)
  let baseFrom = null; // the still room picture it was made from

  /** Paint the still parts once (the mood, the light shaft, the lamp glows). @param {CanvasRenderingContext2D} ctx where (CSS px) @returns {void} */
  function bake(ctx) {
    for (const p of parts) {
      ctx.save();
      try { p.bake?.(ctx); } catch (e) { console.warn('room effect failed:', e); }
      ctx.restore();
    }
  }

  return {
    key,
    plan,
    bake,
    /**
     * The still room picture with the still effects baked in, made once from the room's own still picture (kept until
     * that picture changes). The pop scene draws this instead of the plain room.
     * @param {HTMLCanvasElement} room the still room (device pixels, the picture's size times the pixel ratio)
     * @returns {HTMLCanvasElement} the room with the effects' still parts
     */
    base(room) {
      if (!parts.length || !room) return room;
      if (baseFrom === room && baseCanvas) return baseCanvas;
      baseCanvas = baseCanvas ?? document.createElement('canvas');
      baseCanvas.width = room.width;
      baseCanvas.height = room.height;
      const bc = baseCanvas.getContext('2d');
      bc.setTransform(1, 0, 0, 1, 0, 0);
      bc.clearRect(0, 0, room.width, room.height);
      bc.drawImage(room, 0, 0);
      const k = room.width / Math.max(1, Math.round(o.w));
      bc.setTransform(k, 0, 0, k, 0, 0);
      bake(bc);
      baseFrom = room;
      return baseCanvas;
    },
    /** Move the effects on to a moment and draw them. @param {CanvasRenderingContext2D} ctx where (CSS px) @param {number} time seconds @returns {void} */
    frame(ctx, time) {
      if (!parts.length) return;
      const dt = fxStepTime(last, time);
      last = time;
      for (const p of parts) p.step(dt, time);
      for (const p of parts) {
        ctx.save();
        try { p.draw(ctx); } catch (e) { console.warn('room effect failed:', e); }
        ctx.restore();
      }
    },
    /** Seconds until the effects look different (Infinity = a still picture). @returns {number} seconds */
    next: () => nextRoomFxChange(plan),
    /** For checks (headless screenshots). @returns {object} state */
    state: () => ({ key, plan, parts: parts.map((p) => p.state?.() ?? null) }),
  };
}

/**
 * The text that names one set of room effects (same text = the same effects can be kept).
 * @param {{w: number, h: number, dpr: number, kind: number|string, layers?: string[], where?: string, reduced?: boolean,
 *   lite?: boolean}} o as makeRoomFx
 * @returns {string} the key
 */
export function roomFxKey(o) {
  return `${Math.round(o.w)}x${Math.round(o.h)}@${o.dpr}:${studioKey(o.kind, o.kind === 'home' ? [] : o.layers ?? [])}:${o.where ?? 'pop'}:${Boolean(o.reduced)}:${Boolean(o.lite)}`;
}

/**
 * Keep the room's effects while the picture stays the same, or make them fresh when the size, the room, reduced
 * motion or lighter graphics changed.
 * @param {object|null} prev the effects in use (or null)
 * @param {object} o as makeRoomFx
 * @returns {object} the effects to use
 */
export function syncRoomFx(prev, o) {
  return prev && prev.key === roomFxKey(o) ? prev : makeRoomFx(o);
}
