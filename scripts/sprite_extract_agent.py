#!/usr/bin/env python3
"""Clean and extract generated sprite sheets into a staging folder.

This stage is intentionally not allowed to write to public/sprites. It removes
green-screen pixels, cuts known sheet layouts into fixed-size frames, and writes
generated/extracted-sprites/<unit> for QA.
"""

from __future__ import annotations

import argparse
import json
import re
import shutil
from collections import deque
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable

from PIL import Image


PROJECT_ROOT = Path(__file__).resolve().parents[1]
DEFAULT_LIBRARY_ROOTS = [
    PROJECT_ROOT / "generated" / "chatgpt-sprites",
    PROJECT_ROOT / "generated" / "openai-sprites",
]
OUTPUT_ROOT = PROJECT_ROOT / "generated" / "extracted-sprites"
PUBLIC_SPRITES_ROOT = PROJECT_ROOT / "public" / "sprites"
IMAGE_EXTENSIONS = {".png", ".webp", ".jpg", ".jpeg"}
NORTH_ROWS = ["north", "north-east", "east"]
SOUTH_ROWS = ["east", "south-east", "south"]
SOUTH_ROWS_NO_EAST = ["south-east", "south"]
PORTRAIT_ROWS_4 = ["idle", "talk", "angry", "hurt"]
PORTRAIT_ROWS_3 = ["idle", "talk", "stressed"]
FRAME_SIZE_DEFAULT = 64
PORTRAIT_SIZE_DEFAULT = 128
PADDING = 8


@dataclass(frozen=True)
class SheetJob:
    source: Path
    animation: str
    side: str | None
    modified: float


def is_visible_green(pixel: tuple[int, int, int, int]) -> bool:
    r, g, b, a = pixel
    if a <= 8:
        return False
    return g >= 95 and g - max(r, b) >= 30 and max(r, b) <= 220


def is_green_screen_pixel(pixel: tuple[int, int, int, int]) -> bool:
    r, g, b, a = pixel
    if a <= 8:
        return True
    max_rb = max(r, b)
    return (
        (g >= 105 and g - max_rb >= 35 and max_rb <= 210)
        or (g >= 180 and r <= 90 and b <= 90)
        or (a < 180 and g >= 70 and g - max_rb >= 24)
    )


def remove_green_screen(image: Image.Image) -> Image.Image:
    image = image.convert("RGBA")
    width, height = image.size
    pixels = image.load()
    visited = bytearray(width * height)
    queue: deque[tuple[int, int]] = deque()

    def push(x: int, y: int) -> None:
        index = y * width + x
        if visited[index]:
            return
        visited[index] = 1
        if is_green_screen_pixel(pixels[x, y]):
            queue.append((x, y))

    for x in range(width):
        push(x, 0)
        push(x, height - 1)
    for y in range(height):
        push(0, y)
        push(width - 1, y)

    while queue:
        x, y = queue.popleft()
        pixels[x, y] = (0, 0, 0, 0)
        for nx, ny in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
            if 0 <= nx < width and 0 <= ny < height:
                index = ny * width + nx
                if visited[index]:
                    continue
                visited[index] = 1
                if is_green_screen_pixel(pixels[nx, ny]):
                    queue.append((nx, ny))

    for y in range(height):
        for x in range(width):
            if is_visible_green(pixels[x, y]):
                pixels[x, y] = (0, 0, 0, 0)
    return image


def crop_to_content(image: Image.Image) -> Image.Image:
    bbox = image.getchannel("A").getbbox()
    if bbox is None:
        return image
    return image.crop(bbox)


def normalize_frames(crops: list[Image.Image], frame_size: int, target_count: int | None = None) -> list[Image.Image]:
    if not crops:
        return []
    indexes = list(range(len(crops)))
    if target_count and target_count != len(crops):
        indexes = [min(len(crops) - 1, round(i * (len(crops) - 1) / max(1, target_count - 1))) for i in range(target_count)]
    selected = [crops[i] for i in indexes]
    max_w = max(crop.width for crop in selected)
    max_h = max(crop.height for crop in selected)
    scale = min((frame_size - 6) / max_w, (frame_size - 6) / max_h)
    frames: list[Image.Image] = []
    for crop in selected:
        w = max(1, round(crop.width * scale))
        h = max(1, round(crop.height * scale))
        resized = crop.resize((w, h), Image.Resampling.NEAREST)
        canvas = Image.new("RGBA", (frame_size, frame_size), (0, 0, 0, 0))
        canvas.alpha_composite(resized, ((frame_size - w) // 2, frame_size - h - 2))
        frames.append(remove_green_screen(canvas))
    return frames


def strip_latest_and_timestamp(stem: str) -> str:
    if stem.startswith("latest-"):
        stem = stem[len("latest-"):]
    return re.sub(r"-\d{8}-\d{6}$", "", stem)


def parse_job(path: Path) -> SheetJob | None:
    tokens = strip_latest_and_timestamp(path.stem).split("-")
    side = None
    if tokens and tokens[-1] in {"north", "south"}:
        side = tokens.pop()
    if "portrait" in tokens:
        return SheetJob(path, "portrait", None, path.stat().st_mtime)
    if "work" in tokens and "build" in tokens:
        return SheetJob(path, "work-build", side, path.stat().st_mtime)
    for animation in ("idle", "walk", "attack", "death", "defeat"):
        if animation in tokens:
            return SheetJob(path, animation, side, path.stat().st_mtime)
    return None


def discover_unit_raw_dirs(library_roots: Iterable[Path]) -> list[tuple[str, Path]]:
    units: list[tuple[str, Path]] = []
    for root in library_roots:
        if not root.exists():
            continue
        for unit_dir in sorted(path for path in root.iterdir() if path.is_dir()):
            raw_dir = unit_dir / "raw"
            if raw_dir.exists():
                units.append((unit_dir.name, raw_dir))
    return units


def discover_jobs(raw_dir: Path) -> list[SheetJob]:
    jobs = [parse_job(path) for path in raw_dir.iterdir() if path.suffix.lower() in IMAGE_EXTENSIONS]
    latest_jobs = [job for job in jobs if job and job.source.stem.startswith("latest-")]
    candidates = latest_jobs or [job for job in jobs if job]
    selected: dict[tuple[str, str | None], SheetJob] = {}
    for job in candidates:
        key = (job.animation, job.side)
        previous = selected.get(key)
        if previous is None or job.modified > previous.modified:
            selected[key] = job
    return sorted(selected.values(), key=lambda job: (job.animation, job.side or ""))


def load_public_metadata(unit: str) -> dict:
    path = PUBLIC_SPRITES_ROOT / unit / "metadata.json"
    if not path.exists():
        return {}
    return json.loads(path.read_text(encoding="utf-8"))


def resolve_animation(metadata: dict, animation: str) -> str:
    if animation == "death" and "defeat" in metadata.get("animations", {}):
        return "defeat"
    return animation


def target_count(metadata: dict, animation: str, direction: str, source_count: int) -> int:
    current = metadata.get("animations", {}).get(animation, {}).get(direction)
    if isinstance(current, int) and current > 0:
        return current
    return source_count


def infer_columns_from_alpha(image: Image.Image, row_count: int) -> int:
    width, height = image.size
    alpha = image.getchannel("A")
    counts: list[int] = []
    for row in range(row_count):
        top = round(row * height / row_count)
        bottom = round((row + 1) * height / row_count)
        active = []
        for x in range(width):
            column_pixels = 0
            for y in range(top, bottom):
                if alpha.getpixel((x, y)) > 8:
                    column_pixels += 1
            active.append(column_pixels >= 6)

        runs: list[tuple[int, int]] = []
        start = None
        for index, value in enumerate(active):
            if value and start is None:
                start = index
            elif not value and start is not None:
                if index - start >= 8:
                    runs.append((start, index))
                start = None
        if start is not None and width - start >= 8:
            runs.append((start, width))

        merged: list[tuple[int, int]] = []
        for run in runs:
            if merged and run[0] - merged[-1][1] <= 28:
                merged[-1] = (merged[-1][0], run[1])
            else:
                merged.append(run)
        if merged:
            counts.append(len(merged))

    if not counts:
        return 3
    return max(counts)


def layout_for_job(job: SheetJob, source: Image.Image) -> tuple[list[str], int]:
    if job.side == "north":
        rows = NORTH_ROWS
        if source.width == source.height and len(rows) == 3:
            return rows, 3
        return rows, infer_columns_from_alpha(source, len(rows))
    if job.side == "south":
        if job.animation == "work-build":
            rows = SOUTH_ROWS_NO_EAST if source.width / source.height > 1.1 else SOUTH_ROWS
            return rows, infer_columns_from_alpha(source, len(rows))
        rows = SOUTH_ROWS
        if source.width == source.height and len(rows) == 3:
            return rows, 3
        return rows, infer_columns_from_alpha(source, len(rows))
    raise ValueError(f"{job.source.name} needs a north/south suffix")


def split_grid(image: Image.Image, rows: list[str], columns: int) -> dict[str, list[Image.Image]]:
    row_h = image.height / len(rows)
    col_w = image.width / columns
    output: dict[str, list[Image.Image]] = {}
    for row_index, direction in enumerate(rows):
        crops: list[Image.Image] = []
        for col in range(columns):
            left = max(0, round(col * col_w) + PADDING)
            right = min(image.width, round((col + 1) * col_w) - PADDING)
            top = max(0, round(row_index * row_h) + PADDING)
            bottom = min(image.height, round((row_index + 1) * row_h) - PADDING)
            crops.append(crop_to_content(image.crop((left, top, right, bottom))))
        output[direction] = crops
    return output


def write_frames(out_dir: Path, frames: list[Image.Image]) -> int:
    out_dir.mkdir(parents=True, exist_ok=True)
    for old in out_dir.glob("frame_*.png"):
        old.unlink()
    for index, frame in enumerate(frames):
        frame.save(out_dir / f"frame_{index:03d}.png")
    return len(frames)


def extract_job(unit_root: Path, metadata: dict, job: SheetJob, frame_size: int, portrait_size: int) -> dict:
    source = remove_green_screen(Image.open(job.source).convert("RGBA"))
    source_dir = unit_root / "source"
    source_dir.mkdir(parents=True, exist_ok=True)
    source.save(source_dir / f"{job.source.stem}.png")

    if job.animation == "portrait":
        rows = PORTRAIT_ROWS_4 if source.height >= source.width * 0.85 else PORTRAIT_ROWS_3
        grid = split_grid(source, rows, 4)
        counts = {}
        for name, crops in grid.items():
            frames = normalize_frames(crops, portrait_size, len(crops))
            counts[name] = write_frames(unit_root / "portrait" / name, frames)
        return {"portrait": counts}

    rows, columns = layout_for_job(job, source)
    grid = split_grid(source, rows, columns)
    animation = resolve_animation(metadata, job.animation)
    updates = {}

    if animation == "work-build":
        for runtime_animation in ("work", "build"):
            counts = {}
            for direction, crops in grid.items():
                frames = normalize_frames(crops, frame_size, target_count(metadata, runtime_animation, direction, len(crops)))
                counts[direction] = write_frames(unit_root / runtime_animation / direction, frames)
            updates[runtime_animation] = counts
    else:
        counts = {}
        for direction, crops in grid.items():
            frames = normalize_frames(crops, frame_size, target_count(metadata, animation, direction, len(crops)))
            counts[direction] = write_frames(unit_root / animation / direction, frames)
        updates[animation] = counts
    return {"animations": updates}


def extract_unit(unit: str, raw_dir: Path) -> None:
    public_metadata = load_public_metadata(unit)
    frame_size = int(public_metadata.get("frame_size") or FRAME_SIZE_DEFAULT)
    portrait_size = int(public_metadata.get("portrait_frame_size") or PORTRAIT_SIZE_DEFAULT)
    out_root = OUTPUT_ROOT / unit
    if out_root.exists():
        shutil.rmtree(out_root)
    out_root.mkdir(parents=True, exist_ok=True)

    staged_metadata = {
        "unit": unit,
        "frame_size": frame_size,
        "portrait_frame_size": portrait_size,
        "directions": public_metadata.get("directions", ["north", "north-east", "east", "south-east", "south"]),
        "animations": {},
        "portraits": {},
        "sources": {},
    }

    jobs = discover_jobs(raw_dir)
    for job in jobs:
        result = extract_job(out_root, public_metadata, job, frame_size, portrait_size)
        if "animations" in result:
            for animation, directions in result["animations"].items():
                staged_metadata["animations"].setdefault(animation, {})
                staged_metadata["animations"][animation].update(directions)
        if "portrait" in result:
            staged_metadata["portraits"].update(result["portrait"])
        staged_metadata["sources"][f"{job.animation}_{job.side or 'sheet'}"] = str(job.source)

    (out_root / "metadata.json").write_text(json.dumps(staged_metadata, indent=2), encoding="utf-8")
    print(f"{unit}: extracted {len(jobs)} sheet(s) into {out_root}")


def main() -> None:
    parser = argparse.ArgumentParser(description="Clean and cut generated sprite sheets into extracted staging frames.")
    parser.add_argument("--unit", help="Only process one unit.")
    parser.add_argument("--library-root", action="append", type=Path)
    args = parser.parse_args()

    roots = args.library_root or DEFAULT_LIBRARY_ROOTS
    units = discover_unit_raw_dirs(roots)
    if args.unit:
        units = [(unit, raw) for unit, raw in units if unit == args.unit]
    if not units:
        raise SystemExit("No generated sprite raw folders found.")
    for unit, raw_dir in units:
        extract_unit(unit, raw_dir)


if __name__ == "__main__":
    main()
