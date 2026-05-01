#!/usr/bin/env python3
"""Extract Teacher's Aide frames from generated sprite sheets.

The current gameplay sheet is cleaner than the first labeled sheet, but it is
arranged as animation blocks. Portraits still come from the older sheet.
"""

from __future__ import annotations

import json
from collections import deque
from pathlib import Path

from PIL import Image


GAMEPLAY_SOURCE_SHEET = Path(r"D:\jmbow1\My Documents\Downloads\ChatGPT Image Apr 26, 2026, 09_44_27 PM.png")
PORTRAIT_SOURCE_SHEET = Path(r"D:\jmbow1\My Documents\Downloads\ChatGPT Image Apr 26, 2026, 01_07_18 PM.png")
OUTPUT_ROOT = Path(r"D:\jmbow1\Desktop\game projects\schoolyard defence\public\sprites\teacher-aide-rtspixel")

DIRECTION_ORDER = ["north", "north-east", "east", "south-east", "south"]
FRAME_SIZE = 64
PORTRAIT_SIZE = 128
PADDING = 8

# The clean sheet provides three facings per animation block: front-ish, back,
# and side. We map those to the five-direction runtime set, duplicating the
# side row for diagonal facings and relying on mirroring for western facings.
ANIMATION_BLOCKS = {
    "idle": {
        "south": (40, 145, 45, 500),
        "east": (153, 258, 45, 500),
        "north": (267, 372, 45, 500),
    },
    "walk": {
        "south": (40, 145, 570, 1100),
        "east": (153, 258, 570, 1100),
        "north": (267, 372, 570, 1100),
    },
    "work": {
        "south": (40, 145, 1135, 1620),
        "east": (153, 258, 1135, 1620),
        "north": (267, 372, 1135, 1620),
    },
    "build": {
        "south": (485, 595, 35, 585),
        "east": (600, 705, 35, 585),
        "north": (710, 820, 35, 585),
    },
    "hit": {
        "south": (490, 610, 650, 980),
        "east": (610, 725, 650, 980),
        "north": (720, 835, 650, 980),
    },
    "defeat": {
        "south": (520, 665, 1020, 1645),
        "east": (705, 855, 1020, 1645),
    },
}

PORTRAIT_BOXES = {
    "idle": [(1319, 257, 1470, 411), (1478, 257, 1631, 411), (1638, 257, 1791, 411), (1799, 257, 1952, 411)],
    "talk": [(1319, 418, 1470, 574), (1478, 418, 1631, 574), (1638, 418, 1791, 574), (1799, 418, 1952, 574)],
    "stressed": [(1319, 580, 1470, 735), (1478, 580, 1631, 735), (1638, 580, 1791, 735), (1799, 580, 1952, 735)],
}


def is_checker_background(pixel: tuple[int, int, int, int]) -> bool:
    r, g, b, a = pixel
    if a <= 8:
        return True
    neutral = abs(r - g) <= 13 and abs(g - b) <= 13 and abs(r - b) <= 13
    return neutral and r >= 225 and g >= 225 and b >= 225


def is_foreground(pixel: tuple[int, int, int, int]) -> bool:
    return not is_checker_background(pixel)


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
                        next_index = ny * width + nx
                        if visited[next_index]:
                            continue
                        visited[next_index] = 1
                        if is_foreground(pixels[nx, ny]):
                            queue.append((nx, ny))

            box = (min_x, min_y, max_x + 1, max_y + 1)
            box_width = box[2] - box[0]
            box_height = box[3] - box[1]
            if count >= 250 and box_width >= 18 and box_height >= 35:
                components.append(box)

    return sorted(components, key=lambda box: (box[1], box[0]))


def boxes_in_region(
    boxes: list[tuple[int, int, int, int]],
    region: tuple[int, int, int, int],
) -> list[tuple[int, int, int, int]]:
    min_y, max_y, min_x, max_x = region
    selected = []
    for box in boxes:
        center_x = (box[0] + box[2]) / 2
        center_y = (box[1] + box[3]) / 2
        if min_x <= center_x < max_x and min_y <= center_y < max_y:
            selected.append(box)
    return sorted(selected, key=lambda box: box[0])


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


def extract_group(
    image: Image.Image,
    boxes: list[tuple[int, int, int, int]],
    animation: str,
    direction: str,
    region: tuple[int, int, int, int],
) -> int:
    direction_boxes = boxes_in_region(boxes, region)
    if not direction_boxes:
        return 0

    crops: list[Image.Image] = []
    for left, top, right, bottom in direction_boxes:
        crop = image.crop((
            max(0, left - PADDING),
            max(0, top - PADDING),
            min(image.width, right + PADDING),
            min(image.height, bottom + PADDING),
        ))
        crops.append(crop_to_content(remove_checkerboard(crop)))

    frames = compose_frames(crops, FRAME_SIZE)
    out_dir = OUTPUT_ROOT / animation / direction
    out_dir.mkdir(parents=True, exist_ok=True)
    for old_frame in out_dir.glob("frame_*.png"):
        old_frame.unlink()
    for index, frame in enumerate(frames):
        frame.save(out_dir / f"frame_{index:03d}.png")
    return len(frames)


def copy_direction(animation_counts: dict[str, int], animation: str, source: str, target: str) -> None:
    source_dir = OUTPUT_ROOT / animation / source
    target_dir = OUTPUT_ROOT / animation / target
    if not source_dir.exists():
        return
    target_dir.mkdir(parents=True, exist_ok=True)
    for old_frame in target_dir.glob("frame_*.png"):
        old_frame.unlink()
    count = 0
    for frame in sorted(source_dir.glob("frame_*.png")):
        (target_dir / frame.name).write_bytes(frame.read_bytes())
        count += 1
    animation_counts[target] = count


def extract_portraits(image: Image.Image) -> dict[str, int]:
    metadata: dict[str, int] = {}
    for animation, boxes in PORTRAIT_BOXES.items():
        out_dir = OUTPUT_ROOT / "portrait" / animation
        out_dir.mkdir(parents=True, exist_ok=True)
        for old_frame in out_dir.glob("frame_*.png"):
            old_frame.unlink()
        for index, box in enumerate(boxes):
            crop = crop_to_content(remove_checkerboard(image.crop(box)))
            frame = compose_frames([crop], PORTRAIT_SIZE)[0]
            frame.save(out_dir / f"frame_{index:03d}.png")
        metadata[animation] = len(boxes)
    return metadata


def main() -> None:
    gameplay = Image.open(GAMEPLAY_SOURCE_SHEET).convert("RGBA")
    portrait_source = Image.open(PORTRAIT_SOURCE_SHEET).convert("RGBA")
    components = detect_components(gameplay)

    (OUTPUT_ROOT / "source").mkdir(parents=True, exist_ok=True)
    gameplay.save(OUTPUT_ROOT / "source" / "sprite-sheet.png")
    portrait_source.save(OUTPUT_ROOT / "source" / "portrait-sheet.png")

    metadata: dict[str, dict[str, int]] = {}
    for animation, directions in ANIMATION_BLOCKS.items():
        metadata[animation] = {}
        for direction, region in directions.items():
            count = extract_group(gameplay, components, animation, direction, region)
            if count:
                metadata[animation][direction] = count

        # Fill the runtime's five-direction set from the available rows.
        if "east" in metadata[animation]:
            copy_direction(metadata[animation], animation, "east", "north-east")
            copy_direction(metadata[animation], animation, "east", "south-east")
        if "south" not in metadata[animation] and "east" in metadata[animation]:
            copy_direction(metadata[animation], animation, "east", "south")
        if "north" not in metadata[animation] and "south" in metadata[animation]:
            copy_direction(metadata[animation], animation, "south", "north")

    portrait_metadata = extract_portraits(portrait_source)

    with (OUTPUT_ROOT / "metadata.json").open("w", encoding="utf-8") as fh:
        json.dump(
            {
                "frame_size": FRAME_SIZE,
                "portrait_frame_size": PORTRAIT_SIZE,
                "directions": DIRECTION_ORDER,
                "animations": metadata,
                "portraits": portrait_metadata,
                "gameplay_source": str(GAMEPLAY_SOURCE_SHEET),
                "portrait_source": str(PORTRAIT_SOURCE_SHEET),
            },
            fh,
            indent=2,
        )


if __name__ == "__main__":
    main()
