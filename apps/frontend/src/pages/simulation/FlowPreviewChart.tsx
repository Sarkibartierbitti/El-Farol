import { useMemo } from 'react';
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
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
  arrivalLow: number;
  arrivalHigh: number;
  departureMean: number;
  departureLow: number;
  departureHigh: number;
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
      arrivalLow: Math.max(0, a.mean - a.stdDev),
      arrivalHigh: a.mean + a.stdDev,
      departureMean: d.mean,
      departureLow: Math.max(0, d.mean - d.stdDev),
      departureHigh: d.mean + d.stdDev,
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

  const ARRIVAL_COLOR = '#f4bb73';
  const DEPARTURE_COLOR = '#9871f7';

  return (
    <div className="border border-black-100 bg-white p-3">
      <p className="mb-2 text-xs font-bold uppercase text-black-500">Ожидаемые потоки по раундам</p>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
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
            formatter={(value: number | string) => (typeof value === 'number' ? value.toFixed(2) : value)}
            labelFormatter={(label) => `Раунд ${label}`}
          />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Line
            type="monotone"
            dataKey="arrivalLow"
            stroke={ARRIVAL_COLOR}
            dot={false}
            strokeWidth={1}
            name="Приход −σ"
            isAnimationActive={false}
          />
          <Line
            type="monotone"
            dataKey="arrivalMean"
            stroke={ARRIVAL_COLOR}
            dot={false}
            strokeWidth={2.25}
            name="Приход (среднее)"
            isAnimationActive={false}
          />
          <Line
            type="monotone"
            dataKey="arrivalHigh"
            stroke={ARRIVAL_COLOR}
            dot={false}
            strokeWidth={1}
            name="Приход +σ"
            isAnimationActive={false}
          />
          <Line
            type="monotone"
            dataKey="departureLow"
            stroke={DEPARTURE_COLOR}
            dot={false}
            strokeWidth={1}
            name="Уход −σ"
            isAnimationActive={false}
          />
          <Line
            type="monotone"
            dataKey="departureMean"
            stroke={DEPARTURE_COLOR}
            dot={false}
            strokeWidth={2.25}
            name="Уход (среднее)"
            isAnimationActive={false}
          />
          <Line
            type="monotone"
            dataKey="departureHigh"
            stroke={DEPARTURE_COLOR}
            dot={false}
            strokeWidth={1}
            name="Уход +σ"
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
