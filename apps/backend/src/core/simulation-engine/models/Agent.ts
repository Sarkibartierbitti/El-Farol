import {
  IAgent,
  AgentType
} from '@el-farol/shared';
import { SeededRandom } from '@el-farol/shared';

export interface AgentBehaviorContext {
  positiveMultiplier: number;
  negativeMultiplier: number;
  effectiveCapacity: number;
  utilityGoBias: number;
  cautionFactor: number;
  rewardFactor: number;
}

//abstract class for all agents
export abstract class BaseAgent implements IAgent {
  protected readonly id: string;
  protected readonly name: string;
  protected readonly type: AgentType;
  protected random: SeededRandom;

  constructor(id: string, name: string, type: AgentType, random?: SeededRandom) {
    this.id = id;
    this.name = name;
    this.type = type;
    this.random = random ?? new SeededRandom();
  }

  getId(): string {
    return this.id;
  }

  getName(): string {
    return this.name;
  }

  getType(): AgentType {
    return this.type;
  }

  protected getEffectiveCapacity(capacity: number, behavior?: AgentBehaviorContext): number {
    return behavior?.effectiveCapacity ?? capacity;
  }

  protected getUtilityGoBias(behavior?: AgentBehaviorContext): number {
    return behavior?.utilityGoBias ?? 0.5;
  }

  protected getCautionFactor(behavior?: AgentBehaviorContext): number {
    return behavior?.cautionFactor ?? 1;
  }

  protected getRewardFactor(behavior?: AgentBehaviorContext): number {
    return behavior?.rewardFactor ?? 1;
  }

  protected clampProbability(value: number): number {
    return Math.min(0.95, Math.max(0.05, value));
  }

  abstract predict(history: number[], capacity: number, behavior?: AgentBehaviorContext): boolean;
}

// random agent who makes random decisions
export class RandomAgent extends BaseAgent {
  constructor(id: string, name: string = 'Random Agent', random?: SeededRandom) {
    super(id, name, AgentType.BUILT_IN, random);
  }

  predict(_history: number[], _capacity: number, behavior?: AgentBehaviorContext): boolean {
    return this.random.random() < this.getUtilityGoBias(behavior);
  }
}

//agent that goes if average attendance is below threshold
export class ThresholdAgent extends BaseAgent {
  private readonly threshold: number;
  private readonly goProbability: number;

  constructor(
    id: string,
    name: string = 'Threshold Agent',
    threshold: number = 1.0,
    goProbability: number = 0.8,
    random?: SeededRandom
  ) {
    super(id, name, AgentType.BUILT_IN, random);
    this.threshold = threshold;
    this.goProbability = goProbability;
  }

  predict(history: number[], capacity: number, behavior?: AgentBehaviorContext): boolean {
    if (history.length === 0) {
      return this.random.random() < this.getUtilityGoBias(behavior);
    }

    const avg = history.reduce((sum, val) => sum + val, 0) / history.length;
    const effectiveCapacity = this.getEffectiveCapacity(capacity, behavior);
    const normalizedAvg = avg / effectiveCapacity;
    const utilityPrior = this.getUtilityGoBias(behavior);
    const adjustedGoProbability = this.clampProbability((this.goProbability * 0.75) + (utilityPrior * 0.25));

    if (normalizedAvg < this.threshold) {
      return this.random.random() < adjustedGoProbability;
    } else {
      return this.random.random() < (1 - adjustedGoProbability);
    }
  }
}

//average but for a limited window of past rounds
export class MovingAverageAgent extends BaseAgent {
  private readonly windowSize: number;
  private readonly threshold: number;

  constructor(
    id: string,
    name: string = 'Moving Average Agent',
    windowSize: number = 5,
    threshold: number = 0.8,
    random?: SeededRandom
  ) {
    super(id, name, AgentType.BUILT_IN, random);
    this.windowSize = windowSize;
    this.threshold = threshold;
  }

  predict(history: number[], capacity: number, behavior?: AgentBehaviorContext): boolean {
    if (history.length === 0) {
      return this.random.random() < this.getUtilityGoBias(behavior);
    }

    const window = history.slice(-this.windowSize);
    const avg = window.reduce((sum, val) => sum + val, 0) / window.length;
    const normalizedAvg = avg / this.getEffectiveCapacity(capacity, behavior);

    return normalizedAvg < this.threshold;
  }
}


//agent that adapts its threshold based on past performance
export class AdaptiveAgent extends BaseAgent {
  private readonly initialThreshold: number;
  private readonly adaptationRate: number;
  private lastDecision: boolean | null = null;
  private currentThreshold: number;

  constructor(
    id: string,
    name: string = 'Adaptive Agent',
    initialThreshold: number = 0.9,
    adaptationRate: number = 0.05,
    random?: SeededRandom
  ) {
    super(id, name, AgentType.BUILT_IN, random);
    this.initialThreshold = initialThreshold;
    this.adaptationRate = adaptationRate;
    this.currentThreshold = initialThreshold;
  }

  predict(history: number[], capacity: number, behavior?: AgentBehaviorContext): boolean {
    if (history.length === 0) {
      return this.random.random() < this.getUtilityGoBias(behavior);
    }

    const effectiveCapacity = this.getEffectiveCapacity(capacity, behavior);
    const avg = history.reduce((sum, val) => sum + val, 0) / history.length;
    const normalizedAvg = avg / effectiveCapacity;

    // Adapt threshold based on last decision's outcome
    if (this.lastDecision !== null && history.length > 1) {
      const lastAttendance = history[history.length - 1]!;
      const wasGoodDecision = this.lastDecision
        ? lastAttendance <= effectiveCapacity
        : lastAttendance > effectiveCapacity;

      if (wasGoodDecision) {
        // keep threshold if good decision
        this.currentThreshold = this.currentThreshold;
      } else {
        // adjust threshold if bad decision
        if (this.lastDecision) {
          const penaltyStep = this.adaptationRate * this.getCautionFactor(behavior);
          this.currentThreshold = Math.min(
            1.0,
            this.currentThreshold + penaltyStep
          );
        } else {
          const rewardStep = this.adaptationRate * this.getRewardFactor(behavior);
          this.currentThreshold = Math.max(
            0.0,
            this.currentThreshold - rewardStep
          );
        }
      }
    }

    const decision = normalizedAvg < this.currentThreshold;
    this.lastDecision = decision;
    return decision;
  }

  reset(): void {
    this.currentThreshold = this.initialThreshold;
    this.lastDecision = null;
  }
}


// goes when the bar was recently overcreowded
export class ContrarianAgent extends BaseAgent {
  private readonly lookback: number;

  constructor(
    id: string,
    name: string = 'Contrarian Agent',
    lookback: number = 1,
    random?: SeededRandom
  ) {
    super(id, name, AgentType.BUILT_IN, random);
    this.lookback = Math.max(1, lookback);
  }

  predict(history: number[], capacity: number, behavior?: AgentBehaviorContext): boolean {
    if (history.length === 0) {
      return this.random.random() < this.getUtilityGoBias(behavior);
    }

    const recent = history.slice(-this.lookback);
    const avg = recent.reduce((sum, val) => sum + val, 0) / recent.length;
    return avg >= this.getEffectiveCapacity(capacity, behavior);
  }
}

// predicts a simple linear model and goes accordingly

export class TrendFollowerAgent extends BaseAgent {
  private readonly windowSize: number;

  constructor(
    id: string,
    name: string = 'Trend Follower Agent',
    windowSize: number = 4,
    random?: SeededRandom
  ) {
    super(id, name, AgentType.BUILT_IN, random);
    this.windowSize = Math.max(2, windowSize);
  }

  predict(history: number[], capacity: number, behavior?: AgentBehaviorContext): boolean {
    if (history.length < 2) {
      return this.random.random() < this.getUtilityGoBias(behavior);
    }

    const window = history.slice(-this.windowSize);

    let trendSum = 0;
    for (let i = 1; i < window.length; i++) {
      trendSum += window[i]! - window[i - 1]!;
    }
    const avgTrend = trendSum / (window.length - 1);

    const predicted = window[window.length - 1]! + avgTrend;

    return predicted < this.getEffectiveCapacity(capacity, behavior);
  }
}

// goes with a cycle
export class LoyalAgent extends BaseAgent {
  private readonly onRounds: number;
  private readonly offRounds: number;
  private roundCounter: number = 0;

  constructor(
    id: string,
    name: string = 'Cycle Agent',
    onRounds: number = 2,
    offRounds: number = 1,
    random?: SeededRandom
  ) {
    super(id, name, AgentType.BUILT_IN, random);
    this.onRounds = Math.max(1, onRounds);
    this.offRounds = Math.max(1, offRounds);
  }

  predict(_history: number[], _capacity: number, behavior?: AgentBehaviorContext): boolean {
    const utilityGoBias = this.getUtilityGoBias(behavior);
    const effectiveOnRounds = Math.max(1, Math.round(this.onRounds * (0.75 + utilityGoBias)));
    const effectiveOffRounds = Math.max(1, Math.round(this.offRounds * (1.75 - utilityGoBias)));
    const cycleLength = effectiveOnRounds + effectiveOffRounds;
    const positionInCycle = this.roundCounter % cycleLength;
    this.roundCounter++;

    return positionInCycle < effectiveOnRounds;
  }

  reset(): void {
    this.roundCounter = 0;
  }
}

// regret minimizing agent

export class RegretMinimizingAgent extends BaseAgent {
  private goRegret: number = 0;
  private stayRegret: number = 0;
  private lastDecision: boolean | null = null;
  private readonly learningRate: number;

  constructor(
    id: string,
    name: string = 'Regret Minimizer Agent',
    learningRate: number = 1.0,
    random?: SeededRandom
  ) {
    super(id, name, AgentType.BUILT_IN, random);
    this.learningRate = learningRate;
  }

  predict(history: number[], capacity: number, behavior?: AgentBehaviorContext): boolean {
    const effectiveCapacity = this.getEffectiveCapacity(capacity, behavior);
    const cautionWeight = this.learningRate * this.getCautionFactor(behavior);
    const rewardWeight = this.learningRate * this.getRewardFactor(behavior);

    // update regrets
    if (this.lastDecision !== null && history.length > 0) {
      const lastAttendance = history[history.length - 1]!;
      const wasCrowded = lastAttendance > effectiveCapacity;

      if (this.lastDecision && wasCrowded) {
        this.goRegret += cautionWeight;
      } else if (!this.lastDecision && !wasCrowded) {
        this.stayRegret += rewardWeight;
      }
    }

    const totalRegret = this.goRegret + this.stayRegret;
    let goProbability: number;

    if (totalRegret === 0) {
      goProbability = this.getUtilityGoBias(behavior);
    } else {
      const priorWeight = this.learningRate;
      goProbability = (this.stayRegret + (this.getUtilityGoBias(behavior) * priorWeight)) / (totalRegret + priorWeight);
    }

    const decision = this.random.random() < goProbability;
    this.lastDecision = decision;
    return decision;
  }

  reset(): void {
    this.goRegret = 0;
    this.stayRegret = 0;
    this.lastDecision = null;
  }
}

//agent that is controlled by a human
export class HumanAgent extends BaseAgent {
  private pendingDecision: boolean | null = null;

  constructor(
    id: string,
    name: string = 'Human Agent',
    _userId?: string,
    _telegramUserId?: string
  ) {
    super(id, name, AgentType.HUMAN);
  }

  predict(_history: number[], _capacity: number, _behavior?: AgentBehaviorContext): boolean {
    if (this.pendingDecision === null) {
      throw new Error('Human agent decision not set');
    }
    const decision = this.pendingDecision;
    this.pendingDecision = null; // Reset after use
    return decision;
  }

  setDecision(decision: boolean): void {
    this.pendingDecision = decision;
  }

  hasDecision(): boolean {
    return this.pendingDecision !== null;
  }
}

//custom agent
export class CustomAgent extends BaseAgent {
  private readonly code: string;
  private readonly executor: (history: number[], capacity: number) => boolean;

  constructor(
    id: string,
    name: string,
    code: string,
    executor: (history: number[], capacity: number) => boolean,
    random?: SeededRandom
  ) {
    super(id, name, AgentType.CUSTOM, random);
    this.code = code;
    this.executor = executor;
  }

  predict(history: number[], capacity: number, _behavior?: AgentBehaviorContext): boolean {
    return this.executor(history, capacity);
  }

  getCode(): string {
    return this.code;
  }
}
