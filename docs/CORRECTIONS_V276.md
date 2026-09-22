# DRM16 v276 — huit ensembles Eurorack complets

## Base et périmètre

Base : v275, commit `e637fe0e1407ec9c625a93f72305b6d22831e4fb`.
La page de base a été comparée à son empreinte Git :
`d88b7e0b621ccd7831092473c7d7d53d9a08af2b`.
Les correctifs v275 de la vue de plusieurs machines sont conservés.

Demande : disposer de montages réunissant kick, basse et mélodie, et non
seulement une percussion ou une ligne isolée. Cette version ajoute huit
patchs à la bibliothèque existante : 32 montages au total, toujours les
103 modules natifs. Aucun nouveau moteur ou échantillon à télécharger.

## Ouvrir et jouer

MENU → EURORACK → RACK ▾ → MONTAGES → ENSEMBLES.
Choisir de préférence un rack vide pour conserver son travail. Le remplacement
est confirmé lorsque le rack contient des modules. Les sept autres emplacements
ne sont pas modifiés. Le chargement d'un ensemble arrête la lecture ; START
repart ensuite au premier temps avec tous les séquenceurs réinitialisés.
Le tempo indiqué devient le tempo général, donc aussi celui du set de machines.

| Montage | BPM | Modules | Câbles | Caractère |
|---|---:|---:|---:|---|
| Techno mélodique | 128 | 24 | 31 | Kick droit, clap, basse ronde et mélodie sur quatre mesures. |
| Acid & Arpège | 138 | 26 | 33 | Basse résonante, glissando, saturation légère et arpège FM. |
| House nocturne | 122 | 24 | 31 | Charley à contretemps, basse triangulaire et motif doux. |
| Dub profond | 110 | 24 | 31 | Kick syncopé, rim, basse espacée et échos mélodiques. |
| Break mélodique | 164 | 24 | 31 | Kick à trois frappes par mesure, caisse claire et thème lumineux. |
| Électro minuit | 118 | 24 | 31 | Basse carrée filtrée et phrase FM métallique. |
| Downtempo | 90 | 24 | 31 | Batterie lente, basse profonde et notes de cloche. |
| Tribe harmonique | 150 | 24 | 31 | Kick droit, tom euclidien, basse rapide et motif répétitif. |

Les appellations décrivent des compositions originales et non la reproduction
d'un morceau ou d'un appareil particulier.

## Organisation des patchs

Une CLOCK unique pilote les trois générateurs de rythme et les deux SEQ 16.
Le kick, la caisse claire/clap/rim/tom et le charley sont synthétisés séparément.
Le premier MIX 4 réunit la batterie. La basse et la mélodie ont chacune leur
séquenceur, oscillateur, filtre, enveloppe AD et VCA.

La rangée du haut contient l'horloge, la batterie et la basse. Celle du bas
contient la mélodie, ses effets, le mix général, LIMIT et OUTPUT. Les positions
se sauvegardent par le champ natif `r`, comme dans les racks précédents.

- **MIX 4 du haut** : A = kick, B = caisse/clap/rim/tom, C = charley, D = libre.
- **MIX 4 du bas** : A = batterie entière, B = basse, C = mélodie, D = libre.

Mettre un niveau à zéro coupe sa partie. FOCUS agrandit les potards ; les
réglages emploient le lissage audio existant, sans recréer le graphe.
Le premier SEQ 16 modifie la basse, celui du bas modifie la mélodie.

Les deux phrases sont préparées en **la mineur**. Les notes du SEQ 16 sont
converties par sa formule native `round(valeur * 24) / 12` : la programmation
emploie directement des demi-tons / 24. Aucun analyseur n'est utilisé pour
quantifier une tension future. Selon le branchement CLOCK OUT, /2 ou /4,
les seize notes occupent une, deux ou quatre mesures. Les notes restent
librement modifiables et ne sont pas verrouillées dans la gamme initiale.

L'écho et la réverbération sont placés sur la mélodie, pas sur le mix entier.
L'écho est réglé au tempo initial du montage ; TIME reste le temps absolu du
module natif et ne suit pas automatiquement les changements ultérieurs de BPM.
Les réglages de départ réservent de la marge avant les protections générales.
Des modifications importantes de filtre/résonance/niveaux peuvent demander
un nouveau réglage du mix : LIMIT n'est pas une garantie universelle.

## Les 12 fichiers livrés

| Fichier | Changement |
|---|---|
| `page/js/452-ensembles-eurorack.js` | Définitions, générateur de câblage, notes, rythmes, rangées et repères des huit patchs ; nouvelle famille ENSEMBLES. |
| `page/js/450-montages-tout-faits.js` | Chargement des rangées facultatives, arrêt avant chargement des nouveaux ensembles, guide des deux mixeurs et cartes avec BPM/gamme/modules. Les 24 définitions antérieures restent intactes. |
| `page/css/350-ensembles-eurorack.css` | Habillage des huit cartes et du guide ; aucun changement de mise à l'échelle des façades. |
| `page/html/460-note-eur.html` | Notice pratique des ensembles, deux mixeurs, horloge, sauvegarde et précision sur TIME ; total mis à jour à 32 montages. |
| `page/ordre.txt` | Insertion des deux nouvelles sources au bon endroit. |
| `app/src/main/assets/drm16.html` | Page synchronisée avec les sources modifiées et ajoutées. |
| `outils/test-ensembles-eurorack.py` | Tests de structure, interface, réglages, sauvegarde et rendu audio multicanal. |
| `.github/workflows/android.yml` | Ajout du test et du rapport `app/build/reports/ensembles-eurorack.json` ; aucun ancien contrôle supprimé. |
| `app/build.gradle` | versionCode/versionName 276. |
| `bureau/src-tauri/Cargo.toml` | Version 276.0.0. |
| `bureau/src-tauri/tauri.conf.json` | Version 276.0.0. |
| `docs/CORRECTIONS_V276.md` | Ce guide et le bilan des vérifications. |

## Vérifications effectuées

**724 vérifications, aucune erreur**, dans Chromium, avec la page chargée en
mémoire et un stockage local temporaire simulé. Formats : 320×568, 393×851,
880×400, 1280×800 et 1920×1080.

Contrôles : prises et sens de chaque câble, paramètres dans leurs bornes,
notes dans la gamme initiale, une horloge/deux séquenceurs/deux mixeurs,
façades et câbles dessinés, choix et annulation réels dans le catalogue,
START, réglages clavier natifs en FOCUS, cibles audio après lissage,
indépendance des notes, conservation des sept autres racks, aller-retour
de sauvegarde et intégrité des modèles après modification personnelle.

Chaque montage a été rendu sur **quatre mesures à 48 000 Hz** dans un
OfflineAudioContext. Les canaux de contrôle séparent : mix gauche/droite,
kick, caisse/percussion, charley, basse, mélodie gauche/droite, les deux
CV et les deux enveloppes. Les tests trouvent un signal non nul et fini
dans les cinq voix ; les crêtes du mix restent sous 0,98 avant les protections
générales, avec les réglages fournis. Les instants de déclenchement et les
CV sont comparés aux pas attendus. Les mesures observées lors du passage
final placent le plus grand pic de mix à environ **0,682** ; les percussions
bruitées et réverbérations peuvent faire légèrement varier cette mesure.
Ce nombre n'est pas une garantie sur des réglages modifiés.

Six suites précédentes ont aussi été exécutées avec succès :
confort mobile (12 cas), façades (16 cas), Focus Eurorack (4 formats et
412 ouvertures de module), menu machines, Focus mixage et vue d'ensemble
(480 vérifications). Les autres suites du workflow sont conservées, mais
n'ont pas été réexécutées ici dans leur totalité.

Les deux sources existantes modifiées et la page de base ont été identifiées
par leurs empreintes Git. Les substitutions/inclusions de sources sont
vérifiées octet par octet ; aucun autre morceau de la page n'est changé.
La vérification complète par `outils/assembler.py --verifier` reste dans le
workflow GitHub, avec tous les contrôles Java/Rust et Android précédents.

### Limites des essais

Pas de compilation APK ou Windows ni d'essai sur les appareils de l'utilisateur
pendant cette intervention. La navigation `file://` est bloquée dans cet
environnement de contrôle ; les essais emploient donc `--contenu`. Sur GitHub,
le même test utilise le chargement local habituel. Le rendu audio hors ligne
ne constitue ni une écoute humaine ni une mesure de charge CPU/latence sur
Samsung ou Windows. Les racks de 24–26 modules sont plus chargés que le patch
de démonstration ; vérifier le confort réel après installation.

## Ce qui reste inchangé

Recettes audio des 103 modules, MIDI, Freesound, moteurs des autres machines,
sons personnels, format de sauvegarde et nombre de racks (huit). Les exemples
et les 24 anciens montages ne sont pas remplacés. Aucun rack de l'utilisateur
n'est chargé automatiquement par cette mise à jour.

## Installation

Archive de correction à appliquer sur la v275, pas un projet complet ni un
installateur. Le dossier racine est `drm16_android/`, pour le script Termux
habituel. Sur PC, lancer ensuite une nouvelle exécution **Exécutable Windows**
sur `main`, récupérer `drm16-windows` et installer son `DRM16-installeur.exe`.
La fabrication APK seule ne remplace pas l'application déjà installée sur PC.
