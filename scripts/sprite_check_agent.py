#!/usr/bin/env python3
"""Validate extracted staged sprites before they can be added to the game."""

from __future__ import annotations

import argparse
import json
from collections import deque
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


PROJECT_ROOT = Path(__file__).resolve().parents[1]
EXTRACTED_ROOT = PROJECT_ROOT / "generated" / "extracted-sprites"
QA_ROOT = PROJECT_ROOT / "generated" / "sprite-qa"
MIN_COMPONENT_PIXELS = 12
NEIGHBOR_FRAGMENT_RATIO = 0.08


def is_visible_green(pixel: tuple[int, int, int, int]) -> bool:
    r, g, b, a = pixel
    if a <= 8:
        return False
    return g >= 95 and g - max(r, b) >= 30 and max(r, b) <= 220


def alpha_bbox(image: Image.Image) -> tuple[int, int, int, int] | None:
    return image.getchannel("A").getbbox()


def component_boxes(image: Image.Image) -> list[tuple[int, int, int, int, int]]:
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
            if count >= MIN_COMPONENT_PIXELS:
                components.append((min_x, min_y, max_x + 1, max_y + 1, count))
    return sorted(components, key=lambda item: item[4], reverse=True)


def frame_metrics(path: Path) -> dict:
    image = Image.open(path).convert("RGBA")
    bbox = alpha_bbox(image)
    flags = []
    path_parts = path.parts
    is_death_frame = "death" in path_parts or "defeat" in path_parts
    is_attack_frame = "attack" in path_parts
    green_pixels = sum(1 for pixel in image.getdata() if is_visible_green(pixel))
    if green_pixels:
        flags.append("visible-green")
    if bbox is None:
        flags.append("empty-frame")
        bbox_size = [0, 0]
    else:
        left, top, right, bottom = bbox
        bbox_size = [right - left, bottom - top]
        if left <= 1 or top <= 1 or right >= image.width - 1:
            flags.append("content-touches-side-or-top-edge")
        if bbox_size[0] <= image.width * 0.25 or (bbox_size[1] <= image.height * 0.35 and not is_death_frame):
            flags.append("thin-slice-or-clipped-frame")
    components = component_boxes(image)
    large = [component for component in components if component[4] >= 80]
    if len(large) > 1 and not is_attack_frame:
        main = large[0][4]
        for component in large[1:]:
            if component[4] >= main * NEIGHBOR_FRAGMENT_RATIO:
                flags.append("possible-neighbor-cell-fragment")
                break
    return {
        "path": str(path.relative_to(PROJECT_ROOT)),
        "bbox": list(bbox) if bbox else None,
        "bbox_size": bbox_size,
        "green_pixels": green_pixels,
        "large_component_count": len(large),
        "flags": flags,
    }


def make_contact_sheet(unit_root: Path, frames: list[Path], out_path: Path) -> None:
    if not frames:
        return
    sample = Image.open(frames[0]).convert("RGBA")
    cell_w = max(100, sample.width + 36)
    cell_h = sample.height + 44
    columns = min(6, max(1, len(frames)))
    rows = (len(frames) + columns - 1) // columns
    sheet = Image.new("RGBA", (columns * cell_w, rows * cell_h), (15, 23, 42, 255))
    draw = ImageDraw.Draw(sheet)
    font = ImageFont.load_default()
    for index, frame_path in enumerate(frames):
        image = Image.open(frame_path).convert("RGBA")
        col = index % columns
        row = index // columns
        x = col * cell_w
        y = row * cell_h
        draw.rectangle((x + 4, y + 4, x + cell_w - 4, y + cell_h - 4), outline=(71, 85, 105, 255))
        sheet.alpha_composite(image, (x + (cell_w - image.width) // 2, y + 18))
        label = str(frame_path.relative_to(unit_root)).replace("\\", "/")
        draw.text((x + 7, y + cell_h - 18), label[:34], fill=(226, 232, 240, 255), font=font)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    sheet.convert("RGB").save(out_path)


def check_unit(unit: str) -> int:
    unit_root = EXTRACTED_ROOT / unit
    if not (unit_root / "metadata.json").exists():
        raise SystemExit(f"No extracted sprite metadata found for {unit}: {unit_root}")
    frames = sorted(path for path in unit_root.rglob("frame_*.png"))
    metrics = [frame_metrics(path) for path in frames]
    flagged = [metric for metric in metrics if metric["flags"]]

    grouped: dict[str, list[Path]] = {}
    for path in frames:
        rel = path.relative_to(unit_root)
        key = "/".join(rel.parts[:-1])
        grouped.setdefault(key, []).append(path)
    for key, group in grouped.items():
        make_contact_sheet(unit_root, group, QA_ROOT / unit / f"{key.replace('/', '__')}.png")

    report = {
        "unit": unit,
        "frame_count": len(frames),
        "flagged_count": len(flagged),
        "flagged_frames": flagged,
        "approved_for_game_import": len(flagged) == 0,
    }
    QA_ROOT.mkdir(parents=True, exist_ok=True)
    (QA_ROOT / unit / "qa-report.json").write_text(json.dumps(report, indent=2), encoding="utf-8")
    print(f"{unit}: {len(frames)} extracted frames, {len(flagged)} QA flag(s)")
    print(f"Report: {QA_ROOT / unit / 'qa-report.json'}")
    return 1 if flagged else 0


def main() -> None:
    parser = argparse.ArgumentParser(description="QA extracted sprites before game import.")
    parser.add_argument("--unit", required=True)
    parser.add_argument("--allow-flags", action="store_true")
    args = parser.parse_args()
    exit_code = check_unit(args.unit)
    if exit_code and not args.allow_flags:
        raise SystemExit(exit_code)


if __name__ == "__main__":
    main()
