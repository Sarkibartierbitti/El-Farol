import { useMemo } from 'react';
import {
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Area,
} from 'recharts';
import type {
  PopulationArrivalConfig,
  PopulationDepartureConfig,
  PopulationFlowSchedule,
} from '../../types';

interface FlowPreviewChartProps {
  arrivals: PopulationArrivalConfig;
  departures: PopulationDepartureConfig;
  numRounds: number;
  activeAgents: number;
}

// linear ramp scale: (fade + 1 - distance) / (fade + 1) for distance in 1..fade.
// outside schedule window → 0. inside active window → 1.
function computeScheduleScale(round: number, schedule?: PopulationFlowSchedule): number {
  if (!schedule) {
    return 1;
  }
  const start = Math.max(1, Math.floor(schedule.startRound ?? 1));
  const end = schedule.endRound != null ? Math.floor(schedule.endRound) : null;
  const fadeIn = Math.max(0, Math.floor(schedule.fadeInRounds ?? 0));
  const fadeOut = Math.max(0, Math.floor(schedule.fadeOutRounds ?? 0));

  if (round < start) {
    const distance = start - round;
    if (distance > fadeIn) {
      return 0;
    }
    return (fadeIn + 1 - distance) / (fadeIn + 1);
  }

  if (end != null && round > end) {
    const distance = round - end;
    if (distance > fadeOut) {
      return 0;
    }
    return (fadeOut + 1 - distance) / (fadeOut + 1);
  }

  return 1;
}

interface FlowMoments {
  mean: number;
  stdDev: number;
}

function flowMoments(
  config: PopulationArrivalConfig | PopulationDepartureConfig,
  scale: number,
  activeAgents: number,
): FlowMoments {
  if (scale <= 0) {
    return { mean: 0, stdDev: 0 };
  }

  switch (config.distribution) {
    case 'poisson': {
      const lambda = Math.max(0, (config.mean ?? 0) * scale);
      return { mean: lambda, stdDev: Math.sqrt(lambda) };
    }
    case 'uniform': {
      const min = Math.max(0, config.min ?? 0);
      const max = Math.max(min, config.max ?? 0);
      const mean = ((min + max) / 2) * scale;
      // discrete uniform variance ≈ ((max-min+1)^2 - 1) / 12; for chart use continuous approx (max-min)/√12.
      const width = max - min;
      const stdDev = (width / Math.sqrt(12)) * scale;
      return { mean, stdDev };
    }
    case 'exponential': {
      const mean = Math.max(0, (config.mean ?? 0) * scale);
      return { mean, stdDev: mean };
    }
    case 'gamma': {
      const baseMean = Math.max(0, config.mean ?? 0);
      const shape = Math.max(0.1, config.shape ?? 2);
      const mean = baseMean * scale;
      const stdDev = mean / Math.sqrt(shape);
      return { mean, stdDev };
    }
    case 'binomial': {
      const p = Math.max(0, Math.min(1, (config.probability ?? 0) * scale));
      const n = Math.max(0, activeAgents);
      const mean = n * p;
      const stdDev = Math.sqrt(n * p * (1 - p));
      return { mean, stdDev };
    }
    default:
      return { mean: 0, stdDev: 0 };
  }
}

interface PreviewPoint {
  round: number;
  arrivalMean: number;
  arrivalBand: [number, number];
  departureMean: number;
  departureBand: [number, number];
}

function buildSeries(
  arrivals: PopulationArrivalConfig,
  departures: PopulationDepartureConfig,
  numRounds: number,
  activeAgents: number,
): PreviewPoint[] {
  const points: PreviewPoint[] = [];
  for (let round = 1; round <= numRounds; round += 1) {
    const arrScale = computeScheduleScale(round, arrivals.schedule);
    const depScale = computeScheduleScale(round, departures.schedule);
    const a = flowMoments(arrivals, arrScale, activeAgents);
    const d = flowMoments(departures, depScale, activeAgents);
    points.push({
      round,
      arrivalMean: a.mean,
      arrivalBand: [Math.max(0, a.mean - a.stdDev), a.mean + a.stdDev],
      departureMean: d.mean,
      departureBand: [Math.max(0, d.mean - d.stdDev), d.mean + d.stdDev],
    });
  }
  return points;
}

export function FlowPreviewChart({
  arrivals,
  departures,
  numRounds,
  activeAgents,
}: FlowPreviewChartProps) {
  const data = useMemo(
    () => buildSeries(arrivals, departures, Math.max(1, numRounds), activeAgents),
    [arrivals, departures, numRounds, activeAgents],
  );

  return (
    <div className="border border-black-100 bg-white p-3">
      <p className="mb-2 text-xs font-bold uppercase text-black-500">Ожидаемые потоки по раундам</p>
      <ResponsiveContainer width="100%" height={300}>
        <ComposedChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
          <CartesianGrid />
          <XAxis
            dataKey="round"
            tick={{ fontSize: 11 }}
            label={{ value: 'Раунд', position: 'insideBottom', offset: -4 }}
          />
          <YAxis
            tick={{ fontSize: 11 }}
            label={{ value: 'Агенты', angle: -90, position: 'insideLeft' }}
            allowDecimals={false}
          />
          <Tooltip
            formatter={(value: number) => value.toFixed(2)}
            labelFormatter={(label) => `Раунд ${label}`}
          />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Area
            type="monotone"
            dataKey="arrivalBand"
            stroke="none"
            fill="#9871f7"
            fillOpacity={0.15}
            name="Приход ±σ"
            isAnimationActive={false}
          />
          <Area
            type="monotone"
            dataKey="departureBand"
            stroke="none"
            fill="#888888"
            fillOpacity={0.15}
            name="Уход ±σ"
            isAnimationActive={false}
          />
          <Line
            type="monotone"
            dataKey="arrivalMean"
            stroke="#9871f7"
            dot={false}
            strokeWidth={1.5}
            name="Приход (среднее)"
            isAnimationActive={false}
          />
          <Line
            type="monotone"
            dataKey="departureMean"
            stroke="#444444"
            dot={false}
            strokeWidth={1.5}
            name="Уход (среднее)"
            isAnimationActive={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
