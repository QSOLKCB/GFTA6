// SPDX-License-Identifier: Apache-2.0
// AIRWAR-001: CAD-003 + CREATOR-INTEROP-001 + WORLD-VIS-001 consumer.
// Only original, bounded presentation geometry is selected by the renderer;
// SENSE, actual gun/missile physics and tactical actor state are untouched.
import {createSceneGraph} from '../vendor/vanillajs/scene-graph/index.js';
import {creatorCADAsset,createCreatorProject,CREATOR_FORMAT,
  sealCreatorPackage,creatorPackageJSON,openCreatorPackage,
  createCreatorSightWorld} from '../vendor/vanillajs/creator-interop/index.js';
import {createRetainedWorld,selectRetainedView} from '../vendor/vanillajs/world-vis/index.js';
import {projectCockpitPoint} from '../vendor/vanillajs/cockpit-rig/index.js';
import {combatCamera} from './aircombat.js';

export const AIRWAR_SOURCE='QSOLKCB/VANILLAJS@e9121ea7297b0aeca1da131b695e7c3371a98745';
export const AIRWAR_MAX_TRIANGLES_PER_FRAME=320;
const freeze=Object.freeze;
const definitions=freeze([
  freeze({id:'wing-model',kind:'wedge',options:freeze({width:5,depth:7,height:.8,bevel:.1})}),
  freeze({id:'tower-model',kind:'tower',options:freeze({width:4,depth:4,height:6,bevel:.12})}),
  freeze({id:'platform-model',kind:'platform',options:freeze({width:7,depth:6,height:.6,bevel:.07})})
]);
const locations=freeze([
  freeze({id:'relay-west',model:'tower-model',position:freeze([-32,169,-170])}),
  freeze({id:'relay-east',model:'tower-model',position:freeze([32,169,-190])}),
  freeze({id:'floating-pad',model:'platform-model',position:freeze([0,168,-255])}),
  freeze({id:'ridge-west',model:'wing-model',position:freeze([-45,165,-340])}),
  freeze({id:'ridge-east',model:'wing-model',position:freeze([45,165,-400])})
]);
let cached=null,activeProject=null;
/** Inert creator project, no arbitrary scripts or remote texture references. */
export function createAirWarProject(){
  const assets=definitions.map(x=>creatorCADAsset({id:x.id,kind:x.kind,
    options:{...x.options}}));
  const placements=locations.map(x=>({id:x.id,kind:'prop',
    assetId:x.model,position:[...x.position]}));
  const zones=[
    {id:'radar-west',kind:'occluder',min:[-36,164,-174],max:[-28,180,-166]},
    {id:'radar-east',kind:'occluder',min:[28,164,-194],max:[36,180,-186]}
  ];
  return createCreatorProject({format:CREATOR_FORMAT,version:1,name:'GFTA6 Airwar Foundry',
    scene:createSceneGraph('Original airwar world'),assets,placements,zones,
    tactical:null});
}
export async function exportAirWarWorld(){
  const sealed=await sealCreatorPackage(worldContent().project);
  return creatorPackageJSON(sealed);
}
export async function verifyAirWarWorld(payload){
  return openCreatorPackage(payload);
}
/** Atomic native World Foundry import. A valid content receipt cannot
 * override actual physical enemies, SENSE decisions or flight physics.
 * Unusable render projects reject before replacing the previous scene.
 */
export async function loadAirWarWorld(payload){
  const project=await openCreatorPackage(payload);
  const prepared=buildContent(project);
  activeProject=project;cached=prepared;
  return freeze({sha256:JSON.parse(payload).sha256,
    assets:project.assets.length,placements:project.placements.length});
}
/** Source lit batches follow WORLD-VIS's original XYZ/normal/RGB/UV contract. */
function sourceBatch(asset,position,id) {
  const data=new Float32Array(asset.triangles.length*3*11);
  for(let i=0;i<asset.triangles.length;i++){
    const tri=asset.triangles[i].map(j=>asset.vertices[j]);
    const u=tri[1].map((n,k)=>n-tri[0][k]);
    const v=tri[2].map((n,k)=>n-tri[0][k]);
    const cross=[u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],
      u[0]*v[1]-u[1]*v[0]];
    const m=Math.hypot(...cross),normal=cross.map(n=>n/m);
    const col=id.includes('relay')?[.65,.82,.91]:[.8,.7,.87];
    for(let j=0;j<3;j++){
      const off=(i*3+j)*11,p=tri[j];
      data.set([p[0]+position[0],p[1]+position[1],p[2]+position[2],
        ...normal,...col,0,0],off);
    }
  }
  return {id,vertices:data,material:{color:[1,1,1],
    roughness:.7,metalness:0,opacity:1,emission:0,pattern:'none',patternScale:1}};
}
function buildContent(project){
  const assets=new Map(project.assets.map(x=>[x.id,x]));
  const props=project.placements.filter(p=>p.kind==='prop'&&p.assetId!==null);
  if(props.length===0)throw RangeError('Airwar scene needs one display prop');
  const batches=props.map(p=>sourceBatch(assets.get(p.assetId),p.position,p.id));
  const retained=createRetainedWorld(batches);
  return freeze({project,retained,batches:new Map(
    batches.map(b=>[b.id,b.vertices]))});
}
function worldContent(){
  if(cached)return cached;
  cached=buildContent(activeProject??createAirWarProject());
  return cached;
}
/** Presentational camera selection. No actor visibility, LOS or hit authority. */
export function selectAirWarWorld(combat,width=960,height=600){
  const world=worldContent(),camera=combatCamera(combat);
  const sourceCamera={position:[...camera.position],orientation:[...camera.orientation],
    fov:camera.fov,aspect:width/height,near:.1,far:950};
  return selectRetainedView(world.retained,sourceCamera,
    {cull:true,lod:'auto',lodDistance:185});
}
export function drawAirWarWorld(ctx,combat,width,height){
  const view=selectAirWarWorld(combat,width,height);
  const world=worldContent(),camera=combatCamera(combat);
  let triangles=0;
  for(const row of view.rows){
    const data=world.batches.get(row.id);
    const sourceTriangles=data.length/33;
    const stride=row.lod==='low'&&sourceTriangles>=8?3:1;
    for(let i=0;i<sourceTriangles&&triangles<AIRWAR_MAX_TRIANGLES_PER_FRAME;i+=stride){
      const pts=[];
      for(let j=0;j<3;j++){
        const o=i*33+j*11;
        const projected=projectCockpitPoint(camera,
          [data[o],data[o+1],data[o+2]],{width,height});
        if(!projected.visible){pts.length=0;break;}
        pts.push(projected);
      }
      if(pts.length!==3)continue;
      ctx.fillStyle=row.id.includes('relay')?'rgba(147,187,203,.66)':'rgba(184,169,192,.60)';
      ctx.strokeStyle='rgba(227,238,250,.25)';
      ctx.lineWidth=.65;
      ctx.beginPath();ctx.moveTo(pts[0].x,pts[0].y);
      ctx.lineTo(pts[1].x,pts[1].y);ctx.lineTo(pts[2].x,pts[2].y);
      ctx.closePath();ctx.fill();ctx.stroke();
      triangles++;
    }
  }
  return freeze({selected:view.selected,culled:view.culled,
    lodVertices:view.lodVertices,drawnTriangles:triangles});
}
/** CAD-003 indexed wing geometry is drawn using the same physical target
 * centre that authority-tested guns and missile locks consume. Source is
 * presentation-only and never expands the accepted hit sphere.
 */
export function drawAirWarAircraft(ctx,camera,target,width,height){
  const foundry=worldContent();
  const assets=foundry.project.assets;
  const asset=assets.find(a=>a.id===(target.role==='boss'?'tower-model':'wing-model'));
  if(!asset||target.disengaged)return false;
  const scale=target.role==='boss'?7:3.2;
  const tris=asset.triangles;
  let drawn=0;
  const tint=target.role==='boss'?'rgba(224,129,176,.76)':
    'rgba(162,191,215,.69)';
  for(let i=0;i<tris.length&&i<96;i++){
    const pts=tris[i].map(index=>{
      const a=asset.vertices[index];
      return projectCockpitPoint(camera,[
        target.center[0]+a[0]*scale,
        target.center[1]+a[1]*scale,
        target.center[2]+a[2]*scale],{width,height});
    });
    if(pts.some(p=>!p.visible))continue;
    ctx.fillStyle=tint;ctx.strokeStyle='rgba(244,243,238,.32)';
    ctx.lineWidth=.8;
    ctx.beginPath();ctx.moveTo(pts[0].x,pts[0].y);
    ctx.lineTo(pts[1].x,pts[1].y);ctx.lineTo(pts[2].x,pts[2].y);
    ctx.closePath();ctx.fill();ctx.stroke();
    drawn++;
  }
  return drawn>0;
}
export const inspectAirWarSight=()=>createCreatorSightWorld(worldContent().project);
