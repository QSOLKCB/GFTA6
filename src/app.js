// SPDX-License-Identifier: Apache-2.0
import {createGame, stepGame, currentMission, distanceToPlace, placeById,
  interact, chooseMiniGame, setPaused, MINI_GAMES, TICK_HZ} from './core.js';
import {drawScene} from './render.js';

const $ = id => {
  const element = document.getElementById(id);
  if (!element) throw new Error('Missing game element: ' + id);
  return element;
};
const canvas = $('canvas');
let state = createGame(1988);
let started = false;
let soundEnabled = false;
let soundContext = null;
let shownMiniKey = '';
let lastHUDTick = -1;
const keys = new Set();
const touch = new Set();
const moneyFmt = new Intl.NumberFormat('en-AU', {style: 'currency', currency: 'AUD'});
const feed = Object.freeze([
  ['OUTRAGE CHANNEL A', '"This game is destroying civilisation!"'],
  ['OUTRAGE CHANNEL B', '"People complaining about this game are destroying civilisation!"'],
  ['THE PLAYER', '"Can someone tell me where the bloody dry cleaners are?"'],
  ['OUTRAGE CHANNEL A', '"The parking meters have an agenda!"'],
  ['OUTRAGE CHANNEL B', '"Not understanding the meter is the real issue!"'],
  ['THE PLAYER', '"The milk is getting warm. Please stop talking."']
]);
function ping(frequency = 660) {
  if (!soundEnabled) return;
  try {
    const Audio = window.AudioContext || window.webkitAudioContext;
    if (!Audio) return;
    soundContext ??= new Audio();
    if (soundContext.state === 'suspended') void soundContext.resume();
    const source = soundContext.createOscillator();
    const gain = soundContext.createGain();
    source.type = 'triangle'; source.frequency.setValueAtTime(frequency, soundContext.currentTime);
    gain.gain.setValueAtTime(0.055, soundContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, soundContext.currentTime + .16);
    source.connect(gain).connect(soundContext.destination);
    source.start(); source.stop(soundContext.currentTime + .16);
  } catch (error) {
    soundEnabled = false;
    $('sound').textContent = 'SOUND OFF';
    $('sound').setAttribute('aria-pressed', 'false');
    console.warn('Optional sound effect unavailable:', error);
  }
}
function begin() {
  try {
    const seed = Number($('seed').value);
    state = createGame(seed);
    $('seed').setCustomValidity('');
  } catch {
    $('seed').setCustomValidity('Enter an integer seed between 0 and 4294967295');
    $('seed').reportValidity();
    return;
  }
  started = true;
  shownMiniKey = ''; lastHUDTick = -1;
  keys.clear(); touch.clear();
  $('intro').hidden = true; $('ending').hidden = true; $('mini').hidden = true;
  canvas.focus({preventScroll: true});
  refreshHUD();
  ping(760);
}
function restart() {
  if (!started) return begin();
  state = createGame(state.seed);
  $('intro').hidden = true; $('ending').hidden = true; $('mini').hidden = true;
  keys.clear(); touch.clear(); shownMiniKey = ''; lastHUDTick = -1;
  refreshHUD(); canvas.focus({preventScroll: true});
}
function controlHeld(action) { return keys.has(action) || touch.has(action); }
function controls() {
  return {
    throttle: Number(controlHeld('forward')) - Number(controlHeld('reverse')),
    steer: Number(controlHeld('left')) - Number(controlHeld('right'))
  };
}
function interactNow() {
  if (!started || state.finished || state.paused) return;
  if (state.miniGame) return;
  const result = interact(state);
  if (result) ping(800);
  refreshHUD();
}
function answer(index) {
  if (!started || !state.miniGame || state.paused || state.finished) return;
  const correct = chooseMiniGame(state, index);
  ping(correct ? 880 : 260);
  shownMiniKey = '';
  refreshHUD();
}
function togglePause() {
  if (!started || state.finished) return;
  setPaused(state, !state.paused);
  keys.clear(); touch.clear();
  refreshHUD();
}
function refreshMini() {
  const mini = state.miniGame;
  $('mini').hidden = !started || !mini;
  $('ending').hidden = !started || !state.finished;
  if (state.finished) {
    const mins = Math.floor(state.tick / 22);
    $('ending-stats').textContent = 'ERRANDS: ' + state.index + ' • IN-GAME MINUTES LOST: ' +
      mins + ' • BANK BALANCE: ' + moneyFmt.format(state.moneyCents / 100) +
      ' • FREE WEEKEND: NOT UNLOCKED';
  }
  if (!mini) { shownMiniKey = ''; return; }
  const miniKey = mini.type + ':' + mini.round;
  if (miniKey === shownMiniKey) return;
  shownMiniKey = miniKey;
  const mission = currentMission(state);
  const prompt = MINI_GAMES[mini.type][mini.round];
  $('mini-type').textContent = mini.type === 'boss' ? 'NEW MISSION UNLOCKED / IMPOSSIBLE' : 'DOMESTIC MINI-GAME';
  $('mini-title').textContent = mission.title;
  $('mini-progress').textContent = mini.type === 'boss' ?
    'OBJECTIVE: COMPLETE A TASK THAT WAS NEVER ASSIGNED' :
    'STEP ' + (mini.round + 1) + ' / ' + MINI_GAMES[mini.type].length;
  $('mini-prompt').textContent = prompt.prompt;
  const choices = prompt.choices.map((choice, index) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = (index + 1) + ' / ' + choice;
    button.addEventListener('click', () => answer(index));
    return button;
  });
  $('mini-choices').replaceChildren(...choices);
}
function refreshHUD() {
  const mission = currentMission(state);
  $('mode-label').textContent = !started ? 'AWAITING SATURDAY' :
    state.finished ? 'SATURDAY LOST' : state.paused ? 'SATURDAY PAUSED' : 'DOMESTIC SURVIVAL ACTIVE';
  const timeMinutes = 9 * 60 + Math.floor(state.tick / 22);
  const hours = Math.floor(timeMinutes / 60) % 24;
  const minutes = timeMinutes % 60;
  $('clock').textContent = (timeMinutes >= 24 * 60 ? 'SUN ' : 'SAT ') +
    String(hours).padStart(2, '0') + ':' + String(minutes).padStart(2, '0');
  $('odo').textContent = Math.floor(state.distance) + ' m';
  $('seed-readout').textContent = String(state.seed);
  $('mission-title').textContent = mission?.title ?? 'WEEKEND OVER';
  $('mission-detail').textContent = mission?.description ?? 'Go and have a lie-down. You earned it.';
  $('destination').textContent = placeById(mission?.place)?.name ?? 'NONE';
  $('distance').textContent = mission ? Math.round(distanceToPlace(state, mission.place)) + ' m' : '0 m';
  $('task-progress').style.width = (100 * state.index / state.tasks.length) + '%';
  $('task-count').textContent = 'MISSION ' + Math.min(state.index + 1, state.tasks.length) +
    ' / ' + state.tasks.length + (state.ambushed ? ' • BONUS ERRAND UNLOCKED' : '');
  $('money').textContent = moneyFmt.format(state.moneyCents / 100);
  $('patience').textContent = state.patience + '%';
  $('goodwill').textContent = state.goodwill + '%';
  $('fuel').textContent = state.fuel + '%';
  $('money-bar').style.width = Math.max(0, Math.min(100, state.moneyCents / 8760 * 100)) + '%';
  $('patience-bar').style.width = state.patience + '%';
  $('goodwill-bar').style.width = state.goodwill + '%';
  $('fuel-bar').style.width = state.fuel + '%';
  $('message').textContent = state.message;
  const i = Math.floor(state.tick / 480) % feed.length;
  $('feed-channel').textContent = feed[i][0];
  $('feed-text').textContent = feed[i][1];
  $('log').replaceChildren(...state.log.map(entry => {
    const li = document.createElement('li');
    li.textContent = entry.message;
    return li;
  }));
  $('pause').textContent = state.paused ? 'RESUME' : 'PAUSE';
  refreshMini();
}
$('start').addEventListener('click', begin);
$('restart').addEventListener('click', restart);
$('play-again').addEventListener('click', restart);
$('pause').addEventListener('click', togglePause);
$('interact').addEventListener('click', interactNow);
$('sound').addEventListener('click', () => {
  soundEnabled = !soundEnabled;
  $('sound').textContent = soundEnabled ? 'SOUND ON' : 'SOUND OFF';
  $('sound').setAttribute('aria-pressed', String(soundEnabled));
  if (soundEnabled) ping(680);
});
const bindings = Object.freeze({
  KeyW: 'forward', ArrowUp: 'forward', KeyS: 'reverse', ArrowDown: 'reverse',
  KeyA: 'left', ArrowLeft: 'left', KeyD: 'right', ArrowRight: 'right'
});
const keyHeld = new Set();
function syncKeys() { keys.clear(); for (const action of keyHeld) keys.add(action); }
window.addEventListener('keydown', event => {
  if (event.target instanceof HTMLInputElement) {
    if (event.code === 'Enter' && !started) { event.preventDefault(); begin(); }
    return;
  }
  if (event.code in bindings) {
    event.preventDefault();
    if (!event.repeat && started && !state.paused && !state.finished && !state.miniGame) {
      keyHeld.add(bindings[event.code]); syncKeys();
    }
    return;
  }
  if (['Space', 'KeyE', 'KeyP', 'Escape', 'Enter', 'Digit1', 'Digit2', 'Digit3', 'Digit4'].includes(event.code))
    event.preventDefault();
  if (event.repeat) return;
  if (!started && event.code === 'Enter') return begin();
  if (event.code === 'KeyP' || event.code === 'Escape') return togglePause();
  if (!started) return;
  if (state.miniGame && /^Digit[1-4]$/.test(event.code))
    return answer(Number(event.code.slice(-1)) - 1);
  if (event.code === 'KeyE' || event.code === 'Enter') interactNow();
});
window.addEventListener('keyup', event => {
  if (!(event.code in bindings)) return;
  keyHeld.delete(bindings[event.code]);
  syncKeys();
});
for (const button of document.querySelectorAll('[data-drive]')) {
  const action = button.getAttribute('data-drive');
  button.addEventListener('pointerdown', event => {
    if (!started || state.paused || state.finished || state.miniGame) return;
    event.preventDefault();
    button.setPointerCapture?.(event.pointerId);
    touch.add(action); button.classList.add('pressed');
  });
  const release = () => { touch.delete(action); button.classList.remove('pressed'); };
  button.addEventListener('pointerup', release);
  button.addEventListener('pointercancel', release);
  button.addEventListener('lostpointercapture', release);
}
function clearControls() {
  keyHeld.clear(); keys.clear(); touch.clear();
  for (const b of document.querySelectorAll('[data-drive]')) b.classList.remove('pressed');
}
window.addEventListener('blur', () => {
  clearControls();
  if (started && !state.finished) setPaused(state, true);
});
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    clearControls();
    if (started && !state.finished) setPaused(state, true);
  }
});
let priorTime = null;
let accumulator = 0;
function frame(time) {
  if (priorTime === null) priorTime = time;
  const elapsed = Math.min(250, Math.max(0, time - priorTime));
  priorTime = time;
  if (started && !state.paused && !state.finished && !state.miniGame) {
    accumulator += elapsed;
    let steps = 0;
    const duration = 1000 / TICK_HZ;
    while (accumulator >= duration && steps < 8) {
      stepGame(state, controls());
      accumulator -= duration; steps += 1;
    }
    if (steps === 8) accumulator = 0;
  } else accumulator = 0;
  drawScene(canvas, state);
  if (state.tick !== lastHUDTick || state.paused || state.finished) {
    if (state.tick % 6 === 0 || lastHUDTick < 0 || state.paused || state.finished) {
      refreshHUD();
      lastHUDTick = state.tick;
    }
  }
  requestAnimationFrame(frame);
}
refreshHUD();
requestAnimationFrame(frame);

// Service worker is optional: the game still runs on ordinary static hosts.
if ('serviceWorker' in navigator &&
    (location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1')) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(error => {
      console.warn('Offline cache unavailable; the game still works while online:', error);
    });
  });
}
