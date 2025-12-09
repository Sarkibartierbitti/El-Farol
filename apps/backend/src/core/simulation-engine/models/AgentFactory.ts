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

  constructor(sandbox?: AgentSandbox, random?: SeededRandom) {
    this.sandbox = sandbox ?? new AgentSandbox();
    this.random = random;
  }

  //create an agent from configuration
  createAgent(config: AgentConfig, context?: AgentContext): BaseAgent {
    const id = uuidv4();
    const name = config.name;

    switch (config.type) {
      case AgentType.BUILT_IN:
        return this.createBuiltInAgent(id, name, config, context);

      case AgentType.CUSTOM:
        if (!config.customCode) {
          throw new Error('Custom agent requires customCode');
        }
        if (!context) {
          throw new Error('Custom agent requires context for code execution');
        }
        return this.createCustomAgent(id, name, config.customCode, context);

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
    _context?: AgentContext
  ): BaseAgent {
    const type = config.builtInType ?? BuiltInAgentType.RANDOM;
    const params = config.parameters ?? {};

    switch (type) {
      case BuiltInAgentType.RANDOM:
        return new RandomAgent(id, name, this.random);

      case BuiltInAgentType.THRESHOLD:
        return new ThresholdAgent(
          id,
          name,
          (params.threshold as number) ?? 1.0,
          (params.goProbability as number) ?? 0.8,
          this.random
        );

      case BuiltInAgentType.MOVING_AVERAGE:
        return new MovingAverageAgent(
          id,
          name,
          (params.windowSize as number) ?? 5,
          (params.threshold as number) ?? 0.6,
          this.random
        );

      case BuiltInAgentType.ADAPTIVE:
        return new AdaptiveAgent(
          id,
          name,
          (params.initialThreshold as number) ?? 0.6,
          (params.adaptationRate as number) ?? 0.1,
          this.random
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
    context: AgentContext
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

    return new CustomAgent(id, name, code, executor, this.random);
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
    context?: AgentContext
  ): BaseAgent[] {
    const agents: BaseAgent[] = [];
    for (let i = 0; i < count; i++) {
      const agentConfig = {
        ...config,
        name: config.name ? `${config.name} ${i + 1}` : `Agent ${i + 1}`
      };
      agents.push(this.createAgent(agentConfig, context));
    }
    return agents;
  }
}

