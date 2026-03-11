"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GameRepository = void 0;
const prisma_1 = require("../prisma");
const client_1 = require("@prisma/client");
class GameRepository {
    async create(data) {
        return prisma_1.prisma.game.create({ data });
    }
    async findById(id) {
        return prisma_1.prisma.game.findUnique({
            where: { id },
            include: {
                agents: { include: { agent: true } },
                rounds: { orderBy: { roundNumber: 'asc' } },
            },
        });
    }
    async findByStatus(status) {
        return prisma_1.prisma.game.findMany({
            where: { status },
            orderBy: { createdAt: 'desc' },
        });
    }
    async updateStatus(id, status) {
        const updateData = { status };
        if (status === client_1.GameStatus.RUNNING) {
            updateData.startedAt = new Date();
        }
        else if (status === client_1.GameStatus.COMPLETED || status === client_1.GameStatus.CANCELLED) {
            updateData.completedAt = new Date();
        }
        return prisma_1.prisma.game.update({
            where: { id },
            data: updateData,
        });
    }
    async incrementRound(id) {
        return prisma_1.prisma.game.update({
            where: { id },
            data: { currentRound: { increment: 1 } },
        });
    }
}
exports.GameRepository = GameRepository;
