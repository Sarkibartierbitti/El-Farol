const fs = require('fs');
const path = require('path');

const { SimulationEngine, AgentFactory, AgentSandbox } = require('../apps/backend/src/core/simulation-engine/index.ts');
const { AgentType, BuiltInAgentType } = require('../apps/shared/src/types/agent.ts');

const CAPACITY = 60;
const NUM_AGENTS = 100;
const NUM_ROUNDS = 100;
const OUTPUT_DIR = path.resolve(__dirname, '../analysis_outputs/utility_extremes');

const builtInTypes = [
  BuiltInAgentType.RANDOM,
  BuiltInAgentType.THRESHOLD,
  BuiltInAgentType.MOVING_AVERAGE,
  BuiltInAgentType.ADAPTIVE,
  BuiltInAgentType.CONTRARIAN,
  BuiltInAgentType.TREND_FOLLOWER,
  BuiltInAgentType.LOYAL,
  BuiltInAgentType.REGRET_MINIMIZING,
];

const defaultHelpers = {
  sum: (arr) => arr.reduce((a, b) => a + b, 0),
  average: (arr) => (arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : 0),
  min: (arr) => Math.min(...arr),
  max: (arr) => Math.max(...arr),
  last: (arr) => arr[arr.length - 1],
};

class Lcg {
  constructor(seed) {
    this.state = seed >>> 0;
  }

  next() {
    this.state = (1664525 * this.state + 1013904223) >>> 0;
    return this.state / 0x100000000;
  }

  pick(items) {
    return items[Math.floor(this.next() * items.length)];
  }

  int(min, max) {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }
}

function sampleParameters(type, rng) {
  switch (type) {
    case BuiltInAgentType.RANDOM:
      return {};
    case BuiltInAgentType.THRESHOLD:
      return {
        threshold: Number((0.4 + rng.next() * 1.2).toFixed(2)),
        goProbability: Number((0.1 + rng.next() * 0.85).toFixed(2)),
      };
    case BuiltInAgentType.MOVING_AVERAGE:
      return {
        windowSize: rng.int(1, 16),
        threshold: Number((0.3 + rng.next() * 1.0).toFixed(2)),
      };
    case BuiltInAgentType.ADAPTIVE:
      return {
        initialThreshold: Number((0.2 + rng.next() * 0.9).toFixed(2)),
        adaptationRate: Number((0.01 + rng.next() * 0.24).toFixed(3)),
      };
    case BuiltInAgentType.CONTRARIAN:
      return {
        lookback: rng.int(1, 10),
      };
    case BuiltInAgentType.TREND_FOLLOWER:
      return {
        windowSize: rng.int(2, 10),
      };
    case BuiltInAgentType.LOYAL:
      return {
        onRounds: rng.int(1, 8),
        offRounds: rng.int(1, 8),
      };
    case BuiltInAgentType.REGRET_MINIMIZING:
      return {
        learningRate: Number((0.1 + rng.next() * 4.9).toFixed(2)),
      };
    default:
      return {};
  }
}

function generateHomogeneousCandidates() {
  const candidates = [];

  candidates.push({
    label: 'random_all',
    groups: [{ count: 100, builtInType: BuiltInAgentType.RANDOM, parameters: {} }],
    source: 'homogeneous',
  });

  const thresholdThresholds = [0.45, 0.6, 0.8, 1.0, 1.2, 1.45];
  const thresholdGo = [0.2, 0.4, 0.6, 0.8, 0.92];
  for (const threshold of thresholdThresholds) {
    for (const goProbability of thresholdGo) {
      candidates.push({
        label: `threshold_t${threshold}_p${goProbability}`,
        groups: [{ count: 100, builtInType: BuiltInAgentType.THRESHOLD, parameters: { threshold, goProbability } }],
        source: 'homogeneous',
      });
    }
  }

  const movingWindows = [1, 2, 3, 5, 8, 12, 16];
  const movingThresholds = [0.35, 0.5, 0.6, 0.75, 0.95, 1.15];
  for (const windowSize of movingWindows) {
    for (const threshold of movingThresholds) {
      candidates.push({
        label: `moving_w${windowSize}_t${threshold}`,
        groups: [{ count: 100, builtInType: BuiltInAgentType.MOVING_AVERAGE, parameters: { windowSize, threshold } }],
        source: 'homogeneous',
      });
    }
  }

  const adaptiveThresholds = [0.25, 0.45, 0.65, 0.85, 1.0];
  const adaptiveRates = [0.01, 0.03, 0.06, 0.1, 0.18, 0.25];
  for (const initialThreshold of adaptiveThresholds) {
    for (const adaptationRate of adaptiveRates) {
      candidates.push({
        label: `adaptive_i${initialThreshold}_r${adaptationRate}`,
        groups: [{ count: 100, builtInType: BuiltInAgentType.ADAPTIVE, parameters: { initialThreshold, adaptationRate } }],
        source: 'homogeneous',
      });
    }
  }

  for (const lookback of [1, 2, 3, 5, 8, 10]) {
    candidates.push({
      label: `contrarian_l${lookback}`,
      groups: [{ count: 100, builtInType: BuiltInAgentType.CONTRARIAN, parameters: { lookback } }],
      source: 'homogeneous',
    });
  }

  for (const windowSize of [2, 3, 4, 6, 8, 10]) {
    candidates.push({
      label: `trend_w${windowSize}`,
      groups: [{ count: 100, builtInType: BuiltInAgentType.TREND_FOLLOWER, parameters: { windowSize } }],
      source: 'homogeneous',
    });
  }

  for (const onRounds of [1, 2, 3, 4, 6, 8]) {
    for (const offRounds of [1, 2, 3, 4, 6, 8]) {
      candidates.push({
        label: `loyal_on${onRounds}_off${offRounds}`,
        groups: [{ count: 100, builtInType: BuiltInAgentType.LOYAL, parameters: { onRounds, offRounds } }],
        source: 'homogeneous',
      });
    }
  }

  for (const learningRate of [0.1, 0.3, 0.6, 1.0, 1.8, 3.0, 5.0]) {
    candidates.push({
      label: `regret_lr${learningRate}`,
      groups: [{ count: 100, builtInType: BuiltInAgentType.REGRET_MINIMIZING, parameters: { learningRate } }],
      source: 'homogeneous',
    });
  }

  return candidates;
}

function generateRandomMixtureCandidates(count, seed, source) {
  const rng = new Lcg(seed);
  const candidates = [];

  for (let idx = 0; idx < count; idx += 1) {
    const groupCount = rng.int(2, 5);
    const remainingTypes = [...builtInTypes];
    const groups = [];
    const cutPoints = [];

    for (let cutIndex = 0; cutIndex < groupCount - 1; cutIndex += 1) {
      cutPoints.push(rng.int(1, NUM_AGENTS - 1));
    }
    cutPoints.sort((a, b) => a - b);

    let previous = 0;
    const counts = [];
    for (const cutPoint of cutPoints) {
      counts.push(cutPoint - previous);
      previous = cutPoint;
    }
    counts.push(NUM_AGENTS - previous);

    for (let groupIndex = 0; groupIndex < groupCount; groupIndex += 1) {
      const typeIndex = Math.floor(rng.next() * remainingTypes.length);
      const builtInType = remainingTypes.splice(typeIndex, 1)[0];
      groups.push({
        count: counts[groupIndex],
        builtInType,
        parameters: sampleParameters(builtInType, rng),
      });
    }

    candidates.push({
      label: `${source}_${idx}`,
      groups,
      source,
    });
  }

  return candidates;
}

function buildAgentConfig(group) {
  return {
    name: group.builtInType,
    type: AgentType.BUILT_IN,
    builtInType: group.builtInType,
    parameters: group.parameters,
  };
}

function runCandidate(candidate) {
  const engine = new SimulationEngine();
  const sandbox = new AgentSandbox();
  const game = engine.createGame({
    name: candidate.label,
    description: candidate.source,
    config: {
      capacity: CAPACITY,
      numAgents: NUM_AGENTS,
      numRounds: NUM_ROUNDS,
      benefitRules: {
        positiveMultiplier: 1,
        negativeMultiplier: 1,
      },
    },
  });

  const factory = new AgentFactory(sandbox, undefined, candidate.label);
  const initialContext = {
    attendanceHistory: [],
    capacity: CAPACITY,
    roundNumber: 0,
    helpers: defaultHelpers,
  };

  let agentIndex = 0;
  for (const group of candidate.groups) {
    const config = buildAgentConfig(group);
    for (let i = 0; i < group.count; i += 1) {
      const agent = factory.createAgent(config, initialContext, agentIndex);
      game.addAgent(agent);
      agentIndex += 1;
    }
  }

  game.start();
  const result = engine.runSimulation(game.getId(), NUM_ROUNDS);
  const attendance = result.finalStats.attendanceHistory;
  const absCapacityError = attendance.reduce((sum, value) => sum + Math.abs(value - CAPACITY), 0);
  const crowdedRounds = attendance.filter((value) => value > CAPACITY).length;
  const zeroRounds = attendance.filter((value) => value === 0).length;
  const fullRounds = attendance.filter((value) => value === NUM_AGENTS).length;

  return {
    label: candidate.label,
    source: candidate.source,
    groups: candidate.groups,
    totalUtility: result.finalStats.totalBenefit,
    averageAttendance: result.finalStats.averageAttendance,
    attendanceStdDev: result.finalStats.attendanceStdDev,
    crowdedRounds,
    zeroRounds,
    fullRounds,
    absCapacityError,
    attendance,
    efficiency: result.finalStats.efficiency,
  };
}

function sortForBest(a, b) {
  return (
    b.totalUtility - a.totalUtility ||
    a.absCapacityError - b.absCapacityError ||
    a.crowdedRounds - b.crowdedRounds ||
    a.attendanceStdDev - b.attendanceStdDev
  );
}

function sortForWorst(a, b) {
  return (
    a.totalUtility - b.totalUtility ||
    b.crowdedRounds - a.crowdedRounds ||
    b.fullRounds - a.fullRounds ||
    a.zeroRounds - b.zeroRounds
  );
}

function summarizeGroups(groups) {
  return groups.map((group) => ({
    type: group.builtInType,
    count: group.count,
    parameters: group.parameters,
  }));
}

function main() {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  const candidates = [
    ...generateHomogeneousCandidates(),
    ...generateRandomMixtureCandidates(1200, 0xC0FFEE, 'random_mix_a'),
    ...generateRandomMixtureCandidates(1200, 0xBADF00D, 'random_mix_b'),
    ...generateRandomMixtureCandidates(1200, 0xDEADBEEF, 'random_mix_c'),
  ];

  const results = candidates.map(runCandidate);
  const best = [...results].sort(sortForBest).slice(0, 12);
  const worst = [...results].sort(sortForWorst).slice(0, 12);

  const payload = {
    config: {
      capacity: CAPACITY,
      numAgents: NUM_AGENTS,
      numRounds: NUM_ROUNDS,
      positiveMultiplier: 1,
      negativeMultiplier: 1,
    },
    searchSpaceSize: results.length,
    generatedAt: new Date().toISOString(),
    best: best.map((result, index) => ({
      rank: index + 1,
      label: result.label,
      source: result.source,
      totalUtility: result.totalUtility,
      averageAttendance: result.averageAttendance,
      attendanceStdDev: result.attendanceStdDev,
      crowdedRounds: result.crowdedRounds,
      zeroRounds: result.zeroRounds,
      fullRounds: result.fullRounds,
      absCapacityError: result.absCapacityError,
      efficiency: result.efficiency,
      groups: summarizeGroups(result.groups),
      attendance: result.attendance,
    })),
    worst: worst.map((result, index) => ({
      rank: index + 1,
      label: result.label,
      source: result.source,
      totalUtility: result.totalUtility,
      averageAttendance: result.averageAttendance,
      attendanceStdDev: result.attendanceStdDev,
      crowdedRounds: result.crowdedRounds,
      zeroRounds: result.zeroRounds,
      fullRounds: result.fullRounds,
      absCapacityError: result.absCapacityError,
      efficiency: result.efficiency,
      groups: summarizeGroups(result.groups),
      attendance: result.attendance,
    })),
  };

  fs.writeFileSync(
    path.join(OUTPUT_DIR, 'utility_extremes.json'),
    JSON.stringify(payload, null, 2),
  );

  console.log(`evaluated=${results.length}`);
  console.log('top 5');
  for (const item of best.slice(0, 5)) {
    console.log(
      `${item.label} | utility=${item.totalUtility} | avg=${item.averageAttendance.toFixed(2)} | std=${item.attendanceStdDev.toFixed(2)} | crowded=${item.crowdedRounds}`
    );
  }
  console.log('bottom 5');
  for (const item of worst.slice(0, 5)) {
    console.log(
      `${item.label} | utility=${item.totalUtility} | avg=${item.averageAttendance.toFixed(2)} | std=${item.attendanceStdDev.toFixed(2)} | crowded=${item.crowdedRounds}`
    );
  }
}

main();
