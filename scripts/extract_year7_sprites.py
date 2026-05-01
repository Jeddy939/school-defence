#!/usr/bin/env python3
"""Extract Year 7 idle and walk frames from a composited sprite sheet."""

from __future__ import annotations

import json
import os
from collections import deque
from pathlib import Path

from PIL import Image


def source_path(env_name: str, fallback: str) -> Path:
    return Path(os.environ.get(env_name, fallback))


SOURCE_SHEET = source_path("YEAR7_SOURCE_SHEET", r"D:\jmbow1\My Documents\Downloads\ChatGPT Image Apr 26, 2026, 12_39_30 PM.png")
PORTRAIT_SHEET = source_path("YEAR7_PORTRAIT_SHEET", r"D:\jmbow1\My Documents\Downloads\ChatGPT Image Apr 26, 2026, 01_03_35 PM.png")
DEATH_SHEET = source_path("YEAR7_DEATH_SHEET", r"D:\jmbow1\My Documents\Downloads\ChatGPT Image Apr 27, 2026, 09_54_29 AM.png")
ATTACK_SHEET = source_path("YEAR7_ATTACK_SHEET", r"D:\jmbow1\My Documents\Downloads\ChatGPT Image Apr 29, 2026, 10_54_36 AM.png")
OUTPUT_ROOT = Path(r"D:\jmbow1\Desktop\game projects\schoolyard defence\public\sprites\year-7")

DIRECTION_ORDER = ["south", "south-east", "east", "north-east", "north"]
ROW_BANDS = {
    "idle": (0, 200),
    "walk": (200, 380),
}
GAP_THRESHOLD = 120
FRAME_SIZE = 64
PORTRAIT_SIZE = 128
PADDING = 6
DEATH_COLUMNS = 6
ATTACK_COLUMNS = 3
PORTRAIT_BOXES = {
    "idle": [(59, 42, 343, 339), (346, 42, 627, 338), (632, 42, 910, 338), (913, 42, 1195, 338)],
    "talk": [(59, 348, 341, 643), (346, 349, 627, 643), (632, 348, 908, 643), (913, 349, 1195, 643)],
    "angry": [(59, 653, 341, 947), (346, 653, 627, 947), (632, 653, 908, 947), (913, 653, 1195, 947)],
    "hurt": [(84, 984, 297, 1207), (331, 983, 545, 1207)],
}


def is_foreground(pixel: tuple[int, int, int, int]) -> bool:
    r, g, b, a = pixel
    return a > 8 and min(r, g, b) < 230


def detect_components(image: Image.Image) -> list[tuple[int, int, int, int]]:
    width, height = image.size
    pixels = image.load()
    visited = bytearray(width * height)
    components: list[tuple[int, int, int, int]] = []

    for y in range(height):
        for x in range(width):
            index = y * width + x
            if visited[index]:
                continue
            visited[index] = 1
            if not is_foreground(pixels[x, y]):
                continue

            queue = deque([(x, y)])
            min_x = max_x = x
            min_y = max_y = y
            count = 0

            while queue:
                cx, cy = queue.popleft()
                count += 1
                min_x = min(min_x, cx)
                max_x = max(max_x, cx)
                min_y = min(min_y, cy)
                max_y = max(max_y, cy)

                for nx, ny in ((cx + 1, cy), (cx - 1, cy), (cx, cy + 1), (cx, cy - 1)):
                    if 0 <= nx < width and 0 <= ny < height:
                        n_index = ny * width + nx
                        if visited[n_index]:
                            continue
                        visited[n_index] = 1
                        if is_foreground(pixels[nx, ny]):
                            queue.append((nx, ny))

            if count >= 40:
                components.append((min_x, min_y, max_x + 1, max_y + 1))

    components.sort(key=lambda box: (box[1], box[0]))
    return components


def is_background(pixel: tuple[int, int, int, int]) -> bool:
    r, g, b, a = pixel
    if a <= 8:
        return True
    return abs(r - g) <= 10 and abs(g - b) <= 10 and r >= 232 and g >= 232 and b >= 232


def remove_checkerboard(crop: Image.Image) -> Image.Image:
    crop = crop.convert("RGBA")
    width, height = crop.size
    pixels = crop.load()
    visited = bytearray(width * height)
    queue = deque()

    def push(x: int, y: int) -> None:
        index = y * width + x
        if visited[index]:
            return
        visited[index] = 1
        if is_background(pixels[x, y]):
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
                if not visited[index]:
                    visited[index] = 1
                    if is_background(pixels[nx, ny]):
                        queue.append((nx, ny))

    return crop


def has_green_screen(image: Image.Image) -> bool:
    width, height = image.size
    sample_points = [
        (0, 0),
        (width - 1, 0),
        (0, height - 1),
        (width - 1, height - 1),
        (width // 2, height // 2),
    ]
    green_hits = 0
    pixels = image.load()
    for x, y in sample_points:
        r, g, b, a = pixels[x, y]
        if a > 8 and g >= 150 and g > r * 1.8 and g > b * 1.8:
            green_hits += 1
    return green_hits >= 3


def remove_green_screen(image: Image.Image) -> Image.Image:
    """Chroma-key the bright green image-generation background.

    This intentionally targets saturated green only. The Year 7 backpack is
    olive/dark and stays below these thresholds.
    """
    image = image.convert("RGBA")
    pixels = image.load()
    for y in range(image.height):
        for x in range(image.width):
            r, g, b, a = pixels[x, y]
            if a <= 8:
                continue
            saturated_green = (
                max(r, b) <= 170
                and (
                    (g >= 100 and g - max(r, b) >= 45)
                    or (g >= 160 and g - max(r, b) >= 30)
                )
            )
            if saturated_green:
                pixels[x, y] = (0, 0, 0, 0)
                continue

            green_fringe = a < 120 and g >= 55 and g - max(r, b) >= 28
            if green_fringe:
                pixels[x, y] = (0, 0, 0, 0)
                continue

            green_cast_white = min(r, b) >= 120 and g - max(r, b) >= 8
            if green_cast_white:
                neutral = max(r, b)
                pixels[x, y] = (neutral, neutral, neutral, a)
    return image


def crop_to_content(image: Image.Image) -> Image.Image:
    alpha = image.getchannel("A")
    bbox = alpha.getbbox()
    if bbox is None:
        return image
    return image.crop(bbox)


def group_idle_boxes(boxes: list[tuple[int, int, int, int]]) -> list[list[tuple[int, int, int, int]]]:
    groups: list[list[tuple[int, int, int, int]]] = []
    for box in sorted(boxes, key=lambda item: item[0]):
        if not groups or box[0] - groups[-1][-1][0] > GAP_THRESHOLD:
            groups.append([box])
        else:
            groups[-1].append(box)
    return groups


def assign_to_centers(
    boxes: list[tuple[int, int, int, int]], centers: list[float]
) -> dict[str, list[tuple[int, int, int, int]]]:
    grouped = {direction: [] for direction in DIRECTION_ORDER}
    for box in sorted(boxes, key=lambda item: item[0]):
        center_x = (box[0] + box[2]) / 2
        index = min(range(len(centers)), key=lambda i: abs(center_x - centers[i]))
        grouped[DIRECTION_ORDER[index]].append(box)
    return grouped


def compose_frames(crops: list[Image.Image], frame_size: int) -> list[Image.Image]:
    max_width = max(crop.width for crop in crops)
    max_height = max(crop.height for crop in crops)
    scale = min(frame_size / max_width, frame_size / max_height)
    frames: list[Image.Image] = []

    for crop in crops:
        width = max(1, int(round(crop.width * scale)))
        height = max(1, int(round(crop.height * scale)))
        resized = crop.resize((width, height), Image.Resampling.LANCZOS)
        canvas = Image.new("RGBA", (frame_size, frame_size), (0, 0, 0, 0))
        offset_x = (frame_size - width) // 2
        offset_y = frame_size - height
        canvas.alpha_composite(resized, (offset_x, offset_y))
        frames.append(canvas)

    return frames


def extract_death_frames(metadata: dict[str, dict[str, int]]) -> None:
    image = Image.open(DEATH_SHEET).convert("RGBA")
    width, height = image.size
    row_height = height / len(DIRECTION_ORDER)
    col_width = width / DEATH_COLUMNS
    grouped_crops: dict[str, list[Image.Image]] = {}

    (OUTPUT_ROOT / "source").mkdir(parents=True, exist_ok=True)
    image.save(OUTPUT_ROOT / "source" / "death-sheet.png")

    for row, direction in enumerate(DIRECTION_ORDER):
        crops: list[Image.Image] = []
        for col in range(DEATH_COLUMNS):
            left = max(0, int(round(col * col_width)) + PADDING)
            right = min(width, int(round((col + 1) * col_width)) - PADDING)
            top = max(0, int(round(row * row_height)) + PADDING)
            bottom = min(height, int(round((row + 1) * row_height)) - PADDING)
            crop = image.crop((left, top, right, bottom))
            crop = remove_checkerboard(crop)
            crop = crop_to_content(crop)
            crops.append(crop)
        grouped_crops[direction] = crops

    all_crops = [crop for crops in grouped_crops.values() for crop in crops]
    max_width = max(crop.width for crop in all_crops)
    max_height = max(crop.height for crop in all_crops)
    scale = min(FRAME_SIZE / max_width, FRAME_SIZE / max_height)
    metadata["death"] = {}

    for direction, crops in grouped_crops.items():
        out_dir = OUTPUT_ROOT / "death" / direction
        out_dir.mkdir(parents=True, exist_ok=True)
        for old_frame in out_dir.glob("frame_*.png"):
            old_frame.unlink()

        for index, crop in enumerate(crops):
            resized_width = max(1, int(round(crop.width * scale)))
            resized_height = max(1, int(round(crop.height * scale)))
            resized = crop.resize((resized_width, resized_height), Image.Resampling.NEAREST)
            canvas = Image.new("RGBA", (FRAME_SIZE, FRAME_SIZE), (0, 0, 0, 0))
            canvas.alpha_composite(resized, ((FRAME_SIZE - resized_width) // 2, FRAME_SIZE - resized_height))
            canvas.save(out_dir / f"frame_{index:03d}.png")

        metadata["death"][direction] = len(crops)


def extract_grid_animation(
    metadata: dict[str, dict[str, int]],
    animation: str,
    source: Path,
    columns: int,
) -> None:
    image = Image.open(source).convert("RGBA")
    use_green_screen = has_green_screen(image)
    width, height = image.size
    row_height = height / len(DIRECTION_ORDER)
    col_width = width / columns
    grouped_crops: dict[str, list[Image.Image]] = {}

    (OUTPUT_ROOT / "source").mkdir(parents=True, exist_ok=True)
    image.save(OUTPUT_ROOT / "source" / f"{animation}-sheet.png")

    for row, direction in enumerate(DIRECTION_ORDER):
        crops: list[Image.Image] = []
        for col in range(columns):
            left = max(0, int(round(col * col_width)) + PADDING)
            right = min(width, int(round((col + 1) * col_width)) - PADDING)
            top = max(0, int(round(row * row_height)) + PADDING)
            bottom = min(height, int(round((row + 1) * row_height)) - PADDING)
            crop = image.crop((left, top, right, bottom))
            crop = remove_green_screen(crop) if use_green_screen else remove_checkerboard(crop)
            crop = crop_to_content(crop)
            crops.append(crop)
        grouped_crops[direction] = crops

    all_crops = [crop for crops in grouped_crops.values() for crop in crops]
    # Recompose with one shared scale, so direction changes do not pop in size.
    max_width = max(crop.width for crop in all_crops)
    max_height = max(crop.height for crop in all_crops)
    scale = min(FRAME_SIZE / max_width, FRAME_SIZE / max_height)
    metadata[animation] = {}

    for direction, crops in grouped_crops.items():
        out_dir = OUTPUT_ROOT / animation / direction
        out_dir.mkdir(parents=True, exist_ok=True)
        for old_frame in out_dir.glob("frame_*.png"):
            old_frame.unlink()

        for index, crop in enumerate(crops):
            resized_width = max(1, int(round(crop.width * scale)))
            resized_height = max(1, int(round(crop.height * scale)))
            resized = crop.resize((resized_width, resized_height), Image.Resampling.LANCZOS)
            canvas = Image.new("RGBA", (FRAME_SIZE, FRAME_SIZE), (0, 0, 0, 0))
            canvas.alpha_composite(resized, ((FRAME_SIZE - resized_width) // 2, FRAME_SIZE - resized_height))
            canvas.save(out_dir / f"frame_{index:03d}.png")

        metadata[animation][direction] = len(crops)


def extract_portrait_frames() -> dict[str, int]:
    image = Image.open(PORTRAIT_SHEET).convert("RGBA")
    metadata: dict[str, int] = {}

    for animation, boxes in PORTRAIT_BOXES.items():
        crops = [crop_to_content(remove_checkerboard(image.crop(box))) for box in boxes]
        frames = compose_frames(crops, PORTRAIT_SIZE)
        out_dir = OUTPUT_ROOT / "portrait" / animation
        out_dir.mkdir(parents=True, exist_ok=True)
        for old_frame in out_dir.glob("frame_*.png"):
            old_frame.unlink()

        for index, frame in enumerate(frames):
            frame.save(out_dir / f"frame_{index:03d}.png")
        metadata[animation] = len(frames)

    return metadata


def main() -> None:
    image = Image.open(SOURCE_SHEET).convert("RGBA")
    components = detect_components(image)

    rows: dict[str, list[tuple[int, int, int, int]]] = {name: [] for name in ROW_BANDS}
    for box in components:
        for name, (min_y, max_y) in ROW_BANDS.items():
            if min_y <= box[1] < max_y:
                rows[name].append(box)
                break

    idle_groups = group_idle_boxes(rows["idle"])
    centers = [sum((box[0] + box[2]) / 2 for box in group) / len(group) for group in idle_groups]
    grouped_rows = {
        "idle": {direction: sorted(group, key=lambda item: item[0]) for direction, group in zip(DIRECTION_ORDER, idle_groups)},
        "walk": assign_to_centers(rows["walk"], centers),
    }
    # The original idle/walk source sheet does not include a usable back-diagonal
    # Year 7 pose. Reuse north for north-east so NE/NW do not face sideways.
    for animation in ("idle", "walk"):
        grouped_rows[animation]["north-east"] = list(grouped_rows[animation]["north"])

    (OUTPUT_ROOT / "source").mkdir(parents=True, exist_ok=True)
    image.save(OUTPUT_ROOT / "source" / "gameplay-sheet.png")
    Image.open(PORTRAIT_SHEET).save(OUTPUT_ROOT / "source" / "portrait-sheet.png")

    metadata: dict[str, dict[str, int]] = {}

    for animation, direction_boxes in grouped_rows.items():
        metadata[animation] = {}
        for direction, boxes in direction_boxes.items():
            crops = []
            for left, top, right, bottom in boxes:
                crop = image.crop((max(0, left - PADDING), max(0, top - PADDING), min(image.width, right + PADDING), min(image.height, bottom + PADDING)))
                crop = remove_checkerboard(crop)
                crop = crop_to_content(crop)
                crops.append(crop)

            frames = compose_frames(crops, FRAME_SIZE)
            out_dir = OUTPUT_ROOT / animation / direction
            out_dir.mkdir(parents=True, exist_ok=True)
            for index, frame in enumerate(frames):
                frame.save(out_dir / f"frame_{index:03d}.png")
            metadata[animation][direction] = len(frames)

    extract_death_frames(metadata)
    extract_grid_animation(metadata, "attack", ATTACK_SHEET, ATTACK_COLUMNS)
    portrait_metadata = extract_portrait_frames()

    with (OUTPUT_ROOT / "metadata.json").open("w", encoding="utf-8") as fh:
        json.dump(
            {
                "frame_size": FRAME_SIZE,
                "portrait_frame_size": PORTRAIT_SIZE,
                "directions": DIRECTION_ORDER,
                "animations": metadata,
                "portraits": portrait_metadata,
                "sources": {
                    "gameplay": str(SOURCE_SHEET),
                    "death": str(DEATH_SHEET),
                    "attack": str(ATTACK_SHEET),
                },
                "portrait_source": str(PORTRAIT_SHEET),
            },
            fh,
            indent=2,
        )


if __name__ == "__main__":
    main()
