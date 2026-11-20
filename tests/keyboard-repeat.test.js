// SPDX-License-Identifier: Apache-2.0
// Exercise the real browser keyboard handlers from src/app.js with mock events.
// No browser dependency: extract only the keyboard handlers and reset function.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {runInContext, createContext} from 'node:vm';

const appSource = await readFile(new URL('../src/app.js', import.meta.url), 'utf8');
function section(start, end) {
  const from = appSource.indexOf(start);
  assert.ok(from !== -1, 'app.js missing ' + start);
  const to = appSource.indexOf(end, from);
  assert.ok(to > from, 'app.js missing section end ' + end);
  return appSource.slice(from, to);
}

function keyboardHarness() {
  const listeners = new Map();
  const state = {paused: false, finished: false, miniGame: null};
  const keys = new Set();
  const touch = new Set();
  const sandbox = createContext({
    state,
    keys,
    touch,
    started: true,
    window: {addEventListener(name, callback) {listeners.set(name, callback);}},
    document: {querySelectorAll() {return [];}},
    HTMLInputElement: class HTMLInputElement {},
    begin() {},
    togglePause() {},
    answer() {},
    interactNow() {}
  });
  // Evaluate the production keydown/keyup handlers, not a hand-copied replica.
  runInContext(section('const bindings = Object.freeze({',
    "for (const button of document.querySelectorAll('[data-drive]'))"), sandbox);
  runInContext(section('function clearControls() {',
    "window.addEventListener('blur'"), sandbox);
  function dispatch(type, code, repeat = false) {
    const callback = listeners.get(type);
    assert.equal(typeof callback, 'function', 'missing production ' + type + ' handler');
    let prevented = false;
    callback({code, repeat, target: {}, preventDefault() {prevented = true;}});
    return prevented;
  }
  return {
    state,
    keys,
    dispatch,
    clearControls() {runInContext('clearControls()', sandbox);}
  };
}

test('OS repeat cannot restore a held accelerator after grocery mini-game resets controls', () => {
  const h = keyboardHarness();
  assert.equal(h.dispatch('keydown', 'KeyW'), true);
  assert.ok(h.keys.has('forward'));
  // Enter groceries while W remains held: the actual clearControls() empties it.
  h.state.miniGame = {type: 'groceries', round: 0};
  h.clearControls();
  assert.equal(h.keys.has('forward'), false);

  h.dispatch('keydown', 'KeyW', true); // repeat while the mini-game is open
  assert.equal(h.keys.has('forward'), false);
  // Complete the answers 1/2/1 without physically releasing W.
  h.state.miniGame = null;
  h.dispatch('keydown', 'KeyW', true); // pending OS repeat afterward
  assert.equal(h.keys.has('forward'), false, 'repeat may not accelerate after mini-game');

  h.dispatch('keyup', 'KeyW');
  h.dispatch('keydown', 'KeyW', false);
  assert.ok(h.keys.has('forward'), 'fresh physical keydown must restore driving');
});

test('multiple physical keys survive independent releases, but repeat cannot restore a pause reset', () => {
  const h = keyboardHarness();
  h.dispatch('keydown', 'KeyW');
  h.dispatch('keydown', 'ArrowUp');
  h.dispatch('keyup', 'KeyW');
  assert.ok(h.keys.has('forward'), 'ArrowUp remains held after W release');

  h.state.paused = true;
  h.clearControls();
  h.state.paused = false;
  h.dispatch('keydown', 'ArrowUp', true);
  assert.equal(h.keys.has('forward'), false, 'repeat cannot restore throttle after pause');
  h.dispatch('keyup', 'ArrowUp');
  h.dispatch('keydown', 'ArrowUp');
  assert.ok(h.keys.has('forward'), 'new ArrowUp keydown works');

  h.clearControls();
  h.dispatch('keydown', 'Space', true);
  assert.equal(h.keys.has('brake'), false, 'brake cannot rearm via repeat either');
  h.dispatch('keyup', 'Space');
  h.dispatch('keydown', 'Space');
  assert.ok(h.keys.has('brake'), 'fresh brake keydown works');
});
