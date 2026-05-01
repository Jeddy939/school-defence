#!/usr/bin/env python3
"""Extract Teacher's Aide work/build frames from split prompt sheets.

Expected source sheets:
- north sheet: 3 rows x 3 columns, ordered NORTH, NORTH-EAST, EAST
- south sheet: 2 rows x 3 columns, ordered SOUTH-EAST, SOUTH
- portrait sheet: 3 rows x 4 columns, ordered IDLE, TALK, STRESSED

The runtime already expects Teacher's Aide work to have 5 frames and build to
have 6 frames, so the 3 generated action poses are expanded into those counts.
"""

from __future__ import annotations

import json
import os
from pathlib import Path

from PIL import Image


PROJECT_ROOT = Path(r"D:\jmbow1\Desktop\game projects\schoolyard defence")
DEFAULT_SOURCE_ROOT = PROJECT_ROOT / "generated" / "chatgpt-sprites" / "teacher-aide-rtspixel" / "raw"
OUTPUT_ROOT = PROJECT_ROOT / "public" / "sprites" / "teacher-aide-rtspixel"

def default_latest(stem: str) -> Path:
    for extension in (".png", ".webp", ".jpg", ".jpeg"):
        candidate = DEFAULT_SOURCE_ROOT / f"{stem}{extension}"
        if candidate.exists():
            return candidate
    return DEFAULT_SOURCE_ROOT / f"{stem}.png"


NORTH_SHEET = Path(os.environ.get("TA_WORK_BUILD_NORTH_SHEET", default_latest("latest-teacher-aide-work-build-north")))
SOUTH_SHEET = Path(os.environ.get("TA_WORK_BUILD_SOUTH_SHEET", default_latest("latest-teacher-aide-work-build-south")))
PORTRAIT_SHEET = Path(os.environ.get("TA_PORTRAIT_SHEET", default_latest("latest-teacher-aide-portrait")))

DIRECTION_ORDER = ["north", "north-east", "east", "south-east", "south"]
FRAME_SIZE = 64
PORTRAIT_SIZE = 128
PADDING = 8
WORK_FRAME_PATTERN = [0, 1, 2, 1, 0]
BUILD_FRAME_PATTERN = [0, 0, 1, 1, 2, 2]


def source_exists(path: Path, label: str) -> None:
    if not path.exists():
        raise FileNotFoundError(f"{label} source does not exist: {path}")


def is_green_pixel(pixel: tuple[int, int, int, int]) -> bool:
    r, g, b, a = pixel
    if a <= 8:
        return True
    return g >= 130 and g - max(r, b) >= 40 and max(r, b) <= 190


def remove_green_screen(image: Image.Image) -> Image.Image:
    image = image.convert("RGBA")
    pixels = image.load()
    for y in range(image.height):
        for x in range(image.width):
            r, g, b, a = pixels[x, y]
            if is_green_pixel((r, g, b, a)):
                pixels[x, y] = (0, 0, 0, 0)
    return image


def crop_to_content(image: Image.Image) -> Image.Image:
    bbox = image.getchannel("A").getbbox()
    if bbox is None:
        return image
    return image.crop(bbox)


def split_grid(path: Path, rows: int, cols: int) -> list[list[Image.Image]]:
    image = Image.open(path).convert("RGBA")
    grid: list[list[Image.Image]] = []
    for row in range(rows):
        cells: list[Image.Image] = []
        top = round(row * image.height / rows) + PADDING
        bottom = round((row + 1) * image.height / rows) - PADDING
        for col in range(cols):
            left = round(col * image.width / cols) + PADDING
            right = round((col + 1) * image.width / cols) - PADDING
            crop = image.crop((left, top, right, bottom))
            cells.append(crop_to_content(remove_green_screen(crop)))
        grid.append(cells)
    return grid


def infer_grid_rows(path: Path, default_rows: int) -> int:
    image = Image.open(path)
    ratio = image.width / image.height
    image.close()
    # The south sheets are either 2 rows x N columns or 3 rows x N columns.
    # ChatGPT often returns a 1536x1024 canvas for both, so prefer prompt text
    # as the source of truth when the aspect ratio is ambiguous.
    if path == SOUTH_SHEET:
        prompt_dir = PROJECT_ROOT / "prompts" / "sprites" / "teacher-aide"
        south_prompts = [
            prompt_dir / "teacher-aide-work-build-south.txt",
            prompt_dir / "teacher-aide-idle-south.txt",
            prompt_dir / "teacher-aide-walk-south.txt",
        ]
        for prompt in south_prompts:
            text = prompt.read_text(encoding="utf-8").upper()
            if prompt.exists() and (
                "3 DIRECTION ROWS: EAST, SOUTH-EAST, SOUTH" in text
                or "EAST, SOUTH-EAST, SOUTH" in text
            ):
                return 3
    if ratio < 1.35:
        return 3
    return default_rows


def compose_runtime_frames(crops: list[Image.Image], frame_size: int) -> list[Image.Image]:
    max_width = max(crop.width for crop in crops)
    max_height = max(crop.height for crop in crops)
    scale = min(frame_size / max_width, frame_size / max_height)
    frames: list[Image.Image] = []

    for crop in crops:
        width = max(1, int(round(crop.width * scale)))
        height = max(1, int(round(crop.height * scale)))
        resized = crop.resize((width, height), Image.Resampling.NEAREST)
        canvas = Image.new("RGBA", (frame_size, frame_size), (0, 0, 0, 0))
        canvas.alpha_composite(resized, ((frame_size - width) // 2, frame_size - height))
        frames.append(canvas)

    return frames


def write_animation(
    direction_crops: dict[str, list[Image.Image]],
    animation: str,
    pattern: list[int],
) -> dict[str, int]:
    all_crops = [crop for crops in direction_crops.values() for crop in crops]
    max_width = max(crop.width for crop in all_crops)
    max_height = max(crop.height for crop in all_crops)
    scale = min(FRAME_SIZE / max_width, FRAME_SIZE / max_height)
    counts: dict[str, int] = {}

    for direction, crops in direction_crops.items():
        out_dir = OUTPUT_ROOT / animation / direction
        out_dir.mkdir(parents=True, exist_ok=True)
        for old_frame in out_dir.glob("frame_*.png"):
            old_frame.unlink()

        for frame_index, source_index in enumerate(pattern):
            crop = crops[source_index]
            width = max(1, int(round(crop.width * scale)))
            height = max(1, int(round(crop.height * scale)))
            resized = crop.resize((width, height), Image.Resampling.NEAREST)
            canvas = Image.new("RGBA", (FRAME_SIZE, FRAME_SIZE), (0, 0, 0, 0))
            canvas.alpha_composite(resized, ((FRAME_SIZE - width) // 2, FRAME_SIZE - height))
            canvas.save(out_dir / f"frame_{frame_index:03d}.png")

        counts[direction] = len(pattern)

    return counts


def write_portraits() -> dict[str, int]:
    if not PORTRAIT_SHEET.exists():
        return {}

    portrait_rows = split_grid(PORTRAIT_SHEET, rows=3, cols=4)
    row_names = ["idle", "talk", "stressed"]
    metadata: dict[str, int] = {}
    for row_name, row in zip(row_names, portrait_rows):
        frames = compose_runtime_frames(row, PORTRAIT_SIZE)
        out_dir = OUTPUT_ROOT / "portrait" / row_name
        out_dir.mkdir(parents=True, exist_ok=True)
        for old_frame in out_dir.glob("frame_*.png"):
            old_frame.unlink()
        for index, frame in enumerate(frames):
            frame.save(out_dir / f"frame_{index:03d}.png")
        metadata[row_name] = len(frames)
    return metadata


def load_metadata() -> dict:
    metadata_path = OUTPUT_ROOT / "metadata.json"
    if metadata_path.exists():
        return json.loads(metadata_path.read_text(encoding="utf-8"))
    return {
        "frame_size": FRAME_SIZE,
        "portrait_frame_size": PORTRAIT_SIZE,
        "directions": DIRECTION_ORDER,
        "animations": {},
        "portraits": {},
    }


def main() -> None:
    source_exists(NORTH_SHEET, "TA north/work-build")
    source_exists(SOUTH_SHEET, "TA south/work-build")

    north_rows = split_grid(NORTH_SHEET, rows=3, cols=3)
    south_row_count = infer_grid_rows(SOUTH_SHEET, default_rows=2)
    south_rows = split_grid(SOUTH_SHEET, rows=south_row_count, cols=3)
    direction_crops = {
        "north": north_rows[0],
        "north-east": north_rows[1],
        "east": north_rows[2],
    }
    if south_row_count >= 3:
        direction_crops["east"] = south_rows[0]
        direction_crops["south-east"] = south_rows[1]
        direction_crops["south"] = south_rows[2]
    else:
        direction_crops["south-east"] = south_rows[0]
        direction_crops["south"] = south_rows[1]

    metadata = load_metadata()
    metadata.setdefault("animations", {})
    metadata.setdefault("portraits", {})
    metadata["animations"]["work"] = write_animation(direction_crops, "work", WORK_FRAME_PATTERN)
    metadata["animations"]["build"] = write_animation(direction_crops, "build", BUILD_FRAME_PATTERN)
    portrait_metadata = write_portraits()
    if portrait_metadata:
        metadata["portraits"].update(portrait_metadata)

    (OUTPUT_ROOT / "source").mkdir(parents=True, exist_ok=True)
    Image.open(NORTH_SHEET).save(OUTPUT_ROOT / "source" / "prompt-work-build-north-sheet.png")
    Image.open(SOUTH_SHEET).save(OUTPUT_ROOT / "source" / "prompt-work-build-south-sheet.png")
    if PORTRAIT_SHEET.exists():
        Image.open(PORTRAIT_SHEET).save(OUTPUT_ROOT / "source" / "prompt-portrait-sheet.png")

    metadata["prompt_sources"] = {
        "work_build_north": str(NORTH_SHEET),
        "work_build_south": str(SOUTH_SHEET),
        "portrait": str(PORTRAIT_SHEET) if PORTRAIT_SHEET.exists() else None,
    }
    (OUTPUT_ROOT / "metadata.json").write_text(json.dumps(metadata, indent=2), encoding="utf-8")


if __name__ == "__main__":
    main()
