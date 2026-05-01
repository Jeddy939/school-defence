from collections import deque
from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
SOURCE_BATCH = Path(r"D:\jmbow1\My Documents\Downloads\ChatGPT Image Apr 29, 2026, 03_01_17 PM.png")
SOURCE_LOCKERS = Path(r"D:\jmbow1\My Documents\Downloads\ChatGPT Image Apr 29, 2026, 03_04_30 PM.png")
OUT_DIR = ROOT / "public" / "structures" / "schoolyard"

BATCH_ASSETS = {
    "staffroom-headquarters": (8, 78, 626, 612),
    "administration-office": (643, 72, 1320, 611),
    "bookshelf-resource": (26, 688, 596, 1152),
    "locker-wall-long": (690, 688, 1287, 1162),
}

LOCKER_ASSETS = {
    "locker-single-star": (295, 38, 700, 500),
    "locker-single-poster": (830, 38, 1230, 505),
    "locker-single-paper": (300, 552, 695, 985),
    "locker-double": (835, 560, 1230, 990),
}


def is_batch_background(pixel: tuple[int, int, int, int]) -> bool:
    r, g, b, a = pixel
    if a < 80:
        return True

    maximum = max(r, g, b)
    minimum = min(r, g, b)
    saturation = maximum - minimum

    # The first sheet uses a nearly flat blue-black backdrop. Keep this
    # deliberately strict so dark roofs and shadowed walls are not eaten.
    return maximum <= 32 and saturation <= 18 and b >= r - 2


def is_locker_background(pixel: tuple[int, int, int, int]) -> bool:
    r, g, b, a = pixel
    if a < 80:
        return True

    maximum = max(r, g, b)
    minimum = min(r, g, b)
    saturation = maximum - minimum

    if maximum <= 18 and saturation <= 24:
        return True

    cool_metal = b >= r + 8 or g >= r + 10
    if cool_metal:
        return False

    neutral_backdrop = saturation <= 26 and maximum < 92
    warm_glow = saturation <= 50 and r >= b and maximum < 142
    return neutral_backdrop or warm_glow


def remove_connected_background(image: Image.Image, kind: str) -> Image.Image:
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
        is_background = is_locker_background if kind == "locker" else is_batch_background
        if not is_background(pixels[x, y]):
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


def extract(source: Image.Image, name: str, box: tuple[int, int, int, int], kind: str) -> Path:
    crop = source.crop(box)
    keyed = remove_connected_background(crop, kind)
    trimmed = keyed.crop(alpha_bbox(keyed))
    path = OUT_DIR / f"{name}.png"
    trimmed.save(path)
    return path


def save_preview(paths: list[Path]) -> None:
    scale = 0.4
    gap = 18
    images = [Image.open(path).convert("RGBA") for path in paths]
    scaled_sizes = [
        (max(1, round(image.width * scale)), max(1, round(image.height * scale)))
        for image in images
    ]
    width = max(sum(size[0] for size in scaled_sizes[:4]) + gap * 5, sum(size[0] for size in scaled_sizes[4:]) + gap * 5)
    row_one_h = max(size[1] for size in scaled_sizes[:4])
    row_two_h = max(size[1] for size in scaled_sizes[4:])
    height = row_one_h + row_two_h + gap * 3
    preview = Image.new("RGBA", (width, height), "#10202a")

    x = gap
    for image, size in zip(images[:4], scaled_sizes[:4]):
        resized = image.resize(size, Image.Resampling.LANCZOS)
        preview.alpha_composite(resized, (x, gap + row_one_h - size[1]))
        x += size[0] + gap

    x = gap
    for image, size in zip(images[4:], scaled_sizes[4:]):
        resized = image.resize(size, Image.Resampling.LANCZOS)
        preview.alpha_composite(resized, (x, gap * 2 + row_one_h + row_two_h - size[1]))
        x += size[0] + gap

    preview.save(OUT_DIR / "preview.png")


def main() -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    saved: list[Path] = []

    batch = Image.open(SOURCE_BATCH).convert("RGBA")
    for name, box in BATCH_ASSETS.items():
        saved.append(extract(batch, name, box, "batch"))

    lockers = Image.open(SOURCE_LOCKERS).convert("RGBA")
    for name, box in LOCKER_ASSETS.items():
        saved.append(extract(lockers, name, box, "locker"))

    (OUT_DIR / "manifest.txt").write_text(
        "\n".join(path.name for path in saved) + "\npreview.png\n",
        encoding="utf-8",
    )
    save_preview(saved)


if __name__ == "__main__":
    main()
