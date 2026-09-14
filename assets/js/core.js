/* ============================================================
   BÉNIN CINÉ, noyau (store, utilitaires, coquille, recherche)
   Tout est 100 %local : pas de dépendance externe, pas de réseau.
   ============================================================ */
(function () {
  "use strict";

  /* ---------------- Utilitaires ---------------- */
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const esc = (s) => String(s == null ? "" : s)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  const norm = (s) => String(s || "").toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ").trim();
  const uid = (p) => p + "-" + Math.random().toString(36).slice(2, 9);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const fmtTime = (s) => {
    s = Math.max(0, Math.floor(s || 0));
    const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), x = s % 60;
    return h ? `${h}:${String(m).padStart(2, "0")}:${String(x).padStart(2, "0")}`
             : `${m}:${String(x).padStart(2, "0")}`;
  };
  const fmtDur = (m) => {
    m = Math.max(0, Math.round(m || 0));
    return m >= 60 ? `${Math.floor(m / 60)} h ${String(m % 60).padStart(2, "0")}` : `${m} min`;
  };
  const fmtMoney = (n) => new Intl.NumberFormat("fr-FR").format(n) + " FCFA";
  const ago = (ts) => {
    const d = (Date.now() - ts) / 1000;
    if (d < 60) return "à l'instant";
    if (d < 3600) return "il y a " + Math.floor(d / 60) + " min";
    if (d < 86400) return "il y a " + Math.floor(d / 3600) + " h";
    if (d < 604800) return "il y a " + Math.floor(d / 86400) + " j";
    return new Date(ts).toLocaleDateString("fr-FR");
  };
  const debounce = (fn, ms) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };
  const qs = (k) => new URLSearchParams(location.search).get(k);
  const slug = (s) => norm(s).replace(/\s+/g, "-");

  /* ---------------- Store persistant ---------------- */
  const NS = "bc:";
  const store = {
    get(k, d) {
      try { const v = localStorage.getItem(NS + k); return v == null ? d : JSON.parse(v); }
      catch (e) { return d; }
    },
    set(k, v) { try { localStorage.setItem(NS + k, JSON.stringify(v)); } catch (e) { toast("Erreur", "Stockage local plein.", "err"); } },
    del(k) { localStorage.removeItem(NS + k); },
    clearAll() { Object.keys(localStorage).filter(k => k.startsWith(NS)).forEach(k => localStorage.removeItem(k)); }
  };

  const DEFAULT_SETTINGS = {
    quality: "auto", subtitles: "fr", audio: "fr", autoplayNext: true, autoplayPreview: true,
    dataSaver: false, downloadWifiOnly: true, parental: false, pin: "", language: "fr",
    reduceMotion: false
  };
  const DEFAULT_PROFILES = [
    { id: "p1", name: "Kofi", avatar: 0, kids: false },
    { id: "p2", name: "Ayaba", avatar: 1, kids: false },
    { id: "p3", name: "Sènou", avatar: 2, kids: false },
    { id: "p4", name: "Enfants", avatar: 3, kids: true }
  ];

  const S = {
    settings: Object.assign({}, DEFAULT_SETTINGS, store.get("settings", {})),
    profiles: store.get("profiles", DEFAULT_PROFILES),
    profile: store.get("profile", "p1"),
    user: store.get("user", null),
    plan: store.get("plan", null),
    progress: store.get("progress", {}),
    list: store.get("list", []),
    likes: store.get("likes", {}),
    downloads: store.get("downloads", []),
    titles: store.get("titles", []),        // contenus réels ajoutés via le back-office
    submissions: store.get("submissions", []),
    partners: store.get("partners", []),
    messages: store.get("messages", []),
    events: store.get("events", []),
    activity: store.get("activity", []),
    showDemo: store.get("showDemo", true),
    save(key) { store.set(key, this[key]); this.emit(key); },
    listeners: {},
    on(k, fn) { (this.listeners[k] = this.listeners[k] || []).push(fn); },
    emit(k) { (this.listeners[k] || []).forEach(f => { try { f(); } catch (e) {} }); (this.listeners["*"] || []).forEach(f => { try { f(k); } catch (e) {} }); }
  };
  const profile = () => S.profiles.find(p => p.id === S.profile) || S.profiles[0];
  const isKids = () => !!(profile() && profile().kids);

  /* ---------------- Données du catalogue ---------------- */
  // Schéma d'un titre (ce que le back-office produit) :
  // { id, title, type, year, duration, genres[], languages[], subtitles[], maturity,
  //   synopsis, poster, backdrop, video, collection, status, featured, demo }
  const TYPE_ACCENT = {
    film: "#F2A71A", serie: "#E0131F", documentaire: "#0E8A4C",
    court: "#7A6BFF", jeunesse: "#3DBE8B", spectacle: "#FF8A3D"
  };
  const TYPE_LABEL = {
    film: "Film", serie: "Série", documentaire: "Documentaire",
    court: "Court métrage", jeunesse: "Jeunesse", spectacle: "Spectacle"
  };

  /* Génère une affiche provisoire habillée aux couleurs de la marque.
     Aucune image "inventée" : c'est un emplacement typographique assumé. */
  function placeholder(t, opts) {
    opts = opts || {};
    const w = opts.w || 300, h = opts.h || 450;
    const accent = TYPE_ACCENT[t.type] || "#F2A71A";
    const label = (TYPE_LABEL[t.type] || "Titre").toUpperCase();
    const num = String(t.slot || 1).padStart(2, "0");
    const title = (t.title || "Titre à programmer").toUpperCase();
    const words = []; let line = "";
    title.split(" ").forEach(w2 => {
      if ((line + " " + w2).trim().length > 13) { words.push(line.trim()); line = w2; }
      else line += " " + w2;
    });
    if (line.trim()) words.push(line.trim());
    words.splice(4);
    const ly = h / 2 - (words.length - 1) * 15;
    const lines = words.map((w2, i) =>
      `<text x="${w / 2}" y="${ly + i * 30}" text-anchor="middle" font-family="Inter,Helvetica,Arial,sans-serif"
        font-size="21" font-weight="800" letter-spacing="0.5" fill="rgba(255,255,255,.92)">${esc(w2)}</text>`).join("");
    const svg =
`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}">
<defs>
<linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#15161C"/><stop offset="1" stop-color="#08080B"/></linearGradient>
<radialGradient id="gl" cx="50%" cy="34%" r="62%"><stop offset="0" stop-color="${accent}" stop-opacity=".30"/><stop offset="1" stop-color="${accent}" stop-opacity="0"/></radialGradient>
<linearGradient id="bt" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".65"/></linearGradient>
<filter id="n"><feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" stitchTiles="stitch"/><feColorMatrix type="saturate" values="0"/></filter>
</defs>
<rect width="${w}" height="${h}" fill="url(#g)"/>
<rect width="${w}" height="${h}" fill="url(#gl)"/>
<rect x="${w * .05}" y="${h * .033}" width="${w * .9}" height="${h * .934}" fill="none" stroke="${accent}" stroke-opacity=".38" stroke-width="1"/>
<rect x="${w * .075}" y="${h * .045}" width="${w * .85}" height="${h * .91}" fill="none" stroke="${accent}" stroke-opacity=".13" stroke-width="1"/>
<text x="${w / 2}" y="${h * .30}" text-anchor="middle" font-family="Inter,Helvetica,Arial,sans-serif" font-size="${h * .22}" font-weight="900"
 fill="none" stroke="${accent}" stroke-opacity=".30" stroke-width="1.4" letter-spacing="-6">${esc(num)}</text>
<text x="${w / 2}" y="${h * .40}" text-anchor="middle" font-family="Inter,Helvetica,Arial,sans-serif" font-size="10" font-weight="700"
 fill="${accent}" letter-spacing="3">${esc(label)}</text>
${lines}
<rect y="${h * .55}" width="${w}" height="${h * .45}" fill="url(#bt)"/>
<line x1="${w * .32}" y1="${h * .80}" x2="${w * .68}" y2="${h * .80}" stroke="${accent}" stroke-opacity=".55" stroke-width="1"/>
<text x="${w / 2}" y="${h * .855}" text-anchor="middle" font-family="Inter,Helvetica,Arial,sans-serif" font-size="9.5" font-weight="700"
 fill="rgba(255,255,255,.5)" letter-spacing="2.6">BÉNIN CINÉ</text>
<text x="${w / 2}" y="${h * .905}" text-anchor="middle" font-family="Inter,Helvetica,Arial,sans-serif" font-size="9"
 fill="rgba(255,255,255,.35)" letter-spacing="1.6">${esc(t.year || "")}</text>
<rect width="${w}" height="${h}" filter="url(#n)" opacity=".045"/>
</svg>`;
    return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg.replace(/\n/g, ""));
  }

  /* Emplacements de démonstration : uniquement des métadonnées structurelles
     (type, genre, durée, langue). Aucun synopsis inventé. */
  function demoSlots() {
    const mk = (i, o) => Object.assign({
      id: "demo-" + i, slot: i, demo: true, status: "a-programmer",
      synopsis: "", poster: "", backdrop: "", video: "",
      genres: [], languages: ["Français"], subtitles: ["Français"],
      maturity: "10", year: 2026, featured: false
    }, o);
    return [
      mk(1, { title: "Emplacement Film 01", type: "film", duration: 104, genres: ["Drame"], maturity: "12", collection: "Films" }),
      mk(2, { title: "Emplacement Série 01", type: "serie", duration: 42, episodes: 12, genres: ["Drame", "Jeunesse"], maturity: "12", collection: "Séries" }),
      mk(3, { title: "Emplacement Doc 01", type: "documentaire", duration: 78, genres: ["Patrimoine"], maturity: "Tous", collection: "Documentaires" }),
      mk(4, { title: "Emplacement Film 02", type: "film", duration: 96, genres: ["Comédie"], maturity: "Tous", collection: "Films" }),
      mk(5, { title: "Emplacement Série 02", type: "serie", duration: 38, episodes: 8, genres: ["Comédie"], maturity: "10", collection: "Séries" }),
      mk(6, { title: "Emplacement Court 01", type: "court", duration: 17, genres: ["Drame"], maturity: "12", collection: "Courts métrages" }),
      mk(7, { title: "Emplacement Jeunesse 01", type: "jeunesse", duration: 26, episodes: 10, genres: ["Animation", "Jeunesse"], maturity: "Tous", collection: "Jeunesse" }),
      mk(8, { title: "Emplacement Doc 02", type: "documentaire", duration: 62, genres: ["Société"], maturity: "10", collection: "Documentaires" }),
      mk(9, { title: "Emplacement Film 03", type: "film", duration: 118, genres: ["Drame", "Histoire"], maturity: "16", collection: "Films" }),
      mk(10, { title: "Emplacement Spectacle 01", type: "spectacle", duration: 74, genres: ["Humour"], maturity: "12", collection: "Spectacles" }),
      mk(11, { title: "Emplacement Série 03", type: "serie", duration: 45, episodes: 10, genres: ["Histoire"], maturity: "16", collection: "Séries" }),
      mk(12, { title: "Emplacement Court 02", type: "court", duration: 12, genres: ["Comédie"], maturity: "Tous", collection: "Courts métrages" })
    ];
  }

  function all() {
    const real = (S.titles || []).filter(t => t && t.status !== "brouillon");
    const demo = S.showDemo ? demoSlots() : [];
    return real.concat(demo).map(normalize);
  }
  function normalize(t) {
    t = Object.assign({ id: uid("t"), status: "publie", demo: false, genres: [], languages: ["Français"], subtitles: ["Français"], collection: "", maturity: "10" }, t);
    t.posterUrl = t.poster || placeholder(t, { w: 300, h: 450 });
    t.backdropUrl = t.backdrop || t.posterUrl;
    return t;
  }
  function byId(id) { return all().find(t => t.id === id) || null; }
  function related(t, n) {
    n = n || 8;
    return all().filter(x => x.id !== t.id && x.type === t.type).slice(0, n);
  }

  /* ---------------- Progression / liste / goûts ---------------- */
  const key = (id) => S.profile + "::" + id;
  const progress = {
    get(id) { return S.progress[key(id)] || null; },
    set(id, cur, dur) {
      const k = key(id);
      const p = S.progress[k] || { watched: 0 };
      p.cur = Math.max(0, Math.round(cur)); p.dur = Math.round(dur || p.dur || 0);
      p.pct = p.dur ? clamp(p.cur / p.dur * 100, 0, 100) : 0;
      p.ts = Date.now();
      S.progress[k] = p; S.save("progress");
      log("lecture", id);
    },
    clear(id) { delete S.progress[key(id)]; S.save("progress"); },
    all() {
      return Object.keys(S.progress).filter(k => k.startsWith(S.profile + "::"))
        .map(k => ({ id: k.split("::")[1], p: S.progress[k] }))
        .sort((a, b) => (b.p.ts || 0) - (a.p.ts || 0));
    }
  };
  const mylist = {
    has(id) { return S.list.includes(id); },
    toggle(id) {
      const i = S.list.indexOf(id);
      if (i >= 0) { S.list.splice(i, 1); toast("Retiré de ma liste", byId(id) ? byId(id).title : "", "ok"); }
      else { S.list.unshift(id); toast("Ajouté à ma liste", byId(id) ? byId(id).title : "", "ok"); }
      S.save("list"); return !i;
    }
  };
  const likes = {
    set(id, v) { S.likes[id] = v; S.save("likes"); toast(v > 0 ? "Noté : ça me plaît" : "Noté : pas pour moi", "", "ok"); },
    get(id) { return S.likes[id] || 0; }
  };
  function log(type, ref) {
    S.activity.unshift({ type, ref, ts: Date.now() });
    S.activity = S.activity.slice(0, 200);
    S.save("activity");
  }

  /* ---------------- Toasts ---------------- */
  function toast(title, msg, kind) {
    let host = $(".toasts");
    if (!host) { host = document.createElement("div"); host.className = "toasts"; document.body.appendChild(host); }
    const el = document.createElement("div");
    el.className = "toast " + (kind || "");
    el.innerHTML = `<div class="tic"><svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"></polyline></svg></div>
      <div><b>${esc(title)}</b>${msg ? `<p>${esc(msg)}</p>` : ""}</div>`;
    host.appendChild(el);
    setTimeout(() => { el.classList.add("out"); setTimeout(() => el.remove(), 320); }, 3600);
  }

  /* ---------------- Modale ---------------- */
  function modal(html, opts) {
    opts = opts || {};
    let m = $(".modal");
    if (!m) {
      m = document.createElement("div"); m.className = "modal";
      document.body.appendChild(m);
    }
    m.innerHTML = `<div class="modal-box" role="dialog" aria-modal="true">${html}</div>`;
    requestAnimationFrame(() => m.classList.add("open"));
    document.body.classList.add("no-scroll");
    const close = () => { m.classList.remove("open"); document.body.classList.remove("no-scroll"); setTimeout(() => { if (!m.classList.contains("open")) m.innerHTML = ""; }, 300); };
    m.onclick = (e) => { if (e.target === m) close(); };
    const btn = m.querySelector("[data-close]"); if (btn) btn.onclick = close;
    const esc2 = (e) => { if (e.key === "Escape") { close(); document.removeEventListener("keydown", esc2); } };
    document.addEventListener("keydown", esc2);
    return { close, el: m };
  }

  /* ---------------- Icônes ---------------- */
  const ICON = {
    search: '<svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg>',
    close: '<svg viewBox="0 0 24 24"><path d="M18 6L6 18M6 6l12 12"/></svg>',
    play: '<svg viewBox="0 0 24 24"><polygon points="6 4 20 12 6 20" fill="currentColor" stroke="none"/></svg>',
    pause: '<svg viewBox="0 0 24 24"><rect x="6" y="5" width="4" height="14" fill="currentColor" stroke="none"/><rect x="14" y="5" width="4" height="14" fill="currentColor" stroke="none"/></svg>',
    plus: '<svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>',
    check: '<svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>',
    info: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/></svg>',
    arrow: '<svg viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6"/></svg>',
    left: '<svg viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6"/></svg>',
    right: '<svg viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6"/></svg>',
    volume: '<svg viewBox="0 0 24 24"><polygon points="11 5 6 9 3 9 3 15 6 15 11 19 11 5" fill="currentColor" stroke="none"/><path d="M15.5 8.5a5 5 0 010 7M18 6a8.5 8.5 0 010 12"/></svg>',
    mute: '<svg viewBox="0 0 24 24"><polygon points="11 5 6 9 3 9 3 15 6 15 11 19 11 5" fill="currentColor" stroke="none"/><path d="M16 9l5 6M21 9l-5 6"/></svg>',
    full: '<svg viewBox="0 0 24 24"><polyline points="4 9 4 4 9 4"/><polyline points="20 9 20 4 15 4"/><polyline points="4 15 4 20 9 20"/><polyline points="20 15 20 20 15 20"/></svg>',
    cc: '<svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="14" rx="3"/><path d="M10 10a2.5 2.5 0 100 5M17 10a2.5 2.5 0 100 5"/></svg>',
    gear: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.6 1.6 0 00.3 1.8l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.6 1.6 0 00-1.8-.3 1.6 1.6 0 00-1 1.5V21a2 2 0 11-4 0v-.1A1.6 1.6 0 008 19.4a1.6 1.6 0 00-1.8.3l-.1.1a2 2 0 11-2.8-2.8l.1-.1a1.6 1.6 0 00.3-1.8 1.6 1.6 0 00-1.5-1H2a2 2 0 110-4h.1A1.6 1.6 0 003.6 8a1.6 1.6 0 00-.3-1.8l-.1-.1a2 2 0 112.8-2.8l.1.1a1.6 1.6 0 001.8.3H8a1.6 1.6 0 001-1.5V2a2 2 0 114 0v.1A1.6 1.6 0 0014 3.6a1.6 1.6 0 001.8-.3l.1-.1a2 2 0 112.8 2.8l-.1.1a1.6 1.6 0 00-.3 1.8V8a1.6 1.6 0 001.5 1H21a2 2 0 110 4h-.1a1.6 1.6 0 00-1.5 1z"/></svg>',
    cast: '<svg viewBox="0 0 24 24"><path d="M3 17h.01M7 17a5 5 0 015-5M4 21h16"/><path d="M3 13a10 10 0 0110-10"/></svg>',
    pip: '<svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="14" rx="2"/><rect x="12" y="12" width="7" height="5" fill="currentColor" stroke="none"/></svg>',
    back: '<svg viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6"/></svg>',
    download: '<svg viewBox="0 0 24 24"><path d="M12 3v12"/><polyline points="7 11 12 16 17 11"/><path d="M4 20h16"/></svg>',
    share: '<svg viewBox="0 0 24 24"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="M8.6 13.5l6.8 4M15.4 6.5l-6.8 4"/></svg>',
    heart: '<svg viewBox="0 0 24 24"><path d="M12 20s-7-4.5-7-9.5A4 4 0 0112 7a4 4 0 017 3.5C19 15.5 12 20 12 20z"/></svg>',
    upload: '<svg viewBox="0 0 24 24"><path d="M12 16V4"/><polyline points="7 9 12 4 17 9"/><path d="M4 20h16"/></svg>',
    trash: '<svg viewBox="0 0 24 24"><polyline points="4 7 20 7"/><path d="M9 7V5h6v2M6 7l1 13h10l1-13"/></svg>',
    mic: '<svg viewBox="0 0 24 24"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0014 0M12 18v3"/></svg>',
    globe: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a15 15 0 010 18M12 3a15 15 0 000 18"/></svg>',
    offline: '<svg viewBox="0 0 24 24"><path d="M12 3v12"/><polyline points="7 11 12 16 17 11"/><rect x="4" y="18" width="16" height="2"/></svg>',
    money: '<svg viewBox="0 0 24 24"><rect x="3" y="6" width="18" height="12" rx="2"/><circle cx="12" cy="12" r="2.5"/></svg>',
    star: '<svg viewBox="0 0 24 24"><polygon points="12 3 14.6 9 21 9.6 16.2 14 17.6 20.4 12 17 6.4 20.4 7.8 14 3 9.6 9.4 9"/></svg>',
    users: '<svg viewBox="0 0 24 24"><circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0113 0"/><path d="M16 5.5a3.5 3.5 0 010 7M18 20a6 6 0 00-2-4.5"/></svg>',
    home: '<svg viewBox="0 0 24 24"><path d="M4 11l8-7 8 7v8a2 2 0 01-2 2H6a2 2 0 01-2-2z"/><path d="M9.5 21v-6h5v6"/></svg>',
    list: '<svg viewBox="0 0 24 24"><path d="M8 6h13M8 12h13M8 18h13M3.5 6h.01M3.5 12h.01M3.5 18h.01"/></svg>',
    film: '<svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M7 4v16M17 4v16M3 9h4M3 15h4M17 9h4M17 15h4"/></svg>',
    spark: '<svg viewBox="0 0 24 24"><path d="M12 3l2 6 6 2-6 2-2 6-2-6-6-2 6-2z"/></svg>',
    lock: '<svg viewBox="0 0 24 24"><rect x="4" y="10" width="16" height="10" rx="2"/><path d="M8 10V7a4 4 0 018 0v3"/></svg>',
    mail: '<svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="14" rx="2"/><polyline points="3 7 12 13 21 7"/></svg>',
    phone: '<svg viewBox="0 0 24 24"><rect x="6" y="2" width="12" height="20" rx="3"/><path d="M11 18h2"/></svg>',
    calendar: '<svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/></svg>'
  };

  /* ---------------- Carte titre ---------------- */
  function cardHTML(t, opts) {
    opts = opts || {};
    const p = progress.get(t.id);
    const inList = mylist.has(t.id);
    const badge = t.demo
      ? '<span class="chip chip-demo">Démo</span>'
      : (t.status === "avant-premiere" ? '<span class="chip chip-red">Avant-première</span>' : (t.featured ? '<span class="chip chip-gold">En vedette</span>' : ""));
    return `
    <article class="tcard" data-id="${esc(t.id)}">
      <div class="poster">
        ${badge ? `<div class="corner">${badge}</div>` : ""}
        <img src="${esc(t.posterUrl)}" alt="${esc(t.title)}" loading="lazy" decoding="async">
        ${p && p.pct > 1 ? `<div class="pbar"><i style="width:${p.pct}%"></i></div>` : ""}
        <div class="hover-actions">
          <button data-act="play" title="Lire">${ICON.play}</button>
          <button data-act="list" title="Ma liste">${inList ? ICON.check : ICON.plus}</button>
          <button data-act="info" title="Infos">${ICON.info}</button>
        </div>
      </div>
      <div class="tmeta">
        <b>${esc(t.title)}</b>
        <span>${esc(TYPE_LABEL[t.type] || "")}${t.year ? " · " + esc(t.year) : ""}${t.duration ? " · " + fmtDur(t.duration) : ""}</span>
      </div>
    </article>`;
  }

  /* Rangée carrousel */
  function rowHTML(title, items, opts) {
    opts = opts || {};
    const id = uid("row");
    return `
    <section class="row-block">
      <div class="row-head wrap">
        <div>
          <h2>${esc(title)}</h2>
          ${opts.sub ? `<div class="row-sub">${esc(opts.sub)}</div>` : ""}
        </div>
        <div class="row-nav">
          <button data-scroll="-1" data-target="${id}" aria-label="Précédent">${ICON.left}</button>
          <button data-scroll="1" data-target="${id}" aria-label="Suivant">${ICON.right}</button>
        </div>
      </div>
      <div class="scroller wrap" id="${id}">
        ${(opts.top10 ? items.map((t, i) => `<div class="top10"><div class="num">${i + 1}</div>${cardHTML(t)}</div>`) : items.map(cardHTML)).join("")}
      </div>
    </section>`;
  }

  /* Comportements globaux des rangées / cartes */
  function bindCards(scope) {
    scope = scope || document;
    $$("[data-scroll]", scope).forEach(btn => {
      btn.addEventListener("click", () => {
        const el = document.getElementById(btn.dataset.target);
        const dir = parseInt(btn.dataset.scroll, 10);
        if (el) el.scrollBy({ left: dir * (el.clientWidth * 0.82), behavior: "smooth" });
      });
    });
    $$(".scroller", scope).forEach(el => {
      const upd = () => {
        const wrap = el.closest(".row-block");
        if (!wrap) return;
        const [l, r] = $$("[data-scroll]", wrap);
        if (l) l.disabled = el.scrollLeft < 12;
        if (r) r.disabled = el.scrollLeft + el.clientWidth >= el.scrollWidth - 12;
      };
      el.addEventListener("scroll", upd, { passive: true });
      window.addEventListener("resize", upd);
      setTimeout(upd, 60);
    });
    $$(".tcard, .t10", scope).forEach(card => {
      card.addEventListener("click", (e) => {
        const act = e.target.closest("[data-act]");
        const id = card.dataset.id;
        const t = byId(id);
        if (act) {
          e.stopPropagation();
          if (act.dataset.act === "play") goWatch(t);
          else if (act.dataset.act === "list") { mylist.toggle(id); refreshCards(); }
          else if (act.dataset.act === "info") goTitle(t);
          return;
        }
        goTitle(t);
      });
    });
  }
  function refreshCards() {
    $$(".tcard, .t10").forEach(c => {
      const t = byId(c.dataset.id); if (!t) return;
      const btn = c.querySelector('[data-act="list"]');
      if (btn) btn.innerHTML = mylist.has(t.id) ? ICON.check : ICON.plus;
      const pb = c.querySelector(".pbar i"), p = progress.get(t.id);
      if (pb && p) pb.style.width = p.pct + "%";
    });
  }

  /* ---------------- Sélecteur « drapeau » (vert · jaune · rouge) ---------------- */
  const FLAG_SVG = '<span class="mini-flag" aria-hidden="true">' +
    '<i style="width:34%;background:#008751"></i>' +
    '<i style="width:66%;background:linear-gradient(180deg,#FCD116 50%,#E8112D 50%)"></i></span>';

  function flagFilterHTML(options, value) {
    return `<div class="flagbar" role="tablist" aria-label="Filtrer par catégorie">
      ${options.map(o => `
        <button type="button" role="tab"
          class="ff ${String(o.value || "") === String(value || "") ? "active" : ""} ${o.light ? "on-light" : ""}"
          data-v="${esc(o.value == null ? "" : o.value)}" style="--c:${esc(o.color || "#8E8A84")}">
          ${o.flag ? FLAG_SVG : '<span class="dot"></span>'}
          <span>${esc(o.label)}</span>
          ${o.count != null ? `<span class="n">${esc(o.count)}</span>` : ""}
        </button>`).join("")}
    </div>`;
  }
  function bindFlagFilter(host, onChange) {
    if (!host) return;
    host.addEventListener("click", (e) => {
      const b = e.target.closest(".ff");
      if (!b) return;
      $$(".ff", host).forEach(x => x.classList.remove("active"));
      b.classList.add("active");
      log("filtre", b.dataset.v);
      onChange(b.dataset.v);
    });
  }

  /* ---------------- Top 10 centré ---------------- */
  function rankMove(id) {
    let h = 0;
    for (let i = 0; i < String(id).length; i++) h = (h * 31 + String(id).charCodeAt(i)) >>> 0;
    const v = h % 7;
    return v === 0 ? 0 : (v <= 3 ? v : -(v - 3));
  }
  function top10HTML(items) {
    if (!items.length) return `<div class="empty-note">Aucun titre dans cette catégorie pour le moment.</div>`;
    return items.map((t, i) => {
      const inList = mylist.has(t.id);
      const mv = rankMove(t.id);
      const badge = mv > 0 ? "up" : (mv < 0 ? "down" : "flat");
      const label = mv > 0 ? "▲" + mv : (mv < 0 ? "▼" + Math.abs(mv) : "=");
      return `
      <article class="t10" data-id="${esc(t.id)}" style="animation-delay:${i * 40}ms">
        <div class="poster">
          <span class="rank">${i + 1}</span>
          <span class="move ${badge}">${label}</span>
          <img src="${esc(t.posterUrl)}" alt="${esc(t.title)}" loading="lazy" decoding="async">
          <div class="hover-actions">
            <button data-act="play" title="Lire">${ICON.play}</button>
            <button data-act="list" title="Ma liste">${inList ? ICON.check : ICON.plus}</button>
            <button data-act="info" title="Infos">${ICON.info}</button>
          </div>
        </div>
        <div class="t10-meta">
          <b>${esc(t.title)}</b>
          <span>${esc(TYPE_LABEL[t.type] || "")}${t.year ? " · " + esc(t.year) : ""}</span>
        </div>
      </article>`;
    }).join("");
  }

  /* ---------------- Navigation ---------------- */
  const PAGES = [
    { href: "index.html", label: "Accueil", key: "index" },
    { href: "browse.html", label: "Catalogue", key: "browse" },
    { href: "plans.html", label: "Abonnements", key: "plans" },
    { href: "studio.html", label: "Studio", key: "studio" },
    { href: "about.html", label: "Le projet", key: "about" }
  ];
  function goTitle(t) { if (t) location.href = "title.html?id=" + encodeURIComponent(t.id); }
  function goWatch(t, ep) {
    if (!t) return;
    location.href = "watch.html?id=" + encodeURIComponent(t.id) + (ep ? "&ep=" + ep : "");
  }

  /* ---------------- Coquille (header + footer + recherche) ---------------- */
  function mountShell(active) {
    const nav = document.createElement("header");
    nav.className = "nav";
    nav.innerHTML = `
      <a class="brand" href="index.html" aria-label="Bénin Ciné">
        <img src="assets/brand/logo-96.png" alt="Bénin Ciné">
        <span class="brand-txt"><b>BÉNIN CINÉ</b><span>Streaming</span></span>
      </a>
      <nav class="nav-links">
        ${PAGES.map(p => `<a href="${p.href}" class="${p.key === active ? "active" : ""}">${p.label}</a>`).join("")}
      </nav>
      <div class="nav-right">
        <button class="icon-btn" data-search aria-label="Rechercher">${ICON.search}</button>
        <select class="lang-select" data-lang aria-label="Langue de l'interface">
          <option value="fr">FR</option><option value="en">EN</option><option value="fon">FON</option>
        </select>
        <a class="btn btn-sm ${S.plan ? "btn-ghost" : "btn-primary"}" href="${S.plan ? "account.html" : "plans.html"}">
          ${S.plan ? "Mon compte" : "S'abonner"}
        </a>
        <div class="avatar" data-profile title="Profils">${esc((profile().name || "?")[0].toUpperCase())}</div>
      </div>`;
    document.body.prepend(nav);

    /* ---- Navigation mobile : menu burger + barre d'onglets ---- */
    const burger = document.createElement("button");
    burger.className = "burger";
    burger.type = "button";
    burger.setAttribute("aria-label", "Ouvrir le menu");
    burger.innerHTML = '<svg viewBox="0 0 24 24"><path d="M4 7h16M4 12h16M4 17h16"/></svg>';
    nav.insertBefore(burger, nav.querySelector(".nav-right"));

    const sheet = document.createElement("div");
    sheet.className = "sheet";
    sheet.innerHTML = `
      <a href="index.html">${ICON.home} Accueil</a>
      <a href="browse.html">${ICON.search} Catalogue</a>
      <a href="plans.html">${ICON.money} Abonnements</a>
      <a href="studio.html">${ICON.film} Studio</a>
      <a href="about.html">${ICON.spark} Le projet</a>
      <a href="account.html">${ICON.users} Mon compte<small>${S.plan ? "abonné" : "invité"}</small></a>
      <a href="admin.html">${ICON.gear} Back-office</a>
      ${S.user
        ? '<a href="#" data-logout2>' + ICON.lock + ' Se déconnecter</a>'
        : '<a href="auth.html">' + ICON.lock + ' Se connecter</a>'}
      <div class="sheet-foot">
        <div class="field">
          <label for="sheet-lang">Langue de l'interface</label>
          <select class="select" id="sheet-lang" data-lang2>
            <option value="fr">Français</option><option value="en">English</option><option value="fon">Fon</option>
          </select>
        </div>
        <a class="btn btn-primary btn-block" href="plans.html">Découvrir les formules</a>
      </div>`;
    document.body.appendChild(sheet);

    const closeSheet = () => { sheet.classList.remove("open"); document.body.classList.remove("no-scroll"); };
    burger.addEventListener("click", () => {
      const open = sheet.classList.toggle("open");
      document.body.classList.toggle("no-scroll", open);
    });
    sheet.addEventListener("click", (e) => {
      if (e.target.closest("[data-logout2]")) {
        e.preventDefault();
        S.user = null; S.plan = null; S.save("user"); S.save("plan"); location.reload();
      }
      if (e.target.closest("a:not([data-logout2])")) closeSheet();
    });
    const sLang = sheet.querySelector("[data-lang2]");
    sLang.value = S.settings.language || "fr";
    sLang.addEventListener("change", () => {
      S.settings.language = sLang.value; S.save("settings");
      const top = nav.querySelector("[data-lang]"); if (top) top.value = sLang.value;
      toast("Langue", "Interface : " + sLang.value.toUpperCase(), "ok");
    });

    const TABMAP = { index: "index", browse: "browse", title: "browse", watch: "browse", studio: "studio", account: "account", auth: "account" };
    const tabbar = document.createElement("nav");
    tabbar.className = "tabbar";
    tabbar.innerHTML = [
      ["index.html", "index", ICON.home, "Accueil"],
      ["browse.html", "browse", ICON.search, "Catalogue"],
      ["account.html#liste", "list", ICON.plus, "Ma liste"],
      ["studio.html", "studio", ICON.film, "Studio"],
      ["account.html", "account", ICON.users, "Compte"]
    ].map(([href, key, icon, label]) =>
      `<a href="${href}" class="${TABMAP[active] === key ? "active" : ""}">${icon}<span>${label}</span></a>`).join("");
    document.body.appendChild(tabbar);
    document.body.classList.add("has-tabbar");

    const pm = document.createElement("div");
    pm.className = "profile-menu";
    pm.innerHTML = `
      <div class="pm-head">
        <b>${esc((S.user && S.user.name) || profile().name)}</b>
        <span>${S.plan ? "Abonnement " + esc(S.plan) : "Aucun abonnement"}</span>
      </div>
      <a href="account.html">${ICON.users} Profils & compte</a>
      <a href="account.html#liste">${ICON.check} Ma liste</a>
      <a href="account.html#parametres">${ICON.gear} Paramètres</a>
      <a href="admin.html">${ICON.film} Back-office</a>
      ${S.user ? `<a href="#" data-logout>${ICON.lock} Se déconnecter</a>` : `<a href="auth.html">${ICON.lock} Connexion</a>`}`;
    document.body.appendChild(pm);

    const av = nav.querySelector("[data-profile]");
    av.addEventListener("click", (e) => { e.stopPropagation(); pm.classList.toggle("open"); });
    document.addEventListener("click", (e) => { if (!pm.contains(e.target)) pm.classList.remove("open"); });
    pm.addEventListener("click", (e) => {
      const lo = e.target.closest("[data-logout]");
      if (lo) { e.preventDefault(); S.user = null; S.plan = null; S.save("user"); S.save("plan"); location.reload(); }
    });

    /* Barre de navigation réactive */
    let lastY = window.scrollY;
    const onScroll = () => {
      const y = window.scrollY;
      nav.classList.toggle("solid", y > 40);
      if (y > 160 && y > lastY + 6) nav.classList.add("down"), nav.classList.remove("up");
      else nav.classList.remove("down"), nav.classList.add("up");
      lastY = y;
    };
    window.addEventListener("scroll", onScroll, { passive: true }); onScroll();

    /* Recherche */
    nav.querySelector("[data-search]").addEventListener("click", openSearch);
    const sel = nav.querySelector("[data-lang]");
    sel.value = S.settings.language || "fr";
    sel.addEventListener("change", () => { S.settings.language = sel.value; S.save("settings"); toast("Langue", "Interface : " + sel.value.toUpperCase(), "ok"); });

    /* Footer */
    const ft = document.createElement("footer");
    ft.className = "footer";
    ft.innerHTML = `
      <div class="wrap">
        <div class="footer-grid">
          <div class="f-brand">
            <img src="assets/brand/logo-256.png" alt="Bénin Ciné">
            <p>Maison de production et de diffusion du cinéma béninois. Nos histoires, notre langue, notre écran.</p>
            <div class="app-badges">
              <span class="app-badge">${ICON.phone}<span><b>Android</b>Bientôt</span></span>
              <span class="app-badge">${ICON.phone}<span><b>iOS</b>Bientôt</span></span>
            </div>
          </div>
          <div>
            <h5>Plateforme</h5>
            <a href="browse.html">Catalogue</a><a href="plans.html">Abonnements</a>
            <a href="browse.html?type=serie">Séries</a><a href="browse.html?type=documentaire">Documentaires</a>
            <a href="browse.html?type=jeunesse">Jeunesse</a>
          </div>
          <div>
            <h5>Maison de production</h5>
            <a href="about.html">Le projet</a><a href="studio.html">Soumettre un projet</a>
            <a href="studio.html#partenaires">Devenir partenaire</a><a href="studio.html#incubateur">Incubateur</a>
          </div>
          <div>
            <h5>Aide</h5>
            <a href="account.html">Mon compte</a><a href="plans.html#faq">Questions fréquentes</a>
            <a href="admin.html">Back-office</a><a href="about.html#contact">Nous contacter</a>
          </div>
        </div>
        <div class="footer-bottom">
          <span>© ${new Date().getFullYear()} Bénin Ciné, Cotonou, République du Bénin. Tous droits réservés.</span>
          <span>Paiements : MTN MoMo · Moov Money · Orange Money · Wave · Carte bancaire</span>
        </div>
      </div>`;
    document.body.appendChild(ft);

    /* Raccourcis clavier */
    document.addEventListener("keydown", (e) => {
      if (e.key === "/" && !/input|textarea/i.test(e.target.tagName)) { e.preventDefault(); openSearch(); }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") { e.preventDefault(); openSearch(); }
    });
  }

  function openSearch() {
    let ov = $(".search-overlay");
    if (!ov) {
      ov = document.createElement("div");
      ov.className = "search-overlay";
      ov.innerHTML = `
        <div class="wrap">
          <div class="search-box">
            ${ICON.search}
            <input type="search" placeholder="Films, séries, documentaires, réalisateurs…" aria-label="Rechercher">
            <button class="icon-btn search-close" data-close>${ICON.close}</button>
          </div>
          <div class="search-results"></div>
        </div>`;
      document.body.appendChild(ov);
      const input = $("input", ov);
      input.addEventListener("input", debounce(() => renderSearch(input.value), 120));
      ov.addEventListener("click", (e) => { if (e.target === ov || e.target.closest("[data-close]")) closeSearch(); });
      ov.addEventListener("click", (e) => {
        const it = e.target.closest(".sr-item");
        if (it) { const t = byId(it.dataset.id); closeSearch(); goTitle(t); }
      });
      document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeSearch(); });
    }
    requestAnimationFrame(() => { ov.classList.add("open"); document.body.classList.add("no-scroll"); $("input", ov).focus(); renderSearch(""); });
  }
  function closeSearch() {
    const ov = $(".search-overlay"); if (!ov) return;
    ov.classList.remove("open"); document.body.classList.remove("no-scroll");
  }
  function renderSearch(q) {
    const ov = $(".search-overlay"); if (!ov) return;
    const host = $(".search-results", ov);
    const items = all();
    const nq = norm(q);
    let res = items;
    if (nq) {
      res = items.filter(t => {
        const hay = norm([t.title, t.type, (t.genres || []).join(" "), t.collection, t.year, (t.languages || []).join(" ")].join(" "));
        return hay.includes(nq);
      });
    } else {
      res = items.slice().sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0)).slice(0, 6);
    }
    if (!res.length) {
      host.innerHTML = `<div class="empty-state">${ICON.search}<h3>Aucun résultat pour « ${esc(q)} »</h3>
        <p class="small">Le catalogue s'enrichit chaque semaine.</p></div>`;
      return;
    }
    const groups = {};
    res.forEach(t => { const k = TYPE_LABEL[t.type] || "Autres"; (groups[k] = groups[k] || []).push(t); });
    host.innerHTML = Object.keys(groups).map(k => `
      <div class="search-group">
        <h4>${esc(k)}</h4>
        ${groups[k].map(t => `
          <div class="sr-item" data-id="${esc(t.id)}">
            <img src="${esc(t.posterUrl)}" alt="">
            <div>
              <div class="sr-t">${esc(t.title)}</div>
              <div class="sr-m">${esc(t.year || "")}${t.duration ? " · " + fmtDur(t.duration) : ""}${t.genres && t.genres.length ? " · " + esc(t.genres.join(", ")) : ""}${t.demo ? " · emplacement de démonstration" : ""}</div>
            </div>
            <span class="spacer"></span>${ICON.arrow}
          </div>`).join("")}
      </div>`).join("");
  }

  /* ---------------- Divers ---------------- */
  function requirePlan() {
    if (!S.plan) {
      modal(`<h3 class="h3">Abonnement requis</h3>
        <p class="lead" style="margin:12px 0 22px">Créez un compte ou choisissez une formule pour lire ce titre. Les 7 premiers jours sont offerts.</p>
        <div class="row" style="gap:12px;flex-wrap:wrap">
          <a class="btn btn-primary" href="plans.html">Voir les formules</a>
          <button class="btn btn-ghost" data-close>Plus tard</button>
        </div>`);
      return false;
    }
    return true;
  }

  /* Envoi d'un formulaire vers Netlify Forms.
     En local (ou si l'envoi échoue) on retombe sur le stockage du navigateur :
     rien n'est perdu, le visiteur voit toujours une confirmation. */
  async function netlifySubmit(name, fields) {
    if (location.protocol === "file:") return false;
    try {
      const body = new URLSearchParams();
      body.set("form-name", name);
      body.set("bot-field", "");
      Object.keys(fields || {}).forEach(k => {
        const v = fields[k];
        body.set(k, Array.isArray(v) ? v.join(", ") : (v == null ? "" : String(v)));
      });
      const r = await fetch("/", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: body.toString()
      });
      return r.ok;
    } catch (e) { return false; }
  }

  function share(t) {
    const data = { title: t.title, text: "À voir sur Bénin Ciné : " + t.title, url: location.href };
    if (navigator.share) { navigator.share(data).catch(() => {}); return; }
    if (navigator.clipboard) {
      navigator.clipboard.writeText(location.href);
      toast("Lien copié", "Partagez-le avec vos proches.", "ok");
    }
  }

  /* Infos modale d'un titre */
  function infoModal(t) {
    modal(`
      <div class="row" style="align-items:flex-start;gap:20px;flex-wrap:wrap">
        <img src="${esc(t.posterUrl)}" alt="" style="width:120px;border-radius:12px">
        <div style="flex:1;min-width:220px">
          <h3 class="h3">${esc(t.title)}</h3>
          <div class="title-meta" style="margin:10px 0">
            <span class="maturity ${/tous/i.test(String(t.maturity)) ? "kids" : ""}">${esc(t.maturity)}</span>
            <span class="muted small">${esc(TYPE_LABEL[t.type] || "")} · ${esc(t.year || "")}${t.duration ? " · " + fmtDur(t.duration) : ""}</span>
            ${t.demo ? '<span class="chip chip-demo">Emplacement de démonstration</span>' : ""}
          </div>
          <p class="muted small">${t.synopsis ? esc(t.synopsis) : "Synopsis à renseigner depuis le back-office Bénin Ciné."}</p>
          <div class="row" style="gap:10px;margin-top:18px;flex-wrap:wrap">
            <button class="btn btn-primary btn-sm" data-play>${ICON.play} Lire</button>
            <button class="btn btn-ghost btn-sm" data-list></button>
            <a class="btn btn-ghost btn-sm" href="title.html?id=${encodeURIComponent(t.id)}">${ICON.info} Fiche</a>
          </div>
        </div>
      </div>`, {});
    const m = $(".modal");
    m.querySelector("[data-play]").onclick = () => { $(".modal").classList.remove("open"); document.body.classList.remove("no-scroll"); goWatch(t); };
    const lb = m.querySelector("[data-list]");
    const paint = () => lb.innerHTML = (mylist.has(t.id) ? ICON.check + " Retirer" : ICON.plus + " Ma liste");
    paint(); lb.onclick = () => { mylist.toggle(t.id); paint(); };
  }

  window.BC = {
    $, $$, esc, norm, uid, clamp, fmtTime, fmtDur, fmtMoney, ago, debounce, qs, slug,
    store, S, profile, isKids,
    all, byId, related, demoSlots, placeholder, TYPE_LABEL, TYPE_ACCENT,
    progress, mylist, likes, log,
    toast, modal, ICON, netlifySubmit, cardHTML, rowHTML, top10HTML, flagFilterHTML, bindFlagFilter, bindCards, refreshCards,
    mountShell, openSearch, closeSearch, goTitle, goWatch, requirePlan, share, infoModal
  };
})();
