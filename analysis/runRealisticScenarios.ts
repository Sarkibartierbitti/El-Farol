// 7 realistic scenarios mapping El Farol dynamics to real-world phenomena.
// Output: analysis_outputs/realistic_results.json

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
  category: 'realistic';
  title: string;
  hypothesis: string;
  realWorldAnalogue: string;
  rounds: number;
  capacity: number;
  numAgents: number;
  groups: AgentGroup[];
  populationDynamics?: PopulationDynamicsConfig;
}

const scenarios: ScenarioDefinition[] = [
  // 1. Server rush — flash crowd, low cap, timeouts kick in
  {
    id: 'r1_server_rush',
    category: 'realistic',
    title: 'Server rush (flash crowd → timeouts)',
    hypothesis:
      'Massive initial arrivals overwhelm low capacity; users start timing out (departures), trend-followers chase the dropping load, system stabilizes well below cap.',
    realWorldAnalogue:
      'New product launch / viral link — server cap=20 req/round, 300-user pool, everyone tries immediately.',
    rounds: 80,
    capacity: 20,
    numAgents: 300,
    groups: [
      { count: 90, name: 'TrendFollower', builtInType: BuiltInAgentType.TREND_FOLLOWER, parameters: { windowSize: 3 } },
      { count: 90, name: 'Threshold', builtInType: BuiltInAgentType.THRESHOLD, parameters: { threshold: 0.7, goProbability: 0.9 } },
      { count: 60, name: 'Adaptive', builtInType: BuiltInAgentType.ADAPTIVE, parameters: { initialThreshold: 0.5, adaptationRate: 0.15 } },
      { count: 60, name: 'Contrarian', builtInType: BuiltInAgentType.CONTRARIAN, parameters: { lookback: 1 } },
    ],
    populationDynamics: {
      enabled: true, initialActiveAgents: 30, minActiveAgents: 5, maxActiveAgents: 250, utilitySensitivity: 0,
      // arrivals: huge burst rounds 1-8, fade-out 4
      arrivals: { distribution: 'poisson', mean: 40, schedule: { startRound: 1, endRound: 8, fadeInRounds: 0, fadeOutRounds: 4 } },
      // departures: timeouts start round 6, ramp up, stay forever
      departures: { distribution: 'binomial', probability: 0.12, schedule: { startRound: 6, fadeInRounds: 4, fadeOutRounds: 0 } },
    },
  },

  // 2. Highway commute — fixed pool, smart commuters shift, rigid 9-5ers crash
  {
    id: 'r2_highway_commute',
    category: 'realistic',
    title: 'Highway commute (rush-hour timing)',
    hypothesis:
      'Adaptive + regret-min commuters shift to off-peak; rigid threshold drivers create persistent jams. Long horizon (working days).',
    realWorldAnalogue:
      '100 commuters choose 8am vs alt time; road capacity = 40 cars/round. 200 working days.',
    rounds: 200,
    capacity: 40,
    numAgents: 100,
    groups: [
      { count: 35, name: 'Threshold', builtInType: BuiltInAgentType.THRESHOLD, parameters: { threshold: 0.5, goProbability: 0.95 } },
      { count: 30, name: 'Adaptive', builtInType: BuiltInAgentType.ADAPTIVE, parameters: { initialThreshold: 0.5, adaptationRate: 0.04 } },
      { count: 25, name: 'RegretMin', builtInType: BuiltInAgentType.REGRET_MINIMIZING, parameters: { learningRate: 0.5 } },
      { count: 10, name: 'Loyal', builtInType: BuiltInAgentType.LOYAL, parameters: { onRounds: 5, offRounds: 0 } },
    ],
  },

  // 3. Gym in January — resolutions arrive, most quit by February
  {
    id: 'r3_gym_january',
    category: 'realistic',
    title: 'Gym in January (resolutions → dropout)',
    hypothesis:
      'Festival-style arrival burst (Jan resolutions), departures dominate by week 6, regulars persist.',
    realWorldAnalogue:
      'Small gym cap=30, regulars=20, 180 new-year hopefuls arrive over rounds 1-14, most quit rounds 20-60.',
    rounds: 150,
    capacity: 30,
    numAgents: 200,
    groups: [
      { count: 30, name: 'Loyal regulars', builtInType: BuiltInAgentType.LOYAL, parameters: { onRounds: 3, offRounds: 1 } },
      { count: 60, name: 'Adaptive', builtInType: BuiltInAgentType.ADAPTIVE, parameters: { initialThreshold: 0.5, adaptationRate: 0.1 } },
      { count: 60, name: 'Random newbies', builtInType: BuiltInAgentType.RANDOM },
      { count: 50, name: 'Threshold', builtInType: BuiltInAgentType.THRESHOLD, parameters: { threshold: 0.7, goProbability: 0.85 } },
    ],
    populationDynamics: {
      enabled: true, initialActiveAgents: 20, minActiveAgents: 20, maxActiveAgents: 200, utilitySensitivity: 0,
      arrivals: { distribution: 'poisson', mean: 12, schedule: { startRound: 1, endRound: 14, fadeInRounds: 0, fadeOutRounds: 6 } },
      departures: { distribution: 'binomial', probability: 0.05, schedule: { startRound: 20, endRound: 80, fadeInRounds: 8, fadeOutRounds: 8 } },
    },
  },

  // 4. Restaurant Friday hype — word-of-mouth feedback
  {
    id: 'r4_restaurant_hype',
    category: 'realistic',
    title: 'Restaurant Friday hype loop',
    hypothesis:
      'Moving-average + trend-followers cause hype to amplify last week\'s busyness; expect period-2 boom/bust.',
    realWorldAnalogue:
      'Trendy restaurant cap=25, 100 potential diners deciding each Friday based on prior weeks.',
    rounds: 120,
    capacity: 25,
    numAgents: 100,
    groups: [
      { count: 50, name: 'MovingAvg', builtInType: BuiltInAgentType.MOVING_AVERAGE, parameters: { windowSize: 3, threshold: 0.5 } },
      { count: 25, name: 'TrendFollower', builtInType: BuiltInAgentType.TREND_FOLLOWER, parameters: { windowSize: 3 } },
      { count: 15, name: 'Contrarian (hipster)', builtInType: BuiltInAgentType.CONTRARIAN, parameters: { lookback: 1 } },
      { count: 10, name: 'Loyal regulars', builtInType: BuiltInAgentType.LOYAL, parameters: { onRounds: 1, offRounds: 1 } },
    ],
  },

  // 5. Black Friday store — single-day shock
  {
    id: 'r5_black_friday',
    category: 'realistic',
    title: 'Black Friday store (single-day shock)',
    hypothesis:
      'Concentrated arrival burst rounds 1-3, customers leave fast once overcrowded. Short horizon = single sale day.',
    realWorldAnalogue:
      '40-customer cap store, 250-shopper pool, doors open at midnight, mass arrivals in first 30 minutes.',
    rounds: 60,
    capacity: 40,
    numAgents: 250,
    groups: [
      { count: 100, name: 'TrendFollower', builtInType: BuiltInAgentType.TREND_FOLLOWER, parameters: { windowSize: 2 } },
      { count: 80, name: 'Adaptive', builtInType: BuiltInAgentType.ADAPTIVE, parameters: { initialThreshold: 0.6, adaptationRate: 0.2 } },
      { count: 50, name: 'Threshold', builtInType: BuiltInAgentType.THRESHOLD, parameters: { threshold: 0.6, goProbability: 0.9 } },
      { count: 20, name: 'RegretMin', builtInType: BuiltInAgentType.REGRET_MINIMIZING, parameters: { learningRate: 0.8 } },
    ],
    populationDynamics: {
      enabled: true, initialActiveAgents: 50, minActiveAgents: 5, maxActiveAgents: 200, utilitySensitivity: 0,
      arrivals: { distribution: 'poisson', mean: 35, schedule: { startRound: 1, endRound: 4, fadeInRounds: 0, fadeOutRounds: 3 } },
      departures: { distribution: 'binomial', probability: 0.06 },
    },
  },

  // 6. Concert ticket panic — extreme low cap, FOMO + scalpers
  {
    id: 'r6_concert_tickets',
    category: 'realistic',
    title: 'Concert ticket release (FOMO)',
    hypothesis:
      'Extreme scarcity; trend-followers panic-buy, contrarians (scalpers) wait. Most rounds way over cap → mass disappointment.',
    realWorldAnalogue:
      '200 fans, only 15 tickets/round, 50-round sale window. Pure FOMO + waiting strategies.',
    rounds: 50,
    capacity: 15,
    numAgents: 200,
    groups: [
      { count: 80, name: 'TrendFollower (FOMO)', builtInType: BuiltInAgentType.TREND_FOLLOWER, parameters: { windowSize: 2 } },
      { count: 60, name: 'Threshold (eager)', builtInType: BuiltInAgentType.THRESHOLD, parameters: { threshold: 0.4, goProbability: 0.95 } },
      { count: 30, name: 'Contrarian (scalpers)', builtInType: BuiltInAgentType.CONTRARIAN, parameters: { lookback: 1 } },
      { count: 30, name: 'Adaptive', builtInType: BuiltInAgentType.ADAPTIVE, parameters: { initialThreshold: 0.3, adaptationRate: 0.2 } },
    ],
    populationDynamics: {
      enabled: true, initialActiveAgents: 100, minActiveAgents: 20, maxActiveAgents: 200, utilitySensitivity: 0,
      arrivals: { distribution: 'poisson', mean: 25, schedule: { startRound: 1, endRound: 6, fadeInRounds: 0, fadeOutRounds: 2 } },
      departures: { distribution: 'binomial', probability: 0.04 },
    },
  },

  // 7. Pandemic reopening — gradual fade-in as restrictions lift
  {
    id: 'r7_pandemic_reopening',
    category: 'realistic',
    title: 'Pandemic reopening (gradual fade-in)',
    hypothesis:
      'Slow fade-in over 60 rounds simulates phased reopening; diverse risk tolerance (full ecology) reaches stable equilibrium near new cap.',
    realWorldAnalogue:
      'Restaurants at 50% capacity reopen gradually; 300-person pool with varying risk strategies, 6 months horizon.',
    rounds: 180,
    capacity: 50,
    numAgents: 300,
    groups: [
      { count: 40, name: 'Random', builtInType: BuiltInAgentType.RANDOM },
      { count: 38, name: 'Threshold', builtInType: BuiltInAgentType.THRESHOLD, parameters: { threshold: 0.6, goProbability: 0.9 } },
      { count: 38, name: 'MovingAvg', builtInType: BuiltInAgentType.MOVING_AVERAGE, parameters: { windowSize: 5, threshold: 0.6 } },
      { count: 38, name: 'Adaptive', builtInType: BuiltInAgentType.ADAPTIVE, parameters: { initialThreshold: 0.6, adaptationRate: 0.08 } },
      { count: 38, name: 'Contrarian', builtInType: BuiltInAgentType.CONTRARIAN, parameters: { lookback: 1 } },
      { count: 38, name: 'TrendFollower', builtInType: BuiltInAgentType.TREND_FOLLOWER, parameters: { windowSize: 4 } },
      { count: 35, name: 'Loyal', builtInType: BuiltInAgentType.LOYAL, parameters: { onRounds: 2, offRounds: 2 } },
      { count: 35, name: 'RegretMin', builtInType: BuiltInAgentType.REGRET_MINIMIZING, parameters: { learningRate: 0.6 } },
    ],
    populationDynamics: {
      enabled: true, initialActiveAgents: 15, minActiveAgents: 15, maxActiveAgents: 200, utilitySensitivity: 0,
      arrivals: { distribution: 'poisson', mean: 4, schedule: { startRound: 1, fadeInRounds: 60, fadeOutRounds: 0 } },
      departures: { distribution: 'binomial', probability: 0.015 },
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
    throw new Error(`${definition.id}: group counts sum to ${totalAgents}, expected ${definition.numAgents}`);
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
    realWorldAnalogue: definition.realWorldAnalogue,
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
        s.id.padEnd(28),
        `avg=${stats.averageAttendance.toFixed(2).padStart(6)}`,
        `std=${stats.attendanceStdDev.toFixed(2).padStart(5)}`,
        `over=${String(stats.roundsOverCapacity).padStart(3)}/${s.rounds}`,
        `eff=${(stats.efficiency * 100).toFixed(1).padStart(5)}%`,
      ].join(' | ')
    );
    return out;
  });

  const outputPath = path.join(outputDir, 'realistic_results.json');
  fs.writeFileSync(outputPath, JSON.stringify({ generatedAt: new Date().toISOString(), scenarios: results }, null, 2));
  console.log(`\nSaved ${results.length} realistic scenarios to ${outputPath}`);
}

main();
