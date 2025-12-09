export interface AgentDecision {
  agentId: string;
  agentName: string;
  decision: boolean; // go/no go
  benefit: number; // individual benefit
}

import type { GameStatus, GameStats } from './game';


export interface RoundResult {
  roundId: string;
  gameId: string;
  roundNumber: number;
  attendance: number; 
  capacity: number;
  totalBenefit: number; 
  agentDecisions: AgentDecision[];
  timestamp: Date;
}


export interface RoundMetadata {
  id: string;
  gameId: string;
  roundNumber: number;
  attendanceCount: number;
  totalBenefit: number;
  createdAt: Date;
}

//provided data for go/noGo
export interface HistoricalData {
  attendanceHistory: number[]; // array with rounds' attendance
  benefitHistory: number[];
  currentRound: number; // 1-indexed
  capacity: number;
  numAgents: number;
}

//specific agent data
export interface AgentContext {
  attendanceHistory: number[];
  capacity: number;
  roundNumber: number;
  helpers?: {
    sum: (arr: number[]) => number;
    average: (arr: number[]) => number;
    min: (arr: number[]) => number;
    max: (arr: number[]) => number;
    last: <T>(arr: T[]) => T | undefined;
  };
}


export interface SimulationResult {
  gameId: string;
  status: GameStatus;
  totalRounds: number;
  rounds: RoundResult[];
  finalStats: GameStats;
  duration: number; // time in ms
}

