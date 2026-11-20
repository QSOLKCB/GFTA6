// SPDX-License-Identifier: Apache-2.0
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createContext,runInContext} from 'node:vm';
import {createDogfightGame,createGame,stepGame,currentMission,setPaused,snapshot}
  from '../src/core.js';
import {createAirCombat, stepAirCombat, combatTargets, AIRCOMBAT_WAVES, AIRCOMBAT_FINAL_TEXT} from '../src/aircombat.js';
import {waypoint} from '../src/navigation.js';
import {drawScene} from '../src/render.js';

test('standalone launches exactly the existing first wave, without economy or mission skips',()=>{
  const original=createGame(1988,'coupe',{airCombat:true});
  const direct=createDogfightGame(1988,'coupe');
  assert.equal(direct.gameMode,'dogfight');
  assert.equal(snapshot(direct).gameMode,'dogfight');
  assert.equal(snapshot(original).gameMode,'saturday');
  assert.equal(direct.tick,0);
  assert.equal(direct.airCombat.stage,0);
  assert.equal(direct.airCombat.status,'active');
  assert.equal(direct.airCombat.seed,1988);
  assert.deepEqual(direct.airCombat.opponents.map(x=>x.name),['DEREK']);
  assert.equal(direct.airCombatEnabled,true);
  assert.equal(original.airCombat,null,'original Saturday does not start in combat');
  assert.equal(original.gameMode,undefined);
  assert.equal(direct.escape.flight,null,'there is no fake launch or restored aircraft');
  assert.equal(direct.escape.completedGigs,0);
  assert.equal(direct.escape.fundCents,0);
  assert.equal(direct.escape.upgrades.length,0);
  assert.equal(direct.moneyCents,original.moneyCents);
  assert.equal(direct.index,original.index);
  assert.deepEqual(direct.tasks,original.tasks);
  assert.deepEqual(direct.body,original.body);
  assert.equal(currentMission(direct).id,'salon','mainline mission queue is untouched');
  assert.deepEqual(createDogfightGame(1988,'coupe').airCombat,direct.airCombat);
  assert.throws(()=>createDogfightGame(-1,'coupe'),RangeError);
  assert.throws(()=>createDogfightGame(1988,'not-a-car'));
});
test('city navigation is absent during arcade combat in either selected route',()=>{
  const state=createDogfightGame(1988,'van');
  assert.equal(waypoint(state,'errands'),null);
  assert.equal(waypoint(state,'escape'),null);
  assert.throws(()=>waypoint(state,'impossible'),RangeError);
  const before=snapshot(state);
  for (const mode of ['classic','raised']) {
    const ctx={};
    for(const name of ['save','restore','clearRect','fillRect','strokeRect',
      'beginPath','closePath','moveTo','lineTo','ellipse','arc','fill','stroke',
      'translate','rotate','setLineDash','roundRect']) ctx[name]=()=>{};
    ctx.fillText=()=>{};
    const canvas={width:960,height:600,getContext:()=>ctx};
    drawScene(canvas,state,{mode,route:'errands'});
    drawScene(canvas,state,{mode,route:'escape'});
    assert.deepEqual(snapshot(state),before,'presentation must not alter game');
  }
});
test('standalone uses the original fixed-tick pause/replay contract',()=>{
  const game=createDogfightGame(29,'hatchback');
  const twin=createDogfightGame(29,'hatchback');
  setPaused(game,true);
  const before=snapshot(game);
  stepGame(game,{brake:true,missile:true,steer:1});
  assert.deepEqual(snapshot(game),before,'paused game must be inert');
  setPaused(game,false);
  for(let tick=0;tick<125;tick++) {
    const input={steer:tick%29<14?1:-1,throttle:tick%37<18?1:-1,
      brake:tick%10===0,missile:tick===0};
    stepGame(game,input);stepGame(twin,input);
  }
  assert.equal(game.tick,125);
  assert.deepEqual(game.airCombat,twin.airCombat,
    'repeated seed and controls reproduce exact physical missiles and targets');
  assert.deepEqual(game.body,twin.body);
  assert.equal(game.escape.fundCents,0);
  assert.equal(game.index,0);
  assert.deepEqual(snapshot(createDogfightGame(29,'hatchback')),
    snapshot(createDogfightGame(29,'hatchback')));
});
test('missile stays bound to original rival after guns force a disengagement',()=>{
  let combat=createAirCombat(1988);
  combat=stepAirCombat(combat,{brake:true,missile:true});
  assert.equal(combat.missileTargetId,'derek-1');
  assert.equal(combat.rack.active.length,1);
  let count=0;
  while(!combat.opponents[0].disengaged&&count++<15)
    combat=stepAirCombat(combat,{brake:true,missile:false});
  assert.equal(combat.opponents[0].disengaged,true);
  assert.equal(combat.rack.active.length,1,
    'projectile is still travelling after Derek disengages by gunfire');
  assert.equal(combat.missileTargetId,'derek-1');
  const priorHp=combat.opponents[0].hp;
  for(let tick=0;tick<700&&combat.stage===0;tick++)
    combat=stepAirCombat(combat,{missile:false});
  assert.equal(combat.stage,1,'wave eventually advances after missile resolves');
  assert.equal(combat.missileTargetId,null,'target receipt cleared on resolution');
  assert.equal(combat.opponents.length,3);
  assert.equal(combat.opponents.every(e=>e.hp===2),true,
    'late missile cannot jump from Derek to the next squadron');
  assert.equal(priorHp,0);
});

test('direct arcade mode can beat all three waves and preserve canonical ending',()=>{
  const game=createDogfightGame(1988,'van');
  let ticks=0;
  while(!game.finished && ticks++<3500) {
    const target=combatTargets(game.airCombat).find(t=>!t.disengaged);
    assert.ok(target,'wave should have a live rival');
    const desired=Math.atan2(-target.center[0],40-target.center[2]);
    const steer=Math.abs(desired-game.airCombat.yaw)<.008?0:
      Math.sign(desired-game.airCombat.yaw);
    stepGame(game,{steer,throttle:0,brake:true,missile:false});
  }
  assert.ok(game.finished,'standalone mode must have a reachable victory');
  assert.equal(game.outcome,'JUST A FRIEND SQUADRON COMPLETE');
  assert.equal(game.airCombat.status,'won');
  assert.equal(game.airCombat.stage,AIRCOMBAT_WAVES.length);
  assert.equal(game.escape.flight,null);
  assert.equal(game.index,0);
  assert.equal(game.moneyCents,8760);
  assert.equal(game.escape.completedGigs,0);
  assert.ok(AIRCOMBAT_FINAL_TEXT.includes(
    'PLAYER: "DEREK IS CURRENTLY PARACHUTING INTO THE ENGLISH CHANNEL."'));
  const finished=snapshot(game);
  stepGame(game,{brake:true,missile:true});
  assert.deepEqual(snapshot(game),finished,'win receipts cannot be duplicated');
});
test('production HUD displays five contacts and exactly 100% on final victory',async()=>{
  const source=await readFile(new URL('../src/app.js',import.meta.url),'utf8');
  const start=source.indexOf('  const totalContacts = AIRCOMBAT_WAVES.reduce(');
  const end=source.indexOf("  $('task-count').textContent = combat ?",start);
  assert.ok(start>=0&&end>start,'read the actual HUD progress calculation');
  const hud=source.slice(start,end);
  const progress=(state)=>{
    const element={style:{width:''}};
    const sandbox=createContext({
      combat:state.airCombat,state,AIRCOMBAT_WAVES,
      $:id=>{assert.equal(id,'task-progress');return element;}
    });
    runInContext(hud,sandbox);
    return Number.parseFloat(element.style.width);
  };
  const game=createDogfightGame(1988,'van');
  assert.equal(progress(game),0);
  const stageProgress=new Map();
  let count=0;
  while(!game.finished&&count++<3500) {
    const target=combatTargets(game.airCombat).find(t=>!t.disengaged);
    assert.ok(target,'active wave must provide a rival');
    const desired=Math.atan2(-target.center[0],40-target.center[2]);
    const steer=Math.abs(desired-game.airCombat.yaw)<.008?0:
      Math.sign(desired-game.airCombat.yaw);
    stepGame(game,{steer,throttle:0,brake:true,missile:false});
    const pct=progress(game);
    assert.ok(pct>=0&&pct<=100,'HUD progress exceeded 100% during combat');
    if (!stageProgress.has(game.airCombat.stage))
      stageProgress.set(game.airCombat.stage,pct);
  }
  assert.equal(game.airCombat.status,'won');
  assert.equal(game.airCombat.stage,3);
  assert.deepEqual([...stageProgress.entries()].filter(([stage])=>stage>0),
    [[1,20],[2,80],[3,100]]);
  assert.equal(progress(game),100,'five contacts must not be counted as six');
  assert.equal(game.airCombat.opponents.length,1,'the final defeated rival is retained');
  assert.equal(game.airCombat.opponents[0].disengaged,true);
  const after=snapshot(game);
  assert.equal(progress(game),100,'HUD must remain stable after victory');
  assert.deepEqual(snapshot(game),after,'HUD computation must be read-only');
});

test('production launch and replay handlers preserve explicit standalone mode',async()=>{
  const source=await readFile(new URL('../src/app.js',import.meta.url),'utf8');
  const head=source.indexOf("function begin(mode = 'saturday') {");
  const tail=source.indexOf('function controlHeld(action)',head);
  assert.ok(head>=0&&tail>head,'real launch and restart handlers required');
  const input=new Map([
    ['seed',{value:'17',setCustomValidity(){},reportValidity(){}}],
    ['vehicle',{value:'coupe'}],
    ['aircombat-opt',{checked:false}],
    ['intro',{hidden:false}],['ending',{hidden:false}],['mini',{hidden:false}]
  ]);
  const focused=[];
  const sandbox=createContext({
    state:createGame(1988),started:false,shownMiniKey:'',lastHUDTick:10,
    $:id=>{assert.ok(input.has(id),'missing test element '+id);return input.get(id);},
    createGame,createDogfightGame,clearControls(){},refreshHUD(){},ping(){},
    activateAudio(){},
    canvas:{focus(opts){focused.push(opts.preventScroll);}}
  });
  runInContext(source.slice(head,tail),sandbox);
  runInContext("begin('dogfight')",sandbox);
  assert.equal(sandbox.state.gameMode,'dogfight');
  assert.equal(sandbox.state.airCombat.status,'active');
  assert.equal(sandbox.state.seed,17);
  const original=snapshot(sandbox.state);
  stepGame(sandbox.state,{steer:1,brake:true});
  runInContext('restart()',sandbox);
  assert.deepEqual(snapshot(sandbox.state),original,'Replay must restart arcade');
  runInContext("begin('saturday')",sandbox);
  assert.equal(sandbox.state.gameMode,undefined);
  assert.equal(sandbox.state.airCombat,null);
  assert.equal(sandbox.state.airCombatEnabled,false);
  assert.ok(focused.length>=3);
  assert.match(source,/\$\('start-dogfight'\)\.addEventListener\('click', \(\) => begin\('dogfight'\)\)/);
  const html=await readFile(new URL('../index.html',import.meta.url),'utf8');
  assert.match(html,/id="start-dogfight"/);
  assert.match(html,/TOO CLOSE FOR GUNS — SWITCHING TO MISSILES!/);
});
