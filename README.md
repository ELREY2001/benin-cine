# BÉNIN CINÉ, plateforme de streaming

Maison de production et de diffusion du cinéma béninois.
Version livrée : **front-end complet + back-office de publication**, 100 % local (aucun serveur requis pour la démonstration).

---

## 1. Démarrer

**En ligne (recommandé)** : voir `DEPLOIEMENT-NETLIFY.md`, glisser-déposer sur Netlify, 3 minutes.

**En local** :

```bash
cd benincine
python3 -m http.server 8000
# puis ouvrir http://localhost:8000
```

Aucune dépendance, aucun build, aucun appel réseau externe : tout fonctionne hors-ligne.
(Un serveur est déjà lancé dans l'espace de travail, utilisez l'aperçu en direct.)

### Formulaires

Les trois formulaires (dépôt de projet, partenaires, contact) envoient les réponses via
**Netlify Forms** quand le site est hébergé ; en local, ils retombent sur le stockage du
navigateur. Voir la section 4 du guide de déploiement pour activer la réception par email.

---

## 2. Les écrans

| Fichier | Rôle |
|---|---|
| `index.html` | Accueil : hero vidéo, Top 10 numéroté, rangées par type, arguments produits, agenda des projections, appel à projets |
| `browse.html` | Catalogue complet : recherche, filtres (type, genre, langue, année, classification), tri, URL partageable |
| `title.html` | Fiche d'un titre : affiche, métadonnées, actions, épisodes, informations, recommandations |
| `watch.html` | Lecteur : contrôles sur mesure, reprise, épisode suivant, sous-titres, qualité, vitesse, PiP, plein écran, raccourcis clavier |
| `plans.html` | Abonnements (Mobile / Standard / Premium / Mécène), paiements, comparatif, FAQ |
| `studio.html` | Dépôt de projet en 4 étapes, incubateur, critères de sélection, formulaire partenaires |
| `about.html` | Le projet : vision, mission, valeurs, activités, projet phare, modèle économique, équipe |
| `auth.html` | Connexion / inscription (email, téléphone OTP, Google, Apple) |
| `account.html` | Mon espace : profils, reprise, ma liste, téléchargements, abonnement, paramètres, appareils |
| `admin.html` | **Back-office** : tableau de bord, catalogue, ajout/modification d'un titre, dossiers reçus, partenaires, messages, réglages |

---

## 3. Remplacer le contenu de démonstration par vos titres

1. Ouvrir `admin.html` → **Ajouter un titre**.
2. Renseigner titre, type, année, durée, nombre d'épisodes, genres, langues, sous-titres, classification, synopsis.
3. Déposer l'affiche (redimensionnée automatiquement en 600×900) et l'image de fond (1280×720).
4. Coller l'URL de la vidéo (stockage objet / CDN). Sans URL, le lecteur joue le teaser de la plateforme.
5. Choisir le statut **Publié** (visible), **Brouillon** (invisible) ou **Avant-première**.

Le titre remonte immédiatement sur l'accueil, dans le catalogue, dans la recherche et dans le Top 10.

Une fois votre vrai catalogue en ligne : `admin.html` → **Réglages** → décocher
*« Afficher les emplacements de démonstration »*. Les 12 fiches de démonstration disparaissent.

> Les 12 fiches de démonstration ne contiennent **aucune histoire inventée** : uniquement des
> métadonnées structurelles (type, genre, durée, langue) et une affiche générée aux couleurs de la marque.

---

## 4. Ce qui est réel, ce qui est simulé

**Réel et fonctionnel**
- Navigation complète, recherche instantanée (accents ignorés), filtres, tri, URL partageables.
- Lecteur HTML5 complet : lecture, reprise automatique, épisode suivant, sous-titres, qualité,
  vitesse, volume, Picture-in-Picture, plein écran, raccourcis clavier, sauvegarde de la progression.
- Profils multiples (dont profil enfant), ma liste, téléchargements, paramètres persistants.
- Back-office : publication, statuts, recherche, suppression, suivi des dossiers / partenaires / messages, export-import JSON.
- Formulaire de dépôt de projet en 4 étapes avec brouillon automatique, validation et numéro de dossier.

**Simulé (à brancher côté serveur)**
- Paiements (MTN MoMo, Moov Money, Orange Money, Wave, cartes) : passerelle à connecter.
- Comptes et sessions : authentification réelle à implémenter.
- Téléchargements hors-ligne : enregistrés localement, sans chiffrement ni DRM.
- Ciné-club (synchronisation) et diffusion TV (Cast) : à relier à un serveur temps réel.

---

## 5. Mobile d'abord

La majorité du public regarde sur un téléphone : chaque écran est conçu pour le pouce.

- **Navigation** : sous 900 px, les liens d'en-tête sont remplacés par un menu plein écran (bouton en haut à droite) et une barre d'onglets en bas (Accueil, Catalogue, Ma liste, Studio, Compte). Sous 640 px, l'en-tête ne garde que le logo.
- **Dimensions contrôlées** : aucun débordement horizontal, aucun zoom forcé du navigateur, sur 360 px, 390 px et en paysage (844 × 390). Grilles en 2 colonnes, marges de 16 px, zones de sécurité (encoche) respectées.
- **Cibles tactiles** : toute zone cliquable mesure au moins 44 × 44 px, y compris les filtres drapeaux, les boutons du lecteur, les champs et les liens de pied de page.
- **Lisibilité** : aucun texte sous 12 px ; les champs de formulaire sont en 16 px pour éviter le zoom automatique à la saisie.
- **Lecteur** : un appui affiche ou masque les commandes, deux appuis à gauche ou à droite reculent ou avancent de 10 secondes, la zone de progression est élargie, le volume et le mode Picture in Picture sont masqués sous 640 px.
- **Formulaires** : les fenêtres deviennent des feuilles glissées depuis le bas, les messages s'affichent au-dessus de la barre d'onglets.

## 6. Architecture

```
benincine/
├─ index.html browse.html title.html watch.html plans.html
├─ studio.html about.html auth.html account.html admin.html
├─ manifest.webmanifest      # PWA installable
├─ sw.js                     # service worker (réseau d'abord pour les pages, cache pour les assets)
└─ assets/
   ├─ brand/                 # logo officiel décliné : favicon, icônes, image de partage
   ├─ css/app.css            # design system complet (palette extraite du logo)
   ├─ js/core.js             # noyau : store, données, composants, recherche, navigation
   ├─ js/*.js                # une logique par écran
   ├─ img/hero.jpg           # fond d'accueil
   ├─ img/ambiance/          # visuels d'ambiance réutilisables (non affichés par défaut)
   └─ video/                 # teaser de marque + boucle d'accueil
```

**Schéma d'un titre** (défini dans `assets/js/core.js`) :

```js
{ id, title, type /* film|serie|documentaire|court|jeunesse|spectacle */, year, duration,
  episodes, genres[], languages[], subtitles[], maturity, synopsis, poster, backdrop,
  video, collection, status /* publie|brouillon|avant-premiere */, featured, demo }
```

**Stockage** : `localStorage` (clés préfixées `bc:`). Export / import JSON depuis le back-office.

---

## 7. Identité visuelle

Palette extraite automatiquement du logo officiel :

| Rôle | Valeur |
|---|---|
| Rouge (marque) | `#AD0307` |
| Or (accent principal) | `#F2A71A` |
| Vert (Bénin) | `#075831` |
| Fond | `#07070A` |

Le logo est décliné dans `assets/brand/` : `favicon.ico`, `logo-96/180/256/512.png`,
`apple-touch-icon.png`, `og-image.jpg` (image de partage 1200×630).

---

## 8. Prochaines étapes techniques

1. **API** : remplacer le stockage local par une base (titres, médias, comptes, abonnements) et exposer une REST API.
2. **Vidéo** : encoder en HLS/DASH adaptatif, servir via CDN, protéger par jeton signé ou DRM (Widevine / PlayReady / FairPlay).
3. **Paiements** : intégrer MTN MoMo API, Wave, CinetPay / PayDunya et les cartes, avec webhooks de confirmation.
4. **Applications** : Android / iOS (téléchargements chiffrés) et Android TV.
5. **Ayants droit** : portail producteur avec audience, revenus et contrats.
6. **Qualité** : tests d'audience réels (faible bande passante, vieux Android), analytics, A/B sur la page d'accueil.

---

## 9. Outils inclus

- `tools/process_images.py` : redimensionne et optimise affiches et fonds (PIL).
- `tools/make_video.py` : fabrique les vidéos de marque (teaser, boucle d'accueil) avec ffmpeg.

---

© Bénin Ciné, Cotonou, République du Bénin.
