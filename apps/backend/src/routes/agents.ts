import { Hono } from 'hono';
import { Context } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { prisma } from '../core/db/prisma';
import { AgentType as PrismaAgentType, BuiltInAgentType as PrismaBuiltInAgentType } from '@prisma/client';
import { SimulationEngine, AgentFactory } from '../core/simulation-engine';
import { BuiltInAgentType } from '@el-farol/shared';
import type { AgentConfig } from '@el-farol/shared';

const agentsRouter = new Hono();
const simulationEngine = new SimulationEngine();
const agentFactory = new AgentFactory();

// prisma to shared
function toSharedBuiltInType(type: PrismaBuiltInAgentType | null): BuiltInAgentType | undefined{
  if (!type) return undefined;
  const map: Record<PrismaBuiltInAgentType, BuiltInAgentType> = {
    [PrismaBuiltInAgentType.RANDOM]: BuiltInAgentType.RANDOM,
    [PrismaBuiltInAgentType.THRESHOLD]: BuiltInAgentType.THRESHOLD,
    [PrismaBuiltInAgentType.MOVING_AVERAGE]: BuiltInAgentType.MOVING_AVERAGE,
    [PrismaBuiltInAgentType.ADAPTIVE]: BuiltInAgentType.ADAPTIVE,
  };
  return map[type];
}

//shared to prisma
function toPrismaBuiltInType(type?: BuiltInAgentType): PrismaBuiltInAgentType | undefined {
  if (!type) return undefined;
  const map: Record<BuiltInAgentType, PrismaBuiltInAgentType> = {
    [BuiltInAgentType.RANDOM]: PrismaBuiltInAgentType.RANDOM,
    [BuiltInAgentType.THRESHOLD]: PrismaBuiltInAgentType.THRESHOLD,
    [BuiltInAgentType.MOVING_AVERAGE]: PrismaBuiltInAgentType.MOVING_AVERAGE,
    [BuiltInAgentType.ADAPTIVE]: PrismaBuiltInAgentType.ADAPTIVE,
  };
  return map[type];
}

// add agent to game
agentsRouter.post('/games/:gameId/agents', async (c: Context) => {
  try {
    const gameId = c.req.param('gameId');
    const body = await c.req.json<AgentConfig>();

    if (!body.name || !body.type) {
      throw new HTTPException(400, { message: 'name and type are required' });
    }

    const game = simulationEngine.getGame(gameId);
    if (!game) {
      throw new HTTPException(404, { message: 'Game not found in simulation engine' });
    }


    const agent = agentFactory.createAgent(body);
    simulationEngine.addAgentToGame(gameId, agent);

    // db persistence
    const dbAgent = await prisma.agent.create({
      data: {
        id: agent.getId(),
        name: agent.getName(),
        type: PrismaAgentType.DRAFT, // Using DRAFT as placeholder for agent type
        builtInType: toPrismaBuiltInType(body.builtInType),
        customCode: body.customCode,
        config: body.parameters as object | undefined,
      },
    });

    //relate the agent to game

    await prisma.gameAgent.create({
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
  } catch (error) {
    if (error instanceof HTTPException) throw error;
    if (error instanceof Error) {
      throw new HTTPException(400, { message: error.message });
    }
    throw new HTTPException(500, { message: 'failed to add agent' });
  }
});

// list agents in game
agentsRouter.get('/games/:gameId/agents', async (c: Context) => {
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
    const gameAgents = await prisma.gameAgent.findMany({
      where: { gameId },
      include: { agent: true },
    });

    if (gameAgents.length === 0) {
      const gameExists = await prisma.game.findUnique({ where: { id: gameId } });
      if (!gameExists) {
        throw new HTTPException(404, { message: 'Game not found' });
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
  } catch (error) {
    if (error instanceof HTTPException) {throw error;}
    console.error('Error listing agents:', error);
    throw new HTTPException(500, { message: 'Failed to list agents' });
  }
});

// delete agent
agentsRouter.delete('/games/:gameId/agents/:agentId', async (c: Context) => {
  try {
    const gameId = c.req.param('gameId');
    const agentId = c.req.param('agentId');
    const game = simulationEngine.getGame(gameId);
    if (game) {
      simulationEngine.removeAgentFromGame(gameId, agentId);
    }

    // hard delete
    await prisma.gameAgent.deleteMany({
      where: { gameId, agentId },
    });
    const agentUsage = await prisma.gameAgent.count({
      where: { agentId },
    });
    
    if (agentUsage === 0) {
      await prisma.agent.delete({ where: { id: agentId } }).catch(() => {});
    }

    return c.json({ message: 'Agent removed from the game', gameId, agentId });
  } catch (error) {
    if (error instanceof HTTPException) {throw error;}
    if (error instanceof Error) {
      throw new HTTPException(400, { message: error.message });
    }
    throw new HTTPException(500, { message: 'Failed to remove agent: ' + String(error) });
  }
});

// agent details
agentsRouter.get('/games/:gameId/agents/:agentId', async (c: Context) => {
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
    const gameAgent = await prisma.gameAgent.findFirst({
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
      throw new HTTPException(404, { message: 'Agent not found in game' });
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
  } catch (error) {
    if (error instanceof HTTPException) throw error;
    console.error('Error getting agent:', error);
    throw new HTTPException(500, { message: 'Failed to get agent: ' + String(error) });
  }
});

export { agentsRouter };
