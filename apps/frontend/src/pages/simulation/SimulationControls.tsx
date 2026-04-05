import { useMemo, useState } from 'react';
import { Button, Input, Select } from '../../components/ui';
import type { AgentBatchEntry, SimulationFormValues } from '../../types';
import { BuiltInAgentType, CUSTOM_AGENT_TYPE } from '../../types';
import type { SimStatus } from '../../hooks/useSimulation';
import {
  AGENT_OPTIONS,
  CUSTOM_AGENT_TEMPLATE,
  getBuiltInPreset,
  getDefaultParameters,
  isBuiltInAgentType,
  type AgentParameterField,
} from '../../agentCatalog';

interface SimulationControlsProps {
  status: SimStatus;
  onRun: (form: SimulationFormValues, agents: AgentBatchEntry[]) => void;
  onReset: () => void;
}

interface AgentSettingsModalProps {
  entry: AgentBatchEntry;
  disabled: boolean;
  onClose: () => void;
  onParameterChange: (key: string, value: number, field: AgentParameterField) => void;
  onCustomCodeChange: (code: string) => void;
  onNameChange: (name: string) => void;
}

const defaultForm: SimulationFormValues = {
  name: 'El Farol Simulation',
  numAgents: 100,
  capacityPercent: 60,
  numRounds: 100,
  positiveMultiplier: 1,
  negativeMultiplier: 1,
};

const defaultAgents: AgentBatchEntry[] = [
  {
    type: BuiltInAgentType.THRESHOLD,
    count: 25,
    parameters: getDefaultParameters(BuiltInAgentType.THRESHOLD),
  },
  {
    type: BuiltInAgentType.MOVING_AVERAGE,
    count: 25,
    parameters: getDefaultParameters(BuiltInAgentType.MOVING_AVERAGE),
  },
  {
    type: BuiltInAgentType.ADAPTIVE,
    count: 25,
    parameters: getDefaultParameters(BuiltInAgentType.ADAPTIVE),
  },
  {
    type: BuiltInAgentType.RANDOM,
    count: 25,
    parameters: getDefaultParameters(BuiltInAgentType.RANDOM),
  },
];

function clampParameterValue(field: AgentParameterField, raw: string): number {
  const cleaned = raw.replace(/[^\d.]/g, '');

  if (cleaned === '' || cleaned === '.') {
    return field.defaultValue;
  }

  const parsed = Number(cleaned);
  if (Number.isNaN(parsed)) {
    return field.defaultValue;
  }

  const capped =
    field.max !== undefined ? Math.min(field.max, Math.max(field.min, parsed)) : Math.max(field.min, parsed);

  return field.integer ? Math.round(capped) : Number(capped.toFixed(4));
}

function AgentSettingsModal({
  entry,
  disabled,
  onClose,
  onParameterChange,
  onCustomCodeChange,
  onNameChange,
}: AgentSettingsModalProps) {
  const builtInPreset = isBuiltInAgentType(entry.type) ? getBuiltInPreset(entry.type) : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-4" onClick={onClose}>
      <div
        className="w-full max-w-xl border border-black-200 bg-white p-5 shadow-lg"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase text-black-500">Настройки агента</p>
            <h4 className="text-lg font-bold text-black-900">
              {builtInPreset ? builtInPreset.label : 'Custom Agent'}
            </h4>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-sm text-black-500 hover:text-black-900"
            aria-label="Закрыть настройки агента"
          >
            close
          </button>
        </div>

        {builtInPreset ? (
          <div className="space-y-4">
            <div className="border border-black-100 bg-[#faf6ef] p-3 text-sm text-black-700">
              <p className="font-medium text-black-900">Правило</p>
              <p className="mt-1">{builtInPreset.formula}</p>
            </div>

            {builtInPreset.parameters.length > 0 ? (
              <div className="grid gap-4 sm:grid-cols-2">
                {builtInPreset.parameters.map((field) => (
                  <Input
                    key={field.key}
                    label={field.label}
                    type="text"
                    inputMode={field.integer ? 'numeric' : 'decimal'}
                    value={String(entry.parameters?.[field.key] ?? field.defaultValue)}
                    hint={`${field.description} default = ${field.defaultValue}`}
                    onChange={(event) =>
                      onParameterChange(field.key, clampParameterValue(field, event.target.value), field)
                    }
                    disabled={disabled}
                  />
                ))}
              </div>
            ) : (
              <p className="text-sm text-black-600">
                У этого типа нет настраиваемых параметров конструктора.
              </p>
            )}

            <div className="flex justify-end">
              <Button type="button" variant="secondary" onClick={onClose}>
                Готово
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <Input
              label="Название"
              value={entry.name ?? 'Custom Agent'}
              onChange={(event) => onNameChange(event.target.value)}
              disabled={disabled}
              hint="Будет использовано как префикс имени при создании нескольких агентов."
            />

            <div className="border border-black-100 bg-[#faf6ef] p-3 text-sm text-black-700">
              <p className="font-medium text-black-900">Доступный контекст</p>
              <p className="mt-1">
                В коде доступны `history`, `capacity`, `roundNumber`, `helpers.average`, `helpers.sum`,
                `helpers.min`, `helpers.max`, `helpers.last` и `Math`.
              </p>
              <p className="mt-1">Код должен вернуть булево значение или записать его в переменную `decision`.</p>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium uppercase text-black">Код агента</label>
              <textarea
                value={entry.customCode ?? CUSTOM_AGENT_TEMPLATE}
                onChange={(event) => onCustomCodeChange(event.target.value)}
                disabled={disabled}
                rows={12}
                spellCheck={false}
                className="w-full border border-black-200 bg-white p-3 font-mono text-sm focus:border-[#9871f7] focus:outline-none focus:ring-1 focus:ring-[#9871f7]"
              />
            </div>

            <div className="flex justify-end">
              <Button type="button" variant="secondary" onClick={onClose}>
                Готово
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export function SimulationControls({ status, onRun, onReset }: SimulationControlsProps) {
  const [form, setForm] = useState<SimulationFormValues>(defaultForm);
  const [agents, setAgents] = useState<AgentBatchEntry[]>(defaultAgents);
  const [activeSettingsIndex, setActiveSettingsIndex] = useState<number | null>(null);

  const isRunning = status === 'creating' || status === 'simulating';
  const isDone = status === 'done' || status === 'error';

  function setField<K extends keyof SimulationFormValues>(key: K, value: SimulationFormValues[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function setAgentCount(index: number, count: number) {
    setAgents((current) => current.map((entry, i) => (i === index ? { ...entry, count } : entry)));
  }

  function setAgentType(index: number, type: AgentBatchEntry['type']) {
    setAgents((current) =>
      current.map((entry, i) => {
        if (i !== index) {
          return entry;
        }

        if (isBuiltInAgentType(type)) {
          return {
            type,
            count: entry.count,
            parameters: getDefaultParameters(type),
          };
        }

        return {
          type: CUSTOM_AGENT_TYPE,
          count: entry.count,
          name: entry.name ?? 'Custom Agent',
          customCode: entry.customCode ?? CUSTOM_AGENT_TEMPLATE,
        };
      }),
    );

    if (type === CUSTOM_AGENT_TYPE) {
      setActiveSettingsIndex(index);
    }
  }

  function setAgentParameters(index: number, nextParameters: Record<string, number>) {
    setAgents((current) =>
      current.map((entry, i) => (i === index ? { ...entry, parameters: nextParameters } : entry)),
    );
  }

  function setCustomAgentName(index: number, name: string) {
    setAgents((current) => current.map((entry, i) => (i === index ? { ...entry, name } : entry)));
  }

  function setCustomAgentCode(index: number, customCode: string) {
    setAgents((current) => current.map((entry, i) => (i === index ? { ...entry, customCode } : entry)));
  }

  function addAgentRow() {
    setAgents((current) => [
      ...current,
      {
        type: BuiltInAgentType.RANDOM,
        count: 10,
        parameters: getDefaultParameters(BuiltInAgentType.RANDOM),
      },
    ]);
  }

  function removeAgentRow(index: number) {
    setAgents((current) => current.filter((_, i) => i !== index));
    setActiveSettingsIndex((current) => {
      if (current === null) {
        return null;
      }
      if (current === index) {
        return null;
      }
      return current > index ? current - 1 : current;
    });
  }

  const totalAgents = agents.reduce((sum, agent) => sum + agent.count, 0);
  const agentMismatch = totalAgents !== form.numAgents;
  const invalidCustomAgent = agents.some(
    (entry) => entry.type === CUSTOM_AGENT_TYPE && !(entry.customCode ?? '').trim(),
  );
  const activeEntry = activeSettingsIndex !== null ? agents[activeSettingsIndex] : null;
  const canSubmit = !isRunning && !agentMismatch && !invalidCustomAgent;

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!canSubmit) {
      return;
    }
    onRun(form, agents);
  }

  function handleNumericChange(
    key: keyof SimulationFormValues,
    raw: string,
    min: number,
    max: number,
  ) {
    const digits = raw.replace(/\D/g, '');
    if (digits === '') {
      setField(key, min as SimulationFormValues[typeof key]);
      return;
    }
    const num = Math.max(min, Math.min(Number(digits), max));
    setField(key, num as SimulationFormValues[typeof key]);
  }

  function handleDecimalChange(
    key: keyof SimulationFormValues,
    raw: string,
    min: number,
  ) {
    const cleaned = raw.replace(/[^\d.]/g, '');
    if (cleaned === '' || cleaned === '.') {
      setField(key, min as SimulationFormValues[typeof key]);
      return;
    }
    const num = Math.max(min, parseFloat(cleaned));
    if (!Number.isNaN(num)) {
      setField(key, num as SimulationFormValues[typeof key]);
    }
  }

  const rowDescriptions = useMemo(
    () =>
      agents.map((entry) => {
        if (isBuiltInAgentType(entry.type)) {
          const preset = getBuiltInPreset(entry.type);
          return preset.parameters.length > 0
            ? preset.parameters
                .map((field) => `${field.label}=${entry.parameters?.[field.key] ?? field.defaultValue}`)
                .join(', ')
            : 'без дополнительных параметров';
        }

        return entry.name?.trim() || 'custom code';
      }),
    [agents],
  );

  return (
    <>
      <form onSubmit={handleSubmit} className="flex min-w-0 flex-col gap-6">
        <section className="min-w-0">
          <h3 className="mb-3 break-words text-xs font-bold">Настройки симуляции</h3>
          <div className="flex flex-col gap-5">
            <Input
              label="Name"
              value={form.name}
              onChange={(event) => setField('name', event.target.value)}
              disabled={isRunning}
            />
            <Input
              label="Количество агентов"
              type="text"
              inputMode="numeric"
              value={String(form.numAgents)}
              onChange={(event) => handleNumericChange('numAgents', event.target.value, 2, 1000)}
              disabled={isRunning}
            />
            <Input
              label="Capacity (%) от общего количества агентов"
              type="text"
              inputMode="numeric"
              value={String(form.capacityPercent)}
              onChange={(event) => handleNumericChange('capacityPercent', event.target.value, 1, 99)}
              disabled={isRunning}
            />
            <Input
              label="Раунды"
              type="text"
              inputMode="numeric"
              value={String(form.numRounds)}
              onChange={(event) => handleNumericChange('numRounds', event.target.value, 1, 1000)}
              disabled={isRunning}
            />
          </div>
        </section>

        <section className="min-w-0">
          <h3 className="mb-3 break-words text-xs font-bold">Правила поощерения агентов</h3>
          <p className="mb-3 break-words text-xs text-black-400">
            Полезность = посещение * мультипликатор (положительный, если посещение ниже capacity, иначе отрицательный)
          </p>
          <div className="grid min-w-0 grid-cols-2 gap-3 [&>div]:min-w-0">
            <Input
              label="+ мульт"
              type="text"
              inputMode="decimal"
              value={String(form.positiveMultiplier)}
              onChange={(event) => handleDecimalChange('positiveMultiplier', event.target.value, 0)}
              disabled={isRunning}
            />
            <Input
              label="− мульт"
              type="text"
              inputMode="decimal"
              value={String(form.negativeMultiplier)}
              onChange={(event) => handleDecimalChange('negativeMultiplier', event.target.value, 0)}
              disabled={isRunning}
            />
          </div>
        </section>

        <section className="min-w-0">
          <div className="mb-3 flex min-w-0 items-center justify-between gap-2">
            <h3 className="break-words text-xs font-bold">Участвующие агенты</h3>
            <button
              type="button"
              onClick={addAgentRow}
              disabled={isRunning}
              className="text-xs text-[#9871f7] hover:text-[#8760e6] disabled:opacity-40"
            >
              + добавить ряд
            </button>
          </div>

          <div className="flex flex-col gap-2">
            {agents.map((entry, index) => (
              <div key={`${entry.type}-${index}`} className="border border-black-100 bg-[#fcfcfc] p-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="w-7 shrink-0 text-xs font-medium text-black-500">{index + 1}.</span>
                  <div className="flex-1 min-w-0">
                    <Select
                      options={AGENT_OPTIONS}
                      value={entry.type}
                      onChange={(event) => setAgentType(index, event.target.value as AgentBatchEntry['type'])}
                      disabled={isRunning}
                      className="w-full min-w-0"
                    />
                  </div>
                  <input
                    type="text"
                    inputMode="numeric"
                    min={0}
                    max={form.numAgents}
                    value={String(entry.count)}
                    onChange={(event) => {
                      const raw = event.target.value.replace(/\D/g, '');
                      if (raw === '') {
                        setAgentCount(index, 0);
                        return;
                      }
                      setAgentCount(index, Math.min(Number(raw), form.numAgents));
                    }}
                    disabled={isRunning}
                    className="min-w-0 w-14 shrink-0 border-2 border-black-300 text-center"
                  />
                  <button
                    type="button"
                    onClick={() => setActiveSettingsIndex(index)}
                    disabled={isRunning}
                    className="inline-flex h-9 w-9 shrink-0 items-center justify-center border border-black-200 text-black-600 hover:border-[#9871f7] hover:text-[#9871f7] disabled:opacity-40"
                    aria-label={`Открыть настройки агента ${index + 1}`}
                  >
                    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4 fill-none stroke-current stroke-2">
                      <path d="M12 3.75l1.2 2.61 2.84.42-2.06 2.02.49 2.85L12 10.84l-2.47 1.81.49-2.85-2.06-2.02 2.84-.42L12 3.75z" />
                      <circle cx="12" cy="12" r="3.25" />
                      <path d="M4.5 12h1.75m11.5 0H19.5M12 4.5v1.75M12 17.75v1.75M6.7 6.7l1.24 1.24m8.12 8.12 1.24 1.24m0-10.6-1.24 1.24M7.94 16.06 6.7 17.3" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    onClick={() => removeAgentRow(index)}
                    disabled={isRunning || agents.length <= 1}
                    className="inline-flex h-9 w-9 shrink-0 items-center justify-center border border-black-200 text-[#9871f7] hover:border-[#8760e6] hover:text-[#8760e6] disabled:opacity-40"
                    aria-label="Remove"
                  >
                    x
                  </button>
                </div>
                <p className="mt-2 text-xs text-black-500">{rowDescriptions[index]}</p>
              </div>
            ))}
          </div>

          {agentMismatch && (
            <p className="mt-2 text-xs text-amber-600">
              всего агентов: <strong>{totalAgents}</strong> (ожидается {form.numAgents})
            </p>
          )}
          {invalidCustomAgent && (
            <p className="mt-2 text-xs text-amber-600">
              У каждого custom agent должен быть непустой код в окне настроек.
            </p>
          )}
        </section>

        <div className="flex flex-col gap-2 pt-2">
          {!isDone ? (
            <Button type="submit" loading={isRunning} disabled={!canSubmit}>
              {isRunning
                ? status === 'creating'
                  ? 'Запускаем'
                  : 'Запускаем симуляцию...'
                : 'Запустить симуляцию'}
            </Button>
          ) : (
            <>
              <Button type="submit" variant="secondary" disabled={!canSubmit}>
                Перезапустить
              </Button>
              <Button type="button" variant="ghost" onClick={onReset}>
                обнулить
              </Button>
            </>
          )}
        </div>
      </form>

      {activeEntry && activeSettingsIndex !== null && (
        <AgentSettingsModal
          entry={activeEntry}
          disabled={isRunning}
          onClose={() => setActiveSettingsIndex(null)}
          onParameterChange={(key, value, field) => {
            const nextParameters = {
              ...(activeEntry.parameters ?? {}),
              [key]: field.integer ? Math.round(value) : value,
            };
            setAgentParameters(activeSettingsIndex, nextParameters);
          }}
          onCustomCodeChange={(code) => setCustomAgentCode(activeSettingsIndex, code)}
          onNameChange={(name) => setCustomAgentName(activeSettingsIndex, name)}
        />
      )}
    </>
  );
}
