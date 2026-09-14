# BÉNIN CINÉ, résumé du projet

## Ce qui a été livré

Une plateforme de streaming complète, en français, prête à être mise en ligne. Douze écrans, un back-office, une identité visuelle construite à partir de votre logo officiel, et une application installable (PWA) qui fonctionne hors ligne sur les pages déjà visitées.

| Écran | Contenu |
| --- | --- |
| `index.html` | Accueil : héros animé, Top 10 par pays, rangées par type, différenciateurs, agenda, appel au studio |
| `browse.html` | Catalogue : filtres par type et par drapeau, recherche, tri, synchronisation par URL |
| `title.html` | Fiche d'un titre : actions, épisodes par saison, informations, recommandations |
| `watch.html` | Lecteur : progression, mémoire tampon, volume, vitesse, qualité, sous-titres, Picture in Picture, plein écran, diffusion, saut de l'introduction, épisode suivant, raccourcis clavier, reprise de lecture |
| `plans.html` | Abonnements (Mobile, Standard, Premium, Mécène), mensuel ou annuel, Mobile Money, carte, agent, comparatif, chèque cadeau, foire aux questions |
| `studio.html` | Dépôt de projet en 4 étapes avec brouillon enregistré automatiquement, parcours d'incubation, critères de sélection, formulaire partenaire |
| `about.html` | Vision, mission, positionnement, valeurs, 5 activités, série phare, modèle économique, équipe, contact |
| `auth.html` | Connexion et inscription par courriel ou téléphone (code de démonstration 123456) |
| `account.html` | Profils, reprise, ma liste, téléchargements, facturation, paramètres, appareils |
| `admin.html` | Back-office : tableau de bord, gestion du catalogue, dossiers, partenaires, messages, réglages |
| `404.html` | Page introuvable |
| `sw.js` + `manifest.webmanifest` | Installation sur l'écran d'accueil du téléphone, fonctionnement hors ligne |

Deux choix structurants, conformes à votre consigne : aucune histoire inventée (les fiches sont des emplacements de démonstration, sans synopsis, à remplir depuis le back-office), aucun tiret cadratin ni signe ressemblant dans tout le projet.

## Le travail mobile, terminé cette session

Tout le public ou presque regarde sur un téléphone : chaque écran a été repris pour le pouce, puis contrôlé par un audit automatique sur 14 pages et 3 formats (390 × 844, 360 × 740, paysage 844 × 390).

Trois défauts réels ont été trouvés et corrigés :

1. **Le navigateur zoomait la page** (fenêtre interne de 457 px au lieu de 360). La cause : des rangées et des grilles dont la largeur était dictée par leur contenu. Corrigé avec des colonnes `minmax(0, 1fr)` et des largeurs minimales à zéro. Résultat : le contenu fait exactement la largeur de l'écran, sans débordement ni zoom, sur les 10 pages testées.
2. **Des boutons trop petits** (jusqu'à 91 zones sous 44 px sur l'accueil). Corrigé : plancher de 44 × 44 px sur toutes les zones cliquables, champs de formulaire en 16 px.
3. **Des textes trop fins** : plus aucun texte sous 12 px.

Ce qui a été ajouté pour le téléphone :

- un **menu plein écran** (bouton en haut à droite) avec les 7 rubriques, la déconnexion, le choix de la langue et l'appel à l'abonnement ;
- une **barre d'onglets en bas** (Accueil, Catalogue, Ma liste, Studio, Compte), avec l'onglet actif mis en évidence et la place réservée pour l'encoche ;
- une **navigation dans le lecteur au doigt** : un appui affiche ou masque les commandes, deux appuis à gauche ou à droite reculent ou avancent de 10 secondes avec une animation de confirmation ;
- le **volume et le mode Picture in Picture masqués** sous 640 px, les fenêtres transformées en feuilles glissées depuis le bas, les messages de confirmation au-dessus de la barre d'onglets.

Deux problèmes découverts au passage, invisibles dans les mesures : la note de démonstration interceptait les appuis sur le lecteur (elle ne capte plus le pointeur), et le serveur de prévisualisation ne savait pas répondre aux requêtes partielles, ce qui empêchait tout défilement dans la vidéo (remplacé par un serveur qui gère la norme HTTP Range).

## Résultat de l'audit final

| Contrôle | Résultat |
| --- | --- |
| Débordement horizontal | 0 sur 14 pages, dans les 3 formats |
| Éléments hors cadre | 0 |
| Zones tactiles sous 44 px | 0 |
| Textes sous 12 px | 0 |
| Erreurs JavaScript | 0 |
| Total | **1 seul écart résiduel, corrigé depuis** (un repère de 11 px en paysage) |

Mesures relevées à 360 px : 2 affiches par ligne (157 px chacune), 3 visibles par écran dans les rangées qui défilent, 2 filtres drapeaux par ligne (166 × 48 px), contenu de 328 px dans un écran de 360 px.

## Fichiers à télécharger

- `benincine-netlify.zip` (3,00 Mo, 49 fichiers) : version complète, à déposer sur Netlify.
- `benincine-netlify-LEGER.zip` (0,82 Mo, 43 fichiers) : sans les vidéos ni les sources d'image, pour un premier test rapide.

## Pour aller plus loin

Brancher un vrai lecteur vidéo avec DRM, relier les paiements Mobile Money à un prestataire agréé, et remplacer les 12 emplacements de démonstration par vos titres depuis le back-office.
