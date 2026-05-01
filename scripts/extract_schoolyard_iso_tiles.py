from collections import deque
from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
SOURCE = Path(r"D:\jmbow1\My Documents\Downloads\ChatGPT Image Apr 29, 2026, 02_06_05 PM.png")
OUT_DIR = ROOT / "public" / "tiles" / "schoolyard-iso"

ASSETS = {
    "grass-base": (8, 76, 319, 354),
    "grass-flowers": (321, 76, 617, 354),
    "concrete-path": (625, 76, 916, 354),
    "cracked-concrete": (927, 76, 1217, 354),
    "dry-dirt": (1227, 76, 1518, 354),
    "grass-dirt-transition": (8, 468, 321, 763),
    "bushy-ground": (337, 456, 619, 759),
    "rocky-grass": (626, 467, 942, 769),
    "small-shrub": (973, 536, 1135, 719),
    "medium-tree": (1248, 457, 1500, 764),
}

TILE_ASSETS = {
    "grass-base",
    "grass-flowers",
    "concrete-path",
    "cracked-concrete",
    "dry-dirt",
    "grass-dirt-transition",
    "bushy-ground",
    "rocky-grass",
}


def is_background(pixel: tuple[int, int, int, int]) -> bool:
    r, g, b, _ = pixel
    maximum = max(r, g, b)
    minimum = min(r, g, b)

    if maximum < 34:
        return True

    dark_blue_black = b >= r + 6 and g >= r + 3 and maximum < 58 and maximum - minimum < 40
    return dark_blue_black


def remove_connected_background(image: Image.Image) -> Image.Image:
    rgba = image.convert("RGBA")
    pixels = rgba.load()
    width, height = rgba.size
    queue: deque[tuple[int, int]] = deque()
    seen: set[tuple[int, int]] = set()

    for x in range(width):
        queue.append((x, 0))
        queue.append((x, height - 1))
    for y in range(height):
        queue.append((0, y))
        queue.append((width - 1, y))

    while queue:
        x, y = queue.popleft()
        if (x, y) in seen:
            continue
        if not (0 <= x < width and 0 <= y < height):
            continue

        seen.add((x, y))
        if not is_background(pixels[x, y]):
            continue

        pixels[x, y] = (0, 0, 0, 0)
        queue.append((x - 1, y))
        queue.append((x + 1, y))
        queue.append((x, y - 1))
        queue.append((x, y + 1))

    return rgba


def alpha_bbox(image: Image.Image) -> tuple[int, int, int, int]:
    alpha = image.getchannel("A")
    bbox = alpha.getbbox()
    if bbox is None:
        return (0, 0, image.width, image.height)

    left, top, right, bottom = bbox
    pad = 2
    return (
        max(0, left - pad),
        max(0, top - pad),
        min(image.width, right + pad),
        min(image.height, bottom + pad),
    )


def resize_nearest(image: Image.Image, width: int) -> Image.Image:
    if image.width == width:
        return image
    height = round(image.height * (width / image.width))
    return image.resize((width, height), Image.Resampling.NEAREST)


def save_preview(paths: list[Path]) -> None:
    scale = 2
    gap = 16
    images = [Image.open(path).convert("RGBA") for path in paths]
    width = sum(image.width * scale for image in images) + gap * (len(images) + 1)
    height = max(image.height * scale for image in images) + gap * 2
    preview = Image.new("RGBA", (width, height), "#10202a")

    x = gap
    for image in images:
        scaled = image.resize((image.width * scale, image.height * scale), Image.Resampling.NEAREST)
        preview.alpha_composite(scaled, (x, height - gap - scaled.height))
        x += scaled.width + gap

    preview.save(OUT_DIR / "preview.png")


def main() -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    source = Image.open(SOURCE).convert("RGBA")
    saved: list[Path] = []

    for name, box in ASSETS.items():
        crop = source.crop(box)
        keyed = remove_connected_background(crop)
        trimmed = keyed.crop(alpha_bbox(keyed))

        target_width = 320 if name in TILE_ASSETS else 220
        if name == "medium-tree":
            target_width = 260
        elif name == "small-shrub":
            target_width = 160

        output = resize_nearest(trimmed, target_width)
        path = OUT_DIR / f"{name}.png"
        output.save(path)
        saved.append(path)

    (OUT_DIR / "manifest.txt").write_text(
        "\n".join(path.name for path in saved) + "\npreview.png\n",
        encoding="utf-8",
    )
    save_preview(saved)


if __name__ == "__main__":
    main()
