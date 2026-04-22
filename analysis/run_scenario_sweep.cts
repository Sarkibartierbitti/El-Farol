const fs = require('fs');
const path = require('path');

const { SimulationEngine, AgentFactory, AgentSandbox } = require('../apps/backend/src/core/simulation-engine/index.ts');
const { AgentType, BuiltInAgentType } = require('../apps/shared/src/types/agent.ts');

/** @typedef {typeof BuiltInAgentType[keyof typeof BuiltInAgentType]} BuiltInAgentTypeValue */

const defaultHelpers = {
  sum: (arr) => arr.reduce((a, b) => a + b, 0),
  average: (arr) => (arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : 0),
  min: (arr) => Math.min(...arr),
  max: (arr) => Math.max(...arr),
  last: (arr) => arr[arr.length - 1],
};

const customTrendGuardCode = `
const recent = history.slice(-6);

if (recent.length === 0) {
  decision = true;
} else {
  const averageAttendance = helpers.average(recent);
  const previousAverage = helpers.average(recent.slice(0, -1));
  const localTrend = recent.length > 1 ? averageAttendance - previousAverage : 0;

  const safeCapacity = capacity * 0.92;
  const maxAllowedTrend = capacity * 0.05;

  decision = averageAttendance < safeCapacity && localTrend < maxAllowedTrend;
}
`;

const scenarios = [
  {
    id: 'random_baseline',
    title: 'Random Baseline',
    hypothesis: 'Memoryless agents should produce a noisy cloud near the unbiased attendance level.',
    rounds: 120,
    capacity: 60,
    numAgents: 100,
    groups: [{ count: 100, name: 'Random', type: 'built_in', builtInType: BuiltInAgentType.RANDOM }],
  },
  {
    id: 'threshold_optimists',
    title: 'Threshold Optimists',
    hypothesis: 'Lenient threshold rules should create a stubborn high-attendance plateau with frequent overcrowding.',
    rounds: 120,
    capacity: 60,
    numAgents: 100,
    groups: [
      {
        count: 100,
        name: 'Threshold',
        type: 'built_in',
        builtInType: BuiltInAgentType.THRESHOLD,
        parameters: { threshold: 1.25, goProbability: 0.9 },
      },
    ],
  },
  {
    id: 'moving_average_echo',
    title: 'Moving Average Echo',
    hypothesis: 'Short-memory feedback should create a near period-2 sawtooth between crowded and empty rounds.',
    rounds: 120,
    capacity: 60,
    numAgents: 100,
    groups: [
      {
        count: 100,
        name: 'Moving Average',
        type: 'built_in',
        builtInType: BuiltInAgentType.MOVING_AVERAGE,
        parameters: { windowSize: 2, threshold: 0.6 },
      },
    ],
  },
  {
    id: 'moving_average_long_memory',
    title: 'Moving Average Long Memory',
    hypothesis: 'Longer windows should smooth the response and create broad, lagged waves instead of a sharp alternation.',
    rounds: 120,
    capacity: 60,
    numAgents: 100,
    groups: [
      {
        count: 100,
        name: 'Moving Average',
        type: 'built_in',
        builtInType: BuiltInAgentType.MOVING_AVERAGE,
        parameters: { windowSize: 12, threshold: 0.62 },
      },
    ],
  },
  {
    id: 'adaptive_fast',
    title: 'Adaptive Fast',
    hypothesis: 'Fast threshold updates should overreact and create large self-inflicted oscillations.',
    rounds: 120,
    capacity: 60,
    numAgents: 100,
    groups: [
      {
        count: 100,
        name: 'Adaptive',
        type: 'built_in',
        builtInType: BuiltInAgentType.ADAPTIVE,
        parameters: { initialThreshold: 0.85, adaptationRate: 0.18 },
      },
    ],
  },
  {
    id: 'adaptive_slow',
    title: 'Adaptive Slow',
    hypothesis: 'Slow adaptation should spend longer drifting before settling into a narrower band.',
    rounds: 120,
    capacity: 60,
    numAgents: 100,
    groups: [
      {
        count: 100,
        name: 'Adaptive',
        type: 'built_in',
        builtInType: BuiltInAgentType.ADAPTIVE,
        parameters: { initialThreshold: 0.85, adaptationRate: 0.03 },
      },
    ],
  },
  {
    id: 'contrarian_flashmob',
    title: 'Contrarian Flash Mob',
    hypothesis: 'When everyone goes only after recent crowding, the crowd should move in delayed synchronized bursts.',
    rounds: 120,
    capacity: 60,
    numAgents: 100,
    groups: [
      {
        count: 100,
        name: 'Contrarian',
        type: 'built_in',
        builtInType: BuiltInAgentType.CONTRARIAN,
        parameters: { lookback: 1 },
      },
    ],
  },
  {
    id: 'trend_follower_whiplash',
    title: 'Trend Follower Whiplash',
    hypothesis: 'Trend extrapolation should amplify moves and produce boom-bust waves with sharp reversals.',
    rounds: 120,
    capacity: 60,
    numAgents: 100,
    groups: [
      {
        count: 100,
        name: 'Trend Follower',
        type: 'built_in',
        builtInType: BuiltInAgentType.TREND_FOLLOWER,
        parameters: { windowSize: 3 },
      },
    ],
  },
  {
    id: 'loyal_square_wave',
    title: 'Loyal Square Wave',
    hypothesis: 'Synchronized fixed schedules should generate a clean on-off attendance block pattern.',
    rounds: 120,
    capacity: 60,
    numAgents: 100,
    groups: [
      {
        count: 100,
        name: 'Loyal',
        type: 'built_in',
        builtInType: BuiltInAgentType.LOYAL,
        parameters: { onRounds: 3, offRounds: 3 },
      },
    ],
  },
  {
    id: 'regret_balancer',
    title: 'Regret Balancer',
    hypothesis: 'Regret updates should drive an exploratory start and then hover in a self-correcting middle band.',
    rounds: 120,
    capacity: 60,
    numAgents: 100,
    groups: [
      {
        count: 100,
        name: 'Regret Minimizing',
        type: 'built_in',
        builtInType: BuiltInAgentType.REGRET_MINIMIZING,
        parameters: { learningRate: 1.2 },
      },
    ],
  },
  {
    id: 'mixed_ecology',
    title: 'Mixed Ecology',
    hypothesis: 'Strategy diversity should break synchronization and pull the system toward a richer but safer corridor.',
    rounds: 120,
    capacity: 60,
    numAgents: 100,
    groups: [
      { count: 15, name: 'Random', type: 'built_in', builtInType: BuiltInAgentType.RANDOM },
      {
        count: 15,
        name: 'Threshold',
        type: 'built_in',
        builtInType: BuiltInAgentType.THRESHOLD,
        parameters: { threshold: 0.95, goProbability: 0.8 },
      },
      {
        count: 15,
        name: 'Moving Average',
        type: 'built_in',
        builtInType: BuiltInAgentType.MOVING_AVERAGE,
        parameters: { windowSize: 5, threshold: 0.6 },
      },
      {
        count: 15,
        name: 'Adaptive',
        type: 'built_in',
        builtInType: BuiltInAgentType.ADAPTIVE,
        parameters: { initialThreshold: 0.7, adaptationRate: 0.08 },
      },
      {
        count: 10,
        name: 'Contrarian',
        type: 'built_in',
        builtInType: BuiltInAgentType.CONTRARIAN,
        parameters: { lookback: 2 },
      },
      {
        count: 10,
        name: 'Trend Follower',
        type: 'built_in',
        builtInType: BuiltInAgentType.TREND_FOLLOWER,
        parameters: { windowSize: 4 },
      },
      {
        count: 10,
        name: 'Loyal',
        type: 'built_in',
        builtInType: BuiltInAgentType.LOYAL,
        parameters: { onRounds: 2, offRounds: 2 },
      },
      {
        count: 10,
        name: 'Regret Minimizing',
        type: 'built_in',
        builtInType: BuiltInAgentType.REGRET_MINIMIZING,
        parameters: { learningRate: 1.0 },
      },
    ],
  },
  {
    id: 'custom_trend_guard',
    title: 'Custom Trend Guard',
    hypothesis: 'A hand-coded recent-average guard should create conservative bursts with quick pullbacks near capacity.',
    rounds: 120,
    capacity: 60,
    numAgents: 100,
    groups: [
      {
        count: 100,
        name: 'Custom Trend Guard',
        type: 'custom',
        customCode: customTrendGuardCode,
      },
    ],
  },
];

function buildAgentConfig(group) {
  if (group.type === 'custom') {
    return {
      name: group.name,
      type: AgentType.CUSTOM,
      customCode: group.customCode,
    };
  }

  return {
    name: group.name,
    type: AgentType.BUILT_IN,
    builtInType: group.builtInType,
    parameters: group.parameters,
  };
}

function runScenario(definition) {
  const engine = new SimulationEngine();
  const sandbox = new AgentSandbox();
  const game = engine.createGame({
    name: definition.title,
    description: definition.hypothesis,
    config: {
      capacity: definition.capacity,
      numAgents: definition.numAgents,
      numRounds: definition.rounds,
      benefitRules: definition.benefitRules ?? {
        positiveMultiplier: 1,
        negativeMultiplier: 1,
      },
    },
  });

  const factory = new AgentFactory(sandbox, undefined, definition.id);
  const initialContext = {
    attendanceHistory: [],
    capacity: definition.capacity,
    roundNumber: 0,
    helpers: defaultHelpers,
  };

  let agentIndex = 0;
  for (const group of definition.groups) {
    const config = buildAgentConfig(group);
    for (let i = 0; i < group.count; i += 1) {
      const agent = factory.createAgent(config, initialContext, agentIndex);
      game.addAgent(agent);
      agentIndex += 1;
    }
  }

  game.start();
  const result = engine.runSimulation(game.getId(), definition.rounds);

  return {
    ...definition,
    rounds: result.rounds.map((round) => ({
      roundNumber: round.roundNumber,
      attendance: round.attendance,
      totalBenefit: round.totalBenefit,
    })),
    finalStats: result.finalStats,
  };
}

function main() {
  const outputDir = path.resolve(__dirname, '../analysis_outputs');
  fs.mkdirSync(outputDir, { recursive: true });

  const results = scenarios.map(runScenario);
  const outputPath = path.join(outputDir, 'scenario_results.json');
  fs.writeFileSync(outputPath, JSON.stringify({ generatedAt: new Date().toISOString(), scenarios: results }, null, 2));

  console.log(`Saved ${results.length} scenarios to ${outputPath}`);
  for (const scenario of results) {
    const stats = scenario.finalStats;
    console.log(
      [
        scenario.id,
        `avg=${stats.averageAttendance.toFixed(2)}`,
        `std=${stats.attendanceStdDev.toFixed(2)}`,
        `over=${stats.roundsOverCapacity}`,
        `eff=${(stats.efficiency * 100).toFixed(1)}%`,
      ].join(' | ')
    );
  }
}

main();
