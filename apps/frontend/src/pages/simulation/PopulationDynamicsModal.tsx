import { useEffect, useMemo, useState } from 'react';
import { Button, Input, Select } from '../../components/ui';
import type {
  PopulationArrivalConfig,
  PopulationArrivalDistribution,
  PopulationDepartureConfig,
  PopulationDepartureDistribution,
  PopulationDynamicsConfig,
} from '../../types';

interface PopulationDynamicsModalProps {
  value: PopulationDynamicsConfig;
  totalAgents: number;
  disabled: boolean;
  onClose: () => void;
  onSave: (config: PopulationDynamicsConfig) => void;
}

type PopulationDraftState = {
  enabled: boolean;
  initialActiveAgents: string;
  minActiveAgents: string;
  maxActiveAgents: string;
  utilitySensitivity: string;
  arrivalDistribution: PopulationArrivalDistribution;
  arrivalMean: string;
  arrivalMin: string;
  arrivalMax: string;
  arrivalShape: string;
  departureDistribution: PopulationDepartureDistribution;
  departureMean: string;
  departureMin: string;
  departureMax: string;
  departureShape: string;
  departureProbability: string;
};

const arrivalOptions = [
  { value: 'poisson', label: 'Пуассон' },
  { value: 'uniform', label: 'Равномерное' },
  { value: 'exponential', label: 'Экспоненциальное' },
  { value: 'gamma', label: 'Гамма' },
];

const departureOptions = [
  { value: 'binomial', label: 'Биномиальное' },
  { value: 'uniform', label: 'Равномерное' },
  { value: 'exponential', label: 'Экспоненциальное' },
  { value: 'gamma', label: 'Гамма' },
];

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

function parseInteger(raw: string, min: number, max: number): number | null {
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

function parseDecimal(raw: string, min: number, max?: number): number | null {
  const cleaned = sanitizeDecimalInput(raw);
  if (cleaned === '' || cleaned === '.') {
    return null;
  }
  const parsed = Number(cleaned);
  if (Number.isNaN(parsed)) {
    return null;
  }
  const bounded = Math.max(min, parsed);
  return max === undefined ? bounded : Math.min(bounded, max);
}

function createDraft(value: PopulationDynamicsConfig): PopulationDraftState {
  return {
    enabled: value.enabled,
    initialActiveAgents: String(value.initialActiveAgents),
    minActiveAgents: String(value.minActiveAgents),
    maxActiveAgents: String(value.maxActiveAgents),
    utilitySensitivity: String(value.utilitySensitivity),
    arrivalDistribution: value.arrivals.distribution,
    arrivalMean: String(value.arrivals.mean ?? 0),
    arrivalMin: String(value.arrivals.min ?? 0),
    arrivalMax: String(value.arrivals.max ?? 0),
    arrivalShape: String(value.arrivals.shape ?? 2),
    departureDistribution: value.departures.distribution,
    departureMean: String(value.departures.mean ?? 0),
    departureMin: String(value.departures.min ?? 0),
    departureMax: String(value.departures.max ?? 0),
    departureShape: String(value.departures.shape ?? 2),
    departureProbability: String(value.departures.probability ?? 0),
  };
}

export function normalizePopulationDynamicsConfig(
  value: PopulationDynamicsConfig,
  totalAgents: number,
): PopulationDynamicsConfig {
  const maxPool = Math.max(0, totalAgents);
  const maxActiveAgents = Math.max(0, Math.min(Math.floor(value.maxActiveAgents), maxPool));
  const minActiveAgents = Math.max(0, Math.min(Math.floor(value.minActiveAgents), maxActiveAgents));
  const initialActiveAgents = Math.max(
    minActiveAgents,
    Math.min(Math.floor(value.initialActiveAgents), maxActiveAgents),
  );

  const arrivals: PopulationArrivalConfig = {
    distribution: value.arrivals.distribution,
    mean: Math.max(0, value.arrivals.mean ?? 0),
    min: Math.max(0, Math.floor(value.arrivals.min ?? 0)),
    max: Math.max(0, Math.floor(value.arrivals.max ?? 0)),
    shape: Math.max(0.1, value.arrivals.shape ?? 2),
  };

  const departures: PopulationDepartureConfig = {
    distribution: value.departures.distribution,
    mean: Math.max(0, value.departures.mean ?? 0),
    min: Math.max(0, Math.floor(value.departures.min ?? 0)),
    max: Math.max(0, Math.floor(value.departures.max ?? 0)),
    shape: Math.max(0.1, value.departures.shape ?? 2),
    probability: Math.max(0, Math.min(value.departures.probability ?? 0, 1)),
  };

  return {
    enabled: value.enabled,
    initialActiveAgents,
    minActiveAgents,
    maxActiveAgents,
    utilitySensitivity: Math.max(0, value.utilitySensitivity),
    arrivals,
    departures,
  };
}

export const defaultPopulationDynamicsConfig: PopulationDynamicsConfig = {
  enabled: false,
  initialActiveAgents: 70,
  minActiveAgents: 40,
  maxActiveAgents: 100,
  utilitySensitivity: 0,
  arrivals: {
    distribution: 'poisson',
    mean: 4,
    min: 0,
    max: 8,
    shape: 2,
  },
  departures: {
    distribution: 'binomial',
    probability: 0.04,
    mean: 3,
    min: 0,
    max: 6,
    shape: 2,
  },
};

export function describePopulationDynamics(config: PopulationDynamicsConfig): string {
  if (!config.enabled) {
    return 'Отключена';
  }

  const arrivalLabel = arrivalOptions.find((option) => option.value === config.arrivals.distribution)?.label
    ?? config.arrivals.distribution;
  const departureLabel = departureOptions.find((option) => option.value === config.departures.distribution)?.label
    ?? config.departures.distribution;

  const arrivalDetail = config.arrivals.distribution === 'uniform'
    ? `${config.arrivals.min}-${config.arrivals.max}`
    : `среднее ${config.arrivals.mean}`;
  const departureDetail = config.departures.distribution === 'binomial'
    ? `p=${config.departures.probability}`
    : config.departures.distribution === 'uniform'
      ? `${config.departures.min}-${config.departures.max}`
      : `среднее ${config.departures.mean}`;

  return `Старт ${config.initialActiveAgents}/${config.maxActiveAgents}, приходы: ${arrivalLabel} (${arrivalDetail}), уходы: ${departureLabel} (${departureDetail})`;
}

export function PopulationDynamicsModal({
  value,
  totalAgents,
  disabled,
  onClose,
  onSave,
}: PopulationDynamicsModalProps) {
  const [draft, setDraft] = useState<PopulationDraftState>(() => createDraft(value));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setDraft(createDraft(value));
  }, [value]);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  const normalizedPreview = useMemo(() => {
    return normalizePopulationDynamicsConfig(
      {
        enabled: draft.enabled,
        initialActiveAgents: parseInteger(draft.initialActiveAgents, 0, totalAgents) ?? value.initialActiveAgents,
        minActiveAgents: parseInteger(draft.minActiveAgents, 0, totalAgents) ?? value.minActiveAgents,
        maxActiveAgents: parseInteger(draft.maxActiveAgents, 0, totalAgents) ?? value.maxActiveAgents,
        utilitySensitivity: parseDecimal(draft.utilitySensitivity, 0) ?? value.utilitySensitivity,
        arrivals: {
          distribution: draft.arrivalDistribution,
          mean: parseDecimal(draft.arrivalMean, 0) ?? value.arrivals.mean,
          min: parseInteger(draft.arrivalMin, 0, totalAgents) ?? value.arrivals.min,
          max: parseInteger(draft.arrivalMax, 0, totalAgents) ?? value.arrivals.max,
          shape: parseDecimal(draft.arrivalShape, 0.1) ?? value.arrivals.shape,
        },
        departures: {
          distribution: draft.departureDistribution,
          mean: parseDecimal(draft.departureMean, 0) ?? value.departures.mean,
          min: parseInteger(draft.departureMin, 0, totalAgents) ?? value.departures.min,
          max: parseInteger(draft.departureMax, 0, totalAgents) ?? value.departures.max,
          shape: parseDecimal(draft.departureShape, 0.1) ?? value.departures.shape,
          probability: parseDecimal(draft.departureProbability, 0, 1) ?? value.departures.probability,
        },
      },
      totalAgents,
    );
  }, [draft, totalAgents, value]);

  function updateDraft<K extends keyof PopulationDraftState>(key: K, nextValue: PopulationDraftState[K]) {
    setDraft((current) => ({ ...current, [key]: nextValue }));
  }

  function handleSave() {
    const initialActiveAgents = parseInteger(draft.initialActiveAgents, 0, totalAgents);
    const minActiveAgents = parseInteger(draft.minActiveAgents, 0, totalAgents);
    const maxActiveAgents = parseInteger(draft.maxActiveAgents, 0, totalAgents);
    const utilitySensitivity = parseDecimal(draft.utilitySensitivity, 0);

    if (
      initialActiveAgents === null ||
      minActiveAgents === null ||
      maxActiveAgents === null ||
      utilitySensitivity === null
    ) {
      setError('Поля популяции и чувствительности должны быть заполнены.');
      return;
    }

    if (minActiveAgents > maxActiveAgents) {
      setError('Минимум активных агентов не может быть больше максимума.');
      return;
    }

    if (initialActiveAgents < minActiveAgents || initialActiveAgents > maxActiveAgents) {
      setError('Начальное число активных агентов должно лежать между минимумом и максимумом.');
      return;
    }

    let arrivalConfig: PopulationArrivalConfig;
    if (draft.arrivalDistribution === 'uniform') {
      const min = parseInteger(draft.arrivalMin, 0, totalAgents);
      const max = parseInteger(draft.arrivalMax, 0, totalAgents);
      if (min === null || max === null || min > max) {
        setError('Для равномерного распределения прихода задайте корректные min и max.');
        return;
      }
      arrivalConfig = { distribution: 'uniform', min, max };
    } else {
      const mean = parseDecimal(draft.arrivalMean, 0);
      if (mean === null) {
        setError('Для прихода укажите среднее значение.');
        return;
      }
      arrivalConfig = { distribution: draft.arrivalDistribution, mean };
      if (draft.arrivalDistribution === 'gamma') {
        const shape = parseDecimal(draft.arrivalShape, 0.1);
        if (shape === null) {
          setError('Для гамма-распределения прихода нужен параметр shape.');
          return;
        }
        arrivalConfig.shape = shape;
      }
    }

    let departureConfig: PopulationDepartureConfig;
    if (draft.departureDistribution === 'binomial') {
      const probability = parseDecimal(draft.departureProbability, 0, 1);
      if (probability === null) {
        setError('Для биномиального распределения ухода укажите вероятность p.');
        return;
      }
      departureConfig = { distribution: 'binomial', probability };
    } else if (draft.departureDistribution === 'uniform') {
      const min = parseInteger(draft.departureMin, 0, totalAgents);
      const max = parseInteger(draft.departureMax, 0, totalAgents);
      if (min === null || max === null || min > max) {
        setError('Для равномерного распределения ухода задайте корректные min и max.');
        return;
      }
      departureConfig = { distribution: 'uniform', min, max };
    } else {
      const mean = parseDecimal(draft.departureMean, 0);
      if (mean === null) {
        setError('Для ухода укажите среднее значение.');
        return;
      }
      departureConfig = { distribution: draft.departureDistribution, mean };
      if (draft.departureDistribution === 'gamma') {
        const shape = parseDecimal(draft.departureShape, 0.1);
        if (shape === null) {
          setError('Для гамма-распределения ухода нужен параметр shape.');
          return;
        }
        departureConfig.shape = shape;
      }
    }

    setError(null);
    onSave(normalizePopulationDynamicsConfig({
      enabled: draft.enabled,
      initialActiveAgents,
      minActiveAgents,
      maxActiveAgents,
      utilitySensitivity,
      arrivals: arrivalConfig,
      departures: departureConfig,
    }, totalAgents));
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-4" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Настройки динамики популяции"
        className="w-full max-w-3xl border border-black-200 bg-white p-5 shadow-lg"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase text-black-500">Динамика популяции</p>
            <h4 className="text-lg font-bold text-black-900">Приходы и уходы агентов по раундам</h4>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-sm text-black-500 hover:text-black-900"
            aria-label="Закрыть окно динамики популяции"
          >
            закрыть
          </button>
        </div>

        <div className="mb-4 border border-black-100 bg-[#faf6ef] p-3 text-sm text-black-700">
          <p className="font-medium text-black-900">Как это работает</p>
          <p className="mt-1">
            `numAgents` остается общим пулом агентов. В каждом раунде активная подгруппа меняется: часть агентов
            уходит, часть возвращается из неактивного пула.
          </p>
          <p className="mt-1">
            Для экспоненциального и гамма-распределения непрерывный сэмпл округляется вниз до целого числа агентов.
          </p>
        </div>

        <div className="mb-5 flex items-center gap-3 rounded-md border border-black-100 p-3">
          <input
            id="population-dynamics-enabled"
            type="checkbox"
            checked={draft.enabled}
            onChange={(event) => updateDraft('enabled', event.target.checked)}
            disabled={disabled}
            className="h-4 w-4 accent-[#9871f7]"
          />
          <label htmlFor="population-dynamics-enabled" className="text-sm font-medium text-black-900">
            Включить динамику популяции
          </label>
        </div>

        <div className="grid gap-5 lg:grid-cols-2">
          <div className="space-y-4">
            <div>
              <p className="mb-2 text-xs font-bold uppercase text-black-500">Активная популяция</p>
              <div className="grid gap-4 sm:grid-cols-2">
                <Input
                  label="Старт активных"
                  type="text"
                  inputMode="numeric"
                  value={draft.initialActiveAgents}
                  onChange={(event) => updateDraft('initialActiveAgents', sanitizeIntegerInput(event.target.value))}
                  disabled={disabled}
                />
                <Input
                  label="Мин активных"
                  type="text"
                  inputMode="numeric"
                  value={draft.minActiveAgents}
                  onChange={(event) => updateDraft('minActiveAgents', sanitizeIntegerInput(event.target.value))}
                  disabled={disabled}
                />
                <Input
                  label="Макс активных"
                  type="text"
                  inputMode="numeric"
                  value={draft.maxActiveAgents}
                  onChange={(event) => updateDraft('maxActiveAgents', sanitizeIntegerInput(event.target.value))}
                  disabled={disabled}
                />
                <Input
                  label="Чувствительность к полезности"
                  type="text"
                  inputMode="decimal"
                  value={draft.utilitySensitivity}
                  onChange={(event) => updateDraft('utilitySensitivity', sanitizeDecimalInput(event.target.value))}
                  disabled={disabled}
                  hint="0 = полностью внешняя динамика."
                />
              </div>
            </div>

            <div>
              <p className="mb-2 text-xs font-bold uppercase text-black-500">Приходы</p>
              <div className="grid gap-4 sm:grid-cols-2">
                <Select
                  label="Распределение"
                  options={arrivalOptions}
                  value={draft.arrivalDistribution}
                  onChange={(event) =>
                    updateDraft('arrivalDistribution', event.target.value as PopulationArrivalDistribution)}
                  disabled={disabled}
                />
                {draft.arrivalDistribution === 'uniform' ? (
                  <>
                    <Input
                      label="Мин"
                      type="text"
                      inputMode="numeric"
                      value={draft.arrivalMin}
                      onChange={(event) => updateDraft('arrivalMin', sanitizeIntegerInput(event.target.value))}
                      disabled={disabled}
                    />
                    <Input
                      label="Макс"
                      type="text"
                      inputMode="numeric"
                      value={draft.arrivalMax}
                      onChange={(event) => updateDraft('arrivalMax', sanitizeIntegerInput(event.target.value))}
                      disabled={disabled}
                    />
                  </>
                ) : (
                  <Input
                    label="Среднее"
                    type="text"
                    inputMode="decimal"
                    value={draft.arrivalMean}
                    onChange={(event) => updateDraft('arrivalMean', sanitizeDecimalInput(event.target.value))}
                    disabled={disabled}
                  />
                )}
                {draft.arrivalDistribution === 'gamma' && (
                  <Input
                    label="Форма"
                    type="text"
                    inputMode="decimal"
                    value={draft.arrivalShape}
                    onChange={(event) => updateDraft('arrivalShape', sanitizeDecimalInput(event.target.value))}
                    disabled={disabled}
                  />
                )}
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <p className="mb-2 text-xs font-bold uppercase text-black-500">Уходы</p>
              <div className="grid gap-4 sm:grid-cols-2">
                <Select
                  label="Распределение"
                  options={departureOptions}
                  value={draft.departureDistribution}
                  onChange={(event) =>
                    updateDraft('departureDistribution', event.target.value as PopulationDepartureDistribution)}
                  disabled={disabled}
                />
                {draft.departureDistribution === 'binomial' ? (
                  <Input
                    label="Вероятность p"
                    type="text"
                    inputMode="decimal"
                    value={draft.departureProbability}
                    onChange={(event) => updateDraft('departureProbability', sanitizeDecimalInput(event.target.value))}
                    disabled={disabled}
                  />
                ) : draft.departureDistribution === 'uniform' ? (
                  <>
                    <Input
                      label="Мин"
                      type="text"
                      inputMode="numeric"
                      value={draft.departureMin}
                      onChange={(event) => updateDraft('departureMin', sanitizeIntegerInput(event.target.value))}
                      disabled={disabled}
                    />
                    <Input
                      label="Макс"
                      type="text"
                      inputMode="numeric"
                      value={draft.departureMax}
                      onChange={(event) => updateDraft('departureMax', sanitizeIntegerInput(event.target.value))}
                      disabled={disabled}
                    />
                  </>
                ) : (
                  <Input
                    label="Среднее"
                    type="text"
                    inputMode="decimal"
                    value={draft.departureMean}
                    onChange={(event) => updateDraft('departureMean', sanitizeDecimalInput(event.target.value))}
                    disabled={disabled}
                  />
                )}
                {draft.departureDistribution === 'gamma' && (
                  <Input
                    label="Форма"
                    type="text"
                    inputMode="decimal"
                    value={draft.departureShape}
                    onChange={(event) => updateDraft('departureShape', sanitizeDecimalInput(event.target.value))}
                    disabled={disabled}
                  />
                )}
              </div>
            </div>

            <div className="border border-black-100 bg-white p-4 text-sm text-black-700">
              <p className="font-medium text-black-900">Предпросмотр</p>
              <p className="mt-2">Активные агенты: старт {normalizedPreview.initialActiveAgents}, диапазон {normalizedPreview.minActiveAgents}-{normalizedPreview.maxActiveAgents}.</p>
              <p className="mt-2">При хорошем результате приток растет, а отток падает; при плохом результате наоборот. Сила эффекта задается параметром чувствительности.</p>
            </div>
          </div>
        </div>

        {error && <p className="mt-4 text-xs text-amber-600">{error}</p>}

        <div className="mt-5 flex items-center justify-end gap-3">
          <Button type="button" variant="ghost" onClick={onClose}>
            Отмена
          </Button>
          <Button type="button" variant="secondary" onClick={handleSave}>
            Сохранить
          </Button>
        </div>
      </div>
    </div>
  );
}
