"""The biliardino logo: the name in Geist SemiBold, the dots of its three i's turned into
players on a foosball rod; the app icon is the b of the name with the rod and one player.

Run:  python3 design/logo/logo.py [output folder]   (default: design/logo/out)
"""
import os
import sys

from word import outline

CELESTE = "#0A78AD"
CELESTE_LIGHT = "#45BAEC"
CELESTE_PALE = "#7FD3F5"
NAVY = "#0A1621"
WHITE = "#FFFFFF"
LIGHT_BG = "#F0F5F9"

THEMES = {
    # text, players, rod
    "light": (NAVY, CELESTE, CELESTE_LIGHT),
    "dark": ("#F0F5F9", CELESTE_LIGHT, CELESTE_PALE),
    "mono": (NAVY, NAVY, NAVY),
    "reverse": (WHITE, WHITE, WHITE),
}


def wordmark(theme="light", size=100, uid=None):
    """the horizontal logo: "biliardino", rod through the three i's"""
    text_c, dot_c, rod_c = THEMES[theme]
    uid = uid or theme
    text = "biliardino"
    paths, adv, boxes = outline(text, 600, size)
    ib = [b for ch, b in zip(text, boxes) if ch == "i"]
    r = size * 0.105                      # players: a little bigger than an i's dot
    cy = min(b[2] for b in ib) + size * 0.068
    xh = size * 0.53                      # Geist x-height
    # hide the original i dots
    cut = "".join(f'<rect x="{b[0] - 3:.1f}" y="{-size * 1.2:.1f}" width="{b[1] - b[0] + 6:.1f}" height="{size * 1.2 - xh - 3:.1f}" fill="black"/>' for b in ib)
    xs = [(b[0] + b[1]) / 2 for b in ib]
    x1, x2 = -size * 0.10, adv + size * 0.10
    left, top = size * 0.14, size * 0.98
    w, h = left + x2 + size * 0.04 + r * 0, size * 1.22
    body = "".join(f'<path d="{d}"/>' for d in paths)
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w:.1f} {h:.1f}">'
            f'<defs><mask id="i{uid}" maskUnits="userSpaceOnUse" x="-100" y="-300" width="3000" height="600"><rect x="-100" y="-300" width="3000" height="600" fill="white"/>{cut}</mask></defs>'
            f'<g transform="translate({left:.1f} {top:.1f})">'
            f'<line x1="{x1:.1f}" y1="{cy:.1f}" x2="{x2:.1f}" y2="{cy:.1f}" stroke="{rod_c}" stroke-width="{size * 0.032:.1f}" stroke-linecap="round"/>'
            f'<g fill="{text_c}" mask="url(#i{uid})">{body}</g>'
            + "".join(f'<circle cx="{x:.1f}" cy="{cy:.1f}" r="{r:.1f}" fill="{dot_c}"/>' for x in xs)
            + "</g></svg>")


def icon(bg=CELESTE, b=WHITE, rod=NAVY, player=WHITE, rounded=True, scale=1.0, rod_w=4.5, uid="i"):
    """the app icon on a 96 grid: the b of the wordmark, the rod at the top of its stem, one
    player beside it. scale < 1 shrinks the drawing (maskable icons need a safe zone)."""
    size, r, gap = 66 * scale, 8.5 * scale, 5 * scale
    paths, _, boxes = outline("b", 600, size, track=0)
    x0, x1, y0, y1 = boxes[0]
    total = (x1 - x0) + gap + 2 * r
    tx = (96 - total) / 2 - x0
    ty = (96 - (y1 - y0)) / 2 - y0 + 3 * scale
    cy = ty + y0 + r - 1 * scale
    shape = '<rect width="96" height="96" rx="21"/>' if rounded else '<rect width="96" height="96"/>'
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96"><defs><clipPath id="c{uid}">{shape}</clipPath></defs>'
            f'<g clip-path="url(#c{uid})"><rect width="96" height="96" fill="{bg}"/>'
            f'<line x1="-4" y1="{cy:.2f}" x2="100" y2="{cy:.2f}" stroke="{rod}" stroke-width="{rod_w * max(scale, 0.8):.2f}"/>'
            f'<g transform="translate({tx:.2f} {ty:.2f})" fill="{b}"><path d="{paths[0]}"/></g>'
            f'<circle cx="{tx + x1 + gap + r:.2f}" cy="{cy:.2f}" r="{r:.2f}" fill="{player}"/></g></svg>')


def mark(theme="light"):
    """the icon's drawing without its square, for light or dark backgrounds"""
    text_c, dot_c, rod_c = THEMES[theme]
    s = icon(bg="none", b=text_c, rod=rod_c, player=dot_c, rounded=False, uid="m" + theme)
    return s


if __name__ == "__main__":
    out = sys.argv[1] if len(sys.argv) > 1 else os.path.join(os.path.dirname(os.path.abspath(__file__)), "out")
    os.makedirs(out, exist_ok=True)
    files = {f"logo-{t}": wordmark(t) for t in THEMES}
    files.update({f"mark-{t}": mark(t) for t in ("light", "dark")})
    files["app-icon"] = icon()                                   # Android, 192/512
    files["app-icon-square"] = icon(rounded=False)               # iOS rounds it itself
    files["app-icon-maskable"] = icon(rounded=False, scale=0.8)  # drawing inside the safe zone
    files["favicon"] = icon(rod_w=6.5)                           # browser tab: thicker rod for 16 px
    for name, svg in files.items():
        with open(os.path.join(out, name + ".svg"), "w") as f:
            f.write(svg)
    print(f"{len(files)} files in {out}")
