// SPDX-License-Identifier: Apache-2.0
import {createGame, createDogfightGame, createAirWarGame, stepGame, currentMission, distanceToPlace, placeById,
  interact, chooseMiniGame, setPaused, MINI_GAMES, TICK_HZ} from './core.js';
import {drawScene} from './render.js';
import {cargoCapacity, cargoUsed, cargoItemById, cargoJobById} from './cargo.js';
import {interactEscape, escapeObjective} from './core.js';
import {RESTORATION, ESCAPE_TARGET_CENTS, nextUpgrade} from './escape.js';
import {waypoint} from './navigation.js';
import {AIRCOMBAT_WAVES, AIRCOMBAT_FINAL_TEXT, combatRackSummary,combatLockStatus} from './aircombat.js';
import {MISSILE_ACQUIRE_TICKS} from './combat-targeting.js';
import {createAudioPlayer} from './audio-player.js';
import {combatAudioCues} from './audio-cues.js';
import {exportAirWarWorld,verifyAirWarWorld} from './airwar-world.js';

const $ = id => {
  const element = document.getElementById(id);
  if (!element) throw new Error('Missing game element: ' + id);
  return element;
};
const canvas = $('canvas');
let state = createGame(1988);
let started = false;
// Presentation only. This value must never become part of deterministic game state.
let renderMode = 'classic';
let routeMode = 'errands';
let soundEnabled = true;
let musicEnabled = true;
// The browser AudioContext is created only after a real user start/toggle click.
const audio = createAudioPlayer(window.AudioContext || window.webkitAudioContext);
let shownMiniKey = '';
let endingWasShown = false;
let lastHUDTick = -1;
let lastFlightStatus = null;
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
function sceneForState() {
  return state.finished ? null : state.airCombat ?
    AIRCOMBAT_WAVES[state.airCombat.stage]?.boss ? 'boss' : 'dogfight' :
    state.escape.flight ? 'flight' : 'saturday';
}
function syncAudio() {
  audio.setScene(started?sceneForState():null);
  audio.setPaused(!started || state.paused || document.hidden);
}
function activateAudio() {
  try {
    syncAudio();
    // Context construction occurs synchronously inside the user gesture;
    // continuation and score rendering never affect the game simulation.
    void audio.activate().catch(e=>console.warn('Optional chip audio unavailable:',e));
  } catch (error) {
    console.warn('Optional chip audio unavailable:',error);
  }
}
function ping(frequency = 660) {
  void frequency; // Existing UI notification semantic, now an original PCM cue.
  if(soundEnabled)audio.effect('ui');
}

function begin(mode = 'saturday') {
  try {
    const seed = Number($('seed').value);
    state = mode === 'airwar' ?
      createAirWarGame(seed, $('vehicle').value) :
      mode === 'dogfight' ? createDogfightGame(seed, $('vehicle').value) :
      createGame(seed, $('vehicle').value,
        {airCombat: $('aircombat-opt').checked});
    $('seed').setCustomValidity('');
  } catch {
    $('seed').setCustomValidity('Enter an integer seed between 0 and 4294967295');
    $('seed').reportValidity();
    return;
  }
  started = true;
  shownMiniKey = ''; lastHUDTick = -1;
  clearControls();
  $('intro').hidden = true; $('ending').hidden = true; $('mini').hidden = true;
  canvas.focus({preventScroll: true});
  refreshHUD();
  activateAudio();
  ping(760);
}
function restart() {
  if (!started) return begin();
  state = state.gameMode === 'airwar' ?
    createAirWarGame(state.seed,state.profile) :
    state.gameMode === 'dogfight' ?
      createDogfightGame(state.seed, state.profile) :
      createGame(state.seed, state.profile,
        {airCombat: state.airCombatEnabled});
  $('intro').hidden = true; $('ending').hidden = true; $('mini').hidden = true;
  clearControls(); shownMiniKey = ''; lastHUDTick = -1;
  refreshHUD(); canvas.focus({preventScroll: true});
  activateAudio();
}
function controlHeld(action) { return keys.has(action) || touch.has(action); }
function controls() {
  return {
    throttle: Number(controlHeld('forward')) - Number(controlHeld('reverse')),
    steer: Number(controlHeld('left')) - Number(controlHeld('right')),
    brake: controlHeld('brake'),
    missile: controlHeld('missile')
  };
}
function focusGame() {
  if (started && !state.finished && !state.miniGame)
    canvas.focus({preventScroll: true});
}
function interactNow() {
  if (!started || state.finished || state.paused) return;
  if (state.miniGame) return;
  const result = interact(state);
  if (result) ping(800);
  refreshHUD();
  focusGame();
}
function answer(index) {
  if (!started || !state.miniGame || state.paused || state.finished) return;
  const correct = chooseMiniGame(state, index);
  ping(correct ? 880 : 260);
  shownMiniKey = '';
  refreshHUD();
  focusGame();
}
function togglePause() {
  if (!started || state.finished) return;
  setPaused(state, !state.paused);
  clearControls();
  refreshHUD();
  syncAudio();
  focusGame();
}
function refreshMini() {
  const mini = state.miniGame;
  $('mini').hidden = !started || !mini;
  $('ending').hidden = !started || !state.finished;
  if (!state.finished) endingWasShown = false;
  if (state.finished && !endingWasShown) {
    endingWasShown = true;
    $('play-again').focus({preventScroll: true});
  }
  if (state.finished) {
    const mins = Math.floor(state.tick / 22);
    const squadron = state.outcome === 'JUST A FRIEND SQUADRON COMPLETE';
    const escaped = state.outcome === 'YOU FORGOT THE MILK';
    const bossLost = state.outcome === 'THE FINAL WORD WON';
    $('ending-title').textContent = squadron ? 'MISSION ACCOMPLISHED.' :
      escaped ? 'FREEDOM FLIGHT COMPLETE!' :
      bossLost ? 'THE FINAL WORD HAD THE LAST WORD.' :
      'MISSION FAILED SUCCESSFULLY.';
    $('ending-blurb').textContent = squadron ?
      AIRCOMBAT_FINAL_TEXT.split('\n').slice(2).join('\n') :
      escaped ? 'You made it into the sky. Your phone still has one more assignment.' :
      bossLost ? 'The personal-space interceptor connected. A/D could have dodged it. Replay to face the same squadron.' :
      'No quest marker. No briefing. You were meant to know what the task was.';
    $('ending-stats').textContent = squadron ?
      'DEREK AND HIS GROUP CHAT HAVE DISENGAGED. AIRBORNE ESCAPE: VERIFIED.' :
      escaped ? 'NEW MESSAGE: "YOU FORGOT THE MILK." • PAID GIGS: ' +
        state.escape.completedGigs+' • FLIGHT DISTANCE: '+
        state.escape.flight.distance+' m' :
      bossLost ? 'FINAL BOSS • WAVE '+AIRCOMBAT_WAVES.length+
        ' • HULL 0/3 • RETRY: SAME SEED' :
      'ERRANDS: ' + state.index + ' • IN-GAME MINUTES LOST: ' +
        mins + ' • BANK BALANCE: ' + moneyFmt.format(state.moneyCents / 100) +
        ' • FREE WEEKEND: NOT UNLOCKED';
  }
  if (!mini) { shownMiniKey = ''; return; }
  const miniKey = mini.type + ':' + mini.round;
  if (miniKey === shownMiniKey) return;
  shownMiniKey = miniKey;
  clearControls(); // An errand must never carry a held accelerator into the next scene.
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
  choices[0]?.focus({preventScroll: true});
}
function refreshHUD() {
  const mission = currentMission(state);
  document.body.classList.toggle('standalone-dogfight',
    state.gameMode==='dogfight'||state.gameMode==='airwar');
  $('export-airwar').hidden = !started || state.gameMode!=='airwar';
  $('mode-label').textContent = !started ? 'AWAITING SATURDAY' :
    state.finished ? (state.outcome === 'JUST A FRIEND SQUADRON COMPLETE' ?
      'MISSION ACCOMPLISHED — DEREK PARACHUTING' :
      state.outcome === 'YOU FORGOT THE MILK' ?
      'ESCAPE ACHIEVED — MILK FORGOTTEN' :
      state.outcome === 'THE FINAL WORD WON' ?
      'SHOT DOWN BY THE FINAL WORD' : 'SATURDAY LOST') :
    state.paused ? 'SATURDAY PAUSED' :
    state.airCombat ? 'JUST A FRIEND SQUADRON™' :
    state.escape.flight ? 'OPERATION FREEDOM FLIGHT' : 'DOMESTIC SURVIVAL ACTIVE';
  const timeMinutes = 9 * 60 + Math.floor(state.tick / 22);
  const hours = Math.floor(timeMinutes / 60) % 24;
  const minutes = timeMinutes % 60;
  $('clock').textContent = (timeMinutes >= 24 * 60 ? 'SUN ' : 'SAT ') +
    String(hours).padStart(2, '0') + ':' + String(minutes).padStart(2, '0');
  $('odo').textContent = state.airCombat ?
    'WAVE ' + Math.min(state.airCombat.stage+1,AIRCOMBAT_WAVES.length) +
      '/'+AIRCOMBAT_WAVES.length :
    state.escape.flight ? state.escape.flight.distance + ' FLIGHT u' :
    Math.floor(state.distance) + ' u';
  $('velocity').textContent = state.airCombat ?
    combatRackSummary(state.airCombat).ammo + ' MISSILES' :
    state.escape.flight ? state.escape.flight.speed + ' ARCADE' :
    Math.round(Math.abs(state.speed) * TICK_HZ / 64) + ' u/s';
  $('seed-readout').textContent = String(state.seed);
  $('vehicle-readout').textContent = state.profile.toUpperCase();
  const combat = state.airCombat;
  const combatWave = combat ?
    AIRCOMBAT_WAVES[Math.min(combat.stage,AIRCOMBAT_WAVES.length-1)] : null;
  $('combat-status').hidden = !combat;
  $('mission-mode').textContent = combat ?
    (state.gameMode==='airwar'?'ADVANCED AIR WAR':'AIR ARCADE')+
    ' / '+AIRCOMBAT_WAVES.length+' WAVES' : '01 / CURRENT OBJECTIVE';
  $('mission-title').textContent = combatWave?.name ??
    (mission?.title ?? 'WEEKEND OVER');
  $('mission-detail').textContent = combat?.radio ??
    (mission?.description ?? 'Go and have a lie-down. You earned it.');
  $('destination').textContent = combat ? 'JUST A FRIEND SQUADRON™' :
    (placeById(mission?.place)?.name ?? 'NONE');
  $('distance').textContent = combat ?
    (combatWave?.boss ? 'FINAL BOSS '+combat.opponents[0].hp+
      '/'+combat.opponents[0].maxHp+' HP' :
      combat.opponents.filter(e=>!e.disengaged).length + ' CONTACT(S)') :
    mission ? Math.round(distanceToPlace(state, mission.place)) + ' m' : '0 m';
  const navigation=waypoint(state,routeMode);
  $('nav-target').textContent = combat ? 'DOGFIGHT / JUST A FRIEND SQUADRON' :
    navigation ? (routeMode === 'escape' ? 'ESCAPE ROUTE · ' : 'ERRAND ROUTE · ') +
      navigation.label : 'ROUTE OFF · FLIGHT IN PROGRESS';
  $('nav-distance').textContent = navigation ? navigation.distance + ' u' : '—';
  const lock = combat ? combatLockStatus(combat) : null;
  $('nav-instruction').textContent = combat ?
    'W/S PITCH · A/D YAW · SPACE GUNS · M MISSILES · '+
      lock.status+(lock.targetId?' '+Math.round(100*lock.progress/MISSILE_ACQUIRE_TICKS)+'%':'') :
    navigation ? navigation.instruction : 'Use flight controls for takeoff and climb.';
  $('route-mode').textContent = state.airCombat ? 'N / ROUTE: AIR COMBAT' :
    state.escape.flight ? 'N / ROUTE: IN FLIGHT' :
    'N / ROUTE: ' + routeMode.toUpperCase();
  $('route-mode').disabled = Boolean(state.airCombat || state.escape.flight ||
    state.finished || !started);
  $('route-mode').setAttribute('aria-pressed', String(routeMode === 'escape'));
  const totalContacts = AIRCOMBAT_WAVES.reduce((n,w)=>n+w.members.length,0);
  // The winning state retains the last disengaged opponent even though
  // stage has advanced past the final wave. Count victory exactly once.
  const completedContacts = combat ?
    (combat.status === 'won' ? totalContacts :
      AIRCOMBAT_WAVES.slice(0,combat.stage).reduce((n,w)=>n+w.members.length,0) +
        combat.opponents.filter(e=>e.disengaged).length) : 0;
  $('task-progress').style.width = combat ?
    (100*completedContacts/totalContacts)+'%' :
    (100 * state.index / state.tasks.length) + '%';
  $('task-count').textContent = combat ?
    (state.gameMode==='airwar'?'AIRWAR':'DOGFIGHT')+' · WAVE '+
      Math.min(combat.stage+1,AIRCOMBAT_WAVES.length)+
      ' / '+AIRCOMBAT_WAVES.length :
    'MISSION ' + Math.min(state.index + 1, state.tasks.length) +
      ' / ' + state.tasks.length + (state.ambushed ? ' • BONUS ERRAND UNLOCKED' : '');
  $('money').textContent = moneyFmt.format(state.moneyCents / 100);
  $('patience').textContent = state.patience + '%';
  $('goodwill').textContent = state.goodwill + '%';
  $('fuel').textContent = state.fuel + '%';
  $('money-bar').style.width = Math.max(0, Math.min(100, state.moneyCents / 8760 * 100)) + '%';
  $('patience-bar').style.width = state.patience + '%';
  $('goodwill-bar').style.width = state.goodwill + '%';
  $('fuel-bar').style.width = state.fuel + '%';
  const boot = state.cargo;
  const capacity = cargoCapacity(state.profile);
  const filled = cargoUsed(boot);
  $('cargo-load').textContent = filled + ' / ' + capacity + ' SLOTS';
  $('cargo-bar').style.width = (filled / capacity * 100) + '%';
  $('cargo-job').textContent = boot ?
    cargoJobById(boot.id).id.toUpperCase() + ' DELIVERY' : 'BOOT EMPTY';
  $('cargo-route').textContent = boot ?
    boot.remaining.length + ' still at pickup • ' + boot.delivered.length +
      ' delivered • ' + boot.trips + ' trip(s)' :
    'No parcels, no shopping, no excuses.';
  $('cargo-items').replaceChildren(...(boot?.loaded ?? []).map(id => {
    const item = cargoItemById(id);
    const li = document.createElement('li');
    li.textContent = item.label + ' (' + item.slots + ' slots)';
    return li;
  }));
  $('cargo-trips').textContent = state.completedCargo.reduce((sum, job) => sum + job.trips, 0) +
    ' TRIP(S) COMPLETED';
  const flight=state.escape.flight;
  const next=nextUpgrade(state.escape);
  $('escape-fund').textContent = moneyFmt.format(state.escape.fundCents/100);
  $('escape-bar').style.width = Math.min(100,
    (state.escape.fundCents+state.escape.spentCents)/ESCAPE_TARGET_CENTS*100)+'%';
  $('escape-title').textContent = combat ?
    'ACT IV: JUST A FRIEND SQUADRON™' : flight ?
    'AIRBORNE OPERATION: '+flight.status.toUpperCase() :
    state.escape.upgrades.length===RESTORATION.length ?
    'THE WAR BIRD IS READY' : 'SECRET ESCAPE FUND';
  $('escape-goal').textContent = combat ?
    'WAVE '+Math.min(combat.stage+1,AIRCOMBAT_WAVES.length)+'/'+AIRCOMBAT_WAVES.length+
      ' • GUN HITS '+combat.gunHits+' • MISSILE HITS '+combat.missileHits+
      ' • HULL '+combat.hull+'/3' : flight ?
    'ALT '+flight.altitude+' u • SPEED '+flight.speed+' • '+flight.distance+' u traveled' :
    'RESTORED '+state.escape.upgrades.length+'/'+RESTORATION.length+
    ' • GOAL '+moneyFmt.format(ESCAPE_TARGET_CENTS/100);
  $('escape-next').textContent = combat ? escapeObjective(state) :
    next && !flight ? 'NEXT: '+next.label+
      ' ('+moneyFmt.format(next.costCents/100)+') · '+escapeObjective(state) :
    escapeObjective(state);
  $('escape-gigs').textContent = state.escape.completedGigs+' SECRET COURIER JOBS';
  document.querySelector('[data-drive="missile"]').hidden = !combat;
  document.querySelector('[data-drive="brake"]').textContent =
    combat ? 'GUNS / FIRE' : 'STOP ■';
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
$('start').addEventListener('click', () => begin());
$('start-dogfight').addEventListener('click', () => begin('dogfight'));
$('start-airwar').addEventListener('click', () => begin('airwar'));
$('export-airwar').addEventListener('click', async () => {
  if(!started || state.gameMode!=='airwar')return;
  const button=$('export-airwar');button.disabled=true;
  try {
    const json=await exportAirWarWorld();
    // The package validator independently checks the full SHA-256 seal.
    await verifyAirWarWorld(json);
    const blob=new Blob([json],{type:'application/json'});
    const url=URL.createObjectURL(blob);
    const link=document.createElement('a');
    link.href=url;link.download='gfta6-airwar-world-v1.json';
    document.body.append(link);link.click();link.remove();
    setTimeout(()=>URL.revokeObjectURL(url),0);
    button.textContent='WORLD EXPORTED ✓';
  } catch(error) {
    console.warn('Air War World export unavailable:',error);
    button.textContent='WORLD EXPORT FAILED';
  } finally {
    button.disabled=false;
    focusGame();
  }
});
$('restart').addEventListener('click', restart);
$('play-again').addEventListener('click', restart);
$('pause').addEventListener('click', togglePause);
$('view-mode').addEventListener('click', () => {
  renderMode = renderMode === 'classic' ? 'raised' : 'classic';
  $('view-mode').textContent = renderMode === 'raised' ?
    'VIEW: RAISED 2.5D' : 'VIEW: CLASSIC 2D';
  $('view-mode').setAttribute('aria-pressed', String(renderMode === 'raised'));
  focusGame();
});
$('route-mode').addEventListener('click', () => {
  if (!started || state.airCombat || state.escape.flight || state.finished) return;
  routeMode = routeMode === 'errands' ? 'escape' : 'errands';
  refreshHUD();
  focusGame();
});
$('interact').addEventListener('click', interactNow);
function escapeNow(action) {
  if (!started) return;
  const ok=interactEscape(state,action);
  if (ok) ping(action==='fly'?960:720);
  clearControls();
  refreshHUD();
  focusGame();
}
$('gig').addEventListener('click',()=>escapeNow('gig'));
$('repair').addEventListener('click',()=>escapeNow('upgrade'));
$('takeoff').addEventListener('click',()=>escapeNow('fly'));
$('sound').addEventListener('click', () => {
  soundEnabled = !soundEnabled;
  audio.setSfxEnabled(soundEnabled);
  $('sound').textContent = soundEnabled ? 'SFX ON' : 'SFX OFF';
  $('sound').setAttribute('aria-pressed', String(soundEnabled));
  if(soundEnabled){activateAudio();ping(680);}
  focusGame();
});
$('music').addEventListener('click', () => {
  musicEnabled = !musicEnabled;
  audio.setMusicEnabled(musicEnabled);
  $('music').textContent = musicEnabled ? 'MUSIC ON' : 'MUSIC OFF';
  $('music').setAttribute('aria-pressed',String(musicEnabled));
  if(musicEnabled)activateAudio();
  focusGame();
});
const bindings = Object.freeze({
  KeyW: 'forward', ArrowUp: 'forward', KeyS: 'reverse', ArrowDown: 'reverse',
  KeyA: 'left', ArrowLeft: 'left', KeyD: 'right', ArrowRight: 'right',
  Space: 'brake', KeyM: 'missile'
});
// Track physical key codes, not actions: releasing W cannot cancel a held ↑.
const keyHeld = new Set();
function syncKeys() {
  keys.clear();
  for (const code of keyHeld) keys.add(bindings[code]);
}
window.addEventListener('keydown', event => {
  // Preserve native keyboard navigation on the vehicle selector and buttons.
  // Mini-game choices receive focus. Permit digit answers AND P/Escape
  // pause/resume through their button focus, but never let driving keys through.
  const choiceShortcut = Boolean(state.miniGame) &&
    (/^Digit[1-4]$/.test(event.code) ||
      event.code === 'KeyP' || event.code === 'Escape');
  if (event.target instanceof HTMLInputElement ||
      (event.target?.closest?.('select,textarea,button') && !choiceShortcut)) {
    if (event.target instanceof HTMLInputElement &&
        event.code === 'Enter' && !started) { event.preventDefault(); begin(); }
    return;
  }
  if (event.code in bindings) {
    event.preventDefault();
    // OS key repeats must not rearm controls cleared by a mini-game or pause.
    // Require a fresh physical keydown after the key has been released.
    if (!event.repeat && started && !state.paused && !state.finished && !state.miniGame) {
      keyHeld.add(event.code); syncKeys();
    }
    return;
  }
  if (['KeyE', 'KeyP', 'KeyG', 'KeyU', 'KeyF', 'KeyN', 'Escape', 'Enter', 'Digit1', 'Digit2', 'Digit3', 'Digit4'].includes(event.code))
    event.preventDefault();
  if (event.repeat) return;
  if (!started && event.code === 'Enter') return begin();
  if (event.code === 'KeyP' || event.code === 'Escape') return togglePause();
  if (!started) return;
  if (state.miniGame && /^Digit[1-4]$/.test(event.code))
    return answer(Number(event.code.slice(-1)) - 1);
  if (event.code === 'KeyN' && !state.airCombat && !state.escape.flight &&
      !state.finished) {
    routeMode = routeMode === 'errands' ? 'escape' : 'errands';
    refreshHUD();
    return;
  }
  if (event.code === 'KeyG') return escapeNow('gig');
  if (event.code === 'KeyU') return escapeNow('upgrade');
  if (event.code === 'KeyF') return escapeNow('fly');
  if (event.code === 'KeyE' || event.code === 'Enter') interactNow();
});
window.addEventListener('keyup', event => {
  if (!(event.code in bindings)) return;
  keyHeld.delete(event.code);
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
  syncAudio();
});
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    clearControls();
    if (started && !state.finished) setPaused(state, true);
  }
  syncAudio();
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
      const previousCombat=state.airCombat;
      stepGame(state, controls());
      for(const cue of combatAudioCues(previousCombat,state.airCombat))
        if(soundEnabled)audio.effect(cue);
      accumulator -= duration; steps += 1;
    }
    if (steps === 8) accumulator = 0;
  } else accumulator = 0;
  syncAudio();
  drawScene(canvas, state, {mode: renderMode, route: routeMode});
  const flightStatus = state.escape.flight?.status ?? null;
  if (state.tick !== lastHUDTick || state.paused || state.finished ||
      flightStatus !== lastFlightStatus) {
    if (state.tick % 6 === 0 || lastHUDTick < 0 || state.paused ||
        state.finished || flightStatus !== lastFlightStatus) {
      refreshHUD();
      lastHUDTick = state.tick;
      lastFlightStatus = flightStatus;
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
