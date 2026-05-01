from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
SOURCE = Path(r"D:\jmbow1\My Documents\Downloads\ChatGPT Image Apr 29, 2026, 07_59_49 PM.png")
OUT_DIR = ROOT / "public" / "portraits" / "structures"


PORTRAITS = {
    "bowling-machine": {
        "tower-01": (16, 86, 410, 615),
        "tower-02": (427, 86, 822, 615),
        "tower-03": (840, 86, 1238, 615),
    },
    "common-room": {
        "lounge-01": (16, 702, 410, 1200),
        "lounge-02": (427, 702, 822, 1200),
        "lounge-03": (840, 702, 1238, 1200),
    },
}


def save_preview(paths: list[Path]) -> None:
    images = [Image.open(path).convert("RGB") for path in paths]
    thumb_w = 154
    row_h = 170
    gap = 12
    cols = 3
    rows = 2
    preview = Image.new("RGB", (cols * thumb_w + gap * (cols + 1), rows * row_h + gap * (rows + 1)), "#0f172a")

    for index, image in enumerate(images):
        scale = min(thumb_w / image.width, row_h / image.height)
        size = (round(image.width * scale), round(image.height * scale))
        resized = image.resize(size, Image.Resampling.LANCZOS)
        col = index % cols
        row = index // cols
        x = gap + col * (thumb_w + gap) + (thumb_w - size[0]) // 2
        y = gap + row * (row_h + gap) + (row_h - size[1]) // 2
        preview.paste(resized, (x, y))

    preview.save(OUT_DIR / "preview-batch3.png")


def main() -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    source = Image.open(SOURCE).convert("RGB")
    saved: list[Path] = []

    for group, entries in PORTRAITS.items():
        group_dir = OUT_DIR / group
        group_dir.mkdir(parents=True, exist_ok=True)
        for name, box in entries.items():
            crop = source.crop(box)
            path = group_dir / f"{name}.png"
            crop.save(path)
            saved.append(path)

    save_preview(saved)


if __name__ == "__main__":
    main()
