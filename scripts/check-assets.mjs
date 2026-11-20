// SPDX-License-Identifier: Apache-2.0
// No NPM packages, network, frameworks or build steps.
import assert from 'node:assert/strict';
import {readFile, access} from 'node:fs/promises';
import {resolve, dirname} from 'node:path';
import {fileURLToPath} from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const page = await readFile(resolve(root, 'index.html'), 'utf8');
const app = await readFile(resolve(root, 'src/app.js'), 'utf8');
const sw = await readFile(resolve(root, 'sw.js'), 'utf8');
const paths = [...sw.matchAll(/'\.\/([^']+)'/g)].map(m => m[1]);
for (const path of paths) {
  if (path === '') continue;
  await access(resolve(root, path));
}
assert.ok(page.includes('src="./src/app.js"'), 'game entry must be wired');
assert.ok(page.includes('./assets/gfta6-banner.svg'), 'banner must appear');
assert.ok(app.includes("from './core.js'"), 'app must import deterministic rules');
assert.ok(app.includes("from './render.js'"), 'app must import canvas renderer');
const core = await readFile(resolve(root, 'src/core.js'), 'utf8');
const world = await readFile(resolve(root, 'src/world.js'), 'utf8');
const art = await readFile(resolve(root, 'src/vehicle-art.js'), 'utf8');
const vehicle = await readFile(resolve(root, 'src/vehicle.js'), 'utf8');
assert.ok(core.includes("from './vehicle.js'"), 'game core must use arcade car controller');
assert.ok(vehicle.includes("from '../vendor/vanillajs/motion2d.js'"), 'vehicle must use pinned VANILLAJS vectors and bodies');
assert.ok(paths.includes('src/vehicle.js'), 'offline cache must include car dynamics');
assert.ok(paths.includes('src/world.js'), 'offline cache must include city world');
assert.ok(paths.includes('src/cargo.js'), 'offline cache must include cargo rules');
assert.ok(core.includes("from './cargo.js'"), 'core must use pure cargo rules');
assert.ok(paths.includes('src/vehicle-art.js'), 'offline cache must include GFTA6 art bindings');
assert.ok(core.includes("from './world.js'"), 'city must be authored outside engine');
assert.ok(world.includes('CITY_VERSION'), 'city needs a stable schema marker');
assert.ok(art.includes('modelPath: null'), 'unlicensed third-party models must not be bundled');
const notice = await readFile(resolve(root, 'NOTICE'), 'utf8');
assert.ok(notice.includes('394fd455c6ce3bec9f0bf2c5d2a672b8c5454ab1'), 'pin missing');
console.log('Static browser entry, offline cache, originals, and engine pin: PASS');
