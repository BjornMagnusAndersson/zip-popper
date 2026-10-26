// Drawings for the pop scene, all made in code on canvas (no pictures, no photos, no real people): skin with pores,
// the bumps (whitehead, pink, blackhead, big, golden bonus), glossy goo worms and drops (cream-coloured, never blood),
// the pink marks that fade, a blackhead strip with its peel, a cotton pad, cream dollops and tweezers. The face itself
// is drawn in face.js. engine.js moves all of it.
import { rng } from './logic.js';

const GOO = { body: '#f6eecb', edge: '#cdb57a', hi: 'rgba(255,255,255,0.8)' };
const GOLD_GOO = { body: '#ffe27a', edge: '#d9a520', hi: 'rgba(255,255,240,0.9)' };

/**
 * A new canvas of a size in CSS pixels, sharp on phones (dpr = device pixels per CSS pixel).
 * @param {number} w width
 * @param {number} h height
 * @param {number} dpr pixel ratio
 * @returns {{canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D}} the canvas, already scaled
 */
export function makeCanvas(w, h, dpr) {
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(w * dpr));
  canvas.height = Math.max(1, Math.round(h * dpr));
  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return { canvas, ctx };
}

/**
 * Paint skin into a rectangle: warm base, soft blotches, fine grain, pores and a gentle sheen.
 * @param {CanvasRenderingContext2D} ctx where to paint (CSS pixel units)
 * @param {number} w width
 * @param {number} h height
 * @param {number} dpr pixel ratio (for the grain)
 * @param {number} seed seed for the random details
 * @param {{poreSize?: number, redness?: number, tone?: string[]}} [o] pore scale, how red the skin is (0..1) and the
 *   skin colours as three '#rrggbb' stops (light, middle, shaded); a warm light tone when left out
 * @returns {void}
 */
export function paintSkin(ctx, w, h, dpr, seed, o = {}) {
  const rand = rng(seed);
  const pore = o.poreSize ?? 1;
  const tone = o.tone ?? ['#f3caa9', '#ebb795', '#dea385'];
  const base = ctx.createLinearGradient(0, 0, w, h);
  base.addColorStop(0, tone[0]);
  base.addColorStop(0.55, tone[1]);
  base.addColorStop(1, tone[2]);
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, w, h);
  // Soft blotches, a little redder or lighter here and there.
  for (let i = 0; i < 46; i += 1) {
    const x = rand() * w;
    const y = rand() * h;
    const r = 20 + rand() * 80;
    const warm = rand() < 0.55;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, warm ? `rgba(214,120,100,${0.05 + 0.05 * (o.redness ?? 0.5)})` : 'rgba(255,232,214,0.09)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }
  // Fine grain, made once as a small tile of noise and laid over the whole skin.
  try {
    const tile = Math.round(96 * dpr);
    const { canvas: nc, ctx: nx } = makeCanvas(tile, tile, 1);
    const img = nx.createImageData(tile, tile);
    for (let i = 0; i < img.data.length; i += 4) {
      const v = rand() * 255;
      img.data[i] = v; img.data[i + 1] = v * 0.8; img.data[i + 2] = v * 0.7; img.data[i + 3] = 22;
    }
    nx.putImageData(img, 0, 0);
    ctx.save();
    ctx.scale(1 / dpr, 1 / dpr);
    ctx.fillStyle = ctx.createPattern(nc, 'repeat');
    ctx.globalCompositeOperation = 'multiply';
    ctx.fillRect(0, 0, w * dpr, h * dpr);
    ctx.restore();
  } catch { /* no image data (very old browsers): smooth skin is fine too */ }
  // Pores: tiny dark dips with a light lower rim.
  const pores = Math.round((w * h) / (150 * pore * pore));
  for (let i = 0; i < pores; i += 1) {
    const x = rand() * w;
    const y = rand() * h;
    const r = (0.45 + rand() * 0.75) * pore;
    ctx.fillStyle = `rgba(140,70,52,${0.16 + rand() * 0.2})`;
    ctx.beginPath();
    ctx.ellipse(x, y, r, r * 0.8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,236,222,0.22)';
    ctx.beginPath();
    ctx.ellipse(x, y + r * 0.9, r * 0.9, r * 0.4, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  // A few fine lines in the skin.
  ctx.strokeStyle = 'rgba(160,90,70,0.07)';
  ctx.lineWidth = 0.8;
  for (let i = 0; i < 10; i += 1) {
    const x = rand() * w;
    const y = rand() * h;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.quadraticCurveTo(x + 20 + rand() * 30, y + (rand() - 0.5) * 20, x + 40 + rand() * 50, y + (rand() - 0.5) * 16);
    ctx.stroke();
  }
  // Sheen from a soft light above left.
  const sheen = ctx.createRadialGradient(w * 0.3, h * 0.2, 0, w * 0.3, h * 0.2, Math.max(w, h) * 0.8);
  sheen.addColorStop(0, 'rgba(255,245,235,0.18)');
  sheen.addColorStop(1, 'rgba(120,60,40,0.08)');
  ctx.fillStyle = sheen;
  ctx.fillRect(0, 0, w, h);
}

/**
 * One pimple. amt = how hard it is squeezed (0..1, plus wobble); appear = 0..1 while it grows in.
 * @param {CanvasRenderingContext2D} ctx the context
 * @param {{x: number, y: number, r: number, type: string}} p the pimple
 * @param {number} amt squeeze
 * @param {number} appear growth
 * @param {number} time seconds (for the golden twinkle)
 * @returns {void}
 */
export function drawPimple(ctx, p, amt, appear, time) {
  const s = p.r * appear * (1 + 0.45 * amt);
  if (s <= 0.3) return;
  const { x, y, type } = p;
  const halo = {
    red: ['rgba(232,104,104,0.55)', 2.5], whitehead: ['rgba(232,128,116,0.36)', 1.9], big: ['rgba(226,96,96,0.58)', 2.3],
    blackhead: ['rgba(170,110,90,0.16)', 1.6], gold: ['rgba(255,196,70,0.5)', 2.3],
  }[type] ?? ['rgba(232,128,116,0.36)', 1.9];
  const hr = s * halo[1];
  const g = ctx.createRadialGradient(x, y, s * 0.4, x, y, hr);
  g.addColorStop(0, halo[0]);
  g.addColorStop(1, 'rgba(232,104,104,0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, hr, 0, Math.PI * 2);
  ctx.fill();
  // Shadow under the bump (makes it stand up from the skin).
  ctx.fillStyle = 'rgba(120,50,40,0.16)';
  ctx.beginPath();
  ctx.ellipse(x + s * 0.18, y + s * 0.3, s * 1.0, s * 0.85, 0, 0, Math.PI * 2);
  ctx.fill();
  if (type === 'blackhead') {
    const rim = ctx.createRadialGradient(x - s * 0.3, y - s * 0.3, 0, x, y, s * 1.2);
    rim.addColorStop(0, '#f6d0b4');
    rim.addColorStop(1, 'rgba(226,170,140,0)');
    ctx.fillStyle = rim;
    ctx.beginPath(); ctx.arc(x, y, s * 1.2, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#3a2a22';
    ctx.beginPath(); ctx.arc(x, y, s * (0.5 + 0.1 * amt), 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.45)';
    ctx.beginPath(); ctx.arc(x - s * 0.18, y - s * 0.18, s * 0.14, 0, Math.PI * 2); ctx.fill();
    return;
  }
  const dome = ctx.createRadialGradient(x - s * 0.3, y - s * 0.35, s * 0.1, x, y, s * 1.05);
  if (type === 'gold') {
    dome.addColorStop(0, '#fff8d0'); dome.addColorStop(0.5, '#f6cc4a'); dome.addColorStop(1, 'rgba(214,140,30,0.2)');
  } else {
    dome.addColorStop(0, '#ffc9bf'); dome.addColorStop(0.55, type === 'whitehead' ? '#f0a092' : '#ea7c78'); dome.addColorStop(1, 'rgba(206,92,88,0.15)');
  }
  ctx.fillStyle = dome;
  ctx.beginPath(); ctx.arc(x, y, s, 0, Math.PI * 2); ctx.fill();
  // The creamy head: always on whiteheads and big ones, grows on pink ones as they are squeezed.
  const headR = type === 'whitehead' ? s * (0.55 + 0.15 * amt)
    : type === 'big' ? s * (0.42 + 0.2 * amt)
      : type === 'red' ? s * 0.38 * Math.min(1, amt * 1.4) : 0;
  if (headR > 0.5) {
    const hd = ctx.createRadialGradient(x - headR * 0.3, y - headR * 0.35, 0, x, y, headR);
    hd.addColorStop(0, '#fffef6'); hd.addColorStop(0.6, '#f7ecbe'); hd.addColorStop(1, '#e6cf8c');
    ctx.fillStyle = hd;
    ctx.beginPath(); ctx.arc(x, y - s * 0.05, headR, 0, Math.PI * 2); ctx.fill();
  }
  // Shine: stretched skin shines more.
  ctx.fillStyle = `rgba(255,255,255,${0.45 + 0.4 * Math.min(1, amt)})`;
  ctx.beginPath();
  ctx.ellipse(x - s * 0.36, y - s * 0.42, s * 0.26, s * 0.15, -0.6, 0, Math.PI * 2);
  ctx.fill();
  if (type === 'gold') drawTwinkle(ctx, x + s * 0.55, y - s * 0.6, s * (0.45 + 0.25 * Math.sin(time * 5 + x)), 0.9);
}

/**
 * A four-pointed twinkle star.
 * @param {CanvasRenderingContext2D} ctx the context
 * @param {number} x centre x
 * @param {number} y centre y
 * @param {number} r size
 * @param {number} alpha opacity
 * @returns {void}
 */
export function drawTwinkle(ctx, x, y, r, alpha) {
  if (r <= 0) return;
  ctx.fillStyle = `rgba(255,252,220,${alpha})`;
  ctx.beginPath();
  ctx.moveTo(x, y - r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.quadraticCurveTo(x, y, x, y + r);
  ctx.quadraticCurveTo(x, y, x - r, y);
  ctx.quadraticCurveTo(x, y, x, y - r);
  ctx.fill();
}

/**
 * The soft pink mark left where a pimple was (it fades away when the skin heals; never a wound).
 * @param {CanvasRenderingContext2D} ctx the context
 * @param {{x: number, y: number, r: number}} m the mark
 * @param {number} alpha opacity
 * @returns {void}
 */
export function drawMark(ctx, m, alpha = 1) {
  const g = ctx.createRadialGradient(m.x, m.y, 0, m.x, m.y, m.r * 1.5);
  g.addColorStop(0, `rgba(236,128,124,${0.42 * alpha})`);
  g.addColorStop(1, 'rgba(236,128,124,0)');
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(m.x, m.y, m.r * 1.5, 0, Math.PI * 2); ctx.fill();
}

/**
 * A worm of glossy goo (like toothpaste out of a tube): outline, body and a shiny streak.
 * @param {CanvasRenderingContext2D} ctx the context
 * @param {{pts: {x: number, y: number}[], w: number, gold?: boolean, tip?: boolean}} s the strand (tip = dark blackhead tip)
 * @returns {void}
 */
export function drawStrand(ctx, s) {
  const pts = s.pts;
  if (!pts.length) return;
  const c = s.gold ? GOLD_GOO : GOO;
  /** Trace the strand's line, shifted a little. @param {number} dx shift x @param {number} dy shift y @returns {void} */
  const trace = (dx, dy) => {
    ctx.beginPath();
    ctx.moveTo(pts[0].x + dx, pts[0].y + dy);
    for (let i = 1; i < pts.length; i += 1) ctx.lineTo(pts[i].x + dx, pts[i].y + dy);
    if (pts.length === 1) ctx.lineTo(pts[0].x + dx + 0.01, pts[0].y + dy);
  };
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = 'rgba(110,70,40,0.18)'; // soft shadow on the skin
  ctx.lineWidth = s.w + 2;
  trace(s.w * 0.25, s.w * 0.35); ctx.stroke();
  ctx.strokeStyle = c.edge;
  ctx.lineWidth = s.w + 1.2;
  trace(0, 0); ctx.stroke();
  ctx.strokeStyle = c.body;
  ctx.lineWidth = s.w;
  trace(0, 0); ctx.stroke();
  ctx.strokeStyle = c.hi;
  ctx.lineWidth = Math.max(0.8, s.w * 0.26);
  trace(-s.w * 0.16, -s.w * 0.2); ctx.stroke();
  if (s.tip) { // the dark tip of a blackhead plug
    const e = pts[pts.length - 1];
    ctx.fillStyle = '#3a2a22';
    ctx.beginPath(); ctx.arc(e.x, e.y, s.w * 0.55, 0, Math.PI * 2); ctx.fill();
  }
  if (s.gold) for (let i = 2; i < pts.length; i += 4) drawTwinkle(ctx, pts[i].x + s.w * 0.4, pts[i].y - s.w * 0.4, s.w * 0.5, 0.8);
}

/**
 * A drop of goo: flying (lifted off the skin, with its shadow below) or landed (a glossy blob).
 * @param {CanvasRenderingContext2D} ctx the context
 * @param {{x: number, y: number, r: number, z?: number, gold?: boolean}} d the drop (z = height above the skin)
 * @returns {void}
 */
export function drawDrop(ctx, d) {
  const z = d.z ?? 0;
  const c = d.gold ? GOLD_GOO : GOO;
  const r = d.r * (1 + z / 160);
  if (z > 0.5) {
    ctx.fillStyle = 'rgba(110,60,40,0.14)';
    ctx.beginPath(); ctx.ellipse(d.x, d.y, d.r, d.r * 0.7, 0, 0, Math.PI * 2); ctx.fill();
  }
  const y = d.y - z * 0.6;
  ctx.fillStyle = c.edge;
  ctx.beginPath(); ctx.ellipse(d.x, y, r + 0.6, r * 0.86 + 0.6, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = c.body;
  ctx.beginPath(); ctx.ellipse(d.x, y, r, r * 0.86, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = c.hi;
  ctx.beginPath(); ctx.ellipse(d.x - r * 0.35, y - r * 0.32, r * 0.3, r * 0.2, -0.5, 0, Math.PI * 2); ctx.fill();
}

/**
 * A big splat of goo on the "camera lens" (front of the picture), for the big pimples.
 * @param {CanvasRenderingContext2D} ctx the context
 * @param {{x: number, y: number, r: number, drip: number, a: number, seed: number, gold?: boolean}} s the splat
 * @returns {void}
 */
export function drawSplat(ctx, s) {
  const rand = rng(s.seed);
  const c = s.gold ? GOLD_GOO : GOO;
  ctx.save();
  ctx.globalAlpha = s.a * 0.8;
  ctx.fillStyle = c.body;
  ctx.strokeStyle = c.edge;
  ctx.lineWidth = 1.2;
  // A soft, round-edged blob: points around the middle joined by smooth curves.
  const n = 9;
  const pts = [];
  for (let i = 0; i < n; i += 1) {
    const a = (i / n) * Math.PI * 2;
    const rr = s.r * (0.72 + rand() * 0.4);
    pts.push([s.x + Math.cos(a) * rr, s.y + Math.sin(a) * rr * 0.9]);
  }
  ctx.beginPath();
  for (let i = 0; i <= n; i += 1) {
    const p0 = pts[i % n];
    const p1 = pts[(i + 1) % n];
    const mx = (p0[0] + p1[0]) / 2;
    const my = (p0[1] + p1[1]) / 2;
    if (i === 0) ctx.moveTo(mx, my); else ctx.quadraticCurveTo(p0[0], p0[1], mx, my);
  }
  ctx.closePath();
  // Drips running down the lens.
  const drips = [];
  for (let i = 0; i < 2; i += 1) {
    const dx = s.x + (rand() - 0.5) * s.r;
    const len = s.drip * (0.6 + rand() * 0.6);
    const w = s.r * (0.2 + rand() * 0.1);
    drips.push([dx, len, w]);
  }
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  for (const [dx, len, w] of drips) {
    ctx.rect(dx - w / 2, s.y, w, len);
    ctx.moveTo(dx + w * 0.75, s.y + len);
    ctx.arc(dx, s.y + len, w * 0.75, 0, Math.PI * 2);
  }
  ctx.fill();
  ctx.fillStyle = c.hi;
  ctx.beginPath(); ctx.ellipse(s.x - s.r * 0.35, s.y - s.r * 0.3, s.r * 0.3, s.r * 0.15, -0.5, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(s.x + s.r * 0.25, s.y + s.r * 0.2, s.r * 0.07, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

/**
 * A fingertip pressing into the skin, seen from above: a rounded finger coming in from outside, with its nail.
 * @param {CanvasRenderingContext2D} ctx the context
 * @param {number} x where the tip presses
 * @param {number} y where the tip presses
 * @param {number} angle direction from the tip towards the hand (radians)
 * @param {number} width finger width
 * @param {number} alpha opacity (fades in as the squeeze starts)
 * @returns {void}
 */
export function drawFinger(ctx, x, y, angle, width, alpha) {
  if (alpha <= 0) return;
  const len = width * 3.2;
  const hw = width / 2;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.shadowColor = 'rgba(70,30,20,0.35)';
  ctx.shadowBlur = width * 0.35;
  ctx.shadowOffsetY = width * 0.12;
  const g = ctx.createLinearGradient(0, -hw, 0, hw);
  g.addColorStop(0, '#d5937a');
  g.addColorStop(0.35, '#f5c8ad');
  g.addColorStop(0.7, '#eab196');
  g.addColorStop(1, '#c98068');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(len, -hw);
  ctx.lineTo(hw, -hw);
  ctx.arc(hw, 0, hw, -Math.PI / 2, Math.PI / 2, true);
  ctx.lineTo(len, hw);
  ctx.closePath();
  ctx.fill();
  ctx.shadowColor = 'transparent';
  // The nail, near the tip.
  const ng = ctx.createLinearGradient(0, -hw * 0.6, 0, hw * 0.6);
  ng.addColorStop(0, '#f3cfc4');
  ng.addColorStop(0.5, '#fbe6de');
  ng.addColorStop(1, '#e9b9ab');
  ctx.fillStyle = ng;
  ctx.beginPath();
  ctx.moveTo(width * 1.55, -hw * 0.62);
  ctx.lineTo(width * 0.45, -hw * 0.62);
  ctx.quadraticCurveTo(width * 0.12, 0, width * 0.45, hw * 0.62);
  ctx.lineTo(width * 1.55, hw * 0.62);
  ctx.quadraticCurveTo(width * 1.7, 0, width * 1.55, -hw * 0.62);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.55)'; // shine on the nail
  ctx.beginPath(); ctx.ellipse(width * 0.95, -hw * 0.28, width * 0.38, hw * 0.12, 0, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = 'rgba(160,90,70,0.35)'; // knuckle crease
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(width * 2.4, -hw * 0.7); ctx.quadraticCurveTo(width * 2.3, 0, width * 2.4, hw * 0.7); ctx.stroke();
  ctx.restore();
}

/**
 * A rounded rectangle path.
 * @param {CanvasRenderingContext2D} ctx the context
 * @param {number} x left
 * @param {number} y top
 * @param {number} w width
 * @param {number} h height
 * @param {number} r corner radius
 * @returns {void}
 */
function roundRect(ctx, x, y, w, h, r) {
  const rr = Math.max(0, Math.min(r, w / 2, h / 2));
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

/**
 * The blackhead strip, peeled `q` of the way from the left: the stuck part, and the flap folded back showing the
 * little dark plugs it pulled out.
 * @param {CanvasRenderingContext2D} ctx the context
 * @param {{x: number, y: number, w: number, h: number, dots: {x: number, y: number}[]}} s the strip
 * @param {number} q peel progress 0..1
 * @param {number} lift extra lift when it flies off (0..1)
 * @returns {void}
 */
export function drawStrip(ctx, s, q, lift = 0) {
  const fold = s.x + q * s.w;
  // Tiny blackheads still under the part that has not been peeled show through faintly.
  if (q < 1) {
    const stuck = s.x + s.w - fold;
    ctx.save();
    ctx.shadowColor = 'rgba(60,30,20,0.25)';
    ctx.shadowBlur = 4;
    ctx.shadowOffsetY = 1.5;
    roundRect(ctx, fold, s.y, stuck, s.h, Math.min(s.h * 0.35, stuck / 2));
    ctx.fillStyle = '#f5f1e8';
    ctx.fill();
    ctx.restore();
    ctx.save();
    roundRect(ctx, fold, s.y, stuck, s.h, Math.min(s.h * 0.35, stuck / 2));
    ctx.clip();
    ctx.fillStyle = 'rgba(190,170,140,0.35)';
    for (let x = fold + 4; x < s.x + s.w; x += 7) for (let y = s.y + 4; y < s.y + s.h; y += 7) { ctx.beginPath(); ctx.arc(x, y, 0.9, 0, Math.PI * 2); ctx.fill(); }
    ctx.restore();
  }
  if (q <= 0.01) {
    // A little tab on the left to show where to pull.
    ctx.fillStyle = '#e9e2d2';
    roundRect(ctx, s.x - s.h * 0.35, s.y + s.h * 0.2, s.h * 0.5, s.h * 0.6, s.h * 0.2);
    ctx.fill();
    return;
  }
  // The flap: folded back over itself to the left, lifted a little.
  const len = q * s.w;
  ctx.save();
  ctx.translate(fold, s.y - lift * s.h * 3);
  ctx.rotate(-0.18 - 0.35 * q - lift * 0.6);
  ctx.shadowColor = 'rgba(60,30,20,0.3)';
  ctx.shadowBlur = 8;
  ctx.shadowOffsetY = 4;
  roundRect(ctx, -len * 0.92, 0, len * 0.92, s.h, s.h * 0.3);
  ctx.fillStyle = '#ece4d3';
  ctx.fill();
  ctx.shadowColor = 'transparent';
  // The plugs it pulled out (mirrored, on the sticky side).
  for (const d of s.dots) {
    if (d.x > fold) continue;
    const fx = -(fold - d.x) * 0.92;
    const fy = d.y - s.y;
    ctx.fillStyle = '#f2e3b0';
    ctx.beginPath(); ctx.ellipse(fx, fy, 1.4, 3.2, 0.3, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#3a2a22';
    ctx.beginPath(); ctx.arc(fx, fy - 2.4, 1.3, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
}

/**
 * Tiny blackheads (the dots under the strip) on the skin.
 * @param {CanvasRenderingContext2D} ctx the context
 * @param {{x: number, y: number}[]} dots positions
 * @param {number} fromX only dots right of this x are drawn (left of it the strip has pulled them out)
 * @returns {void}
 */
export function drawStripDots(ctx, dots, fromX) {
  ctx.fillStyle = 'rgba(58,42,34,0.75)';
  for (const d of dots) if (d.x > fromX) { ctx.beginPath(); ctx.arc(d.x, d.y, 1.3, 0, Math.PI * 2); ctx.fill(); }
}

/**
 * The cotton pad for wiping.
 * @param {CanvasRenderingContext2D} ctx the context
 * @param {number} x centre x
 * @param {number} y centre y
 * @param {number} r radius
 * @returns {void}
 */
export function drawPad(ctx, x, y, r) {
  ctx.save();
  ctx.shadowColor = 'rgba(40,30,30,0.25)';
  ctx.shadowBlur = 8;
  ctx.shadowOffsetY = 3;
  const g = ctx.createRadialGradient(x - r * 0.3, y - r * 0.3, r * 0.1, x, y, r);
  g.addColorStop(0, '#ffffff');
  g.addColorStop(1, '#e7ebef');
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
  ctx.strokeStyle = 'rgba(170,180,190,0.5)';
  ctx.setLineDash([2, 3]);
  ctx.lineWidth = 1;
  for (const k of [0.45, 0.75]) { ctx.beginPath(); ctx.arc(x, y, r * k, 0, Math.PI * 2); ctx.stroke(); }
  ctx.setLineDash([]);
}

/**
 * A dollop of healing cream with a little swirl on top.
 * @param {CanvasRenderingContext2D} ctx the context
 * @param {number} x centre x
 * @param {number} y centre y
 * @param {number} r size
 * @param {number} alpha opacity (fades as it is rubbed in)
 * @returns {void}
 */
export function drawCream(ctx, x, y, r, alpha) {
  if (alpha <= 0 || r <= 0) return;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = 'rgba(200,190,200,0.6)';
  ctx.beginPath(); ctx.ellipse(x + r * 0.15, y + r * 0.25, r, r * 0.7, 0, 0, Math.PI * 2); ctx.fill();
  const g = ctx.createRadialGradient(x - r * 0.3, y - r * 0.4, 0, x, y, r);
  g.addColorStop(0, '#ffffff');
  g.addColorStop(1, '#eef0fb');
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.ellipse(x, y, r, r * 0.72, 0, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(x, y - r * 0.4, r * 0.55, r * 0.42, 0, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath();
  ctx.moveTo(x - r * 0.15, y - r * 0.7);
  ctx.quadraticCurveTo(x + r * 0.1, y - r * 1.25, x + r * 0.32, y - r * 0.95);
  ctx.quadraticCurveTo(x + r * 0.15, y - r * 0.75, x - r * 0.15, y - r * 0.7);
  ctx.fill();
  ctx.restore();
}

/**
 * Tweezers coming in from the upper right; their tips close on (x, y) as they grip, then they pull up.
 * @param {CanvasRenderingContext2D} ctx the context
 * @param {number} x tip x
 * @param {number} y tip y
 * @param {number} open 0 = closed, 1 = wide open
 * @param {number} scale size
 * @returns {void}
 */
export function drawTweezers(ctx, x, y, open, scale) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(-0.85);
  const len = 120 * scale;
  const gap = (3 + 9 * open) * scale;
  for (const side of [-1, 1]) {
    const g = ctx.createLinearGradient(0, side * gap, 0, side * (gap + 6 * scale));
    g.addColorStop(0, '#eef2f5');
    g.addColorStop(1, '#8b969f');
    ctx.fillStyle = g;
    ctx.strokeStyle = 'rgba(60,70,80,0.5)';
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(0, side * 1);
    ctx.lineTo(len, side * (gap + 7 * scale));
    ctx.lineTo(len, side * (gap + 1 * scale));
    ctx.lineTo(4 * scale, side * 0.2);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }
  ctx.restore();
}
