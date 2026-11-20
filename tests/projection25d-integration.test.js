// SPDX-License-Identifier: Apache-2.0
import test from 'node:test';
import assert from 'node:assert/strict';
import {createGame, stepGame, bodyAt, snapshot} from '../src/core.js';
import {BLOCKS, validateWorld} from '../src/world.js';
import {drawScene} from '../src/render.js';
import {
  GFTA6_RENDER_MODES, GFTA6_PROJECTION_SOURCE, PROJECTION25D_FORMAT,
  getCityProjection, projectCityGroundPoint, cityCollisionFootprints
} from '../src/scene25d.js';
import {projectScene25D} from '../vendor/vanillajs/projection25d.js';

function mockCanvas() {
  const events = [], ctx = {};
  for (const name of ['save','restore','clearRect','fillRect','strokeRect',
    'beginPath','closePath','moveTo','lineTo','ellipse','arc','fill','stroke',
    'translate','rotate','setLineDash']) ctx[name] = () => {};
  // The raised car is now polygons rather than the original 2D roundRect.
  ctx.fill = () => { if (ctx.fillStyle === '#f36b9b') events.push('car'); };
  ctx.roundRect = () => {};
  ctx.fillText = value => {
    if (value === 'FLATS') events.push('flats');
  };
  return {
    events,
    canvas: {width:960, height:600, getContext(type) {
      assert.equal(type,'2d');return ctx;
    }}
  };
}

test('exact upstream format, opt-in modes and validated bounded city geometry', () => {
  assert.deepEqual(GFTA6_RENDER_MODES,['classic','raised']);
  assert.equal(PROJECTION25D_FORMAT,'qsol.vanillajs.projection25d.v1');
  assert.match(GFTA6_PROJECTION_SOURCE,/9014a9dc175ea18653c289f9f2956cccb33ea7f8/);
  assert.deepEqual(validateWorld(),[]);
  for(const mode of GFTA6_RENDER_MODES) {
    const view=getCityProjection(mode);
    assert.ok(Object.isFrozen(view.camera));
    assert.ok(Object.isFrozen(view.scene));
    assert.equal(view.scene.solids.length,BLOCKS.length);
    assert.equal(view.scene.shadows.length,BLOCKS.length);
  }
  assert.throws(()=>getCityProjection('__proto__'),RangeError);
  assert.throws(()=>getCityProjection('isometric'),RangeError);
});

test('ground projection keeps the old authoritative 2D XY positions', () => {
  for(const mode of GFTA6_RENDER_MODES)
    for(const [x,y] of [[0,0],[170,170],[800,540],[1550,1130]]) {
      assert.deepEqual(projectCityGroundPoint(mode,x,y),[x,y]);
    }
  const outlines=cityCollisionFootprints();
  const expected=BLOCKS.map(b => ({id:b.id,footprint:[b.x,b.y,b.w,b.h]}))
    .sort((a,b)=>a.id.localeCompare(b.id));
  assert.deepEqual(outlines,expected);
  assert.ok(Object.isFrozen(outlines)&&outlines.every(Object.isFrozen));
  assert.ok(outlines.every(o => Object.isFrozen(o.footprint)));
});

test('raised building geometry adds real height, shadows and stable sort', () => {
  const raised=getCityProjection('raised');
  const flat=getCityProjection('classic');
  assert.deepEqual(raised.scene.solids.map(x=>x.id),
    flat.scene.solids.map(x=>x.id));
  for (const source of BLOCKS) {
    const a=raised.scene.solids.find(s=>s.id===source.id);
    const b=flat.scene.solids.find(s=>s.id===source.id);
    assert.deepEqual(a.footprint,b.footprint);
    assert.deepEqual(a.footprint,[source.x,source.y,source.w,source.h]);
    assert.equal(a.height,source.height*14);
    assert.ok(a.roof[0][1]<b.roof[0][1],source.id+' roof should be higher');
    assert.ok(Object.isFrozen(a.roof[0]));
  }
  assert.deepEqual(
    projectScene25D(raised.camera,[...BLOCKS].reverse().map(b=>({
      id:b.id,x:b.x,z:b.y,width:b.w,depth:b.h,height:b.height*14
    }))),
    raised.scene,'upstream depth sort must be independent of input order');
});

test('both renderers leave authoritative game and cargo receipts unchanged', () => {
  for(const profile of ['hatchback','coupe','van']) {
    const state=createGame(1988,profile);
    for(let tick=0;tick<180;tick++)stepGame(state,{
      throttle:tick<100?1:0,steer:tick%40<21?1:0
    });
    const before=snapshot(state);
    for(const mode of GFTA6_RENDER_MODES) {
      const {canvas}=mockCanvas();
      drawScene(canvas,state,{mode});
      assert.deepEqual(snapshot(state),before,mode+' altered gameplay state');
    }
    assert.throws(()=>drawScene(mockCanvas().canvas,state,{mode:'bogus'}),
      RangeError);
    assert.deepEqual(snapshot(state),before,'bad visual input altered game');
  }
});

test('raised renderer occludes car behind buildings and shows it in front', () => {
  const state=createGame(1988);
  const north=mockCanvas(),south=mockCanvas();
  state.body=bodyAt(345,260);
  drawScene(north.canvas,state,{mode:'raised'});
  assert.ok(north.events.indexOf('car')>=0&&north.events.indexOf('flats')>=0);
  assert.ok(north.events.indexOf('car')<north.events.indexOf('flats'),
    'car north of flats must be painted before the foreground building');
  state.body=bodyAt(345,395);
  drawScene(south.canvas,state,{mode:'raised'});
  assert.ok(south.events.indexOf('car')>south.events.indexOf('flats'),
    'car south of flats must be painted after the building');
});
