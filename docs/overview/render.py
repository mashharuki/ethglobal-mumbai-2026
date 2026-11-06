"""Export the deterministic SVG frames as README GIFs using existing Pillow/librsvg."""
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
import subprocess
import tempfile
from PIL import Image

DOCS = Path(__file__).resolve().parent.parent
FRAMES = Path(tempfile.gettempdir()) / "mumbai-overview-frames"


def render_png(source):
    destination = source.with_suffix(".png")
    subprocess.run(["rsvg-convert", "-w", "1024", "-h", "608", "-o", str(destination), str(source)], check=True)
    return destination


def export_animation(language):
    sources = sorted(FRAMES.glob(f"{language}-*.svg"))
    if len(sources) != 256:
        raise RuntimeError("Run node docs/overview/build.mjs --frames first")
    with ThreadPoolExecutor(max_workers=6) as executor:
        paths = list(executor.map(render_png, sources))
    palette_sheet = Image.new("RGB", (1024, 608 * 4), "white")
    for row, index in enumerate([0, 64, 160, 244]):
        with Image.open(paths[index]) as frame:
            palette_sheet.paste(frame.convert("RGB"), (0, row * 608))
    palette = palette_sheet.quantize(colors=128, method=Image.Quantize.MEDIANCUT)
    frames = []
    for path in paths:
        with Image.open(path) as frame:
            frames.append(frame.convert("RGB").quantize(palette=palette, dither=Image.Dither.NONE))
    suffix = "" if language == "en" else "-ja"
    output = DOCS / "assets" / f"private-dating-overview{suffix}.gif"
    # GIF delays use 10 ms units; alternating 120/130 ms preserves 32 seconds at 8 fps.
    license_text = (DOCS / "assets/icons/LICENSE").read_bytes()
    frames[0].save(output, save_all=True, append_images=frames[1:], duration=[120, 130] * 128, loop=0, optimize=True, disposal=1, comment=license_text)
    with Image.open(paths[160]) as frame:
        frame.save(DOCS / "assets" / f"private-dating-overview{suffix}.png")
    with Image.open(output) as image:
        total = 0
        for index in range(image.n_frames):
            image.seek(index)
            image.load()
            total += image.info["duration"]
        assert total == 32000, total
        print(f"{output.name}: {image.n_frames} frames, {total / 1000}s, {output.stat().st_size / 1024 / 1024:.2f} MiB, all frames decoded")


for language in ["en", "ja"]:
    export_animation(language)
