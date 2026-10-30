// Effect 1 for the light test page (fx-test.html): a disco ball and its beams. A mirror ball hangs on a short string
// from the top of the stage, its grid of mirror facets shaded as a sphere and scrolling sideways as it turns; facets
// that catch the light flash, and a couple of star glints twinkle on it. From the ball, five soft coloured beams
// (pink, violet, blue, gold, a soft green) sweep slowly through the room, drawn as additive light that fades with
// distance; many small light spots (the ball's reflections) crawl over the walls, the floor and the face, turning
// round the ball. With smoke on (shared.haze) the beams also light up the haze, so they read as shafts in the smoke.
// Party mood: full strength. Normal studio: softer. Still: ball, beams and spots stand still.
// See the README in core.js for the effect interface.
import { clamp, smooth, TAU } from './sprites.js';

/** The beam colours, as "r,g,b": pink, violet, blue, gold, soft green. */
const COLOURS = ['255,72,176', '158,92,255', '64,156,255', '255,192,64', '88,240,156'];
/** The reflections' colours: the beams' plus a warm white. */
const SPOT_COLOURS = [...COLOURS, '255,248,236', '255,248,236'];
const INK = '#2a211d';

/** A repeatable random 0..1 for a whole number. @param {number} n any number @returns {number} 0..1 */
function hash(n) {
  const x = Math.sin(n * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
}

/**
 * Paint one beam sprite into a canvas: a long soft wedge, narrow at the ball and wide far off, bright along its
 * middle with soft edges, fading out with distance. Drawn pixel by pixel once (pointing right, ball at the left).
 * @param {CanvasRenderingContext2D} c the sprite's context
 * @param {number} w width (the beam's length)
 * @param {number} h height (the beam's width at its far end)
 * @param {string} rgb colour "r,g,b"
 * @returns {void}
 */
function paintBeam(c, w, h, rgb) {
  const [r, g, b] = rgb.split(',').map(Number);
  const img = c.createImageData(w, h);
  for (let x = 0; x < w; x += 1) {
    const u = x / w;
    const hw = 0.07 + 0.93 * u; // the wedge's half width, as a share of h / 2
    const along = (1 - u) ** 1.7 * smooth(Math.min(1, u * 14));
    for (let y = 0; y < h; y += 1) {
      const v = Math.abs((y + 0.5 - h / 2) / (h / 2));
      const across = 1 - v / hw;
      if (across <= 0) continue;
      const prof = smooth(across) ** 1.4;
      const a = prof * along;
      const white = prof ** 5 * 0.4 * (1 - u) ** 2; // a whiter core near the ball
      const p = (y * w + x) * 4;
      img.data[p] = r + (255 - r) * white;
      img.data[p + 1] = g + (255 - g) * white;
      img.data[p + 2] = b + (255 - b) * white;
      img.data[p + 3] = Math.round(clamp(a, 0, 1) * 255);
    }
  }
  c.putImageData(img, 0, 0);
}

/**
 * A four-point star glint (long thin rays) round (x, y).
 * @param {CanvasRenderingContext2D} c context
 * @param {number} x centre x
 * @param {number} y centre y
 * @param {number} s ray length
 * @returns {void}
 */
function glintPath(c, x, y, s) {
  const k = s * 0.09;
  c.beginPath();
  c.moveTo(x, y - s);
  c.quadraticCurveTo(x + k, y - k, x + s, y);
  c.quadraticCurveTo(x + k, y + k, x, y + s);
  c.quadraticCurveTo(x - k, y + k, x - s, y);
  c.quadraticCurveTo(x - k, y - k, x, y - s);
  c.closePath();
}

/**
 * Make the disco ball for this scene.
 * @param {object} env the page's env (see core.js README)
 * @returns {object} hooks
 */
function make(env) {
  const { W, H, sc, party, still, face, room } = env;
  const strength = party ? 1 : 0.7; // softer in a lit studio, where added light washes out
  // Where it hangs: above the head in the middle (upright), off to the right of the head on a sideways screen.
  const R = clamp(Math.min(W, H) * 0.088, 16, 44);
  let bx = W / 2;
  let by = Math.max(R + 16, H * 0.1);
  if (face && room.land) {
    bx = Math.min(W - R * 2.2, (face.cx + face.rx * 1.35 + W) / 2 - R * 0.4);
    by = Math.max(R + 18, H * 0.2);
  } else if (face) {
    by = clamp(face.top - R - 8, R + 14, H * 0.12);
  }
  const L = Math.hypot(W, H) * 1.05; // beam length: past every corner
  const beamScale = env.lite ? 0.35 : 0.5; // the beam buffer's pixels per CSS px
  const aim = Math.atan2(H * 0.72 - by, W / 2 - bx); // the beams fan out round this direction
  const nBeams = env.lite ? 4 : 5;
  const beams = [];
  for (let i = 0; i < nBeams; i += 1) {
    beams.push({
      rgb: COLOURS[i % COLOURS.length],
      off: (i / (nBeams - 1) - 0.5) * 1.7,
      speed: 0.32 + 0.09 * i,
      phase: i * 1.9 + env.rand() * 0.5,
      amp: 0.38 + env.rand() * 0.18,
      half: 0.055 + env.rand() * 0.03, // half the wedge's opening angle
    });
  }
  const spots = [];
  for (let i = 0, n = env.count(110); i < n; i += 1) {
    spots.push({
      lon: env.rand() * TAU,
      lat: -0.3 + env.rand() * 1.62, // 0 = level with the ball, more = lower down (pi/2 straight below)
      rgb: SPOT_COLOURS[Math.floor(env.rand() * SPOT_COLOURS.length)],
      size: 0.6 + env.rand() * 0.9,
      tw: env.rand() * TAU,
    });
  }
  const glints = [0, 1, 2].map((i) => ({ period: 1.7 + i * 0.45, phase: env.rand() * 3, seed: i * 7 + 3 }));
  const beamSprites = COLOURS.map((rgb) => env.sprite(`beam:${rgb}`, 512, 96, (c, w, h) => paintBeam(c, w, h, rgb), 1));
  const shade = env.sprite(`ballshade:${R}`, R * 2 + 4, R * 2 + 4, (c, w) => {
    const m = w / 2;
    const g = c.createRadialGradient(m - R * 0.38, m - R * 0.42, R * 0.05, m, m, R);
    g.addColorStop(0, 'rgba(255,255,255,0.32)');
    g.addColorStop(0.45, 'rgba(255,255,255,0)');
    g.addColorStop(0.8, 'rgba(24,12,44,0.18)');
    g.addColorStop(1, 'rgba(24,12,44,0.55)');
    c.fillStyle = g;
    c.beginPath(); c.arc(m, m, R, 0, TAU); c.fill();
  });
  const halo = env.glow('236,200,255');
  const spotSprites = Object.fromEntries(SPOT_COLOURS.map((rgb) => [rgb, env.dot(rgb, 0.38)]));
  const star = env.dot('255,255,255', 0.12);
  const tilt = -0.32; // we look up at the ball a little, so its underside shows
  const ct = Math.cos(tilt);
  const st = Math.sin(tilt);
  const light = norm(-0.55, 0.62, 0.56); // lit from the upper left, in front
  const halfway = norm(light[0], light[1], light[2] + 1); // half way between the light and the eye (for the flashes)

  /** The scene time the drawing uses (frozen when still). @returns {number} seconds */
  const clock = () => (still ? 4.2 : env.t);
  /** How far the ball has turned. @returns {number} radians */
  const turn = () => clock() * 0.42;

  /** Point a beam: the direction it shines now. @param {object} b the beam @returns {number} angle in radians */
  function beamAngle(b) {
    if (still) return aim + b.off * 1.15; // still: a calm, even fan
    return aim + b.off + Math.sin(clock() * b.speed + b.phase) * b.amp;
  }

  /** Draw every beam with the current composite (from the ball outwards). @param {CanvasRenderingContext2D} c context @param {number} alpha strength @returns {void} */
  function drawBeams(c, alpha) {
    for (const [i, b] of beams.entries()) {
      const a = beamAngle(b);
      const halfW = L * Math.tan(b.half);
      const pulse = still ? 1 : 0.82 + 0.18 * Math.sin(clock() * (1.1 + i * 0.23) + i);
      c.save();
      c.translate(bx, by);
      c.rotate(a);
      c.globalAlpha = clamp(alpha * pulse, 0, 1);
      c.drawImage(beamSprites[i % beamSprites.length], R * 0.5, -halfW, L, halfW * 2);
      c.restore();
    }
  }

  /**
   * The beams: drawn soft into a low-res buffer (they are soft, so the low resolution never shows) and added to the
   * stage in one go. With smoke on, a second buffer holds the beams cut to the haze's shape (destination-in), added
   * on top, so the light shows most where the smoke is thick: light shafts in the haze.
   * @param {CanvasRenderingContext2D} c the stage context
   * @param {{canvas: HTMLCanvasElement, scale: number}|null} haze the smoke's haze picture, or null
   * @returns {void}
   */
  function drawAllBeams(c, haze) {
    const bb = env.buffer('disco-beams', beamScale);
    bb.ctx.globalCompositeOperation = 'lighter';
    drawBeams(bb.ctx, 1);
    c.globalCompositeOperation = 'lighter';
    c.globalAlpha = (party ? 0.5 : 0.4) * (haze ? 0.7 : 1);
    c.drawImage(bb.canvas, 0, 0, W, H);
    if (haze) {
      const lit = env.buffer('disco-lit', haze.scale);
      lit.ctx.setTransform(1, 0, 0, 1, 0, 0);
      lit.ctx.drawImage(bb.canvas, 0, 0, lit.canvas.width, lit.canvas.height);
      lit.ctx.globalCompositeOperation = 'destination-in';
      lit.ctx.drawImage(haze.canvas, 0, 0, lit.canvas.width, lit.canvas.height);
      lit.ctx.globalCompositeOperation = 'lighter';
      lit.ctx.drawImage(lit.canvas, 0, 0); // twice as bright (the haze is thin, the light in it should glow)
      c.globalAlpha = party ? 1 : 0.75;
      c.drawImage(lit.canvas, 0, 0, W, H);
    }
    c.globalAlpha = 1;
  }

  /** The reflections crawling round the room: soft coloured dots on a big pretend sphere round the ball. @param {CanvasRenderingContext2D} c context @returns {void} */
  function drawSpots(c) {
    const rot = turn();
    const Rx = Math.max(bx, W - bx) * 1.25; // the pretend sphere reaches just past the far side of the stage
    const Ry = H * 0.98;
    const base = 6.5 * sc;
    c.globalCompositeOperation = 'lighter';
    for (const s of spots) {
      const a = s.lon + rot;
      const cz = Math.cos(a);
      if (cz < 0.04) continue; // on the far side
      const x = bx + Math.sin(a) * Math.cos(s.lat) * Rx;
      const y = by + Math.sin(s.lat) * Ry;
      if (x < -20 || x > W + 20 || y < -20 || y > H + 20) continue;
      const far = Math.hypot(x - bx, y - by) / Math.hypot(W, H);
      const z = base * s.size * (0.55 + 0.45 * cz) * (0.65 + far * 1.1);
      const tw = still ? 0.85 : 0.7 + 0.3 * Math.sin(clock() * 2.6 + s.tw);
      c.globalAlpha = clamp(cz ** 0.6 * tw * strength * 0.95, 0, 1);
      const flat = y > room.floorY ? 0.45 : 1; // on the floor the spots lie flat
      const stretch = still ? 1 : 1 + 0.35 * cz; // a little smeared along the way they move
      c.drawImage(spotSprites[s.rgb], x - z * stretch, y - z * flat, z * 2 * stretch, z * 2 * flat);
    }
    c.globalAlpha = 1;
  }

  /** The mirror ball itself: string, cap, facets, shading, outline, then the flashes. @param {CanvasRenderingContext2D} c context @returns {void} */
  function drawBall(c) {
    const rot = turn();
    const t = clock();
    c.globalCompositeOperation = 'lighter'; // a soft halo round it
    c.globalAlpha = party ? 0.55 : 0.3;
    c.drawImage(halo, bx - R * 3.2, by - R * 3.2, R * 6.4, R * 6.4);
    c.globalAlpha = 1;
    c.globalCompositeOperation = 'source-over';
    c.strokeStyle = party ? '#8d84a8' : '#5c5648'; // the string
    c.lineWidth = Math.max(1.2, R * 0.06);
    c.beginPath(); c.moveTo(bx, 0); c.lineTo(bx, by - R * 0.95); c.stroke();
    c.fillStyle = '#c9c3d6'; // the little cap it hangs from
    c.beginPath(); c.roundRect(bx - R * 0.18, by - R * 1.12, R * 0.36, R * 0.26, R * 0.06); c.fill();
    c.fillStyle = '#2d2945'; // the dark grout between the mirrors
    c.beginPath(); c.arc(bx, by, R, 0, TAU); c.fill();
    const nLat = 8;
    const nLon = 18;
    const gap = 0.14; // facets shrink this much toward their middle, so the grid shows
    for (let i = 0; i < nLat; i += 1) {
      const la0 = -Math.PI / 2 + (i / nLat) * Math.PI;
      const la1 = la0 + Math.PI / nLat;
      const lam = (la0 + la1) / 2;
      for (let j = 0; j < nLon; j += 1) {
        const lo0 = (j / nLon) * TAU + rot;
        const lo1 = lo0 + TAU / nLon;
        const lom = (lo0 + lo1) / 2;
        const n = project(lam, lom);
        if (n[2] <= 0.02) continue; // facing away
        const pts = [project(la0, lo0), project(la0, lo1), project(la1, lo1), project(la1, lo0)].filter((p) => p[2] > -0.05);
        if (pts.length < 3) continue;
        const id = i * 97 + j;
        const diffuse = Math.max(0, dot3(n, light));
        const spec = Math.max(0, dot3(n, halfway)) ** 24;
        const flash = !still && hash(id * 3.1 + Math.floor(t * 5 + hash(id) * 5)) < 0.035 ? 1 : 0;
        const tint = hash(id + 0.5) < 0.32 ? COLOURS[Math.floor(hash(id + 1.7) * COLOURS.length)] : null;
        let v = 0.32 + 0.42 * diffuse + (hash(id + 9.1) - 0.5) * 0.28; // mirrors show bits of the room: a patchwork
        v = clamp(v, 0.12, 0.95);
        let rgb = [196 * v + 20, 200 * v + 20, 222 * v + 26];
        if (tint) { const tc = tint.split(',').map(Number); rgb = rgb.map((x, k) => x * 0.55 + tc[k] * 0.45 * (0.5 + v * 0.6)); }
        const white = clamp(spec * 1.6 + flash, 0, 1);
        rgb = rgb.map((x) => x + (255 - x) * white);
        c.fillStyle = `rgb(${rgb[0] | 0},${rgb[1] | 0},${rgb[2] | 0})`;
        const mx = bx + n[0] * R;
        const my = by - n[1] * R;
        c.beginPath();
        for (const [k, p] of pts.entries()) {
          const px = bx + p[0] * R;
          const py = by - p[1] * R;
          const qx = px + (mx - px) * gap;
          const qy = py + (my - py) * gap;
          if (k) c.lineTo(qx, qy); else c.moveTo(qx, qy);
        }
        c.closePath();
        c.fill();
      }
    }
    c.drawImage(shade, bx - R - 2, by - R - 2, R * 2 + 4, R * 2 + 4);
    c.fillStyle = 'rgba(255,255,255,0.55)'; // the cartoon shine at the top left
    c.beginPath(); c.ellipse(bx - R * 0.42, by - R * 0.46, R * 0.2, R * 0.11, -0.7, 0, TAU); c.fill();
    c.strokeStyle = INK;
    c.globalAlpha = 0.8;
    c.lineWidth = Math.max(1.5, R * 0.07);
    c.beginPath(); c.arc(bx, by, R, 0, TAU); c.stroke();
    c.globalAlpha = 1;
    // Star glints that pop up on the ball and fade (one steady one when still).
    c.globalCompositeOperation = 'lighter';
    for (const g of glints) {
      const k = still ? (g.seed === 3 ? 0.8 : 0) : Math.max(0, Math.sin(((t + g.phase) / g.period) * Math.PI)) ** 6;
      if (k < 0.02) continue;
      const cyc = Math.floor((t + g.phase) / g.period);
      const a = hash(cyc * 13 + g.seed) * TAU;
      const d = 0.25 + hash(cyc * 7 + g.seed) * 0.55;
      const x = still ? bx - R * 0.35 : bx + Math.cos(a) * R * d;
      const y = still ? by - R * 0.3 : by + Math.sin(a) * R * d * 0.9;
      const s = R * (still ? 0.4 : 0.55 + 0.35 * k);
      c.globalAlpha = k;
      c.drawImage(star, x - s * 0.5, y - s * 0.5, s, s);
      c.fillStyle = 'rgba(255,255,255,0.95)';
      glintPath(c, x, y, s);
      c.fill();
    }
    c.globalAlpha = 1;
    c.globalCompositeOperation = 'source-over';
  }

  /** A point on the ball (latitude, longitude) seen from the front, tilted. @param {number} la latitude @param {number} lo longitude @returns {number[]} [x, y, z] (z > 0 faces us) */
  function project(la, lo) {
    const x = Math.cos(la) * Math.sin(lo);
    const y = Math.sin(la);
    const z = Math.cos(la) * Math.cos(lo);
    return [x, y * ct - z * st, y * st + z * ct];
  }

  return {
    /** Nothing to move: everything is worked out from the clock while drawing. @returns {void} */
    step() {},
    /** Outside the party the room's lights go down a little when the ball starts, so its light shows (the face stays lit). @param {CanvasRenderingContext2D} c context @returns {void} */
    back(c) {
      if (party) return;
      c.fillStyle = `rgba(28,18,52,${[0.22, 0.28, 0.34][env.tier] ?? 0.25})`;
      c.fillRect(0, 0, W, H);
    },
    /** Draw the reflections, the beams (and their light in the smoke), then the ball. @param {CanvasRenderingContext2D} c context @returns {void} */
    draw(c) {
      env.shared.lights?.push({ x: bx, y: by, rgb: '240,220,255', a: strength });
      drawSpots(c);
      drawAllBeams(c, env.shared.haze);
      c.globalCompositeOperation = 'source-over';
      drawBall(c);
    },
    /** Where the ball is, for checks. @returns {object} state */
    state: () => ({ ball: { x: Math.round(bx), y: Math.round(by), r: Math.round(R) }, beams: beams.length, spots: spots.length }),
  };
}

/** A vector made one long. @param {number} x x @param {number} y y @param {number} z z @returns {number[]} unit vector */
function norm(x, y, z) {
  const l = Math.hypot(x, y, z) || 1;
  return [x / l, y / l, z / l];
}

/** The dot product of two 3D vectors. @param {number[]} a vector @param {number[]} b vector @returns {number} dot */
function dot3(a, b) {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

export default { id: 'disco', num: 1, name: 'Disco', layer: 'front', order: 60, make };
