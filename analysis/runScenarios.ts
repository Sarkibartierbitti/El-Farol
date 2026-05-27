// 25 scenarios. Imports backend simulation engine directly.
// Output: analysis_outputs/scenario_results.json

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  SimulationEngine,
  AgentFactory,
  AgentSandbox,
} from '../apps/backend/src/core/simulation-engine/index.ts';
import { AgentType, BuiltInAgentType } from '../apps/shared/src/types/agent.ts';
import type { PopulationDynamicsConfig } from '../apps/shared/src/types/game.ts';

type BuiltInAgentTypeValue = typeof BuiltInAgentType[keyof typeof BuiltInAgentType];

interface AgentGroup {
  count: number;
  name: string;
  builtInType: BuiltInAgentTypeValue;
  parameters?: Record<string, number>;
}

interface ScenarioDefinition {
  id: string;
  category: 'mono' | 'mix' | 'capacity' | 'population';
  title: string;
  hypothesis: string;
  rounds: number;
  capacity: number;
  numAgents: number;
  groups: AgentGroup[];
  populationDynamics?: PopulationDynamicsConfig;
}

const ROUNDS = 150;
const CAP = 60;
const NUM = 100;

// helper factory functions
const mono = (
  id: string,
  title: string,
  hypothesis: string,
  builtInType: BuiltInAgentTypeValue,
  parameters?: Record<string, number>,
): ScenarioDefinition => ({
  id,
  category: 'mono',
  title,
  hypothesis,
  rounds: ROUNDS,
  capacity: CAP,
  numAgents: NUM,
  groups: [{ count: NUM, name: title, builtInType, parameters }],
});

const eightSplitGroups = (): AgentGroup[] => [
  { count: 13, name: 'Random', builtInType: BuiltInAgentType.RANDOM },
  { count: 12, name: 'Threshold', builtInType: BuiltInAgentType.THRESHOLD, parameters: { threshold: 0.6, goProbability: 0.9 } },
  { count: 13, name: 'MovingAvg', builtInType: BuiltInAgentType.MOVING_AVERAGE, parameters: { windowSize: 5, threshold: 0.6 } },
  { count: 12, name: 'Adaptive', builtInType: BuiltInAgentType.ADAPTIVE, parameters: { initialThreshold: 0.6, adaptationRate: 0.08 } },
  { count: 13, name: 'Contrarian', builtInType: BuiltInAgentType.CONTRARIAN, parameters: { lookback: 1 } },
  { count: 12, name: 'TrendFollower', builtInType: BuiltInAgentType.TREND_FOLLOWER, parameters: { windowSize: 4 } },
  { count: 13, name: 'Loyal', builtInType: BuiltInAgentType.LOYAL, parameters: { onRounds: 2, offRounds: 2 } },
  { count: 12, name: 'RegretMin', builtInType: BuiltInAgentType.REGRET_MINIMIZING, parameters: { learningRate: 0.6 } },
];

const scenarios: ScenarioDefinition[] = [
  // ── A. Mono baselines (8) ────────────────────────────────────────
  mono('01_mono_random', 'All Random', 'Pure noise; attendance hovers near goProb*N with binomial variance.', BuiltInAgentType.RANDOM),
  mono('02_mono_threshold', 'All Threshold', 'Threshold rule on history avg; expect rapid bistable swings or lock-on.', BuiltInAgentType.THRESHOLD, { threshold: 0.6, goProbability: 0.95 }),
  mono('03_mono_moving_avg', 'All Moving Average', 'Same w=5 window; uniform behavior breeds period-2 oscillation.', BuiltInAgentType.MOVING_AVERAGE, { windowSize: 5, threshold: 0.6 }),
  mono('04_mono_adaptive', 'All Adaptive', 'Self-adjusting threshold should converge near capacity.', BuiltInAgentType.ADAPTIVE, { initialThreshold: 0.6, adaptationRate: 0.08 }),
  mono('05_mono_contrarian', 'All Contrarian', 'Everyone copies the opposite of last round → catastrophic over/undershoot.', BuiltInAgentType.CONTRARIAN, { lookback: 1 }),
  mono('06_mono_trend_follower', 'All Trend Follower', 'Chases gradient; expect runaway then crash.', BuiltInAgentType.TREND_FOLLOWER, { windowSize: 4 }),
  mono('07_mono_loyal', 'All Loyal', 'Fixed on/off schedule; attendance = (on/(on+off))*N deterministically.', BuiltInAgentType.LOYAL, { onRounds: 2, offRounds: 2 }),
  mono('08_mono_regret_min', 'All Regret Minimizing', 'Online learning should approach mixed-strategy equilibrium.', BuiltInAgentType.REGRET_MINIMIZING, { learningRate: 0.6 }),

  // ── B. Adversarial mixes (5) ────────────────────────────────────
  {
    id: '09_mix_contrarian_vs_threshold',
    category: 'mix',
    title: 'Contrarians vs Threshold majority',
    hypothesis: 'Contrarian minority should profit by going when threshold-flock avoids.',
    rounds: ROUNDS, capacity: CAP, numAgents: NUM,
    groups: [
      { count: 70, name: 'Threshold', builtInType: BuiltInAgentType.THRESHOLD, parameters: { threshold: 0.6, goProbability: 0.95 } },
      { count: 30, name: 'Contrarian', builtInType: BuiltInAgentType.CONTRARIAN, parameters: { lookback: 1 } },
    ],
  },
  {
    id: '10_mix_regret_vs_trend',
    category: 'mix',
    title: 'Regret-Min vs Trend Followers',
    hypothesis: 'Learners should exploit trend-followers as predictable.',
    rounds: ROUNDS, capacity: CAP, numAgents: NUM,
    groups: [
      { count: 50, name: 'TrendFollower', builtInType: BuiltInAgentType.TREND_FOLLOWER, parameters: { windowSize: 4 } },
      { count: 50, name: 'RegretMin', builtInType: BuiltInAgentType.REGRET_MINIMIZING, parameters: { learningRate: 0.6 } },
    ],
  },
  {
    id: '11_mix_adaptive_vs_random',
    category: 'mix',
    title: 'Adaptive vs Random',
    hypothesis: 'Adaptive should ride noise; random contributes ~Bin(50, p) variance.',
    rounds: ROUNDS, capacity: CAP, numAgents: NUM,
    groups: [
      { count: 50, name: 'Random', builtInType: BuiltInAgentType.RANDOM },
      { count: 50, name: 'Adaptive', builtInType: BuiltInAgentType.ADAPTIVE, parameters: { initialThreshold: 0.6, adaptationRate: 0.08 } },
    ],
  },
  {
    id: '12_mix_loyal_anchor',
    category: 'mix',
    title: 'Loyal anchors + Moving-Avg crowd',
    hypothesis: 'Deterministic loyal block injects regular signal that MA echoes.',
    rounds: ROUNDS, capacity: CAP, numAgents: NUM,
    groups: [
      { count: 20, name: 'Loyal', builtInType: BuiltInAgentType.LOYAL, parameters: { onRounds: 3, offRounds: 2 } },
      { count: 80, name: 'MovingAvg', builtInType: BuiltInAgentType.MOVING_AVERAGE, parameters: { windowSize: 5, threshold: 0.6 } },
    ],
  },
  {
    id: '13_mix_full_ecology',
    category: 'mix',
    title: 'Full ecology (all 8 strategies)',
    hypothesis: 'Heterogeneity dampens oscillations; expect noisy band near capacity.',
    rounds: ROUNDS, capacity: CAP, numAgents: NUM,
    groups: eightSplitGroups(),
  },

  // ── C. Capacity sweeps (4) ──────────────────────────────────────
  ...[30, 50, 70, 85].map<ScenarioDefinition>((cap, i) => ({
    id: `${14 + i}_cap_${cap}`,
    category: 'capacity',
    title: `Full ecology @ capacity ${cap}%`,
    hypothesis: `Same 8-way mix at capacity=${cap}; attendance should track capacity, efficiency varies.`,
    rounds: ROUNDS,
    capacity: cap,
    numAgents: NUM,
    groups: eightSplitGroups(),
  })),

  // ── D. Population dynamics + schedules (8) ──────────────────────
  {
    id: '18_pop_steady_churn',
    category: 'population',
    title: 'Steady churn (Poisson in, binomial out)',
    hypothesis: 'Random in/out keeps active count near equilibrium; attendance variance grows.',
    rounds: ROUNDS, capacity: CAP, numAgents: 200,
    groups: eightSplitGroups().map((g) => ({ ...g, count: g.count * 2 })),
    populationDynamics: {
      enabled: true, initialActiveAgents: 100, minActiveAgents: 60, maxActiveAgents: 100, utilitySensitivity: 0,
      arrivals: { distribution: 'poisson', mean: 4 },
      departures: { distribution: 'binomial', probability: 0.04 },
    },
  },
  {
    id: '19_pop_growth',
    category: 'population',
    title: 'Linear growth — fade-in arrivals only',
    hypothesis: 'Population swells from 30 to ~100 over fade-in; attendance climbs in lockstep.',
    rounds: ROUNDS, capacity: CAP, numAgents: 200,
    groups: eightSplitGroups().map((g) => ({ ...g, count: g.count * 2 })),
    populationDynamics: {
      enabled: true, initialActiveAgents: 30, minActiveAgents: 30, maxActiveAgents: 100, utilitySensitivity: 0,
      arrivals: { distribution: 'poisson', mean: 5, schedule: { startRound: 1, fadeInRounds: 0, fadeOutRounds: 0 } },
      departures: { distribution: 'binomial', probability: 0 },
    },
  },
  {
    id: '20_pop_fade_out',
    category: 'population',
    title: 'Crowd fade-out rounds 50→100',
    hypothesis: 'Departures kick in mid-game and ramp down; attendance drops along with active count.',
    rounds: ROUNDS, capacity: CAP, numAgents: 200,
    groups: eightSplitGroups().map((g) => ({ ...g, count: g.count * 2 })),
    populationDynamics: {
      enabled: true, initialActiveAgents: 100, minActiveAgents: 10, maxActiveAgents: 100, utilitySensitivity: 0,
      arrivals: { distribution: 'poisson', mean: 0 },
      departures: { distribution: 'binomial', probability: 0.1, schedule: { startRound: 50, endRound: 100, fadeInRounds: 5, fadeOutRounds: 5 } },
    },
  },
  {
    id: '21_pop_festival',
    category: 'population',
    title: 'Festival shock — arrivals only rounds 10–30',
    hypothesis: 'Burst of arrivals concentrated in window; attendance spikes then settles.',
    rounds: ROUNDS, capacity: CAP, numAgents: 200,
    groups: eightSplitGroups().map((g) => ({ ...g, count: g.count * 2 })),
    populationDynamics: {
      enabled: true, initialActiveAgents: 40, minActiveAgents: 10, maxActiveAgents: 100, utilitySensitivity: 0,
      arrivals: { distribution: 'poisson', mean: 8, schedule: { startRound: 10, endRound: 30, fadeInRounds: 3, fadeOutRounds: 5 } },
      departures: { distribution: 'binomial', probability: 0.03 },
    },
  },
  {
    id: '22_pop_late_bloom',
    category: 'population',
    title: 'Late bloom — empty until round 40',
    hypothesis: 'Bar empty first 40 rounds, then ramps up. Tests whether learners adapt to regime change.',
    rounds: ROUNDS, capacity: CAP, numAgents: 200,
    groups: eightSplitGroups().map((g) => ({ ...g, count: g.count * 2 })),
    populationDynamics: {
      enabled: true, initialActiveAgents: 5, minActiveAgents: 5, maxActiveAgents: 100, utilitySensitivity: 0,
      arrivals: { distribution: 'poisson', mean: 6, schedule: { startRound: 41, fadeInRounds: 8, fadeOutRounds: 0 } },
      departures: { distribution: 'binomial', probability: 0.02 },
    },
  },
  {
    id: '23_pop_volatile_uniform',
    category: 'population',
    title: 'Volatile uniform flows',
    hypothesis: 'Wide uniform arrivals (0–12) + uniform departures (0–10) → large active-count swings.',
    rounds: ROUNDS, capacity: CAP, numAgents: 200,
    groups: eightSplitGroups().map((g) => ({ ...g, count: g.count * 2 })),
    populationDynamics: {
      enabled: true, initialActiveAgents: 100, minActiveAgents: 30, maxActiveAgents: 100, utilitySensitivity: 0,
      arrivals: { distribution: 'uniform', min: 0, max: 12 },
      departures: { distribution: 'uniform', min: 0, max: 10 },
    },
  },
  {
    id: '24_pop_gamma_heavy_tail',
    category: 'population',
    title: 'Gamma heavy-tail arrivals',
    hypothesis: 'Gamma(shape=1.5, mean=5) produces occasional big arrival bursts.',
    rounds: ROUNDS, capacity: CAP, numAgents: 200,
    groups: eightSplitGroups().map((g) => ({ ...g, count: g.count * 2 })),
    populationDynamics: {
      enabled: true, initialActiveAgents: 60, minActiveAgents: 30, maxActiveAgents: 100, utilitySensitivity: 0,
      arrivals: { distribution: 'gamma', mean: 5, shape: 1.5 },
      departures: { distribution: 'poisson', mean: 4 },
    },
  },
  {
    id: '25_pop_collapse',
    category: 'population',
    title: 'Slow collapse (departures > arrivals)',
    hypothesis: 'Population steadily dwindles to floor; attendance drops with it.',
    rounds: ROUNDS, capacity: CAP, numAgents: 200,
    groups: eightSplitGroups().map((g) => ({ ...g, count: g.count * 2 })),
    populationDynamics: {
      enabled: true, initialActiveAgents: 100, minActiveAgents: 10, maxActiveAgents: 100, utilitySensitivity: 0,
      arrivals: { distribution: 'poisson', mean: 2 },
      departures: { distribution: 'binomial', probability: 0.06 },
    },
  },
];

function buildAgentConfig(group: AgentGroup) {
  return {
    name: group.name,
    type: AgentType.BUILT_IN,
    builtInType: group.builtInType,
    parameters: group.parameters,
  };
}

function runScenario(definition: ScenarioDefinition) {
  const engine = new SimulationEngine();
  const sandbox = new AgentSandbox();

  const totalAgents = definition.groups.reduce((sum, g) => sum + g.count, 0);
  if (totalAgents !== definition.numAgents) {
    throw new Error(`${definition.id}: group counts sum to ${totalAgents}, expected numAgents=${definition.numAgents}`);
  }

  const game = engine.createGame({
    name: definition.title,
    description: definition.hypothesis,
    config: {
      capacity: definition.capacity,
      numAgents: definition.numAgents,
      numRounds: definition.rounds,
      benefitRules: { positiveMultiplier: 1, negativeMultiplier: 1 },
      populationDynamics: definition.populationDynamics,
    },
  });

  const factory = new AgentFactory(sandbox, undefined, definition.id);
  let agentIndex = 0;
  for (const group of definition.groups) {
    const config = buildAgentConfig(group);
    for (let i = 0; i < group.count; i++) {
      const agent = factory.createAgent(config, undefined, agentIndex);
      game.addAgent(agent);
      agentIndex += 1;
    }
  }

  game.start();
  const result = engine.runSimulation(game.getId(), definition.rounds);

  return {
    id: definition.id,
    category: definition.category,
    title: definition.title,
    hypothesis: definition.hypothesis,
    rounds: definition.rounds,
    capacity: definition.capacity,
    numAgents: definition.numAgents,
    populationDynamics: definition.populationDynamics ?? null,
    groupSummary: definition.groups.map((g) => ({ name: g.name, count: g.count, builtInType: g.builtInType })),
    perRound: result.rounds.map((r) => ({
      round: r.roundNumber,
      attendance: r.attendance,
      benefit: r.totalBenefit,
      activeAgentsEnd: r.activeAgentsEnd,
      arrivals: r.arrivals,
      departures: r.departures,
    })),
    finalStats: result.finalStats,
  };
}

function main() {
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const outputDir = path.resolve(__dirname, '../analysis_outputs');
  fs.mkdirSync(outputDir, { recursive: true });

  const results = scenarios.map((s) => {
    const out = runScenario(s);
    const stats = out.finalStats;
    console.log(
      [
        s.id.padEnd(35),
        `avg=${stats.averageAttendance.toFixed(2).padStart(6)}`,
        `std=${stats.attendanceStdDev.toFixed(2).padStart(5)}`,
        `over=${String(stats.roundsOverCapacity).padStart(3)}`,
        `eff=${(stats.efficiency * 100).toFixed(1).padStart(5)}%`,
      ].join(' | ')
    );
    return out;
  });

  const outputPath = path.join(outputDir, 'scenario_results.json');
  fs.writeFileSync(outputPath, JSON.stringify({ generatedAt: new Date().toISOString(), scenarios: results }, null, 2));
  console.log(`\nSaved ${results.length} scenarios to ${outputPath}`);
}

main();
