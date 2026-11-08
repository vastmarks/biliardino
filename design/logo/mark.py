import math
def pent(cx,cy,r,rot=-90):
    return " ".join(f"{cx+r*math.cos(math.radians(rot+72*i)):.2f},{cy+r*math.sin(math.radians(rot+72*i)):.2f}" for i in range(5))
# geometry on a 96 grid
CX, CY, R = 48, 63, 30          # ball
CRACK_Y, TOOTH = 58, 8          # crack baseline and tooth height
N = 3                           # teeth
GAP = 2.6                       # cut between head and shell
def crack_pts():
    x0 = CX - math.sqrt(R*R - (CRACK_Y-CY)**2); x1 = 2*CX - x0
    pts=[]; w=(x1-x0)/(2*N)
    for i in range(2*N+1):
        pts.append((x0+i*w, CRACK_Y - (TOOTH if i%2 else 0)))
    return pts
def shell_path():
    pts=crack_pts(); x0,y0=pts[0]; x1,y1=pts[-1]
    d=f"M{x0:.2f} {y0:.2f} " + " ".join(f"L{x:.2f} {y:.2f}" for x,y in pts[1:])
    d+=f" A{R} {R} 0 1 1 {x0:.2f} {y0:.2f} Z"
    return d
def head_shapes():
    # neck + skull + snout, facing right
    return [('path', dict(d="M31 72 L31 47.5 L24 44 L31.2 39.6 L25.2 34.8 L32.4 31.4 L27.8 25.8 L34.8 23.8 C37 17.6 43.2 14 51 14 L67 14 C75 14 80 19 80 26 C80 33 75 37 67 37 L58 37 C54 37 52 39.5 52 43.5 L52 72 Z", stroke="white", **{"stroke-width":"1.4", "stroke-linejoin":"round"}))]
def spikes():
    return ["M33 21 L25.5 24 L32 28.5 Z", "M31.5 31.5 L24 34.5 L31.5 39 Z", "M31.5 42 L24 45 L31.5 49.5 Z"]
def svg(head="#1597D3", shell="#0B6896", bg=None, size=96, show_spikes=False, eye_r=3.4, pent_r=8.5):
    els=[]
    for kind,a in head_shapes():
        attrs=" ".join(f'{k}="{v}"' for k,v in a.items()); els.append(f'<{kind} {attrs} fill="white"></{kind}>')
    if show_spikes:
        for d in spikes(): els.append(f'<path d="{d}" fill="white" stroke="white" stroke-width="1.6" stroke-linejoin="round"></path>')
    crack=" ".join(f"{x:.2f},{y:.2f}" for x,y in crack_pts())
    headmask=(f'<mask id="mh" maskUnits="userSpaceOnUse" x="0" y="0" width="96" height="96">'+"".join(els)+
        f'<path d="{shell_path()}" fill="black"></path><polyline points="{crack}" fill="none" stroke="black" stroke-width="{2*GAP}" stroke-linejoin="miter"></polyline>'
        f'<circle cx="62" cy="24.5" r="{eye_r}" fill="black"></circle></mask>')
    shellmask=(f'<mask id="ms" maskUnits="userSpaceOnUse" x="0" y="0" width="96" height="96"><path d="{shell_path()}" fill="white"></path>'
        f'<polygon points="{pent(CX, CY+11, pent_r)}" fill="black" stroke="black" stroke-width="1.5" stroke-linejoin="round"></polygon></mask>')
    bgr=f'<rect width="96" height="96" fill="{bg}"></rect>' if bg else ""
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96" width="{size}" height="{size}"><defs>{headmask}{shellmask}</defs>{bgr}'
            f'<rect width="96" height="96" fill="{head}" mask="url(#mh)"></rect><rect width="96" height="96" fill="{shell}" mask="url(#ms)"></rect></svg>')
