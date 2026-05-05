import { useState, useCallback } from 'react';
import * as gamesApi from '../api/games';
import type { GameStats, SimulationFormValues, AgentBatchEntry, ChartPoint } from '../types';
import { CUSTOM_AGENT_TEMPLATE, getBuiltInPreset, isBuiltInAgentType } from '../agentCatalog';

export type SimStatus = 'idle' | 'creating' | 'simulating' | 'done' | 'error';

interface SimulationState {
  status: SimStatus;
  error: string | null;
  gameId: string | null;
  stats: GameStats | null;
  capacity: number | null;
  numAgents: number | null;
  chartData: ChartPoint[];
  duration: number | null;
}

const initial: SimulationState = {
  status: 'idle',
  error: null,
  gameId: null,
  stats: null,
  capacity: null,
  numAgents: null,
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

        const agents = agentBatch.flatMap((entry, rowIndex) =>
          Array.from({ length: entry.count }, (_, i) => {
            const sequence = `${rowIndex + 1}.${i + 1}`;

            if (isBuiltInAgentType(entry.type)) {
              const preset = getBuiltInPreset(entry.type);
              return {
                name: `${preset.label} ${sequence}`,
                type: 'built_in' as const,
                builtInType: entry.type,
                parameters: entry.parameters,
              };
            }

            return {
              name: entry.name?.trim() || `Custom Agent ${sequence}`,
              type: 'custom' as const,
              customCode: entry.customCode?.trim() || CUSTOM_AGENT_TEMPLATE,
            };
          }),
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
          activeAgentsStart: r.activeAgentsStart,
          activeAgentsEnd: r.activeAgentsEnd,
          arrivals: r.arrivals,
          departures: r.departures,
        }));

        setState({
          status: 'done',
          error: null,
          gameId: result.gameId,
          stats: result.finalStats,
          capacity: game.config.capacity,
          numAgents: game.config.numAgents,
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
