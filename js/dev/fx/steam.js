// Effect 9 for the light test page (fx-test.html): steam wisps. A cartoon tea cup on its saucer sits low in the
// frame, and thin ribbon-like wisps of steam curl up from it: each one rises, sways in a slow S, widens and fades,
// then lets go and a new one starts. Fire: a warm folded cloth is laid on the cheek, steam rises from it for a few
// seconds, then it lifts away and leaves a soft warm glow. Dingy studio (tier 0): the steam is a little grey; the
// better tiers: clean white. The wisps are drawn as soft strokes into a small low-res buffer and stretched over the
// stage (soft, cheap). Still: the wisps stand still; Fire fades the cloth in and out. Lite: fewer wisps.
// See the README in core.js for the effect interface.
import { clamp, smooth, TAU, rgba } from './sprites.js';

const INK = '#2a211d';
const SEGS = 18; // points along a wisp
// The cup per tier: body, band, rim colours.
const CUPS = [
  { body: '#e8dcc2', band: '#b89e74', rim: '#d8c9a8' },
  { body: '#fbf7f0', band: '#f48fb1', rim: '#ffffff' },
  { body: '#9fe3d6', band: '#ffd23f', rim: '#e8c55a' },
];

/**
 * Paint the tea cup on its saucer (ink outlines, a shine, tea inside), seen a little from above.
 * @param {CanvasRenderingContext2D} c the sprite's context
 * @param {number} w width
 * @param {number} h height
 * @param {object} col the cup's colours
 * @param {boolean} party dimmed for the party mood
 * @returns {void}
 */
function paintCup(c, w, h, col, party) {
  const lw = Math.max(1.5, w * 0.04);
  c.lineWidth = lw;
  c.strokeStyle = INK;
  c.lineJoin = 'round';
  const cx = w * 0.45;
  c.fillStyle = col.rim; // the saucer
  c.beginPath(); c.ellipse(cx, h * 0.86, w * 0.43, h * 0.11, 0, 0, TAU); c.fill(); c.stroke();
  c.fillStyle = 'rgba(0,0,0,0.12)';
  c.beginPath(); c.ellipse(cx, h * 0.84, w * 0.25, h * 0.06, 0, 0, TAU); c.fill();
  c.fillStyle = col.body; // the handle
  c.beginPath(); c.ellipse(cx + w * 0.31, h * 0.5, w * 0.13, h * 0.15, 0, 0, TAU); c.fill(); c.stroke();
  c.fillStyle = col.rim === '#ffffff' ? '#f3e9de' : col.rim;
  c.beginPath(); c.ellipse(cx + w * 0.31, h * 0.5, w * 0.06, h * 0.08, 0, 0, TAU); c.fill(); c.stroke();
  c.fillStyle = col.body; // the body: wide at the top, rounded below
  c.beginPath();
  c.moveTo(cx - w * 0.32, h * 0.3);
  c.bezierCurveTo(cx - w * 0.31, h * 0.68, cx - w * 0.2, h * 0.84, cx, h * 0.84);
  c.bezierCurveTo(cx + w * 0.2, h * 0.84, cx + w * 0.31, h * 0.68, cx + w * 0.32, h * 0.3);
  c.closePath();
  c.fill(); c.stroke();
  c.save(); // a band of colour round the middle, and a shine
  c.clip();
  c.fillStyle = col.band;
  c.fillRect(0, h * 0.46, w, h * 0.09);
  c.fillStyle = 'rgba(255,255,255,0.5)';
  c.beginPath(); c.ellipse(cx - w * 0.19, h * 0.55, w * 0.04, h * 0.17, 0.12, 0, TAU); c.fill();
  c.restore();
  c.fillStyle = col.rim; // the rim, and the tea
  c.beginPath(); c.ellipse(cx, h * 0.3, w * 0.32, h * 0.085, 0, 0, TAU); c.fill(); c.stroke();
  c.fillStyle = '#b86a32';
  c.beginPath(); c.ellipse(cx, h * 0.31, w * 0.26, h * 0.06, 0, 0, TAU); c.fill();
  c.fillStyle = 'rgba(255,230,190,0.55)';
  c.beginPath(); c.ellipse(cx - w * 0.08, h * 0.3, w * 0.08, h * 0.018, 0, 0, TAU); c.fill();
  if (party) { // the party's dim violet light, only over the cup
    c.globalCompositeOperation = 'source-atop';
    c.fillStyle = 'rgba(34,14,62,0.5)';
    c.fillRect(0, 0, w, h);
    c.globalCompositeOperation = 'source-over';
  }
}

/**
 * Paint the warm cloth as the game draws it (pop/art.js drawCloth): a soft pink folded towel with a soft shadow,
 * white fold stripes and a darker middle line (without the game's own little steam lines: the wisps do that here).
 * @param {CanvasRenderingContext2D} c the sprite's context
 * @param {number} w width (the towel is drawn a little smaller, so its shadow fits)
 * @param {number} h height
 * @returns {void}
 */
function paintCloth(c, w, h) {
  const r = w * 0.4;
  c.translate(w / 2, h / 2 - r * 0.06);
  c.shadowColor = 'rgba(70,30,30,0.3)';
  c.shadowBlur = r * 0.3;
  c.shadowOffsetY = r * 0.1;
  c.beginPath(); c.roundRect(-r, -r * 0.62, r * 2, r * 1.24, r * 0.28);
  c.fillStyle = '#ffb3c4';
  c.fill();
  c.shadowColor = 'transparent';
  c.strokeStyle = 'rgba(255,255,255,0.7)';
  c.lineWidth = Math.max(1.5, r * 0.08);
  for (const k of [-0.62, 0.62]) { c.beginPath(); c.moveTo(k * r, -r * 0.5); c.lineTo(k * r, r * 0.5); c.stroke(); }
  c.strokeStyle = 'rgba(200,90,120,0.35)';
  c.beginPath(); c.moveTo(-r * 0.9, 0); c.lineTo(r * 0.9, 0); c.stroke();
}

/**
 * Make the steam for this scene.
 * @param {object} env the page's env (see core.js README)
 * @returns {object} hooks
 */
function make(env) {
  const { W, H, sc, party, still, room } = env;
  const f = env.face;
  const rgb = party ? '236,222,255' : ['206,206,196', '240,240,234', '255,255,255'][env.tier] ?? '240,240,234';
  const baseA = party ? 0.42 : [0.5, 0.55, 0.6][env.tier] ?? 0.55;
  const scale = env.lite ? 0.35 : 0.5;
  // The cup, low in the frame at the left (the page's label sits at the bottom right).
  const cupW = clamp(58 * sc, 44, 90);
  const cupH = cupW * 0.82;
  const cupX = room.land ? W * 0.17 : W * 0.2;
  const cupBottom = H - 2;
  const cup = env.sprite(`steam-cup:${env.tier}:${party}`, Math.round(cupW), Math.round(cupH), (c, w, h) => paintCup(c, w, h, CUPS[env.tier] ?? CUPS[0], party));
  const mouth = { x: cupX - cupW * 0.5 + cupW * 0.45, y: cupBottom - cupH + cupH * 0.3 };
  // The cloth on the cheek (the customer's right cheek, on the left of the picture).
  const clothW = f ? f.rx * 0.85 : 90 * sc;
  const clothH = clothW * 0.72;
  const cloth = env.sprite('steam-cloth', Math.round(clothW), Math.round(clothH), (c, w, h) => paintCloth(c, w, h));
  const cheek = f ? { x: f.cx - f.rx * 0.52, y: f.cy + f.ry * 0.34 } : { x: W * 0.35, y: H * 0.55 };
  const warm = env.glow('255,140,140', 64);

  /** A wisp: where it starts, how tall, how it curls, and when its rise cycle starts. @param {number} x start x @param {number} y start y @param {number} i which @param {number} len height @returns {object} wisp */
  const wisp = (x, y, i, len) => ({
    x, y, len, amp: (8 + env.rand() * 7) * sc, k: (TAU / len) * (1.1 + env.rand() * 0.6), w: 1.3 + env.rand() * 0.8,
    ph: env.rand() * TAU, period: 3 + env.rand() * 1.4, off: i * 1.1 + env.rand() * 0.6, width: (3 + env.rand() * 1.6) * sc,
    lean: (env.rand() - 0.4) * 0.3,
  });
  const cupWisps = [];
  for (let i = 0, n = env.count(4); i < n; i += 1) cupWisps.push(wisp(mouth.x + (i - 1.5) * cupW * 0.1, mouth.y, i, H * (0.24 + env.rand() * 0.1)));
  const clothWisps = [];
  for (let i = 0, n = env.count(6); i < n; i += 1) clothWisps.push(wisp(cheek.x + (i - 2.5) * clothW * 0.15, cheek.y - clothH * 0.3, i * 0.6, (f ? f.ry : H * 0.3) * (0.7 + env.rand() * 0.35)));
  let tt = -1; // seconds since Fire
  let fired = 0;

  /** The scene clock for drifting things (frozen when still). @returns {number} seconds */
  const clock = () => (still ? 1.7 : env.t);

  /**
   * Draw one wisp into the buffer: a soft ribbon rising and curling, wider and fainter as it goes up; its visible
   * stretch climbs the column through its cycle, so it lets go at the bottom and fades out at the top.
   * @param {CanvasRenderingContext2D} b buffer context
   * @param {object} p wisp
   * @param {number} t seconds
   * @param {number} strength 0..1
   * @returns {void}
   */
  function drawWisp(b, p, t, strength) {
    const u = (((t + p.off) / p.period) % 1 + 1) % 1;
    const head = Math.min(1, u * 1.5);
    const tail = Math.max(0, u * 1.5 - 0.62);
    if (head - tail < 0.02) return;
    let px = 0;
    let py = 0;
    for (let i = 0; i <= SEGS; i += 1) {
      const s = tail + ((head - tail) * i) / SEGS; // 0 at the source .. 1 at the top
      const hgt = s * p.len;
      const amp = p.amp * (0.2 + s * 1.4);
      const x = p.x + Math.sin(p.k * hgt - t * p.w + p.ph) * amp + p.lean * hgt + Math.sin(t * 0.4 + p.ph) * s * 8 * sc;
      const y = p.y - hgt;
      if (i) {
        const along = (i - 0.5) / SEGS; // fade in at the tail and out at the head of the visible stretch
        const a = strength * baseA * smooth(along * 4) * smooth((1 - along) * 3) * (1 - s * 0.75);
        if (a > 0.004) {
          const wdt = p.width * (1 + s * 2.5);
          b.globalAlpha = clamp(a * 0.28, 0, 1); // a soft wide edge
          b.lineWidth = wdt * 2.6;
          b.beginPath(); b.moveTo(px, py); b.lineTo(x, y); b.stroke();
          b.globalAlpha = clamp(a * 0.8, 0, 1); // the brighter core
          b.lineWidth = wdt;
          b.beginPath(); b.moveTo(px, py); b.lineTo(x, y); b.stroke();
        }
      }
      px = x;
      py = y;
    }
  }

  /** How the cloth is now: shown (0..1), lift (px up as it leaves), the steam from it, the warm glow after. @returns {{show: number, lift: number, steam: number, glow: number, pop: number}} levels */
  function clothNow() {
    if (tt < 0) return { show: 0, lift: 0, steam: 0, glow: 0, pop: 1 };
    const fadeIn = still ? smooth(tt / 0.8) : smooth(tt / 0.18);
    const leave = smooth((tt - 3.2) / 0.6);
    const pop = still ? 1 : 1 + 0.12 * Math.exp(-tt * 6) * Math.sin(tt * 20 + 1.5) - 0.2 * (1 - smooth(tt / 0.12));
    return {
      show: fadeIn * (1 - leave), lift: still ? 0 : leave * 26 * sc,
      steam: smooth((tt - 0.15) / 0.7) * (1 - smooth((tt - 3.3) / 0.9)), glow: smooth((tt - 3.1) / 0.4) * (1 - smooth((tt - 3.6) / 1.6)), pop,
    };
  }

  return {
    /** Move Fire's clock on (the wisps are worked out from the scene clock). @param {number} dt seconds @returns {void} */
    step(dt) {
      if (tt >= 0) { tt += dt; if (tt > 5.4) tt = -1; }
    },
    /** The cup, the cloth and the warm glow, then all the steam in one soft buffer. @param {CanvasRenderingContext2D} c stage context @returns {void} */
    draw(c) {
      const t = clock();
      const C = clothNow();
      c.drawImage(cup, cupX - cupW * 0.5, cupBottom - cupH, cupW, cupH);
      if (C.glow > 0.01) { // the warm, rosy cheek where the cloth was
        c.globalCompositeOperation = 'source-over';
        c.globalAlpha = clamp(C.glow * 0.35, 0, 1);
        const r = clothW * 0.75;
        c.drawImage(warm, cheek.x - r, cheek.y - r * 0.7, r * 2, r * 1.4);
        c.globalAlpha = 1;
      }
      if (C.show > 0.01) {
        c.save();
        c.globalAlpha = clamp(C.show, 0, 1);
        c.translate(cheek.x, cheek.y - C.lift);
        c.rotate(-0.12);
        c.scale(C.pop, C.pop);
        c.drawImage(cloth, -clothW / 2, -clothH / 2, clothW, clothH);
        c.restore();
      }
      const buf = env.buffer('steam', scale);
      const b = buf.ctx;
      b.strokeStyle = rgba(rgb, 1);
      b.lineCap = 'round';
      for (const p of cupWisps) drawWisp(b, p, t, 1);
      if (C.steam > 0.01) for (const p of clothWisps) drawWisp(b, p, t * 1.25, C.steam * 0.9);
      c.globalAlpha = 1;
      c.drawImage(buf.canvas, 0, 0, W, H);
    },
    /** The warm cloth on the cheek, steaming. @returns {void} */
    trigger() { tt = 0; fired += 1; },
    /** Counts for checks. @returns {object} state */
    state: () => ({ wisps: cupWisps.length, clothWisps: clothWisps.length, fired, cloth: Math.round(clothNow().show * 100) / 100 }),
  };
}

export default { id: 'steam', num: 9, name: 'Steam', layer: 'front', order: 45, make };
