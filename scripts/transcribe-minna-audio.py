"""Transcribe the Minna no Nihongo Second Edition CD tracks for local import.

The output is intentionally written under tmp/ (ignored by git). It preserves
segment and word timestamps so the reviewed text can later be split into
clickable sentence audio clips without synthesizing replacement speech.
"""

from __future__ import annotations

import argparse
import json
import os
import re
import sys
from pathlib import Path


PROJECT_ROOT = Path(__file__).resolve().parents[1]
LOCAL_PACKAGES = PROJECT_ROOT / "tmp" / "asr-packages"
if LOCAL_PACKAGES.exists():
    sys.path.insert(0, str(LOCAL_PACKAGES))

from faster_whisper import WhisperModel  # noqa: E402


DEFAULT_AUDIO_ROOT = Path(r"D:\日本語資料\大家的日语初级第二版光盘资料\初级1")
DEFAULT_OUTPUT = PROJECT_ROOT / "tmp" / "minna-transcripts-medium.json"
TRACK_PATTERN = re.compile(r"MP3_(\d+)\.mp3$", re.IGNORECASE)


def parse_track_filter(value: str) -> set[int]:
    selected: set[int] = set()
    for part in (item.strip() for item in value.split(",")):
        if not part:
            continue
        if "-" in part:
            start_text, end_text = part.split("-", 1)
            start, end = int(start_text), int(end_text)
            selected.update(range(min(start, end), max(start, end) + 1))
        else:
            selected.add(int(part))
    return selected


def track_number(path: Path) -> int:
    match = TRACK_PATTERN.search(path.name)
    if not match:
        raise ValueError(f"Unexpected track name: {path.name}")
    return int(match.group(1))


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--audio-root", type=Path, default=DEFAULT_AUDIO_ROOT)
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    parser.add_argument("--tracks", default="", help="Comma-separated tracks or ranges, e.g. 0-8,15")
    parser.add_argument("--model", default=os.environ.get("WHISPER_MODEL", "medium"))
    parser.add_argument("--compute-type", default=os.environ.get("WHISPER_COMPUTE_TYPE", "int8"))
    parser.add_argument("--language", default="ja", help="Whisper language code (default: ja)")
    args = parser.parse_args()

    selected = parse_track_filter(args.tracks)
    tracks = sorted(args.audio_root.glob("MP3_*.mp3"), key=track_number)
    if selected:
        tracks = [path for path in tracks if track_number(path) in selected]
    if not tracks:
        raise SystemExit("No matching MP3 tracks found.")

    args.output.parent.mkdir(parents=True, exist_ok=True)
    existing: dict[str, dict] = {}
    if args.output.exists():
        existing = json.loads(args.output.read_text(encoding="utf-8")).get("tracks", {})

    model = WhisperModel(
        args.model,
        device="cpu",
        compute_type=args.compute_type,
        cpu_threads=max(1, min(12, os.cpu_count() or 4)),
        num_workers=1,
        download_root=str(PROJECT_ROOT / "tmp" / "whisper-models"),
    )

    prompt = (
        "みんなの日本語 初級 第二版。"
        "登場人物：ミラー、佐藤、サントス、マリア、カリナ、ワン、シュミット、イー、松本、木村、山田。"
        "教材の会話、例文、聴解問題を、句読点を付けて正確に書き起こす。"
        if args.language == "ja"
        else "《大家的日语 初级1 第二版》配套光盘出版说明，请准确转写中文机构名称。"
    )

    for position, path in enumerate(tracks, start=1):
        number = track_number(path)
        print(f"[{position}/{len(tracks)}] Transcribing {path.name} ...", flush=True)
        segments, info = model.transcribe(
            str(path),
            language=args.language,
            beam_size=5,
            best_of=5,
            temperature=0,
            condition_on_previous_text=True,
            vad_filter=True,
            vad_parameters={"min_silence_duration_ms": 280},
            word_timestamps=True,
            initial_prompt=prompt,
        )

        rendered_segments = []
        for segment in segments:
            rendered_segments.append(
                {
                    "start": round(segment.start, 3),
                    "end": round(segment.end, 3),
                    "text": segment.text.strip(),
                    "words": [
                        {
                            "start": round(word.start, 3),
                            "end": round(word.end, 3),
                            "word": word.word,
                            "probability": round(word.probability, 4),
                        }
                        for word in (segment.words or [])
                    ],
                }
            )

        existing[str(number)] = {
            "file": path.name,
            "duration": round(info.duration, 3),
            "language": info.language,
            "language_probability": round(info.language_probability, 4),
            "segments": rendered_segments,
            "text": "".join(segment["text"] for segment in rendered_segments),
        }
        args.output.write_text(
            json.dumps(
                {
                    "model": args.model,
                    "compute_type": args.compute_type,
                    "audio_root": str(args.audio_root),
                    "tracks": dict(sorted(existing.items(), key=lambda item: int(item[0]))),
                },
                ensure_ascii=False,
                indent=2,
            ),
            encoding="utf-8",
        )

    print(f"Saved {len(existing)} track transcript(s) to {args.output}")


if __name__ == "__main__":
    main()
