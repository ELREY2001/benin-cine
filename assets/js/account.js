/* Mon espace : profils, reprise, liste, téléchargements, abonnement, paramètres */
(function () {
  const { $, $$, esc, mountShell, S, byId, all, cardHTML, bindCards, progress, mylist,
          toast, modal, ICON, fmtDur, fmtMoney, fmtTime, store, uid, ago } = BC;
  mountShell("account");

  if (!S.user) {
    toast("Connexion requise", "Créez un compte pour accéder à votre espace.", "err");
    setTimeout(() => location.href = "auth.html?next=account.html", 900);
  }

  const PLAN_NAMES = { mobile: "Mobile", standard: "Standard", premium: "Premium", mecene: "Mécène" };
  const PLAN_PRICE = { mobile: 1500, standard: 3500, premium: 5500, mecene: 15000 };

  $("#hello").textContent = (S.user && S.user.name) || "vous";
  $("#plan-chip").textContent = S.plan ? "Formule " + (PLAN_NAMES[S.plan] || S.plan) : "Aucun abonnement";
  $("#plan-chip").className = "chip " + (S.plan ? "chip-gold" : "chip-red");

  /* ---------------- Profils ---------------- */
  const AVATARS = [
    "linear-gradient(140deg,#F2A71A,#B8711F)", "linear-gradient(140deg,#E0131F,#720507)",
    "linear-gradient(140deg,#0E8A4C,#075831)", "linear-gradient(140deg,#7A6BFF,#3B2F8F)",
    "linear-gradient(140deg,#FF8A3D,#C24A0A)"
  ];
  function renderProfiles() {
    $("#profiles").innerHTML = S.profiles.map(p => `
      <div class="member" style="padding:18px">
        <div class="av" style="background:${AVATARS[p.avatar % AVATARS.length]};${p.id === S.profile ? "outline:2px solid var(--gold);outline-offset:3px" : ""}">${esc(p.name[0].toUpperCase())}</div>
        <b>${esc(p.name)}</b>
        <span>${p.kids ? "Profil enfant" : "Adulte"}</span>
        <div class="row" style="gap:8px;justify-content:center;margin-top:12px">
          <button class="tbtn" data-use="${esc(p.id)}">${p.id === S.profile ? "Actif" : "Utiliser"}</button>
          <button class="tbtn" data-edit="${esc(p.id)}">${ICON.gear}</button>
          ${S.profiles.length > 1 ? `<button class="tbtn danger" data-del="${esc(p.id)}">${ICON.trash}</button>` : ""}
        </div>
      </div>`).join("") + (S.profiles.length < 5 ? "" : "");
    $$("[data-use]").forEach(b => b.onclick = () => { S.profile = b.dataset.use; S.save("profile"); renderAll(); });
    $$("[data-edit]").forEach(b => b.onclick = () => editProfile(b.dataset.edit));
    $$("[data-del]").forEach(b => b.onclick = () => {
      const p = S.profiles.find(x => x.id === b.dataset.del);
      if (!confirm("Supprimer le profil « " + p.name + " » ?")) return;
      S.profiles = S.profiles.filter(x => x.id !== p.id);
      if (S.profile === p.id) S.profile = S.profiles[0].id;
      S.save("profiles"); S.save("profile"); renderAll();
    });
  }
  function editProfile(id) {
    const p = S.profiles.find(x => x.id === id);
    modal(`
      <h3 class="h3">Modifier le profil</h3>
      <div class="stack" style="margin-top:18px">
        <div class="field"><label>Nom</label><input class="input" id="pf-name" value="${esc(p.name)}"></div>
        <div class="field"><label>Avatar</label>
          <div class="row" style="gap:10px;flex-wrap:wrap" id="pf-av">
            ${AVATARS.map((a, i) => `<button class="av-pick" data-i="${i}" style="width:44px;height:44px;border-radius:50%;background:${a};border:2px solid ${i === p.avatar ? "var(--gold)" : "transparent"}"></button>`).join("")}
          </div>
        </div>
        <label class="check"><input type="checkbox" id="pf-kids" ${p.kids ? "checked" : ""}><span>Profil enfant (catalogue filtré, lecture automatique désactivée)</span></label>
        <div class="row" style="gap:10px"><button class="btn btn-primary" id="pf-save">Enregistrer</button><button class="btn btn-ghost" data-close>Annuler</button></div>
      </div>`);
    let av = p.avatar;
    $$("#pf-av .av-pick").forEach(b => b.onclick = () => {
      av = +b.dataset.i;
      $$("#pf-av .av-pick").forEach(x => x.style.borderColor = "transparent");
      b.style.borderColor = "var(--gold)";
    });
    $("#pf-save").onclick = () => {
      const n = $("#pf-name").value.trim();
      if (!n) { toast("Nom requis", "", "err"); return; }
      p.name = n; p.avatar = av; p.kids = $("#pf-kids").checked;
      S.save("profiles");
      $(".modal").classList.remove("open"); document.body.classList.remove("no-scroll");
      renderAll(); toast("Profil mis à jour", n, "ok");
    };
  }
  $("#add-profile").onclick = () => {
    if (S.profiles.length >= 5) { toast("Limite atteinte", "5 profils maximum.", "err"); return; }
    const p = { id: uid("p"), name: "Nouveau profil", avatar: S.profiles.length % AVATARS.length, kids: false };
    S.profiles.push(p); S.save("profiles"); renderAll(); editProfile(p.id);
  };

  /* ---------------- Reprendre / liste / téléchargements ---------------- */
  function renderResume() {
    const items = progress.all().map(x => ({ t: byId(x.id.split("@")[0]), p: x.p, id: x.id })).filter(x => x.t && x.p.pct > 1);
    $("#resume-list").innerHTML = items.length ? items.slice(0, 8).map(({ t, p }) => `
      <div class="side-item" data-id="${esc(t.id)}">
        <div class="si-thumb"><img src="${esc(t.posterUrl)}" alt="">
          <div class="pbar" style="position:absolute;left:6px;right:6px;bottom:6px;height:3px"><i style="width:${p.pct}%"></i></div>
        </div>
        <div style="flex:1">
          <div class="si-t">${esc(t.title)}</div>
          <div class="si-m">${Math.round(p.pct)} % · ${ago(p.ts || Date.now())}</div>
        </div>
        <button class="btn btn-primary btn-sm" data-play="${esc(t.id)}">Reprendre</button>
      </div>`).join("") : `<p class="muted small">Aucune lecture en cours. Lancez un titre depuis le <a href="browse.html" style="color:var(--gold)">catalogue</a>.</p>`;
    $$("#resume-list [data-play]").forEach(b => b.onclick = (e) => {
      e.stopPropagation(); BC.goWatch(byId(b.dataset.play));
    });
    $$("#resume-list .side-item").forEach(it => it.onclick = () => BC.goTitle(byId(it.dataset.id)));
  }
  function renderList() {
    const items = S.list.map(byId).filter(Boolean);
    $("#list-grid").innerHTML = items.length ? items.map(cardHTML).join("") : `<p class="muted small" style="grid-column:1/-1">Votre liste est vide.</p>`;
    if (items.length) bindCards($("#list-grid"));
  }
  function renderDl() {
    const items = S.downloads.map(byId).filter(Boolean);
    $("#dl-grid").innerHTML = items.length ? items.map(cardHTML).join("")
      : `<p class="muted small" style="grid-column:1/-1">Aucun téléchargement. Utilisez le bouton « Télécharger » sur une fiche.</p>`;
    if (items.length) bindCards($("#dl-grid"));
  }

  /* ---------------- Abonnement ---------------- */
  function renderPlan() {
    const box = $("#plan-box");
    if (!S.plan) {
      box.innerHTML = `<p class="muted small">Aucune formule active.</p>
        <a class="btn btn-primary" href="plans.html" style="margin-top:14px">Choisir une formule</a>`;
      return;
    }
    const price = PLAN_PRICE[S.plan] || 0;
    const next = new Date(Date.now() + 30 * 864e5);
    box.innerHTML = `
      <div class="between" style="flex-wrap:wrap;gap:18px">
        <div>
          <div class="row" style="gap:10px"><span class="chip chip-gold">${esc(PLAN_NAMES[S.plan] || S.plan)}</span><span class="chip">Actif</span></div>
          <p class="muted small" style="margin-top:12px">${fmtMoney(price)} / mois · prochain prélèvement le ${next.toLocaleDateString("fr-FR")}</p>
        </div>
        <div class="row" style="gap:10px;flex-wrap:wrap">
          <a class="btn btn-ghost btn-sm" href="plans.html">Changer de formule</a>
          <button class="btn btn-ghost btn-sm" id="cancel">Annuler l'abonnement</button>
        </div>
      </div>
      <hr class="gold-rule" style="margin:22px 0">
      <h3 class="h3" style="margin-bottom:12px">Moyen de paiement</h3>
      <div class="row" style="gap:12px;flex-wrap:wrap">
        <span class="pay-pill"><span class="dot" style="background:#FFCC00"></span>MTN MoMo · ${esc((S.user && S.user.phone) || "+229 •• •• •• 00")}</span>
        <button class="btn btn-ghost btn-sm">Modifier</button>
      </div>
      <h3 class="h3" style="margin:26px 0 12px">Dernières factures</h3>
      <div class="table-wrap"><table class="data">
        <thead><tr><th>Date</th><th>Formule</th><th>Montant</th><th>Statut</th></tr></thead>
        <tbody>
          ${[0, 1, 2].map(i => {
            const d = new Date(Date.now() - i * 30 * 864e5);
            return `<tr><td>${d.toLocaleDateString("fr-FR")}</td><td>${esc(PLAN_NAMES[S.plan] || "")}</td><td>${fmtMoney(price)}</td><td><span class="chip chip-green">Payée</span></td></tr>`;
          }).join("")}
        </tbody>
      </table></div>
      <p class="muted small" style="margin-top:14px">Facturation de démonstration : à relier à la passerelle de paiement.</p>`;
    const c = $("#cancel");
    if (c) c.onclick = () => modal(`
      <h3 class="h3">Annuler l'abonnement ?</h3>
      <p class="muted small" style="margin:10px 0 20px">Votre accès reste actif jusqu'à la fin de la période en cours. Aucun frais.</p>
      <div class="row" style="gap:10px">
        <button class="btn btn-red" id="yes">Confirmer l'annulation</button>
        <button class="btn btn-ghost" data-close>Rester abonné</button>
      </div>`, {}) , setTimeout(() => {
        const y = $("#yes");
        if (y) y.onclick = () => { S.plan = null; S.save("plan"); location.reload(); };
      }, 50);
  }

  /* ---------------- Paramètres ---------------- */
  function renderSettings() {
    const s = S.settings;
    $("#settings").innerHTML = `
      <div class="two">
        <div class="field"><label for="s-q">Qualité de lecture</label>
          <select class="select" id="s-q">
            ${["auto", "1080p", "720p", "480p", "240p"].map(v => `<option value="${v}" ${s.quality === v ? "selected" : ""}>${v === "auto" ? "Auto (recommandé)" : v}</option>`).join("")}
          </select></div>
        <div class="field"><label for="s-st">Sous-titres</label>
          <select class="select" id="s-st">
            ${["Français", "Anglais", "Fon", "Yoruba", "Aucun"].map(v => `<option ${s.subtitles === v.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "") ? "selected" : ""}>${v}</option>`).join("")}
          </select></div>
      </div>
      <div class="two">
        <div class="field"><label for="s-lang">Langue de l'interface</label>
          <select class="select" id="s-lang">
            ${["fr", "en", "fon"].map(v => `<option value="${v}" ${s.language === v ? "selected" : ""}>${v.toUpperCase()}</option>`).join("")}
          </select></div>
        <div class="field"><label for="s-audio">Piste audio préférée</label>
          <select class="select" id="s-audio">
            ${["Français", "Fon", "Yoruba", "Anglais"].map(v => `<option ${s.audio === v.toLowerCase() ? "selected" : ""}>${v}</option>`).join("")}
          </select></div>
      </div>
      <div class="stack" style="gap:12px;margin-top:6px">
        <label class="check"><input type="checkbox" id="s-next" ${s.autoplayNext ? "checked" : ""}><span>Lecture automatique de l'épisode suivant</span></label>
        <label class="check"><input type="checkbox" id="s-prev" ${s.autoplayPreview ? "checked" : ""}><span>Aperçus automatiques en parcourant le catalogue</span></label>
        <label class="check"><input type="checkbox" id="s-data" ${s.dataSaver ? "checked" : ""}><span>Économie de données (qualité réduite en réseau mobile)</span></label>
        <label class="check"><input type="checkbox" id="s-wifi" ${s.downloadWifiOnly ? "checked" : ""}><span>Télécharger uniquement en Wi-Fi</span></label>
        <label class="check"><input type="checkbox" id="s-parental" ${s.parental ? "checked" : ""}><span>Contrôle parental (code à 4 chiffres)</span></label>
      </div>
      ${s.parental ? `<div class="field" style="max-width:220px"><label>Code parental</label><input class="input" id="s-pin" value="${esc(s.pin)}" inputmode="numeric" maxlength="4"></div>` : ""}
      <button class="btn btn-primary" id="s-save" style="justify-self:start">Enregistrer les préférences</button>`;

    $("#s-parental").onchange = () => { s.parental = $("#s-parental").checked; renderSettings(); };
    $("#s-save").onclick = () => {
      const st = S.settings;
      st.quality = $("#s-q").value;
      st.subtitles = $("#s-st").value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      st.language = $("#s-lang").value;
      st.audio = $("#s-audio").value.toLowerCase();
      st.autoplayNext = $("#s-next").checked;
      st.autoplayPreview = $("#s-prev").checked;
      st.dataSaver = $("#s-data").checked;
      st.downloadWifiOnly = $("#s-wifi").checked;
      st.parental = $("#s-parental").checked;
      if ($("#s-pin")) st.pin = $("#s-pin").value;
      S.save("settings");
      toast("Préférences enregistrées", "", "ok");
    };
  }

  /* ---------------- Appareils ---------------- */
  function renderDevices() {
    const now = navigator.userAgent;
    const ua = /Android/i.test(now) ? "Android" : /iPhone|iPad|Mac/i.test(now) ? "iOS / macOS" : "Windows / Linux";
    const list = [
      { n: ua + " · " + (navigator.language || "fr"), d: "Cet appareil", cur: true },
      { n: "Android TV · salon", d: "Dernière connexion il y a 2 j", cur: false },
      { n: "Navigateur · Cotonou", d: "Dernière connexion il y a 1 sem.", cur: false }
    ];
    $("#devices").innerHTML = list.map(d => `
      <div class="between" style="padding:14px;border:1px solid var(--line);border-radius:var(--r);gap:12px;flex-wrap:wrap">
        <div><b style="font-size:15px">${esc(d.n)}</b><div class="muted small">${esc(d.d)}</div></div>
        ${d.cur ? '<span class="chip chip-green">Actif</span>' : '<button class="tbtn danger">Déconnecter</button>'}
      </div>`).join("");
  }

  $("#logout").onclick = () => { S.user = null; S.save("user"); location.href = "index.html"; };
  $("#wipe").onclick = () => {
    if (!confirm("Supprimer toutes les données locales (profils, progression, liste, paramètres) ?")) return;
    store.clearAll(); location.href = "index.html";
  };

  /* ---------------- Nav latérale ---------------- */
  $$("#side a").forEach(a => a.addEventListener("click", (e) => {
    e.preventDefault();
    const el = document.querySelector(a.getAttribute("href"));
    if (el) window.scrollTo({ top: el.offsetTop - 100, behavior: "smooth" });
  }));

  function renderAll() {
    renderProfiles(); renderResume(); renderList(); renderDl(); renderPlan(); renderSettings(); renderDevices();
  }
  renderAll();

  if (location.hash) {
    const el = document.querySelector(location.hash);
    if (el) setTimeout(() => window.scrollTo({ top: el.offsetTop - 100, behavior: "smooth" }), 200);
  }
})();
