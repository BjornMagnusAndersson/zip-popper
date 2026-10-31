// The game's sprite kit for the light and particle effects in the studio room (SPEC D45, item 3), a copy of the
// developer test page's kit (js/dev/fx/sprites.js), so the game never loads developer files. The trick that keeps
// soft light, glows and dust cheap on a phone: paint each soft shape ONCE into a small offscreen canvas (a sprite)
// and then only copy it around with drawImage. Gradients are slow to paint every frame; copying is fast.
// Colours are "r,g,b" strings. Nothing here touches the page until a sprite is first asked for.
import { rng } from '../pop/logic.js';

/** Keep a number between lo and hi. @param {number} v value @param {number} lo low @param {number} hi high @returns {number} clamped */
export const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
/** Smooth 0..1 ramp (slow start and end). @param {number} u input @returns {number} eased */
export const smooth = (u) => (u <= 0 ? 0 : u >= 1 ? 1 : u * u * (3 - 2 * u));
/** Part way from a to b. @param {number} a start @param {number} b end @param {number} k 0..1 @returns {number} mixed */
export const lerp = (a, b, k) => a + (b - a) * k;
/** A full turn in radians. */
export const TAU = Math.PI * 2;
/** A colour "r,g,b" with see-through a, as a canvas colour. @param {string} rgb "r,g,b" @param {number} a 0..1 @returns {string} rgba() */
export const rgba = (rgb, a) => `rgba(${rgb},${clamp(a, 0, 1).toFixed(3)})`;

/** A whole number made from a word (for seeds: the same word always gives the same number). @param {string} s word @returns {number} seed */
export function seedOf(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i += 1) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

/** A repeatable random 0..1 for a whole number. @param {number} n any number @returns {number} 0..1 */
export function hash(n) {
  const x = Math.sin(n * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
}

/**
 * A four-point star path (thin curved rays) round (x, y).
 * @param {CanvasRenderingContext2D} c context
 * @param {number} x centre x
 * @param {number} y centre y
 * @param {number} s ray length
 * @param {number} pinch how fat the rays are near the middle (share of s)
 * @returns {void}
 */
function starPath(c, x, y, s, pinch) {
  const k = s * pinch;
  c.beginPath();
  c.moveTo(x, y - s);
  c.quadraticCurveTo(x + k, y - k, x + s, y);
  c.quadraticCurveTo(x + k, y + k, x, y + s);
  c.quadraticCurveTo(x - k, y + k, x - s, y);
  c.quadraticCurveTo(x - k, y - k, x, y - s);
  c.closePath();
}

/**
 * Paint a clean glint sprite: a soft halo with a four-point star (long thin rays) and two short diagonal rays.
 * @param {CanvasRenderingContext2D} c the sprite's context
 * @param {number} w the sprite's size
 * @returns {void}
 */
export function paintGlint(c, w) {
  const m = w / 2;
  const g = c.createRadialGradient(m, m, 0, m, m, m * 0.6);
  g.addColorStop(0, 'rgba(255,250,232,0.9)');
  g.addColorStop(0.3, 'rgba(255,240,200,0.35)');
  g.addColorStop(1, 'rgba(255,240,200,0)');
  c.fillStyle = g;
  c.fillRect(0, 0, w, w);
  c.fillStyle = 'rgba(255,255,255,1)';
  starPath(c, m, m, m * 0.96, 0.07);
  c.fill();
  c.globalAlpha = 0.7;
  c.translate(m, m);
  c.rotate(Math.PI / 4);
  starPath(c, 0, 0, m * 0.42, 0.1);
  c.fill();
  c.setTransform(1, 0, 0, 1, 0, 0);
  c.globalAlpha = 1;
}

/**
 * Sprites shared by every kit (B99(4), B119): the same name, size and resolution always paint the same picture, so a
 * sprite painted once (or ahead, when the phone is idle: fx/warm.js) is reused by the next effect that asks for it
 * instead of being painted again at its first frame. Newest last; the oldest go when the pixels pass SHARED_MAX_PX.
 */
const SHARED = new Map();
/** How many sprite pixels the shared store keeps at most (about 6 MB). */
const SHARED_MAX_PX = 1.5e6;
let sharedPx = 0;

/**
 * A shared sprite by its full name, or null (a hit moves it to the newest end).
 * @param {string} k the sprite's full name (key, size and resolution)
 * @returns {HTMLCanvasElement|null} the sprite
 */
function sharedGet(k) {
  const c = SHARED.get(k);
  if (!c) return null;
  SHARED.delete(k);
  SHARED.set(k, c);
  return c;
}

/**
 * Keep a sprite in the shared store, letting the oldest go when it is full.
 * @param {string} k the sprite's full name
 * @param {HTMLCanvasElement} c the sprite
 * @returns {void}
 */
function sharedPut(k, c) {
  if (SHARED.has(k)) return;
  SHARED.set(k, c);
  sharedPx += c.width * c.height;
  while (sharedPx > SHARED_MAX_PX && SHARED.size > 1) {
    const [oldKey, old] = SHARED.entries().next().value;
    SHARED.delete(oldKey);
    sharedPx -= old.width * old.height;
  }
}

let finishCanvas = null; // a 1 x 1 canvas (finishPaint)

/**
 * Make the browser really paint a new sprite now (it saves drawing up until a picture is first used), so a sprite made
 * ahead at an idle moment (fx/warm.js) costs nothing at the effect's first frame. Same work, only earlier.
 * @param {HTMLCanvasElement} c the sprite
 * @returns {void}
 */
function finishPaint(c) {
  try {
    finishCanvas ??= document.createElement('canvas');
    finishCanvas.width = 1;
    finishCanvas.height = 1;
    finishCanvas.getContext('2d')?.drawImage?.(c, 0, 0, 1, 1);
  } catch { /* no canvas here (tests): nothing to finish */ }
}

/** For checks: how many sprites and pixels the shared store holds now. @returns {{n: number, px: number}} the size */
export function sharedSprites() {
  return { n: SHARED.size, px: sharedPx };
}

/**
 * Make the sprite kit for one picture size and pixel ratio. Sprites are kept until clear() (and in the shared store).
 * @param {() => number} getDpr the pixel ratio now
 * @returns {object} sprite, dot, glow, glint, buffer, noise, clear, size
 */
export function makeSprites(getDpr) {
  const cache = new Map();
  const buffers = new Map();
  /**
   * A sprite painted once and kept: paint(ctx, w, h) draws it in CSS px (the canvas is sharper on sharp screens).
   * @param {string} key a unique name (put the colour and size in it)
   * @param {number} w width in CSS px
   * @param {number} h height in CSS px
   * @param {(ctx: CanvasRenderingContext2D, w: number, h: number) => void} paint draws the sprite
   * @param {number} [res] pixels per CSS px (default the screen's ratio; soft things look fine with less)
   * @returns {HTMLCanvasElement} the sprite (draw it with drawImage(s, x, y, w, h))
   */
  function sprite(key, w, h, paint, res) {
    const r = res ?? getDpr();
    const k = `${key}|${w}x${h}@${r}`;
    let c = cache.get(k) ?? sharedGet(k); // painted before, by this kit or another (B99(4))
    if (c) { cache.set(k, c); return c; }
    c = document.createElement('canvas');
    c.width = Math.max(1, Math.round(w * r));
    c.height = Math.max(1, Math.round(h * r));
    const x = c.getContext('2d');
    x.setTransform(r, 0, 0, r, 0, 0);
    paint(x, w, h);
    finishPaint(c);
    cache.set(k, c);
    sharedPut(k, c);
    return c;
  }
  /**
   * A soft round dot of light: a bright core fading to nothing at the edge (motes, sparks).
   * @param {string} rgb colour "r,g,b"
   * @param {number} [core] 0..1 how big the bright middle is (0.15 = a pin-point, 0.6 = a flat disc)
   * @param {number} [size] sprite size in CSS px
   * @returns {HTMLCanvasElement} the sprite
   */
  function dot(rgb, core = 0.25, size = 32) {
    return sprite(`dot:${rgb}:${core}`, size, size, (c, w) => {
      const g = c.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2);
      g.addColorStop(0, rgba('255,255,255', 1));
      g.addColorStop(core * 0.5, rgba(rgb, 1));
      g.addColorStop(core, rgba(rgb, 0.75));
      g.addColorStop(Math.min(0.95, core + (1 - core) * 0.45), rgba(rgb, 0.22));
      g.addColorStop(1, rgba(rgb, 0));
      c.fillStyle = g;
      c.fillRect(0, 0, w, w);
    });
  }
  /**
   * A big soft glow (a halo round a lamp): no hard core, a long gentle fall-off, stored at a low resolution.
   * @param {string} rgb colour "r,g,b"
   * @param {number} [size] sprite size in CSS px
   * @returns {HTMLCanvasElement} the sprite
   */
  function glow(rgb, size = 128) {
    return sprite(`glow:${rgb}`, size, size, (c, w) => {
      const g = c.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2);
      g.addColorStop(0, rgba(rgb, 0.9));
      g.addColorStop(0.18, rgba(rgb, 0.5));
      g.addColorStop(0.45, rgba(rgb, 0.16));
      g.addColorStop(0.75, rgba(rgb, 0.04));
      g.addColorStop(1, rgba(rgb, 0));
      c.fillStyle = g;
      c.fillRect(0, 0, w, w);
    }, 1);
  }
  /** The clean four-point glint (paintGlint), kept as a sprite. @returns {HTMLCanvasElement} the sprite */
  function glint() {
    return sprite('glint', 48, 48, paintGlint);
  }
  /**
   * A low-resolution offscreen canvas the size of the picture, for soft things (haze, blotches): drawn small, then
   * stretched over the picture in one drawImage. Its context draws in picture CSS px; it comes back cleared.
   * @param {string} key a unique name
   * @param {number} W picture width in CSS px
   * @param {number} H picture height in CSS px
   * @param {number} scale 0.2..1 pixels per CSS px
   * @returns {{canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D, scale: number}} the buffer
   */
  function buffer(key, W, H, scale) {
    const k = `${key}|${W}x${H}@${scale}`;
    let b = buffers.get(k);
    if (!b) {
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(W * scale));
      canvas.height = Math.max(1, Math.round(H * scale));
      b = { canvas, ctx: canvas.getContext('2d'), scale };
      buffers.set(k, b);
    }
    b.ctx.setTransform(1, 0, 0, 1, 0, 0);
    b.ctx.globalAlpha = 1;
    b.ctx.globalCompositeOperation = 'source-over';
    b.ctx.clearRect(0, 0, b.canvas.width, b.canvas.height);
    b.ctx.setTransform(scale, 0, 0, scale, 0, 0);
    return b;
  }
  /**
   * A soft greyscale value-noise picture (cloudy blotches, white on see-through), for the haze and the dank patches.
   * @param {number} size side in px
   * @param {number} seed random seed
   * @param {number} [cells] how many blotches across
   * @returns {HTMLCanvasElement} the noise
   */
  function noise(size, seed, cells = 6) {
    return sprite(`noise:${seed}:${cells}`, size, size, (c, w) => {
      const rand = rng(seed);
      const grid = [];
      for (let i = 0; i < (cells + 1) * (cells + 1); i += 1) grid.push(rand());
      /** The noise at a grid point (wraps round, so the picture tiles). @param {number} i column @param {number} j row @returns {number} 0..1 */
      const at = (i, j) => grid[(j % cells) * (cells + 1) + (i % cells)];
      const img = c.createImageData(w, w);
      for (let y = 0; y < w; y += 1) {
        for (let x = 0; x < w; x += 1) {
          let v = 0;
          let amp = 0.6;
          let f = cells / w;
          for (let o = 0; o < 2; o += 1) { // two octaves: big soft blotches and a little finer grain
            const gx = x * f;
            const gy = y * f;
            const i = Math.floor(gx);
            const j = Math.floor(gy);
            const u = smooth(gx - i);
            const q = smooth(gy - j);
            const top = lerp(at(i, j), at(i + 1, j), u);
            const bot = lerp(at(i, j + 1), at(i + 1, j + 1), u);
            v += lerp(top, bot, q) * amp;
            amp *= 0.4;
            f *= 2;
          }
          const p = (y * w + x) * 4;
          img.data[p] = 255; img.data[p + 1] = 255; img.data[p + 2] = 255;
          img.data[p + 3] = Math.round(clamp(v / 0.84, 0, 1) * 255);
        }
      }
      c.putImageData(img, 0, 0);
    }, 1);
  }
  /** Forget every sprite and buffer. @returns {void} */
  function clear() { cache.clear(); buffers.clear(); }
  return { sprite, dot, glow, glint, buffer, noise, clear, size: () => cache.size };
}
