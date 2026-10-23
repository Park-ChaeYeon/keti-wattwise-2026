from __future__ import annotations

import tempfile
import unittest
from pathlib import Path

import pandas as pd


from dashboard.data_store import load_hourly_series, load_model_series
from dashboard.measurement_pipeline import build_appliance, save_result


class MeasurementPipelineTest(unittest.TestCase):
    def _write_csv(self, root: Path, *, channel: str = "ch02", duplicate: bool = False) -> None:
        folder = root / "정빈_tv"
        folder.mkdir()
        timestamp = list(pd.date_range("2026-08-15", periods=60, freq="min"))
        if duplicate:
            timestamp[-1] = timestamp[0]
        pd.DataFrame(
            {
                "측정시간": timestamp,
                "가구ID": "H010",
                "채널ID": channel,
                "유효전력량_Wh": 2.0,
                "표본수": 1800,
                "표본수집률": 1.0,
            }
        ).to_csv(folder / "sample.csv", index=False)

    def test_build_save_and_load_share_one_validated_schema(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            source = root / "raw"
            output = root / "data"
            source.mkdir()
            self._write_csv(source)
            result = build_appliance(source, "tv")
            summary = save_result(result, output)
            series = load_model_series("tv", "정빈_tv", data_root=output)
            hourly = load_hourly_series("tv", "정빈_tv", data_root=output)
            self.assertEqual(summary["hourly_rows"], 1)
            self.assertEqual(summary["valid_target_rows"], 1)
            self.assertAlmostEqual(series.iloc[0]["target_kwh"], 0.12)
            self.assertEqual(len(hourly), 1)

    def test_rejects_wrong_channel_before_writing(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            source = Path(temporary)
            self._write_csv(source, channel="ch06")
            with self.assertRaisesRegex(ValueError, "채널"):
                build_appliance(source, "tv")

    def test_rejects_duplicate_timestamps(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            source = Path(temporary)
            self._write_csv(source, duplicate=True)
            with self.assertRaisesRegex(ValueError, "중복"):
                build_appliance(source, "tv")


if __name__ == "__main__":
    unittest.main()
