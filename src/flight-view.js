// SPDX-License-Identifier: Apache-2.0
// GFTA6-only pseudo-2.5D flight vignette. NOT an aircraft physics engine.
// Original Canvas geometry. VANILLAJS Cockpit/Spitfire may replace this renderer
// and the separately versioned src/escape.js flight state in a future PR.
const rect=(ctx,x,y,w,h,color)=>{ctx.fillStyle=color;ctx.fillRect(x,y,w,h);};
const path=(ctx,points,color)=>{
  ctx.beginPath();ctx.moveTo(points[0][0],points[0][1]);
  for(let i=1;i<points.length;i++)ctx.lineTo(points[i][0],points[i][1]);
  ctx.closePath();ctx.fillStyle=color;ctx.fill();
};
function label(ctx,txt,x,y,size=16,color='#fff6dd') {
  ctx.font='900 '+size+'px system-ui';ctx.textAlign='center';ctx.fillStyle=color;
  ctx.fillText(txt,x,y);
}
/** Canvas2D view only: no mutation of the incoming frozen flight state. */
export function drawFlightScene(canvas,flight) {
  if(!flight)throw TypeError('flight required');
  const ctx=canvas.getContext('2d');
  if(!ctx)throw Error('Canvas 2D required');
  const w=canvas.width,h=canvas.height;
  const horizon=Math.max(165,Math.min(330,270+flight.altitude*.07));
  // Separate sky and ground bands create a fixed perspective reference.
  rect(ctx,0,0,w,horizon,'#578ca2');
  rect(ctx,0,horizon,w,h-horizon,'#507b64');
  for(let i=0;i<6;i++){
    const cx=140+i*195-Math.trunc(flight.lateral/8);
    path(ctx,[[cx-108,horizon],[cx-21,horizon-48-(i%3)*12],
      [cx+36,horizon-10],[cx+104,horizon]],'#658c99');
    path(ctx,[[cx-21,horizon-48-(i%3)*12],[cx+5,horizon-34],
      [cx-6,horizon-23],[cx-44,horizon-24]],'#b7d3cf');
  }
  // An authored pseudo-perspective runway. Longitudinal movement drives lane
  // marks; this is not reusable projection code or cockpit instrumentation.
  const center=w/2-flight.lateral*.21, runTop=35, runBottom=255;
  // Fade the receding runway with altitude. No aircraft physics is changed.
  if (flight.altitude<350) {
    ctx.save();
    ctx.globalAlpha=Math.max(.08,1-flight.altitude/350);
    path(ctx,[[center-runTop/2,horizon],[center+runTop/2,horizon],
    [center+runBottom,h],[center-runBottom,h]],'#354858');
  path(ctx,[[center-runTop/2-7,horizon],[center-runTop/2,horizon],
    [center-runBottom,h],[center-runBottom-15,h]],'#d7c4a0');
  path(ctx,[[center+runTop/2,horizon],[center+runTop/2+7,horizon],
    [center+runBottom+15,h],[center+runBottom,h]],'#d7c4a0');
  for(let i=0;i<12;i++){
    const phase=((i*190-flight.distance)%2280+2280)%2280;
    const p=phase/2280;
    const depth=p*p;
    const y=horizon+depth*(h-horizon);
    const lineH=3+depth*42, lineW=2+depth*10;
    rect(ctx,center-lineW/2,y,lineW,lineH,'#f2e6be');
    }
    ctx.restore();
  }
  // Small airport hangar, mountains and departure guidance as visual-only cues.
  path(ctx,[[28,horizon+6],[135,horizon+6],[128,horizon-44],
    [48,horizon-44]],'#4b5b63');
  rect(ctx,53,horizon-17,70,22,'#182d39');
  rect(ctx,820,horizon-12,34,13,'#d5b884');
  label(ctx,'SUBURBANIA AIRFIELD',110,horizon-53,12);
  // Original stylised overhead-fighter silhouette, no third-party imagery.
  ctx.save();
  ctx.translate(w/2,h*.73);ctx.rotate(flight.bank*.012);
  ctx.fillStyle='rgba(0,0,0,.20)';ctx.beginPath();
  ctx.ellipse(9,36,74,22,0,0,Math.PI*2);ctx.fill();
  path(ctx,[[-18,16],[-170,55],[-163,77],[-26,58],[-11,111],
    [11,111],[26,58],[163,77],[170,55],[18,16],[12,-65],
    [0,-103],[-12,-65]],'#d2d6c7');
  path(ctx,[[-7,42],[-18,80],[18,80],[7,42]],'#788d83');
  path(ctx,[[-11,0],[-13,-38],[0,-65],[13,-38],[11,0]],'#456779');
  path(ctx,[[-156,59],[-37,33],[-15,45],[-140,71]],'#70887e');
  path(ctx,[[156,59],[37,33],[15,45],[140,71]],'#70887e');
  rect(ctx,-2,-93,4,26,'#ffe5a3');
  ctx.restore();
  rect(ctx,15,13,385,124,'rgba(12,25,45,.81)');
  const detail=[
    'OPERATION FREEDOM FLIGHT / 2.5D PROTOTYPE',
    'SPEED '+flight.speed+' (ARCADE)   ALT '+flight.altitude+' u',
    'DISTANCE '+flight.distance+' / 2600 u   FUEL '+flight.fuel+'%',
    'W POWER   SPACE LIFT   A/D BANK   S SLOW'
  ];
  for(let i=0;i<detail.length;i++) {
    ctx.textAlign='left';ctx.font=(i===0?'900 15px':'bold 13px')+' system-ui';
    ctx.fillStyle=i===0?'#ffe4a9':'#f1f3e9';
    ctx.fillText(detail[i],28,39+i*28);
  }
  // Progress instrumentation reports the game goals, not flight certification.
  const panelX=w-268,panelY=13;
  rect(ctx,panelX,panelY,252,128,'rgba(12,25,45,.89)');
  const goals=[
    ['TAKEOFF SPEED',Math.min(100,Math.round(flight.speed/78*100))],
    ['CLIMB',Math.min(100,Math.round(flight.altitude/160*100))],
    ['DEPARTURE',Math.min(100,Math.round(flight.distance/2600*100))]
  ];
  for(let i=0;i<goals.length;i++){
    const y=panelY+18+i*35;
    ctx.font='bold 11px system-ui';ctx.textAlign='left';
    ctx.fillStyle='#e9f0e5';ctx.fillText(goals[i][0],panelX+12,y);
    rect(ctx,panelX+12,y+6,191,8,'#33485b');
    rect(ctx,panelX+12,y+6,191*goals[i][1]/100,8,'#a9dfb8');
    ctx.fillStyle='#ffe4a9';ctx.fillText(goals[i][1]+'%',panelX+208,y+12);
  }
  if(flight.status==='grounded') {
    rect(ctx,0,0,w,h,'rgba(5,16,30,.62)');
    label(ctx,'TAKEOFF ABORTED',w/2,h/2-25,48,'#ffbba8');
    label(ctx,'PRESS F TO RESTART THE FLIGHT',w/2,h/2+30,19);
  } else if(flight.status==='escaped') {
    rect(ctx,0,0,w,h,'rgba(5,16,30,.55)');
    label(ctx,'FREEDOM FLIGHT COMPLETE!',w/2,h/2-45,42,'#ffe4a9');
    label(ctx,'NEW MESSAGE: "YOU FORGOT THE MILK."',w/2,h/2+15,23);
  } else if(flight.phase==='runway') {
    label(ctx,'REACH 78 KNOTS THEN HOLD SPACE TO TAKE OFF',w/2,h-35,16);
  } else {
    label(ctx,'CLIMB ABOVE 160 m · CLEAR 2600 m · STAY CENTERED',w/2,h-35,16);
  }
}
