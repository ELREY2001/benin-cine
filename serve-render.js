/* Petit serveur statique, utilisé uniquement si vous déployez le site
   comme « Web Service » sur Render (ou sur un autre hébergeur Node).
   Il gère les requêtes Range, indispensables pour naviguer dans une vidéo. */
const http = require("http");
const fs = require("fs");
const path = require("path");

const ROOT = __dirname;
const PORT = process.env.PORT || 3000;
const TYPES = {
  ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8", ".json": "application/json; charset=utf-8",
  ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp",
  ".svg": "image/svg+xml", ".ico": "image/x-icon", ".mp4": "video/mp4",
  ".webm": "video/webm", ".vtt": "text/vtt; charset=utf-8", ".woff2": "font/woff2",
  ".txt": "text/plain; charset=utf-8", ".xml": "application/xml; charset=utf-8",
  ".webmanifest": "application/manifest+json",
};

http.createServer((req, res) => {
  const url = decodeURIComponent(req.url.split("?")[0].split("#")[0]);
  let file = path.join(ROOT, url === "/" ? "index.html" : url);
  if (!path.resolve(file).startsWith(ROOT)) { res.writeHead(403).end("Interdit"); return; }

  fs.stat(file, (err, st) => {
    if (err || !st.isFile() || st.isDirectory()) {
      const nf = path.join(ROOT, "404.html");
      fs.readFile(nf, (e2, d) => {
        res.writeHead(404, { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" });
        res.end(d || "Page introuvable");
      });
      return;
    }
    const type = TYPES[path.extname(file).toLowerCase()] || "application/octet-stream";
    const head = { "Content-Type": type, "Accept-Ranges": "bytes", "Cache-Control": "no-store" };
    const range = req.headers.range;

    if (range) {
      const m = /^bytes=(\d*)-(\d*)$/.exec(range.trim());
      if (m) {
        const start = m[1] ? parseInt(m[1], 10) : 0;
        let end = m[2] ? parseInt(m[2], 10) : st.size - 1;
        if (end >= st.size) end = st.size - 1;
        if (isNaN(start) || start > end || start >= st.size) {
          res.writeHead(416, { "Content-Range": "bytes */" + st.size });
          res.end();
          return;
        }
        head["Content-Range"] = "bytes " + start + "-" + end + "/" + st.size;
        head["Content-Length"] = end - start + 1;
        res.writeHead(206, head);
        fs.createReadStream(file, { start, end }).pipe(res);
        return;
      }
    }
    head["Content-Length"] = st.size;
    res.writeHead(200, head);
    fs.createReadStream(file).pipe(res);
  });
}).listen(PORT, "0.0.0.0", () => console.log("Bénin Ciné sur le port " + PORT));
