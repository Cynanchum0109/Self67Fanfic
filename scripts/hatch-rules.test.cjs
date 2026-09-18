const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const { test } = require('node:test');
const assert = require('node:assert/strict');
let source = fs.readFileSync(path.join(__dirname, '../components/hatch/HatchGame.tsx'), 'utf8');
const render = source.lastIndexOf('  return (', source.indexOf('<div className="hatch-root'));
assert.ok(render > 0);
source = source.slice(0, render) + `return { s: S.current, startGame, step, hurtMob, castActive, takeover, playerSpeed, applyPlayerSlow, applyUpgrade, gunStats, boltStats, openLevelup, phase: () => phaseRef.current, setPhase: p => { phaseRef.current = p; } }; }; export default HatchGame;`;
const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.React } }).outputText;
function setup(faction = 'rabbit') {
  let clock = 10000;
  const updates = [];
  const react = { useState: x => [x, v => updates.push(v)], useRef: x => ({ current: x }), useCallback: f => f, useEffect() {} };
  const exports = {};
  new Function('require', 'exports', 'localStorage', 'performance', code)(n => n === 'react' ? react : {}, exports, { getItem: () => '1' }, { now: () => clock });
  const g = exports.default({ onClose() {}, lang: 'zh' });
  g.startGame(faction);
  clock += 3100;
  Object.assign(g.s, { mobs: [], poolLeft: 1, freezeUntil: 0, lastFrame: clock, lastWave: clock, lastAuto: clock, lastPillSpawn: clock, lastSupplySpawn: clock, startAt: clock });
  return { g, updates, now: () => clock, advance(ms, tick = true) { clock += ms; if (tick) g.step(clock); } };
}
const mob = (g, trait = 'sturdy') => ({ id: 999, serial: 99, trait, x: g.s.px + 100, y: g.s.py, hp: 1000, maxHp: 1000, speed: 0, dmg: 0, kills: 0, lastAtk: 0, lastEat: 0, slowUntil: 0, stunUntil: 0, hitUntil: 0, wobble: 0, lastShot: 0 });
test('rabbit kill returns one round once, capped at magazine capacity', () => {
  const { g, now } = setup(); const m = mob(g); g.s.mobs = [m]; g.s.ammo = 0;
  assert.equal(g.hurtMob(m, 1001, now()), true); assert.equal(g.s.ammo, 1);
  g.hurtMob(m, 1001, now()); assert.equal(g.s.ammo, 1); assert.equal(g.s.kills, 1);
  const m2 = mob(g); g.s.mobs = [m2]; g.s.ammo = 6; g.hurtMob(m2, 1001, now()); assert.equal(g.s.ammo, 6);
});
test('deer load builds predictably; overload resets to 60; pills prevent load', () => {
  const { g, now, advance } = setup('reindeer');g.s.mobs = [mob(g)];
  g.castActive(1, 0); assert.equal(g.s.mentalLoad, 34); assert.equal(g.s.darkUntil, 0);
  advance(3100, false); g.castActive(1, 0); assert.equal(g.s.mentalLoad, 68);
  advance(3100, false); g.castActive(1, 0); assert.equal(g.s.mentalLoad, 60); assert.ok(g.s.darkUntil > now()); assert.equal(g.s.selfSlowUntil, 0);
  advance(3100, false); g.s.painFreeUntil = now() + 6000;g.castActive(1, 0);assert.equal(g.s.mentalLoad, 60);
});
test('rest cools load; paused phase does not change it', () => {
  const {g, now, advance}=setup('reindeer');g.s.mentalLoad=50;g.s.lastActive=now()-2000;
  advance(50);assert.ok(g.s.mentalLoad < 50);const load=g.s.mentalLoad;g.setPhase('levelup');advance(50);assert.equal(g.s.mentalLoad,load);
});
test('movement cancels feeding without reward; stopping permits one completed meal', () => {
  const {g,now,advance}=setup();g.s.corpses=[{id:500,x:g.s.px,y:g.s.py,bornAt:now(),big:false}];
  advance(16);assert.equal(g.s.eatingCorpseId,500);g.s.keys.right=true;advance(100);assert.equal(g.s.eatingCorpseId,null);assert.equal(g.s.eaten,0);
  g.s.keys.right=false;advance(16);for(let i=0;i<7;i++)advance(50);
  assert.equal(g.s.eaten,1);assert.equal(g.s.xp,10);assert.equal(g.s.corpses.length,0);
});
test('stolen corpse cancels feeding, no stale delayed reward', () => {
  const {g,now,advance}=setup('reindeer');g.s.corpses=[{id:500,x:g.s.px,y:g.s.py,bornAt:now(),big:false}];advance(16);g.s.corpses=[];advance(50);assert.equal(g.s.eatingCorpseId,null);assert.equal(g.s.eaten,0);
});
test('takeover inherits body trait, preserves weapons, clears load and feeding', () => {
  const {g,now}=setup('reindeer');const m=mob(g,'sturdy');g.s.mobs=[m];g.s.lastDamagerId=m.id;g.s.wActive=3;g.s.mentalLoad=80;g.s.eatingCorpseId=1;g.s.eatingUntil=now()+500;
  assert.equal(g.takeover(now()),true);assert.equal(g.s.bodyTrait,'sturdy');assert.equal(g.s.maxHp,113);assert.equal(g.s.wActive,3);assert.equal(g.s.mentalLoad,0);assert.equal(g.s.eatingCorpseId,null);assert.equal(g.s.eatingUntil,0);
});
test('restart clears experimental state and every clone has a trait', () => {
  const {g}=setup();g.s.mentalLoad=99;g.s.eatingCorpseId=9;g.startGame('reindeer');assert.equal(g.s.mentalLoad,0);assert.equal(g.s.eatingCorpseId,null);assert.equal(g.s.mobs.length,12);assert.ok(g.s.mobs.every(m=>['swift','sturdy','restorative'].includes(m.trait)));
});
test('reaper still causes failure, never a late victory', () => {
  const {g,updates,advance}=setup();g.s.poolLeft=0;g.s.reaper={x:g.s.px,y:g.s.py};advance(16);assert.equal(g.phase(),'ended');assert.ok(updates.some(v=>v && v.win===false));
});

test('enemy slows are mild and cannot chain through the recovery window', () => {
  const {g,now,advance}=setup('reindeer');const normal=g.playerSpeed();
  g.applyPlayerSlow(now());const end=g.s.selfSlowUntil;
  assert.equal(g.playerSpeed(),normal*.75);
  advance(400,false);g.applyPlayerSlow(now());assert.equal(g.s.selfSlowUntil,end);
  advance(400,false);assert.equal(g.playerSpeed(),normal);
  g.applyPlayerSlow(now());assert.equal(g.s.selfSlowUntil,end);
  advance(1799,false);g.applyPlayerSlow(now());assert.equal(g.s.selfSlowUntil,end);
  advance(1,false);g.applyPlayerSlow(now());assert.ok(g.s.selfSlowUntil>now());
});
test('painkillers prevent enemy slow and restarting clears recovery state', () => {
  const {g,now}=setup('reindeer');g.s.painFreeUntil=now()+6000;
  g.applyPlayerSlow(now());assert.equal(g.s.selfSlowUntil,0);
  g.s.slowProtectedUntil=now()+10000;g.startGame('reindeer');assert.equal(g.s.slowProtectedUntil,0);
});

test('high load extends cast reach and stun without increasing damage', () => {
  const {g,now}=setup('reindeer');const m=mob(g);m.x=g.s.px+360;g.s.mobs=[m];
  g.castActive(1,0);assert.equal(m.hp,1000);
  g.s.mentalLoad=80;g.castActive(1,0);assert.equal(m.hp,978);assert.equal(m.stunUntil-now(),496);
});
function eliteSetup() {
  const t=setup('reindeer');const {g}=t;const m=mob(g);m.kills=2;m.dmg=10;m.speed=2;g.s.mobs=[m];g.s.lastAuto=1e9;
  return {...t,m};
}
test('elite telegraphs a fixed impact point and stops moving; walking away dodges', () => {
  const {g,m,advance}=eliteSetup();advance(16);assert.ok(m.zap);const x=m.x;const targetX=m.zap.x;
  g.s.px-=80;advance(50);assert.equal(m.x,x);assert.equal(m.zap.x,targetX);
  const hp=g.s.hp;for(let i=0;i<12;i++)advance(50);
  assert.equal(m.zap,undefined);assert.equal(g.s.selfSlowUntil,0);assert.ok(hp-g.s.hp<1);
});
test('remaining in the warning takes damage; active skill interrupts windup', () => {
  const t=eliteSetup();t.advance(16);const hp=t.g.s.hp;for(let i=0;i<13;i++)t.advance(50);
  assert.ok(hp-t.g.s.hp>=6);assert.ok(t.g.s.selfSlowUntil>t.now());
  const u=eliteSetup();u.advance(16);assert.ok(u.m.zap);u.g.castActive(1,0);assert.equal(u.m.zap,undefined);assert.ok(u.m.stunUntil>u.now());
});

test('slow sturdy deer can still walk out of the tightened warning', () => {
  const {g,m,now,advance}=eliteSetup();g.s.bodyTrait='sturdy';
  g.applyPlayerSlow(now());advance(16);assert.ok(m.zap);
  g.s.keys.left=true;const hp=g.s.hp;
  for(let i=0;i<10;i++)advance(50);
  assert.equal(m.zap,undefined);assert.ok(hp-g.s.hp<1);
});

function choose(g,key) { g.setPhase('levelup');g.applyUpgrade({key,rarity:'normal'}); }
test('route choices match faction and disappear once selected', () => {
  for (const [f,keys] of [['rabbit',['chain','heavy']],['reindeer',['wide','quick']]]) {
    const {g,updates}=setup(f);g.openLevelup();let cards=updates.find(Array.isArray);
    assert.equal(cards.length,3);assert.deepEqual(cards.slice(0,2).map(x=>x.key),keys);
    choose(g,keys[0]);updates.length=0;g.openLevelup();cards=updates.find(Array.isArray);
    assert.ok(cards.every(x=>!['chain','heavy','wide','quick'].includes(x.key)));
    choose(g,keys[1]);assert.equal(g.s.combatRoute,keys[0]);
  }
});
test('rabbit routes implement refund versus heavy projectile tradeoffs', () => {
  const {g,now}=setup();const base=g.gunStats();choose(g,'chain');g.s.ammo=0;
  const m=mob(g);g.s.mobs=[m];g.hurtMob(m,1001,now());assert.equal(g.s.ammo,2);assert.equal(g.gunStats().reload,base.reload*1.4);
  const h=setup();choose(h.g,'heavy');h.g.castActive(1,0);
  assert.equal(h.g.s.bullets[0].dmg,base.dmg*1.45);assert.equal(h.g.s.bullets[0].pierce,base.pierce+1);
  assert.equal(h.g.gunStats().cd,base.cd*1.3);
  const v=mob(h.g);h.g.s.mobs=[v];h.g.s.ammo=0;h.g.hurtMob(v,1001,h.now());assert.equal(h.g.s.ammo,0);
});
test('deer routes change reach, target count and cooldown; load cost stays fixed', () => {
  const {g}=setup('reindeer');const base=g.boltStats();choose(g,'wide');
  assert.equal(g.boltStats().range,base.range*1.25);assert.equal(g.boltStats().count,base.count+1);assert.equal(g.boltStats().cd,base.cd*1.3);
  const q=setup('reindeer');choose(q.g,'quick');assert.equal(q.g.boltStats().range,base.range*.8);assert.equal(q.g.boltStats().cd,base.cd*.75);
  q.g.s.mobs=[mob(q.g)];q.g.castActive(1,0);assert.equal(q.g.s.mentalLoad,34);
});
test('route survives takeover but clears on a new run', () => {
  const {g,now}=setup('reindeer');choose(g,'wide');const m=mob(g);g.s.mobs=[m];g.s.lastDamagerId=m.id;
  g.takeover(now());assert.equal(g.s.combatRoute,'wide');g.startGame('rabbit');assert.equal(g.s.combatRoute,null);
});
