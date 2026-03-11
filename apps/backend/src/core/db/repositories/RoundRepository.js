import { prisma } from '../prisma';
export class RoundRepository {
    async create(data) {
        return prisma.round.create({ data });
    }
    async createWithDecisions(roundData, decisions) {
        return prisma.$transaction(async (tx) => {
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
    async findByGame(gameId) {
        return prisma.round.findMany({
            where: { gameId },
            include: { decisions: true },
            orderBy: { roundNumber: 'asc' },
        });
    }
    async getGameStats(gameId) {
        const rounds = await prisma.round.findMany({
            where: { gameId },
            select: {
                attendance: true,
                capacity: true,
                wasOvercrowded: true,
            },
        });
        const totalRounds = rounds.length;
        const avgAttendance = rounds.reduce((sum, r) => sum + r.attendance, 0) / totalRounds;
        const overcrowdedCount = rounds.filter((r) => r.wasOvercrowded).length;
        return {
            totalRounds,
            avgAttendance,
            overcrowdedPercentage: (overcrowdedCount / totalRounds) * 100,
        };
    }
}
