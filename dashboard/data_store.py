"""Shared paths and validated readers for appliance measurement data."""

from __future__ import annotations

import json
from pathlib import Path

import pandas as pd


ROOT = Path(__file__).resolve().parent
DATA_ROOT = ROOT / "data"
APPLIANCES = ("tv", "에어컨", "제습기", "세탁기")
MODEL_COLUMNS = ("house_id", "timestamp", "target_kwh")
HOURLY_COLUMNS = ("house_id", "timestamp", "target_kwh", "hourly_coverage")


def appliance_dir(appliance: str, data_root: Path = DATA_ROOT) -> Path:
    if appliance not in APPLIANCES:
        raise ValueError(f"지원하지 않는 가전입니다: {appliance}")
    return Path(data_root) / appliance


def load_summary(appliance: str, data_root: Path = DATA_ROOT) -> dict:
    path = appliance_dir(appliance, data_root) / "preprocessing_summary.json"
    if not path.is_file():
        raise FileNotFoundError(path)
    with path.open(encoding="utf-8") as stream:
        return json.load(stream)


def load_model_input(appliance: str, data_root: Path = DATA_ROOT) -> pd.DataFrame:
    path = appliance_dir(appliance, data_root) / "chronos_model_input.parquet"
    if not path.is_file():
        raise FileNotFoundError(path)
    data = pd.read_parquet(path)
    missing = set(MODEL_COLUMNS) - set(data.columns)
    if missing:
        raise ValueError(f"{path}에 필수 열이 없습니다: {sorted(missing)}")
    result = data.loc[:, MODEL_COLUMNS].copy()
    result["house_id"] = result["house_id"].astype(str)
    result["timestamp"] = pd.to_datetime(result["timestamp"], errors="coerce")
    result["target_kwh"] = pd.to_numeric(result["target_kwh"], errors="coerce")
    return result


def load_model_series(
    appliance: str,
    series_id: str,
    *,
    data_root: Path = DATA_ROOT,
) -> pd.DataFrame:
    data = load_model_input(appliance, data_root)
    return (
        data[data["house_id"].eq(series_id)]
        .dropna(subset=["timestamp", "target_kwh"])
        .sort_values("timestamp")
        .drop_duplicates("timestamp", keep="last")
        .reset_index(drop=True)
    )


def load_hourly_series(
    appliance: str,
    series_id: str,
    *,
    data_root: Path = DATA_ROOT,
) -> pd.DataFrame:
    path = appliance_dir(appliance, data_root) / "chronos_hourly.parquet"
    if not path.is_file():
        raise FileNotFoundError(path)
    data = pd.read_parquet(path)
    missing = set(HOURLY_COLUMNS) - set(data.columns)
    if missing:
        raise ValueError(f"{path}에 필수 열이 없습니다: {sorted(missing)}")
    result = data.loc[:, HOURLY_COLUMNS].copy()
    result["house_id"] = result["house_id"].astype(str)
    result["timestamp"] = pd.to_datetime(result["timestamp"], errors="coerce")
    result["target_kwh"] = pd.to_numeric(result["target_kwh"], errors="coerce")
    result["hourly_coverage"] = pd.to_numeric(result["hourly_coverage"], errors="coerce")
    return (
        result[result["house_id"].eq(series_id)]
        .dropna(subset=["timestamp"])
        .sort_values("timestamp")
        .drop_duplicates("timestamp", keep="last")
        .reset_index(drop=True)
    )
