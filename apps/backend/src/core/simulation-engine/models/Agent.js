import { AgentType } from '@el-farol/shared';
import { SeededRandom } from '@el-farol/shared';
//abstract class for all agents
export class BaseAgent {
    id;
    name;
    type;
    random;
    constructor(id, name, type, random) {
        this.id = id;
        this.name = name;
        this.type = type;
        this.random = random ?? new SeededRandom();
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
}
// random agent who makes random decisions
export class RandomAgent extends BaseAgent {
    constructor(id, name = 'Random Agent', random) {
        super(id, name, AgentType.BUILT_IN, random);
    }
    predict(_history, _capacity) {
        return this.random.randBool();
    }
}
//agent that goes if average attendance is below threshold
export class ThresholdAgent extends BaseAgent {
    threshold;
    goProbability;
    constructor(id, name = 'Threshold Agent', threshold = 1.0, goProbability = 0.8, random) {
        super(id, name, AgentType.BUILT_IN, random);
        this.threshold = threshold;
        this.goProbability = goProbability;
    }
    predict(history, capacity) {
        if (history.length === 0) {
            return this.random.randBool();
        }
        const avg = history.reduce((sum, val) => sum + val, 0) / history.length;
        const normalizedAvg = avg / capacity;
        if (normalizedAvg < this.threshold) {
            // below threshold - higher go
            return this.random.random() < this.goProbability;
        }
        else {
            // above threshold - higher no go
            return this.random.random() < (1 - this.goProbability);
        }
    }
}
//average but for a limited window of past rounds
export class MovingAverageAgent extends BaseAgent {
    windowSize;
    threshold;
    constructor(id, name = 'Moving Average Agent', windowSize = 5, threshold = 0.8, random) {
        super(id, name, AgentType.BUILT_IN, random);
        this.windowSize = windowSize;
        this.threshold = threshold;
    }
    predict(history, capacity) {
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
    initialThreshold;
    adaptationRate;
    lastDecision = null;
    currentThreshold;
    constructor(id, name = 'Adaptive Agent', initialThreshold = 0.9, adaptationRate = 0.05, random) {
        super(id, name, AgentType.BUILT_IN, random);
        this.initialThreshold = initialThreshold;
        this.adaptationRate = adaptationRate;
        this.currentThreshold = initialThreshold;
    }
    predict(history, capacity) {
        if (history.length === 0) {
            return this.random.randBool();
        }
        const avg = history.reduce((sum, val) => sum + val, 0) / history.length;
        const normalizedAvg = avg / capacity;
        // Adapt threshold based on last decision's outcome
        if (this.lastDecision !== null && history.length > 1) {
            const lastAttendance = history[history.length - 1];
            const wasGoodDecision = this.lastDecision
                ? lastAttendance <= capacity
                : lastAttendance > capacity;
            if (wasGoodDecision) {
                // keep threshold if good decision
                this.currentThreshold = this.currentThreshold;
            }
            else {
                // adjust threshold if bad decision
                if (this.lastDecision) {
                    // increase if stuffed
                    this.currentThreshold = Math.min(1.0, this.currentThreshold + this.adaptationRate);
                }
                else {
                    // decrease if much space
                    this.currentThreshold = Math.max(0.0, this.currentThreshold - this.adaptationRate);
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
// goes when the bar was recently overcreowded
export class ContrarianAgent extends BaseAgent {
    lookback;
    constructor(id, name = 'Contrarian Agent', lookback = 1, random) {
        super(id, name, AgentType.BUILT_IN, random);
        this.lookback = Math.max(1, lookback);
    }
    predict(history, capacity) {
        if (history.length === 0) {
            return this.random.randBool();
        }
        const recent = history.slice(-this.lookback);
        const avg = recent.reduce((sum, val) => sum + val, 0) / recent.length;
        return avg >= capacity;
    }
}
// predicts a simple linear model and goes accordingly
export class TrendFollowerAgent extends BaseAgent {
    windowSize;
    constructor(id, name = 'Trend Follower Agent', windowSize = 4, random) {
        super(id, name, AgentType.BUILT_IN, random);
        this.windowSize = Math.max(2, windowSize);
    }
    predict(history, capacity) {
        if (history.length < 2) {
            return this.random.randBool();
        }
        const window = history.slice(-this.windowSize);
        let trendSum = 0;
        for (let i = 1; i < window.length; i++) {
            trendSum += window[i] - window[i - 1];
        }
        const avgTrend = trendSum / (window.length - 1);
        const predicted = window[window.length - 1] + avgTrend;
        return predicted < capacity;
    }
}
// goes with a fixed probability
export class LoyalAgent extends BaseAgent {
    goProbability;
    constructor(id, name = 'Loyal Agent', goProbability = 0.7, random) {
        super(id, name, AgentType.BUILT_IN, random);
        this.goProbability = Math.max(0, Math.min(1, goProbability));
    }
    predict(_history, _capacity) {
        return this.random.random() < this.goProbability;
    }
}
// regret minimizing agent
export class RegretMinimizingAgent extends BaseAgent {
    goRegret = 0;
    stayRegret = 0;
    lastDecision = null;
    learningRate;
    constructor(id, name = 'Regret Minimizer Agent', learningRate = 1.0, random) {
        super(id, name, AgentType.BUILT_IN, random);
        this.learningRate = learningRate;
    }
    predict(history, capacity) {
        // update regrets
        if (this.lastDecision !== null && history.length > 0) {
            const lastAttendance = history[history.length - 1];
            const wasCrowded = lastAttendance > capacity;
            if (this.lastDecision && wasCrowded) {
                this.goRegret += this.learningRate;
            }
            else if (!this.lastDecision && !wasCrowded) {
                this.stayRegret += this.learningRate;
            }
        }
        // no data -- random
        const totalRegret = this.goRegret + this.stayRegret;
        let goProbability;
        if (totalRegret === 0) {
            goProbability = 0.5;
        }
        else {
            goProbability = this.stayRegret / totalRegret;
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
//agent that is controlled by a human
export class HumanAgent extends BaseAgent {
    pendingDecision = null;
    constructor(id, name = 'Human Agent', _userId, _telegramUserId) {
        super(id, name, AgentType.HUMAN);
    }
    predict(_history, _capacity) {
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
//custom agent
export class CustomAgent extends BaseAgent {
    code;
    executor;
    constructor(id, name, code, executor, random) {
        super(id, name, AgentType.CUSTOM, random);
        this.code = code;
        this.executor = executor;
    }
    predict(history, capacity) {
        return this.executor(history, capacity);
    }
    getCode() {
        return this.code;
    }
}
