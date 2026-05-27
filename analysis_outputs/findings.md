# 25-scenario findings

All scenarios: 150 rounds, capacity 60% unless noted, benefit = ±1/attendee.
Per-scenario PNGs in `scenarios/`. Grid overview: `scenarios_grid.png`.

## Headline numbers

| # | scenario                        | avg   | σ    | over-cap | eff   |
|--:|---------------------------------|------:|-----:|---------:|------:|
| 01| All Random                      | 50.41 | 5.26 |  8/150   | 89.9% |
| 02| All Threshold                   | 36.25 |31.59 | 44       | 54.1% |
| 03| All Moving Avg                  | 33.69 |47.09 | 50       | 41.9% |
| 04| **All Adaptive**                |  1.00 | 9.07 |  1       | 62.3% |
| 05| **All Contrarian**              |  0.29 | 3.58 |  0       | 62.7% |
| 06| All Trend Follower              | 49.97 |49.67 | 74       | 32.1% |
| 07| All Loyal                       | 50.00 |50.00 | 75       | 31.3% |
| 08| **All Regret-Min**              | 58.55 | 4.85 | 51       | 72.0% |
| 09| Contrarians vs Threshold        | 36.07 |22.07 | 17       | 76.2% |
| 10| Regret-Min vs Trend             | 50.20 |25.37 | 74       | 47.3% |
| 11| Adaptive vs Random              | 24.87 | 4.11 |  0       | 78.0% |
| 12| Loyal anchors + MA              | 38.04 |38.72 | 50       | 48.4% |
| 13| **Full ecology (8 strategies)** | 38.23 |12.15 |  3       | **84.9%** |
| 14| Full ecology @ cap 30           | 34.32 | 7.71 | **90**   | 66.6%* |
| 15| Full ecology @ cap 50           | 36.33 | 7.64 |  3       | 89.5% |
| 16| Full ecology @ cap 70           | 43.03 |11.92 |  0       | 84.1% |
| 17| Full ecology @ cap 85           | 50.75 |14.32 |  0       | 81.5% |
| 18| Pop steady churn                | 37.06 | 6.01 |  1       | 84.1% |
| 19| **Pop linear growth**           | 37.35 | 8.92 |  0       | 85.6% |
| 20| Pop fade-out (rounds 50–100)    | 16.29 |17.16 |  2       | 55.4% |
| 21| **Pop festival shock (10–30)**  | 19.60 |15.31 |  0       | 59.1% |
| 22| **Pop late bloom (round 40+)**  | 37.99 |22.09 |  6       | 79.4% |
| 23| Pop volatile uniform flows      | 38.25 | 5.87 |  0       | 86.1% |
| 24| Pop gamma heavy-tail            | 37.10 | 8.44 |  1       | 83.9% |
| 25| Pop slow collapse               | 24.91 | 6.85 |  0       | 64.9% |

\* cap=30 has 90/150 over-cap rounds and **−2020 total benefit** — net loss.

## What's interesting

### Homogeneous populations break in characteristic ways
- **04 Adaptive** and **05 Contrarian** lock to attendance ≈ 0 after 3–4 rounds and never recover.
  All-identical agents update in unison → everyone lowers threshold → everyone stays home → no
  signal. Classic feedback artifact.
- **06 Trend Follower** and **07 Loyal** produce maximum-variance 0↔100 oscillation
  (loyal is a perfect deterministic square wave). σ = 50, efficiency ≈ 31%.
- **08 Regret-Minimizing** is the best mono (eff 72%) but still overcaps 51/150 rounds —
  online learning approximates the mixed-strategy equilibrium but the equilibrium *itself* sits
  just above capacity.

### Diversity wins (#13)
Full 8-way mix: **84.9% efficiency, only 3/150 over-cap rounds**, σ = 12. Heterogeneity
damps the synchronization that ruins mono populations. The three big negative-benefit dips
(rounds ~33, 69, 105) suggest a slow ~36-round meta-oscillation worth investigating.

### Capacity calibration is brittle (#14–17)
Same 8-way mix tuned around cap=60. Drop to cap=30 → 90 over-cap rounds, **net negative
benefit**. Raise to cap=85 → still 81.5% efficiency. Strategies have no built-in awareness of
absolute capacity level; threshold/MA-style rules anchor to historical attendance ratios,
not the capacity ratio.

### Population dynamics + schedules visualize cleanly
- **19 Linear growth**: active pop ramps 30→100 over ~15 rounds via Poisson(λ=5) arrivals,
  attendance climbs in lockstep, stays just under cap.
- **21 Festival shock**: arrivals concentrated rounds 10–30 (`schedule: {startRound:10,
  endRound:30, fadeIn:3, fadeOut:5}`). Pop spikes to 100, then decays via background
  Binomial(p=0.03) departures; attendance follows pop.
- **22 Late bloom**: bar empty 40 rounds (arrivals scheduled from round 41 with fade-in 8),
  then a sharp ramp. Strategies overshoot 4–5 times early (visible benefit dips to −60),
  then settle near capacity. **Agents do learn the regime change.**
- **25 Slow collapse**: departures > arrivals → pop decays smoothly 90→30 over 150 rounds.

### Adversarial pairing under-utilizes capacity (#11)
Adaptive vs Random: adaptive blocks "going" after early overcrowding, drags whole pool
to avg 25 (cap is 60). Zero overcaps, 78% efficiency — capacity is just wasted.

## Pipeline

- [analysis/runScenarios.ts](analysis/runScenarios.ts) — defines scenarios + runs them via
  the in-process `SimulationEngine`. Seeded via scenario id → reproducible.
- [analysis/plot_scenarios.py](analysis/plot_scenarios.py) — matplotlib plotter.
  Per-scenario panels: attendance vs cap, benefit, optional pop+flows. Plus 5×5 grid.
- Run: `pnpm tsx analysis/runScenarios.ts && python3 analysis/plot_scenarios.py`.
- Output: `analysis_outputs/scenarios/*.png`, `analysis_outputs/scenarios_grid.png`,
  `analysis_outputs/scenario_results.json`.
