"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SimulationEngine = exports.calculateStats = exports.AgentSandbox = exports.AgentFactory = exports.CustomAgent = exports.HumanAgent = exports.AdaptiveAgent = exports.MovingAverageAgent = exports.ThresholdAgent = exports.RandomAgent = exports.BaseAgent = exports.Game = void 0;
const Game_1 = require("./models/Game");
const uuid_1 = require("uuid");
const stats_1 = require("./stats");
var Game_2 = require("./models/Game");
Object.defineProperty(exports, "Game", { enumerable: true, get: function () { return Game_2.Game; } });
var Agent_1 = require("./models/Agent");
Object.defineProperty(exports, "BaseAgent", { enumerable: true, get: function () { return Agent_1.BaseAgent; } });
Object.defineProperty(exports, "RandomAgent", { enumerable: true, get: function () { return Agent_1.RandomAgent; } });
Object.defineProperty(exports, "ThresholdAgent", { enumerable: true, get: function () { return Agent_1.ThresholdAgent; } });
Object.defineProperty(exports, "MovingAverageAgent", { enumerable: true, get: function () { return Agent_1.MovingAverageAgent; } });
Object.defineProperty(exports, "AdaptiveAgent", { enumerable: true, get: function () { return Agent_1.AdaptiveAgent; } });
Object.defineProperty(exports, "HumanAgent", { enumerable: true, get: function () { return Agent_1.HumanAgent; } });
Object.defineProperty(exports, "CustomAgent", { enumerable: true, get: function () { return Agent_1.CustomAgent; } });
var AgentFactory_1 = require("./models/AgentFactory");
Object.defineProperty(exports, "AgentFactory", { enumerable: true, get: function () { return AgentFactory_1.AgentFactory; } });
var sandbox_1 = require("./sandbox");
Object.defineProperty(exports, "AgentSandbox", { enumerable: true, get: function () { return sandbox_1.AgentSandbox; } });
var stats_2 = require("./stats");
Object.defineProperty(exports, "calculateStats", { enumerable: true, get: function () { return stats_2.calculateStats; } });
//engine to run simulations
class SimulationEngine {
    games = new Map();
    createGame(request) {
        const gameId = (0, uuid_1.v4)();
        const game = new Game_1.Game(gameId, request.name, request.config, request.description, request.createdBy);
        this.games.set(gameId, game);
        return game;
    }
    getGame(gameId) {
        return this.games.get(gameId);
    }
    addAgentToGame(gameId, agent) {
        const game = this.games.get(gameId);
        if (!game) {
            throw new Error(`Game with id ${gameId} not found`);
        }
        game.addAgent(agent);
    }
    removeAgentFromGame(gameId, agentId) {
        const game = this.games.get(gameId);
        if (!game) {
            throw new Error(`Game with id ${gameId} not found`);
        }
        game.removeAgent(agentId);
    }
    startGame(gameId) {
        const game = this.games.get(gameId);
        if (!game) {
            throw new Error(`Game with id ${gameId} not found`);
        }
        game.start();
    }
    pauseGame(gameId) {
        const game = this.games.get(gameId);
        if (!game) {
            throw new Error(`Game with id ${gameId} not found`);
        }
        game.pause();
    }
    resumeGame(gameId) {
        const game = this.games.get(gameId);
        if (!game) {
            throw new Error(`Game with id ${gameId} not found`);
        }
        game.resume();
    }
    runRound(gameId) {
        const game = this.games.get(gameId);
        if (!game) {
            throw new Error(`Game with id ${gameId} not found`);
        }
        return game.executeRound();
    }
    runSimulation(gameId, numRounds) {
        const game = this.games.get(gameId);
        if (!game) {
            throw new Error(`Game with id ${gameId} not found`);
        }
        const startTime = Date.now();
        const rounds = [];
        // start if still draft
        if (game.getStatus() === 'draft') {
            game.start();
        }
        // number of rounds to run
        const roundsToRun = numRounds ?? game.getConfig().numRounds ?? 100;
        const initialRound = game.getCurrentRound();
        try {
            for (let i = 0; i < roundsToRun; i++) {
                if (game.getStatus() !== 'running') {
                    break;
                }
                const roundResult = game.executeRound();
                rounds.push(roundResult);
                if (game.getStatus() === 'completed') {
                    break;
                }
            }
        }
        catch (error) {
            if (error instanceof Error && error.message.includes('maximum number of rounds')) {
                // expected completion, continue without throwback
            }
            else {
                throw error;
            }
        }
        const duration = Date.now() - startTime;
        const finalStats = this.calculateGameStats(game);
        return {
            gameId,
            status: game.getStatus(),
            totalRounds: game.getCurrentRound() - initialRound,
            rounds,
            finalStats,
            duration
        };
    }
    calculateGameStats(game) {
        return (0, stats_1.calculateStats)({
            gameId: game.getId(),
            attendanceHistory: game.getAttendanceHistory(),
            benefitHistory: game.getBenefitHistory(),
            activePopulationHistory: game.getActivePopulationHistory(),
            arrivalsHistory: game.getArrivalsHistory(),
            departuresHistory: game.getDeparturesHistory(),
            capacity: game.getConfig().capacity,
            numAgents: game.getConfig().numAgents,
            benefitRules: game.getConfig().benefitRules,
        });
    }
    deleteGame(gameId) {
        this.games.delete(gameId);
    }
    listGames() {
        return Array.from(this.games.values());
    }
}
exports.SimulationEngine = SimulationEngine;
