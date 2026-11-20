// SPDX-License-Identifier: Apache-2.0
// Canvas presentation only. All rules and movement belong to core.js.
import {WORLD, PLACES, BLOCKS, screenPosition, INTERACT_RADIUS} from './core.js';
import {vehicleArt} from './vehicle-art.js';
import {drawCar25D} from './car-25d.js';
import {streetActors} from './street-life.js';
import {streetCaption} from './street-voice.js';
import {PARKING_BAYS} from './world.js';
import {getCityProjection, projectCityGroundPoint} from './scene25d.js';
import {drawFlightScene} from './flight-view.js';
import {drawAirCombat} from './aircombat-view.js';
import {waypoint, ROUTE_MODES} from './navigation.js';

const TAU = Math.PI * 2;
const BUILDING_BY_ID = new Map(BLOCKS.map(b => [b.id, b]));
function rect(ctx, x, y, w, h, fill) { ctx.fillStyle = fill; ctx.fillRect(x, y, w, h); }
function ellipse(ctx, x, y, rx, ry, fill) {
  ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, TAU); ctx.fillStyle = fill; ctx.fill();
}
function text(ctx, value, x, y, font = '12px system-ui', color = '#ecf1ef', align = 'center') {
  ctx.font = font; ctx.textAlign = align; ctx.fillStyle = color; ctx.fillText(value, x, y);
}
function road(ctx, vertical, at, limit) {
  ctx.save();
  if (vertical) {
    rect(ctx, at - 49, 0, 98, limit, '#a28b89');
    rect(ctx, at - 42, 0, 84, limit, '#34465b');
    rect(ctx, at - 3, 0, 6, limit, '#34465b');
    ctx.strokeStyle = '#f5d39b'; ctx.lineWidth = 3; ctx.setLineDash([17, 24]);
    ctx.beginPath(); ctx.moveTo(at, 0); ctx.lineTo(at, limit); ctx.stroke();
    ctx.setLineDash([]);
  } else {
    rect(ctx, 0, at - 49, limit, 98, '#a28b89');
    rect(ctx, 0, at - 42, limit, 84, '#34465b');
    ctx.strokeStyle = '#f5d39b'; ctx.lineWidth = 3; ctx.setLineDash([17, 24]);
    ctx.beginPath(); ctx.moveTo(0, at); ctx.lineTo(limit, at); ctx.stroke();
    ctx.setLineDash([]);
  }
  ctx.restore();
}
function tree(ctx, x, y, size) {
  ellipse(ctx, x + 3, y + 8, size, size * .7, '#0b2423');
  rect(ctx, x - 2, y, 4, 12, '#947650');
  ellipse(ctx, x, y - size * .27, size, size * .79, '#387c64');
  ellipse(ctx, x - size * .17, y - size * .51, size * .55, size * .4, '#66b08c');
}
// Lightweight 2.5D extrusion: gameplay and collision stay in flat XY.
function polygon(ctx, points, fill) {
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.moveTo(points[0][0], points[0][1]);
  for (let i = 1; i < points.length; i++) ctx.lineTo(points[i][0], points[i][1]);
  ctx.closePath(); ctx.fill();
}
function building(ctx, b) {
  const x = b.x, y = b.y, w = b.w, h = b.h;
  const liftX = 13, liftY = 18;
  const roofX = x - liftX, roofY = y - liftY;
  // Static shadow and façade shading communicate height without 3D meshes.
  rect(ctx, x + 18, y + 20, w, h, 'rgba(2, 10, 24, .38)');
  polygon(ctx, [
    [roofX + w, roofY], [x + w, y], [x + w, y + h], [roofX + w, roofY + h]
  ], '#32465b');
  polygon(ctx, [
    [roofX, roofY + h], [roofX + w, roofY + h], [x + w, y + h], [x, y + h]
  ], '#526477');
  rect(ctx, roofX - 5, roofY - 5, w + 10, h + 10, '#b8b8ad');
  rect(ctx, roofX, roofY, w, h, b.color);
  ctx.strokeStyle = '#f0d9bd'; ctx.lineWidth = 3;
  ctx.strokeRect(roofX + 7, roofY + 8, w - 14, h - 16);
  rect(ctx, roofX + 19, roofY + 24, 24, 14, '#253e53');
  rect(ctx, roofX + w - 43, roofY + 25, 23, 14, '#253e53');
  rect(ctx, roofX + w / 2 - 24, roofY + h - 29, 48, 14, '#394c5d');
  text(ctx, b.label, roofX + w / 2, roofY + h / 2 + 2, 'bold 12px system-ui', '#f9efcf');
}
function scenery(ctx, classicBuildings = true) {
  rect(ctx, 0, 0, WORLD.width, WORLD.height, '#1d3e43');
  for (let y = 45; y < WORLD.height; y += 120) {
    for (let x = 50; x < WORLD.width; x += 112) {
      const factor = ((x * 131 + y * 73) >>> 2) % 23;
      if (WORLD.roadsX.some(v => Math.abs(v - x) < 82) ||
          WORLD.roadsY.some(v => Math.abs(v - y) < 86)) continue;
      if (BLOCKS.some(b => x > b.x - 25 && x < b.x + b.w + 25 &&
        y > b.y - 25 && y < b.y + b.h + 25)) continue;
      if (factor < 15) tree(ctx, x + factor / 2, y + factor / 3, 15 + factor / 3);
      else ellipse(ctx, x, y, 7, 5, '#508d72');
    }
  }
  for (const x of WORLD.roadsX) road(ctx, true, x, WORLD.height);
  for (const y of WORLD.roadsY) road(ctx, false, y, WORLD.width);
  // Repaint clean junctions; add crossings and kerb lines for readable lanes.
  for (const x of WORLD.roadsX) for (const y of WORLD.roadsY) {
    rect(ctx, x - 42, y - 42, 84, 84, '#34465b');
    for (let i = -3; i <= 3; i++) {
      rect(ctx, x - 47 + i * 12, y - 51, 7, 5, '#d8d7c6');
      rect(ctx, x - 47 + i * 12, y + 46, 7, 5, '#d8d7c6');
    }
  }
  // Designated bays are visual guidance; the real interaction predicate is
  // still controlled by the original pure game rules.
  for (const bay of PARKING_BAYS) {
    ctx.strokeStyle = '#d5ddc2'; ctx.lineWidth = 1.5;
    ctx.strokeRect(bay.x - 13, bay.y - 10, 26, 19);
    text(ctx, 'P', bay.x, bay.y + 4, 'bold 12px system-ui', '#e6e8be');
  }
  if (classicBuildings) for (const b of BLOCKS) building(ctx, b);
  text(ctx, 'SUBURBANIA', 543, 37, '900 32px system-ui', '#93b1a3');
  text(ctx, 'NO FREE TIME ZONE', 543, 60, 'bold 12px system-ui', '#93b1a3');
  // Benches and traffic cones do not participate in vehicle physics.
  for (const [x, y] of [[265, 172], [644, 172], [1030, 435], [650, 694]]) {
    ellipse(ctx, x + 4, y + 5, 13, 6, '#203039');
    rect(ctx, x - 9, y - 3, 18, 6, '#bd7862');
    rect(ctx, x - 7, y + 1, 2, 9, '#765b4b');
    rect(ctx, x + 5, y + 1, 2, 9, '#765b4b');
  }
}
function marker(ctx, p, active, tick) {
  const pulser = Math.sin(tick * .06) * 3;
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.strokeStyle = active ? '#fff5c5' : 'rgba(255,255,255,.25)';
  ctx.lineWidth = active ? 4 : 2;
  ctx.beginPath(); ctx.arc(0, 0, active ? 38 + pulser : 27, 0, TAU); ctx.stroke();
  ellipse(ctx, 0, 0, active ? 25 : 21, active ? 25 : 21, '#15283b');
  ellipse(ctx, 0, 0, active ? 21 : 18, active ? 21 : 18, p.tint);
  text(ctx, p.icon, 0, 8, 'bold 26px system-ui', '#142435');
  if (active) {
    ctx.fillStyle = '#fff1bc'; ctx.beginPath();
    ctx.moveTo(0, -64 + pulser); ctx.lineTo(-12, -84 + pulser);
    ctx.lineTo(12, -84 + pulser); ctx.closePath(); ctx.fill();
  }
  text(ctx, p.name, 0, 50, '900 12px system-ui', '#fff7e3');
  ctx.restore();
}
function car(ctx, x, y, headingFine, skin) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(-headingFine * Math.PI / 512);
  ellipse(ctx, 4, 6, 30, 17, '#101f2b');
  rect(ctx, -20, -22, 17, 5, '#101923'); rect(ctx, -20, 17, 17, 5, '#101923');
  rect(ctx, 10, -22, 16, 5, '#101923'); rect(ctx, 10, 17, 16, 5, '#101923');
  ctx.fillStyle = skin.paint; ctx.strokeStyle = '#fff0c9'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.roundRect(-28, -18, 59, 36, 12); ctx.fill(); ctx.stroke();
  ctx.fillStyle = skin.roof; ctx.beginPath(); ctx.roundRect(-12, -14, 29, 28, 6); ctx.fill();
  rect(ctx, -10, -10, 4, 20, '#b6dce3');
  // Roof bevel and shopping bags: inexpensive 2.5D shading.
  rect(ctx, -11, -15, 25, 3, 'rgba(255,249,229,.34)');
  rect(ctx, -11, 12, 25, 3, 'rgba(5,20,41,.35)');
  rect(ctx, -25, -9, 10, 10, skin.trim);
  rect(ctx, -25, 3, 10, 10, '#a4e4d7');
  if (skin.silhouette === 'van') {
    // Cargo on the roof gives the shopping van its distinct profile.
    rect(ctx, -9, -17, 23, 4, '#fff2dd');
    rect(ctx, -9, 13, 23, 4, '#fff2dd');
    rect(ctx, -1, -11, 12, 22, '#c1d8ce');
  } else if (skin.silhouette === 'coupe') {
    rect(ctx, -26, -21, 4, 42, '#eadbb5');
  }
  rect(ctx, 25, -12, 5, 9, '#fff5bb'); rect(ctx, 25, 4, 5, 9, '#fff5bb');
  rect(ctx, -28, -12, 4, 7, '#dc335c'); rect(ctx, -28, 5, 4, 7, '#dc335c');
  ellipse(ctx, 15, -23, 10, 7, '#e8bb88'); ellipse(ctx, 1, -26, 11, 8, '#eee2bb');
  ctx.restore();
}
function streetActor(ctx,a,raised){
  if(a.kind==='car'){
    if(raised)drawCar25D(ctx,a.x,a.y,a.headingFine,a.skin);
    else car(ctx,a.x,a.y,a.headingFine,a.skin);
    return;
  }
  // Original tiny pedestrian in a coat: raised torso, head and moving feet.
  ctx.save();ctx.translate(a.x,a.y);
  const stride=(((a.x+a.y)|0)%10)<5?2:-2;
  ellipse(ctx,2,3,8,5,'rgba(4,15,23,.35)');
  rect(ctx,-4,-4,3,8+stride,'#172438');
  rect(ctx,1,-4,3,8-stride,'#172438');
  if(raised){
    rect(ctx,-5,-14,10,13,a.paint);
    ellipse(ctx,0,-18,5,5,'#f2c6a6');
    rect(ctx,-8,-10,3,7,a.paint);
    rect(ctx,5,-10,3,7,a.paint);
  }else{
    ellipse(ctx,0,-2,7,7,a.paint);
    ellipse(ctx,0,-2,3,3,'#f2c6a6');
  }
  ctx.restore();
}
function streetBubbleAt(ctx,actor,event,tick){
  if(!event||actor.id!==event.id||tick-event.tick<0||tick-event.tick>108)return;
  const words=streetCaption(event.lineId).split(' '),lines=[''];
  for(const word of words){
    const last=lines.length-1;
    if(lines[last]&&lines[last].length+word.length+1>29)lines.push(word);
    else lines[last]+=(lines[last]?' ':'')+word;
  }
  const visible=lines.slice(0,3);
  const h=12+visible.length*17;
  const y=actor.y-(actor.kind==='car'?65:46)-h;
  rect(ctx,actor.x-123,y,246,h,'rgba(12,22,41,.93)');
  ctx.strokeStyle=actor.kind==='car'?'#ffcb8e':'#a9e9d7';
  ctx.lineWidth=1.5;ctx.strokeRect(actor.x-123,y,246,h);
  visible.forEach((line,i)=>text(ctx,line,actor.x,y+18+i*17,
    'bold 12px system-ui','#fff4d9'));
}
// Draw only the geometry supplied by the pinned VANILLAJS projection system.
// Sorted with the moving car by the base ground-plane depth key: a building
// in front of the car now correctly obscures it. This is not new game physics.
function raisedCity(ctx, state, carPoint, actors, streetBubble) {
  const {scene} = getCityProjection('raised');
  for (const shadow of scene.shadows)
    polygon(ctx, shadow.points, 'rgba(6,14,24,.30)');
  const entries = [
    ...scene.solids.map(s => ({id: s.id, depth: s.depthKey, solid: s})),
    ...actors.map(a=>({id:'street:'+a.id,depth:a.depth,solid:null,actor:a})),
    {id: '~player', depth: carPoint.y, solid: null}
  ];
  entries.sort((a,b) => a.depth - b.depth ||
    (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  for (const entry of entries) {
    if(entry.actor){
      streetActor(ctx,entry.actor,true);
      streetBubbleAt(ctx,entry.actor,streetBubble,state.tick);
      continue;
    }
    if (!entry.solid) {
      const [x, y] = projectCityGroundPoint('raised', carPoint.x, carPoint.y);
      drawCar25D(ctx, x, y, state.headingFine, vehicleArt(state.profile));
      continue;
    }
    const solid = entry.solid, source = BUILDING_BY_ID.get(solid.id);
    polygon(ctx, solid.sideZ, '#45556a');
    polygon(ctx, solid.sideX, '#31445b');
    polygon(ctx, solid.roof, source.color);
    ctx.strokeStyle = '#f1d9b8'; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.moveTo(...solid.roof[0]);
    for (let i = 1; i < solid.roof.length; i++) ctx.lineTo(...solid.roof[i]);
    ctx.closePath(); ctx.stroke();
    const centerX = solid.roof.reduce((sum,p) => sum + p[0],0) / 4;
    const centerY = solid.roof.reduce((sum,p) => sum + p[1],0) / 4;
    text(ctx,source.label,centerX,centerY+5,'bold 13px system-ui','#fff5dc');
  }
}
function routeOverlay(ctx, width, nav) {
  if (!nav) return;
  const left=width-228, y=12;
  rect(ctx,left,y,216,94,'rgba(10,25,42,.93)');
  ctx.strokeStyle=nav.mode==='escape'?'#ffd69b':'#a9e9d7';
  ctx.lineWidth=2;
  ctx.strokeRect(left,y,216,94);
  ctx.save();
  ctx.translate(left+34,y+45);
  ctx.rotate(nav.bearing);
  ctx.fillStyle=nav.mode==='escape'?'#ffd69b':'#a9e9d7';
  ctx.beginPath();
  ctx.moveTo(20,0);ctx.lineTo(-11,-13);ctx.lineTo(-5,0);
  ctx.lineTo(-11,13);ctx.closePath();ctx.fill();
  ctx.restore();
  text(ctx,nav.mode==='escape'?'ESCAPE ROUTE':'ERRAND ROUTE',
    left+121,y+19,'bold 10px system-ui','#c9d2d9');
  text(ctx,nav.label.slice(0,22),left+120,y+44,
    '900 13px system-ui','#fff5de');
  text(ctx,nav.distance+' u AWAY',left+120,y+63,
    'bold 12px system-ui','#ffe3b3');
  text(ctx,'N: SWITCH ROUTE',left+120,y+82,
    'bold 10px system-ui','#a9e9d7');
}
function miniMap(ctx, state, nav) {
  const x = 12, y = 12, w = 170, h = 120;
  rect(ctx, x - 4, y - 4, w + 8, h + 8, 'rgba(9,22,38,.90)');
  ctx.strokeStyle = '#718692'; ctx.strokeRect(x - 4, y - 4, w + 8, h + 8);
  const sx = w / WORLD.width, sy = h / WORLD.height;
  for (const rx of WORLD.roadsX) rect(ctx, x + rx * sx - 3, y, 6, h, '#60748c');
  for (const ry of WORLD.roadsY) rect(ctx, x, y + ry * sy - 3, w, 6, '#60748c');
  const target = nav?.id;
  for (const p of PLACES) ellipse(ctx, x + p.x * sx, y + p.y * sy,
    p.id === target ? 5 : 2, p.id === target ? 5 : 2, p.tint);
  const c = screenPosition(state.body);
  ellipse(ctx, x + c.x * sx, y + c.y * sy, 5, 5, '#ffebaf');
  text(ctx, 'CITY MAP', x + w - 6, y + h - 7, 'bold 9px system-ui', '#e5d8bd', 'right');
}
export function drawScene(canvas, state, {mode = 'classic', route = 'errands', streetBubble = null} = {}) {
  if (!ROUTE_MODES.includes(route)) throw new RangeError('invalid route mode');
  // Reject an unsupported visual mode before touching canvas or game state.
  getCityProjection(mode);
  if (state.airCombat) {
    drawAirCombat(canvas, state.airCombat);
    return;
  }
  if (state.escape?.flight) {
    drawFlightScene(canvas, state.escape.flight);
    return;
  }
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D is unavailable');
  const w = canvas.width, h = canvas.height;
  ctx.clearRect(0, 0, w, h);
  const carPoint = screenPosition(state.body);
  const cx = Math.max(0, Math.min(WORLD.width - w, carPoint.x - w / 2));
  const cy = Math.max(0, Math.min(WORLD.height - h, carPoint.y - h / 2));
  ctx.save();
  ctx.translate(-cx, -cy);
  const raised = mode === 'raised';
  scenery(ctx, !raised);
  const nav=waypoint(state,route);
  const actors=streetActors(state.seed,state.tick);
  if (raised) {
    raisedCity(ctx, state, carPoint, actors, streetBubble);
    // Destination hints stay readable even where tall scenery overlaps.
    for (const p of PLACES) marker(ctx, p, nav?.id === p.id, state.tick);
  } else {
    for (const p of PLACES) marker(ctx, p, nav?.id === p.id, state.tick);
    for(const a of actors){
      streetActor(ctx,a,false);
      streetBubbleAt(ctx,a,streetBubble,state.tick);
    }
    car(ctx, carPoint.x, carPoint.y, state.headingFine, vehicleArt(state.profile));
  }
  ctx.restore();
  miniMap(ctx, state, nav);
  routeOverlay(ctx, w, nav);
  if (nav && !state.paused && !state.finished && !state.miniGame &&
      nav.distance <= INTERACT_RADIUS) {
    // The waypoint owns the action associated with this exact destination.
    // Never infer E/G/U/F from unrelated cargo or upgrade state here.
    const prompt = Math.abs(state.speed)>22 ?
      'STOP THE CAR FIRST' : nav.prompt;
    rect(ctx, 232, h - 62, w - 464, 45, 'rgba(9,20,37,.88)');
    text(ctx,prompt,w/2,h-34,'900 17px system-ui','#fff1c5');
  }
  if (state.paused) {
    rect(ctx, 0, 0, w, h, 'rgba(11,17,34,.67)');
    text(ctx, 'PAUSED', w / 2, h / 2, '900 62px system-ui', '#fff5d6');
    text(ctx, 'PRESS P OR RESUME', w / 2, h / 2 + 35, 'bold 20px system-ui', '#a1e7d9');
  }
}
