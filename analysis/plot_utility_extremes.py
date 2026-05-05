from __future__ import annotations

import json
from pathlib import Path

import matplotlib.pyplot as plt
import pandas as pd


ROOT = Path(__file__).resolve().parent.parent
INPUT_PATH = ROOT / "analysis_outputs" / "utility_extremes" / "utility_extremes.json"
OUTPUT_DIR = ROOT / "analysis_outputs" / "utility_extremes"


def format_groups(groups: list[dict]) -> str:
    parts = []
    for group in groups:
        label = f"{group['type']} x{group['count']}"
        params = group.get("parameters") or {}
        if params:
            compact = ", ".join(f"{k}={v}" for k, v in params.items())
            label = f"{label} ({compact})"
        parts.append(label)
    return " | ".join(parts)


with INPUT_PATH.open() as f:
    payload = json.load(f)

OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

summary_rows = []
selected = payload["best"][:6] + payload["worst"][:6]

for side in ("best", "worst"):
    for item in payload[side]:
        summary_rows.append(
            {
                "side": side,
                "rank": item["rank"],
                "label": item["label"],
                "utility": item["totalUtility"],
                "avg_attendance": item["averageAttendance"],
                "std_attendance": item["attendanceStdDev"],
                "crowded_rounds": item["crowdedRounds"],
                "zero_rounds": item["zeroRounds"],
                "full_rounds": item["fullRounds"],
                "abs_capacity_error": item["absCapacityError"],
                "groups": format_groups(item["groups"]),
            }
        )

pd.DataFrame(summary_rows).to_csv(OUTPUT_DIR / "utility_extremes_summary.csv", index=False)

fig, axes = plt.subplots(4, 3, figsize=(18, 18), sharex=False, sharey=True)
axes = axes.flatten()

for ax, item in zip(axes, selected):
    attendance = item["attendance"]
    rounds = list(range(1, len(attendance) + 1))
    rolling = pd.Series(attendance).rolling(window=5, min_periods=1).mean()
    ax.plot(rounds, attendance, color="#165DFF", linewidth=1.4)
    ax.plot(rounds, rolling, color="#FF7A00", linewidth=2.0)
    ax.axhline(60, color="#C62828", linestyle="--", linewidth=1.1)
    ax.set_ylim(0, 100)
    ax.grid(alpha=0.16)
    ax.set_title(f"{item['rank']}. {item['label']}\nU={item['totalUtility']} over={item['crowdedRounds']}", fontsize=10)

for ax in axes[len(selected):]:
    ax.set_visible(False)

fig.tight_layout()
fig.savefig(OUTPUT_DIR / "utility_extremes_grid.png", dpi=180)
plt.close(fig)
