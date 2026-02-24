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
  }
  
  export interface BenefitRules {
    positiveMultiplier?: number;
    negativeMultiplier?: number;
  }
  
  export interface GameConfig {
    capacity: number;
    numAgents: number;
    numRounds?: number | null;
    benefitRules?: BenefitRules;
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
    optimalBenefit: number;
    efficiency: number;
    attendanceHistory: number[];
    benefitHistory: number[];
    roundsWithinCapacity: number;
    roundsOverCapacity: number;
  }
  
  export interface RoundSummary {
    roundNumber: number;
    attendance: number;
    totalBenefit: number;
  }
  
  export interface SimulationResult {
    gameId: string;
    status: string;
    totalRounds: number;
    duration: number;
    finalStats: GameStats;
    roundsSummary: RoundSummary[];
  }
  
  export interface AgentConfig {
    name: string;
    type: 'built_in';
    builtInType: BuiltInAgentType;
    parameters?: Record<string, unknown>;
  }
  
  export interface SimulationFormValues {
    name: string;
    numAgents: number;
    capacityPercent: number;
    numRounds: number;
    positiveMultiplier: number;
    negativeMultiplier: number;
  }
  
  export interface AgentBatchEntry {
    type: BuiltInAgentType;
    count: number;
  }
  
  export interface ChartPoint {
    round: number;
    attendance: number;
    benefit: number;
  }
  