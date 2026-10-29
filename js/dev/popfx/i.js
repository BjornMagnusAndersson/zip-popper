// Pop effects test page, variant I: Unicorn gem pop. A look-and-feel test only (see popfx/shared.js for the hooks).
// A preview of the planned rare "Unicorn zit" (BUILD-PLAN P13): a pearly, sparkly bump that bursts into magic dust:
// a fountain of fine gem sand (diamond, sapphire, emerald, ruby) that pours down and dusts the cheek, hanging
// twinkly glitter and a soft rainbow ring. Cartoon only: no blood.
import { KIND, CALM, smooth, play, buzz, bell, hiss, sc, bp, face, T, realT, rand, sparklePath } from './shared.js';

// The gem sand's colours: diamond white and ice, sapphire, emerald and ruby, each in a bright, light and deep tone
// (the ruby leans pink so it never reads as blood).
const SAND = ['#ffffff', '#3f7ff2', '#2cc27a', '#ff4f93', '#d9f0ff', '#a9caff', '#a4f3c6', '#ffb8d4', '#ffffff', '#1b3c99', '#117443', '#bd1f62'];
// Glitter colours: the gem colours, their light tones and white.
const GLITTER = ['#ffffff', '#cfe9ff', '#3f7ff2', '#a9caff', '#2cc27a', '#a4f3c6', '#ff4f93', '#ffb8d4'];
// The pearly rainbow of the sheen, the ring and the goo puff (soft pastels).
const PEARL_HUES = ['#ffb0da', '#ffd9a6', '#b3f0cb', '#a9d6ff', '#cbb5ff', '#ffb0da'];
// The pearly goo puff's colours (a lilac-white pearl instead of plain white).
const PEARL = { body: '#fbf3ff', shade: '#dac6f2', edge: '#7e64a3', hi: '#ffffff' };

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

/** Is this point on the face (a little inside its edge)? @param {number} x x @param {number} y y @returns {boolean} on the face */
const onFace = (x, y) => ((x - face.cx) / face.rx) ** 2 + ((y - face.cy) / face.ry) ** 2 <= 0.9;

/** I: Unicorn gem pop. A pearly rainbow bump with glints; it bursts into gem sand, glitter, a rainbow ring and a pearl goo puff. @returns {object} the variant */
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
    /** Before the pop: the pearly sheen and glints. After: the gem sand that settled on the skin. @param {CanvasRenderingContext2D} c context @param {object} p bump @param {{amt: number}} lk look @returns {void} */
    afterBump(c, p, lk) {
      if (!bp.popped) { drawSheen(c, p, lk.amt, glints); return; }
      for (const q of bits) {
        if (!q.settled) continue;
        const tw = twinkleOf(q);
        c.save();
        c.globalAlpha = fadeOf(q) * (0.7 + 0.3 * tw);
        drawSpeck(c, q, q.star ? tw : Math.min(tw, 0.7));
        c.restore();
      }
    },
    /** The burst of magic dust: a fountain of gem sand, hanging glitter, the puff, a chime and a buzz. @returns {void} */
    pop() {
      popT = T;
      const ps = big ? 1 : 1.2;
      const np = big ? 8 : 7;
      puff = { ps, parts: Array.from({ length: np }, (_, i) => ({ a: (i / np) * Math.PI * 2 + rand() * 0.5, d: bp.r * ps * (0.7 + rand() * 0.45), r: bp.r * ps * (0.38 + rand() * 0.25) })) };
      const calmK = CALM ? 0.6 : 1;
      const nSand = Math.round((big ? 300 : 210) * calmK);
      for (let i = 0; i < nSand; i += 1) { // the gem sand: thrown up and out, it pours down and dusts the cheek below
        const a = -Math.PI / 2 + (rand() - 0.5) * Math.PI * 1.15;
        const v = (CALM ? 60 + rand() * 130 : 80 + rand() * 230) * sc * (big ? 1.1 : 1);
        bits.push({
          kind: 'sand', col: SAND[i % SAND.length], x: bp.x + (rand() - 0.5) * bp.r * 0.8, y: bp.y + (rand() - 0.5) * bp.r * 0.5,
          vx: Math.cos(a) * v, vy: Math.sin(a) * v, age: -rand() * (CALM ? 0.25 : 0.12), life: 3 + rand() * 1.2,
          size: (0.55 + rand() * 0.75) * Math.sqrt(sc) * (big ? 1.1 : 1), rot: rand() * Math.PI, spin: CALM ? 0 : (rand() - 0.5) * 8,
          fall: 320 + rand() * 140, floor: bp.y + bp.r * (0.5 + rand() * 2.8), tf: 4 + rand() * 6, ph: rand() * 6, star: i % 4 === 0, settled: false,
        });
      }
      const nGlit = Math.round((big ? 60 : 40) * calmK);
      for (let i = 0; i < nGlit; i += 1) { // the finest glitter, that hangs in the air and twinkles a while
        const a = rand() * Math.PI * 2;
        const v = (CALM ? 50 + rand() * 110 : 70 + rand() * 200) * sc;
        bits.push({
          kind: 'glit', col: GLITTER[i % GLITTER.length], x: bp.x, y: bp.y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 40 * sc,
          age: -rand() * 0.15, life: 1.6 + rand() * 1.4, size: (0.7 + rand() * 0.6) * Math.sqrt(sc) * (big ? 1.15 : 1),
          rot: Math.PI / 4, spin: 0, fall: 25 + rand() * 35, tf: 3.5 + rand() * 5, ph: rand() * 6, sway: rand() * 6, star: true, settled: false,
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
    /** The sand flies up, pours down and settles on the cheek (or falls off the face and fades); the glitter drifts and twinkles. @param {number} sdt scene seconds @returns {void} */
    step(sdt) {
      for (let i = bits.length - 1; i >= 0; i -= 1) {
        const q = bits[i];
        q.age += sdt;
        if (q.age < 0) continue;
        if (q.age > q.life) { bits.splice(i, 1); continue; }
        if (q.settled) continue;
        if (q.kind === 'sand') {
          const drag = Math.exp(-sdt * 1.8);
          q.vx *= drag;
          q.vy = q.vy * drag + q.fall * sc * sdt;
          q.x += q.vx * sdt;
          q.y += q.vy * sdt;
          q.rot += q.spin * sdt;
          if (q.vy > 0 && q.y >= q.floor) {
            if (onFace(q.x, q.y)) { q.y = q.floor; q.settled = true; } else { q.floor = Infinity; q.life = Math.min(q.life, q.age + 0.35); } // off the face it falls on and fades fast
          } else if (q.age > 0.25 && !onFace(q.x, q.y)) q.life = Math.min(q.life, q.age + 0.35); // flown past the face's edge: fades fast
          continue;
        }
        const drag = Math.exp(-sdt * 3.2);
        q.vx *= drag;
        q.vy = q.vy * drag + q.fall * sc * sdt;
        const sway = CALM ? 0 : Math.sin(T * 2.2 + q.sway) * 9 * sc;
        q.x += (q.vx + sway) * sdt;
        q.y += q.vy * sdt;
        q.rot += q.spin * sdt;
      }
    },
    /** The glow, the rainbow ring, the pearl puff, the flying sand and the glitter. @param {CanvasRenderingContext2D} c context @param {object} p bump @returns {void} */
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
        if (q.age < 0 || q.settled) continue;
        const tw = twinkleOf(q);
        c.save();
        c.globalAlpha = fadeOf(q) * (q.kind === 'sand' ? 0.75 + 0.25 * tw : 0.5 + 0.5 * tw);
        drawSpeck(c, q, q.star ? tw : Math.min(tw, 0.7));
        c.restore();
      }
    },
  };
}

export default { id: 'I', name: 'Unicorn gem pop', make: makeI };
