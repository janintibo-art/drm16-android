# DRM16 — v277 : installateur Windows automatique

## Base et objectif

Patch préparé sur la v276 du dépôt `janintibo-art/drm16-android`, branche
`main`, commit `602340de331be6a3ce8766443c2c5b8372ae28d7`.
Les cinq fichiers existants utilisés pour la comparaison ont été vérifiés
contre leurs empreintes de blob GitHub, y compris le workflow APK non modifié.

Jusqu'ici, `.github/workflows/windows.yml` ne déclarait que
`workflow_dispatch` : envoyer une mise à jour ne déclenchait donc pas ce
workflow. Il fallait demander l'exécutable séparément.

La v277 ajoute le déclenchement Windows à chaque envoi sur `main`. Le push qui
applique cette correction doit lui-même lancer la première fabrication
automatique. Télécharger le ZIP sans l'appliquer et l'envoyer ne change pas le
dépôt : la commande Termux habituelle reste nécessaire.

## Fonctionnement après application

Une mise à jour envoyée sur `main` déclenche deux workflows indépendants :

- `APK`, inchangé, fabrique la version Android et les archives pour navigateur.
- `Exécutable Windows` prépare les ressources sur Linux, compile sur Windows,
  lance les contrôles existants et joint l'installateur quand tout réussit.

Le titre des exécutions Windows commence par `Windows ·`, suivi du message du
commit. Pour un lancement manuel sans message de push, la référence de la
branche sert de titre de repli. Le bouton `Run workflow` reste disponible.
Aucun tag ni publication n'est requis pour un envoi sur `main`.

Aucun filtre de fichiers n'a été ajouté : les changements de sons, d'interface,
de code, de configuration ou de documentation sur `main` déclenchent Windows.
Les pushes vers d'autres branches et les seuls tags ne déclenchent pas ce
workflow automatiquement. Le lancement manuel reste possible.

### Plusieurs mises à jour rapprochées

Le groupe de concurrence Windows contient désormais la référence Git ET
l'empreinte du commit. Deux mises à jour différentes ne s'annulent donc plus
entre elles dans ce workflow. Elles peuvent s'exécuter en parallèle ou attendre
un exécuteur GitHub disponible. Seul un second lancement du même commit sur la
même référence peut remplacer le premier.

Le préfixe `windows-` est distinct du préfixe `apk-` : le suivi de l'APK et celui
de Windows restent séparés. Cette règle ne modifie pas la gestion de concurrence
du workflow APK.

## Récupérer la mise à jour sur le PC

Dans GitHub : **Actions → Exécutable Windows → l'exécution de la version
souhaitée → Artifacts → drm16-windows**.

Attendre la réussite de la compilation Windows, pas seulement celle de l'APK.
L'archive `drm16-windows` contient `DRM16-installeur.exe`. Sur le PC, extraire
l'archive, fermer l'application, puis lancer ce nouvel installateur.

`drm16-pc-complet` reste la version pour navigateur, sans installateur.
`bureau-prepare` reste un paquet de travail intermédiaire et n'est pas le
fichier à installer.

Cette correction automatise la FABRICATION de l'installateur sur GitHub. Elle
n'ajoute pas de téléchargement ou de mise à jour silencieuse à l'application
Windows déjà installée : le nouvel installateur doit toujours être récupéré
et lancé sur le PC.

## Fichiers livrés — cinq uniquement

1. `.github/workflows/windows.yml` : déclenchement `push` limité à `main`,
   lancement manuel conservé, titre explicite des exécutions, groupe de
   concurrence propre à chaque commit. Les jobs, étapes, actions, commandes,
   tests, délais et noms des fichiers produits sont inchangés.
2. `app/build.gradle` : `versionCode` et `versionName` passent à `277`.
3. `bureau/src-tauri/Cargo.toml` : version du paquet `277.0.0` ; dépendances et
   réglages de compilation inchangés.
4. `bureau/src-tauri/tauri.conf.json` : version `277.0.0` ; identifiant,
   configuration de la fenêtre, sécurité et installateur NSIS inchangés.
5. `docs/CORRECTIONS_V277.md` : ce document.

Aucun changement dans le moteur audio, les montages Eurorack, les sons, les
réglages, les sauvegardes, le MIDI, Freesound ou l'interface. Le HTML assemblé
n'a pas besoin d'être modifié puisque les sources de la page ne changent pas.
`bureau/preparer.sh` conserve la synchronisation de version Android/Windows.
Aucun secret, fichier personnel ou fichier binaire compilé n'est inclus.

## Vérifications effectuées

Vingt-cinq contrôles STATIQUES ont réussi : lecture YAML sans clefs dupliquées,
déclencheurs attendus, groupes de concurrence, dépendance de la compilation
Windows à la préparation Linux, conservation du test Windows bloquant et de
l'installateur à fournir, analyse JSON/TOML et cohérence des trois fichiers de
version. Le bloc `jobs` du workflow Windows est identique octet par octet à
celui de la v276.

Les fichiers de base utilisés pour construire ce patch correspondent aux blobs
GitHub lus sur le commit indiqué en tête de ce document.

Ces contrôles ne sont ni une compilation Windows ni une validation distante
par GitHub Actions. Aucun APK ni EXE v277 n'a été compilé dans cet environnement.
Le déclenchement réel, la compilation et les essais natifs seront vérifiés par
GitHub après l'envoi de la correction. Aucun test existant n'a été désactivé
ou rendu facultatif par cette mise à jour.
