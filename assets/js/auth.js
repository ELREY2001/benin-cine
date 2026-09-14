/* Connexion / inscription */
(function () {
  const { $, $$, esc, mountShell, toast, S, ICON, qs, store, uid } = BC;
  mountShell("auth");

  let mode = qs("mode") === "up" ? "up" : "in";
  let method = "email"; // email | phone

  function fields() {
    const up = mode === "up";
    const common = `
      <div class="field">
        <label>${up ? "Nom & prénom" : "Email ou téléphone"} <span class="req">*</span></label>
        <input class="input" id="a-id" ${up ? 'placeholder="Ex : Kofi Mensah"' : 'placeholder="vous@exemple.com ou +229…"'}>
      </div>`;
    const mail = `
      <div class="field">
        <label>${up ? "Email" : method === "phone" ? "Numéro Mobile Money" : "Email"} <span class="req">*</span></label>
        <input class="input" id="a-mail" type="${method === "phone" ? "tel" : "email"}" placeholder="${method === "phone" ? "+229 00 00 00 00" : "vous@exemple.com"}">
      </div>`;
    const pass = `
      <div class="field">
        <label>Mot de passe <span class="req">*</span></label>
        <input class="input" id="a-pass" type="password" placeholder="••••••••">
      </div>`;
    const otp = `
      <div class="field">
        <label>Code reçu par SMS <span class="req">*</span></label>
        <input class="input" id="a-otp" inputmode="numeric" placeholder="6 chiffres">
        <button class="btn btn-ghost btn-sm" id="a-send" type="button">Envoyer le code</button>
      </div>`;
    const plan = `
      <div class="field">
        <label>Formule</label>
        <select class="select" id="a-plan">
          <option value="">Choisir plus tard</option>
          <option value="mobile">Mobile, 1 500 FCFA / mois</option>
          <option value="standard">Standard, 3 500 FCFA / mois</option>
          <option value="premium">Premium, 5 500 FCFA / mois</option>
          <option value="mecene">Mécène, 15 000 FCFA / mois</option>
        </select>
      </div>`;
    return (up ? common + mail + pass + plan : common + (method === "phone" ? otp : mail + pass)) + `
      <label class="check"><input type="checkbox" id="a-ok" checked><span>Rester connecté sur cet appareil</span></label>
      <button class="btn btn-primary btn-lg btn-block" type="submit">${up ? "Créer mon compte" : "Se connecter"}</button>
      ${up ? '<p class="muted small center">7 jours offerts, sans engagement.</p>' : `<p class="muted small center"><a href="#" id="a-forgot" style="color:var(--gold)">Mot de passe oublié ?</a></p>`}`;
  }

  function render() {
    const up = mode === "up";
    $$("#tabs button").forEach(b => b.classList.toggle("active", b.dataset.t === mode));
    $("#h-title").textContent = up ? "Rejoignez Bénin Ciné" : "Content de vous revoir";
    $("#h-sub").textContent = up
      ? "Un compte, quatre profils, et tout le cinéma béninois."
      : "Connectez-vous pour retrouver vos titres et votre progression.";
    $("#form").innerHTML = (up ? "" : `
      <div class="toggle-billing" style="justify-self:start">
        <button type="button" data-m="email" class="${method === "email" ? "active" : ""}">Email</button>
        <button type="button" data-m="phone" class="${method === "phone" ? "active" : ""}">Téléphone (SMS)</button>
      </div>`) + fields();
    $$("#form [data-m]").forEach(b => b.onclick = () => { method = b.dataset.m; render(); });
    const send = $("#a-send");
    if (send) send.onclick = () => toast("Code envoyé", "Code de démonstration : 123456", "ok");
    const f = $("#a-forgot");
    if (f) f.onclick = (e) => { e.preventDefault(); toast("Réinitialisation", "Lien envoyé (démonstration).", "ok"); };
  }

  $("#tabs").addEventListener("click", (e) => {
    const b = e.target.closest("[data-t]"); if (!b) return;
    mode = b.dataset.t; render();
  });

  $("#form").addEventListener("submit", (e) => {
    e.preventDefault();
    const idv = ($("#a-id") || {}).value || "";
    const mail = ($("#a-mail") || {}).value || "";
    const pass = ($("#a-pass") || {}).value || "";
    const otp = ($("#a-otp") || {}).value || "";
    if (!idv.trim()) { toast("Champ requis", "Renseignez vos identifiants.", "err"); return; }
    if (mode === "up" && pass.length < 6) { toast("Mot de passe", "6 caractères minimum.", "err"); return; }
    if (mode === "in" && method === "phone" && otp !== "123456") { toast("Code invalide", "Code de démonstration : 123456", "err"); return; }
    if (mode === "in" && method === "email" && pass.length < 4) { toast("Mot de passe", "4 caractères minimum (démonstration).", "err"); return; }

    const planSel = ($("#a-plan") || {}).value || "";
    S.user = {
      name: mode === "up" ? idv.trim() : (idv.includes("@") ? idv.split("@")[0] : idv.trim()),
      email: mail || (idv.includes("@") ? idv : ""),
      phone: mail && /^\+?\d/.test(mail) ? mail : "",
      since: Date.now()
    };
    S.save("user");
    if (planSel || mode === "up") { S.plan = planSel || "mobile"; S.save("plan"); }
    BC.log("auth", mode);
    toast("Bienvenue", mode === "up" ? "Compte créé (démonstration)." : "Connexion réussie.", "ok");
    setTimeout(() => location.href = qs("next") || "account.html", 700);
  });

  $("#oauth-google").onclick = () => demoOAuth("Google");
  $("#oauth-apple").onclick = () => demoOAuth("Apple");
  function demoOAuth(p) {
    S.user = { name: "Invité " + p, email: "invite@" + p.toLowerCase() + ".com", phone: "", since: Date.now() };
    S.save("user");
    toast("Connexion " + p, "Mode démonstration.", "ok");
    setTimeout(() => location.href = "account.html", 600);
  }

  render();
})();
