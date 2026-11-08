"""Turns text into SVG outlines with Geist, the app's typeface (src/fonts/), so logo files
don't depend on any installed font."""
import functools
import io
import os

import uharfbuzz as hb
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.pens.boundsPen import BoundsPen

HERE = os.path.dirname(os.path.abspath(__file__))
FONT = os.path.join(HERE, "..", "..", "src", "fonts", "Geist-Variable-latin.woff2")


@functools.lru_cache(None)
def _ttf_bytes():
    """the bundled WOFF2 as plain TrueType bytes (what HarfBuzz reads)"""
    f = TTFont(FONT)
    f.flavor = None
    buf = io.BytesIO()
    f.save(buf)
    return buf.getvalue()


@functools.lru_cache(None)
def _instance(weight):
    return instantiateVariableFont(TTFont(io.BytesIO(_ttf_bytes())), {"wght": weight}, inplace=False)


def outline(text, weight=600, size=100, track=-2.5):
    """Returns (paths, advance, boxes): one SVG path per glyph, baseline at y=0, and for each
    glyph its ink box (x0, x1, y0, y1) in the same units (y grows downwards)."""
    font = hb.Font(hb.Face(hb.Blob(_ttf_bytes())))
    font.set_variations({"wght": weight})
    buf = hb.Buffer()
    buf.add_str(text)
    buf.guess_segment_properties()
    hb.shape(font, buf, {"kern": True})
    tt = _instance(weight)
    glyphs = tt.getGlyphSet()
    upm = tt["head"].unitsPerEm
    sc = size / upm
    order = tt.getGlyphOrder()
    x = 0
    paths, boxes = [], []
    for info, pos in zip(buf.glyph_infos, buf.glyph_positions):
        name = order[info.codepoint]
        X = (x + pos.x_offset) * sc
        pen = SVGPathPen(glyphs)
        glyphs[name].draw(TransformPen(pen, (sc, 0, 0, -sc, X, 0)))
        paths.append(pen.getCommands())
        bp = BoundsPen(glyphs)
        glyphs[name].draw(bp)
        b = bp.bounds or (0, 0, 0, 0)
        boxes.append((X + b[0] * sc, X + b[2] * sc, -b[3] * sc, -b[1] * sc))
        x += pos.x_advance + track * upm / size
    return paths, x * sc, boxes
