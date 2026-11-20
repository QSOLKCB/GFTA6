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
  const state = {paused: false, finished: false, miniGame: null, escape: {flight: null}};
  const keys = new Set();
  const touch = new Set();
  const answers = [];
  const sandbox = createContext({
    state,
    keys,
    touch,
    started: true,
    routeMode: 'errands',
    refreshHUD() {},
    window: {addEventListener(name, callback) {listeners.set(name, callback);}},
    document: {querySelectorAll() {return [];}},
    HTMLInputElement: class HTMLInputElement {},
    begin() {},
    togglePause() {state.paused = !state.paused;},
    answer(index) {answers.push(index);},
    interactNow() {}
  });
  // Evaluate the production keydown/keyup handlers, not a hand-copied replica.
  runInContext(section('const bindings = Object.freeze({',
    "for (const button of document.querySelectorAll('[data-drive]'))"), sandbox);
  runInContext(section('function clearControls() {',
    "window.addEventListener('blur'"), sandbox);
  function dispatch(type, code, repeat = false, target = {}) {
    const callback = listeners.get(type);
    assert.equal(typeof callback, 'function', 'missing production ' + type + ' handler');
    let prevented = false;
    callback({code, repeat, target, preventDefault() {prevented = true;}});
    return prevented;
  }
  return {
    state,
    keys,
    answers,
    routeMode() {return runInContext('routeMode', sandbox);},
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

test('vehicle dropdown keeps native arrow navigation while gameplay keys stay safe', () => {
  const h = keyboardHarness();
  const select = {closest(selector) {
    assert.equal(selector, 'select,textarea,button');
    return {tagName: 'SELECT'};
  }};
  assert.equal(h.dispatch('keydown', 'ArrowDown', false, select), false);
  assert.equal(h.keys.has('reverse'), false);
  assert.equal(h.dispatch('keydown', 'KeyW'), true);
  assert.equal(h.keys.has('forward'), true);
});

test('N toggles presentation guidance once per physical press without changing driving keys', () => {
  const h=keyboardHarness();
  assert.equal(h.routeMode(),'errands');
  assert.equal(h.dispatch('keydown','KeyN'),true);
  assert.equal(h.routeMode(),'escape');
  assert.equal(h.dispatch('keydown','KeyN',true),true);
  assert.equal(h.routeMode(),'escape','OS repeat must not double-toggle navigation');
  assert.equal(h.dispatch('keydown','KeyN'),true);
  assert.equal(h.routeMode(),'errands');
  assert.equal(h.keys.size,0,'route switch must not add driving control keys');
});

test('digit shortcuts work from focused mini-game choice; driving stays blocked on buttons', () => {
  const h=keyboardHarness();
  const choiceButton={closest(selector) {
    assert.equal(selector,'select,textarea,button');
    return {tagName:'BUTTON'};
  }};
  assert.equal(h.dispatch('keydown','KeyW',false,choiceButton),false);
  assert.equal(h.keys.has('forward'),false,'focused controls must not trigger driving');
  h.state.miniGame={type:'groceries',round:0};
  assert.equal(h.dispatch('keydown','Digit1',false,choiceButton),true);
  assert.deepEqual(h.answers,[0]);
  assert.equal(h.dispatch('keydown','Digit1',true,choiceButton),true);
  assert.deepEqual(h.answers,[0],'key repeat must not double-submit a mini-game answer');
});

test('real focusGame helper restores canvas only while driving is active', () => {
  const state={finished:false,miniGame:null};
  const focused=[];
  const sandbox=createContext({started:true,state,
    canvas:{focus(options) {focused.push(options.preventScroll);}}});
  runInContext(section('function focusGame() {','function interactNow() {'),sandbox);
  runInContext('focusGame()',sandbox);
  assert.deepEqual(focused,[true]);
  state.miniGame={type:'groceries'};
  runInContext('focusGame()',sandbox);
  state.miniGame=null;state.finished=true;
  runInContext('focusGame()',sandbox);
  assert.deepEqual(focused,[true],'must not steal focus from mini-games or ending');
});

test('both ending screens focus Replay exactly once and restore it on new completion',()=>{
  const focused=[];
  const ids=new Map();
  const $=id=>{
    if(!ids.has(id)) ids.set(id,{textContent:'',hidden:false,
      focus(options) {focused.push({id,preventScroll:options.preventScroll});}});
    return ids.get(id);
  };
  const state={finished:true,miniGame:null,tick:220,index:10,
    outcome:'YOU FORGOT THE MILK',moneyCents:6500,
    escape:{completedGigs:5,flight:{distance:2700}}};
  const sandbox=createContext({state,started:true,endingWasShown:false,
    shownMiniKey:'', $,moneyFmt:{format:n=>String(n)}});
  runInContext(section('function refreshMini() {','function refreshHUD() {'),sandbox);
  runInContext('refreshMini()',sandbox);
  runInContext('refreshMini()',sandbox);
  assert.deepEqual(focused,[{id:'play-again',preventScroll:true}]);
  assert.match(ids.get('ending-title').textContent,/FREEDOM FLIGHT/);
  state.finished=false;
  runInContext('refreshMini()',sandbox);
  state.finished=true;state.outcome='MISSION FAILED SUCCESSFULLY';
  runInContext('refreshMini()',sandbox);
  assert.equal(focused.length,2,'each new ending must focus Replay once');
  assert.match(ids.get('ending-title').textContent,/MISSION FAILED/);
});

test('P and Escape pause/resume from focused mini-game choice after window blur',()=>{
  const h=keyboardHarness();
  const button={closest(selector) {
    assert.equal(selector,'select,textarea,button');
    return {tagName:'BUTTON'};
  }};
  h.state.miniGame={type:'groceries',round:0};
  // Losing window focus while the quiz is open has paused the game.
  h.state.paused=true;
  assert.equal(h.dispatch('keydown','KeyP',false,button),true);
  assert.equal(h.state.paused,false,'P must resume from focused choice');
  assert.equal(h.dispatch('keydown','Escape',false,button),true);
  assert.equal(h.state.paused,true,'Escape must pause again');
  assert.equal(h.dispatch('keydown','Escape',true,button),true);
  assert.equal(h.state.paused,true,'OS repeat must not toggle pause');
  assert.equal(h.dispatch('keydown','Escape',false,button),true);
  assert.equal(h.state.paused,false,'Escape must resume from focused choice');
  assert.equal(h.dispatch('keydown','KeyW',false,button),false);
  assert.equal(h.dispatch('keydown','ArrowUp',false,button),false);
  assert.equal(h.keys.size,0,'never arm driving keys while a choice is focused');
  assert.equal(h.dispatch('keydown','Digit2',false,button),true);
  assert.deepEqual(h.answers,[1],'answer shortcut still works after resume');
});

test('toolbar buttons do not forward pause shortcuts when no mini-game is active',()=>{
  const h=keyboardHarness();
  const button={closest(selector) {
    assert.equal(selector,'select,textarea,button');
    return {tagName:'BUTTON'};
  }};
  assert.equal(h.dispatch('keydown','KeyP',false,button),false);
  assert.equal(h.dispatch('keydown','Escape',false,button),false);
  assert.equal(h.state.paused,false);
});
