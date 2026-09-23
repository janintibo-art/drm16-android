# DRM16 v282 — Jungle, drum and bass, uptempo, breakcore, gabber et psytrance

## Base et portée

Cette mise à jour se pose sur la v281, révision GitHub
`467884602ed01a50b7e7e916d1237c087a9b5e7a`.
Les versions deviennent **282** pour Android et **282.0.0** pour Windows.

Le catalogue passe de **106 à 109 modules** et de **38 à 44 montages**.
Les définitions et fonctions des 106 anciens modules, ainsi que les données des
38 anciens montages, ont été comparées à la page de référence : elles restent
identiques. Les nouveaux montages sont des compositions indépendantes.

## Utilisation

Dans **EURORACK → RACK ▾ → MONTAGES → JUNGLE / HARD / PSY**, choisir un montage,
puis appuyer sur **START**. Utiliser un emplacement vide pour ne pas remplacer
un montage personnel. La confirmation de remplacement du rack sélectionné est
conservée ; les sept autres emplacements ne sont pas remplacés.

Chaque nouveau montage comporte une batterie, une basse, une mélodie et des
effets, avec une seule horloge. **SCÈNES 8** fait varier les niveaux des quatre
parties sur huit scènes, soit une boucle de douze mesures. Laisser tourner pour
entendre les entrées, les breaks et les reprises.

Dans ces six montages, les groupes de SCÈNES 8 et le MIX 4 général sont :

| Groupe | Partie |
|---|---|
| A | Batterie, avec le break découpé lorsqu'il est présent |
| B | Basse |
| C | Mélodie |
| D | Effets et zaps |

Le groupe D est ici un groupe d'effets, **pas la nappe des exemples v281**.
Les deux MÉLO 32 commandent respectivement basse et mélodie. Le DRUM 32
commande A = kick, B = caisse claire, C = charley, D = effet percussif.

## Les trois nouveaux modules

### CORE KICK — famille PERCUSSIONS

Une grosse caisse synthétique dédiée aux timbres distordus, avec les commandes :

- **FOND Hz** : fondamentale de 32 à 90 Hz.
- **QUEUE ms** : durée de 40 à 600 ms.
- **ATTAQUE**, **DISTORSION**, **GABBER → UP**, **BRILLANCE**, **NIVEAU**.

Prises : **TRIG**, **RST**, **OUT**. La chute de hauteur, la saturation et la
brillance dessinent le son sans charger d'échantillon. La distorsion est
suréchantillonnée ×4 et suivie de filtres. Le réglage GABBER → UP transforme
progressivement la mise en forme, plutôt que de changer seulement le volume.

Une nouvelle frappe atténue rapidement la précédente pour éviter l'empilement
des queues. Les réglages de timbre sont pris au déclenchement suivant.
Les anciens modules de kick ne sont pas remplacés.

### BASS RAVE — famille OSCILLATEURS

Une voix de basse intégrée, pilotée par **TRIG** et **V/OCT**, avec **RST** et
**OUT**. Les enveloppes d'amplitude et de filtre sont intégrées.

Le mode **PSY → REESE** passe d'une dent de scie à deux dents désaccordées.
Un sinus grave réglable est mélangé séparément, sans traverser la distorsion
de la partie dent de scie. Les autres réglages portent sur l'octave, la durée,
le filtre, son enveloppe, le désaccord, la distorsion et le niveau.

À 0 V et à l'octave centrale, la fondamentale de référence est 55 Hz.
Les trois oscillateurs suivent le même V/OCT. Dans les exemples psytrance,
la basse est programmée sur les trois doubles-croches entre les kicks.

**Limite explicite :** les oscillateurs tournent en continu ; leur phase
n'est pas remise à zéro pour chaque note. Ce module n'est donc pas un moteur
de basse à phase réinitialisée.

### BREAK 32 — famille SÉQUENCEURS

Un lecteur de **16 tranches** associé à une séquence de **32 pas**. Le break
source est **original et synthétisé dans le code** : kick, caisse claire,
notes fantômes et charleys. Il ne contient pas l'Amen Break ni un enregistrement
commercial. Aucun fichier de son supplémentaire n'est téléchargé.

Chaque pas mémorise :

- la tranche 1 à 16, ou 0 pour un silence ;
- une à quatre répétitions ;
- la lecture avant ou inversée ;
- une probabilité de 0 à 100 %.

Les réglages communs sont la longueur de 1 à 32 pas, la transposition de −12 à
+12 demi-tons, la brillance, le niveau et la coupure. Les prises sont **CLK**,
**RST** et **OUT**. Les répétitions sont réparties dans la durée d'un pas.

Toucher un pas sur la façade ouvre son édition dans **FOCUS**. Les pages
**PAS 1–16** et **PAS 17–32** évitent une grille trop serrée. Copier une page
ou l'effacer demande confirmation. Raccourcir la séquence conserve les autres
pas ; la couper conserve sa position temporelle.

Les tranches 1, 8 et 11 comportent notamment des départs de kick ; les tranches
5 et 13 portent les principaux départs de caisse claire. Les autres contiennent
les charleys, notes fantômes ou fins de sons nécessaires aux recombinaisons.

**Limites explicites :** il n'y a pas encore d'importation de WAV personnel
dans ce nouveau module. La transposition change la vitesse et la durée de
lecture de la tranche, sans étirement temporel indépendant. Le rythme des
départs reste lié à CLK. Ce n'est pas une détection automatique des transitoires.

## Les six nouveaux montages

Les tempos ci-dessous sont les choix de ces exemples, pas des limites de genre.

| Montage | Tempo | Modules / câbles | Contenu |
|---|---:|---:|---|
| JUNGLE · FRAGMENTS | 168 BPM | 25 / 39 | Break recombiné, notes fantômes, inversions de fin de phrase, basse profonde et mélodie espacée. |
| DRUM & BASS · DOUBLE NUIT | 174 BPM | 25 / 39 | Batterie syncopée, break resserré, basse Reese désaccordée et réponses mélodiques. |
| UPTEMPO · IMPACT | 220 BPM | 24 / 37 | Kicks courts fortement distordus, roulements, basse à contretemps et notes mélodiques brèves. |
| BREAKCORE · FRACTURES | 202 BPM | 25 / 39 | Découpes discontinues, inversions et répétitions ×2 à ×4, kick hardcore et cycle mélodique de 15 pas. |
| GABBER · BÉTON | 185 BPM | 24 / 37 | Kick à queue distordue, caisse claire droite, charleys et thème rave mineur. |
| PSYTRANCE · SPIRALES | 146 BPM | 24 / 37 | Kick droit, basse entre les kicks, arpège en la mineur, modulation de filtre et zaps en écho. |

Tous les câbles, sons et séquences restent modifiables. Les niveaux initiaux
laissent de la marge ; pousser les gains, allonger les queues ou augmenter
fortement la distorsion change naturellement le résultat.

## Arrêt, remplacement du rack et affichage

Les nouveaux lecteurs transitoires gardent la propriété de leurs sources.
STOP annule les départs futurs et atténue les voix en cours. Une reconstruction
ou un remplacement du rack appelle leur nettoyage avant de débrancher l'ancien
graphe, y compris lorsque la liste des modules a déjà été remplacée.

Pour BASS RAVE, le filtre de suppression de composante continue est situé avant
le dernier amplificateur : sa réponse ne crée pas de queue supplémentaire après
la fermeture de celui-ci. Les enveloppes prennent aussi en charge le temps
simulé du rendu hors ligne.

L'éditeur BREAK 32 utilise des boutons et sélecteurs adaptés au Focus. Les
commandes contrôlées mesurent au moins 44 × 44 pixels dans les formats testés.
L'animation ne travaille que lorsque sa vue est visible et l'audio actif.
Elle n'accumule pas d'historique graphique pendant un rendu hors ligne.

## Fichiers livrés — 22 fichiers

| Fichier | Modification |
|---|---|
| `page/js/461-voix-rave-eurorack.js` | CORE KICK, BASS RAVE et gestion commune de leurs sources. |
| `page/js/462-break32-eurorack.js` | Génération du break, lecture des tranches, séquenceur et éditeur Focus. |
| `page/js/463-montages-rave.js` | Six compositions et nouvelle famille du catalogue. |
| `page/css/390-styles-rave.css` | Présentation responsive du module BREAK 32 et de son éditeur. |
| `page/js/440-percussions.js` | Appel du nettoyage des anciens graphes lors de la reconstruction du rack. Les recettes des percussions existantes restent inchangées. |
| `page/js/450-montages-tout-faits.js` | Cartes et aide du catalogue, arrêt du transport avant chargement d'un montage de la nouvelle famille. |
| `page/html/460-note-eur.html` | Notice des modules, des six montages et actualisation des totaux. |
| `page/ordre.txt` | Ajout des quatre nouvelles sources au manifeste d'assemblage. |
| `app/src/main/assets/drm16.html` | Page assemblée intégrant exactement ces changements. |
| `outils/test-rave.cjs` | Tests du calcul, des états, des sons simulés, de l'arrêt et de la conservation des paramètres. |
| `outils/test-rave.py` | Tests réels dans Chromium et rendus audio hors ligne des six montages. |
| `outils/controles.sh` | Ajout du test Node bloquant aux contrôles communs. |
| `.github/workflows/android.yml` | Ajout du test navigateur et de son rapport aux contrôles GitHub. |
| `outils/test-drum32.py` | Nouveaux totaux exacts et reconnaissance du nouveau module dans les contrôles de catalogue. |
| `outils/test-melo32.py` | Idem, sans retirer les contrôles de MÉLO 32. |
| `outils/test-scenes8.py` | Idem, sans retirer les contrôles de SCÈNES 8. |
| `outils/test-eurorack-focus.py` | Contrôle des 109 types, dont l'éditeur spécialisé de BREAK 32. |
| `outils/test-ensembles-eurorack.py` | Totaux actualisés et distinction de la nouvelle famille, tout en gardant les essais des anciens ensembles. |
| `app/build.gradle` | Version Android 282. |
| `bureau/src-tauri/Cargo.toml` | Version Windows 282.0.0. |
| `bureau/src-tauri/tauri.conf.json` | Version Windows 282.0.0. |
| `docs/CORRECTIONS_V282.md` | Présent compte rendu. |

## Vérifications réellement exécutées

### Nouveaux tests

- **Node : 27 scénarios, 14 307 assertions, zéro erreur.**
  Paramètres, longueurs, silences, probabilités, répétitions, inversion exacte
  des tampons, transposition, dates invalides, réinitialisation, suppression
  des doublons, arrêt, destruction et sauvegarde JSON.
- **Chromium : 387 vérifications, zéro erreur.**
  Sept formats : 320×568, 360×640, 393×851, 640×360, 880×400,
  1280×800 et 1920×1080. Ouverture réelle des cartes et du Focus, édition,
  confirmations, dimensions, lecture, arrêt, remplacement et restauration.
- **12 rendus audio hors ligne** : les six montages, chacun à 44 100 et
  48 000 Hz, sur treize mesures. Les sorties stéréo et les parties séparées
  sont contrôlées, avec les niveaux de scènes, l'arrêt de la basse et le
  retour au début de la boucle. Les échantillons mesurés sont finis ; la
  crête de sortie du rack reste sous 1 dans ces essais aux réglages initiaux.

Ces rendus sont des contrôles numériques avec les vrais nœuds Web Audio de
Chromium. Ils ne remplacent pas une écoute sur les appareils.

### Régressions

Sept suites navigateur précédentes passent sans erreur :

| Suite | Résultat |
|---|---|
| DRUM 32 | 322 vérifications, avec rendus audio |
| MÉLO 32 | 1 171 vérifications, avec rendus audio |
| SCÈNES 8 | 726 vérifications, avec rendus audio |
| Focus Eurorack | 436 ouvertures de catalogue, soit 109 types dans quatre formats |
| Ensembles Eurorack | 724 vérifications, avec rendus des huit anciens ensembles |
| Menu machines | 359 vérifications |
| Vue multimachines | 480 vérifications |

Les tests Node précédents passent également : DRUM 32 (24 scénarios), MÉLO 32
(31), SCÈNES 8 (31) et **les 35 scénarios simulés du contrôle MIDI Windows**.
Il ne s'agit pas d'un test de périphérique MIDI Windows physique.

### Intégrité du livrable

Le contenu assemblé de départ a été vérifié contre le SHA du blob GitHub.
La nouvelle page est produite par remplacement exact des sources modifiées et
insertion des nouvelles sources aux positions prévues par le manifeste, dont
l'ordre des anciennes entrées reste identique. La syntaxe de tous les blocs
JavaScript assemblés, le YAML des workflows et les trois versions concordantes
ont été contrôlés.

L'assemblage différentiel a été vérifié ici. L'exécution du contrôle habituel
`outils/assembler.py --verifier` avec l'intégralité des sources du dépôt, puis
les compilations natives, restent à effectuer dans GitHub Actions.

## Ce qui reste à valider sur les appareils

La compilation APK et Windows de la v282 n'a pas été effectuée dans cet
environnement. L'écoute réelle, le confort au doigt et les performances des
racks sur le Samsung et sur le PC restent à vérifier après installation.
Les essais navigateur utilisent un stockage temporaire simulé, pas les fichiers
personnels de l'utilisateur.

Le workflow Windows n'est pas modifié : sa fabrication automatique à chaque
push sur main et les corrections du contrôle MIDI v278 restent présentes.
L'installateur pourra être récupéré dans `drm16-windows` après une compilation
Windows réussie. Sa fabrication ne met pas automatiquement à jour le PC :
il faut toujours lancer le nouvel installateur.

Les commandes MIDI natives, Freesound et les formats de sauvegarde ne sont pas
changés. Les sons et racks personnels ne sont pas remplacés par l'installation
des exemples : leur chargement reste une action explicite dans le rack choisi.
