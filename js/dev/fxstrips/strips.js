// The test strips of the effect strips page (fx-strips.html, developer only), in the order the picker shows them.
// Each strip is its own file (format: see player.js).
import { STRIP as horn } from './strip-horn.js';
import { STRIP as prom } from './strip-prom.js';
import { STRIP as unicorn } from './strip-unicorn.js';
import { STRIP as scrub } from './strip-scrub.js';
import { STRIP as great } from './strip-great.js';

/** Every test strip, in picker order. */
export const STRIPS = [horn, prom, unicorn, scrub, great];
