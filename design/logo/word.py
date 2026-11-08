import uharfbuzz as hb
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
import functools
import os
_HERE=os.path.dirname(os.path.abspath(__file__))
# Outfit variable font, from https://github.com/google/fonts/tree/main/ofl/outfit (see README.md)
FONTS={"Outfit":os.path.join(_HERE,"fonts","Outfit[wght].ttf")}
@functools.lru_cache(None)
def inst(name, w):
    f=TTFont(FONTS[name]); return instantiateVariableFont(f, {"wght":w}, inplace=False)
def run(name, w, text, x0, size, track=0):
    """returns (svg path d, advance) for text at weight w, font units scaled to size px, baseline y=0"""
    path=FONTS[name]; blob=hb.Blob.from_file_path(path); face=hb.Face(blob); font=hb.Font(face)
    font.set_variations({"wght":w}); buf=hb.Buffer(); buf.add_str(text); buf.guess_segment_properties()
    hb.shape(font, buf, {"kern":True,"liga":True})
    tt=inst(name,w); gs=tt.getGlyphSet(); upm=tt["head"].unitsPerEm; sc=size/upm
    order=tt.getGlyphOrder(); x=0; ds=[]
    for info,pos in zip(buf.glyph_infos, buf.glyph_positions):
        g=order[info.codepoint]; pen=SVGPathPen(gs)
        tp=TransformPen(pen,(sc,0,0,-sc,x0+(x+pos.x_offset)*sc, -pos.y_offset*sc))
        gs[g].draw(tp); ds.append(pen.getCommands()); x+=pos.x_advance+track*upm/size
    return " ".join(ds), x*sc
def metrics(name):
    tt=inst(name,500); os2=tt["OS/2"]; upm=tt["head"].unitsPerEm
    return os2.sxHeight/upm, os2.sCapHeight/upm
def wordmark(name, w1=500, w2=700, size=100, c1="#1597D3", c2="#0B6896", track=-1.5, gap=0):
    d1,a1=run(name,w1,"biliar",0,size,track); d2,a2=run(name,w2,"Dino",a1+gap,size,track)
    xh,cap=metrics(name); asc=size*0.78
    W=a1+gap+a2
    return d1,d2,W,asc
