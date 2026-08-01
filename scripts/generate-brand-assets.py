from pathlib import Path

from PIL import Image, ImageDraw


ROOT = Path(__file__).resolve().parents[1]
IMAGE_DIR = ROOT / "assets" / "images"
SOURCE_IMAGE = IMAGE_DIR / "money-heist-icon-source.png"
PREVIEW_DIR = IMAGE_DIR / "previews"
NAVY = (11, 31, 42, 255)


def resize_contain(image: Image.Image, size: int) -> Image.Image:
    resized = image.copy()
    resized.thumbnail((size, size), Image.Resampling.LANCZOS)
    return resized


def centered_on_canvas(image: Image.Image, canvas_size: int, fill=(0, 0, 0, 0)) -> Image.Image:
    canvas = Image.new("RGBA", (canvas_size, canvas_size), fill)
    left = (canvas_size - image.width) // 2
    top = (canvas_size - image.height) // 2
    canvas.alpha_composite(image.convert("RGBA"), (left, top))
    return canvas


def apply_rounded_source_mask(image: Image.Image) -> Image.Image:
    rgba = image.convert("RGBA")
    width, height = rgba.size
    margin = int(min(width, height) * 0.032)
    radius = int(min(width, height) * 0.19)
    mask = Image.new("L", rgba.size, 0)
    draw = ImageDraw.Draw(mask)
    draw.rounded_rectangle((margin, margin, width - margin, height - margin), radius=radius, fill=255)
    rgba.putalpha(mask)
    return rgba


def make_adaptive_mask_preview(adaptive_foreground: Image.Image) -> Image.Image:
    size = adaptive_foreground.width
    preview = Image.new("RGBA", (size, size), NAVY)
    preview.alpha_composite(adaptive_foreground)

    mask = Image.new("L", (size, size), 0)
    draw = ImageDraw.Draw(mask)
    inset = int(size * 0.055)
    draw.rounded_rectangle((inset, inset, size - inset, size - inset), radius=int(size * 0.22), fill=255)

    outside = Image.new("RGBA", (size, size), (0, 0, 0, 130))
    preview = Image.composite(preview, outside, mask)
    outline = ImageDraw.Draw(preview)
    outline.rounded_rectangle(
        (inset, inset, size - inset, size - inset),
        radius=int(size * 0.22),
        outline=(255, 255, 255, 190),
        width=4,
    )
    return preview


def main() -> None:
    if not SOURCE_IMAGE.exists():
        raise FileNotFoundError(f"Missing approved source image: {SOURCE_IMAGE}")

    IMAGE_DIR.mkdir(parents=True, exist_ok=True)
    PREVIEW_DIR.mkdir(parents=True, exist_ok=True)

    source = Image.open(SOURCE_IMAGE)
    source_rgb = source.convert("RGB")
    source_masked = apply_rounded_source_mask(source)

    icon = source_rgb.resize((1024, 1024), Image.Resampling.LANCZOS)
    icon.save(IMAGE_DIR / "icon.png")

    adaptive_art = resize_contain(source_masked, 760)
    adaptive_icon = centered_on_canvas(adaptive_art, 1024)
    adaptive_icon.save(IMAGE_DIR / "adaptive-icon.png")

    splash_art = resize_contain(source_masked, 760)
    splash_icon = centered_on_canvas(splash_art, 1024)
    splash_icon.save(IMAGE_DIR / "splash-icon.png")

    favicon = source_rgb.resize((256, 256), Image.Resampling.LANCZOS)
    favicon.save(IMAGE_DIR / "favicon.png")

    make_adaptive_mask_preview(adaptive_icon).save(PREVIEW_DIR / "adaptive-mask-preview.png")
    splash_preview = Image.new("RGBA", (1024, 1024), NAVY)
    splash_preview.alpha_composite(splash_icon)
    splash_preview.save(PREVIEW_DIR / "splash-preview.png")


if __name__ == "__main__":
    main()
