export enum GameStatus {
    DRAFT = 'draft',
    RUNNING = 'running',
    PAUSED = 'paused',
    COMPLETED = 'completed',
    CANCELLED = 'cancelled',
  }
  
export enum BuiltInAgentType {
    RANDOM = 'random',
    THRESHOLD = 'threshold',
    MOVING_AVERAGE = 'moving_average',
    ADAPTIVE = 'adaptive',
    CONTRARIAN = 'contrarian',
    TREND_FOLLOWER = 'trend_follower',
    LOYAL = 'loyal',
    REGRET_MINIMIZING = 'regret_minimizing',
  }

  export const CUSTOM_AGENT_TYPE = 'custom' as const;
  export type CustomAgentType = typeof CUSTOM_AGENT_TYPE;
  export type SimulationAgentType = BuiltInAgentType | CustomAgentType;
  
export interface BenefitRules {
  positiveMultiplier?: number;
  negativeMultiplier?: number;
}

export type PopulationArrivalDistribution = 'poisson' | 'uniform' | 'exponential' | 'gamma';
export type PopulationDepartureDistribution = PopulationArrivalDistribution | 'binomial';

export interface PopulationArrivalConfig {
  distribution: PopulationArrivalDistribution;
  mean?: number;
  min?: number;
  max?: number;
  shape?: number;
}

export interface PopulationDepartureConfig {
  distribution: PopulationDepartureDistribution;
  mean?: number;
  min?: number;
  max?: number;
  shape?: number;
  probability?: number;
}

export interface PopulationDynamicsConfig {
  enabled: boolean;
  initialActiveAgents: number;
  minActiveAgents: number;
  maxActiveAgents: number;
  utilitySensitivity: number;
  arrivals: PopulationArrivalConfig;
  departures: PopulationDepartureConfig;
}
  
export interface GameConfig {
  capacity: number;
  numAgents: number;
  numRounds?: number | null;
  benefitRules?: BenefitRules;
  populationDynamics?: PopulationDynamicsConfig;
}
  
  export interface GameResponse {
    id: string;
    name: string;
    description?: string;
    status: GameStatus;
    config: GameConfig;
    currentRound: number;
    agentCount: number;
    totalBenefit: number;
    attendanceHistory?: number[];
    benefitHistory?: number[];
    createdAt: string;
    updatedAt: string;
  }
  
  export interface GameStats {
    gameId: string;
    totalRounds: number;
    totalBenefit: number;
    averageBenefit: number;
  averageAttendance: number;
  attendanceVariance: number;
  attendanceStdDev: number;
  averageActivePopulation: number;
  activePopulationVariance: number;
  activePopulationStdDev: number;
  optimalBenefit: number;
  efficiency: number;
  attendanceHistory: number[];
  benefitHistory: number[];
  activePopulationHistory: number[];
  roundsWithinCapacity: number;
  roundsOverCapacity: number;
  totalArrivals: number;
  totalDepartures: number;
  averageBenefitPerActiveAgent: number;
  averageParticipationRate: number;
}
  
export interface RoundSummary {
  roundNumber: number;
  attendance: number;
  totalBenefit: number;
  activeAgentsStart: number;
  activeAgentsEnd: number;
  arrivals: number;
  departures: number;
}
  
  export interface SimulationResult {
    gameId: string;
    status: string;
    totalRounds: number;
    duration: number;
    finalStats: GameStats;
    roundsSummary: RoundSummary[];
  }
  
  export interface BuiltInAgentConfig {
    name: string;
    type: 'built_in';
    builtInType: BuiltInAgentType;
    parameters?: Record<string, unknown>;
  }

  export interface CustomAgentConfig {
    name: string;
    type: 'custom';
    customCode: string;
  }

  export type AgentConfig = BuiltInAgentConfig | CustomAgentConfig;
  
export interface SimulationFormValues {
  name: string;
  numAgents: number;
  capacityPercent: number;
  numRounds: number;
  positiveMultiplier: number;
  negativeMultiplier: number;
  populationDynamics: PopulationDynamicsConfig;
}
  
  export interface AgentBatchEntry {
    type: SimulationAgentType;
    count: number;
    parameters?: Record<string, number>;
    customCode?: string;
    name?: string;
  }
  
export interface ChartPoint {
  round: number;
  attendance: number;
  benefit: number;
  activeAgentsStart: number;
  activeAgentsEnd: number;
  arrivals: number;
  departures: number;
}
  
