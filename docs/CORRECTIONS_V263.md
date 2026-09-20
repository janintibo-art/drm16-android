# DRM16 — v263 : menu des machines et accès aux outils

## Base et périmètre

Patch incrémental pour la v262 (commit GitHub de référence :
`a8c54351d3e468d8705d7eec3f9f0d0ae7467deb`). Il poursuit la partie « menu des
machines » de la phase 5 du rapport graphique fourni. Il ne remplace pas les
travaux de confort mobile v260, de matières v261 ou de Focus Eurorack v262.

L'ancien écran présentait les machines et les outils dans une même longue
liste. Les cartes reposaient essentiellement sur leur texte. La v263 sépare
les deux usages et ajoute des repères pour retrouver rapidement une façade.

## Ce qui change à l'écran

### Catalogue des 29 machines

Chaque carte réunit le constructeur ou la famille, le nom, la catégorie,
une description et une silhouette vectorielle locale. Les vignettes sont des
repères simplifiés par famille de façade, pas des photographies du matériel.
Les accents colorés distinguent les familles sans transformer tout le menu en
surface lumineuse. La machine actuellement sélectionnée porte un contour et
le badge « ACTUELLE » ; ce badge ne signifie pas qu'elle est en lecture.

Les cinq filtres sont DRUM, SAMPLER, SYNTH, GROOVEBOX et FX, avec TOUT pour
revenir à l'ensemble. Une machine peut appartenir à deux familles : par
exemple, les appareils combinant échantillonnage et groovebox restent
trouvables dans les deux. Le nombre de résultats reste celui des cartes,
sans doublons.

La recherche accepte un nom, un constructeur, une famille ou un terme de la
description. Elle ignore la casse, les accents et les séparateurs. Les mots
sont combinés : « Korg Kaoss » et « tr 808 » sont acceptés. Une recherche sans
résultat donne une explication et un bouton TOUT AFFICHER, plutôt qu'un écran
vide sans issue.

Le libellé Eurorack, auparavant fixé à quatorze modules dans le menu, utilise
maintenant la longueur réelle du catalogue : 103 types sur la base v262.

### Les neuf outils dans leur propre onglet

Bibliothèque, travail du MIDI, enregistreur MIDI, notices, transfert Syro,
table de mixage, Studio Tibo, Nexus Beat Lab et diagnostic audio sont
regroupés dans OUTILS. Ils ont leur propre recherche et les mêmes cartes.
Leurs identifiants et leurs actions d'ouverture ne changent pas.

Cette version harmonise leur accès au menu, **pas encore leur interface
intérieure**. La Bibliothèque, Freesound et la gestion des kits restent
accessibles avec leurs fonctions existantes.

### Téléphone et paysage

La grille utilise une colonne en petit portrait, deux sur un écran plus
large et trois sur un grand écran. L'entête, la recherche et les filtres
restent accessibles lors du défilement. Une disposition compacte est prévue
pour le paysage et pour un petit portrait dont la hauteur disponible baisse.
Dans ce dernier cas, la rangée des catégories se fait défiler horizontalement.

Les boutons de navigation et de filtre ainsi que le champ de recherche ont
des cibles d'au moins 44 pixels dans les formats contrôlés. Le clavier
logiciel n'est pas demandé au démarrage. Le clic sur une carte retire le
focus du champ de recherche. Les préférences de réduction des animations
sont respectées.

## Préservation des fonctions existantes

Les cartes existantes sont déplacées dans une grille, **jamais clonées**.
Leurs écouteurs de clic restent l'unique point d'entrée. Un choix de machine
conserve donc son comportement précédent, notamment la remise à zéro du zoom
et le chargement de sa mémoire. Revenir au menu conserve également l'arrêt
prévu par le code existant : cette version ne change pas cette règle.

Rechercher, filtrer ou changer d'onglet n'appelle ni le moteur audio, ni la
sélection de machine, ni l'enregistrement des réglages. Les filtres sont
conservés uniquement pendant la session ; aucun nouveau fichier ou format de
sauvegarde n'est ajouté. Les SVG sont intégrés au code et ne nécessitent ni
images distantes ni téléchargement supplémentaire. Aucune animation continue
ou capture de façade n'est créée.

Les sources audio, les sons, les séquenceurs, les motifs, les sauvegardes,
les ponts Android/PC, le MIDI, Freesound et les fonctionnalités de kits ne
sont pas modifiés. Après retrait des deux fragments ajoutés, le HTML livré
est identique octet pour octet au HTML v262 fourni.

## Fichiers livrés (10)

| Fichier | Modification |
|---|---|
| `page/css/230-menu-machines.css` | Nouvel habillage, grilles, cartes, recherche, états et dispositions compactes ; règles confinées à `#menu`. |
| `page/js/670-menu-machines.js` | Métadonnées des cartes, silhouettes SVG, recherche, filtres, séparation machines/outils et badge actuel ; fermeture locale sans nouvel état global. |
| `page/ordre.txt` | Ajout du CSS après `220-eurorack-focus.css` et du JavaScript après `665-clavier-et-souris.js`. |
| `app/src/main/assets/drm16.html` | Page assemblée incluant exactement ces deux nouveaux fragments, avant les fermetures CSS/JavaScript existantes. |
| `outils/test-menu-machines.py` | Tests du catalogue, des accès, de la recherche, des cibles tactiles et de l'absence d'appels audio pendant le filtrage. |
| `.github/workflows/android.yml` | Ajout du test du menu aux contrôles navigateur existants. |
| `app/build.gradle` | Version Android 263. |
| `bureau/src-tauri/Cargo.toml` | Version de la coque PC 263.0.0. |
| `bureau/src-tauri/tauri.conf.json` | Version PC 263.0.0. |
| `docs/CORRECTIONS_V263.md` | Ce compte rendu. |

## Vérifications réalisées

Les vérifications ci-dessous ont été exécutées dans Chromium, avec injection
de la page assemblée et stockage temporaire simulé. Elles ne manipulent pas
les sauvegardes du téléphone.

| Contrôle | Résultat |
|---|---|
| Nouveau catalogue | 359 vérifications, 5 formats, 0 erreur. |
| Formats du catalogue | 393×851, 880×400, 360×640, 1280×800 et 393×400. |
| Accès aux machines | Les 29 modèles contrôlés par clic dans le premier format, puis 5 modèles représentatifs dans chacun des 4 autres ; un seul aiguillage par clic. |
| Accès aux outils | Les 9 accès contrôlés dans le premier format, puis Bibliothèque et Notices dans les 4 autres. Pour Studio/Nexus, contrôle du panneau d'accueil, pas du contenu embarqué de l'iframe. |
| Recherche et catégories | Recherche multi-mots, accents et tirets ; remise à zéro ; aucun résultat ; filtres sans appel à `allerMachine`, `audioInit`, `stop` ou `save`. |
| Confort mobile v260 | 12 cas façade/format, 0 erreur. |
| Matières et états v261 | 16 cas façade/format, 0 erreur. |
| Focus Eurorack v262 | 4 formats, 412 ouvertures graphiques couvrant les 103 types, 0 erreur. |
| Syntaxe et intégrité | 3 blocs JavaScript vérifiés par Node ; CSS analysé sans erreur ; identifiants HTML statiques sans doublons ; page v262 inchangée hors ajouts ; positions d'assemblage concordantes. |

Les captures du menu en portrait, paysage et hauteur réduite ont également
été examinées. Elles ne sont pas incluses dans le patch pour conserver une
archive légère.

La navigation locale `file://` est bloquée par l'environnement de préparation
(`ERR_BLOCKED_BY_ADMINISTRATOR`) ; les tests ont donc utilisé leur option
`--contenu`. Sur GitHub, le nouveau test utilise le même chargement local que
les tests graphiques précédents. **La compilation de l'APK et la validation
sur le Samsung restent à faire après application du patch.** Aucun résultat
de compilation Android ou Windows n'est revendiqué ici.

## Suite de la partie graphique

Restent l'harmonisation intérieure des panneaux Bibliothèque, enregistreur,
Syro et notices, puis les retours visuels musicaux, les VU-mètres et les
indications d'automation. La v263 ne présente pas ces étapes comme terminées.

## Application du patch

L'archive contient uniquement les dix fichiers nouveaux ou modifiés sous le
dossier racine `drm16_android/`. Elle est destinée au script de mise à jour
Termux habituel, sur un dépôt déjà en v262. Aucune copie manuelle de source,
nouvelle dépendance ou modification de configuration n'est nécessaire.
