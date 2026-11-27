#!/usr/bin/env python3
"""Validates generated presentations with independent tools (QA only).

For every .pptx in the given folder:
  1. opens it with python-pptx and walks every slide and shape;
  2. checks there is no `[ … ]` template text and no internal instruction;
  3. converts it with LibreOffice (`soffice --headless --convert-to pdf`);
  4. rasterizes the PDF with `pdftoppm` and builds a contact sheet PNG.

Usage: python3 scripts/pptx-validate.py <folder> [--dpi 40]
Requires: python-pptx, Pillow, LibreOffice and poppler-utils. Not used by the
application at runtime (none of these tools exist on Vercel).
"""
import argparse
import glob
import json
import os
import re
import subprocess
import sys

from pptx import Presentation
from pptx.util import Emu
from PIL import Image, ImageDraw

INSTRUCTIONS = [
    r"Duplicar esta slide", r"PÁGINA INTERNA", r"Todo lo que está en coral",
    r"^•\s*[A-ZÁÉÍÓÚÑ+ ]+$", r"Los KPIs son los mismos para todos",
    r"Agregar o quitar columnas", r"Dejar en el listado solo",
]


def inspect(path):
    prs = Presentation(path)
    problems = []
    shapes = 0
    editable = 0
    pictures = 0
    for index, slide in enumerate(prs.slides, start=1):
        for shape in slide.shapes:
            shapes += 1
            if shape.shape_type == 13:  # PICTURE
                pictures += 1
            if not shape.has_text_frame:
                continue
            editable += 1
            text = shape.text_frame.text
            if re.search(r"\[[^\]]*\]", text):
                problems.append(f"slide {index}: placeholder {text[:60]!r}")
            for line in text.splitlines():
                for pattern in INSTRUCTIONS:
                    if re.search(pattern, line.strip()):
                        problems.append(f"slide {index}: instruction {line[:60]!r}")
            if shape.left is not None and shape.left + shape.width > prs.slide_width + Emu(2_000_000):
                problems.append(f"slide {index}: shape {shape.shape_id} outside the slide")
    return {
        "slides": len(prs.slides),
        "shapes": shapes,
        "textFrames": editable,
        "pictures": pictures,
        "width": prs.slide_width,
        "height": prs.slide_height,
        "problems": problems,
    }


def render(path, out, dpi):
    subprocess.run(
        ["soffice", "--headless", "--convert-to", "pdf", "--outdir", out, path],
        check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, timeout=600,
    )
    pdf = os.path.join(out, os.path.splitext(os.path.basename(path))[0] + ".pdf")
    prefix = os.path.join(out, os.path.splitext(os.path.basename(path))[0])
    subprocess.run(["pdftoppm", "-r", str(dpi), "-png", pdf, prefix], check=True)
    pages = sorted(glob.glob(prefix + "-*.png"), key=lambda p: int(re.findall(r"-(\d+)\.png$", p)[0]))
    ims = [Image.open(p) for p in pages]
    w, h = ims[0].size
    cols = 5
    rows = (len(ims) + cols - 1) // cols
    sheet = Image.new("RGB", (cols * (w + 8), rows * (h + 22)), "white")
    draw = ImageDraw.Draw(sheet)
    for i, im in enumerate(ims):
        x, y = (i % cols) * (w + 8), (i // cols) * (h + 22)
        sheet.paste(im, (x, y + 18))
        draw.text((x + 2, y + 2), str(i + 1), fill="black")
    sheet_path = prefix + "-sheet.png"
    sheet.save(sheet_path)
    return {"pdf": pdf, "pages": len(pages), "sheet": sheet_path}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("folder")
    parser.add_argument("--dpi", type=int, default=40)
    parser.add_argument("--no-render", action="store_true")
    args = parser.parse_args()
    results = {}
    failed = False
    for path in sorted(glob.glob(os.path.join(args.folder, "*.pptx"))):
        info = inspect(path)
        if not args.no_render:
            info.update(render(path, args.folder, args.dpi))
            if info["pages"] != info["slides"]:
                info["problems"].append("LibreOffice page count differs from slide count")
        failed |= bool(info["problems"])
        results[os.path.basename(path)] = info
    print(json.dumps(results, indent=2, ensure_ascii=False))
    sys.exit(1 if failed else 0)


if __name__ == "__main__":
    main()
