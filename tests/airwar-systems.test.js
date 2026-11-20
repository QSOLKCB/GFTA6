// SPDX-License-Identifier: Apache-2.0
import test from 'node:test';
import assert from 'node:assert/strict';
import {createGame,createDogfightGame,createAirWarGame,stepGame,snapshot} from '../src/core.js';
import {readFile} from 'node:fs/promises';
import {createContext,runInContext} from 'node:vm';
import {createAirWarCombat,stepAirWarCombat,inspectAirWarTactics,
  createAirWarInterceptor,AIRWAR_FORMAT,AIRWAR_TACTICS_PERIOD,
  AIRWAR_TRAJECTORY_PERIOD, AIRWAR_TRAJECTORY_STEP} from '../src/airwar.js';
import {createAirWarProject,exportAirWarWorld,verifyAirWarWorld,loadAirWarWorld,
  drawAirWarAircraft,
  selectAirWarWorld,drawAirWarWorld,inspectAirWarSight,AIRWAR_SOURCE,
  AIRWAR_MAX_TRIANGLES_PER_FRAME} from '../src/airwar-world.js';
import {AIRCOMBAT_WAVES,combatTargets,combatCamera} from '../src/aircombat.js';
import {CREATOR_FORMAT,sealCreatorPackage,creatorPackageJSON}
  from '../vendor/vanillajs/creator-interop/index.js';
import {createSightWorld,querySight} from '../vendor/vanillajs/sensing/index.js';
import {createTacticsWorld,createTacticsState,stepTactics}
  from '../vendor/vanillajs/tactics/index.js';
import {stepTrajectory,TRAJECTORY_TICK} from '../vendor/vanillajs/trajectory/index.js';

test('advanced airwar is opt-in, not a shortcut to Saturday or the old arcade',()=>{
  const saturday=createGame(1988,'coupe');
  const arcade=createDogfightGame(1988,'coupe');
  const advanced=createAirWarGame(1988,'coupe');
  assert.equal(saturday.airCombat,null);
  assert.equal(arcade.gameMode,'dogfight');
  assert.equal(Object.hasOwn(arcade.airCombat,'airwar'),false);
  assert.equal(advanced.gameMode,'airwar');
  assert.equal(advanced.airCombat.airwar.format,AIRWAR_FORMAT);
  assert.equal(advanced.airCombat.stage,0);
  assert.equal(advanced.airCombat.airwar.turn,0);
  assert.equal(advanced.index,saturday.index);
  assert.equal(advanced.moneyCents,saturday.moneyCents);
  assert.deepEqual(advanced.body,saturday.body);
  assert.equal(advanced.escape.flight,null,'no fictional flight completion');
  assert.equal(advanced.escape.fundCents,0,'no economic bypass');
  assert.deepEqual(snapshot(createAirWarGame(1988,'coupe')),
    snapshot(advanced),'seeded creation must reproduce exactly');
});
test('CAD-003 original assets create an actual strict creator world and physical sight',()=>{
  const project=createAirWarProject();
  assert.equal(project.format,CREATOR_FORMAT);
  assert.equal(project.assets.length,3);
  assert.equal(project.placements.length,5);
  assert.equal(project.zones.length,2);
  assert.equal(project.assets.every(a=>a.dimension==='3d'&&
    a.sourceRef==='qsol:cad-geometry:apache-2.0'),true);
  assert.equal(project.assets.every(a=>a.vertices.length>3&&
    a.triangles.length>3),true);
  assert.equal(project.tactical,null,'aerial sidecar is a distinct opt-in authority');
  assert.ok(Object.isFrozen(project.assets[0].vertices));
  assert.match(AIRWAR_SOURCE,/e9121ea7297b0aeca1da131b695e7c3371a98745/);
  const sight=inspectAirWarSight();
  const west=querySight(sight,{position:[-32,172,-150],direction:[0,0,-1]},
    {range:250,fov:2*Math.PI});
  assert.ok(Array.isArray(west),'SENSE world is real and queryable');
  assert.deepEqual(createAirWarProject(),project);
});
test('Creator-Interop-001 SHA-256 export/import is sealed, offline and tamper-rejecting',async()=>{
  const payload=await exportAirWarWorld();
  const checked=await verifyAirWarWorld(payload);
  assert.deepEqual(checked,createAirWarProject());
  const pkg=JSON.parse(payload);
  assert.match(pkg.sha256,/^[a-f0-9]{64}$/);
  assert.equal(pkg.hashes.length,3);
  assert.ok(new TextEncoder().encode(payload).length<=262144);
  assert.equal(await exportAirWarWorld(),payload,'deterministic project bytes');
  const bad=JSON.parse(payload);
  bad.project.placements[0].position[0]+=1;
  await assert.rejects(verifyAirWarWorld(JSON.stringify(bad)),/integrity mismatch/);
  await assert.rejects(verifyAirWarWorld('{}'));
});
test('sealed World Foundry import is atomic and cannot alter combat authority',async()=>{
  const original=await exportAirWarWorld();
  const game=createAirWarGame(1988);
  const before=snapshot(game);
  const changed={...createAirWarProject(),name:'Independent world workshop'};
  const sealed=creatorPackageJSON(await sealCreatorPackage(changed));
  const result=await loadAirWarWorld(sealed);
  assert.equal(result.assets,3);
  assert.equal((await verifyAirWarWorld(await exportAirWarWorld())).name,
    'Independent world workshop');
  const altered=JSON.parse(sealed);
  altered.project.placements[0].position=[0,0,-100];
  await assert.rejects(loadAirWarWorld(JSON.stringify(altered)),/integrity mismatch/);
  assert.equal((await verifyAirWarWorld(await exportAirWarWorld())).name,
    'Independent world workshop','rejected data must not replace active content');
  assert.deepEqual(snapshot(game),before,'imported art cannot change active enemy health or physics');
  await loadAirWarWorld(original);
  assert.equal(await exportAirWarWorld(),original,'restored canonical sealed world');
});
test('live CAD-003 fighter and boss models render from physical centres',()=>{
  const combat=createAirWarCombat(1988);
  const camera=combatCamera(combat);
  let fills=0,strokes=0;
  const ctx={beginPath(){},moveTo(){},lineTo(){},closePath(){},
    fill(){fills++;},stroke(){strokes++;}};
  const original=JSON.stringify(combat);
  assert.equal(drawAirWarAircraft(ctx,camera,combatTargets(combat)[0],960,600),true);
  assert.ok(fills>0&&strokes>0,'actual indexed Forge triangles must draw');
  assert.equal(JSON.stringify(combat),original,'CAD rendering cannot mutate physical combat');
  const dis=Object.freeze({...combatTargets(combat)[0],disengaged:true});
  assert.equal(drawAirWarAircraft(ctx,camera,dis,960,600),false);
});
test('WORLD-VIS-001 culls retained CAD terrain and never changes combat state',()=>{
  const c=createAirWarCombat(1988),before=JSON.stringify(c);
  const a=selectAirWarWorld(c,960,600);
  const b=selectAirWarWorld(c,960,600);
  assert.deepEqual(a,b,'identical view selection has stable order and LOD');
  assert.ok(a.selected>0&&a.selected<=5);
  assert.ok(a.selectedBytes<8*1024*1024);
  assert.ok(a.rows.every(r=>['high','low'].includes(r.lod)));
  let fill=0,lines=0;
  const ctx={
    beginPath(){},moveTo(){},lineTo(){},closePath(){},
    fill(){fill++;},stroke(){lines++;}
  };
  const stats=drawAirWarWorld(ctx,c,960,600);
  assert.ok(stats.drawnTriangles>0);
  assert.ok(stats.drawnTriangles<=AIRWAR_MAX_TRIANGLES_PER_FRAME);
  assert.equal(fill,lines);
  assert.equal(JSON.stringify(c),before,'visibility never modifies actor authority');
});
test('TACTICS-001 actually plans finite SENSE orders and changes aerial formation offsets',()=>{
  const a=inspectAirWarTactics(1988,1,0),b=inspectAirWarTactics(1988,1,5);
  assert.equal(a.turn,0);assert.equal(b.turn,5);
  assert.equal(Object.keys(a.offsets).length,3);
  assert.ok(b.orders.length<=3);
  assert.ok(b.orders.every(o=>['hold','move','suppress','retreat'].includes(o.action)));
  assert.ok(Object.values(b.offsets).some(v=>v.x!==0||v.z!==0),
    'source-derived squad orders must actually reposition at least one rival');
  assert.ok(b.visible>=0);
  assert.ok(Object.isFrozen(b.offsets));
  assert.deepEqual(inspectAirWarTactics(1988,1,5),b,'fixed seed replays tactical policy');
  assert.throws(()=>inspectAirWarTactics(1988,9),RangeError);
  assert.throws(()=>inspectAirWarTactics(1988,1,17),RangeError);
  let combat=createAirWarCombat(1988);
  assert.equal(AIRWAR_TACTICS_PERIOD,60);
  for(let i=0;i<62;i++) {
    combat=stepAirWarCombat(combat,{});
    if(i===61)assert.ok(combat.airwar.turn>=1);
  }
});
test('TRAJECTORY-001 interceptor uses physical 120Hz swept actor contact without fake damage',()=>{
  const c=createAirWarCombat(1988),shot=createAirWarInterceptor(c);
  assert.ok(shot,'valid target must create an actual SENSE locked shot');
  assert.equal(shot.state.status,'flying');
  assert.equal(TRAJECTORY_TICK,1/120);
  assert.equal(AIRWAR_TRAJECTORY_STEP,2);
  let resolved=shot.state;
  for(let i=0;i<400&&resolved.status==='flying';i++)
    resolved=stepTrajectory(shot.world,resolved,2);
  assert.equal(resolved.status,'hit','interceptor reaches swept actor contact');
  assert.equal(resolved.event.kind,'actor');
  assert.equal(resolved.event.id,'pilot');
  assert.ok(resolved.event.fraction>=0&&resolved.event.fraction<=1);
  assert.equal(c.hull,3,'trajectory telemetry never invents damage');
});
test('advanced fixed-tick policy is deterministic across identical inputs and keeps player hull',()=>{
  const a=createAirWarGame(1988),b=createAirWarGame(1988);
  for(let tick=0;tick<300;tick++){
    const input={steer:tick%130<40?1:0,throttle:0,brake:false,missile:false};
    stepGame(a,input);stepGame(b,input);
  }
  assert.deepEqual(snapshot(a),snapshot(b));
  assert.equal(a.airCombat.airwar.format,AIRWAR_FORMAT);
  assert.ok(a.airCombat.airwar.turn>=1);
  assert.equal(a.airCombat.hull,3);
  assert.equal(a.airCombat.airwar.stage,0);
  assert.equal(a.index,0);
  assert.equal(a.escape.fundCents,0);
  assert.ok(a.airCombat.airwar.contacts>=1,
    'an accepted TRAJECTORY swept actor contact must occur in live advanced combat');
  assert.equal(AIRWAR_TRAJECTORY_PERIOD,300);
});
test('rejects corrupt advanced combat source without changing replay state',()=>{
  const game=createAirWarGame(17),before=snapshot(game);
  assert.throws(()=>stepAirWarCombat({...game.airCombat,airwar:null}),TypeError);
  assert.deepEqual(snapshot(game),before);
});

test('real start/replay handlers preserve Advanced Air War without faking completed errands',async()=>{
  const source=await readFile(new URL('../src/app.js',import.meta.url),'utf8');
  const start=source.indexOf("function begin(mode = 'saturday') {");
  const end=source.indexOf('function controlHeld(action)',start);
  assert.ok(start>=0&&end>start);
  const fields=new Map([
    ['seed',{value:'1988',setCustomValidity(){},reportValidity(){}}],
    ['vehicle',{value:'coupe'}],
    ['aircombat-opt',{checked:false}],
    ['intro',{hidden:false}],['ending',{hidden:false}],['mini',{hidden:false}]
  ]);
  const sandbox=createContext({
    state:createGame(1988),started:false,shownMiniKey:'',lastHUDTick:10,
    $:id=>{assert.ok(fields.has(id),id);return fields.get(id);},
    createGame,createDogfightGame,createAirWarGame,clearControls(){},
    refreshHUD(){},activateAudio(){},ping(){},
    audio:{stopStreet(){}},
    canvas:{focus(){}}
  });
  runInContext(source.slice(start,end),sandbox);
  runInContext("begin('airwar')",sandbox);
  assert.equal(sandbox.state.gameMode,'airwar');
  const first=snapshot(sandbox.state);
  stepGame(sandbox.state,{brake:true});
  runInContext('restart()',sandbox);
  assert.deepEqual(snapshot(sandbox.state),first);
  runInContext("begin('saturday')",sandbox);
  assert.equal(sandbox.state.gameMode,undefined);
  assert.equal(sandbox.state.airCombat,null);
  assert.match(source,/\$\('start-airwar'\)\.addEventListener\('click', \(\) => begin\('airwar'\)\)/);
  assert.match(source,/loadAirWarWorld\(payload\)/);
});
