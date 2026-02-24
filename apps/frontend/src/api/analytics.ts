import { fetchJson } from './client';

export interface AnalyticsSummary {
  totalGames: number;
  completedGames: number;
  averageEfficiency: number;
  averageAttendance: number;
}

export function getAnalytics(): Promise<AnalyticsSummary> {
  return fetchJson<AnalyticsSummary>('/analytics');
}
