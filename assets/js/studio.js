/* Studio : dépôt de projet en 4 étapes + formulaire partenaires */
(function () {
  const { $, $$, esc, mountShell, toast, modal, S, ICON, store, uid } = BC;
  mountShell("studio");

  const STEPS = [
    { key: "porteur", label: "Porteur", fields: [
      { n: "nom", l: "Nom & prénom", t: "text", req: true },
      { n: "structure", l: "Structure / collectif", t: "text" },
      { n: "role", l: "Rôle principal", t: "select", o: ["Réalisateur / Réalisatrice", "Scénariste", "Producteur / Productrice", "Comédien / Comédienne", "Technicien", "Autre"] },
      { n: "email", l: "Email", t: "email", req: true },
      { n: "tel", l: "Téléphone (Mobile Money)", t: "tel" },
      { n: "ville", l: "Ville", t: "text" }
    ]},
    { key: "projet", label: "Projet", fields: [
      { n: "titre", l: "Titre du projet", t: "text", req: true },
      { n: "type", l: "Format", t: "select", o: ["Long métrage", "Série / Web-série", "Documentaire", "Court métrage", "Spectacle / captation", "Animation"] },
      { n: "genre", l: "Genre", t: "select", o: ["Drame", "Comédie", "Histoire", "Jeunesse", "Documentaire", "Thriller", "Animation", "Autre"] },
      { n: "duree", l: "Durée ou nombre d'épisodes", t: "text" },
      { n: "synopsis", l: "Synopsis (10 lignes maximum)", t: "textarea", req: true },
      { n: "langues", l: "Langues du projet", t: "text", ph: "Français, Fon, Yoruba…" }
    ]},
    { key: "besoins", label: "Besoins", fields: [
      { n: "stade", l: "Stade d'avancement", t: "select", o: ["Idée", "Note d'intention", "Scénario en cours", "Scénario finalisé", "En tournage", "En post-production", "Terminé"] },
      { n: "besoins", l: "Ce que vous recherchez", t: "checks", o: ["Co-production", "Financement", "Moyens techniques", "Post-production", "Diffusion", "Formation / encadrement", "Distribution en salles"] },
      { n: "budget", l: "Budget prévisionnel (FCFA)", t: "text" },
      { n: "calendrier", l: "Calendrier envisagé", t: "text", ph: "Tournage prévu en …" }
    ]},
    { key: "pieces", label: "Pièces", fields: [
      { n: "lien", l: "Lien vers un dossier, une bande-annonce ou un teaser", t: "text", ph: "https://" },
      { n: "intention", l: "Note d'intention", t: "textarea" },
      { n: "droits", l: "Droits", t: "checks", o: ["J'ai les droits sur ce projet", "Le projet est libre de tout contrat d'exclusivité", "J'accepte que le dossier soit lu par le comité Bénin Ciné"] }
    ]}
  ];

  let step = 0;
  const DRAFT = "draft:submission";
  let data = store.get(DRAFT, {});

  function saveDraft() { store.set(DRAFT, data); $("#saved-hint").textContent = "Brouillon enregistré à " + new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }); }

  function renderSteps() {
    $("#steps").innerHTML = STEPS.map((s, i) => `
      <span class="step-pill ${i === step ? "active" : ""} ${i < step ? "done" : ""}">
        <b>${i < step ? "✓" : i + 1}</b>${esc(s.label)}
      </span>`).join("");
    $("#prog").style.width = ((step + 1) / STEPS.length * 100) + "%";
    $("#prev").disabled = step === 0;
    $("#next").textContent = step === STEPS.length - 1 ? "Envoyer le dossier" : "Continuer";
  }

  function renderForm() {
    const s = STEPS[step];
    $("#form").innerHTML = s.fields.map(f => {
      const v = Array.isArray(data[f.n]) ? data[f.n] : (data[f.n] || "");
      if (f.t === "checks") {
        return `<div class="field"><label>${esc(f.l)}</label>
          <div class="stack" style="gap:10px">${f.o.map(o => `
            <label class="check"><input type="checkbox" name="${f.n}" value="${esc(o)}" ${v.includes(o) ? "checked" : ""}><span>${esc(o)}</span></label>`).join("")}
          </div></div>`;
      }
      if (f.t === "select") {
        return `<div class="field"><label for="f-${f.n}">${esc(f.l)}${f.req ? ' <span class="req">*</span>' : ""}</label>
          <select class="select" id="f-${f.n}" name="${f.n}">
            <option value="">Sélectionner une option</option>
            ${f.o.map(o => `<option ${v === o ? "selected" : ""}>${esc(o)}</option>`).join("")}
          </select></div>`;
      }
      if (f.t === "textarea") {
        return `<div class="field"><label for="f-${f.n}">${esc(f.l)}${f.req ? ' <span class="req">*</span>' : ""}</label>
          <textarea class="textarea" id="f-${f.n}" name="${f.n}" placeholder="${esc(f.ph || "")}">${esc(v)}</textarea></div>`;
      }
      return `<div class="field"><label for="f-${f.n}">${esc(f.l)}${f.req ? ' <span class="req">*</span>' : ""}</label>
        <input class="input" id="f-${f.n}" name="${f.n}" type="${f.t}" value="${esc(v)}" placeholder="${esc(f.ph || "")}"></div>`;
    }).join("");
    $("#form").addEventListener("input", collect);
    $("#form").addEventListener("change", collect);
  }

  function collect() {
    $$("#form [name]").forEach(el => {
      if (el.type === "checkbox") {
        const arr = $$(`#form [name="${el.name}"]:checked`).map(x => x.value);
        data[el.name] = arr;
      } else data[el.name] = el.value;
    });
    saveDraft();
  }

  function validate() {
    const s = STEPS[step];
    const missing = [];
    s.fields.forEach(f => {
      if (!f.req) return;
      const v = data[f.n];
      if (Array.isArray(v) ? !v.length : !String(v || "").trim()) missing.push(f.l);
    });
    if (step === STEPS.length - 1) {
      const d = data.droits || [];
      if (!d.some(x => /J'ai les droits/.test(x))) missing.push("Attestation de droits");
    }
    if (missing.length) { toast("Champs requis", missing.join(", "), "err"); return false; }
    return true;
  }

  function submit() {
    const id = "BC-" + new Date().getFullYear() + "-" + Math.floor(1000 + Math.random() * 9000);
    const dossier = Object.assign({}, data, { id, ts: Date.now(), statut: "reçu" });
    S.submissions.unshift(dossier); S.save("submissions");
    store.del(DRAFT);
    // Envoi réel à l'équipe (Netlify Forms) ; échec silencieux = copie locale conservée
    BC.netlifySubmit("depot-projet", dossier).then(ok => {
      dossier.transmis = ok; S.save("submissions");
    });
    modal(`
      <div class="center">
        <div style="width:64px;height:64px;border-radius:50%;display:grid;place-items:center;margin:0 auto 18px;background:rgba(14,138,76,.16);border:1px solid rgba(14,138,76,.4)">
          <svg viewBox="0 0 24 24" style="width:30px;height:30px;stroke:#5BE0A0;fill:none;stroke-width:2.6;stroke-linecap:round;stroke-linejoin:round"><polyline points="20 6 9 17 4 12"/></svg>
        </div>
        <h3 class="h2">Dossier enregistré</h3>
        <p class="lead" style="margin-top:10px">Numéro de dossier</p>
        <div style="font-size:26px;font-weight:900;letter-spacing:.1em;color:var(--gold);margin:8px 0 14px">${esc(id)}</div>
        <p class="muted small">Vous recevrez une réponse motivée sous 6 semaines à ${esc(data.email || "votre adresse")}.
        Conservez ce numéro : il permet de suivre l'avancement.</p>
        <div class="row" style="gap:12px;justify-content:center;margin-top:22px;flex-wrap:wrap">
          <a class="btn btn-primary" href="index.html">Retour à l'accueil</a>
          <button class="btn btn-ghost" data-close>Fermer</button>
        </div>
      </div>`);
    data = {}; step = 0; renderSteps(); renderForm();
  }

  $("#next").onclick = () => {
    collect();
    if (!validate()) return;
    if (step === STEPS.length - 1) { submit(); return; }
    step++; renderSteps(); renderForm(); window.scrollTo({ top: $("#form").offsetTop - 140, behavior: "smooth" });
  };
  $("#prev").onclick = () => { collect(); step = Math.max(0, step - 1); renderSteps(); renderForm(); };
  $("#clear").onclick = () => { data = {}; store.del(DRAFT); renderSteps(); renderForm(); toast("Brouillon effacé", "", "ok"); };

  renderSteps(); renderForm();
  if (Object.keys(data).length) $("#saved-hint").textContent = "Brouillon restauré";

  /* ---------- Partenaires ---------- */
  $("#partner-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const nom = $("#p-nom").value.trim(), mail = $("#p-mail").value.trim();
    if (!nom || !mail) { toast("Champs requis", "Nom et email sont obligatoires.", "err"); return; }
    const rec = {
      id: uid("part"), nom, org: $("#p-org").value.trim(), mail, tel: $("#p-tel").value.trim(),
      objet: $("#p-objet").value, message: $("#p-msg").value.trim(), ts: Date.now()
    };
    S.partners.unshift(rec);
    S.save("partners");
    BC.netlifySubmit("partenaire", rec).then(ok => {
      toast(ok ? "Message transmis à l'équipe" : "Message enregistré (envoi différé)",
            ok ? "Réponse sous 72 h." : "Copie conservée localement.", ok ? "ok" : "err");
    });
    e.target.reset();
    toast("Message envoyé", "Merci, l'équipe Bénin Ciné vous répond sous 72 h.", "ok");
  });
})();
