// Developer page script for pop-fx-test.html: builds the page from the shared part and the six variants (popfx/).
import { start } from './popfx/shared.js';
import A from './popfx/a.js';
import B from './popfx/b.js';
import C from './popfx/c.js';
import D from './popfx/d.js';
import E from './popfx/e.js';
import F from './popfx/f.js';

start([A, B, C, D, E, F]);
