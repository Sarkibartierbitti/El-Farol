import { useState, useCallback } from 'react';
import * as gamesApi from '../api/games';
import type { GameStats, SimulationFormValues, AgentBatchEntry, ChartPoint } from '../types';

export type SimStatus = 'idle' | 'creating' | 'simulating' | 'done' | 'error';

interface SimulationState {
  status: SimStatus;
  error: string | null;
  gameId: string | null;
  stats: GameStats | null;
  capacity: number | null;
  chartData: ChartPoint[];
  duration: number | null;
}

const initial: SimulationState = {
  status: 'idle',
  error: null,
  gameId: null,
  stats: null,
  capacity: null,
  chartData: [],
  duration: null,
};

export function useSimulation() {
  const [state, setState] = useState<SimulationState>(initial);

  const run = useCallback(
    async (simForm: SimulationFormValues, agentBatch: AgentBatchEntry[]) => {
      setState({ ...initial, status: 'creating' });

      try {
        const game = await gamesApi.createGame(simForm);

        const agents = agentBatch.flatMap(({ type, count }) =>
          Array.from({ length: count }, (_, i) => ({
            name: `${type}-${i + 1}`,
            type: 'built_in' as const,
            builtInType: type,
          })),
        );

        if (agents.length > 0) {
          await gamesApi.addAgents(game.id, agents);
        }

        setState(s => ({ ...s, status: 'simulating', gameId: game.id }));

        const result = await gamesApi.runSimulation(game.id);

        const chartData: ChartPoint[] = result.roundsSummary.map(r => ({
          round: r.roundNumber,
          attendance: r.attendance,
          benefit: r.totalBenefit,
        }));

        setState({
          status: 'done',
          error: null,
          gameId: result.gameId,
          stats: result.finalStats,
          capacity: game.config.capacity,
          chartData,
          duration: result.duration,
        });
      } catch (err) {
        setState(s => ({
          ...s,
          status: 'error',
          error: err instanceof Error ? err.message : 'An unknown error occurred',
        }));
      }
    },
    [],
  );

  const reset = useCallback(() => setState(initial), []);

  return { ...state, run, reset };
}
