// SPDX-License-Identifier: Apache-2.0
// GFTA6-ESCAPE-001: original deterministic alternate campaign rules.
// A deliberately simple AIRBORNE SKELETON, not a physics or flight model.
// No DOM, device clocks, downloaded aircraft assets, or VANILLAJS flight API.
export const ESCAPE_VERSION = 'gfta6.escape.v1';
export const GIG_DEPOT = 'parcel';
export const AIRFIELD = 'airfield';
export const GIG_DESTINATIONS = Object.freeze(['chemist','bakery','dogspa','neighbour']);
export const RESTORATION = Object.freeze([
  Object.freeze({id:'airframe',label:'Acquire the retired warbird',costCents:45000}),
  Object.freeze({id:'engine',label:'Repair the engine',costCents:35000}),
  Object.freeze({id:'cockpit',label:'Restore cockpit controls',costCents:20000}),
  Object.freeze({id:'fuel',label:'Prepare fuel and departure',costCents:15000})
]);
export const ESCAPE_TARGET_CENTS = RESTORATION.reduce((sum,p)=>sum+p.costCents,0);
const freeze = v => Object.freeze(v);
const int = (n,label,min,max) => {
  if (!Number.isSafeInteger(n)||n<min||n>max)throw RangeError(label+' out of range');
  return n;
};
const clamp = (n,lo,hi) => Math.max(lo,Math.min(hi,n));
export function createEscape(seed) {
  int(seed,'seed',0,0xffffffff);
  return freeze({version:ESCAPE_VERSION,seed,fundCents:0,spentCents:0,
    completedGigs:0,activeGig:null,upgrades:freeze([]),flight:null});
}
function gigFor(seed,index) {
  const destination=GIG_DESTINATIONS[(seed+index)%GIG_DESTINATIONS.length];
  const payoutCents=18500+((seed+index*7)%5)*1000;
  return freeze({id:'courier-'+index,from:GIG_DEPOT,to:destination,payoutCents});
}
export function gigNext(escape) { return gigFor(escape.seed,escape.completedGigs); }
export function gigAction(escape,place) {
  if (!escape || escape.version!==ESCAPE_VERSION)throw TypeError('escape state required');
  if (escape.flight) return freeze({state:escape,ok:false,message:'The warbird is your current delivery.'});
  if (!escape.activeGig) {
    if (place!==GIG_DEPOT)return freeze({state:escape,ok:false,
      message:'Collect a paid courier job at the PARCEL DEPOT first.'});
    const activeGig=gigNext(escape);
    return freeze({state:freeze({...escape,activeGig}),ok:true,
      message:'SECRET COURIER: Deliver to '+activeGig.to.toUpperCase()+
        ' for $'+(activeGig.payoutCents/100).toFixed(2)+'.'});
  }
  if (place!==escape.activeGig.to)return freeze({state:escape,ok:false,
    message:'PAID DELIVERY GOES TO '+escape.activeGig.to.toUpperCase()+'.'});
  const payout=escape.activeGig.payoutCents;
  return freeze({state:freeze({...escape,activeGig:null,
    completedGigs:escape.completedGigs+1,
    fundCents:escape.fundCents+payout}),ok:true,
    message:'SECRET FUND +$'+(payout/100).toFixed(2)+
      '. Nobody asked where those boxes came from.'});
}
export function nextUpgrade(escape) {
  return RESTORATION[escape.upgrades.length]??null;
}
export function purchaseUpgrade(escape,place) {
  if (!escape || escape.version!==ESCAPE_VERSION)throw TypeError('escape state required');
  if (place!==AIRFIELD)return freeze({state:escape,ok:false,
    message:'Restoration purchases are made at the AIRFIELD.'});
  if (escape.flight)return freeze({state:escape,ok:false,
    message:'The aircraft is already being prepared for flight.'});
  const upgrade=nextUpgrade(escape);
  if (!upgrade)return freeze({state:escape,ok:false,message:'Aircraft already restored. Press F at the airfield.'});
  if (escape.fundCents<upgrade.costCents)return freeze({state:escape,ok:false,
    message:'Need $'+((upgrade.costCents-escape.fundCents)/100).toFixed(2)+
      ' more for '+upgrade.label+'.'});
  return freeze({state:freeze({...escape,
    fundCents:escape.fundCents-upgrade.costCents,
    spentCents:escape.spentCents+upgrade.costCents,
    upgrades:freeze([...escape.upgrades,upgrade.id])}),ok:true,
    message:'RESTORED: '+upgrade.label+'. '+(RESTORATION.length-escape.upgrades.length-1)+
      ' aircraft stage(s) remain.'});
}
export const aircraftReady=escape=>Boolean(escape)&&escape.upgrades.length===RESTORATION.length;
export const flightActive=escape=>Boolean(escape?.flight)&&escape.flight.status==='flying';
export const flightSucceeded=escape=>Boolean(escape?.flight)&&escape.flight.status==='escaped';
export function createFlight() {
  return freeze({status:'flying',phase:'runway',tick:0,speed:0,altitude:0,
    distance:0,bank:0,lateral:0,fuel:100});
}
export function launchFlight(escape,place) {
  if (!escape || escape.version!==ESCAPE_VERSION)throw TypeError('escape state required');
  if (place!==AIRFIELD)return freeze({state:escape,ok:false,message:'Drive to the AIRFIELD first.'});
  if (!aircraftReady(escape))return freeze({state:escape,ok:false,
    message:'Still '+(RESTORATION.length-escape.upgrades.length)+' restoration stage(s) to fund.'});
  if (escape.activeGig)return freeze({state:escape,ok:false,
    message:'Finish the paid delivery before taking off.'});
  if (escape.flight?.status==='escaped')return freeze({state:escape,ok:false,message:'You already escaped. Allegedly.'});
  return freeze({state:freeze({...escape,flight:createFlight()}),ok:true,
    message:'OPERATION FREEDOM FLIGHT: W accelerate, Space lift, A/D bank. Do not forget the milk.'});
}
/** Original fixed-tick mini-game flight envelope, replaced by a Cockpit Lab
 * integration later. Intentionally not aerodynamic or flight certified.
 * Input uses existing GFTA6 driving actions for keyboard/touch continuity.
 */
export function stepFlight(flight,controls={}) {
  if (!flight || flight.status!=='flying')throw RangeError('active flight required');
  const throttle=int(controls.throttle??0,'throttle',-1,1);
  const steer=int(controls.steer??0,'steer',-1,1);
  if (typeof (controls.brake??false)!=='boolean')throw TypeError('lift must be boolean');
  const lift=controls.brake===true;
  const speed=clamp(flight.speed+(throttle===1?2:throttle===-1?-3:-1),0,210);
  let phase=flight.phase,altitude=flight.altitude,bank=flight.bank,lateral=flight.lateral;
  const distance=flight.distance+Math.trunc(speed/10);
  const fuel=Math.max(0,flight.fuel-(flight.tick%90===89?1:0));
  if (phase==='runway' && lift && speed>=78) {phase='airborne';altitude=3;}
  if (phase==='airborne') {
    bank=clamp(bank+steer*2-(steer===0?Math.sign(bank):0),-24,24);
    lateral=clamp(lateral+Math.trunc(bank/6),-512,512);
    altitude=clamp(altitude+(lift && speed>=76?3:-1),0,2000);
  }
  let status='flying';
  if (phase==='airborne' && altitude===0)status='grounded';
  if (fuel===0)status='grounded';
  if (phase==='airborne' && altitude>=160 && distance>=2600 &&
      Math.abs(lateral)<=200 && speed>=85)status='escaped';
  return freeze({status,phase,tick:flight.tick+1,speed,altitude,distance,bank,lateral,fuel});
}
export function stepEscape(escape,controls) {
  if (!flightActive(escape))return escape;
  const flight=stepFlight(escape.flight,controls);
  return freeze({...escape,flight});
}
