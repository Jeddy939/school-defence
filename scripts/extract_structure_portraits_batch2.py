from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
SOURCE = Path(r"D:\jmbow1\My Documents\Downloads\ChatGPT Image Apr 29, 2026, 06_10_34 PM.png")
OUT_DIR = ROOT / "public" / "portraits" / "structures"


PORTRAITS = {
    "maths-block": {
        "classroom-01": (29, 49, 412, 310),
        "classroom-02": (444, 49, 814, 310),
        "classroom-03": (842, 49, 1208, 310),
    },
    "science-lab": {
        "lab-01": (29, 361, 412, 617),
        "lab-02": (444, 361, 814, 617),
        "lab-03": (842, 361, 1208, 617),
    },
    "sports-centre": {
        "gym-01": (29, 667, 412, 910),
        "gym-02": (444, 667, 814, 910),
        "gym-03": (842, 667, 1208, 910),
    },
    "canteen": {
        "counter-01": (29, 961, 412, 1206),
        "counter-02": (444, 961, 814, 1206),
        "counter-03": (842, 961, 1208, 1206),
    },
}


def save_preview(paths: list[Path]) -> None:
    images = [Image.open(path).convert("RGB") for path in paths]
    thumb_w = 148
    gap = 12
    rows = 4
    cols = 3
    row_h = 112
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

    preview.save(OUT_DIR / "preview-batch2.png")


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
