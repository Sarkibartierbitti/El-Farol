import {
  CreateGameRequest,
  SimulationResult,
  GameStats,
  RoundResult
} from '@el-farol/shared';
import { Game } from './models/Game';
import { BaseAgent } from './models/Agent';
import { v4 as uuidv4 } from 'uuid';
import { calculateStats } from './stats';

export { Game } from './models/Game';
export { BaseAgent, RandomAgent, ThresholdAgent, MovingAverageAgent, AdaptiveAgent, HumanAgent, CustomAgent } from './models/Agent';
export { AgentFactory } from './models/AgentFactory';
export { AgentSandbox } from './sandbox';
export { calculateStats } from './stats';
export type { StatsInput } from './stats';
export type { ValidationResult } from './sandbox';

//engine to run simulations
export class SimulationEngine {
  private games: Map<string, Game> = new Map();

  createGame(request: CreateGameRequest): Game {
    const gameId = uuidv4();
    const game = new Game(
      gameId,
      request.name,
      request.config,
      request.description,
      request.createdBy
    );
    this.games.set(gameId, game);
    return game;
  }


  getGame(gameId: string): Game | undefined {
    return this.games.get(gameId);
  }

  addAgentToGame(gameId: string, agent: BaseAgent): void {
    const game = this.games.get(gameId);
    if (!game) {
      throw new Error(`Game with id ${gameId} not found`);
    }
    game.addAgent(agent);
  }

  removeAgentFromGame(gameId: string, agentId: string): void {
    const game = this.games.get(gameId);
    if (!game) {
      throw new Error(`Game with id ${gameId} not found`);
    }
    game.removeAgent(agentId);
  }

  startGame(gameId: string): void {
    const game = this.games.get(gameId);
    if (!game) {
      throw new Error(`Game with id ${gameId} not found`);
    }
    game.start();
  }

  pauseGame(gameId: string): void {
    const game = this.games.get(gameId);
    if (!game) {
      throw new Error(`Game with id ${gameId} not found`);
    }
    game.pause();
  }


  resumeGame(gameId: string): void {
    const game = this.games.get(gameId);
    if (!game) {
      throw new Error(`Game with id ${gameId} not found`);
    }
    game.resume();
  }

  runRound(gameId: string): RoundResult {
    const game = this.games.get(gameId);
    if (!game) {
      throw new Error(`Game with id ${gameId} not found`);
    }
    return game.executeRound();
  }

  runSimulation(gameId: string, numRounds?: number): SimulationResult {
    const game = this.games.get(gameId);
    if (!game) {
      throw new Error(`Game with id ${gameId} not found`);
    }

    const startTime = Date.now();
    const rounds: RoundResult[] = [];
    
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
    } catch (error) {
      if (error instanceof Error && error.message.includes('maximum number of rounds')) {
        // expected completion, continue without throwback
      } else {
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

  calculateGameStats(game: Game): GameStats {
    return calculateStats({
      gameId: game.getId(),
      attendanceHistory: game.getAttendanceHistory(),
      benefitHistory: game.getBenefitHistory(),
      capacity: game.getConfig().capacity,
      numAgents: game.getConfig().numAgents,
    });
  }


  deleteGame(gameId: string): void {
    this.games.delete(gameId);
  }


  listGames(): Game[] {
    return Array.from(this.games.values());
  }
}

