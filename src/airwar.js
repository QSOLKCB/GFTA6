// SPDX-License-Identifier: Apache-2.0
// GFTA6-AIRWAR-001: optional aerial squad adapter over the actual TACTICS-001
// SENSE/Navigation engine and TRAJECTORY-001 fixed-tick actor contact engine.
// Tactics decide orders, but neither these orders nor renderer pixels may
// create a gun hit, player damage or invent a missile lock.
import {createTacticsWorld,createTacticsState,stepTactics,
  planTacticalOrders,inspectTactics} from '../vendor/vanillajs/tactics/index.js';
import {createTrajectoryWorld,launchTrajectory,stepTrajectory,TRAJECTORY_TICK}
  from '../vendor/vanillajs/trajectory/index.js';
import {createAirCombat,stepAirCombat,AIRCOMBAT_WAVES,
  combatPose,combatTargets} from './aircombat.js';

const freeze=Object.freeze;
export const AIRWAR_FORMAT='gfta6.airwar.v1';
export const AIRWAR_TACTICS_PERIOD=60;
export const AIRWAR_TRAJECTORY_PERIOD=300;
export const AIRWAR_TRAJECTORY_STEP=2;
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
function tacticsInput(seed,stage){
  const members=AIRCOMBAT_WAVES[stage].members;
  const units=[{id:'pilot',team:'alpha',cell:[1,4],heading:[1,0]},
    ...members.map((m,i)=>({id:m.id,team:'bravo',
      cell:[9+i%2,1+i*2],heading:[-1,0]}))];
  return {width:12,height:10,cellMetres:2,seed,
    // Physical 3D cloudbank occluder in a bounded formation-planning plane.
    cover:[{id:'cloudbank',x:5,z:3,w:1,h:4,height:3}],
    units,objective:[2,4]};
}
export function inspectAirWarTactics(seed,stage,turn=1){
  if(!Number.isSafeInteger(stage)||stage<0||stage>=AIRCOMBAT_WAVES.length)
    throw RangeError('valid active squadron wave required');
  if(!Number.isSafeInteger(turn)||turn<0||turn>16)
    throw RangeError('bounded tactical turn required');
  const source=tacticsInput(seed,stage),world=createTacticsWorld(source);
  let state=createTacticsState(world);
  for(let t=0;t<turn;t++){
    const result=stepTactics(world,state,[]);
    if(!result.accepted)throw Error('engine rejected an empty player turn');
    state=result.state;
  }
  const proposed=planTacticalOrders(world,state,'bravo');
  const observation=inspectTactics(world,state);
  const units=new Map(state.units.map(u=>[u.id,u]));
  const offsets={};
  for(const src of source.units.filter(u=>u.team==='bravo')){
    const unit=units.get(src.id);
    offsets[src.id]=freeze({x:clamp((unit.cell[0]-src.cell[0])*6,-24,24),
      z:clamp((unit.cell[1]-src.cell[1])*4,-16,16)});
  }
  return freeze({stage,turn,offsets:freeze(offsets),
    orders:freeze(proposed.map(o=>freeze({...o}))),
    visible:observation.units.filter(u=>u.team==='bravo').reduce(
      (n,u)=>n+u.visibleEnemies.length,0)});
}
/** A source-checked demonstration of opposing fixed-tick interceptors.
 * The actor is a stationary approximation at firing time; a trajectory
 * contact is shown as an encounter event, NOT player HP damage. GFTA6's
 * player body lacks 6DOF translation to support a moving actor collision.
 */
export function createAirWarInterceptor(combat){
  const source=combatTargets(combat).find(t=>!t.disengaged);
  if(!source)return null;
  const pilot=combatPose(combat);
  const muzzle=[...source.center],to=pilot.position.map((v,i)=>v-muzzle[i]);
  const mag=Math.hypot(...to);
  if(mag<1) return null;
  const direction=to.map(n=>n/mag);
  const world=createTrajectoryWorld({actors:[
    {id:'pilot',position:[...pilot.position],velocity:[0,0,0],
      halfExtents:[3,3,3]},
    {id:'interceptor',position:muzzle,velocity:[0,0,0],
      halfExtents:[2,2,2]}],
    walls:[]});
  const launch=launchTrajectory(world,{ownerId:'interceptor',targetId:'pilot',
    position:muzzle,direction,speed:145,turnRate:4,
    ttlTicks:720,halfSize:.25});
  return launch.accepted?freeze({world,state:launch.state,
    ownerId:source.id}):null;
}
export function createAirWarCombat(seed) {
  const base=createAirCombat(seed);
  return freeze({...base,airwar:freeze({format:AIRWAR_FORMAT,stage:0,turn:0,
    offsets:freeze({}),orders:freeze([]),visible:0,
    projectile:null,contact:null,contacts:0})});
}
export function stepAirWarCombat(current,controls={}){
  if(!current||current.airwar?.format!==AIRWAR_FORMAT)
    throw TypeError('airwar combat state required');
  if(current.status!=='active')throw RangeError('airwar encounter is not active');
  let old=current.airwar;
  const stage=current.stage;
  let enriched=current;
  if(current.waveTick>0 && current.waveTick%AIRWAR_TACTICS_PERIOD===0 &&
     current.waveTick/AIRWAR_TACTICS_PERIOD<=16){
    const t=inspectAirWarTactics(current.seed,stage,
      current.waveTick/AIRWAR_TACTICS_PERIOD);
    old=freeze({...old,stage,turn:t.turn,offsets:t.offsets,
      orders:t.orders,visible:t.visible});
    enriched=freeze({...current,airwar:old});
  }
  let after=stepAirCombat(enriched,controls);
  if(after.stage!==stage){
    old=freeze({format:AIRWAR_FORMAT,stage:after.stage,turn:0,
      offsets:freeze({}),orders:freeze([]),visible:0,
      projectile:null,contact:null,contacts:old.contacts});
  }else if(after.status==='active'){
    let projectile=old.projectile,contact=old.contact,contacts=old.contacts;
    if(projectile){
      const advanced=stepTrajectory(projectile.world,projectile.state,AIRWAR_TRAJECTORY_STEP);
      if(advanced.status==='flying')projectile=freeze({...projectile,state:advanced});
      else {
        contact=freeze({tick:after.tick,kind:advanced.event?.kind??'expired',
          id:advanced.event?.id??null,ownerId:projectile.ownerId,
          point:freeze([...advanced.position])});
        if(advanced.status==='hit')contacts++;
        projectile=null;
      }
    }else if(after.waveTick>0&&
      after.waveTick%AIRWAR_TRAJECTORY_PERIOD===110){
      projectile=createAirWarInterceptor(after);
    }
    old=freeze({...old,projectile,contact,contacts});
  }
  return freeze({...after,airwar:old});
}
