from pathlib import Path

from PIL import Image, ImageEnhance, ImageFilter


ROOT = Path(__file__).resolve().parents[1]
SOURCE_DIR = ROOT / "public" / "tiles" / "schoolyard-iso"
OUT_DIR = ROOT / "public" / "tiles" / "schoolyard-textures-gameplay"
SAMPLE_SIZE = 128
TEXTURE_SIZE = 64

FALLBACKS = {
    "grass-base": "#65a30d",
    "grass-flowers": "#65a30d",
    "concrete-path": "#9ca3af",
    "cracked-concrete": "#9ca3af",
    "dry-dirt": "#8b572a",
    "grass-dirt-transition": "#65a30d",
    "bushy-ground": "#3f8f33",
    "rocky-grass": "#65a30d",
}


def inset_quad(
    quad: tuple[tuple[float, float], tuple[float, float], tuple[float, float], tuple[float, float]],
    amount: float,
) -> tuple[tuple[float, float], tuple[float, float], tuple[float, float], tuple[float, float]]:
    center_x = sum(point[0] for point in quad) / 4
    center_y = sum(point[1] for point in quad) / 4
    return tuple(
        (
            center_x + (point[0] - center_x) * (1 - amount),
            center_y + (point[1] - center_y) * (1 - amount),
        )
        for point in quad
    )


def source_quad(image: Image.Image) -> tuple[tuple[float, float], tuple[float, float], tuple[float, float], tuple[float, float]]:
    alpha = image.getchannel("A")
    bbox = alpha.getbbox()
    if bbox is None:
        width, height = image.size
        return ((width / 2, 0), (width - 1, height / 2), (width / 2, height - 1), (0, height / 2))

    left, top, right, bottom = bbox
    center_x = (left + right - 1) / 2

    widest_y = top
    widest_span = 0
    widest_left = left
    widest_right = right - 1
    for y in range(top, bottom):
        xs = [x for x in range(left, right) if alpha.getpixel((x, y)) > 0]
        if not xs:
            continue
        span = xs[-1] - xs[0]
        if span > widest_span:
            widest_span = span
            widest_y = y
            widest_left = xs[0]
            widest_right = xs[-1]

    return inset_quad((
        (center_x, top),
        (widest_right, widest_y),
        (center_x, bottom - 1),
        (widest_left, widest_y),
    ), 0.13)


def sample_bilinear_quad(
    image: Image.Image,
    quad: tuple[tuple[float, float], tuple[float, float], tuple[float, float], tuple[float, float]],
    fallback: str,
) -> Image.Image:
    source = image.convert("RGBA")
    pixels = source.load()
    output = Image.new("RGBA", (SAMPLE_SIZE, SAMPLE_SIZE), fallback)
    out = output.load()
    p_top, p_right, p_bottom, p_left = quad

    fallback_rgba = Image.new("RGBA", (1, 1), fallback).getpixel((0, 0))

    for y in range(SAMPLE_SIZE):
        v = y / (SAMPLE_SIZE - 1)
        for x in range(SAMPLE_SIZE):
            u = x / (SAMPLE_SIZE - 1)

            sx = (
                (1 - u) * (1 - v) * p_top[0]
                + u * (1 - v) * p_right[0]
                + u * v * p_bottom[0]
                + (1 - u) * v * p_left[0]
            )
            sy = (
                (1 - u) * (1 - v) * p_top[1]
                + u * (1 - v) * p_right[1]
                + u * v * p_bottom[1]
                + (1 - u) * v * p_left[1]
            )

            px = min(source.width - 1, max(0, round(sx)))
            py = min(source.height - 1, max(0, round(sy)))
            color = pixels[px, py]
            alpha = color[3] / 255
            if alpha >= 1:
                out[x, y] = color
            elif alpha <= 0:
                out[x, y] = fallback_rgba
            else:
                out[x, y] = tuple(
                    round(color[i] * alpha + fallback_rgba[i] * (1 - alpha)) for i in range(3)
                ) + (255,)

    return output


def simplify_for_gameplay(image: Image.Image) -> Image.Image:
    texture = image.resize((TEXTURE_SIZE, TEXTURE_SIZE), Image.Resampling.BILINEAR)
    texture = texture.filter(ImageFilter.MedianFilter(size=3))
    texture = ImageEnhance.Contrast(texture).enhance(0.82)
    texture = ImageEnhance.Color(texture).enhance(0.9)
    return texture.convert("RGBA")


def save_preview(paths: list[Path]) -> None:
    scale = 2
    gap = 8
    images = [Image.open(path).convert("RGBA") for path in paths]
    width = len(images) * TEXTURE_SIZE * scale + (len(images) + 1) * gap
    height = TEXTURE_SIZE * scale + gap * 2
    preview = Image.new("RGBA", (width, height), "#10202a")

    x = gap
    for image in images:
        scaled = image.resize((TEXTURE_SIZE * scale, TEXTURE_SIZE * scale), Image.Resampling.NEAREST)
        preview.alpha_composite(scaled, (x, gap))
        x += TEXTURE_SIZE * scale + gap

    preview.save(OUT_DIR / "preview.png")


def main() -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    saved: list[Path] = []

    for name, fallback in FALLBACKS.items():
        image = Image.open(SOURCE_DIR / f"{name}.png").convert("RGBA")
        texture = simplify_for_gameplay(sample_bilinear_quad(image, source_quad(image), fallback))
        path = OUT_DIR / f"{name}.png"
        texture.save(path)
        saved.append(path)

    (OUT_DIR / "manifest.txt").write_text(
        "\n".join(path.name for path in saved) + "\npreview.png\n",
        encoding="utf-8",
    )
    save_preview(saved)


if __name__ == "__main__":
    main()
