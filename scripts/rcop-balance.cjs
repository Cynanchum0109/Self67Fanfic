const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

// Runs the component's actual movement/interaction/endgame functions without rendering.
// Fixed 60 Hz, 1x speed, no drugs. Speech scheduling/rendering are omitted, so this
// estimates the distribution rather than replaying a browser's exact random stream.
const file = path.join(__dirname, '../components/RCop/Simulation.tsx');
let source = fs.readFileSync(file, 'utf8');
const render = source.lastIndexOf('  return (', source.indexOf('<div className="observation-overlay'));
if (render < 0) throw new Error('Cannot locate Simulation render boundary');
source = source.slice(0, render) + `
  return {
    initializeAgents,
    checkEndgame,
    tick(dt) {
      agentsRef.current.forEach(a => updateAgentMovement(a, dt));
      processAgentInteractions();
      checkEndgame();
      processArenaShrink(dt);
      darkeningEffectsRef.current = [];
      pinkMistEffectsRef.current = [];
      heartEffectsRef.current = [];
      speechEventsRef.current = [];
    },
    fixture(agents) { agentsRef.current = agents; },
    snapshot() {
      return {
        ended: gameEndedRef.current,
        pending: clashRef.current,
        counts: [0, 1].map(team => agentsRef.current.filter(a => a.team === team).length),
        final: finalBattleRef.current.started,
      };
    }
  };
};
export default Simulation;
`;
const code = ts.transpileModule(source, { compilerOptions: {
  jsx: ts.JsxEmit.React, module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022,
} }).outputText;

function createSimulation(seed = 123, customRandom) {
  let clock = 1000000;
  const math = Object.create(Math);
  math.random = customRandom || (() => {
    seed = (seed + 0x6D2B79F5) | 0;
    let t = seed;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  });
  const react = { useState: value => [value, () => {}], useRef: value => ({ current: value }),
    useEffect() {}, useCallback: fn => fn };
  const exports = {};
  new Function('require', 'exports', 'Date', 'Math', 'console', code)(
    name => name === 'react' ? react : {}, exports, { now: () => clock }, math, { log() {} });
  const game = exports.default({ onClose() {}, lang: 'zh' });
  return { game, advance(ms) { clock += ms; } };
}

function runBatch(runs, firstSeed) {
  const counts = {};
  for (let i = 0; i < runs; i++) {
    const { game, advance } = createSimulation(firstSeed + i);
    game.initializeAgents();
    let ending = 'timeout';
    for (let frame = 0; frame < 36000; frame++) {
      advance(1000 / 60);
      game.tick(1000 / 60);
      const state = game.snapshot();
      if (state.pending) { ending = state.pending.ending; break; }
    }
    counts[ending] = (counts[ending] || 0) + 1;
    if ((i + 1) % 100 === 0) console.log(JSON.stringify({ completed: i + 1, counts }));
  }
  return { runs, firstSeed, fps: 60, speed: 1, drugs: false, counts };
}
module.exports = { createSimulation, runBatch };
if (require.main === module) {
  const runs = Number(process.argv[2] || 500);
  const firstSeed = Number(process.argv[3] || 123);
  if (!Number.isInteger(runs) || runs < 1 || !Number.isInteger(firstSeed)) throw new Error('Usage: node scripts/rcop-balance.cjs [runs] [firstSeed]');
  console.log(JSON.stringify(runBatch(runs, firstSeed), null, 2));
}
