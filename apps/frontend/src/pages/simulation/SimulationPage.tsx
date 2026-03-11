import { useRef, useState, useCallback, useEffect } from 'react';
  import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    ReferenceLine,
    ResponsiveContainer,
    Legend,
  } from 'recharts';
  import { useSimulation } from '../../hooks/useSimulation';
  import { SimulationControls } from './SimulationControls';
  import type { GameStats } from '../../types';

  const SIDEBAR_MIN = 240;
  const SIDEBAR_MAX = 560;
  const SIDEBAR_DEFAULT = 340;
  
  function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
    return (
      <div className="bg-white border border-black-100 p-5">
        <p className="text-xs text-gray-400 uppercase">{label}</p>
        <p className="text-2xl text-black-1000">{value}</p>
      </div>
    );
  }
  
  function StatsGrid({ stats, capacity }: { stats: GameStats; capacity: number }) {
    const efficiencyPct = (stats.efficiency * 100).toFixed(1);
    const capacityPct = ((stats.averageAttendance / capacity) * 100).toFixed(0);
  
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <StatCard
          label="Эффективность"
          value={`${efficiencyPct}%`}
          sub=""
        />
        <StatCard
          label="Avg посещение"
          value={stats.averageAttendance.toFixed(1)}
          sub=""
        />
        <StatCard
          label="среднее отклонение"
          value={stats.attendanceStdDev.toFixed(2)}
          sub=""
        />
        <StatCard
          label="меньше cap"
          value={`${stats.roundsWithinCapacity}`}
          sub={`of ${stats.totalRounds} rounds`}
        />
        <StatCard
          label="больше cap"
          value={`${stats.roundsOverCapacity}`}
          sub={`of ${stats.totalRounds} rounds`}
        />
        <StatCard
          label="Итоговая Полезность"
          value={stats.totalBenefit.toFixed(0)}
          sub={`avg ${stats.averageBenefit.toFixed(1)} / round`}
        />
      </div>
    );
  }
  
export function SimulationPage() {
    const sim = useSimulation();
    const showChart = sim.chartData.length > 0;
    const showStats = sim.stats !== null && sim.capacity !== null;

    const [sidebarWidth, setSidebarWidth] = useState(SIDEBAR_DEFAULT);
    const isDragging = useRef(false);
    const startX = useRef(0);
    const startWidth = useRef(SIDEBAR_DEFAULT);

    const handleResizeStart = useCallback((e: React.MouseEvent) => {
      isDragging.current = true;
      startX.current = e.clientX;
      startWidth.current = sidebarWidth;
      e.preventDefault();
    }, [sidebarWidth]);

    const handleMouseMove = useCallback(
      (e: MouseEvent) => {
        if (!isDragging.current) return;
        const dx = e.clientX - startX.current;
        const next = Math.min(SIDEBAR_MAX, Math.max(SIDEBAR_MIN, startWidth.current + dx));
        setSidebarWidth(next);
      },
      []
    );

    const handleMouseUp = useCallback(() => {
      isDragging.current = false;
    }, []);

    useEffect(() => {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }, [handleMouseMove, handleMouseUp]);

    return (
      <div>
        <div className="flex flex-col lg:flex-row gap-6">
          <aside
            className="relative shrink-0"
            style={{ width: sidebarWidth }}
          >
            <div className="bg-white border border-black-200 p-5 ">
              <SimulationControls
                status={sim.status}
                onRun={sim.run}
                onReset={sim.reset}
              />
            </div>
            <div
              role="separator"
              aria-orientation="vertical"
              onMouseDown={handleResizeStart}
              className="absolute top-0 right-0 w-1.5 h-full cursor-col-resize hover:bg-[#9871f7]/30 active:bg-[#9871f7]/50"
            />
          </aside>
  
          {/* Main content */}
          <div className="flex min-w-0 flex-col gap-5">
  
            {/* Error state */}
            {sim.status === 'error' && sim.error && (
              <div>
                <strong>Error:</strong> {sim.error}
              </div>
            )}
  
            {/* Loading state */}
            {(sim.status === 'creating' || sim.status === 'simulating') && (
              <div className="bg-white-50 border border-black-100 rounded-lg">
                {sim.status === 'creating' ? 'Creating game and adding agents…' : 'Running simulation…'}
              </div>
            )}
  
            {/* Empty / idle state */}
            {sim.status === 'idle' && (
              <div>
                здесь будут результаты симуляции
              </div>
            )}
  
            {showChart && (
              <div className="bg-white border border-black-200 p-5">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-base font-bold text-black-900">Посещение от раунда</h2>
                </div>
                <ResponsiveContainer width="100%" height={400}>
                  <LineChart data={sim.chartData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                    <CartesianGrid/>
                    <XAxis
                      dataKey="round"
                      tick={{ fontSize: 11 }}
                      label={{ value: 'Раунд', position: 'insideBottom', offset: -4}}
                    />
                    <YAxis
                      tick={{ fontSize: 11 }}
                      label={{ value: 'Посещение', angle: -90, position: 'insideLeft' }}
                      domain={[0, sim.numAgents ?? 0]}
                    />
                    <Legend
                        wrapperStyle={{ fontSize: 12 }}
                        formatter={() => ('Посещение')}
                    />
                    {sim.capacity !== null && (
                      <ReferenceLine
                        y={sim.capacity}
                        stroke="#f4bb73"
                        label={{
                          value: `Вмещаемость (${sim.capacity})`,
                          position: 'insideTopRight',
                          fontSize: 11,
                          fill: '#f4bb73',
                        }}
                      />
                    )}
                    <Line
                      type="monotone"
                      dataKey="attendance"
                      stroke="#9871f7"
                      dot={false}
                      strokeWidth={1.5}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
  
            {/* Stats */}
            {showStats && (
              <div>
                <h2 className="text-base font-semibold text-black-900 mb-3">Статистика</h2>
                <StatsGrid stats={sim.stats!} capacity={sim.capacity!} />
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }
  