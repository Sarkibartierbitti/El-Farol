import {
  GameConfig,
  GameStatus,
  RoundResult,
  AgentDecision,
  HistoricalData,
  PopulationArrivalConfig,
  PopulationDepartureConfig,
  PopulationDynamicsConfig,
  PopulationFlowSchedule,
  SeededRandom,
} from '@el-farol/shared';

import { BaseAgent } from './Agent';
import { v4 as uuidv4 } from 'uuid';

// game model, manages game state and round execution
export class Game {
  private readonly id: string; //constant
  private readonly name: string;
  private readonly description?: string;
  private readonly config: GameConfig;
  private status: GameStatus;
  private agents: BaseAgent[];
  private activeAgentIds: Set<string>;
  private attendanceHistory: number[];
  private benefitHistory: number[];
  private activePopulationHistory: number[];
  private arrivalsHistory: number[];
  private departuresHistory: number[];
  private currentRound: number;
  private totalBenefit: number;
  private readonly createdAt: Date;
  private updatedAt: Date;
  private createdBy?: string;
  private readonly random: SeededRandom;

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
    this.activeAgentIds = new Set();
    this.attendanceHistory = [];
    this.benefitHistory = [];
    this.activePopulationHistory = [];
    this.arrivalsHistory = [];
    this.departuresHistory = [];
    this.currentRound = 0;
    this.totalBenefit = 0;
    this.createdAt = new Date();
    this.updatedAt = new Date();
    this.createdBy = createdBy;
    this.random = new SeededRandom(id);
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

  getActivePopulationHistory(): number[] {
    return [...this.activePopulationHistory];
  }

  getArrivalsHistory(): number[] {
    return [...this.arrivalsHistory];
  }

  getDeparturesHistory(): number[] {
    return [...this.departuresHistory];
  }

  getActiveAgentCount(): number {
    if (this.status !== GameStatus.DRAFT) {
      return this.activeAgentIds.size;
    }
    return this.getInitialActiveAgents();
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

  // remove agent from game
  removeAgent(agentId: string): void {
    if (this.status !== GameStatus.DRAFT) {
      throw new Error('Cannot remove agents from a game that is not in DRAFT status');
    }
    const index = this.agents.findIndex((agent) => agent.getId() === agentId);
    if (index === -1) {
      throw new Error(`Agent with id ${agentId} not found`);
    }
    this.agents.splice(index, 1);
    this.updatedAt = new Date();
  }

  // start game
  start(): void {
    if (this.status !== GameStatus.DRAFT) {
      throw new Error('Game can only be started from DRAFT status');
    }
    if (this.agents.length !== this.config.numAgents) {
      throw new Error(`Game must have exactly ${this.config.numAgents} agents`);
    }
    this.initializeActiveAgents();
    this.status = GameStatus.RUNNING;
    this.updatedAt = new Date();
  }

  // pause game
  pause(): void {
    if (this.status !== GameStatus.RUNNING) {
      throw new Error('Game can only be paused when RUNNING');
    }
    this.status = GameStatus.PAUSED;
    this.updatedAt = new Date();
  }

  // resume game
  resume(): void {
    if (this.status !== GameStatus.PAUSED) {
      throw new Error('Game can only be resumed when PAUSED');
    }
    this.status = GameStatus.RUNNING;
    this.updatedAt = new Date();
  }

  // complete the game
  complete(): void {
    this.status = GameStatus.COMPLETED;
    this.updatedAt = new Date();
  }

  // cancel the game
  cancel(): void {
    this.status = GameStatus.CANCELLED;
    this.updatedAt = new Date();
  }

  // get data from agents
  getHistoricalData(): HistoricalData {
    return {
      attendanceHistory: this.attendanceHistory,
      benefitHistory: this.benefitHistory,
      activePopulationHistory: this.activePopulationHistory,
      currentRound: this.currentRound,
      capacity: this.config.capacity,
      numAgents: this.config.numAgents,
    };
  }


  //helper to get number to boundary
  private clamp(value: number, min: number, max: number): number {
    return Math.min(max, Math.max(min, value));
  }

  private getPopulationDynamics(): PopulationDynamicsConfig | null {
    if (!this.config.populationDynamics?.enabled) {
      return null;
    }

    const maxActiveAgents = this.clamp(
      Math.floor(this.config.populationDynamics.maxActiveAgents ?? this.config.numAgents),
      0,
      this.config.numAgents,
    );

    const minActiveAgents = this.clamp(
      Math.floor(this.config.populationDynamics.minActiveAgents ?? 0),
      0,
      maxActiveAgents,
    );

    const initialActiveAgents = this.clamp(
      Math.floor(this.config.populationDynamics.initialActiveAgents),
      minActiveAgents,
      maxActiveAgents,
    );

    return {
      ...this.config.populationDynamics,
      initialActiveAgents,
      minActiveAgents,
      maxActiveAgents,
      utilitySensitivity: 0,
    };
  }

  private getInitialActiveAgents(): number {
    const dynamics = this.getPopulationDynamics();
    return dynamics ? dynamics.initialActiveAgents : this.agents.length;
  }

  private initializeActiveAgents(): void {
    const dynamics = this.getPopulationDynamics();
    if (!dynamics) {
      this.activeAgentIds = new Set(this.agents.map((agent) => agent.getId()));
      return;
    }

    const selectedAgents = this.random.sample(this.agents, dynamics.initialActiveAgents);
    this.activeAgentIds = new Set(selectedAgents.map((agent) => agent.getId()));
  }

  private getActiveAgents(): BaseAgent[] {
    if (!this.getPopulationDynamics()) {
      return this.agents;
    }
    return this.agents.filter((agent) => this.activeAgentIds.has(agent.getId()));
  }

  private getInactiveAgents(): BaseAgent[] {
    return this.agents.filter((agent) => !this.activeAgentIds.has(agent.getId()));
  }

  private sampleNormal(): number {
    const u1 = Math.max(this.random.random(), 1e-12);
    const u2 = this.random.random();
    return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  }

  private sampleGamma(shape: number, scale: number): number {
    const safeShape = Math.max(shape, 1e-6);
    const safeScale = Math.max(scale, 1e-6);

    if (safeShape < 1) {
      const u = Math.max(this.random.random(), 1e-12);
      return this.sampleGamma(safeShape + 1, safeScale) * Math.pow(u, 1 / safeShape);
    }

    const d = safeShape - 1 / 3;
    const c = 1 / Math.sqrt(9 * d);

    while (true) {
      const x = this.sampleNormal();
      const v = Math.pow(1 + c * x, 3);
      if (v <= 0) {
        continue;
      }

      const u = this.random.random();
      if (u < 1 - 0.0331 * Math.pow(x, 4)) {
        return d * v * safeScale;
      }
      if (Math.log(u) < 0.5 * x * x + d * (1 - v + Math.log(v))) {
        return d * v * safeScale;
      }
    }
  }

  private samplePoisson(lambda: number): number {
    const safeLambda = Math.max(0, lambda);
    if (safeLambda === 0) {
      return 0;
    }

    const threshold = Math.exp(-safeLambda);
    let product = 1;
    let count = 0;

    do {
      count += 1;
      product *= this.random.random();
    } while (product > threshold);

    return count - 1;
  }

  private sampleBinomial(trials: number, probability: number): number {
    const safeProbability = this.clamp(probability, 0, 1);
    let count = 0;
    for (let i = 0; i < trials; i++) {
      if (this.random.random() < safeProbability) {
        count += 1;
      }
    }
    return count;
  }

  // schedule scale factor for current round. returns 1 if no schedule.
  // fade window uses (fade + 1 - distance) / (fade + 1) ramp, so no fade round is wasted at 0.
  private computeScheduleScale(round: number, schedule?: PopulationFlowSchedule): number {
    if (!schedule) {
      return 1;
    }
    const start = Math.max(1, Math.floor(schedule.startRound ?? 1));
    const end = schedule.endRound != null ? Math.floor(schedule.endRound) : null;
    const fadeIn = Math.max(0, Math.floor(schedule.fadeInRounds ?? 0));
    const fadeOut = Math.max(0, Math.floor(schedule.fadeOutRounds ?? 0));

    if (round < start) {
      const distance = start - round;
      if (distance > fadeIn) {
        return 0;
      }
      return (fadeIn + 1 - distance) / (fadeIn + 1);
    }

    if (end != null && round > end) {
      const distance = round - end;
      if (distance > fadeOut) {
        return 0;
      }
      return (fadeOut + 1 - distance) / (fadeOut + 1);
    }

    return 1;
  }

  private samplePopulationFlow(
    config: PopulationArrivalConfig | PopulationDepartureConfig,
    limit: number,
    activeAgents: number,
  ): number {
    if (limit <= 0) {
      return 0;
    }

    const combinedFactor = this.computeScheduleScale(this.currentRound, config.schedule);
    if (combinedFactor <= 0) {
      return 0;
    }

    let sampledCount = 0;

    switch (config.distribution) {
      case 'poisson':
        sampledCount = this.samplePoisson((config.mean ?? 0) * combinedFactor);
        break;
      case 'uniform': {
        const min = Math.max(0, Math.floor(config.min ?? 0));
        const max = Math.max(min, Math.floor(config.max ?? limit));
        sampledCount = Math.floor(this.random.randFloat(min, max + 1) * combinedFactor);
        break;
      }
      case 'exponential': {
        const mean = Math.max(0, config.mean ?? 0);
        const sample = -Math.log(Math.max(1 - this.random.random(), 1e-12)) * mean;
        sampledCount = Math.floor(sample * combinedFactor);
        break;
      }
      case 'gamma': {
        const mean = Math.max(0, config.mean ?? 0);
        const shape = Math.max(0.1, config.shape ?? 2);
        const scale = mean > 0 ? mean / shape : 0;
        sampledCount = Math.floor(this.sampleGamma(shape, scale) * combinedFactor);
        break;
      }
      case 'binomial': {
        const probability = this.clamp((config.probability ?? 0) * combinedFactor, 0, 1);
        sampledCount = this.sampleBinomial(activeAgents, probability);
        break;
      }
      default:
        sampledCount = 0;
    }

    return this.clamp(Math.floor(sampledCount), 0, limit);
  }

  private updateActivePopulation(): { activeAgentsStart: number; activeAgentsEnd: number; arrivals: number; departures: number } {
    const dynamics = this.getPopulationDynamics();
    if (!dynamics) {
      const stableCount = this.agents.length;
      return {
        activeAgentsStart: stableCount,
        activeAgentsEnd: stableCount,
        arrivals: 0,
        departures: 0,
      };
    }

    const activeAgentsStart = this.activeAgentIds.size;

    const maxDepartures = Math.max(0, activeAgentsStart - (dynamics.minActiveAgents ?? 0));
    const departures = this.samplePopulationFlow(
      dynamics.departures,
      maxDepartures,
      activeAgentsStart,
    );

    const departingAgents = this.random.sample(this.getActiveAgents(), departures);
    for (const agent of departingAgents) {
      this.activeAgentIds.delete(agent.getId());
    }

    const afterDepartures = this.activeAgentIds.size;
    const maxArrivals = Math.max(
      0,
      Math.min(this.getInactiveAgents().length, (dynamics.maxActiveAgents ?? this.agents.length) - afterDepartures),
    );
    const arrivals = this.samplePopulationFlow(
      dynamics.arrivals,
      maxArrivals,
      afterDepartures,
    );

    const arrivingAgents = this.random.sample(this.getInactiveAgents(), arrivals);
    for (const agent of arrivingAgents) {
      this.activeAgentIds.add(agent.getId());
    }

    return {
      activeAgentsStart,
      activeAgentsEnd: this.activeAgentIds.size,
      arrivals,
      departures,
    };
  }

  // benefit: +1 per attendee under capacity, -1 per attendee over
  private calculateBenefit(attendance: number): number {
    const rules = this.config.benefitRules;
    if (rules?.customFormula) {
      return rules.customFormula(attendance, this.config.capacity);
    }
    return attendance <= this.config.capacity ? attendance : -attendance;
  }

  // execute a single round
  executeRound(): RoundResult {
    if (this.status !== GameStatus.RUNNING) {
      throw new Error('Game must be RUNNING to execute rounds');
    }

    if (this.config.numRounds !== null && this.config.numRounds !== undefined) {
      if (this.currentRound >= this.config.numRounds) {
        this.complete();
        throw new Error('Game has reached maximum number of rounds');
      }
    }

    this.currentRound += 1;
    const roundId = uuidv4();
    const history = this.attendanceHistory;
    const populationSnapshot = this.updateActivePopulation();
    const activeAgents = this.getActiveAgents();

    const decisions: AgentDecision[] = [];
    let attendance = 0;

    for (const agent of activeAgents) {
      const decision = agent.predict(history, this.config.capacity);
      if (decision) {
        attendance += 1;
      }
      decisions.push({
        agentId: agent.getId(),
        agentName: agent.getName(),
        decision,
        benefit: 0,
      });
    }

    const totalBenefit = this.calculateBenefit(attendance);
    const individualBenefit = activeAgents.length > 0 ? totalBenefit / activeAgents.length : 0;

    for (const decision of decisions) {
      decision.benefit = decision.decision ? individualBenefit : 0;
    }

    this.attendanceHistory.push(attendance);
    this.benefitHistory.push(totalBenefit);
    this.activePopulationHistory.push(populationSnapshot.activeAgentsEnd);
    this.arrivalsHistory.push(populationSnapshot.arrivals);
    this.departuresHistory.push(populationSnapshot.departures);
    this.totalBenefit += totalBenefit;

    if (this.config.maxHistoryInMemory) {
      const maxHistory = this.config.maxHistoryInMemory;
      if (this.attendanceHistory.length > maxHistory) {
        this.attendanceHistory = this.attendanceHistory.slice(-maxHistory);
        this.benefitHistory = this.benefitHistory.slice(-maxHistory);
        this.activePopulationHistory = this.activePopulationHistory.slice(-maxHistory);
        this.arrivalsHistory = this.arrivalsHistory.slice(-maxHistory);
        this.departuresHistory = this.departuresHistory.slice(-maxHistory);
      }
    }

    this.updatedAt = new Date();

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
      activeAgentsStart: populationSnapshot.activeAgentsStart,
      activeAgentsEnd: populationSnapshot.activeAgentsEnd,
      arrivals: populationSnapshot.arrivals,
      departures: populationSnapshot.departures,
      agentDecisions: decisions,
      timestamp: new Date(),
    };
  }

  // get current game state
  getState() {
    const avgAttendance = this.attendanceHistory.length > 0
      ? this.attendanceHistory.reduce((sum, value) => sum + value, 0) / this.attendanceHistory.length
      : 0;

    return {
      gameId: this.id,
      status: this.status,
      currentRound: this.currentRound,
      totalRounds: this.currentRound,
      totalBenefit: this.totalBenefit,
      averageAttendance: avgAttendance,
      agentCount: this.agents.length,
      activeAgentCount: this.getActiveAgentCount(),
      lastRoundAttendance: this.attendanceHistory[this.attendanceHistory.length - 1],
      lastRoundBenefit: this.benefitHistory[this.benefitHistory.length - 1],
    };
  }
}
