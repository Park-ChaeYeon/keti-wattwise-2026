#!/usr/bin/env python3
"""Run one local appliance forecast and emit dashboard-friendly JSON."""

from __future__ import annotations

import argparse
import json
import time

import pandas as pd

try:
    from .data_store import APPLIANCES, load_model_series
    from .inference import forecast
except ImportError:  # Direct execution: python dashboard/web_inference.py
    from data_store import APPLIANCES, load_model_series
    from inference import forecast


def load_history(appliance: str, series_id: str, length: int) -> pd.DataFrame:
    return load_model_series(appliance, series_id).tail(length)[["timestamp", "target_kwh"]]


def records(frame: pd.DataFrame) -> list[dict]:
    result = frame.copy()
    if "timestamp" in result:
        result["timestamp"] = pd.to_datetime(result["timestamp"]).dt.strftime("%Y-%m-%dT%H:%M:%S")
    return json.loads(result.to_json(orient="records", force_ascii=False))


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--appliance", required=True, choices=APPLIANCES)
    parser.add_argument("--series-id", required=True)
    parser.add_argument("--context-length", type=int, default=336)
    parser.add_argument("--history-length", type=int, default=168)
    parser.add_argument("--horizon", type=int, default=24)
    parser.add_argument("--device", choices=["auto", "cpu", "cuda", "mps"], default="auto")
    args = parser.parse_args()

    started = time.perf_counter()
    history = load_history(args.appliance, args.series_id, args.history_length)
    prediction = forecast(args.appliance, args.series_id, args.context_length, args.horizon, args.device)

    print(json.dumps({
        "appliance": args.appliance,
        "seriesId": args.series_id,
        "model": "Chronos-2 appliance checkpoint",
        "device": args.device,
        "contextHours": args.context_length,
        "horizonHours": args.horizon,
        "elapsedSeconds": round(time.perf_counter() - started, 3),
        "history": records(history.rename(columns={"target_kwh": "actual"})),
        "forecast": records(prediction.drop(columns=["appliance", "series_id"], errors="ignore")),
    }, ensure_ascii=False))


if __name__ == "__main__":
    main()
