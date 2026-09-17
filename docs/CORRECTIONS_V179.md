# v179 — Projets : sauvegardes distinctes et relues

Cette version poursuit la protection des projets étudiée pendant le check-up.
Elle concerne les enregistrements manuels et le fichier de secours créé avant
l'ouverture d'un autre projet.

## Défauts reproduits

Deux sauvegardes effectuées dans la même seconde recevaient le même nom. Avec
deux contenus différents, le second remplaçait le premier. Le fichier de secours
`avant-ouverture` utilisait la même règle de nommage.

Le programme annonçait également un projet enregistré dès que l'écriture
renvoyait un chemin. Une simulation où la lecture du fichier renvoyait une
chaîne vide reproduisait ce faux succès. Pour le secours, l'ouverture du projet
entrant aurait donc pu commencer sans avoir vérifié que l'ancien état était
effectivement récupérable depuis ce fichier.

## Corrections

- La liste des documents est relue avant chaque enregistrement. Si le nom est
  déjà présent, le nouveau fichier prend un suffixe `-2`, `-3`, etc. Les noms
  existants restent intacts, y compris après un redémarrage de l'application.
- La comparaison ignore la casse et parcourt toutes les extensions, pour tenir
  compte de Windows : un nom se terminant par `.DRM16` réserve aussi le nom
  équivalent en minuscules. Le préfixe est normalisé avant cette comparaison.
- Après écriture, le fichier est relu par le pont et chaque octet est comparé
  aux octets UTF-8 envoyés. Une lecture vide, refusée, tronquée ou différente ne
  donne plus un message de réussite.
- Si le secours ne peut pas être vérifié, le projet entrant n'est pas appliqué :
  ses réglages et ses sons ne remplacent pas l'état courant.
- Un fichier dont la relecture échoue reste présent pour une récupération
  éventuelle. Une tentative suivante choisit un autre nom s'il est listé.

## Fichiers

| Fichier | Changement |
|---|---|
| `page/js/635-projet-drm16.js` | Noms disponibles, relecture des octets et refus du secours invérifiable |
| `app/src/main/assets/drm16.html` | Page réassemblée à partir des sources |
| `outils/test-projet.cjs` | Régressions sur les noms, les erreurs de lecture et la conservation de l'état |
| `outils/test-navigateur.py` | Parcours dans Chromium et plafond de projet du pont simulé aligné sur les ponts natifs |
| `app/build.gradle` | Version Android 179 |
| `bureau/src-tauri/Cargo.toml`, `tauri.conf.json` | Version bureau 179.0.0 |
| `README.md`, `docs/CHECKUP_V176.md`, ce bilan | Suivi des corrections et limites |

## Vérifications

Validation locale du 17 septembre 2026 :

- `bash outils/controles.sh` : tous les contrôles passent, avec assemblage
  exact des 147 sources, régressions JavaScript, compilation Java simulée de
  54 fichiers, tests fichiers/MIDI et vérification de l'archive PC. Les onze
  tests Rust avec ports simulés de la v178 passent également.
- `outils/test-projet.cjs` : collisions à la seconde pour les enregistrements
  manuels et les secours, noms Windows, suffixes existants, préfixe normalisé,
  accents et emoji, capacités manquantes et liste refusée sont vérifiés.
- Huit défauts de relecture sont injectés, chacun dans une sauvegarde manuelle
  et avant ouverture : lecture vide, exception, Base64 invalide, troncature,
  octet différent, espace ajouté, accent changé et JSON équivalent écrit avec
  un échappement Unicode différent. Aucun de ces cas ne donne un faux succès
  ni ne remplace les réglages ou les sons par ceux du projet entrant.
- `outils/test-navigateur.py` : les **20 groupes** passent dans Chromium,
  dont le chargement et le jeu des 29 machines dans trois formats d'écran,
  le parcours normal d'enregistrement/ouverture et le nouveau groupe v179.
  Celui-ci vérifie les copies distinctes, le texte UTF-8, le secours tronqué
  sans mutation ni rechargement, et un projet valide de **8,9 Mio** avec un
  vrai WAV, écrit en plusieurs morceaux puis relu intégralement.
- Versions Android/bureau, syntaxe Python et espaces de fin de ligne contrôlés.

Le pont du navigateur est simulé : ces résultats ne constituent pas une
compilation APK ou Tauri/Windows. Les workflows GitHub restent chargés de ces
compilations. Le banc audio complet et les essais sur matériel n'ont pas été
relancés pour cette correction de sauvegarde.

## Limites et suite

La relecture vérifie le contenu retourné à cet instant par le stockage. Elle ne
garantit pas sa conservation après une panne matérielle. La recherche de nom
évite les collisions avec les noms effectivement listés ; ce n'est pas une
réservation atomique entre plusieurs programmes écrivant simultanément dans le
même dossier. Les ponts natifs peuvent aussi renvoyer une liste vide sur certaines
erreurs d'accès, sans fournir de code d'erreur distinct.

**La reprise automatique d'une ouverture interrompue par l'arrêt brutal de
l'application reste à réaliser.** La sauvegarde de secours est mieux protégée,
mais la mémoire de la page et les fichiers de sons ne forment pas encore une
transaction durable commune. Les restaurations après erreurs retournées au
programme, déjà présentes depuis la v176, sont conservées et retestées.

L'archive `drm16_android_v179.zip` contient uniquement les fichiers nouveaux ou
modifiés depuis la v178, sous le dossier `drm16_android/`.
