import { useEffect, useState } from 'react';
import { Button, Input, Select } from '../../components/ui';
import type { AgentBatchEntry, SimulationFormValues } from '../../types';
import { BuiltInAgentType, CUSTOM_AGENT_TYPE } from '../../types';
import type { SimStatus } from '../../hooks/useSimulation';
import {
  AGENT_OPTIONS,
  CUSTOM_AGENT_EXAMPLE,
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

function SettingsIcon() {
  return (
    <svg viewBox="0 0 64 64" aria-hidden="true" className="h-4 w-4 fill-none stroke-current" strokeWidth="3">
      <path d="M45 14.67l-2.76 2a1 1 0 0 1-1 .11l-3.59-1.48a1 1 0 0 1-.61-.76l-.66-3.77a1 1 0 0 0-1-.84h-4.86a1 1 0 0 0-1 .77l-.93 3.72a1 1 0 0 1-.53.65l-3.3 1.66a1 1 0 0 1-1-.08l-3-2.13a1 1 0 0 0-1.31.12l-3.65 3.74a1 1 0 0 0-.13 1.26l1.87 2.88a1 1 0 0 1 .1.89L16.34 27a1 1 0 0 1-.68.63l-3.85 1.06a1 1 0 0 0-.74 1v4.74a1 1 0 0 0 .8 1l3.9.8a1 1 0 0 1 .72.57l1.42 3.15a1 1 0 0 1-.05.92l-2.13 3.63a1 1 0 0 0 .17 1.24L19.32 49a1 1 0 0 0 1.29.09L23.49 47a1 1 0 0 1 1-.1l3.74 1.67a1 1 0 0 1 .59.75l.66 3.79a1 1 0 0 0 1 .84h4.89a1 1 0 0 0 1-.86l.58-4a1 1 0 0 1 .58-.77l3.58-1.62a1 1 0 0 1 1 .09l3.14 2.12a1 1 0 0 0 1.3-.15L50 45.06a1 1 0 0 0 .09-1.27l-2.08-3a1 1 0 0 1-.09-1l1.48-3.43a1 1 0 0 1 .71-.59l3.66-.77a1 1 0 0 0 .8-1v-4.58a1 1 0 0 0-.8-1l-3.72-.78a1 1 0 0 1-.73-.62l-1.45-3.65a1 1 0 0 1 .11-.94l2.15-3.14A1 1 0 0 0 50 18l-3.71-3.25A1 1 0 0 0 45 14.67Z" />
      <circle cx="32.82" cy="31.94" r="9.94" />
    </svg>
  );
}

const defaultForm: SimulationFormValues = {
  name: 'El Farol Simulation',
  numAgents: 100,
  capacityPercent: 60,
  numRounds: 100,
  positiveMultiplier: 1,
  negativeMultiplier: 1,
};

type SimulationFormInputValues = {
  name: string;
  numAgents: string;
  capacityPercent: string;
  numRounds: string;
  positiveMultiplier: string;
  negativeMultiplier: string;
};

const defaultFormInputs: SimulationFormInputValues = {
  name: defaultForm.name,
  numAgents: String(defaultForm.numAgents),
  capacityPercent: String(defaultForm.capacityPercent),
  numRounds: String(defaultForm.numRounds),
  positiveMultiplier: String(defaultForm.positiveMultiplier),
  negativeMultiplier: String(defaultForm.negativeMultiplier),
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

  const parsed = Number(cleaned);
  if (Number.isNaN(parsed)) {
    return field.defaultValue;
  }

  const capped =
    field.max !== undefined ? Math.min(field.max, Math.max(field.min, parsed)) : Math.max(field.min, parsed);

  return field.integer ? Math.round(capped) : Number(capped.toFixed(4));
}

function sanitizeIntegerInput(raw: string): string {
  return raw.replace(/\D/g, '');
}

function sanitizeDecimalInput(raw: string): string {
  const cleaned = raw.replace(/[^\d.]/g, '');
  const firstDot = cleaned.indexOf('.');
  if (firstDot === -1) {
    return cleaned;
  }
  return `${cleaned.slice(0, firstDot + 1)}${cleaned.slice(firstDot + 1).replace(/\./g, '')}`;
}

function parseIntegerInput(raw: string, min: number, max: number): number | null {
  const cleaned = sanitizeIntegerInput(raw);
  if (!cleaned) {
    return null;
  }

  const parsed = Number(cleaned);
  if (Number.isNaN(parsed)) {
    return null;
  }

  return Math.max(min, Math.min(parsed, max));
}

function parseDecimalInput(raw: string, min: number): number | null {
  const cleaned = sanitizeDecimalInput(raw);
  if (cleaned === '' || cleaned === '.') {
    return null;
  }

  const parsed = Number(cleaned);
  if (Number.isNaN(parsed)) {
    return null;
  }

  return Math.max(min, parsed);
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
  const [draftParameters, setDraftParameters] = useState<Record<string, string>>({});
  const [closeError, setCloseError] = useState<string | null>(null);

  useEffect(() => {
    if (!builtInPreset) {
      setDraftParameters({});
      return;
    }

    const nextDrafts = Object.fromEntries(
      builtInPreset.parameters.map((field) => [
        field.key,
        String(entry.parameters?.[field.key] ?? field.defaultValue),
      ]),
    );

    setDraftParameters(nextDrafts);
  }, [builtInPreset, entry.type]);

  function tryClose() {
    const hasInvalidBuiltInField =
      builtInPreset?.parameters.some((field) => {
        const raw = draftParameters[field.key] ?? '';
        if (raw.trim() === '') {
          return true;
        }
        const parsed = field.integer
          ? parseIntegerInput(raw, field.min, field.max ?? Number.MAX_SAFE_INTEGER)
          : parseDecimalInput(raw, field.min);
        return parsed === null;
      }) ?? false;
    const hasEmptyCustomField =
      !builtInPreset && ((entry.name ?? '').trim() === '' || (entry.customCode ?? '').trim() === '');

    if (hasInvalidBuiltInField || hasEmptyCustomField) {
      setCloseError('Заполните все поля, чтобы закрыть окно настроек.');
      return;
    }

    setCloseError(null);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-4" onClick={tryClose}>
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
            onClick={tryClose}
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
                    value={draftParameters[field.key] ?? String(entry.parameters?.[field.key] ?? field.defaultValue)}
                    hint={`${field.description} default = ${field.defaultValue}`}
                    onChange={(event) => {
                      const raw = field.integer
                        ? sanitizeIntegerInput(event.target.value)
                        : sanitizeDecimalInput(event.target.value);
                      setDraftParameters((current) => ({ ...current, [field.key]: raw }));

                      const cleaned = field.integer ? sanitizeIntegerInput(raw) : sanitizeDecimalInput(raw);
                      if (cleaned === '' || cleaned === '.') {
                        setCloseError(null);
                        return;
                      }

                      const parsed = Number(cleaned);
                      if (Number.isNaN(parsed)) {
                        setCloseError(null);
                        return;
                      }

                      setCloseError(null);
                      onParameterChange(field.key, clampParameterValue(field, raw), field);
                    }}
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
              <Button type="button" variant="secondary" onClick={tryClose}>
                Готово
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <Input
              label="Название"
              value={entry.name ?? 'Custom Agent'}
              onChange={(event) => {
                setCloseError(null);
                onNameChange(event.target.value);
              }}
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
                onChange={(event) => {
                  setCloseError(null);
                  onCustomCodeChange(event.target.value);
                }}
                disabled={disabled}
                rows={12}
                spellCheck={false}
                className="w-full border border-black-200 bg-white p-3 font-mono text-sm focus:border-[#9871f7] focus:outline-none focus:ring-1 focus:ring-[#9871f7]"
              />
            </div>

            <div className="flex items-center justify-between gap-3">
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setCloseError(null);
                  onCustomCodeChange(CUSTOM_AGENT_EXAMPLE);
                }}
                disabled={disabled}
              >
                Вставить пример
              </Button>
              <Button type="button" variant="secondary" onClick={tryClose}>
                Готово
              </Button>
            </div>
          </div>
        )}

        {closeError && <p className="mt-3 text-xs text-amber-600">{closeError}</p>}
      </div>
    </div>
  );
}

export function SimulationControls({ status, onRun, onReset }: SimulationControlsProps) {
  const [formInputs, setFormInputs] = useState<SimulationFormInputValues>(defaultFormInputs);
  const [agents, setAgents] = useState<AgentBatchEntry[]>(defaultAgents);
  const [agentCountInputs, setAgentCountInputs] = useState<string[]>(defaultAgents.map((entry) => String(entry.count)));
  const [activeSettingsIndex, setActiveSettingsIndex] = useState<number | null>(null);

  const isRunning = status === 'creating' || status === 'simulating';
  const isDone = status === 'done' || status === 'error';

  function setFormInput<K extends keyof SimulationFormInputValues>(key: K, value: SimulationFormInputValues[K]) {
    setFormInputs((current) => ({ ...current, [key]: value }));
  }

  function setAgentCount(index: number, count: number) {
    setAgents((current) => current.map((entry, i) => (i === index ? { ...entry, count } : entry)));
  }

  function setAgentCountInput(index: number, value: string) {
    setAgentCountInputs((current) => current.map((item, i) => (i === index ? value : item)));
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
    setAgentCountInputs((current) => [...current, '10']);
  }

  function removeAgentRow(index: number) {
    setAgents((current) => current.filter((_, i) => i !== index));
    setAgentCountInputs((current) => current.filter((_, i) => i !== index));
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

  const parsedNumAgents = parseIntegerInput(formInputs.numAgents, 2, 1000);
  const parsedCapacityPercent = parseIntegerInput(formInputs.capacityPercent, 1, 99);
  const parsedNumRounds = parseIntegerInput(formInputs.numRounds, 1, 1000);
  const parsedPositiveMultiplier = parseDecimalInput(formInputs.positiveMultiplier, 0);
  const parsedNegativeMultiplier = parseDecimalInput(formInputs.negativeMultiplier, 0);

  const parsedAgentCounts = agentCountInputs.map((raw) => parseIntegerInput(raw, 0, parsedNumAgents ?? 1000));
  const totalAgents = parsedAgentCounts.reduce((sum, count) => sum + (count ?? 0), 0);

  const hasEmptyFormInput = Object.values(formInputs).some((value) => value.trim() === '');
  const hasEmptyAgentCountInput = agentCountInputs.some((value) => value.trim() === '');
  const hasInvalidNumericInput =
    parsedNumAgents === null ||
    parsedCapacityPercent === null ||
    parsedNumRounds === null ||
    parsedPositiveMultiplier === null ||
    parsedNegativeMultiplier === null ||
    parsedAgentCounts.some((count) => count === null);

  const hasEmptyInputs = hasEmptyFormInput || hasEmptyAgentCountInput;
  const agentMismatch = !hasEmptyInputs && !hasInvalidNumericInput && parsedNumAgents !== null && totalAgents !== parsedNumAgents;
  const invalidCustomAgent = agents.some(
    (entry) => entry.type === CUSTOM_AGENT_TYPE && !(entry.customCode ?? '').trim(),
  );
  const activeEntry = activeSettingsIndex !== null ? agents[activeSettingsIndex] : null;
  const canSubmit = !isRunning && !hasEmptyInputs && !hasInvalidNumericInput && !agentMismatch && !invalidCustomAgent;

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (
      !canSubmit ||
      parsedNumAgents === null ||
      parsedCapacityPercent === null ||
      parsedNumRounds === null ||
      parsedPositiveMultiplier === null ||
      parsedNegativeMultiplier === null
    ) {
      return;
    }

    const normalizedAgents = agents.map((entry, index) => ({
      ...entry,
      count: parsedAgentCounts[index] ?? 0,
    }));

    onRun(
      {
        name: formInputs.name,
        numAgents: parsedNumAgents,
        capacityPercent: parsedCapacityPercent,
        numRounds: parsedNumRounds,
        positiveMultiplier: parsedPositiveMultiplier,
        negativeMultiplier: parsedNegativeMultiplier,
      },
      normalizedAgents,
    );
  }

  return (
    <>
      <form onSubmit={handleSubmit} className="flex min-w-0 flex-col gap-6">
        <section className="min-w-0">
          <h3 className="mb-3 break-words text-xs font-bold">Настройки симуляции</h3>
          <div className="flex flex-col gap-5">
            <Input
              label="Name"
              value={formInputs.name}
              onChange={(event) => setFormInput('name', event.target.value)}
              disabled={isRunning}
            />
            <Input
              label="Количество агентов"
              type="text"
              inputMode="numeric"
              value={formInputs.numAgents}
              onChange={(event) => setFormInput('numAgents', sanitizeIntegerInput(event.target.value))}
              disabled={isRunning}
            />
            <Input
              label="Capacity (%) от общего количества агентов"
              type="text"
              inputMode="numeric"
              value={formInputs.capacityPercent}
              onChange={(event) => setFormInput('capacityPercent', sanitizeIntegerInput(event.target.value))}
              disabled={isRunning}
            />
            <Input
              label="Раунды"
              type="text"
              inputMode="numeric"
              value={formInputs.numRounds}
              onChange={(event) => setFormInput('numRounds', sanitizeIntegerInput(event.target.value))}
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
              value={formInputs.positiveMultiplier}
              onChange={(event) => setFormInput('positiveMultiplier', sanitizeDecimalInput(event.target.value))}
              disabled={isRunning}
            />
            <Input
              label="− мульт"
              type="text"
              inputMode="decimal"
              value={formInputs.negativeMultiplier}
              onChange={(event) => setFormInput('negativeMultiplier', sanitizeDecimalInput(event.target.value))}
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
              <div key={`${entry.type}-${index}`} className="flex items-center gap-2 min-w-0">
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
                  max={parsedNumAgents ?? 1000}
                  value={agentCountInputs[index] ?? ''}
                  onChange={(event) => {
                    const raw = sanitizeIntegerInput(event.target.value);
                    setAgentCountInput(index, raw);

                    if (raw === '') {
                      return;
                    }

                    const parsed = parseIntegerInput(raw, 0, parsedNumAgents ?? 1000);
                    if (parsed !== null) {
                      setAgentCount(index, parsed);
                    }
                  }}
                  disabled={isRunning}
                  className="min-w-0 w-12 shrink-0 rounded-md text-center border-2 border-black-300"
                />
                <button
                  type="button"
                  onClick={() => setActiveSettingsIndex(index)}
                  disabled={isRunning}
                  className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-black-200 text-black-600 hover:border-[#9871f7] hover:text-[#9871f7] disabled:opacity-40"
                  aria-label={`Открыть настройки агента ${index + 1}`}
                >
                  <SettingsIcon />
                </button>
                <button
                  type="button"
                  onClick={() => removeAgentRow(index)}
                  disabled={isRunning || agents.length <= 1}
                  className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-black-200 text-[#9871f7] hover:border-[#8760e6] hover:text-[#8760e6] disabled:opacity-40"
                  aria-label="Remove"
                >
                  ×
                </button>
              </div>
            ))}
          </div>

          {agentMismatch && (
            <p className="mt-2 text-xs text-amber-600">
              всего агентов: <strong>{totalAgents}</strong> (ожидается {parsedNumAgents})
            </p>
          )}
          {hasEmptyInputs && (
            <p className="mt-2 text-xs text-amber-600">
              Заполните все поля ввода перед запуском симуляции.
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
          key={`${activeSettingsIndex}-${activeEntry.type}`}
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
