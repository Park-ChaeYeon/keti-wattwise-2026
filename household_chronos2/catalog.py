#!/usr/bin/env python3
"""Emit the household forecast dataset catalog as JSON."""

from __future__ import annotations

import argparse
import json
from pathlib import Path

import pandas as pd


ROOT = Path(__file__).resolve().parent


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--data", type=Path, default=ROOT / "data/hourly_base.parquet")
    args = parser.parse_args()
    data = pd.read_parquet(args.data)
    data["timestamp"] = pd.to_datetime(data["timestamp"], errors="raise")
    required = {"house_id", "timestamp"}
    missing = required - set(data.columns)
    if missing:
        raise ValueError(f"필수 열이 없습니다: {sorted(missing)}")
    houses = []
    for house_id, group in data.groupby("house_id", sort=True):
        row = group.iloc[0]
        houses.append(
            {
                "id": str(house_id),
                "type": str(row.get("house_type", "")),
                "area": str(row.get("residential_area", "")),
                "city": str(row.get("city", "")),
                "start": str(group["timestamp"].min()),
                "end": str(group["timestamp"].max()),
                "rows": int(len(group)),
            }
        )
    print(json.dumps({"houses": houses}, ensure_ascii=False, allow_nan=False))


if __name__ == "__main__":
    main()
