#!/usr/bin/env python3
"""Generate raw Year 7 sprite source sheets with the OpenAI Images API.

The tool intentionally generates source sheets, not final in-game frames. Run
the normal extractor and sprite audit after choosing an acceptable source.
"""

from __future__ import annotations

import argparse
import base64
import json
import os
import sys
import time
import urllib.error
import urllib.request
from collections import deque
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
from typing import Any

try:
    from PIL import Image
except ImportError:  # pragma: no cover - handled at runtime.
    Image = None


API_URL = "https://api.openai.com/v1/images/generations"
DEFAULT_OUTPUT_DIR = Path("generated/openai-sprites/year-7")
CHROMA_GREEN = (0, 255, 0, 255)


@dataclass(frozen=True)
class SpriteJob:
    name: str
    filename_stem: str
    size: str
    prompt: str


ATTACK_BACK_PROMPT = """Create a production-ready 2D pixel-art animation sprite sheet for an isometric RTS game.

CAMERA:
Camera is positioned from the SOUTH (RTS view).

DIRECTION RULES (STRICT):
- NORTH (row 1): full back view, no face visible, backpack fully visible and centered
- NORTH-EAST (row 2): back-right angle, mostly back visible, slight right turn, no clear face
- EAST (row 3): full right-side profile, only one eye visible, body sideways, backpack visible behind

If face is visible in NORTH -> incorrect
If body is not clearly angled in NE -> incorrect

---

CHARACTER:
Year 7 schoolkid game unit
- messy brown spiky hair
- white untucked school shirt
- navy shorts
- white socks
- sneakers
- oversized olive-green backpack
- chaotic, angry expression (only visible where appropriate)

---

STYLE:
- pixel-art RTS sprite
- late-90s pre-rendered look
- crisp readable pixels
- strong silhouette
- consistent proportions

---

BACKGROUND:
- solid bright chroma green (#00FF00)
- no checkerboard
- no gradients

---

LAYOUT:
- 3 rows total (top to bottom):
  NORTH, NORTH-EAST, EAST
- 3 columns:
  1. wind-up
  2. backpack swing impact with small spark
  3. recovery
- consistent spacing
- centered sprites
- fixed foot anchor

---

ANIMATION:
Non-graphic cartoon backpack swing animation
- frame 1: wind-up
- frame 2: swing with small impact spark
- frame 3: recovery

---

OUTPUT:
- one sprite sheet
- no text
- no UI
- directions must be correct
"""


ATTACK_FRONT_PROMPT = """Create a production-ready 2D pixel-art animation sprite sheet for an isometric RTS game.

CAMERA:
Camera is positioned from the SOUTH (RTS view).

DIRECTION RULES (STRICT):
- SOUTH-EAST (row 1): front-right angle, chest partially visible, right shoulder closer to camera, face slightly turned
- SOUTH (row 2): full front view, both eyes visible, shoulders symmetrical, backpack mostly hidden behind

If face is not visible in SOUTH -> incorrect
If SE looks side-on instead of angled -> incorrect

---

CHARACTER:
Year 7 schoolkid game unit
- messy brown spiky hair
- white untucked school shirt
- navy shorts
- white socks
- sneakers
- oversized olive-green backpack
- angry, chaotic expression

---

STYLE:
- pixel-art RTS sprite
- late-90s pre-rendered look
- crisp readable pixels
- strong silhouette
- consistent proportions

---

BACKGROUND:
- solid bright chroma green (#00FF00)
- no checkerboard
- no gradients

---

LAYOUT:
- 2 rows total (top to bottom):
  SOUTH-EAST, SOUTH
- 3 columns:
  1. wind-up
  2. backpack swing impact with small spark
  3. recovery
- consistent spacing
- centered sprites
- fixed foot anchor

---

ANIMATION:
Non-graphic cartoon backpack swing animation
- frame 1: wind-up
- frame 2: swing with small impact spark
- frame 3: recovery

---

OUTPUT:
- one sprite sheet
- no text
- no UI
- directions must be correct
"""


PORTRAIT_PROMPT = """Create a production-ready 2D pixel-art portrait animation sprite sheet for an isometric RTS game.

CHARACTER:
Year 7 schoolkid game unit
- messy brown spiky hair
- white untucked school shirt collar visible
- oversized olive-green backpack straps visible near shoulders
- expressive, chaotic schoolyard attitude
- same character identity, palette, and proportions across every frame

---

STYLE:
- pixel-art RTS portrait
- late-90s pre-rendered look
- crisp readable pixels
- strong silhouette
- consistent head size and camera angle
- head-and-shoulders framing

---

BACKGROUND:
- solid bright chroma green (#00FF00)
- no checkerboard
- no gradients

---

LAYOUT:
- 4 rows total (top to bottom):
  1. IDLE, 4 frames
  2. TALK, 4 frames
  3. ANGRY, 4 frames
  4. HURT OR STARTLED, 2 frames
- frames in each row run left to right
- consistent spacing
- centered portraits
- no cropped hair, chin, or shoulders

---

ANIMATION:
- idle row: subtle blink and breathing variation
- talk row: mouth movement, same head angle
- angry row: stronger brows and yelling mouth, non-graphic
- hurt/startled row: recoiling expression, non-graphic

---

OUTPUT:
- one portrait sprite sheet
- no text
- no UI
- no speech bubbles
- consistent character
"""


JOBS: dict[str, SpriteJob] = {
    "attack_back": SpriteJob(
        name="attack_back",
        filename_stem="year7-attack-back",
        size="1536x1024",
        prompt=ATTACK_BACK_PROMPT,
    ),
    "attack_front": SpriteJob(
        name="attack_front",
        filename_stem="year7-attack-front",
        size="1536x1024",
        prompt=ATTACK_FRONT_PROMPT,
    ),
    "portrait": SpriteJob(
        name="portrait",
        filename_stem="year7-portrait",
        size="1024x1024",
        prompt=PORTRAIT_PROMPT,
    ),
}


def load_dotenv(path: Path) -> None:
    if not path.exists():
        return

    for raw_line in path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue

        key, value = line.split("=", 1)
        key = key.strip()
        value = value.strip().strip('"').strip("'")
        if key and key not in os.environ:
            os.environ[key] = value


def make_prompt(job: SpriteJob, background: str) -> str:
    prompt = job.prompt
    if background == "transparent":
        return prompt.replace(
            "- solid bright chroma green (#00FF00)\n- no checkerboard\n- no gradients",
            "- transparent background\n- no checkerboard\n- no gradients",
        )
    return prompt


def build_payload(job: SpriteJob, args: argparse.Namespace) -> dict[str, Any]:
    background = "opaque" if args.background == "green" else args.background
    payload: dict[str, Any] = {
        "model": args.model,
        "prompt": make_prompt(job, args.background),
        "size": args.size or job.size,
        "quality": args.quality,
        "output_format": "png",
        "background": background,
        "n": 1,
    }
    if args.moderation:
        payload["moderation"] = args.moderation
    return payload


def request_image(payload: dict[str, Any], api_key: str, timeout: int) -> dict[str, Any]:
    request = urllib.request.Request(
        API_URL,
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        },
        method="POST",
    )

    try:
        with urllib.request.urlopen(request, timeout=timeout) as response:
            return json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as error:
        body = error.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"OpenAI image request failed ({error.code}): {body}") from error
    except urllib.error.URLError as error:
        raise RuntimeError(f"OpenAI image request failed: {error}") from error


def decode_image(response: dict[str, Any]) -> bytes:
    data = response.get("data") or []
    if not data:
        raise RuntimeError("OpenAI response did not include image data.")

    image_record = data[0]
    if image_record.get("b64_json"):
        return base64.b64decode(image_record["b64_json"])

    if image_record.get("url"):
        with urllib.request.urlopen(image_record["url"], timeout=120) as image_response:
            return image_response.read()

    raise RuntimeError("OpenAI response did not include b64_json or url image data.")


def is_greenish_background(pixel: tuple[int, int, int, int]) -> bool:
    r, g, b, a = pixel
    if a <= 16:
        return True
    return g >= 130 and g - max(r, b) >= 45 and max(r, b) <= 180


def normalize_chroma_green(input_path: Path, output_path: Path) -> None:
    if Image is None:
        raise RuntimeError("Pillow is required for green-screen normalization.")

    image = Image.open(input_path).convert("RGBA")
    width, height = image.size
    pixels = image.load()
    visited = bytearray(width * height)
    queue: deque[tuple[int, int]] = deque()

    def push(x: int, y: int) -> None:
        index = y * width + x
        if visited[index]:
            return
        visited[index] = 1
        if is_greenish_background(pixels[x, y]):
            queue.append((x, y))

    for x in range(width):
        push(x, 0)
        push(x, height - 1)
    for y in range(height):
        push(0, y)
        push(width - 1, y)

    while queue:
        x, y = queue.popleft()
        pixels[x, y] = CHROMA_GREEN
        for nx, ny in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
            if 0 <= nx < width and 0 <= ny < height:
                push(nx, ny)

    output_path.parent.mkdir(parents=True, exist_ok=True)
    image.save(output_path)


def split_grid(path: Path, rows: int, cols: int) -> list[list[Any]]:
    if Image is None:
        raise RuntimeError("Pillow is required for attack-sheet composition.")

    image = Image.open(path).convert("RGBA")
    cells: list[list[Any]] = []
    for row in range(rows):
        row_cells = []
        top = round(row * image.height / rows)
        bottom = round((row + 1) * image.height / rows)
        for col in range(cols):
            left = round(col * image.width / cols)
            right = round((col + 1) * image.width / cols)
            row_cells.append(image.crop((left, top, right, bottom)))
        cells.append(row_cells)
    return cells


def compose_attack_sheet(back_path: Path, front_path: Path, output_path: Path) -> None:
    if Image is None:
        raise RuntimeError("Pillow is required for attack-sheet composition.")

    back_rows = split_grid(back_path, rows=3, cols=3)
    front_rows = split_grid(front_path, rows=2, cols=3)
    rows_by_direction = {
        "north": back_rows[0],
        "north-east": back_rows[1],
        "east": back_rows[2],
        "south-east": front_rows[0],
        "south": front_rows[1],
    }
    output_order = ["south", "south-east", "east", "north-east", "north"]
    all_cells = [cell for row in rows_by_direction.values() for cell in row]
    cell_width = max(cell.width for cell in all_cells)
    cell_height = max(cell.height for cell in all_cells)

    output = Image.new("RGBA", (cell_width * 3, cell_height * 5), CHROMA_GREEN)
    for row_index, direction in enumerate(output_order):
        for col_index, cell in enumerate(rows_by_direction[direction]):
            x = col_index * cell_width + (cell_width - cell.width) // 2
            y = row_index * cell_height + (cell_height - cell.height) // 2
            output.alpha_composite(cell, (x, y))

    output_path.parent.mkdir(parents=True, exist_ok=True)
    output.save(output_path)


def write_json(path: Path, data: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, indent=2), encoding="utf-8")


def safe_response_metadata(response: dict[str, Any]) -> dict[str, Any]:
    cleaned = dict(response)
    cleaned["data"] = [
        {key: value for key, value in item.items() if key != "b64_json"}
        for item in response.get("data", [])
    ]
    return cleaned


def generate_job(
    job: SpriteJob,
    args: argparse.Namespace,
    api_key: str,
    timestamp: str,
    variant_index: int,
) -> Path:
    payload = build_payload(job, args)
    suffix = f"{timestamp}-v{variant_index:02d}"
    raw_path = args.output_dir / "raw" / f"{job.filename_stem}-{suffix}.png"
    processed_path = args.output_dir / "processed" / f"{job.filename_stem}-{suffix}.png"
    prompt_path = args.output_dir / "prompts" / f"{job.filename_stem}.txt"
    metadata_path = args.output_dir / "metadata" / f"{job.filename_stem}-{suffix}.json"

    prompt_path.parent.mkdir(parents=True, exist_ok=True)
    prompt_path.write_text(payload["prompt"], encoding="utf-8")

    if args.dry_run:
        print(f"[dry-run] {job.name}: would write {raw_path}")
        return processed_path

    print(f"Generating {job.name} variant {variant_index} -> {raw_path}")
    response: dict[str, Any] | None = None
    for attempt in range(args.retries + 1):
        try:
            response = request_image(payload, api_key, args.timeout)
            break
        except RuntimeError as error:
            if attempt >= args.retries:
                raise
            wait_seconds = min(30, 2**attempt * 3)
            print(f"{error}\nRetrying in {wait_seconds}s...", file=sys.stderr)
            time.sleep(wait_seconds)

    assert response is not None
    raw_path.parent.mkdir(parents=True, exist_ok=True)
    raw_path.write_bytes(decode_image(response))
    write_json(
        metadata_path,
        {
            "job": job.name,
            "raw_path": str(raw_path),
            "processed_path": str(processed_path),
            "request": {key: value for key, value in payload.items() if key != "prompt"},
            "response": safe_response_metadata(response),
        },
    )

    if args.background == "green" and not args.skip_postprocess:
        normalize_chroma_green(raw_path, processed_path)
        return processed_path

    processed_path.parent.mkdir(parents=True, exist_ok=True)
    processed_path.write_bytes(raw_path.read_bytes())
    return processed_path


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Generate Year 7 source sprite sheets with OpenAI image generation."
    )
    parser.add_argument(
        "--jobs",
        nargs="+",
        choices=sorted(JOBS),
        default=sorted(JOBS),
        help="Jobs to run. Defaults to every built-in Year 7 source sheet.",
    )
    parser.add_argument("--list", action="store_true", help="List jobs and exit.")
    parser.add_argument("--variants", type=int, default=1, help="Sequential variants per job.")
    parser.add_argument("--output-dir", type=Path, default=DEFAULT_OUTPUT_DIR)
    parser.add_argument("--model", default=os.environ.get("OPENAI_IMAGE_MODEL", "gpt-image-2"))
    parser.add_argument("--quality", choices=["low", "medium", "high", "auto"], default="medium")
    parser.add_argument(
        "--background",
        choices=["green", "opaque", "transparent", "auto"],
        default="green",
        help="Use green to request opaque output and normalize border background to #00FF00.",
    )
    parser.add_argument(
        "--size",
        default=None,
        help="Override every job size. Defaults are 1536x1024 for sheets and 1024x1024 for portrait.",
    )
    parser.add_argument("--moderation", choices=["auto", "low"], default=None)
    parser.add_argument("--timeout", type=int, default=180)
    parser.add_argument("--retries", type=int, default=2)
    parser.add_argument("--delay", type=float, default=1.0, help="Delay between API calls.")
    parser.add_argument("--dry-run", action="store_true", help="Write prompts only; do not call API.")
    parser.add_argument(
        "--skip-postprocess",
        action="store_true",
        help="Do not normalize generated green-screen backgrounds.",
    )
    parser.add_argument(
        "--no-compose-attack",
        action="store_true",
        help="Do not compose attack_back and attack_front into a five-row attack sheet.",
    )
    return parser.parse_args()


def main() -> int:
    load_dotenv(Path(".env.local"))
    args = parse_args()

    if args.list:
        for job in JOBS.values():
            print(f"{job.name}: {job.size} -> {job.filename_stem}")
        return 0

    if args.background == "transparent" and args.model == "gpt-image-2":
        print(
            "gpt-image-2 does not currently support transparent backgrounds; "
            "use --background green or select an earlier GPT Image model.",
            file=sys.stderr,
        )
        return 2

    api_key = os.environ.get("OPENAI_API_KEY")
    if not api_key and not args.dry_run:
        print(
            "OPENAI_API_KEY is required. Set it in the environment or in .env.local.",
            file=sys.stderr,
        )
        return 2

    args.output_dir.mkdir(parents=True, exist_ok=True)
    timestamp = datetime.now().strftime("%Y%m%d-%H%M%S")
    generated: dict[str, list[Path]] = {job_name: [] for job_name in args.jobs}

    for variant_index in range(1, args.variants + 1):
        for job_name in args.jobs:
            path = generate_job(JOBS[job_name], args, api_key or "", timestamp, variant_index)
            generated[job_name].append(path)
            if not args.dry_run and args.delay > 0:
                time.sleep(args.delay)

    if (
        not args.dry_run
        and not args.no_compose_attack
        and "attack_back" in generated
        and "attack_front" in generated
    ):
        for index, (back_path, front_path) in enumerate(
            zip(generated["attack_back"], generated["attack_front"]), start=1
        ):
            composite_path = (
                args.output_dir
                / "processed"
                / f"year7-attack-composite-{timestamp}-v{index:02d}.png"
            )
            compose_attack_sheet(back_path, front_path, composite_path)
            print(f"Composed attack sheet -> {composite_path}")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
