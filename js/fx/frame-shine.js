// The shine on a new Master's gold frame as it lands on its nail on the studio's wall of fame (SPEC D45 item 7,
// screens/studio.js hang mode): a warm band of light glides over the gold frame (kept inside the frame) and four-point
// glints pop on its corners one after the other, then fade. Drawn into the dropping frame's own canvas, so it swings
// with the frame. The timing is celebrate-logic.js frameShineAt. Not shown with reduced motion (the frame does not drop).
import { makeSprites, clamp, smooth } from './sprites.js';
import { frameShineAt } from './celebrate-logic.js';
import { starPath } from './coins-fx.js';

/** Paint the shine band: warm white in the middle, fading to nothing at both sides. @param {CanvasRenderingContext2D} c the sprite's context @param {number} w width @param {number} h height @returns {void} */
function paintGoldBand(c, w, h) {
  const g = c.createLinearGradient(0, 0, w, 0);
  g.addColorStop(0, 'rgba(255,236,170,0)');
  g.addColorStop(0.35, 'rgba(255,240,190,0.55)');
  g.addColorStop(0.5, 'rgba(255,255,245,1)');
  g.addColorStop(0.65, 'rgba(255,240,190,0.55)');
  g.addColorStop(1, 'rgba(255,236,170,0)');
  c.fillStyle = g;
  c.fillRect(0, 0, w, h);
}

/** The frame's corners and a spot on its top edge, in shares of its size, with each glint's size and when it pops (s). */
const CORNERS = [[-0.5, 0, 1, 0], [0.5, 1, 0.8, 0.14], [0.5, 0, 0.7, 0.26], [-0.5, 1, 0.75, 0.38], [0.05, 0, 0.55, 0.5]];

/**
 * Make the frame shine.
 * @param {number} dpr the frame canvas's pixel ratio
 * @returns {{draw: (c: CanvasRenderingContext2D, p: {x: number, y: number, s: number, tilt: number}, ms: number) => void,
 *   done: (ms: number) => boolean, dispose: () => void}} draw the shine for a moment (c in CSS px, p = the frame's nail spot
 *   in the canvas, as backdrop.js fameFrame takes it; ms = since the drop began); done = it is over
 */
export function makeFrameShine(dpr) {
  const kit = makeSprites(() => dpr);
  const band = kit.sprite('frame-band', 48, 8, paintGoldBand, 1);
  const halo = kit.dot('255,226,140', 0.2);

  /** A glint popping and fading: a soft halo and a four-point star. @param {CanvasRenderingContext2D} c context @param {number} x x @param {number} y y @param {number} z size @param {number} k seconds since it popped @returns {void} */
  function glint(c, x, y, z, k) {
    if (k < 0 || k > 0.75) return;
    const g = k < 0.1 ? smooth(k / 0.1) * 1.2 : (1 + 0.2 * Math.exp(-(k - 0.1) * 10)) * (1 - smooth((k - 0.35) / 0.4));
    if (g <= 0.02) return;
    c.globalCompositeOperation = 'lighter';
    c.globalAlpha = clamp(g * 0.75, 0, 1);
    c.drawImage(halo, x - z * g * 1.5, y - z * g * 1.5, z * g * 3, z * g * 3);
    c.globalCompositeOperation = 'source-over';
    c.globalAlpha = clamp(g, 0, 1);
    c.fillStyle = '#fffdf0';
    c.save();
    c.translate(x, y);
    c.rotate(k * 1.2);
    starPath(c, 0, 0, z * g);
    c.fill();
    c.restore();
  }

  return {
    /** Draw the shine and the glints for a moment, over the frame already drawn. @param {CanvasRenderingContext2D} c context (CSS px) @param {{x: number, y: number, s: number, tilt: number}} p the frame's nail spot @param {number} ms since the drop began @returns {void} */
    draw(c, p, ms) {
      const at = frameShineAt(ms);
      if (at.sweep < 0 && at.glint < 0) return;
      const s = p.s;
      const top = s * 0.25; // the frame hangs this far below its nail (backdrop.js fameFrame)
      const fh = s * 1.2;
      c.save();
      c.translate(p.x, p.y);
      c.rotate(p.tilt);
      if (at.sweep >= 0) {
        c.save();
        c.beginPath();
        c.rect(-s / 2, top, s, fh);
        c.clip();
        c.globalCompositeOperation = 'lighter';
        const u = smooth(at.sweep);
        c.globalAlpha = Math.sin(at.sweep * Math.PI) * 0.85;
        c.translate(-s * 0.9 + u * s * 1.8, top + fh / 2);
        c.rotate(0.5);
        c.drawImage(band, -s * 0.22, -fh, s * 0.44, fh * 2);
        c.restore();
      }
      if (at.glint >= 0) {
        for (const [u, v, z, d] of CORNERS) glint(c, u * s, top + v * fh, s * 0.22 * z, at.glint - d);
      }
      c.restore();
      c.globalAlpha = 1;
      c.globalCompositeOperation = 'source-over';
    },
    /** Whether the shine is over. @param {number} ms since the drop began @returns {boolean} done */
    done: (ms) => frameShineAt(ms).done,
    /** Forget the sprites. @returns {void} */
    dispose() { kit.clear(); },
  };
}
