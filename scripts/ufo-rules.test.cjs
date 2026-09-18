const fs=require('node:fs'),ts=require('typescript'),assert=require('node:assert/strict');
const {test}=require('node:test');
let source=fs.readFileSync('components/ufo/UFOGame.tsx','utf8');
const start=source.indexOf('        const { dog } = s;',source.indexOf('const loop ='));
const end=source.indexOf('\n      drawFrame(ctx, now);',start);
const body=source.slice(start,end).replace(/\s*}\s*$/, '');
const render=source.lastIndexOf('  return (');
source=source.slice(0,render)+`return {s:S.current,reset,handleJump,handleAction,finishGame,canRestart,leftHeld,rightHeld,step:(dt,now=dt)=>{const s=S.current;${body}}};};export default UFOGame;`;
const code=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.React}}).outputText;
function setup(){let clock=100;const events=[];const react={useState:x=>[x,v=>events.push(v)],useRef:x=>({current:x}),useEffect(){},useCallback:f=>f};const exports={};new Function('require','exports','performance',code)(n=>n==='react'?react:{},exports,{now:()=>clock});const g=exports.default({onClose(){}});g.reset();return {g,events,advance:ms=>{clock+=ms}};}
test('active beam locks its horizontal position',()=>{const {g}=setup();g.s.dog.x=0;g.s.beamPhase='active';g.s.beamTimer=2000;const x=g.s.ufoX;g.step(16);assert.equal(g.s.ufoX,x);});
test('stun recovery requires three fresh hits for next stage',()=>{const {g}=setup();g.s.ufoStunned=true;g.s.ufoStunTimer=10;g.s.ufoHits=3;g.s.ufoStunCount=1;g.step(16);assert.equal(g.s.ufoHits,0);assert.equal(g.s.ufoStunCount,1);});
test('horizontal movement and jump height agree at 60 and 120 Hz',()=>{const a=setup().g,b=setup().g;a.leftHeld.current=true;b.leftHeld.current=true;a.handleJump();b.handleJump();for(let i=0;i<20;i++)a.step(1000/60);for(let i=0;i<40;i++)b.step(1000/120);assert.ok(Math.abs(a.s.dog.x-b.s.dog.x)<.001);assert.ok(Math.abs(a.s.dog.y-b.s.dog.y)<.001);});

test('early jump is buffered through landing, but does not create a double jump',()=>{const {g}=setup();g.s.dog.y=214;g.s.dog.vy=3;g.s.dog.onGround=false;g.handleJump();assert.equal(g.s.dog.vy,3);g.step(16);assert.equal(g.s.dog.onGround,false);assert.equal(g.s.dog.vy,-9.6);assert.equal(g.s.jumpBufferMs,0);});
test('expired jump buffer does not trigger on a later landing',()=>{const {g}=setup();g.handleJump();g.handleJump();for(let i=0;i<70;i++)g.step(16);assert.equal(g.s.dog.onGround,true);});
test('stars and flowers remain collectibles without granting abilities',()=>{const {g}=setup();g.s.stars=[{x:g.s.dog.x+20,y:245,vy:0,landed:true,landMs:1200,done:false}];g.s.flowers=[{x:g.s.dog.x+20,ms:2000,done:false}];g.step(16);assert.equal(g.s.stars[0].done,true);assert.equal(g.s.flowers[0].done,true);g.handleJump();assert.equal(g.s.dog.vy,-9.6);});
test('UFO patrols away from player; warning leads movement; recoil pauses pursuit',()=>{const {g}=setup();g.s.patrolX=300;g.s.patrolMs=1000;g.step(16);assert.ok(g.s.ufoX>200);g.s.beamPhase='warning';g.s.beamTimer=900;g.s.dog.x=250;g.rightHeld.current=true;const x=g.s.ufoX;g.step(16);assert.ok(g.s.ufoX>x);g.s.recoilMs=400;const stop=g.s.ufoX;g.step(16);assert.equal(g.s.ufoX,stop);});

test('hit pushes UFO away and momentum decays without another hit',()=>{const {g}=setup();g.s.dog.x=160;g.s.dog.y=65;g.s.dog.onGround=false;g.s.dog.vy=0;g.step(16);assert.equal(g.s.ufoHits,1);assert.ok(g.s.ufoVx>0);const x=g.s.ufoX,v=g.s.ufoVx;g.step(16);assert.ok(g.s.ufoX>x);assert.ok(g.s.ufoVx<v);assert.equal(g.s.ufoHits,1);});
test('ending rejects early restart and accepts a fresh action after the delay',()=>{const {g,events,advance}=setup();g.finishGame('alien');const count=events.length;g.handleAction();assert.equal(events.length,count);assert.equal(g.s.ended,true);advance(1799);g.handleAction();assert.equal(g.s.ended,true);advance(1);g.handleAction();assert.equal(g.s.ended,false);assert.equal(g.s.ufoVx,0);});
test('first ending cause stays fixed if another collision occurs in the same frame',()=>{const {g}=setup();g.finishGame('won');g.finishGame('human');assert.equal(g.s.deathCause,'won');});
