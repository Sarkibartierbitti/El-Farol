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
export interface GameConfig {
    capacity: number;
    numAgents: number;
    numRounds?: number | null;
    benefitRules?: BenefitRules;
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
    optimalBenefit: number;
    efficiency: number;
    attendanceHistory: number[];
    benefitHistory: number[];
    roundsWithinCapacity: number;
    roundsOverCapacity: number;
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