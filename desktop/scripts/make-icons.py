"""Tạo biểu tượng Windows cho DVDCAD Desktop từ icon-512.png của app.
   build/icon.ico, build/icon.png  — biểu tượng chương trình
   build/file-dwg.ico, build/file-dxf.ico — biểu tượng file trong Explorer (tờ giấy gấp góc + nhãn)
   Cần Pillow:  pip install pillow   rồi   python3 scripts/make-icons.py"""
import os
from PIL import Image, ImageDraw, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.normpath(os.path.join(HERE, '..', '..'))
OUT = os.path.join(HERE, '..', 'build')
SIZES = [(16, 16), (24, 24), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)]


def font(px):
    for f in ('DejaVuSans-Bold.ttf', 'arialbd.ttf', 'Arial Bold.ttf'):
        try:
            return ImageFont.truetype(f, px)
        except OSError:
            pass
    return ImageFont.load_default()


def doc_icon(label, color, logo):
    s = 256
    im = Image.new('RGBA', (s, s), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    fold = 56
    page = [(40, 8), (216 - fold, 8), (216, 8 + fold), (216, 248), (40, 248)]
    d.polygon(page, fill=(245, 247, 250, 255), outline=(120, 130, 145, 255))
    d.polygon([(216 - fold, 8), (216 - fold, 8 + fold), (216, 8 + fold)], fill=(205, 212, 222, 255), outline=(120, 130, 145, 255))
    lg = logo.resize((120, 120), Image.LANCZOS)
    im.alpha_composite(lg, (68, 52))
    d.rounded_rectangle((28, 178, 228, 236), radius=10, fill=color)
    f = font(46)
    w = d.textlength(label, font=f)
    d.text(((s - w) / 2, 182), label, font=f, fill=(255, 255, 255, 255))
    return im


def main():
    os.makedirs(OUT, exist_ok=True)
    logo = Image.open(os.path.join(ROOT, 'icon-512.png')).convert('RGBA')
    logo.resize((512, 512), Image.LANCZOS).save(os.path.join(OUT, 'icon.png'))
    logo.resize((256, 256), Image.LANCZOS).save(os.path.join(OUT, 'icon.ico'), sizes=SIZES)
    doc_icon('DWG', (200, 45, 45, 255), logo).save(os.path.join(OUT, 'file-dwg.ico'), sizes=SIZES)
    doc_icon('DXF', (30, 110, 200, 255), logo).save(os.path.join(OUT, 'file-dxf.ico'), sizes=SIZES)
    print('Đã tạo biểu tượng trong', os.path.normpath(OUT))


if __name__ == '__main__':
    main()
