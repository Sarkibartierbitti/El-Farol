import { fetchJson } from './client';
import type {
  GameResponse,
  SimulationResult,
  AgentConfig,
  SimulationFormValues,
  GameStats,
} from '../types';

export function createGame(values: SimulationFormValues): Promise<GameResponse> {
  const capacity = Math.round((values.capacityPercent / 100) * values.numAgents);
  return fetchJson<GameResponse>('/games', {
    method: 'POST',
    body: JSON.stringify({
      name: values.name,
      config: {
        capacity,
        numAgents: values.numAgents,
        numRounds: values.numRounds,
        benefitRules: {
          positiveMultiplier: values.positiveMultiplier,
          negativeMultiplier: values.negativeMultiplier,
        },
      },
    }),
  });
}

export function addAgents(
  gameId: string,
  agents: AgentConfig[],
): Promise<{ gameId: string; agentsAdded: number }> {
  return fetchJson(`/games/${gameId}/agents/batch`, {
    method: 'POST',
    body: JSON.stringify({ agents }),
  });
}

export function runSimulation(
  gameId: string,
  rounds?: number,
): Promise<SimulationResult> {
  return fetchJson<SimulationResult>(`/games/${gameId}/simulate`, {
    method: 'POST',
    body: JSON.stringify({ rounds }),
  });
}

export function getGame(gameId: string): Promise<GameResponse> {
  return fetchJson<GameResponse>(`/games/${gameId}`);
}

export function getGameStats(gameId: string): Promise<GameStats> {
  return fetchJson<GameStats>(`/games/${gameId}/stats`);
}

export function listGames(): Promise<GameResponse[]> {
  return fetchJson<GameResponse[]>('/games');
}
