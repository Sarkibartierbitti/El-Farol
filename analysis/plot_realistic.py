"""Plot realistic scenarios. Reads analysis_outputs/realistic_results.json.

Output:
- analysis_outputs/realistic/<id>.png — detailed per-scenario panels
- analysis_outputs/realistic_grid.png — 7-tile overview
"""

import json
import math
from pathlib import Path

import matplotlib.pyplot as plt
import numpy as np

ROOT = Path(__file__).resolve().parent.parent
RESULTS = ROOT / "analysis_outputs" / "realistic_results.json"
OUT_DIR = ROOT / "analysis_outputs" / "realistic"
GRID_PATH = ROOT / "analysis_outputs" / "realistic_grid.png"


def load_results():
    with RESULTS.open() as fh:
        return json.load(fh)["scenarios"]


def has_population_dynamics(sc):
    pd = sc.get("populationDynamics")
    return bool(pd and pd.get("enabled"))


def per_scenario_plot(sc, out_dir: Path):
    rounds = [r["round"] for r in sc["perRound"]]
    attendance = [r["attendance"] for r in sc["perRound"]]
    benefit = [r["benefit"] for r in sc["perRound"]]
    cap = sc["capacity"]
    has_pop = has_population_dynamics(sc)
    n_panels = 3 if has_pop else 2

    fig, axes = plt.subplots(n_panels, 1, figsize=(11, 2.8 * n_panels), sharex=True)
    if n_panels == 1:
        axes = [axes]

    ax0 = axes[0]
    ax0.plot(rounds, attendance, color="#1f77b4", linewidth=1.4, label="attendance")
    ax0.axhline(cap, color="#f4bb73", linewidth=1.2, linestyle="--", label=f"capacity={cap}")
    ax0.set_ylabel("attendance")
    ax0.set_title(f"{sc['id']} — {sc['title']}", fontsize=11)
    ax0.grid(True, alpha=0.3)
    ax0.legend(loc="upper right", fontsize=8)

    ax1 = axes[1]
    ax1.plot(rounds, benefit, color="#2ca02c", linewidth=1.2)
    ax1.axhline(0, color="black", linewidth=0.5)
    ax1.set_ylabel("benefit (per round)")
    ax1.grid(True, alpha=0.3)

    if has_pop:
        ax2 = axes[2]
        active = [r["activeAgentsEnd"] for r in sc["perRound"]]
        arrivals = [r["arrivals"] for r in sc["perRound"]]
        departures = [r["departures"] for r in sc["perRound"]]
        ax2.plot(rounds, active, color="#444", linewidth=1.5, label="active pop")
        ax2.bar(rounds, arrivals, color="#f4bb73", width=1.0, alpha=0.7, label="arrivals")
        ax2.bar(rounds, [-d for d in departures], color="#9871f7", width=1.0, alpha=0.7, label="departures")
        ax2.set_ylabel("agents")
        ax2.grid(True, alpha=0.3)
        ax2.legend(loc="upper right", fontsize=8, ncol=3)

    axes[-1].set_xlabel("round")

    stats = sc["finalStats"]
    footer = (
        f"avg={stats['averageAttendance']:.2f}  σ={stats['attendanceStdDev']:.2f}  "
        f"over_cap={stats['roundsOverCapacity']}/{sc['rounds']}  "
        f"efficiency={stats['efficiency'] * 100:.1f}%  "
        f"total_benefit={stats['totalBenefit']:.0f}"
    )
    fig.text(0.5, 0.005, footer, ha="center", fontsize=9, color="#444")

    header = sc.get("realWorldAnalogue", "")
    fig.text(0.5, 0.97, header, ha="center", fontsize=8, style="italic", color="#666", wrap=True)

    plt.tight_layout(rect=[0, 0.02, 1, 0.95])
    fig.savefig(out_dir / f"{sc['id']}.png", dpi=110)
    plt.close(fig)


def grid_plot(scenarios, out_path: Path):
    n = len(scenarios)
    cols = 4
    rows = math.ceil(n / cols)
    fig, axes = plt.subplots(rows, cols, figsize=(cols * 3.5, rows * 2.6), sharex=False)
    axes = np.array(axes).reshape(rows, cols)

    for idx, sc in enumerate(scenarios):
        r, c = divmod(idx, cols)
        ax = axes[r, c]
        rounds = [rd["round"] for rd in sc["perRound"]]
        attendance = [rd["attendance"] for rd in sc["perRound"]]
        ax.plot(rounds, attendance, color="#1f77b4", linewidth=1.0)
        ax.axhline(sc["capacity"], color="#f4bb73", linewidth=0.8, linestyle="--")
        if has_population_dynamics(sc):
            active = [rd["activeAgentsEnd"] for rd in sc["perRound"]]
            ax.plot(rounds, active, color="#444", linewidth=0.7, alpha=0.6, label="active pop")
            ax.legend(loc="upper right", fontsize=6)
        ax.set_title(sc["id"] + "\n" + sc["title"][:42], fontsize=8)
        ax.set_ylim(0, max(sc["numAgents"] * 0.6, sc["capacity"]) * 1.1)
        ax.grid(True, alpha=0.25)
        ax.tick_params(labelsize=6)

    for idx in range(n, rows * cols):
        r, c = divmod(idx, cols)
        axes[r, c].axis("off")

    fig.suptitle("7 realistic scenarios — attendance + (active pop, if dynamic) vs capacity", fontsize=11)
    plt.tight_layout(rect=[0, 0, 1, 0.96])
    fig.savefig(out_path, dpi=130)
    plt.close(fig)


def main():
    scenarios = load_results()
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    for sc in scenarios:
        per_scenario_plot(sc, OUT_DIR)
    grid_plot(scenarios, GRID_PATH)
    print(f"Saved {len(scenarios)} per-scenario PNGs to {OUT_DIR}")
    print(f"Saved grid summary to {GRID_PATH}")


if __name__ == "__main__":
    main()
