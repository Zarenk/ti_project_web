#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Redacts sensitive numeric sequences inside a PDF by overlaying white rectangles.
"""

import argparse
import re
from pathlib import Path

try:
    import fitz  # PyMuPDF
except ImportError as exc:
    raise SystemExit("PyMuPDF is required: pip install pymupdf") from exc


PATTERN = re.compile(r"\b\d{8,}\b")


def redact_pdf(input_path: Path, output_path: Path) -> None:
    doc = fitz.open(input_path)
    for page in doc:
        words = page.get_text("words")  # list of tuples (x0, y0, x1, y1, word, block_no, line_no, word_no)
        rects = []
        for word in words:
            if PATTERN.search(word[4]):
                rect = fitz.Rect(word[0], word[1], word[2], word[3])
                rects.append(rect)
        if rects:
            for rect in rects:
                page.add_redact_annot(rect, fill=(1, 1, 1))
            page.apply_redactions()
    doc.save(output_path, deflate=True)


def main():
    parser = argparse.ArgumentParser(description="Redact numeric patterns from a PDF.")
    parser.add_argument("--input", "-i", required=True, help="Source PDF path")
    parser.add_argument(
        "--output",
        "-o",
        help="Destination path for the redacted PDF (defaults to <tmpdir>/<name>.redacted.pdf)",
    )
    args = parser.parse_args()

    input_path = Path(args.input)
    if not input_path.exists():
        raise SystemExit(f"File not found: {input_path}")

    if args.output:
        output_path = Path(args.output)
    else:
        suffix = "".join(input_path.suffixes)
        base = input_path.stem
        output_path = input_path.parent / f"{base}.redacted{suffix}"

    redact_pdf(input_path, output_path)
    print(str(output_path))


if __name__ == "__main__":
    main()
