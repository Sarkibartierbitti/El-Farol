import { prisma } from '../prisma';
import { GameStatus } from '@prisma/client';
export class GameRepository {
    async create(data) {
        return prisma.game.create({ data });
    }
    async findById(id) {
        return prisma.game.findUnique({
            where: { id },
            include: {
                agents: { include: { agent: true } },
                rounds: { orderBy: { roundNumber: 'asc' } },
            },
        });
    }
    async findByStatus(status) {
        return prisma.game.findMany({
            where: { status },
            orderBy: { createdAt: 'desc' },
        });
    }
    async updateStatus(id, status) {
        const updateData = { status };
        if (status === GameStatus.RUNNING) {
            updateData.startedAt = new Date();
        }
        else if (status === GameStatus.COMPLETED || status === GameStatus.CANCELLED) {
            updateData.completedAt = new Date();
        }
        return prisma.game.update({
            where: { id },
            data: updateData,
        });
    }
    async incrementRound(id) {
        return prisma.game.update({
            where: { id },
            data: { currentRound: { increment: 1 } },
        });
    }
}
