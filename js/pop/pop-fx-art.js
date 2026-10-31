// Drawings for the juicy pop (SPEC D45 item 1, ported from pop test G, src/js/dev/popfx/g.js): the bump doming up
// tight and shiny while it is squeezed (the creamy head showing through, a bead of goo at the tip), the split opening,
// the soft pink crater that heals, thick glossy goo balls (drops in the air, dollops on the skin with two splatter
// specks, the goo mound), the goo drops on the screen glass that slide down, and the warm cloth's steam wisps (D45
// item 5). engine.js decides what and when (pop-fx.js does the sums). Cartoon only: the goo is creamy white, custard
// yellow, golden or pale green; the crater is soft pink skin, never red, never a wound.
import { rng } from './logic.js';
import { craterAt } from './pop-fx.js';

// The goo colours per kind: body (lit top), shade, deep (the underside), hi (shine), rim (a soft see-through edge).
// White and cream are pop test G's; gold and horn follow the game's own goo colours (art.js GOO_LOOK).
const GOO = {
  white: { body: '#fffaf0', shade: '#efe4c8', deep: '#d4c08f', hi: '#ffffff', rim: 'rgba(170,140,80,0.35)' },
  cream: { body: '#fce6a2', shade: '#efc867', deep: '#cf9c3a', hi: '#fffcec', rim: 'rgba(150,100,30,0.35)' },
  gold: { body: '#ffd84a', shade: '#f2a81c', deep: '#c98710', hi: '#fffbe0', rim: 'rgba(160,100,10,0.35)' },
  horn: { body: '#eaf0a6', shade: '#c4cf5c', deep: '#9aa83a', hi: '#fbffe8', rim: 'rgba(100,120,30,0.35)' },
};

/**
 * The juicy goo colours of a goo kind (white when unknown).
 * @param {string|undefined} goo 'white', 'cream', 'gold' or 'horn'
 * @returns {{body: string, shade: string, deep: string, hi: string, rim: string}} colours
 */
export function juicyGoo(goo) {
  return GOO[goo] ?? GOO.white;
}

const sprites = new Map(); // colour set -> (shine and size -> a round goo ball painted once), see drawGooBall
const SPRITE_SIZES = [12, 24, 48, 96]; // the ball's radius in sprite px; the smallest one sharp enough is used

/**
 * A round goo ball painted once into a small picture (paintGooBall), so each of dozens of drops costs one picture
 * instead of two gradients and six shapes. Made the first time a colour, shine and size is asked for.
 * @param {object} g the goo colours
 * @param {number} shine how glossy
 * @param {number} R the ball's radius in sprite px (one of SPRITE_SIZES)
 * @returns {HTMLCanvasElement|null} the picture (2R + 4 px square), or null without a canvas (tests)
 */
function ballSprite(g, shine, R) {
  let byColour = sprites.get(g); // looked up by the colour set, then shine and size: no new text made per drop
  if (!byColour) { byColour = new Map(); sprites.set(g, byColour); }
  const key = Math.round(shine * 10) * 1000 + R;
  if (byColour.has(key)) return byColour.get(key);
  let cv = null;
  try {
    cv = document.createElement('canvas');
    cv.width = R * 2 + 4;
    cv.height = R * 2 + 4;
    paintGooBall(cv.getContext('2d'), R + 2, R + 2, R, R, 0, g, shine);
  } catch { cv = null; }
  byColour.set(key, cv);
  return cv;
}

/**
 * Paint the goo ball pictures a face will need before its first pop (so making them never stutters the pop itself).
 * @param {string[]} goos the goo kinds on the face ('white', 'cream', 'gold', 'horn')
 * @returns {void}
 */
export function warmGoo(goos) {
  for (const goo of goos) for (const shine of [1, 0.9, 0.8, 0.7]) for (const R of SPRITE_SIZES.slice(0, 3)) ballSprite(juicyGoo(goo), shine, R);
}

/**
 * A thick glossy ball or dollop of goo: lit on top, darker underneath, a soft see-through edge instead of an ink
 * outline, a broad soft shine and one small crisp glint. Drawn from a round ball painted once (ballSprite), stretched
 * into the ellipse along rot (the light stays up and to the left, as before).
 * @param {CanvasRenderingContext2D} c context
 * @param {number} x middle
 * @param {number} y middle
 * @param {number} rx half-width along rot
 * @param {number} ry half-height
 * @param {number} rot turn in radians
 * @param {object} g the goo colours (juicyGoo)
 * @param {number} [shine] how glossy (1 = full)
 * @returns {void}
 */
export function drawGooBall(c, x, y, rx, ry, rot, g, shine = 1) {
  if (rx < 0.4 || ry < 0.4) return;
  const m = typeof c.getTransform === 'function' ? c.getTransform() : null;
  const px = Math.max(rx, ry) * (m ? Math.hypot(m.a, m.b) : 1); // the ball's radius in device px
  const R = SPRITE_SIZES.find((s) => s >= px) ?? SPRITE_SIZES[SPRITE_SIZES.length - 1];
  const img = ballSprite(g, shine, R);
  if (!img) { paintGooBall(c, x, y, rx, ry, rot, g, shine); return; }
  c.save();
  c.translate(x, y);
  if (rot) c.rotate(rot);
  c.scale(rx / R, ry / R); // the round ball stretched along rot ...
  if (rot) c.rotate(-rot); // ... without turning its light
  c.drawImage(img, -R - 2, -R - 2);
  c.restore();
}

/**
 * Paint a goo ball with gradients (the picture ballSprite keeps, or the ball itself where pictures cannot be made).
 * @param {CanvasRenderingContext2D} c context
 * @param {number} x middle
 * @param {number} y middle
 * @param {number} rx half-width along rot
 * @param {number} ry half-height
 * @param {number} rot turn in radians
 * @param {object} g the goo colours (juicyGoo)
 * @param {number} [shine] how glossy (1 = full)
 * @returns {void}
 */
function paintGooBall(c, x, y, rx, ry, rot, g, shine = 1) {
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
  c.restore();
}

/**
 * The soft shadow a goo ball casts on the skin.
 * @param {CanvasRenderingContext2D} c context
 * @param {number} x middle
 * @param {number} y middle
 * @param {number} rx half-width
 * @param {number} ry half-height
 * @param {number} [a] darkness
 * @returns {void}
 */
export function gooShadow(c, x, y, rx, ry, a = 0.18) {
  c.fillStyle = `rgba(110,60,30,${a})`;
  c.beginPath(); c.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); c.fill();
}

/**
 * The squeezed bump (pop test G's dome): an inflamed pink glow, a paler ring of stretched skin round the base, the
 * dome (tighter and shinier with more pressure), the creamy head showing through the thinning skin, an optional
 * opening in the top with a soft rim of skin, and a bead of goo at the tip.
 * @param {CanvasRenderingContext2D} c context
 * @param {number} x middle
 * @param {number} y middle
 * @param {number} s dome radius now
 * @param {{pr: number, head: number, hr: number, goo: object, open: number, openAng: number, bead: number, big: boolean,
 *   red?: boolean, fill?: number}} o pr = tightness 0..1, head = how much the head shows 0..1, hr = head radius,
 *   open = 0..1 how far the top has split, openAng = the split's long direction, bead = 0..1 the bead at the tip,
 *   big = the big bump's deeper pink, red = the pink bump's rosier dome, fill = how full the opening is with goo
 * @returns {void}
 */
export function drawDome(c, x, y, s, o) {
  const pr = Math.max(0, Math.min(1, o.pr));
  const glow = c.createRadialGradient(x, y, s * 0.5, x, y, s * 2.1);
  glow.addColorStop(0, o.big || o.red ? 'rgba(228,114,104,0.4)' : 'rgba(232,132,120,0.3)');
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
  c.beginPath(); c.ellipse(x + s * 0.14, y + s * (0.24 + 0.1 * pr), s, s * 0.86, 0, 0, Math.PI * 2); c.fill();
  const dome = c.createRadialGradient(x - s * 0.3, y - s * 0.38, s * 0.06, x, y, s * 1.04);
  dome.addColorStop(0, '#ffdcd0');
  dome.addColorStop(0.5, o.red ? '#ec8f84' : o.big ? '#ef9a8b' : '#f4ad9e');
  dome.addColorStop(0.86, o.red ? '#de7d72' : '#e48d80');
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
    c.globalAlpha *= 0.3 + 0.7 * Math.max(0, Math.min(1, o.head));
    c.fillStyle = hd;
    c.beginPath(); c.arc(hx, hy, R, 0, Math.PI * 2); c.fill();
    c.restore();
  }
  const open = Math.max(0, Math.min(1, o.open));
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
 * The soft pink crater left where the bump was: a shallow dip (shadowed under its top-left edge, lit on the far inner
 * slope), a slightly raised rim of skin round it, and a little goo still sitting in the bottom.
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
  const dip = c.createRadialGradient(x + R * 0.28, y + R * 0.34, 0, x, y, R * 0.98); // a shallow bowl
  dip.addColorStop(0, `rgba(252,204,192,${0.75 * d})`);
  dip.addColorStop(0.55, `rgba(234,150,138,${0.62 * d})`);
  dip.addColorStop(0.9, `rgba(196,108,100,${0.7 * d})`);
  dip.addColorStop(1, `rgba(214,130,120,${0.3 * d})`);
  c.fillStyle = dip;
  c.beginPath(); c.ellipse(x, y, R, R * 0.88, ang, 0, Math.PI * 2); c.fill();
  if (left > 0.03) drawGooBall(c, x + R * 0.08, y + R * 0.16, R * 0.42 * left, R * 0.28 * left, ang, g, 0.8);
}

/**
 * A juicy bump just after its pop, t seconds on (pop test G): the top tears open, the emptied dome sinks into a small
 * soft pink crater, which heals back to smooth skin about two seconds later. The goo mound is drawn with the goo
 * (drawMound), so the wipe takes it away.
 * @param {CanvasRenderingContext2D} c context
 * @param {{x: number, y: number, popS: number, popHr: number, openAng: number, type: string}} p the popped bump
 * @param {number} t seconds since the pop
 * @param {object} g goo colours
 * @returns {void}
 */
export function drawPopped(c, p, t, g) {
  const k = craterAt(t);
  if (k.done) return;
  const big = p.type === 'big';
  const R = p.popS * 0.34 * (1 - 0.25 * k.settle); // a small dip, not a hole
  if (k.sink < 1) {
    c.save();
    c.globalAlpha *= 1 - k.sink * k.sink;
    const s = p.popS * (1 + 0.06 * Math.sin(Math.PI * k.split)) * (1 - k.sink) + R * 1.25 * k.sink;
    drawDome(c, p.x, p.y, s, { pr: 1 - k.sink, head: 1, hr: p.popHr * (1 - k.sink) + R * k.sink, goo: g, open: k.split, openAng: p.openAng, bead: 0, big, red: p.type === 'red', fill: 1 - k.sink * 0.6 });
    c.restore();
  }
  if (k.sink > 0 && k.settle < 1) {
    c.save();
    c.globalAlpha *= k.sink * (1 - k.settle);
    drawCrater(c, p.x, p.y, R, 1 - 0.6 * k.settle, p.openAng, g, 0.8 * (1 - k.settle));
    c.restore();
  }
}

/**
 * The goo mound pushed out of the opening (a landed blob with mound: true): a thick glossy mound rising out just
 * after the split, then slumping over the lower rim with its weight, where it stays until it is wiped.
 * @param {CanvasRenderingContext2D} c context
 * @param {{x: number, y: number, hr: number, R: number, dir: number, age: number, big?: boolean, goo?: string}} b the mound
 *   (x, y = where it settles; hr = the head's radius at the pop; R = the crater's radius; dir = which way it slumps)
 * @returns {void}
 */
export function drawMound(c, b) {
  const g = juicyGoo(b.goo);
  const age = b.age ?? 1;
  const rise = Math.min(1, Math.max(0, (age - 0.02) / 0.1));
  const sl = Math.min(1, Math.max(0, (age - 0.16) / 0.6));
  const slump = sl * sl * (3 - 2 * sl);
  const m = b.hr * 0.9 * (b.big ? 1.05 : 0.95) * rise * (1 - 0.3 * slump);
  if (m <= 0.5) return;
  const back = 1 - slump; // where it stands before it slumps: in the opening, a little up
  const x = b.x - Math.cos(b.dir) * b.R * 1.25 * back;
  const y = b.y - Math.sin(b.dir) * b.R * 1.25 * back - b.hr * 0.12 * back;
  gooShadow(c, x + m * 0.15, y + m * (0.25 + 0.2 * back), m * 1.05, m * 0.7, 0.18);
  drawGooBall(c, x, y, m * (1 + 0.2 * slump), m * (1 - 0.22 * slump), b.dir * 0.3 * slump, g);
}

/**
 * A juicy goo drop flying: its shadow on the skin and the round glossy drop above it, stretched a little along its
 * flight; one that missed the face drops away and fades (d.fall).
 * @param {CanvasRenderingContext2D} c context
 * @param {{x: number, y: number, z: number, vx: number, vy: number, vz: number, r: number, goo?: string, fall?: number}} d the drop
 * @param {number} scale the scene's size factor
 * @returns {void}
 */
export function drawFlyer(c, d, scale) {
  const g = juicyGoo(d.goo);
  const y = d.y - d.z * 0.6;
  const vy = d.vy - d.vz * 0.6;
  const sp = Math.hypot(d.vx, vy);
  const st = 1 + 0.3 * Math.min(1, sp / (500 * scale));
  const r = d.r * (1 + d.z / 260);
  c.save();
  if (d.fall !== undefined) c.globalAlpha *= Math.max(0, 1 - d.fall / 0.35);
  else gooShadow(c, d.x, d.y, d.r * 0.9, d.r * 0.6, 0.14);
  drawGooBall(c, d.x, y, r * st, r / Math.sqrt(st), Math.atan2(vy, d.vx), g);
  c.restore();
}

/**
 * A juicy drop that landed: it hits flat and wide, wobbles back with weight and stays as a round glossy dollop, with
 * two little splatter specks thrown on ahead of it as it hits.
 * @param {CanvasRenderingContext2D} c context
 * @param {{x: number, y: number, r: number, age?: number, sa?: number, goo?: string}} s the landed drop (age = seconds
 *   since it landed; sa = the way it was flying)
 * @returns {void}
 */
export function drawLanded(c, s) {
  const g = juicyGoo(s.goo);
  const age = s.age ?? 1;
  const k = age < 0.55 ? Math.exp(-age * 7) * Math.cos(age * 24) : 0;
  const rx = s.r * (1.12 + 0.45 * k);
  const ry = s.r * (0.84 - 0.35 * k);
  gooShadow(c, s.x + s.r * 0.15, s.y + s.r * 0.35, rx, ry * 0.9, 0.15);
  drawGooBall(c, s.x, s.y, rx, ry, 0, g, 0.9);
  const gu = Math.min(1, age / 0.12);
  const grow = gu * gu * (3 - 2 * gu);
  if (grow <= 0) return;
  for (const [d, kk, side] of [[1.7, 0.3, 0.35], [2.4, 0.19, -0.3]]) {
    const a = (s.sa ?? 0) + side;
    drawGooBall(c, s.x + Math.cos(a) * s.r * d * grow, s.y + Math.sin(a) * s.r * d * grow, s.r * kk * 1.1 * grow, s.r * kk * 0.85 * grow, 0, g, 0.7);
  }
}

/**
 * A goo drop on the screen glass (screen px, in front of the zoom): it hits with a small splat and some specks (they
 * stay where it hit), clings, then slides slowly down with a thin wet trail, shrinking and fading. A little
 * see-through, so it reads as on the glass, not on the skin.
 * @param {CanvasRenderingContext2D} c context (screen transform)
 * @param {{x: number, y: number, x0: number, y0: number, r: number, r0: number, age: number, vy: number, life: number,
 *   trail: {x: number, y: number}[], specks: {a: number, d: number, k: number}[], goo?: string}} q the drop
 * @returns {void}
 */
export function drawGlassDrop(c, q) {
  if (q.age < 0) return;
  const g = juicyGoo(q.goo);
  const fade = Math.min(1, (q.life - q.age) / 1.2);
  const hu = Math.min(1, q.age / 0.09);
  const hitK = hu * hu * (3 - 2 * hu); // the splat: wide and flat as it hits, then rounding up
  c.save();
  if (q.trail.length > 1) { // the thin wet trail it leaves, see-through
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
  }
  c.globalAlpha = 0.78 * fade;
  for (const s of q.specks) drawGooBall(c, q.x0 + Math.cos(s.a) * q.r0 * s.d * hitK, q.y0 + Math.sin(s.a) * q.r0 * s.d * hitK, q.r0 * s.k, q.r0 * s.k * 0.85, 0, g, 0.8);
  const moving = q.vy > 1 ? Math.min(1, q.vy / 40) : 0;
  drawGooBall(c, q.x, q.y, q.r * (1.5 - 0.5 * hitK) * (1 - 0.1 * moving), q.r * (0.6 + 0.4 * hitK) * (1 + 0.15 * moving), 0, g);
  c.restore();
}

const wispCache = new Map(); // n -> the wisps' fixed shapes (the same every time, so the steam does not jump)

/**
 * The fixed shapes of n steam wisps (made once per count): where along the cloth each starts, how tall, how it curls.
 * @param {number} n how many
 * @returns {{u: number, len: number, amp: number, k: number, spd: number, ph: number, period: number, off: number, width: number, lean: number}[]} wisps (sizes in cloth radii)
 */
function wispShapes(n) {
  if (wispCache.has(n)) return wispCache.get(n);
  const rand = rng(97 + n);
  const out = [];
  for (let i = 0; i < n; i += 1) {
    const len = 2.1 + rand() * 0.9;
    out.push({
      u: n > 1 ? (i / (n - 1) - 0.5) * 1.3 : 0, len, amp: 0.16 + rand() * 0.12, k: ((Math.PI * 2) / len) * (1.1 + rand() * 0.6),
      spd: 1.3 + rand() * 0.8, ph: rand() * Math.PI * 2, period: 2.6 + rand() * 1.2, off: i * 0.7 + rand() * 0.5,
      width: 0.07 + rand() * 0.04, lean: (rand() - 0.4) * 0.3,
    });
  }
  wispCache.set(n, out);
  return out;
}

/**
 * Soft steam wisps curling up from the warm cloth (SPEC D45 item 5, like the effects page's steam): thin white
 * ribbons that rise in a slow S, widen and fade, then let go and start again. Drawn in scene px over the cloth.
 * @param {CanvasRenderingContext2D} c context
 * @param {number} x the cloth's middle x
 * @param {number} y the cloth's middle y
 * @param {number} r the cloth's size (half its width)
 * @param {number} t seconds (a fixed time = still wisps, for reduced motion)
 * @param {number} k how strong, 0..1
 * @param {number} n how many wisps (steamWisps)
 * @param {boolean} [lite] one stroke per piece instead of a soft edge and a core (Lighter graphics)
 * @returns {void}
 */
export function drawClothSteam(c, x, y, r, t, k, n, lite = false) {
  if (k <= 0.01 || n <= 0) return;
  const SEGS = 12;
  c.save();
  c.strokeStyle = '#ffffff';
  c.lineCap = 'butt'; // flat ends: round ends would overlap at every joint and show as a string of beads
  for (const p of wispShapes(n)) {
    const u = (((t + p.off) / p.period) % 1 + 1) % 1; // where in its rise this wisp is
    const head = Math.min(1, u * 1.5);
    const tail = Math.max(0, u * 1.5 - 0.62);
    if (head - tail < 0.02) continue;
    const x0 = x + p.u * r;
    const y0 = y - r * 0.62;
    let px = 0;
    let py = 0;
    for (let i = 0; i <= SEGS; i += 1) {
      const s = tail + ((head - tail) * i) / SEGS; // 0 at the cloth .. 1 at the top
      const hgt = s * p.len * r;
      const amp = p.amp * r * (0.2 + s * 1.4);
      const wx = x0 + Math.sin(p.k * (hgt / r) - t * p.spd + p.ph) * amp + p.lean * hgt;
      const wy = y0 - hgt;
      if (i) {
        const along = (i - 0.5) / SEGS; // fade in at the tail and out at the head of the visible stretch
        const sa = Math.min(1, along * 4);
        const sb = Math.min(1, (1 - along) * 3);
        const a = k * 0.5 * (sa * sa * (3 - 2 * sa)) * (sb * sb * (3 - 2 * sb)) * (1 - s * 0.75);
        if (a > 0.004) {
          const wdt = p.width * r * (1 + s * 2.5);
          if (!lite) { // a soft wide edge
            c.globalAlpha = Math.min(1, a * 0.28);
            c.lineWidth = wdt * 2.6;
            c.beginPath(); c.moveTo(px, py); c.lineTo(wx, wy); c.stroke();
          }
          c.globalAlpha = Math.min(1, a * (lite ? 0.6 : 0.8)); // the brighter core
          c.lineWidth = lite ? wdt * 1.6 : wdt;
          c.beginPath(); c.moveTo(px, py); c.lineTo(wx, wy); c.stroke();
        }
      }
      px = wx;
      py = wy;
    }
  }
  c.restore();
}
