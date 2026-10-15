#!/usr/bin/env python3
"""Quick real-usage summary for one appliance/person series — no model load.

Used by the chatbot to ground answers in actual measured data without
paying the Chronos-2 checkpoint load cost of a full forecast run.
"""

from __future__ import annotations

import argparse
import json

try:
    from .data_store import APPLIANCES, load_model_series
except ImportError:  # Direct execution: python dashboard/usage_summary.py
    from data_store import APPLIANCES, load_model_series


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--appliance", required=True, choices=APPLIANCES)
    parser.add_argument("--series-id", required=True)
    args = parser.parse_args()

    series = load_model_series(args.appliance, args.series_id)
    if series.empty:
        print(json.dumps({"error": f"'{args.series_id}' 실측 데이터를 찾을 수 없습니다."}, ensure_ascii=False))
        return

    last24 = series.tail(24)
    last7d = series.tail(24 * 7)
    peak_row = last7d.loc[last7d["target_kwh"].idxmax()]

    print(json.dumps({
        "appliance": args.appliance,
        "seriesId": args.series_id,
        "periodStart": series["timestamp"].min().strftime("%Y-%m-%d"),
        "periodEnd": series["timestamp"].max().strftime("%Y-%m-%d"),
        "last24hTotalKwh": round(float(last24["target_kwh"].sum()), 4),
        "last7dDailyAvgKwh": round(float(last7d["target_kwh"].sum() / 7), 4),
        "peakKwh": round(float(peak_row["target_kwh"]), 4),
        "peakTime": peak_row["timestamp"].strftime("%Y-%m-%d %H:%M"),
    }, ensure_ascii=False))


if __name__ == "__main__":
    main()
