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
assert.ok(core.includes("from '../vendor/vanillajs/motion2d.js'"), 'must use pinned upstream physics');
const notice = await readFile(resolve(root, 'NOTICE'), 'utf8');
assert.ok(notice.includes('394fd455c6ce3bec9f0bf2c5d2a672b8c5454ab1'), 'pin missing');
console.log('Static browser entry, offline cache, originals, and engine pin: PASS');
