from pathlib import Path
from random import Random

from PIL import Image, ImageDraw


ROOT = Path(__file__).resolve().parents[1]
OUT_DIR = ROOT / "public" / "tiles" / "schoolyard"
TILE_SIZE = 40


def rect(draw: ImageDraw.ImageDraw, x: int, y: int, w: int, h: int, fill: str | tuple[int, int, int, int]) -> None:
    draw.rectangle((x, y, x + w - 1, y + h - 1), fill=fill)


def make_tile(base: str) -> Image.Image:
    return Image.new("RGBA", (TILE_SIZE, TILE_SIZE), base)


def add_noise(draw: ImageDraw.ImageDraw, rng: Random, colors: list[str], count: int, max_size: int = 2) -> None:
    for _ in range(count):
        x = rng.randrange(TILE_SIZE)
        y = rng.randrange(TILE_SIZE)
        w = rng.randrange(1, max_size + 1)
        h = rng.randrange(1, max_size + 1)
        rect(draw, x, y, w, h, rng.choice(colors))


def add_grass_tuft(draw: ImageDraw.ImageDraw, rng: Random, x: int, y: int) -> None:
    dark = rng.choice(["#2f6d2c", "#2a5c2d", "#39742d"])
    light = rng.choice(["#70b94b", "#83c857", "#9bd46a"])
    rect(draw, x, y + 2, 1, 3, dark)
    rect(draw, x + 2, y + 1, 1, 4, dark)
    rect(draw, x + 4, y + 2, 1, 3, dark)
    rect(draw, x + 2, y, 1, 2, light)


def grass(seed: int) -> Image.Image:
    rng = Random(seed)
    img = make_tile(rng.choice(["#4f9d3a", "#559f3f", "#4b9637"]))
    draw = ImageDraw.Draw(img)
    add_noise(draw, rng, ["#3e7f33", "#66ad45", "#75bb4f", "#376f30"], 170, 2)

    for _ in range(16):
        add_grass_tuft(draw, rng, rng.randrange(2, 35), rng.randrange(2, 35))

    for _ in range(4):
        x = rng.randrange(4, 36)
        y = rng.randrange(4, 36)
        rect(draw, x, y, 1, 1, rng.choice(["#f7e46b", "#f7b267", "#f5f5f4"]))

    return img


def concrete(seed: int) -> Image.Image:
    rng = Random(seed)
    img = make_tile(rng.choice(["#aeb4b7", "#a8b0b4", "#b8bec0"]))
    draw = ImageDraw.Draw(img)
    add_noise(draw, rng, ["#969da2", "#c7cbcd", "#8d9498", "#bec4c7"], 145, 2)

    line = rng.choice([13, 20, 27])
    rect(draw, 0, line, TILE_SIZE, 1, "#8d9498")
    rect(draw, line, 0, 1, TILE_SIZE, "#c8ced0")

    for _ in range(3):
        x = rng.randrange(4, 28)
        y = rng.randrange(4, 32)
        length = rng.randrange(5, 11)
        color = rng.choice(["#737b80", "#868e92"])
        for i in range(length):
            rect(draw, x + i, y + (i // 3), 1, 1, color)

    return img


def dirt(seed: int) -> Image.Image:
    rng = Random(seed)
    img = make_tile(rng.choice(["#8b572a", "#945f31", "#7c4a24"]))
    draw = ImageDraw.Draw(img)
    add_noise(draw, rng, ["#6d3d1d", "#a66a37", "#b7773e", "#5c351b"], 210, 2)

    for _ in range(18):
        x = rng.randrange(3, 36)
        y = rng.randrange(3, 36)
        rect(draw, x, y, rng.randrange(2, 5), 1, rng.choice(["#70421f", "#b87942"]))

    return img


def draw_bush_blob(draw: ImageDraw.ImageDraw, rng: Random, cx: int, cy: int, r: int) -> None:
    outline = "#1f4f2a"
    mid = rng.choice(["#2f7d32", "#378a35", "#2d7430"])
    light = rng.choice(["#5fba46", "#6fc455", "#82cf63"])
    shadow = "#245f2d"

    rect(draw, cx - r, cy - r // 2, r * 2, r, outline)
    rect(draw, cx - r + 1, cy - r // 2 - 1, r * 2 - 2, r + 2, mid)
    rect(draw, cx - r // 2, cy - r, r, r * 2, mid)
    rect(draw, cx - r + 2, cy + r // 2, r * 2 - 4, 2, shadow)

    for _ in range(8):
        x = rng.randrange(cx - r + 2, cx + r - 1)
        y = rng.randrange(cy - r + 1, cy + r - 1)
        rect(draw, x, y, rng.randrange(1, 3), 1, light)


def bushes(seed: int) -> Image.Image:
    rng = Random(seed)
    img = grass(seed + 101)
    draw = ImageDraw.Draw(img)

    for _ in range(4):
        draw_bush_blob(draw, rng, rng.randrange(8, 33), rng.randrange(9, 32), rng.randrange(5, 8))

    return img


def draw_rock(draw: ImageDraw.ImageDraw, rng: Random, x: int, y: int, w: int, h: int) -> None:
    dark = "#4b5563"
    mid = rng.choice(["#777f83", "#858c8f", "#6f777a"])
    light = "#b8c0c2"
    shadow = "#374151"

    points = [
        (x + 2, y + h - 2),
        (x, y + h // 2),
        (x + w // 3, y),
        (x + w - 2, y + 2),
        (x + w, y + h // 2),
        (x + w - 3, y + h),
    ]
    draw.polygon(points, fill=dark)
    draw.polygon([(px, py + 1) for px, py in points[:-1]], fill=mid)
    rect(draw, x + 3, y + 2, max(2, w // 3), 2, light)
    rect(draw, x + w // 2, y + h - 2, max(2, w // 3), 2, shadow)


def rocks(seed: int) -> Image.Image:
    rng = Random(seed)
    img = grass(seed + 202)
    draw = ImageDraw.Draw(img)
    add_noise(draw, rng, ["#7a5a35", "#6b4c2e"], 40, 1)

    for _ in range(5):
        draw_rock(draw, rng, rng.randrange(2, 30), rng.randrange(4, 30), rng.randrange(6, 11), rng.randrange(4, 8))

    return img


def tree() -> Image.Image:
    rng = Random(4242)
    img = Image.new("RGBA", (64, 96), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    draw.ellipse((15, 80, 49, 91), fill=(0, 0, 0, 70))
    rect(draw, 29, 58, 8, 27, "#5b341a")
    rect(draw, 36, 58, 3, 27, "#3f2414")
    rect(draw, 27, 66, 5, 15, "#7a4a22")
    rect(draw, 24, 79, 7, 5, "#5b341a")
    rect(draw, 36, 79, 8, 5, "#3f2414")

    blobs = [
        (31, 46, 24, 17, "#23692d"),
        (23, 56, 19, 15, "#2f7d32"),
        (42, 56, 18, 14, "#286f30"),
        (31, 33, 17, 15, "#378a35"),
        (22, 38, 14, 13, "#2c7832"),
        (43, 39, 14, 13, "#2f7d32"),
    ]

    for cx, cy, rx, ry, color in blobs:
        draw.ellipse((cx - rx, cy - ry, cx + rx, cy + ry), fill="#1b4f2a")
        draw.ellipse((cx - rx + 2, cy - ry + 2, cx + rx - 2, cy + ry - 1), fill=color)

    for _ in range(60):
        x = rng.randrange(13, 51)
        y = rng.randrange(20, 65)
        color = rng.choice(["#54b948", "#61c453", "#1f5d2b", "#2b7430"])
        rect(draw, x, y, rng.randrange(1, 4), rng.randrange(1, 3), color)

    rect(draw, 22, 27, 9, 4, "#6fd15d")
    rect(draw, 17, 42, 8, 3, "#69c957")
    rect(draw, 32, 24, 5, 3, "#7ad764")
    return img


def save_variants(name: str, maker, seeds: list[int]) -> list[Path]:
    paths: list[Path] = []
    for index, seed in enumerate(seeds):
        path = OUT_DIR / f"{name}-{index}.png"
        maker(seed).save(path)
        paths.append(path)
    return paths


def save_preview(tile_paths: list[Path], tree_path: Path) -> None:
    scale = 4
    tile_gap = 8
    tile_preview = TILE_SIZE * scale
    tree_preview_w = 64 * 2
    tree_preview_h = 96 * 2
    width = (tile_preview + tile_gap) * len(tile_paths) + tree_preview_w + tile_gap * 2
    height = max(tile_preview, tree_preview_h) + tile_gap * 2
    preview = Image.new("RGBA", (width, height), "#1f2937")

    x = tile_gap
    for path in tile_paths:
        img = Image.open(path).resize((tile_preview, tile_preview), Image.Resampling.NEAREST)
        preview.alpha_composite(img, (x, tile_gap))
        x += tile_preview + tile_gap

    tree_img = Image.open(tree_path).resize((tree_preview_w, tree_preview_h), Image.Resampling.NEAREST)
    preview.alpha_composite(tree_img, (x, tile_gap))
    preview.save(OUT_DIR / "preview.png")


def main() -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)

    grass_paths = save_variants("grass", grass, [10, 11, 12])
    concrete_paths = save_variants("concrete-path", concrete, [20, 21, 22])
    dirt_paths = save_variants("dirt", dirt, [30, 31, 32])
    bush_paths = save_variants("bushes", bushes, [40, 41, 42])
    rock_paths = save_variants("rocks", rocks, [50, 51, 52])

    tree_path = OUT_DIR / "tree.png"
    tree().save(tree_path)

    save_preview(
        [grass_paths[0], concrete_paths[0], dirt_paths[0], bush_paths[0], rock_paths[0]],
        tree_path,
    )

    manifest = OUT_DIR / "manifest.txt"
    manifest.write_text(
        "\n".join(
            [
                "grass-0.png",
                "grass-1.png",
                "grass-2.png",
                "concrete-path-0.png",
                "concrete-path-1.png",
                "concrete-path-2.png",
                "dirt-0.png",
                "dirt-1.png",
                "dirt-2.png",
                "bushes-0.png",
                "bushes-1.png",
                "bushes-2.png",
                "rocks-0.png",
                "rocks-1.png",
                "rocks-2.png",
                "tree.png",
                "preview.png",
            ]
        )
        + "\n",
        encoding="utf-8",
    )


if __name__ == "__main__":
    main()
