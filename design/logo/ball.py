"""The football pattern: centre pentagon (point down), five seams, pentagons at the rim."""
import math


def pent(cx, cy, r, rot):
    return " ".join(
        f"{cx + r * math.cos(math.radians(rot + 72 * i)):.2f},{cy + r * math.sin(math.radians(rot + 72 * i)):.2f}"
        for i in range(5)
    )


def pattern(color, cx=48, cy=73, rp=6.6, d=19.5, ro=7.2, seam=2.0, outer=True, seams=True):
    els = [f'<polygon points="{pent(cx, cy, rp, 90)}" fill="{color}" stroke="{color}" stroke-width="1.2" stroke-linejoin="round"></polygon>']
    for i in range(5):
        a = math.radians(90 + 72 * i)
        vx, vy = cx + rp * math.cos(a), cy + rp * math.sin(a)
        ox, oy = cx + d * math.cos(a), cy + d * math.sin(a)
        if outer:
            els.append(f'<polygon points="{pent(ox, oy, ro, 90 + 72 * i + 180)}" fill="{color}" stroke="{color}" stroke-width="1.2" stroke-linejoin="round"></polygon>')
        if seams:
            ix, iy = ox - ro * math.cos(a), oy - ro * math.sin(a)
            els.append(f'<line x1="{vx:.2f}" y1="{vy:.2f}" x2="{ix:.2f}" y2="{iy:.2f}" stroke="{color}" stroke-width="{seam}" stroke-linecap="round"></line>')
    return "".join(els)
