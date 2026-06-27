#!/usr/bin/env python3
"""Fetch real ECG snippets from PhysioNet and export app template JSON.

Defaults generate:
  - src/data/ecg/templates/afib-lead2.json from MIT-BIH AFIB rhythm
  - src/data/ecg/templates/vt-lead2.json from MIT-BIH VT/VFL rhythm

The app template format is intentionally small:
  { id, label, lead, sampleRateHz, durationMs, unit, fiducialsMs, samplesMv }
"""

from __future__ import annotations

import argparse
import json
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable, Sequence

import numpy as np
from scipy import signal
import wfdb


PROJECT_ROOT = Path(__file__).resolve().parents[1]
TEMPLATE_DIR = PROJECT_ROOT / "src" / "data" / "ecg" / "templates"
TARGET_SAMPLE_RATE_HZ = 100
MITDB_SAMPLE_RATE_HZ = 360


@dataclass(frozen=True)
class ExtractionJob:
    template_id: str
    label: str
    output_name: str
    pn_dir: str
    records: Sequence[str]
    rhythm_markers: Sequence[str]
    duration_sec: float
    prefer_symbol: str | None = None


DEFAULT_JOBS = (
    ExtractionJob(
        template_id="afib-lead2-v0",
        label="心房細動 (AF)",
        output_name="afib-lead2.json",
        pn_dir="mitdb",
        records=("201", "202", "203", "210", "217", "219", "222"),
        rhythm_markers=("(AFIB",),
        duration_sec=1.0,
    ),
    ExtractionJob(
        template_id="vt-lead2-v0",
        label="心室頻拍 (VT)",
        output_name="vt-lead2.json",
        pn_dir="mitdb",
        records=("207", "208", "200", "203", "205", "210", "213", "214", "215", "221", "228", "233"),
        rhythm_markers=("(VT", "(VFL"),
        duration_sec=1.0,
        prefer_symbol="V",
    ),
)


def choose_lead_index(sig_names: Sequence[str]) -> int:
    preferred = ("MLII", "II", "LEAD II", "ECG II")
    normalized = [name.upper().replace(" ", "") for name in sig_names]

    for target in preferred:
        target_normalized = target.upper().replace(" ", "")
        if target_normalized in normalized:
            return normalized.index(target_normalized)

    return 0


def rhythm_intervals(ann: wfdb.Annotation, record_end_sample: int) -> list[tuple[str, int, int]]:
    intervals: list[tuple[str, int, int]] = []
    current_note: str | None = None
    current_start = 0

    for sample, note in zip(ann.sample, ann.aux_note):
        if not note or not note.startswith("("):
            continue

        if current_note is not None:
            intervals.append((current_note, current_start, int(sample)))

        current_note = note.strip()
        current_start = int(sample)

    if current_note is not None:
        intervals.append((current_note, current_start, record_end_sample))

    return intervals


def find_rhythm_window(
    ann: wfdb.Annotation,
    record_end_sample: int,
    markers: Iterable[str],
    fs: float,
    duration_sec: float,
) -> tuple[int, int] | None:
    min_samples = int(duration_sec * fs)
    marker_tuple = tuple(markers)

    for note, start, end in rhythm_intervals(ann, record_end_sample):
        if not any(note.startswith(marker) for marker in marker_tuple):
            continue

        if end - start >= min_samples:
            return start, start + min_samples

    return None


def find_symbol_window(
    ann: wfdb.Annotation,
    symbol: str,
    fs: float,
    duration_sec: float,
    record_end_sample: int,
) -> tuple[int, int] | None:
    half_window = int(duration_sec * fs / 2)

    for sample, ann_symbol in zip(ann.sample, ann.symbol):
        if ann_symbol != symbol:
            continue

        start = max(0, int(sample) - half_window)
        end = min(record_end_sample, start + int(duration_sec * fs))
        if end - start >= int(duration_sec * fs):
            return start, end

    return None


def read_signal_segment(
    record_name: str,
    pn_dir: str,
    start_sample: int,
    end_sample: int,
) -> tuple[np.ndarray, float, str]:
    header = wfdb.rdheader(record_name, pn_dir=pn_dir)
    channel = choose_lead_index(header.sig_name)
    record = wfdb.rdrecord(
        record_name,
        pn_dir=pn_dir,
        sampfrom=start_sample,
        sampto=end_sample,
        channels=[channel],
    )

    if record.p_signal is None:
        raise RuntimeError(f"{record_name}: no physical signal returned by wfdb")

    lead_name = record.sig_name[0] if record.sig_name else header.sig_name[channel]
    return record.p_signal[:, 0].astype(float), float(record.fs), lead_name


def resample_to_100hz(samples_mv: np.ndarray, source_fs: float, duration_sec: float) -> np.ndarray:
    target_count = int(round(TARGET_SAMPLE_RATE_HZ * duration_sec))
    resampled = signal.resample(samples_mv, target_count)

    # Keep real mV scale while removing slow DC offset from the extracted window.
    baseline = float(np.median(resampled))
    return resampled - baseline


def round_samples(samples: np.ndarray) -> list[float]:
    return [round(float(value), 4) for value in samples]


def export_template(
    job: ExtractionJob,
    samples_mv: np.ndarray,
    lead_name: str,
    source_record: str,
    source_samples: tuple[int, int],
) -> Path:
    TEMPLATE_DIR.mkdir(parents=True, exist_ok=True)
    output_path = TEMPLATE_DIR / job.output_name

    payload = {
        "id": job.template_id,
        "label": job.label,
        "lead": lead_name,
        "sampleRateHz": TARGET_SAMPLE_RATE_HZ,
        "durationMs": int(round(job.duration_sec * 1000)),
        "unit": "mV",
        "fiducialsMs": {},
        "source": {
            "database": job.pn_dir,
            "record": source_record,
            "sampleStart": source_samples[0],
            "sampleEnd": source_samples[1],
        },
        "samplesMv": round_samples(samples_mv),
    }

    output_path.write_text(
        json.dumps(payload, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    return output_path


def extract_job(job: ExtractionJob) -> Path:
    last_error: Exception | None = None

    for record_name in job.records:
        try:
            header = wfdb.rdheader(record_name, pn_dir=job.pn_dir)
            fs = float(header.fs or MITDB_SAMPLE_RATE_HZ)
            record_end_sample = int(header.sig_len)
            ann = wfdb.rdann(record_name, "atr", pn_dir=job.pn_dir)

            window = find_rhythm_window(
                ann,
                record_end_sample,
                job.rhythm_markers,
                fs,
                job.duration_sec,
            )
            if window is None and job.prefer_symbol:
                window = find_symbol_window(
                    ann,
                    job.prefer_symbol,
                    fs,
                    job.duration_sec,
                    record_end_sample,
                )
            if window is None:
                continue

            raw_samples, source_fs, lead_name = read_signal_segment(
                record_name,
                job.pn_dir,
                window[0],
                window[1],
            )
            samples_100hz = resample_to_100hz(raw_samples, source_fs, job.duration_sec)
            return export_template(job, samples_100hz, lead_name, record_name, window)
        except Exception as exc:  # Continue scanning candidate records.
            last_error = exc
            continue

    details = f" Last error: {last_error}" if last_error else ""
    raise RuntimeError(
        f"Could not find a usable window for {job.template_id} in {job.records}.{details}"
    )


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Fetch MIT-BIH ECG windows from PhysioNet and export template JSON."
    )
    parser.add_argument(
        "--only",
        choices=("afib", "vt"),
        help="Generate only one template. Defaults to both.",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    jobs = DEFAULT_JOBS

    if args.only:
        jobs = tuple(
            job for job in DEFAULT_JOBS if job.output_name.startswith(args.only)
        )

    for job in jobs:
        path = extract_job(job)
        print(f"wrote {path.relative_to(PROJECT_ROOT)}")


if __name__ == "__main__":
    main()
