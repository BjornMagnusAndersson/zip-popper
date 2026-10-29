// Pop effects test page, variant I: Unicorn gem pop. A look-and-feel test only (see popfx/shared.js for the hooks).
// A preview of the planned rare "Unicorn zit" (BUILD-PLAN P13): a pearly, sparkly bump that bursts into magic dust of
// little cut gems (diamond, sapphire, emerald, ruby), fine glitter and a soft rainbow ring. Cartoon only: no blood.
import { INK, KIND, CALM, smooth, play, buzz, bell, hiss, sc, bp, face, T, realT, rand, sparklePath } from './shared.js';

// The four gem colours: body, light facet, dark facet and rim (the ruby leans pink so it never reads as blood).
const GEMS = {
  diamond: { body: '#d9f0ff', light: '#ffffff', dark: '#86b6e0', rim: '#3f6a90' },
  sapphire: { body: '#3f7ff2', light: '#a9caff', dark: '#1b3c99', rim: '#142a66' },
  emerald: { body: '#2cc27a', light: '#a4f3c6', dark: '#117443', rim: '#0b4a2c' },
  ruby: { body: '#ff4f93', light: '#ffb8d4', dark: '#bd1f62', rim: '#72133c' },
};
const GEM_NAMES = Object.keys(GEMS);
// Glitter colours: the gem colours, their light tones and white.
const GLITTER = ['#ffffff', '#cfe9ff', '#3f7ff2', '#a9caff', '#2cc27a', '#a4f3c6', '#ff4f93', '#ffb8d4'];
// The pearly rainbow of the sheen, the ring and the goo puff (soft pastels).
const PEARL_HUES = ['#ffb0da', '#ffd9a6', '#b3f0cb', '#a9d6ff', '#cbb5ff', '#ffb0da'];
// The pearly goo puff's colours (a lilac-white pearl instead of plain white).
const PEARL = { body: '#fbf3ff', shade: '#dac6f2', edge: '#7e64a3', hi: '#ffffff' };

/**
 * One gem cut as an outline and a smaller "table" inside it with the same number of corners (unit size, y down);
 * the facets are the bands between the two.
 * @param {number} n corners
 * @param {number} rx width
 * @param {number} ry height
 * @param {number} k table size (0..1)
 * @param {number} turn start angle
 * @returns {{out: number[][], tab: number[][]}} the cut
 */
function roundCut(n, rx, ry, k, turn) {
  const out = [];
  for (let i = 0; i < n; i += 1) {
    const a = turn + (i / n) * Math.PI * 2;
    out.push([Math.cos(a) * rx, Math.sin(a) * ry]);
  }
  return { out, tab: out.map(([x, y]) => [x * k - 0.06, y * k - 0.08]) };
}

// The cut of each gem: a brilliant diamond, an oval sapphire, a step-cut emerald and a round-ish ruby.
const CUTS = {
  diamond: {
    out: [[-1, -0.25], [-0.55, -0.72], [0.55, -0.72], [1, -0.25], [0, 1]],
    tab: [[-0.42, -0.3], [-0.26, -0.5], [0.26, -0.5], [0.42, -0.3], [0, 0.22]],
  },
  sapphire: roundCut(8, 0.74, 1, 0.44, -Math.PI / 2),
  emerald: {
    out: [[-0.42, -1], [0.42, -1], [0.72, -0.72], [0.72, 0.72], [0.42, 1], [-0.42, 1], [-0.72, 0.72], [-0.72, -0.72]],
    tab: [[-0.24, -0.58], [0.24, -0.58], [0.38, -0.44], [0.38, 0.44], [0.24, 0.58], [-0.24, 0.58], [-0.38, 0.44], [-0.38, -0.44]],
  },
  ruby: roundCut(6, 0.95, 0.95, 0.46, -Math.PI / 2),
};

/** Trace a closed polygon scaled by s. @param {CanvasRenderingContext2D} c context @param {number[][]} pts points @param {number} s scale @returns {void} */
function poly(c, pts, s) {
  c.beginPath();
  pts.forEach(([x, y], i) => (i ? c.lineTo(x * s, y * s) : c.moveTo(x * s, y * s)));
  c.closePath();
}

/**
 * One cartoon cut gem: the body, each facet band light or dark by how it faces the light (top left), the table, a rim
 * and (when it catches the light) a white glint. Turning and flipping it (a tumble) moves the light over the facets.
 * @param {CanvasRenderingContext2D} c context
 * @param {string} gem diamond | sapphire | emerald | ruby
 * @param {number} x middle x
 * @param {number} y middle y
 * @param {number} s size (half height)
 * @param {number} rot turn in radians
 * @param {number} flip -1..1 sideways squash (a tumble seen from the front)
 * @param {number} glint 0..1 how bright the white glint is
 * @param {boolean} inked an ink outline (bigger gems) instead of a dark gem-coloured rim
 * @returns {void}
 */
function drawGem(c, gem, x, y, s, rot, flip, glint, inked) {
  if (s < 0.5) return;
  const cut = CUTS[gem];
  const col = GEMS[gem];
  const fl = Math.abs(flip) < 0.25 ? Math.sign(flip || 1) * 0.25 : flip; // never quite a line
  const cs = Math.cos(-rot);
  const sn = Math.sin(-rot);
  let lx = -0.55 * cs + 0.83 * sn; // the light (from the top left) seen from inside the turned gem
  const ly = -0.55 * sn - 0.83 * cs;
  if (fl < 0) lx = -lx;
  c.save();
  c.translate(x, y);
  c.rotate(rot);
  c.scale(fl, 1);
  poly(c, cut.out, s);
  c.fillStyle = col.body;
  c.fill();
  const n = cut.out.length;
  for (let i = 0; i < n; i += 1) {
    const a = cut.out[i];
    const b = cut.out[(i + 1) % n];
    const mx = (a[0] + b[0]) / 2;
    const my = (a[1] + b[1]) / 2;
    const len = Math.hypot(mx, my) || 1;
    const dot = (mx * lx + my * ly) / len;
    if (dot > -0.3 && dot < 0.4) continue; // a side facet keeps the body colour
    c.fillStyle = dot >= 0.4 ? col.light : col.dark;
    poly(c, [a, b, cut.tab[(i + 1) % n], cut.tab[i]], s);
    c.fill();
  }
  if (s > 5) { // thin facet lines on the bigger gems
    c.strokeStyle = 'rgba(255,255,255,0.45)';
    c.lineWidth = Math.max(0.6, s * 0.05);
    poly(c, cut.tab, s);
    c.stroke();
  }
  poly(c, cut.out, s);
  c.lineJoin = 'round';
  c.lineWidth = Math.max(1, s * (inked ? 0.13 : 0.16));
  c.strokeStyle = inked ? INK : col.rim;
  c.stroke();
  c.restore();
  if (glint > 0.05) { // the glint stays upright, a little white star on the top-left facet
    c.save();
    c.globalAlpha *= Math.min(1, glint);
    c.translate(x - s * 0.28 * Math.abs(fl), y - s * 0.34);
    sparklePath(c, s * (0.35 + 0.45 * glint));
    c.fillStyle = '#ffffff';
    c.fill();
    c.restore();
  }
}

/**
 * The pearly rainbow sheen and the little glints on the bump while it is held (and a softer version at rest).
 * @param {CanvasRenderingContext2D} c context
 * @param {object} p the bump (held position)
 * @param {number} amt how swollen it is drawn
 * @param {{a: number, d: number, w: number, ph: number, s: number}[]} glints where the glints sit and how fast they come and go
 * @returns {void}
 */
function drawSheen(c, p, amt, glints) {
  const s = p.r * (1 + 0.45 * amt);
  const k = 0.35 + 0.65 * bp.pressure; // sparkly already at rest, more so when squeezed
  c.save();
  const halo = c.createRadialGradient(p.x, p.y, s * 0.8, p.x, p.y, s * 2.2); // a soft pearly glow round it
  halo.addColorStop(0, `rgba(236,220,255,${0.45 * k})`);
  halo.addColorStop(1, 'rgba(236,220,255,0)');
  c.fillStyle = halo;
  c.beginPath(); c.arc(p.x, p.y, s * 2.2, 0, Math.PI * 2); c.fill();
  c.beginPath(); c.arc(p.x, p.y, s * 0.98, 0, Math.PI * 2); c.clip();
  const ang = CALM ? -0.7 : realT * 0.9; // the rainbow slowly turns round
  const gx = Math.cos(ang) * s;
  const gy = Math.sin(ang) * s;
  const rb = c.createLinearGradient(p.x - gx, p.y - gy, p.x + gx, p.y + gy);
  PEARL_HUES.forEach((h, i) => rb.addColorStop(i / (PEARL_HUES.length - 1), h));
  c.globalAlpha = 0.38 + 0.37 * k;
  c.fillStyle = rb;
  c.fillRect(p.x - s, p.y - s, s * 2, s * 2);
  if (!CALM) { // a pearly shine band that sweeps across now and then
    const u = (realT * 0.55) % 1.6;
    const bx = p.x - s * 1.6 + u * s * 2.4;
    const band = c.createLinearGradient(bx - s * 0.4, p.y - s * 0.4, bx + s * 0.4, p.y + s * 0.4);
    band.addColorStop(0, 'rgba(255,255,255,0)');
    band.addColorStop(0.5, 'rgba(255,255,255,0.75)');
    band.addColorStop(1, 'rgba(255,255,255,0)');
    c.globalAlpha = 0.6 + 0.4 * k;
    c.fillStyle = band;
    c.fillRect(p.x - s, p.y - s, s * 2, s * 2);
  }
  c.restore();
  c.save();
  c.lineWidth = Math.max(1.2, s * 0.1); // a pearly rim
  c.strokeStyle = `rgba(250,240,255,${0.55 + 0.3 * k})`;
  c.beginPath(); c.arc(p.x, p.y, s * 0.98, 0, Math.PI * 2); c.stroke();
  for (const g of glints) { // tiny glints that come and go at their own speeds
    const tw = CALM ? 0.7 : Math.max(0, Math.sin(realT * g.w + g.ph)) ** 3;
    if (tw < 0.05) continue;
    c.save();
    c.globalAlpha = tw * (0.45 + 0.55 * k);
    c.translate(p.x + Math.cos(g.a) * s * g.d, p.y + Math.sin(g.a) * s * g.d);
    sparklePath(c, g.s * sc * (0.6 + 0.5 * tw) * (0.8 + 0.4 * k));
    c.fillStyle = '#ffffff';
    c.fill();
    c.lineWidth = 1;
    c.strokeStyle = 'rgba(126,100,163,0.7)';
    c.stroke();
    c.restore();
  }
  c.restore();
}

/**
 * The soft rainbow shimmer ring that spreads out at the pop (a ring of pastel arcs), with a thinner one just behind.
 * @param {CanvasRenderingContext2D} c context
 * @param {object} p the bump
 * @param {number} t seconds since the pop
 * @param {number} spread how far, in bump radii
 * @returns {void}
 */
function drawRainbowRing(c, p, t, spread) {
  for (const [delay, life, width] of [[0, 0.6, 5], [0.12, 0.7, 2.5]]) {
    const u = (t - delay) / life;
    if (u < 0 || u > 1) continue;
    const R = p.r * (1.2 + spread * smooth(u) * (delay ? 0.8 : 1));
    c.save();
    c.globalAlpha = (1 - u) * 0.85;
    c.lineWidth = Math.max(1.2, width * sc * (1 - u * 0.7));
    c.lineCap = 'round';
    const segs = 12;
    for (let i = 0; i < segs; i += 1) {
      const a0 = (i / segs) * Math.PI * 2 + (CALM ? 0 : t * 1.5);
      c.strokeStyle = `hsl(${(i / segs) * 360}, 90%, ${delay ? 88 : 80}%)`;
      c.beginPath(); c.arc(p.x, p.y, R, a0, a0 + (Math.PI * 2) / segs + 0.02); c.stroke();
    }
    c.restore();
  }
}

/**
 * One glossy pearl goo ball: lilac rim, a round shade, a pastel rainbow sheen, a curved shine and two glitter specks.
 * @param {CanvasRenderingContext2D} c context
 * @param {number} x middle x
 * @param {number} y middle y
 * @param {number} r radius
 * @param {number} i which ball (picks the specks)
 * @returns {void}
 */
function drawPearlBall(c, x, y, r, i) {
  c.fillStyle = PEARL.edge;
  c.beginPath(); c.arc(x, y, r + Math.max(1, r * 0.09), 0, Math.PI * 2); c.fill();
  const grad = c.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.1, x, y, r);
  grad.addColorStop(0, PEARL.hi);
  grad.addColorStop(0.4, PEARL.body);
  grad.addColorStop(1, PEARL.shade);
  c.fillStyle = grad;
  c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fill();
  c.save();
  c.clip();
  const rb = c.createLinearGradient(x - r, y + r * 0.2, x + r, y + r * 0.9); // the mother-of-pearl rainbow low on the ball
  rb.addColorStop(0, 'rgba(255,170,215,0.5)');
  rb.addColorStop(0.5, 'rgba(160,240,210,0.45)');
  rb.addColorStop(1, 'rgba(160,200,255,0.5)');
  c.fillStyle = rb;
  c.beginPath(); c.ellipse(x, y + r * 0.45, r * 1.1, r * 0.6, 0, 0, Math.PI * 2); c.fill();
  c.restore();
  c.fillStyle = 'rgba(255,255,255,0.92)'; // the curved shine
  c.beginPath(); c.ellipse(x - r * 0.32, y - r * 0.42, r * 0.34, r * 0.16, -0.6, 0, Math.PI * 2); c.fill();
  for (let k = 0; k < 2; k += 1) { // glitter specks in the goo
    const a = i * 2.4 + k * 2.1;
    c.fillStyle = GLITTER[(i * 3 + k * 5) % GLITTER.length];
    c.beginPath(); c.arc(x + Math.cos(a) * r * 0.5, y + Math.sin(a) * r * 0.45, Math.max(0.9, r * 0.1), 0, Math.PI * 2); c.fill();
  }
}

/**
 * The little pearly glittery goo puff: a lumpy cluster of pearl goo balls that bursts out round the bump, then the
 * balls shrink away a few at a time like bubbles (the shape as in E, the look a pearl).
 * @param {CanvasRenderingContext2D} c context
 * @param {{ps: number, parts: {a: number, d: number, r: number}[]}} pf the puff
 * @param {number} t seconds since the pop
 * @returns {void}
 */
function drawPearlPuff(c, pf, t) {
  const g = CALM ? 1 : t < 0.16 ? 1 - (1 - t / 0.16) ** 3 : 1 + (t - 0.16) * 0.4;
  const lift = t * 14 * sc;
  const balls = pf.parts.map((q, i) => ({ x: bp.x + Math.cos(q.a) * q.d * g, y: bp.y + Math.sin(q.a) * q.d * g - lift, r: q.r * (0.55 + 0.45 * g), i }));
  balls.push({ x: bp.x, y: bp.y - lift, r: bp.r * 0.75 * pf.ps * g, i: balls.length });
  const fade = CALM ? 0.5 : 0.3;
  for (const b of balls) b.r *= 1 - smooth((t - fade - (b.i % 4) * 0.04) / 0.3);
  const live = balls.filter((b) => b.r > 0.6);
  if (!live.length) return;
  live.sort((a, b) => a.y - b.y || (a.i === balls.length - 1 ? 1 : -1));
  c.save();
  c.fillStyle = 'rgba(110,60,90,0.16)'; // a soft shadow on the skin
  c.beginPath();
  for (const b of live) { c.moveTo(b.x + b.r * 1.05 + 2, b.y + b.r * 0.35 + lift); c.arc(b.x + 2, b.y + b.r * 0.35 + lift, b.r * 1.05, 0, Math.PI * 2); }
  c.fill();
  for (const [col, grow] of [[PEARL.edge, 1.6], [PEARL.shade, 0]]) { // one joined body, so it reads as one lump
    c.fillStyle = col;
    c.beginPath();
    for (const b of live) { const rr = b.r * 1.08 + grow; c.moveTo(b.x + rr, b.y); c.arc(b.x, b.y, rr, 0, Math.PI * 2); }
    c.fill();
  }
  for (const b of live) drawPearlBall(c, b.x, b.y, b.r, b.i);
  c.restore();
}

/** One speck of fine glitter: a tiny tilted square, with a white four-point twinkle when it is at its brightest. @param {CanvasRenderingContext2D} c context @param {object} q the speck @param {number} tw 0..1 twinkle @returns {void} */
function drawSpeck(c, q, tw) {
  const s = q.size;
  c.save();
  c.translate(q.x, q.y);
  c.rotate(q.rot);
  c.fillStyle = q.col;
  c.fillRect(-s, -s, s * 2, s * 2);
  c.strokeStyle = 'rgba(70,50,90,0.55)'; // a hair of dark edge so pale specks show on pale skin
  c.lineWidth = 0.6;
  c.strokeRect(-s, -s, s * 2, s * 2);
  c.restore();
  if (tw > 0.75) {
    c.save();
    c.globalAlpha *= (tw - 0.75) / 0.25;
    c.translate(q.x, q.y);
    sparklePath(c, s * 3.2);
    c.fillStyle = '#ffffff';
    c.fill();
    c.restore();
  }
}

/** How a bit fades out at the end of its life (softer and longer in the calm version). @param {object} q the bit @returns {number} 0..1 */
const fadeOf = (q) => {
  const tail = CALM ? 0.9 : 0.6;
  const inA = Math.min(1, q.age / 0.06);
  return q.age > q.life - tail ? Math.max(0, (q.life - q.age) / tail) * inA : inA;
};

/** The twinkle of a bit now: 0..1, coming and going at its own speed (steady in the calm version). @param {object} q the bit @returns {number} twinkle */
const twinkleOf = (q) => (CALM ? 0.6 : Math.max(0, Math.sin(realT * q.tf + q.ph)) ** 2);

/** I: Unicorn gem pop. A pearly rainbow bump with glints; it bursts into magic gem dust, glitter, a rainbow ring and a pearl goo puff. @returns {object} the variant */
function makeI() {
  const big = KIND === 'big';
  const bits = [];
  let puff = null;
  let popT = -1;
  const glints = Array.from({ length: big ? 6 : 5 }, (_, i) => ({
    a: -2.6 + i * 1.25 + rand() * 0.6, d: 0.35 + rand() * 1.1, w: 2.2 + rand() * 2.6, ph: rand() * 6, s: 2.6 + rand() * 2,
  }));
  return {
    /** While held, the bump swells a little more than usual and breathes (still in the calm version). @returns {{amt: number, warp: number, jx: number, jy: number}} look */
    look: () => ({ amt: bp.pressure * 1.15 + (CALM ? 0 : 0.04 * bp.pressure * Math.sin(realT * 5.3)), warp: bp.pressure, jx: 0, jy: 0 }),
    /** Before the pop: the pearly sheen and glints. After: the glitter that settled on the skin. @param {CanvasRenderingContext2D} c context @param {object} p bump @param {{amt: number}} lk look @returns {void} */
    afterBump(c, p, lk) {
      if (!bp.popped) { drawSheen(c, p, lk.amt, glints); return; }
      for (const q of bits) {
        if (q.kind !== 'glit' || !q.settled) continue;
        c.save();
        c.globalAlpha = fadeOf(q) * (0.55 + 0.45 * twinkleOf(q));
        drawSpeck(c, q, twinkleOf(q));
        c.restore();
      }
    },
    /** The burst of magic dust: gems, glitter, a few big gems, the puff, a chime and a buzz. @returns {void} */
    pop() {
      popT = T;
      const ps = big ? 1 : 1.2;
      const np = big ? 8 : 7;
      puff = { ps, parts: Array.from({ length: np }, (_, i) => ({ a: (i / np) * Math.PI * 2 + rand() * 0.5, d: bp.r * ps * (0.7 + rand() * 0.45), r: bp.r * ps * (0.38 + rand() * 0.25) })) };
      const calmK = CALM ? 0.6 : 1;
      const nGem = Math.round((big ? 34 : 22) * calmK);
      for (let i = 0; i < nGem; i += 1) { // small cut gems: the magic dust
        const a = -Math.PI / 2 + (rand() - 0.5) * Math.PI * (i % 3 ? 1.4 : 2);
        const v = (CALM ? 80 + rand() * 110 : 120 + rand() * 190) * sc;
        bits.push({
          kind: 'gem', gem: GEM_NAMES[i % 4], x: bp.x, y: bp.y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, age: -rand() * 0.1,
          life: 1.8 + rand() * 1.1, size: (2.6 + rand() * 2.2) * sc * (big ? 1.2 : 1), rot: (rand() - 0.5) * 0.8,
          spin: CALM ? 0 : (rand() - 0.5) * 3, fall: 45 + rand() * 40, tf: 3 + rand() * 4, ph: rand() * 6, sway: rand() * 6,
        });
      }
      const nGlit = Math.round((big ? 70 : 46) * calmK);
      for (let i = 0; i < nGlit; i += 1) { // fine glitter; the slower part settles on the skin round the spot
        const a = rand() * Math.PI * 2;
        const lands = i % 5 < 2;
        const v = (lands ? 25 + rand() * 80 : CALM ? 50 + rand() * 110 : 70 + rand() * 200) * sc;
        bits.push({
          kind: 'glit', col: GLITTER[i % GLITTER.length], x: bp.x, y: bp.y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - (lands ? 15 : 40) * sc,
          age: -rand() * 0.15, life: lands ? 2.7 + rand() * 0.8 : 1.6 + rand() * 1.4, size: (0.9 + rand() * 0.8) * Math.sqrt(sc) * (big ? 1.15 : 1),
          rot: Math.PI / 4, spin: 0, fall: 25 + rand() * 35, tf: 3.5 + rand() * 5, ph: rand() * 6, sway: rand() * 6,
          settleAt: lands ? 0.45 + rand() * 0.5 : -1, settled: false,
        });
      }
      const nBig = big ? 6 : 3;
      for (let i = 0; i < nBig; i += 1) { // a few bigger gems that tumble out, land on the skin and catch the light
        const side = i % 2 ? 1 : -1;
        const edge = Math.sign(bp.x - face.cx) === side ? 0.55 : 1; // the side towards the face's edge goes less far, so they land on the skin
        const out = edge * (0.35 + (Math.floor(i / 2) / Math.max(1, Math.ceil(nBig / 2) - 1)) * 0.65); // spread out so they land apart
        bits.push({
          kind: 'big', gem: GEM_NAMES[(i + 1) % 4], x: bp.x, y: bp.y, vx: side * (18 + out * 115 + rand() * 12) * sc * (CALM ? 0.7 : 1),
          vy: -(230 + rand() * 150) * sc * (CALM ? 0.7 : 1), age: -0.02 - i * 0.03, life: 2.3 + rand() * 0.6,
          size: (big ? 8.5 + rand() * 3 : 7 + rand() * 2.5) * sc, rot: (rand() - 0.5) * 0.5, spin: CALM ? 0 : side * (2 + rand() * 3),
          ph: 0, tumble: CALM ? 0 : 7 + rand() * 6, floor: bp.y + bp.r * (1.3 + (i % 3) * 0.7 + rand() * 0.4), bounce: 0, landed: false,
          tf: 2.5 + rand() * 2, gph: rand() * 6,
        });
      }
      if (big) {
        play('pop_big');
        [[523, 0.04, 0.11], [784, 0.11, 0.09], [659, 0.2, 0.08], [1047, 0.29, 0.06], [880, 0.43, 0.05], [1175, 0.62, 0.035], [988, 0.9, 0.025]].forEach(([f, at, vol]) => bell(f, at, vol));
        hiss(0.03, 1.6, { type: 'bandpass', f0: 2400, f1: 1200, q: 1.4, vol: 0.03, attack: 0.12 });
        buzz([18, 30, 14, 40, 22]);
      } else {
        play('pop_small');
        [[659, 0.03, 0.1], [988, 0.1, 0.08], [784, 0.19, 0.065], [1175, 0.32, 0.045], [880, 0.55, 0.03]].forEach(([f, at, vol]) => bell(f, at, vol));
        hiss(0.03, 1.2, { type: 'bandpass', f0: 2300, f1: 1300, q: 1.4, vol: 0.025, attack: 0.1 });
        buzz([14, 28, 12]);
      }
    },
    /** The dust bursts out, slows, twinkles down slowly and some glitter settles; the big gems tumble, land and glint. @param {number} sdt scene seconds @returns {void} */
    step(sdt) {
      for (let i = bits.length - 1; i >= 0; i -= 1) {
        const q = bits[i];
        q.age += sdt;
        if (q.age < 0) continue;
        if (q.age > q.life) { bits.splice(i, 1); continue; }
        if (q.kind === 'big') {
          if (q.landed) continue;
          q.vy += 900 * sc * sdt;
          q.vx *= Math.exp(-sdt * 0.8);
          q.x += q.vx * sdt;
          q.y += q.vy * sdt;
          q.rot += q.spin * sdt;
          q.ph += q.tumble * sdt;
          if (q.y >= q.floor && q.vy > 0) {
            q.y = q.floor;
            if (!CALM && q.bounce < 1) { q.vy *= -0.3; q.vx *= 0.45; q.spin *= 0.4; q.bounce += 1; } else {
              q.landed = true;
              q.ph = Math.round(q.ph / Math.PI) * Math.PI; // lies flat, face up
            }
          }
          continue;
        }
        if (q.settled) continue;
        const drag = Math.exp(-sdt * 3.2);
        q.vx *= drag;
        q.vy = q.vy * drag + q.fall * sc * sdt;
        const sway = CALM ? 0 : Math.sin(T * 2.2 + q.sway) * 9 * sc;
        q.x += (q.vx + sway) * sdt;
        q.y += q.vy * sdt;
        q.rot += q.spin * sdt;
        if (q.settleAt > 0 && q.age >= q.settleAt) q.settled = true;
      }
    },
    /** The glow, the rainbow ring, the pearl puff, the flying dust and the big gems. @param {CanvasRenderingContext2D} c context @param {object} p bump @returns {void} */
    over(c, p) {
      if (popT < 0) return;
      const t = T - popT;
      if (t < 0.45) { // a soft pearly flash
        const u = t / 0.45;
        const R = p.r * (2 + 3 * smooth(u));
        const g = c.createRadialGradient(p.x, p.y, 0, p.x, p.y, R);
        g.addColorStop(0, `rgba(255,255,255,${0.8 * (1 - u)})`);
        g.addColorStop(0.45, `rgba(232,212,255,${0.45 * (1 - u)})`);
        g.addColorStop(1, 'rgba(232,212,255,0)');
        c.fillStyle = g;
        c.beginPath(); c.arc(p.x, p.y, R, 0, Math.PI * 2); c.fill();
      }
      drawRainbowRing(c, p, t, big ? 5.5 : 4.5);
      if (t < 0.85) drawPearlPuff(c, puff, t);
      if (t < 0.28) { // one big white sparkle right at the pop
        const u = t / 0.28;
        c.save();
        c.globalAlpha = 1 - u;
        c.translate(p.x, p.y);
        if (!CALM) c.rotate(u * 0.6);
        sparklePath(c, p.r * (1.4 + 2 * smooth(u)) * (big ? 1.1 : 1.4));
        c.fillStyle = '#ffffff';
        c.fill();
        c.restore();
      }
      for (const q of bits) {
        if (q.age < 0 || (q.kind === 'glit' && q.settled)) continue;
        const tw = twinkleOf(q);
        c.save();
        c.globalAlpha = fadeOf(q);
        if (q.kind === 'glit') {
          c.globalAlpha *= 0.5 + 0.5 * tw;
          drawSpeck(c, q, tw);
        } else if (q.kind === 'gem') {
          const sz = q.size * (CALM ? 1 : 0.9 + 0.2 * tw);
          drawGem(c, q.gem, q.x, q.y, sz, q.rot, 1, tw ** 2, false);
        } else {
          const flip = Math.cos(q.ph);
          const face = Math.abs(flip);
          const flash = CALM ? 0.5 : Math.max(face > 0.93 && !q.landed ? 1 : 0, Math.max(0, Math.sin(realT * q.tf + q.gph)) ** 6);
          drawGem(c, q.gem, q.x, q.y, q.size, q.rot, flip, flash, true);
        }
        c.restore();
      }
    },
  };
}

export default { id: 'I', name: 'Unicorn gem pop', make: makeI };
