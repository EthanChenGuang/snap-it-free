"""End-to-end check of the featured picks CLI on two real Subito photos.

clean.jpg            child bike seat, fully inside the frame       → pass, 400x500 WebP
watermark_overlap.jpg wardrobe reaching the bottom-right logo zone  → fail (watermark)
"""
import json
import shutil
import subprocess
import sys
from pathlib import Path

import numpy as np
from PIL import Image

HERE = Path(__file__).resolve().parent
CLI = HERE.parent / 'cli.py'
sys.path.insert(0, str(HERE.parent))

import gate  # noqa: E402
import studio  # noqa: E402


def test_cli_end_to_end(tmp_path):
    in_dir, out_dir, report = tmp_path / 'in', tmp_path / 'out', tmp_path / 'report.json'
    in_dir.mkdir()
    shutil.copy(HERE / 'fixtures' / 'clean.jpg', in_dir / 'clean.jpg')
    shutil.copy(HERE / 'fixtures' / 'watermark_overlap.jpg', in_dir / 'watermark_overlap.jpg')
    (in_dir / 'broken.jpg').write_bytes(b'not a jpeg')

    proc = subprocess.run([sys.executable, str(CLI), '--in', str(in_dir), '--out', str(out_dir),
                           '--report', str(report)], capture_output=True, text=True, timeout=600)
    assert proc.returncode == 0, proc.stderr

    rows = {r['listing_id']: r for r in json.loads(report.read_text())}
    assert set(rows) == {'clean', 'watermark_overlap', 'broken'}

    assert rows['clean']['pass'] is True, rows['clean']
    with Image.open(out_dir / 'clean.webp') as im:
        assert im.format == 'WEBP'
        assert im.size == (400, 500)

    assert rows['watermark_overlap']['pass'] is False
    assert any('watermark' in r for r in rows['watermark_overlap']['reasons'])
    assert not (out_dir / 'watermark_overlap.webp').exists()

    assert rows['broken']['pass'] is False
    assert rows['broken']['reasons'][0].startswith('error:')


def test_gate_rejects_object_in_watermark_corner():
    mask = np.zeros((400, 300), np.uint8)
    mask[150:390, 120:295] = 255
    assert any('watermark' in r for r in gate.check(mask))


def test_gate_passes_centred_object():
    mask = np.zeros((400, 300), np.uint8)
    mask[100:300, 80:220] = 255
    assert gate.check(mask) == []


def test_compose_output_spec():
    cut = Image.new('RGBA', (120, 200), (200, 30, 30, 255))
    out = studio.compose(cut)
    assert out.size == studio.CANVAS == (400, 500)
    assert out.getpixel((2, 0)) == (249, 249, 248)
