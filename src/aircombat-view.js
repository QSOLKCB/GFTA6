// SPDX-License-Identifier: Apache-2.0
// GFTA6 2.5D arcade presentation of immutable cockpit/missile geometry.
// Gun and missile hit authority remains in src/aircombat.js and VANILLAJS.
import {projectCockpitPoint,inspectCockpitSight} from '../vendor/vanillajs/cockpit-rig/index.js';
import {combatPose,combatTargets,combatCamera,combatRackSummary,
  AIRCOMBAT_WAVES} from './aircombat.js';
const rect=(ctx,x,y,w,h,color)=>{ctx.fillStyle=color;ctx.fillRect(x,y,w,h);};
function poly(ctx,pts,color) {
  ctx.fillStyle=color;ctx.beginPath();ctx.moveTo(...pts[0]);
  for(let i=1;i<pts.length;i++)ctx.lineTo(...pts[i]);
  ctx.closePath();ctx.fill();
}
function text(ctx,s,x,y,size=14,color='#fff7dc',align='left') {
  ctx.font='bold '+size+'px system-ui';ctx.fillStyle=color;
  ctx.textAlign=align;ctx.fillText(s,x,y);
}
function fighter(ctx,x,y,radius,color,disabled) {
  if(!Number.isFinite(x)||!Number.isFinite(y))return;
  const s=Math.min(50,Math.max(13,radius));
  ctx.save();ctx.translate(x,y);
  ctx.globalAlpha=disabled?.35:1;
  poly(ctx,[[-s*.15,-s*.7],[s*.15,-s*.7],[s*.22,-s*.08],
    [s,.4*s],[s,.65*s],[s*.15,.38*s],[s*.08,s*.82],
    [-s*.08,s*.82],[-s*.15,.38*s],[-s,.65*s],[-s,.4*s],
    [-s*.22,-s*.08]],color);
  rect(ctx,-s*.06,-s*.42,s*.12,s*.38,'#94abb4');
  ctx.restore();
}
/** Read-only projection and overlay. No timing or target hits occur here. */
export function drawAirCombat(canvas,combat) {
  if(!combat)throw TypeError('combat state required');
  const ctx=canvas.getContext('2d');
  if(!ctx)throw Error('Canvas 2D required');
  const w=canvas.width,h=canvas.height;
  for(let band=0;band<10;band++)
    rect(ctx,0,h*band/10,w,h/10+1,band<6?
      ['#183450','#21445d','#315571','#3b6883','#4c7893','#5d889f'][band]:
      '#647b83');
  rect(ctx,0,h*.64,w,h*.36,'#536b6e');
  // Fictional horizon, not a second flight/physics engine.
  for(let i=0;i<8;i++) {
    const x=i*w/7-70;
    poly(ctx,[[x,h*.65],[x+100,h*.52+(i%3)*6],[x+220,h*.65]],
      i%2?'#647c78':'#4b666d');
  }
  const pose=combatPose(combat);
  const camera=combatCamera(combat);
  const targets=combatTargets(combat);
  for(const t of targets) {
    const p=projectCockpitPoint(camera,[...t.center],{width:w,height:h});
    if(!p.visible||p.x< -80||p.x>w+80||p.y< -80||p.y>h+80)continue;
    const size=340/Math.max(65,p.depth);
    fighter(ctx,p.x,p.y,Math.max(14,size*13),t.paint,t.disengaged);
    if(t.disengaged)continue;
    ctx.strokeStyle='#efce91';ctx.lineWidth=2;
    ctx.beginPath();ctx.arc(p.x,p.y,Math.max(18,size*17),0,2*Math.PI);ctx.stroke();
    text(ctx,t.name+' ['+t.hp+'/2]',p.x,p.y-28,12,'#fff0c9','center');
  }
  for(const shot of combat.rack.active) {
    const p=projectCockpitPoint(camera,[...shot.position],{width:w,height:h});
    if(!p.visible)continue;
    ctx.strokeStyle='#ffcb78';ctx.lineWidth=3;
    ctx.beginPath();ctx.moveTo(p.x-4,p.y+5);ctx.lineTo(p.x+4,p.y-5);ctx.stroke();
  }
  // The reticle is projected from the ACTUAL gun convergence target, not
  // screen centre, and cannot feed back into hit detection.
  const sight=inspectCockpitSight(pose,combatRig(),camera,
    {range:205,width:w,height:h});
  if(sight.reticle.visible) {
    const {x,y}=sight.reticle;
    ctx.strokeStyle='#ffe6a5';ctx.lineWidth=2;
    ctx.beginPath();ctx.arc(x,y,16,0,2*Math.PI);
    ctx.moveTo(x-35,y);ctx.lineTo(x-20,y);
    ctx.moveTo(x+20,y);ctx.lineTo(x+35,y);
    ctx.moveTo(x,y-35);ctx.lineTo(x,y-20);
    ctx.moveTo(x,y+20);ctx.lineTo(x,y+35);ctx.stroke();
  }
  rect(ctx,0,h-125,w,125,'rgba(6,17,33,.93)');
  rect(ctx,12,14,440,120,'rgba(8,21,37,.87)');
  const stage=Math.min(combat.stage,AIRCOMBAT_WAVES.length-1),wave=AIRCOMBAT_WAVES[stage];
  const rack=combatRackSummary(combat);
  text(ctx,'JUST A FRIEND SQUADRON™  ·  WAVE '+(stage+1)+'/3',26,42,17,'#ffe5b7');
  text(ctx,wave.name,26,71,15,'#b7e4d8');
  text(ctx,'GUNS: SPACE  ·  MISSILES: M  ·  AIM: WASD / ARROWS',26,98,12);
  text(ctx,'MISSILES '+rack.ammo+'  ·  LOCK '+(combat.status==='active'?'BORESIGHT':'COMPLETE'),
    26,119,12,'#f1d5ad');
  text(ctx,'RADIO: '+combat.radio.slice(0,106),25,h-75,14,'#fff0d7');
  text(ctx,'CONTACTS DISENGAGED: '+combat.opponents.filter(o=>o.disengaged).length+
    ' / '+combat.opponents.length+'  ·  GUN HITS '+combat.gunHits+
    '  ·  MISSILE HITS '+combat.missileHits,25,h-40,13,'#c2e5dc');
  if(combat.status==='won')text(ctx,'MISSION ACCOMPLISHED.',w/2,h/2,32,'#ffe5b7','center');
}
// The shared rig is owned by the combat authority; expose a pure accessor
// instead of constructing a different rig with misaligned gun mounts.
import {combatRig} from './aircombat.js';
