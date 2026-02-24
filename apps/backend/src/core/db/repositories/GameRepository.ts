import { prisma } from '../prisma';
import { GameStatus } from '@prisma/client';
import type { Game, Prisma } from '@prisma/client';

export class GameRepository {
  async create(data: Prisma.GameCreateInput): Promise<Game> {
    return prisma.game.create({ data });
  }

  async findById(id: string): Promise<Game | null> {
    return prisma.game.findUnique({
      where: { id },
      include: {
        agents: { include: { agent: true } },
        rounds: { orderBy: { roundNumber: 'asc' } },
      },
    });
  }

  async findByStatus(status: GameStatus): Promise<Game[]> {
    return prisma.game.findMany({
      where: { status },
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateStatus(id: string, status: GameStatus): Promise<Game> {
    const updateData: Prisma.GameUpdateInput = { status };
    
    if (status === GameStatus.RUNNING) {
      updateData.startedAt = new Date();
    } else if (status === GameStatus.COMPLETED || status === GameStatus.CANCELLED) {
      updateData.completedAt = new Date();
    }
    
    return prisma.game.update({
      where: { id },
      data: updateData,
    });
  }

  async incrementRound(id: string): Promise<Game> {
    return prisma.game.update({
      where: { id },
      data: { currentRound: { increment: 1 } },
    });
  }
}