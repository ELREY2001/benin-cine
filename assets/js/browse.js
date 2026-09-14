/* Catalogue : filtres, tri, recherche, synchronisation URL */
(function () {
  const { $, $$, esc, mountShell, cardHTML, bindCards, all, norm, qs, TYPE_LABEL, toast, fmtDur } = BC;
  mountShell("browse");

  const state = {
    q: qs("q") || "",
    type: qs("type") || "",
    genre: qs("genre") || "",
    lang: qs("lang") || "",
    year: qs("year") || "",
    maturity: qs("maturity") || "",
    sort: qs("sort") || "recent",
    hideDemo: false
  };

  const FILTERS = [
    { value: "", label: "Tout", flag: true, color: "#8E8A84" },
    { value: "film", label: "Films", color: "#008751" },
    { value: "serie", label: "Séries", color: "#FCD116", light: true },
    { value: "documentaire", label: "Docs", color: "#E8112D" },
    { value: "jeunesse", label: "Jeunesse", color: "#0E8A4C" },
    { value: "court", label: "Courts", color: "#5B6B7C" },
    { value: "spectacle", label: "Spectacles", color: "#B8711F" }
  ];

  const uniq = (arr) => Array.from(new Set(arr.filter(Boolean))).sort((a, b) => String(a).localeCompare(String(b), "fr"));

  function facets(items) {
    return {
      type: uniq(items.map(t => t.type)),
      genre: uniq(items.flatMap(t => t.genres || [])),
      lang: uniq(items.flatMap(t => t.languages || [])),
      year: uniq(items.map(t => t.year)).sort((a, b) => b - a),
      maturity: uniq(items.map(t => t.maturity))
    };
  }

  function apply(items) {
    let out = items.slice();
    if (state.type) out = out.filter(t => t.type === state.type);
    if (state.genre) out = out.filter(t => (t.genres || []).includes(state.genre));
    if (state.lang) out = out.filter(t => (t.languages || []).includes(state.lang));
    if (state.year) out = out.filter(t => String(t.year) === String(state.year));
    if (state.maturity) out = out.filter(t => String(t.maturity) === String(state.maturity));
    if (state.hideDemo) out = out.filter(t => !t.demo);
    const nq = norm(state.q);
    if (nq) out = out.filter(t => norm([t.title, t.type, (t.genres || []).join(" "), t.collection, (t.languages || []).join(" ")].join(" ")).includes(nq));
    switch (state.sort) {
      case "az": out.sort((a, b) => a.title.localeCompare(b.title, "fr")); break;
      case "duree": out.sort((a, b) => (b.duration || 0) - (a.duration || 0)); break;
      case "type": out.sort((a, b) => (a.type + a.title).localeCompare(b.type + b.title, "fr")); break;
      default: out.sort((a, b) => (b.year || 0) - (a.year || 0) || (b.demo ? -1 : 0));
    }
    return out;
  }

  function syncURL() {
    const p = new URLSearchParams();
    ["q", "type", "genre", "lang", "year", "maturity", "sort"].forEach(k => { if (state[k]) p.set(k, state[k]); });
    history.replaceState(null, "", location.pathname + (p.toString() ? "?" + p.toString() : ""));
  }

  function render() {
    const items = all();
    const f = facets(items);
    const out = apply(items);

    // Sélecteur drapeau (rendu une fois, état resynchronisé à chaque rendu)
    const ff = $("#flagfilter");
    ff.innerHTML = BC.flagFilterHTML(
      FILTERS.map(o => Object.assign({}, o, {
        count: o.value ? items.filter(t => t.type === o.value).length : items.length
      })), state.type);
    if (!ff.dataset.bound) {
      BC.bindFlagFilter(ff, (v) => { state.type = v; syncURL(); render(); });
      ff.dataset.bound = "1";
    }

    // Filtres
    const groups = [
      ["Type", "type", f.type.map(v => [v, TYPE_LABEL[v] || v])],
      ["Genre", "genre", f.genre.map(v => [v, v])],
      ["Langue", "lang", f.lang.map(v => [v, v])],
      ["Année", "year", f.year.map(v => [v, v])],
      ["Classification", "maturity", f.maturity.map(v => [v, v])]
    ];
    $("#filters").innerHTML = groups.map(([label, key, opts]) => `
      <div class="field">
        <label for="f-${key}">${esc(label)}</label>
        <select class="select" id="f-${key}" data-key="${key}">
          <option value="">Tous</option>
          ${opts.map(([v, l]) => `<option value="${esc(v)}" ${String(state[key]) === String(v) ? "selected" : ""}>${esc(l)}</option>`).join("")}
        </select>
      </div>`).join("");

    $$("#filters select").forEach(sel => sel.addEventListener("change", () => {
      state[sel.dataset.key] = sel.value; syncURL(); render();
    }));

    // Résultats
    $("#count").textContent = out.length + " titre" + (out.length > 1 ? "s" : "") + " · " + items.length + " au catalogue";
    const grid = $("#grid");
    if (!out.length) {
      grid.innerHTML = `<div style="grid-column:1/-1"><div class="empty-state">
        <svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg>
        <h3 class="h3">Aucun titre ne correspond</h3>
        <p class="small">Essayez d'autres filtres ou parcourez tout le catalogue.</p>
        <button class="btn btn-ghost btn-sm" id="clear" style="margin-top:14px">Réinitialiser les filtres</button>
      </div></div>`;
      const c = $("#clear"); if (c) c.onclick = reset;
    } else {
      grid.innerHTML = out.map(cardHTML).join("");
      bindCards(grid);
    }
  }

  function reset() {
    Object.assign(state, { q: "", type: "", genre: "", lang: "", year: "", maturity: "", sort: "recent", hideDemo: false });
    $("#q").value = ""; $("#sort").value = "recent"; $("#hideDemo").checked = false;
    syncURL(); render();
  }

  $("#q").addEventListener("input", BC.debounce(() => { state.q = $("#q").value; syncURL(); render(); }, 160));
  $("#sort").addEventListener("change", () => { state.sort = $("#sort").value; syncURL(); render(); });
  $("#hideDemo").addEventListener("change", () => { state.hideDemo = $("#hideDemo").checked; render(); });
  $("#reset").addEventListener("click", reset);

  render();
})();
