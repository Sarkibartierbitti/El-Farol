from __future__ import annotations

import json
import math
from pathlib import Path

import matplotlib.pyplot as plt
import numpy as np
import pandas as pd


ROOT = Path(__file__).resolve().parent.parent
INPUT_PATH = ROOT / "analysis_outputs" / "scenario_results.json"
OUTPUT_DIR = ROOT / "analysis_outputs" / "plots"


def lag1_autocorr(values: np.ndarray) -> float:
    if len(values) < 2:
        return float("nan")
    left = values[:-1]
    right = values[1:]
    if np.std(left) == 0 or np.std(right) == 0:
        return float("nan")
    return float(np.corrcoef(left, right)[0, 1])


def turning_points(values: np.ndarray) -> int:
    if len(values) < 3:
        return 0
    diffs = np.diff(values)
    return int(np.sum((diffs[:-1] * diffs[1:]) < 0))


def dominant_period(values: np.ndarray) -> float | None:
    if len(values) < 8:
        return None
    centered = values - np.mean(values)
    spectrum = np.fft.rfft(centered)
    power = np.abs(spectrum) ** 2
    if len(power) <= 2:
        return None
    power[0] = 0
    index = int(np.argmax(power[1:]) + 1)
    if index == 0:
      return None
    period = len(values) / index
    if period > len(values) / 2:
        return None
    return float(period)


with INPUT_PATH.open() as f:
    payload = json.load(f)

OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

rows = []
scenarios = payload["scenarios"]

for scenario in scenarios:
    capacity = scenario["capacity"]
    attendance = np.array([round_item["attendance"] for round_item in scenario["rounds"]], dtype=float)
    rounds = np.arange(1, len(attendance) + 1)
    rolling = pd.Series(attendance).rolling(window=6, min_periods=1).mean().to_numpy()

    mean_value = float(np.mean(attendance))
    std_value = float(np.std(attendance))
    lag_value = lag1_autocorr(attendance)
    turn_count = turning_points(attendance)
    over_capacity = int(np.sum(attendance > capacity))
    period = dominant_period(attendance)

    rows.append(
        {
            "id": scenario["id"],
            "title": scenario["title"],
            "mean_attendance": mean_value,
            "std_attendance": std_value,
            "lag1_autocorr": lag_value,
            "turning_points": turn_count,
            "over_capacity_rounds": over_capacity,
            "dominant_period": period,
            "efficiency": scenario["finalStats"]["efficiency"],
        }
    )

    fig, ax = plt.subplots(figsize=(10, 4.5))
    ax.plot(rounds, attendance, color="#165DFF", linewidth=1.4, label="attendance")
    ax.plot(rounds, rolling, color="#FF7A00", linewidth=2.2, label="6-round mean")
    ax.axhline(capacity, color="#C62828", linestyle="--", linewidth=1.2, label=f"capacity={capacity}")
    ax.set_title(scenario["title"])
    ax.set_xlabel("Round")
    ax.set_ylabel("Attendance")
    ax.set_ylim(0, scenario["numAgents"])
    ax.grid(alpha=0.18)
    metrics = f"mean={mean_value:.1f}  std={std_value:.1f}  over={over_capacity}  lag1={lag_value:.2f}"
    ax.text(0.01, 0.98, metrics, transform=ax.transAxes, va="top", fontsize=9)
    ax.legend(loc="upper right", frameon=False)
    fig.tight_layout()
    fig.savefig(OUTPUT_DIR / f"{scenario['id']}.png", dpi=160)
    plt.close(fig)


summary = pd.DataFrame(rows).sort_values("id")
summary.to_csv(ROOT / "analysis_outputs" / "scenario_summary.csv", index=False)

cols = 3
rows_n = math.ceil(len(scenarios) / cols)
fig, axes = plt.subplots(rows_n, cols, figsize=(16, 4.2 * rows_n), sharex=False, sharey=False)
axes = np.array(axes).reshape(rows_n, cols)

for ax in axes.flat:
    ax.set_visible(False)

for ax, scenario in zip(axes.flat, scenarios):
    ax.set_visible(True)
    capacity = scenario["capacity"]
    attendance = np.array([round_item["attendance"] for round_item in scenario["rounds"]], dtype=float)
    rounds = np.arange(1, len(attendance) + 1)
    rolling = pd.Series(attendance).rolling(window=6, min_periods=1).mean().to_numpy()
    ax.plot(rounds, attendance, color="#165DFF", linewidth=1.1)
    ax.plot(rounds, rolling, color="#FF7A00", linewidth=1.6)
    ax.axhline(capacity, color="#C62828", linestyle="--", linewidth=1.0)
    ax.set_title(scenario["title"], fontsize=10)
    ax.set_ylim(0, scenario["numAgents"])
    ax.grid(alpha=0.15)
    ax.tick_params(labelsize=8)

fig.tight_layout()
fig.savefig(ROOT / "analysis_outputs" / "all_scenarios_grid.png", dpi=180)
