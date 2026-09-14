from PIL import Image, ImageEnhance, ImageFilter
import os, glob

SRC = "/home/user/benincine/assets/img"
OUT = "/home/user/benincine/assets/img"
os.makedirs(OUT, exist_ok=True)

def save(im, path, q=84):
    im.save(path, "JPEG", quality=q, optimize=True, progressive=True)
    return os.path.getsize(path)//1024

def fit_cover(im, w, h):
    sr, tr = im.width/im.height, w/h
    if sr > tr:
        nw = int(im.height * tr); box = ((im.width-nw)//2, 0, (im.width-nw)//2+nw, im.height)
    else:
        nh = int(im.width / tr); box = (0, (im.height-nh)//3, im.width, (im.height-nh)//3+nh)
    return im.resize((512, int(512*(box[3]-box[1])/(box[2]-box[0]))), Image.LANCZOS, box=box).resize((w,h), Image.LANCZOS)

report = []
for f in sorted(glob.glob(os.path.join(SRC, "*.jpg"))):
    name = os.path.basename(f)
    if name.startswith(("p-", "b-", "hero-", "og")) and name != "hero-cotonou.jpg":
        continue
    with Image.open(f) as im0:
        im = im0.convert("RGB")
        base = name.replace(".jpg", "")
        if name.startswith("poster-"):
            slug = base.replace("poster-", "")
            # 2:3 poster
            p = fit_cover(im, 600, 900)
            p = ImageEnhance.Sharpness(p).enhance(1.15)
            s1 = save(p, f"{OUT}/p-{slug}.jpg", 84)
            # small card variant
            s2 = save(p.resize((400,600), Image.LANCZOS), f"{OUT}/p-{slug}@sm.jpg", 78)
            # 16:9 backdrop from poster (top-weighted crop, slight blur to hide upscale)
            b = fit_cover(im, 1280, 720)
            b = b.filter(ImageFilter.GaussianBlur(1.2))
            b = ImageEnhance.Color(b).enhance(1.08)
            s3 = save(b, f"{OUT}/b-{slug}.jpg", 80)
            report.append((f"p-{slug}.jpg", f"{s1}KB  sm:{s2}KB  b:{s3}KB", p.size))
        else:
            slug = base
            w = fit_cover(im, 1920, 1080).filter(ImageFilter.GaussianBlur(0.6))
            s = save(w, f"{OUT}/hero-{slug}-wide.jpg", 82)
            s0 = save(im.resize((1600,672), Image.LANCZOS), f"{OUT}/hero-{slug}.jpg", 84)
            report.append((f"hero-{slug}", f"{s}KB / {s0}KB", (1920,1080)))

for r in report: print(r)
