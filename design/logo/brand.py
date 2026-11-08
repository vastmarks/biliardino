"""Final biliarDino logo system (front-facing baby dino, option A)."""
import front, mark, word
K=0.78; STYLE="dot"
TH={"light":dict(head="#1597D3",ring="#0B6896",fill="#FFFFFF",eye="#0F1E2C",muzzle="#B2E6FA",spike="#0B6896",c1="#1597D3",c2="#0B6896",bg="#FFFFFF"),
    "dark":dict(head="#7FD3F5",ring="#0A1621",fill="#D6F1FC",eye="#0A1621",muzzle="#D6F1FC",spike="#45BAEC",c1="#7FD3F5",c2="#D6F1FC",bg="#0A1621"),
    "mono":dict(head="#0F1E2C",ring="#0F1E2C",fill="#FFFFFF",eye=None,muzzle=None,spike=None,c1="#0F1E2C",c2="#0F1E2C",bg="#FFFFFF"),
    "reverse":dict(head="#FFFFFF",ring="#FFFFFF",fill="#0A78AD",eye=None,muzzle=None,spike=None,c1="#FFFFFF",c2="#FFFFFF",bg="#0A78AD"),
    "icon":dict(head="#FFFFFF",ring="#0B6896",fill="#FFFFFF",eye="#0F1E2C",muzzle="#D6F1FC",spike="#0A2A3D",bg="#0A78AD"),
    "icon-night":dict(head="#7FD3F5",ring="#0A1621",fill="#D6F1FC",eye="#0A1621",muzzle="#D6F1FC",spike="#45BAEC",bg="#0A1621")}
def marksvg(th, small=False, uid=""):
    t=TH[th]
    return front.svg(t["head"],t["ring"],t["fill"],t["eye"],muzzle=t["muzzle"],small=small,uid=uid,spike=t["spike"],k=K,eyes_style=STYLE)
def body(s): return s[s.index('<defs>'):s.rindex('</svg>')]
def group(th, x, y, h, uid):
    return f'<g transform="translate({x:.2f} {y:.2f}) scale({h/96:.4f})">{body(marksvg(th,uid=uid))}</g>'
def horizontal(th, size=100):
    t=TH[th]; d1,d2,W,_=word.wordmark("Outfit",400,600,size,track=-1.0)
    mh=size*1.30; gap=size*0.10; tx=mh*0.84+gap; base=mh*0.93; w=tx+W+4; h=mh+size*0.06
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w:.1f} {h:.1f}">{group(th,-mh*0.12,0,mh,"h"+th)}<g transform="translate({tx:.2f} {base:.2f})"><path d="{d1}" fill="{t["c1"]}"></path><path d="{d2}" fill="{t["c2"]}"></path></g></svg>'
def stacked(th, size=100):
    t=TH[th]; d1,d2,W,_=word.wordmark("Outfit",400,600,size,track=-1.0)
    mh=size*2.2; w=max(W,mh)+8; h=mh+size*1.20
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w:.1f} {h:.1f}">{group(th,(w-mh)/2,-mh*0.06,mh,"s"+th)}<g transform="translate({(w-W)/2:.2f} {mh+size*0.90:.2f})"><path d="{d1}" fill="{t["c1"]}"></path><path d="{d2}" fill="{t["c2"]}"></path></g></svg>'
def icon(th="icon", small=False, rounded=True, pad=None):
    t=TH[th]; pad=pad if pad is not None else (6 if small else 11)
    sc=(96-2*pad)/96; dy=pad-6*sc   # lift: the mark's empty top band is ~12 units
    rect=f'<rect width="96" height="96" rx="21" fill="{t["bg"]}"></rect>' if rounded else f'<rect width="96" height="96" fill="{t["bg"]}"></rect>'
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96">{rect}<g transform="translate({pad} {dy:.2f}) scale({sc:.4f})">{body(marksvg(th,small=small,uid="i"))}</g></svg>'
def construction():
    S=6; M=40; W=96*S+2*M+330; H=96*S+2*M
    g=[f'<rect width="{W}" height="{H}" fill="#FFFFFF"></rect>']
    for i in range(0,97,8):
        g.append(f'<line x1="{M+i*S}" y1="{M}" x2="{M+i*S}" y2="{M+96*S}" stroke="#DCE7EF" stroke-width="1"></line><line x1="{M}" y1="{M+i*S}" x2="{M+96*S}" y2="{M+i*S}" stroke="#DCE7EF" stroke-width="1"></line>')
    m=front.svg("#7FD3F5","#45BAEC","#FFFFFF","#0F1E2C",muzzle="#D6F1FC",spike="#45BAEC",uid="c",k=K,eyes_style=STYLE)
    g.append(f'<g transform="translate({M} {M}) scale({S})" opacity="0.6">{body(m)}</g>')
    P=lambda x,y:(M+x*S,M+y*S)
    cx,cy=P(48,63); g.append(f'<circle cx="{cx}" cy="{cy}" r="{30*S}" fill="none" stroke="#0B6896" stroke-width="1.5" stroke-dasharray="6 5"></circle>')
    x1,y1=P(0,58); x2,_=P(96,58); g.append(f'<line x1="{x1}" y1="{y1}" x2="{x2}" y2="{y1}" stroke="#F2A20C" stroke-width="1.5" stroke-dasharray="6 5"></line>')
    a,b=P(48,0); c,d=P(48,96); g.append(f'<line x1="{a}" y1="{b}" x2="{c}" y2="{d}" stroke="#0B6896" stroke-width="1" stroke-dasharray="2 4"></line>')
    T=lambda x,y:(48+(x-48)*K, 57+(y-57)*K)
    for ex in (38.6,57.4):
        X,Y=P(*T(ex,32.2)); g.append(f'<circle cx="{X}" cy="{Y}" r="{4.1*K*S}" fill="none" stroke="#F2A20C" stroke-width="1.5"></circle>')
    x0,y0=P(*T(22.5,9)); x1_,y1_=P(*T(73.5,57)); g.append(f'<rect x="{x0}" y="{y0}" width="{x1_-x0}" height="{y1_-y0}" fill="none" stroke="#0B6896" stroke-width="1" stroke-dasharray="2 4"></rect>')
    tx=M+96*S+30; y=M+20
    rows=[("Shell","circle ⌀ 60 units, centre (48, 63)"),("Crack","3 teeth, 8 units high, baseline 58"),("Football","centre pentagon + 5 seams to rim pentagons"),
          ("Head","dome 51 × 48 at 78 %, symmetric on the centre line"),("Eyes","solid ⌀ 6.4, one highlight, set low and wide"),("Snout","wide, lighter, two nostrils and a small smile"),
          ("Spikes","three, clustered on top, deeper celeste"),("Paws","two ovals gripping the rim"),("Cut","2.6-unit gap between head, paws and shell"),("Grid","96 × 96 units, 8-unit guides")]
    for k_,v in rows:
        g.append(f'<text x="{tx}" y="{y}" font-family="system-ui, -apple-system, Segoe UI, sans-serif" font-size="15" font-weight="700" fill="#0F1E2C">{k_}</text><text x="{tx}" y="{y+20}" font-family="system-ui, -apple-system, Segoe UI, sans-serif" font-size="14" fill="#52667A">{v}</text>'); y+=54
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}">{"".join(g)}</svg>'
if __name__=="__main__":
    import os, sys
    out=sys.argv[1] if len(sys.argv)>1 else os.path.join(os.path.dirname(os.path.abspath(__file__)),"out")
    os.makedirs(out,exist_ok=True)
    F={}
    for th in ("light","dark","mono","reverse"): F[f"logo-{th}"]=horizontal(th)
    for th in ("light","dark"): F[f"logo-stacked-{th}"]=stacked(th); F[f"mark-{th}"]=marksvg(th); F[f"mark-small-{th}"]=marksvg(th,small=True)
    F["app-icon"]=icon(); F["app-icon-small"]=icon(small=True); F["app-icon-square"]=icon(rounded=False); F["app-icon-maskable"]=icon(rounded=False,pad=19)
    F["app-icon-night"]=icon("icon-night"); F["construction"]=construction()
    for k,v in F.items(): open(os.path.join(out,k+".svg"),"w").write(v)
    print(f"{len(F)} files in {out}")
