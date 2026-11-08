import mark, ball, puppy
GAP=2.6
def headpath():
    # wide dome with full cheeks: wider than tall, flat-ish bottom hidden by the shell
    return "M48 9 C63.5 9 73.5 19.5 73.5 34 C73.5 41 72.5 47 70.5 52 L70.5 66 L25.5 66 L25.5 52 C23.5 47 22.5 41 22.5 34 C22.5 19.5 32.5 9 48 9 Z"
def crest():
    # three spikes on the midline, graded: small, big, small (front view of a dino's back plates)
    return ["M39.4 11.6 L39.6 4.6 L45.2 9.0 Z", "M44.4 9.6 L48.0 1.4 L51.6 9.6 Z", "M50.8 9.0 L56.4 4.6 L56.6 11.6 Z"]
def svg(head, ring, fill, eye, muzzle=None, bg=None, small=False, uid="", spike=None, k=1.0, eyes_style="manga"):
    T=f'transform="translate(48 57) scale({k}) translate(-48 -57)"'
    els=[f'<path d="{headpath()}" fill="white"></path>']
    if small:
        els.append('<path d="M44 11 L48.5 2.5 L53 11 Z" fill="white" stroke="white" stroke-width="3" stroke-linejoin="round"></path>')
    dx=17.6*k; paws=[(48-dx,53.4),(48+dx,53.4)]; pr=(5.2*k,4.0*k); PG=1.8
    pw="".join(f'<ellipse cx="{x}" cy="{y}" rx="{pr[0]}" ry="{pr[1]}" fill="white"></ellipse>' for x,y in paws)
    pg="".join(f'<ellipse cx="{x}" cy="{y}" rx="{pr[0]+PG}" ry="{pr[1]+PG}" fill="black"></ellipse>' for x,y in paws)
    E=[(37.4,31.2),(58.6,31.2)] if eyes_style=="manga" else [(38.6,31.6),(57.4,31.6)]; er=5.6 if not small else 6.2
    hr_=(4.1 if not small else 5.4) if eyes_style=="dot" else er
    holes='' if eye else "".join(f'<circle cx="{x}" cy="{y+(0.6 if eyes_style=="dot" else 0)}" r="{hr_}" fill="black"></circle>' for x,y in E)
    mouth='' if small else '<circle cx="44.6" cy="41.4" r="1.05" fill="black"></circle><circle cx="51.4" cy="41.4" r="1.05" fill="black"></circle><path d="M44.8 44.8 q3.2 2.8 6.4 0" fill="none" stroke="black" stroke-width="1.7" stroke-linecap="round"></path>'
    mh=(f'<mask id="mh{uid}" maskUnits="userSpaceOnUse" x="0" y="0" width="96" height="96"><g {T}>{"".join(els)}{holes}{mouth if not (muzzle and not small) else ""}</g>'
        f'<path d="{mark.shell_path()}" fill="black"></path><polyline points="{puppy.crack()}" fill="none" stroke="black" stroke-width="{2*GAP}"></polyline>'
        f'{pg}{pw}</mask>')
    ms=f'<mask id="ms{uid}" maskUnits="userSpaceOnUse" x="0" y="0" width="96" height="96"><rect width="96" height="96" fill="white"></rect>{pg}</mask>'
    sw=4.6 if small else 3.2
    pat=(ball.pattern(ring, cy=74, rp=9, d=25, ro=9.5, seams=False) if small else ball.pattern(ring, cy=74, rp=7.6, d=22.5, ro=8.2, seam=1.7))
    shell=(f'<g mask="url(#ms{uid})"><path d="{mark.shell_path()}" fill="{fill}"></path><g clip-path="url(#cb{uid})">{pat}</g>'
           f'<path d="{mark.shell_path()}" fill="none" stroke="{ring}" stroke-width="{sw}" stroke-linejoin="round"></path></g>')
    face=''
    if muzzle and not small:
        # lighter muzzle patch, clipped to the visible head, with the mouth on it
        face=(f'<g mask="url(#mh{uid})"><g {T}><rect x="34.5" y="37.6" width="27" height="13.4" rx="6.7" fill="{muzzle}"></rect></g></g><g {T}>'
              f'<circle cx="44.6" cy="41.4" r="1.05" fill="{eye}"></circle><circle cx="51.4" cy="41.4" r="1.05" fill="{eye}"></circle>'
              f'<path d="M44.8 44.8 q3.2 2.8 6.4 0" fill="none" stroke="{eye}" stroke-width="1.7" stroke-linecap="round"></path></g>')
    eyes=''
    if eye:
        for x,y in E:
            if eyes_style=="dot":
                r=4.1 if not small else 5.4
                eyes+=f'<circle cx="{x}" cy="{y+0.6}" r="{r}" fill="{eye}"></circle>'
                if not small: eyes+=f'<circle cx="{x+1.4}" cy="{y-0.8}" r="1.25" fill="#FFFFFF"></circle>'
            elif eyes_style=="bean":
                eyes+=f'<ellipse cx="{x}" cy="{y+0.8}" rx="{3.3 if not small else 4.4}" ry="{4.6 if not small else 5.6}" fill="{eye}"></ellipse>'
            else:
                eyes+=f'<circle cx="{x}" cy="{y}" r="{er}" fill="{eye}"></circle>'
                if not small: eyes+=f'<circle cx="{x+2.0}" cy="{y-2.1}" r="1.9" fill="#FFFFFF"></circle><circle cx="{x-1.9}" cy="{y+2.2}" r="0.85" fill="#FFFFFF"></circle>'
    crestsvg='' if small else "".join(f'<path d="{d}" fill="{spike or head}" stroke="{spike or head}" stroke-width="2.4" stroke-linejoin="round"></path>' for d in crest())
    bgr=f'<rect width="96" height="96" fill="{bg}"></rect>' if bg else ''
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96"><defs>{mh}{ms}<clipPath id="cb{uid}"><path d="{mark.shell_path()}"></path></clipPath></defs>{bgr}<g {T}>{crestsvg}</g>'
            f'<rect width="96" height="96" fill="{head}" mask="url(#mh{uid})"></rect>{face}{shell}<g {T}>{eyes}</g></svg>')
