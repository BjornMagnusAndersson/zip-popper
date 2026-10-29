// Pop effects test page, variant D: The goo noodle. A look-and-feel test only (see popfx/shared.js for the hooks).
import { KIND, CALM, smooth, clamp, later, buzz, noiseBuf, audioOut, tone, hiss, H, sc, face, bp, holdId, T, realT, rand, drops, squirt } from './shared.js';
import { gooLook } from '../../pop/art.js';

/** The noodle snapping off (D): a round "plop" and a smaller wet echo. @param {boolean} big the big bump @returns {void} */
function plop(big) {
  tone(big ? 380 : 520, big ? 85 : 120, 0, 0.16, 0.36);
  hiss(0, 0.09, { type: 'lowpass', f0: 900, f1: 300, vol: 0.12 });
  tone(big ? 190 : 260, big ? 120 : 165, 0.1, 0.12, 0.12);
}

/**
 * The goo noodle's squeeze-out sound (D): one long, soft, wet stretch whose pitch rises as the noodle grows, with
 * two slow wobbles at uneven speeds so it never turns into evenly repeated bursts. Call set(k) as it grows, stop() at the end.
 * @param {boolean} big the big bump (lower)
 * @returns {{set: (k: number) => void, stop: () => void}|null} the running sound, or null without audio
 */
function squeezeHum(big) {
  const a = audioOut();
  if (!a) return null;
  const { ac } = a;
  const t0 = ac.currentTime + 0.01;
  const out = ac.createGain();
  out.gain.setValueAtTime(0.0001, t0);
  out.gain.exponentialRampToValueAtTime(0.06, t0 + 0.12);
  out.connect(a.out);
  const base = big ? 78 : 100;
  const osc = ac.createOscillator();
  osc.type = 'triangle';
  osc.frequency.value = base;
  const lp = ac.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = 380;
  const og = ac.createGain();
  og.gain.value = 0.7;
  osc.connect(lp).connect(og).connect(out);
  const src = ac.createBufferSource();
  src.buffer = noiseBuf;
  src.loop = true;
  const bp = ac.createBiquadFilter();
  bp.type = 'bandpass';
  bp.frequency.value = 340;
  bp.Q.value = 1.4;
  const ng = ac.createGain();
  ng.gain.value = 0.55;
  src.connect(bp).connect(ng).connect(out);
  const lfos = [[2.3, 70, bp.frequency], [3.7, 0.25, ng.gain], [1.3, 6, osc.frequency]].map(([hz, depth, param]) => {
    const l = ac.createOscillator();
    l.frequency.value = hz;
    const d = ac.createGain();
    d.gain.value = depth;
    l.connect(d).connect(param);
    l.start(t0);
    return l;
  });
  osc.start(t0);
  src.start(t0);
  let stopped = false;
  return {
    /** Follow the noodle's growth. @param {number} k 0..1 @returns {void} */
    set(k) {
      if (stopped) return;
      osc.frequency.setTargetAtTime(base + k * (big ? 55 : 80), ac.currentTime, 0.06);
      bp.frequency.setTargetAtTime(300 + k * 520, ac.currentTime, 0.06);
    },
    /** Fade out and stop. @returns {void} */
    stop() {
      if (stopped) return;
      stopped = true;
      const t = ac.currentTime;
      out.gain.setTargetAtTime(0.0001, t, 0.03);
      for (const n of [osc, src, ...lfos]) { try { n.stop(t + 0.25); } catch { /* already stopped */ } }
    },
  };
}

// D's own colours for the big bump's goo: a richer, sunnier yellow than the game's cream (the white stays the game's).
const YELLOW = { body: '#ffe27a', shade: '#ecb53c', edge: '#946318', hi: '#fffbe4' };

/**
 * A thick, glossy goo noodle (D) in the goo's colours: fat at the root, thinner towards a round tip. Drawn in short
 * pieces in order, so where a later loop crosses an earlier one it shows its own dark rim and reads as lying on top.
 * @param {CanvasRenderingContext2D} c context
 * @param {{x: number, y: number}[]} pts the noodle's middle line, from the root to the tip
 * @param {(i: number) => number} wAt the thickness at point i
 * @param {{body: string, shade: string, edge: string, hi: string}} look the goo colours
 * @param {{head?: boolean, root?: boolean}} [o] head = draw the round tip (on unless false), root = a little dome of goo where it comes out
 * @returns {void}
 */
function drawNoodle(c, pts, wAt, look, o = {}) {
  const n = pts.length;
  if (n < 2) return;
  /** Stroke part of the line, shifted. @param {number} from first point @param {number} to last point @param {number} dx shift @param {number} dy shift @returns {void} */
  const line = (from, to, dx, dy) => {
    c.beginPath();
    c.moveTo(pts[from].x + dx, pts[from].y + dy);
    for (let i = from + 1; i <= to; i += 1) c.lineTo(pts[i].x + dx, pts[i].y + dy);
    c.stroke();
  };
  c.lineCap = 'round';
  c.lineJoin = 'round';
  c.strokeStyle = 'rgba(110,60,30,0.18)'; // soft shadow on the skin
  c.lineWidth = wAt(n >> 1) + 3;
  line(0, n - 1, wAt(0) * 0.3, wAt(0) * 0.5);
  if (o.root) blob(c, pts[0].x, pts[0].y, wAt(0) * 0.78, look);
  const piece = 8;
  for (let i = 0; i < n - 1; i += piece) {
    const to = Math.min(n - 1, i + piece);
    const w = wAt((i + to) / 2);
    // The fill starts a little before the piece, over the end of the last one, with flat ends: the join (and this
    // piece's dark rim, which starts at i) is painted over exactly as before, so no seam shows; only the rim's sides stay.
    let from = i;
    for (let back = 0; from > 0 && back < w / 2 + 2.5; from -= 1) back += Math.hypot(pts[from].x - pts[from - 1].x, pts[from].y - pts[from - 1].y);
    c.lineCap = 'round';
    c.strokeStyle = look.edge;
    c.lineWidth = w + 2.4;
    line(i, to, 0, 0);
    if (i > 0) c.lineCap = 'butt';
    c.strokeStyle = look.shade;
    c.lineWidth = w;
    line(from, to, 0, 0);
    c.strokeStyle = look.body;
    c.lineWidth = w * 0.62;
    line(from, to, -w * 0.1, -w * 0.14);
    c.strokeStyle = look.hi;
    c.lineWidth = Math.max(1, w * 0.2);
    line(from, to, -w * 0.2, -w * 0.26);
  }
  c.lineCap = 'round';
  if (o.head === false) return;
  const e = pts[n - 1];
  blob(c, e.x, e.y, wAt(n - 1) * 0.55, look);
}

/**
 * A round, shiny goo blob (the noodle's tip, or the little dome where it comes out of the bump).
 * @param {CanvasRenderingContext2D} c context
 * @param {number} x middle
 * @param {number} y middle
 * @param {number} r radius
 * @param {{body: string, shade: string, edge: string, hi: string}} look the goo colours
 * @returns {void}
 */
function blob(c, x, y, r, look) {
  c.fillStyle = look.edge;
  c.beginPath(); c.arc(x, y, r + 1.2, 0, Math.PI * 2); c.fill();
  c.fillStyle = look.shade;
  c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fill();
  c.fillStyle = look.body;
  c.beginPath(); c.arc(x - r * 0.12, y - r * 0.16, r * 0.72, 0, Math.PI * 2); c.fill();
  c.fillStyle = look.hi;
  c.beginPath(); c.arc(x - r * 0.36, y - r * 0.4, Math.max(0.8, r * 0.26), 0, Math.PI * 2); c.fill();
}

/**
 * The way the noodle comes out (D): square to the squeeze so it clears both cartoon fingers, then turned towards the
 * outside of the cheek and downwards, so it never heads up towards the eyes.
 * @returns {number} angle in radians (0 = right, PI / 2 = down)
 */
function outDir() {
  const pref = bp.x >= face.cx ? 0.85 : Math.PI - 0.85; // out over the cheek and down
  const p1 = bp.axis + Math.PI / 2;
  const p2 = bp.axis - Math.PI / 2;
  let d = Math.cos(p1 - pref) >= Math.cos(p2 - pref) ? p1 : p2;
  d += clamp(Math.atan2(Math.sin(pref - d), Math.cos(pref - d)), -0.55, 0.55);
  d = Math.atan2(Math.sin(d), Math.cos(d));
  return clamp(d, -0.15, Math.PI + 0.15); // never upwards
}

/** D: the goo noodle. A glossy goo string squeezes out while held, sags and curls over itself, then snaps off with a plop and a wobble; little drops after. @returns {object} the variant */
function makeD() {
  const big = KIND === 'big';
  const look = big ? { ...gooLook(bp.goo), ...YELLOW } : gooLook(bp.goo);
  const dir = outDir();
  const side = Math.cos(dir) >= 0 ? 1 : -1; // the curls bulge to the lower side
  let w = 0; // thickness a way out (fatter at the root, thinner at the tip)
  let maxLen = 0;
  let lead = 0; // the straight part before the curls
  let b = 0; // curl radius
  let adv = 0; // how far each curl moves on (small = the curls pile up)
  const spine = []; // the middle line the curls ride along (1 px steps)
  /**
   * Set the noodle's size (f = 1 full size, smaller where the face has little room below the bump) and lay out the
   * middle line the curls ride along: out along dir, bending down under its own weight.
   * @param {number} f size factor
   * @returns {void}
   */
  const shape = (f) => {
    w = bp.r * (big ? 0.62 : 0.78) * Math.sqrt(f);
    maxLen = bp.r * (big ? 12 : 8) * f;
    lead = bp.r * (big ? 1.2 : 1.1) * f;
    b = bp.r * (big ? 0.9 : 0.95) * Math.max(f, 0.8);
    adv = b * (big ? 0.32 : 0.5);
    spine.length = 0;
    let x = bp.x;
    let y = bp.y;
    const reach = lead + adv * ((maxLen - lead) / b) + b * 2 + 4;
    for (let q = 0; q <= reach; q += 1) {
      const h = dir + (Math.PI / 2 - dir) * 0.5 * smooth((q - lead * 0.6) / (bp.r * 4));
      spine.push({ x, y, h });
      x += Math.cos(h);
      y += Math.sin(h);
    }
  };
  /** Thickness at a length from the root: fat where it comes out, tapering off. @param {number} s length @returns {number} px */
  const wAtS = (s) => w * (0.78 + 0.45 * Math.exp(-s / lead));
  let len = 0;
  let hum = null;
  let snap = null; // {at, pts, cx, cy, base}
  const after = [];
  /** The noodle's middle line for a length (2 px steps): out straight, then curls that cross over themselves. @param {number} L length @returns {{x: number, y: number}[]} points */
  const path = (L) => {
    const out = [];
    for (let s = 0; s <= L; s += 2) {
      let along = s;
      let across = 0;
      if (s > lead) {
        const th = (s - lead) / b;
        along = lead + adv * th + b * Math.sin(th);
        across = b * (1 - Math.cos(th)) * side;
      }
      const sp = spine[clamp(Math.round(along), 0, spine.length - 1)];
      const wig = CALM || snap ? 0 : Math.sin(s * 0.09 - realT * 7) * 1.1 * sc * (s / Math.max(1, L));
      const droop = ((s / maxLen) ** 2) * bp.r * 0.6; // a little extra sag, as goo has weight
      const k = across + wig;
      out.push({ x: sp.x - Math.sin(sp.h) * k, y: sp.y + Math.cos(sp.h) * k + droop });
    }
    return out;
  };
  // Full size first; if the whole noodle would hang off the chin, past the cheek's edge or onto the help line, shrink it to fit.
  shape(1);
  {
    const full = path(maxLen);
    const out = bp.x >= face.cx ? 1 : -1;
    const bottom = Math.min(face.cy + face.ry * 0.9, H - 58) - w;
    const edge = face.cx + out * face.rx * 0.98 - out * w;
    const low = Math.max(...full.map((q) => q.y)) - bp.y;
    const wide = Math.max(...full.map((q) => (q.x - bp.x) * out));
    const f = Math.min(1, (bottom - bp.y) / Math.max(1, low), ((edge - bp.x) * out) / Math.max(1, wide));
    if (f < 0.98) shape(clamp(f, 0.45, 1));
  }
  return {
    /** The noodle grows with the squeeze (and goes back in if let go); the squeeze sound follows it. After the snap, the drips. @param {number} sdt scene seconds @returns {void} */
    step(sdt) {
      if (!bp.popped) {
        const k = smooth((bp.pressure - 0.22) / 0.78);
        len = maxLen * k;
        if (holdId !== null && k > 0.01 && !hum) hum = squeezeHum(big);
        if (hum) hum.set(k);
        if (holdId === null && hum) { hum.stop(); hum = null; }
        return;
      }
      for (let i = after.length - 1; i >= 0; i -= 1) {
        if (T - snap.at < after[i]) continue;
        after.splice(i, 1);
        const a = Math.PI / 2 + (rand() - 0.5) * 2;
        const v = (20 + rand() * 40) * sc;
        drops.push({ x: bp.x, y: bp.y, z: 0.1, vx: Math.cos(a) * v, vy: Math.sin(a) * v, vz: 90 + rand() * 80, r: (1.6 + rand() * 1.8) * sc, goo: bp.goo });
      }
    },
    /** The snap: the noodle breaks off at the root, a few drops fly, a plop and a buzz. @returns {void} */
    pop() {
      hum?.stop();
      hum = null;
      const pts = path(len);
      const base = Math.round((lead * 0.45) / 2);
      const tail = pts.slice(base);
      const cx = tail.reduce((s, q) => s + q.x, 0) / tail.length;
      const cy = tail.reduce((s, q) => s + q.y, 0) / tail.length;
      snap = { at: T, pts: tail, cx, cy, base };
      squirt(bp, { strands: 0, drops: big ? 7 : 5, speed: 0.8, size: 1.1 });
      after.push(0.14, 0.33, 0.6, big ? 0.85 : 0.5);
      plop(big);
      later(0.13, 'squelch');
      buzz(big ? [50, 30, 30] : 35);
    },
    /** The noodle: growing from the bump, or snapped off and wobbling. @param {CanvasRenderingContext2D} c context @returns {void} */
    over(c) {
      if (!snap) {
        if (len < 2) return;
        const grow = 0.7 + 0.3 * smooth(len / (lead * 2)); // thin as it starts, full once out
        drawNoodle(c, path(len), (i) => wAtS(i * 2) * grow, look, { root: true });
        return;
      }
      const t = T - snap.at;
      const alpha = t > 2.6 ? Math.max(0, 1 - (t - 2.6) / 0.6) : 1;
      if (alpha <= 0) return;
      const cut = Math.round((smooth(t / 0.2) * (lead * 0.7)) / 2); // the loose end pulls back into the curls
      const pts = snap.pts.slice(Math.min(cut, snap.pts.length - 2));
      const q = CALM ? 0 : 0.16 * Math.exp(-t * 4.5) * Math.sin(t * 22);
      const fall = (CALM ? 1 : 1 - Math.exp(-t * 9) * Math.cos(t * 18)) * 6 * sc; // a little "plop" down
      c.save();
      c.globalAlpha = alpha;
      c.translate(snap.cx, snap.cy + fall);
      c.scale(1 + q, 1 - q);
      c.translate(-snap.cx, -snap.cy);
      drawNoodle(c, pts, (i) => wAtS((i + snap.base + cut) * 2), look);
      c.restore();
      const stub = Math.max(0, 1 - t / 0.16); // the little stub left on the bump goes back in
      if (stub > 0) {
        const sp = path(lead * 0.45 * stub + 2).slice(0, Math.max(2, Math.round((lead * 0.45 * stub) / 2)));
        drawNoodle(c, sp, (i) => wAtS(i * 2) * (0.6 + 0.4 * stub), look, { root: true });
      }
    },
    /** Stop the squeeze sound (a reset). @returns {void} */
    stop() { hum?.stop(); hum = null; },
  };
}

export default { id: 'D', name: 'The goo noodle', make: makeD };
