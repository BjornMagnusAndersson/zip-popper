// Developer page script for fx-test.html: builds the light, smoke and particle test page from the shared part
// (fx/core.js, read its README) and the effect files in fx/. Add a new effect to this list (and to src/sw.js PRECACHE).
import { start } from './fx/core.js';
import disco from './fx/disco.js';
import smoke from './fx/smoke.js';
import dust from './fx/dust.js';
import shine from './fx/shine.js';
import lamps from './fx/lamps.js';
import mood from './fx/mood.js';
import spotlight from './fx/spotlight.js';
import bokeh from './fx/bokeh.js';
import confetti from './fx/confetti.js';
import steam from './fx/steam.js';
import reveal from './fx/reveal.js';
import coins from './fx/coins.js';

start([disco, smoke, dust, shine, lamps, mood, spotlight, bokeh, confetti, steam, reveal, coins]);
