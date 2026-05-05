"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.gamesRouter = void 0;
const hono_1 = require("hono");
const http_exception_1 = require("hono/http-exception");
const prisma_1 = require("../core/db/prisma");
const client_1 = require("@prisma/client");
const simulation_engine_1 = require("../core/simulation-engine");
const shared_1 = require("@el-farol/shared");
const gamesRouter = new hono_1.Hono();
exports.gamesRouter = gamesRouter;
const simulationEngine = new simulation_engine_1.SimulationEngine();
// in-memory to response
function gameToResponse(game) {
    return {
        id: game.getId(),
        name: game.getName(),
        description: game.getDescription(),
        status: game.getStatus(),
        config: game.getConfig(),
        currentRound: game.getCurrentRound(),
        agentCount: game.getAgents().length,
        totalBenefit: game.getTotalBenefit(),
        createdAt: game.getCreatedAt(),
        updatedAt: game.getUpdatedAt(),
    };
}
// prisma to response
function dbGameToResponse(dbGame) {
    return {
        id: dbGame.id,
        name: dbGame.name,
        description: dbGame.description ?? undefined,
        status: dbGame.status.toLowerCase(),
        config: {
            capacity: Math.round(((dbGame.capacityPercent ?? 60) / 100) * dbGame.totalAgents),
            numAgents: dbGame.totalAgents,
            numRounds: dbGame.totalRounds,
            benefitRules: dbGame.benefitRules,
            populationDynamics: dbGame.populationDynamics,
        },
        currentRound: dbGame.currentRound,
        agentCount: dbGame._count.agents,
        totalBenefit: 0,
        createdAt: dbGame.createdAt,
        updatedAt: dbGame.updatedAt,
    };
}
// unified converter
function toGameResponse(source) {
    if (source instanceof simulation_engine_1.Game) {
        return gameToResponse(source);
    }
    return dbGameToResponse(source);
}
//convert shared GameStatus to Prisma GameStatus
function toPrismaStatus(status) {
    const map = {
        [shared_1.GameStatus.DRAFT]: client_1.GameStatus.DRAFT,
        [shared_1.GameStatus.RUNNING]: client_1.GameStatus.RUNNING,
        [shared_1.GameStatus.PAUSED]: client_1.GameStatus.PAUSED,
        [shared_1.GameStatus.COMPLETED]: client_1.GameStatus.COMPLETED,
        [shared_1.GameStatus.CANCELLED]: client_1.GameStatus.CANCELLED,
    };
    return map[status];
}
gamesRouter.post('/', async (c) => {
    try {
        const body = await c.req.json();
        if (!body.name || !body.config) {
            throw new http_exception_1.HTTPException(400, { message: 'Name and config are required' });
        }
        const { name, description, config, createdBy } = body;
        const { capacity, numAgents, numRounds, benefitRules, populationDynamics } = config;
        if (!capacity || capacity <= 0) {
            throw new http_exception_1.HTTPException(400, { message: 'capacity must be a positive number' });
        }
        if (!numAgents || numAgents <= 0) {
            throw new http_exception_1.HTTPException(400, { message: 'numAgents must be a positive number' });
        }
        const game = simulationEngine.createGame({
            name,
            description,
            config: {
                capacity,
                numAgents,
                numRounds: numRounds ?? 100,
                benefitRules,
            },
            createdBy,
        });
        // send in to prisma db
        const capacityPercent = (capacity / numAgents) * 100;
        await prisma_1.prisma.game.create({
            data: {
                id: game.getId(),
                name,
                description,
                totalRounds: numRounds ?? 100,
                capacityPercent,
                totalAgents: numAgents,
                benefitRules: (benefitRules ?? { positiveMultiplier: 1, negativeMultiplier: 1 }),
                populationDynamics: populationDynamics,
                status: client_1.GameStatus.DRAFT,
            },
        });
        return c.json(toGameResponse(game), 201);
    }
    catch (error) {
        if (error instanceof http_exception_1.HTTPException)
            throw error;
        console.error('Error creating game:', error);
        throw new http_exception_1.HTTPException(500, { message: 'Failed to create game' });
    }
});
// get games 
gamesRouter.get('/', async (c) => {
    try {
        const statusParam = c.req.query('status');
        let games = simulationEngine.listGames();
        if (statusParam) {
            const filterStatus = statusParam.toLowerCase();
            games = games.filter(g => g.getStatus() === filterStatus);
        }
        // persistent games from db
        const dbGames = await prisma_1.prisma.game.findMany({
            where: statusParam ? { status: statusParam.toUpperCase() } : {},
            orderBy: { createdAt: 'desc' },
            include: {
                _count: { select: { agents: true, rounds: true } },
            },
        });
        // merge in-memory and db games
        const inMemoryIds = new Set(games.map(g => g.getId()));
        const result = games.map(toGameResponse);
        for (const dbGame of dbGames) {
            if (!inMemoryIds.has(dbGame.id)) {
                result.push(toGameResponse(dbGame));
            }
        }
        return c.json(result);
    }
    catch (error) {
        console.error('Error listing games:', error);
        throw new http_exception_1.HTTPException(500, { message: 'Failed to list games' });
    }
});
// get game by id
gamesRouter.get('/:id', async (c) => {
    try {
        const id = c.req.param('id');
        const game = simulationEngine.getGame(id);
        if (game) {
            const state = game.getState();
            return c.json({
                id: game.getId(),
                name: game.getName(),
                description: game.getDescription(),
                status: game.getStatus(),
                config: game.getConfig(),
                currentRound: game.getCurrentRound(),
                totalBenefit: game.getTotalBenefit(),
                agents: game.getAgents().map(agent => ({
                    id: agent.getId(),
                    name: agent.getName(),
                    type: agent.getType(),
                })),
                state,
                attendanceHistory: game.getAttendanceHistory(),
                benefitHistory: game.getBenefitHistory(),
                createdAt: game.getCreatedAt(),
                updatedAt: game.getUpdatedAt(),
                createdBy: game.getCreatedBy(),
            });
        }
        const dbGame = await prisma_1.prisma.game.findUnique({
            where: { id },
            include: {
                agents: { include: { agent: true } },
                rounds: { orderBy: { roundNumber: 'desc' }, take: 10 },
            },
        });
        if (!dbGame) {
            throw new http_exception_1.HTTPException(404, { message: 'Game not found' });
        }
        return c.json({
            id: dbGame.id,
            name: dbGame.name,
            description: dbGame.description,
            status: dbGame.status.toLowerCase(),
            config: {
                capacity: Math.round(((dbGame.capacityPercent ?? 60) / 100) * dbGame.totalAgents),
                numAgents: dbGame.totalAgents,
                numRounds: dbGame.totalRounds,
                benefitRules: dbGame.benefitRules,
                populationDynamics: dbGame.populationDynamics,
            },
            currentRound: dbGame.currentRound,
            agents: dbGame.agents.map(ga => ({
                id: ga.agent.id,
                name: ga.agent.name,
                type: ga.agent.type,
                builtInType: ga.agent.builtInType,
                totalScore: ga.totalScore,
            })),
            recentRounds: dbGame.rounds,
            createdAt: dbGame.createdAt,
            updatedAt: dbGame.updatedAt,
        });
    }
    catch (error) {
        if (error instanceof http_exception_1.HTTPException)
            throw error;
        console.error('Error getting game:', error);
        throw new http_exception_1.HTTPException(500, { message: 'Failed to get game' });
    }
});
//update game status
gamesRouter.patch('/:id/status', async (c) => {
    try {
        const id = c.req.param('id');
        const body = await c.req.json();
        if (!body.status) {
            throw new http_exception_1.HTTPException(400, { message: 'status is required' });
        }
        const game = simulationEngine.getGame(id);
        if (!game) {
            throw new http_exception_1.HTTPException(404, { message: 'Game not found in simulation engine' });
        }
        const action = body.status.toLowerCase();
        const previousStatus = game.getStatus();
        switch (action) {
            case 'running':
            case 'start':
                simulationEngine.startGame(id);
                break;
            case 'paused':
            case 'pause':
                simulationEngine.pauseGame(id);
                break;
            case 'resume':
                simulationEngine.resumeGame(id);
                break;
            case 'completed':
            case 'complete':
                game.complete();
                break;
            case 'cancelled':
            case 'cancel':
                game.cancel();
                break;
            default:
                throw new http_exception_1.HTTPException(400, { message: `Invalid status action: ${action}` });
        }
        // sync to db
        const newStatus = game.getStatus();
        const updateData = { status: toPrismaStatus(newStatus) };
        if (newStatus === shared_1.GameStatus.RUNNING && previousStatus === shared_1.GameStatus.DRAFT) {
            updateData.startedAt = new Date();
        }
        if (newStatus === shared_1.GameStatus.COMPLETED || newStatus === shared_1.GameStatus.CANCELLED) {
            updateData.completedAt = new Date();
        }
        await prisma_1.prisma.game.update({
            where: { id },
            data: updateData,
        });
        return c.json({
            id: game.getId(),
            status: game.getStatus(),
            previousStatus,
        });
    }
    catch (error) {
        if (error instanceof http_exception_1.HTTPException)
            throw error;
        if (error instanceof Error) {
            throw new http_exception_1.HTTPException(400, { message: error.message });
        }
        throw new http_exception_1.HTTPException(500, { message: 'Failed to update game status: ' + String(error) });
    }
});
// next round
gamesRouter.post('/:id/rounds', async (c) => {
    try {
        const id = c.req.param('id');
        const game = simulationEngine.getGame(id);
        if (!game) {
            throw new http_exception_1.HTTPException(404, { message: 'Game not found in simulation engine' });
        }
        const roundResult = simulationEngine.runRound(id);
        // persist to db
        const capacity = game.getConfig().capacity;
        const wasOvercrowded = roundResult.attendance > capacity;
        await prisma_1.prisma.$transaction(async (tx) => {
            // create record
            const round = await tx.round.create({
                data: {
                    id: roundResult.roundId,
                    gameId: id,
                    roundNumber: roundResult.roundNumber,
                    attendance: roundResult.attendance,
                    capacity: roundResult.capacity,
                    activeAgentsStart: roundResult.activeAgentsStart,
                    activeAgentsEnd: roundResult.activeAgentsEnd,
                    arrivals: roundResult.arrivals,
                    departures: roundResult.departures,
                    wasOvercrowded,
                    attendeeBenefit: roundResult.totalBenefit / roundResult.attendance || 0,
                    stayerBenefit: 0,
                },
            });
            //update current round
            await tx.game.update({
                where: { id },
                data: { currentRound: roundResult.roundNumber },
            });
            return round;
        });
        // completed check
        if (game.getStatus() === shared_1.GameStatus.COMPLETED) {
            await prisma_1.prisma.game.update({
                where: { id },
                data: {
                    status: client_1.GameStatus.COMPLETED,
                    completedAt: new Date(),
                },
            });
        }
        return c.json(roundResult, 201);
    }
    catch (error) {
        if (error instanceof http_exception_1.HTTPException)
            throw error;
        if (error instanceof Error) {
            throw new http_exception_1.HTTPException(400, { message: error.message });
        }
        throw new http_exception_1.HTTPException(500, { message: 'Failed to execute round: ' + String(error) });
    }
});
// run the whole simulation
gamesRouter.post('/:id/simulate', async (c) => {
    try {
        const id = c.req.param('id');
        const body = await c.req.json().catch(() => ({ rounds: undefined }));
        const game = simulationEngine.getGame(id);
        if (!game) {
            throw new http_exception_1.HTTPException(404, { message: 'Game not found in simulation engine' });
        }
        if (game.getAgents().length === 0) {
            throw new http_exception_1.HTTPException(400, { message: 'Game has no agents, add agents before starting.' });
        }
        const result = simulationEngine.runSimulation(id, body.rounds);
        // persist results to db
        await prisma_1.prisma.$transaction(async (tx) => {
            for (const round of result.rounds) {
                const wasOvercrowded = round.attendance > round.capacity;
                await tx.round.create({
                    data: {
                        id: round.roundId,
                        gameId: id,
                        roundNumber: round.roundNumber,
                        attendance: round.attendance,
                        capacity: round.capacity,
                        activeAgentsStart: round.activeAgentsStart,
                        activeAgentsEnd: round.activeAgentsEnd,
                        arrivals: round.arrivals,
                        departures: round.departures,
                        wasOvercrowded,
                        attendeeBenefit: round.attendance > 0 ? round.totalBenefit / round.attendance : 0,
                        stayerBenefit: 0,
                    },
                });
            }
            await tx.game.update({
                where: { id },
                data: {
                    currentRound: game.getCurrentRound(),
                    status: toPrismaStatus(game.getStatus()),
                    completedAt: game.getStatus() === shared_1.GameStatus.COMPLETED ? new Date() : undefined,
                },
            });
        });
        return c.json({
            gameId: result.gameId,
            status: result.status,
            totalRounds: result.totalRounds,
            duration: result.duration,
            finalStats: result.finalStats,
            roundsSummary: result.rounds.map(r => ({
                roundNumber: r.roundNumber,
                attendance: r.attendance,
                totalBenefit: r.totalBenefit,
                activeAgentsStart: r.activeAgentsStart,
                activeAgentsEnd: r.activeAgentsEnd,
                arrivals: r.arrivals,
                departures: r.departures,
            })),
        });
    }
    catch (error) {
        if (error instanceof http_exception_1.HTTPException)
            throw error;
        if (error instanceof Error) {
            throw new http_exception_1.HTTPException(400, { message: error.message });
        }
        throw new http_exception_1.HTTPException(500, { message: 'Failed to run simulation: ' + String(error) });
    }
});
// Add several agents to game
gamesRouter.post('/:id/agents/batch', async (c) => {
    try {
        const id = c.req.param('id');
        const body = await c.req.json();
        if (!body.agents || !Array.isArray(body.agents)) {
            throw new http_exception_1.HTTPException(400, { message: 'agents array is required' });
        }
        const game = simulationEngine.getGame(id);
        if (!game) {
            throw new http_exception_1.HTTPException(404, { message: 'Game not found in simulation engine' });
        }
        const agentFactory = new simulation_engine_1.AgentFactory(undefined, undefined, id);
        const addedAgents = [];
        for (let i = 0; i < body.agents.length; i++) {
            const agent = agentFactory.createAgent(body.agents[i], undefined, i);
            simulationEngine.addAgentToGame(id, agent);
            addedAgents.push({
                id: agent.getId(),
                name: agent.getName(),
                type: agent.getType(),
            });
        }
        return c.json({
            gameId: id,
            agentsAdded: addedAgents.length,
            agents: addedAgents,
            totalAgents: game.getAgents().length,
        }, 201);
    }
    catch (error) {
        if (error instanceof http_exception_1.HTTPException)
            throw error;
        if (error instanceof Error) {
            throw new http_exception_1.HTTPException(400, { message: error.message });
        }
        throw new http_exception_1.HTTPException(500, { message: 'Failed to add agents' });
    }
});
// Get stats
gamesRouter.get('/:id/stats', async (c) => {
    try {
        const id = c.req.param('id');
        const game = simulationEngine.getGame(id);
        if (!game) {
            throw new http_exception_1.HTTPException(404, { message: 'Game not found in simulation engine' });
        }
        const stats = simulationEngine.calculateGameStats(game);
        return c.json(stats);
    }
    catch (error) {
        if (error instanceof http_exception_1.HTTPException)
            throw error;
        console.error('Error getting game stats:', error);
        throw new http_exception_1.HTTPException(500, { message: 'Failed to get game stats' });
    }
});
// delete game
gamesRouter.delete('/:id', async (c) => {
    try {
        const id = c.req.param('id');
        simulationEngine.deleteGame(id);
        await prisma_1.prisma.game.delete({ where: { id } }).catch(() => {
            //ignore if not in db 
        });
        return c.json({ message: 'Game deleted', id });
    }
    catch (error) {
        console.error('Error deleting game:', error);
        throw new http_exception_1.HTTPException(500, { message: 'Failed to delete game' });
    }
});
