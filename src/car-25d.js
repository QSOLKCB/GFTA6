// SPDX-License-Identifier: Apache-2.0
// GFTA6-CAR25D-001: original, bounded raised-car geometry.
// Presentation only: no changes to position, steering, hit boxes or physics.
const HEIGHT=Object.freeze({body:9,roof:20});
const shade=Object.freeze({near:'#203346',far:'#354a60',glass:'#a9dfe6',
  shadow:'rgba(3,12,22,.40)',tyre:'#14202c',lamp:'#ffe4a1',tail:'#e64266'});
const freezePoints=points=>Object.freeze(points.map(p=>Object.freeze(p)));
const shape=(points,fill)=>Object.freeze({points:freezePoints(points),fill});

function transformed(headingFine){
  if(!Number.isInteger(headingFine)||headingFine<0||headingFine>=1024)
    throw RangeError('car orientation must be a 0..1023 integer');
  const theta=-headingFine*Math.PI/512;
  const c=Math.cos(theta),s=Math.sin(theta);
  // X/Y are the authoritative 2D footprint, Z only affects drawn pixels.
  // Project the lift in world/screen coordinates, NOT car-local rotation.
  return (x,y,z=0)=>Object.freeze([
    x*c-y*s-z*.32, x*s+y*c-z*.90
  ]);
}
function footprint(project,front,rear,halfWidth,z){
  return freezePoints([[rear,-halfWidth],[front,-halfWidth],
    [front,halfWidth],[rear,halfWidth]].map(([x,y])=>project(x,y,z)));
}
function face(points,a,b,fill){
  return shape([points.low[a],points.low[b],points.high[b],points.high[a]],fill);
}
/** Deterministic 2.5D car mesh. All geometry is local to the car centre.
 * The projected ground footprint stays where the original driving model put it.
 */
export function car25DGeometry(headingFine,skin){
  if(!skin||!['hatchback','coupe','van'].includes(skin.silhouette)||
      typeof skin.paint!=='string'||typeof skin.roof!=='string')
    throw TypeError('known visual skin required');
  const p=transformed(headingFine);
  const front=skin.silhouette==='van'?28:31;
  const rear=skin.silhouette==='coupe'?-32:-29;
  const roofRear=skin.silhouette==='van'?-24:skin.silhouette==='coupe'?-9:-15;
  const roofFront=skin.silhouette==='coupe'?15:17;
  const low=footprint(p,front,rear,18,1);
  const high=footprint(p,front,rear,18,HEIGHT.body);
  const roofBase=footprint(p,roofFront,roofRear,13,HEIGHT.body);
  const roofTop=footprint(p,roofFront-2,roofRear+2,12,HEIGHT.roof);
  const bodyFaces=[];
  const roofFaces=[];
  for(let i=0;i<4;i++){
    const j=(i+1)%4;
    bodyFaces.push(face({low,high},i,j,i%2===0?shade.far:shade.near));
    roofFaces.push(face({low:roofBase,high:roofTop},i,j,
      i===1||i===3?shade.glass:skin.roof));
  }
  const sort=(a,b)=>{
    const depth=x=>x.points.reduce((sum,p)=>sum+p[1],0)/x.points.length;
    return depth(a)-depth(b);
  };
  return Object.freeze({
    shadow:footprint(p,front+3,rear-2,21,0),
    bodyFaces:Object.freeze(bodyFaces.sort(sort)),
    bodyTop:high,
    roofFaces:Object.freeze(roofFaces.sort(sort)),
    roofTop,
    glass:shade.glass,
    paint:skin.paint,
    roofPaint:skin.roof,
    trim:skin.trim,
    wheels:Object.freeze([-22,18].flatMap(x=>[-20,20].map(y=>
      shape([p(x-8,y-3,1),p(x+8,y-3,1),
        p(x+8,y+3,7),p(x-8,y+3,7)],shade.tyre)))),
    frontLights:Object.freeze([-11,11].map(y=>
      shape([p(front-1,y-5,HEIGHT.body+1),p(front+1,y-5,HEIGHT.body+1),
        p(front+1,y+5,HEIGHT.body+1),p(front-1,y+5,HEIGHT.body+1)],shade.lamp))),
    rearLights:Object.freeze([-11,11].map(y=>
      shape([p(rear-1,y-4,HEIGHT.body+1),p(rear+1,y-4,HEIGHT.body+1),
        p(rear+1,y+4,HEIGHT.body+1),p(rear-1,y+4,HEIGHT.body+1)],shade.tail)))
  });
}
function poly(ctx,points,color){
  ctx.beginPath();ctx.moveTo(points[0][0],points[0][1]);
  for(let i=1;i<points.length;i++)ctx.lineTo(points[i][0],points[i][1]);
  ctx.closePath();ctx.fillStyle=color;ctx.fill();
}
export function drawCar25D(ctx,x,y,headingFine,skin){
  const g=car25DGeometry(headingFine,skin);
  ctx.save();ctx.translate(x,y);
  poly(ctx,g.shadow,shade.shadow);
  for(const wheel of g.wheels)poly(ctx,wheel.points,wheel.fill);
  for(const f of g.bodyFaces)poly(ctx,f.points,f.fill);
  poly(ctx,g.bodyTop,g.paint);
  for(const f of g.roofFaces)poly(ctx,f.points,f.fill);
  poly(ctx,g.roofTop,g.roofPaint);
  // Top glass and roof highlight are deliberately original polygons.
  ctx.strokeStyle='rgba(255,248,224,.65)';ctx.lineWidth=1.4;
  ctx.beginPath();ctx.moveTo(...g.roofTop[0]);
  for(let i=1;i<g.roofTop.length;i++)ctx.lineTo(...g.roofTop[i]);
  ctx.closePath();ctx.stroke();
  for(const f of g.frontLights)poly(ctx,f.points,f.fill);
  for(const f of g.rearLights)poly(ctx,f.points,f.fill);
  ctx.restore();
}
