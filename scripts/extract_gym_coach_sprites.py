#!/usr/bin/env python3
"""Extract P.E. Teacher / Gym Coach frames using an explicit sheet manifest."""

from __future__ import annotations

import json
from collections import deque
from pathlib import Path

from PIL import Image


DOWNLOADS = Path(r"D:\jmbow1\My Documents\Downloads")
OUTPUT_ROOT = Path(r"D:\jmbow1\Desktop\game projects\schoolyard defence\public\sprites\gym-coach-rtspixel")

SHEETS = {
    "defeat": DOWNLOADS / "ChatGPT Image Apr 27, 2026, 10_57_13 AM.png",
    "command": DOWNLOADS / "ChatGPT Image Apr 27, 2026, 10_57_21 AM.png",
    "walk": DOWNLOADS / "ChatGPT Image Apr 27, 2026, 10_57_30 AM.png",
    "attack": DOWNLOADS / "ChatGPT Image Apr 27, 2026, 10_57_47 AM.png",
    "charge": DOWNLOADS / "ChatGPT Image Apr 27, 2026, 10_57_53 AM.png",
    "idle": DOWNLOADS / "ChatGPT Image Apr 27, 2026, 10_58_13 AM.png",
}

DIRECTIONS = ["south", "south-east", "east", "north-east", "north"]
FRAME_SIZE = 88
PADDING = 10
SAFE_SCALE = 0.86
EXPECTED_ROWS = len(DIRECTIONS)
EXPECTED_COLS = 3


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


def remove_internal_checker_pixels(image: Image.Image) -> Image.Image:
    """Remove checkerboard pixels trapped inside separated limbs/props.

    Flood fill handles the outer background, but generated sheets sometimes
    leave checker pixels in enclosed gaps such as between legs. Keep this
    conservative so it does not erase the coach's white shirt.
    """
    image = image.convert("RGBA")
    pixels = image.load()
    for y in range(image.height):
        for x in range(image.width):
            r, g, b, a = pixels[x, y]
            if a <= 8:
                continue
            neutral = abs(r - g) <= 16 and abs(g - b) <= 16 and abs(r - b) <= 16
            if neutral and r >= 180 and g >= 180 and b >= 180:
                pixels[x, y] = (0, 0, 0, 0)
    return image


def foreground_components(image: Image.Image) -> list[tuple[int, int, int, int, int]]:
    width, height = image.size
    alpha = image.getchannel("A")
    pixels = alpha.load()
    visited = bytearray(width * height)
    components: list[tuple[int, int, int, int, int]] = []

    for y in range(height):
        for x in range(width):
            index = y * width + x
            if visited[index]:
                continue
            visited[index] = 1
            if pixels[x, y] <= 8:
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
                        if pixels[nx, ny] > 8:
                            queue.append((nx, ny))

            components.append((min_x, min_y, max_x + 1, max_y + 1, count))

    return sorted(components, key=lambda component: component[4], reverse=True)


def detected_grid_cells(image: Image.Image) -> list[list[tuple[int, int, int, int]]] | None:
    """Find the 5x3 sprite cells from the actual character components.

    The generated sheets are visually grid-like, but their row spacing is not
    mathematically even. Fixed row slicing can cut the top off tall frames.
    """
    clean = remove_checkerboard(image.copy())
    components = [component for component in foreground_components(clean) if component[4] >= 1000]
    if len(components) < EXPECTED_ROWS * EXPECTED_COLS:
        return None

    main_components = sorted(components[: EXPECTED_ROWS * EXPECTED_COLS], key=lambda component: ((component[1] + component[3]) / 2, component[0]))
    rows = [
        sorted(main_components[index:index + EXPECTED_COLS], key=lambda component: (component[0] + component[2]) / 2)
        for index in range(0, EXPECTED_ROWS * EXPECTED_COLS, EXPECTED_COLS)
    ]
    if len(rows) != EXPECTED_ROWS or any(len(row) != EXPECTED_COLS for row in rows):
        return None

    row_centers = [sum((box[1] + box[3]) / 2 for box in row) / len(row) for row in rows]
    row_edges = [0]
    row_edges.extend(int(round((row_centers[index] + row_centers[index + 1]) / 2)) for index in range(len(row_centers) - 1))
    row_edges.append(image.height)

    cells: list[list[tuple[int, int, int, int]]] = []
    for row_index, row in enumerate(rows):
        col_centers = [(box[0] + box[2]) / 2 for box in row]
        col_edges = [0]
        col_edges.extend(int(round((col_centers[index] + col_centers[index + 1]) / 2)) for index in range(len(col_centers) - 1))
        col_edges.append(image.width)

        row_cells = []
        for col_index in range(EXPECTED_COLS):
            row_cells.append((
                max(0, col_edges[col_index] + PADDING),
                max(0, row_edges[row_index] + PADDING),
                min(image.width, col_edges[col_index + 1] - PADDING),
                min(image.height, row_edges[row_index + 1] - PADDING),
            ))
        cells.append(row_cells)

    return cells


def isolate_cell(crop: Image.Image, keep_accessories: bool) -> Image.Image:
    crop = crop_to_content(remove_internal_checker_pixels(remove_checkerboard(crop)))
    components = [component for component in foreground_components(crop) if component[4] >= 80]
    if not components:
        return crop

    main = components[0]
    keep = [main]
    main_cx = (main[0] + main[2]) / 2
    main_cy = (main[1] + main[3]) / 2

    if keep_accessories:
        for component in components[1:]:
            cx = (component[0] + component[2]) / 2
            cy = (component[1] + component[3]) / 2
            if abs(cx - main_cx) <= crop.width * 0.5 and abs(cy - main_cy) <= crop.height * 0.55:
                keep.append(component)

    left = max(0, min(component[0] for component in keep) - 3)
    top = max(0, min(component[1] for component in keep) - 3)
    right = min(crop.width, max(component[2] for component in keep) + 3)
    bottom = min(crop.height, max(component[3] for component in keep) + 3)
    return crop.crop((left, top, right, bottom))


def normalize(crops_by_direction: dict[str, list[Image.Image]]) -> dict[str, list[Image.Image]]:
    all_crops = [crop for crops in crops_by_direction.values() for crop in crops]
    max_width = max(crop.width for crop in all_crops)
    max_height = max(crop.height for crop in all_crops)
    scale = min(FRAME_SIZE / max_width, FRAME_SIZE / max_height) * SAFE_SCALE
    output: dict[str, list[Image.Image]] = {}

    for direction, crops in crops_by_direction.items():
        output[direction] = []
        for crop in crops:
            resized = crop.resize(
                (max(1, int(round(crop.width * scale))), max(1, int(round(crop.height * scale)))),
                Image.Resampling.NEAREST,
            )
            canvas = Image.new("RGBA", (FRAME_SIZE, FRAME_SIZE), (0, 0, 0, 0))
            canvas.alpha_composite(resized, ((FRAME_SIZE - resized.width) // 2, FRAME_SIZE - resized.height - 3))
            output[direction].append(canvas)
    return output


def extract_animation(animation: str, source: Path) -> dict[str, int]:
    image = Image.open(source).convert("RGBA")
    width, height = image.size
    cell_grid = detected_grid_cells(image)
    crops_by_direction: dict[str, list[Image.Image]] = {}
    keep_accessories = animation in {"attack", "charge", "command", "defeat"}

    for row, direction in enumerate(DIRECTIONS):
        crops = []
        for col in range(EXPECTED_COLS):
            if cell_grid:
                left, top, right, bottom = cell_grid[row][col]
            else:
                row_height = height / len(DIRECTIONS)
                col_width = width / EXPECTED_COLS
                left = max(0, int(round(col * col_width)) + PADDING)
                right = min(width, int(round((col + 1) * col_width)) - PADDING)
                top = max(0, int(round(row * row_height)) + PADDING)
                bottom = min(height, int(round((row + 1) * row_height)) - PADDING)
            crops.append(isolate_cell(image.crop((left, top, right, bottom)), keep_accessories))
        crops_by_direction[direction] = crops

    frames_by_direction = normalize(crops_by_direction)
    metadata: dict[str, int] = {}
    for direction, frames in frames_by_direction.items():
        out_dir = OUTPUT_ROOT / animation / direction
        out_dir.mkdir(parents=True, exist_ok=True)
        for old_frame in out_dir.glob("frame_*.png"):
            old_frame.unlink()
        for index, frame in enumerate(frames):
            frame.save(out_dir / f"frame_{index:03d}.png")
        metadata[direction] = len(frames)

    return metadata


def main() -> None:
    (OUTPUT_ROOT / "source").mkdir(parents=True, exist_ok=True)
    metadata: dict[str, dict[str, int]] = {}
    for animation, source in SHEETS.items():
        Image.open(source).save(OUTPUT_ROOT / "source" / f"{animation}-sheet.png")
        metadata[animation] = extract_animation(animation, source)

    with (OUTPUT_ROOT / "metadata.json").open("w", encoding="utf-8") as fh:
        json.dump(
            {
                "frame_size": FRAME_SIZE,
                "directions": DIRECTIONS,
                "animations": metadata,
                "sources": {name: str(path) for name, path in SHEETS.items()},
                "review_status": "needs visual approval before runtime use",
            },
            fh,
            indent=2,
        )


if __name__ == "__main__":
    main()
