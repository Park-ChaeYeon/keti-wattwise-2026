#!/usr/bin/env python3
"""Convert local minute-level measurement CSV folders into dashboard Parquet files."""

from __future__ import annotations

import argparse
import json
import os
import tempfile
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable

import pandas as pd

try:
    from .data_store import APPLIANCES, DATA_ROOT
except ImportError:  # Direct execution: python dashboard/measurement_pipeline.py
    from data_store import APPLIANCES, DATA_ROOT


REQUIRED_COLUMNS = {
    "측정시간",
    "가구ID",
    "채널ID",
    "유효전력량_Wh",
    "표본수",
    "표본수집률",
}
CHANNELS = {"tv": "ch02", "에어컨": "ch13", "제습기": "ch20", "세탁기": "ch06"}
HOURLY_COLUMNS = [
    "house_id",
    "subject",
    "source_house_id",
    "channel_id",
    "appliance",
    "timestamp",
    "energy_wh",
    "minute_count",
    "valid_energy_minutes",
    "sample_count",
    "collection_rate_mean",
    "hourly_coverage",
    "low_coverage",
    "target_kwh",
]


@dataclass(frozen=True)
class BuildResult:
    appliance: str
    hourly: pd.DataFrame
    model_input: pd.DataFrame
    summary: dict


def _single_value(values: pd.Series, label: str, source: Path) -> str:
    unique = values.dropna().astype(str).unique().tolist()
    if len(unique) != 1:
        raise ValueError(f"{source}: {label} 값은 하나여야 합니다: {unique}")
    return unique[0]


def _read_series_folder(folder: Path, appliance: str) -> tuple[pd.DataFrame, int]:
    suffix = f"_{appliance}"
    if not folder.name.endswith(suffix):
        raise ValueError(f"폴더 이름은 '<사용자>_{appliance}' 형식이어야 합니다: {folder}")
    subject = folder.name[: -len(suffix)]
    if not subject:
        raise ValueError(f"사용자 이름이 비어 있습니다: {folder}")
    files = sorted(folder.glob("*.csv"))
    if not files:
        raise ValueError(f"CSV 파일이 없습니다: {folder}")

    frames: list[pd.DataFrame] = []
    source_house_ids: set[str] = set()
    for path in files:
        raw = pd.read_csv(path)
        missing = REQUIRED_COLUMNS - set(raw.columns)
        if missing:
            raise ValueError(f"{path}: 필수 열이 없습니다: {sorted(missing)}")
        source_house_id = _single_value(raw["가구ID"], "가구ID", path)
        channel_id = _single_value(raw["채널ID"], "채널ID", path)
        if channel_id != CHANNELS[appliance]:
            raise ValueError(
                f"{path}: {appliance} 채널은 {CHANNELS[appliance]}여야 하지만 {channel_id}입니다"
            )
        source_house_ids.add(source_house_id)
        frames.append(
            pd.DataFrame(
                {
                    "house_id": f"{subject}_{appliance}",
                    "subject": subject,
                    "source_house_id": source_house_id,
                    "channel_id": channel_id,
                    "appliance": appliance,
                    "timestamp": pd.to_datetime(raw["측정시간"], errors="coerce"),
                    "energy_wh": pd.to_numeric(raw["유효전력량_Wh"], errors="coerce"),
                    "sample_count": pd.to_numeric(raw["표본수"], errors="coerce"),
                    "collection_rate": pd.to_numeric(raw["표본수집률"], errors="coerce"),
                }
            )
        )
    if len(source_house_ids) != 1:
        raise ValueError(f"{folder}: 여러 가구ID가 섞여 있습니다: {sorted(source_house_ids)}")

    minute = pd.concat(frames, ignore_index=True)
    if minute["timestamp"].isna().any():
        raise ValueError(f"{folder}: 해석할 수 없는 측정시간이 있습니다")
    if minute["timestamp"].duplicated().any():
        duplicates = int(minute["timestamp"].duplicated().sum())
        raise ValueError(f"{folder}: 중복 측정시간이 {duplicates}개 있습니다")
    return minute, len(files)


def build_appliance(
    source_root: Path,
    appliance: str,
    *,
    minimum_hourly_coverage: float = 0.8,
) -> BuildResult:
    if appliance not in APPLIANCES:
        raise ValueError(f"지원하지 않는 가전입니다: {appliance}")
    if not 0 < minimum_hourly_coverage <= 1:
        raise ValueError("minimum_hourly_coverage는 0 초과 1 이하여야 합니다")
    source_root = Path(source_root)
    folders = sorted(path for path in source_root.glob(f"*_{appliance}") if path.is_dir())
    if not folders:
        raise ValueError(f"{source_root}에서 '*_{appliance}' 폴더를 찾지 못했습니다")

    frames: list[pd.DataFrame] = []
    source_files = 0
    for folder in folders:
        frame, file_count = _read_series_folder(folder, appliance)
        frames.append(frame)
        source_files += file_count
    minute = pd.concat(frames, ignore_index=True)
    if minute.duplicated(["house_id", "timestamp"]).any():
        raise ValueError(f"{appliance}: 시계열 안에 중복 측정시간이 있습니다")
    minute["hour"] = minute["timestamp"].dt.floor("h")

    hourly = (
        minute.groupby(
            ["house_id", "subject", "source_house_id", "channel_id", "appliance", "hour"],
            sort=True,
        )
        .agg(
            energy_wh=("energy_wh", "sum"),
            minute_count=("timestamp", "size"),
            valid_energy_minutes=("energy_wh", "count"),
            sample_count=("sample_count", "sum"),
            collection_rate_mean=("collection_rate", "mean"),
        )
        .reset_index()
        .rename(columns={"hour": "timestamp"})
    )
    hourly["sample_count"] = hourly["sample_count"].fillna(0).astype("int64")
    hourly["hourly_coverage"] = hourly["valid_energy_minutes"] / 60.0
    hourly["low_coverage"] = (
        hourly["hourly_coverage"] < minimum_hourly_coverage
    ).astype("int8")
    hourly["target_kwh"] = hourly["energy_wh"] / 1000.0
    hourly.loc[hourly["low_coverage"].eq(1), "target_kwh"] = float("nan")
    hourly = hourly.loc[:, HOURLY_COLUMNS]
    model_input = hourly.loc[
        hourly["target_kwh"].notna(), ["house_id", "timestamp", "target_kwh"]
    ].copy()
    series_rows = (
        model_input.groupby("house_id", sort=False).size().astype(int).to_dict()
    )
    summary = {
        "appliance": appliance,
        "channel_id": CHANNELS[appliance],
        "dataset": "measurement2",
        "source_directory": str(source_root),
        "source_files": source_files,
        "series": int(hourly["house_id"].nunique()),
        "series_ids": hourly["house_id"].drop_duplicates().tolist(),
        "series_rows": series_rows,
        "hourly_rows": int(len(hourly)),
        "valid_target_rows": int(len(model_input)),
        "low_coverage_rows": int(hourly["low_coverage"].sum()),
        "minimum_hourly_coverage": minimum_hourly_coverage,
        "period_start": str(hourly["timestamp"].min()),
        "period_end": str(hourly["timestamp"].max()),
    }
    return BuildResult(appliance, hourly, model_input, summary)


def _atomic_parquet(frame: pd.DataFrame, destination: Path) -> None:
    destination.parent.mkdir(parents=True, exist_ok=True)
    descriptor, temporary = tempfile.mkstemp(
        prefix=f".{destination.name}.", suffix=".tmp", dir=destination.parent
    )
    os.close(descriptor)
    temporary_path = Path(temporary)
    try:
        frame.to_parquet(temporary_path, index=False)
        os.replace(temporary_path, destination)
    finally:
        temporary_path.unlink(missing_ok=True)


def _atomic_json(value: dict, destination: Path) -> None:
    destination.parent.mkdir(parents=True, exist_ok=True)
    descriptor, temporary = tempfile.mkstemp(
        prefix=f".{destination.name}.", suffix=".tmp", dir=destination.parent
    )
    temporary_path = Path(temporary)
    try:
        with os.fdopen(descriptor, "w", encoding="utf-8") as stream:
            json.dump(value, stream, ensure_ascii=False, indent=2)
            stream.write("\n")
        os.replace(temporary_path, destination)
    finally:
        temporary_path.unlink(missing_ok=True)


def save_result(result: BuildResult, output_root: Path = DATA_ROOT) -> dict:
    output_dir = Path(output_root) / result.appliance
    hourly_path = output_dir / "chronos_hourly.parquet"
    model_path = output_dir / "chronos_model_input.parquet"
    summary_path = output_dir / "preprocessing_summary.json"
    try:
        display_hourly = hourly_path.relative_to(Path.cwd())
        display_model = model_path.relative_to(Path.cwd())
    except ValueError:
        display_hourly = hourly_path
        display_model = model_path
    summary = {
        **result.summary,
        "output": str(display_hourly),
        "model_input": str(display_model),
    }
    _atomic_parquet(result.hourly, hourly_path)
    _atomic_parquet(result.model_input, model_path)
    _atomic_json(summary, summary_path)
    return summary


def build_many(
    source_root: Path,
    appliances: Iterable[str],
    *,
    output_root: Path = DATA_ROOT,
    minimum_hourly_coverage: float = 0.8,
) -> list[dict]:
    # Validate and build every appliance before replacing any existing output.
    results = [
        build_appliance(source_root, appliance, minimum_hourly_coverage=minimum_hourly_coverage)
        for appliance in appliances
    ]
    return [save_result(result, output_root) for result in results]


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source", type=Path, required=True, help="원본 CSV 상위 폴더")
    parser.add_argument(
        "--appliance",
        action="append",
        choices=APPLIANCES,
        help="변환할 가전. 여러 번 지정 가능하며 생략하면 발견된 가전을 모두 변환",
    )
    parser.add_argument("--output-root", type=Path, default=DATA_ROOT)
    parser.add_argument("--minimum-hourly-coverage", type=float, default=0.8)
    args = parser.parse_args()
    appliances = args.appliance or [
        appliance
        for appliance in APPLIANCES
        if any(args.source.glob(f"*_{appliance}"))
    ]
    if not appliances:
        parser.error("변환할 가전 폴더를 찾지 못했습니다")
    summaries = build_many(
        args.source,
        appliances,
        output_root=args.output_root,
        minimum_hourly_coverage=args.minimum_hourly_coverage,
    )
    print(json.dumps(summaries, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
