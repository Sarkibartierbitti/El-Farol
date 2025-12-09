"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BuiltInAgentType = exports.AgentType = void 0;
var AgentType;
(function (AgentType) {
    AgentType["BUILT_IN"] = "built_in";
    AgentType["CUSTOM"] = "custom";
    AgentType["HUMAN"] = "human";
})(AgentType || (exports.AgentType = AgentType = {}));
var BuiltInAgentType;
(function (BuiltInAgentType) {
    BuiltInAgentType["RANDOM"] = "random";
    BuiltInAgentType["THRESHOLD"] = "threshold";
    BuiltInAgentType["MOVING_AVERAGE"] = "moving_average";
    BuiltInAgentType["ADAPTIVE"] = "adaptive";
})(BuiltInAgentType || (exports.BuiltInAgentType = BuiltInAgentType = {}));
//# sourceMappingURL=agent.js.map