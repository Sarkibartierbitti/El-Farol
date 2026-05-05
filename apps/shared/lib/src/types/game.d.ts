export declare enum GameStatus {
    DRAFT = "draft",
    RUNNING = "running",
    PAUSED = "paused",
    COMPLETED = "completed",
    CANCELLED = "cancelled"
}
export interface BenefitRules {
    positiveMultiplier?: number;
    negativeMultiplier?: number;
    customFormula?: (attendance: number, capacity: number) => number;
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
    minActiveAgents?: number;
    maxActiveAgents?: number;
    utilitySensitivity?: number;
    arrivals: PopulationArrivalConfig;
    departures: PopulationDepartureConfig;
}
export interface GameConfig {
    capacity: number;
    numAgents: number;
    numRounds?: number | null;
    benefitRules?: BenefitRules;
    populationDynamics?: PopulationDynamicsConfig;
    allowHumanPlayers?: boolean;
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
    createdBy?: string;
    currentRound: number;
}
export interface CreateGameRequest {
    name: string;
    description?: string;
    config: GameConfig;
    createdBy?: string;
}
export interface GameState {
    gameId: string;
    status: GameStatus;
    currentRound: number;
    totalRounds: number;
    totalBenefit: number;
    averageAttendance: number;
    agentCount: number;
    activeAgentCount: number;
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
    optimalCapacity?: number;
}
//# sourceMappingURL=game.d.ts.map