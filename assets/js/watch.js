/* Lecteur Bénin Ciné : contrôles sur mesure, reprise, épisode suivant, raccourcis */
(function () {
  const { $, $$, esc, mountShell, byId, all, related, ICON, fmtTime, fmtDur, toast, qs, S,
          progress, mylist, goWatch, goTitle, TYPE_LABEL } = BC;
  mountShell("watch");

  const t = byId(qs("id"));
  const page = $("#page");
  if (!t) { location.href = "browse.html"; return; }

  const ep = parseInt(qs("ep") || "1", 10) || 1;
  const eps = t.episodes ? Math.max(1, Math.round(t.episodes)) : 0;
  const isSeries = /serie|jeunesse/.test(t.type) && eps > 0;
  const src = t.video || "assets/video/teaser-benincine.mp4";
  const isDemoAsset = !t.video;

  document.title = "Lecture · " + t.title + " · Bénin Ciné";

  page.innerHTML = `
    <div class="player-wrap" id="pw">
      <video id="vid" playsinline preload="metadata" poster="${esc(t.backdropUrl)}">
        <source src="${esc(src)}" type="video/mp4">
      </video>

      <div class="demo-note">
        ${isDemoAsset ? "<b>Démonstration</b> extrait de la plateforme, remplacez-le par le fichier du titre depuis le back-office"
                      : "<b>Fichier du titre</b> source déposée dans le back-office"}
      </div>

      <div class="player-top">
        <button class="cbtn" data-back title="Retour">${ICON.back}</button>
        <div>
          <div class="pt-title">${esc(t.title)}${isSeries ? " · Épisode " + ep : ""}</div>
          <div class="pt-sub">${esc(TYPE_LABEL[t.type] || "")}${t.year ? " · " + esc(t.year) : ""} · Bénin Ciné</div>
        </div>
      </div>

      <div class="player-center"><button class="big-play" id="bigplay" aria-label="Lecture">${ICON.play}</button></div>

      <div class="skip-intro hidden" id="skip">Passer l'intro ${ICON.arrow}</div>

      <div class="next-up hidden" id="nextup">
        <img id="nu-img" src="" alt="">
        <div>
          <div class="small muted">Épisode suivant</div>
          <div style="font-weight:700" id="nu-title"></div>
          <div class="nu-countdown"><i></i></div>
        </div>
      </div>

      <div class="controls">
        <div class="timeline" id="tl">
          <div class="track">
            <div class="buf" id="buf"></div>
            <div class="fill" id="fill"></div>
          </div>
          <div class="knob" id="knob"></div>
          <div class="buffered-marker" id="tt">0:00</div>
        </div>
        <div class="cbar">
          <button class="cbtn" id="play" title="Lecture / Pause (Espace)">${ICON.play}</button>
          <button class="cbtn" id="back10" title="Reculer de 10 secondes (flèche gauche)">${ICON.left}</button>
          <button class="cbtn" id="fwd10" title="Avancer de 10 secondes (flèche droite)">${ICON.right}</button>
          <div class="vol">
            <button class="cbtn" id="mute" title="Son (M)">${ICON.volume}</button>
            <input type="range" id="vol" min="0" max="1" step="0.02" value="1" aria-label="Volume">
          </div>
          <div class="time"><b id="cur">0:00</b> / <span id="dur">0:00</span></div>
          <span class="spacer"></span>
          <div class="cselect" id="cs-cc">
            <button>${ICON.cc} <span class="lbl">Sous-titres</span></button>
            <div class="cmenu">
              <div class="cm-title">Sous-titres</div>
              ${["Français", "Anglais", "Fon", "Yoruba", "Aucun"].map(l => `<button data-cc="${l}">${l}</button>`).join("")}
            </div>
          </div>
          <div class="cselect" id="cs-q">
            <button>${ICON.gear} <span class="lbl">Qualité</span></button>
            <div class="cmenu">
              <div class="cm-title">Qualité vidéo</div>
              ${["Auto (recommandé)", "1080p", "720p", "480p", "240p, économie de données"].map(q => `<button data-q="${q}">${q}</button>`).join("")}
            </div>
          </div>
          <div class="cselect" id="cs-s">
            <button>${ICON.film} <span class="lbl">Vitesse</span></button>
            <div class="cmenu">
              <div class="cm-title">Vitesse de lecture</div>
              ${["0.5", "0.75", "1", "1.25", "1.5", "2"].map(s => `<button data-sp="${s}">${s}×</button>`).join("")}
            </div>
          </div>
          <button class="cbtn" id="pip" title="Picture in picture">${ICON.pip}</button>
          <button class="cbtn" id="cast" title="Diffuser sur le téléviseur">${ICON.cast}</button>
          <button class="cbtn" id="fs" title="Plein écran (F)">${ICON.full}</button>
        </div>
      </div>
    </div>

    <div class="wrap watch-grid">
      <div>
        <div class="between" style="flex-wrap:wrap;gap:14px">
          <div>
            <h1 class="h2">${esc(t.title)}${isSeries ? " · Épisode " + ep : ""}</h1>
            <div class="row" style="gap:10px;margin-top:10px;flex-wrap:wrap">
              <span class="maturity ${/tous/i.test(String(t.maturity)) ? "kids" : ""}">${esc(t.maturity)}</span>
              <span class="muted small">${esc(t.year || "")}</span>
              <span class="muted small">${t.duration ? fmtDur(t.duration) : ""}</span>
              ${t.demo ? '<span class="chip chip-demo">Démonstration</span>' : ""}
            </div>
          </div>
          <div class="row" style="gap:10px;flex-wrap:wrap">
            <button class="btn btn-ghost btn-sm" id="w-list"></button>
            <button class="btn btn-ghost btn-sm" id="w-dl">${ICON.download} Télécharger</button>
            <button class="btn btn-ghost btn-sm" id="w-share">${ICON.share} Partager</button>
          </div>
        </div>
        <p class="lead" style="margin-top:18px;max-width:70ch">
          ${t.synopsis ? esc(t.synopsis) : "<i>Synopsis à renseigner depuis le back-office Bénin Ciné.</i>"}
        </p>
        <div class="row" style="gap:10px;margin-top:20px;flex-wrap:wrap">
          ${(t.languages || []).map(l => `<span class="chip">Audio : ${esc(l)}</span>`).join("")}
          ${(t.subtitles || []).map(l => `<span class="chip">ST : ${esc(l)}</span>`).join("")}
          <span class="chip chip-gold">Encodage adaptatif</span>
        </div>
      </div>
      <aside>
        ${isSeries ? `<div class="side-block" style="margin-bottom:26px">
          <h3>Épisodes · Saison 1</h3>
          <div id="side-eps" style="max-height:340px;overflow:auto"></div>
        </div>` : ""}
        <div class="side-block">
          <h3>À suivre</h3>
          <div id="side-rel"></div>
        </div>
      </aside>
    </div>`;

  /* ---------------- Éléments ---------------- */
  const vid = $("#vid"), pw = $("#pw"), fill = $("#fill"), buf = $("#buf"), knob = $("#knob"),
        cur = $("#cur"), dur = $("#dur"), tl = $("#tl"), tt = $("#tt"),
        playBtn = $("#play"), bigplay = $("#bigplay"), muteBtn = $("#mute"), vol = $("#vol");

  /* ---------------- État ---------------- */
  let uiTimer = null, saveTimer = null, nextTimer = null, scrubbing = false;
  const PREVIEW = S.settings.autoplayPreview;

  pw.classList.add("paused");

  function showUI() {
    pw.classList.add("show-ui");
    clearTimeout(uiTimer);
    uiTimer = setTimeout(() => { if (!vid.paused) pw.classList.remove("show-ui"); }, 2600);
  }
  pw.addEventListener("mousemove", showUI);
  pw.addEventListener("touchstart", showUI, { passive: true });

  function paintTime() {
    cur.textContent = fmtTime(vid.currentTime);
    dur.textContent = fmtTime(vid.duration || 0);
    const pc = vid.duration ? (vid.currentTime / vid.duration) * 100 : 0;
    fill.style.width = pc + "%";
    knob.style.left = pc + "%";
  }
  function paintBuffer() {
    if (vid.buffered && vid.buffered.length && vid.duration) {
      const end = vid.buffered.end(vid.buffered.length - 1);
      buf.style.width = (end / vid.duration) * 100 + "%";
    }
  }
  function togglePlay() {
    if (vid.paused) {
      vid.play().then(() => {
        pw.classList.remove("paused"); bigplay.style.display = "none"; showUI();
        if (PREVIEW) hideIntroLater();
      }).catch(() => toast("Lecture", "Appuyez sur lecture pour démarrer.", "err"));
    } else { vid.pause(); }
  }
  vid.addEventListener("play", () => { playBtn.innerHTML = ICON.pause; pw.classList.remove("paused"); bigplay.style.display = "none"; });
  vid.addEventListener("pause", () => { playBtn.innerHTML = ICON.play; pw.classList.add("paused"); bigplay.style.display = ""; clearTimeout(uiTimer); pw.classList.add("show-ui"); });
  vid.addEventListener("timeupdate", () => { paintTime(); paintBuffer(); maybeSkipIntro(); });
  vid.addEventListener("progress", paintBuffer);
  vid.addEventListener("loadedmetadata", () => { paintTime(); restore(); });
  vid.addEventListener("ended", () => { if (S.settings.autoplayNext && isSeries && ep < eps) showNextUp(); });
  vid.addEventListener("waiting", () => { pw.insertAdjacentHTML("beforeend", ""); });
  vid.addEventListener("error", showNoVideo);
  // Filet de sécurité : si rien n'a chargé après 4 s, on considère le média absent.
  setTimeout(() => { if (vid.readyState === 0) showNoVideo(); }, 4000);

  function showNoVideo() {
    if ($("#novid")) return;
    const d = document.createElement("div");
    d.id = "novid";
    d.className = "player-fallback";
    d.innerHTML = `<img src="${esc(t.backdropUrl)}" alt="">
      <div class="pf-card">
        <p class="eyebrow" style="justify-content:center">Média non disponible</p>
        <h3 class="h3" style="margin:12px 0 8px">${isSeries ? "L'épisode arrive bientôt" : "Le film arrive bientôt"}</h3>
        <p class="muted small">Le fichier vidéo n'a pas encore été déposé pour ce titre.
        Ajoutez-le depuis le back-office Bénin Ciné : il sera diffusé ici, en qualité adaptative.</p>
        <div class="row" style="gap:10px;justify-content:center;margin-top:18px;flex-wrap:wrap">
          <a class="btn btn-primary btn-sm" href="admin.html">Déposer un média</a>
          <a class="btn btn-ghost btn-sm" href="browse.html">Voir le catalogue</a>
        </div>
      </div>`;
    pw.appendChild(d);
    ["controls", "player-center", "demo-note"].forEach(c => {
      const el = pw.querySelector("." + c); if (el) el.classList.add("hidden");
    });
  }

  playBtn.onclick = togglePlay;
  bigplay.onclick = togglePlay;

  /* Un appui : commandes (mobile) ou lecture (ordinateur). Deux appuis : reculer / avancer de 10 s. */
  const coarse = window.matchMedia("(pointer: coarse)").matches;
  let tapTimer = null, lastTap = 0, lastX = 0;
  vid.addEventListener("click", (e) => {
    const now = Date.now();
    const r = vid.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width;
    if (now - lastTap < 330 && Math.abs(x - lastX) < 0.22) {
      clearTimeout(tapTimer); lastTap = 0;
      const back = x < 0.5;
      vid.currentTime = BC.clamp(vid.currentTime + (back ? -10 : 10), 0, Math.max(0, (vid.duration || 0) - 0.3));
      pulse(back);
      return;
    }
    lastTap = now; lastX = x;
    if (coarse) { clearTimeout(tapTimer); tapTimer = setTimeout(toggleUI, 300); }
    else togglePlay();
  });

  function toggleUI() {
    if (pw.classList.contains("show-ui")) { pw.classList.remove("show-ui"); clearTimeout(uiTimer); }
    else showUI();
  }
  function pulse(back) {
    const d = document.createElement("div");
    d.className = "seek-pulse " + (back ? "left" : "right");
    d.innerHTML = (back ? ICON.left : ICON.right) + "<span>10 s</span>";
    pw.appendChild(d);
    setTimeout(() => d.remove(), 620);
  }
  $("#back10").onclick = () => vid.currentTime = Math.max(0, vid.currentTime - 10);
  $("#fwd10").onclick = () => vid.currentTime = Math.min(vid.duration || 0, vid.currentTime + 10);
  muteBtn.onclick = () => { vid.muted = !vid.muted; muteBtn.innerHTML = vid.muted ? ICON.mute : ICON.volume; muteBtn.classList.toggle("on", vid.muted); };
  vol.oninput = () => { vid.volume = +vol.value; vid.muted = +vol.value === 0; muteBtn.innerHTML = vid.muted ? ICON.mute : ICON.volume; };

  /* Timeline */
  function seekFromEvent(e) {
    const r = tl.getBoundingClientRect();
    const x = (e.touches ? e.touches[0].clientX : e.clientX) - r.left;
    const p = BC.clamp(x / r.width, 0, 1);
    vid.currentTime = p * (vid.duration || 0);
    paintTime();
  }
  tl.addEventListener("pointerdown", (e) => { scrubbing = true; seekFromEvent(e); tl.setPointerCapture(e.pointerId); });
  tl.addEventListener("pointermove", (e) => { if (scrubbing) seekFromEvent(e); showHover(e); });
  tl.addEventListener("pointerup", () => { scrubbing = false; });
  tl.addEventListener("mousemove", showHover);
  function showHover(e) {
    const r = tl.getBoundingClientRect();
    const p = BC.clamp(((e.touches ? e.touches[0].clientX : e.clientX) - r.left) / r.width, 0, 1);
    tt.textContent = fmtTime(p * (vid.duration || 0));
    tt.style.left = (p * 100) + "%";
  }

  /* Menus */
  $$(".cselect").forEach(cs => {
    cs.querySelector("button").addEventListener("click", (e) => {
      e.stopPropagation();
      const wasOpen = cs.classList.contains("open");
      $$(".cselect").forEach(o => o.classList.remove("open"));
      cs.classList.toggle("open", !wasOpen);
    });
  });
  document.addEventListener("click", () => $$(".cselect").forEach(o => o.classList.remove("open")));
  $$("[data-cc]").forEach(b => b.onclick = () => { $$("[data-cc]").forEach(x => x.classList.remove("active")); b.classList.add("active"); toast("Sous-titres", b.dataset.cc, "ok"); });
  $$("[data-q]").forEach(b => b.onclick = () => { $$("[data-q]").forEach(x => x.classList.remove("active")); b.classList.add("active"); toast("Qualité", b.dataset.q, "ok"); });
  $$("[data-sp]").forEach(b => b.onclick = () => { vid.playbackRate = parseFloat(b.dataset.sp); $$("[data-sp]").forEach(x => x.classList.remove("active")); b.classList.add("active"); toast("Vitesse", b.dataset.sp + "×", "ok"); });
  $$("[data-q]")[0].classList.add("active");
  $$("[data-sp]").filter(b => b.dataset.sp === "1")[0].classList.add("active");
  $$("[data-cc]")[0].classList.add("active");

  /* Plein écran / PiP / Cast */
  $("#fs").onclick = () => {
    if (document.fullscreenElement) document.exitFullscreen();
    else if (pw.requestFullscreen) pw.requestFullscreen();
    else if (vid.webkitEnterFullscreen) vid.webkitEnterFullscreen();
  };
  $("#pip").onclick = async () => {
    try { if (document.pictureInPictureElement) await document.exitPictureInPicture(); else await vid.requestPictureInPicture(); }
    catch (e) { toast("Picture in picture", "Non pris en charge par ce navigateur.", "err"); }
  };
  $("#cast").onclick = () => toast("Diffusion", "Cast à relier au module TV (Chromecast / Android TV).", "ok");

  /* Raccourcis clavier */
  document.addEventListener("keydown", (e) => {
    if (/input|textarea|select/i.test(e.target.tagName)) return;
    switch (e.key.toLowerCase()) {
      case " ": case "k": e.preventDefault(); togglePlay(); break;
      case "arrowleft": case "j": vid.currentTime = Math.max(0, vid.currentTime - 10); showUI(); break;
      case "arrowright": case "l": vid.currentTime = Math.min(vid.duration || 0, vid.currentTime + 10); showUI(); break;
      case "arrowup": vid.volume = BC.clamp(vid.volume + .1, 0, 1); vol.value = vid.volume; break;
      case "arrowdown": vid.volume = BC.clamp(vid.volume - .1, 0, 1); vol.value = vid.volume; break;
      case "m": muteBtn.click(); break;
      case "f": $("#fs").click(); break;
      case "escape": if (document.fullscreenElement) document.exitFullscreen(); break;
      default: if (/^[0-9]$/.test(e.key)) vid.currentTime = (parseInt(e.key, 10) / 10) * (vid.duration || 0);
    }
  });

  /* Passer l'intro */
  const skipBtn = $("#skip");
  function maybeSkipIntro() {
    const on = vid.currentTime > 2 && vid.currentTime < 14;
    skipBtn.classList.toggle("hidden", !on);
  }
  function hideIntroLater() { maybeSkipIntro(); }
  skipBtn.onclick = () => { vid.currentTime = Math.min(15, vid.duration || 15); skipBtn.classList.add("hidden"); };

  /* Épisode suivant */
  const nextup = $("#nextup");
  function showNextUp() {
    $("#nu-title").textContent = "Épisode " + (ep + 1);
    $("#nu-img").src = t.backdropUrl;
    nextup.classList.remove("hidden");
    let left = 6;
    const bar = nextup.querySelector(".nu-countdown i");
    bar.style.width = "100%";
    nextTimer = setInterval(() => {
      left -= 0.1; bar.style.width = (left / 6 * 100) + "%";
      if (left <= 0) { clearInterval(nextTimer); goWatch(t, ep + 1); }
    }, 100);
    nextup.onclick = () => { clearInterval(nextTimer); goWatch(t, ep + 1); };
    const cancel = document.createElement("button");
    cancel.className = "btn btn-ghost btn-sm";
    cancel.style.cssText = "position:absolute;right:8px;top:8px";
    cancel.innerHTML = ICON.close;
    cancel.onclick = (e) => { e.stopPropagation(); clearInterval(nextTimer); nextup.classList.add("hidden"); cancel.remove(); };
    nextup.appendChild(cancel);
  }

  /* Progression */
  function restore() {
    const p = progress.get(t.id + (isSeries ? "@" + ep : ""));
    if (p && p.cur > 5 && p.dur && vid.duration && p.cur < p.dur - 5) {
      vid.currentTime = Math.min(p.cur, vid.duration - 1);
      toast("Reprise", "Reprise à " + fmtTime(p.cur), "ok");
    }
  }
  vid.addEventListener("timeupdate", BC.debounce(() => {
    if (vid.duration) progress.set(t.id + (isSeries ? "@" + ep : ""), vid.currentTime, vid.duration);
  }, 4000));
  window.addEventListener("beforeunload", () => {
    if (vid.duration) progress.set(t.id + (isSeries ? "@" + ep : ""), vid.currentTime, vid.duration);
  });

  /* Actions de la page */
  const wl = $("#w-list");
  const paintList = () => wl.innerHTML = (mylist.has(t.id) ? ICON.check + " Dans ma liste" : ICON.plus + " Ma liste");
  paintList();
  wl.onclick = () => { mylist.toggle(t.id); paintList(); };
  $("#w-dl").onclick = () => {
    if (!S.plan) { toast("Abonnement requis", "Le téléchargement est réservé aux abonnés.", "err"); return; }
    if (!S.downloads.includes(t.id)) { S.downloads.push(t.id); S.save("downloads"); }
    toast("Téléchargement", t.title + ", disponible hors-ligne (simulation).", "ok");
  };
  $("#w-share").onclick = () => BC.share(t);
  $("[data-back]").onclick = () => history.length > 1 ? history.back() : location.href = "browse.html";

  /* Sidebar */
  const se = $("#side-eps");
  if (se) {
    se.innerHTML = Array.from({ length: eps }, (_, i) => `
      <div class="side-item ${i + 1 === ep ? "current" : ""}" data-ep="${i + 1}">
        <div class="si-thumb"><img src="${esc(t.backdropUrl)}" alt="">
          ${i + 1 === ep ? '<span class="chip chip-gold" style="position:absolute;left:4px;bottom:4px;font-size:12px;padding:3px 7px">En cours</span>' : ""}
        </div>
        <div><div class="si-t">Épisode ${i + 1}</div><div class="si-m">${fmtDur(t.duration || 40)}</div></div>
      </div>`).join("");
    se.addEventListener("click", (e) => {
      const it = e.target.closest("[data-ep]");
      if (it) goWatch(t, parseInt(it.dataset.ep, 10));
    });
  }
  const sr = $("#side-rel");
  const rel = related(t, 8);
  sr.innerHTML = rel.length ? rel.map(x => `
    <div class="side-item" data-id="${esc(x.id)}">
      <div class="si-thumb"><img src="${esc(x.posterUrl)}" alt=""></div>
      <div><div class="si-t">${esc(x.title)}</div><div class="si-m">${esc(TYPE_LABEL[x.type] || "")} · ${esc(x.year || "")}</div></div>
    </div>`).join("") : `<p class="muted small">Aucune suggestion pour le moment.</p>`;
  sr.addEventListener("click", (e) => {
    const it = e.target.closest("[data-id]");
    if (it) goTitle(byId(it.dataset.id));
  });

  /* Démarrage automatique si l'utilisateur vient de cliquer « Lire » */
  paintTime(); paintBuffer(); showUI();
  if (qs("auto") === "1") setTimeout(() => vid.play().catch(() => {}), 300);
})();
