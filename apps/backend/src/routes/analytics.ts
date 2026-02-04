import { Hono } from 'hono';
import { Context } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { prisma } from '../core/db/prisma';
import { SimulationEngine, calculateStats } from '../core/simulation-engine';
import type { BenefitRules } from '@el-farol/shared';

const analyticsRouter = new Hono();
const simulationEngine = new SimulationEngine();

// econstruct benefit history from db rounds
function reconstructBenefitHistory(
  rounds: { attendance: number; capacity: number; wasOvercrowded: boolean; attendeeBenefit: number }[],
  benefitRules?: BenefitRules
): number[] {
  const positiveMultiplier = benefitRules?.positiveMultiplier ?? 1;
  const negativeMultiplier = benefitRules?.negativeMultiplier ?? 1;

  return rounds.map(r => {
    if (r.wasOvercrowded) {
      return -r.attendance * negativeMultiplier;
    }
    return r.attendance * positiveMultiplier;
  });
}

// game statistics
analyticsRouter.get('/games/:gameId/stats', async (c: Context) => {
  try {
    const gameId = c.req.param('gameId');

    //memory check
    const game = simulationEngine.getGame(gameId);
    if (game) {
      const stats = simulationEngine.calculateGameStats(game);
      return c.json(stats);
    }
    // fallback to database
    const dbGame = await prisma.game.findUnique({
      where: { id: gameId },
      include: {
        rounds: { orderBy: { roundNumber: 'asc' } },
      },
    });

    if (!dbGame) {
      throw new HTTPException(404, { message: 'Game not found' });
    }

    // reconstruct data from db
    const capacity = Math.round((dbGame.capacityPercent ?? 60) / 100 * dbGame.totalAgents);
    const attendanceHistory = dbGame.rounds.map(r => r.attendance);
    const benefitHistory = reconstructBenefitHistory(
      dbGame.rounds,
      dbGame.benefitRules as BenefitRules
    );

    const stats = calculateStats({
      gameId,
      attendanceHistory,
      benefitHistory,
      capacity,
      numAgents: dbGame.totalAgents,
    });

    return c.json(stats);
  } catch (error) {
    if (error instanceof HTTPException) throw error;
    console.error('Error getting game stats:', error);
    throw new HTTPException(500, { message: 'Failed to get game stats' });
  }
});

// attendance and benefit history
analyticsRouter.get('/games/:gameId/history', async (c: Context) => {
  try {
    const gameId = c.req.param('gameId');
    const limit = parseInt(c.req.query('limit') || '100', 10);
    const offset = parseInt(c.req.query('offset') || '0', 10);
    const game = simulationEngine.getGame(gameId);
    if (game) {
      const attendanceHistory = game.getAttendanceHistory();
      const benefitHistory = game.getBenefitHistory();
      const capacity = game.getConfig().capacity;

      const history = attendanceHistory.slice(offset, offset + limit).map((attendance, idx) => ({
        roundNumber: offset + idx + 1,
        attendance,
        benefit: benefitHistory[offset + idx] ?? 0,
        capacity,
        wasOvercrowded: attendance > capacity,
      }));

      return c.json({
        gameId,
        history,
        total: attendanceHistory.length,
        limit,
        offset,
      });
    }

    //db
    const rounds = await prisma.round.findMany({
      where: { gameId },
      orderBy: { roundNumber: 'asc' },
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

    const history = rounds.map(r => ({
      roundNumber: r.roundNumber,
      attendance: r.attendance,
      benefit: r.wasOvercrowded ? -r.attendance : r.attendance * r.attendeeBenefit,
      capacity: r.capacity,
      wasOvercrowded: r.wasOvercrowded,
      executedAt: r.executedAt,
    }));

    return c.json({
      gameId,
      history,
      total,
      limit,
      offset,
    });
  } catch (error) {
    if (error instanceof HTTPException) throw error;
    console.error('Error getting game history:', error);
    throw new HTTPException(500, { message: 'Failed to get game history' });
  }
});

// agent performanc
analyticsRouter.get('/games/:gameId/agents/performance', async (c: Context) => {
  try {
    const gameId = c.req.param('gameId');
    const game = simulationEngine.getGame(gameId);
    if (game) {
      const agents = game.getAgents();
      const performance = agents.map(agent => ({
        agentId: agent.getId(),
        agentName: agent.getName(),
        type: agent.getType(),
      }));

      return c.json({
        gameId,
        performance,
        note: 'Detailed stats require completed rounds in database',
      });
    }
    const gameAgents = await prisma.gameAgent.findMany({
      where: { gameId },
      include: {
        agent: true,
        decisions: true,
      },
      orderBy: { totalScore: 'desc' },
    });

    if (gameAgents.length === 0) {
      const gameExists = await prisma.game.findUnique({ where: { id: gameId } });
      if (!gameExists) {
        throw new HTTPException(404, { message: 'Game not found' });
      }
    }

    const performance = gameAgents.map(ga => {
      const totalDecisions = ga.decisions.length;
      const goDecisions = ga.decisions.filter(d => d.wentToBar).length;
      const winDecisions = ga.decisions.filter(d => d.benefit > 0).length;

      return {
        agentId: ga.agent.id,
        agentName: ga.agent.name,
        type: ga.agent.type,
        builtInType: ga.agent.builtInType,
        totalScore: ga.totalScore,
        attendanceCount: ga.attendanceCount,
        winCount: ga.winCount,
        totalDecisions,
        goRate: totalDecisions > 0 ? goDecisions / totalDecisions : 0,
        winRate: totalDecisions > 0 ? winDecisions / totalDecisions : 0,
        averageBenefit: totalDecisions > 0 ? ga.totalScore / totalDecisions : 0,
      };
    });

    return c.json({
      gameId,
      performance,
      topPerformer: performance[0] ?? null,
    });
  } catch (error) {
    if (error instanceof HTTPException) throw error;
    console.error('Error getting agent performance:', error);
    throw new HTTPException(500, { message: 'Failed to get agent performance: ' + String(error) });
  }
});

export { analyticsRouter };
