# Déployer BÉNIN CINÉ sur Render

## Pourquoi votre tentative a échoué

Render ne fonctionne pas comme Netlify, et c'est la cause la plus fréquente d'échec :

1. **Render n'accepte pas de fichier zip.** On ne peut rien déposer à la main : il faut d'abord mettre le site sur GitHub ou GitLab, puis connecter ce dépôt. Si vous avez cherché un bouton d'envoi de fichier, il n'existe pas.
2. **Il faut choisir « Static Site » et non « Web Service ».** Un « Web Service » cherche une commande de démarrage (`npm start`) et un serveur. Notre projet est un site statique : sans serveur à lancer, le déploiement échoue avec une erreur de construction.
3. **Le dossier à publier doit être la racine.** Si vos fichiers sont dans un sous-dossier `benincine/`, il faut l'indiquer, sinon Render cherche `index.html` là où il n'est pas.

Le projet contient désormais tout ce qu'il faut pour les trois méthodes : `render.yaml`, `package.json` et `serve-render.js`.

## Méthode 1, la plus simple : dépôt Git puis site statique

### Étape 1. Mettre le site sur GitHub

Créez un dépôt vide sur github.com (bouton « New repository », sans README ni .gitignore). Puis, dans le dossier du projet :

```bash
cd benincine
git init
git add .
git commit -m "Bénin Ciné, première version"
git branch -M main
git remote add origin https://github.com/VOTRE-COMPTE/benincine.git
git push -u origin main
```

Remplacez `VOTRE-COMPTE` par votre nom d'utilisateur GitHub.

### Étape 2. Créer le site sur Render

1. Connectez-vous sur render.com, bouton **Add new**, puis **Static Site**.
2. Choisissez **Connect a repository** et sélectionnez `benincine`.
3. Remplissez les champs exactement ainsi :

| Champ | Valeur |
| --- | --- |
| Name | `benincine` |
| Branch | `main` |
| Root Directory | vide (sauf si vos fichiers sont dans un sous-dossier : écrivez alors `benincine`) |
| Build Command | **vide**, à laisser tel quel |
| Publish Directory | `.` (un point) ou vide |

4. Cliquez sur **Create Static Site**. La première mise en ligne prend une à deux minutes.

Votre site est alors disponible à une adresse du type `benincine.onrender.com`.

## Méthode 2 : avec le fichier render.yaml (Blueprint)

Le fichier `render.yaml` déjà inclus décrit le site. Après avoir poussé le dépôt sur Git :

1. **Add new**, puis **Blueprint**.
2. Sélectionnez le dépôt. Render lit `render.yaml` et crée le site statique avec les bons réglages, sans rien saisir.
3. Cliquez sur **Apply**.

## Méthode 3 : comme service Node (si vous préférez)

Le projet contient `package.json` et `serve-render.js`, un petit serveur qui gère les requêtes Range, donc la navigation dans les vidéos. Cette méthode fonctionne si vous avez déjà créé un « Web Service » :

| Champ | Valeur |
| --- | --- |
| Runtime | `Node` |
| Build Command | `npm install` |
| Start Command | `npm start` |

Attention, sur l'offre gratuite, un service Node s'endort après quinze minutes sans visite et met trente secondes à se réveiller. Un site statique, lui, reste toujours disponible. Préférez la méthode 1.

## Vérifier après la mise en ligne

- Ouvrez l'adresse fournie par Render : l'accueil s'affiche avec la vidéo en boucle.
- Testez `/admin.html` : le back-office doit s'ouvrir.
- Testez une adresse qui n'existe pas, par exemple `/nimportequoi` : la page « Cette page n'existe pas » doit apparaître.
- Sur téléphone, ajoutez le site à l'écran d'accueil : l'icône et le mode hors ligne sont gérés par `manifest.webmanifest` et `sw.js`.

## Ajouter votre nom de domaine

Dans le site Render, onglet **Settings**, section **Custom Domains**, bouton **Add Custom Domain**. Render fournit un certificat HTTPS automatique. Il suffit ensuite, chez votre registrar, d'ajouter un enregistrement CNAME vers l'adresse indiquée par Render.

## Si le déploiement échoue encore

Le journal de construction, dans l'onglet **Logs**, indique la ligne exacte qui bloque. Les trois causes les plus courantes :

| Message | Cause et correction |
| --- | --- |
| « No such file or directory: index.html » | Le champ Publish Directory est faux, mettez `.` |
| « Build failed » sur un Web Service | Vous avez choisi « Web Service », reprenez la méthode 1, ou bien renseignez `npm install` et `npm start` |
| « Repository not found » | Le dépôt est privé et Render n'a pas l'autorisation, ou l'URL du dépôt est erronée |

Copiez le message d'erreur affiché et communiquez-le moi, je vous dirai exactement quoi corriger.
