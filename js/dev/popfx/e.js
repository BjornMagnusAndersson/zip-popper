// Pop effects test page, variant E: Party pop. A look-and-feel test only (see popfx/shared.js for the hooks).
import { INK, KIND, CALM, smooth, play, buzz, bell, sc, tex, texHappy, bp, T, realT, rand, drops, squirt, starPath, heartPath, sparklePath, drawRing } from './shared.js';
import { gooLook } from '../../pop/art.js';

/** E: party pop. A small goo puff with stars, hearts and sparkles flying out, a happy chime, and the customer looks relieved. @returns {object} the variant */
function makeE() {
  const big = KIND === 'big';
  const bits = [];
  let puff = null;
  let happyAt = -1;
  const COLOURS = { star: '#ffd84a', heart: '#ff7fae', spark: '#fff6c0', dot: ['#7fe0c4', '#b9a3ff', '#7cc8ff'] };
  return {
    /** The happier face from just after the pop. @returns {HTMLCanvasElement} picture */
    texture: () => (happyAt >= 0 && T >= happyAt && texHappy ? texHappy : tex),
    /** A few twinkles round the bump just before it goes. @param {CanvasRenderingContext2D} c context @param {object} p bump @returns {void} */
    afterBump(c, p) {
      if (bp.popped || bp.pressure < 0.6) return;
      const k = (bp.pressure - 0.6) / 0.4;
      for (let i = 0; i < 3; i += 1) {
        const a = -2.3 + i * 1.2;
        const tw = CALM ? 0.8 : 0.5 + 0.5 * Math.sin(realT * 9 + i * 2);
        c.save();
        c.translate(p.x + Math.cos(a) * p.r * 2.3, p.y + Math.sin(a) * p.r * 2.3);
        c.globalAlpha = k * tw;
        sparklePath(c, (4 + 3 * tw) * sc);
        c.fillStyle = COLOURS.spark;
        c.fill();
        c.lineWidth = 1.2;
        c.strokeStyle = INK;
        c.stroke();
        c.restore();
      }
    },
    /** The party: puff, confetti, chime, buzz. @returns {void} */
    pop() {
      const ps = big ? 1 : 1.3; // the whitehead's puff a bit bigger, so it shows round a fingertip
      puff = { at: T, ps, parts: Array.from({ length: 8 }, (_, i) => ({ a: (i / 8) * Math.PI * 2 + rand() * 0.5, d: bp.r * ps * (0.75 + rand() * 0.5), r: bp.r * ps * (0.45 + rand() * 0.3) })) };
      squirt(bp, { strands: 0, drops: big ? 6 : 4, speed: 0.7 });
      const n = CALM ? (big ? 14 : 10) : big ? 30 : 20;
      const kinds = ['star', 'heart', 'spark', 'dot', 'star', 'heart'];
      for (let i = 0; i < n; i += 1) {
        const kind = kinds[i % kinds.length];
        const a = -Math.PI / 2 + (rand() - 0.5) * Math.PI * (i % 3 ? 1.5 : 2);
        const v = (CALM ? 120 + rand() * 140 : 180 + rand() * 260) * sc;
        bits.push({
          kind, x: bp.x, y: bp.y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, age: -rand() * 0.06,
          rot: rand() * 6, spin: CALM ? 0 : (rand() - 0.5) * 9, size: (kind === 'dot' ? 3.5 + rand() * 2 : 6 + rand() * 5) * sc * (big ? 1.15 : 1),
          life: 1.1 + rand() * 0.7, col: kind === 'dot' ? COLOURS.dot[i % 3] : COLOURS[kind],
        });
      }
      happyAt = T + 0.12;
      if (big) {
        play('pop_big');
        [[392, 0.04], [494, 0.11], [587, 0.2], [784, 0.33]].forEach(([f, at]) => bell(f, at, 0.13));
        buzz([20, 25, 20, 25, 45]);
      } else {
        play('pop_small');
        [[523, 0.05], [659, 0.13], [784, 0.25]].forEach(([f, at]) => bell(f, at, 0.12));
        buzz([15, 25, 15]);
      }
    },
    /** Confetti flies out, slows down, falls a little and fades. @param {number} sdt scene seconds @returns {void} */
    step(sdt) {
      for (let i = bits.length - 1; i >= 0; i -= 1) {
        const q = bits[i];
        q.age += sdt;
        if (q.age < 0) continue;
        const drag = Math.exp(-sdt * 2.2);
        q.vx *= drag;
        q.vy = q.vy * drag + 380 * sc * sdt;
        q.x += q.vx * sdt;
        q.y += q.vy * sdt;
        q.rot += q.spin * sdt;
        if (q.age > q.life) bits.splice(i, 1);
      }
    },
    /** The ring, the goo puff and the confetti. @param {CanvasRenderingContext2D} c context @param {object} p bump @returns {void} */
    over(c, p) {
      if (!puff) return;
      const t = T - puff.at;
      drawRing(c, p, t, 0.4, 5);
      if (t < 0.7) drawPuff(c, puff, t);
      for (const q of bits) {
        if (q.age < 0) continue;
        const grow = Math.min(1, q.age / 0.08);
        const alpha = q.age > q.life - 0.35 ? Math.max(0, (q.life - q.age) / 0.35) : 1;
        c.save();
        c.globalAlpha = alpha;
        c.translate(q.x, q.y);
        c.rotate(q.rot);
        const s = q.size * grow;
        if (q.kind === 'star') starPath(c, s);
        else if (q.kind === 'heart') heartPath(c, s);
        else if (q.kind === 'spark') sparklePath(c, s * 1.2);
        else { c.beginPath(); c.arc(0, 0, s, 0, Math.PI * 2); }
        c.fillStyle = q.col;
        c.fill();
        c.lineJoin = 'round';
        c.lineWidth = Math.max(1.2, s * 0.16);
        c.strokeStyle = INK;
        c.stroke();
        if (q.kind !== 'spark') {
          c.fillStyle = 'rgba(255,255,255,0.6)';
          c.beginPath(); c.arc(-s * 0.3, -s * 0.3, s * 0.18, 0, Math.PI * 2); c.fill();
        }
        c.restore();
      }
    },
  };
}

// Plain white goo reads as flat paper under the confetti, so the puff uses a warm cream for it (other goo keeps its own colours).
const CREAM = { body: '#fff1c8', shade: '#efcf86', edge: '#9a7438', hi: '#ffffff' };

/** The puff's colours: cream for white goo, the goo's own look otherwise. @returns {{body: string, shade: string, edge: string, hi: string}} colours */
const puffLook = () => (bp.goo === 'white' || !bp.goo ? CREAM : gooLook(bp.goo));

/**
 * The little goo puff of the party pop: a lumpy cluster of glossy cream goo balls that bursts out round the bump,
 * each ball inked, shaded round with a shine, then they shrink away one by one like bubbles.
 * @param {CanvasRenderingContext2D} c context
 * @param {object} pf the puff
 * @param {number} t seconds since the pop
 * @returns {void}
 */
function drawPuff(c, pf, t) {
  const look = puffLook();
  const g = CALM ? 1 : t < 0.16 ? 1 - (1 - t / 0.16) ** 3 : 1 + (t - 0.16) * 0.4;
  const lift = t * 16 * sc;
  const balls = pf.parts.map((q, i) => ({ x: bp.x + Math.cos(q.a) * q.d * g, y: bp.y + Math.sin(q.a) * q.d * g - lift, r: q.r * (0.55 + 0.45 * g), i }));
  balls.push({ x: bp.x, y: bp.y - lift, r: bp.r * 0.8 * pf.ps * g, i: balls.length });
  for (const b of balls) b.r *= 1 - smooth((t - 0.3 - (b.i % 4) * 0.04) / 0.3); // shrink away, a few at a time
  const live = balls.filter((b) => b.r > 0.6);
  if (!live.length) return;
  live.sort((a, b) => a.y - b.y || (a.i === balls.length - 1 ? 1 : -1)); // higher balls behind, the middle one in front
  c.save();
  c.fillStyle = 'rgba(110,60,30,0.18)'; // a soft shadow on the skin under the puff
  c.beginPath();
  for (const b of live) { c.moveTo(b.x + b.r * 1.05 + 2, b.y + b.r * 0.35 + lift); c.arc(b.x + 2, b.y + b.r * 0.35 + lift, b.r * 1.05, 0, Math.PI * 2); }
  c.fill();
  for (const [col, grow] of [[look.edge, 1.6], [look.shade, 0]]) { // one joined body behind the balls, so it reads as one lump of goo
    c.fillStyle = col;
    c.beginPath();
    for (const b of live) { const rr = b.r * 1.08 + grow; c.moveTo(b.x + rr, b.y); c.arc(b.x, b.y, rr, 0, Math.PI * 2); }
    c.fill();
  }
  for (const b of live) drawGooBall(c, b.x, b.y, b.r, look);
  c.restore();
}

/**
 * One glossy cartoon goo ball: ink-brown rim, a round shade from a light top-left to a darker bottom, a curved shine
 * and a small sparkle dot.
 * @param {CanvasRenderingContext2D} c context
 * @param {number} x middle x
 * @param {number} y middle y
 * @param {number} r radius
 * @param {{body: string, shade: string, edge: string, hi: string}} look colours
 * @returns {void}
 */
function drawGooBall(c, x, y, r, look) {
  c.fillStyle = look.edge;
  c.beginPath(); c.arc(x, y, r + Math.max(1, r * 0.09), 0, Math.PI * 2); c.fill();
  const grad = c.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.1, x, y, r);
  grad.addColorStop(0, look.hi);
  grad.addColorStop(0.35, look.body);
  grad.addColorStop(1, look.shade);
  c.fillStyle = grad;
  c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fill();
  c.strokeStyle = 'rgba(255,255,255,0.55)'; // a thin bounce light along the bottom edge
  c.lineWidth = Math.max(0.8, r * 0.08);
  c.lineCap = 'round';
  c.beginPath(); c.arc(x, y, r * 0.8, 0.5, 1.7); c.stroke();
  c.fillStyle = 'rgba(255,255,255,0.9)'; // the curved shine
  c.beginPath(); c.ellipse(x - r * 0.32, y - r * 0.42, r * 0.34, r * 0.16, -0.6, 0, Math.PI * 2); c.fill();
  c.beginPath(); c.arc(x + r * 0.08, y - r * 0.58, Math.max(0.6, r * 0.07), 0, Math.PI * 2); c.fill();
}

export default { id: 'E', name: 'Party pop', make: makeE };
