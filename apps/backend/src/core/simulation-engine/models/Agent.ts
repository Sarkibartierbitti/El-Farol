import {
  IAgent,
  AgentType
} from '@el-farol/shared';
import { SeededRandom } from '@el-farol/shared';

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

  abstract predict(history: number[], capacity: number): boolean;
}

// random agent who makes random decisions
export class RandomAgent extends BaseAgent {
  constructor(id: string, name: string = 'Random Agent', random?: SeededRandom) {
    super(id, name, AgentType.BUILT_IN, random);
  }

  predict(_history: number[], _capacity: number): boolean {
    return this.random.randBool();
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

  predict(history: number[], capacity: number): boolean {
    if (history.length === 0) {
      return this.random.randBool();
    }

    const avg = history.reduce((sum, val) => sum + val, 0) / history.length;
    const normalizedAvg = avg / capacity;

    if (normalizedAvg < this.threshold) {
      // below threshold - higher go
      return this.random.random() < this.goProbability;
    } else {
      // above threshold - higher no go
      return this.random.random() < (1 - this.goProbability);
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

  predict(history: number[], capacity: number): boolean {
    if (history.length === 0) {
      return this.random.randBool();
    }

    const window = history.slice(-this.windowSize);
    const avg = window.reduce((sum, val) => sum + val, 0) / window.length;
    const normalizedAvg = avg / capacity;

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

  predict(history: number[], capacity: number): boolean {
    if (history.length === 0) {
      return this.random.randBool();
    }

    const avg = history.reduce((sum, val) => sum + val, 0) / history.length;
    const normalizedAvg = avg / capacity;

    // Adapt threshold based on last decision's outcome
    if (this.lastDecision !== null && history.length > 1) {
      const lastAttendance = history[history.length - 1]!;
      const wasGoodDecision = this.lastDecision
        ? lastAttendance <= capacity
        : lastAttendance > capacity;

      if (wasGoodDecision) {
        // keep threshold if good decision
        this.currentThreshold = this.currentThreshold;
      } else {
        // adjust threshold if bad decision
        if (this.lastDecision) {
          // increase if stuffed
          this.currentThreshold = Math.min(
            1.0,
            this.currentThreshold + this.adaptationRate
          );
        } else {
          // decrease if much space
          this.currentThreshold = Math.max(
            0.0,
            this.currentThreshold - this.adaptationRate
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

  predict(_history: number[], _capacity: number): boolean {
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

  predict(history: number[], capacity: number): boolean {
    return this.executor(history, capacity);
  }

  getCode(): string {
    return this.code;
  }
}
