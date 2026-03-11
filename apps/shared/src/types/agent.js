// what type of agen it is
export var AgentType;
(function (AgentType) {
    AgentType["BUILT_IN"] = "built_in";
    AgentType["CUSTOM"] = "custom";
    AgentType["HUMAN"] = "human";
})(AgentType || (AgentType = {}));
// built in agent parameters
export var BuiltInAgentType;
(function (BuiltInAgentType) {
    BuiltInAgentType["RANDOM"] = "random";
    BuiltInAgentType["THRESHOLD"] = "threshold";
    BuiltInAgentType["MOVING_AVERAGE"] = "moving_average";
    BuiltInAgentType["ADAPTIVE"] = "adaptive";
    BuiltInAgentType["CONTRARIAN"] = "contrarian";
    BuiltInAgentType["TREND_FOLLOWER"] = "trend_follower";
    BuiltInAgentType["LOYAL"] = "loyal";
    BuiltInAgentType["REGRET_MINIMIZING"] = "regret_minimizing";
})(BuiltInAgentType || (BuiltInAgentType = {}));
