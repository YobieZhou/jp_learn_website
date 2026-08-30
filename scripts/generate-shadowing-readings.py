"""Generate static furigana segments for every shadowing sentence.

Requires Janome at generation time only. The website consumes the generated
shadowing-readings.mjs file and has no runtime dependency on Janome.
"""

from __future__ import annotations

import json
import os
from pathlib import Path
import re
import shutil
import subprocess
import sys

from janome.tokenizer import Tokenizer


ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "shadowing-readings.mjs"
KANJI = re.compile(r"[々〆ヵヶ一-龯]")
PHRASE_OVERRIDES: dict[str, list[str | list[str]]] = {
    "ホームルームの後": ["ホームルームの", ["後", "あと"]],
    "行ってみたい": [["行", "い"], "ってみたい"],
    "日本中": [["日本", "にほん"], ["中", "じゅう"]],
    "一日中": [["一日", "いちにち"], ["中", "じゅう"]],
    "降りそう": [["降", "ふ"], "りそう"],
    "弾ける": [["弾", "ひ"], "ける"],
    "弾き": [["弾", "ひ"], "き"],
    "した後": ["した", ["後", "あと"]],
    "後で": [["後", "あと"], "で"],
    "一人": [["一人", "ひとり"]],
    "30分": [["30分", "さんじゅっぷん"]],
    "4日": [["4日", "よっか"]],
}


def katakana_to_hiragana(value: str) -> str:
    return "".join(
        chr(ord(char) - 0x60) if "ァ" <= char <= "ヶ" else char
        for char in value
    )


def character_kind(char: str) -> str:
    if KANJI.fullmatch(char):
        return "kanji"
    if "ぁ" <= char <= "ゖ" or "ァ" <= char <= "ヺ" or char == "ー":
        return "kana"
    return "other"


def surface_runs(surface: str) -> list[tuple[str, str]]:
    runs: list[tuple[str, str]] = []
    for char in surface:
        kind = character_kind(char)
        if runs and runs[-1][0] == kind:
            runs[-1] = (kind, runs[-1][1] + char)
        else:
            runs.append((kind, char))
    return runs


def group_ruby(surface: str, reading: str) -> list[str | list[str]]:
    return [[surface, katakana_to_hiragana(reading)]]


def annotate_token(surface: str, reading: str) -> list[str | list[str]]:
    if not KANJI.search(surface):
        return [surface]
    if not reading or reading == "*":
        return [surface]

    pronunciation = katakana_to_hiragana(reading)
    runs = surface_runs(surface)
    output: list[str | list[str]] = []
    cursor = 0

    for index, (kind, text) in enumerate(runs):
        if kind == "other":
            output.append(text)
            continue

        if kind == "kana":
            anchor = katakana_to_hiragana(text)
            if not pronunciation.startswith(anchor, cursor):
                return group_ruby(surface, reading)
            output.append(text)
            cursor += len(anchor)
            continue

        next_anchor = ""
        for later_kind, later_text in runs[index + 1 :]:
            if later_kind == "kana":
                next_anchor = katakana_to_hiragana(later_text)
                break
        if next_anchor:
            # The first kana in a reading can be identical to the okurigana
            # (for example 言い / いい). A kanji run must consume at least one
            # reading character before the following kana anchor.
            boundary = pronunciation.find(next_anchor, cursor + 1)
            if boundary <= cursor:
                return group_ruby(surface, reading)
        else:
            boundary = len(pronunciation)

        ruby = pronunciation[cursor:boundary]
        if not ruby:
            return group_ruby(surface, reading)
        output.append([text, ruby])
        cursor = boundary

    if cursor != len(pronunciation):
        return group_ruby(surface, reading)
    return output


def merge_plain_segments(segments: list[str | list[str]]) -> list[str | list[str]]:
    merged: list[str | list[str]] = []
    for segment in segments:
        if isinstance(segment, str) and merged and isinstance(merged[-1], str):
            merged[-1] += segment
        else:
            merged.append(segment)
    return merged


def annotate_fragment(tokenizer: Tokenizer, text: str) -> list[str | list[str]]:
    segments: list[str | list[str]] = []
    for token in tokenizer.tokenize(text):
        segments.extend(annotate_token(token.surface, token.reading))
    return segments


def annotate_sentence(tokenizer: Tokenizer, sentence: str) -> list[str | list[str]]:
    segments: list[str | list[str]] = []
    cursor = 0
    overrides = sorted(PHRASE_OVERRIDES.items(), key=lambda item: len(item[0]), reverse=True)

    while cursor < len(sentence):
        matches = [
            (sentence.find(phrase, cursor), phrase, replacement)
            for phrase, replacement in overrides
            if sentence.find(phrase, cursor) >= 0
        ]
        if not matches:
            segments.extend(annotate_fragment(tokenizer, sentence[cursor:]))
            break

        position, phrase, replacement = min(matches, key=lambda item: (item[0], -len(item[1])))
        if position > cursor:
            segments.extend(annotate_fragment(tokenizer, sentence[cursor:position]))
        segments.extend(replacement)
        cursor = position + len(phrase)

    segments = merge_plain_segments(segments)
    rebuilt = "".join(segment if isinstance(segment, str) else segment[0] for segment in segments)
    if rebuilt != sentence:
        raise ValueError(f"Reading segmentation changed the source text: {sentence}")
    return segments


def load_lessons() -> list[dict]:
    node = os.environ.get("NODE_BINARY") or shutil.which("node")
    if not node:
        raise RuntimeError("Node.js was not found. Set NODE_BINARY before running this script.")
    source = (
        "import { shadowingLessons } from './shadowing-data.mjs';"
        "console.log(JSON.stringify(shadowingLessons.map(({id,sentences})=>"
        "({id,sentences:sentences.map(({jp})=>jp)}))));"
    )
    result = subprocess.run(
        [node, "--input-type=module", "--eval", source],
        cwd=ROOT,
        check=True,
        capture_output=True,
        text=True,
        encoding="utf-8",
    )
    return json.loads(result.stdout)


def main() -> None:
    tokenizer = Tokenizer()
    lessons = load_lessons()
    readings: dict[str, list[list[str | list[str]]]] = {}
    ruby_count = 0

    for lesson in lessons:
        annotated = [annotate_sentence(tokenizer, sentence) for sentence in lesson["sentences"]]
        readings[str(lesson["id"])] = annotated
        ruby_count += sum(
            isinstance(segment, list)
            for sentence in annotated
            for segment in sentence
        )

    payload = json.dumps(readings, ensure_ascii=False, indent=2)
    OUTPUT.write_text(
        "// Generated by scripts/generate-shadowing-readings.py.\n"
        f"export const shadowingReadings = Object.freeze({payload});\n",
        encoding="utf-8",
        newline="\n",
    )
    sentence_count = sum(len(items) for items in readings.values())
    print(f"Generated {ruby_count} ruby groups across {sentence_count} sentences in {OUTPUT}")


if __name__ == "__main__":
    try:
        main()
    except Exception as error:
        print(f"Furigana generation failed: {error}", file=sys.stderr)
        raise
