/* Fiche titre : informations, actions, épisodes, recommandations */
(function () {
  const { $, $$, esc, mountShell, byId, all, related, cardHTML, bindCards, mylist, progress,
          ICON, fmtDur, TYPE_LABEL, toast, modal, goWatch, qs, S, share, fmtMoney } = BC;
  mountShell("browse");

  const id = qs("id");
  const t = byId(id);
  const page = $("#page");

  if (!t) {
    page.innerHTML = `<div class="wrap" style="padding:calc(var(--nav-h) + 80px) 0 120px">
      <div class="empty-state"><h3 class="h3">Titre introuvable</h3>
      <p class="small">Ce contenu n'existe pas ou a été retiré du catalogue.</p>
      <a class="btn btn-primary btn-sm" href="browse.html" style="margin-top:14px">Voir le catalogue</a></div></div>`;
    return;
  }

  document.title = t.title + " · Bénin Ciné";
  const inList = mylist.has(t.id);
  const p = progress.get(t.id);
  const eps = t.episodes ? Math.max(1, Math.round(t.episodes)) : 0;
  const isSeries = /serie|jeunesse/.test(t.type) && eps > 0;

  page.innerHTML = `
  <section class="title-hero">
    <div class="bg"><img src="${esc(t.backdropUrl)}" alt=""></div>
    <div class="wrap" style="position:relative;z-index:2">
      <div class="inner">
        <div class="title-poster"><img src="${esc(t.posterUrl)}" alt="${esc(t.title)}"></div>
        <div class="title-info">
          <p class="eyebrow">${esc(TYPE_LABEL[t.type] || "Titre")}${t.collection ? " · " + esc(t.collection) : ""}</p>
          <h1 style="margin-top:12px">${esc(t.title)}</h1>
          <div class="title-meta">
            <span class="maturity ${/tous/i.test(String(t.maturity)) ? "kids" : ""}">${esc(t.maturity)}</span>
            ${t.year ? `<span class="muted small">${esc(t.year)}</span>` : ""}
            ${t.duration ? `<span class="muted small">${fmtDur(t.duration)}${isSeries ? " / épisode" : ""}</span>` : ""}
            ${isSeries ? `<span class="muted small">${eps} épisodes</span>` : ""}
            ${t.demo ? '<span class="chip chip-demo">Emplacement de démonstration</span>' : '<span class="chip chip-green">Publié</span>'}
          </div>
          <p class="lead" style="max-width:64ch">${t.synopsis ? esc(t.synopsis) : "<i>Synopsis à renseigner. Rendez-vous dans le back-office pour compléter la fiche de ce titre.</i>"}</p>
          <div class="title-actions">
            <button class="btn btn-primary btn-lg" data-play>${ICON.play} ${p && p.pct > 1 && p.pct < 98 ? "Reprendre" : "Lecture"}</button>
            <button class="btn btn-ghost btn-lg" data-list>${inList ? ICON.check + " Dans ma liste" : ICON.plus + " Ma liste"}</button>
            <button class="btn btn-ghost btn-lg" data-trailer>${ICON.film} Bande-annonce</button>
            <button class="btn btn-ghost btn-lg" data-dl>${ICON.download} Télécharger</button>
            <button class="btn btn-ghost btn-lg" data-share>${ICON.share}</button>
            <button class="btn btn-ghost btn-lg" data-party>${ICON.users} Ciné-club</button>
            <button class="btn btn-outline btn-lg" data-support>${ICON.heart} Soutenir</button>
          </div>
          ${p && p.pct > 1 && p.pct < 98 ? `<div style="margin-top:16px;max-width:340px">
            <div class="pbar" style="position:static;height:5px"><i style="width:${p.pct}%"></i></div>
            <span class="small muted">${Math.round(p.pct)} % visionné</span></div>` : ""}
        </div>
      </div>
    </div>
  </section>

  <section class="section" style="padding-top:clamp(24px,3vw,38px)">
    <div class="wrap" class="split split-side-r">
      <div>
        ${isSeries ? `
        <div id="episodes">
          <div class="between" style="margin-bottom:16px;flex-wrap:wrap;gap:12px">
            <h2 class="h2">Épisodes</h2>
            <div class="season-bar">
              <select class="select" style="width:auto" id="season"><option>Saison 1</option></select>
              <span class="chip">${eps} épisodes · ${fmtDur(t.duration)} / ép.</span>
            </div>
          </div>
          <div class="ep-list" id="eplist"></div>
        </div>` : ""}

        <div style="margin-top:${isSeries ? "44px" : "0"}">
          <h2 class="h2" style="margin-bottom:16px">Informations</h2>
          <div class="card" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:20px">
            <div><span class="muted small">Type</span><b style="display:block">${esc(TYPE_LABEL[t.type] || t.type)}</b></div>
            <div><span class="muted small">Année</span><b style="display:block">${esc(t.year || "Non renseigné")}</b></div>
            <div><span class="muted small">Durée</span><b style="display:block">${t.duration ? fmtDur(t.duration) : "Non renseigné"}</b></div>
            <div><span class="muted small">Classification</span><b style="display:block">${esc(t.maturity)}</b></div>
            <div><span class="muted small">Langues</span><b style="display:block">${esc((t.languages || []).join(", ") || "Non renseigné")}</b></div>
            <div><span class="muted small">Sous-titres</span><b style="display:block">${esc((t.subtitles || []).join(", ") || "Non renseigné")}</b></div>
            <div><span class="muted small">Genres</span><b style="display:block">${esc((t.genres || []).join(", ") || "Non renseigné")}</b></div>
            <div><span class="muted small">Statut</span><b style="display:block">${t.demo ? "Emplacement de démonstration" : (t.status === "avant-premiere" ? "Avant-première" : "Publié")}</b></div>
          </div>
        </div>

        <div style="margin-top:44px">
          <h2 class="h2" style="margin-bottom:16px">Dans la même veine</h2>
          <div class="reco-grid" id="reco"></div>
        </div>
      </div>

      <aside>
        <div class="card">
          <h3 class="h3" style="margin-bottom:10px">Géré par Bénin Ciné</h3>
          <p class="muted small">
            Cette fiche est alimentée par le back-office : affiche, bande-annonce, fichier vidéo,
            synopsis, générique et droits.
          </p>
          <a class="btn btn-ghost btn-sm btn-block" href="admin.html?edit=${encodeURIComponent(t.id)}" style="margin-top:16px">${ICON.gear} Modifier la fiche</a>
        </div>
        <div class="card" style="margin-top:18px">
          <h3 class="h3" style="margin-bottom:10px">Vous êtes l'ayant droit ?</h3>
          <p class="muted small">Tableau de bord d'audience, revenus et contrats : espace dédié aux producteurs et partenaires.</p>
          <a class="btn btn-outline btn-sm btn-block" href="studio.html#partenaires" style="margin-top:16px">Espace partenaires</a>
        </div>
      </aside>
    </div>
  </section>`;

  /* ---------- Épisodes ---------- */
  const eplist = $("#eplist");
  if (eplist) {
    eplist.innerHTML = Array.from({ length: eps }, (_, i) => `
      <div class="ep" data-ep="${i + 1}">
        <div class="ep-n">${i + 1}</div>
        <div class="ep-thumb"><img src="${esc(t.backdropUrl)}" alt=""></div>
        <div>
          <div class="ep-t">Épisode ${i + 1}</div>
          <div class="ep-d muted small">Résumé de l'épisode à renseigner depuis le back-office.</div>
        </div>
        <div class="ep-dur">${fmtDur(t.duration || 40)}</div>
      </div>`).join("");
    eplist.addEventListener("click", (e) => {
      const row = e.target.closest(".ep");
      if (row) startPlay(parseInt(row.dataset.ep, 10));
    });
  }

  /* ---------- Recommandations ---------- */
  const reco = $("#reco");
  const rel = related(t, 12);
  reco.innerHTML = rel.length ? rel.map(cardHTML).join("")
    : `<p class="muted small">Aucun autre titre de ce type pour le moment.</p>`;
  if (rel.length) bindCards(reco);

  /* ---------- Actions ---------- */
  function startPlay(ep) {
    if (!BC.requirePlan()) return;
    goWatch(t, ep);
  }
  page.querySelector("[data-play]").onclick = () => startPlay();
  page.querySelector("[data-list]").onclick = (e) => {
    const on = mylist.toggle(t.id);
    e.currentTarget.innerHTML = on ? ICON.check + " Dans ma liste" : ICON.plus + " Ma liste";
  };
  page.querySelector("[data-trailer]").onclick = () => modal(`
    <h3 class="h3">Bande-annonce</h3>
    <p class="muted small" style="margin:10px 0 18px">
      ${t.video ? "Extrait attaché à ce titre." : "Aucune bande-annonce n'a encore été déposée pour ce titre. Voici le teaser de la plateforme."}
    </p>
    <video controls playsinline style="width:100%;border-radius:12px;background:#000" src="${esc(t.video || "assets/video/teaser-benincine.mp4")}"></video>
    <div class="row" style="gap:10px;margin-top:18px"><button class="btn btn-ghost btn-sm" data-close>Fermer</button></div>`);
    const mv = document.querySelector(".modal video");
    if (mv) mv.addEventListener("error", () => {
      mv.insertAdjacentHTML("afterend", `<div class="card center" style="padding:28px">
        <h3 class="h3">Bande-annonce à venir</h3>
        <p class="muted small" style="margin-top:8px">Aucun extrait déposé pour ce titre pour le moment.</p></div>`);
      mv.remove();
    });

  page.querySelector("[data-dl]").onclick = () => {
    if (!S.plan) { toast("Abonnement requis", "Le téléchargement est réservé aux abonnés.", "err"); return; }
    if (S.downloads.includes(t.id)) { toast("Déjà téléchargé", t.title, "ok"); return; }
    S.downloads.push(t.id); S.save("downloads");
    toast("Téléchargement lancé", t.title + ", disponible hors-ligne (simulation).", "ok");
  };
  page.querySelector("[data-share]").onclick = () => share(t);
  page.querySelector("[data-party]").onclick = () => {
    const code = Math.random().toString(36).slice(2, 8).toUpperCase();
    modal(`
      <h3 class="h3">Ciné-club virtuel</h3>
      <p class="muted small" style="margin:10px 0 18px">Partagez ce code : vos proches regardent en synchronisé et discutent en direct.</p>
      <div style="font-size:38px;font-weight:900;letter-spacing:.14em;color:var(--gold);text-align:center;padding:22px;border:1px dashed var(--line-2);border-radius:14px">${code}</div>
      <p class="muted small" style="margin-top:14px">Fonction à relier au serveur de synchronisation (étape back-end).</p>
      <div class="row" style="gap:10px;margin-top:18px"><button class="btn btn-ghost btn-sm" data-close>Fermer</button></div>`);
  };
  page.querySelector("[data-support]").onclick = () => modal(`
    <h3 class="h3">Soutenir les créateurs</h3>
    <p class="muted small" style="margin:10px 0 18px">Un pourboire reversé à l'équipe du titre (hors abonnement). Paiement Mobile Money.</p>
    <div class="stack">
      ${[500, 1000, 2000, 5000].map(v => `<button class="btn btn-ghost" data-amount="${v}">${fmtMoney(v)}</button>`).join("")}
    </div>
    <div class="row" style="gap:10px;margin-top:18px"><button class="btn btn-ghost btn-sm" data-close>Annuler</button></div>`);
  document.addEventListener("click", (e) => {
    const a = e.target.closest("[data-amount]");
    if (a) { $(".modal").classList.remove("open"); document.body.classList.remove("no-scroll"); toast("Merci !", "Soutien de " + fmtMoney(+a.dataset.amount) + " enregistré (simulation).", "ok"); }
  });
})();
