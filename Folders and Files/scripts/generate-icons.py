#!/usr/bin/env python3
"""Render the extension icons at 16/48/128 px.

The artwork is drawn once at 1024 px and downsampled with Lanczos, which keeps
the chevron and bars crisp at toolbar sizes. Only Pillow is required.
"""

from pathlib import Path

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "icons"
SIZES = (16, 48, 128)

SCALE = 1024

BACKGROUND = (36, 41, 47, 255)   # GitHub dark canvas
ACCENT = (47, 129, 247, 255)     # Primer blue
INK = (240, 246, 252, 255)       # near white
MUTED = (139, 148, 158, 255)     # muted gray


def build() -> Image.Image:
    image = Image.new("RGBA", (SCALE, SCALE), (0, 0, 0, 0))
    draw = ImageDraw.Draw(image)

    draw.rounded_rectangle(
        (0, 0, SCALE - 1, SCALE - 1),
        radius=int(SCALE * 0.215),
        fill=BACKGROUND,
    )

    # File list: one accent row up top, one muted row at the bottom.
    draw.rounded_rectangle(
        (int(SCALE * 0.292), int(SCALE * 0.235), int(SCALE * 0.708), int(SCALE * 0.305)),
        radius=int(SCALE * 0.035),
        fill=ACCENT,
    )
    draw.rounded_rectangle(
        (int(SCALE * 0.292), int(SCALE * 0.760), int(SCALE * 0.590), int(SCALE * 0.830)),
        radius=int(SCALE * 0.035),
        fill=MUTED,
    )

    # Collapse chevron.
    stroke = int(SCALE * 0.092)
    points = [
        (int(SCALE * 0.330), int(SCALE * 0.455)),
        (int(SCALE * 0.500), int(SCALE * 0.625)),
        (int(SCALE * 0.670), int(SCALE * 0.455)),
    ]
    draw.line(points, fill=INK, width=stroke, joint="curve")
    cap = stroke // 2
    for x, y in (points[0], points[-1]):
        draw.ellipse((x - cap, y - cap, x + cap, y + cap), fill=INK)

    return image


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    artwork = build()

    for size in SIZES:
        artwork.resize((size, size), Image.Resampling.LANCZOS).save(
            OUT / f"icon{size}.png"
        )
        print(f"wrote {OUT / f'icon{size}.png'}")


if __name__ == "__main__":
    main()
