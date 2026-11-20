// SPDX-License-Identifier: Apache-2.0
import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {createGame,snapshot,screenPosition} from '../src/core.js';
import {streetActors,streetMoment} from '../src/street-life.js';
import {streetBubbleLayout,STREET_BUBBLE_LIFETIME} from '../src/street-presentation.js';
import {drawScene} from '../src/render.js';

test('beloved F-UH-K idle generator retains the exact merged PR #19 source blob',()=>{
  const bytes=readFileSync(new URL('../src/frustration-engine.js',import.meta.url));
  const blob=createHash('sha1').update('blob '+bytes.length+'\0').update(bytes).digest('hex');
  assert.equal(blob,'53c413d84e412877794087e618b69cc4053694c8',
    'engine timbre was changed: obtain explicit owner listening approval');
});
test('speech overlays remain inside viewports even for boundary speakers',()=>{
  const event=Object.freeze({id:'cab',kind:'car',lineId:'arsehole',tick:30});
  const cases=[
    {actor:{id:'cab',kind:'car',x:24,y:24},view:{x:0,y:0,width:960,height:600}},
    {actor:{id:'cab',kind:'car',x:1526,y:1106},
      view:{x:590,y:530,width:960,height:600}},
    {actor:{id:'cab',kind:'car',x:930,y:500},
      view:{x:270,y:150,width:960,height:600}}
  ];
  for(const {actor,view} of cases){
    const before=JSON.stringify(actor);
    const b=streetBubbleLayout(actor,event,30,view);
    assert.ok(b&&Object.isFrozen(b)&&Object.isFrozen(b.lines));
    assert.equal(b.kind,'car');
    assert.ok(b.x>=view.x+8&&b.y>=view.y+8);
    assert.ok(b.x+b.w<=view.x+view.width-8);
    assert.ok(b.y+b.h<=view.y+view.height-8);
    assert.equal(JSON.stringify(actor),before,'layout must not mutate speaker');
  }
  const person={id:'cab',kind:'pedestrian',x:26,y:72};
  const b=streetBubbleLayout(person,event,30,cases[0].view);
  assert.ok(b);
  assert.equal(streetBubbleLayout(person,event,30+STREET_BUBBLE_LIFETIME+1,cases[0].view),null);
  assert.equal(streetBubbleLayout({id:'honk',kind:'car',x:0,y:0},event,30,cases[0].view),null);
  assert.equal(streetBubbleLayout(person,null,30,cases[0].view),null);
  assert.throws(()=>streetBubbleLayout(person,event,30,{x:0,y:0,width:180,height:90}),RangeError);
});
function fakeCanvas(){
  const calls=[],ctx={};
  for(const key of ['save','restore','clearRect','fillRect','strokeRect','beginPath',
    'closePath','moveTo','lineTo','ellipse','arc','fill','stroke','translate',
    'rotate','setLineDash','roundRect'])ctx[key]=()=>{};
  ctx.fillText=value=>calls.push(String(value));
  return {calls,canvas:{width:960,height:600,getContext:()=>ctx}};
}
test('both views render readable final-overlay subtitles without changing game receipts',()=>{
  const state=createGame(1988);
  state.tick=30;
  const actor=streetActors(state.seed,state.tick).find(a=>a.id==='cab');
  const event=streetMoment(state.seed,state.tick,screenPosition(state.body));
  assert.equal(event.id,'cab');
  assert.equal(event.kind,'car');
  assert.ok(actor);
  const before=snapshot(state);
  for(const mode of ['classic','raised']){
    const {canvas,calls}=fakeCanvas();
    drawScene(canvas,state,{mode,streetBubble:event});
    assert.ok(calls.some(x=>x.includes('ARSEHOLE')),'speech overlay missing in '+mode);
    if(mode==='raised')assert.ok(calls.findIndex(x=>x.includes('ARSEHOLE'))>
      calls.findIndex(x=>x==='FLATS'),
      'speech should be drawn after building geometry, not occluded');
    assert.deepEqual(snapshot(state),before);
  }
});
