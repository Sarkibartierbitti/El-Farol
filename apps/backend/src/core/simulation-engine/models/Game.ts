import {
  GameConfig,
  GameStatus,
  RoundResult,
  AgentDecision,
  HistoricalData
} from '@el-farol/shared';
import { BaseAgent } from './Agent';
import { v4 as uuidv4 } from 'uuid';

//game model - manages game state and round execution
export class Game {
  private readonly id: string;
  private readonly name: string;
  private readonly description?: string;
  private readonly config: GameConfig;
  private status: GameStatus;
  private agents: BaseAgent[];
  private attendanceHistory: number[];
  private benefitHistory: number[];
  private currentRound: number;
  private totalBenefit: number;
  private readonly createdAt: Date;
  private updatedAt: Date;
  private createdBy?: string;

  constructor(
    id: string,
    name: string,
    config: GameConfig,
    description?: string,
    createdBy?: string
  ) {
    this.id = id;
    this.name = name;
    this.description = description;
    this.config = config;
    this.status = GameStatus.DRAFT;
    this.agents = [];
    this.attendanceHistory = [];
    this.benefitHistory = [];
    this.currentRound = 0;
    this.totalBenefit = 0;
    this.createdAt = new Date();
    this.updatedAt = new Date();
    this.createdBy = createdBy;
  }

  getId(): string {
    return this.id;
  }

  getName(): string {
    return this.name;
  }

  getDescription(): string | undefined {
    return this.description;
  }

  getConfig(): GameConfig {
    return this.config;
  }

  getStatus(): GameStatus {
    return this.status;
  }

  getCurrentRound(): number {
    return this.currentRound;
  }

  getTotalBenefit(): number {
    return this.totalBenefit;
  }

  getAgents(): BaseAgent[] {
    return [...this.agents];
  }

  getAttendanceHistory(): number[] {
    return [...this.attendanceHistory];
  }

  getBenefitHistory(): number[] {
    return [...this.benefitHistory];
  }

  getCreatedAt(): Date {
    return this.createdAt;
  }

  getUpdatedAt(): Date {
    return this.updatedAt;
  }

  getCreatedBy(): string | undefined {
    return this.createdBy;
  }

  addAgent(agent: BaseAgent): void {
    if (this.status !== GameStatus.DRAFT) {
      throw new Error('Cannot add agents to a game that is not in DRAFT status');
    }
    if (this.agents.length >= this.config.numAgents) {
      throw new Error(`Game already has maximum number of agents (${this.config.numAgents})`);
    }
    this.agents.push(agent);
    this.updatedAt = new Date();
  }

  //remove agent from game
  removeAgent(agentId: string): void {
    if (this.status !== GameStatus.DRAFT) {
      throw new Error('Cannot remove agents from a game that is not in DRAFT status');
    }
    const index = this.agents.findIndex(a => a.getId() === agentId);
    if (index === -1) {
      throw new Error(`Agent with id ${agentId} not found`);
    }
    this.agents.splice(index, 1);
    this.updatedAt = new Date();
  }

  //start game
  start(): void {
    if (this.status !== GameStatus.DRAFT) {
      throw new Error('Game can only be started from DRAFT status');
    }
    if (this.agents.length !== this.config.numAgents) {
      throw new Error(`Game must have exactly ${this.config.numAgents} agents`);
    }
    this.status = GameStatus.RUNNING;
    this.updatedAt = new Date();
  }

  //pause game
  pause(): void {
    if (this.status !== GameStatus.RUNNING) {
      throw new Error('Game can only be paused when RUNNING');
    }
    this.status = GameStatus.PAUSED;
    this.updatedAt = new Date();
  }

  //resume game
  resume(): void {
    if (this.status !== GameStatus.PAUSED) {
      throw new Error('Game can only be resumed when PAUSED');
    }
    this.status = GameStatus.RUNNING;
    this.updatedAt = new Date();
  }

  //complete the game
  complete(): void {
    this.status = GameStatus.COMPLETED;
    this.updatedAt = new Date();
  }

  //cancel the game
  cancel(): void {
    this.status = GameStatus.CANCELLED;
    this.updatedAt = new Date();
  }

  //get data from agents
  getHistoricalData(): HistoricalData {
    return {
      attendanceHistory: this.attendanceHistory,
      benefitHistory: this.benefitHistory,
      currentRound: this.currentRound,
      capacity: this.config.capacity,
      numAgents: this.config.numAgents
    };
  }

  //check benefit for one round
  private calculateBenefit(attendance: number): number {
    const rules = this.config.benefitRules;
    
    if (rules?.customFormula) {
      return rules.customFormula(attendance, this.config.capacity);
    }

    const positiveMultiplier = rules?.positiveMultiplier ?? 1;
    const negativeMultiplier = rules?.negativeMultiplier ?? 1;

    if (attendance <= this.config.capacity) {
      return attendance * positiveMultiplier;
    } else {
      return -attendance * negativeMultiplier;
    }
  }

  //execute a single round
  executeRound(): RoundResult {
    if (this.status !== GameStatus.RUNNING) {
      throw new Error('Game must be RUNNING to execute rounds');
    }

    //check if we've gone through all rounds
    if (this.config.numRounds !== null && this.config.numRounds !== undefined) {
      if (this.currentRound >= this.config.numRounds) {
        this.complete();
        throw new Error('Game has reached maximum number of rounds');
      }
    }

    this.currentRound++;
    const roundId = uuidv4();
    const history = this.attendanceHistory;

    // collect agent decisions
    const decisions: AgentDecision[] = [];
    let attendance = 0;

    for (const agent of this.agents) {
      const decision = agent.predict(history, this.config.capacity);
      if (decision) {
        attendance++;
      }
      decisions.push({
        agentId: agent.getId(),
        agentName: agent.getName(),
        decision,
        benefit: 0 
      });
    }

    // calculate total benefit
    const totalBenefit = this.calculateBenefit(attendance);
    const individualBenefit = totalBenefit / this.agents.length;

    // update decisions with individual benefits
    for (const decision of decisions) {
      decision.benefit = decision.decision ? individualBenefit : 0;
    }

    // update game state
    this.attendanceHistory.push(attendance);
    this.benefitHistory.push(totalBenefit);
    this.totalBenefit += totalBenefit;

    // limit history in memory if configured
    if (this.config.maxHistoryInMemory) {
      const maxHistory = this.config.maxHistoryInMemory;
      if (this.attendanceHistory.length > maxHistory) {
        this.attendanceHistory = this.attendanceHistory.slice(-maxHistory);
        this.benefitHistory = this.benefitHistory.slice(-maxHistory);
      }
    }

    this.updatedAt = new Date();

    // finish the game if we've gone through all rounds
    if (this.config.numRounds !== null && this.config.numRounds !== undefined) {
      if (this.currentRound >= this.config.numRounds) {
        this.complete();
      }
    }

    return {
      roundId,
      gameId: this.id,
      roundNumber: this.currentRound,
      attendance,
      capacity: this.config.capacity,
      totalBenefit,
      agentDecisions: decisions,
      timestamp: new Date()
    };
  }

  //get current game state
  getState() {
    const avgAttendance = this.attendanceHistory.length > 0
      ? this.attendanceHistory.reduce((sum, val) => sum + val, 0) / this.attendanceHistory.length
      : 0;

    return {
      gameId: this.id,
      status: this.status,
      currentRound: this.currentRound,
      totalRounds: this.currentRound,
      totalBenefit: this.totalBenefit,
      averageAttendance: avgAttendance,
      agentCount: this.agents.length,
      lastRoundAttendance: this.attendanceHistory[this.attendanceHistory.length - 1],
      lastRoundBenefit: this.benefitHistory[this.benefitHistory.length - 1]
    };
  }
}

