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


  function setAgentCount(index: number, count: number) {
    setAgents(a => a.map((entry, i) => (i === index ? { ...entry, count } : entry)));
  }

  function setAgentType(index: number, type: BuiltInAgentType) {
    setAgents(a => a.map((entry, i) => (i === index ? { ...entry, type } : entry)));
  }

  const totalAgents = agents.reduce((sum, a) => sum + a.count, 0);
  const agentMismatch = totalAgents !== form.numAgents;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onRun(form, agents);
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      <section>
        <h3 className="text-xs font-bold mb-3">
          Настройки симуляции
        </h3>
        <div className="flex flex-col gap-5">
          <Input
            label="Name"
            value={form.name}
            disabled={isRunning}
          />
          <Input
            label="Количество агентов"
            type="number"
            min={2}
            max={1000}
            value={form.numAgents}
            disabled={isRunning}
          />
          <Input
            label="Capacity"
            type="number"
            min={1}
            max={99}
            value={form.capacityPercent}
            disabled={isRunning}
          />
          <Input
            label="Раунды"
            type="number"
            min={1}
            max={1000}
            value={form.numRounds}
            disabled={isRunning}
          />
        </div>
      </section>


      <section>
        <div className="flex flex-col gap-2">
          {agents.map((entry, i) => (
            <div key={i} className="flex items-center gap-2">
              <Select
                options={AGENT_OPTIONS}
                value={entry.type}
                onChange={e => setAgentType(i, e.target.value as BuiltInAgentType)}
                disabled={isRunning}
                className="flex-1"
              />
              <input
                type="number"
                min={0}
                max={form.numAgents}
                value={entry.count}
                onChange={e => setAgentCount(i, Number(e.target.value))}
                disabled={isRunning}
                className="w-16 rounded-md text-center flex items-center justify-center border-2 border-black-300"
              />
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
