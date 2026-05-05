import type { BenefitRules, GameStats } from '@el-farol/shared';

//inputs needed
export interface StatsInput {
  gameId: string;
  attendanceHistory: number[];
  benefitHistory: number[];
  activePopulationHistory?: number[];
  arrivalsHistory?: number[];
  departuresHistory?: number[];
  capacity: number;
  numAgents: number;
  benefitRules?: BenefitRules;
}


export function calculateStats(input: StatsInput): GameStats {
  const {
    gameId,
    attendanceHistory,
    benefitHistory,
    activePopulationHistory,
    arrivalsHistory,
    departuresHistory,
    capacity,
    numAgents,
    benefitRules,
  } = input;
  const totalRounds = attendanceHistory.length;
  const resolvedActivePopulationHistory =
    activePopulationHistory && activePopulationHistory.length === totalRounds
      ? activePopulationHistory
      : Array.from({ length: totalRounds }, () => numAgents);
  const resolvedArrivalsHistory =
    arrivalsHistory && arrivalsHistory.length === totalRounds
      ? arrivalsHistory
      : Array.from({ length: totalRounds }, () => 0);
  const resolvedDeparturesHistory =
    departuresHistory && departuresHistory.length === totalRounds
      ? departuresHistory
      : Array.from({ length: totalRounds }, () => 0);

  if (totalRounds === 0) {
    return {
      gameId,
      totalRounds: 0,
      totalBenefit: 0,
      averageBenefit: 0,
      averageAttendance: 0,
      attendanceVariance: 0,
      attendanceStdDev: 0,
      averageActivePopulation: 0,
      activePopulationVariance: 0,
      activePopulationStdDev: 0,
      optimalBenefit: 0,
      efficiency: 0,
      attendanceHistory: [],
      benefitHistory: [],
      activePopulationHistory: [],
      roundsWithinCapacity: 0,
      roundsOverCapacity: 0,
      totalArrivals: 0,
      totalDepartures: 0,
      averageBenefitPerActiveAgent: 0,
      averageParticipationRate: 0,
    };
  }

  const totalBenefit = benefitHistory.reduce((sum, val) => sum + val, 0);
  const averageBenefit = totalBenefit / totalRounds;
  const averageAttendance = attendanceHistory.reduce((sum, val) => sum + val, 0) / totalRounds;
  const averageActivePopulation =
    resolvedActivePopulationHistory.reduce((sum, val) => sum + val, 0) / totalRounds;

  // variance and standard deviation
  const variance = attendanceHistory.reduce((sum, val) => {
    const diff = val - averageAttendance;
    return sum + diff * diff;
  }, 0) / totalRounds;
  const stdDev = Math.sqrt(variance);
  const activePopulationVariance = resolvedActivePopulationHistory.reduce((sum, val) => {
    const diff = val - averageActivePopulation;
    return sum + diff * diff;
  }, 0) / totalRounds;
  const activePopulationStdDev = Math.sqrt(activePopulationVariance);

  const positiveMultiplier = benefitRules?.positiveMultiplier ?? 1;
  const negativeMultiplier = benefitRules?.negativeMultiplier ?? 1;

  // optimal/min benefit for efficiency calculation
  const optimalBenefit = capacity * totalRounds * positiveMultiplier;
  const minBenefit =
    -resolvedActivePopulationHistory.reduce((sum, activeCount) => sum + activeCount, 0) * negativeMultiplier;

  // efficiency: (actual - min) / (max - min)
  const efficiency = optimalBenefit !== minBenefit
    ? (totalBenefit - minBenefit) / (optimalBenefit - minBenefit)
    : 0;

  const roundsWithinCapacity = attendanceHistory.filter(a => a <= capacity).length;
  const roundsOverCapacity = totalRounds - roundsWithinCapacity;
  const totalArrivals = resolvedArrivalsHistory.reduce((sum, val) => sum + val, 0);
  const totalDepartures = resolvedDeparturesHistory.reduce((sum, val) => sum + val, 0);
  const activeAgentRounds = resolvedActivePopulationHistory.reduce((sum, val) => sum + val, 0);
  const averageBenefitPerActiveAgent = activeAgentRounds > 0 ? totalBenefit / activeAgentRounds : 0;
  const averageParticipationRate =
    activeAgentRounds > 0
      ? attendanceHistory.reduce((sum, val) => sum + val, 0) / activeAgentRounds
      : 0;

  return {
    gameId,
    totalRounds,
    totalBenefit,
    averageBenefit,
    averageAttendance,
    attendanceVariance: variance,
    attendanceStdDev: stdDev,
    averageActivePopulation,
    activePopulationVariance,
    activePopulationStdDev,
    optimalBenefit,
    efficiency,
    attendanceHistory: [...attendanceHistory],
    benefitHistory: [...benefitHistory],
    activePopulationHistory: [...resolvedActivePopulationHistory],
    roundsWithinCapacity,
    roundsOverCapacity,
    totalArrivals,
    totalDepartures,
    averageBenefitPerActiveAgent,
    averageParticipationRate,
  };
}
