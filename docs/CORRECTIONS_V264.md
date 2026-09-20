# v264 — Graphisme des panneaux d'outils

## Base et périmètre

Patch à appliquer après la v263. Base : commit
`3593423f8b147a396cafc23f6f4ac184d4a9ae6f` du dépôt
`janintibo-art/drm16-android`, intitulé « v263 Graphisme : menu machines et outils
avec recherche et categories ».

Le travail porte sur l'intérieur des outils, après les façades v260–v261, le Focus
Eurorack v262 et le catalogue v263. Il s'agit d'un habillage CSS, pas d'une
réécriture des fonctionnalités. Aucun JavaScript de l'application n'est changé.

## Ce qui gênait

- Les outils utilisaient des présentations différentes. Selon le panneau, les
  commandes d'aide et de fermeture étaient peu habillées, petites, ou prenaient
  la place du titre. Plusieurs commandes d'importance différente avaient le
  même aplat orange.
- Sur une fenêtre de 880 × 400, l'enregistreur ne laissait que 65 pixels à la
  partie inférieure : peu de place pour l'aiguillage et les prises. Le piano
  roll n'avait que 85 pixels de hauteur disponible. Mesures sur la v263 avec
  données temporaires et un environnement Chromium, hors barres Android.
- Certaines commandes de bibliothèque étaient encore hautes de 40 pixels.
  Le mélange de petites commandes, de gros boutons et d'onglets arrondis
  manquait de cohérence.
- Les tranches du mixeur faisaient 104 pixels de large, avec de petites
  légendes et commandes. La place supplémentaire du défilement horizontal
  n'était pas utilisée pour améliorer leur lisibilité.

## Changements visibles

### Une famille d'outils commune

Bibliothèque, enregistreur MIDI, travail du MIDI, notices, table de mixage et
transfert Syro partagent une barre supérieure anthracite légèrement texturée,
un titre sur plusieurs lignes au besoin et un petit repère de fonction. Les
boutons sont en relief discret, les champs encastrés et les cadres harmonisés.
L'accent est hérité de la machine active, au lieu d'imposer une couleur unique
à tout le logiciel. Les commandes secondaires sont neutres ; REC, lecture du
set et COUPE restent distingués.

Les fermetures restent dans la barre supérieure, hors des zones de défilement.
Les zones de sécurité de l'écran sont prises en compte. Les textures sont des
dégradés CSS statiques : aucun fichier image, aucune police supplémentaire,
aucun téléchargement et aucune boucle d'animation ajoutée.

### Bibliothèque et notices

Les six rayons SONS, PRISES MIDI, SAUVEGARDES, ARCHIVE, FREESOUND et MACHINES
restent à leur place. Les onglets sélectionnés sont repérés par un liseré et
une bordure. Les listes, filtres, compteurs, cartes de sons et zones de détail
sont harmonisés. En petit portrait, le bloc d'actions initial peut utiliser
deux colonnes, avec retour à la ligne des libellés.

Les commandes principales passent à 44 pixels au minimum ; la recherche,
l'affectation, les kits et la barre d'essai gardent leurs actions existantes.
La bibliothèque dispose d'une colonne plus large sur grand écran. Les notices
conservent intégralement leurs textes, sommaires et réglages ; les liens du
sommaire des modules deviennent de vraies cibles espacées. Aucun contenu
documentaire ancien n'a été corrigé ou réécrit dans ce lot graphique.

### Enregistreur et travail du MIDI

En paysage d'au moins 700 pixels de large et d'au plus 540 pixels de haut, les
réglages / prises de l'enregistreur passent à droite de sa vue centrale. Le
travail du MIDI utilise le même principe pour ses actions de sauvegarde et de
report. Cette présentation est aussi utilisée à partir de 1100 pixels de large.
Chaque zone garde son propre défilement.

En portrait, les panneaux restent verticaux. Le sélecteur de prise occupe une
ligne entière lorsque l'écran est étroit ; les outils du piano roll sont sur
une rangée défilante, au lieu d'occuper plusieurs lignes au détriment du dessin.
Une variante compacte préserve la zone centrale lorsque la fenêtre est courte.
Les commandes de transport défilent horizontalement, avec un message d'état
sur une ligne distincte au début du rail.

**Exception volontaire à l'agrandissement général :** les petites touches M/S
situées à gauche de la vue d'enregistrement font 28 × 28 pixels. Les pistes
restent à 34 pixels et la règle à 22 pixels, comme le dessin existant. Agrandir
ces seules lignes en CSS aurait désaligné les étiquettes et les notes. Les
commandes principales et les listes inférieures sont, elles, à 44 pixels.
Le canvas MIDI, ses coordonnées, le dessin des notes et les événements ne sont
pas modifiés.

### Mixage, Syro et diagnostic

Les tranches de la table passent à 148 pixels, avec des légendes plus grandes,
un égaliseur encastré et des commandes de coupe / solo mieux séparées. Les
curseurs conservent leurs valeurs, plages et événements. Le défilement vertical
permet d'atteindre le bas des tranches ; le défilement horizontal atteint les
dernières machines. Les mesures de niveau existantes sont conservées.

Le transfert Syro bénéficie des mêmes champs, boutons et cartes d'instructions.
Le diagnostic audio possède un relevé encadré et des actions organisées sur deux
colonnes. Aucun changement de transfert ou de diagnostic n'est apporté.

### Studio Tibo et Nexus

Seule la barre supérieure de leur conteneur et l'éventuel message d'absence
sont harmonisés. **Le contenu des deux applications invitées n'est pas
redessiné.** Leurs iframes et leur dimensionnement existant restent en place.

## Les neuf fichiers livrés

| Fichier | Modification |
| --- | --- |
| `page/css/240-outils-studio.css` | Nouvel habillage, commandes, dispositions portrait/paysage, réduction des animations. |
| `page/ordre.txt` | Ajout du fragment CSS après `230-menu-machines.css`. |
| `app/src/main/assets/drm16.html` | Page assemblée avec le nouveau fragment. |
| `outils/test-outils-studio.py` | Test navigateur des panneaux, cibles, défilements et commandes. |
| `.github/workflows/android.yml` | Exécution du nouveau test après celui du catalogue. |
| `app/build.gradle` | `versionCode` et `versionName` à 264. |
| `bureau/src-tauri/Cargo.toml` | Version de bureau à `264.0.0`. |
| `bureau/src-tauri/tauri.conf.json` | Même numéro de version. |
| `docs/CORRECTIONS_V264.md` | Présent compte rendu. |

## Vérification de l'intégrité de la base

Le fichier HTML de la v263 a été vérifié contre son identifiant de blob Git :
`cc355204559b4ca4861a0ee615c5fd396baaebc2`.

Le nouveau CSS est concaténé immédiatement après le fragment v263
`230-menu-machines.css`, à la position inscrite dans `page/ordre.txt`. Retirer
ce seul ajout du HTML v264 redonne **octet pour octet** le HTML de la v263.
Les trois blocs de script embarqués sont strictement identiques. Il n'y a
aucun changement de balise, d'identifiant ou de gestionnaire d'événement.
L'ordre d'assemblage comporte désormais 172 fragments.

Cette vérification de concaténation a été faite dans l'environnement de travail.
Le contrôle complet `outils/assembler.py --verifier`, à partir de toutes les
sources du dépôt, reste exécuté par les contrôles GitHub habituels.

## Contrôles et limites

- Nouveau test : **1 086 vérifications, aucune erreur**, dans six fenêtres :
  393 × 851, 880 × 400, 360 × 640, 1280 × 800, 393 × 400 et 320 × 568.
- Les neuf accès aux outils, leurs fermetures, la lisibilité des titres et les
  cibles principales sont contrôlés. Les six rayons et les notices sont ouverts.
- Les essais interactifs comprennent : recherche vide, changement de machine
  depuis la bibliothèque, réglage de grille et zoom MIDI, ajout d'une note par
  le canvas puis suppression, alignement des pistes sur des événements MIDI
  synthétiques, coupe / solo, fader et accès à la dernière tranche du mixeur.
- Régression v260 : **12 cas façade / format, aucune erreur**.
- Régression v261 : **16 cas façade / format, aucune erreur**.
- Focus Eurorack : **quatre formats et 412 ouvertures, aucune erreur**.
- Menu v263 : **359 vérifications dans cinq formats, aucune erreur**.
- Les captures des panneaux ont été examinées, notamment bibliothèque,
  enregistreur, piano roll, table de mixage et diagnostic, en portrait et paysage.
  Elles ne sont pas incluses dans l'archive pour conserver un patch léger.

Les vérifications locales emploient Chromium 144 et un stockage temporaire
simulé. Elles ne manipulent pas les données du téléphone. Les essais des notes
MIDI sont des interactions sur des données synthétiques. L'affichage de
Freesound est contrôlé, mais pas une recherche ou un téléchargement avec un
compte réel. Pour Studio Tibo et Nexus, le test contrôle le conteneur parent,
pas l'application invitée complète.

L'APK n'a pas été compilé dans cet environnement. La compilation Android,
les contrôles complets du dépôt et la validation sur le Samsung sont à faire
par GitHub Actions et sur l'appareil, comme pour les mises à jour précédentes.

## Ce qui n'a pas changé

Aucun moteur audio, aucune synthèse, aucun sample, motif, format de sauvegarde,
fonction MIDI, traitement de son, export, accès Freesound ou pont Android/PC
n'est modifié. Les façades précédentes, le Focus Eurorack et le menu v263 sont
conservés. Les VU-mètres et les retours visuels musicaux plus poussés restent
le lot suivant : cette version ne modifie ni leur calcul ni leur animation.

L'archive est un patch, pas un projet complet : elle contient seulement ces
neuf fichiers sous la racine `drm16_android/`.
