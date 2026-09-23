# v285 — Variations A/B et FILL rythmiques

Base : v284, commit `43ff4c8272b46aab136b4e4f5691520ae8750a6c`.
Versions : Android 285 ; Windows 285.0.0.

## But

Créer une variante de batterie sans écraser le rythme de départ, la jouer à la
mesure suivante, puis revenir automatiquement après un fill. Le lot enrichit
DRUM 32 et BREAK 32 et leur donne des commandes dans PERFORMANCE. Ce n’est pas
un nouveau synthétiseur, un time-stretch ni un enregistreur de mouvements.

## Éditer A et B

Dans FOCUS de DRUM 32 ou BREAK 32, ouvrir **PRÉPARER B / RÉGLER LES FILLS**.
**COPIER A → B** crée une seconde phrase identique à l’originale ; **GÉNÉRER B**
la prépare avec des variations et des répétitions en fin de mesure. Une B déjà
existante n’est remplacée qu’après confirmation.

**ÉDITER A / ÉDITER B** choisit les données affichées dans les commandes natives
qui suivent le nouveau bandeau. Cela ne change pas ce qui joue. Les cases, les
deux pages de seize pas et les commandes de copie/effacement modifient seulement
la phrase éditée. Les phrases A et B ne sont pas les pistes A à D de DRUM 32 :
chacune des deux phrases contient les quatre pistes.

- DRUM 32 : les 128 valeurs de pas (silence ou 1 à 4 frappes) ont une version B.
  Longueur, rotation, probabilité de piste et mute restent communs.
- BREAK 32 : numéros de tranche, répétitions, inversion et probabilité par pas
  sont indépendants en A/B. Longueur, transpose, brillance, niveau et mute sont
  communs, tout comme le fichier source et ses repères de découpe.

Les pas hors longueur sont conservés, en A comme en B. Le générateur ne modifie
jamais A, mais les commandes explicites d’édition/effacement de A la modifient
normalement. Les verrous protègent la génération, pas l’édition manuelle.

## Génération maîtrisée

La génération repart toujours de A et écrit une nouvelle B. Dans DRUM 32, les
pistes A et B sont verrouillées par défaut : elles correspondent au kick et à
la caisse claire des exemples. Décocher un verrou autorise les variations sur
cette piste. Les pistes C/D reçoivent notamment des répétitions sur les quatre
derniers pas de chaque bloc de seize pas.

Dans BREAK 32, **PRÉSERVER LES TEMPS FORTS** garde les pas 1, 5, 9, 13, 17, 21,
25 et 29, avec leurs réglages. Ce sont des positions rythmiques, pas une analyse
qui reconnaîtrait un kick ou une caisse claire dans une boucle personnelle.
Les autres pas peuvent changer de tranche, de répétitions et de sens de lecture.
Les nouvelles tranches générées sont choisies dans le découpage disponible.
Les valeurs protégées déjà hors découpage restent écrites et silencieuses,
comme dans la v283. Aucun fichier sonore n’est créé ou écrasé.

Le générateur utilise sa propre graine, enregistrée dans la variante. Il ne
consomme ni ne remplace Math.random du moteur audio. Copier/générer B ne change
pas automatiquement la phrase en lecture.

## Jeu, synchronisation et limites

**JOUER A / JOUER B** met le changement en attente pendant la lecture. À l’arrêt,
le bouton choisit directement la phrase du prochain départ. Cette préférence
est conservée avec le rack.

**FILL · 1 MESURE** programme B pour une mesure puis revient à la phrase de base
choisie. Plusieurs clics avant la même frontière ne s’empilent pas. Une nouvelle
demande pendant un fill peut en prévoir un autre à la frontière suivante.
Si la phrase de base est déjà B, le fill reste B : il n’existe pas de troisième
banque de fill dans cette version.

**FILL AUTOMATIQUE** (2, 4 ou 8) applique B sur la dernière mesure de chaque
groupe. Par exemple : A, A, A, B, puis A, A, A, B. Il a priorité sur le choix de
base pendant sa mesure. Le réglage ARRÊT désactive seulement cet automatisme.

Une mesure correspond à **16 impulsions CLK acceptées par le module**. Elle ne
dépend pas de la longueur des pistes. Les modules ne repartent pas du pas 1 lors
d’un changement A/B : avec 32 pas, un fill utilise la moitié de phrase alors
parcourue ; avec des cycles de 7 ou 15 pas, la phase de ces cycles reste intacte.
Pour les exemples, CLOCK OUT fournit une double-croche. Des CLK différents ou
des resets séparés peuvent donner des frontières de mesure différentes.

L’ordonnanceur programme les sons légèrement à l’avance. Une commande reçue
trop tard pour une frontière déjà programmée attend la suivante. L’état
**PROGRAMMÉ** est distingué de la lecture effectivement atteinte à l’heure audio.
**ANNULER ATTENTE** retire les demandes qui ne sont pas encore programmées ; un
fill déjà programmé ou en cours n’est pas arraché au moteur audio. Il se termine
normalement. STOP/RST nettoient les fills ponctuels et les compteurs ; la banque B
et le réglage de fill automatique restent mémorisés. Un nouveau départ utilise
la phrase de base choisie, sans restaurer d’ancienne demande de fill.

## PERFORMANCE

Le bandeau **VARIATIONS DE BATTERIE** contient **FILL TOUS · 1 MESURE**. Les
commandes de chaque module sont regroupées sous le volet **PHRASES A/B ET
ÉDITION DES SÉQUENCEURS**, fermé par défaut pour garder de la place aux macros.
On peut choisir A/B, annuler une attente ou passer au Focus correspondant.

FILL TOUS concerne seulement les DRUM 32 / BREAK 32 dont B est préparée. Chaque
module suit sa propre horloge ; les deux nouveaux montages les câblent ensemble.
Les huit macros, leur mémoire, les séquenceurs mélodiques et SCÈNES 8 continuent
de fonctionner indépendamment. Les scènes de niveau peuvent donc rendre
un groupe momentanément muet même quand son séquenceur parcourt un fill.

L’interface ne garde pas de bouton tenu au doigt : une perte de focus ou un
relâchement en dehors de la fenêtre ne peut pas laisser un fill permanent.
L’affichage attend uniquement les transitions visibles déjà programmées. Il
ne dessine pas continuellement entre les mesures et n’attend pas de rAF sous
les menus ou en arrière-plan. L’historique est borné à 64 transitions par module,
et absent dans le rendu hors ligne.

## Deux montages

Dans EURORACK → RACK → MONTAGES → PERFORMANCE, choisir un emplacement vide :

| Montage | Tempo | Préparation |
| --- | --- | --- |
| JUNGLE · VARIATIONS A/B | 168 BPM | Variante indépendante de Jungle · Aux commandes ; huit macros conservées, B des deux séquenceurs et fills toutes les quatre mesures. |
| BREAKCORE · FILLS CADENCÉS | 202 BPM | Variante indépendante du montage breakcore ; quatre macros de niveau, B des deux séquenceurs et fills toutes les quatre mesures. |

Les 48 montages précédents sont conservés, sans leur ajouter B silencieusement.
Le catalogue compte désormais 50 montages et toujours 109 types de modules.
Les breaks synthétisés restent fournis par défaut ; charger une boucle personnelle
dans BREAK 32 continue d’utiliser la bibliothèque et le découpage de la v283.

## Mémoire et compatibilité

A reste dans les paramètres natifs m.p. B et ses options sont sérialisées dans
un champ optionnel `variation` du module (version interne 1). Les paramètres de
B sont limités aux clés et plages des pas du module. Les types de données,
valeurs finies, tailles et options sont normalisés ; un format inconnu est ignoré.
Les tableaux et objets chargés sont copiés, pas partagés entre deux racks.

Le champ est conservé dans les huit emplacements, puis dans les projets .drm16
par la mémoire existante. Le format global de projet ne change pas. Les états
de lecture, files d’attente, positions et historiques graphiques ne sont pas
sérialisés. Ouvrir un ancien rack sans variation ne lui crée pas de B et ne change
pas ses paramètres. Une ancienne application antérieure à v285 ne sait pas
conserver ce nouveau champ lors d’une réécriture du rack : conserver une copie
du projet avant de revenir à une ancienne version.

## Périmètre non modifié

Pas de modification des ponts Java/Rust, des commandes MIDI natives, des données
personnelles Freesound ou des fichiers de sons. Les recettes des oscillateurs,
filtres, effets et percussions ne changent pas. Les deux séquenceurs lisent la
phrase retenue avant leurs opérations de déclenchement habituelles. La création
d’une B et l’édition ne reconstruisent pas le graphe ni les câbles.

Le workflow Windows automatique et sa correction MIDI sont conservés. Le ZIP
contient les sources, pas un EXE déjà compilé. Après réussite de la compilation
Windows, récupérer `drm16-windows`, puis installer `DRM16-installeur.exe` sur PC.

Pas encore de conditions indépendantes par pas, de banque C dédiée au fill,
d’enregistrement des macros, de transposition indépendante du tempo ou de
retour arrière général de toutes les éditions du rack.

## Vérifications effectuées

- 32 scénarios Node du nouveau lot : vrais récepteurs DRUM 32/BREAK 32 avec
  primitives audio simulées. Comparaison de la lecture sans B avec les mêmes
  séquenceurs sans le nouveau moteur ; copie, protection de A, quantification,
  fill ponctuel/automatique, phase des pistes, STOP/RST, demandes répétées,
  normalisation, indépendance des instances, dates graphiques et historique.
  Des essais supplémentaires vérifient la lecture d’une tranche personnelle en B
  et la conservation de sa référence et de ses repères pendant la génération.
- 272 vérifications navigateur réussies dans sept formats : 320×568, 360×640, 393×851, 640×360,
  880×400, 1280×800 et 1920×1080. Vrais clics dans FOCUS/PERFORMANCE, édition A/B,
  refus/acceptation des confirmations, cibles de 44 px, changement de longueur,
  lecture réelle, FILL TOUS et retour A, sauvegarde/rechargement, aller-retour
  entre emplacements, inclusion dans le contenu du projet .drm16, anciens racks.
- Quatre rendus OfflineAudioContext : deux montages sur treize mesures, à
  44 100 et 48 000 Hz. Frontières des fills aux mesures 4/8/12, retour A, signaux
  finis, groupes actifs, sortie bornée, enveloppes de SCÈNES 8 et absence
  d’historique graphique hors ligne contrôlés. Ce n’est pas une écoute humaine.
- Les sept suites Node antérieures sélectionnées passent sans erreur : autotest MIDI,
  DRUM 32, MÉLO 32, SCÈNES 8, RAVE, bibliothèque BREAK 32 et PERFORMANCE.
- Les huit suites navigateur antérieures sélectionnées passent sans erreur : DRUM 32,
  RAVE, bibliothèque BREAK 32, PERFORMANCE, Focus Eurorack, vue multimachines,
  MÉLO 32 et SCÈNES 8. Seuls leurs attendus de décompte des montages sont adaptés.
- Syntaxe des scripts de la page assemblée (qui comprend les fragments non autonomes) et des nouveaux scripts autonomes,
  syntaxe Python/YAML, versions, fidélité des segments sources et structure du ZIP.

Environnement : Node et Chromium, page en mémoire et stockage temporaire. La page
v284 de base est vérifiée par son Git blob SHA. Les fichiers sources disponibles
sont retrouvés exactement, une seule fois et dans l’ordre, dans la page de base.
La nouvelle page conserve les autres segments octet pour octet, remplace les
sources changées et insère les nouvelles selon page/ordre.txt. Le contrôle complet
outils/assembler.py --verifier reste exécuté par GitHub, avec toutes les sources.

La compilation APK, la compilation Windows/WebView2 et les autres tests natifs
Java/Rust ne sont pas exécutés ici. L’écoute, la charge et les gestes sur les
appareils réels restent à valider après compilation et installation.

## Fichiers livrés — 25

| Chemin | Modification |
| --- | --- |
| `.github/workflows/android.yml` | Ajout du test navigateur de variations et de son rapport. |
| `app/build.gradle` | Version Android 285. |
| `app/src/main/assets/drm16.html` | Page reconstruite, sources nouvelles incluses. |
| `bureau/src-tauri/Cargo.toml` | Version 285.0.0 ; dépendances inchangées. |
| `bureau/src-tauri/tauri.conf.json` | Version Windows 285.0.0. |
| `docs/CORRECTIONS_V285.md` | Cette notice. |
| `outils/controles.sh` | Nouveau test Node parmi les contrôles communs APK/Windows. |
| `outils/test-break32-bibliotheque.py` | Attendu du catalogue 48 → 50. |
| `outils/test-drum32.py` | Attendu du catalogue 48 → 50. |
| `outils/test-melo32.py` | Attendu du catalogue 48 → 50. |
| `outils/test-performance-eurorack.py` | Catalogue 50, quatre cartes PERFORMANCE. |
| `outils/test-rave.py` | Attendu du catalogue 48 → 50. |
| `outils/test-scenes8.py` | Attendu du catalogue 48 → 50. |
| `outils/test-variations-rythmiques.cjs` | Tests des banques et des vrais séquenceurs, primitives audio simulées. |
| `outils/test-variations-rythmiques.py` | Interface, transport, mémoire et rendus audio. |
| `page/css/420-variations-rythmiques.css` | Bandeaux, commandes, cibles tactiles et volets repliables. |
| `page/html/460-note-eur.html` | Aide intégrée et actualisation de la notice PERFORMANCE. |
| `page/js/440-percussions.js` | Champ optionnel de variation dans la sauvegarde/relecture des modules. |
| `page/js/450-montages-tout-faits.js` | Chargement des variantes fournies par les nouveaux exemples. |
| `page/js/453-drum32-eurorack.js` | Lecture A/B, resets et édition native de la phrase choisie. |
| `page/js/462-break32-eurorack.js` | Lecture A/B des tranches, resets et édition native. |
| `page/js/469-variations-rythmiques.js` | Moteur des banques, files, fills et génération protégée. |
| `page/js/471-variations-interface.js` | Bandeaux Focus, accès PERFORMANCE et états horodatés. |
| `page/js/472-montages-variations.js` | Deux copies indépendantes avec B et fill automatique. |
| `page/ordre.txt` | Ordre d’inclusion de la feuille CSS et des trois scripts. |

## Application

Archive différentielle `drm16_android_v285.zip`, seulement les 25 fichiers sous
`drm16_android/`. À appliquer après v284 avec mise-a-jour.sh. Le premier envoi
lance automatiquement APK et Exécutable Windows comme précédemment. Ne pas
utiliser l’archive PC navigateur à la place du nouvel installateur Windows.
