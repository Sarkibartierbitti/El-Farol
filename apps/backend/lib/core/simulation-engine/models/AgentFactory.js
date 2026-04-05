"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AgentFactory = void 0;
const shared_1 = require("@el-farol/shared");
const Agent_1 = require("./Agent");
const sandbox_1 = require("../sandbox");
const shared_2 = require("@el-farol/shared");
const uuid_1 = require("uuid");
//factory for creating agents from configuration
class AgentFactory {
    sandbox;
    random;
    baseSeed;
    constructor(sandbox, random, baseSeed) {
        this.sandbox = sandbox ?? new sandbox_1.AgentSandbox();
        this.random = random;
        this.baseSeed = baseSeed;
    }
    //create an agent from configuration
    createAgent(config, context, agentIndex) {
        const id = (0, uuid_1.v4)();
        const name = config.name;
        switch (config.type) {
            case shared_1.AgentType.BUILT_IN:
                return this.createBuiltInAgent(id, name, config, context, agentIndex);
            case shared_1.AgentType.CUSTOM:
                if (!config.customCode) {
                    throw new Error('Custom agent requires customCode');
                }
                return this.createCustomAgent(id, name, config.customCode, agentIndex);
            case shared_1.AgentType.HUMAN:
                return this.createHumanAgent(id, name, config);
            default:
                throw new Error(`Unknown agent type: ${config.type}`);
        }
    }
    createBuiltInAgent(id, name, config, _context, agentIndex) {
        const type = config.builtInType ?? shared_1.BuiltInAgentType.RANDOM;
        const params = config.parameters ?? {};
        const rng = this.baseSeed != null && agentIndex != null
            ? new shared_2.SeededRandom(`${this.baseSeed}-${agentIndex}`)
            : this.random;
        switch (type) {
            case shared_1.BuiltInAgentType.RANDOM:
                return new Agent_1.RandomAgent(id, name, rng);
            case shared_1.BuiltInAgentType.THRESHOLD:
                return new Agent_1.ThresholdAgent(id, name, params.threshold ?? 1.0, params.goProbability ?? 0.8, rng);
            case shared_1.BuiltInAgentType.MOVING_AVERAGE:
                return new Agent_1.MovingAverageAgent(id, name, params.windowSize ?? 5, params.threshold ?? 0.6, rng);
            case shared_1.BuiltInAgentType.ADAPTIVE:
                return new Agent_1.AdaptiveAgent(id, name, params.initialThreshold ?? 0.6, params.adaptationRate ?? 0.1, rng);
            case shared_1.BuiltInAgentType.CONTRARIAN:
                return new Agent_1.ContrarianAgent(id, name, params.lookback ?? 1, rng);
            case shared_1.BuiltInAgentType.TREND_FOLLOWER:
                return new Agent_1.TrendFollowerAgent(id, name, params.windowSize ?? 4, rng);
            case shared_1.BuiltInAgentType.LOYAL:
                return new Agent_1.LoyalAgent(id, name, params.onRounds ?? 2, params.offRounds ?? 1, rng);
            case shared_1.BuiltInAgentType.REGRET_MINIMIZING:
                return new Agent_1.RegretMinimizingAgent(id, name, params.learningRate ?? 1.0, rng);
            default:
                throw new Error(`Unknown built-in agent type: ${type}`);
        }
    }
    //create agent with user code
    createCustomAgent(id, name, code, agentIndex) {
        const validation = this.sandbox.validateCode(code);
        if (!validation.valid) {
            throw new Error(`Invalid agent code: ${validation.error}`);
        }
        const executor = (history, capacity) => {
            const execContext = {
                attendanceHistory: history,
                capacity,
                roundNumber: history.length + 1,
            };
            const codeExecutor = this.sandbox.createExecutor(execContext);
            return codeExecutor(code);
        };
        return new Agent_1.CustomAgent(id, name, code, executor, this.baseSeed != null && agentIndex != null
            ? new shared_2.SeededRandom(`${this.baseSeed}-${agentIndex}`)
            : this.random);
    }
    //create human agent
    createHumanAgent(id, name, config) {
        return new Agent_1.HumanAgent(id, name, config.userId, config.telegramUserId);
    }
    //create multiple agents of the same type
    createMultipleAgents(count, config, context, startIndex) {
        const agents = [];
        for (let i = 0; i < count; i++) {
            const agentConfig = {
                ...config,
                name: config.name ? `${config.name} ${i + 1}` : `Agent ${i + 1}`
            };
            agents.push(this.createAgent(agentConfig, context, (startIndex ?? 0) + i));
        }
        return agents;
    }
}
exports.AgentFactory = AgentFactory;
