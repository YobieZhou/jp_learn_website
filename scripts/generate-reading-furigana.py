"""Generate build-time ruby markup for the reviewed Minna audio transcript."""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path


PROJECT_ROOT = Path(__file__).resolve().parents[1]
LOCAL_PACKAGES = PROJECT_ROOT / "tmp" / "asr-packages"
if LOCAL_PACKAGES.exists():
    sys.path.insert(0, str(LOCAL_PACKAGES))

from fugashi import Tagger  # noqa: E402


INPUT_PATH = PROJECT_ROOT / "tmp" / "minna-furigana-input.json"
OUTPUT_PATH = PROJECT_ROOT / "tmp" / "minna-furigana-map.json"
KANJI_PATTERN = re.compile(r"[々〆ヵヶ一-龯]")


def katakana_to_hiragana(value: str) -> str:
    return "".join(
        chr(ord(character) - 0x60)
        if "ァ" <= character <= "ヶ"
        else character
        for character in value
    )


def annotate_token(surface: str, kana: str | None) -> str:
    if not KANJI_PATTERN.search(surface) or not kana or kana == "*":
        return surface

    reading = katakana_to_hiragana(kana)
    kanji_positions = [
        index for index, character in enumerate(surface)
        if KANJI_PATTERN.fullmatch(character)
    ]
    if not kanji_positions:
        return surface

    first_kanji = kanji_positions[0]
    last_kanji = kanji_positions[-1]
    prefix = surface[:first_kanji]
    suffix = surface[last_kanji + 1 :]
    reading_core = reading

    if prefix and reading_core.startswith(prefix):
        reading_core = reading_core[len(prefix) :]
    else:
        prefix = ""
        first_kanji = 0

    if suffix and reading_core.endswith(suffix):
        reading_core = reading_core[: -len(suffix)]
    else:
        suffix = ""
        last_kanji = len(surface) - 1

    surface_core = surface[first_kanji : last_kanji + 1]
    if not surface_core or not reading_core:
        return surface
    return f"{prefix}｜{surface_core}《{reading_core}》{suffix}"


def annotate_text(tagger: Tagger, text: str) -> str:
    pieces: list[str] = []
    cursor = 0
    for word in tagger(text):
        position = text.find(word.surface, cursor)
        if position < 0:
            position = cursor
        pieces.append(text[cursor:position])
        pieces.append(annotate_token(word.surface, getattr(word.feature, "kana", None)))
        cursor = position + len(word.surface)
    pieces.append(text[cursor:])
    markup = "".join(pieces)
    return (
        markup
        .replace("｜日本《にっぽん》｜語《ご》", "｜日本語《にほんご》")
        .replace("｜日本《にっぽん》", "｜日本《にほん》")
        .replace("｜明日《あす》", "｜明日《あした》")
        .replace("2、3｜日《か》", "2、3｜日《にち》")
    )


def main() -> None:
    texts = json.loads(INPUT_PATH.read_text(encoding="utf-8"))
    tagger = Tagger()
    mappings = {text: annotate_text(tagger, text) for text in texts}
    OUTPUT_PATH.write_text(
        json.dumps(mappings, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    annotated = sum(1 for text, markup in mappings.items() if text != markup)
    print(f"Generated furigana for {annotated}/{len(mappings)} transcript lines.")


if __name__ == "__main__":
    main()
