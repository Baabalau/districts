import math
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "libs"))

from PIL import Image, ImageChops, ImageDraw, ImageFont

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
ASSETS = os.path.join(ROOT, "assets")
PROFILE = os.path.join(ASSETS, "profile-pics")
FONT = os.path.join(os.path.dirname(__file__), "Oswald.ttf")
TITLE_ART = "/Users/baabalau/.cursor/projects/Users-baabalau-Documents-districts-after-dark/assets/Districts_After_Dark_-_title_text-b39bf5e8-96bd-4bc9-8341-d1c273526f7f.png"

W, H = 1200, 630
BG = (31, 42, 72)          # #1F2A48 navy (matches provided title art)
GOLD = (203, 160, 82)      # #CBA052
ACCENT = (138, 47, 37)     # #8A2F25 red (near extrusion)
GREEN = (76, 131, 92)      # #4C835C (far extrusion)
DARK = (15, 22, 38)        # #0F1626

# Match district page .title-3d transform: rotate(-5deg) skewX(-5deg)
ROT_DEG = 5      # CSS rotate(-5deg) == counter-clockwise 5deg == PIL +5
SKEW_DEG = -5    # CSS skewX(-5deg)


def font(size, weight="Bold"):
    f = ImageFont.truetype(FONT, size)
    try:
        f.set_variation_by_name(weight)
    except Exception:
        pass
    return f


def _line_width(draw, text, fnt, tracking):
    w = 0
    for ch in text:
        b = draw.textbbox((0, 0), ch, font=fnt)
        w += (b[2] - b[0]) + tracking
    return max(0, w - tracking)


def _draw_tracked(draw, x, y, text, fnt, fill, tracking):
    for ch in text:
        draw.text((x, y), ch, font=fnt, fill=fill)
        b = draw.textbbox((0, 0), ch, font=fnt)
        x += (b[2] - b[0]) + tracking


def render_title_3d(lines, size):
    """Render left-aligned stacked 3D title (gold face, red->green extrusion),
    matching the district page .title-3d look. Returns a tight RGBA image."""
    fnt = font(size, "Bold")
    tracking = max(1, int(size * 0.02))
    unit = max(2, int(round(size / 34.0)))     # extrusion step
    depth = 8
    line_h = int(size * 1.12)
    pad = unit * depth + int(size * 0.4)

    probe = Image.new("RGBA", (10, 10))
    pd = ImageDraw.Draw(probe)
    text_w = max(_line_width(pd, ln, fnt, tracking) for ln in lines)
    canvas_w = int(text_w + pad * 2)
    canvas_h = int(line_h * len(lines) + pad * 2)

    img = Image.new("RGBA", (canvas_w, canvas_h), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    for i, ln in enumerate(lines):
        bx = pad
        by = pad + i * line_h
        # extrusion, farthest first
        for k in range(depth, 0, -1):
            off = k * unit
            color = GREEN if k > 5 else ACCENT
            _draw_tracked(draw, bx + off, by + off, ln, fnt, color, tracking)
        _draw_tracked(draw, bx + max(1, unit // 2), by + max(1, unit // 2), ln, fnt, DARK, tracking)
        _draw_tracked(draw, bx, by, ln, fnt, GOLD, tracking)

    return img


def transform_title(img):
    """Apply skewX then rotate to match CSS transform."""
    s = math.tan(math.radians(SKEW_DEG))
    w, h = img.size
    extra = int(math.ceil(abs(s) * h))
    new_w = w + extra
    c = extra if s < 0 else 0.0
    sheared = img.transform(
        (new_w, h), Image.AFFINE, (1, -s, c, 0, 1, 0), resample=Image.BICUBIC
    )
    out = sheared.rotate(ROT_DEG, expand=True, resample=Image.BICUBIC)
    bbox = out.getbbox()
    return out.crop(bbox) if bbox else out


def fit_title(lines, max_w, max_h, start=230):
    size = start
    while size > 40:
        img = transform_title(render_title_3d(lines, size))
        if img.width <= max_w and img.height <= max_h:
            return img
        size -= 3
    return transform_title(render_title_3d(lines, 40))


def circle_headshot(path, diameter, ring=GOLD, ring_w=6):
    src = Image.open(path).convert("RGB")
    sw, sh = src.size
    side = min(sw, sh)
    left = (sw - side) // 2
    top = int((sh - side) * 0.12)
    top = max(0, min(top, sh - side))
    src = src.crop((left, top, left + side, top + side)).resize(
        (diameter, diameter), Image.LANCZOS
    )
    mask = Image.new("L", (diameter, diameter), 0)
    ImageDraw.Draw(mask).ellipse((0, 0, diameter, diameter), fill=255)
    canvas = Image.new("RGBA", (diameter, diameter), (0, 0, 0, 0))
    canvas.paste(src, (0, 0), mask)
    ring_img = Image.new("RGBA", (diameter, diameter), (0, 0, 0, 0))
    ImageDraw.Draw(ring_img).ellipse(
        (ring_w // 2, ring_w // 2, diameter - ring_w // 2, diameter - ring_w // 2),
        outline=ring,
        width=ring_w,
    )
    canvas.alpha_composite(ring_img)
    return canvas


def fit_name_font(draw, name, max_w, start=42, floor=26):
    size = start
    while size > floor:
        f = font(size, "Medium")
        b = draw.textbbox((0, 0), name, font=f)
        if (b[2] - b[0]) <= max_w:
            return f
        size -= 2
    return font(floor, "Medium")


def draw_name(draw, cx, y, name, max_w, start=38, floor=24):
    f = fit_name_font(draw, name, max_w, start=start, floor=floor)
    b = draw.textbbox((0, 0), name, font=f)
    draw.text((cx - (b[2] - b[0]) / 2 - b[0], y - b[1]), name, font=f, fill=GOLD)


# council name + influencer DISPLAY name (per user: branded handles for two guests)
DISTRICTS = {
    "a": {"council": ("Aimee McCarron", "Aimee-McCarron_2.png"),
          "influencer": ("Aubrey Avocado", "aubreyavocado_Medium-Small.png")},
    "b": {"council": ("Lesli Harris", "Lesli-Harris-New-Headshot-Small.png"),
          "influencer": ("Eaten Path Nola", "nicole_ralston_eatenpathnola-Small.png")},
    "c": {"council": ("Freddie King", "freddie-king-iii-headshot.jpg"),
          "influencer": ("Empower You Nola", "empoweryounola_justinbrown-Small.png")},
    "d": {"council": ("Eugene Green", "EugeneGreen.png"),
          "influencer": ("Casey Ferrand McGee", "caseyferrand-Medium.png")},
    "e": {"council": ("Jason Hughes", "jason-hughes_1.png"),
          "influencer": ("Ron Orleans", "ronorleans.png")},
}


def build_district(letter, data):
    img = Image.new("RGB", (W, H), BG)
    draw = ImageDraw.Draw(img)

    # --- Headshots: stacked on the right (council on top), slightly staggered ---
    diameter = 216
    r = diameter // 2
    cx_council, cy_council = 927, 148     # moved left, into space right of title
    cx_influencer, cy_influencer = 1012, 434
    council = circle_headshot(os.path.join(PROFILE, data["council"][1]), diameter)
    influencer = circle_headshot(os.path.join(PROFILE, data["influencer"][1]), diameter)
    img.paste(council, (cx_council - r, cy_council - r), council)
    img.paste(influencer, (cx_influencer - r, cy_influencer - r), influencer)

    name_max = 262
    draw_name(draw, cx_council, cy_council + r + 16, data["council"][0], name_max, start=40, floor=26)
    draw_name(draw, cx_influencer, cy_influencer + r + 16, data["influencer"][0], name_max, start=40, floor=26)

    # --- Title: unchanged (width based on influencer column only), reduced 10% ---
    title_max_w = cx_influencer - r - 34 - 14
    title = fit_title(["DISTRICT %s" % letter.upper(), "NIGHTCRAWL"], max_w=title_max_w, max_h=560)
    title = title.resize((int(title.width * 0.9), int(title.height * 0.9)), Image.LANCZOS)
    tx = 34
    ty = (H - title.height) // 2
    img.paste(title, (tx, ty), title)

    out = os.path.join(ASSETS, "og-district-%s.png" % letter)
    img.save(out)
    print("wrote", out, img.size)


def build_home():
    img = Image.new("RGB", (W, H), BG)
    art = Image.open(TITLE_ART).convert("RGB")

    # trim uniform navy border so we scale the text, not the padding
    bg = Image.new("RGB", art.size, BG)
    bbox = ImageChops.difference(art, bg).convert("L").point(lambda p: 255 if p > 24 else 0).getbbox()
    if bbox:
        art = art.crop(bbox)
    art = art.convert("RGBA")

    target_w = int(W * 0.80)
    target_h = int(H * 0.84)
    scale = min(target_w / art.width, target_h / art.height)
    art = art.resize((int(art.width * scale), int(art.height * scale)), Image.LANCZOS)
    img.paste(art, ((W - art.width) // 2, (H - art.height) // 2), art)

    out = os.path.join(ASSETS, "og-image.png")
    img.save(out)
    print("wrote", out, img.size)


if __name__ == "__main__":
    build_home()
    for letter, data in DISTRICTS.items():
        build_district(letter, data)
