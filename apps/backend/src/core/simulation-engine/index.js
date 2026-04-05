import { Game } from './models/Game';
import { v4 as uuidv4 } from 'uuid';
import { calculateStats } from './stats';
export { Game } from './models/Game';
export { BaseAgent, RandomAgent, ThresholdAgent, MovingAverageAgent, AdaptiveAgent, HumanAgent, CustomAgent } from './models/Agent';
export { AgentFactory } from './models/AgentFactory';
export { AgentSandbox } from './sandbox';
export { calculateStats } from './stats';
//engine to run simulations
export class SimulationEngine {
    games = new Map();
    createGame(request) {
        const gameId = uuidv4();
        const game = new Game(gameId, request.name, request.config, request.description, request.createdBy);
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
        return calculateStats({
            gameId: game.getId(),
            attendanceHistory: game.getAttendanceHistory(),
            benefitHistory: game.getBenefitHistory(),
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
