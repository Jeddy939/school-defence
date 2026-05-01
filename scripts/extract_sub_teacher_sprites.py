#!/usr/bin/env python3
"""Extract Substitute Teacher frames from generated sprite sheets."""

from __future__ import annotations

import json
from collections import deque
from pathlib import Path

from PIL import Image


DOWNLOADS = Path(r"D:\jmbow1\My Documents\Downloads")
OUTPUT_ROOT = Path(r"D:\jmbow1\Desktop\game projects\schoolyard defence\public\sprites\sub-teacher-rtspixel")

SHEETS = {
    "idle": DOWNLOADS / "ChatGPT Image Apr 26, 2026, 09_49_33 PM.png",
    "walk": DOWNLOADS / "ChatGPT Image Apr 26, 2026, 09_52_29 PM.png",
    "attack": DOWNLOADS / "ChatGPT Image Apr 26, 2026, 09_55_16 PM.png",
    "defeat": DOWNLOADS / "ChatGPT Image Apr 26, 2026, 09_57_51 PM.png",
}
PORTRAIT_SHEET = DOWNLOADS / "ChatGPT Image Apr 26, 2026, 10_02_29 PM.png"

DIRECTIONS = ["south", "south-east", "east", "north-east", "north"]
FRAME_SIZE = 80
PORTRAIT_SIZE = 128
PADDING = 8

PORTRAIT_BOXES = {
    "idle": [(59, 42, 343, 339), (346, 42, 627, 338), (632, 42, 910, 338), (913, 42, 1195, 338)],
    "talk": [(59, 348, 341, 643), (346, 349, 627, 643), (632, 348, 908, 643), (913, 349, 1195, 643)],
    "angry": [(59, 653, 341, 947), (346, 653, 627, 947), (632, 653, 908, 947), (913, 653, 1195, 947)],
    "hurt": [(368, 961, 606, 1208), (632, 961, 894, 1208)],
}


def is_checker_background(pixel: tuple[int, int, int, int]) -> bool:
    r, g, b, a = pixel
    if a <= 8:
        return True
    neutral = abs(r - g) <= 13 and abs(g - b) <= 13 and abs(r - b) <= 13
    return neutral and r >= 225 and g >= 225 and b >= 225


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
        if is_checker_background(pixels[x, y]):
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
                if is_checker_background(pixels[nx, ny]):
                    queue.append((nx, ny))

    return crop


def crop_to_content(image: Image.Image) -> Image.Image:
    bbox = image.getchannel("A").getbbox()
    if bbox is None:
        return image
    return image.crop(bbox)


def foreground_components(image: Image.Image) -> list[tuple[int, int, int, int, int]]:
    width, height = image.size
    pixels = image.load()
    visited = bytearray(width * height)
    components: list[tuple[int, int, int, int, int]] = []

    for y in range(height):
        for x in range(width):
            index = y * width + x
            if visited[index]:
                continue
            visited[index] = 1
            if pixels[x, y][3] <= 8:
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
                        next_index = ny * width + nx
                        if visited[next_index]:
                            continue
                        visited[next_index] = 1
                        if pixels[nx, ny][3] > 8:
                            queue.append((nx, ny))

            components.append((min_x, min_y, max_x + 1, max_y + 1, count))

    return components


def isolate_character_cell(crop: Image.Image, keep_accessories: bool = False) -> Image.Image:
    crop = crop_to_content(remove_checkerboard(crop))
    components = foreground_components(crop)
    large = [component for component in components if component[4] >= 80]
    if not large:
        return crop

    main = max(large, key=lambda component: component[4])
    keep = [main]
    main_cx = (main[0] + main[2]) / 2
    main_cy = (main[1] + main[3]) / 2

    if keep_accessories:
        for component in large:
            if component == main:
                continue
            cx = (component[0] + component[2]) / 2
            cy = (component[1] + component[3]) / 2
            if abs(cx - main_cx) <= crop.width * 0.45 and abs(cy - main_cy) <= crop.height * 0.45:
                keep.append(component)

    left = max(0, min(component[0] for component in keep) - 2)
    top = max(0, min(component[1] for component in keep) - 2)
    right = min(crop.width, max(component[2] for component in keep) + 2)
    bottom = min(crop.height, max(component[3] for component in keep) + 2)
    return crop.crop((left, top, right, bottom))


def compose_frames(crops: list[Image.Image], frame_size: int) -> list[Image.Image]:
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


def extract_animation(animation: str, source: Path) -> dict[str, int]:
    image = Image.open(source).convert("RGBA")
    width, height = image.size
    frame_cols = 3
    row_height = height / len(DIRECTIONS)
    col_width = width / frame_cols
    metadata: dict[str, int] = {}

    crops_by_direction: dict[str, list[Image.Image]] = {}
    for row, direction in enumerate(DIRECTIONS):
        crops: list[Image.Image] = []
        for col in range(frame_cols):
            left = max(0, int(round(col * col_width)) + PADDING)
            right = min(width, int(round((col + 1) * col_width)) - PADDING)
            top = max(0, int(round(row * row_height)) + PADDING)
            bottom = min(height, int(round((row + 1) * row_height)) - PADDING)
            cell = image.crop((left, top, right, bottom))
            crops.append(isolate_character_cell(cell, keep_accessories=animation in {"attack", "defeat"}))
        crops_by_direction[direction] = crops

    all_crops = [crop for crops in crops_by_direction.values() for crop in crops]
    max_width = max(crop.width for crop in all_crops)
    max_height = max(crop.height for crop in all_crops)
    scale = min(FRAME_SIZE / max_width, FRAME_SIZE / max_height)

    for direction, crops in crops_by_direction.items():
        frames = []
        for crop in crops:
            resized = crop.resize(
                (max(1, int(round(crop.width * scale))), max(1, int(round(crop.height * scale)))),
                Image.Resampling.NEAREST,
            )
            canvas = Image.new("RGBA", (FRAME_SIZE, FRAME_SIZE), (0, 0, 0, 0))
            canvas.alpha_composite(resized, ((FRAME_SIZE - resized.width) // 2, FRAME_SIZE - resized.height))
            frames.append(canvas)

        out_dir = OUTPUT_ROOT / animation / direction
        out_dir.mkdir(parents=True, exist_ok=True)
        for old_frame in out_dir.glob("frame_*.png"):
            old_frame.unlink()
        for index, frame in enumerate(frames):
            frame.save(out_dir / f"frame_{index:03d}.png")
        metadata[direction] = len(frames)

    return metadata


def extract_portraits() -> dict[str, int]:
    image = Image.open(PORTRAIT_SHEET).convert("RGBA")
    metadata: dict[str, int] = {}
    for animation, boxes in PORTRAIT_BOXES.items():
        out_dir = OUTPUT_ROOT / "portrait" / animation
        out_dir.mkdir(parents=True, exist_ok=True)
        for old_frame in out_dir.glob("frame_*.png"):
            old_frame.unlink()
        crops = [crop_to_content(remove_checkerboard(image.crop(box))) for box in boxes]
        frames = compose_frames(crops, PORTRAIT_SIZE)
        for index, frame in enumerate(frames):
            frame.save(out_dir / f"frame_{index:03d}.png")
        metadata[animation] = len(frames)
    return metadata


def main() -> None:
    (OUTPUT_ROOT / "source").mkdir(parents=True, exist_ok=True)
    metadata: dict[str, dict[str, int]] = {}

    for animation, source in SHEETS.items():
        Image.open(source).save(OUTPUT_ROOT / "source" / f"{animation}-sheet.png")
        metadata[animation] = extract_animation(animation, source)

    portrait_source = Image.open(PORTRAIT_SHEET)
    portrait_source.save(OUTPUT_ROOT / "source" / "portrait-sheet.png")
    portrait_metadata = extract_portraits()

    with (OUTPUT_ROOT / "metadata.json").open("w", encoding="utf-8") as fh:
        json.dump(
            {
                "frame_size": FRAME_SIZE,
                "portrait_frame_size": PORTRAIT_SIZE,
                "directions": DIRECTIONS,
                "animations": metadata,
                "portraits": portrait_metadata,
                "sources": {name: str(path) for name, path in SHEETS.items()},
                "portrait_source": str(PORTRAIT_SHEET),
            },
            fh,
            indent=2,
        )


if __name__ == "__main__":
    main()
