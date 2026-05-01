from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
SOURCE = Path(r"D:\jmbow1\My Documents\Downloads\ChatGPT Image Apr 29, 2026, 05_57_13 PM.png")
OUT_DIR = ROOT / "public" / "portraits" / "structures"


PORTRAITS = {
    "staffroom": {
        "headquarters-01": (234, 35, 531, 331),
        "headquarters-02": (558, 35, 855, 331),
        "headquarters-03": (882, 35, 1179, 331),
    },
    "admin-office": {
        "office-01": (234, 370, 531, 663),
        "office-02": (558, 370, 855, 663),
        "office-03": (882, 370, 1179, 663),
    },
    "bookshelf": {
        "resource-01": (234, 694, 531, 953),
        "resource-02": (558, 694, 855, 953),
        "resource-03": (882, 694, 1179, 953),
    },
    "locker": {
        "defense-01": (234, 985, 531, 1237),
        "defense-02": (558, 985, 855, 1237),
        "defense-03": (882, 985, 1179, 1237),
    },
}


def save_preview(paths: list[Path]) -> None:
    images = [Image.open(path).convert("RGB") for path in paths]
    thumb_w = 148
    gap = 12
    rows = 4
    cols = 3
    row_h = 132
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

    preview.save(OUT_DIR / "preview.png")


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

    (OUT_DIR / "manifest.txt").write_text(
        "\n".join(str(path.relative_to(OUT_DIR)).replace("\\", "/") for path in saved) + "\npreview.png\n",
        encoding="utf-8",
    )
    save_preview(saved)


if __name__ == "__main__":
    main()
