"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Game = void 0;
const shared_1 = require("@el-farol/shared");
const uuid_1 = require("uuid");
//game model - manages game state and round execution
class Game {
    id;
    name;
    description;
    config;
    status;
    agents;
    attendanceHistory;
    benefitHistory;
    currentRound;
    totalBenefit;
    createdAt;
    updatedAt;
    createdBy;
    constructor(id, name, config, description, createdBy) {
        this.id = id;
        this.name = name;
        this.description = description;
        this.config = config;
        this.status = shared_1.GameStatus.DRAFT;
        this.agents = [];
        this.attendanceHistory = [];
        this.benefitHistory = [];
        this.currentRound = 0;
        this.totalBenefit = 0;
        this.createdAt = new Date();
        this.updatedAt = new Date();
        this.createdBy = createdBy;
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
    //remove agent from game
    removeAgent(agentId) {
        if (this.status !== shared_1.GameStatus.DRAFT) {
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
    start() {
        if (this.status !== shared_1.GameStatus.DRAFT) {
            throw new Error('Game can only be started from DRAFT status');
        }
        if (this.agents.length !== this.config.numAgents) {
            throw new Error(`Game must have exactly ${this.config.numAgents} agents`);
        }
        this.status = shared_1.GameStatus.RUNNING;
        this.updatedAt = new Date();
    }
    //pause game
    pause() {
        if (this.status !== shared_1.GameStatus.RUNNING) {
            throw new Error('Game can only be paused when RUNNING');
        }
        this.status = shared_1.GameStatus.PAUSED;
        this.updatedAt = new Date();
    }
    //resume game
    resume() {
        if (this.status !== shared_1.GameStatus.PAUSED) {
            throw new Error('Game can only be resumed when PAUSED');
        }
        this.status = shared_1.GameStatus.RUNNING;
        this.updatedAt = new Date();
    }
    //complete the game
    complete() {
        this.status = shared_1.GameStatus.COMPLETED;
        this.updatedAt = new Date();
    }
    //cancel the game
    cancel() {
        this.status = shared_1.GameStatus.CANCELLED;
        this.updatedAt = new Date();
    }
    //get data from agents
    getHistoricalData() {
        return {
            attendanceHistory: this.attendanceHistory,
            benefitHistory: this.benefitHistory,
            currentRound: this.currentRound,
            capacity: this.config.capacity,
            numAgents: this.config.numAgents
        };
    }
    clamp(value, min, max) {
        return Math.min(max, Math.max(min, value));
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
    //check benefit for one round
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
        else {
            return -attendance * negativeMultiplier;
        }
    }
    //execute a single round
    executeRound() {
        if (this.status !== shared_1.GameStatus.RUNNING) {
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
        const roundId = (0, uuid_1.v4)();
        const history = this.attendanceHistory;
        const behaviorContext = this.getAgentBehaviorContext();
        // collect agent decisions
        const decisions = [];
        let attendance = 0;
        for (const agent of this.agents) {
            const decision = agent.predict(history, this.config.capacity, behaviorContext);
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
exports.Game = Game;
