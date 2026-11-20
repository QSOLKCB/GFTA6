// SPDX-License-Identifier: Apache-2.0
// GFTA6 2.5D arcade presentation of immutable cockpit/missile geometry.
// Gun and missile hit authority remains in src/aircombat.js and VANILLAJS.
import {projectCockpitPoint,inspectCockpitSight} from '../vendor/vanillajs/cockpit-rig/index.js';
import {missileLockDisplay,MISSILE_ACQUIRE_TICKS} from './combat-targeting.js';
import {combatPose,combatTargets,combatCamera,combatRackSummary,bossPhase,
  BOSS_PHASE_LINES,AIRCOMBAT_WAVES} from './aircombat.js';
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
// Extra-large original fictional command aircraft, intentionally distinct
// from the smaller pursuing fighters. No imported model or raster artwork.
function bossAircraft(ctx,x,y,disabled){
  ctx.save();ctx.translate(x,y);ctx.globalAlpha=disabled?.32:1;
  poly(ctx,[[-18,-66],[18,-66],[34,-25],[108,0],[115,20],[42,17],
    [29,69],[9,53],[0,77],[-9,53],[-29,69],[-42,17],
    [-115,20],[-108,0],[-34,-25]],'#b15d86');
  poly(ctx,[[-81,8],[-40,-3],[-18,27],[-54,22]],'#612e50');
  poly(ctx,[[81,8],[40,-3],[18,27],[54,22]],'#612e50');
  poly(ctx,[[-10,-55],[10,-55],[17,10],[0,29],[-17,10]],'#9cd4d1');
  rect(ctx,-5,-62,10,28,'#fff0b5');
  rect(ctx,-105,11,23,5,'#f7cc97');rect(ctx,82,11,23,5,'#f7cc97');
  ctx.restore();
}
// Deterministic particles are drawn from immutable gameplay hit receipts.
// No collision, targeting, damage or extra simulation is inferred from pixels.
function impactFX(ctx,camera,combat,w,h){
  for(const effect of combat.effects??[]){
    const age=combat.tick-effect.tick;
    if(age<0||age>=70)continue;
    const point=projectCockpitPoint(camera,[...effect.center],{width:w,height:h});
    if(!point.visible)continue;
    const intensity=1-age/70,burst=effect.kind==='explosion';
    const radius=(burst?19:9)+age*(burst?.86:.35);
    let hash=0;
    for(const c of effect.id)hash=(Math.imul(hash,33)+c.charCodeAt(0))>>>0;
    ctx.save();
    ctx.globalAlpha=Math.max(0,intensity*.70);
    // Expanding blast shells in the source-derived projected location.
    for(let shell=0;shell<3;shell++){
      const r=radius*(.38+shell*.37);
      ctx.strokeStyle=shell===0?'#fff3c0':shell===1?'#ffae59':'#bb5f3b';
      ctx.lineWidth=burst?4-shell:2;
      ctx.beginPath();ctx.arc(point.x,point.y,r,0,2*Math.PI);ctx.stroke();
    }
    for(let i=0;i<(burst?16:9);i++){
      const angle=(i*2.3999632297)+(hash%29)*.07;
      const range=radius*(.4+((i*7+hash)%11)/12);
      const x=point.x+Math.cos(angle)*range;
      const y=point.y+Math.sin(angle)*range*.72;
      ctx.strokeStyle=i%3===0?'#fff2a8':i%3===1?'#ffc272':'#e87248';
      ctx.lineWidth=i%4===0?3:2;
      ctx.beginPath();ctx.moveTo(x,y);
      ctx.lineTo(x+Math.cos(angle)*(9+age*.08),
        y+Math.sin(angle)*(9+age*.08));ctx.stroke();
    }
    if(burst){
      for(let i=0;i<4;i++){
        const offset=(i*17+(hash%19));
        ctx.fillStyle='#415768';
        ctx.globalAlpha=Math.max(0,.38*(1-age/70));
        ctx.beginPath();ctx.arc(point.x+(i-1.6)*(7+age*.18),
          point.y-5-age*.22-offset*.1,Math.max(2,6+age*.18),
          0,Math.PI*2);ctx.fill();
      }
    }
    ctx.restore();
  }
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
  const rack=combatRackSummary(combat);
  const lock=missileLockDisplay(combat,targets,pose,rack);
  for(const t of targets) {
    const p=projectCockpitPoint(camera,[...t.center],{width:w,height:h});
    if(!p.visible||p.x< -80||p.x>w+80||p.y< -80||p.y>h+80)continue;
    const size=340/Math.max(65,p.depth);
    if(t.role==='boss')bossAircraft(ctx,p.x,p.y,t.disengaged);
    else fighter(ctx,p.x,p.y,Math.max(14,size*13),t.paint,t.disengaged);
    if(t.disengaged)continue;
    const acquiring=t.id===lock.targetId;
    ctx.strokeStyle=acquiring?(lock.ready?'#a9f7b9':'#ffcb79'):'#efce91';
    ctx.lineWidth=acquiring?3:2;
    ctx.beginPath();ctx.arc(p.x,p.y,Math.max(18,size*17),0,2*Math.PI);ctx.stroke();
    text(ctx,t.name+' ['+t.hp+'/'+t.maxHp+']',p.x,
      p.y-(t.role==='boss'?89:28),12,'#fff0c9','center');
  }
  for(const shot of combat.rack.active) {
    const p=projectCockpitPoint(camera,[...shot.position],{width:w,height:h});
    if(!p.visible)continue;
    const tail=shot.position.map((v,i)=>v-shot.direction[i]*14);
    const back=projectCockpitPoint(camera,tail,{width:w,height:h});
    ctx.strokeStyle='#ffd890';ctx.lineWidth=3;
    ctx.beginPath();ctx.moveTo(p.x,p.y);
    if(back.visible)ctx.lineTo(back.x,back.y);
    else ctx.lineTo(p.x-4,p.y+8);
    ctx.stroke();
    ctx.strokeStyle='rgba(217,224,217,.46)';ctx.lineWidth=7;
    ctx.beginPath();ctx.arc(p.x,p.y,6,0,2*Math.PI);ctx.stroke();
  }
  impactFX(ctx,camera,combat,w,h);
  // The reticle is projected from the ACTUAL gun convergence target, not
  // screen centre, and cannot feed back into hit detection.
  const sight=inspectCockpitSight(pose,combatRig(),camera,
    {range:205,width:w,height:h});
  if(sight.reticle.visible) {
    const {x,y}=sight.reticle;
    const feedback=combat.gunFeedback;
    if(feedback && combat.tick-feedback.tick<30){
      const good=feedback.kind!=='miss';
      const age=combat.tick-feedback.tick;
      const radius=22+age*.38;
      ctx.strokeStyle=good?'#a9ffca':'#ffbf81';
      ctx.lineWidth=good?3:2;
      ctx.beginPath();
      ctx.moveTo(x-radius,y-radius);ctx.lineTo(x-11,y-11);
      ctx.moveTo(x+radius,y-radius);ctx.lineTo(x+11,y-11);
      ctx.moveTo(x-radius,y+radius);ctx.lineTo(x-11,y+11);
      ctx.moveTo(x+radius,y+radius);ctx.lineTo(x+11,y+11);
      ctx.stroke();
      text(ctx,good?
        (feedback.kind==='destroyed'?'TARGET DISENGAGED':'HIT CONFIRMED −1 HP'):
        'MISSED — ADJUST AIM',
        x,y+64,16,good?'#baffd5':'#ffd09b','center');
    }
    if(combat.gunCooldown>=9&&combat.shots>0){
      ctx.strokeStyle='#ffe6a8';ctx.lineWidth=3;
      ctx.beginPath();ctx.arc(x,y,25,0,Math.PI*2);ctx.stroke();
    }
    ctx.strokeStyle='#ffe6a5';ctx.lineWidth=2;
    ctx.beginPath();ctx.arc(x,y,16,0,2*Math.PI);
    ctx.moveTo(x-35,y);ctx.lineTo(x-20,y);
    ctx.moveTo(x+20,y);ctx.lineTo(x+35,y);
    ctx.moveTo(x,y-35);ctx.lineTo(x,y-20);
    ctx.moveTo(x,y+20);ctx.lineTo(x,y+35);ctx.stroke();
  }
  rect(ctx,0,h-125,w,125,'rgba(6,17,33,.93)');
  rect(ctx,12,14,440,151,'rgba(8,21,37,.87)');
  const stage=Math.min(combat.stage,AIRCOMBAT_WAVES.length-1),wave=AIRCOMBAT_WAVES[stage];
  // The HUD consumes the same lock ID and continuous-acquisition counter
  // that authorise launches. Neither sprites nor mouse position create locks.
  const lockStatus=lock.status;
  text(ctx,'JUST A FRIEND SQUADRON™  ·  WAVE '+(stage+1)+'/'+
    AIRCOMBAT_WAVES.length,26,42,17,'#ffe5b7');
  text(ctx,wave.name,26,71,15,'#b7e4d8');
  text(ctx,'GUNS: SPACE  ·  MISSILES: M  ·  AIM: WASD / ARROWS',26,98,12);
  text(ctx,'MISSILES '+rack.ammo+'  ·  '+lockStatus,
    26,119,12,lock.ready?'#a9efd2':'#f1d5ad');
  rect(ctx,26,132,320,9,'#30445c');
  rect(ctx,26,132,320*lock.progress/MISSILE_ACQUIRE_TICKS,9,
    lock.ready?'#93eac1':'#f0ba67');
  text(ctx,lock.targetId ?
      (lock.name+' · '+Math.round(100*lock.progress/MISSILE_ACQUIRE_TICKS)+'%') :
      'POINT YOUR NOSE AT A TARGET · HOLD STEADY',
    26,155,11,lock.ready?'#afeacb':'#ffd5a0');
  text(ctx,'RADIO: '+combat.radio.slice(0,106),25,h-75,14,'#fff0d7');
  const closest=targets.filter(t=>!t.disengaged).reduce((min,t)=>
    Math.min(min,Math.abs(40-t.center[2])),Infinity);
  text(ctx,'CONTACTS: '+combat.opponents.filter(o=>o.disengaged).length+
    '/'+combat.opponents.length+'  ·  GUN '+combat.gunHits+
    '  ·  MISSILE '+combat.missileHits+
    '  ·  HULL '+combat.hull+'/3  ·  PURSUER '+
    (Number.isFinite(closest)?Math.round(closest)+' u':'CLEAR'),
    25,h-40,13,'#c2e5dc');
  const boss=combat.opponents.find(e=>e.role==='boss');
  if(boss){
    const phase=bossPhase(combat),barWidth=360;
    rect(ctx,w/2-205,177,410,77,'rgba(17,20,40,.89)');
    text(ctx,'FINAL BOSS — '+BOSS_PHASE_LINES[(phase??1)-1],
      w/2,200,12,'#ffd1e5','center');
    rect(ctx,w/2-barWidth/2,213,barWidth,12,'#38263e');
    rect(ctx,w/2-barWidth/2,213,
      Math.round(barWidth*boss.hp/boss.maxHp),12,'#ec85a8');
    text(ctx,boss.hp+' / '+boss.maxHp+' HP',w/2,244,12,
      '#ffdfef','center');
    if(combat.bossAttack)
      text(ctx,'LOCKED PERSONAL SPACE — EVADE WITH A / D',
        w/2,h/2+120,19,'#ffd1a7','center');
    if(combat.status==='shot-down')
      text(ctx,'THE FINAL WORD WON — REPLAY TO TRY AGAIN',
        w/2,h/2+80,23,'#ffbfb7','center');
  }
  if(combat.status==='won')text(ctx,'MISSION ACCOMPLISHED.',w/2,h/2,32,'#ffe5b7','center');
}
// The shared rig is owned by the combat authority; expose a pure accessor
// instead of constructing a different rig with misaligned gun mounts.
import {combatRig} from './aircombat.js';
