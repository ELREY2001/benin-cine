/* Accueil : Top 10 centré (filtre drapeau), rangées, agenda */
(function () {
  const { $, $$, esc, mountShell, rowHTML, bindCards, all, byId, progress, mylist, S, fmtDur } = BC;

  mountShell("index");

  const items = all();

  /* ---------- Sélecteur drapeau (vert · jaune · rouge) ---------- */
  const FILTERS = [
    { value: "", label: "Tout", flag: true, color: "#8E8A84" },
    { value: "film", label: "Films", color: "#008751" },
    { value: "serie", label: "Séries", color: "#FCD116", light: true },
    { value: "documentaire", label: "Docs", color: "#E8112D" },
    { value: "jeunesse", label: "Jeunesse", color: "#0E8A4C" }
  ];

  const ff = $("#flagfilter");
  ff.innerHTML = BC.flagFilterHTML(
    FILTERS.map(f => Object.assign({}, f, {
      count: f.value ? items.filter(t => t.type === f.value).length : items.length
    })), ""
  );
  BC.bindFlagFilter(ff, (v) => renderTop10(v));

  function renderTop10(type) {
    const host = $("#top10");
    const list = (type ? items.filter(t => t.type === type) : items).slice(0, 10);
    host.innerHTML = BC.top10HTML(list);
    bindCards(host);
  }
  renderTop10("");

  /* ---------- Rangées ---------- */
  const host = $("#rows");
  const rows = [];

  const resume = progress.all().map(x => ({ t: byId(x.id.split("@")[0]), p: x.p }))
    .filter(x => x.t && x.p.pct > 1 && x.p.pct < 98);
  if (resume.length) {
    rows.push(rowHTML("Reprendre le visionnage", resume.map(x => x.t),
      { sub: "Là où " + BC.profile().name + " s'est arrêté" }));
  }

  const listed = S.list.map(id => byId(String(id).split("@")[0])).filter(Boolean);
  if (listed.length) rows.push(rowHTML("Ma liste", listed, { sub: "Enregistré sur ce profil" }));

  const groups = [
    ["Films", "film"], ["Séries", "serie"], ["Documentaires", "documentaire"],
    ["Courts métrages", "court"], ["Jeunesse", "jeunesse"], ["Spectacles", "spectacle"]
  ];
  groups.forEach(([label, type]) => {
    const list = items.filter(t => t.type === type);
    if (list.length) rows.push(rowHTML(label, list, { sub: list.length + " titre" + (list.length > 1 ? "s" : "") }));
  });

  const real = (S.titles || []).filter(t => t.status !== "brouillon");
  if (real.length) rows.push(rowHTML("Nouveautés publiées", real.slice(0, 12), { sub: "Derniers ajouts du back-office" }));

  if (!rows.length) {
    host.innerHTML = `<div class="wrap"><div class="empty-state">
      <h3 class="h3">Le catalogue se prépare</h3>
      <p class="small">Publiez vos premiers titres depuis le <a href="admin.html" style="color:var(--gold)">back-office</a>.</p>
    </div></div>`;
  } else {
    host.innerHTML = rows.join("<hr class='gold-rule' style='margin:0 24px;opacity:.35'>");
  }
  bindCards(host);

  /* ---------- Agenda ---------- */
  const EVENTS = [
    { d: "2026", m: "À DATER", title: "Avant-première de la série phare", place: "Cotonou · salle à confirmer", note: "Projection suivie d'un échange avec l'équipe" },
    { d: "2026", m: "À DATER", title: "Projection populaire en plein air", place: "Quartier à définir", note: "Écran gonflable, entrée libre" },
    { d: "2026", m: "À DATER", title: "Masterclass : écrire pour la série", place: "Studio Bénin Ciné", note: "Scénario, direction d'acteurs, production" }
  ];
  const ev = $("#events");
  if (ev) {
    ev.innerHTML = EVENTS.map(e => `
      <div class="event">
        <div class="date"><b>${esc(e.d)}</b><span>${esc(e.m)}</span></div>
        <div><h4>${esc(e.title)}</h4><p>${esc(e.place)}, ${esc(e.note)}</p></div>
        <span class="chip chip-gold">Bientôt</span>
      </div>`).join("");
  }
})();
