# Déployer Bénin Ciné sur Netlify

Aucune installation, aucune ligne de commande, aucun compte développeur.
**Durée : 3 minutes.**

---

## Étape 1. Récupérer le paquet

Fichier prêt dans l'espace de travail : **`benincine-netlify.zip`** (2,99 Mo, 46 fichiers).
Télécharge-le sur ton ordinateur.

Il contient tout le site, sans les outils de développement ni les visuels non utilisés.

---

## Étape 2. Déposer sur Netlify

1. Aller sur **<https://app.netlify.com/drop>** (aucune inscription préalable nécessaire pour tester).
2. **Glisser le dossier** `benincine-netlify.zip` dézippé (ou le zip directement) dans la zone prévue.
3. Attendre quelques secondes : Netlify publie et te donne une adresse du type
   `https://nom-aleatoire.netlify.app`.

C'est en ligne. Rien à compiler, aucun réglage de build : `netlify.toml` indique déjà
`publish = "."` et `command = ""`.

> Glisser le **zip** fonctionne aussi, mais Netlify préfère un dossier : dézippe-le d'abord,
> c'est plus fiable pour conserver les permissions.

---

## Étape 3. Créer ton compte (à faire dans la foulée)

Sur la page du site déployé, cliquer **Claim this site** pour l'attacher à ton compte.
Sans ça, le site reste temporaire et peut être réclamé par quelqu'un d'autre.

---

## Étape 4. Activer la réception des formulaires

C'est **le réglage le plus important** : sans lui, les dossiers déposés par les réalisateurs
restent dans le navigateur du visiteur au lieu d'arriver chez vous.

1. Dans le site → onglet **Forms** → **Enable form detection** (ou « Activer la détection »).
2. Netlify détecte alors automatiquement trois formulaires :
   - `depot-projet` : dépôt de projet (page Studio)
   - `partenaire` : demandes de partenariat (page Studio)
   - `contact` : messages de la page « Le projet »
3. **Forms → Form notifications** → ajouter un **email notification** vers l'adresse de l'équipe.
4. Redéployer une fois pour que la détection s'applique : **Deploys → Trigger deploy → Deploy site**.

Vérification : déposer un dossier de test sur la page Studio, puis regarder l'onglet **Forms**.
Il doit apparaître dans les submissions.

---

## Étape 5. Nom de domaine

1. **Domain management → Add custom domain** : `benincine.bj` (et `www.benincine.bj`).
2. Netlify génère le HTTPS gratuitement (Let's Encrypt), rien à acheter.
3. Chez ton registrar, faire pointer le domaine vers Netlify (Netlify affiche les enregistrements
   DNS exacts à créer, généralement un CNAME vers `xxx.netlify.app`).
4. Penser à mettre à jour `sitemap.xml` et `robots.txt` avec le vrai domaine.

---

## Ce que contient le paquet

| Fichier | Rôle |
|---|---|
| `netlify.toml` | Configuration : pas de build, page 404, en-têtes de cache et de sécurité |
| `404.html` | Page d'erreur habillée aux couleurs de la marque |
| `robots.txt` + `sitemap.xml` | Référencement (penser à corriger le domaine) |
| `manifest.webmanifest` + `sw.js` | Installation comme application (PWA) et consultation hors-ligne |
| `assets/brand/` | Logo officiel décliné : favicon, icônes, image de partage |

---

## Après la mise en ligne

- **Changer une page ?** Modifier le fichier, rezipper, et glisser à nouveau sur
  `app.netlify.com/drop` depuis le même compte, ou passer par **Deploys** puis glisser le dossier.
- **Ajouter un film ?** Rien à redéployer : passer par `admin.html` (le back-office).
  ⚠️ Attention : les titres ajoutés depuis le back-office vivent dans **ton** navigateur.
  Pour qu'ils soient visibles par tout le monde, il faut la version avec serveur (étape suivante).
- **Aller plus loin** : brancher une vraie base de données et un stockage vidéo
  (Supabase, Firebase ou une petite API) pour que le catalogue soit partagé.

---

## Diagnostic rapide

| Symptôme | Cause | Solution |
|---|---|---|
| Page blanche | Chemin en absolu ou fichier manquant | Vérifier que `assets/` est bien à côté des `.html` |
| Le logo ne s'affiche pas | `assets/brand/` non uploadé | Redéployer le dossier complet |
| Vidéo d'accueil figée | Fichier > 10 Mo ou navigateur en économie d'énergie | Normal : l'image de fond prend le relais |
| Formulaire sans effet | Formulaires Netlify non activés | Refaire l'étape 4 |
| Ancienne version visible | Cache navigateur / service worker | Vider le cache ou `Ctrl+Maj+R` |
