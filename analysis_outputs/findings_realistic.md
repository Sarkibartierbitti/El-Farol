# 7 realistic scenarios — findings

Each scenario maps El Farol dynamics to a real-world phenomenon. Same `+1/−1` benefit rule.
PNGs in `realistic/`. Grid overview: `realistic_grid.png`.

## Headline numbers

| id | scenario | rounds | cap | avg | σ | over-cap | eff | total benefit |
|----|----------|-------:|----:|----:|--:|---------:|----:|--------------:|
| r1 | Server rush (flash crowd → timeouts) | 80 | 20 | 12.60 | 18.49 | 17 | 58.4% | **−552** |
| r2 | Highway commute | 200 | 40 | 34.20 | 5.25 | 10 | **92.7%** | +5957 |
| r3 | Gym in January | 150 | 30 | 15.50 | 16.75 | 27 | 58.4% | −265 |
| r4 | Restaurant Friday hype loop | 120 | 25 | 25.38 | 10.47 | 61 | 71.5% | **−1275** |
| r5 | Black Friday (single-day) | 60 | 40 | 19.77 | 22.47 | 10 | 60.4% | −85 |
| r6 | Concert ticket release (FOMO) | 50 | 15 | 29.88 | 11.54 | **47** | 67.8% | **−1412** |
| r7 | Pandemic reopening | 180 | 50 | 54.46 | 12.51 | **131** | 61.1% | **−6098** |

## Per-scenario narrative

### r1 — Server rush 🔥
**Pattern**: classic flash-crowd death spiral.
Active pool surges 30 → 245 by round 9 (everyone tries the new product). Attendance peaks at
~65 (3× capacity) → massive negative benefit (−60/round). Around round 16, timeouts
(scheduled departures, fade-in 4 rounds) overtake arrivals. Pool decays, attendance crashes
toward 0 and never recovers. **Net loss despite occasional success.** Real-world parallel:
service that gets ratio-limited or DDoS'd then loses its userbase entirely.

### r2 — Highway commute ✅
**The only winner.** Mixed pool of regret-min + adaptive learns to spread across off-peak
hours. Avg attendance 34 (well below cap=40), σ=5.25. Only 10/200 over-cap days. Benefit
graph shows a steady ~+35/round with rare deep dips (−45) when learners over-correct in
unison. 92.7% efficiency. **Key insight**: long horizons + learning agents + no pop pressure
→ El Farol converges close to Nash equilibrium.

### r3 — Gym in January 🏋️
**Pop dynamics tell the story.** Active pool ramps 20 → 185 over weeks 1–2 (resolution
arrivals). Attendance overshoots cap=30 to 65, crushing benefit (−60/round) until departures
schedule kicks in (round 20). By round 60, pop is back at the floor of 20 (regulars only).
**Real-world fit**: the gym gets net negative value during the overcrowded peak; regulars
who tolerate it earn back the deficit over the rest of the year.

### r4 — Restaurant Friday hype loop ❌ (most interesting)
**Pure period-2 oscillation.** Cap=25, attendance bounces 15 ↔ 35 every Friday forever.
Moving-average + trend-followers create a perfect hype-feedback loop: busy week → everyone
goes → over-cap → bad reviews → empty next week → repeat. **Net benefit −1275 over 120
weeks.** This is the classic Brian Arthur pathology when agent diversity is too low and
recency-weighted strategies dominate. Adding contrarians barely dampens it (10/100 hipsters
aren't enough).

### r5 — Black Friday ⚡
Shorter and milder version of server rush. Big arrival burst rounds 1–4, pool peaks ~100,
overshoot ~80 (2× cap) for 4 rounds, then adaptive+regret-min settle near cap. Final 30
rounds run cleanly. Net benefit only slightly negative (−85): the early carnage is offset
by the later equilibrium. Short horizon = limited damage.

### r6 — Concert tickets (FOMO) 💸
**47/50 rounds over capacity.** Pool peaks at 200 with massive arrival burst rounds 1–6.
Attendance averages 30 vs cap=15 — everyone trying for ~25 rounds. Around round 30,
late-arrivers see steady disappointment and the trend-followers reverse → period-2
oscillation emerges. Pool slowly decays as departures (broker scalpers? exhausted fans)
exceed arrivals. **Lesson**: when capacity is structurally too small for demand, no
strategy mix wins. The "tickets sold out in 30 seconds" feel.

### r7 — Pandemic reopening 😷 (most surprising)
**131/180 over-cap rounds — biggest net loss (−6098).**
Pop grows smoothly 15 → 200 via 60-round fade-in arrivals. Attendance climbs in lockstep
and **never stops at cap=50** — agents see growing demand and keep going. Diverse strategies
(full 8-way ecology) don't help when latent demand structurally exceeds the new capacity.
Threshold/trend-followers anchor on attendance ratios, not on absolute cap. **Real-world
fit**: restaurants reopening at 50% suddenly *more* crowded than before — pent-up demand
plus everyone trying to "make up for lost time."

## Cross-cutting themes

1. **Learning agents need long horizons.** r2 (200 rounds, regret-min + adaptive heavy) is
   the only winner; r5/r6 (50–60 rounds) don't give learners time to converge.
2. **Pop dynamics break the cap-anchoring assumption.** Strategies anchor on relative
   attendance, not absolute cap. When pool grows (r1, r3, r7), they overshoot. When pool
   shrinks (r3 second half), they underutilize.
3. **MA + trend = guaranteed oscillation** (r4). Adding contrarians as a minority barely
   dampens it. Need either heterogeneity or learning to break the cycle.
4. **Capacity vs demand structural mismatch is fatal.** r6 (15 cap, 200 demand) and r7
   (50 cap, 200 latent demand) both net massively negative. No agent mix fixes this — it's
   a market-design problem, not a behavior problem.

## Run

```bash
npx tsx analysis/runRealisticScenarios.ts
python3 analysis/plot_realistic.py
```

Outputs to `analysis_outputs/realistic/*.png` + `analysis_outputs/realistic_grid.png`.
