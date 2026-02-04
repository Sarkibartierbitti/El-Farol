import { Hono } from 'hono';
import { Context } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { prisma } from '../core/db/prisma';

const roundsRouter = new Hono();

// list rounds
roundsRouter.get('/', async (c: Context) => {
  try {
    const gameId = c.req.query('gameId');
    const limit = parseInt(c.req.query('limit') || '50', 10);
    const offset = parseInt(c.req.query('offset') || '0', 10);

    const where = gameId ? { gameId } : {};

    const rounds = await prisma.round.findMany({
      where,
      orderBy: [{ gameId: 'asc' }, { roundNumber: 'desc' },],
      skip: offset,
      take: limit,
      include: {
        game: {
          select: { name: true },
        },
      },
    });

    const total = await prisma.round.count({ where });

    return c.json({
      rounds: rounds.map(r => ({
        id: r.id,
        gameId: r.gameId,
        gameName: r.game.name,
        roundNumber: r.roundNumber,
        attendance: r.attendance,
        capacity: r.capacity,
        wasOvercrowded: r.wasOvercrowded,
        attendeeBenefit: r.attendeeBenefit,
        stayerBenefit: r.stayerBenefit,
        executedAt: r.executedAt,
      })),
      total,
      limit,
      offset,
    });
  } catch (error) {
    console.error('Error listing rounds:', error);
    throw new HTTPException(500, { message: 'Failed to list rounds' });
  }
});

// round by id
roundsRouter.get('/:id', async (c: Context) => {
  try {
    const id = c.req.param('id');

    const round = await prisma.round.findUnique({
      where: { id },
      include: {
        game: {
          select: { name: true, totalAgents: true },
        },
        decisions: {
          include: {
            gameAgent: {
              include: { agent: true },
            },
          },
        },
      },
    });

    if (!round) {
      throw new HTTPException(404, { message: 'Round not found' });
    }

    return c.json({
      id: round.id,
      gameId: round.gameId,
      gameName: round.game.name,
      roundNumber: round.roundNumber,
      attendance: round.attendance,
      capacity: round.capacity,
      wasOvercrowded: round.wasOvercrowded,
      attendeeBenefit: round.attendeeBenefit,
      stayerBenefit: round.stayerBenefit,
      executedAt: round.executedAt,
      decisions: round.decisions.map(d => ({
        agentId: d.gameAgent.agent.id,
        agentName: d.gameAgent.agent.name,
        wentToBar: d.wentToBar,
        prediction: d.prediction,
        benefit: d.benefit,
      })),
    });
  } catch (error) {
    if (error instanceof HTTPException) throw error;
    console.error('Error getting round:', error);
    throw new HTTPException(500, { message: 'Failed to get round: ' + String(error) });
  }
});

// list round for a game
roundsRouter.get('/games/:gameId/rounds', async (c: Context) => {
  try {
    const gameId = c.req.param('gameId');
    const limit = parseInt(c.req.query('limit') || '50', 10);
    const offset = parseInt(c.req.query('offset') || '0', 10);

    const rounds = await prisma.round.findMany({
      where: { gameId },
      orderBy: { roundNumber: 'desc' },
      skip: offset,
      take: limit,
    });

    const total = await prisma.round.count({ where: { gameId } });

    if (rounds.length === 0 && total === 0) {
      const gameExists = await prisma.game.findUnique({ where: { id: gameId } });
      if (!gameExists) {
        throw new HTTPException(404, { message: 'Game not found' });
      }
    }

    return c.json({
      gameId,
      rounds: rounds.map(r => ({
        id: r.id,
        roundNumber: r.roundNumber,
        attendance: r.attendance,
        capacity: r.capacity,
        wasOvercrowded: r.wasOvercrowded,
        attendeeBenefit: r.attendeeBenefit,
        stayerBenefit: r.stayerBenefit,
        executedAt: r.executedAt,
      })),
      total,
      limit,
      offset,
    });
  } catch (error) {
    if (error instanceof HTTPException) throw error;
    console.error('Error listing game rounds:', error);
    throw new HTTPException(500, { message: 'Failed to list game rounds: ' + String(error) });
  }
});

export { roundsRouter };
