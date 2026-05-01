from collections import deque
from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
SOURCE = Path(r"D:\jmbow1\My Documents\Downloads\ChatGPT Image Apr 29, 2026, 06_10_41 PM.png")
OUT_DIR = ROOT / "public" / "structures" / "schoolyard"


ASSETS = {
    "maths-block": (82, 77, 731, 485),
    "science-lab": (746, 58, 1440, 486),
    "sports-centre": (26, 555, 729, 971),
    "school-canteen": (793, 556, 1392, 968),
}


def is_green_background(pixel: tuple[int, int, int, int]) -> bool:
    r, g, b, a = pixel
    if a < 80:
        return True

    return g >= 86 and g >= r + 42 and g >= b + 38


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
        if not is_green_background(pixels[x, y]):
            continue

        pixels[x, y] = (0, 0, 0, 0)
        queue.append((x - 1, y))
        queue.append((x + 1, y))
        queue.append((x, y - 1))
        queue.append((x, y + 1))

    return rgba


def alpha_bbox(image: Image.Image, pad: int = 3) -> tuple[int, int, int, int]:
    bbox = image.getchannel("A").getbbox()
    if bbox is None:
        return (0, 0, image.width, image.height)

    left, top, right, bottom = bbox
    return (
        max(0, left - pad),
        max(0, top - pad),
        min(image.width, right + pad),
        min(image.height, bottom + pad),
    )


def save_preview(paths: list[Path]) -> None:
    images = [Image.open(path).convert("RGBA") for path in paths]
    scale = 0.36
    gap = 18
    sizes = [(round(image.width * scale), round(image.height * scale)) for image in images]
    width = max(sizes[0][0] + sizes[1][0], sizes[2][0] + sizes[3][0]) + gap * 3
    row_h = max(sizes[0][1], sizes[1][1])
    row2_h = max(sizes[2][1], sizes[3][1])
    preview = Image.new("RGBA", (width, row_h + row2_h + gap * 3), "#10202a")

    for index, (image, size) in enumerate(zip(images, sizes)):
        row = index // 2
        col = index % 2
        x = gap + col * (width // 2)
        y = gap if row == 0 else gap * 2 + row_h
        resized = image.resize(size, Image.Resampling.LANCZOS)
        preview.alpha_composite(resized, (x, y))

    preview.save(OUT_DIR / "preview-batch2.png")


def main() -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    source = Image.open(SOURCE).convert("RGBA")
    saved: list[Path] = []

    for name, box in ASSETS.items():
        crop = source.crop(box)
        keyed = remove_connected_background(crop)
        trimmed = keyed.crop(alpha_bbox(keyed))
        path = OUT_DIR / f"{name}.png"
        trimmed.save(path)
        saved.append(path)

    save_preview(saved)


if __name__ == "__main__":
    main()
