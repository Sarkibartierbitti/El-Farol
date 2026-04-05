import {
  BuiltInAgentType,
  CUSTOM_AGENT_TYPE,
  type SimulationAgentType,
} from './types';

export interface AgentParameterField {
  key: string;
  label: string;
  description: string;
  defaultValue: number;
  min: number;
  max?: number;
  step: number;
  integer?: boolean;
}

export interface BuiltInAgentPreset {
  type: BuiltInAgentType;
  label: string;
  summary: string;
  formula: string;
  parameters: AgentParameterField[];
}

export const CUSTOM_AGENT_TEMPLATE = `const recentWindow = history.slice(-5);
const baseline = recentWindow.length > 0 ? helpers.average(recentWindow) : capacity;
const decision = baseline < capacity;
`;

export const CUSTOM_AGENT_EXAMPLE = `// Example custom agent:
// 1. Look at the last 6 rounds.
// 2. Estimate the recent average attendance.
// 3. Avoid going if the bar is already trending upward too quickly.

const recent = history.slice(-6);

if (recent.length === 0) {
  // Early rounds: optimistic start.
  decision = true;
} else {
  const averageAttendance = helpers.average(recent);
  const previousAverage = helpers.average(recent.slice(0, -1));
  const localTrend = recent.length > 1 ? averageAttendance - previousAverage : 0;

  const safeCapacity = capacity * 0.92;
  const maxAllowedTrend = capacity * 0.05;

  decision = averageAttendance < safeCapacity && localTrend < maxAllowedTrend;
}
`;

export const BUILT_IN_AGENT_ORDER: BuiltInAgentType[] = [
  BuiltInAgentType.RANDOM,
  BuiltInAgentType.THRESHOLD,
  BuiltInAgentType.MOVING_AVERAGE,
  BuiltInAgentType.ADAPTIVE,
  BuiltInAgentType.CONTRARIAN,
  BuiltInAgentType.TREND_FOLLOWER,
  BuiltInAgentType.LOYAL,
  BuiltInAgentType.REGRET_MINIMIZING,
];

const BUILT_IN_AGENT_PRESETS: Record<BuiltInAgentType, BuiltInAgentPreset> = {
  [BuiltInAgentType.RANDOM]: {
    type: BuiltInAgentType.RANDOM,
    label: 'Random',
    summary: 'Каждый раунд принимает независимое решение без учета истории.',
    formula: 'P(go_t) = 0.5.',
    parameters: [],
  },
  [BuiltInAgentType.THRESHOLD]: {
    type: BuiltInAgentType.THRESHOLD,
    label: 'Threshold',
    summary: 'Сравнивает среднюю историческую посещаемость с порогом и затем бросает монету с перекошенной вероятностью.',
    formula:
      'x_t = mean(history) / capacity; если x_t < threshold, то P(go_t) = goProbability, иначе P(go_t) = 1 - goProbability.',
    parameters: [
      {
        key: 'threshold',
        label: 'threshold',
        description: 'Нормализованный порог относительно вместимости.',
        defaultValue: 1,
        min: 0,
        max: 2,
        step: 0.05,
      },
      {
        key: 'goProbability',
        label: 'goProbability',
        description: 'Вероятность пойти, если история выглядит безопасной.',
        defaultValue: 0.8,
        min: 0,
        max: 1,
        step: 0.05,
      },
    ],
  },
  [BuiltInAgentType.MOVING_AVERAGE]: {
    type: BuiltInAgentType.MOVING_AVERAGE,
    label: 'Moving Average',
    summary: 'Смотрит только на последнее окно раундов и сравнивает среднее с порогом.',
    formula:
      'm_t = mean(last windowSize attendances) / capacity; go_t = 1, если m_t < threshold, иначе 0.',
    parameters: [
      {
        key: 'windowSize',
        label: 'windowSize',
        description: 'Длина скользящего окна по истории посещаемости.',
        defaultValue: 5,
        min: 1,
        max: 50,
        step: 1,
        integer: true,
      },
      {
        key: 'threshold',
        label: 'threshold',
        description: 'Порог для нормализованного среднего по окну.',
        defaultValue: 0.6,
        min: 0,
        max: 2,
        step: 0.05,
      },
    ],
  },
  [BuiltInAgentType.ADAPTIVE]: {
    type: BuiltInAgentType.ADAPTIVE,
    label: 'Adaptive',
    summary: 'Хранит собственный текущий порог и сдвигает его после неудачных решений.',
    formula:
      'go_t = 1, если mean(history) / capacity < currentThreshold; после плохого go currentThreshold += adaptationRate, после плохого stay currentThreshold -= adaptationRate.',
    parameters: [
      {
        key: 'initialThreshold',
        label: 'initialThreshold',
        description: 'Стартовый внутренний порог агента.',
        defaultValue: 0.6,
        min: 0,
        max: 1,
        step: 0.05,
      },
      {
        key: 'adaptationRate',
        label: 'adaptationRate',
        description: 'Шаг корректировки после неудачного решения.',
        defaultValue: 0.1,
        min: 0,
        max: 1,
        step: 0.01,
      },
    ],
  },
  [BuiltInAgentType.CONTRARIAN]: {
    type: BuiltInAgentType.CONTRARIAN,
    label: 'Contrarian',
    summary: 'Идет именно тогда, когда недавняя история выглядела переполненной.',
    formula:
      'c_t = mean(last lookback attendances); go_t = 1, если c_t >= capacity, иначе 0.',
    parameters: [
      {
        key: 'lookback',
        label: 'lookback',
        description: 'Сколько последних раундов усреднять.',
        defaultValue: 1,
        min: 1,
        max: 50,
        step: 1,
        integer: true,
      },
    ],
  },
  [BuiltInAgentType.TREND_FOLLOWER]: {
    type: BuiltInAgentType.TREND_FOLLOWER,
    label: 'Trend Follower',
    summary: 'Экстраполирует линейный тренд последних посещений на один шаг вперед.',
    formula:
      'trend_t = mean(diff(last windowSize attendances)); predicted_t = lastAttendance + trend_t; go_t = 1, если predicted_t < capacity.',
    parameters: [
      {
        key: 'windowSize',
        label: 'windowSize',
        description: 'Размер окна для оценки тренда.',
        defaultValue: 4,
        min: 2,
        max: 50,
        step: 1,
        integer: true,
      },
    ],
  },
  [BuiltInAgentType.LOYAL]: {
    type: BuiltInAgentType.LOYAL,
    label: 'Loyal',
    summary: 'Следует фиксированному циклу из раундов посещения и пропуска.',
    formula:
      'cycle = onRounds + offRounds; go_t = 1, если (roundCounter mod cycle) < onRounds, иначе 0.',
    parameters: [
      {
        key: 'onRounds',
        label: 'onRounds',
        description: 'Сколько раундов подряд агент ходит в бар.',
        defaultValue: 2,
        min: 1,
        max: 50,
        step: 1,
        integer: true,
      },
      {
        key: 'offRounds',
        label: 'offRounds',
        description: 'Сколько раундов подряд агент остается дома.',
        defaultValue: 1,
        min: 1,
        max: 50,
        step: 1,
        integer: true,
      },
    ],
  },
  [BuiltInAgentType.REGRET_MINIMIZING]: {
    type: BuiltInAgentType.REGRET_MINIMIZING,
    label: 'Regret Minimizing',
    summary: 'Накапливает сожаление о неверных действиях и превращает его в вероятность пойти.',
    formula:
      'Если прошлый go был плохим, goRegret += learningRate; если прошлый stay был плохим, stayRegret += learningRate; P(go_t) = 0.5 при нулевом сожалении, иначе stayRegret / (goRegret + stayRegret).',
    parameters: [
      {
        key: 'learningRate',
        label: 'learningRate',
        description: 'Сколько сожаления добавлять за одну ошибку.',
        defaultValue: 1,
        min: 0,
        max: 10,
        step: 0.1,
      },
    ],
  },
};

export const AGENT_OPTIONS: { value: SimulationAgentType; label: string }[] = [
  ...BUILT_IN_AGENT_ORDER.map((type) => ({
    value: type,
    label: BUILT_IN_AGENT_PRESETS[type].label,
  })),
  { value: CUSTOM_AGENT_TYPE, label: 'Custom Agent' },
];

export function getBuiltInPreset(type: BuiltInAgentType): BuiltInAgentPreset {
  return BUILT_IN_AGENT_PRESETS[type];
}

export function getDefaultParameters(type: BuiltInAgentType): Record<string, number> {
  return Object.fromEntries(
    BUILT_IN_AGENT_PRESETS[type].parameters.map((field) => [field.key, field.defaultValue]),
  );
}

export function isBuiltInAgentType(type: SimulationAgentType): type is BuiltInAgentType {
  return type !== CUSTOM_AGENT_TYPE;
}
