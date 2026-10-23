#!/usr/bin/env python3
"""Export one measured hourly series as strict dashboard JSON."""

from __future__ import annotations

import argparse
import json
import math

try:
    from .data_store import APPLIANCES, load_hourly_series
except ImportError:  # Direct execution: python dashboard/series_export.py
    from data_store import APPLIANCES, load_hourly_series


def optional_round(value: float, digits: int) -> float | None:
    try:
        numeric = float(value)
    except (TypeError, ValueError):
        return None
    return round(numeric, digits) if math.isfinite(numeric) else None


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--appliance", required=True, choices=APPLIANCES)
    parser.add_argument("--series-id", required=True)
    args = parser.parse_args()
    series = load_hourly_series(args.appliance, args.series_id)
    points = [
        {
            "timestamp": row.timestamp.isoformat(),
            "kwh": optional_round(row.target_kwh, 6),
            "coverage": optional_round(row.hourly_coverage, 4),
        }
        for row in series.itertuples()
    ]
    print(json.dumps({"points": points}, ensure_ascii=False, allow_nan=False))


if __name__ == "__main__":
    main()
