/* Abonnements : formules, paiements, comparatif, FAQ */
(function () {
  const { $, $$, esc, mountShell, fmtMoney, toast, modal, S, ICON } = BC;
  mountShell("plans");

  const PLANS = [
    {
      id: "mobile", name: "Mobile", m: 1500, featured: false,
      pitch: "Pour regarder sur son téléphone, où que l'on soit.",
      perks: ["1 écran", "Qualité jusqu'à 480p", "Téléchargement : 10 titres / mois",
              "Audio français + langues nationales", "Paiement Mobile Money"]
    },
    {
      id: "standard", name: "Standard", m: 3500, featured: true,
      pitch: "Le confort, sur téléphone, ordinateur et téléviseur.",
      perks: ["2 écrans simultanés", "Qualité jusqu'à 1080p", "Téléchargements illimités",
              "Tous les films, séries et documentaires", "Sous-titres FR / EN / Fon / Yoruba"]
    },
    {
      id: "premium", name: "Premium", m: 5500, featured: false,
      pitch: "La qualité cinéma, pour la famille entière.",
      perks: ["4 écrans simultanés", "4K · HDR · audio spatial", "Téléchargements illimités",
              "Accès aux avant-premières en ligne", "4 profils + contrôle parental"]
    },
    {
      id: "mecene", name: "Mécène", m: 15000, featured: false,
      pitch: "Financer directement la production béninoise.",
      perks: ["Tout Premium, sans limite", "2 invitations par avant-première", "Votre nom au générique des productions soutenues",
              "Rencontre annuelle avec les équipes", "Reçu fiscal / attestation de mécénat"]
    }
  ];

  const PAYS = [
    ["MTN MoMo", "#FFCC00"], ["Moov Money", "#00A0E3"], ["Orange Money", "#FF7900"],
    ["Wave", "#1DC4E9"], ["Visa / Mastercard", "#1A1F71"], ["Espèces chez un agent agréé", "#0E8A4C"]
  ];

  const CMP = [
    ["Écrans simultanés", "1", "2", "4", "4"],
    ["Qualité maximale", "480p", "1080p", "4K HDR", "4K HDR"],
    ["Téléchargement hors-ligne", "10 / mois", "Illimité", "Illimité", "Illimité"],
    ["Catalogue complet", "Oui", "Oui", "Oui", "Oui"],
    ["Avant-premières en ligne", "Non", "Non", "Oui", "Oui"],
    ["Profils + contrôle parental", "1", "4", "4", "4"],
    ["Soutien à la production", "Non", "Non", "Non", "Oui"],
    ["Prix (mensuel)", "1 500", "3 500", "5 500", "15 000"]
  ];
  const YES = new Set(["Oui"]);

  let billing = "mensuel";

  function price(p) {
    return billing === "mensuel" ? p.m : Math.round(p.m * 12 * 0.8 / 12);
  }

  function render() {
    $("#plans").innerHTML = PLANS.map(p => `
      <article class="plan ${p.featured ? "featured" : ""}">
        <div>
          <h3 class="pname">${esc(p.name)}</h3>
          <p class="muted small" style="margin-top:6px">${esc(p.pitch)}</p>
        </div>
        <div class="pprice">
          <b>${fmtMoney(price(p))}</b><span>/ mois</span>
        </div>
        <p class="small muted">${billing === "mensuel" ? "Sans engagement" : "Engagement 12 mois, 2 mois offerts"}</p>
        <ul>${p.perks.map(k => `<li>${ICON.check}<span>${esc(k)}</span></li>`).join("")}</ul>
        <button class="btn ${p.featured ? "btn-primary" : "btn-ghost"} btn-block" data-plan="${p.id}">
          Choisir ${esc(p.name)}
        </button>
      </article>`).join("");

    $$("[data-plan]").forEach(b => b.onclick = () => checkout(PLANS.find(p => p.id === b.dataset.plan)));

    $("#cmp").innerHTML = CMP.map(row => `
      <tr><td>${esc(row[0])}</td>${row.slice(1).map(v => {
        const cls = YES.has(v) ? "yes" : (v === "Non" ? "no" : "");
        return `<td class="${cls}">${esc(v)}</td>`;
      }).join("")}</tr>`).join("");
  }

  function checkout(p) {
    modal(`
      <h3 class="h3">Souscrire à la formule ${esc(p.name)}</h3>
      <p class="muted small" style="margin:8px 0 20px">${fmtMoney(price(p))} / mois · ${billing === "mensuel" ? "sans engagement" : "12 mois, 2 mois offerts"} · 7 jours offerts.</p>
      <div class="stack">
        <div class="field">
          <label>Moyen de paiement</label>
          <select class="select" id="pm">
            ${PAYS.map(([n]) => `<option>${esc(n)}</option>`).join("")}
          </select>
        </div>
        <div class="field" id="phone-wrap">
          <label>Numéro Mobile Money <span class="req">*</span></label>
          <input class="input" id="phone" placeholder="+229 00 00 00 00" inputmode="tel" value="${esc((S.user && S.user.phone) || "")}">
        </div>
        <label class="check"><input type="checkbox" id="ok" checked><span>J'accepte les conditions d'abonnement et la politique de confidentialité.</span></label>
        <button class="btn btn-primary btn-block btn-lg" id="pay">Payer ${fmtMoney(price(p))}</button>
        <p class="muted small center">Démonstration : aucun paiement réel n'est traité. L'intégration se fait côté passerelle (MTN MoMo API, CinetPay, PayDunya, Wave).</p>
      </div>`);
    const ph = $("#phone-wrap"), sel = $("#pm");
    const sync = () => ph.classList.toggle("hidden", !/MoMo|Money|Wave/i.test(sel.value));
    sel.onchange = sync; sync();
    $("#pay").onclick = () => {
      const phone = $("#phone").value.trim();
      if (!/MoMo|Money|Wave/i.test(sel.value) === false && !phone) { toast("Numéro requis", "Renseignez votre numéro Mobile Money.", "err"); return; }
      S.plan = p.id; S.save("plan");
      if (!S.user) { S.user = { name: null, phone: phone, plan: p.id }; S.save("user"); }
      BC.log("abonnement", p.id);
      $(".modal").classList.remove("open"); document.body.classList.remove("no-scroll");
      toast("Bienvenue sur Bénin Ciné", "Formule " + p.name + " activée (démonstration).", "ok");
      setTimeout(() => location.href = "index.html", 900);
    };
  }

  $("#pays").innerHTML = PAYS.map(([n, c]) => `
    <span class="pay-pill"><span class="dot" style="background:${c}"></span>${esc(n)}</span>`).join("");

  $$("#billing button").forEach(b => b.onclick = () => {
    $$("#billing button").forEach(x => x.classList.remove("active"));
    b.classList.add("active"); billing = b.dataset.b; render();
  });

  const FAQ = [
    ["Comment payer avec MTN MoMo ?", "Choisissez votre formule, saisissez votre numéro, puis validez la demande de paiement sur votre téléphone. L'accès est ouvert dès confirmation (USSD ou application)."],
    ["Puis-je regarder sans connexion ?", "Oui. Téléchargez vos titres en Wi-Fi depuis l'application ou le navigateur, puis lisez-les hors-ligne. La durée de disponibilité dépend des droits du titre."],
    ["Combien de données consomme un film ?", "En 480p comptez environ 0,7 Go, en 1080p environ 3 Go. Le mode « Économie de données » réduit automatiquement la qualité quand le réseau faiblit."],
    ["Puis-je partager mon compte ?", "Votre formule définit le nombre d'écrans simultanés et le nombre de profils. Le partage hors foyer n'est pas autorisé par nos conditions."],
    ["Comment annuler ?", "Depuis Mon compte → Abonnement → Annuler. L'accès reste actif jusqu'à la fin de la période en cours, sans frais."],
    ["Les langues nationales sont-elles disponibles ?", "Oui. Chaque titre indique ses pistes audio et ses sous-titres : français, anglais, fon, yoruba, bariba, dendi, gun selon les œuvres."],
    ["Comment soutenir une équipe de tournage ?", "Le bouton « Soutenir » sur chaque fiche permet d'envoyer un pourboire Mobile Money directement à l'équipe du titre."]
  ];
  $("#faq").innerHTML = FAQ.map(([q, a], i) => `
    <div class="acc-item ${i === 0 ? "open" : ""}">
      <button class="acc-head">${esc(q)}<svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg></button>
      <div class="acc-body"><div>${esc(a)}</div></div>
    </div>`).join("");
  bindAcc();

  function bindAcc() {
    $$(".acc-item").forEach(item => {
      const head = $(".acc-head", item), body = $(".acc-body", item);
      head.addEventListener("click", () => {
        const open = item.classList.contains("open");
        $$(".acc-item").forEach(o => { o.classList.remove("open"); $(".acc-body", o).style.maxHeight = null; });
        if (!open) { item.classList.add("open"); body.style.maxHeight = body.scrollHeight + "px"; }
      });
      if (item.classList.contains("open")) requestAnimationFrame(() => body.style.maxHeight = body.scrollHeight + "px");
    });
  }

  $("#gift").addEventListener("submit", (e) => {
    e.preventDefault();
    toast("Code cadeau", "Activation à relier au serveur de facturation.", "ok");
  });

  render();
})();
