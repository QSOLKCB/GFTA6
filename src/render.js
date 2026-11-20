// SPDX-License-Identifier: Apache-2.0
// Canvas presentation only. All rules and movement belong to core.js.
import {WORLD, PLACES, BLOCKS, currentMission, placeById, screenPosition, INTERACT_RADIUS} from './core.js';

const TAU = Math.PI * 2;
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
function scenery(ctx) {
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
  for (const b of BLOCKS) building(ctx, b);
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
function car(ctx, x, y, headingQ) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(-headingQ * Math.PI / 32);
  ellipse(ctx, 4, 6, 30, 17, '#101f2b');
  rect(ctx, -20, -22, 17, 5, '#101923'); rect(ctx, -20, 17, 17, 5, '#101923');
  rect(ctx, 10, -22, 16, 5, '#101923'); rect(ctx, 10, 17, 16, 5, '#101923');
  ctx.fillStyle = '#f36b9b'; ctx.strokeStyle = '#fff0c9'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.roundRect(-28, -18, 59, 36, 12); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#294c69'; ctx.beginPath(); ctx.roundRect(-12, -14, 29, 28, 6); ctx.fill();
  rect(ctx, -10, -10, 4, 20, '#b6dce3');
  // Roof bevel and shopping bags: inexpensive 2.5D shading.
  rect(ctx, -11, -15, 25, 3, 'rgba(255,249,229,.34)');
  rect(ctx, -11, 12, 25, 3, 'rgba(5,20,41,.35)');
  rect(ctx, -25, -9, 10, 10, '#f8c789');
  rect(ctx, -25, 3, 10, 10, '#a4e4d7');
  rect(ctx, 25, -12, 5, 9, '#fff5bb'); rect(ctx, 25, 4, 5, 9, '#fff5bb');
  rect(ctx, -28, -12, 4, 7, '#dc335c'); rect(ctx, -28, 5, 4, 7, '#dc335c');
  ellipse(ctx, 15, -23, 10, 7, '#e8bb88'); ellipse(ctx, 1, -26, 11, 8, '#eee2bb');
  ctx.restore();
}
function miniMap(ctx, state) {
  const x = 12, y = 12, w = 170, h = 120;
  rect(ctx, x - 4, y - 4, w + 8, h + 8, 'rgba(9,22,38,.90)');
  ctx.strokeStyle = '#718692'; ctx.strokeRect(x - 4, y - 4, w + 8, h + 8);
  const sx = w / WORLD.width, sy = h / WORLD.height;
  for (const rx of WORLD.roadsX) rect(ctx, x + rx * sx - 3, y, 6, h, '#60748c');
  for (const ry of WORLD.roadsY) rect(ctx, x, y + ry * sy - 3, w, 6, '#60748c');
  const mission = currentMission(state), target = placeById(mission?.place);
  for (const p of PLACES) ellipse(ctx, x + p.x * sx, y + p.y * sy, p.id === target?.id ? 4 : 2, p.id === target?.id ? 4 : 2, p.tint);
  const c = screenPosition(state.body);
  ellipse(ctx, x + c.x * sx, y + c.y * sy, 5, 5, '#ffebaf');
  text(ctx, 'CITY MAP', x + w - 6, y + h - 7, 'bold 9px system-ui', '#e5d8bd', 'right');
}
export function drawScene(canvas, state) {
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D is unavailable');
  const w = canvas.width, h = canvas.height;
  ctx.clearRect(0, 0, w, h);
  const carPoint = screenPosition(state.body);
  const cx = Math.max(0, Math.min(WORLD.width - w, carPoint.x - w / 2));
  const cy = Math.max(0, Math.min(WORLD.height - h, carPoint.y - h / 2));
  ctx.save();
  ctx.translate(-cx, -cy);
  scenery(ctx);
  const mission = currentMission(state);
  for (const p of PLACES) marker(ctx, p, mission?.place === p.id, state.tick);
  car(ctx, carPoint.x, carPoint.y, state.headingQ);
  ctx.restore();
  miniMap(ctx, state);
  const target = mission?.place;
  if (target && state.miniGame === null && Math.hypot(
    carPoint.x - placeById(target).x, carPoint.y - placeById(target).y
  ) <= INTERACT_RADIUS) {
    rect(ctx, 232, h - 62, w - 464, 45, 'rgba(9,20,37,.88)');
    text(ctx, 'PRESS E TO ' + (target === 'home' ? 'ENTER HOME' : 'PARK / INTERACT'),
      w / 2, h - 34, '900 17px system-ui', '#fff1c5');
  }
  if (state.paused) {
    rect(ctx, 0, 0, w, h, 'rgba(11,17,34,.67)');
    text(ctx, 'PAUSED', w / 2, h / 2, '900 62px system-ui', '#fff5d6');
    text(ctx, 'PRESS P OR RESUME', w / 2, h / 2 + 35, 'bold 20px system-ui', '#a1e7d9');
  }
}
