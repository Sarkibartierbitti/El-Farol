import { useState } from 'react';
import { Button, Input, Select } from '../../components/ui';
import type { SimulationFormValues, AgentBatchEntry } from '../../types';
import { BuiltInAgentType } from '../../types';
import type { SimStatus } from '../../hooks/useSimulation';

const AGENT_OPTIONS = [
  { value: BuiltInAgentType.RANDOM, label: 'Random' },
  { value: BuiltInAgentType.THRESHOLD, label: 'Threshold' },
  { value: BuiltInAgentType.MOVING_AVERAGE, label: 'Moving Average' },
  { value: BuiltInAgentType.ADAPTIVE, label: 'Adaptive' },
  { value: BuiltInAgentType.CONTRARIAN, label: 'Contrarian' },
  { value: BuiltInAgentType.TREND_FOLLOWER, label: 'Trend Follower' },
  { value: BuiltInAgentType.LOYAL, label: 'Loyal' },
  { value: BuiltInAgentType.REGRET_MINIMIZING, label: 'Regret Minimizing' },
];

interface SimulationControls {
  status: SimStatus;
  onRun: (form: SimulationFormValues, agents: AgentBatchEntry[]) => void;
  onReset: () => void;
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
  { type: BuiltInAgentType.THRESHOLD, count: 25 },
  { type: BuiltInAgentType.MOVING_AVERAGE, count: 25 },
  { type: BuiltInAgentType.ADAPTIVE, count: 25 },
  { type: BuiltInAgentType.RANDOM, count: 25 },
];

export function SimulationControls({ status, onRun, onReset }: SimulationControls) {
  const [form, setForm] = useState<SimulationFormValues>(defaultForm);
  const [agents, setAgents] = useState<AgentBatchEntry[]>(defaultAgents);

  const isRunning = status === 'creating' || status === 'simulating';
  const isDone = status === 'done' || status === 'error';

  function setField<K extends keyof SimulationFormValues>(key: K, value: SimulationFormValues[K]) {
    setForm(f => ({ ...f, [key]: value }));
  }

  function setAgentCount(index: number, count: number) {
    setAgents(a => a.map((entry, i) => (i === index ? { ...entry, count } : entry)));
  }

  function setAgentType(index: number, type: BuiltInAgentType) {
    setAgents(a => a.map((entry, i) => (i === index ? { ...entry, type } : entry)));
  }

  function addAgentRow() {
    setAgents(a => [...a, { type: BuiltInAgentType.RANDOM, count: 10 }]);
  }

  function removeAgentRow(index: number) {
    setAgents(a => a.filter((_, i) => i !== index));
  }

  const totalAgents = agents.reduce((sum, a) => sum + a.count, 0);
  const agentMismatch = totalAgents !== form.numAgents;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
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
    if (!isNaN(num)) setField(key, num as SimulationFormValues[typeof key]);
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6 min-w-0">
      <section className="min-w-0">
        <h3 className="text-xs font-bold mb-3 break-words">
          Настройки симуляции
        </h3>
        <div className="flex flex-col gap-5">
          <Input
            label="Name"
            value={form.name}
            onChange={e => setField('name', e.target.value)}
            disabled={isRunning}
          />
          <Input
            label="Количество агентов"
            type="text"
            inputMode="numeric"
            value={String(form.numAgents)}
            onChange={e => handleNumericChange('numAgents', e.target.value, 2, 1000)}
            disabled={isRunning}
          />
          <Input
            label="Capacity (%) от общего количества агентов"
            type="text"
            inputMode="numeric"
            value={String(form.capacityPercent)}
            onChange={e => handleNumericChange('capacityPercent', e.target.value, 1, 99)}
            disabled={isRunning}
          />
          <Input
            label="Раунды"
            type="text"
            inputMode="numeric"
            value={String(form.numRounds)}
            onChange={e => handleNumericChange('numRounds', e.target.value, 1, 1000)}
            disabled={isRunning}
          />
        </div>
      </section>

      <section className="min-w-0">
        <h3 className="text-xs font-bold mb-3 break-words">
          Правила поощерения агентов
        </h3>
        <p className="text-xs text-black-400 mb-3 break-words">
          Полезность = посещение * мультипликатор (положительный, если посещение ниже capacity, иначе отрицательный)
        </p>
        <div className="grid grid-cols-2 gap-3 min-w-0 [&>div]:min-w-0">
          <Input
            label="+ мульт"
            type="text"
            inputMode="decimal"
            value={String(form.positiveMultiplier)}
            onChange={e => handleDecimalChange('positiveMultiplier', e.target.value, 0)}
            disabled={isRunning}
          />
          <Input
            label="− мульт"
            type="text"
            inputMode="decimal"
            value={String(form.negativeMultiplier)}
            onChange={e => handleDecimalChange('negativeMultiplier', e.target.value, 0)}
            disabled={isRunning}
          />
        </div>
      </section>

      <section className="min-w-0">
        <div className="flex items-center justify-between gap-2 mb-3 min-w-0">
          <h3 className="text-xs font-bold break-words">
            Участвующие агенты
          </h3>
          <button
            type="button"
            onClick={addAgentRow}
            disabled={isRunning}
            className="text-xs text-[#9871f7] hover:text-[#8760e6] disabled:opacity-40"
          >
            + добавить ряд
          </button>
        </div>
      </section>

      <section className="min-w-0">
        <div className="flex flex-col gap-2">
          {agents.map((entry, i) => (
            <div key={i} className="flex items-center gap-2 min-w-0">
              <div className="flex-1 min-w-0">
                <Select
                  options={AGENT_OPTIONS}
                  value={entry.type}
                  onChange={e => setAgentType(i, e.target.value as BuiltInAgentType)}
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
                onChange={e => {
                  const raw = e.target.value.replace(/\D/g, '');  
                  if (raw === '') {
                    setAgentCount(i, 0);
                    return;
                  }
                  const num = Number(raw);
                  setAgentCount(i, Math.min(num, form.numAgents));
                }}
                disabled={isRunning}
                className="min-w-0 w-12 shrink-0 rounded-md text-center border-2 border-black-300"
              />
              <button
                type="button"
                onClick={() => removeAgentRow(i)}
                disabled={isRunning || agents.length <= 1}
                className="text-[#9871f7] hover:text-[#8760e6] disabled:opacity-40"
                aria-label="Remove"
              ></button>
            </div>
          ))}
        </div>

        {agentMismatch && (
          <p className="mt-2 text-xs text-amber-600">
            всего агентов: <strong>{totalAgents}</strong> (ожидается {form.numAgents})
          </p>
        )}
      </section>

      <div className="flex flex-col gap-2 pt-2">
        {!isDone ? (
          <Button type="submit" loading={isRunning} disabled={isRunning}>
            {isRunning
              ? status === 'creating'
                ? 'Запускаем'
                : 'Запускаем симуляцию...'
              : 'Запустить симуляцию'}
          </Button>
        ) : (
          <>
            <Button type="submit" variant="secondary">
              Перезапустить
            </Button>
            <Button type="button" variant="ghost" onClick={onReset}>
              обнулить
            </Button>
          </>
        )}
      </div>
    </form>
  );
}
