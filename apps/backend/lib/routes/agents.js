"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.agentsRouter = void 0;
const hono_1 = require("hono");
const http_exception_1 = require("hono/http-exception");
const prisma_1 = require("../core/db/prisma");
const client_1 = require("@prisma/client");
const simulation_engine_1 = require("../core/simulation-engine");
const shared_1 = require("@el-farol/shared");
const agentsRouter = new hono_1.Hono();
exports.agentsRouter = agentsRouter;
const simulationEngine = new simulation_engine_1.SimulationEngine();
// prisma to shared
function toSharedBuiltInType(type) {
    if (!type)
        return undefined;
    const map = {
        [client_1.BuiltInAgentType.RANDOM]: shared_1.BuiltInAgentType.RANDOM,
        [client_1.BuiltInAgentType.THRESHOLD]: shared_1.BuiltInAgentType.THRESHOLD,
        [client_1.BuiltInAgentType.MOVING_AVERAGE]: shared_1.BuiltInAgentType.MOVING_AVERAGE,
        [client_1.BuiltInAgentType.ADAPTIVE]: shared_1.BuiltInAgentType.ADAPTIVE,
        [client_1.BuiltInAgentType.CONTRARIAN]: shared_1.BuiltInAgentType.CONTRARIAN,
        [client_1.BuiltInAgentType.TREND_FOLLOWER]: shared_1.BuiltInAgentType.TREND_FOLLOWER,
        [client_1.BuiltInAgentType.LOYAL]: shared_1.BuiltInAgentType.LOYAL,
        [client_1.BuiltInAgentType.REGRET_MINIMIZING]: shared_1.BuiltInAgentType.REGRET_MINIMIZING,
    };
    return map[type];
}
//shared to prisma
function toPrismaBuiltInType(type) {
    if (!type)
        return undefined;
    const map = {
        [shared_1.BuiltInAgentType.RANDOM]: client_1.BuiltInAgentType.RANDOM,
        [shared_1.BuiltInAgentType.THRESHOLD]: client_1.BuiltInAgentType.THRESHOLD,
        [shared_1.BuiltInAgentType.MOVING_AVERAGE]: client_1.BuiltInAgentType.MOVING_AVERAGE,
        [shared_1.BuiltInAgentType.ADAPTIVE]: client_1.BuiltInAgentType.ADAPTIVE,
        [shared_1.BuiltInAgentType.CONTRARIAN]: client_1.BuiltInAgentType.CONTRARIAN,
        [shared_1.BuiltInAgentType.TREND_FOLLOWER]: client_1.BuiltInAgentType.TREND_FOLLOWER,
        [shared_1.BuiltInAgentType.LOYAL]: client_1.BuiltInAgentType.LOYAL,
        [shared_1.BuiltInAgentType.REGRET_MINIMIZING]: client_1.BuiltInAgentType.REGRET_MINIMIZING,
    };
    return map[type];
}
// add agent to game
agentsRouter.post('/games/:gameId/agents', async (c) => {
    try {
        const gameId = c.req.param('gameId');
        const body = await c.req.json();
        if (!body.name || !body.type) {
            throw new http_exception_1.HTTPException(400, { message: 'name and type are required' });
        }
        const game = simulationEngine.getGame(gameId);
        if (!game) {
            throw new http_exception_1.HTTPException(404, { message: 'Game not found in simulation engine' });
        }
        const agentIndex = game.getAgents().length;
        const agentFactory = new simulation_engine_1.AgentFactory(undefined, undefined, gameId);
        const agent = agentFactory.createAgent(body, undefined, agentIndex);
        simulationEngine.addAgentToGame(gameId, agent);
        // db persistence
        const dbAgent = await prisma_1.prisma.agent.create({
            data: {
                id: agent.getId(),
                name: agent.getName(),
                type: client_1.AgentType.DRAFT, // Using DRAFT as placeholder for agent type
                builtInType: toPrismaBuiltInType(body.builtInType),
                customCode: body.customCode,
                config: body.parameters,
            },
        });
        //relate the agent to game
        await prisma_1.prisma.gameAgent.create({
            data: {
                gameId,
                agentId: dbAgent.id,
            },
        });
        return c.json({
            id: agent.getId(),
            name: agent.getName(),
            type: agent.getType(),
            gameId,
        }, 201);
    }
    catch (error) {
        if (error instanceof http_exception_1.HTTPException)
            throw error;
        if (error instanceof Error) {
            throw new http_exception_1.HTTPException(400, { message: error.message });
        }
        throw new http_exception_1.HTTPException(500, { message: 'failed to add agent' });
    }
});
// list agents in game
agentsRouter.get('/games/:gameId/agents', async (c) => {
    try {
        const gameId = c.req.param('gameId');
        //check memory
        const game = simulationEngine.getGame(gameId);
        if (game) {
            const agents = game.getAgents().map(agent => ({
                id: agent.getId(),
                name: agent.getName(),
                type: agent.getType(),
            }));
            return c.json({ gameId, agents, count: agents.length });
        }
        //check db
        const gameAgents = await prisma_1.prisma.gameAgent.findMany({
            where: { gameId },
            include: { agent: true },
        });
        if (gameAgents.length === 0) {
            const gameExists = await prisma_1.prisma.game.findUnique({ where: { id: gameId } });
            if (!gameExists) {
                throw new http_exception_1.HTTPException(404, { message: 'Game not found' });
            }
        }
        const agents = gameAgents.map(ga => ({
            id: ga.agent.id,
            name: ga.agent.name,
            type: ga.agent.type,
            builtInType: toSharedBuiltInType(ga.agent.builtInType),
            totalScore: ga.totalScore,
            attendanceCount: ga.attendanceCount,
            winCount: ga.winCount,
        }));
        return c.json({ gameId, agents, count: agents.length });
    }
    catch (error) {
        if (error instanceof http_exception_1.HTTPException) {
            throw error;
        }
        console.error('Error listing agents:', error);
        throw new http_exception_1.HTTPException(500, { message: 'Failed to list agents' });
    }
});
// delete agent
agentsRouter.delete('/games/:gameId/agents/:agentId', async (c) => {
    try {
        const gameId = c.req.param('gameId');
        const agentId = c.req.param('agentId');
        const game = simulationEngine.getGame(gameId);
        if (game) {
            simulationEngine.removeAgentFromGame(gameId, agentId);
        }
        // hard delete
        await prisma_1.prisma.gameAgent.deleteMany({
            where: { gameId, agentId },
        });
        const agentUsage = await prisma_1.prisma.gameAgent.count({
            where: { agentId },
        });
        if (agentUsage === 0) {
            await prisma_1.prisma.agent.delete({ where: { id: agentId } }).catch(() => { });
        }
        return c.json({ message: 'Agent removed from the game', gameId, agentId });
    }
    catch (error) {
        if (error instanceof http_exception_1.HTTPException) {
            throw error;
        }
        if (error instanceof Error) {
            throw new http_exception_1.HTTPException(400, { message: error.message });
        }
        throw new http_exception_1.HTTPException(500, { message: 'Failed to remove agent: ' + String(error) });
    }
});
// agent details
agentsRouter.get('/games/:gameId/agents/:agentId', async (c) => {
    try {
        const gameId = c.req.param('gameId');
        const agentId = c.req.param('agentId');
        // in-memory search
        const game = simulationEngine.getGame(gameId);
        if (game) {
            const agent = game.getAgents().find(a => a.getId() === agentId);
            if (agent) {
                return c.json({
                    id: agent.getId(),
                    name: agent.getName(),
                    type: agent.getType(),
                    gameId,
                });
            }
        }
        // db search
        const gameAgent = await prisma_1.prisma.gameAgent.findFirst({
            where: { gameId, agentId },
            include: {
                agent: true,
                decisions: {
                    orderBy: { round: { roundNumber: 'desc' } },
                    take: 10,
                    include: { round: true },
                },
            },
        });
        if (!gameAgent) {
            throw new http_exception_1.HTTPException(404, { message: 'Agent not found in game' });
        }
        return c.json({
            id: gameAgent.agent.id,
            name: gameAgent.agent.name,
            type: gameAgent.agent.type,
            builtInType: toSharedBuiltInType(gameAgent.agent.builtInType),
            config: gameAgent.agent.config,
            gameId,
            stats: {
                totalScore: gameAgent.totalScore,
                attendanceCount: gameAgent.attendanceCount,
                winCount: gameAgent.winCount,
            },
            recentDecisions: gameAgent.decisions.map(d => ({
                roundNumber: d.round.roundNumber,
                wentToBar: d.wentToBar,
                benefit: d.benefit,
            })),
        });
    }
    catch (error) {
        if (error instanceof http_exception_1.HTTPException)
            throw error;
        console.error('Error getting agent:', error);
        throw new http_exception_1.HTTPException(500, { message: 'Failed to get agent: ' + String(error) });
    }
});
