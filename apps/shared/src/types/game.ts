export enum GameStatus {
  DRAFT = 'draft',
  RUNNING = 'running',
  PAUSED = 'paused',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled'
}

// calculate benefit
export interface BenefitRules {
//when attendance is within capacity benefit is attendance * multiplier
  positiveMultiplier?: number;
//when attendance exceeds capacity benefit is -attendance * multiplier
  negativeMultiplier?: number;

//custom benefit calculation function
  customFormula?: (attendance: number, capacity: number) => number;
}


export interface GameConfig {
  capacity: number;
  numAgents: number;
  numRounds?: number | null;

  //benefit calculation rules
  benefitRules?: BenefitRules;

  allowHumanPlayers?: boolean;

  //max history in memory, rest set to database
  maxHistoryInMemory?: number;
}


export interface GameMetadata {
  id: string;
  name: string;
  description?: string;
  status: GameStatus;
  config: GameConfig;
  createdAt: Date;
  updatedAt: Date;
  createdBy?: string; // user id, null for sandbox games
  currentRound: number;
}


export interface CreateGameRequest {
  name: string;
  description?: string;
  config: GameConfig;
  createdBy?: string;
}

//current snapshot
export interface GameState {
  gameId: string;
  status: GameStatus;
  currentRound: number;
  totalRounds: number;
  totalBenefit: number;
  averageAttendance: number;
  agentCount: number;
  lastRoundAttendance?: number;
  lastRoundBenefit?: number;
}


export interface GameStats {
  gameId: string;
  totalRounds: number;
  totalBenefit: number;
  averageBenefit: number;
  averageAttendance: number;
  attendanceVariance: number;
  attendanceStdDev: number;
  optimalBenefit: number; // max possible benefit
  efficiency: number; // (actual benefit - min benefit) / (max benefit - min benefit)
  attendanceHistory: number[];
  benefitHistory: number[];
  roundsWithinCapacity: number;
  roundsOverCapacity: number;
}

//game insights/recommendations
export interface GameInsights {
  gameId: string;
  strategyEffectiveness: {
    agentType: string;
    averageBenefit: number;
    winRate: number;
  }[];
  convergencePattern?: {
    isConverging: boolean;
    targetValue?: number;
    varianceTrend: 'increasing' | 'decreasing' | 'stable';
  };
  recommendations: string[];
  optimalCapacity?: number; // what capacity should be for optimal performance with current agents
}

