// Drawings for the juicy pop (SPEC D45 item 1, ported from pop test G, src/js/dev/popfx/g.js): the bump doming up
// tight and shiny while it is squeezed (the creamy head showing through, a bead of goo at the tip), the split opening,
// the soft pink crater that heals, thick glossy goo balls (drops in the air, dollops on the skin with two splatter
// specks, the goo mound), the goo drops on the screen glass that slide down, and the warm cloth's steam wisps (D45
// item 5). engine.js decides what and when (pop-fx.js does the sums). Cartoon only: the goo is creamy white, custard
// yellow, golden or pale green; the crater is soft pink skin, never red, never a wound. Splat v2 (owner 2026-10-31):
// landed drops are cartoon splats (drawLanded: irregular glossy blob, specks, shadow, drip run, merged puddles), and
// the Evil Horn's show (drawHornShow: crack flash, speed trail, stuck in the wall with a "ding", dust puffs).
import { rng } from './logic.js';
import { craterAt, hornAt, HORN_SHOW, FALL_TIME, GLASS_DROP, glassRadius } from './pop-fx.js';
import { drawHorn, drawTwinkle } from './art.js';

// The goo colours per kind: body (lit top), shade, deep (the underside), hi (shine), rim (a soft see-through edge),
// ink (the glass drops' outline), thick (how thick and creamy its glass drops look, 0 = a see-through lens; owner
// 2026-10-31: white and cream goo on the glass must read as goo, not water).
// White and cream are pop test G's; gold and horn follow the game's own goo colours (art.js GOO_LOOK).
const GOO = {
  white: { body: '#fffaf0', shade: '#efe4c8', deep: '#d4c08f', hi: '#ffffff', rim: 'rgba(170,140,80,0.35)', ink: '#7a6038', thick: 1 },
  cream: { body: '#fce6a2', shade: '#efc867', deep: '#cf9c3a', hi: '#fffcec', rim: 'rgba(150,100,30,0.35)', ink: '#7e5418', thick: 0.75 },
  gold: { body: '#ffd84a', shade: '#f2a81c', deep: '#c98710', hi: '#fffbe0', rim: 'rgba(160,100,10,0.35)', ink: '#74480a' },
  horn: { body: '#eaf0a6', shade: '#c4cf5c', deep: '#9aa83a', hi: '#fbffe8', rim: 'rgba(100,120,30,0.35)', ink: '#4c5a14' },
};

/**
 * The juicy goo colours of a goo kind (white when unknown).
 * @param {string|undefined} goo 'white', 'cream', 'gold' or 'horn'
 * @returns {{body: string, shade: string, deep: string, hi: string, rim: string, ink: string, thick?: number}} colours
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
  if (d.fall !== undefined) c.globalAlpha *= Math.max(0, 1 - d.fall / FALL_TIME);
  else gooShadow(c, d.x, d.y, d.r * 0.9, d.r * 0.6, 0.14);
  drawGooBall(c, d.x, y, r * st, r / Math.sqrt(st), Math.atan2(vy, d.vx), g);
  c.restore();
}

const ONE_PART = [{ dx: 0, dy: 0, k: 1 }]; // a splat of one drop (merged splats carry more parts)

/**
 * Add one splat part's outline to the path: a flattened round blob with a slightly irregular, soft cartoon edge (three
 * gentle waves round it, set by the splat's own phases), smoothed through the midpoints.
 * @param {CanvasRenderingContext2D} c context
 * @param {number} x middle
 * @param {number} y middle
 * @param {number} rx half-width
 * @param {number} ry half-height
 * @param {number[]} ph the edge's three wave phases
 * @param {number} [grow] px added all round (the rim, the shadow)
 * @returns {void}
 */
function splatPath(c, x, y, rx, ry, ph, grow = 0) {
  const N = 14;
  const pts = [];
  for (let i = 0; i < N; i += 1) {
    const a = (i / N) * Math.PI * 2;
    const k = 1 + 0.08 * Math.sin(3 * a + ph[0]) + 0.05 * Math.sin(5 * a + ph[1]) + 0.03 * Math.sin(7 * a + ph[2]);
    pts.push([x + Math.cos(a) * (rx * k + grow), y + Math.sin(a) * (ry * k + grow)]);
  }
  const last = pts[N - 1];
  c.moveTo((last[0] + pts[0][0]) / 2, (last[1] + pts[0][1]) / 2);
  for (let i = 0; i < N; i += 1) {
    const p = pts[i];
    const q = pts[(i + 1) % N];
    c.quadraticCurveTo(p[0], p[1], (p[0] + q[0]) / 2, (p[1] + q[1]) / 2);
  }
  c.closePath();
}

/**
 * Add a drip run's outline to the path: a tongue of goo hanging down from the splat, narrowing, with a round bead at
 * its end.
 * @param {CanvasRenderingContext2D} c context
 * @param {number} x top middle
 * @param {number} y top
 * @param {number} w half-width at the top
 * @param {number} L length to the bead's middle
 * @param {number} rb the bead's radius
 * @returns {void}
 */
function dripPath(c, x, y, w, L, rb) {
  const n = rb * 0.62; // the neck just above the bead
  c.moveTo(x - w, y);
  c.bezierCurveTo(x - w * 0.7, y + L * 0.45, x - n, y + L * 0.55, x - n, y + L - rb * 0.7);
  c.arc(x, y + L, rb, Math.PI * 1.25, Math.PI * 1.75, true);
  c.bezierCurveTo(x + n, y + L * 0.55, x + w * 0.7, y + L * 0.45, x + w, y);
  c.closePath();
}

/**
 * A juicy drop that landed, as a cartoon splat (owner 2026-10-31: "could be a bit more good looking"): it hits flat
 * and wide and wobbles back with weight, then stays as a glossy flattened blob with a slightly irregular edge, a soft
 * shadow, a couple of small satellite specks thrown on ahead of it, and on bigger drops a short drip run that creeps
 * down. Drops that landed on each other are one puddle (s.parts: one outline, one shading). No ink outline.
 * @param {CanvasRenderingContext2D} c context
 * @param {{x: number, y: number, r: number, age?: number, sa?: number, goo?: string, seed?: number, drip?: number,
 *   parts?: {dx: number, dy: number, k: number}[]}} s the landed drop (age = seconds since it landed; sa = the way it
 *   was flying; seed = its edge's shape 0..1; drip = the drip run's length in radii (0 = none); parts = the drops
 *   merged into it, offsets and sizes in radii)
 * @returns {void}
 */
export function drawLanded(c, s) {
  const g = juicyGoo(s.goo);
  const age = s.age ?? 1;
  const r = s.r;
  const k = age < 0.55 ? Math.exp(-age * 7) * Math.cos(age * 24) : 0; // the landing squash, wobbling out
  const sx = 1.12 + 0.45 * k;
  const sy = 0.84 - 0.35 * k;
  const sd = s.seed ?? 0.5;
  const ph = [sd * 6.28, sd * 17.3, sd * 29.1];
  const parts = (s.parts ?? ONE_PART).map((p) => ({ x: s.x + p.dx * r, y: s.y + p.dy * r, rx: r * p.k * sx, ry: r * p.k * sy }));
  const du = Math.min(1, Math.max(0, (age - 0.1) / 0.8));
  const L = (s.drip ?? 0) * r * du * du * (3 - 2 * du); // the drip creeps down, slowing
  const dx = s.x + r * (sd < 0.5 ? -0.42 : 0.42) * sx; // it runs off the lower edge, a little to one side
  const dy = s.y + r * sy * 0.2;
  const dw = r * 0.34;
  const rb = r * 0.3;
  const gu = Math.min(1, age / 0.12);
  const grow = gu * gu * (3 - 2 * gu);
  if (grow > 0) { // the satellite specks, thrown on ahead as it hit
    for (const [d, kk, side] of [[1.7, 0.26, 0.4], [2.3, 0.16, -0.3]]) {
      const a = (s.sa ?? 0) + side;
      drawGooBall(c, s.x + Math.cos(a) * r * d * grow, s.y + Math.sin(a) * r * d * grow, r * kk * 1.15 * grow, r * kk * 0.85 * grow, 0, g, 0.7);
    }
  }
  c.fillStyle = 'rgba(110,60,30,0.15)'; // the soft shadow, down and right
  c.beginPath();
  for (const p of parts) splatPath(c, p.x + r * 0.14, p.y + r * 0.3, p.rx, p.ry, ph, r * 0.06);
  if (L > 0.5) dripPath(c, dx + r * 0.12, dy + r * 0.2, dw, L, rb);
  c.fill();
  if (L > 0.5) { // the drip run: shaded, with a lit edge down its left side
    c.save();
    const dg = c.createLinearGradient(dx - dw, 0, dx + dw, 0);
    dg.addColorStop(0, g.body);
    dg.addColorStop(0.4, g.body);
    dg.addColorStop(1, g.shade);
    c.fillStyle = dg;
    c.beginPath(); dripPath(c, dx, dy, dw, L, rb); c.fill();
    c.strokeStyle = `rgba(255,255,255,0.55)`;
    c.lineWidth = Math.max(0.7, r * 0.09);
    c.lineCap = 'round';
    c.beginPath(); c.moveTo(dx - dw * 0.45, dy + r * 0.2); c.quadraticCurveTo(dx - dw * 0.3, dy + L * 0.5, dx - rb * 0.45, dy + L - rb * 0.2); c.stroke();
    c.fillStyle = 'rgba(255,255,255,0.85)';
    c.beginPath(); c.arc(dx - rb * 0.35, dy + L - rb * 0.3, Math.max(0.5, rb * 0.25), 0, Math.PI * 2); c.fill();
    c.restore();
  }
  c.fillStyle = g.rim; // a soft see-through edge instead of an ink outline
  c.beginPath();
  for (const p of parts) splatPath(c, p.x, p.y, p.rx, p.ry, ph, Math.max(0.7, r * 0.09));
  c.fill();
  let top = Infinity;
  let bot = -Infinity;
  for (const p of parts) { top = Math.min(top, p.y - p.ry); bot = Math.max(bot, p.y + p.ry); }
  const bg = c.createLinearGradient(0, top, 0, bot); // lit on top, deeper underneath: one shading for the whole puddle
  bg.addColorStop(0, g.body);
  bg.addColorStop(0.42, g.body);
  bg.addColorStop(0.8, g.shade);
  bg.addColorStop(1, g.deep);
  c.fillStyle = bg;
  c.beginPath();
  for (const p of parts) splatPath(c, p.x, p.y, p.rx, p.ry, ph);
  c.fill();
  parts.forEach((p, i) => { // the shine: a broad soft one and a crisp glint on each bigger part
    if (i && p.rx < r * 0.55) return;
    const R = Math.max(p.rx, p.ry);
    const hx = p.x - p.rx * 0.3;
    const hy = p.y - p.ry * 0.36;
    const hg = c.createRadialGradient(hx, hy, 0, hx, hy, R * 0.62);
    hg.addColorStop(0, 'rgba(255,255,255,0.72)');
    hg.addColorStop(1, 'rgba(255,255,255,0)');
    c.fillStyle = hg;
    c.beginPath(); c.ellipse(p.x, p.y, p.rx, p.ry, 0, 0, Math.PI * 2); c.fill();
    c.fillStyle = 'rgba(255,255,255,0.92)';
    c.beginPath(); c.ellipse(p.x - p.rx * 0.36, p.y - p.ry * 0.44, Math.max(0.6, R * 0.17), Math.max(0.45, R * 0.09), -0.5, 0, Math.PI * 2); c.fill();
    if (R > 2.5) { // light bouncing back up inside its lower edge: it reads wet
      c.strokeStyle = 'rgba(255,255,255,0.32)';
      c.lineWidth = Math.max(0.6, R * 0.08);
      c.beginPath(); c.ellipse(p.x, p.y + p.ry * 0.04, p.rx * 0.72, p.ry * 0.66, 0, Math.PI * 0.22, Math.PI * 0.78); c.stroke();
    }
  });
}

/**
 * The Evil Horn's show (owner 2026-10-31, the new ending), t = hn.t seconds after the crack: a comic crack flash at
 * the base, the horn flying at you, spinning and growing, with a speed trail (two fading ghosts and white streaks; no
 * ghosts with Lighter graphics), then stuck in the screen glass like a dart, quivering, with a ring and a burst of
 * little stars at its tip, then drooping from its tip and falling off the bottom of the screen. With reduced motion
 * (hn.calm) it only lifts off and fades. pop-fx.js hornAt says where it is.
 * @param {CanvasRenderingContext2D} c context (screen px: the glass is in front of the zoom)
 * @param {{x: number, y: number, r: number, len: number, t: number, spin: number, aimX: number, aimY: number, aimA: number,
 *   grow?: number, H?: number, calm?: boolean, lite?: boolean}} hn the flying horn (screen px)
 * @returns {void}
 */
export function drawHornShow(c, hn) {
  const t = hn.t;
  const at = hornAt(hn, t);
  if (!hn.calm && t < 0.16) drawCrackFlash(c, hn.x, hn.y - hn.len * 0.25, hn.r, t / 0.16);
  c.save();
  if (at.flying) {
    const back = hornAt(hn, Math.max(0, t - 0.1));
    /** The horn's middle (half way up its length) for a hornAt state. @param {{x: number, y: number, a: number}} q state @returns {number[]} [x, y] */
    const mid = (q) => [q.x + Math.sin(q.a) * hn.len * q.k * q.fore * 0.5, q.y - Math.cos(q.a) * hn.len * q.k * q.fore * 0.5];
    const [x0, y0] = mid(back);
    const [x1, y1] = mid(at);
    const ang = Math.atan2(y1 - y0, x1 - x0);
    const nx = -Math.sin(ang);
    const ny = Math.cos(ang);
    c.lineCap = 'round';
    c.strokeStyle = 'rgba(255,255,255,0.6)'; // speed streaks behind it
    for (const [o, wk] of [[-0.32, 0.07], [0, 0.11], [0.32, 0.07]]) {
      c.lineWidth = Math.max(1, hn.r * at.k * wk);
      const ox = nx * hn.r * at.k * o;
      const oy = ny * hn.r * at.k * o;
      c.beginPath(); c.moveTo(x0 + ox, y0 + oy); c.lineTo(x1 + ox, y1 + oy); c.stroke();
    }
    if (!hn.lite) {
      for (const [dt, al] of [[0.075, 0.18], [0.04, 0.35]]) {
        const gh = hornAt(hn, Math.max(0, t - dt));
        c.globalAlpha = al;
        drawShowHorn(c, hn, gh);
      }
    }
  }
  c.globalAlpha = at.alpha;
  if (at.alpha > 0.01) drawShowHorn(c, hn, at); // it flies at you on its own side, hooking outwards as on the face
  c.restore();
  if (at.hit >= 0 && at.hit < 0.6) drawGlassHit(c, hn.aimX, hn.aimY, hn.r * (hn.grow ?? 1) * 0.7, at.hit, hn.lite);
}

/**
 * One look of the flying or stuck Evil Horn (a hornAt state): drawHorn turned so its hooked tip lies along the state's
 * way (a), and squashed along that way by fore (pointing at you it looks short, nearly end on), its tip at the spot.
 * @param {CanvasRenderingContext2D} c context (screen px)
 * @param {{r: number, spin: number}} hn the horn (its size and the way its tip hooks)
 * @param {{x: number, y: number, a: number, k: number, fore: number}} q where it is now (pop-fx.js hornAt)
 * @returns {void}
 */
function drawShowHorn(c, hn, q) {
  c.save();
  c.translate(q.x, q.y);
  c.rotate(q.a);
  c.scale(1, Math.max(0.05, q.fore));
  drawHorn(c, 0, 0, hn.r * q.k, -hn.spin * HORN_SHOW.tipTurn, { flip: hn.spin });
  c.restore();
}

/**
 * The comic crack flash as the horn breaks loose: a pale jagged burst at its base, growing and fading in a blink.
 * @param {CanvasRenderingContext2D} c context
 * @param {number} x middle
 * @param {number} y middle
 * @param {number} r size
 * @param {number} u 0..1 through the flash
 * @returns {void}
 */
function drawCrackFlash(c, x, y, r, u) {
  const R = r * (0.7 + 0.9 * u);
  c.save();
  c.globalAlpha = (1 - u) * 0.95;
  for (const [k, col] of [[1, '#fff6d8'], [0.6, '#ffffff']]) {
    c.fillStyle = col;
    c.beginPath();
    for (let i = 0; i < 18; i += 1) {
      const a = (i / 18) * Math.PI * 2 + 0.2;
      const rr = R * k * (i % 2 ? 0.42 : i % 4 === 0 ? 1 : 0.78);
      if (i) c.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); else c.moveTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
    }
    c.closePath();
    c.fill();
  }
  c.restore();
}

/**
 * Where the horn's tip hit the screen glass: a quick soft white ring and little cartoon stars bursting out (a
 * "ding!"); no cracks (cartoon only). Lighter graphics: the ring and fewer stars.
 * @param {CanvasRenderingContext2D} c context
 * @param {number} x the hit's spot
 * @param {number} y the hit's spot
 * @param {number} r the horn's size
 * @param {number} t seconds since the hit
 * @param {boolean} [lite] Lighter graphics
 * @returns {void}
 */
function drawGlassHit(c, x, y, r, t, lite = false) {
  c.save();
  const u = Math.min(1, t / 0.32);
  if (u < 1) {
    c.strokeStyle = `rgba(255,255,255,${0.85 * (1 - u)})`;
    c.lineWidth = Math.max(1.2, r * 0.1 * (1 - u * 0.6));
    c.beginPath(); c.arc(x, y, r * (0.25 + 1.1 * u), 0, Math.PI * 2); c.stroke();
  }
  const v = Math.min(1, t / 0.6);
  const e = 1 - (1 - v) ** 2;
  const n = lite ? 3 : 5;
  for (let i = 0; i < n; i += 1) {
    const a = (i / n) * Math.PI * 2 - Math.PI / 2 + 0.3;
    const d = r * (0.3 + 1.3 * e);
    drawTwinkle(c, x + Math.cos(a) * d, y + Math.sin(a) * d - r * 0.4 * e, r * (0.5 - 0.2 * v), 1 - v * v);
  }
  c.restore();
}

/**
 * One puff of dust at the Evil Horn's base (pop-fx.js hornPuffs): a soft cartoon smoke ball, lit on top, that swells
 * and fades.
 * @param {CanvasRenderingContext2D} c context
 * @param {{x: number, y: number, r: number, t: number, life: number}} pf the puff
 * @returns {void}
 */
export function drawPuff(c, pf) {
  const u = Math.min(1, pf.t / pf.life);
  const a = 0.85 * (1 - u) ** 1.4;
  if (a < 0.01) return;
  const r = pf.r * (0.7 + 0.9 * (1 - (1 - u) ** 2));
  c.fillStyle = `rgba(206,196,182,${a})`;
  c.beginPath(); c.arc(pf.x, pf.y + r * 0.14, r, 0, Math.PI * 2); c.fill();
  c.strokeStyle = `rgba(150,138,124,${a * 0.45})`; // a soft cartoon edge, so each puff reads on pale skin
  c.lineWidth = Math.max(0.8, r * 0.07);
  c.stroke();
  c.fillStyle = `rgba(252,250,244,${a})`;
  c.beginPath(); c.arc(pf.x - r * 0.08, pf.y - r * 0.06, r * 0.86, 0, Math.PI * 2); c.fill();
  c.fillStyle = `rgba(255,255,255,${a * 0.8})`;
  c.beginPath(); c.arc(pf.x - r * 0.32, pf.y - r * 0.34, r * 0.24, 0, Math.PI * 2); c.fill();
}

// The glass drops' see-through look: once a frame (at the first drop drawn) the whole scene is copied a third of its
// size onto this shared canvas, and every drop then shows a magnified bit of that copy (soft from the shrinking: a
// cheap blur). One copy a frame, not one per drop: reading the scene's canvas makes the browser snapshot all of it.
// at = when the copy was made (ms); off = no lens look here (no canvas, or it failed once).
const LENS = { cv: null, cx: null, off: false, at: -1e9, src: null, k: 3 };
const RGB = new Map(); // '#rrggbb' -> [r, g, b], worked out once

/**
 * A '#rrggbb' colour as a CSS rgba() string with the given alpha.
 * @param {string} hex colour
 * @param {number} a alpha 0..1
 * @returns {string} rgba(...)
 */
function rgba(hex, a) {
  let v = RGB.get(hex);
  if (!v) { v = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)); RGB.set(hex, v); }
  return `rgba(${v[0]},${v[1]},${v[2]},${Math.max(0, Math.min(1, a)).toFixed(3)})`;
}

/**
 * The scene's small copy for this frame (made at the first glass drop of a frame: more than 5 ms since the last one,
 * or another canvas), before any drop is drawn, so drops never show each other. Nothing without a canvas (tests).
 * @param {CanvasRenderingContext2D} c the scene's context
 * @returns {boolean} true when the copy is ready
 */
function frameCopy(c) {
  if (LENS.off || !c.canvas || typeof c.getTransform !== 'function') return false;
  const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
  const src = c.canvas;
  if (LENS.src === src && Math.abs(now - LENS.at) < 5) return true;
  try {
    if (!LENS.cv) {
      LENS.cv = typeof document !== 'undefined' ? document.createElement('canvas') : new OffscreenCanvas(8, 8);
      LENS.cx = LENS.cv.getContext('2d');
      if (!LENS.cx) throw new Error('no 2d');
    }
    const w = Math.max(1, Math.ceil(src.width / LENS.k));
    const h = Math.max(1, Math.ceil(src.height / LENS.k));
    if (LENS.cv.width !== w || LENS.cv.height !== h) { LENS.cv.width = w; LENS.cv.height = h; } else LENS.cx.clearRect(0, 0, w, h);
    LENS.cx.drawImage(src, 0, 0, w, h);
    LENS.src = src;
    LENS.at = now;
    return true;
  } catch {
    LENS.off = true;
    return false;
  }
}

/**
 * Show the picture behind a glass drop inside it, magnified (the drop must be the current clip): a patch of the
 * frame's small copy round (x, y), half wide, stretched over the box round the drop.
 * @param {CanvasRenderingContext2D} c the scene's context (screen transform)
 * @param {number} x middle of the patch (screen px)
 * @param {number} y middle of the patch
 * @param {number} half half the patch's width (screen px)
 * @param {number} out half the width it is drawn at (screen px): more than half = magnified
 * @returns {boolean} true when drawn
 */
function drawBehind(c, x, y, half, out) {
  if (!frameCopy(c)) return false;
  const t = c.getTransform();
  const k = LENS.k;
  const sw = (half * 2 * t.a) / k;
  const sx = Math.max(0, Math.min(LENS.cv.width - sw, ((x - half) * t.a + t.e) / k));
  const sy = Math.max(0, Math.min(LENS.cv.height - sw, ((y - half) * t.d + t.f) / k));
  if (sw < 1 || sw > LENS.cv.width || sw > LENS.cv.height) return false;
  c.drawImage(LENS.cv, sx, sy, sw, sw, x - out, y - out, out * 2, out * 2);
  return true;
}

/**
 * The outline of a goo drop on the glass, smoothed through 16 points: a lumpy splat while it gathers (lump), fatter
 * and lower at the bottom when it bulges, its top narrowing into the streak while it runs, a quick jiggle (wob).
 * @param {CanvasRenderingContext2D} c context
 * @param {number} x middle
 * @param {number} y middle
 * @param {number} R radius
 * @param {{lump: number, rim?: number[], bulge: number, run: number, wob: number, ph: number}} o lump 0..1, rim = the
 *   splat's lobes, bulge 0..1, run 0..1, wob 0..1, ph = a phase for the jiggle
 * @returns {void}
 */
function dropPath(c, x, y, R, o) {
  const n = 16;
  const pts = [];
  for (let i = 0; i < n; i += 1) {
    const a = (i / n) * Math.PI * 2;
    let rr = R;
    if (o.lump > 0 && o.rim) rr *= 1 + (o.rim[Math.floor((i * o.rim.length) / n)] - 1) * o.lump;
    if (o.wob > 0) rr *= 1 + 0.12 * o.wob * Math.sin(a * 2 + o.ph);
    const s = Math.sin(a); // + = the lower half
    let px = Math.cos(a) * rr;
    let py = s * rr;
    if (s > 0) { py *= 1 + 0.32 * o.bulge * s; px *= 1 + 0.06 * o.bulge * s; } else { py *= 1 + 0.5 * o.run * -s; px *= 1 - 0.32 * o.run * s * s; }
    pts.push([x + px, y + py]);
  }
  c.beginPath();
  c.moveTo((pts[n - 1][0] + pts[0][0]) / 2, (pts[n - 1][1] + pts[0][1]) / 2);
  for (let i = 0; i < n; i += 1) {
    const p = pts[i];
    const q = pts[(i + 1) % n];
    c.quadraticCurveTo(p[0], p[1], (p[0] + q[0]) / 2, (p[1] + q[1]) / 2);
  }
  c.closePath();
}

/**
 * One fat goo drop on the glass, cartoon-real: inside it a slightly magnified, soft view of what is behind (Lighter
 * graphics: no view, a creamier fill), a see-through creamy tint, a dark soft edge on the upper left (its thickness),
 * a warm glow and a little rim light low on the right, a crisp white shine on the upper left and a soft ink outline.
 * Thick goo (white, cream: g.thick) is nearly opaque instead: a creamy body with a yellowish shade low down (the view
 * behind only a hint there), a broad soft shine on top, a soft shadow below and the soft outline of the face's goo.
 * @param {CanvasRenderingContext2D} c context (screen transform)
 * @param {number} x middle
 * @param {number} y middle
 * @param {number} R radius
 * @param {object} o the shape (dropPath)
 * @param {{body: string, deep: string, ink: string}} g goo colours
 * @param {boolean} lite Lighter graphics
 * @returns {void}
 */
function drawLensDrop(c, x, y, R, o, g, lite) {
  if (R < 0.6) return;
  const k = g.thick ?? 0; // thick creamy goo (white, cream) or a see-through lens (gold, horn)
  const low = y + R * (1 + 0.3 * o.bulge); // the drop's bottom
  if (k > 0) { // a soft shadow below it
    c.fillStyle = `rgba(90,56,24,${(0.2 * k).toFixed(3)})`;
    c.beginPath(); c.ellipse(x + R * 0.1, y + R * 0.38 + R * 0.2 * o.bulge, R * 1.02, R * 0.98, 0, 0, Math.PI * 2); c.fill();
  }
  dropPath(c, x, y, R, o);
  c.save();
  c.clip();
  const sz = !lite && drawBehind(c, x, y + R * 0.1, R * 0.95, R * 1.3);
  c.fillStyle = rgba(g.body, sz ? 0.5 : 0.66); // the goo, see-through
  c.fillRect(x - R * 1.7, y - R * 2, R * 3.4, R * 3.8);
  const pool = c.createLinearGradient(0, y - R, 0, low); // thicker cream, pooled low in the drop
  if (k > 0) { // creamy and thick: nearly opaque, a slightly yellowish shade low down, the view behind only a hint there
    pool.addColorStop(0, rgba(g.body, 0.9 * k));
    pool.addColorStop(0.5, rgba(g.body, 0.88 * k));
    pool.addColorStop(0.8, rgba(g.shade, 0.82 * k));
    pool.addColorStop(1, rgba(g.deep, 0.86 * k));
  } else {
    pool.addColorStop(0.4, rgba(g.body, 0));
    pool.addColorStop(1, rgba(g.shade, 0.6));
  }
  c.fillStyle = pool;
  c.fillRect(x - R * 1.7, y - R * 2, R * 3.4, R * 3.8);
  const d = 1 - 0.8 * k;
  const e = c.createRadialGradient(x + R * 0.24, y + R * 0.3, R * 0.15, x + R * 0.1, y + R * 0.12, R * 1.4);
  e.addColorStop(0, 'rgba(255,255,255,0)');
  e.addColorStop(0.5, rgba(g.deep, 0.06 * d));
  e.addColorStop(0.78, rgba(g.deep, 0.5 * d));
  e.addColorStop(1, rgba(g.ink, 0.78 * d));
  c.fillStyle = e; // its thickness: a dark soft edge, most on the upper left (faint on thick goo)
  c.fillRect(x - R * 1.7, y - R * 2, R * 3.4, R * 3.8);
  const gx = x + R * 0.3;
  const gy = y + R * (0.42 + 0.3 * o.bulge);
  const gl = c.createRadialGradient(gx, gy, 0, gx, gy, R * 0.62);
  gl.addColorStop(0, `rgba(255,255,244,${(0.62 * (1 - 0.6 * k)).toFixed(3)})`);
  gl.addColorStop(1, 'rgba(255,255,244,0)');
  c.fillStyle = gl; // the light gathered low on the far side
  c.fillRect(x - R * 1.7, y - R * 2, R * 3.4, R * 3.8);
  if (k > 0) { // the broad soft shine on top, as on the face's goo
    const hx = x - R * 0.3;
    const hy = y - R * 0.36;
    const hg = c.createRadialGradient(hx, hy, 0, hx, hy, R * 0.66);
    hg.addColorStop(0, `rgba(255,255,255,${(0.8 * k).toFixed(3)})`);
    hg.addColorStop(1, 'rgba(255,255,255,0)');
    c.fillStyle = hg;
    c.fillRect(x - R * 1.7, y - R * 2, R * 3.4, R * 3.8);
  }
  c.restore();
  c.lineWidth = Math.max(1, R * (0.12 - 0.04 * k));
  c.strokeStyle = k > 0 ? rgba(g.ink, 0.42) : rgba(g.ink, 0.62); // thick goo: the soft outline of the face's goo
  c.stroke();
  c.lineCap = 'round';
  c.strokeStyle = 'rgba(255,255,255,0.78)'; // a little rim light low on the right
  c.lineWidth = Math.max(1, R * 0.09);
  c.beginPath(); c.arc(x, y + R * 0.12 * o.bulge, R * 0.74, 0.25, 1.3); c.stroke();
  c.fillStyle = 'rgba(255,255,255,0.95)'; // the crisp shine
  c.beginPath(); c.ellipse(x - R * 0.36, y - R * 0.34 * (1 + 0.4 * o.run), R * 0.25, R * 0.13, -0.75, 0, Math.PI * 2); c.fill();
  c.beginPath(); c.arc(x - R * 0.04, y - R * 0.58 * (1 + 0.4 * o.run), Math.max(0.6, R * 0.07), 0, Math.PI * 2); c.fill();
}

/**
 * A tiny goo droplet on the glass (a bead left on the streak, a droplet waiting below, a flung speck): a see-through
 * creamy dot with an ink rim and a white glint (thick goo: an opaque cream bead, shaded low down).
 * @param {CanvasRenderingContext2D} c context
 * @param {number} x middle
 * @param {number} y middle
 * @param {number} r radius
 * @param {{body: string, ink: string}} g goo colours
 * @param {number} a alpha 0..1
 * @returns {void}
 */
function drawTinyDrop(c, x, y, r, g, a) {
  if (a <= 0.01 || r < 0.3) return;
  const k = g.thick ?? 0;
  c.globalAlpha = a;
  c.fillStyle = rgba(g.body, 0.6 + 0.35 * k);
  c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fill();
  if (k > 0 && r > 1.4) { // a creamy bead: its yellowish shade low down
    c.fillStyle = rgba(g.shade, 0.85 * k);
    c.beginPath(); c.arc(x, y, r, 0.15, Math.PI - 0.15); c.fill();
  }
  c.strokeStyle = rgba(g.ink, 0.5 - 0.12 * k);
  c.lineWidth = Math.max(0.7, r * 0.24);
  c.stroke();
  if (r > 1.1) {
    c.fillStyle = 'rgba(255,255,255,0.9)';
    c.beginPath(); c.arc(x - r * 0.34, y - r * 0.34, r * 0.32, 0, Math.PI * 2); c.fill();
  }
  c.globalAlpha = 1;
}

/**
 * A gradient along a streak whose alpha follows how wet each point still is (the oldest, at the top, dries first).
 * @param {CanvasRenderingContext2D} c context
 * @param {{x: number, y: number, a: number}[]} pts the streak's points, oldest first, each with its wetness a
 * @param {string} hex colour
 * @param {number} k alpha at full wetness
 * @returns {CanvasGradient} the gradient
 */
function wetGrad(c, pts, hex, k) {
  const p0 = pts[0];
  const p1 = pts[pts.length - 1];
  const dx = p1.x - p0.x;
  const dy = p1.y - p0.y;
  const L2 = Math.max(1e-6, dx * dx + dy * dy);
  const gr = c.createLinearGradient(p0.x, p0.y, p1.x, p1.y);
  let last = -1;
  for (const p of pts) {
    const f = ((p.x - p0.x) * dx + (p.y - p0.y) * dy) / L2;
    if (f <= last + 0.02 || f > 1) continue;
    last = f;
    gr.addColorStop(Math.max(0, f), rgba(hex, k * p.a));
  }
  gr.addColorStop(1, rgba(hex, k * p1.a));
  return gr;
}

/**
 * The wet streak one drop leaves (screen px): a see-through goo band of changing width, wider where it paused, with
 * a soft darker edge and its own highlight line; it dries away from the top (thick goo: a creamy streak). Lighter
 * graphics: the band only.
 * @param {CanvasRenderingContext2D} c context
 * @param {{x: number, y: number, w: number, a: number}[]} pts points oldest first (the last one at the drop)
 * @param {object} g goo colours
 * @param {boolean} lite Lighter graphics
 * @returns {void}
 */
function drawStreak(c, pts, g, lite) {
  const n = pts.length;
  if (n < 2) return;
  const L = [];
  const Rt = [];
  for (let i = 0; i < n; i += 1) {
    const a = pts[Math.max(0, i - 1)];
    const b = pts[Math.min(n - 1, i + 1)];
    const len = Math.hypot(b.x - a.x, b.y - a.y) || 1;
    const nx = -(b.y - a.y) / len;
    const ny = (b.x - a.x) / len;
    const w = (pts[Math.max(0, i - 1)].w + pts[i].w * 2 + pts[Math.min(n - 1, i + 1)].w) / 4 * (i === 0 ? 0.5 : 1); // smoothed; a thinner top end
    L.push([pts[i].x + nx * w, pts[i].y + ny * w]);
    Rt.push([pts[i].x - nx * w, pts[i].y - ny * w]);
  }
  const ring = [...L, ...Rt.reverse()];
  c.beginPath();
  c.moveTo(ring[0][0], ring[0][1]);
  for (let i = 1; i < ring.length - 1; i += 1) c.quadraticCurveTo(ring[i][0], ring[i][1], (ring[i][0] + ring[i + 1][0]) / 2, (ring[i][1] + ring[i + 1][1]) / 2);
  c.lineTo(ring[ring.length - 1][0], ring[ring.length - 1][1]);
  c.closePath();
  const k = g.thick ?? 0; // thick goo: a creamy streak, not a clear water line
  c.fillStyle = wetGrad(c, pts, k > 0 ? g.body : g.shade, (lite ? 0.55 : 0.5) + 0.35 * k);
  c.fill();
  if (lite) return;
  c.lineWidth = 1;
  c.strokeStyle = wetGrad(c, pts, k > 0 ? g.deep : g.ink, 0.28 + 0.22 * k);
  c.stroke();
  c.lineCap = 'round';
  c.lineJoin = 'round';
  c.strokeStyle = wetGrad(c, pts, '#ffffff', 0.7); // the streak's own shine, a little left of its middle
  c.lineWidth = Math.max(0.8, pts[n - 1].w * 0.28);
  c.beginPath();
  for (let i = 0; i < n; i += 1) {
    const x = pts[i].x - pts[i].w * 0.36;
    if (i) c.lineTo(x, pts[i].y); else c.moveTo(x, pts[i].y);
  }
  c.stroke();
}

/**
 * A goo drop on the screen glass, v2 (screen px, in front of the zoom; owner 2026-10-31 "more realistic in the
 * cartoony sense"): a lumpy splat with flung specks that gathers into a fat lens-like drop (pop-fx.js stepGlass moves
 * it), bulging before it slides, its streak of changing width beaded with tiny droplets and drying from the top,
 * droplets waiting below, a split-off drop; all fading out at the end of its life.
 * @param {CanvasRenderingContext2D} c context (screen transform)
 * @param {object} q the drop (pop-fx.js makeGlassDrop / stepGlass)
 * @returns {void}
 */
export function drawGlassDrop(c, q) {
  if (q.age < 0 || q.ph === undefined) return;
  const g = juicyGoo(q.goo);
  const fade = Math.max(0, Math.min(1, (q.life - q.age) / 0.9));
  const D = GLASS_DROP;
  const fling = Math.min(1, q.age / 0.1);
  const flung = 1 - (1 - fling) ** 3;
  c.save();
  c.globalAlpha = fade;
  const kid = q.trail.find((p) => p.kid);
  for (const h of [0, 1]) { // the streaks, under everything
    const hd = h ? kid : q;
    const pts = [];
    for (const p of q.trail) if (p.w !== undefined && p.h === h) pts.push({ x: p.x, y: p.y, w: p.w, a: Math.max(0, 1 - (q.age - p.t) / D.DRY) ** 0.8 });
    if (hd && !hd.gone && pts.length) {
      const r = glassRadius(q.r0, hd.m);
      pts.push({ x: hd.x, y: hd.y - r * 0.4, w: r * 0.5, a: 1 });
    }
    if (pts.length >= 2) drawStreak(c, pts, g, q.lite);
  }
  for (const s of q.specks) { // the specks flung out as it hit, drying where they landed
    const a = Math.max(0, Math.min(1, 1 - (q.age - 0.9) / 1));
    drawTinyDrop(c, q.x0 + Math.cos(s.a) * q.r0 * s.d * flung, q.y0 + Math.sin(s.a) * q.r0 * s.d * flung, q.r0 * s.k * (0.7 + 0.3 * flung), g, a * fade);
  }
  for (const p of q.trail) {
    if (p.b) drawTinyDrop(c, p.x, p.y, p.b, g, Math.max(0, Math.min(1, 1 - (q.age - p.t - 0.3) / (D.DRY + 0.4))) * fade);
    else if (p.dot) drawTinyDrop(c, p.x, p.y, p.d, g, fade * Math.min(1, q.age / 0.25));
  }
  c.globalAlpha = fade;
  const gather = Math.max(0, Math.min(1, (q.age - 0.04) / (D.GATHER - 0.04)));
  const ease = gather * gather * (3 - 2 * gather);
  const smash = 0.55 + 0.45 * Math.min(1, q.age / 0.05); // it smacks onto the glass
  for (const hd of [q, kid]) {
    if (!hd || hd.gone) continue;
    const main = hd === q;
    const R = glassRadius(q.r0, hd.m) * (main ? smash * (1 + 0.5 * (1 - ease)) : 1);
    const run = hd.ph === 'slip' ? Math.min(1, hd.vy / (70 * Math.max(0.8, q.r0 / 10))) : 0;
    drawLensDrop(c, hd.x, hd.y, R, { lump: main ? 1 - ease : 0, rim: q.rim, bulge: hd.bulge ?? 0, run, wob: main ? q.wob : 0, ph: q.age * 30 }, g, q.lite);
  }
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
