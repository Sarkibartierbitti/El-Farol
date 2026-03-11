import {
  AgentType,
  BuiltInAgentType,
  AgentConfig
} from '@el-farol/shared';
import {
  BaseAgent,
  RandomAgent,
  ThresholdAgent,
  MovingAverageAgent,
  AdaptiveAgent,
  ContrarianAgent,
  TrendFollowerAgent,
  LoyalAgent,
  RegretMinimizingAgent,
  HumanAgent,
  CustomAgent
} from './Agent';
import { AgentSandbox } from '../sandbox';
import { AgentContext } from '@el-farol/shared';
import { SeededRandom } from '@el-farol/shared';
import { v4 as uuidv4 } from 'uuid';

//factory for creating agents from configuration
export class AgentFactory {
  private sandbox: AgentSandbox;
  private random?: SeededRandom;

  private baseSeed?: string | number;

  constructor(sandbox?: AgentSandbox, random?: SeededRandom, baseSeed?: string | number) {
    this.sandbox = sandbox ?? new AgentSandbox();
    this.random = random;
    this.baseSeed = baseSeed;
  }

  //create an agent from configuration
  createAgent(config: AgentConfig, context?: AgentContext, agentIndex?: number): BaseAgent {
    const id = uuidv4();
    const name = config.name;

    switch (config.type) {
      case AgentType.BUILT_IN:
        return this.createBuiltInAgent(id, name, config, context, agentIndex);

      case AgentType.CUSTOM:
        if (!config.customCode) {
          throw new Error('Custom agent requires customCode');
        }
        if (!context) {
          throw new Error('Custom agent requires context for code execution');
        }
        return this.createCustomAgent(id, name, config.customCode, context, agentIndex);

      case AgentType.HUMAN:
        return this.createHumanAgent(id, name, config);

      default:
        throw new Error(`Unknown agent type: ${config.type}`);
    }
  }

  private createBuiltInAgent(
    id: string,
    name: string,
    config: AgentConfig,
    _context?: AgentContext,
    agentIndex?: number
  ): BaseAgent {
    const type = config.builtInType ?? BuiltInAgentType.RANDOM;
    const params = config.parameters ?? {};
    const rng = this.baseSeed != null && agentIndex != null
      ? new SeededRandom(`${this.baseSeed}-${agentIndex}`)
      : this.random;

    switch (type) {
      case BuiltInAgentType.RANDOM:
        return new RandomAgent(id, name, rng);

      case BuiltInAgentType.THRESHOLD:
        return new ThresholdAgent(
          id,
          name,
          (params.threshold as number) ?? 1.0,
          (params.goProbability as number) ?? 0.8,
          rng
        );

      case BuiltInAgentType.MOVING_AVERAGE:
        return new MovingAverageAgent(
          id,
          name,
          (params.windowSize as number) ?? 5,
          (params.threshold as number) ?? 0.6,
          rng
        );

      case BuiltInAgentType.ADAPTIVE:
        return new AdaptiveAgent(
          id,
          name,
          (params.initialThreshold as number) ?? 0.6,
          (params.adaptationRate as number) ?? 0.1,
          rng
        );

      case BuiltInAgentType.CONTRARIAN:
        return new ContrarianAgent(
          id,
          name,
          (params.lookback as number) ?? 1,
          rng
        );

      case BuiltInAgentType.TREND_FOLLOWER:
        return new TrendFollowerAgent(
          id,
          name,
          (params.windowSize as number) ?? 4,
          rng
        );

      case BuiltInAgentType.LOYAL:
        return new LoyalAgent(
          id,
          name,
          (params.onRounds as number) ?? 2,
          (params.offRounds as number) ?? 1,
          rng
        );

      case BuiltInAgentType.REGRET_MINIMIZING:
        return new RegretMinimizingAgent(
          id,
          name,
          (params.learningRate as number) ?? 1.0,
          rng
        );

      default:
        throw new Error(`Unknown built-in agent type: ${type}`);
    }
  }

  //create agent with user code
  private createCustomAgent(
    id: string,
    name: string,
    code: string,
    context: AgentContext,
    agentIndex?: number
  ): CustomAgent {
    // create executor that will be used for each prediction
    const executor = (history: number[], capacity: number): boolean => {
      const execContext: AgentContext = {
        attendanceHistory: history,
        capacity,
        roundNumber: context.roundNumber,
        helpers: context.helpers
      };
      const codeExecutor = this.sandbox.createExecutor(execContext);
      return codeExecutor(code);
    };

    return new CustomAgent(id, name, code, executor, this.baseSeed != null && agentIndex != null
      ? new SeededRandom(`${this.baseSeed}-${agentIndex}`)
      : this.random);
  }

  //create human agent
  private createHumanAgent(
    id: string,
    name: string,
    config: AgentConfig
  ): HumanAgent {
    return new HumanAgent(
      id,
      name,
      config.userId,
      config.telegramUserId
    );
  }

  //create multiple agents of the same type
  createMultipleAgents(
    count: number,
    config: AgentConfig,
    context?: AgentContext,
    startIndex?: number
  ): BaseAgent[] {
    const agents: BaseAgent[] = [];
    for (let i = 0; i < count; i++) {
      const agentConfig = {
        ...config,
        name: config.name ? `${config.name} ${i + 1}` : `Agent ${i + 1}`
      };
      agents.push(this.createAgent(agentConfig, context, (startIndex ?? 0) + i));
    }
    return agents;
  }
}

