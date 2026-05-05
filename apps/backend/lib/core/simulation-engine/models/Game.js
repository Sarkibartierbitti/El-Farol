"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Game = void 0;
const shared_1 = require("@el-farol/shared");
const uuid_1 = require("uuid");
// game model - manages game state and round execution
class Game {
    id;
    name;
    description;
    config;
    status;
    agents;
    activeAgentIds;
    attendanceHistory;
    benefitHistory;
    activePopulationHistory;
    arrivalsHistory;
    departuresHistory;
    currentRound;
    totalBenefit;
    createdAt;
    updatedAt;
    createdBy;
    random;
    constructor(id, name, config, description, createdBy) {
        this.id = id;
        this.name = name;
        this.description = description;
        this.config = config;
        this.status = shared_1.GameStatus.DRAFT;
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
        this.random = new shared_1.SeededRandom(id);
    }
    getId() {
        return this.id;
    }
    getName() {
        return this.name;
    }
    getDescription() {
        return this.description;
    }
    getConfig() {
        return this.config;
    }
    getStatus() {
        return this.status;
    }
    getCurrentRound() {
        return this.currentRound;
    }
    getTotalBenefit() {
        return this.totalBenefit;
    }
    getAgents() {
        return [...this.agents];
    }
    getAttendanceHistory() {
        return [...this.attendanceHistory];
    }
    getBenefitHistory() {
        return [...this.benefitHistory];
    }
    getActivePopulationHistory() {
        return [...this.activePopulationHistory];
    }
    getArrivalsHistory() {
        return [...this.arrivalsHistory];
    }
    getDeparturesHistory() {
        return [...this.departuresHistory];
    }
    getActiveAgentCount() {
        if (this.status !== shared_1.GameStatus.DRAFT) {
            return this.activeAgentIds.size;
        }
        return this.getInitialActiveAgents();
    }
    getCreatedAt() {
        return this.createdAt;
    }
    getUpdatedAt() {
        return this.updatedAt;
    }
    getCreatedBy() {
        return this.createdBy;
    }
    addAgent(agent) {
        if (this.status !== shared_1.GameStatus.DRAFT) {
            throw new Error('Cannot add agents to a game that is not in DRAFT status');
        }
        if (this.agents.length >= this.config.numAgents) {
            throw new Error(`Game already has maximum number of agents (${this.config.numAgents})`);
        }
        this.agents.push(agent);
        this.updatedAt = new Date();
    }
    // remove agent from game
    removeAgent(agentId) {
        if (this.status !== shared_1.GameStatus.DRAFT) {
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
    start() {
        if (this.status !== shared_1.GameStatus.DRAFT) {
            throw new Error('Game can only be started from DRAFT status');
        }
        if (this.agents.length !== this.config.numAgents) {
            throw new Error(`Game must have exactly ${this.config.numAgents} agents`);
        }
        this.initializeActiveAgents();
        this.status = shared_1.GameStatus.RUNNING;
        this.updatedAt = new Date();
    }
    // pause game
    pause() {
        if (this.status !== shared_1.GameStatus.RUNNING) {
            throw new Error('Game can only be paused when RUNNING');
        }
        this.status = shared_1.GameStatus.PAUSED;
        this.updatedAt = new Date();
    }
    // resume game
    resume() {
        if (this.status !== shared_1.GameStatus.PAUSED) {
            throw new Error('Game can only be resumed when PAUSED');
        }
        this.status = shared_1.GameStatus.RUNNING;
        this.updatedAt = new Date();
    }
    // complete the game
    complete() {
        this.status = shared_1.GameStatus.COMPLETED;
        this.updatedAt = new Date();
    }
    // cancel the game
    cancel() {
        this.status = shared_1.GameStatus.CANCELLED;
        this.updatedAt = new Date();
    }
    // get data from agents
    getHistoricalData() {
        return {
            attendanceHistory: this.attendanceHistory,
            benefitHistory: this.benefitHistory,
            activePopulationHistory: this.activePopulationHistory,
            currentRound: this.currentRound,
            capacity: this.config.capacity,
            numAgents: this.config.numAgents,
        };
    }
    clamp(value, min, max) {
        return Math.min(max, Math.max(min, value));
    }
    getPopulationDynamics() {
        if (!this.config.populationDynamics?.enabled) {
            return null;
        }
        const maxActiveAgents = this.clamp(Math.floor(this.config.populationDynamics.maxActiveAgents ?? this.config.numAgents), 0, this.config.numAgents);
        const minActiveAgents = this.clamp(Math.floor(this.config.populationDynamics.minActiveAgents ?? 0), 0, maxActiveAgents);
        const initialActiveAgents = this.clamp(Math.floor(this.config.populationDynamics.initialActiveAgents), minActiveAgents, maxActiveAgents);
        return {
            ...this.config.populationDynamics,
            initialActiveAgents,
            minActiveAgents,
            maxActiveAgents,
            utilitySensitivity: Math.max(0, this.config.populationDynamics.utilitySensitivity ?? 0),
        };
    }
    getInitialActiveAgents() {
        const dynamics = this.getPopulationDynamics();
        return dynamics ? dynamics.initialActiveAgents : this.agents.length;
    }
    initializeActiveAgents() {
        const dynamics = this.getPopulationDynamics();
        if (!dynamics) {
            this.activeAgentIds = new Set(this.agents.map((agent) => agent.getId()));
            return;
        }
        const selectedAgents = this.random.sample(this.agents, dynamics.initialActiveAgents);
        this.activeAgentIds = new Set(selectedAgents.map((agent) => agent.getId()));
    }
    getActiveAgents() {
        if (!this.getPopulationDynamics()) {
            return this.agents;
        }
        return this.agents.filter((agent) => this.activeAgentIds.has(agent.getId()));
    }
    getInactiveAgents() {
        return this.agents.filter((agent) => !this.activeAgentIds.has(agent.getId()));
    }
    sampleNormal() {
        const u1 = Math.max(this.random.random(), 1e-12);
        const u2 = this.random.random();
        return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    }
    sampleGamma(shape, scale) {
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
    samplePoisson(lambda) {
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
    sampleBinomial(trials, probability) {
        const safeProbability = this.clamp(probability, 0, 1);
        let count = 0;
        for (let i = 0; i < trials; i++) {
            if (this.random.random() < safeProbability) {
                count += 1;
            }
        }
        return count;
    }
    getUtilitySignal(activeAgents) {
        if (this.benefitHistory.length === 0) {
            return 0;
        }
        const lastBenefit = this.benefitHistory[this.benefitHistory.length - 1] ?? 0;
        const positiveMultiplier = Math.max(0, this.config.benefitRules?.positiveMultiplier ?? 1);
        const negativeMultiplier = Math.max(0, this.config.benefitRules?.negativeMultiplier ?? 1);
        const reference = Math.max(this.config.capacity * Math.max(positiveMultiplier, 1), activeAgents * Math.max(negativeMultiplier, 1), 1);
        return this.clamp(lastBenefit / reference, -1, 1);
    }
    samplePopulationFlow(config, limit, utilityFactor, activeAgents) {
        if (limit <= 0) {
            return 0;
        }
        let sampledCount = 0;
        switch (config.distribution) {
            case 'poisson':
                sampledCount = this.samplePoisson((config.mean ?? 0) * utilityFactor);
                break;
            case 'uniform': {
                const min = Math.max(0, Math.floor(config.min ?? 0));
                const max = Math.max(min, Math.floor(config.max ?? limit));
                sampledCount = Math.floor(this.random.randFloat(min, max + 1) * utilityFactor);
                break;
            }
            case 'exponential': {
                const mean = Math.max(0, config.mean ?? 0);
                const sample = -Math.log(Math.max(1 - this.random.random(), 1e-12)) * mean;
                sampledCount = Math.floor(sample * utilityFactor);
                break;
            }
            case 'gamma': {
                const mean = Math.max(0, config.mean ?? 0);
                const shape = Math.max(0.1, config.shape ?? 2);
                const scale = mean > 0 ? mean / shape : 0;
                sampledCount = Math.floor(this.sampleGamma(shape, scale) * utilityFactor);
                break;
            }
            case 'binomial': {
                const probability = this.clamp((config.probability ?? 0) * utilityFactor, 0, 1);
                sampledCount = this.sampleBinomial(activeAgents, probability);
                break;
            }
            default:
                sampledCount = 0;
        }
        return this.clamp(Math.floor(sampledCount), 0, limit);
    }
    updateActivePopulation() {
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
        const utilitySignal = this.getUtilitySignal(activeAgentsStart);
        const utilitySensitivity = dynamics.utilitySensitivity ?? 0;
        const arrivalFactor = this.clamp(1 + (utilitySensitivity * utilitySignal), 0.1, 3);
        const departureFactor = this.clamp(1 - (utilitySensitivity * utilitySignal), 0, 3);
        const maxDepartures = Math.max(0, activeAgentsStart - (dynamics.minActiveAgents ?? 0));
        const departures = this.samplePopulationFlow(dynamics.departures, maxDepartures, departureFactor, activeAgentsStart);
        const departingAgents = this.random.sample(this.getActiveAgents(), departures);
        for (const agent of departingAgents) {
            this.activeAgentIds.delete(agent.getId());
        }
        const afterDepartures = this.activeAgentIds.size;
        const maxArrivals = Math.max(0, Math.min(this.getInactiveAgents().length, (dynamics.maxActiveAgents ?? this.agents.length) - afterDepartures));
        const arrivals = this.samplePopulationFlow(dynamics.arrivals, maxArrivals, arrivalFactor, afterDepartures);
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
    getAgentBehaviorContext() {
        const positiveMultiplier = Math.max(0, this.config.benefitRules?.positiveMultiplier ?? 1);
        const negativeMultiplier = Math.max(0, this.config.benefitRules?.negativeMultiplier ?? 1);
        const positiveSafe = Math.max(positiveMultiplier, 0.001);
        const negativeSafe = Math.max(negativeMultiplier, 0.001);
        const utilityRatioLog = Math.log(negativeSafe / positiveSafe);
        const cautionShift = Math.tanh(utilityRatioLog);
        const effectiveCapacity = this.clamp(this.config.capacity * (1 - (0.2 * cautionShift)), 1, this.config.numAgents);
        return {
            positiveMultiplier,
            negativeMultiplier,
            effectiveCapacity,
            utilityGoBias: this.clamp(positiveSafe / (positiveSafe + negativeSafe), 0.1, 0.9),
            cautionFactor: this.clamp(Math.sqrt(negativeSafe / positiveSafe), 0.5, 2),
            rewardFactor: this.clamp(Math.sqrt(positiveSafe / negativeSafe), 0.5, 2),
        };
    }
    // check benefit for one round
    calculateBenefit(attendance) {
        const rules = this.config.benefitRules;
        if (rules?.customFormula) {
            return rules.customFormula(attendance, this.config.capacity);
        }
        const positiveMultiplier = rules?.positiveMultiplier ?? 1;
        const negativeMultiplier = rules?.negativeMultiplier ?? 1;
        if (attendance <= this.config.capacity) {
            return attendance * positiveMultiplier;
        }
        return -attendance * negativeMultiplier;
    }
    // execute a single round
    executeRound() {
        if (this.status !== shared_1.GameStatus.RUNNING) {
            throw new Error('Game must be RUNNING to execute rounds');
        }
        if (this.config.numRounds !== null && this.config.numRounds !== undefined) {
            if (this.currentRound >= this.config.numRounds) {
                this.complete();
                throw new Error('Game has reached maximum number of rounds');
            }
        }
        this.currentRound += 1;
        const roundId = (0, uuid_1.v4)();
        const history = this.attendanceHistory;
        const populationSnapshot = this.updateActivePopulation();
        const activeAgents = this.getActiveAgents();
        const behaviorContext = this.getAgentBehaviorContext();
        const decisions = [];
        let attendance = 0;
        for (const agent of activeAgents) {
            const decision = agent.predict(history, this.config.capacity, behaviorContext);
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
exports.Game = Game;
