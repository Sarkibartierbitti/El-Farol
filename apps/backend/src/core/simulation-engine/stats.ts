import type { GameStats } from '@el-farol/shared';

//inputs needed
export interface StatsInput {
  gameId: string;
  attendanceHistory: number[];
  benefitHistory: number[];
  capacity: number;
  numAgents: number;
}


export function calculateStats(input: StatsInput): GameStats {
  const { gameId, attendanceHistory, benefitHistory, capacity, numAgents } = input;
  const totalRounds = attendanceHistory.length;

  if (totalRounds === 0) {
    return {
      gameId,
      totalRounds: 0,
      totalBenefit: 0,
      averageBenefit: 0,
      averageAttendance: 0,
      attendanceVariance: 0,
      attendanceStdDev: 0,
      optimalBenefit: 0,
      efficiency: 0,
      attendanceHistory: [],
      benefitHistory: [],
      roundsWithinCapacity: 0,
      roundsOverCapacity: 0,
    };
  }

  const totalBenefit = benefitHistory.reduce((sum, val) => sum + val, 0);
  const averageBenefit = totalBenefit / totalRounds;
  const averageAttendance = attendanceHistory.reduce((sum, val) => sum + val, 0) / totalRounds;

  // variance and standard deviation
  const variance = attendanceHistory.reduce((sum, val) => {
    const diff = val - averageAttendance;
    return sum + diff * diff;
  }, 0) / totalRounds;
  const stdDev = Math.sqrt(variance);

  // optimal/min benefit for efficiency calculation
  const optimalBenefit = capacity * totalRounds;
  const minBenefit = -numAgents * totalRounds;

  // efficiency: (actual - min) / (max - min)
  const efficiency = optimalBenefit !== minBenefit
    ? (totalBenefit - minBenefit) / (optimalBenefit - minBenefit)
    : 0;

  const roundsWithinCapacity = attendanceHistory.filter(a => a <= capacity).length;
  const roundsOverCapacity = totalRounds - roundsWithinCapacity;

  return {
    gameId,
    totalRounds,
    totalBenefit,
    averageBenefit,
    averageAttendance,
    attendanceVariance: variance,
    attendanceStdDev: stdDev,
    optimalBenefit,
    efficiency,
    attendanceHistory: [...attendanceHistory],
    benefitHistory: [...benefitHistory],
    roundsWithinCapacity,
    roundsOverCapacity,
  };
}
