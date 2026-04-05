"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CustomAgent = exports.HumanAgent = exports.RegretMinimizingAgent = exports.LoyalAgent = exports.TrendFollowerAgent = exports.ContrarianAgent = exports.AdaptiveAgent = exports.MovingAverageAgent = exports.ThresholdAgent = exports.RandomAgent = exports.BaseAgent = void 0;
const shared_1 = require("@el-farol/shared");
const shared_2 = require("@el-farol/shared");
//abstract class for all agents
class BaseAgent {
    id;
    name;
    type;
    random;
    constructor(id, name, type, random) {
        this.id = id;
        this.name = name;
        this.type = type;
        this.random = random ?? new shared_2.SeededRandom();
    }
    getId() {
        return this.id;
    }
    getName() {
        return this.name;
    }
    getType() {
        return this.type;
    }
    getEffectiveCapacity(capacity, behavior) {
        return behavior?.effectiveCapacity ?? capacity;
    }
    getUtilityGoBias(behavior) {
        return behavior?.utilityGoBias ?? 0.5;
    }
    getCautionFactor(behavior) {
        return behavior?.cautionFactor ?? 1;
    }
    getRewardFactor(behavior) {
        return behavior?.rewardFactor ?? 1;
    }
    clampProbability(value) {
        return Math.min(0.95, Math.max(0.05, value));
    }
}
exports.BaseAgent = BaseAgent;
// random agent who makes random decisions
class RandomAgent extends BaseAgent {
    constructor(id, name = 'Random Agent', random) {
        super(id, name, shared_1.AgentType.BUILT_IN, random);
    }
    predict(_history, _capacity, behavior) {
        return this.random.random() < this.getUtilityGoBias(behavior);
    }
}
exports.RandomAgent = RandomAgent;
//agent that goes if average attendance is below threshold
class ThresholdAgent extends BaseAgent {
    threshold;
    goProbability;
    constructor(id, name = 'Threshold Agent', threshold = 1.0, goProbability = 0.8, random) {
        super(id, name, shared_1.AgentType.BUILT_IN, random);
        this.threshold = threshold;
        this.goProbability = goProbability;
    }
    predict(history, capacity, behavior) {
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
        }
        else {
            return this.random.random() < (1 - adjustedGoProbability);
        }
    }
}
exports.ThresholdAgent = ThresholdAgent;
//average but for a limited window of past rounds
class MovingAverageAgent extends BaseAgent {
    windowSize;
    threshold;
    constructor(id, name = 'Moving Average Agent', windowSize = 5, threshold = 0.8, random) {
        super(id, name, shared_1.AgentType.BUILT_IN, random);
        this.windowSize = windowSize;
        this.threshold = threshold;
    }
    predict(history, capacity, behavior) {
        if (history.length === 0) {
            return this.random.random() < this.getUtilityGoBias(behavior);
        }
        const window = history.slice(-this.windowSize);
        const avg = window.reduce((sum, val) => sum + val, 0) / window.length;
        const normalizedAvg = avg / this.getEffectiveCapacity(capacity, behavior);
        return normalizedAvg < this.threshold;
    }
}
exports.MovingAverageAgent = MovingAverageAgent;
//agent that adapts its threshold based on past performance
class AdaptiveAgent extends BaseAgent {
    initialThreshold;
    adaptationRate;
    lastDecision = null;
    currentThreshold;
    constructor(id, name = 'Adaptive Agent', initialThreshold = 0.9, adaptationRate = 0.05, random) {
        super(id, name, shared_1.AgentType.BUILT_IN, random);
        this.initialThreshold = initialThreshold;
        this.adaptationRate = adaptationRate;
        this.currentThreshold = initialThreshold;
    }
    predict(history, capacity, behavior) {
        if (history.length === 0) {
            return this.random.random() < this.getUtilityGoBias(behavior);
        }
        const effectiveCapacity = this.getEffectiveCapacity(capacity, behavior);
        const avg = history.reduce((sum, val) => sum + val, 0) / history.length;
        const normalizedAvg = avg / effectiveCapacity;
        // Adapt threshold based on last decision's outcome
        if (this.lastDecision !== null && history.length > 1) {
            const lastAttendance = history[history.length - 1];
            const wasGoodDecision = this.lastDecision
                ? lastAttendance <= effectiveCapacity
                : lastAttendance > effectiveCapacity;
            if (wasGoodDecision) {
                // keep threshold if good decision
                this.currentThreshold = this.currentThreshold;
            }
            else {
                // adjust threshold if bad decision
                if (this.lastDecision) {
                    const penaltyStep = this.adaptationRate * this.getCautionFactor(behavior);
                    this.currentThreshold = Math.min(1.0, this.currentThreshold + penaltyStep);
                }
                else {
                    const rewardStep = this.adaptationRate * this.getRewardFactor(behavior);
                    this.currentThreshold = Math.max(0.0, this.currentThreshold - rewardStep);
                }
            }
        }
        const decision = normalizedAvg < this.currentThreshold;
        this.lastDecision = decision;
        return decision;
    }
    reset() {
        this.currentThreshold = this.initialThreshold;
        this.lastDecision = null;
    }
}
exports.AdaptiveAgent = AdaptiveAgent;
// goes when the bar was recently overcreowded
class ContrarianAgent extends BaseAgent {
    lookback;
    constructor(id, name = 'Contrarian Agent', lookback = 1, random) {
        super(id, name, shared_1.AgentType.BUILT_IN, random);
        this.lookback = Math.max(1, lookback);
    }
    predict(history, capacity, behavior) {
        if (history.length === 0) {
            return this.random.random() < this.getUtilityGoBias(behavior);
        }
        const recent = history.slice(-this.lookback);
        const avg = recent.reduce((sum, val) => sum + val, 0) / recent.length;
        return avg >= this.getEffectiveCapacity(capacity, behavior);
    }
}
exports.ContrarianAgent = ContrarianAgent;
// predicts a simple linear model and goes accordingly
class TrendFollowerAgent extends BaseAgent {
    windowSize;
    constructor(id, name = 'Trend Follower Agent', windowSize = 4, random) {
        super(id, name, shared_1.AgentType.BUILT_IN, random);
        this.windowSize = Math.max(2, windowSize);
    }
    predict(history, capacity, behavior) {
        if (history.length < 2) {
            return this.random.random() < this.getUtilityGoBias(behavior);
        }
        const window = history.slice(-this.windowSize);
        let trendSum = 0;
        for (let i = 1; i < window.length; i++) {
            trendSum += window[i] - window[i - 1];
        }
        const avgTrend = trendSum / (window.length - 1);
        const predicted = window[window.length - 1] + avgTrend;
        return predicted < this.getEffectiveCapacity(capacity, behavior);
    }
}
exports.TrendFollowerAgent = TrendFollowerAgent;
// goes with a cycle
class LoyalAgent extends BaseAgent {
    onRounds;
    offRounds;
    roundCounter = 0;
    constructor(id, name = 'Cycle Agent', onRounds = 2, offRounds = 1, random) {
        super(id, name, shared_1.AgentType.BUILT_IN, random);
        this.onRounds = Math.max(1, onRounds);
        this.offRounds = Math.max(1, offRounds);
    }
    predict(_history, _capacity, behavior) {
        const utilityGoBias = this.getUtilityGoBias(behavior);
        const effectiveOnRounds = Math.max(1, Math.round(this.onRounds * (0.75 + utilityGoBias)));
        const effectiveOffRounds = Math.max(1, Math.round(this.offRounds * (1.75 - utilityGoBias)));
        const cycleLength = effectiveOnRounds + effectiveOffRounds;
        const positionInCycle = this.roundCounter % cycleLength;
        this.roundCounter++;
        return positionInCycle < effectiveOnRounds;
    }
    reset() {
        this.roundCounter = 0;
    }
}
exports.LoyalAgent = LoyalAgent;
// regret minimizing agent
class RegretMinimizingAgent extends BaseAgent {
    goRegret = 0;
    stayRegret = 0;
    lastDecision = null;
    learningRate;
    constructor(id, name = 'Regret Minimizer Agent', learningRate = 1.0, random) {
        super(id, name, shared_1.AgentType.BUILT_IN, random);
        this.learningRate = learningRate;
    }
    predict(history, capacity, behavior) {
        const effectiveCapacity = this.getEffectiveCapacity(capacity, behavior);
        const cautionWeight = this.learningRate * this.getCautionFactor(behavior);
        const rewardWeight = this.learningRate * this.getRewardFactor(behavior);
        // update regrets
        if (this.lastDecision !== null && history.length > 0) {
            const lastAttendance = history[history.length - 1];
            const wasCrowded = lastAttendance > effectiveCapacity;
            if (this.lastDecision && wasCrowded) {
                this.goRegret += cautionWeight;
            }
            else if (!this.lastDecision && !wasCrowded) {
                this.stayRegret += rewardWeight;
            }
        }
        const totalRegret = this.goRegret + this.stayRegret;
        let goProbability;
        if (totalRegret === 0) {
            goProbability = this.getUtilityGoBias(behavior);
        }
        else {
            const priorWeight = this.learningRate;
            goProbability = (this.stayRegret + (this.getUtilityGoBias(behavior) * priorWeight)) / (totalRegret + priorWeight);
        }
        const decision = this.random.random() < goProbability;
        this.lastDecision = decision;
        return decision;
    }
    reset() {
        this.goRegret = 0;
        this.stayRegret = 0;
        this.lastDecision = null;
    }
}
exports.RegretMinimizingAgent = RegretMinimizingAgent;
//agent that is controlled by a human
class HumanAgent extends BaseAgent {
    pendingDecision = null;
    constructor(id, name = 'Human Agent', _userId, _telegramUserId) {
        super(id, name, shared_1.AgentType.HUMAN);
    }
    predict(_history, _capacity, _behavior) {
        if (this.pendingDecision === null) {
            throw new Error('Human agent decision not set');
        }
        const decision = this.pendingDecision;
        this.pendingDecision = null; // Reset after use
        return decision;
    }
    setDecision(decision) {
        this.pendingDecision = decision;
    }
    hasDecision() {
        return this.pendingDecision !== null;
    }
}
exports.HumanAgent = HumanAgent;
//custom agent
class CustomAgent extends BaseAgent {
    code;
    executor;
    constructor(id, name, code, executor, random) {
        super(id, name, shared_1.AgentType.CUSTOM, random);
        this.code = code;
        this.executor = executor;
    }
    predict(history, capacity, _behavior) {
        return this.executor(history, capacity);
    }
    getCode() {
        return this.code;
    }
}
exports.CustomAgent = CustomAgent;
