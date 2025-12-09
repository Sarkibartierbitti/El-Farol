// what type of agen it is
export enum AgentType {
  BUILT_IN = 'built_in',
  CUSTOM = 'custom',
  HUMAN = 'human'
}

// built in agent parameters
export enum BuiltInAgentType {
  RANDOM = 'random',
  THRESHOLD = 'threshold',
  MOVING_AVERAGE = 'moving_average',
  ADAPTIVE = 'adaptive'
}

//config for built in
export interface BuiltInAgentConfig {
  type: BuiltInAgentType;
  parameters?: Record<string, unknown>;
}

//custom agent config
export interface CustomAgentConfig {
  code: string;
  name?: string;
}

//user data
export interface HumanAgentConfig {
  userId?: string;
  telegramUserId?: string;
}

//basic agent interface
export interface IAgent {

  getId(): string;

  getName(): string;

  getType(): AgentType;

  //param history - past attendance, capacity
  predict(history: number[], capacity: number): boolean;
}

//metadata for agent
export interface AgentMetadata {
  id: string;
  gameId: string;
  name: string;
  type: AgentType;
  strategyCode?: string; // For custom agents
  config?: BuiltInAgentConfig | CustomAgentConfig | HumanAgentConfig;
  createdAt: Date;
}

//create agent with code
export interface AgentConfig {
  name: string;
  type: AgentType;
  builtInType?: BuiltInAgentType;
  customCode?: string;
  parameters?: Record<string, unknown>;
  userId?: string;
  telegramUserId?: string;
}

//paerformance
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
  winRate: number; // optimal decision count
  decisionPattern: boolean[]; // decision history
}

