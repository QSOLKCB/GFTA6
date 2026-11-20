// SPDX-License-Identifier: Apache-2.0
// No NPM packages, network, frameworks or build steps.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
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
assert.ok(page.includes('id="start-dogfight"'),
  'independent air arcade start control must be bundled');
assert.ok(app.includes("createDogfightGame(seed, $('vehicle').value)"),
  'standalone launch must use a separate game factory');
assert.ok(app.includes("state.gameMode === 'dogfight'"),
  'Replay must preserve the independent arcade game mode');
assert.ok(sw.includes('gfta6-static-v0.3.0'),
  'new chip audio modules must rotate the offline asset cache');
const core = await readFile(resolve(root, 'src/core.js'), 'utf8');
const world = await readFile(resolve(root, 'src/world.js'), 'utf8');
const art = await readFile(resolve(root, 'src/vehicle-art.js'), 'utf8');
const vehicle = await readFile(resolve(root, 'src/vehicle.js'), 'utf8');
assert.ok(core.includes("from './vehicle.js'"), 'game core must use arcade car controller');
assert.ok(core.includes('export function createDogfightGame('),
  'separate arcade mode must not bypass the main createGame contract');
assert.ok(vehicle.includes("from '../vendor/vanillajs/motion2d.js'"), 'vehicle must use pinned VANILLAJS vectors and bodies');
assert.ok(paths.includes('src/vehicle.js'), 'offline cache must include car dynamics');
assert.ok(paths.includes('src/world.js'), 'offline cache must include city world');
assert.ok(paths.includes('src/cargo.js'), 'offline cache must include cargo rules');
assert.ok(core.includes("from './cargo.js'"), 'core must use pure cargo rules');
assert.ok(paths.includes('src/vehicle-art.js'), 'offline cache must include GFTA6 art bindings');
assert.ok(core.includes("from './world.js'"), 'city must be authored outside engine');
assert.ok(world.includes('CITY_VERSION'), 'city needs a stable schema marker');
assert.ok(art.includes('modelPath: null'), 'unlicensed third-party models must not be bundled');
assert.ok(page.includes('id="view-mode"'), '2.5D opt-in control missing');
assert.ok(app.includes("drawScene(canvas, state, {mode: renderMode, route: routeMode})"),
  'render and route selection must stay in the presentation layer');
assert.ok(paths.includes('src/scene25d.js'), 'offline cache missing projection adapter');
assert.ok(paths.includes('src/escape.js'), 'offline cache missing escape economy');
assert.ok(paths.includes('src/flight-view.js'), 'offline cache missing 2.5D flight vignette');
assert.ok(paths.includes('src/navigation.js'), 'offline cache missing route wayfinding');
assert.ok(app.includes('route: routeMode'), 'route switch must reach canvas presentation');
assert.ok(page.includes('id="route-mode"'), 'navigation toggle must be accessible');
const navigation=await readFile(resolve(root,'src/navigation.js'),'utf8');
assert.ok(navigation.includes('export function waypoint('),
  'pure GFTA6 waypoint helper missing');

const escape = await readFile(resolve(root,'src/escape.js'),'utf8');
assert.ok(escape.includes('ESCAPE_VERSION'), 'flight state must declare version');
assert.ok(core.includes("from './escape.js'"), 'optional campaign must use pure escape state');
assert.ok(app.includes("interactEscape(state,action)"), 'escape action controls not wired');
assert.ok(page.includes('id="takeoff"'), 'airfield takeoff button not wired');

assert.ok(paths.includes('vendor/vanillajs/projection25d.js'),
  'offline cache missing pinned projection engine');
const projectionAdapter = await readFile(resolve(root,'src/scene25d.js'),'utf8');
assert.ok(projectionAdapter.includes("from '../vendor/vanillajs/projection25d.js'"),
  'GFTA6 must consume the pinned upstream module');
const projectionData = await readFile(resolve(root,'vendor/vanillajs/projection25d.js'));
const gitBlobHash = createHash('sha1')
  .update('blob ' + projectionData.length + '\0')
  .update(projectionData).digest('hex');
assert.equal(gitBlobHash,'be6a75a90ab3d4061486442b263457e6b97e16df',
  'vendored projection source differs from exact upstream Git blob');
const gameCombat = await readFile(resolve(root,'src/aircombat.js'),'utf8');
assert.ok(gameCombat.includes('AIRCOMBAT_FORMAT'),'air combat state must be versioned');
assert.ok(core.includes("from './aircombat.js'"),'the game core must own the optional combat transition');
assert.ok(page.includes('id="aircombat-opt"'),'optional combat switch missing');
assert.ok(page.includes('data-drive="missile"'),'mobile missile control missing');
assert.ok(paths.includes('src/combat-targeting.js'),
  'offline cache missing strict physical target acquisition and gun-ray selector');
for(const path of ['src/aircombat.js','src/aircombat-view.js',
  'vendor/vanillajs/math/index.js','vendor/vanillajs/cockpit-rig/index.js',
  'vendor/vanillajs/missiles.js'])
  assert.ok(paths.includes(path),'offline cache missing '+path);
assert.ok(page.includes('id="start-airwar"')&&page.includes('id="export-airwar"'),
  'advanced airwar launch and sealed-world export controls missing');
for(const p of ['src/airwar.js','src/airwar-world.js'])
  assert.ok(paths.includes(p),'offline cache missing GFTA6 airwar adapter '+p);
const upstreamAirwarPins=[
  ['vendor/vanillajs/cad-geometry/index.js','10b69a5ea58878f5109e5d84a08f1ed9d370e1e9'],
  ['vendor/vanillajs/world-vis/index.js','0b8a887b9732be99b473bac7f11ce0084f37d8bf'],
  ['vendor/vanillajs/tactics/index.js','aadf803bf9b0f38b492af2ee09cd3953e277475d'],
  ['vendor/vanillajs/trajectory/index.js','c4d77688b1f0d76e070c981f7e21588683043e8a'],
  ['vendor/vanillajs/creator-interop/index.js','3ab939e8ea21efa3e51102e407d4cb6c59f51663'],
  ['vendor/vanillajs/geometry/index.js','921ec893482a37e2503886ef42af3cd0bb2baca4'],
  ['vendor/vanillajs/render-lit/index.js','def5f61785305de7335490a12fe15fef92f05929'],
  ['vendor/vanillajs/sensing/index.js','da7f221447277a32e9f1eac55f61d9e855ccf76a'],
  ['vendor/vanillajs/navigation/index.js','a1eb1814db836b6a8c841d2d41552232e23fdf78'],
  ['vendor/vanillajs/scene-graph/index.js','e35474f13f1920ff8cc55728683ee87e177427e1'],
  ['vendor/vanillajs/lead-solver/index.js','a39427287fb93fbca08919e3b7df16f74a3c261c'],
  ['vendor/vanillajs/collision/index.js','60975e1e1d5914f0610de2e3ed3cbb241ce7f571']
];
for(const [p,expected] of upstreamAirwarPins){
  assert.ok(paths.includes(p),'offline cache missing upstream system '+p);
  const bytes=await readFile(resolve(root,p));
  const hash=createHash('sha1').update('blob '+bytes.length+'\0').update(bytes).digest('hex');
  assert.equal(hash,expected,'upstream airwar Git blob differs from reviewed SHA: '+p);
}
const pins = [
  ['vendor/vanillajs/math/index.js','45e5fc4d6c6daa472a89fa59c80e6fd70b2c1455'],
  ['vendor/vanillajs/cockpit-rig/index.js','74010bb24625900e6eeb812c3064bda09d9898cb'],
  ['vendor/vanillajs/missiles.js','86094c7c0bf7d33ac962919b62eac7a72a68926d']
];
for(const [path,expected] of pins) {
  const bytes=await readFile(resolve(root,path));
  const hash=createHash('sha1').update('blob '+bytes.length+'\0')
    .update(bytes).digest('hex');
  assert.equal(hash,expected,'exact upstream Git blob mismatch: '+path);
}
assert.ok(page.includes('id="music"'),'music toggle missing');
assert.ok(page.includes('id="sound"'),'sound-effects toggle missing');
assert.ok(paths.includes('src/soundtrack.js')&&
  paths.includes('src/audio-player.js')&&paths.includes('src/audio-cues.js'),
  'offline cache missing game soundtrack or audio device adapter');
assert.ok(paths.includes('vendor/vanillajs/chip-audio/index.js'),
  'offline cache missing source-pinned chip module');
assert.ok(app.includes("from './audio-player.js'"),
  'game must instantiate the Web Audio adapter on game start');
const chipBytes=await readFile(resolve(root,'vendor/vanillajs/chip-audio/index.js'));
const chipBlob=createHash('sha1').update('blob '+chipBytes.length+'\0')
  .update(chipBytes).digest('hex');
assert.equal(chipBlob,'4b7f219deaf273fa7178558a3bb214bb003d8b6d',
  'chip-audio module differs from exact upstream Git blob');
const notice = await readFile(resolve(root, 'NOTICE'), 'utf8');
assert.ok(notice.includes('394fd455c6ce3bec9f0bf2c5d2a672b8c5454ab1'), 'pin missing');
console.log('Static browser entry, offline cache, originals, and engine pin: PASS');
