/* Le projet : équipe + formulaire de contact */
(function () {
  const { $, esc, mountShell, toast, S, uid } = BC;
  mountShell("about");

  const TEAM = [
    ["Fondateur / Producteur", "#F2A71A"], ["Co-producteur / Co-productrice", "#E0131F"],
    ["Réalisateur / Réalisatrice", "#0E8A4C"], ["Scénariste", "#FF8A3D"],
    ["Community manager / Chargé(e) de com", "#7A6BFF"], ["Directeur / Directrice de production", "#3DBE8B"]
  ];

  $("#team").innerHTML = TEAM.map(([role, c], i) => `
    <div class="member">
      <div class="av" style="background:linear-gradient(140deg,${c},rgba(0,0,0,.6))">${i + 1}</div>
      <b>À pourvoir</b>
      <span>${esc(role)}</span>
    </div>`).join("");

  $("#contact-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const nom = $("#c-nom").value.trim(), mail = $("#c-mail").value.trim(), msg = $("#c-msg").value.trim();
    if (!nom || !mail || !msg) { toast("Champs requis", "Nom, email et message sont obligatoires.", "err"); return; }
    const rec = { id: uid("msg"), nom, mail, objet: $("#c-obj").value, message: msg, ts: Date.now() };
    S.messages.unshift(rec);
    S.save("messages");
    BC.netlifySubmit("contact", rec).then(ok => {
      toast(ok ? "Message transmis à l'équipe" : "Message enregistré (envoi différé)",
            ok ? "Réponse sous 72 h." : "Copie conservée localement.", ok ? "ok" : "err");
    });
    e.target.reset();
    toast("Message envoyé", "Merci, nous revenons vers vous rapidement.", "ok");
  });
})();
