"""Featured picks image CLI.

    python cli.py --in DIR --out DIR --report report.json [--model birefnet-general-lite]

Input files are `<listing_id>.jpg` (full-frame source photos). For each one: cut out,
gate, and write `<listing_id>.webp` (400x500) only if it passes. The JSON report is a list of
`{"listing_id", "pass", "reasons", "seconds"}`. One bad image never stops the run; the
process exits non-zero only when the model cannot be loaded.
"""
from __future__ import annotations

import argparse
import json
import sys
import time
from pathlib import Path

# Run as a script from any cwd: make sibling modules importable.
sys.path.insert(0, str(Path(__file__).resolve().parent))

from PIL import Image  # noqa: E402

import gate  # noqa: E402
import studio  # noqa: E402

Image.MAX_IMAGE_PIXELS = 40_000_000  # decompression-bomb guard


def process_dir(in_dir: Path, out_dir: Path, session) -> list[dict]:
    out_dir.mkdir(parents=True, exist_ok=True)
    rows: list[dict] = []
    for p in sorted(in_dir.glob('*.jpg')):
        t0 = time.time()
        row = {'listing_id': p.stem, 'pass': False, 'reasons': [], 'seconds': 0.0}
        try:
            img = Image.open(p)
            img.load()
            img = img.convert('RGB')
            alpha = studio.cutout_alpha(img, session)
            row['reasons'] = gate.check(alpha)
            if not row['reasons']:
                studio.render(img, alpha).save(out_dir / f'{p.stem}.webp', 'WEBP',
                                               quality=studio.WEBP_QUALITY, method=6)
                row['pass'] = True
        except Exception as exc:  # noqa: BLE001 — per-image isolation is the point
            row['pass'] = False
            row['reasons'] = [f'error: {type(exc).__name__}: {exc}'[:300]]
        row['seconds'] = round(time.time() - t0, 2)
        rows.append(row)
        print(json.dumps(row), flush=True)
    return rows


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(description=__doc__.split('\n\n')[0])
    ap.add_argument('--in', dest='in_dir', required=True, type=Path)
    ap.add_argument('--out', dest='out_dir', required=True, type=Path)
    ap.add_argument('--report', required=True, type=Path)
    ap.add_argument('--model', default='birefnet-general-lite')
    args = ap.parse_args(argv)
    try:
        from rembg import new_session
        session = new_session(args.model)
    except Exception as exc:  # noqa: BLE001
        print(f'model load failed: {exc}', file=sys.stderr)
        return 2
    rows = process_dir(args.in_dir, args.out_dir, session)
    args.report.write_text(json.dumps(rows, indent=1))
    return 0


if __name__ == '__main__':
    sys.exit(main())
