// Pop effects test page, variant G: Crater burst. A look-and-feel test only (see popfx/shared.js for the hooks).
// This file also holds the bump, crater and goo drawing that H (popfx/h.js) uses too: the bump is drawn here, not by
// the game's drawPimple, so it can dome up, thin, bubble, split open and leave a soft pink crater.
// Cartoon only: the goo is creamy white or yellow-cream, the crater is soft pink skin, never red, no wounds.
import { KIND, CALM, smooth, clamp, play, buzz, tone, hiss, W, H, sc, bp, T, holdId, rand, face, mine, dpr } from './shared.js';

// The goo colours G and H use: body (lit top), shade, deep (the underside), hi (shine), rim (a soft see-through edge).
export const GOO = {
  white: { body: '#fffaf0', shade: '#efe4c8', deep: '#d4c08f', hi: '#ffffff', rim: 'rgba(170,140,80,0.35)' },
  cream: { body: '#fce6a2', shade: '#efc867', deep: '#cf9c3a', hi: '#fffcec', rim: 'rgba(150,100,30,0.35)' },
};

/** The goo colours for a bump (white-cream for a whitehead, yellow-cream for the big one). @param {object} p the bump @returns {object} colours */
export const gooOf = (p) => (p.goo === 'cream' ? GOO.cream : GOO.white);

/** One throb of the bubbling bump: a quick swell, then a rest, once per phase step. @param {number} ph phase @returns {number} 0..1 */
export const throb = (ph) => {
  const f = ph - Math.floor(ph);
  return f < 0.38 ? Math.sin((Math.PI * f) / 0.38) ** 2 : 0;
};

/**
 * The way goo runs off the bump: square to the squeeze so it clears both fingertips, turned out over the cheek and
 * down (never up towards the eyes). Copied from D.
 * @returns {number} angle in radians (0 = right, PI / 2 = down)
 */
export function outDir() {
  const pref = bp.x >= (face?.cx ?? W / 2) ? 0.85 : Math.PI - 0.85;
  const p1 = bp.axis + Math.PI / 2;
  const p2 = bp.axis - Math.PI / 2;
  let d = Math.cos(p1 - pref) >= Math.cos(p2 - pref) ? p1 : p2;
  d += clamp(Math.atan2(Math.sin(pref - d), Math.cos(pref - d)), -0.55, 0.55);
  d = Math.atan2(Math.sin(d), Math.cos(d));
  return clamp(d, -0.15, Math.PI + 0.15);
}

/**
 * A thick glossy ball or dollop of goo: lit on top, darker underneath (whichever way it is turned), a soft see-through
 * edge instead of an ink outline, a broad soft shine and one small crisp glint.
 * @param {CanvasRenderingContext2D} c context
 * @param {number} x middle
 * @param {number} y middle
 * @param {number} rx half-width along rot
 * @param {number} ry half-height
 * @param {number} rot turn in radians
 * @param {object} g the goo colours (GOO)
 * @param {number} [shine] how glossy (1 = full)
 * @returns {void}
 */
export function drawGooBall(c, x, y, rx, ry, rot, g, shine = 1) {
  if (rx < 0.4 || ry < 0.4) return;
  const R = Math.max(rx, ry);
  const sn = Math.sin(rot);
  const cs = Math.cos(rot);
  /** A screen direction turned into the ball's own frame. @param {number} sx screen x @param {number} sy screen y @returns {number[]} [x, y] */
  const loc = (sx, sy) => [sx * cs + sy * sn, -sx * sn + sy * cs];
  c.save();
  c.translate(x, y);
  c.rotate(rot);
  const [dx, dy] = loc(0, 1); // screen down
  const lg = c.createLinearGradient(-dx * R, -dy * R, dx * R, dy * R);
  lg.addColorStop(0, g.body);
  lg.addColorStop(0.45, g.body);
  lg.addColorStop(0.78, g.shade);
  lg.addColorStop(1, g.deep);
  c.fillStyle = lg;
  c.beginPath(); c.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2); c.fill();
  c.strokeStyle = g.rim;
  c.lineWidth = Math.max(0.7, R * 0.07);
  c.stroke();
  const [hx, hy] = loc(-0.3 * R, -0.36 * R); // the broad soft shine, up and left
  const hg = c.createRadialGradient(hx, hy, 0, hx, hy, R * 0.62);
  hg.addColorStop(0, `rgba(255,255,255,${0.8 * shine})`);
  hg.addColorStop(1, 'rgba(255,255,255,0)');
  c.fillStyle = hg;
  c.beginPath(); c.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2); c.fill();
  const [gx, gy] = loc(-0.34 * R, -0.42 * R); // the crisp glint
  c.fillStyle = `rgba(255,255,255,${0.95 * shine})`;
  c.beginPath(); c.ellipse(gx, gy, Math.max(0.6, R * 0.17), Math.max(0.45, R * 0.1), -0.6 - rot, 0, Math.PI * 2); c.fill();
  const [bx, by] = loc(0.18 * R, 0.62 * R); // a faint light bounced back up from the skin under it
  c.strokeStyle = 'rgba(255,250,235,0.35)';
  c.lineWidth = Math.max(0.6, R * 0.07);
  c.beginPath(); c.ellipse(bx * 0.2, by * 0.2, rx * 0.78, ry * 0.78, 0, 0.35, 1.25); c.stroke();
  c.restore();
}

/** The soft shadow a goo ball casts on the skin. @param {CanvasRenderingContext2D} c context @param {number} x middle @param {number} y middle @param {number} rx half-width @param {number} ry half-height @param {number} [a] darkness @returns {void} */
export function gooShadow(c, x, y, rx, ry, a = 0.18) {
  c.fillStyle = `rgba(110,60,30,${a})`;
  c.beginPath(); c.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); c.fill();
}

/**
 * A thick run of goo along a line (H's ooze down the cheek): a round, glossy tube, darker on its underside, with a
 * soft shadow on the skin, tapering as wAt says. No ink outline.
 * @param {CanvasRenderingContext2D} c context
 * @param {{x: number, y: number}[]} pts the run's middle line, root first
 * @param {(i: number) => number} wAt the thickness at point i
 * @param {object} g the goo colours
 * @returns {void}
 */
export function drawGooRibbon(c, pts, wAt, g) {
  const n = pts.length;
  if (n < 2) return;
  c.save();
  c.lineCap = 'round';
  c.lineJoin = 'round';
  /** Stroke the whole run once, each piece at its own width, shifted. @param {string} col colour @param {number} k width share @param {number} ox shift x (in widths) @param {number} oy shift y (in widths) @param {number} add extra px @returns {void} */
  const layer = (col, k, ox, oy, add) => {
    c.strokeStyle = col;
    for (let i = 0; i < n - 1; i += 1) {
      const w = wAt(i);
      c.lineWidth = Math.max(0.8, w * k + add);
      c.beginPath();
      c.moveTo(pts[i].x + w * ox, pts[i].y + w * oy);
      c.lineTo(pts[i + 1].x + w * ox, pts[i + 1].y + w * oy);
      c.stroke();
    }
  };
  layer('rgba(110,60,30,0.11)', 1, 0.16, 0.32, 2);
  layer(g.rim, 1, 0, 0, 1.2);
  layer(g.deep, 1, 0, 0, 0);
  layer(g.shade, 0.8, 0, -0.08, 0);
  layer(g.body, 0.55, -0.04, -0.17, 0);
  layer('rgba(255,255,255,0.75)', 0.16, -0.08, -0.28, 0);
  c.restore();
}

/**
 * The bump drawn by G and H instead of the game's drawPimple: an inflamed pink glow, a paler ring of stretched skin
 * round the base, the dome (tighter and shinier with more pressure), the creamy head showing through the thinning
 * skin, an optional opening in the top with a soft rim of skin, and a bead of goo at the tip.
 * @param {CanvasRenderingContext2D} c context
 * @param {number} x middle
 * @param {number} y middle
 * @param {number} s dome radius now
 * @param {{pr: number, head: number, hr: number, goo: object, open: number, openAng: number, bead: number, big: boolean, fill?: number}} o
 *   pr = tightness 0..1, head = how much the head shows 0..1, hr = head radius, open = 0..1 how far the top has split,
 *   openAng = the split's long direction, bead = 0..1 the bead at the tip, fill = how full the opening is with goo
 * @returns {void}
 */
export function drawDome(c, x, y, s, o) {
  const pr = clamp(o.pr, 0, 1);
  const glow = c.createRadialGradient(x, y, s * 0.5, x, y, s * 2.1);
  glow.addColorStop(0, o.big ? 'rgba(228,114,104,0.4)' : 'rgba(232,132,120,0.3)');
  glow.addColorStop(1, 'rgba(232,132,120,0)');
  c.fillStyle = glow;
  c.beginPath(); c.arc(x, y, s * 2.1, 0, Math.PI * 2); c.fill();
  if (pr > 0.02) { // the stretched, paler skin round the base
    const ring = c.createRadialGradient(x, y, s * 0.88, x, y, s * 1.6);
    ring.addColorStop(0, 'rgba(255,240,230,0)');
    ring.addColorStop(0.14, `rgba(255,240,230,${0.62 * pr})`);
    ring.addColorStop(0.5, `rgba(255,240,230,${0.22 * pr})`);
    ring.addColorStop(1, 'rgba(255,240,230,0)');
    c.fillStyle = ring;
    c.beginPath(); c.arc(x, y, s * 1.6, 0, Math.PI * 2); c.fill();
  }
  c.fillStyle = `rgba(120,50,40,${0.13 + 0.1 * pr})`; // the dome's shadow: it stands up off the cheek
  c.beginPath(); c.ellipse(x + s * 0.14, y + s * (0.24 + 0.1 * pr), s * 1.0, s * 0.86, 0, 0, Math.PI * 2); c.fill();
  const dome = c.createRadialGradient(x - s * 0.3, y - s * 0.38, s * 0.06, x, y, s * 1.04);
  dome.addColorStop(0, '#ffdcd0');
  dome.addColorStop(0.5, o.big ? '#ef9a8b' : '#f4ad9e');
  dome.addColorStop(0.86, '#e48d80');
  dome.addColorStop(1, 'rgba(214,114,102,0.3)');
  c.fillStyle = dome;
  c.beginPath(); c.arc(x, y, s, 0, Math.PI * 2); c.fill();
  const hx = x;
  const hy = y - s * 0.06;
  const R = o.hr;
  if (R > 0.6) { // the creamy head, showing through more as the skin over it thins
    const hd = c.createRadialGradient(hx - R * 0.3, hy - R * 0.35, 0, hx, hy, R);
    hd.addColorStop(0, o.goo.hi);
    hd.addColorStop(0.45, o.goo.body);
    hd.addColorStop(0.82, o.goo.shade);
    hd.addColorStop(1, 'rgba(240,200,170,0)');
    c.save();
    c.globalAlpha = 0.3 + 0.7 * clamp(o.head, 0, 1);
    c.fillStyle = hd;
    c.beginPath(); c.arc(hx, hy, R, 0, Math.PI * 2); c.fill();
    c.restore();
  }
  const open = clamp(o.open, 0, 1);
  if (open > 0.01) drawOpening(c, hx, hy, R * 0.78 * open, R * 0.5 * open + 0.4, o.openAng, o.goo, o.fill ?? 1);
  const k = 1 - 0.75 * open; // the shine: stretched skin shines more (less once it has split)
  c.fillStyle = `rgba(255,255,255,${(0.4 + 0.45 * pr) * k})`;
  c.beginPath(); c.ellipse(x - s * 0.36, y - s * 0.46, s * (0.22 + 0.14 * pr), s * (0.12 + 0.05 * pr), -0.6, 0, Math.PI * 2); c.fill();
  c.fillStyle = `rgba(255,255,255,${(0.45 + 0.5 * pr) * k})`;
  c.beginPath(); c.arc(x - s * 0.1, y - s * 0.64, s * (0.03 + 0.05 * pr), 0, Math.PI * 2); c.fill();
  c.strokeStyle = `rgba(255,238,228,${0.4 * pr * k})`; // light along the lower edge: a tight, round dome
  c.lineWidth = Math.max(1, s * 0.06);
  c.beginPath(); c.arc(x, y, s * 0.9, 0.15, 1.35); c.stroke();
  if (o.bead > 0.02) { // a bead of goo pushing out at the tip
    const br = s * 0.19 * o.bead;
    gooShadow(c, hx + br * 0.2, hy + br * 0.45, br * 0.95, br * 0.6, 0.16);
    drawGooBall(c, hx, hy - br * 0.15, br, br * 0.92, 0, o.goo);
  }
}

/**
 * The split in the top of the bump: a small opening with a soft, slightly raised rim of skin, the goo filling it
 * (darker under the top lip, where the opening has depth).
 * @param {CanvasRenderingContext2D} c context
 * @param {number} x middle
 * @param {number} y middle
 * @param {number} rx half-length along ang
 * @param {number} ry half-width
 * @param {number} ang the split's long direction
 * @param {object} g goo colours
 * @param {number} fill 0..1 how full it is with goo (1 = goo right up to the rim)
 * @returns {void}
 */
export function drawOpening(c, x, y, rx, ry, ang, g, fill) {
  const lip = Math.max(1.4, rx * 0.26);
  c.fillStyle = 'rgba(238,150,136,0.55)'; // the rim's soft shadow on the dome
  c.beginPath(); c.ellipse(x + lip * 0.2, y + lip * 0.45, rx + lip, ry + lip, ang, 0, Math.PI * 2); c.fill();
  c.fillStyle = '#f9cdbf'; // the rim of skin
  c.beginPath(); c.ellipse(x, y, rx + lip, ry + lip, ang, 0, Math.PI * 2); c.fill();
  const ig = c.createLinearGradient(x, y - ry, x, y + ry); // inside: the goo, deeper under the top lip
  ig.addColorStop(0, g.deep);
  ig.addColorStop(0.5 - 0.3 * fill, g.shade);
  ig.addColorStop(1, g.body);
  c.fillStyle = ig;
  c.beginPath(); c.ellipse(x, y, rx, ry, ang, 0, Math.PI * 2); c.fill();
  c.save();
  c.beginPath(); c.ellipse(x, y, rx, ry, ang, 0, Math.PI * 2); c.clip();
  c.fillStyle = `rgba(150,92,60,${0.35 * (1.2 - fill)})`; // the shadow under the top lip
  c.beginPath();
  c.rect(x - rx * 2, y - rx * 2, rx * 4, rx * 4);
  c.ellipse(x, y + ry * 0.45, rx * 1.05, ry * 1.05, ang, 0, Math.PI * 2);
  c.fill('evenodd');
  c.restore();
  c.strokeStyle = 'rgba(255,238,230,0.85)'; // light on the top of the lip
  c.lineWidth = Math.max(1, lip * 0.45);
  c.beginPath(); c.ellipse(x, y, rx + lip * 0.55, ry + lip * 0.55, ang, Math.PI * 1.05, Math.PI * 1.75); c.stroke();
}

/**
 * The soft pink crater left where the bump was: a shallow dip (shadowed under its top-left edge, lit on the far
 * inner slope), a slightly raised rim of skin round it, and a little goo still sitting in the bottom.
 * @param {CanvasRenderingContext2D} c context
 * @param {number} x middle
 * @param {number} y middle
 * @param {number} R the dip's radius
 * @param {number} d depth 0..1 (it flattens as it heals)
 * @param {number} ang the split's long direction (the dip is a little longer that way)
 * @param {object} g goo colours
 * @param {number} left 0..1 how much goo is left in it
 * @returns {void}
 */
export function drawCrater(c, x, y, R, d, ang, g, left) {
  if (R < 0.5 || d <= 0) return;
  const pink = c.createRadialGradient(x, y, R * 0.4, x, y, R * 2.3); // soft pink round it (never red)
  pink.addColorStop(0, `rgba(238,150,138,${0.34 * d})`);
  pink.addColorStop(1, 'rgba(238,150,138,0)');
  c.fillStyle = pink;
  c.beginPath(); c.arc(x, y, R * 2.3, 0, Math.PI * 2); c.fill();
  /** A soft ring with no hard edges (the rim's light, shade and body). @param {number} cx middle @param {number} cy middle @param {number} r0 inner @param {number} r1 outer @param {string} rgb colour "r,g,b" @param {number} a strength @returns {void} */
  const ring = (cx, cy, r0, r1, rgb, a) => {
    const rg = c.createRadialGradient(cx, cy, r0, cx, cy, r1);
    rg.addColorStop(0, `rgba(${rgb},0)`);
    rg.addColorStop(0.4, `rgba(${rgb},${a})`);
    rg.addColorStop(1, `rgba(${rgb},0)`);
    c.fillStyle = rg;
    c.beginPath(); c.arc(cx, cy, r1, 0, Math.PI * 2); c.fill();
  };
  ring(x + R * 0.1, y + R * 0.14, R * 0.95, R * 1.75, '140,62,52', 0.16 * d); // the rim's shadow on the cheek, lower right
  ring(x, y, R * 0.8, R * 1.6, '246,188,172', 0.8 * d); // the raised rim of skin
  ring(x - R * 0.1, y - R * 0.12, R * 0.85, R * 1.45, '255,236,226', 0.6 * d); // light on the rim's top-left
  // The dip, shaded like a shallow bowl: dark under its top-left edge, lit on the far slope at the lower right.
  const dip = c.createRadialGradient(x + R * 0.28, y + R * 0.34, 0, x, y, R * 0.98);
  dip.addColorStop(0, `rgba(252,204,192,${0.75 * d})`);
  dip.addColorStop(0.55, `rgba(234,150,138,${0.62 * d})`);
  dip.addColorStop(0.9, `rgba(196,108,100,${0.7 * d})`);
  dip.addColorStop(1, `rgba(214,130,120,${0.3 * d})`);
  c.fillStyle = dip;
  c.beginPath(); c.ellipse(x, y, R, R * 0.88, ang, 0, Math.PI * 2); c.fill();
  if (left > 0.03) drawGooBall(c, x + R * 0.08, y + R * 0.16, R * 0.42 * left, R * 0.28 * left, ang, g, 0.8);
}

/**
 * Flying goo drops (G's spray, H's fling): they slow in the air, fall, and land on the face as glossy dollops that
 * squash flat with weight and settle; a drop that misses the face drops away and fades.
 * @param {object[]} flying drops in the air {x, y, z, vx, vy, vz, r}
 * @param {object[]} landed drops on the skin {x, y, r, age, sa}
 * @param {number} sdt scene seconds
 * @returns {void}
 */
export function stepFlyers(flying, landed, sdt) {
  const drag = Math.exp(-sdt * 2.4);
  for (let i = flying.length - 1; i >= 0; i -= 1) {
    const d = flying[i];
    if (d.fall !== undefined) {
      d.fall += sdt;
      d.vy += 900 * sc * sdt;
      d.y += d.vy * sdt;
      if (d.fall > 0.35) flying.splice(i, 1);
      continue;
    }
    d.vx *= drag;
    d.vy *= drag;
    d.x += d.vx * sdt;
    d.y += d.vy * sdt;
    d.vz -= 700 * sdt;
    d.z += d.vz * sdt;
    if (d.z > 0) continue;
    const onFace = !face || ((d.x - face.cx) / face.rx) ** 2 + ((d.y - face.cy) / face.ry) ** 2 <= 1;
    if (onFace) {
      flying.splice(i, 1);
      landed.push({ x: d.x, y: d.y, r: d.r, age: CALM ? 1 : 0, sa: Math.atan2(d.vy, d.vx) });
    } else { d.fall = 0; d.z = 0; d.vz = 0; d.vx *= 0.3; d.vy = 40 * sc; }
  }
  for (const s of landed) if (s.age < 0.6) s.age += sdt;
}

/** One flying drop: its shadow on the skin and the round glossy drop above it, stretched a little along its flight. @param {CanvasRenderingContext2D} c context @param {object} d the drop @param {object} g goo colours @returns {void} */
export function drawFlyer(c, d, g) {
  const y = d.y - d.z * 0.6;
  const vy = d.vy - d.vz * 0.6;
  const sp = Math.hypot(d.vx, vy);
  const st = 1 + (CALM ? 0.1 : 0.3) * Math.min(1, sp / (500 * sc));
  const r = d.r * (1 + d.z / 260);
  c.save();
  if (d.fall !== undefined) c.globalAlpha = Math.max(0, 1 - d.fall / 0.35);
  else gooShadow(c, d.x, d.y, d.r * 0.9, d.r * 0.6, 0.14);
  drawGooBall(c, d.x, y, r * st, r / Math.sqrt(st), Math.atan2(vy, d.vx), g);
  c.restore();
}

/** One landed drop: it hits flat and wide, wobbles back with weight and stays as a round glossy dollop. @param {CanvasRenderingContext2D} c context @param {object} s the landed drop @param {object} g goo colours @returns {void} */
export function drawLanded(c, s, g) {
  const k = s.age < 0.55 ? Math.exp(-s.age * 7) * Math.cos(s.age * 24) : 0;
  const rx = s.r * (1.12 + 0.45 * k);
  const ry = s.r * (0.84 - 0.35 * k);
  gooShadow(c, s.x + s.r * 0.15, s.y + s.r * 0.35, rx, ry * 0.9, 0.15);
  drawGooBall(c, s.x, s.y, rx, ry, 0, g, 0.9);
  const grow = smooth(s.age / 0.12); // two little splatter specks thrown on ahead of it as it hits
  for (const [d, k, side] of [[1.7, 0.3, 0.35], [2.4, 0.19, -0.3]]) {
    const a = s.sa + side;
    drawGooBall(c, s.x + Math.cos(a) * s.r * d * grow, s.y + Math.sin(a) * s.r * d * grow, s.r * k * 1.1 * grow, s.r * k * 0.85 * grow, 0, g, 0.7);
  }
}

/**
 * Goo on the "glass" (the screen itself): at the pop a few drops hit the screen with a small splat and some specks,
 * cling a moment, then slide slowly down, leaving a thin wet trail, shrinking and fading away over a few seconds.
 * Drawn in screen px (the screen hook), so the camera does not move them. None in the calm version.
 * @returns {{hit: (n: number, x: number, y: number) => void, step: (sdt: number) => void, draw: (c: CanvasRenderingContext2D, g: object) => void}} the glass
 */
export function makeGlass() {
  const drops = [];
  return {
    /** Throw n drops at the screen round (x, y), well clear of the bump itself. @param {number} n how many @param {number} x screen x @param {number} y screen y @returns {void} */
    hit(n, x, y) {
      if (CALM) return;
      const m = Math.min(W, H);
      for (let i = 0; i < n; i += 1) {
        const a = (i / n) * Math.PI * 2 + rand() * 1.2;
        const d = m * (0.2 + rand() * 0.22);
        const r = (8 + rand() * 5) * Math.max(0.8, sc); // a bit bigger than the drops on the skin: nearer the eye
        const px = clamp(x + Math.cos(a) * d, r * 2, W - r * 2);
        const py = clamp(y + Math.sin(a) * d * 0.8, r * 2, H * 0.7);
        drops.push({
          x: px, y: py, x0: px, y0: py, r, r0: r,
          age: -0.04 - i * 0.07 - rand() * 0.05, hold: 0.35 + rand() * 0.6, vy: 0, life: 3 + rand() * 1.5, sway: rand() * 6,
          trail: [], specks: Array.from({ length: 4 }, () => ({ a: rand() * Math.PI * 2, d: 1.5 + rand() * 1.3, k: 0.14 + rand() * 0.14 })),
        });
      }
    },
    /** The drops cling, then slide down a little faster as they go, laying a trail and shrinking. @param {number} sdt scene seconds @returns {void} */
    step(sdt) {
      for (let i = drops.length - 1; i >= 0; i -= 1) {
        const q = drops[i];
        q.age += sdt;
        if (q.age > q.life) { drops.splice(i, 1); continue; }
        if (q.age < q.hold) continue;
        q.vy = Math.min(q.vy + 30 * sdt, (22 + q.r * 4) * Math.max(0.8, sc));
        q.y += q.vy * sdt;
        q.x += Math.sin(q.age * 3 + q.sway) * 4 * sdt;
        q.r = Math.max(q.r0 * 0.45, q.r - q.r0 * 0.12 * sdt);
        const last = q.trail[q.trail.length - 1];
        if (!last || Math.hypot(q.x - last.x, q.y - last.y) > 3) q.trail.push({ x: q.x, y: q.y - q.r * 0.3 });
      }
    },
    /** The trails, the specks and the drops on the glass. @param {CanvasRenderingContext2D} c context @param {object} g goo colours @returns {void} */
    draw(c, g) {
      for (const q of drops) {
        if (q.age < 0) continue;
        const fade = Math.min(1, (q.life - q.age) / 1.2);
        const hitK = smooth(q.age / 0.09); // the splat: wide and flat as it hits, then rounding up
        c.save();
        c.globalAlpha = 0.78 * fade; // a little see-through, so it reads as on the glass, not on the skin
        if (q.trail.length > 1) { // the thin wet trail it leaves, see-through and fainter at the top
          c.lineCap = 'round';
          c.lineJoin = 'round';
          for (const [w, col, al] of [[0.8, g.shade, 0.35], [0.4, g.hi, 0.5]]) {
            c.strokeStyle = col;
            c.lineWidth = Math.max(1, q.r0 * w);
            c.globalAlpha = al * fade;
            c.beginPath();
            q.trail.forEach((p, j) => (j ? c.lineTo(p.x, p.y) : c.moveTo(p.x, p.y)));
            c.stroke();
          }
          c.globalAlpha = 0.78 * fade;
        }
        for (const s of q.specks) drawGooBall(c, q.x0 + Math.cos(s.a) * q.r0 * s.d * hitK, q.y0 + Math.sin(s.a) * q.r0 * s.d * hitK, q.r0 * s.k, q.r0 * s.k * 0.85, 0, g, 0.8); // the specks stay where it hit
        const moving = q.vy > 1 ? Math.min(1, q.vy / 40) : 0;
        drawGooBall(c, q.x, q.y, q.r * (1.5 - 0.5 * hitK) * (1 - 0.1 * moving), q.r * (0.6 + 0.4 * hitK) * (1 + 0.15 * moving), 0, g);
        c.restore();
      }
    },
  };
}

let spare = null; // the ripple's spare canvas, shared by every ripple on the page (see rippleBuf)

/**
 * The ripple's spare canvas the size of the stage, which the frame is copied into before it is bent: made once for
 * the page, and again only if the stage size changes.
 * @returns {{canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D}} the spare canvas
 */
function rippleBuf() {
  if (!spare) {
    const canvas = document.createElement('canvas');
    spare = { canvas, ctx: null };
  }
  if (spare.canvas.width !== mine.width || spare.canvas.height !== mine.height || !spare.ctx) {
    spare.canvas.width = mine.width;
    spare.canvas.height = mine.height;
    spare.ctx = spare.canvas.getContext('2d');
  }
  return spare;
}

/**
 * The pop's ripple: no line and no colour, only a light bend of what is already on the screen (face, goo, room),
 * travelling out from the bump like a ring of water or a sound wave and fading as it goes. The outer half of the wave
 * magnifies a little and the inner half shrinks a little, so the picture bends as if seen through a thin glass ring.
 * How: once a frame while a wave is alive, the finished frame is copied to a spare canvas (rippleBuf) and thin rings
 * of that copy are stroked back on (as a pattern), each scaled very slightly about the bump. The rings are cut where the
 * bend changes by about half a screen pixel, so features bend smoothly instead of breaking. Drawn in the screen hook
 * (screen px); none in the calm version.
 * @returns {{start: (x: number, y: number, o: object) => void, draw: (c: CanvasRenderingContext2D, zoom?: number) => void}} the ripple
 */
export function makeRipple() {
  const waves = [];
  const STEP = 0.8; // device px of bend between one ring and the next (smaller is smoother but costs more rings)
  /**
   * The bend at distance x (px) from the wave's middle: pushed out past the middle, pulled in before it, nothing far off.
   * @param {number} x px from the middle (outwards +)
   * @param {number} a the strongest bend (px)
   * @param {number} s the wave's half-width (px)
   * @returns {number} px
   */
  const bendAt = (x, a, s) => a * 1.6487 * (x / s) * Math.exp(-(x * x) / (2 * s * s)); // 1.6487 = e^0.5, so the peak is exactly a
  let warm = 3; // the first frames after a reset run the whole path once, invisibly, so the phone sets it up then, not at the pop (B114)
  return {
    /** Whether the frame should be drawn on the hidden canvas now (a wave is alive, or still warming up). @returns {boolean} yes */
    busy: () => !CALM && (warm > 0 || waves.length > 0),
    /**
     * Start the ripple at screen point (x, y). Knobs: far (how far out it goes, scene px), r0 (where it starts), life
     * (seconds), amp (the strongest bend, scene px), width (the wave's half-width, scene px), waves ([[delay s,
     * strength, reach]...], e.g. one main wave and a weaker one just after).
     * @param {number} x screen x
     * @param {number} y screen y
     * @param {object} o knobs
     * @returns {void}
     */
    start(x, y, o) {
      if (CALM) return;
      for (const [delay, k, reach] of o.waves) waves.push({ x, y, t0: T + delay, k, far: o.far * reach, r0: o.r0, life: o.life, amp: o.amp, width: o.width });
    },
    /**
     * Bend the screen along each live wave (weaker ones first, so the main wave lies on top where they cross).
     * @param {CanvasRenderingContext2D} c the stage context (its transform is the dpr one)
     * @param {number} [zoom] the camera's zoom now, so the wave grows with the scene
     * @param {HTMLCanvasElement|null} [src] the hidden canvas this frame was drawn on (shared.js render, while busy()):
     *   sampled instead of the shown canvas; without it the frame is copied to a spare canvas first (older path)
     * @returns {void}
     */
    draw(c, zoom = 1, src = null) {
      if (CALM) return;
      for (let i = waves.length - 1; i >= 0; i -= 1) if (T - waves[i].t0 > waves[i].life) waves.splice(i, 1);
      const live = waves.filter((w) => T >= w.t0).sort((p, q) => p.k - q.k);
      const warming = warm > 0 && !live.length;
      if (warm > 0) warm -= 1;
      if (!live.length && !warming) return;
      let from0 = src;
      if (!from0) {
        const b = rippleBuf(); // made on the first frame, long before the pop, so making it never stutters the pop
        b.ctx.globalCompositeOperation = 'copy';
        b.ctx.drawImage(mine, 0, 0); // the frame as it is now, before any bending
        from0 = b.canvas;
      }
      const pat = c.createPattern(from0, 'no-repeat');
      if (!pat || !pat.setTransform) return;
      c.save();
      c.setTransform(1, 0, 0, 1, 0, 0); // work in device px
      if (warming) { // one ring of the picture laid exactly on itself: no change on screen, but the path is set up
        pat.setTransform(new DOMMatrix([1, 0, 0, 1, 0, 0]));
        c.strokeStyle = pat;
        c.lineWidth = 2;
        c.beginPath();
        c.arc(bp.x * dpr, bp.y * dpr, bp.r * 3 * dpr, 0, Math.PI * 2);
        c.stroke();
      }
      for (const w of live) {
        const u = (T - w.t0) / w.life;
        const z = zoom * dpr;
        const R = (w.r0 + (w.far - w.r0) * (1 - (1 - u) ** 2)) * z; // fast at first, slowing as it spreads
        const a = w.amp * w.k * z * (1 - u) ** 1.6 * smooth(u / 0.12); // in quickly, fading as it goes
        const s = w.width * z * (0.8 + 0.5 * u); // and a little wider as it goes
        if (a < STEP * 0.6) continue;
        const cx = w.x * dpr;
        const cy = w.y * dpr;
        // Walk across the wave, inside to outside, cutting it into rings where the bend moves on by one STEP.
        let from = -3 * s;
        let lvl = Math.round(bendAt(from, a, s) / STEP);
        for (let x = from + 0.5; x <= 3 * s + 0.5; x += 0.5) {
          const now = x > 3 * s ? 0 : Math.round(bendAt(x, a, s) / STEP);
          if (now === lvl) continue;
          const r = R + (from + x) / 2; // this ring's middle
          const d = lvl * STEP; // its bend
          if (lvl !== 0 && R + from > x - from + 2 && r > Math.abs(d) * 3) {
            const k = r / (r - d); // scaled about the bump so a point at r shows the picture from r - d
            pat.setTransform(new DOMMatrix([k, 0, 0, k, cx - k * cx, cy - k * cy]));
            c.strokeStyle = pat; // set again after the change, to be safe in every browser
            c.lineWidth = x - from + 1; // a pixel of overlap, so no seam shows between rings
            c.beginPath();
            c.arc(cx, cy, r, 0, Math.PI * 2);
            c.stroke();
          }
          from = x;
          lvl = now;
        }
      }
      c.restore();
    },
  };
}

/**
 * The camera leaning in on the bump while it is squeezed, so the opening and the goo read past the fingertips; it
 * stays in through the pop and eases back out after. None in the calm version.
 * @param {number} popAt scene seconds at the pop, or -1
 * @param {number} zoom how far in (0.25 = a quarter bigger)
 * @returns {object|null} the camera
 */
export function leanIn(popAt, zoom) {
  if (CALM) return null;
  const inK = popAt >= 0 ? 1 : smooth(bp.pressure / 0.55);
  const outK = popAt >= 0 ? smooth((T - popAt - 1.4) / 1.6) : 0;
  const z = 1 + zoom * inK * (1 - outK);
  if (z <= 1.001) return null;
  return { ax: bp.x, ay: bp.y, sx: z, sy: z };
}

/**
 * G: crater burst. While held the bump domes up tight and shiny, a pale ring of stretched skin forms round it, the
 * creamy head shows through more and more and it throbs, a bead of goo forming at the tip. The pop splits the top
 * open (a small opening with a soft rim), a glossy mound of goo pushes out of it and F's explosion goes off from it
 * (a see-through ripple that bends the picture as it goes out, makeRipple, and a spray of round glossy drops that
 * land with weight); the dome sinks into a soft pink crater with a raised rim, which heals back to smooth skin about
 * two seconds after the pop. A few drops hit the screen glass and slide slowly down it (makeGlass).
 * @returns {object} the variant
 */
function makeG() {
  const big = KIND === 'big';
  const g = gooOf(bp);
  const openAng = bp.axis + Math.PI / 2;
  const dir = outDir();
  const flying = [];
  const landed = [];
  const glass = makeGlass();
  const ripple = makeRipple();
  let popAt = -1;
  let popS = 0;
  /** Lean in on the bump. @returns {object|null} camera */
  const camNow = () => leanIn(popAt, big ? 0.2 : 0.28);
  let popHr = 0;
  let phase = 0;
  /** The dome now: its size, tightness, head and bead, with the throb. @returns {{s: number, pr: number, k: number, head: number, hr: number, bead: number}} dome */
  const domeNow = () => {
    const pr = bp.pressure;
    const k = CALM ? 0 : throb(phase) * smooth((pr - 0.12) / 0.3);
    const s = bp.r * (1 + 0.55 * pr + 0.07 * k);
    const hr = s * (big ? 0.4 + 0.28 * pr : 0.5 + 0.2 * pr) * (1 + 0.05 * k);
    return { s, pr, k, head: smooth(pr / 0.9), hr, bead: smooth((pr - 0.5) / 0.45) * (1 + 0.3 * k) };
  };
  return {
    /** The game's own bump is hidden (drawn here instead); the skin is pushed harder with each throb. @returns {object} look */
    look() {
      const d = domeNow();
      return { amt: -3, warp: d.pr * 1.25 + 0.1 * d.k, jx: 0, jy: 0 };
    },
    /** The throb clock (faster as it fills, a soft blub each time), then the spray. @param {number} sdt scene seconds @returns {void} */
    step(sdt) {
      if (!bp.popped && holdId !== null && bp.pressure > 0.12) {
        const before = Math.floor(phase);
        phase += sdt * (1.3 + 4.2 * bp.pressure);
        if (Math.floor(phase) > before && !CALM) tone(160 + 150 * bp.pressure, 110 + 90 * bp.pressure, 0, 0.09, 0.035);
      }
      stepFlyers(flying, landed, sdt);
      glass.step(sdt);
    },
    cam: camNow,
    /** Draw the frame on the hidden canvas first while the ripple runs (or warms up), B114. @returns {boolean} yes */
    offscreen: () => ripple.busy(),
    /** The see-through ripple bending the screen, then the goo drops on the glass over it. @param {CanvasRenderingContext2D} c context @param {HTMLCanvasElement|null} world the hidden frame to sample @returns {void} */
    screen(c, world) {
      ripple.draw(c, camNow()?.sx ?? 1, world);
      glass.draw(c, g);
    },
    /** The bump: doming up while held; at the pop it splits, the goo pushes out and it sinks into a crater. @param {CanvasRenderingContext2D} c context @param {object} p bump @returns {void} */
    afterBump(c, p) {
      if (!bp.popped) {
        const d = domeNow();
        drawDome(c, p.x, p.y, d.s, { pr: d.pr, head: d.head, hr: d.hr, goo: g, open: 0, openAng, bead: d.bead, big });
        return;
      }
      const t = T - popAt;
      const split = smooth(t / 0.05); // the top tears open
      const sink = smooth((t - 0.08) / 0.4); // the emptied dome sinks down
      const settle = smooth((t - 0.7) / 1.3); // the crater heals back to smooth skin about two seconds after the pop
      const R = popS * 0.34 * (1 - 0.25 * settle); // a small dip, not a hole
      if (sink < 1) {
        c.save();
        c.globalAlpha = 1 - sink * sink;
        const s = popS * (1 + 0.06 * Math.sin(Math.PI * split)) * (1 - sink) + R * 1.25 * sink;
        drawDome(c, p.x, p.y, s, { pr: 1 - sink, head: 1, hr: popHr * (1 - sink) + R * sink, goo: g, open: split, openAng, bead: 0, big, fill: 1 - sink * 0.6 });
        c.restore();
      }
      if (sink > 0 && settle < 1) {
        c.save();
        c.globalAlpha = sink * (1 - settle);
        drawCrater(c, p.x, p.y, R, 1 - 0.6 * settle, openAng, g, 0.8 * (1 - settle));
        c.restore();
      }
      // The goo pushed out of the opening: a thick glossy mound rising out of it just after the split, then slumping
      // over the lower rim with its weight, where it stays (the dip shows beside it).
      const rise = smooth((t - 0.02) / 0.1);
      const slump = smooth((t - 0.16) / 0.6);
      const m = popHr * 0.9 * (big ? 1.05 : 0.95) * rise * (1 - 0.3 * slump);
      if (m > 0.5) {
        const ox = Math.cos(dir) * R * 1.25 * slump;
        const oy = Math.sin(dir) * R * 1.25 * slump - popHr * 0.12 * (1 - slump);
        const lift = 1 - slump; // standing up out of the opening, then lying flatter
        gooShadow(c, p.x + ox + m * 0.15, p.y + oy + m * (0.25 + 0.2 * lift), m * 1.05, m * 0.7, 0.18);
        drawGooBall(c, p.x + ox, p.y + oy, m * (1 + 0.2 * slump), m * (1 - 0.22 * slump), dir * 0.3 * slump, g);
      }
    },
    /** The landed drops, on the skin under the fingertips. @param {CanvasRenderingContext2D} c context @returns {void} */
    mid(c) {
      for (const s of landed) drawLanded(c, s, g);
    },
    /** The release: the spray out of the opening, a few game drops, the hiss and the deflate sound, a buzz. @returns {void} */
    pop() {
      popAt = T;
      const d = domeNow();
      popS = d.s;
      popHr = d.hr;
      // A ring of round drops all round the opening (more of them square to the squeeze, clear of the fingers),
      // landing close by so the eye stays on the bump. Fewer, fatter drops than F: thick goo, not seeds.
      const n = CALM ? (big ? 12 : 9) : big ? 26 : 19;
      const orx = popHr * 0.78;
      for (let i = 0; i < n; i += 1) {
        const side = i % 2 ? 1 : -1;
        const a0 = i % 3 === 2 ? rand() * Math.PI * 2 : openAng + (side < 0 ? Math.PI : 0) + (rand() - 0.5) * 1.6;
        const a = Math.sin(a0) < 0 ? Math.atan2(Math.sin(a0) * 0.45, Math.cos(a0)) : a0; // flatter upwards: not into the eyes
        const v = (260 + rand() * 300) * sc * (big ? 1.1 : 1); // fast out, but low (vz below), so they land close
        const r = (i % 4 === 0 ? 4.6 + rand() * 1.6 : 2.8 + rand() * 1.8) * sc * (big ? 1.25 : 1);
        const u = (rand() - 0.5) * 2; // where along the opening it leaves
        flying.push({
          x: bp.x + Math.cos(openAng) * orx * u * 0.7, y: bp.y + Math.sin(openAng) * orx * u * 0.7 - popHr * 0.06,
          z: 2, vx: Math.cos(a) * v, vy: Math.sin(a) * v, vz: 70 + rand() * 90, r,
        });
      }
      glass.hit(big ? 4 : 3, bp.x, bp.y);
      // The see-through ripple: a main wave and a weaker one just after (the bump's screen point is the camera's anchor).
      ripple.start(bp.x, bp.y, { far: Math.min(W, H) * (big ? 0.62 : 0.5), r0: bp.r, life: 0.5, amp: 3.4, width: 10, waves: [[0, 1, 1], [0.1, 0.55, 0.8]] });
      play(big ? 'pop_big' : 'pop_small');
      hiss(0.02, big ? 0.55 : 0.42, { type: 'bandpass', f0: big ? 1500 : 1800, f1: 420, q: 0.7, vol: 0.12, attack: 0.02 });
      tone(big ? 220 : 290, big ? 70 : 90, 0.08, 0.45, 0.08, 'triangle');
      buzz(big ? [50, 30, 110] : [30, 20, 50]);
    },
    /** The drops in the air, over everything. @param {CanvasRenderingContext2D} c context @returns {void} */
    over(c) {
      for (const d of flying) drawFlyer(c, d, g);
    },
  };
}

export default { id: 'G', name: 'Crater burst', make: makeG };
