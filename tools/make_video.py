from PIL import Image, ImageDraw, ImageFont, ImageFilter, ImageEnhance
import subprocess, imageio_ffmpeg, os, math, random

FF = imageio_ffmpeg.get_ffmpeg_exe()
IMG = "/home/user/benincine/assets/img"
OUT = "/home/user/benincine/assets/video"
os.makedirs(OUT, exist_ok=True)
W,H,FPS = 1280,720,24
F_BOLD = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
F_REG  = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"
random.seed(7)

# --- noise tiles for film grain ---
tiles=[]
for i in range(6):
    n = Image.effect_noise((W//2,H//2), random.randint(18,26)).convert("L").resize((W,H), Image.NEAREST)
    tiles.append(n)

def grain(im, amt=0.055, i=0):
    g = tiles[i % len(tiles)]
    return Image.blend(im, Image.merge("RGB",(g,g,g)), amt)

def cover(path, w=W, h=H, zoom=1.0, cx=0.5, cy=0.45):
    im = Image.open(path).convert("RGB")
    sr, tr = im.width/im.height, w/h
    if sr > tr: nh = im.height; nw = int(nh*tr)
    else:       nw = im.width;  nh = int(nw/tr)
    x = int((im.width-nw)*cx); y = int((im.height-nh)*cy)
    im = im.crop((x,y,x+nw,y+nh))
    if zoom != 1.0:
        zw, zh = int(nw/zoom), int(nh/zoom)
        im = im.crop(((nw-zw)//2, (nh-zh)//2, (nw-zw)//2+zw, (nh-zh)//2+zh))
    return im.resize((w,h), Image.LANCZOS)

def tracked(draw, xy, text, font, fill, tracking=0, anchor=None):
    x,y = xy
    total = sum(draw.textlength(c, font=font)+tracking for c in text) - tracking
    if anchor == "center": x -= total/2
    for c in text:
        draw.text((x,y), c, font=font, fill=fill)
        x += draw.textlength(c, font=font)+tracking
    return total

def vignette(im, strength=0.55):
    v = Image.new("L",(W,H),0); d=ImageDraw.Draw(v)
    d.ellipse((-W*0.25,-H*0.35,W*1.25,H*1.35), fill=255)
    v = v.filter(ImageFilter.GaussianBlur(180))
    v = ImageEnhance.Contrast(v).enhance(1.0)
    black = Image.new("RGB",(W,H),(0,0,0))
    return Image.composite(im, Image.blend(im, black, strength), v)

def grade(im, warm=1.06, contrast=1.12, sat=1.1):
    im = ImageEnhance.Color(im).enhance(sat)
    im = ImageEnhance.Contrast(im).enhance(contrast)
    r,g,b = im.split()
    r = r.point(lambda v: min(255, int(v*warm)))
    b = b.point(lambda v: int(v*(1-(warm-1)*0.7)))
    return Image.merge("RGB",(r,g,b))

def fade(frames, a, b, n=12):
    for i in range(n):
        t=i/n; frames.append(Image.blend(a,b,t))

def encode(frames, out, fps=FPS, crf=24):
    p = subprocess.Popen([FF,"-y","-f","rawvideo","-pix_fmt","rgb24","-s",f"{W}x{H}","-r",str(fps),
        "-i","-","-c:v","libx264","-preset","medium","-crf",str(crf),"-pix_fmt","yuv420p",
        "-movflags","+faststart","-loglevel","error", out], stdin=subprocess.PIPE)
    for i,f in enumerate(frames):
        p.stdin.write(grain(f, 0.05, i).tobytes())
    p.stdin.close(); p.wait()
    print(out, os.path.getsize(out)//1024, "KB", len(frames), "frames", round(len(frames)/fps,1),"s")

# =================  TRAILER  =================
frames=[]
f_xbig = ImageFont.truetype(F_BOLD, 96)
f_big  = ImageFont.truetype(F_BOLD, 68)
f_mid  = ImageFont.truetype(F_BOLD, 38)
f_sm   = ImageFont.truetype(F_REG, 26)
f_mono = ImageFont.truetype(F_REG, 22)

def black(): return Image.new("RGB",(W,H),(6,6,8))
def txt_frame(draw_fn, bg=None):
    im = (bg.copy() if bg else black())
    d = ImageDraw.Draw(im)
    draw_fn(d, im)
    return im

# 0) intro logo  (2.2s)
for i in range(52):
    t=i/52
    im = black(); d=ImageDraw.Draw(im)
    a = int(255*min(1,t*3))
    gold=(232,179,58)
    tracked(d,(W/2,H/2-30),"BÉNIN CINÉ",f_xbig,(a, int(a*0.77), int(a*0.22)),tracking=8,anchor="center")
    if i>20:
        a2=int(200*min(1,(i-20)/24))
        tracked(d,(W/2,H/2+70),"MAISON DE PRODUCTION & DIFFUSION",f_mono,(a2,a2,a2),tracking=4,anchor="center")
    frames.append(im)

# 1) rooftop scene (5s)
src = cover(f"{IMG}/b-cotonou229.jpg", zoom=1.0)
for i in range(120):
    t=i/120
    z = 1.0 + 0.10*t
    im = cover(f"{IMG}/b-cotonou229.jpg", zoom=z)
    im = grade(im); im = vignette(im,0.5)
    d=ImageDraw.Draw(im)
    grad=Image.new("L",(W,H),0); gd=ImageDraw.Draw(grad)
    for y in range(H): gd.line([(0,y),(W,y)], fill=int(max(0,(y-H*0.42)/(H*0.58))*215))
    im=Image.composite(im, Image.blend(im, Image.new("RGB",(W,H),(8,8,10)),0.92), grad)
    d=ImageDraw.Draw(im)
    a=int(255*min(1,t*4))
    tracked(d,(90,H-215),"COTONOU",f_big,(a,int(a*0.77),int(a*0.22)),tracking=10)
    tracked(d,(90,H-135),"229",f_big,(a,int(a*0.77),int(a*0.22)),tracking=10)
    if i>28:
        a2=int(230*min(1,(i-28)/30))
        tracked(d,(92,H-78),"UNE SÉRIE ORIGINALE BÉNIN CINÉ",f_sm,(a2,a2,a2),tracking=3)
    frames.append(im)

# 2) zémidjan cut (2.6s) with hard cut + flash
src2 = cover(f"{IMG}/p-zemidjan.jpg", zoom=1.0, cy=0.4)
for i in range(62):
    t=i/62
    im = cover(f"{IMG}/p-zemidjan.jpg", zoom=1.12-0.10*t, cy=0.4)
    im = grade(im, warm=1.02, contrast=1.15); im = vignette(im,0.55)
    d=ImageDraw.Draw(im)
    if i<3: im = Image.blend(Image.new("RGB",(W,H),(250,240,220)), im, i/3)
    a=int(255*min(1,(t)*3))
    tracked(d,(80,H-120),"12 ÉPISODES  ·  45 MIN",f_mid,(a,int(a*0.77),int(a*0.22)),tracking=6)
    frames.append(im)

# 3) heritage shot (2.8s)
for i in range(68):
    t=i/68
    im = cover(f"{IMG}/b-heritage.jpg", zoom=1.0+0.09*t)
    im = grade(im, warm=1.1, contrast=1.1); im = vignette(im,0.5)
    d=ImageDraw.Draw(im)
    a=int(255*min(1,t*3))
    tracked(d,(W/2,H-140),"BIENTÔT",f_big,(a,int(a*0.77),int(a*0.22)),tracking=14,anchor="center")
    a2=int(220*min(1,max(0,(t-0.2))*3))
    tracked(d,(W/2,H-62),"SUR BÉNIN CINÉ",f_sm,(a2,a2,a2),tracking=5,anchor="center")
    frames.append(im)

# 4) outro
last = frames[-1]
for i in range(60):
    t=i/60
    im = black(); d=ImageDraw.Draw(im)
    a=int(255*min(1,t*2.2))
    tracked(d,(W/2,H/2-24),"BÉNIN CINÉ",f_big,(a,int(a*0.77),int(a*0.22)),tracking=10,anchor="center")
    a2=int(190*min(1,max(0,t-0.35)*2.6))
    tracked(d,(W/2,H/2+58),"benincine.bj",f_mono,(a2,a2,a2),tracking=6,anchor="center")
    frames.append(Image.blend(last, im, min(1,t*3)) if i<10 else im)

encode(frames, f"{OUT}/trailer-cotonou229.mp4", crf=24)

# =================  HERO LOOP (muted bg) =================
frames=[]
src = f"{IMG}/hero.jpg"
for i in range(192):  # 8s
    t=i/192
    z = 1.0 + 0.08*math.sin(t*math.pi)
    im = cover(src, zoom=z, cy=0.5)
    im = grade(im, warm=1.05, contrast=1.1, sat=1.12)
    im = vignette(im, 0.35)
    d=ImageDraw.Draw(im)
    grad=Image.new("L",(W,H),0); gd=ImageDraw.Draw(grad)
    for y in range(H):
        v = 0
        if y > H*0.55: v = int(((y-H*0.55)/(H*0.45))**1.6*235)
        if y < H*0.30: v = max(v, int(((H*0.30-y)/(H*0.30))*140))
        gd.line([(0,y),(W,y)], fill=v)
    im = Image.composite(im, Image.blend(im, Image.new("RGB",(W,H),(6,7,10)),0.95), grad)
    frames.append(im)
# loop back smoothly: reverse-append for ping-pong loop
frames = frames + frames[::-1][1:-1]
encode(frames, f"{OUT}/hero-loop.mp4", crf=27)
