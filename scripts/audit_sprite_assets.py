#!/usr/bin/env python3
"""Audit extracted sprite frames for obvious extraction problems.

This does not replace visual review. It creates contact sheets that make visual
direction/action checks faster, and emits a JSON report for common failures:
edge cutoffs, empty frames, stray disconnected components, and size outliers.
"""

from __future__ import annotations

import json
from collections import deque
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


PROJECT_ROOT = Path(r"D:\jmbow1\Desktop\game projects\schoolyard defence")
SPRITES_ROOT = PROJECT_ROOT / "public" / "sprites"
OUTPUT_ROOT = PROJECT_ROOT / "generated" / "sprite-audit"
PUBLIC_OUTPUT_ROOT = PROJECT_ROOT / "public" / "sprite-audit"
EDGE_MARGIN = 1
MIN_COMPONENT_PIXELS = 12


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

    return sorted(components, key=lambda box: box[4], reverse=True)


def frame_metrics(path: Path) -> dict[str, object]:
    image = Image.open(path).convert("RGBA")
    bbox = alpha_bbox(image)
    components = component_boxes(image)
    flags: list[str] = []
    is_portrait = "portrait" in path.parts
    is_attack_frame = "attack" in path.parts

    if bbox is None:
        flags.append("empty-frame")
        bbox_size = [0, 0]
        touches_edge = False
    else:
        left, top, right, bottom = bbox
        bbox_size = [right - left, bottom - top]
        touches_edge = left <= EDGE_MARGIN or top <= EDGE_MARGIN or right >= image.width - EDGE_MARGIN
        if touches_edge and not is_portrait:
            flags.append("content-touches-side-or-top-edge")

    large_components = [component for component in components if component[4] >= 80]
    if len(large_components) > 1 and not is_attack_frame:
        main = large_components[0][4]
        for component in large_components[1:]:
            if component[4] >= main * 0.08:
                flags.append("multiple-large-components")
                break

    return {
        "path": str(path.relative_to(PROJECT_ROOT)),
        "size": [image.width, image.height],
        "bbox": list(bbox) if bbox else None,
        "bbox_size": bbox_size,
        "component_count": len(components),
        "large_component_count": len(large_components),
        "flags": flags,
    }


def make_contact_sheet(sprite_root: Path, frames: list[Path], out_path: Path) -> None:
    if not frames:
        return

    sample = Image.open(frames[0]).convert("RGBA")
    cell_w = max(100, sample.width + 36)
    cell_h = sample.height + 44
    columns = 6
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
        label = str(frame_path.relative_to(sprite_root)).replace("\\", "/")
        draw.text((x + 7, y + cell_h - 18), label[:34], fill=(226, 232, 240, 255), font=font)

    out_path.parent.mkdir(parents=True, exist_ok=True)
    sheet.convert("RGB").save(out_path)


def audit_sprite_root(sprite_root: Path) -> dict[str, object]:
    metadata_path = sprite_root / "metadata.json"
    if not metadata_path.exists():
        return {}

    metadata = json.loads(metadata_path.read_text(encoding="utf-8-sig"))
    frame_paths = sorted(
        path for path in sprite_root.rglob("frame_*.png")
        if "source" not in path.parts
    )
    frames = [frame_metrics(path) for path in frame_paths]

    grouped: dict[str, list[Path]] = {}
    for path in frame_paths:
        rel = path.relative_to(sprite_root)
        key = "/".join(rel.parts[:-1])
        grouped.setdefault(key, []).append(path)

    sprite_out = OUTPUT_ROOT / sprite_root.name
    for key, paths in grouped.items():
        safe_name = key.replace("/", "__").replace("\\", "__")
        make_contact_sheet(sprite_root, paths, sprite_out / f"{safe_name}.png")

    flagged = [frame for frame in frames if frame["flags"]]
    return {
        "sprite_set": sprite_root.name,
        "metadata": metadata,
        "frame_count": len(frames),
        "flagged_count": len(flagged),
        "flagged_frames": flagged,
        "contact_sheets": str(sprite_out.relative_to(PROJECT_ROOT)),
    }


def main() -> None:
    OUTPUT_ROOT.mkdir(parents=True, exist_ok=True)
    PUBLIC_OUTPUT_ROOT.mkdir(parents=True, exist_ok=True)
    reports = []
    for sprite_root in sorted(SPRITES_ROOT.iterdir()):
        if sprite_root.is_dir() and (sprite_root / "metadata.json").exists():
            report = audit_sprite_root(sprite_root)
            if report:
                reports.append(report)

    report_path = OUTPUT_ROOT / "sprite-audit-report.json"
    report_json = json.dumps(reports, indent=2)
    report_path.write_text(report_json, encoding="utf-8")
    (PUBLIC_OUTPUT_ROOT / "sprite-audit-report.json").write_text(report_json, encoding="utf-8")

    summary_lines = [
        f"{report['sprite_set']}: {report['frame_count']} frames, {report['flagged_count']} flagged"
        for report in reports
    ]
    summary_text = "\n".join(summary_lines) + "\n"
    (OUTPUT_ROOT / "summary.txt").write_text(summary_text, encoding="utf-8")
    (PUBLIC_OUTPUT_ROOT / "summary.txt").write_text(summary_text, encoding="utf-8")
    print("\n".join(summary_lines))
    print(f"Report: {report_path}")


if __name__ == "__main__":
    main()
