#!/usr/bin/env python3
"""Real-usage summaries for every measured appliance/person series — no model load.

Used by the chatbot to ground answers in actual measured data without
paying the Chronos-2 checkpoint load cost of a full forecast run.
"""

from __future__ import annotations

import json

try:
    from .data_store import APPLIANCES, load_model_series, load_summary
except ImportError:  # Direct execution: python dashboard/usage_summary.py
    from data_store import APPLIANCES, load_model_series, load_summary


def summarize(appliance: str, series_id: str) -> dict | None:
    series = load_model_series(appliance, series_id)
    if series.empty:
        return None

    recent = series.tail(24 * 30)
    days = len(recent) / 24

    return {
        "appliance": appliance,
        "person": series_id.rsplit("_", 1)[0],
        "periodStart": series["timestamp"].min().strftime("%Y-%m-%d"),
        "periodEnd": series["timestamp"].max().strftime("%Y-%m-%d"),
        "dailyAvgKwh": round(float(recent["target_kwh"].sum() / days), 4),
        "last24hTotalKwh": round(float(series.tail(24)["target_kwh"].sum()), 4),
    }


def main() -> None:
    rows = [
        row
        for appliance in APPLIANCES
        for series_id in load_summary(appliance)["series_ids"]
        if (row := summarize(appliance, series_id)) is not None
    ]
    print(json.dumps(rows, ensure_ascii=False))


if __name__ == "__main__":
    main()
