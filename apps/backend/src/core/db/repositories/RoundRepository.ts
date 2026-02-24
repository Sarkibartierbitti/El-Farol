import { prisma } from '../prisma';
import type { Round, Decision, Prisma } from '@prisma/client';

export interface RoundWithDecisions extends Round {
  decisions: Decision[];
}

export class RoundRepository {
  async create(data: Prisma.RoundCreateInput): Promise<Round> {
    return prisma.round.create({ data });
  }

  async createWithDecisions(
    roundData: Omit<Prisma.RoundCreateInput, 'decisions'>,
    decisions: Omit<Prisma.DecisionCreateManyInput, 'roundId'>[]
  ): Promise<RoundWithDecisions> {
    return prisma.$transaction(async (tx: any) => {
      const round = await tx.round.create({ data: roundData });
      
      await tx.decision.createMany({
        data: decisions.map(d => ({ ...d, roundId: round.id })),
      });
      
      return tx.round.findUniqueOrThrow({
        where: { id: round.id },
        include: { decisions: true },
      });
    });
  }

  async findByGame(gameId: string): Promise<RoundWithDecisions[]> {
    return prisma.round.findMany({
      where: { gameId },
      include: { decisions: true },
      orderBy: { roundNumber: 'asc' },
    });
  }

  async getGameStats(gameId: string) {
    const rounds = await prisma.round.findMany({
      where: { gameId },
      select: {
        attendance: true,
        capacity: true,
        wasOvercrowded: true,
      },
    });

    const totalRounds = rounds.length;
    const avgAttendance = rounds.reduce(
      (sum: number, r: { attendance: number }) => sum + r.attendance, 0) / totalRounds;
    const overcrowdedCount = rounds.filter((r: { wasOvercrowded: boolean }) => r.wasOvercrowded).length;

    return {
      totalRounds,
      avgAttendance,
      overcrowdedPercentage: (overcrowdedCount / totalRounds) * 100,
    };
  }
}