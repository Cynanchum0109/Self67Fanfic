const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createSimulation } = require('./rcop-balance.cjs');
const agent = (team, power, x) => ({ id: team, team, power, x, y: 100, velocityX: 0, velocityY: 0, protected: true, truceUntil: 0 });
function ending(p0, p1, roll) {
  const { game } = createSimulation(1, () => roll);
  game.fixture([agent(0, p0, 100), agent(1, p1, 102)]);
  game.checkEndgame();
  return game.snapshot();
}
test('very close powers escape; moderately close powers survive', () => {
  assert.equal(ending(100, 100, .99).pending.ending, 'escape');
  assert.equal(ending(1000, 968, .99).pending.ending, 'escape');
  assert.equal(ending(100, 96.7, .99).pending.ending, 'survive');
  assert.equal(ending(100, 87.6, .99).pending.ending, 'survive');
});
test('kill tier preserves stronger winner in either direction', () => {
  assert.equal(ending(87.5, 100, .99).pending.ending, 'rabbit_kills_reindeer');
  assert.equal(ending(100, 87.5, .99).pending.ending, 'reindeer_kills_rabbit');
});
test('rare collapse allows both solo endings and leaves the correct survivor', () => {
  const rabbit = ending(70, 100, .124);
  assert.equal(rabbit.pending.ending, 'rabbit_survives');
  assert.deepEqual(rabbit.counts, [0, 1]);
  const deer = ending(100, 70, .124);
  assert.equal(deer.pending.ending, 'reindeer_survives');
  assert.deepEqual(deer.counts, [1, 0]);
  assert.equal(ending(70, 100, .125).pending.ending, 'rabbit_kills_reindeer');
  assert.equal(ending(100, 90, 0).pending.ending, 'survive');
});
test('failed rare roll never repeats during final approach', () => {
  let rolls = 0;
  const { game } = createSimulation(1, () => { rolls++; return .99; });
  game.fixture([agent(0, 70, 20), agent(1, 100, 1180)]);
  for (let i = 0; i < 20; i++) game.checkEndgame();
  assert.equal(rolls, 1);
  assert.equal(game.snapshot().pending, null);
});
