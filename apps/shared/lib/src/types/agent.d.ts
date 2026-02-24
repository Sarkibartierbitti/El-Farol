export declare enum AgentType {
    BUILT_IN = "built_in",
    CUSTOM = "custom",
    HUMAN = "human"
}
export declare enum BuiltInAgentType {
    RANDOM = "random",
    THRESHOLD = "threshold",
    MOVING_AVERAGE = "moving_average",
    ADAPTIVE = "adaptive"
}
export interface BuiltInAgentConfig {
    type: BuiltInAgentType;
    parameters?: Record<string, unknown>;
}
export interface CustomAgentConfig {
    code: string;
    name?: string;
}
export interface HumanAgentConfig {
    userId?: string;
    telegramUserId?: string;
}
export interface IAgent {
    getId(): string;
    getName(): string;
    getType(): AgentType;
    predict(history: number[], capacity: number): boolean;
}
export interface AgentMetadata {
    id: string;
    gameId: string;
    name: string;
    type: AgentType;
    strategyCode?: string;
    config?: BuiltInAgentConfig | CustomAgentConfig | HumanAgentConfig;
    createdAt: Date;
}
export interface AgentConfig {
    name: string;
    type: AgentType;
    builtInType?: BuiltInAgentType;
    customCode?: string;
    parameters?: Record<string, unknown>;
    userId?: string;
    telegramUserId?: string;
}
export interface AgentPerformance {
    agentId: string;
    agentName: string;
    totalRounds: number;
    totalBenefit: number;
    averageBenefit: number;
    decisions: {
        go: number;
        noGo: number;
    };
    winRate: number;
    decisionPattern: boolean[];
}
//# sourceMappingURL=agent.d.ts.map