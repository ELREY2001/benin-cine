/* ============================================================
   Back-office Bénin Ciné : publication du catalogue, suivi des
   dossiers, partenaires, messages et réglages.
   Données : localStorage (démonstration). À remplacer par une API.
   ============================================================ */
(function () {
  const { $, $$, esc, S, store, toast, modal, ICON, uid, ago, fmtDur, TYPE_LABEL, byId, all } = BC;

  /* ---------- Image : redimensionnement local (600x900 / 1280x720) ---------- */
  function shrink(file, maxW, maxH, cb) {
    const fr = new FileReader();
    fr.onload = () => {
      const img = new Image();
      img.onload = () => {
        const sr = img.width / img.height, tr = maxW / maxH;
        let sw = img.width, sh = img.height;
        if (sr > tr) sw = img.height * tr; else sh = img.width / tr;
        const sx = (img.width - sw) / 2, sy = (img.height - sh) / 2;
        const c = document.createElement("canvas");
        c.width = maxW; c.height = maxH;
        c.getContext("2d").drawImage(img, sx, sy, sw, sh, 0, 0, maxW, maxH);
        cb(c.toDataURL("image/jpeg", 0.82));
      };
      img.onerror = () => toast("Image", "Fichier illisible.", "err");
      img.src = fr.result;
    };
    fr.readAsDataURL(file);
  }

  function dropzone(label, target, onPick, preview) {
    const dz = document.createElement("div");
    dz.className = "dropzone";
    dz.innerHTML = `${ICON.upload}<div><b>${esc(label)}</b></div>
      <div class="muted small">Glissez une image ici, ou cliquez pour choisir (JPG / PNG)</div>`;
    const input = document.createElement("input");
    input.type = "file"; input.accept = "image/*"; input.style.display = "none";
    dz.appendChild(input);
    dz.onclick = () => input.click();
    input.onchange = () => { if (input.files[0]) onPick(input.files[0]); };
    ["dragenter", "dragover"].forEach(ev => dz.addEventListener(ev, (e) => { e.preventDefault(); dz.classList.add("over"); }));
    ["dragleave", "drop"].forEach(ev => dz.addEventListener(ev, (e) => { e.preventDefault(); dz.classList.remove("over"); }));
    dz.addEventListener("drop", (e) => { const f = e.dataTransfer.files[0]; if (f) onPick(f); });
    target.innerHTML = "";
    target.appendChild(dz);
    if (preview) {
      const p = document.createElement("div");
      p.style.cssText = "margin-top:14px;display:flex;gap:14px;align-items:center";
      p.innerHTML = `<img src="${esc(preview)}" style="width:96px;border-radius:10px;border:1px solid var(--line)">
        <span class="muted small">Aperçu. Image redimensionnée et stockée localement.</span>`;
      target.appendChild(p);
    }
    return dz;
  }

  /* ---------- Routage ---------- */
  const routes = {};
  function route(name, fn) { routes[name] = fn; }
  function go(name) { location.hash = "#/" + name; }

  function renderSide() {
    $("#c-count").textContent = (S.titles || []).length;
    $("#c-sub").textContent = (S.submissions || []).length;
    $("#c-par").textContent = (S.partners || []).length;
    $("#c-msg").textContent = (S.messages || []).length;
    $$("#nav a[data-r]").forEach(a => a.classList.toggle("active", a.dataset.r === current));
  }
  let current = "dashboard";

  function dispatch() {
    current = (location.hash || "#/dashboard").replace("#/", "").split("?")[0];
    const params = new URLSearchParams((location.hash.split("?")[1] || ""));
    const main = $("#main");
    main.innerHTML = "";
    (routes[current] || routes.dashboard)(main, params);
    renderSide();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  window.addEventListener("hashchange", dispatch);

  /* ---------- Tableau de bord ---------- */
  route("dashboard", (main) => {
    const pub = (S.titles || []).filter(t => t.status !== "brouillon").length;
    const views = Object.keys(S.progress).length;
    main.innerHTML = `
      <h1 class="h1">Tableau de bord</h1>
      <p class="lead" style="margin-top:8px">Vue d'ensemble de la plateforme et de l'activité.</p>
      <div class="kpi-grid" style="margin-top:28px">
        <div class="kpi"><span>Titres publiés</span><b>${pub}</b><div class="delta">${(S.titles || []).length} au total</div></div>
        <div class="kpi"><span>Dossiers reçus</span><b>${(S.submissions || []).length}</b><div class="delta">${(S.submissions || []).filter(s => s.statut === "reçu").length} à traiter</div></div>
        <div class="kpi"><span>Partenaires</span><b>${(S.partners || []).length}</b><div class="delta">contacts entrants</div></div>
        <div class="kpi"><span>Lectures suivies</span><b>${views}</b><div class="delta">progression enregistrée</div></div>
      </div>

      <div style="display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:20px">
        <div class="card">
          <h3 class="h3" style="margin-bottom:16px">Actions rapides</h3>
          <div class="stack" style="gap:10px">
            <button class="btn btn-primary btn-block" id="q-add">${ICON.plus} Ajouter un titre au catalogue</button>
            <button class="btn btn-ghost btn-block" id="q-dossiers">${ICON.film} Traiter les dossiers reçus</button>
            <a class="btn btn-ghost btn-block" href="index.html" target="_blank">${ICON.globe} Ouvrir le site public</a>
          </div>
        </div>
        <div class="card">
          <h3 class="h3" style="margin-bottom:16px">Activité récente</h3>
          <div class="stack" style="gap:12px;max-height:280px;overflow:auto">
            ${(S.activity || []).length ? S.activity.slice(0, 12).map(a => `
              <div class="between" style="gap:12px">
                <span class="small">${esc(a.type)} · ${esc(byId(String(a.ref).split("@")[0]) ? byId(String(a.ref).split("@")[0]).title : a.ref)}</span>
                <span class="muted small">${ago(a.ts)}</span>
              </div>`).join("") : `<p class="muted small">Aucune activité pour le moment.</p>`}
          </div>
        </div>
      </div>

      <div class="card" style="margin-top:20px;border-color:rgba(242,167,26,.3)">
        <h3 class="h3" style="margin-bottom:10px">Prochaine étape technique</h3>
        <p class="muted small">
          Cette version fonctionne entièrement dans le navigateur (localStorage) : idéale pour la démonstration.
          Pour la production, branchez ces écrans sur une API (titres, médias, utilisateurs, paiements, DRM)
          et un stockage objet pour les vidéos. Le schéma de données est déjà défini dans
          <code>assets/js/core.js</code>.
        </p>
      </div>`;
    $("#q-add").onclick = () => go("nouveau");
    $("#q-dossiers").onclick = () => go("dossiers");
  });

  /* ---------- Catalogue ---------- */
  route("catalogue", (main) => {
    main.innerHTML = `
      <div class="between" style="flex-wrap:wrap;gap:14px;margin-bottom:22px">
        <div>
          <h1 class="h1">Catalogue</h1>
          <p class="lead" style="margin-top:6px">Titres publiés, brouillons et avant-premières.</p>
        </div>
        <a class="btn btn-primary" href="#/nouveau">${ICON.plus} Ajouter un titre</a>
      </div>
      <div class="toolbar">
        <input class="input" id="cat-q" placeholder="Rechercher un titre…">
        <select class="select" id="cat-f" style="width:auto">
          <option value="">Tous les statuts</option>
          <option value="publie">Publié</option>
          <option value="brouillon">Brouillon</option>
          <option value="avant-premiere">Avant-première</option>
        </select>
      </div>
      <div class="table-wrap">
        <table class="data">
          <thead><tr><th>Affiche</th><th>Titre</th><th>Type</th><th>Année</th><th>Durée</th><th>Statut</th><th>Actions</th></tr></thead>
          <tbody id="cat-body"></tbody>
        </table>
      </div>
      <p class="muted small" style="margin-top:14px">
        Les 12 emplacements de démonstration visibles sur le site public ne sont pas stockés ici :
        désactivez-les dans <a href="#/reglages" style="color:var(--gold)">Réglages</a> une fois votre vrai catalogue en ligne.
      </p>`;

    const body = $("#cat-body");
    function paint() {
      const q = BC.norm($("#cat-q").value), f = $("#cat-f").value;
      let rows = (S.titles || []).slice();
      if (f) rows = rows.filter(t => t.status === f);
      if (q) rows = rows.filter(t => BC.norm(t.title).includes(q));
      if (!rows.length) {
        body.innerHTML = `<tr><td colspan="7" style="padding:40px;text-align:center" class="muted">
          Aucun titre pour le moment. <a href="#/nouveau" style="color:var(--gold)">ajoutez votre premier titre</a>.</td></tr>`;
        return;
      }
      body.innerHTML = rows.map(t => `
        <tr>
          <td><img src="${esc(t.poster || BC.placeholder(t, { w: 120, h: 180 }))}" alt=""></td>
          <td><b>${esc(t.title)}</b>${t.featured ? ' <span class="chip chip-gold">Vedette</span>' : ""}</td>
          <td>${esc(TYPE_LABEL[t.type] || t.type)}</td>
          <td>${esc(t.year || "Non renseigné")}</td>
          <td>${t.duration ? fmtDur(t.duration) : "Non renseigné"}</td>
          <td><select class="tbtn" data-st="${esc(t.id)}">
            <option value="publie" ${t.status === "publie" ? "selected" : ""}>Publié</option>
            <option value="brouillon" ${t.status === "brouillon" ? "selected" : ""}>Brouillon</option>
            <option value="avant-premiere" ${t.status === "avant-premiere" ? "selected" : ""}>Avant-première</option>
          </select></td>
          <td class="row" style="gap:8px">
            <button class="tbtn" data-edit="${esc(t.id)}">Modifier</button>
            <button class="tbtn" data-see="${esc(t.id)}">Voir</button>
            <button class="tbtn danger" data-del="${esc(t.id)}">Supprimer</button>
          </td>
        </tr>`).join("");
      $$("[data-st]").forEach(s => s.onchange = () => {
        const t = (S.titles || []).find(x => x.id === s.dataset.st);
        t.status = s.value; S.save("titles"); toast("Statut mis à jour", t.title, "ok"); paint();
      });
      $$("[data-edit]").forEach(b => b.onclick = () => go("nouveau?id=" + b.dataset.edit));
      $$("[data-see]").forEach(b => b.onclick = () => location.href = "title.html?id=" + encodeURIComponent(b.dataset.see));
      $$("[data-del]").forEach(b => b.onclick = () => {
        const t = (S.titles || []).find(x => x.id === b.dataset.del);
        if (!confirm("Supprimer « " + t.title + " » du catalogue ?")) return;
        S.titles = S.titles.filter(x => x.id !== t.id); S.save("titles"); paint(); renderSide();
        toast("Titre supprimé", t.title, "ok");
      });
    }
    $("#cat-q").addEventListener("input", BC.debounce(paint, 150));
    $("#cat-f").addEventListener("change", paint);
    paint();
  });

  /* ---------- Formulaire titre ---------- */
  route("nouveau", (main, params) => {
    const id = params.get("id");
    const t = id ? (S.titles || []).find(x => x.id === id) : null;
    main.innerHTML = `
      <div class="between" style="flex-wrap:wrap;gap:14px;margin-bottom:22px">
        <div>
          <h1 class="h1">${t ? "Modifier le titre" : "Ajouter un titre"}</h1>
          <p class="lead" style="margin-top:6px">${t ? esc(t.title) : "Affiche, métadonnées, médias et publication."}</p>
        </div>
        <a class="btn btn-ghost" href="#/catalogue">${ICON.back} Retour au catalogue</a>
      </div>

      <div class="form-card">
        <form id="tf" class="stack">
          <div class="two">
            <div class="field"><label for="t-title">Titre <span class="req">*</span></label>
              <input class="input" id="t-title" value="${esc((t && t.title) || "")}" required></div>
            <div class="field"><label for="t-type">Type <span class="req">*</span></label>
              <select class="select" id="t-type">
                ${Object.keys(TYPE_LABEL).map(k => `<option value="${k}" ${t && t.type === k ? "selected" : ""}>${TYPE_LABEL[k]}</option>`).join("")}
              </select></div>
          </div>

          <div class="three">
            <div class="field"><label for="t-year">Année</label><input class="input" id="t-year" type="number" min="1950" max="2100" value="${esc((t && t.year) || new Date().getFullYear())}"></div>
            <div class="field"><label for="t-dur">Durée (min) ou épisode</label><input class="input" id="t-dur" type="number" min="1" value="${esc((t && t.duration) || "")}"></div>
            <div class="field"><label for="t-eps">Nombre d'épisodes</label><input class="input" id="t-eps" type="number" min="0" value="${esc((t && t.episodes) || "")}"></div>
          </div>

          <div class="two">
            <div class="field"><label for="t-genres">Genres (séparés par des virgules)</label>
              <input class="input" id="t-genres" value="${esc(((t && t.genres) || []).join(", "))}" placeholder="Drame, Comédie"></div>
            <div class="field"><label for="t-coll">Collection / rubrique</label>
              <input class="input" id="t-coll" value="${esc((t && t.collection) || "")}" placeholder="Films, Séries, Héritage…"></div>
          </div>

          <div class="two">
            <div class="field"><label for="t-langs">Langues audio</label>
              <input class="input" id="t-langs" value="${esc(((t && t.languages) || ["Français"]).join(", "))}"></div>
            <div class="field"><label for="t-subs">Sous-titres</label>
              <input class="input" id="t-subs" value="${esc(((t && t.subtitles) || ["Français"]).join(", "))}"></div>
          </div>

          <div class="two">
            <div class="field"><label for="t-mat">Classification</label>
              <select class="select" id="t-mat">
                ${["Tous", "10", "12", "16", "18"].map(v => `<option ${String((t && t.maturity) || "10") === v ? "selected" : ""}>${v}</option>`).join("")}
              </select></div>
            <div class="field"><label for="t-status">Statut</label>
              <select class="select" id="t-status">
                <option value="publie" ${t && t.status === "publie" ? "selected" : ""}>Publié</option>
                <option value="brouillon" ${t && t.status === "brouillon" ? "selected" : ""}>Brouillon (invisible sur le site)</option>
                <option value="avant-premiere" ${t && t.status === "avant-premiere" ? "selected" : ""}>Avant-première</option>
              </select></div>
          </div>

          <div class="field"><label for="t-syn">Synopsis</label>
            <textarea class="textarea" id="t-syn" placeholder="Résumé visible sur la fiche publique.">${esc((t && t.synopsis) || "")}</textarea></div>

          <div class="field"><label for="t-video">Fichier vidéo (URL)</label>
            <input class="input" id="t-video" value="${esc((t && t.video) || "")}" placeholder="https://…/film.mp4 ou assets/video/…">
            <span class="muted small">Les gros fichiers doivent être déposés sur un stockage objet (S3, CDN) : collez ici l'URL. Sans URL, le lecteur affiche le teaser de la plateforme.</span></div>

          <div class="two">
            <div class="field"><label>Affiche (2:3)</label><div id="dz-p"></div></div>
            <div class="field"><label>Image de fond (16:9)</label><div id="dz-b"></div></div>
          </div>

          <label class="check"><input type="checkbox" id="t-feat" ${t && t.featured ? "checked" : ""}><span>Mettre en avant sur la page d'accueil</span></label>

          <div class="row" style="gap:12px;flex-wrap:wrap">
            <button class="btn btn-primary btn-lg" type="submit">${t ? "Enregistrer" : "Publier le titre"}</button>
            <a class="btn btn-ghost" href="#/catalogue">Annuler</a>
          </div>
        </form>
      </div>`;

    const draft = t ? Object.assign({}, t) : { poster: "", backdrop: "", id: uid("t") };
    function wirePoster() {
      dropzone("Affiche du titre", $("#dz-p"), (f) => shrink(f, 600, 900, (d) => {
        draft.poster = d; wirePoster(); toast("Affiche importée", "600×900.", "ok");
      }), draft.poster);
    }
    function wireBackdrop() {
      dropzone("Image de fond", $("#dz-b"), (f) => shrink(f, 1280, 720, (d) => {
        draft.backdrop = d; wireBackdrop(); toast("Fond importé", "1280×720.", "ok");
      }), draft.backdrop);
    }
    wirePoster(); wireBackdrop();

    $("#tf").addEventListener("submit", (e) => {
      e.preventDefault();
      const title = $("#t-title").value.trim();
      if (!title) { toast("Titre requis", "", "err"); return; }
      const rec = {
        id: draft.id,
        title,
        type: $("#t-type").value,
        year: parseInt($("#t-year").value, 10) || new Date().getFullYear(),
        duration: parseInt($("#t-dur").value, 10) || 0,
        episodes: parseInt($("#t-eps").value, 10) || 0,
        genres: $("#t-genres").value.split(",").map(s => s.trim()).filter(Boolean),
        languages: ($("#t-langs").value || "Français").split(",").map(s => s.trim()).filter(Boolean),
        subtitles: ($("#t-subs").value || "Français").split(",").map(s => s.trim()).filter(Boolean),
        maturity: $("#t-mat").value,
        status: $("#t-status").value,
        collection: $("#t-coll").value.trim(),
        synopsis: $("#t-syn").value.trim(),
        video: $("#t-video").value.trim(),
        poster: draft.poster || "",
        backdrop: draft.backdrop || "",
        featured: $("#t-feat").checked,
        demo: false,
        updated: Date.now()
      };
      S.titles = S.titles || [];
      const i = S.titles.findIndex(x => x.id === rec.id);
      if (i >= 0) S.titles[i] = Object.assign({}, S.titles[i], rec);
      else S.titles.unshift(rec);
      S.save("titles");
      BC.log("publication", rec.id);
      toast(i >= 0 ? "Titre mis à jour" : "Titre publié", title, "ok");
      go("catalogue");
    });
  });

  /* ---------- Dossiers ---------- */
  route("dossiers", (main) => {
    const subs = S.submissions || [];
    main.innerHTML = `
      <h1 class="h1">Dossiers reçus</h1>
      <p class="lead" style="margin-top:6px;margin-bottom:22px">Projets déposés depuis la page Studio.</p>
      ${subs.length ? `<div class="table-wrap"><table class="data">
        <thead><tr><th>N°</th><th>Projet</th><th>Porteur</th><th>Type</th><th>Déposé</th><th>Statut</th><th></th></tr></thead>
        <tbody>${subs.map(s => `
          <tr>
            <td><b>${esc(s.id)}</b></td>
            <td>${esc(s.titre || "Non renseigné")}</td>
            <td>${esc(s.nom || "Non renseigné")}<div class="muted small">${esc(s.email || "")}</div></td>
            <td>${esc(s.type || "Non renseigné")}</td>
            <td>${ago(s.ts)}</td>
            <td><select class="tbtn" data-st="${esc(s.id)}">
              ${["reçu", "en lecture", "audition", "retenu", "refusé"].map(v => `<option ${s.statut === v ? "selected" : ""}>${v}</option>`).join("")}
            </select></td>
            <td><button class="tbtn" data-open="${esc(s.id)}">Ouvrir</button></td>
          </tr>`).join("")}</tbody>
      </table></div>` : `<div class="empty-state"><h3 class="h3">Aucun dossier pour le moment</h3>
        <p class="small">Les dépôts faits sur la page Studio apparaîtront ici.</p>
        <a class="btn btn-ghost btn-sm" href="studio.html" style="margin-top:14px">Ouvrir le formulaire</a></div>`}`;

    $$("[data-st]").forEach(s => s.onchange = () => {
      const d = S.submissions.find(x => x.id === s.dataset.st);
      d.statut = s.value; S.save("submissions"); toast("Statut", d.id + " → " + s.value, "ok");
    });
    $$("[data-open]").forEach(b => b.onclick = () => {
      const d = S.submissions.find(x => x.id === b.dataset.open);
      modal(`
        <p class="eyebrow">Dossier ${esc(d.id)}</p>
        <h3 class="h2" style="margin:10px 0 18px">${esc(d.titre || "Sans titre")}</h3>
        <div class="stack" style="gap:14px;font-size:14.5px">
          ${[["Porteur", d.nom], ["Structure", d.structure], ["Rôle", d.role], ["Email", d.email],
             ["Téléphone", d.tel], ["Ville", d.ville], ["Format", d.type], ["Genre", d.genre],
             ["Durée / épisodes", d.duree], ["Langues", d.langues], ["Stade", d.stade],
             ["Besoins", (d.besoins || []).join(", ")], ["Budget", d.budget], ["Calendrier", d.calendrier],
             ["Lien", d.lien]].filter(x => x[1]).map(([k, v]) => `
            <div><span class="muted small">${esc(k)}</span><div>${esc(v)}</div></div>`).join("")}
          ${d.synopsis ? `<div><span class="muted small">Synopsis</span><p style="white-space:pre-wrap">${esc(d.synopsis)}</p></div>` : ""}
          ${d.intention ? `<div><span class="muted small">Note d'intention</span><p style="white-space:pre-wrap">${esc(d.intention)}</p></div>` : ""}
        </div>
        <div class="row" style="gap:10px;margin-top:22px">
          <a class="btn btn-primary btn-sm" href="mailto:${esc(d.email || "")}">${ICON.mail} Répondre</a>
          <button class="btn btn-ghost btn-sm" data-close>Fermer</button>
        </div>`);
    });
  });

  /* ---------- Partenaires ---------- */
  route("partenaires", (main) => {
    const list = S.partners || [];
    main.innerHTML = `
      <h1 class="h1">Partenaires</h1>
      <p class="lead" style="margin-top:6px;margin-bottom:22px">Demandes reçues depuis la page Studio.</p>
      ${list.length ? `<div class="table-wrap"><table class="data">
        <thead><tr><th>Contact</th><th>Structure</th><th>Objet</th><th>Reçu</th><th></th></tr></thead>
        <tbody>${list.map(p => `
          <tr><td><b>${esc(p.nom)}</b><div class="muted small">${esc(p.mail)} ${esc(p.tel || "")}</div></td>
          <td>${esc(p.org || "Non renseignée")}</td><td>${esc(p.objet)}</td><td>${ago(p.ts)}</td>
          <td><a class="tbtn" href="mailto:${esc(p.mail)}">Répondre</a></td></tr>`).join("")}</tbody>
      </table></div>` : `<div class="empty-state"><h3 class="h3">Aucune demande</h3></div>`}`;
  });

  /* ---------- Messages ---------- */
  route("messages", (main) => {
    const list = S.messages || [];
    main.innerHTML = `
      <h1 class="h1">Messages</h1>
      <p class="lead" style="margin-top:6px;margin-bottom:22px">Contacts reçus depuis la page « Le projet ».</p>
      ${list.length ? `<div class="stack" style="gap:14px">${list.map(m => `
        <div class="card" style="padding:20px">
          <div class="between" style="flex-wrap:wrap;gap:10px">
            <b>${esc(m.nom)}, ${esc(m.objet)}</b><span class="muted small">${ago(m.ts)}</span>
          </div>
          <p class="muted small" style="margin-top:8px">${esc(m.message)}</p>
          <a class="btn btn-ghost btn-sm" href="mailto:${esc(m.mail)}" style="margin-top:12px">${ICON.mail} Répondre</a>
        </div>`).join("")}</div>` : `<div class="empty-state"><h3 class="h3">Aucun message</h3></div>`}`;
  });

  /* ---------- Réglages ---------- */
  route("reglages", (main) => {
    let bytes = 0;
    Object.keys(localStorage).filter(k => k.startsWith("bc:")).forEach(k => bytes += (localStorage.getItem(k) || "").length * 2);
    main.innerHTML = `
      <h1 class="h1">Réglages</h1>
      <p class="lead" style="margin-top:6px;margin-bottom:26px">Contenu, données et export.</p>

      <div class="card" style="margin-bottom:20px">
        <h3 class="h3" style="margin-bottom:8px">Contenu de démonstration</h3>
        <p class="muted small" style="margin-bottom:16px">
          Les 12 emplacements de démonstration illustrent la structure du catalogue.
          Désactivez-les quand vos vrais titres sont en ligne.
        </p>
        <label class="check"><input type="checkbox" id="r-demo" ${S.showDemo ? "checked" : ""}><span>Afficher les emplacements de démonstration sur le site public</span></label>
      </div>

      <div class="card" style="margin-bottom:20px">
        <h3 class="h3" style="margin-bottom:8px">Données</h3>
        <p class="muted small" style="margin-bottom:16px">Stockage local utilisé : ${(bytes / 1024).toFixed(1)} Ko.</p>
        <div class="row" style="gap:12px;flex-wrap:wrap">
          <button class="btn btn-ghost btn-sm" id="r-export">${ICON.download} Exporter (JSON)</button>
          <button class="btn btn-ghost btn-sm" id="r-import">${ICON.upload} Importer (JSON)</button>
          <button class="btn btn-ghost btn-sm" id="r-reset" style="color:#FF8A90">${ICON.trash} Réinitialiser toutes les données</button>
        </div>
        <input type="file" id="r-file" accept="application/json" style="display:none">
      </div>

      <div class="card">
        <h3 class="h3" style="margin-bottom:10px">Passage en production</h3>
        <ul class="stack" style="gap:10px;font-size:14.5px;color:var(--text-2)">
          <li>· Remplacer le stockage local par une API (titres, médias, comptes, abonnements).</li>
          <li>· Brancher les paiements : MTN MoMo, Moov, Orange Money, Wave, cartes.</li>
          <li>· Encoder les vidéos en HLS/DASH adaptatif et protéger les flux (DRM/token signé).</li>
          <li>· Ajouter l'authentification réelle, les rôles (admin, éditeur, ayant droit, partenaire).</li>
          <li>· Activer l'application mobile (téléchargement hors-ligne) et la TV (Android TV, Chromecast).</li>
        </ul>
      </div>`;

    $("#r-demo").onchange = () => { S.showDemo = $("#r-demo").checked; S.save("showDemo"); toast("Réglage enregistré", "", "ok"); };
    $("#r-export").onclick = () => {
      const data = {};
      Object.keys(localStorage).filter(k => k.startsWith("bc:")).forEach(k => data[k] = JSON.parse(localStorage.getItem(k)));
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "benincine-donnees-" + new Date().toISOString().slice(0, 10) + ".json";
      a.click();
      toast("Exporté", "Fichier JSON téléchargé.", "ok");
    };
    $("#r-import").onclick = () => $("#r-file").click();
    $("#r-file").onchange = (e) => {
      const f = e.target.files[0]; if (!f) return;
      const fr = new FileReader();
      fr.onload = () => {
        try {
          const data = JSON.parse(fr.result);
          Object.keys(data).forEach(k => localStorage.setItem(k, JSON.stringify(data[k])));
          toast("Importé", "Rechargez la page pour appliquer.", "ok");
          setTimeout(() => location.reload(), 900);
        } catch (err) { toast("Fichier invalide", "", "err"); }
      };
      fr.readAsText(f);
    };
    $("#r-reset").onclick = () => {
      if (!confirm("Supprimer toutes les données locales (catalogue, dossiers, réglages) ?")) return;
      store.clearAll(); location.reload();
    };
  });

  /* ---------- Démarrage ---------- */
  if (!location.hash) location.hash = "#/dashboard";
  dispatch();
})();
