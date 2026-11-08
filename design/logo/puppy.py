import math, mark, ball
GAP=2.6
def shell_path(): return mark.shell_path()
def crack(): return " ".join(f"{x:.2f},{y:.2f}" for x,y in mark.crack_pts())
P=dict(hx=47, hy=30, hr=19,            # cranium circle
       mx=47, my=27, mw=31, mh=19, mrx=9.5,   # muzzle rect (x,y,w,h)
       nx=36, nw=22, ny=38,             # neck
       ex=57, ey=27, er=4.6,            # eye
       paws=[(31.5,51),(63.5,51)], pr=(5.6,4.3),
       bumps=[(30.4,33.5,3.9),(29.6,24.2,3.5),(33.6,15.4,3.1)])
def head_white(p):
    els=[f'<circle cx="{p["hx"]}" cy="{p["hy"]}" r="{p["hr"]}" fill="white"></circle>',
         f'<rect x="{p["mx"]}" y="{p["my"]}" width="{p["mw"]}" height="{p["mh"]}" rx="{p["mrx"]}" fill="white"></rect>',
         f'<rect x="{p["nx"]}" y="{p["ny"]}" width="{p["nw"]}" height="34" fill="white"></rect>']
    for x,y,r in p["bumps"]: els.append(f'<circle cx="{x}" cy="{y}" r="{r}" fill="white"></circle>')
    return "".join(els)
def svg(head, ring, fill, eye, cheek=None, bg=None, small=False, uid="", p=P):
    q=dict(p)
    pr=q["pr"]
    paws="".join(f'<ellipse cx="{x}" cy="{y}" rx="{pr[0]}" ry="{pr[1]}" fill="white"></ellipse>' for x,y in q["paws"])
    PG=q.get("pawgap",1.7)
    pawgap="".join(f'<ellipse cx="{x}" cy="{y}" rx="{pr[0]+PG}" ry="{pr[1]+PG}" fill="black"></ellipse>' for x,y in q["paws"])
    toes="" if small else "".join(f'<path d="M{x-1.6} {y+pr[1]-2.6} v2.4 M{x+1.6} {y+pr[1]-2.6} v2.4" stroke="black" stroke-width="1.1" stroke-linecap="round"></path>' for x,y in q["paws"])
    smile=f'<path d="M{q["mx"]+q["mw"]-12} {q["my"]+q["mh"]-6.5} q4 3.2 8 -0.6" fill="none" stroke="black" stroke-width="2" stroke-linecap="round"></path>'
    eyehole = '' if eye else f'<circle cx="{q["ex"]}" cy="{q["ey"]}" r="{q["er"]}" fill="black"></circle>'
    mh=(f'<mask id="mh{uid}" maskUnits="userSpaceOnUse" x="0" y="0" width="96" height="96">{head_white(q)}'
        f'<path d="{shell_path()}" fill="black"></path><polyline points="{crack()}" fill="none" stroke="black" stroke-width="{2*GAP}"></polyline>'
        f'{pawgap}{paws}{toes}{eyehole}{"" if small else smile}</mask>')
    # shell: cut around paws
    ms=(f'<mask id="ms{uid}" maskUnits="userSpaceOnUse" x="0" y="0" width="96" height="96"><rect width="96" height="96" fill="white"></rect>{pawgap}</mask>')
    sw=4.6 if small else 3.2
    pat=(ball.pattern(ring, cy=74, rp=9, d=25, ro=9.5, seams=False) if small else ball.pattern(ring, cy=74, rp=7.6, d=22.5, ro=8.2, seam=1.7))
    shell=(f'<g mask="url(#ms{uid})"><path d="{shell_path()}" fill="{fill}"></path><g clip-path="url(#cb{uid})">{pat}</g>'
           f'<path d="{shell_path()}" fill="none" stroke="{ring}" stroke-width="{sw}" stroke-linejoin="round"></path></g>')
    eyes=''
    if eye:
        er=q["er"]+(0.6 if small else 0)
        eyes=(f'<circle cx="{q["ex"]}" cy="{q["ey"]}" r="{er}" fill="{eye}"></circle>'
              + ('' if small else f'<circle cx="{q["ex"]+1.5}" cy="{q["ey"]-1.7}" r="1.5" fill="#FFFFFF"></circle>'))
    blush=f'<ellipse cx="{q["ex"]+4.5}" cy="{q["ey"]+8.5}" rx="3.4" ry="2.3" fill="{cheek}" opacity="0.9"></ellipse>' if (cheek and not small) else ''
    bgr=f'<rect width="96" height="96" fill="{bg}"></rect>' if bg else ''
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96"><defs>{mh}{ms}<clipPath id="cb{uid}"><path d="{shell_path()}"></path></clipPath></defs>{bgr}'
            f'<rect width="96" height="96" fill="{head}" mask="url(#mh{uid})"></rect>{shell}{eyes}{blush}</svg>')
